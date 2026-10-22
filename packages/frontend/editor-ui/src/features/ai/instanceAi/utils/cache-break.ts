import type { CacheBreakCause, StepCacheBreak } from '@n8n/api-types';
import type { BaseTextKey, useI18n } from '@n8n/i18n';

const CAUSE_KEYS: Record<CacheBreakCause, BaseTextKey> = {
	tools: 'instanceAi.debug.runDebug.cacheBreakCause.tools',
	system: 'instanceAi.debug.runDebug.cacheBreakCause.system',
	settings: 'instanceAi.debug.runDebug.cacheBreakCause.settings',
	expired: 'instanceAi.debug.runDebug.cacheBreakCause.expired',
	messages: 'instanceAi.debug.runDebug.cacheBreakCause.messages',
};

export function describeCacheBreak(
	i18n: ReturnType<typeof useI18n>,
	cacheBreak: StepCacheBreak,
): string {
	return i18n.baseText('instanceAi.debug.runDebug.cacheBreakDetail', {
		interpolate: {
			lost: cacheBreak.lostTokens.toLocaleString(),
			expected: cacheBreak.expectedReadTokens.toLocaleString(),
			cause: i18n.baseText(CAUSE_KEYS[cacheBreak.cause], {
				interpolate: { minutes: String(cacheBreak.cacheTtlMinutes ?? '') },
			}),
		},
	});
}
