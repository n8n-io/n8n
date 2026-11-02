<script setup lang="ts">
import type { AttachmentEmits, AttachmentProps } from './Attachment.types';

defineProps<AttachmentProps>();
defineEmits<AttachmentEmits>();
</script>

<template>
	<div>
		<slot>{{ fileName }}</slot>
	</div>
</template>
