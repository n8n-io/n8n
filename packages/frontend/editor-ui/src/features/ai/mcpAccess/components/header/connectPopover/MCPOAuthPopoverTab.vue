<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import ConnectionParameter from '@/features/ai/mcpAccess/components/header/connectPopover/ConnectionParameter.vue';

type Props = {
	serverUrl: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	copy: [value: string];
}>();

const i18n = useI18n();

const handleServerUrlCopy = (value: string) => {
	emit('copy', value);
};
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-oauth-popover-tab">
		<ConnectionParameter
			id="oauth-server-url"
			:label="i18n.baseText('settings.mcp.connectPopover.serverUrl')"
			:value="props.serverUrl"
			@copy="handleServerUrlCopy"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
}
</style>
