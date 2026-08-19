import { effectScope, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatMessageCopy } from './useChatMessageCopy';

const copySpy = vi.fn();

vi.mock('@n8n/composables/useClipboard', function mockClipboard() {
	return {
		useClipboard: function useClipboard() {
			return { copy: copySpy };
		},
	};
});

describe('useChatMessageCopy', function describeUseChatMessageCopy() {
	beforeEach(function resetMocks() {
		vi.clearAllMocks();
	});

	it('copies the current message content', async function copyCurrentContent() {
		const content = ref('First response');
		const scope = effectScope();
		const actions = scope.run(function createCopyActions() {
			return useChatMessageCopy(content);
		});

		expect(actions).toBeDefined();
		if (!actions) return;

		await actions.copyMessage();
		content.value = 'Updated response';
		await actions.copyMessage();

		expect(copySpy).toHaveBeenNthCalledWith(1, 'First response');
		expect(copySpy).toHaveBeenNthCalledWith(2, 'Updated response');
		scope.stop();
	});
});
