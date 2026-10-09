import { useToast } from '@n8n/composables/useToast';
import type { SelfHealingChatHandoff, SelfHealingChatInput } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';

import { useInstanceAiReady } from './useInstanceAiAvailability';
import { ensurePersonalProjectId, useInstanceAiHandoff } from './useInstanceAiHandoff';

export function useSelfHealingChatHandoff(): SelfHealingChatHandoff {
	const available = useInstanceAiReady();
	const { startThread } = useInstanceAiHandoff();
	const { showError } = useToast();
	const i18n = useI18n();

	async function start(input: SelfHealingChatInput): Promise<boolean> {
		if (!available.value) return false;
		const projectId = await ensurePersonalProjectId();
		if (!projectId) {
			showError(
				new Error(i18n.baseText('instanceAi.handoff.openFailed.message')),
				i18n.baseText('instanceAi.handoff.openFailed.title'),
			);
			return false;
		}

		const outcome = i18n.baseText(
			input.outcome === 'needs_you' ? 'inbox.outcome.needsAttention' : 'inbox.outcome.couldNotFix',
		);
		let message = i18n.baseText('inbox.selfHealing.chat.prompt', {
			interpolate: { workflowName: input.workflowName, outcome, report: input.report },
		});
		if (input.executionId) {
			message += `\n\n${i18n.baseText('inbox.selfHealing.chat.executionReference', {
				interpolate: { executionId: input.executionId },
			})}`;
		}

		return await startThread(
			projectId,
			message,
			{ kind: 'prefill', prefillType: 'handoff_self_healing_result' },
			{
				source: 'self_healing_result',
				origin: 'internal',
				sourceContext: { resultId: input.resultId, outcome: input.outcome },
			},
			[
				{
					type: 'workflow',
					id: input.workflowId,
					name: input.workflowName,
					...(input.executionId ? { executionId: input.executionId } : {}),
				},
			],
		);
	}

	return { available, start };
}
