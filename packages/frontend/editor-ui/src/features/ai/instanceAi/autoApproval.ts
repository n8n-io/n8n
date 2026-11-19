import type { InstanceAiAutoApprovalPayload } from '@n8n/api-types';
import type { useI18n } from '@n8n/i18n';

type I18n = Pick<ReturnType<typeof useI18n>, 'baseText'>;

/** An action that Auto mode ran without its approval card. */
export type AutoApproval = Pick<InstanceAiAutoApprovalPayload, 'message' | 'reason' | 'decidedBy'>;

/** Card messages can carry a preview after the first line. The label keeps the first line. */
export function autoApprovalLabel(i18n: I18n, approval: AutoApproval): string {
	return i18n.baseText('instanceAi.autoApproval.label', {
		interpolate: { action: approval.message.split('\n')[0].trim() },
	});
}

/** The judge explains its own decision. The low-risk rule has one fixed reason. */
export function autoApprovalReason(i18n: I18n, approval: AutoApproval): string {
	return approval.decidedBy === 'rule'
		? i18n.baseText('instanceAi.autoApproval.lowRisk')
		: approval.reason;
}
