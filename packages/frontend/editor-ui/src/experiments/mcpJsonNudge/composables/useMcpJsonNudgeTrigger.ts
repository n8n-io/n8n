import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { MCP_JSON_NUDGE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
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
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();

	/**
	 * Runs `action` (the export or import) behind the nudge. When the nudge is
	 * eligible, the modal opens and the action is deferred to its `onContinue`
	 * (Skip / dismiss); Connect abandons it. Otherwise the action runs right away.
	 */
	async function gate(surface: McpJsonNudgeSurface, action: McpJsonNudgeAction): Promise<void> {
		// A second export/import can start while the nudge is open (e.g. from the command
		// palette). Opening again would replace the pending onContinue and lose the first
		// action, so let the new one through untouched.
		const nudgeAlreadyOpen = uiStore.isModalActiveById[MCP_JSON_NUDGE_MODAL_KEY];

		if (nudgeAlreadyOpen) {
			await action();
			return;
		}

		// The flag is a multivariate experiment, and PostHog reads exposure from
		// `$feature_flag_called`. Report it for everyone who would see the nudge but
		// for their arm, so the control arm has a baseline; keying it off the modal
		// opening would only ever expose the test arm. The store dedupes per
		// flag+variant and skips users outside the rollout.
		if (eligibility.isEligibleApartFromExperiment()) {
			posthogStore.trackExposure(MCP_JSON_NUDGE_EXPERIMENT.name);
		}

		if (!eligibility.canShow()) {
			await action();
			return;
		}

		uiStore.openModalWithData({
			name: MCP_JSON_NUDGE_MODAL_KEY,
			data: { surface, onContinue: action },
		});
		telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_VIEWED, { surface });
		void eligibility.recordImpression();
	}

	return { gate };
}
