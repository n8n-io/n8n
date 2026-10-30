<script setup lang="ts">
import { computed } from 'vue';
import { N8nMarkdown, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import SkillDiffCount from './SkillDiffCount.vue';
import { SKILL_FILE, type DiffLine, type DiffSection } from './skillVersionDiff';

const FIELD_LABELS: Record<string, BaseTextKey> = {
	name: 'agents.builder.skills.name.label',
	description: 'agents.builder.skills.description.label',
	instructions: 'agents.builder.skills.instructions.label',
};
/** Fields whose text is markdown: their unchanged lines render as markdown. */
const MARKDOWN_FIELDS = new Set(['instructions']);

const props = defineProps<{
	sections: DiffSection[];
	selectedPath: string;
}>();

const i18n = useI18n();

/** The sections of the selected file, each with its blocks worked out once. */
const shownSections = computed(() =>
	props.sections
		.filter((section) =>
			props.selectedPath === SKILL_FILE
				? section.key in FIELD_LABELS
				: section.key === props.selectedPath,
		)
		.map((section) => ({ ...section, blocks: blocksOf(section.lines) })),
);

type Block =
	| { kind: 'equal'; text: string }
	| { kind: 'change'; line: Extract<DiffLine, { type: 'removed' | 'added' }> };

/** Runs of unchanged lines become one block, so markdown renders across lines. */
function blocksOf(lines: DiffLine[]): Block[] {
	const blocks: Block[] = [];
	for (const line of lines) {
		const last = blocks.at(-1);
		if (line.type === 'equal') {
			if (last?.kind === 'equal') last.text += `\n${line.text}`;
			else blocks.push({ kind: 'equal', text: line.text });
		} else {
			blocks.push({ kind: 'change', line });
		}
	}
	return blocks;
}

function labelOf(section: DiffSection): string {
	const key = FIELD_LABELS[section.key];
	return key ? i18n.baseText(key) : section.key;
}

function isMarkdown(section: DiffSection): boolean {
	return MARKDOWN_FIELDS.has(section.key) || section.key.endsWith('.md');
}

/**
 * Whether an unchanged run renders as markdown. A run that opens or closes a code fence
 * without the other half would turn the rest of the run into code, so it stays plain text.
 */
function rendersAsMarkdown(section: DiffSection, text: string): boolean {
	if (!isMarkdown(section)) return false;
	const fences = text.split('\n').filter((line) => /^\s*(```|~~~)/.test(line)).length;
	return fences % 2 === 0;
}
</script>

<template>
	<div :class="$style.diff" data-testid="skill-version-diff">
		<section
			v-for="section in shownSections"
			:key="section.key"
			:class="$style.field"
			:data-testid="`skill-version-diff-${section.key}`"
		>
			<div :class="$style.fieldHeader">
				<N8nText size="small" bold>{{ labelOf(section) }}</N8nText>
				<SkillDiffCount :count="section" />
			</div>
			<div :class="$style.body">
				<template v-for="(block, index) in section.blocks" :key="index">
					<N8nMarkdown
						v-if="block.kind === 'equal' && rendersAsMarkdown(section, block.text)"
						:class="$style.equal"
						:content="block.text"
					/>
					<p v-else-if="block.kind === 'equal'" :class="[$style.line, $style.equal]">
						{{ block.text }}
					</p>
					<p
						v-else
						:class="[$style.line, block.line.type === 'added' ? $style.added : $style.removed]"
						:data-testid="`skill-version-diff-${block.line.type}`"
					>
						<span :class="$style.marker" aria-hidden="true">{{
							block.line.type === 'added' ? '+' : '−'
						}}</span>
						<span
							v-for="(segment, segmentIndex) in block.line.segments"
							:key="segmentIndex"
							:class="segment.changed && $style.changedWord"
							>{{ segment.text }}</span
						>
					</p>
				</template>
			</div>
		</section>
	</div>
</template>

<style module lang="scss">
.diff {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	flex: 1;
	min-width: 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.fieldHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.body {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) 0;
	border: var(--border);
	border-radius: var(--radius);
	overflow-wrap: anywhere;
}

.line {
	position: relative;
	margin: 0;
	padding: var(--spacing--4xs) var(--spacing--sm) var(--spacing--4xs) var(--spacing--lg);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	white-space: pre-wrap;
}

.equal {
	padding-inline: var(--spacing--lg) var(--spacing--sm);
}

.marker {
	position: absolute;
	left: var(--spacing--xs);
	user-select: none;
}

.removed {
	background-color: var(--diff--color--deleted--faint);
	box-shadow: inset 2px 0 0 var(--diff--color--deleted);
}

.added {
	background-color: var(--diff--color--new--faint);
	box-shadow: inset 2px 0 0 var(--diff--color--new);
}

.removed .changedWord {
	background-color: var(--diff--color--deleted--light);
}

.added .changedWord {
	background-color: var(--diff--color--new--light);
}
</style>
