<script setup lang="ts">
import { type PropType, computed } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import type { ITemplatesCollection, LeadEnrichmentTemplateSection } from '@/Interface';
import TemplatesInfoCarousel from '@/components/TemplatesInfoCarousel.vue';

const uiStore = useUIStore();

const props = defineProps({
	section: {
		type: Object as PropType<LeadEnrichmentTemplateSection>,
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

const emit = defineEmits<{
	(event: 'openCollection', value: string): void;
}>();

const sectionTemplates = computed(() => {
	const carouselCollections = Array<ITemplatesCollection>();
	if (!uiStore.leadEnrichmentTemplates) {
		return carouselCollections;
	}
	props.section.workflows.forEach((workflow, index) => {
		carouselCollections.push({
			id: index,
			name: workflow.title,
			workflows: [{ id: index }],
			nodes: workflow.nodes,
		});
	});
	return carouselCollections;
});

function onOpenCollection({ event, id }: { event: Event; id: number }) {
	// TODO: How do we identify workflow here?
	emit('openCollection', props.section.workflows[id].title);
}
</script>

<template>
	<div :class="$style.container">
		<div v-if="showTitle" :class="$style.header">
			<n8n-text size="large" color="text-base" :bold="true">
				{{ props.title ?? section.title }}
			</n8n-text>
		</div>
		<div :class="$style.content">
			<templates-info-carousel
				:collections="sectionTemplates"
				:loading="false"
				:showItemCount="false"
				@openCollection="onOpenCollection"
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
