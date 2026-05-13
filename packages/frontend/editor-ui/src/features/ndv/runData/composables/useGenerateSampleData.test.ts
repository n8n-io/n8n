import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import type { INodeUi } from '@/Interface';

const { generateCodeForPromptMock, setDataMock, canPinNodeMock, showMessageMock, showErrorMock } =
	vi.hoisted(() => ({
		generateCodeForPromptMock: vi.fn(),
		setDataMock: vi.fn(),
		canPinNodeMock: vi.fn().mockReturnValue(true),
		showMessageMock: vi.fn(),
		showErrorMock: vi.fn(),
	}));

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	generateCodeForPrompt: generateCodeForPromptMock,
}));

vi.mock('@/app/composables/usePinnedData', () => ({
	usePinnedData: vi.fn(() => ({
		setData: setDataMock,
		canPinNode: canPinNodeMock,
		hasData: { value: false },
		isValidNodeType: { value: true },
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageMock, showError: showErrorMock }),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: () => ({ pushRef: 'ndv-push-test' }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		pushRef: 'root-push-test',
		restApiContext: { baseUrl: '/rest', sessionId: 's', pushRef: 'root-push-test' },
	}),
}));

import { useGenerateSampleData } from './useGenerateSampleData';

const node = ref({
	id: 'n1',
	name: 'Slack',
	type: 'n8n-nodes-base.slack',
	typeVersion: 2,
	parameters: { resource: 'message', operation: 'post' },
} as unknown as INodeUi);

describe('useGenerateSampleData', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		generateCodeForPromptMock.mockReset();
		setDataMock.mockReset();
		showMessageMock.mockReset();
		showErrorMock.mockReset();
	});

	it('exposes generate() and isGenerating refs', () => {
		const composable = useGenerateSampleData(node);
		expect(typeof composable.generate).toBe('function');
		expect(composable.isGenerating.value).toBe(false);
	});

	it('pins parsed array response and shows success toast', async () => {
		generateCodeForPromptMock.mockResolvedValue({
			code: '[{"channel":"#general","text":"hi"},{"channel":"#dev","text":"hello"}]',
		});
		const composable = useGenerateSampleData(node);
		await composable.generate();
		expect(setDataMock).toHaveBeenCalledWith(
			[{ json: { channel: '#general', text: 'hi' } }, { json: { channel: '#dev', text: 'hello' } }],
			'pin-icon-click',
		);
		expect(showMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	it('caps items to 3', async () => {
		generateCodeForPromptMock.mockResolvedValue({
			code: JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ i }))),
		});
		await useGenerateSampleData(node).generate();
		const [items] = setDataMock.mock.calls[0];
		expect(items).toHaveLength(3);
	});

	it('shows error toast and skips pin when response is not a JSON array', async () => {
		generateCodeForPromptMock.mockResolvedValue({ code: '{"not":"array"}' });
		await useGenerateSampleData(node).generate();
		expect(setDataMock).not.toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalled();
	});

	it('shows error toast and skips pin when array is empty', async () => {
		generateCodeForPromptMock.mockResolvedValue({ code: '[]' });
		await useGenerateSampleData(node).generate();
		expect(setDataMock).not.toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalled();
	});

	it('shows error toast when API call rejects', async () => {
		generateCodeForPromptMock.mockRejectedValue(new Error('boom'));
		await useGenerateSampleData(node).generate();
		expect(setDataMock).not.toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalled();
	});

	it('no-ops when node is null', async () => {
		const empty = ref(null);
		await useGenerateSampleData(empty).generate();
		expect(generateCodeForPromptMock).not.toHaveBeenCalled();
	});
});
