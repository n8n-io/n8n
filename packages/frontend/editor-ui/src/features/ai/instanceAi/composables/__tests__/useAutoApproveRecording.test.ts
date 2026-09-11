import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { PendingConfirmationItem, ThreadRuntime } from '../../instanceAi.store';
import { armAutoApproveRecording } from '../useAutoApproveRecording';

function buildItem(toolName: string, inputType: string | undefined, requestId: string) {
	return {
		toolCall: {
			toolName,
			confirmation: { requestId, inputType },
		},
	} as unknown as PendingConfirmationItem;
}

function buildThread(pendingConfirmations: ReturnType<typeof ref<PendingConfirmationItem[]>>) {
	return {
		pendingConfirmations,
		resolveConfirmation: vi.fn(),
		confirmAction: vi.fn().mockResolvedValue(true),
	} as unknown as ThreadRuntime;
}

describe('armAutoApproveRecording', () => {
	it('auto-approves the start-browser-recording continue confirmation once it appears', async () => {
		const pendingConfirmations = ref<PendingConfirmationItem[]>([]);
		const thread = buildThread(pendingConfirmations);

		armAutoApproveRecording(thread);
		pendingConfirmations.value = [buildItem('start-browser-recording', 'continue', 'req-1')];
		await Promise.resolve();

		expect(thread.resolveConfirmation).toHaveBeenCalledWith('req-1', 'approved');
		expect(thread.confirmAction).toHaveBeenCalledWith('req-1', {
			kind: 'approval',
			approved: true,
		});
	});

	it('ignores confirmations for other tools', async () => {
		const pendingConfirmations = ref<PendingConfirmationItem[]>([]);
		const thread = buildThread(pendingConfirmations);

		armAutoApproveRecording(thread);
		pendingConfirmations.value = [buildItem('submit-workflow', 'continue', 'req-2')];
		await Promise.resolve();

		expect(thread.resolveConfirmation).not.toHaveBeenCalled();
		expect(thread.confirmAction).not.toHaveBeenCalled();
	});

	it('only fires once even if the confirmation list updates again', async () => {
		const pendingConfirmations = ref<PendingConfirmationItem[]>([]);
		const thread = buildThread(pendingConfirmations);

		armAutoApproveRecording(thread);
		pendingConfirmations.value = [buildItem('start-browser-recording', 'continue', 'req-3')];
		await Promise.resolve();
		pendingConfirmations.value = [
			buildItem('start-browser-recording', 'continue', 'req-3'),
			buildItem('start-browser-recording', 'continue', 'req-4'),
		];
		await Promise.resolve();

		expect(thread.confirmAction).toHaveBeenCalledTimes(1);
	});
});
