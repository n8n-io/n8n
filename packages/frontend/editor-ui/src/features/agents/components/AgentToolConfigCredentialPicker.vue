<script setup lang="ts">
import { ref } from 'vue';

import ToolCredentialPicker from '@/features/shared/toolsConnection/ToolCredentialPicker.vue';
import type {
	McpServerConnectionItem,
	ToolConnectionCredentialAdapter,
} from '@/features/shared/toolsConnection/types';

defineProps<{
	item: McpServerConnectionItem;
	adapter: ToolConnectionCredentialAdapter | null;
}>();

const emit = defineEmits<{
	'select-credential': [authType: string, credentialId: string];
}>();

const picker = ref<InstanceType<typeof ToolCredentialPicker> | null>(null);

function open() {
	picker.value?.open();
}

defineExpose({ open });
</script>

<template>
	<ToolCredentialPicker
		ref="picker"
		:item="item"
		:credentials="item.credentials ?? []"
		:adapter="adapter"
		@select-credential="
			(_item, authType, credentialId) => emit('select-credential', authType, credentialId)
		"
	/>
</template>
