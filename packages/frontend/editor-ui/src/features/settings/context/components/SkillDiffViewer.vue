<script setup lang="ts">
// One file of a skill in the shape of the skill modal: the fields read-only. With `from`, the
// changes from it show as an inline diff. With findings, the text of each finding is marked,
// with its message under it.
import { computed, watch } from 'vue';
import type { AgentSkill, SkillScanFinding } from '@n8n/api-types';
import {
	N8nInputLabel,
	N8nMarkdownEditor,
	attachMarkdownDiff,
	attachMarkdownFindings,
	type MarkdownFinding,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import SkillFindingsList from './SkillFindingsList.vue';
import SkillLineDiffField from './SkillLineDiffField.vue';
import { useSkillSourceReasons } from '../skills.utils';

type MarkdownEditor = Parameters<typeof attachMarkdownDiff>[0];

const SKILL_FILE = 'SKILL.md';

const props = withDefaults(
	defineProps<{
		/** The older version. Without it, the file shows with no diff. */
		from?: AgentSkill | null;
		/** The version to show. */
		to: AgentSkill;
		selectedPath?: string;
		/** The check findings in this file. */
		findings?: SkillScanFinding[];
		/** Shows only what has a warning or an error. The rest folds away. */
		focus?: boolean;
	}>(),
	{ from: null, selectedPath: SKILL_FILE, findings: () => [], focus: false },
);

const i18n = useI18n();
const { ruleText } = useSkillSourceReasons();

const isSkillFile = computed(() => props.selectedPath === SKILL_FILE);
/** Without an older version, each side is the same, so nothing shows as changed. */
const base = computed(() => props.from ?? props.to);

function contentOf(skill: AgentSkill, path: string): string | undefined {
	return (skill.references ?? []).find((reference) => reference.path === path)?.content;
}

/** The selected reference on each side. A side without the file has no content. */
const reference = computed(() => ({
	from: contentOf(base.value, props.selectedPath),
	to: contentOf(props.to, props.selectedPath),
}));

const fileName = (path: string) => path.replace(/^references\//, '');

/** The text that a finding is about, as its snippet shows it. */
function matchOf(finding: SkillScanFinding): string {
	const location = finding.location;
	if (!location) return '';
	const row = location.snippet.find(({ line }) => line === location.line);
	return row?.text.slice(location.start, location.end) ?? '';
}

function toMarkdownFinding(finding: SkillScanFinding): MarkdownFinding {
	return { match: matchOf(finding), severity: finding.severity, message: ruleText(finding.rule) };
}

/** Where each finding shows: in a field, in the editor, or on top of the file. */
const placed = computed(() => {
	const name: SkillScanFinding[] = [];
	const description: SkillScanFinding[] = [];
	const editor: SkillScanFinding[] = [];
	const top: SkillScanFinding[] = [];
	// Focus shows warnings and errors only, so a finding for information stays out of it.
	const shown = props.focus
		? props.findings.filter((finding) => finding.severity !== 'info')
		: props.findings;
	for (const finding of shown) {
		const part = finding.location?.part;
		if (!finding.location || part === 'frontmatter') top.push(finding);
		else if (isSkillFile.value && part === 'name') name.push(finding);
		else if (isSkillFile.value && part === 'description') description.push(finding);
		else editor.push(finding);
	}
	return {
		name: name.map(toMarkdownFinding),
		description: description.map(toMarkdownFinding),
		editor: editor.map(toMarkdownFinding),
		top,
	};
});

// Each markdown editor gets the overlays once it exists. They read through getters, so a
// new comparison only needs a refresh.
const overlays: Array<{ refresh: () => void }> = [];

function onReady(editor: MarkdownEditor) {
	overlays.push(
		attachMarkdownDiff(editor, () => {
			if (!props.from) return undefined;
			return isSkillFile.value ? props.from.instructions : (reference.value.from ?? '');
		}),
		attachMarkdownFindings(editor, () => placed.value.editor, {
			getFocus: () => props.focus,
		}),
	);
}

watch(
	() => [props.from, props.to, props.selectedPath, props.findings, props.focus],
	() => overlays.forEach((overlay) => overlay.refresh()),
);
</script>

<template>
	<div :class="[$style.panel, focus && 'skill-diff-focus']">
		<SkillFindingsList v-if="placed.top.length > 0" :findings="placed.top" />
		<template v-if="isSkillFile">
			<SkillLineDiffField
				v-if="!focus || placed.name.length > 0"
				:label="i18n.baseText('agents.builder.skills.name.label')"
				:from="base.name"
				:to="to.name"
				:findings="placed.name"
				test-id="skill-name-diff"
			/>
			<SkillLineDiffField
				v-if="!focus || placed.description.length > 0"
				:label="i18n.baseText('agents.builder.skills.description.label')"
				:from="base.description"
				:to="to.description"
				:findings="placed.description"
				test-id="skill-description-diff"
			/>
			<N8nInputLabel
				:class="$style.editorLabel"
				:label="i18n.baseText('agents.builder.skills.instructions.label')"
				size="small"
			>
				<N8nMarkdownEditor
					:class="[$style.editor, $style.diffEditor]"
					:model-value="to.instructions ?? ''"
					readonly
					show-toolbar="never"
					max-height="none"
					@ready="onReady"
				/>
			</N8nInputLabel>
		</template>
		<template v-else>
			<SkillLineDiffField
				v-if="!focus"
				:label="i18n.baseText('agents.builder.skills.references.name.label')"
				:from="reference.from !== undefined ? fileName(selectedPath) : ''"
				:to="reference.to !== undefined ? fileName(selectedPath) : ''"
				test-id="skill-reference-name-diff"
			/>
			<N8nInputLabel
				:class="$style.editorLabel"
				:label="i18n.baseText('agents.builder.skills.references.content.label')"
				size="small"
			>
				<N8nMarkdownEditor
					:class="[$style.editor, $style.diffEditor]"
					:model-value="reference.to ?? ''"
					readonly
					show-toolbar="never"
					max-height="none"
					@ready="onReady"
				/>
			</N8nInputLabel>
		</template>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	min-width: 0;
	width: 100%;
	/* Room on the left for the + and − signs, which sit outside the fields. */
	padding-inline-start: var(--spacing--md);
	box-sizing: border-box;
}

.editorLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/*
 * The diff bars must sit on the editor border. The editor draws its border as an outer
 * shadow, 1px outside a 1px padding, and clips its content. Here the border moves inside (an
 * inset shadow, under the content) and the padding goes, so a block that bleeds to the edge
 * covers the border. The doubled class beats the editor's own rules.
 */
.diffEditor.diffEditor {
	--skill-diff-inset: calc(var(--spacing--xs) + var(--border-width, 1px) * 2);
	--input--border--shadow: inset 0 0 0 1px var(--input--border-color);
	--input--border--shadow--hover: inset 0 0 0 1px var(--input--border-color--hover);
	--input--border--shadow--focus: inset 0 0 0 1px var(--input--border-color--focus);

	margin: calc(var(--border-width, 1px) * -1);
	padding: 0;
	/* Nothing clips, so the + and − signs can sit left of the editor. */
	overflow: visible;

	:global([data-markdown-editor-content-wrapper]) {
		overflow: visible;
	}

	:global(.n8n-markdown) {
		overflow: visible;
		padding: var(--skill-diff-inset);
	}
}
</style>

<!-- The overlay lives inside the editor's ProseMirror DOM, so its classes (set by
     attachMarkdownDiff) are global. Each changed block bleeds into the editor padding, with a
     bar on its left edge, as a classic inline diff. -->
