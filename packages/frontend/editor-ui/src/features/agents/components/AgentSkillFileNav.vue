<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentSkill } from '../types';

const SKILL_FILE = 'SKILL.md';

const props = defineProps<{
	skill: AgentSkill;
	selectedPath: string;
}>();

const emit = defineEmits<{
	select: [path: string];
}>();

const i18n = useI18n();
const references = computed(() => props.skill.references ?? []);

function isSelected(path: string) {
	return props.selectedPath === path;
}

function testIdForPath(path: string) {
	return `agent-skill-reference-nav-item-${path.replace(/[^A-Za-z0-9_-]+/g, '-')}`;
}
</script>

<template>
	<nav
		:class="$style.nav"
		:aria-label="i18n.baseText('agents.builder.skills.filesNav.label')"
		data-testid="agent-skill-file-nav"
	>
		<button
			type="button"
			:class="[$style.item, isSelected(SKILL_FILE) && $style.selected]"
			:aria-current="isSelected(SKILL_FILE) ? 'page' : undefined"
			data-testid="agent-skill-file-nav-item"
			@click="emit('select', SKILL_FILE)"
		>
			<N8nIcon icon="scroll-text" :size="16" :class="$style.icon" />
			<N8nText size="small" :bold="true">{{ SKILL_FILE }}</N8nText>
		</button>

		<div :class="$style.section">
			<N8nText size="xsmall" color="text-light" :bold="true" :class="$style.sectionTitle">
				{{ i18n.baseText('agents.builder.skills.references.title') }}
			</N8nText>
			<N8nText
				v-if="references.length === 0"
				size="xsmall"
				color="text-light"
				:class="$style.sectionTitle"
			>
				{{ i18n.baseText('agents.builder.skills.references.empty') }}
			</N8nText>
			<button
				v-for="reference in references"
				:key="reference.path"
				type="button"
				:class="[$style.item, $style.reference, isSelected(reference.path) && $style.selected]"
				:aria-current="isSelected(reference.path) ? 'page' : undefined"
				:aria-label="reference.path"
				:data-testid="testIdForPath(reference.path)"
				@click="emit('select', reference.path)"
			>
				<N8nIcon icon="file-text" :size="16" :class="$style.icon" />
				<N8nText size="small" :class="$style.path">{{ reference.path }}</N8nText>
			</button>
		</div>
	</nav>
</template>

<style module lang="scss">
.nav {
	width: 240px;
	box-sizing: border-box;
	flex-shrink: 0;
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	background: var(--color--background--light);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
	border: none;
	background: transparent;
	border-radius: var(--border-radius-base);
	color: var(--color--text);
	padding: var(--spacing--2xs);
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--color--background--light-2);
	}
}

.icon {
	flex-shrink: 0;
}

.reference {
	padding-left: var(--spacing--xs);
}

.sectionTitle {
	padding-inline: var(--spacing--2xs);
}

.selected {
	background: var(--color--background--light-2);
}

.path {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
