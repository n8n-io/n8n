import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';
import path from 'node:path';
import { z } from 'zod';

import { CredentialRequirementsExtractor } from '../entities/credential/credential-requirements.extractor';
import type { WorkflowCredentialRequirement } from '../entities/credential/credential.types';
import { DataTableRequirementsExtractor } from '../entities/data-table/data-table-requirements.extractor';
import type { WorkflowDataTableRequirement } from '../entities/data-table/data-table.types';
import { VariableRequirementsExtractor } from '../entities/variable/variable-requirements.extractor';
import type { WorkflowVariableRequirement } from '../entities/variable/variable.types';
import { collectNodeTypeUsage } from '../entities/workflow/node-type-usage';
import type { NodeTypeUsage } from '../entities/workflow/node-type-usage';
import { extractWorkflowRequirements } from '../entities/workflow/references/extract-workflow-requirements';
import type { WorkflowSubWorkflowRequirement } from '../entities/workflow/workflow.types';
import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import type { PackageReader } from '../io/package-reader';
import { ENTITY_FILES, ENTITY_KINDS } from '../spec/constants';
import type { EntityKind } from '../spec/constants';
import type { ManifestEntry } from '../spec/manifest.schema';
import type { PackageRequirements } from '../spec/requirements.schema';
import { serializedWorkflowSchema } from '../spec/serialized/workflow.schema';

export type PackageEntries = { [K in EntityKind]: ManifestEntry[] };

/**
 * What a package holds: one entry for each entity, and what its workflows
 * need. This is a manifest without the metadata, read from the files.
 */
export interface PackageContents extends PackageEntries {
	requirements?: PackageRequirements;
}

/** What one workflow needs, kept while its file is dropped. */
interface WorkflowUsage {
	id: string;
	target: string;
	credentials: WorkflowCredentialRequirement[];
	dataTables: WorkflowDataTableRequirement[];
	variables: WorkflowVariableRequirement[];
	subWorkflows: WorkflowSubWorkflowRequirement[];
	nodeTypes: NodeTypeUsage[];
	tagIds: string[];
}

const KIND_BY_FILE = new Map<string, EntityKind>(
	ENTITY_KINDS.map((kind) => [ENTITY_FILES[kind], kind]),
);

/**
 * Every entity file carries its name and its id, except a variable: the format
 * excludes the variable id on purpose, because `$vars.<name>` resolves by name
 * and one directory holds one variable per name.
 */
const identitySchema = z.object({ id: z.string().min(1).optional(), name: z.string().min(1) });

/** Read at most this many entity files at once. */
const READ_BATCH_SIZE = 32;

type RequirementItem<K extends keyof PackageRequirements> = NonNullable<
	PackageRequirements[K]
>[number];

/** Fold one more user into the requirement for `key`, creating it on first use. */
function addUse<T extends { usedByWorkflows: string[] }>(
	byKey: Map<string, T>,
	key: string,
	workflowId: string,
	create: () => T,
): void {
	const requirement = byKey.get(key) ?? create();
	if (!requirement.usedByWorkflows.includes(workflowId)) {
		requirement.usedByWorkflows.push(workflowId);
	}
	byKey.set(key, requirement);
}

const listOf = <T>(byKey: Map<string, T>) => (byKey.size > 0 ? [...byKey.values()] : undefined);

const byTarget = (a: { target: string }, b: { target: string }) => a.target.localeCompare(b.target);

/**
 * Reads what a package holds from its files, in one pass.
 *
 * The manifest states the same thing, but it is a separate statement that can
 * disagree with the files, and it is on its way out of the repository. A
 * caller that reconciles a package with something else — a Git branch, another
 * package — needs what the files actually say.
 *
 * The requirements come from the same extractors the exporter runs against the
 * database, so a package describes itself the same way whichever side reads
 * it. Two names cannot come from a workflow file, because a data table and a
 * tag are referenced by id: the entries supply them when the package bundles
 * them, and the id stands in when it does not.
 */
@Service()
export class PackageContentsReader {
	constructor(
		private readonly workflowSerializer: WorkflowSerializer,
		private readonly credentialRequirements: CredentialRequirementsExtractor,
		private readonly dataTableRequirements: DataTableRequirementsExtractor,
		private readonly variableRequirements: VariableRequirementsExtractor,
	) {}

