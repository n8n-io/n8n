import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import {
	AI_CATEGORY_AGENTS,
	AI_CATEGORY_CHAINS,
	AI_TRANSFORM_NODE_TYPE,
	PRE_BUILT_AGENTS_EXPERIMENT,
} from '@/constants';
import type { INodeTypeDescription } from 'n8n-workflow';
import { START_NODE_TYPE } from 'n8n-workflow';
import { useSettingsStore } from '@/stores/settings.store';
import { AIView } from './viewsData';
import { mockNodeTypeDescription } from '@/__tests__/mocks';
import { useTemplatesStore } from '@/stores/templates.store';
import { usePostHog } from '@/stores/posthog.store';

let posthogStore: ReturnType<typeof usePostHog>;

const getNodeType = vi.fn();

const aiTransformNode = mockNodeTypeDescription({ name: AI_TRANSFORM_NODE_TYPE });

const otherNodes = (
	[
		{ name: START_NODE_TYPE },
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

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
		allLatestNodeTypes: [aiTransformNode, ...otherNodes],
	})),
}));

describe('viewsData', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());

		posthogStore = usePostHog();

		vi.spyOn(posthogStore, 'isVariantEnabled').mockImplementation((experiment) => {
			if (experiment === PRE_BUILT_AGENTS_EXPERIMENT.name) {
				return false;
			}

			return true;
		});

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
			vi.spyOn(posthogStore, 'isVariantEnabled').mockReturnValue(false);

			const settingsStore = useSettingsStore();
			vi.spyOn(settingsStore, 'isAskAiEnabled', 'get').mockReturnValue(false);

			expect(AIView([])).toMatchSnapshot();
		});
	});
});
