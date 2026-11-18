import { ref } from 'vue';

import { useNodeLinkCopy } from './useNodeLinkCopy';

const mocks = vi.hoisted(() => ({
	copy: vi.fn(),
	showMessage: vi.fn(),
	workflowId: undefined as unknown as { value: string | undefined },
}));

vi.mock('@n8n/composables/useClipboard', () => ({ useClipboard: () => ({ copy: mocks.copy }) }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mocks.showMessage }),
}));
vi.mock('./usePagesWorkflowId', () => ({ usePagesWorkflowId: () => mocks.workflowId }));
vi.mock('@n8n/frontend-module-page', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/frontend-module-page')>()),
	useInstanceLocation: () => () => ({ origin: 'https://n8n.example.com', basePath: '/n8n/' }),
}));

describe('useNodeLinkCopy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.workflowId = ref<string | undefined>('w1');
	});

	it('should copy the absolute URL of the node and confirm', async () => {
		await useNodeLinkCopy().copyNodeLink('n1');

		expect(mocks.copy).toHaveBeenCalledWith('https://n8n.example.com/n8n/workflow/w1/n1');
		expect(mocks.showMessage).toHaveBeenCalledWith({
			type: 'success',
			title: 'Link to node copied',
		});
	});

	it('should copy nothing for a workflow that is not saved', async () => {
		mocks.workflowId.value = undefined;

		await useNodeLinkCopy().copyNodeLink('n1');

		expect(mocks.copy).not.toHaveBeenCalled();
		expect(mocks.showMessage).not.toHaveBeenCalled();
	});
});
