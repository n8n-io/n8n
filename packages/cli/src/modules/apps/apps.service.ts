import {
	appBindingSchema,
	appBindingsSchema,
	getWorkflowToolIncompatibilityReason,
	WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME,
	type AppBinding,
	type CreateAppDto,
	type DescribedBinding,
	type DescribedWorkflowBinding,
	type UpdateAppDto,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { isRecord } from '@n8n/utils/is-record';
import type { JSONSchema7 } from 'json-schema';
import { UnexpectedError, type DataTableColumnType, type INode } from 'n8n-workflow';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { AgentsService } from '@/modules/agents/agents.service';
import {
	detectTriggerNode,
	inferInputSchema,
	listWorkflowInputFields,
} from '@/modules/agents/tools/workflow-tool-factory';
import { WorkflowToolUnavailableError } from '@/modules/agents/tools/workflow-tool-unavailable-error';
import { WorkflowToolWorkflowLoader } from '@/modules/agents/tools/workflow-tool-workflow-loader.service';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AppVersionService } from './app-version.service';
import type { App } from './app.entity';
import { AppRepository } from './app.repository';
import { deriveRoutesFromRouterSource } from './derive-routes';
import { AppNotFoundError } from './errors/app-not-found.error';
import { AppQuotaExceededError } from './errors/app-quota-exceeded.error';
import { BindingAgentNotFoundError } from './errors/binding-agent-not-found.error';
import { BindingDataTableNotFoundError } from './errors/binding-data-table-not-found.error';
import { BindingIncompatibleError } from './errors/binding-incompatible.error';
import { BindingNotFoundError } from './errors/binding-not-found.error';
import { BindingProjectMismatchError } from './errors/binding-project-mismatch.error';
import { BindingWorkflowNotFoundError } from './errors/binding-workflow-not-found.error';
import { AppVersionFileNotFoundError } from './errors/app-version-file-not-found.error';
import { AppVersionNotFoundError } from './errors/app-version-not-found.error';
import { InvalidBindingsError } from './errors/invalid-bindings.error';
import { inferOutputSchema, sampleOutputItems, UNKNOWN_OUTPUT_SCHEMA } from './infer-output-fields';

const PASSTHROUGH_INPUT_SCHEMA: JSONSchema7 = { type: 'object', additionalProperties: true };

type WorkflowBinding = Extract<AppBinding, { kind: 'workflow' }>;
type DataTableBinding = Extract<AppBinding, { kind: 'dataTable' }>;
type AgentBinding = Extract<AppBinding, { kind: 'agent' }>;
type Described = { binding: DescribedBinding; warnings: string[] };

const AGENTS_DISABLED_MESSAGE = 'Agents are not enabled on this instance.';

/** Dates leave the runtime as ISO strings (JSON); every user column may hold `null`. */
function rowColumnSchema(type: DataTableColumnType): JSONSchema7 {
	if (type === 'date') return { type: ['string', 'null'], format: 'date-time' };
	return { type: [type, 'null'] };
}

function rowJsonSchema(columns: Array<{ name: string; type: DataTableColumnType }>): JSONSchema7 {
	const properties: Record<string, JSONSchema7> = {
		id: { type: 'number' },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' },
		...Object.fromEntries(columns.map(({ name, type }) => [name, rowColumnSchema(type)])),
	};
	return {
		type: 'object',
		properties,
		required: Object.keys(properties),
		additionalProperties: false,
	};
}

/** `zod-to-json-schema` types its result as its own union; what it emits is draft-07. */
const isJsonSchema = (value: unknown): value is JSONSchema7 => isRecord(value);

/** The object the runtime validates the body against, from the same zod schema it uses. */
function inputJsonSchema(triggerNode: INode, triggerType: string): JSONSchema7 {
	const generated: unknown = zodToJsonSchema(inferInputSchema(triggerNode, triggerType));
	if (!isJsonSchema(generated)) throw new UnexpectedError('The input schema is not an object.');
	const { type, properties, required, additionalProperties } = generated;
	return { type, properties, ...(required ? { required } : {}), additionalProperties };
}

/** What the REST API returns for an app: the entity plus its draft-versus-published state. */
export type AppResponse = App & { hasUnpublishedChanges: boolean };

