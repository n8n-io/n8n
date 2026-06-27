<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, render, watch } from 'vue';
import type { SourceControlReviewComment } from '@n8n/api-types';
import type { INodeUi } from '@/Interface';
import NodeDiff from '@/features/workflows/workflowDiff/NodeDiff.vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nFormInput, N8nText } from '@n8n/design-system';
import ReviewCommentThread from './ReviewCommentThread.vue';
import ReviewLineCommentForm from './ReviewLineCommentForm.vue';
import { buildCommentThreads, getNodeComments } from '../reviewComments.utils';
import { inferJsonPathAtLine } from '../nodeJsonLineFinder';
import { useSourceControlStore } from '../sourceControl.store';

type LineAnchor = {
	lineNumber: number;
	side: 'LEFT' | 'RIGHT';
	content: string;
};

const props = defineProps<{
	oldString: string;
	newString: string;
	outputFormat: 'side-by-side' | 'line-by-line';
	node: INodeUi;
	comments: SourceControlReviewComment[];
	prNumber: number;
	filePath: string;
	canComment: boolean;
}>();

const emit = defineEmits<{
	submitted: [SourceControlReviewComment];
	deleted: [deletedCommentIds: number[]];
}>();

const i18n = useI18n();
const toast = useToast();
const sourceControlStore = useSourceControlStore();

const containerRef = ref<HTMLElement>();
const commentBody = ref('');
const isSubmitting = ref(false);
const isLineSubmitting = ref(false);

const nodeComments = computed(() => getNodeComments(props.comments, props.node.id));

const threads = computed(() =>
	buildCommentThreads(nodeComments.value, props.newString, props.oldString),
);

const nodeLevelThreads = computed(() =>
	threads.value.filter(
		(thread) => thread.root.subjectType === 'file' || !thread.root.anchor?.jsonPath,
	),
);

const inlineThreads = computed(() =>
	threads.value.filter(
		(thread) => thread.root.subjectType !== 'file' && !!thread.root.anchor?.jsonPath,
	),
);

const mountedThreadCleanups: Array<() => void> = [];
const lineHookCleanups: Array<() => void> = [];
let composeRowCleanup: (() => void) | null = null;
let openComposeAnchor: LineAnchor | null = null;
let composeCell: HTMLTableCellElement | null = null;
let composeAnchorLabel = '';
let composeSubmitHandler: ((body: string) => void) | null = null;

function anchorsMatch(a: LineAnchor, b: LineAnchor): boolean {
	return a.lineNumber === b.lineNumber && a.side === b.side;
}

function getDiffTbody(): HTMLTableSectionElement | null {
	const tbody = containerRef.value?.querySelector('.code-diff-view .diff-table tbody');
	return tbody instanceof HTMLTableSectionElement ? tbody : null;
}

function findDiffRowForLine(
	tbody: HTMLTableSectionElement,
	lineNumber: number,
	side: 'LEFT' | 'RIGHT',
): HTMLTableRowElement | null {
	const cellIndex = side === 'LEFT' ? 0 : 1;
	for (const row of tbody.querySelectorAll('tr')) {
		if (row.dataset.reviewCommentRow || row.dataset.reviewComposeRow) continue;
		if (row.querySelector('.blob-code-hunk')) continue;
		const lineCells = row.querySelectorAll('td.blob-num');
		if (lineCells.length < 2) continue;
		const line = Number.parseInt(lineCells[cellIndex]?.textContent?.trim() ?? '', 10);
		if (line === lineNumber) return row as HTMLTableRowElement;
	}
	return null;
}

function getLineAnchor(row: HTMLTableRowElement): LineAnchor | null {
	if (row.querySelector('.blob-code-hunk')) return null;

	const lineCells = row.querySelectorAll('td.blob-num');
	if (lineCells.length < 2) return null;

	const codeCell = row.querySelector('td.blob-code');
	if (!(codeCell instanceof HTMLTableCellElement)) return null;

	// GitHub rejects review comments on deleted (LEFT) lines.
	if (codeCell.classList.contains('blob-code-deletion')) return null;

	const newLine = Number.parseInt(lineCells[1]?.textContent?.trim() ?? '', 10);
	if (Number.isNaN(newLine)) return null;
	return { lineNumber: newLine, side: 'RIGHT', content: props.newString };
}

function clearComposeRow() {
	composeRowCleanup?.();
	composeRowCleanup = null;
	openComposeAnchor = null;
	composeCell = null;
	composeAnchorLabel = '';
	composeSubmitHandler = null;
}

function renderComposeForm() {
	if (!composeCell) return;

	render(
		h(ReviewLineCommentForm, {
			anchorLabel: composeAnchorLabel,
			loading: isLineSubmitting.value,
			onSubmit: (body: string) => composeSubmitHandler?.(body),
			onCancel: clearComposeRow,
		}),
		composeCell,
	);
}

watch(isLineSubmitting, () => {
	renderComposeForm();
});

function clearMountedThreads() {
	for (const cleanup of mountedThreadCleanups) cleanup();
	mountedThreadCleanups.length = 0;
	containerRef.value
		?.querySelectorAll('tr[data-review-comment-row]')
		.forEach((row) => row.remove());
}

