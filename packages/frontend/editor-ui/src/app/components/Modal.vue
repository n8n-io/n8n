<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import { useUIStore } from '@/app/stores/ui.store';
import type { ModalKey } from '@/Interface';

import {
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nHeading,
	N8nSpinner,
} from '@n8n/design-system';
const props = withDefaults(
	defineProps<{
		name: ModalKey;
		title?: string;
		subtitle?: string;
		eventBus?: EventBus;
		showClose?: boolean;
		loading?: boolean;
		classic?: boolean;
		// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
		beforeClose?: () => boolean | Promise<boolean | void> | void;
		customClass?: string;
		center?: boolean;
		width?: string;
		minWidth?: string;
		maxWidth?: string;
		height?: string;
		minHeight?: string;
		maxHeight?: string;
		scrollable?: boolean;
		centerTitle?: boolean;
		closeOnClickModal?: boolean;
		closeOnPressEscape?: boolean;
		appendToBody?: boolean;
		lockScroll?: boolean;
		modal?: boolean;
	}>(),
	{
		title: '',
		subtitle: '',
		showClose: true,
		loading: false,
		classic: false,
		customClass: '',
		center: true,
		width: '50%',
		scrollable: false,
		centerTitle: false,
		closeOnClickModal: true,
		closeOnPressEscape: true,
		appendToBody: false,
		lockScroll: true,
		modal: true,
	},
);

const emit = defineEmits<{ enter: [] }>();

const styles = computed(() => {
	const modalStyles: { [prop: string]: string } = {};
	if (props.width) {
		modalStyles['--dialog--width'] = props.width;
		modalStyles['--dialog--max-width'] = props.width;
	}
	if (props.height) {
		modalStyles['--dialog--height'] = props.height;
	}
	if (props.minHeight) {
		modalStyles['--dialog--min-height'] = props.minHeight;
	}
	if (props.maxHeight) {
		modalStyles['--dialog--max-height'] = props.maxHeight;
	}
	if (props.maxWidth) {
		modalStyles['--dialog--max-width'] = props.maxWidth;
	}
	if (props.minWidth) {
		modalStyles['--dialog--min-width'] = props.minWidth;
	}
	return modalStyles;
});

onMounted(() => {
	window.addEventListener('keydown', onWindowKeydown);
	props.eventBus?.on('close', closeDialog);
	const activeElement = document.activeElement as HTMLElement;
	if (activeElement && uiStore.modalsById[props.name]?.open) {
		activeElement.blur();
	}
});

onBeforeUnmount(() => {
	props.eventBus?.off('close', closeDialog);
	window.removeEventListener('keydown', onWindowKeydown);
});

const uiStore = useUIStore();

function handleEnter() {
	if (!uiStore.isModalActiveById[props.name]) return;
	emit('enter');
}

function onOpened() {
	props.eventBus?.emit('opened');
}

function onWindowKeydown(event: KeyboardEvent) {
	if (event?.key === 'Enter') handleEnter();
}

async function closeDialog(returnData?: unknown) {
	if (props.beforeClose) {
		const shouldClose = await props.beforeClose();
		if (shouldClose === false) {
			return;
		}
	}
	uiStore.closeModal(props.name);
	props.eventBus?.emit('closed', returnData);
}

async function onCloseDialog() {
	await closeDialog();
}

function getCustomClass() {
	let classes = props.customClass || '';

	if (props.classic) {
		classes = `${classes} classic`;
	}

	return classes;
}

async function onUpdateOpen(isOpen: boolean) {
	if (isOpen) {
		onOpened();
		return;
	}

	await onCloseDialog();
}

function onEscapeKeyDown(event: KeyboardEvent) {
	if (!props.closeOnPressEscape) {
		event.preventDefault();
	}
}

function onInteractOutside(event: Event) {
	if (!props.closeOnClickModal) {
		event.preventDefault();
	}
}
</script>

<template>
	<N8nDialog
		:open="uiStore.modalsById[name]?.open"
		:modal="modal"
		:disable-outside-pointer-events="closeOnClickModal"
		:show-close-button="showClose"
		:content-test-id="`${name}-modal`"
		:content-class="{
			'dialog-wrapper': true,
			scrollable: scrollable,
			centered: center,
			[getCustomClass()]: true,
		}"
		:content-style="styles"
		:aria-label="$slots.header || title ? undefined : name"
		:aria-description="subtitle"
		@update:open="onUpdateOpen"
		@escape-key-down="onEscapeKeyDown"
		@interact-outside="onInteractOutside"
	>
		<template v-if="$slots.header">
			<slot v-if="!loading" name="header" v-bind="{ closeDialog }" />
		</template>
		<N8nDialogHeader v-else-if="title">
			<div :class="centerTitle ? $style.centerTitle : ''">
				<div v-if="title">
					<N8nDialogTitle>
						<N8nHeading tag="h1" size="xlarge">{{ title }}</N8nHeading>
					</N8nDialogTitle>
				</div>
				<N8nDialogDescription v-if="subtitle" :class="$style.subtitle">
					<N8nHeading tag="h3" size="small" color="text-light">{{ subtitle }}</N8nHeading>
				</N8nDialogDescription>
			</div>
		</N8nDialogHeader>
		<div
			class="modal-content"
			@keydown.stop
			@keydown.enter="handleEnter"
			@keydown.esc="onCloseDialog"
		>
			<slot v-if="!loading" name="content" />
			<div v-else :class="$style.loader">
				<N8nSpinner />
			</div>
		</div>
		<N8nDialogFooter v-if="!loading && $slots.footer" :class="$style.footer">
			<slot name="footer" :close="closeDialog" />
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss">
.dialog-wrapper {
	max-width: var(--dialog--max-width, 80%);
	min-width: var(--dialog--min-width, 420px);
	width: var(--dialog--width);
	height: var(--dialog--height);
	min-height: var(--dialog--min-height);
	max-height: var(--dialog--max-height);
	display: flex;
	flex-direction: column;

	.modal-content {
		overflow: hidden;
		overflow-y: auto;
		flex-grow: 1;
		padding-inline: var(--spacing--4xs);
		margin-inline: calc(var(--spacing--4xs) * -1);
	}

	&.scrollable .modal-content {
		overflow-y: auto;
	}

	&.centered {
		margin-inline: auto;
	}
}
</style>

<style lang="scss" module>
.loader {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color--primary--tint-1);
	font-size: 30px;
	height: 80%;
}

.centerTitle {
	text-align: center;
}

.subtitle {
	margin-top: var(--spacing--2xs);
}

.footer {
	margin-top: var(--spacing--lg);
	width: 100%;

	/** If in it's own container, makes sure the footer takes all the available space and pushes the content to the top if needed */
	> div:only-child {
		flex: 1;
	}
}
</style>
