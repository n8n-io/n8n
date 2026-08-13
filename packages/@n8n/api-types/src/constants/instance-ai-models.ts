/**
 * Stable Instance AI model ids shared with ai-assistant-service (proxy routing
 * and RATE_TABLE keys). Pin the same string in both repos so claims cannot drift.
 */

export const MOONSHOTAI_KIMI_K3_PROVIDER = 'moonshotai' as const;
export const MOONSHOTAI_KIMI_K3_MODEL_NAME = 'kimi-k3' as const;
export const MOONSHOTAI_KIMI_K3_MODEL_ID =
	`${MOONSHOTAI_KIMI_K3_PROVIDER}/${MOONSHOTAI_KIMI_K3_MODEL_NAME}` as const;

export function isMoonshotaiKimiK3ModelId(modelId: string): boolean {
	return modelId === MOONSHOTAI_KIMI_K3_MODEL_ID;
}
