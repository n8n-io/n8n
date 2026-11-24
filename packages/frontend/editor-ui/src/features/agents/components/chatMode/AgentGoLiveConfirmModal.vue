<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import AgentModal from '../modals/AgentModal.vue';
import type {
	AgentGoLiveAction,
	AgentLiveAvailability,
	AgentLiveSendTarget,
} from './chatMode.types';

const props = withDefaults(
	defineProps<{
		open: boolean;
		action: AgentGoLiveAction;
		liveAvailability: AgentLiveAvailability;
		/** What the agent might really send when it runs live. Empty when it is not known. */
		sendTargets?: AgentLiveSendTarget[];
		/** True while the caller publishes or starts the live chat. Blocks dismissal. */
		busy?: boolean;
	}>(),
	{ sendTargets: () => [], busy: false },
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();

const COPY = {
	'run-this-chat': {
		published: {
			title: 'agents.testRun.mode.confirm.runThisChat.title.live',
			confirm: 'agents.testRun.mode.confirm.runThisChat.confirm.live',
		},
		unpublished: {
			title: 'agents.testRun.mode.confirm.runThisChat.title.publish',
			confirm: 'agents.testRun.mode.confirm.runThisChat.confirm.publish',
		},
		changed: {
			title: 'agents.testRun.mode.confirm.runThisChat.title.republish',
			confirm: 'agents.testRun.mode.confirm.runThisChat.confirm.republish',
		},
	},
	'new-chat': {
		published: {
			title: 'agents.testRun.mode.confirm.newChat.title.live',
			confirm: 'agents.testRun.mode.confirm.newChat.confirm.live',
		},
		unpublished: {
			title: 'agents.testRun.mode.confirm.newChat.title.publish',
			confirm: 'agents.testRun.mode.confirm.newChat.confirm.publish',
		},
		changed: {
			title: 'agents.testRun.mode.confirm.newChat.title.republish',
			confirm: 'agents.testRun.mode.confirm.newChat.confirm.republish',
		},
	},
} as const;

const copy = computed(() => COPY[props.action][props.liveAvailability]);
const title = computed(() => i18n.baseText(copy.value.title));
const confirmLabel = computed(() => i18n.baseText(copy.value.confirm));
const description = computed(() =>
	props.action === 'run-this-chat'
		? i18n.baseText('agents.testRun.mode.confirm.runThisChat.description')
		: i18n.baseText('agents.testRun.mode.confirm.newChat.description'),
);

function onOpenChange(open: boolean) {
	// AgentModal blocks dismissal while busy; guard here too so publishing can't look cancelled.
	if (open || props.busy) return;
	emit('update:open', false);
	emit('cancel');
}

function onConfirm() {
	if (props.busy) return;
	emit('confirm');
}
</script>

<template>
	<AgentModal
		:open="props.open"
		:title="title"
		:busy="props.busy"
		size="medium"
		data-testid="agent-go-live-confirm-modal"
		@update:open="onOpenChange"
	>
		<div :class="$style.body">
			<N8nText tag="p" size="medium" :class="$style.paragraph">
				{{ description }}
			</N8nText>
			<template v-if="props.sendTargets.length > 0">
				<N8nText
					tag="p"
					size="medium"
					bold
					:class="$style.paragraph"
					data-testid="agent-go-live-confirm-list-label"
				>
					{{ i18n.baseText('agents.testRun.mode.confirm.listLabel') }}
				</N8nText>
				<ul :class="$style.list" data-testid="agent-go-live-confirm-list">
					<li v-for="target in props.sendTargets" :key="target.id" :class="$style.item">
						<N8nIcon icon="send" size="small" :class="$style.itemIcon" aria-hidden="true" />
						<span :class="$style.itemText">
							<span :class="$style.itemLabel">{{ target.label }}</span>
							<span v-if="target.detail" :class="$style.itemDetail">{{ target.detail }}</span>
						</span>
					</li>
				</ul>
			</template>
			<N8nText
				v-else
				tag="p"
				size="medium"
				bold
				:class="$style.paragraph"
				data-testid="agent-go-live-confirm-no-list"
			>
				{{ i18n.baseText('agents.testRun.mode.confirm.noList') }}
			</N8nText>
		</div>
		<template #footerActions>
			<N8nButton
				variant="solid"
				icon="zap"
				:loading="props.busy"
				data-testid="agent-go-live-confirm"
				@click="onConfirm"
			>
				{{ confirmLabel }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.paragraph {
	margin: 0;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: var(--spacing--3xs);
	list-style: none;
	border: var(--border);
	border-radius: var(--radius--lg);
}

.item {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	min-width: 0;
}

.itemIcon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--text-color--subtle);
}

.itemText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.itemLabel {
	font-size: var(--font-size--sm);
	color: var(--text-color);
	overflow-wrap: anywhere;
}

.itemDetail {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
}
</style>
