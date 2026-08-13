import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { GenerateSpecError, generateSpec } from './generate';
import { useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';

vi.mock('@/app/composables/useStorage', () => ({
	useStorage: () => ref('test-api-key'),
}));

vi.mock('./generate', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./generate')>();
	return {
		...actual,
		generateSpec: vi.fn(),
	};
});

const workflow = {
	name: 'Lead flow',
	nodes: [
		{
			id: 'node-1',
			name: 'Send lead',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			parameters: { method: 'POST' },
		},
	],
	connections: {},
};

describe('useWorkflowGenerativeUiStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(generateSpec).mockReset();
	});

	it('keeps the rendered spec and surfaces the error when a follow-up fails', async () => {
		const originalSpec = {
			root: 'screen',
			elements: {
				screen: { type: 'Screen', props: { title: 'Lead flow' }, children: [] },
			},
		};
		vi.mocked(generateSpec)
			.mockResolvedValueOnce(originalSpec)
			.mockRejectedValueOnce(new GenerateSpecError('request-failed', 'Request failed'));
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);
		await store.setView('story');

		await store.followUp('Make it shorter');

		expect(store.activeSpec).toEqual(originalSpec);
		expect(store.error).toBe('generate-failed');
	});

	it('uses a Step fallback and surfaces the error when a follow-up has no previous spec', async () => {
		vi.mocked(generateSpec).mockRejectedValue(
			new GenerateSpecError('invalid-response', 'Invalid response'),
		);
		const store = useWorkflowGenerativeUiStore();
		store.setWorkflowGetter(() => workflow);
		store.view = 'play';

		await store.followUp('Make it shorter');

		expect(store.error).toBe('generate-failed');
		expect(store.activeSpec).toEqual({
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Lead flow' },
					children: ['step-0'],
				},
				'step-0': {
					type: 'Step',
					props: {
						title: 'Send lead',
						summary: 'n8n-nodes-base.httpRequest',
						nodeId: 'node-1',
					},
					on: {
						press: {
							action: 'openNode',
							params: { nodeId: 'node-1' },
						},
					},
					children: [],
				},
			},
		});
	});
});
