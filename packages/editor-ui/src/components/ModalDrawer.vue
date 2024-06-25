<template>
	<ElDrawer
		:direction="direction"
		:model-value="uiStore.isModalOpen(name)"
		:size="width"
		:before-close="close"
		:modal="modal"
		:wrapper-closable="wrapperClosable"
	>
		<template #header>
			<slot name="header" />
		</template>
		<span @keydown.stop>
			<slot name="content" />
		</span>
	</ElDrawer>
</template>

<script lang="ts">
import { useUIStore } from '@/stores/ui.store';
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system';
import { ElDrawer } from 'element-plus';

export default defineComponent({
	name: 'ModalDrawer',
	components: {
		ElDrawer,
	},
	props: {
		name: {
			type: String,
			required: true,
		},
		beforeClose: {
			type: Function,
		},
		eventBus: {
			type: Object as PropType<EventBus>,
		},
		direction: {
			type: String as PropType<'ltr' | 'rtl' | 'ttb' | 'btt'>,
			required: true,
		},
		modal: {
			type: Boolean,
			default: true,
		},
		width: {
			type: String,
		},
		wrapperClosable: {
			type: Boolean,
			default: true,
		},
	},
	mounted() {
		window.addEventListener('keydown', this.onWindowKeydown);
		this.eventBus?.on('close', this.close);

		const activeElement = document.activeElement as HTMLElement;
		if (activeElement) {
			activeElement.blur();
		}
	},
	beforeUnmount() {
		this.eventBus?.off('close', this.close);
		window.removeEventListener('keydown', this.onWindowKeydown);
	},
	computed: {
		...mapStores(useUIStore),
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
		async close() {
			if (this.beforeClose) {
				const shouldClose = await this.beforeClose();
				if (shouldClose === false) {
					// must be strictly false to stop modal from closing
					return;
				}
			}
			this.uiStore.closeModal(this.name);
		},
	},
});
</script>

<style lang="scss">
.el-drawer__header {
	margin: 0;
	padding: 30px 30px 0 30px;
}

.el-drawer__body {
	overflow: hidden;
}
</style>
