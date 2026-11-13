<script setup lang="ts">
import { N8nIcon, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import AgentChatGoLiveOptions from './AgentChatGoLiveOptions.vue';
import type { AgentChatMode, AgentLiveAvailability } from './chatMode.types';

const props = withDefaults(
	defineProps<{
		mode: AgentChatMode;
		liveAvailability?: AgentLiveAvailability;
		/**
		 * Shows the options menu on a Test run badge, with the go-live actions.
		 * A Live badge never has a menu: a live chat stays live.
		 */
		showMenu?: boolean;
		/** False before the first message, when there is nothing to run again. */
		canRunThisChat?: boolean;
		/** Disables the go-live actions, for example without publish permission. */
		goLiveDisabled?: boolean;
	}>(),
	{
		liveAvailability: 'published',
		showMenu: false,
		canRunThisChat: true,
		goLiveDisabled: false,
	},
);

const emit = defineEmits<{
	'run-this-chat': [];
	'new-live-chat': [];
}>();

const i18n = useI18n();
const menuOpen = ref(false);

const label = computed(() =>
	props.mode === 'live'
		? i18n.baseText('agents.testRun.mode.live')
		: i18n.baseText('agents.testRun.mode.test'),
);
const ariaLabel = computed(() =>
	i18n.baseText('agents.testRun.mode.badge.ariaLabel', { interpolate: { mode: label.value } }),
);
const hasMenu = computed(() => props.mode === 'test' && props.showMenu);

function onRunThisChat() {
	menuOpen.value = false;
	emit('run-this-chat');
}

function onNewChat() {
	menuOpen.value = false;
	emit('new-live-chat');
}
</script>

<template>
	<N8nPopover
		v-if="hasMenu"
		v-model:open="menuOpen"
		align="start"
		side="bottom"
		:enable-scrolling="false"
		width="calc(var(--spacing--5xl) + var(--spacing--2xl))"
		:content-class="$style.menu"
	>
		<template #trigger>
			<button
				type="button"
				:class="[$style.badge, $style.test, $style.interactive]"
				:aria-label="i18n.baseText('agents.testRun.mode.badge.menuLabel')"
				aria-haspopup="dialog"
				:aria-expanded="menuOpen"
				data-testid="agent-chat-mode-badge"
				data-mode="test"
			>
				<N8nIcon icon="flask-conical" size="small" aria-hidden="true" />
				<span>{{ label }}</span>
				<N8nIcon icon="chevron-down" size="xsmall" aria-hidden="true" />
			</button>
		</template>
		<template #content>
			<div :class="$style.menuBody" data-testid="agent-chat-mode-menu">
				<slot name="menu-before" />
				<AgentChatGoLiveOptions
					:live-availability="props.liveAvailability"
					:can-run-this-chat="props.canRunThisChat"
					:disabled="props.goLiveDisabled"
					@run-this-chat="onRunThisChat"
					@new-chat="onNewChat"
				/>
			</div>
		</template>
	</N8nPopover>
	<span
		v-else
		:class="[$style.badge, props.mode === 'live' ? $style.live : $style.test]"
		role="status"
		:aria-label="ariaLabel"
		data-testid="agent-chat-mode-badge"
		:data-mode="props.mode"
	>
		<N8nIcon
			:icon="props.mode === 'live' ? 'zap' : 'flask-conical'"
			size="small"
			aria-hidden="true"
		/>
		<span aria-hidden="true">{{ label }}</span>
	</span>
</template>

<style lang="scss" module>
.badge {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
	gap: var(--spacing--4xs);
	height: var(--height--sm);
	padding-inline: var(--spacing--2xs);
	border: none;
	border-radius: var(--radius--full);
	font: inherit;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
}

.test {
	background: light-dark(var(--color--purple-50), var(--color--purple-950));
	color: light-dark(var(--color--purple-500), var(--color--purple-300));
}

.live {
	background: light-dark(var(--color--green-50), var(--color--green-950));
	color: light-dark(var(--color--green-700), var(--color--green-300));
}

.interactive {
	cursor: pointer;

	&:hover {
		box-shadow: inset 0 0 0 var(--border-width) currentColor;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: var(--spacing--5xs);
	}
}

.menu {
	padding: var(--spacing--4xs);
}

.menuBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
