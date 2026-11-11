import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { AiGatewayPromotion, GatewayCreditsPromotion } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { stripToolSuffix, useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

// The config is cached for up to an hour, so the client checks the dates itself.
const isActive = (promotion: GatewayCreditsPromotion | null | undefined, now: number) =>
	!!promotion?.text?.trim() &&
	(!promotion.startsAt || now >= Date.parse(promotion.startsAt)) &&
	(!promotion.endsAt || now < Date.parse(promotion.endsAt));

/**
 * Gateway credits promotion of a node. A promotion in the Gateway config takes
 * precedence over the community node's Strapi record.
 *
 * The credential modal passes both types: the node that opened it, if any, and
 * the credential. Without a matching node, only a community node's Strapi
 * promotion can match by credential type.
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

	const nodeUsesCredential = (nodeTypeName: string, credentialTypeName: string) =>
		!!nodeTypesStore
			.getNodeType(nodeTypeName)
			?.credentials?.some(({ name }) => name === credentialTypeName);

	const gatewayPromotionForNode = (
		nodeTypeName: string,
		now: number,
	): AiGatewayPromotion | undefined =>
		aiGatewayStore.config?.promotions?.find(
			({ nodes, ...promotion }) =>
				isActive(promotion, now) &&
				(nodes.includes(nodeTypeName) || nodes.includes(stripToolSuffix(nodeTypeName))),
		);

	const communityPromotionForNode = (nodeTypeName: string, now: number) => {
		const promotion = nodeTypesStore.communityNodeType(nodeTypeName)?.gatewayCreditsPromotion;
		return isActive(promotion, now) ? promotion : undefined;
	};

	const communityPromotionForCredential = (credentialTypeName: string, now: number) => {
		if (!aiGatewayStore.isCredentialTypeSupported(credentialTypeName)) return undefined;
		// Strapi serves node descriptions without `credentials`, so read them from the installed node type.
		const node = [...nodeTypesStore.vettedCommunityNodeTypes.values()].find(
			({ name, gatewayCreditsPromotion }) =>
				isActive(gatewayCreditsPromotion, now) &&
				aiGatewayStore.isNodeSupported(name) &&
				nodeUsesCredential(name, credentialTypeName),
		);
		return node?.gatewayCreditsPromotion;
	};

	const promotionForNode = (nodeTypeName: string, now: number) => {
		if (!aiGatewayStore.isNodeSupported(nodeTypeName)) return undefined;
		return (
			gatewayPromotionForNode(nodeTypeName, now) ?? communityPromotionForNode(nodeTypeName, now)
		);
	};

	const promotionText = computed(() => {
		if (!isEnabled.value) return undefined;
		const now = Date.now();
		const nodeTypeName = toValue(nodeType);
		const credentialTypeName = toValue(credentialType);

		// The credential modal follows the node that opened it, when that node uses the credential.
		if (
			nodeTypeName &&
			(!credentialTypeName || nodeUsesCredential(nodeTypeName, credentialTypeName))
		) {
			return promotionForNode(nodeTypeName, now)?.text;
		}
		return credentialTypeName
			? communityPromotionForCredential(credentialTypeName, now)?.text
			: undefined;
	});

	return { promotionText };
}
