import type { GenAiProviderName } from '@n8n/ai-utilities/gen-ai';
import type { Span, Tracer } from '@opentelemetry/api';

import type { AttributeValue, BuiltTelemetry } from '../../types/telemetry';
import type { ProviderId } from '../model/provider-credentials';

const GEN_AI_PROVIDER_NAME_BY_PROVIDER: Record<ProviderId, GenAiProviderName | undefined> = {
	alibaba: 'alibaba_cloud',
	anthropic: 'anthropic',
	'aws-bedrock': 'aws.bedrock',
	'azure-openai': 'azure.ai.openai',
	cohere: 'cohere',
	custom: undefined,
	deepseek: 'deepseek',
	google: 'gcp.gemini',
	'google-vertex': 'gcp.vertex_ai',
	'google-vertex-anthropic': 'gcp.vertex_ai',
	groq: 'groq',
	minimax: 'minimax',
	mistral: 'mistral',
	moonshotai: 'moonshot_ai',
	nvidia: 'nvidia',
	openai: 'openai',
	openrouter: 'openrouter',
	vercel: 'vercel.ai_gateway',
	xai: 'x_ai',
};

export function getGenAiProviderName(provider: string): GenAiProviderName | undefined {
	const providerNames: Partial<Record<string, GenAiProviderName>> =
		GEN_AI_PROVIDER_NAME_BY_PROVIDER;
	return Object.hasOwn(providerNames, provider) ? providerNames[provider] : undefined;
}

function isTracer(value: unknown): value is Tracer {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'startSpan') === 'function'
	);
}

/** Record headers-time per HTTP attempt. Generation spans alone own token usage. */
export function traceModelRequests(
	delegate: typeof globalThis.fetch,
	telemetry: BuiltTelemetry | undefined,
	provider: ProviderId,
	model: string,
): typeof globalThis.fetch {
	if (!telemetry?.enabled || !telemetry.traceModelRequests || !isTracer(telemetry.tracer))
		return delegate;
	const tracer = telemetry.tracer;
	const providerName = getGenAiProviderName(provider);
	return async (input, init) => {
		let span: Span | undefined;
		try {
			const attributes: Record<string, AttributeValue> = {
				'gen_ai.system': provider,
				...(providerName ? { 'gen_ai.provider.name': providerName } : {}),
				'gen_ai.request.model': model,
			};
			if (telemetry.isLangSmith) {
				attributes['langsmith.traceable'] = 'true';
				attributes['langsmith.span.kind'] = 'chain';
				for (const [key, value] of Object.entries(telemetry.metadata ?? {})) {
					attributes[key.startsWith('langsmith.metadata.') ? key : `langsmith.metadata.${key}`] =
						value;
				}
			}
			span = tracer.startSpan('model.provider.request', { attributes });
		} catch {
			/* Telemetry must not prevent a provider request. */
		}
		try {
			const response = await delegate(input, init);
			try {
				span?.setAttributes({ 'http.response.status_code': response.status });
				span?.setStatus({ code: response.ok ? 1 : 2 });
			} catch {
				/* Preserve the provider response. */
			}
			return response;
		} catch (error) {
			try {
				span?.setStatus({ code: 2 });
			} catch {
				/* No error bodies in spans. */
			}
			throw error;
		} finally {
			try {
				span?.end();
			} catch {
				/* Export errors do not change model results. */
			}
		}
	};
}
