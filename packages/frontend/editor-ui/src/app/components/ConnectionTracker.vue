<script setup lang="ts">
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import type { BaseTextKey } from '@n8n/i18n';

import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';

const pushConnectionStore = usePushConnectionStore();
const backendConnectionStore = useBackendConnectionStore();
const i18n = useI18n();

type ConnectionStatus =
	| {
			hasError: true;
			message: BaseTextKey;
			tooltip: BaseTextKey;
	  }
	| {
			hasError: false;
			message: null;
			tooltip: null;
	  };

const connectionStatus = computed<ConnectionStatus>(() => {
	// Priority 1: Check if backend is unreachable
	if (!backendConnectionStore.isOnline) {
		return {
			hasError: true,
			message: 'network.error.message',
			tooltip: 'network.error.tooltip',
		};
	}

	// Priority 2: Check if push connection is lost
	// Only show the connection lost error if the connection has been requested
	// and the connection is not currently connected. This is to prevent the
	// connection error from being shown e.g. when user navigates directly to
	// the workflow executions list, which doesn't open the connection.
	if (pushConnectionStore.isConnectionRequested && !pushConnectionStore.isConnected) {
		return {
			hasError: true,
			message: 'pushConnection.error.message',
			tooltip: 'pushConnection.error.tooltip',
		};
	}

	return {
		hasError: false,
		message: null,
		tooltip: null,
	};
});
</script>

<template>
	<span>
		<div v-if="connectionStatus.hasError" class="connection-lost">
			<N8nTooltip placement="bottom-end">
				<template #content>
					<div v-n8n-html="i18n.baseText(connectionStatus.tooltip)"></div>
				</template>
				<span class="connection-lost-content">
					<N8nIcon icon="triangle-alert" color="warning" />
					<N8nText size="small">{{ i18n.baseText(connectionStatus.message) }}</N8nText>
				</span>
			</N8nTooltip>
		</div>
		<slot v-else />
	</span>
</template>

<style scoped>
.connection-lost {
	display: flex;
	align-items: center;
}

.connection-lost-content {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
