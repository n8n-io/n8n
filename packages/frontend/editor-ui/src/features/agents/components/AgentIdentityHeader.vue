<script setup lang="ts">
import { computed } from 'vue';
import { DEFAULT_AGENT_PERSONALISATION } from '@n8n/api-types';
import { N8nIconPicker, N8nInlineTextEdit } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useI18n } from '@n8n/i18n';

import type { AgentJsonConfig } from '../types';

type AgentPersonalisation = NonNullable<AgentJsonConfig['personalisation']>;

const DEFAULT_GRADIENT_LAYOUT = {
	angle: 135,
	fromStop: 0,
	toStop: 100,
};

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'update:config': [changes: Partial<AgentJsonConfig>];
}>();

const i18n = useI18n();

const name = computed(() => props.config?.name ?? '');
const personalisation = computed<AgentPersonalisation>(() => {
	const value = props.config?.personalisation;
	return value?.gradient
		? { icon: value.icon, gradient: { ...DEFAULT_GRADIENT_LAYOUT, ...value.gradient } }
		: {
				icon: value?.icon ?? DEFAULT_AGENT_PERSONALISATION.icon,
				gradient: { ...DEFAULT_AGENT_PERSONALISATION.gradient, ...DEFAULT_GRADIENT_LAYOUT },
			};
});
const iconPickerModel = computed<IconOrEmoji>({
	get: (): IconOrEmoji => ({
		type: 'icon',
		value: personalisation.value.icon,
	}),
	set: (value: IconOrEmoji) => {
		if (value.type !== 'icon') return;
		emit('update:config', {
			personalisation: {
				icon: value.value,
				gradient: { ...personalisation.value.gradient },
			},
		});
	},
});

function personalisationStyle(value: AgentPersonalisation): Record<string, string> {
	return {
		'--agent-personalisation-gradient-from': value.gradient.from,
		'--agent-personalisation-gradient-to': value.gradient.to,
		'--agent-personalisation-gradient-angle': `${value.gradient.angle}deg`,
		'--agent-personalisation-gradient-from-stop': `${value.gradient.fromStop}%`,
		'--agent-personalisation-gradient-to-stop': `${value.gradient.toStop}%`,
	};
}
</script>

<template>
	<div :class="$style.text" data-testid="agent-identity-header">
		<N8nIconPicker
			v-model="iconPickerModel"
			:style="personalisationStyle(personalisation)"
			:button-tooltip="i18n.baseText('agents.builder.agent.personalisation.change')"
			button-size="xlarge"
			:is-read-only="props.disabled"
			icons-only
			:container-class="$style.personalisationPicker"
			:button-class="$style.personalisationIcon"
			data-testid="agent-personalisation-icon"
		/>
		<N8nInlineTextEdit
			:model-value="name"
			:placeholder="i18n.baseText('agents.builder.agent.name.placeholder')"
			:disabled="props.disabled"
			max-width="100%"
			:min-width="96"
			:class="$style.title"
			data-testid="agent-name-inline-edit"
			@update:model-value="emit('update:config', { name: $event })"
		/>
	</div>
</template>

<style module lang="scss">
.text {
	--agent-personalisation-squircle-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='black' d='M32 0C55.5 0 64 8.5 64 32C64 55.5 55.5 64 32 64C8.5 64 0 55.5 0 32C0 8.5 8.5 0 32 0Z'/%3E%3C/svg%3E");

	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--md);
	flex: 1;
	min-width: 0;
}

.personalisationPicker {
	width: 64px;
	height: 64px;
	overflow: visible;
}

.personalisationIcon.personalisationIcon {
	--button--height: 64px;
	--button--padding: 0;
	--button--radius: 16px;
	--button--color--background: transparent;
	--button--color--background-hover: transparent;
	--button--color--background-active: transparent;
	--button--shadow: none;
	--button--shadow--hover: none;
	--button--shadow--active: none;
	--button--border--shadow: none;
	--button--border--shadow--hover: none;
	--button--border--shadow--active: none;

	display: flex;
	align-items: center;
	justify-content: center;
	width: 64px;
	height: 64px;
	padding: 0;
	border: 0;
	border-radius: 16px;
	color: var(--color--white-alpha-950);
	background: transparent;
	position: relative;
	isolation: isolate;
	overflow: visible;
	filter: drop-shadow(0 8px 8px var(--shadow-color));

	&:disabled {
		cursor: default;
		opacity: 0.7;
	}

	&:focus-visible {
		outline: none;
	}

	&:focus-visible::before,
	&[aria-expanded='true']::before {
		background-color: var(--focus--border-color);
	}

	&:focus-visible::after,
	&[aria-expanded='true']::after {
		inset: 2px;
	}
}

.personalisationIcon::before,
.personalisationIcon::after {
	content: '';
	position: absolute;
	-webkit-mask: var(--agent-personalisation-squircle-mask) center / contain no-repeat;
	mask: var(--agent-personalisation-squircle-mask) center / contain no-repeat;
}

.personalisationIcon::before {
	inset: 0;
	background: var(--color--black-alpha-200);
	z-index: 0;
}

.personalisationIcon::after {
	inset: 0.5px;
	background: linear-gradient(
		var(--agent-personalisation-gradient-angle),
		var(--agent-personalisation-gradient-from) var(--agent-personalisation-gradient-from-stop),
		var(--agent-personalisation-gradient-to) var(--agent-personalisation-gradient-to-stop)
	);
	z-index: 1;
}

@supports (background: linear-gradient(90deg in oklch, red, blue)) {
	.personalisationIcon::after {
		background: linear-gradient(
			var(--agent-personalisation-gradient-angle) in oklch,
			var(--agent-personalisation-gradient-from) var(--agent-personalisation-gradient-from-stop),
			var(--agent-personalisation-gradient-to) var(--agent-personalisation-gradient-to-stop)
		);
	}
}

.personalisationIcon > *,
.personalisationIcon :global(.n8n-icon) {
	position: relative;
	z-index: 2;
	filter: drop-shadow(0 8px 8px var(--shadow-color));
}

.personalisationIcon.personalisationIcon :global(svg) {
	width: 36px;
	height: 36px;
	color: var(--color--white-alpha-950);
	stroke-width: 2;
}

.title {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	text-align: left;
	color: var(--text-color);
}
</style>
