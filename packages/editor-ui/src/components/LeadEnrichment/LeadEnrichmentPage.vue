<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import { useUsersStore } from '@/stores/users.store';
import { useUIStore } from '@/stores/ui.store';
import { VIEWS } from '@/constants';
import type { ITemplatesCollection } from '@/Interface';
import LeadEnrichmentSection from '@/components/LeadEnrichment/LeadEnrichmentSection.vue';

const usersStore = useUsersStore();
const uiStore = useUIStore();
const router = useRouter();

const currentUser = computed(() => usersStore.currentUser);

const leadEnrichmentTemplates = computed(() => {
	const carouselCollections = Array<ITemplatesCollection>();
	if (!uiStore.leadEnrichmentTemplates) {
		return carouselCollections;
	}
	const leadEnrichmentSection = uiStore.leadEnrichmentTemplates.sections[0];
	leadEnrichmentSection.workflows.forEach((workflow, index) => {
		carouselCollections.push({
			id: index,
			name: workflow.title,
			workflows: [{ id: index }],
			nodes: workflow.nodes,
		});
	});
	return carouselCollections;
});

function openCanvas() {
	uiStore.nodeViewInitialized = false;
	void router.push({ name: VIEWS.NEW_WORKFLOW });
}

function onOpenCollection(collectionName: string) {
	console.log('onOpenCollection', collectionName);
}

defineExpose({
	currentUser,
	openCanvas,
	leadEnrichmentTemplates,
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading tag="h1" size="2xlarge" class="mb-2xs">
				{{
					$locale.baseText('leadEnrichment.heading', {
						interpolate: { name: currentUser?.firstName || $locale.baseText('generic.welcome') },
					})
				}}
			</n8n-heading>
			<n8n-text size="large" color="text-base">
				{{ $locale.baseText('leadEnrichment.subheading') }}
			</n8n-text>
		</div>
		<div :class="$style.content">
			<lead-enrichment-section
				v-for="section in uiStore.leadEnrichmentTemplates?.sections"
				:key="section.title"
				:section="section"
				:showTitle="false"
				@openCollection="onOpenCollection"
			/>
		</div>
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
