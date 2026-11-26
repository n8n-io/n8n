<script setup lang="ts">
import { N8nHtmlPreview } from '@n8n/design-system';
import type { RunDataDisplayModeProps } from '@n8n/frontend-module-sdk';

const props = defineProps<RunDataDisplayModeProps>();
</script>

<template>
	<N8nHtmlPreview :html="String(props.data[0]?.json?.html ?? '')" />
</template>
