<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentSkill } from '../types';
import shared from '../styles/agent-panel.module.scss';

const props = withDefaults(
	defineProps<{
		skills: Array<{ id: string; skill: AgentSkill }>;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'open-skill': [id: string];
}>();

const i18n = useI18n();

const totalCount = computed(() => props.skills.length);
</script>

<template>
	<div
		:class="[$style.panel, shared.scrollbarThin, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
		data-testid="agent-skills-list-panel"
	>
		<div :class="$style.header">
			<div :class="$style.headerText">
				<N8nText tag="h3" size="large" :bold="true">{{
					i18n.baseText('agents.builder.skills.title')
				}}</N8nText>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('agents.builder.skills.count', {
							adjustToNumber: totalCount,
							interpolate: { count: String(totalCount) },
						})
					}}
				</N8nText>
			</div>
		</div>

		<div v-if="totalCount === 0" :class="$style.empty">
			<N8nText size="small" color="text-light">{{
				i18n.baseText('agents.builder.skills.empty')
			}}</N8nText>
		</div>

		<div v-else :class="$style.rows">
			<button
				v-for="{ id, skill } in skills"
				:key="id"
				type="button"
				:class="$style.row"
				data-testid="agent-skills-list-row"
				@click="emit('open-skill', id)"
			>
				<N8nIcon icon="sparkles" :size="14" :class="$style.skillIcon" />
				<div :class="$style.labels">
					<N8nText size="small" color="text-dark" :class="$style.name">{{
						skill.name || id
					}}</N8nText>
					<N8nText
						v-if="skill.description"
						size="small"
						color="text-light"
						:class="$style.description"
						>{{ skill.description }}</N8nText
					>
				</div>
				<N8nIcon icon="chevron-right" :size="14" :class="$style.chevron" />
			</button>
		</div>
	</div>
</template>

<style module lang="scss">
.panel.disabled > :not(.header) {
	pointer-events: none;
	opacity: 0.6;
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	height: 100%;
	overflow-y: auto;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.empty {
	padding: var(--spacing--lg);
	text-align: center;
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: transparent;
	border: var(--border);
	border-radius: var(--radius);
	color: var(--color--text);
	text-align: left;
	cursor: pointer;
	width: 100%;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.skillIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.labels {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.name,
.description {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--md);
}

.chevron {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}
</style>
