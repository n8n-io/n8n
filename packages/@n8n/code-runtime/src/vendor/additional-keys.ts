// Copy of getAdditionalKeys and createExecutionCustomData from n8n-core.
import type {
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecutionCustomData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';

import {
	getAllWorkflowExecutionMetadata,
	getWorkflowExecutionMetadata,
	setAllWorkflowExecutionMetadata,
	setWorkflowExecutionMetadata,
} from './execution-metadata';

const PLACEHOLDER_EMPTY_EXECUTION_ID = '__UNKNOWN__';
const WAITING_TOKEN_QUERY_PARAM = 'signature';

function appendResumeToken(url: string, token: string): string {
	const urlObj = new URL(url);
	urlObj.searchParams.set(WAITING_TOKEN_QUERY_PARAM, token);
	return urlObj.toString();
}

function createExecutionCustomData(
	runExecutionData: IRunExecutionData,
	mode: WorkflowExecuteMode,
): IWorkflowExecutionCustomData {
	const guard = (fn: () => void) => {
		try {
			fn();
		} catch (e) {
			if (mode === 'manual') throw e;
			LoggerProxy.debug((e as Error).message);
		}
	};
	return {
		set: (key: string, value: string) =>
			guard(() => setWorkflowExecutionMetadata(runExecutionData, key, value)),
		setAll: (obj: Record<string, string>) =>
			guard(() => setAllWorkflowExecutionMetadata(runExecutionData, obj)),
		get: (key: string) => getWorkflowExecutionMetadata(runExecutionData, key),
		getAll: () => getAllWorkflowExecutionMetadata(runExecutionData),
	};
}

/** Returns the additional keys for Code node built-ins. `$secrets` is never set. */
export function getAdditionalKeys(
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	runExecutionData: IRunExecutionData | null,
): IWorkflowDataProxyAdditionalKeys {
	const executionId = additionalData.executionId ?? PLACEHOLDER_EMPTY_EXECUTION_ID;
	let resumeUrl = `${additionalData.webhookWaitingBaseUrl}/${executionId}`;
	let resumeFormUrl = `${additionalData.formWaitingBaseUrl}/${executionId}`;
	if (runExecutionData?.resumeToken) {
		resumeUrl = appendResumeToken(resumeUrl, runExecutionData.resumeToken);
		resumeFormUrl = appendResumeToken(resumeFormUrl, runExecutionData.resumeToken);
	}
	return {
		$execution: {
			id: executionId,
			mode: mode === 'manual' ? 'test' : 'production',
			resumeUrl,
			resumeFormUrl,
			customData: runExecutionData ? createExecutionCustomData(runExecutionData, mode) : undefined,
		},
		$evaluation: additionalData.evaluationRunId
			? { runId: additionalData.evaluationRunId }
			: undefined,
		$vars: additionalData.variables,
		$secrets: undefined,
		$executionId: executionId,
		$resumeWebhookUrl: resumeUrl,
	};
}
