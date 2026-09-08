import { useUIStore } from '@/app/stores/ui.store';
import {
	MCP_JSON_NUDGE_MODAL_KEY,
	type McpJsonNudgeSurface,
} from '@/experiments/mcpJsonNudge/constants';

export function useMcpJsonNudgeTrigger() {
	const uiStore = useUIStore();

	function trigger(surface: McpJsonNudgeSurface) {
		uiStore.openModalWithData({
			name: MCP_JSON_NUDGE_MODAL_KEY,
			data: { surface },
		});
	}

	return { trigger };
}
