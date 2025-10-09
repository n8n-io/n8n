<script setup lang="ts">
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { N8nIcon, N8nTooltip } from '@n8n/design-system';
const pushConnectionStore = usePushConnectionStore();
const i18n = useI18n();

const showConnectionLostError = computed(() => {
	// Only show the connection lost error if the connection has been requested
	// and the connection is not currently connected. This is to prevent the
	// connection error from being shown e.g. when user navigates directly to
	// the workflow executions list, which doesn't open the connection.
	return pushConnectionStore.isConnectionRequested && !pushConnectionStore.isConnected;
});
</script>

<template>
	<span>
		<div v-if="showConnectionLostError" class="push-connection-lost primary-color">
			<N8nTooltip placement="bottom-end">
				<template #content>
					<div v-n8n-html="i18n.baseText('pushConnectionTracker.cannotConnectToServer')"></div>
				</template>
				<span>
					<N8nIcon icon="triangle-alert" />&nbsp;
					{{ i18n.baseText('pushConnectionTracker.connectionLost') }}
				</span>
			</N8nTooltip>
		</div>
		<slot v-else />
	</span>
</template>
