<script lang="ts" setup>
/* eslint-disable vue/no-v-html */
import { useI18n } from '@/composables/useI18n';
import { sanitizeHtml } from '@/utils/htmlUtils';

import { computed } from 'vue';

const i18n = useI18n();

const props = defineProps<{
	nodeName: string;
	errorMessage?: string;
}>();

const sanitizedErrorMessage = computed(() => {
	return props.errorMessage ? sanitizeHtml(props.errorMessage) : '';
});
</script>

<template>
	<div>
		<span v-html="sanitizedErrorMessage"></span>
		<br />
		<a data-action="openNodeDetail" :data-action-parameter-node="nodeName">{{
			i18n.baseText('node.executionError.openNode')
		}}</a>
	</div>
</template>
