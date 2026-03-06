import type {
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { PLACEHOLDER_EMPTY_EXECUTION_ID } from '@/constants';

import { createExecutionCustomData } from './custom-data';
import { getSecretsProxy } from './get-secrets-proxy';

/** Returns the additional keys for Expressions and Function-Nodes */
export function getAdditionalKeys(
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	runExecutionData: IRunExecutionData | null,
): IWorkflowDataProxyAdditionalKeys {
	const executionId = additionalData.executionId ?? PLACEHOLDER_EMPTY_EXECUTION_ID;
	const resumeUrl = `${additionalData.webhookWaitingBaseUrl}/${executionId}`;
	const resumeFormUrl = `${additionalData.formWaitingBaseUrl}/${executionId}`;
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
