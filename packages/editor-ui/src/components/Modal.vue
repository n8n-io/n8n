<template>
	<el-dialog
		:visible="uiStore.isModalOpen(this.name)"
		:before-close="closeDialog"
		:class="{ 'dialog-wrapper': true, [$style.center]: center, scrollable: scrollable }"
		:width="width"
		:show-close="showClose"
		:custom-class="getCustomClass()"
		:close-on-click-modal="closeOnClickModal"
		:close-on-press-escape="closeOnPressEscape"
		:style="styles"
		append-to-body
		:data-test-id="`${this.name}-modal`"
	>
		<template #title v-if="$scopedSlots.header">
			<slot name="header" v-if="!loading" />
		</template>
		<template #title v-else-if="title">
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
			@keydown.esc="closeDialog"
		>
			<slot v-if="!loading" name="content" />
			<div :class="$style.loader" v-else>
				<n8n-spinner />
			</div>
		</div>
		<div v-if="!loading && $scopedSlots.footer" :class="$style.footer">
			<slot name="footer" :close="closeDialog" />
		</div>
	</el-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { mapStores } from 'pinia';
import type { EventBus } from '@/event-bus';

export default defineComponent({
	name: 'Modal',
	props: {
		name: {
			type: String,
		},
		title: {
			type: String,
		},
		subtitle: {
			type: String,
		},
		eventBus: {
			type: Object as PropType<EventBus>,
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
		},
		customClass: {
			type: String,
		},
		center: {
			type: Boolean,
		},
		width: {
			type: String,
			default: '50%',
		},
		minWidth: {
			type: String,
		},
		maxWidth: {
			type: String,
		},
		height: {
			type: String,
		},
		minHeight: {
			type: String,
		},
		maxHeight: {
			type: String,
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
	},
	mounted() {
		window.addEventListener('keydown', this.onWindowKeydown);

		this.eventBus?.on('close', this.closeDialog);
		this.eventBus?.on('closeAll', this.uiStore.closeAllModals);

		const activeElement = document.activeElement as HTMLElement;
		if (activeElement) {
			activeElement.blur();
		}
	},
	beforeDestroy() {
		this.eventBus?.off('close', this.closeDialog);
		this.eventBus?.off('closeAll', this.uiStore.closeAllModals);
		window.removeEventListener('keydown', this.onWindowKeydown);
	},
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
	},
	methods: {
		onWindowKeydown(event: KeyboardEvent) {
			if (!this.uiStore.isModalActive(this.name)) {
				return;
			}

			if (event && event.keyCode === 13) {
				this.handleEnter();
			}
		},
		handleEnter() {
			if (this.uiStore.isModalActive(this.name)) {
				this.$emit('enter');
			}
		},
		async closeDialog() {
			if (this.beforeClose) {
				const shouldClose = await this.beforeClose();
				if (shouldClose === false) {
					// must be strictly false to stop modal from closing
					return;
				}
			}
			this.uiStore.closeModal(this.name);
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

<style lang="scss">
.dialog-wrapper {
	.el-dialog {
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
		flex-grow: 1;
	}

	&.scrollable .modal-content {
		overflow-y: auto;
	}
}
</style>

<style lang="scss" module>
.center {
	display: flex;
	align-items: center;
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
