import {
	AgentJsonConfigSchema,
	type InstanceAiEvalSeedAgent,
	type InstanceAiEvalSeedDataTable,
	type InstanceAiEvalSeedWorkflow,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { jsonParse, PROJECT_ROOT, type IConnections, type INode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { License } from '@/license';
import { AgentsService } from '@/modules/agents/agents.service';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { FolderService } from '@/services/folder.service';

/** Substring name matches to sift for an exact one. A parent with more than
 *  this many similarly-named children is not a seeding scenario. */
const SEED_FOLDER_LOOKUP_LIMIT = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkflowNode(value: unknown): value is INode {
	if (!isRecord(value)) return false;
	return (
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		typeof value.type === 'string' &&
		typeof value.typeVersion === 'number' &&
		Array.isArray(value.position) &&
		value.position.length === 2 &&
		value.position.every((coordinate) => typeof coordinate === 'number') &&
		isRecord(value.parameters)
	);
}

function isConnections(value: unknown): value is IConnections {
	return isRecord(value);
}

/** Empty every `credential`/`credentialId` string and `credentials` map, at any
 *  depth — they address the instance the seed came from. Emptied rather than
 *  deleted: both are required fields, and empty is the unconfigured state the
 *  config schema already models. */
function blankCredentialValues(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(blankCredentialValues);
	if (!isRecord(value)) return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => {
			if ((key === 'credential' || key === 'credentialId') && typeof entry === 'string')
				return [key, ''];
			if (key === 'credentials' && isRecord(entry)) return [key, {}];
			return [key, blankCredentialValues(entry)];
		}),
	);
}

/** Recreates the data tables, workflows and agents a conversation seed references,
 *  so a restored message history's ids resolve. Used by the eval restore endpoint. */
@Service()
export class EvalThreadRestoreService {
	constructor(
		private readonly workflowRepo: WorkflowRepository,
		private readonly sharedWorkflowRepo: SharedWorkflowRepository,
		private readonly dataTableService: DataTableService,
		private readonly folderService: FolderService,
		private readonly license: License,
	) {}

	/**
	 * Recreate each seed data table and map its seed id to the freshly created
	 * one. Tables are created under a uniquified name (names are unique per
	 * project; the id, which the workflow references, is what matters). A table
	 * declaring `rows` is seeded with them against its declared column types
	 * (TRUST-311) — free-text `dataSetup` can't declare types, so a string id
	 * like `row_001` would otherwise be rejected by a `number` column. Rolls back
	 * tables already created if a later table (or its rows) fails.
	 *
	 * `uniquifyNames` (default true) appends a unique suffix to each name to dodge
	 * the per-project unique-name constraint — safe when the seed workflow
	 * references tables by id (id-remap). Pass false to keep the EXACT declared
	 * name, so a freshly-built workflow's by-name references resolve (TRUST-311
	 * scenario seeding).
	 */
	async restoreDataTables(
		dataTables: InstanceAiEvalSeedDataTable[],
		projectId: string,
		options: { uniquifyNames?: boolean } = {},
	): Promise<Map<string, string>> {
		const uniquifyNames = options.uniquifyNames ?? true;
		const idMap = new Map<string, string>();
		try {
			for (const table of dataTables) {
				// Short ids would risk corrupting unrelated substrings in the
				// whole-document id remap below; refuse them.
				if (table.id.length < 8) {
					throw new BadRequestError(
						`Seed data table id "${table.id}" is too short to remap safely (need ≥8 chars)`,
					);
				}
				let name = table.name;
				if (uniquifyNames) {
					const suffix = ` [seed ${randomUUID().slice(0, 8)}]`;
					name = `${table.name.slice(0, 128 - suffix.length)}${suffix}`;
				}
				const created = await this.dataTableService.createDataTable(projectId, {
					name,
					columns: table.columns,
				});
				// Map before seeding rows so a row-insert failure rolls this table back too.
				idMap.set(table.id, created.id);
				if (table.rows && table.rows.length > 0) {
					await this.dataTableService.insertRows(created.id, projectId, table.rows);
				}
			}
		} catch (error) {
			await this.deleteDataTables([...idMap.values()], projectId);
			throw error;
		}
		return idMap;
	}

	/**
	 * Reset an existing data table's rows to exactly `rows` (clear-then-insert).
	 * Used for the per-scenario row seeding of a case whose tables were created
	 * empty before the build turn (TRUST-311 follow-up): the table already exists
	 * (the built workflow bound its id), so we only swap the rows a scenario
	 * declares — clearing whatever a prior scenario or a build-time execution
	 * left. Rows are validated against each column's type by `insertRows`.
	 */
	async reseedDataTableRows(
		tableId: string,
		projectId: string,
		rows: NonNullable<InstanceAiEvalSeedDataTable['rows']>,
	): Promise<void> {
		await this.dataTableService.clearRows(tableId, projectId);
		if (rows.length > 0) {
			await this.dataTableService.insertRows(tableId, projectId, rows);
		}
	}

