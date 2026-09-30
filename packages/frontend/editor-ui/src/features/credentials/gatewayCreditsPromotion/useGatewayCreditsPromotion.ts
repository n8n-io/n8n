import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { GatewayCreditsPromotion } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

type PromotionTarget = { nodeType: string } | { credentialType: string };

const isActive = (promotion: GatewayCreditsPromotion | null | undefined, now: number) =>
	!!promotion?.text?.trim() &&
	(!promotion.startsAt || now >= Date.parse(promotion.startsAt)) &&
	(!promotion.endsAt || now < Date.parse(promotion.endsAt));

/** Returns the Gateway credits promotion text of a community node, or undefined when it does not apply. */
export function useGatewayCreditsPromotion(target: MaybeRefOrGetter<PromotionTarget | undefined>) {
	const nodeTypesStore = useNodeTypesStore();
	const settingsStore = useSettingsStore();
	const aiGatewayStore = useAiGatewayStore();
	const isEnabled = computed(() => settingsStore.isAiGatewayEnabled);

	if (isEnabled.value) void aiGatewayStore.fetchConfig();

	const initialTarget = toValue(target);
	// The credential modal can open before a workflow loads the community node catalog.
	if (
		isEnabled.value &&
		initialTarget &&
		'credentialType' in initialTarget &&
		nodeTypesStore.vettedCommunityNodeTypes.size === 0
	) {
		void nodeTypesStore.fetchCommunityNodePreviews();
	}

	const communityNode = computed(() => {
		const value = toValue(target);
		if (!value) return undefined;
		if ('nodeType' in value) return nodeTypesStore.communityNodeType(value.nodeType);
		if (!aiGatewayStore.isCredentialTypeSupported(value.credentialType)) return undefined;
		// Strapi serves node descriptions without `credentials`, so read them from the installed node type.
		return [...nodeTypesStore.vettedCommunityNodeTypes.values()].find(
			({ name, gatewayCreditsPromotion }) =>
				isActive(gatewayCreditsPromotion, Date.now()) &&
				nodeTypesStore
					.getNodeType(name)
					?.credentials?.some(({ name: credential }) => credential === value.credentialType),
		);
	});

	return computed(() => {
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
}
