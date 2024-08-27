<script lang="ts">
import { ElDialog } from 'element-plus';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import type { EventBus } from 'n8n-design-system';
import { useUIStore } from '@/stores/ui.store';
import type { ModalKey } from '@/Interface';
import { APP_MODALS_ELEMENT_ID } from '@/constants';

export default defineComponent({
	name: 'Modal',
	props: {
		...ElDialog.props,
		name: {
			type: String as PropType<ModalKey>,
			required: true,
		},
		title: {
			type: String,
			default: '',
		},
		subtitle: {
			type: String,
			default: '',
		},
		eventBus: {
			type: Object as PropType<EventBus>,
			default: null,
		},
		showClose: {
			type: Boolean,
			default: true,
		},
		loading: {
			type: Boolean,
		},
		classic: {
			type: Boolean,
		},
		beforeClose: {
			type: Function,
			default: null,
		},
		customClass: {
			type: String,
			default: '',
		},
		center: {
			type: Boolean,
			default: true,
		},
		width: {
			type: String,
			default: '50%',
		},
		minWidth: {
			type: [String, null] as PropType<string | null>,
			default: null,
		},
		maxWidth: {
			type: [String, null] as PropType<string | null>,
			default: null,
		},
		height: {
			type: [String, null] as PropType<string | null>,
			default: null,
		},
		minHeight: {
			type: [String, null] as PropType<string | null>,
			default: null,
		},
		maxHeight: {
			type: [String, null] as PropType<string | null>,
			default: null,
		},
		scrollable: {
			type: Boolean,
			default: false,
		},
		centerTitle: {
			type: Boolean,
			default: false,
		},
		closeOnClickModal: {
			type: Boolean,
			default: true,
		},
		closeOnPressEscape: {
			type: Boolean,
			default: true,
		},
		appendToBody: {
			type: Boolean,
			default: false,
		},
	},
	emits: { enter: null },
	computed: {
		...mapStores(useUIStore),
		styles() {
			const styles: { [prop: string]: string } = {};
			if (this.height) {
				styles['--dialog-height'] = this.height;
			}
			if (this.minHeight) {
				styles['--dialog-min-height'] = this.minHeight;
			}
			if (this.maxHeight) {
				styles['--dialog-max-height'] = this.maxHeight;
			}
			if (this.maxWidth) {
				styles['--dialog-max-width'] = this.maxWidth;
			}
			if (this.minWidth) {
				styles['--dialog-min-width'] = this.minWidth;
			}
			return styles;
		},
		appModalsId() {
			return `#${APP_MODALS_ELEMENT_ID}`;
		},
	},
	mounted() {
		window.addEventListener('keydown', this.onWindowKeydown);

		this.eventBus?.on('close', this.closeDialog);

		const activeElement = document.activeElement as HTMLElement;
		if (activeElement) {
			activeElement.blur();
		}
	},
	beforeUnmount() {
		this.eventBus?.off('close', this.closeDialog);
		window.removeEventListener('keydown', this.onWindowKeydown);
	},
	methods: {
		onWindowKeydown(event: KeyboardEvent) {
			if (!this.uiStore.isModalActiveById[this.name]) {
				return;
			}

			if (event && event.keyCode === 13) {
				this.handleEnter();
			}
		},
		handleEnter() {
			if (this.uiStore.isModalActiveById[this.name]) {
				this.$emit('enter');
			}
		},
		async onCloseDialog() {
			await this.closeDialog();
		},
		async closeDialog(returnData?: unknown) {
			if (this.beforeClose) {
				const shouldClose = await this.beforeClose();
				if (shouldClose === false) {
					// must be strictly false to stop modal from closing
					return;
				}
			}
			this.uiStore.closeModal(this.name);
			this.eventBus?.emit('closed', returnData);
		},
		getCustomClass() {
			let classes = this.customClass || '';

			if (this.classic) {
				classes = `${classes} classic`;
			}

			return classes;
		},
	},
});
</script>

<template>
	<el-dialog
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
		:append-to-body="appendToBody"
		:data-test-id="`${name}-modal`"
		:modal-class="center ? $style.center : ''"
		z-index="2000"
	>
		<template v-if="$slots.header" #header>
			<slot v-if="!loading" name="header" />
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
	</el-dialog>
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
