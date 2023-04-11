<template>
	<el-drawer
		:direction="direction"
		:visible="uiStore.isModalOpen(this.name)"
		:size="width"
		:before-close="close"
		:modal="modal"
		:wrapperClosable="wrapperClosable"
	>
		<template #title>
			<slot name="header" />
		</template>
		<template>
			<span @keydown.stop>
				<slot name="content" />
			</span>
		</template>
	</el-drawer>
</template>

<script lang="ts">
import { useUIStore } from '@/stores/ui';
import { mapStores } from 'pinia';
import Vue, { PropType } from 'vue';
import { EventBus } from '@/event-bus';

export default Vue.extend({
	name: 'ModalDrawer',
	props: {
		name: {
			type: String,
		},
		beforeClose: {
			type: Function,
		},
		eventBus: {
			type: Object as PropType<EventBus>,
		},
		direction: {
			type: String,
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

		if (this.eventBus) {
			this.eventBus.on('close', () => {
				this.close();
			});
		}

		const activeElement = document.activeElement as HTMLElement;
		if (activeElement) {
			activeElement.blur();
		}
	},
	beforeDestroy() {
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
