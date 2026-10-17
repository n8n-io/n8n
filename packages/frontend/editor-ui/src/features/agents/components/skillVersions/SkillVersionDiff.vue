<script setup lang="ts">
import { computed } from 'vue';
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import NodeDiff from '@/features/workflows/workflowDiff/NodeDiff.vue';

import type { AgentSkill } from '../../types';
import { getSkillDiffSections, type SkillDiffSection } from './skillVersionDiff.utils';

const props = defineProps<{
	from: AgentSkill;
	to: AgentSkill;
	fromLabel?: string;
	toLabel?: string;
}>();

const i18n = useI18n();

const sections = computed(() => getSkillDiffSections(props.from, props.to));
const total = computed(() =>
	sections.value.reduce(
		(sum, { added, removed }) => ({ added: sum.added + added, removed: sum.removed + removed }),
		{ added: 0, removed: 0 },
	),
);
const hasChanges = computed(() => sections.value.some(({ changed }) => changed));

function sectionTitle(section: SkillDiffSection): string {
	switch (section.kind) {
		case 'name':
			return i18n.baseText('settings.context.skills.versions.diff.name');
		// The same names as the fields of the skill form.
		case 'description':
			return i18n.baseText('agents.builder.skills.description.label');
		case 'instructions':
			return i18n.baseText('agents.builder.skills.instructions.label');
		case 'reference':
			return section.path ?? '';
	}
}

/** A reference file that only one side has is new or gone, not edited. */
function fileState(section: SkillDiffSection): 'added' | 'removed' | undefined {
	if (section.kind !== 'reference') return undefined;
	const hasFrom = (props.from.references ?? []).some(({ path }) => path === section.path);
	const hasTo = (props.to.references ?? []).some(({ path }) => path === section.path);
	if (hasTo && !hasFrom) return 'added';
	if (hasFrom && !hasTo) return 'removed';
	return undefined;
}

// A missing final newline makes the diff show the last line as removed and added again.
function withFinalNewline(text: string): string {
	return text === '' || text.endsWith('\n') ? text : `${text}\n`;
}
</script>

<template>
	<div :class="$style.diff" data-testid="skill-version-diff">
		<div :class="$style.summary">
			<N8nText v-if="fromLabel && toLabel" size="small" color="text-base">
				<span data-testid="skill-version-diff-from">{{ fromLabel }}</span>
				<N8nIcon icon="arrow-right" size="small" :class="$style.arrow" />
				<span data-testid="skill-version-diff-to">{{ toLabel }}</span>
			</N8nText>
			<N8nText
				v-if="hasChanges"
				size="small"
				color="text-light"
				data-testid="skill-version-diff-stat"
			>
				<span :class="$style.added">+{{ total.added }}</span>
				{{ ' ' }}
				<span :class="$style.removed">−{{ total.removed }}</span>
				{{ ' ' }}
				{{ i18n.baseText('settings.context.skills.versions.diff.lines') }}
			</N8nText>
			<N8nText v-else size="small" color="text-light" data-testid="skill-version-diff-stat">
				{{ i18n.baseText('settings.context.skills.versions.diff.same') }}
			</N8nText>
		</div>

		<section
			v-for="section in sections"
			:key="section.key"
			:class="$style.section"
			:data-section="section.key"
			data-testid="skill-version-diff-section"
		>
			<header :class="$style.sectionHeader">
				<N8nText size="small" color="text-dark" bold :class="$style.sectionTitle">
					{{ sectionTitle(section) }}
				</N8nText>
				<N8nBadge v-if="fileState(section) === 'added'" variant="success" size="xsmall">
					{{ i18n.baseText('settings.context.skills.versions.diff.fileAdded') }}
				</N8nBadge>
				<N8nBadge v-else-if="fileState(section) === 'removed'" variant="danger" size="xsmall">
					{{ i18n.baseText('settings.context.skills.versions.diff.fileRemoved') }}
				</N8nBadge>
				<span :class="$style.spacer" />
				<N8nText
					v-if="section.changed"
					size="small"
					color="text-light"
					data-testid="skill-version-diff-section-stat"
				>
					<span :class="$style.added">+{{ section.added }}</span>
					{{ ' ' }}
					<span :class="$style.removed">−{{ section.removed }}</span>
				</N8nText>
				<N8nText
					v-else
					size="small"
					color="text-light"
					data-testid="skill-version-diff-section-unchanged"
				>
					{{ i18n.baseText('settings.context.skills.versions.diff.noChanges') }}
				</N8nText>
			</header>
			<div v-if="section.changed" :class="$style.code">
				<NodeDiff
					:old-string="withFinalNewline(section.from)"
					:new-string="withFinalNewline(section.to)"
					language="plaintext"
					output-format="line-by-line"
					hide-stat
				/>
			</div>
		</section>
	</div>
</template>

<style lang="scss" module>
.diff {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}

.summary {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
}

.arrow {
	margin-inline: var(--spacing--4xs);
	vertical-align: middle;
}

.section {
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--color--background--light-2);
}

.section:has(.code) .sectionHeader {
	border-bottom: var(--border);
}

.sectionTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.spacer {
	flex: 1;
}

.code {
	max-height: calc(var(--height--5xl) * 4);
	overflow: auto;
}

.added {
	color: var(--color--success);
}

.removed {
	color: var(--color--danger);
}
</style>
