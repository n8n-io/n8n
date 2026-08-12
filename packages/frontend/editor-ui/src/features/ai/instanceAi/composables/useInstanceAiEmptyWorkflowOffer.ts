import { watch, type MaybeRefOrGetter, toValue } from 'vue';
import { useI18n } from '@n8n/i18n';

import { useInstanceAiProactiveOffer } from './useInstanceAiProactiveOffer';
import { buildEmptyWorkflowSeedMessage, emptyWorkflowOfferKey } from '../instanceAiProactive';

export interface EmptyWorkflowSummary {
	/** Client-minted route id — used only to dedupe the offer, not as agent context. */
	workflowId: string;
}

/**
 * Offers to build a brand-new empty workflow after the user settles on the
 * canvas. Restraint comes from `useInstanceAiProactiveOffer`: the dwell delay
 * skips users who immediately add a first step, and `emptyWorkflowOfferKey`
 * means one offer per canvas id.
 *
 * No workflow attachment / context block — the route id is not a persisted
 * workflow yet. Once chat creates a real workflow, canvas sync navigates onto
 * that page (see `useInstanceAiCanvasSync`).
 *
 * When the canvas is no longer empty (or no longer "new"), any in-flight or
 * visible empty-workflow offer is cleared so we don't keep inviting after the
 * moment has passed.
 */
export function useInstanceAiEmptyWorkflowOffer(
	emptyWorkflow: MaybeRefOrGetter<EmptyWorkflowSummary | null>,
) {
	const i18n = useI18n();
	const { raise, clear, activeOffer } = useInstanceAiProactiveOffer();

	watch(
		() => toValue(emptyWorkflow),
		(summary) => {
			if (!summary) {
				if (!activeOffer.value || activeOffer.value.key.startsWith('empty-workflow:')) {
					clear();
				}
				return;
			}

			raise({
				key: emptyWorkflowOfferKey(summary.workflowId),
				title: i18n.baseText('instanceAi.proactiveOffer.emptyWorkflow.title'),
				detail: i18n.baseText('instanceAi.proactiveOffer.emptyWorkflow.detail'),
				cta: i18n.baseText('instanceAi.proactiveOffer.emptyWorkflow.cta'),
				message: buildEmptyWorkflowSeedMessage(),
				source: 'proactive_offer',
			});
		},
		{ immediate: true },
	);
}
