<script setup lang="ts">
import { useId } from 'vue';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import ClaudeLogo from './ClaudeLogo.vue';
withDefaults(
	defineProps<{
		placement: 'canvas' | 'sidebar' | 'footer';
		collapsed?: boolean;
		label: string;
		title?: string;
		description?: string;
	}>(),
	{
		collapsed: false,
		title: undefined,
		description: undefined,
	},
);
const descriptionId = useId();
const emit = defineEmits<{ click: [] }>();
</script>

<template>
	<span v-if="placement === 'sidebar' && !collapsed && title" :class="$style.card">
		<span :class="$style.cardTitle">
			<span :class="$style.mark"><ClaudeLogo /></span>
			<span>{{ title }}</span>
		</span>
		<span :id="descriptionId" :class="$style.description">{{ description }}</span>
		<N8nButton
			variant="outline"
			size="small"
			:aria-describedby="descriptionId"
			data-test-id="claude-entry-sidebar"
			@click.stop="emit('click')"
		>
			{{ label }}
		</N8nButton>
	</span>
	<button
		v-else
		type="button"
		:class="[$style.entry, $style[placement], { [$style.collapsed]: collapsed }]"
		:aria-label="label"
		:aria-describedby="!collapsed && description ? descriptionId : undefined"
		:data-test-id="`claude-entry-${placement}`"
		@click.stop="emit('click')"
	>
		<span :class="$style.mark"><ClaudeLogo /></span>
		<span v-if="!collapsed" :class="$style.copy">
			<span>{{ label }}</span>
			<span v-if="description" :id="descriptionId" :class="$style.description">{{
				description
			}}</span>
		</span>
		<N8nIcon
			v-if="placement !== 'canvas' && !collapsed"
			:icon="placement === 'footer' ? 'arrow-right' : 'chevron-right'"
			:size="placement === 'sidebar' ? 'large' : 'small'"
		/>
	</button>
</template>

<style lang="scss" module>
@use '../../features/ai/shared/styles/prompt-suggestion-buttons' as promptSuggestions;

.entry {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	color: var(--text-color);
	background: transparent;
	border: 0;
	font: inherit;
	cursor: pointer;
	border-radius: var(--radius--lg);
	padding: var(--spacing--2xs);
}
.entry:hover {
	background: var(--background--hover);
}
.entry:focus-visible {
	outline: var(--focus--border-width) solid var(--focus--border-color);
	outline-offset: var(--spacing--4xs);
}
.mark {
	display: inline-flex;
	--mcp-agent-logo-size: var(--spacing--lg);
	--mcp-agent-logo-icon-size: var(--spacing--md);
}
.mark > span {
	border: 0;
	background: transparent;
}
.copy {
	white-space: nowrap;
	display: flex;
	flex-direction: column;
	text-align: left;
	gap: var(--spacing--4xs);
}
.description {
	color: var(--text-color--subtler);
}
.card {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}
.cardTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
}
.cardTitle .mark {
	flex-shrink: 0;
}
.sidebar {
	flex: 1;
	min-width: 0;
	padding: var(--spacing--4xs);
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	justify-content: flex-start;
}
.sidebar .mark {
	flex-shrink: 0;
	--mcp-agent-logo-icon-size: var(--spacing--sm);
}
.sidebar .copy {
	white-space: normal;
}
.sidebar > :last-child {
	margin-left: auto;
}
.collapsed {
	justify-content: center;
}
.collapsed > :last-child {
	margin: 0;
}
.footer {
	font-size: var(--font-size--2xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: light-dark(var(--background--surface), var(--background--subtle));
	box-shadow: var(--shadow--xs);
	padding: var(--spacing--4xs) var(--spacing--xs);
	align-self: center;

	&:hover,
	&:focus-visible {
		@include promptSuggestions.prompt-suggestion-button-active;
	}
}
.footer .mark {
	--mcp-agent-logo-size: var(--spacing--sm);
	--mcp-agent-logo-icon-size: var(--spacing--sm);
}
.canvas {
	flex-direction: column;
	padding: 0;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
}
.canvas:hover {
	background: transparent;
}
.canvas .mark {
	padding: var(--spacing--lg);
	border: calc(var(--border-width) * 2) dashed var(--color--foreground--shade-2);
	border-radius: var(--radius--lg);
	align-items: center;
	justify-content: center;
	background: var(--color--foreground--tint-2);
	--mcp-agent-logo-size: var(--spacing--2xl);
	--mcp-agent-logo-icon-size: calc(var(--spacing--2xl) - var(--spacing--4xs));
}
</style>
