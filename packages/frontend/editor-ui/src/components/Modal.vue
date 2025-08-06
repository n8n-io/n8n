<script setup lang="ts">
import { ElDialog } from 'element-plus';
import { computed, onMounted, onBeforeUnmount } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import { useUIStore } from '@/stores/ui.store';
import type { ModalKey } from '@/Interface';
import { APP_MODALS_ELEMENT_ID } from '@/constants';
import { useStyles } from '@/composables/useStyles';

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
	},
);

const emit = defineEmits<{ enter: [] }>();

const { APP_Z_INDEXES } = useStyles();

const styles = computed(() => {
	const styles: { [prop: string]: string } = {};
	if (props.height) {
		styles['--dialog-height'] = props.height;
	}
	if (props.minHeight) {
		styles['--dialog-min-height'] = props.minHeight;
	}
	if (props.maxHeight) {
		styles['--dialog-max-height'] = props.maxHeight;
	}
	if (props.maxWidth) {
		styles['--dialog-max-width'] = props.maxWidth;
	}
	if (props.minWidth) {
		styles['--dialog-min-width'] = props.minWidth;
	}
	return styles;
});

const appModalsId = `#${APP_MODALS_ELEMENT_ID}`;

onMounted(() => {
	window.addEventListener('keydown', onWindowKeydown);
	props.eventBus?.on('close', closeDialog);
	const activeElement = document.activeElement as HTMLElement;
	if (activeElement) {
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
	// Triggers when the Dialog opening animation ends.
	// This can be helpful at positioning dropdowns etc correctly,
	// as the dialog doesn't now move anymore at this point.
	props.eventBus?.emit('opened');
}

function onWindowKeydown(event: KeyboardEvent) {
	if (event?.keyCode === 13) handleEnter();
}

async function closeDialog(returnData?: unknown) {
	if (props.beforeClose) {
		const shouldClose = await props.beforeClose();
		if (shouldClose === false) {
			// must be strictly false to stop modal from closing
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
</script>

<template>
	<ElDialog
		:model-value="uiStore.modalsById[name].open"
		:before-close="onCloseDialog"
		:class="{
			'dialog-wrapper': true,
			scrollable: scrollable,
			[getCustomClass()]: true,
		}"
		:center="center"
		:width="width"
		:show-close="showClose"
		:close-on-click-modal="closeOnClickModal"
		:close-on-press-escape="closeOnPressEscape"
		:style="styles"
		:append-to="appendToBody ? undefined : appModalsId"
		:lock-scroll="lockScroll"
		:append-to-body="appendToBody"
		:data-test-id="`${name}-modal`"
		:modal-class="center ? $style.center : ''"
		:z-index="APP_Z_INDEXES.MODALS"
		@opened="onOpened"
	>
		<template v-if="$slots.header" #header>
			<slot v-if="!loading" name="header" v-bind="{ closeDialog }" />
		</template>
		<template v-else-if="title" #title>
			<div :class="centerTitle ? $style.centerTitle : ''">
				<div v-if="title">
					<n8n-heading tag="h1" size="xlarge">{{ title }}</n8n-heading>
				</div>
				<div v-if="subtitle" :class="$style.subtitle">
					<n8n-heading tag="h3" size="small" color="text-light">{{ subtitle }}</n8n-heading>
				</div>
			</div>
		</template>
		<div
			class="modal-content"
			@keydown.stop
			@keydown.enter="handleEnter"
			@keydown.esc="onCloseDialog"
		>
			<slot v-if="!loading" name="content" />
			<div v-else :class="$style.loader">
				<n8n-spinner />
			</div>
		</div>
		<div v-if="!loading && $slots.footer" :class="$style.footer">
			<slot name="footer" :close="closeDialog" />
		</div>
	</ElDialog>
</template>

<style lang="scss">
.dialog-wrapper {
	&.el-dialog {
		display: flex;
		flex-direction: column;
		max-width: var(--dialog-max-width, 80%);
		min-width: var(--dialog-min-width, 420px);
		height: var(--dialog-height);
		min-height: var(--dialog-min-height);
		max-height: var(--dialog-max-height);
	}

	.el-dialog__body {
		overflow: hidden;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}

	.modal-content {
		overflow: hidden;
		overflow-y: auto;
		flex-grow: 1;
	}

	&.scrollable .modal-content {
		overflow-y: auto;
	}
}
</style>

<style lang="scss" module>
.center > div {
	justify-content: center;
}

.loader {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-primary-tint-1);
	font-size: 30px;
	height: 80%;
}

.centerTitle {
	text-align: center;
}

.subtitle {
	margin-top: var(--spacing-2xs);
}

.footer {
	margin-top: var(--spacing-l);
}
</style>
