<template>
	<span>
		<div class="push-connection-lost primary-color" v-if="!rootStore.pushConnectionActive">
			<n8n-tooltip placement="bottom-end">
				<template #content>
					<div v-html="$locale.baseText('pushConnectionTracker.cannotConnectToServer')"></div>
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

<script lang="ts">
import { useRootStore } from '@/stores/n8nRoot.store';
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'PushConnectionTracker',
	computed: {
		...mapStores(useRootStore),
	},
});
</script>
