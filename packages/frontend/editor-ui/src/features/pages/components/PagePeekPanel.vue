<script setup lang="ts">
import { PageEditor, usePageTourStart, type PageSaveStatus } from '@n8n/frontend-module-page';
import { N8nButton, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { APP_Z_INDEXES } from '@n8n/frontend-constants/z-indexes';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref, useTemplateRef } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';

import { useFocusEntry } from '../composables/useFocusEntry';
import { usePageOpening } from '../composables/usePageOpening';
import UpdatePageWithAiButton from './UpdatePageWithAiButton.vue';

/**
 * Shows a page in a panel on the right of the window and edits it in place.
 * The view under the panel stays in use. A dialog under the panel stays open,
 * because the panel keeps its pointer and focus events away from the document. Emits `close` when the user closes the panel
 * or opens the page in full.
 */
const props = defineProps<{
	pageId: string;
}>();

const emit = defineEmits<{
	close: [];
}>();

const SAVE_STATUS_LABELS: Partial<Record<PageSaveStatus, BaseTextKey>> = {
	unsaved: 'page.editor.saveStatus.saving',
	saving: 'page.editor.saveStatus.saving',
	saved: 'page.editor.saveStatus.saved',
	error: 'page.editor.saveStatus.error',
};

/** The panel opens from modals, so it sits one layer above them. Menus and toasts stay above it. */
const PANEL_Z_INDEX = APP_Z_INDEXES.MODALS + 1;

const i18n = useI18n();
const uiStore = useUIStore();
const { href, openInThisTabAndWait } = usePageOpening(() => props.pageId);
const { canStartTour, startTour } = usePageTourStart(() => props.pageId);

useFocusEntry(useTemplateRef<HTMLElement>('panel'));

const isNotFound = ref(false);
const saveStatus = ref<PageSaveStatus>('idle');

const saveStatusLabel = computed(() => {
	const key = SAVE_STATUS_LABELS[saveStatus.value];
	return key ? i18n.baseText(key) : '';
});

function closeOpenModals(): void {
	Object.entries(uiStore.modalsById)
		.filter(([, modal]) => modal?.open === true)
		.forEach(([name]) => uiStore.closeModal(name));
}

/** Leaves the view clear for the assistant, which opens in its place. */
function closeForAssistant(): void {
	closeOpenModals();
	emit('close');
}

/**
 * Opens the page view, then closes the modals, because they would cover it.
 * The modals close last, so that a route change of a closing modal cannot replace the page view.
 */
async function openFullPage(event: MouseEvent): Promise<void> {
	if (await openInThisTabAndWait(event)) {
		closeOpenModals();
		emit('close');
	}
}

/** Starts the tour on the canvas, then closes the modals, because they would cover it. */
async function startTourOnCanvas(): Promise<void> {
	await startTour();
	closeOpenModals();
}
</script>

<template>
	<aside
		ref="panel"
		:class="[$style.panel, 'ignore-key-press-canvas']"
		:style="{ zIndex: PANEL_Z_INDEX }"
		:aria-label="i18n.baseText('page.peek.label')"
		data-test-id="page-peek"
		@keydown.esc.stop="emit('close')"
		@keydown.stop
		@pointerdown.stop
		@focusin.stop
	>
		<header :class="$style.header">
			<N8nText size="small" :bold="true" :class="$style.label">
				{{ i18n.baseText('page.peek.label') }}
			</N8nText>
			<N8nText
				size="xsmall"
				color="text-light"
				:class="$style.saveStatus"
				aria-live="polite"
				data-test-id="page-peek-save-status"
			>
				{{ saveStatusLabel }}
			</N8nText>
			<UpdatePageWithAiButton :page-id="pageId" @started="closeForAssistant" />
			<N8nButton
				v-if="canStartTour"
				variant="ghost"
				size="small"
				icon="play"
				:label="i18n.baseText('page.tour.start')"
				data-test-id="page-peek-start-tour"
				@click="startTourOnCanvas"
			/>
			<N8nButton
				variant="ghost"
				size="small"
				icon="maximize-2"
				:href="href"
				:label="i18n.baseText('page.peek.openFull')"
				data-test-id="page-peek-open-full"
				@click="openFullPage"
			/>
			<N8nTooltip placement="bottom" :content="i18n.baseText('page.peek.close')">
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="x"
					:aria-label="i18n.baseText('page.peek.close')"
					data-test-id="page-peek-close"
					@click="emit('close')"
				/>
			</N8nTooltip>
		</header>
		<div :class="$style.body" data-test-id="page-peek-body">
			<N8nText v-if="isNotFound" size="small" color="text-light" data-test-id="page-peek-not-found">
				{{ i18n.baseText('page.sticky.notFound') }}
			</N8nText>
			<PageEditor
				v-else
				:page-id="pageId"
				@not-found="isNotFound = true"
				@save-status="saveStatus = $event"
			/>
		</div>
	</aside>
</template>

<style lang="scss" module>
.panel {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	width: min(100vw, calc(var(--spacing--5xl) * 2));
	border-left: var(--border);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--md);
	color: var(--text-color);
	// An open dialog turns off the pointer events of the body.
	pointer-events: auto;
}

.header {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--2xs) var(--spacing--md);
	border-bottom: var(--border);
}

.label {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.saveStatus {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	flex: 1;
	min-height: 0;
	padding: var(--spacing--md) var(--spacing--lg) var(--spacing--xl);
	overflow-y: auto;
	scrollbar-width: thin;
}
</style>
