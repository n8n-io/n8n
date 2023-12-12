<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import { useUsersStore } from '@/stores/users.store';
import { useUIStore } from '@/stores/ui.store';
import { VIEWS } from '@/constants';

const usersStore = useUsersStore();
const uiStore = useUIStore();
const router = useRouter();

const currentUser = computed(() => usersStore.currentUser);

function openCanvas() {
	uiStore.nodeViewInitialized = false;
	void router.push({ name: VIEWS.NEW_WORKFLOW });
}

defineExpose({
	currentUser,
	openCanvas,
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading tag="h1" size="2xlarge" class="mb-2xs">
				{{
					$locale.baseText('leadEnrichment.heading', {
						interpolate: { name: currentUser.firstName || $locale.baseText('generic.welcome') },
					})
				}}
			</n8n-heading>
			<n8n-text size="large" color="text-base">
				{{ $locale.baseText('leadEnrichment.subheading') }}
			</n8n-text>
		</div>
		<div :class="$style.content">Here be content</div>
		<div>
			<n8n-button
				:label="$locale.baseText('leadEnrichment.newWorkflowButton')"
				type="secondary"
				size="medium"
				icon="plus"
				@click="openCanvas"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-l);
}

.header {
	margin-bottom: var(--spacing-l);
}
</style>