function clearLineHooks() {
	for (const cleanup of lineHookCleanups) cleanup();
	lineHookCleanups.length = 0;
}

function mountThreadAfterRow(row: HTMLTableRowElement, thread: (typeof threads.value)[number]) {
	const commentRow = document.createElement('tr');
	commentRow.dataset.reviewCommentRow = String(thread.root.id);
	const cell = document.createElement('td');
	cell.colSpan = 3;
	cell.className = 'review-comment-cell';
	commentRow.appendChild(cell);
	row.insertAdjacentElement('afterend', commentRow);

	render(
		h(ReviewCommentThread, {
			prNumber: props.prNumber,
			threadRoot: thread.root,
			replies: thread.replies,
			canReply: props.canComment,
			canDelete: props.canComment,
			onReplied: (comment: SourceControlReviewComment) => emit('submitted', comment),
			onDeleted: (deletedCommentIds: number[]) => emit('deleted', deletedCommentIds),
		}),
		cell,
	);

	mountedThreadCleanups.push(() => {
		render(null, cell);
		commentRow.remove();
	});
}

async function submitLineComment(
	body: string,
	jsonPath: string | undefined,
	side: 'LEFT' | 'RIGHT',
) {
	if (isLineSubmitting.value) return;
	if (!jsonPath?.trim()) {
		toast.showError(
			new Error(i18n.baseText('sourceControl.reviews.comments.linePathError')),
			i18n.baseText('sourceControl.reviews.comments.posted.error'),
		);
		return;
	}

	isLineSubmitting.value = true;
	try {
		const comment = await sourceControlStore.createReviewComment(props.prNumber, {
			body,
			path: props.filePath,
			side,
			anchor: {
				nodeId: props.node.id,
				jsonPath,
			},
		});
		clearComposeRow();
		emit('submitted', comment);
		toast.showMessage({
			title: i18n.baseText('sourceControl.reviews.comments.posted.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.comments.posted.error'));
	} finally {
		isLineSubmitting.value = false;
	}
}

function openLineComposer(afterRow: HTMLTableRowElement, anchor: LineAnchor) {
	if (openComposeAnchor && anchorsMatch(openComposeAnchor, anchor)) {
		clearComposeRow();
		return;
	}

	clearComposeRow();
	openComposeAnchor = anchor;

	const jsonPath = inferJsonPathAtLine(anchor.content, anchor.lineNumber);
	const anchorLabel = jsonPath?.replace(/^parameters\./, '') ?? `Line ${anchor.lineNumber}`;

	const composeRow = document.createElement('tr');
	composeRow.dataset.reviewComposeRow = 'true';
	const cell = document.createElement('td');
	cell.colSpan = 3;
	cell.className = 'review-comment-cell';
	composeRow.appendChild(cell);
	afterRow.insertAdjacentElement('afterend', composeRow);

	composeCell = cell;
	composeAnchorLabel = anchorLabel;
	composeSubmitHandler = (body: string) => void submitLineComment(body, jsonPath, anchor.side);
	renderComposeForm();

	composeRowCleanup = () => {
		render(null, cell);
		composeRow.remove();
	};
}

function setupLineCommentHooks(tbody: HTMLTableSectionElement) {
	for (const row of tbody.querySelectorAll('tr')) {
		if (row.dataset.reviewCommentRow || row.dataset.reviewComposeRow) continue;

		const anchor = getLineAnchor(row as HTMLTableRowElement);
		if (!anchor) continue;

		const codeCell = row.querySelector('td.blob-code');
		if (!(codeCell instanceof HTMLTableCellElement)) continue;

		row.classList.add('review-diff-line');
		codeCell.classList.add('review-code-cell');

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'review-line-comment-button';
		button.title = i18n.baseText('sourceControl.reviews.comments.addLineComment');
		button.setAttribute(
			'aria-label',
			i18n.baseText('sourceControl.reviews.comments.addLineComment'),
		);
		button.dataset.testId = 'review-line-comment-button';
		button.textContent = '+';
		Object.assign(button.style, {
			position: 'absolute',
			left: '2px',
			top: '50%',
			transform: 'translateY(-50%)',
			zIndex: '1',
		});
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			openLineComposer(row as HTMLTableRowElement, anchor);
		});
		codeCell.appendChild(button);

		lineHookCleanups.push(() => {
			button.remove();
			row.classList.remove('review-diff-line');
			codeCell.classList.remove('review-code-cell');
		});
	}
}

async function setupDiffInteractions() {
	await nextTick();
	clearMountedThreads();
	clearLineHooks();
	clearComposeRow();

	if (props.outputFormat !== 'line-by-line') return;

	const tbody = getDiffTbody();
	if (!tbody) return;

	for (const thread of inlineThreads.value) {
		if (!thread.displayLine) continue;
		const side = thread.root.side ?? 'RIGHT';
		const row = findDiffRowForLine(tbody, thread.displayLine, side);
		if (!row) continue;
		mountThreadAfterRow(row, thread);
	}

	if (props.canComment) {
		setupLineCommentHooks(tbody);
	}
}

