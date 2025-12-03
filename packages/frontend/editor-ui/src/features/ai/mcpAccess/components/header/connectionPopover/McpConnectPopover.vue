<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';
import { N8nButton, N8nPopoverReka } from '@n8n/design-system';

const i18n = useI18n();

const popoverOpen = ref(false);

const handlePopoverOpenChange = (isOpen: boolean) => {
	popoverOpen.value = isOpen;
};
</script>

<template>
	<div>
		<N8nPopoverReka
			:id="'mcp-connect-popover'"
			:open="popoverOpen"
			:popper-options="{ strategy: 'fixed' }"
			:show-arrow="false"
			@update:open="handlePopoverOpenChange"
		>
			<template #trigger>
				<N8nButton data-test-id="mcp-connect-popover-trigger-button" type="tertiary">
					{{ i18n.baseText('generic.connect') }}
				</N8nButton>
			</template>
			<template #content>Hey</template>
		</N8nPopoverReka>
	</div>
</template>