	/** Best-effort delete (rollback of a failed restore). */
	async deleteDataTables(dataTableIds: string[], projectId: string): Promise<void> {
		for (const id of dataTableIds) {
			try {
				await this.dataTableService.deleteDataTable(id, projectId);
			} catch {
				// best-effort
			}
		}
	}

	/** Recreate each seed agent, config and skill bodies in one insert — an agent is
	 *  a single row, so there are no skill files to write. Rolls back on failure.
	 *  Names are not uniquified as seed data tables' are; see `remapSeedArtifactIds`. */
	async restoreAgents(
		agents: InstanceAiEvalSeedAgent[],
		projectId: string,
		dataTableIdMap: Map<string, string> = new Map(),
	): Promise<string[]> {
		if (agents.length === 0) return [];
		const agentsService = this.agentsService();
		const created: string[] = [];
		try {
			for (const agent of agents) {
				// An agent's node tools carry data-table ids from the instance the seed
				// was authored on — same rewrite the workflow restore does.
				const config = AgentJsonConfigSchema.safeParse(
					blankCredentialValues(this.remapDataTableIds(agent.config, dataTableIdMap)),
				);
				if (!config.success) {
					throw new BadRequestError(
						`Seed agent ${agent.id} config became invalid after blanking its credentials`,
					);
				}
				// `create` refuses a colliding id rather than overwriting, so a seed can
				// never clobber an agent that already exists.
				await agentsService.create(projectId, config.data.name, {
					id: agent.id,
					schema: config.data,
					...(agent.skills ? { skills: agent.skills } : {}),
				});
				created.push(agent.id);
			}
		} catch (error) {
			await this.deleteAgents(created, projectId);
			throw error;
		}
		return created;
	}

	/** Rewrite the seed's authored data-table ids to the ones the restore just
	 *  created. Whole-document replace: a table id can sit anywhere in a node's
	 *  parameters or an agent tool's config. */
	private remapDataTableIds(value: unknown, dataTableIdMap: Map<string, string>): unknown {
		if (dataTableIdMap.size === 0) return value;
		let serialized = JSON.stringify(value);
		// Longest source id first: if one seeded id prefixes another ("dt1234567" /
		// "dt12345678"), rewriting the short one first would eat the long one's
		// prefix and leave it addressing a table that does not exist.
		const byLongest = [...dataTableIdMap].sort(([a], [b]) => b.length - a.length);
		for (const [oldId, newId] of byLongest) {
			serialized = serialized.replaceAll(oldId, newId);
		}
		return jsonParse<unknown>(serialized);
	}

	/** Best-effort delete (rollback of a failed restore). Resolved per id so a
	 *  rollback can never throw over the failure that triggered it. */
	async deleteAgents(agentIds: string[], projectId: string): Promise<void> {
		for (const id of agentIds) {
			try {
				await this.agentsService().delete(id, projectId);
			} catch {
				// best-effort
			}
		}
	}

	/** Lazy: constructor-injecting this would break every seeded restore — workflows
	 *  and data tables included — on an instance where the agents module is off. */
	private agentsService(): AgentsService {
		if (!Container.get(ModuleRegistry).isActive('agents')) {
			throw new BadRequestError('Seeding an agent requires the agents module to be enabled');
		}
		return Container.get(AgentsService);
	}

	/** Recreate the seed workflows; returns the ids actually created (newly), and
	 *  rolls them back if a later one fails. */
	async restoreWorkflows(
		workflows: InstanceAiEvalSeedWorkflow[],
		projectId: string,
		dataTableIdMap: Map<string, string> = new Map(),
	): Promise<string[]> {
		const created: string[] = [];
		// Created before any workflow so a failure part-way leaves no workflow
		// pointing at a folder the rollback then removes.
		const folderIds = await this.ensureSeedFolders(workflows, projectId);
		try {
			for (const workflow of workflows) {
				const folderId = workflow.folder ? folderIds.get(workflow.folder) : undefined;
				if (
					await this.createWorkflowPinnedToId(workflow, projectId, dataTableIdMap, folderId)
				) {
					created.push(workflow.id);
				}
			}
		} catch (error) {
			await this.deleteWorkflows(created);
			throw error;
		}
		return created;
	}

