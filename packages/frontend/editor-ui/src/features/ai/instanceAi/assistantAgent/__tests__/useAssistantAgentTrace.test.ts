import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

import { useAssistantAgentTrace } from '../useAssistantAgentTrace';

const { clipboardCopy, saveAs, showMessage, showError } = vi.hoisted(() => ({
	clipboardCopy: vi.fn(),
	saveAs: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: () => ({ copy: clipboardCopy }),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));
vi.mock('file-saver', () => ({ saveAs }));

const messages: ChatMessage[] = [{ id: 'u1', role: 'user', content: 'Build a digest' }];

// jsdom's Blob has no text().
async function readBlob(blob: Blob): Promise<string> {
	return await new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.readAsText(blob);
	});
}

function setUp() {
	return useAssistantAgentTrace({ threadId: 'thread-1', messages: () => messages });
}

describe('useAssistantAgentTrace', () => {
	beforeEach(() => {
		localStorage.clear();
		clipboardCopy.mockReset();
		saveAs.mockReset();
		showMessage.mockReset();
		showError.mockReset();
	});

	it('keeps no events without the debug flag', async () => {
		const trace = setUp();
		trace.recordEvent({ type: 'text-delta', id: 't1', delta: 'Sure' });

		await trace.runAction('copy');

		expect(trace.isEnabled).toBe(false);
		const copied: unknown = JSON.parse(clipboardCopy.mock.calls[0][0] as string);
		expect(copied).toMatchObject({ events: [] });
	});

	describe('with the debug flag', () => {
		beforeEach(() => {
			localStorage.setItem('instanceAi.debugMode', 'true');
		});

		it('copies the shown messages and the recorded events as JSON', async () => {
			const trace = setUp();
			trace.recordEvent({ type: 'text-delta', id: 't1', delta: 'Sure' });

			await trace.runAction('copy');

			expect(clipboardCopy).toHaveBeenCalledTimes(1);
			const copied: unknown = JSON.parse(clipboardCopy.mock.calls[0][0] as string);
			expect(copied).toMatchObject({
				threadId: 'thread-1',
				agentId: 'assistant',
				messages,
				events: [{ event: { type: 'text-delta', id: 't1', delta: 'Sure' } }],
			});
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('shows an error when the copy fails', async () => {
			clipboardCopy.mockRejectedValue(new Error('denied'));

			await setUp().runAction('copy');

			expect(showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
			expect(showMessage).not.toHaveBeenCalled();
		});

		it('downloads the trace as a JSON file named after the thread', async () => {
			await setUp().runAction('download');

			expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'assistant-trace-thread-1.json');
			const blob = saveAs.mock.calls[0][0] as Blob;
			expect(blob.type).toBe('application/json');
			expect(JSON.parse(await readBlob(blob))).toMatchObject({ threadId: 'thread-1', messages });
		});
	});
});
