import { isRecord } from '@n8n/utils/is-record';

import type { ModelConfig } from '../types';

export const MODAL_SESSION_HEADER = 'Modal-Session-ID';

export function isEndpointModelConfig(modelId: ModelConfig): modelId is {
	id: `${string}/${string}`;
	url: string;
	apiKey?: string;
	headers?: Record<string, string>;
	supportsStructuredOutputs?: boolean;
} {
	if (!isRecord(modelId)) return false;
	if ('doGenerate' in modelId || 'specificationVersion' in modelId) return false;
	if (!('url' in modelId) || !('id' in modelId)) return false;

	const id = modelId.id;
	const url = modelId.url;
	if (typeof id !== 'string' || !id.includes('/')) return false;
	if (typeof url !== 'string') return false;
	return true;
}

export function isModalModelEndpoint(url: string | undefined): boolean {
	if (!url?.trim()) return false;
	try {
		const host = new URL(url).hostname.toLowerCase();
		return host.endsWith('.modal.direct') || host.endsWith('.modal.run');
	} catch {
		return false;
	}
}

export function withModalSession(modelId: ModelConfig, threadId: string): ModelConfig {
	const trimmedThreadId = threadId.trim();
	if (!trimmedThreadId || !isEndpointModelConfig(modelId)) return modelId;
	if (!isModalModelEndpoint(modelId.url)) return modelId;

	const existing = modelId.headers?.[MODAL_SESSION_HEADER];
	if (existing === trimmedThreadId) return modelId;

	return {
		...modelId,
		headers: {
			...modelId.headers,
			[MODAL_SESSION_HEADER]: trimmedThreadId,
		},
	};
}
