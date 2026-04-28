<script setup lang="ts">
import { computed } from 'vue';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nSwitch2,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentJsonSkillRef } from '@n8n/api-types';

import shared from '../styles/agent-panel.module.scss';

const props = withDefaults(
	defineProps<{
		skills: AgentJsonSkillRef[];
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'add-skill': [];
	'remove-skill': [id: string];
	'toggle-skill': [id: string, enabled: boolean];
}>();

const i18n = useI18n();
const skillCount = computed(() => props.skills.length);
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
							adjustToNumber: skillCount,
							interpolate: { count: String(skillCount) },
						})
					}}
				</N8nText>
			</div>
			<N8nButton
				type="primary"
				size="small"
				:disabled="props.disabled"
				data-testid="agent-skills-add"
				@click="emit('add-skill')"
			>
				<template #prefix><N8nIcon icon="plus" :size="14" /></template>
				{{ i18n.baseText('agents.builder.skills.add') }}
			</N8nButton>
		</div>

		<div v-if="skillCount === 0" :class="$style.empty" data-testid="agent-skills-empty">
			<N8nText size="small" color="text-light">{{
				i18n.baseText('agents.builder.skills.empty')
			}}</N8nText>
		</div>

		<div v-else :class="$style.rows">
			<div
				v-for="skill in props.skills"
				:key="skill.id"
				:class="[$style.row, !skill.enabled && $style.rowDisabled]"
				data-testid="agent-skill-row"
			>
				<N8nIcon icon="sparkles" :size="16" :class="$style.skillIcon" />
				<div :class="$style.skillText">
					<N8nText size="small" color="text-dark" :bold="true" :class="$style.skillName">
						{{ skill.name }}
					</N8nText>
					<N8nText
						v-if="skill.description"
						size="small"
						color="text-light"
						:class="$style.skillDescription"
					>
						{{ skill.description }}
					</N8nText>
				</div>
				<N8nSwitch2
					size="large"
					:model-value="skill.enabled"
					:disabled="props.disabled"
					data-testid="agent-skill-enabled"
					@update:model-value="(enabled) => emit('toggle-skill', skill.id, Boolean(enabled))"
				/>
				<N8nTooltip :content="i18n.baseText('agents.builder.skills.remove')" placement="top">
					<N8nIconButton
						icon="trash-2"
						variant="ghost"
						size="mini"
						text
						:disabled="props.disabled"
						:aria-label="i18n.baseText('agents.builder.skills.remove')"
						data-testid="agent-skill-remove"
						@click="emit('remove-skill', skill.id)"
					/>
				</N8nTooltip>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	height: 100%;
	overflow-y: auto;
}

.disabled > :not(.header) {
	pointer-events: none;
	opacity: 0.6;
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
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
}

.rowDisabled {
	background: var(--color--background--light-2);
}

.skillIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.skillText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.skillName,
.skillDescription {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--md);
}
</style>
