<script lang="ts" setup>
import Modal from '@/app/components/Modal.vue';
import BrowserUseSetupContent from './BrowserUseSetupContent.vue';

const props = defineProps<{ modalName: string }>();
</script>

<template>
	<Modal
		:name="props.modalName"
		:show-close="true"
		custom-class="instance-ai-browser-use-setup-modal"
		width="540"
	>
		<template #content>
			<BrowserUseSetupContent />
		</template>
	</Modal>
</template>

<style lang="scss">
.instance-ai-browser-use-setup-modal {
	.el-dialog__header {
		padding: 0;
		margin: 0;
	}
	.el-dialog__body {
		padding: 0;
	}
}
</style>
