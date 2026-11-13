<script setup lang="ts">
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, useTemplateRef } from 'vue';

import type { AgentChatMode, AgentLiveAvailability } from './chatMode.types';

const props = withDefaults(
	defineProps<{
		modelValue: AgentChatMode;
		liveAvailability: AgentLiveAvailability;
		/** True after the first message. The mode is fixed for the rest of the chat. */
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [mode: AgentChatMode] }>();

const i18n = useI18n();

const liveTooltip = computed(() =>
	props.liveAvailability === 'unpublished'
		? i18n.baseText('agents.testRun.mode.switch.liveTooltip.unpublished')
		: i18n.baseText('agents.testRun.mode.switch.liveTooltip.published'),
);

function select(mode: AgentChatMode) {
	if (props.disabled || mode === props.modelValue) return;
	emit('update:modelValue', mode);
}

const track = useTemplateRef<HTMLElement>('track');

/** Radio group keyboard pattern: arrows move the selection and focus with it. */
async function onKeydown(event: KeyboardEvent) {
	if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
	event.preventDefault();
	if (props.disabled) return;
	const next: AgentChatMode = props.modelValue === 'test' ? 'live' : 'test';
	select(next);
	await nextTick();
	track.value
		?.querySelector<HTMLElement>(`[data-testid="agent-chat-mode-switch-${next}"]`)
		?.focus();
}
</script>

<template>
	<div
		:class="$style.track"
		role="radiogroup"
		:aria-label="i18n.baseText('agents.testRun.mode.switch.label')"
		:aria-disabled="props.disabled || undefined"
		data-testid="agent-chat-mode-switch"
		ref="track"
		@keydown="onKeydown"
	>
		<N8nButton
			variant="ghost"
			role="radio"
			:class="[$style.option, props.modelValue === 'test' && $style.activeTest]"
			:aria-checked="props.modelValue === 'test'"
			:tabindex="props.modelValue === 'test' ? 0 : -1"
			:disabled="props.disabled"
			data-testid="agent-chat-mode-switch-test"
			@click="select('test')"
		>
			<N8nIcon icon="flask-conical" size="medium" aria-hidden="true" />
			{{ i18n.baseText('agents.testRun.mode.test') }}
		</N8nButton>
		<N8nTooltip :content="liveTooltip" placement="bottom">
			<N8nButton
				variant="ghost"
				role="radio"
				:class="[$style.option, props.modelValue === 'live' && $style.activeLive]"
				:aria-checked="props.modelValue === 'live'"
				:tabindex="props.modelValue === 'live' ? 0 : -1"
				:disabled="props.disabled"
				data-testid="agent-chat-mode-switch-live"
				@click="select('live')"
			>
				<N8nIcon icon="zap" size="medium" aria-hidden="true" />
				{{ i18n.baseText('agents.testRun.mode.live') }}
			</N8nButton>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.track {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	max-width: 100%;
	padding: calc(var(--spacing--3xs) / 2);
	border-radius: var(--radius--full);
	background: light-dark(var(--color--neutral-100), var(--background--subtle));
}

.option {
	height: var(--height--sm);
	padding-inline: var(--spacing--xs);
	border-radius: var(--radius--full);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	--button--color: var(--text-color--subtler);

	&:hover {
		--button--color--background-hover: transparent;
		--button--color: var(--text-color);
	}
}

.activeTest,
.activeTest:hover {
	--button--color--background: light-dark(var(--color--purple-50), var(--color--purple-950));
	--button--color--background-hover: var(--button--color--background);
	--button--color--background-active: var(--button--color--background);
	--button--color: light-dark(var(--color--purple-500), var(--color--purple-300));
	font-weight: var(--font-weight--bold);
}

.activeLive,
.activeLive:hover {
	--button--color--background: light-dark(var(--color--green-50), var(--color--green-950));
	--button--color--background-hover: var(--button--color--background);
	--button--color--background-active: var(--button--color--background);
	--button--color: light-dark(var(--color--green-700), var(--color--green-300));
	font-weight: var(--font-weight--bold);
}
</style>
