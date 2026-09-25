export const MOONSHOTAI_KIMI_K3_PROVIDER = 'moonshotai' as const;
export const MOONSHOTAI_KIMI_K3_MODEL_NAME = 'kimi-k3' as const;
export const MOONSHOTAI_KIMI_K3_MODEL_ID =
	`${MOONSHOTAI_KIMI_K3_PROVIDER}/${MOONSHOTAI_KIMI_K3_MODEL_NAME}` as const;

/** Exact-match guard for proxy routing and billing model ids (no wildcards). */
export function isMoonshotaiKimiK3ModelId(modelId: string): boolean {
	return modelId === MOONSHOTAI_KIMI_K3_MODEL_ID;
}
