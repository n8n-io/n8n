<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useRootStore } from '@/stores/root.store';

export default defineComponent({
	name: 'PushConnectionTracker',
	computed: {
		...mapStores(useRootStore),
	},
});
</script>

<template>
	<span>
		<div v-if="!rootStore.pushConnectionActive" class="push-connection-lost primary-color">
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
