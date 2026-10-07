<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { N8nButton, N8nCheckbox, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	codingDiffLines,
	type CodingDiffLine,
	type CodingReviewComment,
} from '../utils/coding-review';

const props = defineProps<{
	path: string;
	content: string;
	revision: string;
	comments: CodingReviewComment[];
	viewed: boolean;
	disabled?: boolean;
}>();
const emit = defineEmits<{
	comment: [comment: CodingReviewComment];
	remove: [id: string];
	viewed: [value: boolean];
}>();
const i18n = useI18n();
const lines = computed(() => codingDiffLines(props.content));
const collapsed = ref(props.viewed);
const anchor = ref<{ index: number; side: 'old' | 'new' }>();
const end = ref<number>();
const body = ref('');
const draft = ref<HTMLElement>();
const signs = { added: '+', removed: '−', context: ' ', hunk: '', header: '' };
function setDraft(element: unknown) {
	draft.value = element instanceof HTMLElement ? element : undefined;
}
const currentComments = computed(() =>
	props.comments.filter((comment) => comment.revision === props.revision),
);
const staleComments = computed(() =>
	props.comments.filter((comment) => comment.revision !== props.revision),
);
const selectedLines = computed(() => {
	if (!anchor.value || end.value === undefined) return [];
	const from = Math.min(anchor.value.index, end.value);
	const to = Math.max(anchor.value.index, end.value);
	return lines.value.filter(
		(line) =>
			line.index >= from && line.index <= to && number(line, anchor.value?.side) !== undefined,
	);
});
const draftEnd = computed(() => selectedLines.value.at(-1)?.index);

function number(line: CodingDiffLine, side?: 'old' | 'new') {
	return side === 'old' ? line.oldLine : line.newLine;
}

async function select(line: CodingDiffLine, event: MouseEvent) {
	if (props.disabled || (line.newLine === undefined && line.oldLine === undefined)) return;
	const side = line.newLine === undefined ? 'old' : 'new';
	if (!event.shiftKey || !anchor.value || anchor.value.side !== side)
		anchor.value = { index: line.index, side };
	end.value = line.index;
	await nextTick();
	draft.value?.querySelector('textarea')?.focus();
}

function cancel() {
	anchor.value = undefined;
	end.value = undefined;
	body.value = '';
}

function addComment() {
	const first = selectedLines.value[0];
	const last = selectedLines.value.at(-1);
	if (!first || !last || !anchor.value || !body.value.trim() || props.disabled) return;
	const line = number(first, anchor.value.side);
	const endLine = number(last, anchor.value.side);
	if (line === undefined || endLine === undefined) return;
	emit('comment', {
		id: crypto.randomUUID(),
		path: props.path,
		side: anchor.value.side,
		line,
		endLine,
		code: selectedLines.value
			.map((row) => row.text)
			.join('\n')
			.slice(0, 16000),
		body: body.value.trim(),
		revision: props.revision,
	});
	cancel();
}

function commentsAt(line: CodingDiffLine) {
	return currentComments.value.filter((comment) => number(line, comment.side) === comment.endLine);
}

function markViewed(value: boolean) {
	collapsed.value = value;
	emit('viewed', value);
}

watch(
	() => props.path,
	() => {
		cancel();
		collapsed.value = props.viewed;
	},
);
watch(() => props.revision, cancel);
watch(
	() => props.viewed,
	(value) => {
		collapsed.value = value;
	},
);
</script>

