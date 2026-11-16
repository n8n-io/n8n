import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { isRecord } from '@n8n/utils/is-record';
import { shallowReactive, watch, type DeepReadonly, type InjectionKey } from 'vue';

import { useInstanceAiSetupPanelExperiment } from '@/experiments/instanceAiSetupPanel/useInstanceAiSetupPanelExperiment';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

import {
	buildSetupSavedOutcome,
	type SetupSavedSection,
} from '../workflowSetup/workflowSetupSavedTelemetry';

/** A workflow setup apply that the server accepted. Its tool result arrives later. */
export interface PendingSetupSave {
	requestId: string;
	workflowId?: string;
	sections: SetupSavedSection[];
}

/** Records an accepted setup apply. The setup card unmounts before its tool result arrives. */
export const ASSISTANT_AGENT_SETUP_SAVED: InjectionKey<(save: PendingSetupSave) => void> = Symbol(
	'assistantAgentSetupSaved',
);

/** The setup tool result, not the resume body that the chat shows until the result arrives. */
function getSetupResult(output: unknown): Record<string, unknown> | undefined {
	return isRecord(output) && typeof output.success === 'boolean' ? output : undefined;
}

/**
 * Sends `AI Assistant workflow setup saved` for an Assistant agent thread, with
 * the properties of the current runtime. The event goes when the chat shows the
 * result of the setup tool call that the user answered.
 */
export function useAssistantAgentSetupSavedTelemetry({
	threadId,
	messages,
}: {
	threadId: string;
	messages: () => ReadonlyArray<ChatMessage | DeepReadonly<ChatMessage>>;
}) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const { getTelemetryPayload } = useInstanceAiSetupPanelExperiment();
	const pending = shallowReactive(new Map<string, PendingSetupSave>());

	function track(save: PendingSetupSave, result: Record<string, unknown>): void {
		if (!save.workflowId) return;
		const outcome = buildSetupSavedOutcome(save.sections, result);
		if (!outcome) return;
		telemetry.track(TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED, {
			...getTelemetryPayload(),
			instance_id: rootStore.instanceId,
			workflow_id: save.workflowId,
			thread_id: threadId,
			session_id: rootStore.pushRef,
			source: 'instance_ai_setup_wizard',
			request_id: save.requestId,
			...outcome,
			runtime: 'agents',
		});
	}

	// Scans the chat only while an apply waits for its result.
	watch(
		() => {
			if (pending.size === 0) return [];
			const settled: Array<{ requestId: string; result: Record<string, unknown> }> = [];
			for (const message of messages()) {
				for (const toolCall of message.toolCalls ?? []) {
					const requestId = isRecord(toolCall.suspendPayload)
						? toolCall.suspendPayload.requestId
						: undefined;
					if (typeof requestId !== 'string' || !pending.has(requestId)) continue;
					const result = getSetupResult(toolCall.output);
					if (result) settled.push({ requestId, result });
				}
			}
			return settled;
		},
		(settled) => {
			for (const { requestId, result } of settled) {
				const save = pending.get(requestId);
				if (!save) continue;
				pending.delete(requestId);
				track(save, result);
			}
		},
	);

	return {
		expectResult(save: PendingSetupSave) {
			pending.set(save.requestId, save);
		},
	};
}
