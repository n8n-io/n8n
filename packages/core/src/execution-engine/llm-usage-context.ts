import type {
	INode,
	INodeCredentials,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	LlmUsageNodeContext,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

/** Reads the response of one detected LLM request. */
export interface LlmResponseInspector {
	/** A whole response body: parsed JSON, a string or a Buffer. */
	onResponse(body: unknown): void;
	onStreamChunk(chunk: Buffer): void;
	onStreamEnd(): void;
	/** Runs before the request is sent. Rejects to block the call, for example over a budget. */
	check?(): Promise<void>;
}

/** Hooks that the llm-usage module puts on `additionalData`. */
export interface LlmUsageHooks {
	/** Returns an inspector only for requests that look like LLM calls. */
	inspectRequest?(input: {
		context: LlmUsageNodeContext;
		/** The credential types of the node. A provider credential names the provider. */
		credentialTypes: string[];
		/** The credential slots of the node, to record which credential pays for the call. */
		credentials?: INodeCredentials;
		/** The credential type that the helper authenticates with, when it is known. */
		credentialType?: string;
		requestBody: unknown;
	}): LlmResponseInspector | undefined;
}

/** What a node's run adds to the context of the LLM calls that its helpers send. */
export interface LlmUsageRun {
	runExecutionData?: IRunExecutionData | null;
	mode?: WorkflowExecuteMode;
}

/** The context of an LLM call that a node makes: its workflow, execution, node, project and user. */
export function buildLlmUsageNodeContext(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	{ runExecutionData, mode }: LlmUsageRun = {},
): LlmUsageNodeContext {
	return {
		callerType: 'node',
		workflowId: workflow.id,
		executionId: additionalData.executionId,
		// A sub-workflow reports the mode of the run that started it.
		executionMode: additionalData.rootExecutionMode ?? mode,
		nodeName: node.name,
		nodeType: node.type,
		projectId: additionalData.projectId,
		// Workers do not pass userId to getBase; manual runs keep it in the run data.
		userId: additionalData.userId ?? runExecutionData?.manualData?.userId,
	};
}
