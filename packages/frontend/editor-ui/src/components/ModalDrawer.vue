<script setup lang="ts">
import { useUIStore } from '@/stores/ui.store';
import { onBeforeUnmount, onMounted } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import { ElDrawer } from 'element-plus';

const props = withDefaults(
	defineProps<{
		name: string;
		beforeClose?: Function;
		eventBus?: EventBus;
		direction: 'ltr' | 'rtl' | 'ttb' | 'btt';
		modal?: boolean;
		width: string;
		wrapperClosable?: boolean;
		closeOnClickModal?: boolean;
		zIndex?: number;
	}>(),
	{
		modal: true,
		wrapperClosable: true,
		closeOnClickModal: false,
	},
);

const emit = defineEmits<{
	enter: [];
}>();

const uiStore = useUIStore();

const handleEnter = () => {
	if (uiStore.isModalActiveById[props.name]) {
		emit('enter');
	}
};

const onWindowKeydown = (event: KeyboardEvent) => {
	if (!uiStore.isModalActiveById[props.name]) {
		return;
	}

	if (event && event.keyCode === 13) {
		handleEnter();
	}
};

const close = async () => {
	if (props.beforeClose) {
		const shouldClose = await props.beforeClose();
		if (shouldClose === false) {
			// must be strictly false to stop modal from closing
			return;
		}
	}
	uiStore.closeModal(props.name);
};

onMounted(() => {
	window.addEventListener('keydown', onWindowKeydown);
	props.eventBus?.on('close', close);

	const activeElement = document.activeElement as HTMLElement;
	if (activeElement) {
		activeElement.blur();
	}
});

onBeforeUnmount(() => {
	props.eventBus?.off('close', close);
	window.removeEventListener('keydown', onWindowKeydown);
});
</script>

<template>
	<ElDrawer
		:direction="direction"
		:model-value="uiStore.modalsById[name].open"
		:size="width"
		:before-close="close"
		:modal="modal"
		:wrapper-closable="wrapperClosable"
		:close-on-click-modal="closeOnClickModal"
		:z-index="zIndex"
	>
		<template #header>
			<slot name="header" />
		</template>
		<span @keydown.stop>
			<slot name="content" />
		</span>
	</ElDrawer>
</template>

<style lang="scss">
.el-drawer__header {
	margin: 0;
	padding: 30px 30px 0 30px;
}

.el-drawer__body {
	overflow: hidden;
}
</style>
