import type { ApprovalCardLabels } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

export function useApprovalCardLabels() {
	const i18n = useI18n();
	return computed<ApprovalCardLabels>(() => ({
		alwaysAllow: i18n.baseText('instanceAi.confirmation.alwaysAllow'),
		alwaysAllowSuffix: i18n.baseText('instanceAi.confirmation.alwaysAllowSuffix'),
		allowOnce: i18n.baseText('instanceAi.confirmation.approve'),
		deny: i18n.baseText('instanceAi.confirmation.deny'),
		allowed: i18n.baseText('instanceAi.confirmation.approved'),
		denied: i18n.baseText('instanceAi.confirmation.denied'),
		args: i18n.baseText('instanceAi.toolCall.input'),
	}));
}
