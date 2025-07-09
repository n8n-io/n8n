import type { INodeTypeDescription } from 'n8n-workflow';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { isCommunityPackageName } from '../utils/nodeTypesUtils';
import { BUILTIN_NODES_DOCS_URL, NPM_PACKAGE_DOCS_BASE_URL } from '../constants';

export const useNodeDocsUrl = ({
	nodeType: nodeTypeRef,
}: { nodeType: MaybeRefOrGetter<INodeTypeDescription | null | undefined> }) => {
	const packageName = computed(() => toValue(nodeTypeRef)?.name.split('.')[0] ?? '');

	const isCommunityNode = computed(() => {
		const nodeType = toValue(nodeTypeRef);
		if (nodeType) {
			return isCommunityPackageName(nodeType.name);
		}
		return false;
	});

	const docsUrl = computed(() => {
		const nodeType = toValue(nodeTypeRef);
		if (!nodeType) {
			return '';
		}

		if (nodeType.documentationUrl?.startsWith('http')) {
			return nodeType.documentationUrl;
		}

		const utmParams = new URLSearchParams({
			utm_source: 'n8n_app',
			utm_medium: 'node_settings_modal-credential_link',
			utm_campaign: nodeType.name,
		});

		// Built-in node documentation available via its codex entry
		const primaryDocUrl = nodeType.codex?.resources?.primaryDocumentation?.[0]?.url;
		if (primaryDocUrl) {
			return `${primaryDocUrl}?${utmParams.toString()}`;
		}

		if (isCommunityNode.value) {
			return `${NPM_PACKAGE_DOCS_BASE_URL}${packageName.value}`;
		}

		// Fallback to the root of the node documentation
		return `${BUILTIN_NODES_DOCS_URL}?${utmParams.toString()}`;
	});

	return { docsUrl };
};
