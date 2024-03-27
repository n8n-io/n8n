<script setup lang="ts">
import { type PropType, computed } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { useTelemetry } from '@/composables/useTelemetry';
import type { ITemplatesCollection, ITemplatesNode, SuggestedTemplatesSection } from '@/Interface';
import TemplatesInfoCarousel from '@/components/TemplatesInfoCarousel.vue';
import { SUGGESTED_TEMPLATES_PREVIEW_MODAL_KEY } from '@/constants';

const uiStore = useUIStore();
const telemetry = useTelemetry();

const props = defineProps({
	section: {
		type: Object as PropType<SuggestedTemplatesSection>,
		required: true,
	},
	title: {
		type: String as PropType<string>,
		required: false,
	},
	showTitle: {
		type: Boolean as PropType<boolean>,
		default: true,
	},
});

const sectionTemplates = computed(() => {
	const carouselCollections = Array<ITemplatesCollection>();
	if (!uiStore.suggestedTemplates) {
		return carouselCollections;
	}
	props.section.workflows.forEach((workflow, index) => {
		carouselCollections.push({
			id: index,
			name: workflow.title,
			workflows: [{ id: index }],
			nodes: workflow.nodes as ITemplatesNode[],
		});
	});
	return carouselCollections;
});

function onOpenCollection({ id }: { event: Event; id: number }) {
	uiStore.openModalWithData({
		name: SUGGESTED_TEMPLATES_PREVIEW_MODAL_KEY,
		data: { workflow: props.section.workflows[id] },
	});
	telemetry.track(
		'User clicked template recommendation',
		{ templateName: props.section.workflows[id].title },
		{ withPostHog: true },
	);
}
</script>

<template>
	<div :class="$style.container" data-test-id="suggested-templates-section-container">
		<div v-if="showTitle" :class="$style.header">
			<n8n-text size="large" color="text-base" :bold="true">
				{{ props.title ?? section.title }}
			</n8n-text>
		</div>
		<div :class="$style.content">
			<TemplatesInfoCarousel
				:collections="sectionTemplates"
				:loading="false"
				:show-item-count="false"
				:show-navigation="false"
				cards-width="24%"
				@open-collection="onOpenCollection"
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
</style>
