import { computed, unref, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { formatTimestamp } from '../utils';

type PublishInfo = {
	publishedBy: string | null;
	publishedAt: string;
};

export const usePublishedByDetails = (publishInfo: Ref<PublishInfo | undefined>) => {
	const i18n = useI18n();

	return computed(() => {
		const info = unref(publishInfo);
		if (!info) {
			return '';
		}

		const { date, time } = formatTimestamp(info.publishedAt);
		const publishedAt = i18n.baseText('workflowHistory.item.createdAt', {
			interpolate: { date, time },
		});
		const publishedByLabel = i18n.baseText('workflowHistory.item.publishedBy');
		const publishedBy = info.publishedBy ?? 'Unknown';

		return `${publishedByLabel} ${publishedBy}, ${publishedAt}`;
	});
};
