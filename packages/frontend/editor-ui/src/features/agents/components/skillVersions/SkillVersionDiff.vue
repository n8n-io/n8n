<script setup lang="ts">
import { computed } from 'vue';
import { N8nMarkdown, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

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

const shownSections = computed(() =>
	props.selectedPath === SKILL_FILE
		? props.sections.filter((section) => section.key in FIELD_LABELS)
		: props.sections.filter((section) => section.key === props.selectedPath),
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
				<N8nText
					v-if="section.added || section.removed"
					size="xsmall"
					:class="$style.counts"
					data-testid="skill-version-diff-count"
				>
					<span :class="$style.removedCount">−{{ section.removed }}</span>
					<span :class="$style.addedCount">+{{ section.added }}</span>
				</N8nText>
			</div>
			<div :class="$style.body">
				<template v-for="(block, index) in blocksOf(section.lines)" :key="index">
					<N8nMarkdown
						v-if="block.kind === 'equal' && isMarkdown(section)"
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

.counts {
	display: flex;
	gap: var(--spacing--4xs);
}

.removedCount {
	color: var(--color--danger);
}

.addedCount {
	color: var(--color--success);
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
	background-color: var(--color--danger--tint-4);
	box-shadow: inset 2px 0 0 var(--color--danger);
}

.added {
	background-color: var(--color--success--tint-4);
	box-shadow: inset 2px 0 0 var(--color--success);
}

.removed .changedWord {
	background-color: var(--color--danger--tint-3);
}

.added .changedWord {
	background-color: var(--color--success--tint-3);
}
</style>
