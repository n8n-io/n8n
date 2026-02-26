import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { AI_CATEGORY_AGENTS, AI_CATEGORY_CHAINS, AI_TRANSFORM_NODE_TYPE } from '@/app/constants';
import type { INodeTypeDescription } from 'n8n-workflow';
import { MANUAL_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { useSettingsStore } from '@/app/stores/settings.store';
import { AIView, HitlToolView } from './viewsData';
import { mockNodeTypeDescription } from '@/__tests__/mocks';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import type { SimplifiedNodeType } from '@/Interface';

const getNodeType = vi.fn();

const aiTransformNode = mockNodeTypeDescription({ name: AI_TRANSFORM_NODE_TYPE });

const otherNodes = (
	[
		{ name: MANUAL_TRIGGER_NODE_TYPE },
		{
			name: 'agentHidden',
			description: 'example mock agent node',
			hidden: true,
			codex: { subcategories: { AI: [AI_CATEGORY_AGENTS] } },
		},
		{
			name: 'agent',
			description: 'example mock agent node',
			codex: { subcategories: { AI: [AI_CATEGORY_AGENTS] } },
		},
		{
			name: 'chainHidden',
			description: 'example mock chain node',
			hidden: true,
			codex: { subcategories: { AI: [AI_CATEGORY_CHAINS] } },
		},
		{
			name: 'chain',
			description: 'example mock chain node',
			codex: { subcategories: { AI: [AI_CATEGORY_CHAINS] } },
		},
	] as Array<Partial<INodeTypeDescription>>
).map(mockNodeTypeDescription);

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
		allLatestNodeTypes: [aiTransformNode, ...otherNodes],
	})),
}));

describe('viewsData', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());

		const templatesStore = useTemplatesStore();

		vi.spyOn(templatesStore, 'websiteTemplateRepositoryParameters', 'get').mockImplementation(
			() => new URLSearchParams({ test: 'value' }),
		);
		vi.spyOn(templatesStore, 'constructTemplateRepositoryURL').mockImplementation(
			(params) => `template-repository-url.n8n.io?${params.toString()}`,
		);
		getNodeType.mockImplementation((nodeName: string) => {
			if (nodeName === AI_TRANSFORM_NODE_TYPE) {
				return aiTransformNode;
			}

			return null;
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('AIView', () => {
		test('should return ai view with ai transform node', () => {
			const settingsStore = useSettingsStore();
			vi.spyOn(settingsStore, 'isAskAiEnabled', 'get').mockReturnValue(true);

			expect(AIView([])).toMatchSnapshot();
		});

		test('should return ai view without ai transform node if ask ai is not enabled', () => {
			const settingsStore = useSettingsStore();
			vi.spyOn(settingsStore, 'isAskAiEnabled', 'get').mockReturnValue(false);

			expect(AIView([])).toMatchSnapshot();
		});

		test('should return ai view without ai transform node if ask ai is not enabled and node is not in the list', () => {
			const settingsStore = useSettingsStore();
			vi.spyOn(settingsStore, 'isAskAiEnabled', 'get').mockReturnValue(false);

			expect(AIView([])).toMatchSnapshot();
		});
	});

	describe('HitlToolView', () => {
		test('should filter and return only HITL tool nodes', () => {
			const hitlToolNode = mockNodeTypeDescription({
				name: 'slackHitlTool',
				displayName: 'Slack',
			});
			const regularNode = mockNodeTypeDescription({
				name: 'regularNode',
				displayName: 'Regular Node',
			});

			const nodes: SimplifiedNodeType[] = [hitlToolNode, regularNode] as SimplifiedNodeType[];

			const result = HitlToolView(nodes);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].properties.name).toBe('slackHitlTool');
			expect(result.items[0].properties.displayName).toBe('Slack');
		});

		test('should sort HITL tool nodes by displayName alphabetically', () => {
			const emailNode = mockNodeTypeDescription({
				name: 'emailSendHitlTool',
				displayName: 'Email',
			});
			const slackNode = mockNodeTypeDescription({
				name: 'slackHitlTool',
				displayName: 'Slack',
			});
			const discordNode = mockNodeTypeDescription({
				name: 'discordHitlTool',
				displayName: 'Discord',
			});

			const nodes: SimplifiedNodeType[] = [
				emailNode,
				slackNode,
				discordNode,
			] as SimplifiedNodeType[];

			const result = HitlToolView(nodes);

			expect(result.items).toHaveLength(3);
			expect(result.items[0].properties.displayName).toBe('Discord');
			expect(result.items[1].properties.displayName).toBe('Email');
			expect(result.items[2].properties.displayName).toBe('Slack');
		});

		test('should return correct view structure with title and nodeIcon', () => {
			const hitlToolNode = mockNodeTypeDescription({
				name: 'testHitlTool',
				displayName: 'Test',
			});

			const nodes: SimplifiedNodeType[] = [hitlToolNode] as SimplifiedNodeType[];

			const result = HitlToolView(nodes);

			expect(result.value).toBe('HITL');
			expect(result.title).toBeDefined();
			expect(result.nodeIcon).toEqual({
				type: 'icon',
				name: 'badge-check',
			});
			expect(result.items).toHaveLength(1);
		});
	});
});
