<script setup lang="ts">
import { computed } from 'vue';
import { useRootStore } from '@/stores/root.store';
import { useI18n } from '@/composables/useI18n';

const rootStore = useRootStore();
const pushConnectionActive = computed(() => rootStore.pushConnectionActive);
const i18n = useI18n();
</script>

<template>
	<span>
		<div v-if="!pushConnectionActive" class="push-connection-lost primary-color">
			<n8n-tooltip placement="bottom-end">
				<template #content>
					<div v-n8n-html="i18n.baseText('pushConnectionTracker.cannotConnectToServer')"></div>
				</template>
				<span>
					<font-awesome-icon icon="exclamation-triangle" />&nbsp;
					{{ i18n.baseText('pushConnectionTracker.connectionLost') }}
				</span>
			</n8n-tooltip>
		</div>
		<slot v-else />
	</span>
</template>
