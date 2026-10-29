import type {
	AgentSseEvent,
	AppAgentBinding,
	AppAgentChatRequest,
	AppAgentResumeRequest,
	AppDataTableBinding,
	AppDescribedAgentBinding,
	AppDescribedDataTableBinding,
	AppDescribedWorkflowBinding,
	AppRuntimeRowInput,
	AppWorkflowBinding,
	AppWorkflowRunResult,
	DataTableFilter,
	ListDataTableContentQueryDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';

/**
 * The CLI implements these ports and registers them when it loads the apps module.
 * They keep this package free of imports from `packages/cli`.
 *
 * Every runtime method acts as the app project. The caller resolved the binding
 * key and checked its permissions before the call. The adapter must still check
 * that the resource belongs to `ctx.projectId`.
 */

export type AppVisitor = { type: 'user'; userId: string } | { type: 'anonymous'; id: string };

export interface AppCallContext {
	appId: string;
	namespace: string;
	projectId: string;
	bindingKey: string;
	visitor: AppVisitor;
}

export type AppRow = Record<string, unknown>;

export abstract class AppDataTablePort {
	/** Throws a `UserError` subclass when `user` cannot grant this binding to the app. */
	abstract assertCanBind(
		user: User,
		projectId: string,
		binding: AppDataTableBinding,
	): Promise<void>;

	/** Returns `null` when the table is not in the project. */
	abstract describe(
		projectId: string,
		binding: AppDataTableBinding,
	): Promise<AppDescribedDataTableBinding | null>;

	abstract listRows(
		ctx: AppCallContext,
		dataTableId: string,
		query: ListDataTableContentQueryDto,
	): Promise<{ count: number; data: AppRow[] }>;

	abstract insertRows(
		ctx: AppCallContext,
		dataTableId: string,
		rows: AppRuntimeRowInput[],
	): Promise<AppRow[]>;

	abstract updateRows(
		ctx: AppCallContext,
		dataTableId: string,
		filter: DataTableFilter,
		data: AppRuntimeRowInput,
	): Promise<AppRow[]>;

	abstract deleteRows(
		ctx: AppCallContext,
		dataTableId: string,
		filter: DataTableFilter,
	): Promise<AppRow[]>;
}

export abstract class AppWorkflowPort {
	abstract assertCanBind(user: User, projectId: string, binding: AppWorkflowBinding): Promise<void>;

	/** Returns `null` when the workflow is not in the project or cannot run from an app. */
	abstract describe(
		projectId: string,
		binding: AppWorkflowBinding,
	): Promise<AppDescribedWorkflowBinding | null>;

	/** Returns status `running` when the run did not finish in time. */
	abstract run(
		ctx: AppCallContext,
		workflowId: string,
		input: unknown,
	): Promise<AppWorkflowRunResult>;

	/** Throws `run_not_found` unless the execution was started by this app, binding, and visitor. */
	abstract getRun(
		ctx: AppCallContext,
		workflowId: string,
		executionId: string,
	): Promise<AppWorkflowRunResult>;
}

export interface AppAgentTurn {
	/** Events in the same shape that the n8n chat UI reads. Error text is already safe for visitors. */
	events: AsyncIterable<AgentSseEvent>;
}

/**
 * The CLI registers this resolver when it loads the module. The module calls it
 * in `init()`, because the adapters need the database connection, which does not
 * exist yet at load time.
 */
export abstract class AppBindingAdapters {
	abstract resolve(): {
		dataTables: AppDataTablePort;
		workflows: AppWorkflowPort;
		agents: AppAgentPort;
	};
}

export abstract class AppAgentPort {
	abstract assertCanBind(user: User, projectId: string, binding: AppAgentBinding): Promise<void>;

	/** Returns `null` when the agent is not in the project. */
	abstract describe(
		projectId: string,
		binding: AppAgentBinding,
	): Promise<AppDescribedAgentBinding | null>;

	/** All refusals throw before the returned stream starts. */
	abstract chat(
		ctx: AppCallContext,
		agentId: string,
		request: AppAgentChatRequest,
		signal: AbortSignal,
	): Promise<AppAgentTurn>;

	abstract resume(
		ctx: AppCallContext,
		agentId: string,
		request: AppAgentResumeRequest,
		signal: AbortSignal,
	): Promise<AppAgentTurn>;

	abstract messages(ctx: AppCallContext, agentId: string, sessionId: string): Promise<unknown>;
}
