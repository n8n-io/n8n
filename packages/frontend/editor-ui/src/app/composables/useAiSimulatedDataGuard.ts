import { useI18n } from '@n8n/i18n';

import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { useAiSimulatedExecutionsStore } from '@/app/stores/aiSimulatedExecutions.store';

/**
 * Guard for adopting AI-simulated execution output as pinned data. Output of a
 * node the AI Assistant simulated during workflow verification is fabricated
 * sample data; every surface that turns displayed output into workflow pins
 * asks the same explicit confirmation through this guard.
 */
export function useAiSimulatedDataGuard() {
	const aiSimulatedExecutionsStore = useAiSimulatedExecutionsStore();
	const message = useMessage();
	const i18n = useI18n();

	function isSimulatedNodeOutput(
		executionId: string | undefined,
		nodeName: string | undefined,
	): boolean {
		return aiSimulatedExecutionsStore.isSimulatedNodeOutput(executionId, nodeName);
	}

	async function confirmAdoption(): Promise<boolean> {
		const answer = await message.confirm(
			i18n.baseText('ndv.pinData.aiSimulated.confirm.description'),
			i18n.baseText('ndv.pinData.aiSimulated.confirm.title'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('ndv.pinData.aiSimulated.confirm.confirmButtonText'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		return answer === MODAL_CONFIRM;
	}

	return { isSimulatedNodeOutput, confirmAdoption };
}
