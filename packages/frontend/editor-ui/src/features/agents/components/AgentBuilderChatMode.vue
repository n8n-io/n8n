<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import AgentValidationTooltip from './AgentValidationTooltip.vue';

defineProps<{
	modelValue: 'build' | 'test';
	disabled?: boolean;
	testDisabled?: boolean;
	testDisabledReason?: string;
	validationIssues?: AgentConfigValidationIssue[];
	discovery?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [mode: 'build' | 'test'] }>();
const i18n = useI18n();
</script>

<template>
	<div
		:class="[$style.track, { [$style.discovery]: discovery }]"
		role="group"
		:aria-label="i18n.baseText('agents.builder.chatMode.label')"
		data-testid="agent-builder-chat-mode"
	>
		<N8nButton
			variant="ghost"
			:class="[$style.mode, { [$style.active]: modelValue === 'build' }]"
			:aria-pressed="modelValue === 'build'"
			:disabled="disabled"
			data-testid="agent-builder-mode-build"
			@click="emit('update:modelValue', 'build')"
		>
			<N8nIcon icon="wrench" size="medium" />
			{{ i18n.baseText('agents.builder.chatMode.build') }}
		</N8nButton>
		<AgentValidationTooltip
			:disabled="!disabled && !testDisabled"
			:fallback="testDisabledReason ?? i18n.baseText('agents.builder.preview.disabledTooltip')"
			action="preview"
			:issues="validationIssues"
		>
			<span>
				<N8nButton
					variant="ghost"
					:class="[$style.mode, { [$style.active]: modelValue === 'test' }]"
					:aria-pressed="modelValue === 'test'"
					:disabled="disabled || testDisabled"
					data-testid="agent-builder-mode-test"
					@click="emit('update:modelValue', 'test')"
				>
					<N8nIcon icon="flask-conical" size="medium" />
					{{ i18n.baseText('agents.builder.chatMode.test') }}
				</N8nButton>
			</span>
		</AgentValidationTooltip>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.track {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: calc(var(--spacing--3xs) / 2);
	border-radius: var(--radius--full);
	background: light-dark(var(--color--neutral-100), var(--background--subtle));
}

.mode {
	height: var(--height--sm);
	// The prototype uses 13px padding. There is no matching spacing token.
	padding: 0 0.8125rem;
	border-radius: var(--radius--full);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	--button--color: var(--text-color--subtler);

	&:hover {
		--button--color--background-hover: transparent;
		--button--color: var(--text-color);
	}
}

// Keep the composer actions inside a narrow chat. No size token matches this breakpoint.
@container (max-width: 400px) {
	.mode {
		padding-inline: var(--spacing--2xs);
	}
}

.active,
.active:hover {
	--button--color--background: light-dark(var(--color--purple-50), var(--color--purple-950));
	--button--color--background-hover: var(--button--color--background);
	--button--color--background-active: var(--button--color--background);
	--button--color: light-dark(var(--color--purple-500), var(--color--purple-300));
	font-weight: var(--font-weight--bold);
}

.discovery .active {
	// The prototype specifies a 3.2-second discovery pulse. There is no duration token.
	animation: discover 3.2s ease-in-out infinite;
	@include motion.reduced-motion;
}

@keyframes discover {
	0%,
	100% {
		box-shadow:
			0 0 0 0 var(--color--purple-alpha-200),
			0 0 calc(var(--spacing--2xs) + var(--spacing--5xs)) 0 var(--color--purple-alpha-200);
	}
	50% {
		box-shadow:
			0 0 0 calc(var(--spacing--3xs) / 2) var(--color--purple-alpha-200),
			0 0 calc(var(--spacing--sm) + var(--spacing--5xs)) var(--spacing--5xs)
				var(--color--purple-alpha-200);
	}
}
</style>
