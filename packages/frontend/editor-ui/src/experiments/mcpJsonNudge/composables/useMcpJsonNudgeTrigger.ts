import { useUIStore } from '@/app/stores/ui.store';
import { useMcpJsonNudgeEligibility } from '@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeEligibility';
import {
	MCP_JSON_NUDGE_MODAL_KEY,
	type McpJsonNudgeSurface,
} from '@/experiments/mcpJsonNudge/constants';

export function useMcpJsonNudgeTrigger() {
	const uiStore = useUIStore();
	const eligibility = useMcpJsonNudgeEligibility();

	function trigger(surface: McpJsonNudgeSurface) {
		if (!eligibility.canShow()) {
			return;
		}

		uiStore.openModalWithData({
			name: MCP_JSON_NUDGE_MODAL_KEY,
			data: { surface },
		});
		void eligibility.recordImpression();
	}

	return { trigger };
}
