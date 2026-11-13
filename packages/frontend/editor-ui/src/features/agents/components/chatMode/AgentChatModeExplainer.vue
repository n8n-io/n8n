<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentChatMode } from './chatMode.types';

const props = defineProps<{ mode: AgentChatMode }>();

const emit = defineEmits<{ dismiss: [] }>();

const i18n = useI18n();
</script>

<template>
	<div
		:class="[$style.explainer, props.mode === 'live' ? $style.live : $style.test]"
		role="note"
		data-testid="agent-chat-mode-explainer"
		:data-mode="props.mode"
	>
		<N8nIcon
			:icon="props.mode === 'live' ? 'zap' : 'flask-conical'"
			size="small"
			:class="$style.icon"
			aria-hidden="true"
		/>
		<p :class="$style.text">
			<strong>{{
				props.mode === 'live'
					? i18n.baseText('agents.testRun.mode.explainer.live.title')
					: i18n.baseText('agents.testRun.mode.explainer.test.title')
			}}</strong>
			{{ ' ' }}
			{{
				props.mode === 'live'
					? i18n.baseText('agents.testRun.mode.explainer.live.body')
					: i18n.baseText('agents.testRun.mode.explainer.test.body')
			}}
		</p>
		<N8nButton
			variant="ghost"
			size="small"
			:class="$style.dismiss"
			:label="i18n.baseText('agents.testRun.mode.explainer.dismiss')"
			data-testid="agent-chat-mode-explainer-dismiss"
			@click="emit('dismiss')"
		/>
	</div>
</template>

<style lang="scss" module>
.explainer {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs) var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
}

.test {
	background: light-dark(var(--color--purple-50), var(--color--purple-950));
}

.live {
	background: light-dark(var(--color--green-50), var(--color--green-950));
}

.icon {
	flex-shrink: 0;
	// Align the icon with the first line of text.
	margin-top: var(--spacing--5xs);

	.test & {
		color: light-dark(var(--color--purple-500), var(--color--purple-300));
	}

	.live & {
		color: light-dark(var(--color--green-700), var(--color--green-300));
	}
}

.text {
	flex: 1 1 12rem;
	min-width: 0;
	margin: 0;
	line-height: var(--line-height--md);

	strong {
		color: var(--text-color);
		font-weight: var(--font-weight--bold);
	}
}

.dismiss {
	margin-inline-start: auto;
}
</style>
