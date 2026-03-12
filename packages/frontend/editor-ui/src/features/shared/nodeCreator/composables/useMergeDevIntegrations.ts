import type { MergeDevIntegrationDto } from '@n8n/api-types';
import type { SimplifiedNodeType } from '@/Interface';
import { MERGE_DEV_CATEGORY, MERGE_DEV_SUBCATEGORY } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getThemedValue } from '@/app/utils/nodeTypesUtils';
import { useUIStore } from '@/app/stores/ui.store';
import * as pluginsSettingsApi from '@n8n/rest-api-client/api/plugins-settings';
import { ref } from 'vue';

const MERGE_DEV_NODE_TYPE = 'n8n-nodes-base.mergeDev';

/** Maps Merge.dev API category slugs to n8n panel category names */
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
	hris: 'HRIS',
	ats: 'ATS',
	crm: 'CRM',
	accounting: 'Accounting',
	ticketing: 'Ticketing',
	filestorage: 'File Storage',
	mktg: 'Marketing',
	knowledgebase: 'Knowledge Base',
};

const cachedIntegrations = ref<MergeDevIntegrationDto[] | null>(null);
const fetchPromise = ref<Promise<void> | null>(null);

function integrationToVirtualNode(
	integration: MergeDevIntegrationDto,
	badgeIconUrl: string | undefined,
): SimplifiedNodeType {
	const primaryCategory = integration.categories[0] ?? '';
	const categoryLabel = CATEGORY_DISPLAY_NAMES[primaryCategory] ?? primaryCategory;

	return {
		name: `mergeDev:${primaryCategory}:${integration.slug}`,
		displayName: integration.name,
		description: `${categoryLabel} integration via Merge.dev`,
		group: ['output'],
		icon: undefined,
		iconUrl: integration.squareImage,
		iconColor: undefined,
		badgeIconUrl,
		outputs: ['main'],
		defaults: { name: integration.name },
		codex: {
			categories: [MERGE_DEV_CATEGORY],
			subcategories: {
				[MERGE_DEV_CATEGORY]: [MERGE_DEV_SUBCATEGORY],
			},
			alias: [integration.slug, ...integration.categories, 'merge.dev', 'merge dev'],
		},
	};
}

export function useMergeDevIntegrations() {
	async function fetchIntegrations(): Promise<void> {
		if (cachedIntegrations.value !== null) return;
		if (fetchPromise.value) {
			await fetchPromise.value;
			return;
		}

		fetchPromise.value = (async () => {
			try {
				const rootStore = useRootStore();
				const response = await pluginsSettingsApi.getMergeDevIntegrations(rootStore.restApiContext);
				// Only cache non-empty results; if plugin is disabled (empty list),
				// leave cache as null so we retry on next NodeCreator open
				if (response.integrations.length > 0) {
					cachedIntegrations.value = response.integrations;
				}
			} catch {
				// Don't cache failures — retry on next NodeCreator open
			} finally {
				fetchPromise.value = null;
			}
		})();

		await fetchPromise.value;
	}

	function getMergeDevVirtualNodes(): SimplifiedNodeType[] {
		if (!cachedIntegrations.value?.length) return [];

		// Use the real mergeDev node's icon as the badge for virtual nodes
		const realNodeType = useNodeTypesStore().getNodeType(MERGE_DEV_NODE_TYPE);
		const badgeIcon = getThemedValue(realNodeType?.iconUrl, useUIStore().appliedTheme) ?? undefined;

		return cachedIntegrations.value.map((i) => integrationToVirtualNode(i, badgeIcon));
	}

	function isMergeDevVirtualNode(nodeKey: string): boolean {
		return nodeKey.startsWith('mergeDev:');
	}

	function parseMergeDevNodeKey(nodeKey: string): { category: string; slug: string } | null {
		if (!isMergeDevVirtualNode(nodeKey)) return null;
		const parts = nodeKey.split(':');
		return { category: parts[1], slug: parts[2] };
	}

	function clearCache() {
		cachedIntegrations.value = null;
		fetchPromise.value = null;
	}

	return {
		fetchIntegrations,
		getMergeDevVirtualNodes,
		isMergeDevVirtualNode,
		parseMergeDevNodeKey,
		clearCache,
		MERGE_DEV_NODE_TYPE,
	};
}
