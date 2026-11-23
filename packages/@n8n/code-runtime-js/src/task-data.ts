import type { CodeTaskInput } from '@n8n/code-task-contract';
import {
	Workflow,
	WorkflowDataProxy,
	type INodeExecutionData,
	type INodeType,
	type INodeTypes,
	type IWorkflowDataProxyAdditionalKeys,
} from 'n8n-workflow';

/** Input items of a task and the globals that read workflow data, e.g. `$json` and `$('Node')`. */
export interface TaskData {
	items: INodeExecutionData[];
	getBuiltIns(itemIndex: number): Record<string, unknown>;
}

const unknownNodeTypes: INodeTypes = {
	getByName: () => unknownNodeType(),
	getByNameAndVersion: () => unknownNodeType(),
	getKnownTypes: () => ({}),
};

function unknownNodeType(): INodeType {
	// @ts-expect-error `INodeTypes` does not allow `undefined`, but its callers handle it
	return undefined;
}

function withResumeToken(url: string, token: string) {
	const urlObject = new URL(url);
	urlObject.searchParams.set('signature', token);
	return urlObject.toString();
}

function getAdditionalKeys({
	additionalData,
	mode,
	runExecutionData,
}: CodeTaskInput['data']): IWorkflowDataProxyAdditionalKeys {
	const executionId = additionalData.executionId ?? '__UNKNOWN__';
	let resumeUrl = `${additionalData.webhookWaitingBaseUrl}/${executionId}`;
	let resumeFormUrl = `${additionalData.formWaitingBaseUrl}/${executionId}`;
	if (runExecutionData.resumeToken) {
		resumeUrl = withResumeToken(resumeUrl, runExecutionData.resumeToken);
		resumeFormUrl = withResumeToken(resumeFormUrl, runExecutionData.resumeToken);
	}

	return {
		$execution: {
			id: executionId,
			mode: mode === 'manual' ? 'test' : 'production',
			resumeUrl,
			resumeFormUrl,
		},
		$evaluation: additionalData.evaluationRunId
			? { runId: additionalData.evaluationRunId }
			: undefined,
		$vars: additionalData.variables,
		$secrets: undefined,
		// Keep these aliases for backward compatibility with existing Code nodes.
		// oxlint-disable-next-line typescript/no-deprecated
		$executionId: executionId,
		// oxlint-disable-next-line typescript/no-deprecated
		$resumeWebhookUrl: resumeUrl,
	};
}

export function createTaskData({ data, chunk }: Pick<CodeTaskInput, 'data' | 'chunk'>): TaskData {
	const inputItems = data.inputData.main?.[0] ?? [];
	const items = chunk
		? Array.from<INodeExecutionData>({ length: chunk.startIndex }).concat(inputItems)
		: inputItems;

	const workflow = new Workflow({ ...data.workflow, nodeTypes: unknownNodeTypes });
	const executeData = {
		data: { ...data.inputData, main: [items] },
		node: data.node,
		source: data.connectionInputSource,
	};

	return {
		items,
		getBuiltIns: (itemIndex) => ({
			...new WorkflowDataProxy(
				workflow,
				data.runExecutionData,
				data.runIndex,
				itemIndex,
				data.activeNodeName,
				items,
				data.siblingParameters,
				data.mode,
				getAdditionalKeys(data),
				executeData,
				data.defaultReturnRunIndex,
				data.selfData,
				data.contextNodeName,
				data.envProviderState,
			).getDataProxy({ throwOnMissingExecutionData: false }),
			$getWorkflowStaticData: (type: 'global' | 'node') => workflow.getStaticData(type, data.node),
		}),
	};
}