	/**
	 * Create every folder path the seed declares, and map each declared path to the
	 * folder its last segment became. Nested paths create each ancestor once, so
	 * `Clients/Acme` and `Clients/Globex` share one `Clients`.
	 *
	 * IDEMPOTENT — a segment that already exists at that parent is reused, never
	 * duplicated. This matters more than it looks: unlike workflow names, folder
	 * names are NOT uniquified per run (a case's prose names the folder the way the
	 * user did), so `--iterations 5` would otherwise leave five folders called
	 * `logsearch` and the folder the case is about would resolve as ambiguous.
	 *
	 * Folders are NOT rolled back with the workflows. They are empty containers in
	 * a disposable eval project, and deleting one is the destructive operation of
	 * the two — a rollback that removed a folder another concurrently-restoring
	 * case had just placed workflows in would fail that case instead.
	 */
	private async ensureSeedFolders(
		workflows: InstanceAiEvalSeedWorkflow[],
		projectId: string,
	): Promise<Map<string, string>> {
		const paths = [
			...new Set(workflows.flatMap((workflow) => (workflow.folder ? [workflow.folder] : []))),
		];
		if (paths.length === 0) return new Map();

		if (!this.license.isLicensed('feat:folders')) {
			// Loud: a case that declares folders and silently gets a flat project would
			// grade the agent on an instance that does not match what the case says.
			throw new BadRequestError(
				'Seeding workflows into folders requires the folders feature to be licensed on this instance',
			);
		}

		// Keyed by the path walked so far, so an ancestor shared by two declared
		// paths is resolved once.
		const byPath = new Map<string, string>();
		for (const path of paths) {
			const segments = path.split('/').filter((segment) => segment.trim() !== '');
			let parentFolderId: string | undefined;
			let walked = '';
			for (const segment of segments) {
				walked = walked === '' ? segment : `${walked}/${segment}`;
				const known = byPath.get(walked);
				if (known) {
					parentFolderId = known;
					continue;
				}
				const resolved =
					(await this.findFolderByName(segment, projectId, parentFolderId)) ??
					(
						await this.folderService.createFolder(
							{ name: segment, parentFolderId },
							projectId,
						)
					).id;
				byPath.set(walked, resolved);
				parentFolderId = resolved;
			}
		}

		return new Map(
			paths.flatMap((path) => {
				const id = byPath.get(path);
				return id ? [[path, id] as const] : [];
			}),
		);
	}

	/** An existing folder with this EXACT name under this parent, if any. The
	 *  repository's name filter is a substring LIKE, so the exact comparison is
	 *  done here — `Acme` must not reuse `Acme-Archive`. */
	private async findFolderByName(
		name: string,
		projectId: string,
		parentFolderId: string | undefined,
	): Promise<string | undefined> {
		const [candidates] = await this.folderService.getManyAndCount(projectId, {
			filter: { name, parentFolderId: parentFolderId ?? PROJECT_ROOT },
			select: { name: true },
			take: SEED_FOLDER_LOOKUP_LIMIT,
		});
		return candidates.find((folder) => folder.name === name)?.id;
	}

	/** Best-effort delete (rollback of a failed restore). */
	async deleteWorkflows(workflowIds: string[]): Promise<void> {
		for (const id of workflowIds) {
			try {
				await this.workflowRepo.delete({ id });
			} catch {
				// best-effort
			}
		}
	}

	/**
	 * Insert a workflow at its seeded id (the BeforeInsert hook only generates an
	 * id when unset) and make the project its owner. Node credentials are stripped
	 * (the eval credential pin owns the credential view). Data-table references are
	 * rewritten to the recreated tables' ids. Returns true if newly created.
	 */
	private async createWorkflowPinnedToId(
		workflow: InstanceAiEvalSeedWorkflow,
		projectId: string,
		dataTableIdMap: Map<string, string>,
		parentFolderId?: string,
	): Promise<boolean> {
		const remapDataTableIds = (value: unknown): unknown =>
			this.remapDataTableIds(value, dataTableIdMap);

		const nodes: INode[] = workflow.nodes.map((node, index) => {
			if (!isWorkflowNode(node)) {
				throw new BadRequestError(
					`Seed workflow ${workflow.id} node at index ${index} is not a valid workflow node`,
				);
			}
			const { credentials: _stripped, ...rest } = node;
			const remapped = remapDataTableIds(rest);
			if (!isWorkflowNode(remapped)) {
				throw new BadRequestError(
					`Seed workflow ${workflow.id} node at index ${index} became invalid after data-table id remap`,
				);
			}
			return remapped;
		});

		const connections = remapDataTableIds(workflow.connections);
		if (!isConnections(connections)) {
			throw new BadRequestError(`Seed workflow ${workflow.id} connections must be an object`);
		}

		// Never overwrite a workflow owned by a different project (id collision).
		const owningProject = await this.sharedWorkflowRepo.getWorkflowOwningProject(workflow.id);
		if (owningProject && owningProject.id !== projectId) {
			throw new BadRequestError(
				`Seed workflow id ${workflow.id} already exists in another project; refusing to overwrite`,
			);
		}

		await this.workflowRepo.save(
			this.workflowRepo.create({
				id: workflow.id,
				name: workflow.name,
				nodes,
				connections,
				active: false,
				versionId: randomUUID(),
				...(parentFolderId ? { parentFolder: { id: parentFolderId } } : {}),
			}),
		);
		if (!owningProject) {
			await this.sharedWorkflowRepo.makeOwner([workflow.id], projectId);
			return true;
		}
		return false;
	}
}
