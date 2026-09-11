import { OutboundHttp } from '@n8n/backend-network';
import { Logger } from '@n8n/backend-common';
import { CredentialsRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { WebhookContext } from 'n8n-core';
import type {
	DataTableRowReturn,
	DataTableRowReturnWithState,
	IWebhookData,
	INode,
} from 'n8n-workflow';
import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	jsonParse,
	UnexpectedError,
	UserError,
	Workflow,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { NodeTypes } from '@/node-types';
import { getBase } from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { MenuItem } from '../serving/page-menu';
import { buildActionUrl } from './action-url';
import { DataTableProxyService } from '../../data-table/data-table-proxy.service';
import { DataTableService } from '../../data-table/data-table.service';
import {
	executeWorkflow,
	type WorkflowToolRunContext,
} from '../../agents/tools/workflow-tool-factory';
import { WorkflowToolWorkflowLoader } from '../../agents/tools/workflow-tool-workflow-loader.service';

// ---------------------------------------------------------------------------
// Host-side mirror of the ambient `PageContext`/`ActionContext` types in
// `packages/@n8n/api-types/src/schemas/app-page-api.ts` (`appPageApiTypes`).
// Kept in sync by hand: that file is a string constant for the isolate/editor,
// not something these host services can import.
// ---------------------------------------------------------------------------

export type AppDataTableValue = string | number | boolean | Date | null;
export type AppDataTableRow = Record<string, AppDataTableValue>;
export type AppDataTableRowResult = AppDataTableRow & {
	id: number;
	createdAt: Date;
	updatedAt: Date;
};
export type AppDataTableColumn = {
	id: string;
	name: string;
	type: 'string' | 'number' | 'boolean' | 'date';
	index: number;
};
export type AppDataTableFilter = {
	type: 'and' | 'or';
	filters: Array<{
		columnName: string;
		condition: 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';
		value: AppDataTableValue;
	}>;
};

export interface AppDataTableHandle {
	readonly id: string;
	readonly name: string;
	getColumns(): Promise<AppDataTableColumn[]>;
	getManyRowsAndCount(options?: {
		filter?: AppDataTableFilter;
		sortBy?: [string, 'ASC' | 'DESC'];
		take?: number;
		skip?: number;
	}): Promise<{ count: number; data: AppDataTableRowResult[] }>;
	insertRows(rows: AppDataTableRow[]): Promise<AppDataTableRowResult[]>;
	updateRows(options: { filter: AppDataTableFilter; data: AppDataTableRow }): Promise<
		AppDataTableRowResult[]
	>;
	upsertRow(options: { filter: AppDataTableFilter; data: AppDataTableRow }): Promise<
		AppDataTableRowResult[]
	>;
	deleteRows(options: { filter: AppDataTableFilter }): Promise<AppDataTableRowResult[]>;
}

export interface AppDataTablesApi {
	list(): Promise<Array<{ id: string; name: string }>>;
	get(idOrName: string): Promise<AppDataTableHandle>;
}

export type AppWorkflowSummary = {
	id: string;
	name: string;
	published: boolean;
	triggerType: 'executeWorkflow' | 'form' | 'other';
};
export type AppFormField = {
	fieldLabel: string;
	fieldName?: string;
	fieldType?: string;
	requiredField?: boolean;
	placeholder?: string;
	defaultValue?: string;
	fieldOptions?: { values: Array<{ option: string }> };
	multiselect?: boolean;
};
export type AppWorkflowRunResult =
	| { status: 'success'; executionId: string; data: unknown }
	| { status: 'waiting'; executionId: string }
	| { status: 'error'; executionId?: string; error: string };

export interface AppWorkflowsApi {
	list(): Promise<AppWorkflowSummary[]>;
	execute(workflowId: string, input?: Record<string, unknown>): Promise<AppWorkflowRunResult>;
	getForm(
		workflowId: string,
	): Promise<{ title: string; description?: string; fields: AppFormField[] }>;
	submitForm(workflowId: string, fields: Record<string, unknown>): Promise<AppWorkflowRunResult>;
}

export interface AppCredentialsApi {
	get(name: string): Promise<Record<string, unknown>>;
}

export interface AppFetchResponse {
	status: number;
	headers: Record<string, string>;
	text(): Promise<string>;
	json(): Promise<unknown>;
}

export interface AppPageContext {
	readonly app: { id: string; name: string; namespace: string; projectId: string };
	readonly page: { id: string; route: string; path: string };
	readonly params: Readonly<Record<string, string>>;
	readonly query: Readonly<Record<string, string>>;
	readonly viewer: { id: string; email: string } | null;
	readonly menu: MenuItem[];
	readonly dataTables: AppDataTablesApi;
	readonly workflows: AppWorkflowsApi;
	readonly credentials: AppCredentialsApi;
	actionUrl(name: string): string;
	fetch(
		url: string,
		init?: { method?: string; headers?: Record<string, string>; body?: string },
	): Promise<AppFetchResponse>;
	log(...args: unknown[]): void;
}

export interface AppActionContext extends AppPageContext {
	readonly input: Readonly<Record<string, unknown>>;
}

export interface PageContextInput {
	app: { id: string; name: string; namespace: string; projectId: string };
	page: { id: string; route: string; path: string };
	/** The page whose `content` or `layout` holds the block; `actionUrl()` points at it. */
	actionPageId: string;
	/** The block whose actions `actionUrl()` resolves. */
	blockId: string;
	params: Record<string, string>;
	query: Record<string, string>;
	viewer: { id: string; email: string } | null;
	menu: MenuItem[];
	baseUrl: string;
	/** Collects `ctx.log(...)` lines for the caller (preview response / production log). */
	logs: string[];
}

const FETCH_TIMEOUT_MS = 10_000;
// ponytail: cap enforced after the body is fully read, not while streaming — a
// hostile server can still make us buffer up to the cap once. Stream-and-abort
// if that ever matters for this prototype.
const FETCH_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

const normalizeHeaders = (headers: Record<string, unknown>): Record<string, string> =>
	Object.fromEntries(
		Object.entries(headers).map(([key, value]) => [
			key,
			Array.isArray(value) ? value.join(', ') : String(value),
		]),
	);

/** Narrows away the dry-run branch of the data-table row-update return union; those calls never set `dryRun`. */
function assertNotDryRunRow(
	row: DataTableRowReturn | DataTableRowReturnWithState,
): DataTableRowReturn {
	if ('dryRunState' in row) {
		throw new UnexpectedError('Unexpected dry-run row from data table service');
	}
	return row;
}

const detectTriggerType = (nodes: INode[] | undefined): AppWorkflowSummary['triggerType'] => {
	const types = new Set((nodes ?? []).map((n) => n.type));
	if (types.has(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)) return 'executeWorkflow';
	if (types.has(FORM_TRIGGER_NODE_TYPE)) return 'form';
	return 'other';
};

/**
 * Builds the host-side `PageContext`/`ActionContext` for one block render or
 * action call, scoped to `input.app.projectId` (D7: the App's project is the
 * authorization boundary for every method). Consumed directly by the `table`,
 * `form` and `button` renderers, and by `runtime/app-code-runtime.ts` for the
 * `code` block, which dispatches isolate calls onto the same object.
 */
@Service()
export class PageContextFactory {
	constructor(
		private readonly dataTableProxyService: DataTableProxyService,
		private readonly dataTableService: DataTableService,
		private readonly workflowLoader: WorkflowToolWorkflowLoader,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly subworkflowPolicyChecker: SubworkflowPolicyChecker,
		private readonly activeExecutions: ActiveExecutions,
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsService: CredentialsService,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {}

	build(input: PageContextInput): AppPageContext {
		const { app } = input;

		const dataTables: AppDataTablesApi = {
			list: async () => {
				const { data } = await this.dataTableService.getManyAndCount({
					filter: { projectId: app.projectId },
				});
				return data.map(({ id, name }) => ({ id, name }));
			},
			get: async (idOrName) => await this.getDataTableHandle(app.projectId, idOrName),
		};

		const workflows: AppWorkflowsApi = {
			list: async () => await this.listWorkflows(app.projectId),
			execute: async (workflowId, workflowInput = {}) =>
				await this.executeTypedWorkflow(
					app.projectId,
					workflowId,
					EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
					workflowInput,
				),
			getForm: async (workflowId) => await this.getForm(app.projectId, workflowId),
			submitForm: async (workflowId, fields) =>
				await this.submitForm(app.projectId, workflowId, fields),
		};

		const credentials: AppCredentialsApi = {
			get: async (name) => await this.getCredential(app.projectId, name),
		};

		return {
			app,
			page: input.page,
			params: input.params,
			query: input.query,
			viewer: input.viewer,
			menu: input.menu,
			dataTables,
			workflows,
			credentials,
			actionUrl: (name) => buildActionUrl(input, name),
			fetch: async (url, init) => await this.fetch(url, init),
			log: (...args) => {
				input.logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
			},
		};
	}

	buildAction(input: PageContextInput & { input: Record<string, unknown> }): AppActionContext {
		return { ...this.build(input), input: input.input };
	}

	// -------------------------------------------------------------------------
	// Data tables
	// -------------------------------------------------------------------------

	private async getDataTableHandle(
		projectId: string,
		idOrName: string,
	): Promise<AppDataTableHandle> {
		const { data } = await this.dataTableService.getManyAndCount({ filter: { projectId } });
		const table = data.find((t) => t.id === idOrName || t.name === idOrName);
		if (!table) throw new UserError(`Data table "${idOrName}" not found in this App's project`);

		const ops = this.dataTableProxyService.makeDataTableOperationsForProject(projectId, table.id);

		return {
			id: table.id,
			name: table.name,
			getColumns: async () => await ops.getColumns(),
			getManyRowsAndCount: async (options = {}) => await ops.getManyRowsAndCount(options),
			insertRows: async (rows) => await ops.insertRows(rows, 'all'),
			updateRows: async (options) => (await ops.updateRows(options)).map(assertNotDryRunRow),
			upsertRow: async (options) => (await ops.upsertRow(options)).map(assertNotDryRunRow),
			deleteRows: async (options) => await ops.deleteRows(options),
		};
	}

	// -------------------------------------------------------------------------
	// Workflows
	// -------------------------------------------------------------------------

	// ponytail: N+1-free but still one query per list() call plus one for
	// placements; fine at prototype scale, batch further if project workflow
	// counts grow large.
	private async listWorkflows(projectId: string): Promise<AppWorkflowSummary[]> {
		const placements =
			await this.workflowFinderService.findOwnedWorkflowPlacementsInProject(projectId);
		const ids = placements.filter((p) => !p.isArchived).map((p) => p.id);
		const workflows = await this.workflowRepository.findByIds(ids, {
			fields: ['name', 'nodes', 'activeVersionId'],
		});
		return workflows.map((workflow) => ({
			id: workflow.id,
			name: workflow.name,
			published: workflow.activeVersionId !== null,
			triggerType: detectTriggerType(workflow.nodes),
		}));
	}

	private async loadPublishedWithTrigger(
		projectId: string,
		workflowId: string,
		triggerType: string,
	) {
		const workflow = await this.workflowLoader.loadWorkflow(
			projectId,
			{ workflowId, workflowName: workflowId },
			{ usePublishedVersion: true },
		);
		if (!workflow) throw new UserError(`Workflow "${workflowId}" not found in this App's project`);

		const triggerNode = (workflow.nodes ?? []).find((n) => n.type === triggerType);
		if (!triggerNode) {
			throw new UserError(`Workflow "${workflow.name}" has no trigger of type "${triggerType}"`);
		}
		return { workflow, triggerNode };
	}

	private workflowRunContext(projectId: string): WorkflowToolRunContext {
		return {
			workflowLoader: this.workflowLoader,
			workflowRunner: this.workflowRunner,
			subworkflowPolicyChecker: this.subworkflowPolicyChecker,
			activeExecutions: this.activeExecutions,
			projectId,
			executionMode: 'integrated',
		};
	}

	private toRunResult(result: {
		executionId: string;
		status: string;
		data?: Record<string, unknown>;
		error?: string;
	}): AppWorkflowRunResult {
		if (result.status === 'success') {
			return { status: 'success', executionId: result.executionId, data: result.data ?? null };
		}
		if (result.status === 'waiting') {
			return { status: 'waiting', executionId: result.executionId };
		}
		return {
			status: 'error',
			executionId: result.executionId,
			error: result.error ?? `Workflow execution ended with status "${result.status}"`,
		};
	}

	private async executeTypedWorkflow(
		projectId: string,
		workflowId: string,
		triggerType: string,
		input: Record<string, unknown>,
	): Promise<AppWorkflowRunResult> {
		try {
			const { workflow, triggerNode } = await this.loadPublishedWithTrigger(
				projectId,
				workflowId,
				triggerType,
			);
			const result = await executeWorkflow(
				workflow,
				triggerNode,
				input,
				this.workflowRunContext(projectId),
			);
			return this.toRunResult(result);
		} catch (error) {
			return { status: 'error', error: error instanceof Error ? error.message : String(error) };
		}
	}

	private async getForm(
		projectId: string,
		workflowId: string,
	): Promise<{ title: string; description?: string; fields: AppFormField[] }> {
		const { workflow, triggerNode } = await this.loadPublishedWithTrigger(
			projectId,
			workflowId,
			FORM_TRIGGER_NODE_TYPE,
		);

		const ephemeralWorkflow = new Workflow({
			id: workflow.id,
			name: workflow.name,
			nodes: [triggerNode],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});
		const additionalData = await getBase({ projectId });
		// No real webhook request backs this read, so the fields the base context needs
		// (method/path/name) are placeholders; nothing here calls the webhook-specific
		// members (`getBodyData`, `getRequestObject`, ...) that would need a real one.
		const webhookData: IWebhookData = {
			httpMethod: 'GET',
			node: triggerNode.name,
			path: '',
			webhookDescription: { httpMethod: 'GET', name: 'default', path: '' },
			workflowId: workflow.id,
			workflowExecuteAdditionalData: additionalData,
		};
		const context = new WebhookContext(
			ephemeralWorkflow,
			triggerNode,
			additionalData,
			'internal',
			webhookData,
			[],
			null,
		);

		const title = context.getNodeParameter('formTitle', '') as string;
		const description = context.getNodeParameter('formDescription', '') as string;
		const rawFields = context.getNodeParameter('formFields.values', []) as AppFormField[];

		const fields = rawFields.map((field) => ({
			...field,
			// Mirrors `prepareFormFields` in nodes-base/Form/utils: a hidden field has no
			// author-set label, so it renders under its own name.
			fieldLabel: field.fieldType === 'hiddenField' ? (field.fieldName ?? '') : field.fieldLabel,
		}));

		return { title, description: description || undefined, fields };
	}

	private async submitForm(
		projectId: string,
		workflowId: string,
		fields: Record<string, unknown>,
	): Promise<AppWorkflowRunResult> {
		try {
			const form = await this.getForm(projectId, workflowId);
			const missing = form.fields.filter((field) => {
				if (!field.requiredField) return false;
				const key = field.fieldName ?? field.fieldLabel;
				const value = fields[key];
				return value === undefined || value === '';
			});
			if (missing.length > 0) {
				const names = missing.map((f) => f.fieldName ?? f.fieldLabel).join(', ');
				return { status: 'error', error: `Missing required field(s): ${names}` };
			}
		} catch (error) {
			return { status: 'error', error: error instanceof Error ? error.message : String(error) };
		}

		return await this.executeTypedWorkflow(projectId, workflowId, FORM_TRIGGER_NODE_TYPE, {
			...fields,
			submittedAt: new Date().toISOString(),
			formMode: 'production',
		});
	}

	// -------------------------------------------------------------------------
	// Credentials
	// -------------------------------------------------------------------------

	private async getCredential(projectId: string, name: string): Promise<Record<string, unknown>> {
		const accessible = await this.credentialsRepository.findAllCredentialsForProject(projectId);
		const matches = accessible.filter((c) => c.name === name);
		if (matches.length === 0) {
			throw new UserError(`Credential "${name}" not found in this App's project`);
		}
		if (matches.length > 1) {
			throw new UserError(`Multiple credentials named "${name}" exist; use a unique name`);
		}

		this.logger.info('App code accessed a credential', {
			projectId,
			credentialId: matches[0].id,
			credentialName: name,
		});
		return await this.credentialsService.decrypt(matches[0]);
	}

	// -------------------------------------------------------------------------
	// fetch
	// -------------------------------------------------------------------------

	private async fetch(
		url: string,
		init?: { method?: string; headers?: Record<string, string>; body?: string },
	): Promise<AppFetchResponse> {
		const response = await this.outboundHttp
			.requests({ useDefaultSsrfPolicy: 'enforced', timeout: FETCH_TIMEOUT_MS })
			.request<string>({
				url,
				method: init?.method as never,
				headers: init?.headers,
				body: init?.body,
				encoding: 'text',
				maxRedirects: 3,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});

		const body = typeof response.body === 'string' ? response.body : '';
		if (Buffer.byteLength(body, 'utf8') > FETCH_MAX_RESPONSE_BYTES) {
			throw new UserError('fetch() response exceeded the 5 MB limit');
		}

		return {
			status: response.statusCode,
			headers: normalizeHeaders(response.headers),
			text: async () => body,
			json: async () => jsonParse(body),
		};
	}
}
