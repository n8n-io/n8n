import type { NodeCreateElement } from '@/Interface';
import { extractAiGatewaySection, finalizeItems, showsAiGatewaySection } from './nodeCreator.utils';
import { mockNodeCreateElement } from './__tests__/utils';
import type { ViewStack } from './composables/useViewStacks';
import { NodeConnectionTypes } from 'n8n-workflow';
import {
	AI_CATEGORY_OTHER_TOOLS,
	AI_CATEGORY_VECTOR_STORES,
	DEFAULT_SUBCATEGORY,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/app/constants';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ settings: {}, isAskAiEnabled: true })),
}));

vi.mock('@/app/stores/aiGateway.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/stores/aiGateway.store')>()),
	useAiGatewayStore: vi.fn(() => ({
		isNodeSupported: vi.fn(() => false),
		isNodeTypeVersionSupported: vi.fn(() => true),
	})),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeVersions: vi.fn(() => []),
		communityNodeType: vi.fn(() => null),
	})),
}));

describe('NodeCreator - utils (AI gateway)', () => {
	describe('finalizeItems - Free credits badge (minNodeTypeVersion gate)', () => {
		const makeGatewayNode = (name = 'gatewayNode') => mockNodeCreateElement(undefined, { name });

		beforeEach(() => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isAiGatewayEnabled: true,
			} as unknown as ReturnType<typeof useSettingsStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => true),
				isNodeTypeVersionSupported: vi.fn(() => true),
			} as unknown as ReturnType<typeof useAiGatewayStore>);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => [1, 1.1]),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
		});

		it('should show Free credits badge when latest version meets the minimum', () => {
			const [result] = finalizeItems([makeGatewayNode()]) as NodeCreateElement[];
			expect(result.properties.tag).toEqual({ text: expect.any(String), pill: true });
		});

		it('should suppress Free credits badge when latest version is below the minimum', () => {
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => true),
				isNodeTypeVersionSupported: vi.fn(() => false),
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			const [result] = finalizeItems([makeGatewayNode()]) as NodeCreateElement[];
			expect(result.properties.tag).toBeUndefined();
		});

		it('should suppress Free credits badge when gateway is disabled', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isAiGatewayEnabled: false,
			} as unknown as ReturnType<typeof useSettingsStore>);

			const [result] = finalizeItems([makeGatewayNode()]) as NodeCreateElement[];
			expect(result.properties.tag).toBeUndefined();
		});

		it('should pass the latest (max) version to the version check', () => {
			const isNodeTypeVersionSupported = vi.fn(() => true);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => [1, 1.1, 2]),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => true),
				isNodeTypeVersionSupported,
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			finalizeItems([makeGatewayNode('my-node')]);
			expect(isNodeTypeVersionSupported).toHaveBeenCalledWith('my-node', 2);
		});

		it('should fall back to version 1 when the node type has no known versions', () => {
			const isNodeTypeVersionSupported = vi.fn(() => true);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => []),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => true),
				isNodeTypeVersionSupported,
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			finalizeItems([makeGatewayNode('my-node')]);
			expect(isNodeTypeVersionSupported).toHaveBeenCalledWith('my-node', 1);
		});

		it('should show Free credits badge for a Tool-suffixed node whose base name is in the gateway config', () => {
			// "llamaParsePlatformTool" is not in config, but "llamaParsePlatform" is.
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn((name: string) => name === 'llamaParsePlatform'),
				isNodeTypeVersionSupported: vi.fn(() => true),
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			const [result] = finalizeItems([
				makeGatewayNode('llamaParsePlatformTool'),
			]) as NodeCreateElement[];
			expect(result.properties.tag).toEqual({ text: expect.any(String), pill: true });
		});

		it('should suppress Free credits badge when neither the Tool-suffixed name nor the base name is in the gateway config', () => {
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn(() => false),
				isNodeTypeVersionSupported: vi.fn(() => true),
			} as unknown as ReturnType<typeof useAiGatewayStore>);

			const [result] = finalizeItems([makeGatewayNode('unknownTool')]) as NodeCreateElement[];
			expect(result.properties.tag).toBeUndefined();
		});
	});

	describe('showsAiGatewaySection', () => {
		it.each<[string, ViewStack, boolean]>([
			['Language Models list', { connectionType: NodeConnectionTypes.AiLanguageModel }, true],
			[
				'nodes panel "Action in an app"',
				{ rootView: REGULAR_NODE_CREATOR_VIEW, subcategory: DEFAULT_SUBCATEGORY },
				true,
			],
			['tools panel "Action in an app"', { subcategory: AI_CATEGORY_OTHER_TOOLS }, true],
			[
				'trigger panel "On app event"',
				{ rootView: TRIGGER_NODE_CREATOR_VIEW, subcategory: DEFAULT_SUBCATEGORY },
				false,
			],
			[
				'any view while searching',
				{ connectionType: NodeConnectionTypes.AiLanguageModel, search: 'gpt' },
				false,
			],
			['unrelated subcategory', { subcategory: AI_CATEGORY_VECTOR_STORES }, false],
		])('%s -> %s', (_, stack, expected) => {
			expect(showsAiGatewaySection(stack)).toBe(expected);
		});

		it('should return false without a stack', () => {
			expect(showsAiGatewaySection(undefined)).toBe(false);
		});
	});

	describe('extractAiGatewaySection', () => {
		const makeNode = (name: string) => mockNodeCreateElement({ key: name }, { name });

		beforeEach(() => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isAiGatewayEnabled: true,
			} as unknown as ReturnType<typeof useSettingsStore>);
			vi.mocked(useAiGatewayStore).mockReturnValue({
				isNodeSupported: vi.fn((name: string) => name.startsWith('supported')),
				isNodeTypeVersionSupported: vi.fn(() => true),
			} as unknown as ReturnType<typeof useAiGatewayStore>);
			vi.mocked(useNodeTypesStore).mockReturnValue({
				getNodeVersions: vi.fn(() => [1]),
			} as unknown as ReturnType<typeof useNodeTypesStore>);
		});

		it('should split gateway-supported nodes into an n8n Connect section', () => {
			const supported = makeNode('supportedNode');
			const other = makeNode('otherNode');

			const result = extractAiGatewaySection([supported, other]);

			expect(result).not.toBeNull();
			expect(result?.section.key).toBe('n8nConnect');
			expect(result?.section.showCreditsBalance).toBe(true);
			expect(result?.section.showSeparator).toBe(true);
			expect(result?.section.children.map((child) => child.key)).toEqual(['supportedNode']);
			expect(result?.rest).toEqual([other]);
		});

		it('should tag section children with the Free credits pill', () => {
			const result = extractAiGatewaySection([makeNode('supportedNode')]);
			const [child] = result?.section.children as NodeCreateElement[];
			expect(child.properties.tag).toEqual({ text: expect.any(String), pill: true });
		});

		it('should return null when no node is gateway-supported', () => {
			expect(extractAiGatewaySection([makeNode('otherNode')])).toBeNull();
		});

		it('should return null when the gateway is disabled', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isAiGatewayEnabled: false,
			} as unknown as ReturnType<typeof useSettingsStore>);

			expect(extractAiGatewaySection([makeNode('supportedNode')])).toBeNull();
		});
	});
});
