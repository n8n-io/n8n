import type {
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { PLACEHOLDER_EMPTY_EXECUTION_ID, WAITING_TOKEN_QUERY_PARAM } from '@/constants';

import { createExecutionCustomData } from './custom-data';
import { getSecretsProxy } from './get-secrets-proxy';

function appendResumeToken(url: string, token: string): string {
	const urlObj = new URL(url);
	urlObj.searchParams.set(WAITING_TOKEN_QUERY_PARAM, token);
	return urlObj.toString();
}

/** Returns the additional keys for Expressions and Function-Nodes */
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
			customData: runExecutionData
				? createExecutionCustomData({ runExecutionData, mode })
				: undefined,
		},
		$vars: additionalData.variables,
		$secrets: getSecretsProxy(additionalData),

		// deprecated
		$executionId: executionId,
		$resumeWebhookUrl: resumeUrl,
	};
}

/**
 * Returns the global additional keys for Expressions
 * without workflow execution context
 * */
export function getNonWorkflowAdditionalKeys(
	additionalData: IWorkflowExecuteAdditionalData,
): IWorkflowDataProxyAdditionalKeys {
	return {
		$vars: additionalData.variables,
		$secrets: getSecretsProxy(additionalData),
	};
}
