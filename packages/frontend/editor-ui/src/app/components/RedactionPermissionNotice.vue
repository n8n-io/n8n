<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

const emit = defineEmits<{
	'view-users': [];
}>();

const i18n = useI18n();
</script>

<template>
	<span
		>{{ i18n.baseText('workflowSettings.redactionPermissionNotice') }}
		<span :class="$style['permission-notice-link']" @click="emit('view-users')">{{
			i18n.baseText('workflowSettings.redactionPermissionNotice.viewUsers')
		}}</span></span
	>
</template>

<style lang="scss" module>
.permission-notice-link {
	color: var(--color-foreground-xlight);
	text-decoration: underline;
	cursor: pointer;
}
</style>
