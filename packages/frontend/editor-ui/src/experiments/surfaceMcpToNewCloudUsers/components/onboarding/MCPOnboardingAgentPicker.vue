<script setup lang="ts">
import MCPOnboardingAgentLogo from './MCPOnboardingAgentLogo.vue';
import type { MCPOnboardingClient, MCPOnboardingClientOption } from './types';

defineProps<{
	modelValue: MCPOnboardingClient;
	options: MCPOnboardingClientOption[];
}>();

const emit = defineEmits<{
	'update:modelValue': [value: MCPOnboardingClient];
}>();

function handleSelect(value: MCPOnboardingClient) {
	emit('update:modelValue', value);
}
</script>

<template>
	<div :class="$style.picker" data-test-id="mcp-onboarding-client-switcher">
		<button
			v-for="option in options"
			:key="option.value"
			type="button"
			:class="[$style.tile, { [$style.tileActive]: modelValue === option.value }]"
			:aria-pressed="modelValue === option.value"
			:data-test-id="`mcp-onboarding-agent-option-${option.slug}`"
			@click="handleSelect(option.value)"
		>
			<span :class="$style.tileIconSlot">
				<MCPOnboardingAgentLogo
					:agent="option.value"
					:data-test-id="`mcp-onboarding-agent-logo-${option.slug}`"
				/>
			</span>
			<span :class="$style.tileLabel">{{ option.label }}</span>
		</button>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.picker {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
	gap: var(--spacing--2xs);
	width: 100%;
}

.tile {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	min-height: 76px;
	padding: var(--spacing--xs) var(--spacing--2xs);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	color: var(--text-color);
	font-family: inherit;
	cursor: pointer;
	appearance: none;
	outline-offset: 2px;
	transition:
		border-color var(--duration--snappy) var(--easing--ease-out),
		background-color var(--duration--snappy) var(--easing--ease-out),
		box-shadow var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);

	@include focus.focus-visible-ring;

	&:hover:not(.tileActive) {
		border-color: var(--border-color--strong);
		box-shadow: var(--shadow--card-hover);
		transform: translateY(-1px);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;

		&:hover:not(.tileActive) {
			transform: none;
		}
	}
}

.tileActive {
	border-color: var(--color--primary);
	background: var(--color--orange-alpha-100);
	box-shadow: inset 0 0 0 1px var(--color--primary);

	&:hover {
		box-shadow:
			inset 0 0 0 1px var(--color--primary),
			var(--shadow--card-hover);
	}

	.tileLabel {
		font-weight: var(--font-weight--medium);
	}
}

.tileIconSlot {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	--mcp-agent-logo-size: 32px;
	--mcp-agent-logo-icon-size: 20px;
}

.tileLabel {
	display: block;
	max-width: 100%;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: 1.2;
	text-align: center;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