@Service()
export class AppsService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly appVersionService: AppVersionService,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowLoader: WorkflowToolWorkflowLoader,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly dataTableService: DataTableService,
		private readonly agentsService: AgentsService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	async createApp(projectId: string, dto: CreateAppDto) {
		const count = await this.appRepository.countByProjectId(projectId);
		if (count >= this.globalConfig.apps.maxAppsPerProject) {
			throw new AppQuotaExceededError(this.globalConfig.apps.maxAppsPerProject, count);
		}
		return await this.appRepository.createApp(projectId, dto.name, dto.namespace);
	}

	async listApps(projectId: string) {
		return await this.appRepository.findManyByProjectId(projectId);
	}

	async getApp(appId: string) {
		const app = await this.appRepository.findOneBy({ id: appId });
		if (!app) throw new AppNotFoundError(appId);
		return app;
	}

	async toResponse(app: App): Promise<AppResponse> {
		const hasUnpublishedChanges = await this.appVersionService.hasUnpublishedChanges(app);
		return { ...app, hasUnpublishedChanges };
	}

	async updateApp(appId: string, dto: UpdateAppDto) {
		const app = await this.getApp(appId);
		return await this.appRepository.updateApp(app, dto);
	}

	async deleteApp(appId: string) {
		await this.getApp(appId);
		await this.appVersionService.deleteAllForApp(appId);
		await this.appRepository.deleteApp(appId);
	}

	async createVersion(appId: string, source: Buffer, dist: Buffer) {
		const app = await this.getApp(appId);
		const version = await this.appVersionService.create(appId, app.projectId, source, dist);
		// `create` made this version the active one.
		return this.appVersionService.toResponse(version, version.id);
	}

	async createSourceSnapshot(appId: string, source: Buffer, label: string | null = null) {
		const app = await this.getApp(appId);
		const version = await this.appVersionService.createSourceSnapshot(appId, source, label);
		return this.appVersionService.toResponse(version, app.activeVersionId);
	}

	/** Serves `versionId` (a built version of this app), or unpublishes the app when null. */
	async setActiveVersion(appId: string, versionId: string | null) {
		const app = await this.getApp(appId);
		await this.appVersionService.setActiveVersion(app, versionId);
		return await this.getApp(appId);
	}

	async getSourceTarball(appId: string) {
		const app = await this.getApp(appId);
		return await this.appVersionService.readSource(app);
	}

	async listVersions(appId: string) {
		const app = await this.getApp(appId);
		const versions = await this.appVersionService.list(appId);
		return versions.map((version) =>
			this.appVersionService.toResponse(version, app.activeVersionId),
		);
	}

	/**
	 * Replaces the whole binding list. Each resource is checked with the acting user's
	 * scopes now (`workflow:execute`; `dataTable:readRow` plus `dataTable:writeRow` for a
	 * `write` binding); at call time the app acts as its project, so the resource must also
	 * be owned by that project. Unpublished workflows and agents are accepted (reported as a
	 * warning) so an agent can bind first and publish later.
	 */
	async setBindings(appId: string, bindings: AppBinding[], user: User) {
		const parsed = appBindingsSchema.safeParse(bindings);
		if (!parsed.success) {
			throw new InvalidBindingsError(parsed.error.issues.map((issue) => issue.message));
		}
		const app = await this.getApp(appId);

		for (const binding of parsed.data) {
			if (binding.kind === 'dataTable') {
				await this.checkDataTableBinding(binding, app.projectId, user);
			} else if (binding.kind === 'agent') {
				await this.checkAgentBinding(binding, app.projectId);
			} else {
				await this.checkWorkflowBinding(binding, app.projectId, user);
			}
		}

		const updated = await this.appRepository.updateBindings(app, parsed.data);
		return await this.describeBindings(updated);
	}

	private async checkWorkflowBinding(binding: WorkflowBinding, projectId: string, user: User) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			binding.workflowId,
			user,
			['workflow:execute'],
		);
		if (!workflow) throw new BindingWorkflowNotFoundError(binding.key, binding.workflowId);

		const ownerProjectId = workflow.shared.find((s) => s.role === 'workflow:owner')?.projectId;
		if (ownerProjectId !== projectId) {
			throw new BindingProjectMismatchError(binding.key, 'workflow', workflow.name);
		}

		const incompatibility = getWorkflowToolIncompatibilityReason(workflow);
		if (incompatibility) {
			throw new BindingIncompatibleError(binding.key, workflow.name, incompatibility);
		}
	}

	private async checkDataTableBinding(binding: DataTableBinding, projectId: string, user: User) {
		const scopes: Scope[] = binding.permissions.includes('write')
			? ['dataTable:readRow', 'dataTable:writeRow']
			: ['dataTable:readRow'];
		const [table] = await this.dataTableService.findDataTablesByIdsForUser(
			[binding.dataTableId],
			user,
			scopes,
		);
		if (!table) throw new BindingDataTableNotFoundError(binding.key, binding.dataTableId);
		if (table.projectId !== projectId) {
			throw new BindingProjectMismatchError(binding.key, 'data table', table.name);
		}
	}

	/** The visitor chats as the app's project, so the agent must live there; `app:update` on the project is the user's ticket. */
	private async checkAgentBinding(binding: AgentBinding, projectId: string) {
		// The agents module is opt-in; without it there is no Agent table to query.
		if (!this.moduleRegistry.isActive('agents')) {
			throw new BadRequestError(AGENTS_DISABLED_MESSAGE);
		}
		const agent = await this.agentsService.findById(binding.agentId, projectId);
		if (!agent) throw new BindingAgentNotFoundError(binding.key, binding.agentId);
	}

	/** Appends one binding; the whole list goes through `setBindings`, so a duplicate key is a 400. */
	async addBinding(appId: string, binding: AppBinding, user: User) {
		const app = await this.getApp(appId);
		return await this.setBindings(appId, [...app.bindings, binding], user);
	}

	/**
	 * Replaces the permissions of one binding. The patched binding is parsed by kind first,
	 * so a value the kind does not know is a 400; the whole list then goes through
	 * `setBindings`, so the user must still hold the scopes the new permissions need.
	 */
	async updateBinding(appId: string, key: string, patch: { permissions: string[] }, user: User) {
		const app = await this.getApp(appId);
		const current = app.bindings.find((binding) => binding.key === key);
		if (!current) throw new BindingNotFoundError(key);
		if (!('permissions' in current)) {
			throw new InvalidBindingsError([`A ${current.kind} binding has no permissions.`]);
		}
		const patched = appBindingSchema.safeParse({ ...current, permissions: patch.permissions });
		if (!patched.success) {
			throw new InvalidBindingsError(patched.error.issues.map((issue) => issue.message));
		}
		const bindings = app.bindings.map((binding) => (binding.key === key ? patched.data : binding));
		return await this.setBindings(appId, bindings, user);
	}

	/** Drops one binding by key; the others are not re-checked. Returns the remaining ones described. */
	async removeBinding(appId: string, key: string) {
		const app = await this.getApp(appId);
		if (!app.bindings.some((binding) => binding.key === key)) throw new BindingNotFoundError(key);
		const remaining = app.bindings.filter((binding) => binding.key !== key);
		return await this.describeBindings(await this.appRepository.updateBindings(app, remaining));
	}

	/**
	 * Resolves each binding against the resource the runtime will use. A workflow binding
	 * resolves to the published version, or the draft with a warning while none is
	 * published; its trigger declares the input fields, so the generated types match what
	 * the runtime validates, and the output schema comes from the latest successful
	 * execution (open items with a warning without one). A data table binding resolves to
	 * its columns; an agent binding to its name and published state. A binding whose
	 * resource left the project, or whose workflow lost its trigger, since bind time stays
	 * in the list as `missing` with a warning, so the UI can still show and remove it while
	 * the others stay usable.
	 */
	async describeBindings(
		app: Pick<App, 'projectId' | 'bindings'>,
	): Promise<{ bindings: DescribedBinding[]; warnings: string[] }> {
		const described: Described[] = [];
		for (const binding of app.bindings) {
			described.push(
				binding.kind === 'dataTable'
					? await this.describeDataTableBinding(app.projectId, binding)
					: binding.kind === 'agent'
						? await this.describeAgentBinding(app.projectId, binding)
						: await this.describeWorkflowBinding(app.projectId, binding),
			);
		}
		return {
			bindings: described.map(({ binding }) => binding),
			warnings: described.flatMap(({ warnings }) => warnings),
		};
	}

	private async describeWorkflowBinding(
		projectId: string,
		binding: WorkflowBinding,
	): Promise<Described> {
		const missing = {
			key: binding.key,
			kind: binding.kind,
			name: binding.key,
			missing: true as const,
		};
		const loaded = await this.loadBoundWorkflow(projectId, binding.workflowId);
		if (!loaded) {
			return {
				binding: missing,
				warnings: [
					`Binding '${binding.key}': workflow '${binding.workflowId}' no longer exists in the app's project.`,
				],
			};
		}
		const { workflow, published } = loaded;
		if (getWorkflowToolIncompatibilityReason(workflow) !== null) {
			return {
				binding: missing,
				warnings: [
					`Binding '${binding.key}': workflow "${workflow.name}" no longer starts with '${WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME}' or contains nodes an app cannot run.`,
				],
			};
		}
		const warnings: string[] = [];
		if (!published) {
			warnings.push(
				`Binding '${binding.key}': workflow "${workflow.name}" is not published. Types for "${binding.key}" come from the unpublished draft; the app gets an error until it is published.`,
			);
		}
		// `inferInputSchema` also treats a trigger without declared fields as passthrough.
		const trigger = detectTriggerNode(workflow);
		const passthrough = listWorkflowInputFields(trigger.node).length === 0;
		if (passthrough) {
			warnings.push(
				`Binding '${binding.key}': workflow "${workflow.name}" accepts any input (trigger has no declared fields): the app cannot type-check its input and the server does not validate it. Declare fields on the trigger to get typed input.`,
			);
		}
		const { output, outputSource } = await this.inferOutput(workflow.id);
		if (outputSource.kind === 'unknown') {
			warnings.push(
				`Binding '${binding.key}': output is untyped. Run the workflow once (executions run) and call \`apps bindings\` to type it from the result.`,
			);
		}
		return {
			binding: {
				key: binding.key,
				kind: binding.kind,
				workflowId: workflow.id,
				name: workflow.name,
				published,
				input: passthrough
					? PASSTHROUGH_INPUT_SCHEMA
					: inputJsonSchema(trigger.node, trigger.triggerType),
				output,
				outputSource,
			},
			warnings,
		};
	}

	/** Scoped to the app's project, like the runtime: a table moved elsewhere reads as missing. */
	private async describeDataTableBinding(
		projectId: string,
		binding: DataTableBinding,
	): Promise<Described> {
		try {
			const table = await this.dataTableService.validateDataTableExists(
				binding.dataTableId,
				projectId,
			);
			const columns = (await this.dataTableService.getColumns(binding.dataTableId, projectId)).map(
				({ name, type }) => ({ name, type }),
			);
			return {
				binding: {
					key: binding.key,
					kind: binding.kind,
					dataTableId: binding.dataTableId,
					name: table.name,
					permissions: binding.permissions,
					columns,
					row: rowJsonSchema(columns),
				},
				warnings: [],
			};
		} catch (error) {
			if (!(error instanceof DataTableNotFoundError)) throw error;
			return {
				binding: { key: binding.key, kind: binding.kind, name: binding.key, missing: true },
				warnings: [
					`Binding '${binding.key}': data table '${binding.dataTableId}' no longer exists in the app's project.`,
				],
			};
		}
	}

	/** Only the published version answers visitors, so an unpublished agent binds with a warning, like a workflow. */
	private async describeAgentBinding(projectId: string, binding: AgentBinding): Promise<Described> {
		if (!this.moduleRegistry.isActive('agents')) {
			return {
				binding: { key: binding.key, kind: binding.kind, name: binding.key, missing: true },
				warnings: [`Binding '${binding.key}': ${AGENTS_DISABLED_MESSAGE}`],
			};
		}
		const agent = await this.agentsService.findById(binding.agentId, projectId);
		if (!agent) {
			return {
				binding: { key: binding.key, kind: binding.kind, name: binding.key, missing: true },
				warnings: [
					`Binding '${binding.key}': agent '${binding.agentId}' no longer exists in the app's project.`,
				],
			};
		}
		const published = agent.activeVersionId !== null;
		return {
			binding: {
				key: binding.key,
				kind: binding.kind,
				agentId: agent.id,
				name: agent.name,
				permissions: binding.permissions,
				published,
			},
			warnings: published
				? []
				: [
						`Binding '${binding.key}': agent "${agent.name}" is not published. The app gets an error until it is published.`,
					],
		};
	}

	/**
	 * Same query as `ExecutionService.getLastSuccessfulExecution`, without redaction: no user
	 * is acting here and only key names and kinds leave `inferOutputFields`, never values.
	 * Scoping by `workflowId` alone is enough because `loadBoundWorkflow` already confirmed the
	 * workflow belongs to the app's project. Oversized run data arrives empty and reads as no sample.
	 */
	private async inferOutput(
		workflowId: string,
	): Promise<Pick<DescribedWorkflowBinding, 'output' | 'outputSource'>> {
		const [execution] = await this.executionPersistence.findMultipleExecutions(
			{
				select: ['id', 'mode', 'startedAt', 'stoppedAt', 'workflowId', 'jsonSizeBytes'],
				where: { workflowId, status: 'success' },
				order: { id: 'DESC' },
				take: 1,
			},
			{
				includeData: true,
				unflattenData: true,
				maxDataSizeBytes: this.globalConfig.executions.maxDisplaySize,
			},
		);
		const output = execution ? inferOutputSchema(sampleOutputItems(execution.data)) : null;
		if (!execution || !output) {
			return { output: UNKNOWN_OUTPUT_SCHEMA, outputSource: { kind: 'unknown' } };
		}
		return {
			output,
			outputSource: {
				kind: 'execution',
				executionId: execution.id,
				at: (execution.stoppedAt ?? execution.startedAt).toISOString(),
			},
		};
	}

	/** Same loader and options as the runtime, so describe sees the nodes the runtime runs. */
	private async loadBoundWorkflow(
		projectId: string,
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; published: boolean } | null> {
		const reference = { workflowId, workflowName: '' };
		try {
			const workflow = await this.workflowLoader.loadWorkflow(projectId, reference, {
				usePublishedVersion: true,
			});
			return workflow && { workflow, published: true };
		} catch (error) {
			if (!(error instanceof WorkflowToolUnavailableError) || error.reason !== 'not_published') {
				throw error;
			}
			const draft = await this.workflowLoader.loadWorkflow(projectId, reference);
			return draft && { workflow: draft, published: false };
		}
	}

	/** Scoped to `appId` so a versionId from a different app is treated as not found. */
	private async getVersion(appId: string, versionId: string) {
		const version = await this.appVersionService.findById(versionId);
		if (!version || version.appId !== appId) throw new AppVersionNotFoundError(versionId);
		return version;
	}

	async listVersionFiles(appId: string, versionId: string) {
		const version = await this.getVersion(appId, versionId);
		return await this.appVersionService.listSourceFiles(version);
	}

	async labelVersionsSince(appId: string, since: Date, label: string) {
		await this.appVersionService.labelVersionsSince(appId, since, label);
	}

	/** The stored source tarball of a version, for download. */
	async getVersionSource(appId: string, versionId: string) {
		const app = await this.getApp(appId);
		const version = await this.getVersion(appId, versionId);
		const data = await this.appVersionService.readSourceOf(version);
		if (!data) throw new AppVersionNotFoundError(versionId);
		return { fileName: `${app.namespace}-${version.id}.tgz`, data };
	}

	/** Copies a past version's source into a new working-copy version. */
	async restoreVersion(appId: string, versionId: string) {
		const app = await this.getApp(appId);
		const version = await this.getVersion(appId, versionId);
		const restored = await this.appVersionService.restore(version);
		return this.appVersionService.toResponse(restored, app.activeVersionId);
	}

	async getVersionFileContent(appId: string, versionId: string, segments: string[]) {
		const version = await this.getVersion(appId, versionId);
		const content = await this.appVersionService.readSourceFile(version, segments);
		if (content === undefined) throw new AppVersionFileNotFoundError(segments.join('/'));
		return { content };
	}

	/**
	 * The app's pages, derived from its source's `src/router.ts` — `[]` when the
	 * app has no version yet, or that version's source has no `src/router.ts`.
	 */
	async listRoutes(appId: string) {
		const app = await this.getApp(appId);
		const routerSource = await this.appVersionService.readRouterSource(app);
		return routerSource ? deriveRoutesFromRouterSource(routerSource) : [];
	}
}
