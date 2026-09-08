import { useUIStore } from '@/app/stores/ui.store';
import { useMcpJsonNudgeEligibility } from '@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeEligibility';
import {
	MCP_JSON_NUDGE_MODAL_KEY,
	type McpJsonNudgeSurface,
} from '@/experiments/mcpJsonNudge/constants';

export type McpJsonNudgeAction = () => void | Promise<void>;

export function useMcpJsonNudgeTrigger() {
	const uiStore = useUIStore();
	const eligibility = useMcpJsonNudgeEligibility();

	/**
	 * Runs `action` (the export or import) behind the nudge. When the nudge is
	 * eligible, the modal opens and the action is deferred to its `onContinue`
	 * (Skip / dismiss); Connect abandons it. Otherwise the action runs right away.
	 */
	async function gate(surface: McpJsonNudgeSurface, action: McpJsonNudgeAction): Promise<void> {
		if (!eligibility.canShow()) {
			await action();
			return;
		}

		uiStore.openModalWithData({
			name: MCP_JSON_NUDGE_MODAL_KEY,
			data: { surface, onContinue: action },
		});
		void eligibility.recordImpression();
	}

	return { gate };
}
