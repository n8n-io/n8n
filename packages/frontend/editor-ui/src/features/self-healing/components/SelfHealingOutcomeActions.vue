<script setup lang="ts">
import type { InstanceAiWorkflowAttachment } from '@n8n/api-types';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import {
	ensurePersonalProjectId,
	useInstanceAiHandoff,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';

import { useSelfHealingStore } from '../selfHealing.store';
import type { SelfHealingChatHandoff } from '../selfHealing.types';

/**
 * The next step for the two inbox kinds that are not reviews, shown inside
 * their notice. The Review button stays in the tab row for every kind.
 */
const props = defineProps<{
	reviewId: string;
}>();

const i18n = useI18n();
const router = useRouter();
const store = useSelfHealingStore();
const instanceAiHandoff = useInstanceAiHandoff();

const outcome = computed(() => store.getOutcome(props.reviewId));
const startingChat = ref(false);

async function onOpenCredential() {
	await router.push({ name: VIEWS.CREDENTIALS });
}

/** The opening message of the new chat: the Assistant's own report plus the ask to take over. */
function buildChatPrompt(handoff: SelfHealingChatHandoff): string {
	return i18n.baseText('selfHealing.chatHandoff.prompt', {
		interpolate: {
			workflowName: handoff.workflowName,
			execution: handoff.executionId
				? i18n.baseText('selfHealing.chatHandoff.execution', {
						interpolate: { executionId: handoff.executionId },
					})
				: '',
			status: i18n.baseText(`selfHealing.chatHandoff.status.${handoff.kind}`),
			report: handoff.report,
		},
	});
}

async function onContinueInChat() {
	const handoff = store.getChatHandoff(props.reviewId);
	// Demo items have no real project, so their chat opens in the personal project.
	const projectId = handoff ? (handoff.projectId ?? (await ensurePersonalProjectId())) : null;
	if (!handoff || !projectId) {
		await router.push({ name: INSTANCE_AI_VIEW });
		return;
	}

	const attachments: InstanceAiWorkflowAttachment[] = handoff.workflowId
		? [
				{
					type: 'workflow',
					id: handoff.workflowId,
					name: handoff.workflowName,
					...(handoff.executionId ? { executionId: handoff.executionId } : {}),
				},
			]
		: [];

	startingChat.value = true;
	try {
		// The thread sources are a fixed list the backend checks; the node error
		// view is the closest match until self-healing gets its own.
		await instanceAiHandoff.startThread(
			projectId,
			buildChatPrompt(handoff),
			{
				source: 'node_error_view',
				origin: 'internal',
				sourceContext: {
					entryPoint: 'self_healing_inbox',
					reviewId: props.reviewId,
					kind: handoff.kind,
				},
			},
			attachments,
		);
	} finally {
		startingChat.value = false;
	}
}
</script>

<template>
	<div v-if="outcome" :class="$style.actions" data-test-id="self-healing-outcome-actions">
		<N8nButton
			v-if="outcome.action?.type === 'open_credential'"
			variant="outline"
			size="medium"
			icon="key-round"
			:label="i18n.baseText('selfHealing.outcome.action.openCredential')"
			data-test-id="self-healing-outcome-open-credential"
			@click="onOpenCredential"
		/>
		<N8nButton
			v-else
			variant="outline"
			size="medium"
			icon="message-circle"
			:loading="startingChat"
			:label="i18n.baseText('selfHealing.outcome.action.continueInChat')"
			data-test-id="self-healing-outcome-continue-in-chat"
			@click="onContinueInChat"
		/>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
