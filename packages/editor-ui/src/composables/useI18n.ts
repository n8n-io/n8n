import { i18n } from '@/plugins/i18n';
import { useRootStore } from '@/stores/n8nRootStore';

export function useI18n() {
	const isEnglishLocale = useRootStore().defaultLocale === 'en';

	function localizeNodeName(nodeName: string, type: string) {
		if (isEnglishLocale) return nodeName;

		const nodeTypeName = i18n.shortNodeType(type);

		return i18n.headerText({
			key: `headers.${nodeTypeName}.displayName`,
			fallback: nodeName,
		});
	}

	return { i18n, localizeNodeName };
}
