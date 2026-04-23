<script setup lang="ts">
/**
 * Middle column of the agent builder: a flat list of top-level sections
 * derived from `Object.keys(config)`. Selection is handled by the parent
 * (PR2 wires it into the section editor).
 */
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { AgentJsonConfig } from '../types';

const props = defineProps<{
	config: AgentJsonConfig | null;
	selectedKey: string | null;
}>();

const emit = defineEmits<{ select: [key: string] }>();

interface SectionDescriptor {
	key: string;
	label: string;
	icon: string;
}

const KNOWN_SECTIONS: Record<string, { label: string; icon: string }> = {
	model: { label: 'Model', icon: 'brain' }, // 'cpu' not in updatedIconSet — using 'brain'
	instructions: { label: 'Instructions', icon: 'file-text' },
	triggers: { label: 'Triggers', icon: 'zap' },
	tools: { label: 'Tools', icon: 'wrench' },
	memory: { label: 'Memory', icon: 'database' },
	guardrails: { label: 'Guardrails', icon: 'shield' },
};

function humanize(key: string): string {
	const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

const sections = computed<SectionDescriptor[]>(() => {
	const cfg = props.config;
	if (!cfg) return [];
	return Object.keys(cfg).map((key) => {
		const known = KNOWN_SECTIONS[key];
		return {
			key,
			label: known?.label ?? humanize(key),
			icon: known?.icon ?? 'file',
		};
	});
});
</script>

<template>
	<div :class="$style.tree" data-testid="agent-config-tree">
		<div v-if="sections.length === 0" data-testid="agent-config-tree-empty" :class="$style.empty">
			<N8nText size="small" color="text-light">No sections yet</N8nText>
		</div>
		<button
			v-for="section in sections"
			:key="section.key"
			:class="[
				$style.item,
				selectedKey === section.key && $style.selected,
				selectedKey === section.key && 'selected',
			]"
			:data-key="section.key"
			data-testid="agent-config-tree-item"
			type="button"
			@click="emit('select', section.key)"
		>
			<N8nIcon :icon="section.icon" :size="14" />
			<N8nText tag="span" size="small">{{ section.label }}</N8nText>
		</button>
	</div>
</template>

<style lang="scss" module>
.tree {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--2xs);
}

.empty {
	padding: var(--spacing--sm);
	text-align: center;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: transparent;
	border: var(--border);
	border-color: transparent;
	border-radius: var(--radius);
	cursor: pointer;
	text-align: left;
	color: var(--color--text);

	&:hover {
		background: var(--color--background--light-2);
	}
}

.selected {
	background: var(--color--background--light-3);
	border-color: var(--color--foreground);
}
</style>