<style lang="scss">
:is(.n8n-markdown, .skill-diff-lines) .skill-diff-added,
:is(.n8n-markdown, .skill-diff-lines) .skill-diff-removed {
	--skill-diff-bar: var(--spacing--5xs);
	/* How far the colour reaches above and below the text. */
	--skill-diff-pad: var(--spacing--4xs);
	/* From the left edge of the element back to the editor edge. */
	--skill-diff-reach: var(--skill-diff-inset, var(--spacing--xs));

	position: relative;
	/* A stacking context, so ::after sits behind the text but in front of the editor. */
	z-index: 0;
}

:is(.n8n-markdown, .skill-diff-lines) .skill-diff-added::after,
:is(.n8n-markdown, .skill-diff-lines) .skill-diff-removed::after {
	content: '';
	position: absolute;
	z-index: -1;
	top: calc(var(--skill-diff-pad) * -1);
	bottom: calc(var(--skill-diff-pad) * -1);
	left: calc(var(--skill-diff-reach) * -1);
	right: calc((var(--skill-diff-inset, var(--spacing--xs)) - var(--border-width, 1px)) * -1);
	border-left: var(--skill-diff-bar) solid var(--skill-diff-color);
	background-color: var(--skill-diff-background);
}

/* An item starts after the list indent. Its colour fills half the gap on each side, so a run
   of changed items reads as one block. */
