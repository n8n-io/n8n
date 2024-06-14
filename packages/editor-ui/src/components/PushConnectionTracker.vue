<template>
	<span>
		<div v-if="!rootStore.pushConnectionActive" class="push-connection-lost primary-color">
			<n8n-tooltip placement="bottom-end">
				<template #content>
					<div v-html="locale.baseText('pushConnectionTracker.cannotConnectToServer')"></div>
				</template>
				<span>
					<n8n-icon icon="exclamation-triangle" />&nbsp;
					{{ locale.baseText('pushConnectionTracker.connectionLost') }}
				</span>
			</n8n-tooltip>
		</div>
		<slot v-else />
	</span>
</template>

<script lang="ts" setup>
import { useRootStore } from '@/stores/n8nRoot.store';
import { useI18n } from '@/composables/useI18n';

const rootStore = useRootStore();
const locale = useI18n();
</script>
