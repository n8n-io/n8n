import type { EndpointModelConfig, ModelConfig } from '../types';

export const MODAL_SESSION_HEADER = 'Modal-Session-ID';

export function isEndpointModelConfig(modelId: ModelConfig): modelId is EndpointModelConfig {
	return typeof modelId === 'object' && 'kind' in modelId && modelId.kind === 'endpoint';
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
