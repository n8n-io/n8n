import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type {
	AiGatewayPromotion,
	CommunityNodeType,
	FrontendSettings,
	GatewayCreditsPromotion,
} from '@n8n/api-types';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useGatewayCreditsPromotion } from './useGatewayCreditsPromotion';

const gateway = {
	supportedNodes: [] as string[],
	supportedCredentialTypes: ['typeSafeAiApi'],
	promotions: undefined as AiGatewayPromotion[] | undefined,
};

vi.mock('@/app/stores/aiGateway.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/stores/aiGateway.store')>();
	return {
		...actual,
		useAiGatewayStore: () => ({
			config: { promotions: gateway.promotions },
			fetchConfig: vi.fn().mockResolvedValue(undefined),
			isCredentialTypeSupported: (type: string) => gateway.supportedCredentialTypes.includes(type),
			isNodeSupported: (name: string) =>
				gateway.supportedNodes.includes(name) ||
				gateway.supportedNodes.includes(actual.stripToolSuffix(name)),
		}),
	};
});

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
		gateway.promotions = undefined;
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

	describe('from the Gateway config', () => {
		const GEMINI = '@n8n/n8n-nodes-langchain.googleGemini';
		const EMBEDDINGS = '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini';
		const GEMINI_CREDENTIAL = 'googlePalmApi';
		const GATEWAY_TEXT = 'Gemini is free until December 1, 2026.';

		const setupBuiltIn = (promotion: Partial<AiGatewayPromotion> = {}) => {
			gateway.supportedNodes = [GEMINI, EMBEDDINGS];
			gateway.supportedCredentialTypes = [GEMINI_CREDENTIAL];
			gateway.promotions = [{ text: GATEWAY_TEXT, nodes: [GEMINI], ...promotion }];
			Object.assign(useNodeTypesStore(), {
				getNodeType: (name: string) =>
					[GEMINI, `${GEMINI}Tool`, `${GEMINI}HitlTool`, EMBEDDINGS].includes(name)
						? ({ name, credentials: [{ name: GEMINI_CREDENTIAL }] } as INodeTypeDescription)
						: null,
			});
		};

		it.each([GEMINI, `${GEMINI}Tool`, `${GEMINI}HitlTool`])(
			'returns the text for the listed node variant %s',
			(nodeType) => {
				setupBuiltIn();

				expect(useGatewayCreditsPromotion({ nodeType }).promotionText.value).toBe(GATEWAY_TEXT);
			},
		);

		it('returns nothing for an unlisted node with the same credential', () => {
			setupBuiltIn();

			expect(
				useGatewayCreditsPromotion({ nodeType: EMBEDDINGS }).promotionText.value,
			).toBeUndefined();
		});

		it('returns the text in the credential modal opened from a listed node', () => {
			setupBuiltIn();

			expect(
				useGatewayCreditsPromotion({ nodeType: GEMINI, credentialType: GEMINI_CREDENTIAL })
					.promotionText.value,
			).toBe(GATEWAY_TEXT);
		});

		it('returns nothing in the credential modal opened without a node or from an unlisted node', () => {
			setupBuiltIn();

			expect(
				useGatewayCreditsPromotion({ credentialType: GEMINI_CREDENTIAL }).promotionText.value,
			).toBeUndefined();
			expect(
				useGatewayCreditsPromotion({ nodeType: EMBEDDINGS, credentialType: GEMINI_CREDENTIAL })
					.promotionText.value,
			).toBeUndefined();
		});

		it('ignores the open node in the credential modal when the node does not use the credential', () => {
			setupBuiltIn();

			expect(
				useGatewayCreditsPromotion({ nodeType: GEMINI, credentialType: 'otherApi' }).promotionText
					.value,
			).toBeUndefined();
		});

		it('returns nothing without a node type or a credential type', () => {
			setupBuiltIn();

			expect(
				useGatewayCreditsPromotion({ nodeType: () => undefined }).promotionText.value,
			).toBeUndefined();
		});

		it('returns nothing when the gateway does not support the node', () => {
			setupBuiltIn();
			gateway.supportedNodes = [];

			expect(useGatewayCreditsPromotion({ nodeType: GEMINI }).promotionText.value).toBeUndefined();
		});

		it('returns nothing when Gateway credits are disabled', () => {
			setupBuiltIn();
			setGatewayEnabled(false);

			expect(useGatewayCreditsPromotion({ nodeType: GEMINI }).promotionText.value).toBeUndefined();
		});

		it('returns nothing outside the window', () => {
			setupBuiltIn({ startsAt: '2026-07-01T00:00:00.000Z' });
			expect(useGatewayCreditsPromotion({ nodeType: GEMINI }).promotionText.value).toBeUndefined();

			setupBuiltIn({ endsAt: '2026-05-01T00:00:00.000Z' });
			expect(useGatewayCreditsPromotion({ nodeType: GEMINI }).promotionText.value).toBeUndefined();
		});

		it('hides the promotion after endsAt without a new config fetch', () => {
			setupBuiltIn({ endsAt: '2026-06-02T00:00:00.000Z' });
			expect(useGatewayCreditsPromotion({ nodeType: GEMINI }).promotionText.value).toBe(
				GATEWAY_TEXT,
			);

			vi.setSystemTime(new Date('2026-06-02T00:00:00Z'));

			expect(useGatewayCreditsPromotion({ nodeType: GEMINI }).promotionText.value).toBeUndefined();
		});

		it("does not show another node's Strapi promotion in a modal opened from a node without one", () => {
			setup({ text: TEXT });
			gateway.supportedNodes = [NODE_TYPE, GEMINI];
			Object.assign(useNodeTypesStore(), {
				getNodeType: (name: string) =>
					[NODE_TYPE, GEMINI].includes(name)
						? ({ name, credentials: [{ name: 'typeSafeAiApi' }] } as INodeTypeDescription)
						: null,
			});

			expect(
				useGatewayCreditsPromotion({ nodeType: GEMINI, credentialType: 'typeSafeAiApi' })
					.promotionText.value,
			).toBeUndefined();
			expect(
				useGatewayCreditsPromotion({ nodeType: NODE_TYPE, credentialType: 'typeSafeAiApi' })
					.promotionText.value,
			).toBe(TEXT);
		});

		it('takes precedence over the Strapi promotion of a community node', () => {
			setup({ text: TEXT });
			gateway.promotions = [{ text: GATEWAY_TEXT, nodes: [NODE_TYPE] }];

			expect(useGatewayCreditsPromotion({ nodeType: NODE_TYPE }).promotionText.value).toBe(
				GATEWAY_TEXT,
			);
			expect(
				useGatewayCreditsPromotion({ nodeType: NODE_TYPE, credentialType: 'typeSafeAiApi' })
					.promotionText.value,
			).toBe(GATEWAY_TEXT);
		});

		it('falls back to the Strapi promotion when no Gateway promotion matches', () => {
			setup({ text: TEXT });
			gateway.promotions = [{ text: GATEWAY_TEXT, nodes: [GEMINI] }];

			expect(useGatewayCreditsPromotion({ nodeType: NODE_TYPE }).promotionText.value).toBe(TEXT);
			expect(
				useGatewayCreditsPromotion({ credentialType: 'typeSafeAiApi' }).promotionText.value,
			).toBe(TEXT);
		});

		it('falls back to the Strapi promotion when the Gateway promotion has ended', () => {
			setup({ text: TEXT });
			gateway.promotions = [
				{ text: GATEWAY_TEXT, nodes: [NODE_TYPE], endsAt: '2026-05-01T00:00:00Z' },
			];

			expect(useGatewayCreditsPromotion({ nodeType: NODE_TYPE }).promotionText.value).toBe(TEXT);
		});
	});
});
