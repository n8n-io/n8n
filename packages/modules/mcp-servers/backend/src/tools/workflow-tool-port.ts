import type { RefreshTokenPort } from '../access/refresh-token-port';
import type { OAuthClientNamePort } from './oauth-client-name-port';
import type { TextDraftPort } from './text-draft-port';

/**
 * The CLI implements these ports and registers them when it loads the module.
 * They keep this package free of imports from `packages/cli`.
 *
 * Every method acts as the server's project. The adapter checks that the
 * workflow belongs to `projectId`.
 */

/**
 * Why a workflow cannot be a tool:
 * - `not_found`: the project does not own the workflow, or it is archived.
 * - `not_published`: the workflow has no published version.
 * - `no_supported_trigger`: it has no trigger "When Executed by Another Workflow".
 * - `incompatible_nodes`: the trigger reaches a node that cannot run as a tool.
 * - `not_callable`: its sub-workflow policy does not allow calls from the project.
 */
export type WorkflowToolRefusal =
	| 'not_found'
	| 'not_published'
	| 'no_supported_trigger'
	| 'incompatible_nodes'
	| 'not_callable';

/** A JSON schema of the tool input. It always describes an object. */
export interface WorkflowToolInputSchema {
	type: 'object';
	properties?: Record<string, unknown>;
	required?: string[];
	additionalProperties: boolean | Record<string, unknown>;
}

export type WorkflowToolCheck =
	| { callable: true }
	| { callable: false; reason: WorkflowToolRefusal };

/** A workflow that the project owns and that is not archived. */
export interface WorkflowToolListItem {
	workflowId: string;
	name: string;
	description: string | null;
}

/**
 * The name and the description of the workflow, and the inputs and the node names of its
 * published version.
 */
export type WorkflowToolDescription =
	| {
			callable: true;
			name: string;
			description: string | null;
			inputSchema: WorkflowToolInputSchema;
			nodeNames: string[];
	  }
	| { callable: false; reason: WorkflowToolRefusal };

export interface WorkflowToolRunOptions {
	/** How long the call waits for the run, in milliseconds. After that the run goes on, and the result has status `running`. */
	waitMs: number;
}

/** A run that started. */
export type WorkflowToolStartedRun = {
	executionId: string;
	/**
	 * Settles when the execution finishes, also after the wait ended. A cap for
	 * each server holds its slot until then.
	 */
	finished: Promise<void>;
} & (
	| { status: 'success'; output: unknown[] }
	| {
			status: 'error';
			/** The raw error of the run. It can name hosts and tables, so the caller decides who sees it. */
			error: { message: string; nodeType?: string };
	  }
	| { status: 'running' | 'waiting' | 'canceled' | 'unknown' }
);

export type WorkflowToolRunResult =
	| { status: 'refused'; reason: WorkflowToolRefusal }
	| { status: 'invalid_input'; message: string }
	/** The instance limit of concurrent tool runs is full. */
	| { status: 'busy' }
	| WorkflowToolStartedRun;

export abstract class WorkflowToolPort {
	/**
	 * Every workflow that the project owns, for the workflow picker, or only the given workflows.
	 * A workflow that another project shares is not in the list. It does not run `check`.
	 */
	abstract list(projectId: string, workflowIds?: string[]): Promise<WorkflowToolListItem[]>;

	abstract check(projectId: string, workflowId: string): Promise<WorkflowToolCheck>;

	abstract describe(projectId: string, workflowId: string): Promise<WorkflowToolDescription>;

	/** Runs the published version in the mode `integrated`, with the credentials of the workflow. */
	abstract run(
		projectId: string,
		workflowId: string,
		input: unknown,
		options: WorkflowToolRunOptions,
	): Promise<WorkflowToolRunResult>;
}

/**
 * The CLI registers this resolver when it loads the module. The module calls it
 * in `init()`, because the adapters need the database connection, which does not
 * exist yet at load time.
 */
export abstract class McpServerToolAdapters {
	abstract resolve(): {
		workflows: WorkflowToolPort;
		textDrafts: TextDraftPort;
		clients: OAuthClientNamePort;
		refreshTokens: RefreshTokenPort;
	};
}
