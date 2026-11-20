<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import { N8nButton, N8nCallout, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { AGENT_CHAT_ERROR_CODES } from '@n8n/api-types';
import { TIME } from '@/app/constants/durations';
import type { AgentServerBusyNotice } from '../composables/useAgentChatStream';

const props = defineProps<{ notice: AgentServerBusyNotice }>();
const emit = defineEmits<{ dismiss: [] }>();

const locale = useI18n();
const now = ref(Date.now());
const { pause } = useIntervalFn(() => {
	now.value = Date.now();
	if (secondsLeft.value === 0) pause();
}, TIME.SECOND);

const secondsLeft = computed(() =>
	Math.max(0, Math.ceil((props.notice.retryAt - now.value) / TIME.SECOND)),
);

const titleKey = computed<BaseTextKey>(() => {
	if (props.notice.code === AGENT_CHAT_ERROR_CODES.lowMemory) return 'agents.chat.busy.lowMemory';
	if (props.notice.code === AGENT_CHAT_ERROR_CODES.queueFull) return 'agents.chat.busy.queueFull';
	return 'agents.chat.busy.mainBusy';
});

const detail = computed(() => {
	const retry =
		secondsLeft.value > 0
			? locale.baseText('agents.chat.busy.retryIn', {
					interpolate: { seconds: String(secondsLeft.value) },
				})
			: locale.baseText('agents.chat.busy.retryNow');
	return props.notice.draftKept
		? `${locale.baseText('agents.chat.busy.draftKept')} ${retry}`
		: retry;
});
</script>

<template>
	<N8nCallout theme="warning" slim data-test-id="agent-chat-busy-notice">
		<div :class="$style.body">
			<span :class="$style.title">{{ locale.baseText(titleKey) }}</span>
			<span :class="$style.detail" data-test-id="agent-chat-busy-notice-detail">{{ detail }}</span>
		</div>
		<template #trailingContent>
			<N8nTooltip :content="locale.baseText('agents.chat.warning.dismiss')" placement="top">
				<N8nButton
					icon-only
					variant="ghost"
					size="xsmall"
					:aria-label="locale.baseText('agents.chat.warning.dismiss')"
					data-test-id="agent-chat-busy-notice-dismiss"
					@click="emit('dismiss')"
				>
					<template #icon><N8nIcon icon="x" size="xsmall" aria-hidden="true" /></template>
				</N8nButton>
			</N8nTooltip>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.title {
	font-weight: var(--font-weight--medium);
}

.detail {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}
</style>