.n8n-markdown li:is(.skill-diff-added, .skill-diff-removed) {
	--skill-diff-reach: calc(
		var(--skill-diff-inset, var(--spacing--xs)) + var(--markdown--spacing) * 4
	);
}

.n8n-markdown ul > li:is(.skill-diff-added, .skill-diff-removed) {
	--skill-diff-pad: calc(var(--markdown--spacing) / 2);
}

.n8n-markdown ol > li:is(.skill-diff-added, .skill-diff-removed) {
	--skill-diff-pad: calc(var(--markdown--spacing) * 0.75);
}

:is(.n8n-markdown, .skill-diff-lines) .skill-diff-added {
	--skill-diff-sign: '+';
	--skill-diff-color: var(--diff--color--new);
	--skill-diff-background: var(--diff--color--new--faint);
}

:is(.n8n-markdown, .skill-diff-lines) .skill-diff-removed {
	--skill-diff-sign: '−';
	--skill-diff-color: var(--diff--color--deleted);
	--skill-diff-background: var(--diff--color--deleted--faint);

	user-select: none;
}

/* The exact words that an edited line changed, in a stronger tint of its colour. */
.skill-diff-word-removed,
.skill-diff-word-added {
	border-radius: 0;
	box-decoration-break: clone;
}

.skill-diff-word-removed {
	background-color: var(--diff--color--deleted--light);
}

.skill-diff-word-added {
	background-color: var(--diff--color--new--light);
}

/* A + or − sign left of the field, beside each changed block, so the change does not rely on
   colour. It is one line tall and centred in it. */
:is(.n8n-markdown, .skill-diff-lines) .skill-diff-added::before,
:is(.n8n-markdown, .skill-diff-lines) .skill-diff-removed::before {
	content: var(--skill-diff-sign);
	position: absolute;
	top: 0;
	right: calc(100% + var(--skill-diff-reach) + var(--spacing--2xs));
	display: flex;
	align-items: center;
	height: 1lh;
	color: var(--skill-diff-color);
	font-family: var(--font-family--monospace);
	font-weight: var(--font-weight--regular);
	text-decoration: none;
}
/*
 * Check findings. Only the text of a finding is marked, as an error or a warning in a code
 * editor: a light tint and a wavy underline in the colour of its severity.
 */
.skill-finding-mark {
	background-color: var(--skill-finding-mark-background);
	text-decoration-line: underline;
	text-decoration-style: wavy;
	text-decoration-color: var(--skill-finding-mark-color);
	text-decoration-thickness: 1px;
	text-underline-offset: 3px;
	text-decoration-skip-ink: none;
	box-decoration-break: clone;
}

.skill-finding-mark--needs_review {
	--skill-finding-mark-background: var(--callout--color--background--warning);
	--skill-finding-mark-color: var(--callout--icon-color--warning);
}

.skill-finding-mark--blocked {
	--skill-finding-mark-background: var(--callout--color--background--danger);
	--skill-finding-mark-color: var(--callout--icon-color--danger);
}

.skill-finding-mark--info {
	--skill-finding-mark-background: var(--background--active);
	--skill-finding-mark-color: var(--color--text--tint-1);
}

/*
 * The callout with the message, right under the marked block and as wide as the field: it
 * bleeds into the field padding, as a changed block does, and stops just inside the border.
 * It has square corners and no side borders, so it reads as a bar across the field.
 */
.skill-finding-note {
	--skill-finding-note-bleed: calc(
		var(--skill-diff-inset, var(--spacing--xs)) - var(--border-width, 1px)
	);

	margin: 0;
	white-space: normal;
	user-select: none;
}

.skill-finding-note > * {
	border-radius: 0;
	border-inline-width: 0;
}

/* The paragraph above keeps its bottom margin, so the callout moves up to meet its colour. */
.n8n-markdown .skill-finding-note {
	margin: calc(var(--spacing--4xs) - var(--markdown--spacing) * 2)
		calc(var(--skill-finding-note-bleed) * -1) 0;
}

/* In a list item, the callout also reaches back over the list indent. */
.n8n-markdown li > .skill-finding-note {
	margin-left: calc((var(--skill-finding-note-bleed) + var(--markdown--spacing) * 4) * -1);
}

.n8n-markdown .skill-finding-note:first-child {
	margin-top: calc(var(--skill-finding-note-bleed) * -1);
}

.n8n-markdown .skill-finding-note:last-child {
	margin-bottom: calc(var(--skill-finding-note-bleed) * -1);
}

/* Focus: the blocks without a finding, and the blocks that a diff removed, hide. */
.skill-finding-hidden,
.skill-diff-focus .skill-diff-removed {
	display: none;
}
</style>
