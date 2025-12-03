<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';
import { N8nButton, N8nPopoverReka, N8nRadioButtons } from '@n8n/design-system';

const i18n = useI18n();

const popoverOpen = ref(false);

const TABS = {
	ACCESS_TOKEN: 'accessToken',
	OAUTH: 'oauth',
};

const tabItems = ref([
	{ value: TABS.OAUTH, label: i18n.baseText('settings.mcp.connectPopover.tab.oauth') },
	{ value: TABS.ACCESS_TOKEN, label: i18n.baseText('settings.mcp.connectPopover.tab.accessToken') },
]);

const activeTab = ref(tabItems.value[0].value);

const handlePopoverOpenChange = (isOpen: boolean) => {
	popoverOpen.value = isOpen;
};

const handleTabChange = (newTab: string) => {
	activeTab.value = newTab;
};
</script>

<template>
	<div>
		<N8nPopoverReka
			:id="'mcp-connect-popover'"
			:open="popoverOpen"
			:popper-options="{ strategy: 'fixed' }"
			:content-class="$style.popper"
			:show-arrow="false"
			width="350px"
			@update:open="handlePopoverOpenChange"
		>
			<template #trigger>
				<N8nButton data-test-id="mcp-connect-popover-trigger-button" type="tertiary">
					{{ i18n.baseText('generic.connect') }}
				</N8nButton>
			</template>
			<template #content>
				<div :class="$style['popper-content']" data-test-id="mcp-connect-popover-content">
					<N8nRadioButtons
						:model-value="activeTab"
						:options="tabItems"
						@update:model-value="handleTabChange"
					/>
				</div>
			</template>
		</N8nPopoverReka>
	</div>
</template>

<style lang="scss" module>
.popper {
	margin-right: var(--spacing--sm);
}

.popper-content {
	padding: var(--spacing--md);
}
</style>
