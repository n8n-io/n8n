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

	it('strips markdown code fences before parsing', async () => {
		generateCodeForPromptMock.mockResolvedValue({
			code: '```json\n[{"id":"a"},{"id":"b"}]\n```',
		});
		await useGenerateSampleData(node).generate();
		expect(setDataMock).toHaveBeenCalledWith(
			[{ json: { id: 'a' } }, { json: { id: 'b' } }],
			'pin-icon-click',
		);
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('ignores a second generate() while one is in flight', async () => {
		let resolveFirst: (value: { code: string }) => void = () => {};
		generateCodeForPromptMock.mockImplementationOnce(
			() =>
				new Promise<{ code: string }>((resolve) => {
					resolveFirst = resolve;
				}),
		);

		const composable = useGenerateSampleData(node);
		const first = composable.generate();
		const second = composable.generate();
		await second;
		expect(generateCodeForPromptMock).toHaveBeenCalledTimes(1);

		resolveFirst({ code: '[{"x":1}]' });
		await first;
		expect(generateCodeForPromptMock).toHaveBeenCalledTimes(1);
	});

	it('sends a payload that includes the node type, parameters, and forNode=transform', async () => {
		generateCodeForPromptMock.mockResolvedValue({ code: '[{"ok":true}]' });
		await useGenerateSampleData(node).generate();

		expect(generateCodeForPromptMock).toHaveBeenCalledTimes(1);
		const [, payload] = generateCodeForPromptMock.mock.calls[0];
		expect(payload.forNode).toBe('transform');
		expect(payload.context.inputSchema.nodeName).toBe('Slack');
		expect(payload.question).toContain('n8n-nodes-base.slack');
		expect(payload.question).toContain('"resource": "message"');
		expect(payload.question).toContain('JSON array');
	});
});
