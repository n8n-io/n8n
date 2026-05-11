<script setup lang="ts">
import { N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	locked: boolean;
}>();

const emit = defineEmits<{
	'view-users': [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nTooltip :disabled="!locked" :enterable="true" placement="top">
		<template #content>
			<span
				>{{ i18n.baseText('workflowSettings.redactionPermissionNotice') }}
				<span :class="$style['permission-notice-link']" @click="emit('view-users')">{{
					i18n.baseText('workflowSettings.redactionPermissionNotice.viewUsers')
				}}</span></span
			>
		</template>
		<slot />
	</N8nTooltip>
</template>

<style lang="scss" module>
.permission-notice-link {
	color: var(--color-foreground-xlight);
	text-decoration: underline;
	cursor: pointer;
}
</style>