	async read(reader: PackageReader): Promise<PackageContents> {
		const entries: PackageEntries = {
			projects: [],
			folders: [],
			workflows: [],
			credentials: [],
			dataTables: [],
			variables: [],
			tags: [],
		};
		const usages: WorkflowUsage[] = [];

		const files = (await reader.listEntries()).flatMap((file) => {
			const kind = KIND_BY_FILE.get(path.posix.basename(file));
			const target = path.posix.dirname(file);
			return kind && target !== '.' ? [{ kind, file, target }] : [];
		});

		const read = async ({ kind, file, target }: (typeof files)[number]) => {
			const raw = jsonParse<unknown>((await reader.readFile(file)).toString('utf-8'), {
				fallbackValue: null,
			});

			if (kind === 'workflows') {
				const { entry, usage } = this.readWorkflow(raw, target);
				entries.workflows.push(entry);
				usages.push(usage);
				return;
			}

			const identity = identitySchema.safeParse(raw);
			const id = identity.success ? (identity.data.id ?? (kind === 'variables' ? target : '')) : '';
			if (!identity.success || !id) {
				throw new UserError(`Package holds an entity without an id or a name at "${target}".`);
			}
			entries[kind].push({ id, name: identity.data.name, target });
		};

		for (let i = 0; i < files.length; i += READ_BATCH_SIZE) {
			await Promise.all(files.slice(i, i + READ_BATCH_SIZE).map(read));
		}

		// A batch finishes in whatever order the reads complete, and that order
		// would otherwise decide how the entries and the users are listed.
		for (const kind of ENTITY_KINDS) entries[kind].sort(byTarget);
		usages.sort(byTarget);

		return { ...entries, ...this.foldRequirements(usages, entries) };
	}

	/**
	 * The entry and the usage of one workflow. The file itself is not kept: a
	 * branch holds every workflow of the instance, and only what they need has
	 * to survive the pass.
	 */
	private readWorkflow(
		raw: unknown,
		target: string,
	): { entry: ManifestEntry; usage: WorkflowUsage } {
		let entity: WorkflowEntity;
		let tagIds: string[];
		let name: string;
		let id: string;

		try {
			const wire = serializedWorkflowSchema.parse(raw);
			({ id, name } = wire);
			tagIds = wire.tagIds ?? [];
			entity = Object.assign(new WorkflowEntity(), this.workflowSerializer.deserialize(wire), {
				// `deserialize` drops the id, because an import gives a fresh one.
				id: wire.id,
			});
		} catch (cause) {
			throw new UserError(`Package holds a workflow file that failed validation at "${target}".`, {
				cause,
			});
		}

		return {
			entry: { id, name, target },
			usage: {
				id,
				target,
				credentials: this.credentialRequirements.extract(entity),
				dataTables: this.dataTableRequirements.extract(entity),
				variables: this.variableRequirements.extract(entity),
				subWorkflows: extractWorkflowRequirements(entity),
				nodeTypes: collectNodeTypeUsage([{ workflowId: id, nodes: entity.nodes }]),
				tagIds,
			},
		};
	}

	private foldRequirements(
		usages: WorkflowUsage[],
		entries: PackageEntries,
	): { requirements?: PackageRequirements } {
		const nameById = (list: ManifestEntry[]) => new Map(list.map((e) => [e.id, e.name]));
		const workflowNames = nameById(entries.workflows);
		const dataTableNames = nameById(entries.dataTables);
		const tagNames = nameById(entries.tags);

		const credentials = new Map<string, RequirementItem<'credentials'>>();
		const dataTables = new Map<string, RequirementItem<'dataTables'>>();
		const subWorkflows = new Map<string, RequirementItem<'workflows'>>();
		const variables = new Map<string, RequirementItem<'variables'>>();
		const tags = new Map<string, RequirementItem<'tags'>>();
		const nodeTypes = new Map<string, RequirementItem<'nodeTypes'>>();

		for (const usage of usages) {
			const { id } = usage;

			for (const use of usage.credentials) {
				addUse(credentials, use.credentialId, id, () => ({
					id: use.credentialId,
					name: use.credentialName,
					type: use.credentialType,
					usedByWorkflows: [],
				}));
			}
			for (const use of usage.dataTables) {
				addUse(dataTables, use.dataTableId, id, () => ({
					id: use.dataTableId,
					name: dataTableNames.get(use.dataTableId) ?? use.dataTableId,
					usedByWorkflows: [],
				}));
			}
			for (const use of usage.variables) {
				addUse(variables, use.variableName, id, () => ({
					name: use.variableName,
					usedByWorkflows: [],
				}));
			}
			for (const use of usage.subWorkflows) {
				const name = workflowNames.get(use.referencedWorkflowId);
				addUse(subWorkflows, use.referencedWorkflowId, id, () => ({
					id: use.referencedWorkflowId,
					...(name ? { name } : {}),
					usedByWorkflows: [],
				}));
			}
			for (const tagId of usage.tagIds) {
				addUse(tags, tagId, id, () => ({
					id: tagId,
					name: tagNames.get(tagId) ?? tagId,
					usedByWorkflows: [],
				}));
			}
			for (const use of usage.nodeTypes) {
				addUse(nodeTypes, `${use.type}@${use.typeVersion}`, id, () => ({
					type: use.type,
					typeVersion: use.typeVersion,
					usedByWorkflows: [],
				}));
			}
		}

		const requirements: PackageRequirements = {
			credentials: listOf(credentials),
			dataTables: listOf(dataTables),
			workflows: listOf(subWorkflows),
			variables: listOf(variables),
			tags: listOf(tags),
			nodeTypes: listOf(nodeTypes),
		};

		// Workflows that need nothing state nothing.
		return Object.values(requirements).some((list) => list !== undefined) ? { requirements } : {};
	}
}
