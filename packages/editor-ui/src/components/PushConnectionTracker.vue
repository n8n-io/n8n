<script setup lang="ts">
import { computed } from 'vue';
import { useRootStore } from '@/stores/root.store';

defineOptions({ name: 'PushConnectionTracker' });

const rootStore = useRootStore();
const pushConnectionActive = computed(() => rootStore.pushConnectionActive);
</script>

<template>
	<span>
		<div v-if="!pushConnectionActive" class="push-connection-lost primary-color">
			<n8n-tooltip placement="bottom-end">
				<template #content>
					<div v-n8n-html="$locale.baseText('pushConnectionTracker.cannotConnectToServer')"></div>
				</template>
				<span>
					<font-awesome-icon icon="exclamation-triangle" />&nbsp;
					{{ $locale.baseText('pushConnectionTracker.connectionLost') }}
				</span>
			</n8n-tooltip>
		</div>
		<slot v-else />
	</span>
</template>
