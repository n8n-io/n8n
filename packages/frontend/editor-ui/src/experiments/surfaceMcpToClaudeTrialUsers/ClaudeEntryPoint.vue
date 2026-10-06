<script setup lang="ts">
import { useId } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import ClaudeLogo from '@/features/ai/mcpAccess/components/ClaudeLogo.vue';
withDefaults(
	defineProps<{
		placement: 'canvas' | 'sidebar' | 'footer';
		collapsed?: boolean;
		label: string;
		description?: string;
	}>(),
	{
		collapsed: false,
		description: undefined,
	},
);
const descriptionId = useId();
const emit = defineEmits<{ click: [] }>();
</script>

<template>
	<button
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
	padding: var(--spacing--4xs) var(--spacing--xs);
	align-self: center;
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
	border: calc(var(--border-width) * 2) dashed var(--border-color--strong);
	border-radius: var(--radius--lg);
	align-items: center;
	justify-content: center;
	background: var(--background--surface);
	--mcp-agent-logo-size: var(--spacing--2xl);
	--mcp-agent-logo-icon-size: calc(var(--spacing--2xl) - var(--spacing--4xs));
}
.canvas:hover .mark {
	border-color: var(--background--brand);
}
</style>
