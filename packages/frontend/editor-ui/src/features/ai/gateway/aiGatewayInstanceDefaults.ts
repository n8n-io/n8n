/**
 * Fallback defaults when the AI Gateway settings API is unavailable.
 * Keep aligned with:
 * - `packages/cli/src/modules/ai-gateway/ai-gateway.config.ts`
 * - `packages/@n8n/nodes-langchain/nodes/vendors/AiGateway/helpers/modelParams.ts`
 * - `packages/@n8n/nodes-langchain/utils/n8nAiGatewayOpenRouter.ts` (FALLBACK_N8N_AI_GATEWAY_MODEL)
 */
export const AI_GATEWAY_INSTANCE_DEFAULT_MODELS = {
	chat: 'openai/gpt-4.1-nano',
	text: 'openai/gpt-4.1-mini',
	image: 'google/gemini-2.5-flash-image',
	file: 'anthropic/claude-sonnet-4',
	audio: 'openai/gpt-4o-mini-transcribe',
} as const;
