<script setup lang="ts">
// Prototype, direction B: a markdown field of the skill modal, read only, such as the
// instructions. A change shows as the inline diff of the editor. An issue marks its text:
// point at the mark to see the issue name. There is no callout in the editor: the issue list
// holds it.
import { computed, ref, watch } from 'vue';
import {
	N8nInputLabel,
	N8nMarkdownEditor,
	N8nTooltip,
	attachMarkdownDiff,
	attachMarkdownFindings,
} from '@n8n/design-system';

// The diff and mark classes of the editor overlay are global styles that SkillDiffViewer owns.
import '../SkillDiffViewer.vue';
import type { FieldReviewIssue } from './skillFieldReview';

type MarkdownEditor = Parameters<typeof attachMarkdownDiff>[0];

const props = defineProps<{
	fieldKey: string;
	label: string;
	before: string;
	after: string;
	issues: FieldReviewIssue[];
}>();

const overlays: Array<{ refresh: () => void }> = [];

function onReady(editor: MarkdownEditor) {
	overlays.push(
		attachMarkdownDiff(editor, () => (props.before === props.after ? undefined : props.before)),
		attachMarkdownFindings(
			editor,
			() =>
				props.issues.flatMap((issue) =>
					issue.match
						? [
								// Every mark is yellow, also for Blocked: red belongs to the removed lines.
								{
									id: issue.id,
									match: issue.match,
									severity: 'needs_review',
									message: issue.title,
								},
							]
						: [],
				),
			{ showNotes: false },
		),
	);
}

watch(
	() => [props.before, props.after, props.issues],
	() => overlays.forEach((overlay) => overlay.refresh()),
);

/**
 * The editor draws its marks itself, so a tooltip cannot wrap them. When the pointer is on a
 * mark, an empty trigger takes the place and the size of the mark, and the tooltip opens on it.
 */
const field = ref<HTMLElement | null>(null);
const hovered = ref<{ id: string; box: Record<string, string> } | null>(null);

const hoveredTitle = computed(
	() => props.issues.find((issue) => issue.id === hovered.value?.id)?.title ?? '',
);

function markOf(target: EventTarget | null): HTMLElement | null {
	return target instanceof Element ? target.closest<HTMLElement>('[data-finding-id]') : null;
}

function onPointerOver(event: PointerEvent) {
	const mark = markOf(event.target);
	const id = mark?.dataset.findingId;
	if (!mark || !id || !field.value) return;
	const outer = field.value.getBoundingClientRect();
	const inner = mark.getBoundingClientRect();
	hovered.value = {
		id,
		box: {
			top: `${inner.top - outer.top}px`,
			left: `${inner.left - outer.left}px`,
			width: `${inner.width}px`,
			height: `${inner.height}px`,
		},
	};
}

function onPointerOut(event: PointerEvent) {
	if (markOf(event.relatedTarget) !== markOf(event.target)) hovered.value = null;
}
</script>

<template>
	<div
		ref="field"
		:class="$style.field"
		@pointerover="onPointerOver"
		@pointerout="onPointerOut"
		@pointerleave="hovered = null"
	>
		<N8nInputLabel :label="label" size="small" :data-review-field="fieldKey" :class="$style.label">
			<N8nMarkdownEditor
				:class="$style.editor"
				data-review-input
				:model-value="after"
				readonly
				show-toolbar="never"
				max-height="none"
				@ready="onReady"
			/>
		</N8nInputLabel>
		<N8nTooltip v-if="hovered" as-child :visible="true" placement="top" :content="hoveredTitle">
			<span :class="$style.anchor" :style="hovered.box" aria-hidden="true" />
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
/* The tooltip trigger lies over the mark, so the field places it. */
.field {
	position: relative;
}

/* The trigger takes no pointer events, so the pointer stays on the mark under it. */
.anchor {
	position: absolute;
	pointer-events: none;
}

.label {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/* As in SkillDiffViewer: the border moves inside, so the diff bars sit on it, and nothing
   clips, so the + and − signs can sit left of the editor. */
.editor.editor {
	--skill-diff-inset: calc(var(--spacing--xs) + var(--border-width, 1px) * 2);
	--input--border--shadow: inset 0 0 0 1px var(--input--border-color);
	--input--border--shadow--hover: inset 0 0 0 1px var(--input--border-color--hover);
	--input--border--shadow--focus: inset 0 0 0 1px var(--input--border-color--focus);

	margin: calc(var(--border-width, 1px) * -1);
	padding: 0;
	overflow: visible;

	:global([data-markdown-editor-content-wrapper]) {
		overflow: visible;
	}

	:global(.n8n-markdown) {
		overflow: visible;
		padding: var(--skill-diff-inset);

		/* The editor adds an empty paragraph after a closing list, for the cursor. The field is
		   read only, so it is only empty space. */
		> p:last-child:has(> :global(.ProseMirror-trailingBreak):only-child) {
			display: none;
		}

		> :has(+ p:last-child > :global(.ProseMirror-trailingBreak):only-child) {
			margin-bottom: 0;
		}
	}
}
</style>
