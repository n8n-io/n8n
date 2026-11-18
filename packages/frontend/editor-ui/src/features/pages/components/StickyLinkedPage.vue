<script setup lang="ts">
import { PageEditor, type PageSaveStatus } from '@n8n/frontend-module-page';
import { N8nButton, N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref, useTemplateRef } from 'vue';

import { usePageOpening } from '../composables/usePageOpening';

/**
 * Shows a page inside a sticky note and edits it in place.
 * The header strip stays a drag handle of the note. The page area keeps the pointer,
 * the wheel and the keyboard away from the canvas.
 */
const props = defineProps<{
	pageId: string;
	readOnly?: boolean;
}>();

const emit = defineEmits<{
	/** The user wants to change or remove the link of the note. */
	editLink: [];
}>();

const SAVE_STATUS_LABELS: Partial<Record<PageSaveStatus, BaseTextKey>> = {
	unsaved: 'page.editor.saveStatus.saving',
	saving: 'page.editor.saveStatus.saving',
	saved: 'page.editor.saveStatus.saved',
	error: 'page.editor.saveStatus.error',
};

const i18n = useI18n();
const { href, openInThisTab } = usePageOpening(() => props.pageId);

const body = useTemplateRef<HTMLElement>('body');
const isNotFound = ref(false);
const saveStatus = ref<PageSaveStatus>('idle');

const saveStatusLabel = computed(() => {
	const key = SAVE_STATUS_LABELS[saveStatus.value];
	return key ? i18n.baseText(key) : '';
});

function isZoomGesture(event: WheelEvent): boolean {
	return event.ctrlKey || event.metaKey;
}

function isScrollable(element: HTMLElement | null): boolean {
	return element !== null && element.scrollHeight > element.clientHeight;
}

/** A page longer than the note scrolls. Any other wheel move goes to the canvas. */
function keepScrollInsidePage(event: WheelEvent): void {
	if (!isZoomGesture(event) && isScrollable(body.value)) {
		event.stopPropagation();
	}
}
</script>

<template>
	<div :class="$style.linkedPage" data-test-id="sticky-linked-page">
		<header :class="$style.header">
			<N8nIcon icon="file-text" size="small" :class="$style.headerIcon" />
			<N8nText size="xsmall" :bold="true" :class="$style.headerLabel">
				{{ i18n.baseText('page.sticky.label') }}
			</N8nText>
			<N8nText
				size="xsmall"
				:class="$style.saveStatus"
				aria-live="polite"
				data-test-id="sticky-linked-page-save-status"
			>
				{{ saveStatusLabel }}
			</N8nText>
			<!-- The note cancels every key that reaches it. The stop keeps Enter and Space working on the buttons. -->
			<div :class="[$style.actions, 'nodrag']" @dblclick.stop @keydown.stop>
				<N8nTooltip
					v-if="!readOnly"
					placement="top"
					:content="i18n.baseText('page.sticky.editLink')"
				>
					<N8nIconButton
						variant="ghost"
						size="xsmall"
						icon="unlink"
						:aria-label="i18n.baseText('page.sticky.editLink')"
						data-test-id="sticky-linked-page-edit-link"
						@click.stop="emit('editLink')"
					/>
				</N8nTooltip>
				<N8nTooltip placement="top" :content="i18n.baseText('page.sticky.open')">
					<N8nIconButton
						variant="ghost"
						size="xsmall"
						icon="external-link"
						:href="href"
						:aria-label="i18n.baseText('page.sticky.open')"
						data-test-id="sticky-linked-page-open"
						@click.stop="openInThisTab"
					/>
				</N8nTooltip>
			</div>
		</header>
		<!-- `ignore-key-press-canvas` also keeps a paste in the page from being read as a workflow import. -->
		<div
			ref="body"
			:class="[$style.body, 'nodrag', 'nopan', 'ignore-key-press-canvas']"
			data-test-id="sticky-linked-page-body"
			@keydown.stop
			@dblclick.stop
			@contextmenu.stop
			@wheel="keepScrollInsidePage"
		>
			<div v-if="isNotFound" :class="$style.notFound" data-test-id="sticky-linked-page-not-found">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('page.sticky.notFound') }}
				</N8nText>
				<N8nButton
					v-if="!readOnly"
					variant="outline"
					size="xsmall"
					icon="unlink"
					:label="i18n.baseText('page.sticky.editLink')"
					data-test-id="sticky-linked-page-not-found-edit-link"
					@click.stop="emit('editLink')"
				/>
			</div>
			<PageEditor
				v-else
				:page-id="pageId"
				:readonly="readOnly"
				@not-found="isNotFound = true"
				@save-status="saveStatus = $event"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.linkedPage {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}

.header {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--3xs);
	min-height: var(--spacing--lg);
	padding: var(--spacing--5xs) var(--spacing--4xs) var(--spacing--5xs) var(--spacing--2xs);
	color: var(--sticky--color--text);
	cursor: grab;
}

.headerIcon {
	flex-shrink: 0;
}

.headerLabel {
	flex-shrink: 0;
	color: inherit;
}

.saveStatus {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	color: inherit;
	opacity: 0.7;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	cursor: default;

	:global(.button) {
		--button--color--text: var(--sticky--color--text);
	}
}

/* The page sits on the surface color, so that the editor reads the same on every note color. */
.body {
	flex: 1;
	min-height: 0;
	margin: 0 var(--spacing--4xs) var(--spacing--4xs);
	padding: var(--spacing--2xs) var(--spacing--4xs);
	overflow-y: auto;
	border-radius: var(--radius--2xs);
	background-color: var(--background--surface);
	color: var(--text-color);
	cursor: auto;
	user-select: text;
	scrollbar-width: thin;

	--input--font-size: var(--font-size--sm);
}

/* The page view sizes the editor for a full screen. A note needs a compact one. */
.linkedPage .body :global([data-test-id='page-editor']) {
	gap: var(--spacing--4xs);
}

.linkedPage .body :global([data-test-id='page-editor-title']) {
	font-size: var(--font-size--lg);
}

.linkedPage .body :global(.n8n-markdown) {
	min-height: var(--spacing--xl);
}

.notFound {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
}
</style>
