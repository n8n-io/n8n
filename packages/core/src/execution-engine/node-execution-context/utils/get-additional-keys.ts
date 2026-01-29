import type {
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';

import { PLACEHOLDER_EMPTY_EXECUTION_ID, WAITING_TOKEN_QUERY_PARAM } from '@/constants';
import { generateUrlSignature, prepareUrlForSigning } from '@/utils/signature-helpers';

import {
	setWorkflowExecutionMetadata,
	setAllWorkflowExecutionMetadata,
	getWorkflowExecutionMetadata,
	getAllWorkflowExecutionMetadata,
} from './execution-metadata';
import { getSecretsProxy } from './get-secrets-proxy';

/**
 * Sign the URL using HMAC with the instance secret as the key.
 * This ensures the URL cannot be tampered with.
 */
function appendResumeSignature(url: string, secret: string): string {
	try {
		const urlObj = new URL(url);
		const urlForSigning = prepareUrlForSigning(urlObj);
		const signature = generateUrlSignature(urlForSigning, secret);
		urlObj.searchParams.set(WAITING_TOKEN_QUERY_PARAM, signature);
		return urlObj.toString();
	} catch {
		LoggerProxy.warn(`Failed to sign resume URL: invalid URL "${url}"`);
		return url;
	}
}

/** Returns the additional keys for Expressions and Function-Nodes */
export function getAdditionalKeys(
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	runExecutionData: IRunExecutionData | null,
	options?: { secretsEnabled?: boolean },
): IWorkflowDataProxyAdditionalKeys {
	const executionId = additionalData.executionId ?? PLACEHOLDER_EMPTY_EXECUTION_ID;

	// Sign the resumeUrl and resumeFormUrl with HMAC using instance secret
	let resumeUrl = `${additionalData.webhookWaitingBaseUrl}/${executionId}`;
	let resumeFormUrl = `${additionalData.formWaitingBaseUrl}/${executionId}`;
	if (additionalData.hmacSignatureSecret) {
		resumeUrl = appendResumeSignature(resumeUrl, additionalData.hmacSignatureSecret);
		resumeFormUrl = appendResumeSignature(resumeFormUrl, additionalData.hmacSignatureSecret);
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
