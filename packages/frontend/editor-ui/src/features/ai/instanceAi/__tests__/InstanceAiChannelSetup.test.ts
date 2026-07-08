import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';

import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import InstanceAiChannelSetup from '../components/InstanceAiChannelSetup.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';

vi.mock('@/features/agents/components/AgentChannelModal.vue', () => ({
	default: {
		props: [
			'open',
			'agentId',
			'projectId',
			'view',
			'connectedChannels',
			'isPublished',
			'forceNewCredential',
		],
		emits: ['update:open', 'channel-connected'],
		template: `<div data-test-id="channel-modal" :data-open="String(open)">
			<button data-test-id="do-connect" @click="$emit('channel-connected', 'slack')" />
			<button data-test-id="do-close" @click="$emit('update:open', false)" />
		</div>`,
	},
}));

const renderComponent = createThreadComponentRenderer(InstanceAiChannelSetup);

const defaultProps = {
	requestId: 'req-1',
	integrationType: 'slack',
	agentId: 'agent-1',
	projectId: 'project-1',
};

describe('InstanceAiChannelSetup', () => {
	let store: ReturnType<typeof useInstanceAiStore>;
	let thread: ThreadRuntime;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiStore();
		thread = store.getOrCreateRuntime('thread-1');
	});

	it('submits approved when the channel gets connected', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');
		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('do-connect'));

		expect(confirmSpy).toHaveBeenCalledWith('req-1', { kind: 'approval', approved: true });
		expect(resolveSpy).toHaveBeenCalledWith('req-1', 'approved');
	});

	it('submits deferred when the modal closes without connect', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');
		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('do-close'));

		expect(confirmSpy).toHaveBeenCalledWith('req-1', { kind: 'approval', approved: false });
		expect(resolveSpy).toHaveBeenCalledWith('req-1', 'deferred');
	});

	it('does not submit twice when connect also closes the modal', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('do-connect'));
		await userEvent.click(getByTestId('do-close'));

		expect(confirmSpy).toHaveBeenCalledTimes(1);
		expect(confirmSpy).toHaveBeenCalledWith('req-1', { kind: 'approval', approved: true });
	});

	it('retries a failed confirmAction once before resolving', async () => {
		const confirmSpy = vi
			.spyOn(thread, 'confirmAction')
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');
		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('do-connect'));

		await vi.waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-1', 'approved'));
		expect(confirmSpy).toHaveBeenCalledTimes(2);
	});

	it('resolves locally without reopening the modal when every confirmAction attempt fails', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');
		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('do-connect'));

		await vi.waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-1', 'approved'));
		expect(confirmSpy).toHaveBeenCalledTimes(2);
		expect(getByTestId('channel-modal').getAttribute('data-open')).toBe('false');
	});

	it('ignores submit when request is already resolved', async () => {
		thread.resolveConfirmation('req-1', 'approved');
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('do-connect'));

		expect(confirmSpy).not.toHaveBeenCalled();
	});
});