<template>
	<div :class="$style.diff" data-testid="coding-diff-review">
		<div :class="$style.toolbar">
			<N8nButton
				variant="ghost"
				size="small"
				:icon="collapsed ? 'chevron-right' : 'chevron-down'"
				:aria-expanded="!collapsed"
				@click="collapsed = !collapsed"
			>
				{{
					i18n.baseText(collapsed ? 'agents.coding.review.expand' : 'agents.coding.review.collapse')
				}}
			</N8nButton>
			<N8nText size="small" color="text-light">{{
				i18n.baseText('agents.coding.review.lineHint')
			}}</N8nText>
			<N8nCheckbox
				:model-value="viewed"
				:label="i18n.baseText('agents.coding.review.viewed')"
				@update:model-value="markViewed"
			/>
		</div>
		<div v-if="!collapsed" :class="$style.lines">
			<template v-for="line in lines" :key="line.index">
				<div
					v-if="line.kind === 'hunk' || line.kind === 'header'"
					:class="[$style.meta, { [$style.hunk]: line.kind === 'hunk' }]"
				>
					{{ line.text }}
				</div>
				<button
					v-else
					type="button"
					:class="[
						$style.line,
						$style[line.kind],
						{ [$style.selected]: selectedLines.includes(line) },
					]"
					:disabled="disabled"
					:aria-label="
						i18n.baseText('agents.coding.review.commentLine', {
							interpolate: { line: line.newLine ?? line.oldLine ?? 0 },
						})
					"
					@click="select(line, $event)"
				>
					<span :class="$style.plus"><N8nIcon icon="plus" size="small" /></span>
					<span :class="$style.number">{{ line.oldLine }}</span
					><span :class="$style.number">{{ line.newLine }}</span>
					<span :class="$style.sign">{{ signs[line.kind] }}</span>
					<code>{{ line.text || ' ' }}</code>
				</button>
				<div v-for="comment in commentsAt(line)" :key="comment.id" :class="$style.comment">
					<N8nText size="small">{{ comment.body }}</N8nText>
					<N8nButton
						variant="ghost"
						size="small"
						icon="trash-2"
						:disabled="disabled"
						@click="emit('remove', comment.id)"
						>{{ i18n.baseText('agents.coding.review.remove') }}</N8nButton
					>
				</div>
				<div v-if="draftEnd === line.index" :ref="setDraft" :class="$style.draft">
					<N8nInput
						v-model="body"
						type="textarea"
						:rows="3"
						:maxlength="4000"
						:placeholder="i18n.baseText('agents.coding.review.placeholder')"
						:aria-label="i18n.baseText('agents.coding.review.comment')"
						@keydown.meta.enter.prevent="addComment"
						@keydown.ctrl.enter.prevent="addComment"
						@keydown.esc="cancel"
					/>
					<div :class="$style.draftActions">
						<N8nButton variant="ghost" size="small" @click="cancel">{{
							i18n.baseText('generic.cancel')
						}}</N8nButton
						><N8nButton size="small" :disabled="!body.trim() || disabled" @click="addComment">{{
							i18n.baseText('agents.coding.review.add')
						}}</N8nButton>
					</div>
				</div>
			</template>
		</div>
		<div v-for="comment in staleComments" :key="comment.id" :class="$style.comment">
			<div>
				<N8nText size="small" color="text-light">{{
					i18n.baseText('agents.coding.review.changed')
				}}</N8nText>
				<p>{{ comment.body }}</p>
				<pre>{{ comment.code }}</pre>
			</div>
			<N8nButton
				variant="ghost"
				size="small"
				icon="trash-2"
				:disabled="disabled"
				@click="emit('remove', comment.id)"
				>{{ i18n.baseText('agents.coding.review.remove') }}</N8nButton
			>
		</div>
	</div>
</template>

<style lang="scss" module>
.diff {
	display: flex;
	flex-direction: column;
	min-height: 0;
	flex: 1;
	overflow: auto;
}
.toolbar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs);
	border-bottom: var(--border);
	position: sticky;
	top: 0;
	z-index: 1;
	background: var(--background--surface);
}
.toolbar > :last-child {
	margin-left: auto;
}
.lines {
	min-width: fit-content;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}
.line {
	display: flex;
	align-items: stretch;
	width: 100%;
	min-height: var(--height--xs);
	border: 0;
	padding: 0 var(--spacing--xs) 0 0;
	color: var(--text-color);
	background: transparent;
	text-align: left;
	cursor: pointer;
	font: inherit;
}
.line code {
	align-self: center;
	white-space: pre;
	font: inherit;
}
.line:focus-visible {
	outline: var(--border-width) solid var(--color--primary);
	outline-offset: calc(-1 * var(--spacing--5xs));
}
.number {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	min-width: var(--spacing--2xl);
	padding-inline: var(--spacing--2xs);
	text-align: right;
	color: var(--text-color--subtle);
	user-select: none;
}
.plus,
.sign {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	flex-shrink: 0;
	text-align: center;
	user-select: none;
}
.plus {
	opacity: 0;
	color: var(--color--primary);
}
.line:hover .plus,
.line:focus-visible .plus {
	opacity: 1;
}
.added {
	background: var(--diff--color--new--faint);
}
.removed {
	background: var(--diff--color--deleted--faint);
}
.added .number {
	background: var(--diff--color--new--light);
	color: var(--text-color);
}
.removed .number {
	background: var(--diff--color--deleted--light);
	color: var(--text-color);
}
.sign {
	font-weight: var(--font-weight--bold);
}
.added .sign {
	color: light-dark(var(--color--green-800), var(--diff--color--new));
}
.removed .sign {
	color: light-dark(var(--color--red-800), var(--diff--color--deleted));
}
.selected {
	outline: var(--border-width) solid var(--color--primary);
	outline-offset: calc(-1 * var(--border-width));
}
.meta {
	padding: var(--spacing--4xs) var(--spacing--xs);
	color: var(--text-color--subtle);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
.hunk {
	background: var(--background--subtle);
	color: var(--text-color--info);
	padding-block: var(--spacing--2xs);
}
.comment,
.draft {
	margin: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xs);
	background: var(--background--surface);
}
.comment {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
	white-space: pre-wrap;
	font-family: var(--font-family);
}
.comment pre {
	max-height: var(--spacing--5xl);
	overflow: auto;
	font-size: var(--font-size--2xs);
}
.draftActions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
