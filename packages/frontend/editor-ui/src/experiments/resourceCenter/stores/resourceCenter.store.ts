import { RESOURCE_CENTER_EXPERIMENT, VIEWS } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePostHog } from '@/app/stores/posthog.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client/api/templates';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useResourceCenterStore = defineStore('resourceCenter', () => {
	const posthogStore = usePostHog();
	const templatesStore = useTemplatesStore();
	const telemetry = useTelemetry();

	const isLoadingTemplates = ref(false);

	const isFeatureEnabled = () => {
		return (
			posthogStore.getVariant(RESOURCE_CENTER_EXPERIMENT.name) ===
			RESOURCE_CENTER_EXPERIMENT.variant
		);
	};

	async function fetchTemplateById(templateId: number): Promise<ITemplatesWorkflowFull | null> {
		try {
			return await templatesStore.fetchTemplateById(templateId.toString());
		} catch (error) {
			console.error(`Failed to fetch template ${templateId}:`, error);
			return null;
		}
	}

	async function loadTemplates(templateIds: number[]): Promise<ITemplatesWorkflowFull[]> {
		isLoadingTemplates.value = true;
		try {
			const promises = templateIds.map(async (id) => await fetchTemplateById(id));
			const results = await Promise.allSettled(promises);
			return results
				.filter(
					(result): result is PromiseFulfilledResult<ITemplatesWorkflowFull> =>
						result.status === 'fulfilled' && result.value !== null,
				)
				.map((result) => result.value);
		} finally {
			isLoadingTemplates.value = false;
		}
	}

	function getTemplateRoute(id: number) {
		return { name: VIEWS.TEMPLATE, params: { id } } as const;
	}

	// Telemetry tracking
	function trackTemplateClick(templateId: number) {
		telemetry.track('User clicked resource center template', {
			templateId,
			source: 'resource_center',
		});
	}

	function trackVideoClick(videoId: string, videoTitle: string) {
		telemetry.track('User clicked resource center video', {
			videoId,
			videoTitle,
			source: 'resource_center',
		});
	}

	function trackQuickStartImport(templateId: number, workflowName: string) {
		telemetry.track('User clicked resource center quick start', {
			templateId,
			workflowName,
			source: 'resource_center',
		});
	}

	function trackCourseClick(courseId: string, courseTitle: string) {
		telemetry.track('User clicked resource center course', {
			courseId,
			courseTitle,
			source: 'resource_center',
		});
	}

	function trackSectionSeeMore(sectionKey: string) {
		telemetry.track('User clicked resource center see more', {
			section: sectionKey,
			source: 'resource_center',
		});
	}

	function trackResourceCenterView() {
		telemetry.track('User viewed resource center', {
			source: 'resource_center',
		});
	}

	// Track experiment participation
	const trackExperimentParticipation = () => {
		const variant = posthogStore.getVariant(RESOURCE_CENTER_EXPERIMENT.name);
		if (variant) {
			telemetry.track('User is part of experiment', {
				name: RESOURCE_CENTER_EXPERIMENT.name,
				variant,
			});
		}
	};

	let hasTrackedExperiment = false;
	watch(
		() => isFeatureEnabled(),
		(enabled) => {
			if (enabled && !hasTrackedExperiment) {
				hasTrackedExperiment = true;
				trackExperimentParticipation();
			}
		},
		{ immediate: true },
	);

	return {
		isFeatureEnabled,
		isLoadingTemplates,
		fetchTemplateById,
		loadTemplates,
		getTemplateRoute,
		trackTemplateClick,
		trackVideoClick,
		trackQuickStartImport,
		trackCourseClick,
		trackSectionSeeMore,
		trackResourceCenterView,
	};
});
