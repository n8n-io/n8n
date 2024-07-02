<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { computed, useCssModule } from 'vue';

const emit = defineEmits<{
	delete: [];
}>();

const $style = useCssModule();

const i18n = useI18n();

const classes = computed(() => ({
	[$style.canvasEdgeToolbar]: true,
}));

function onDelete() {
	emit('delete');
}
</script>

<template>
	<div :class="classes" data-test-id="canvas-edge-toolbar">
		<N8nIconButton
			data-test-id="delete-connection-button"
			type="tertiary"
			size="small"
			icon="trash"
			:title="i18n.baseText('node.delete')"
			@click="onDelete"
		/>
	</div>
</template>

<style lang="scss" module>
.canvasEdgeToolbar {
	display: flex;
	justify-content: center;
	align-items: center;
	pointer-events: all;
}
</style>
