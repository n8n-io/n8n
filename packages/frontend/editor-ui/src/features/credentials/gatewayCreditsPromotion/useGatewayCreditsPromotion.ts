import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { GatewayCreditsPromotion } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

const isActive = (promotion: GatewayCreditsPromotion | null | undefined, now: number) =>
	!!promotion?.text?.trim() &&
	(!promotion.startsAt || now >= Date.parse(promotion.startsAt)) &&
	(!promotion.endsAt || now < Date.parse(promotion.endsAt));

/**
 * Gateway credits promotion of a community node, looked up by node type or,
 * when there is no node type, by credential type.
 */
export function useGatewayCreditsPromotion({
	nodeType,
	credentialType,
}: {
	nodeType?: MaybeRefOrGetter<string | undefined>;
	credentialType?: MaybeRefOrGetter<string | undefined>;
}) {
	const nodeTypesStore = useNodeTypesStore();
	const settingsStore = useSettingsStore();
	const aiGatewayStore = useAiGatewayStore();
	const isEnabled = computed(() => settingsStore.isAiGatewayEnabled);

	if (isEnabled.value) void aiGatewayStore.fetchConfig();

	// The credential modal can open before a workflow loads the community node catalog.
	if (
		isEnabled.value &&
		credentialType !== undefined &&
		nodeTypesStore.vettedCommunityNodeTypes.size === 0
	) {
		void nodeTypesStore.fetchCommunityNodePreviews();
	}

	const communityNode = computed(() => {
		const nodeTypeName = toValue(nodeType);
		if (nodeTypeName) return nodeTypesStore.communityNodeType(nodeTypeName);

		const credentialTypeName = toValue(credentialType);
		if (!credentialTypeName || !aiGatewayStore.isCredentialTypeSupported(credentialTypeName)) {
			return undefined;
		}
		// Strapi serves node descriptions without `credentials`, so read them from the installed node type.
		return [...nodeTypesStore.vettedCommunityNodeTypes.values()].find(
			({ name, gatewayCreditsPromotion }) =>
				isActive(gatewayCreditsPromotion, Date.now()) &&
				nodeTypesStore
					.getNodeType(name)
					?.credentials?.some(({ name: credential }) => credential === credentialTypeName),
		);
	});

	const promotionText = computed(() => {
		const node = communityNode.value;
		if (
			!isEnabled.value ||
			!node ||
			!isActive(node.gatewayCreditsPromotion, Date.now()) ||
			!aiGatewayStore.isNodeSupported(node.name)
		) {
			return undefined;
		}
		return node.gatewayCreditsPromotion?.text;
	});

	return { promotionText };
}