watch(
	() =>
		[
			props.oldString,
			props.newString,
			props.outputFormat,
			inlineThreads.value,
			props.canComment,
		] as const,
	() => {
		void setupDiffInteractions();
	},
	{ deep: true, flush: 'post' },
);

watch(
	() => props.node.id,
	() => {
		commentBody.value = '';
		clearComposeRow();
	},
);

onBeforeUnmount(() => {
	clearMountedThreads();
	clearLineHooks();
	clearComposeRow();
});

onMounted(() => {
	void setupDiffInteractions();
});

const submitComment = async () => {
	if (!commentBody.value.trim() || isSubmitting.value) return;

	isSubmitting.value = true;
	try {
		const comment = await sourceControlStore.createReviewComment(props.prNumber, {
			body: commentBody.value.trim(),
			path: props.filePath,
			anchor: {
				nodeId: props.node.id,
			},
		});
		commentBody.value = '';
		emit('submitted', comment);
		toast.showMessage({
			title: i18n.baseText('sourceControl.reviews.comments.posted.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.comments.posted.error'));
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<div ref="containerRef" :class="$style.container" data-test-id="review-node-diff">
		<div :class="$style.diff">
			<NodeDiff :old-string="oldString" :new-string="newString" :output-format="outputFormat" />
		</div>

		<div
			v-if="outputFormat !== 'line-by-line' && inlineThreads.length > 0"
			:class="$style.sideBySideThreads"
		>
			<div v-for="thread in inlineThreads" :key="thread.root.id" :class="$style.sideBySideThread">
				<N8nText size="small" color="text-light" :class="$style.threadAnchor">
					<span v-if="thread.displayLine">
						{{
							i18n.baseText('sourceControl.reviews.comments.lineRef', {
								interpolate: { line: thread.displayLine },
							})
						}}
						·
					</span>
					{{ thread.root.anchor?.jsonPath?.replace(/^parameters\./, '') }}
				</N8nText>
				<ReviewCommentThread
					:pr-number="prNumber"
					:thread-root="thread.root"
					:replies="thread.replies"
					:can-reply="canComment"
					:can-delete="canComment"
					@replied="emit('submitted', $event)"
					@deleted="emit('deleted', $event)"
				/>
			</div>
		</div>

		<div v-if="nodeLevelThreads.length > 0" :class="$style.nodeThreads">
			<N8nText size="small" bold color="text-dark">
				{{ i18n.baseText('sourceControl.reviews.comments.nodeTitle') }}
			</N8nText>
			<ReviewCommentThread
				v-for="thread in nodeLevelThreads"
				:key="thread.root.id"
				:pr-number="prNumber"
				:thread-root="thread.root"
				:replies="thread.replies"
				:can-reply="canComment"
				:can-delete="canComment"
				@replied="emit('submitted', $event)"
				@deleted="emit('deleted', $event)"
			/>
		</div>

		<div v-if="canComment" :class="$style.compose">
			<N8nFormInput
				id="reviewCommentBody"
				v-model="commentBody"
				type="textarea"
				name="reviewCommentBody"
				:label="''"
				:placeholder="i18n.baseText('sourceControl.reviews.comments.body.placeholder')"
				label-size="small"
				data-test-id="review-comment-body"
			/>

			<N8nButton
				type="tertiary"
				size="small"
				:loading="isSubmitting"
				:disabled="!commentBody.trim() || isSubmitting"
				data-test-id="review-comment-submit"
				@click="submitComment"
			>
				{{ i18n.baseText('sourceControl.reviews.comments.submit') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	min-height: 0;

	:global(.review-comment-cell) {
		padding: 0;
		background: var(--color--background--light-3);
	}
}

.diff {
	flex: 1;
	min-height: 0;
	overflow: auto;
	padding-left: var(--spacing--lg);
	position: relative;

	:global(.review-code-cell) {
		overflow: visible;
	}

	:global(.review-line-comment-button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		padding: 0;
		margin: 0;
		border: var(--border-width) solid var(--color--foreground);
		border-radius: var(--radius);
		background: var(--color--background--light-3);
		color: var(--color--text);
		font-size: 14px;
		line-height: 1;
		cursor: pointer;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.1s ease-in,
			visibility 0.1s ease-in;

		&:hover {
			background: var(--color--primary);
			color: var(--color--text--tint-3);
			border-color: var(--color--primary);
		}
	}

	:global(tr.review-diff-line:hover .review-line-comment-button),
	:global(tr.review-diff-line .review-line-comment-button:focus-visible) {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
	}
}

.sideBySideThreads {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-top: var(--border-width) solid var(--color--foreground);
	background: var(--color--background--light-3);
	flex-shrink: 0;
}

.sideBySideThread {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.threadAnchor {
	font-family: var(--font-family--monospace);
}

.compose {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border-width) solid var(--color--foreground--tint-1);
	background: var(--color--background--light-2);
	flex-shrink: 0;
}

.nodeThreads {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border-top: var(--border-width) solid var(--color--foreground);
	background: var(--color--background--light-3);
	flex-shrink: 0;
}
</style>
