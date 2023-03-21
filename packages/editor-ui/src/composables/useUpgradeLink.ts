import { BaseTextKey } from '@/plugins/i18n';
import { useUIStore, useUsageStore } from '@/stores';
import { useI18n } from '@/composables';
import { computed } from 'vue';

export function useUpgradeLink(queryParams = { default: '', desktop: '' }) {
	const uiStore = useUIStore();
	const usageStore = useUsageStore();
	const i18n = useI18n();

	const upgradeLinkUrl = computed(() => {
		const linkUrlTranslationKey = uiStore.contextBasedTranslationKeys.upgradeLinkUrl as BaseTextKey;
		let url = i18n.baseText(linkUrlTranslationKey);

		if (linkUrlTranslationKey.endsWith('.upgradeLinkUrl')) {
			url = `${usageStore.viewPlansUrl}${queryParams.default}`;
		} else if (linkUrlTranslationKey.endsWith('.desktop')) {
			url = `${url}${queryParams.desktop}`;
		}

		return url;
	});

	return { upgradeLinkUrl };
}
