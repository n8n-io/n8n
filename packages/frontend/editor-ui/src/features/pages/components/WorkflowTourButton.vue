<script setup lang="ts">
import { PAGE_TOUR_QUERY_PARAMETER } from '@n8n/api-types';
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRoute, useRouter } from 'vue-router';

import { useWorkflowTourPage } from '../composables/useWorkflowTourPage';

/**
 * Starts the tour of the open workflow with the page that presents it best.
 * Renders nothing when no page links to a node of the workflow.
 */
const props = defineProps<{
	workflowId: string;
}>();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const tourPage = useWorkflowTourPage(() => props.workflowId);

/** Asks the canvas of the open workflow to start the tour of the page. */
async function takeTour(pageId: string): Promise<void> {
	await router.push({ query: { ...route.query, [PAGE_TOUR_QUERY_PARAMETER]: pageId } });
}
</script>

<template>
	<N8nTooltip
		v-if="tourPage"
		:content="
			i18n.baseText('page.tour.take.tooltip', { interpolate: { pageTitle: tourPage.title } })
		"
	>
		<N8nButton
			variant="ghost"
			size="small"
			icon="play"
			:label="i18n.baseText('page.tour.take')"
			data-test-id="workflow-take-tour-button"
			@click="takeTour(tourPage.id)"
		/>
	</N8nTooltip>
</template>
