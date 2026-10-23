import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { CommunityNodeType, FrontendSettings, GatewayCreditsPromotion } from '@n8n/api-types';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useGatewayCreditsPromotion } from './useGatewayCreditsPromotion';

const gateway = {
	supportedNodes: [] as string[],
	supportedCredentialTypes: ['typeSafeAiApi'],
};

vi.mock('@/app/stores/aiGateway.store', () => ({
	useAiGatewayStore: () => ({
		fetchConfig: vi.fn().mockResolvedValue(undefined),
		isCredentialTypeSupported: (type: string) => gateway.supportedCredentialTypes.includes(type),
		isNodeSupported: (name: string) => gateway.supportedNodes.includes(name.replace(/Tool$/, '')),
	}),
}));

const setGatewayEnabled = (enabled: boolean) => {
	useSettingsStore().settings = { aiGateway: { enabled } } as FrontendSettings;
};

const NODE_TYPE = '@typesafe-ai/n8n-nodes-typesafe-ai.typeSafeAi';
const TEXT = 'Free until October 10, 2026.';

// Strapi serves node descriptions without `credentials`; only installed node types have them.
const communityNode = (name: string, promotion: GatewayCreditsPromotion) =>
	({
		name,
		nodeDescription: { name },
		gatewayCreditsPromotion: promotion,
	}) as CommunityNodeType;

const setup = (promotion: GatewayCreditsPromotion) => {
	const store = useNodeTypesStore();
	store.vettedCommunityNodeTypes = new Map(
		[NODE_TYPE, `${NODE_TYPE}Tool`].map((name) => [name, communityNode(name, promotion)]),
	);
	Object.assign(store, {
		getNodeType: (name: string) =>
			name === NODE_TYPE
				? ({ name, credentials: [{ name: 'typeSafeAiApi' }] } as INodeTypeDescription)
				: null,
	});
};

describe('useGatewayCreditsPromotion', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		setGatewayEnabled(true);
		gateway.supportedNodes = [NODE_TYPE];
		gateway.supportedCredentialTypes = ['typeSafeAiApi'];
		vi.useFakeTimers({ now: new Date('2026-06-01T00:00:00Z') });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns the text inside the window, by node type and by credential type', () => {
		setup({ text: TEXT, startsAt: '2026-01-01T00:00:00Z', endsAt: '2026-10-10T00:00:00Z' });

		expect(useGatewayCreditsPromotion({ nodeType: NODE_TYPE }).promotionText.value).toBe(TEXT);
		expect(
			useGatewayCreditsPromotion({ credentialType: 'typeSafeAiApi' }).promotionText.value,
		).toBe(TEXT);
	});

	it('returns the text for the Tool variant', () => {
		setup({ text: TEXT });

		expect(useGatewayCreditsPromotion({ nodeType: `${NODE_TYPE}Tool` }).promotionText.value).toBe(
			TEXT,
		);
	});

	it('returns nothing when Gateway credits are disabled', () => {
		setup({ text: TEXT });
		setGatewayEnabled(false);

		expect(useGatewayCreditsPromotion({ nodeType: NODE_TYPE }).promotionText.value).toBeUndefined();
	});

	it('returns nothing when the gateway does not support the node', () => {
		setup({ text: TEXT });
		gateway.supportedNodes = [];

		expect(useGatewayCreditsPromotion({ nodeType: NODE_TYPE }).promotionText.value).toBeUndefined();
	});

	it('returns nothing before startsAt', () => {
		setup({ text: TEXT, startsAt: '2026-07-01T00:00:00Z' });

		expect(useGatewayCreditsPromotion({ nodeType: NODE_TYPE }).promotionText.value).toBeUndefined();
	});

	it('returns nothing after endsAt', () => {
		setup({ text: TEXT, endsAt: '2026-05-01T00:00:00Z' });

		expect(useGatewayCreditsPromotion({ nodeType: NODE_TYPE }).promotionText.value).toBeUndefined();
	});

	it('returns nothing when the text is null', () => {
		setup({ text: null } as unknown as GatewayCreditsPromotion);

		expect(useGatewayCreditsPromotion({ nodeType: NODE_TYPE }).promotionText.value).toBeUndefined();
	});

	it('returns nothing by credential type when the gateway does not support the credential', () => {
		setup({ text: TEXT });
		gateway.supportedCredentialTypes = [];

		expect(
			useGatewayCreditsPromotion({ credentialType: 'typeSafeAiApi' }).promotionText.value,
		).toBeUndefined();
	});

	it('skips an expired promotion on another node with the same credential', () => {
		const store = useNodeTypesStore();
		store.vettedCommunityNodeTypes = new Map([
			[
				'expired.node',
				communityNode('expired.node', { text: 'old', endsAt: '2026-05-01T00:00:00Z' }),
			],
			[NODE_TYPE, communityNode(NODE_TYPE, { text: TEXT })],
		]);
		Object.assign(store, {
			getNodeType: () => ({ credentials: [{ name: 'typeSafeAiApi' }] }) as INodeTypeDescription,
		});
		gateway.supportedNodes = [NODE_TYPE, 'expired.node'];

		expect(
			useGatewayCreditsPromotion({ credentialType: 'typeSafeAiApi' }).promotionText.value,
		).toBe(TEXT);
	});
});
