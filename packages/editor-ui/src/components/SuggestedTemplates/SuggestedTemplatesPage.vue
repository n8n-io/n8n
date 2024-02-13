<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import { useUsersStore } from '@/stores/users.store';
import { useUIStore } from '@/stores/ui.store';
import { VIEWS } from '@/constants';
import type { ITemplatesCollection, IUser } from '@/Interface';
import SuggestedTemplatesSection from '@/components/SuggestedTemplates/SuggestedTemplatesSection.vue';

const usersStore = useUsersStore();
const uiStore = useUIStore();
const router = useRouter();

const currentUser = computed(() => usersStore.currentUser);

const upperCaseFirstName = (user: IUser | null) => {
	if (!user?.firstName) return;
	return user.firstName?.charAt(0)?.toUpperCase() + user?.firstName?.slice(1);
};

const defaultSection = computed(() => {
	if (!uiStore.suggestedTemplates) {
		return null;
	}
	return uiStore.suggestedTemplates.sections[0];
});

const suggestedTemplates = computed(() => {
	const carouselCollections = Array<ITemplatesCollection>();
	if (!uiStore.suggestedTemplates || !defaultSection.value) {
		return carouselCollections;
	}
	defaultSection.value.workflows.forEach((workflow, index) => {
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

defineExpose({
	currentUser,
	openCanvas,
	suggestedTemplates,
});
</script>

<template>
	<div :class="$style.container" data-test-id="suggested-templates-page-container">
		<div :class="$style.header">
			<n8n-heading tag="h1" size="2xlarge" class="mb-2xs">
				{{
					$locale.baseText('suggestedTemplates.heading', {
						interpolate: {
							name: upperCaseFirstName(currentUser) || $locale.baseText('generic.welcome'),
						},
					})
				}}
			</n8n-heading>
			<n8n-text
				size="large"
				color="text-base"
				data-test-id="suggested-template-section-description"
			>
				{{ defaultSection?.description }}
			</n8n-text>
		</div>
		<div :class="$style.content">
			<SuggestedTemplatesSection
				v-for="section in uiStore.suggestedTemplates?.sections"
				:key="section.title"
				:section="section"
				:show-title="false"
			/>
		</div>
		<div>
			<n8n-button
				:label="$locale.baseText('suggestedTemplates.newWorkflowButton')"
				type="secondary"
				size="medium"
				icon="plus"
				data-test-id="suggested-templates-new-workflow-button"
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
