import { EXTRA_TEMPLATE_LINKS_EXPERIMENT } from '@/constants';
import { usePostHog } from '@/stores/posthog.store';

export const isExtraTemplateLinksExperimentEnabled = () => {
	return (
		usePostHog().getVariant(EXTRA_TEMPLATE_LINKS_EXPERIMENT.name) ===
		EXTRA_TEMPLATE_LINKS_EXPERIMENT.variant
	);
};
