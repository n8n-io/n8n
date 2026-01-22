import type {
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';

import { PLACEHOLDER_EMPTY_EXECUTION_ID, RESUME_TOKEN_QUERY_PARAM } from '@/constants';

import {
	setWorkflowExecutionMetadata,
	setAllWorkflowExecutionMetadata,
	getWorkflowExecutionMetadata,
	getAllWorkflowExecutionMetadata,
} from './execution-metadata';
import { getSecretsProxy } from './get-secrets-proxy';

function appendResumeToken(url: string, token: string): string {
	const urlObj = new URL(url);
	urlObj.searchParams.set(RESUME_TOKEN_QUERY_PARAM, token);
	return urlObj.toString();
}

/** Returns the additional keys for Expressions and Function-Nodes */
export function getAdditionalKeys(
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	runExecutionData: IRunExecutionData | null,
	options?: { secretsEnabled?: boolean },
): IWorkflowDataProxyAdditionalKeys {
	const executionId = additionalData.executionId ?? PLACEHOLDER_EMPTY_EXECUTION_ID;

	// Add resumeToken to resumeUrl and resumeFormUrl if available
	let resumeUrl = `${additionalData.webhookWaitingBaseUrl}/${executionId}`;
	let resumeFormUrl = `${additionalData.formWaitingBaseUrl}/${executionId}`;
	if (runExecutionData?.resumeToken) {
		const token = runExecutionData.resumeToken;
		resumeUrl = appendResumeToken(resumeUrl, token);
		resumeFormUrl = appendResumeToken(resumeFormUrl, token);
	}
	return {
		$execution: {
			id: executionId,
			mode: mode === 'manual' ? 'test' : 'production',
			resumeUrl,
			resumeFormUrl,
			customData: runExecutionData
				? {
						set(key: string, value: string): void {
							try {
								setWorkflowExecutionMetadata(runExecutionData, key, value);
							} catch (e) {
								if (mode === 'manual') {
									throw e;
								}
								// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
								LoggerProxy.debug(e.message);
							}
						},
						setAll(obj: Record<string, string>): void {
							try {
								setAllWorkflowExecutionMetadata(runExecutionData, obj);
							} catch (e) {
								if (mode === 'manual') {
									throw e;
								}
								// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
								LoggerProxy.debug(e.message);
							}
						},
						get(key: string): string {
							return getWorkflowExecutionMetadata(runExecutionData, key);
						},
						getAll(): Record<string, string> {
							return getAllWorkflowExecutionMetadata(runExecutionData);
						},
					}
				: undefined,
		},
		$vars: additionalData.variables,
		$secrets: options?.secretsEnabled ? getSecretsProxy(additionalData) : undefined,

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
	options?: { secretsEnabled?: boolean },
): IWorkflowDataProxyAdditionalKeys {
	return {
		$vars: additionalData.variables,
		$secrets: options?.secretsEnabled ? getSecretsProxy(additionalData) : undefined,
	};
}
