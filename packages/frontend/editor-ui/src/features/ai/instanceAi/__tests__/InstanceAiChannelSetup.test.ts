import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import InstanceAiChannelSetup from '../components/InstanceAiChannelSetup.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';

/**
 * `InstanceAiChannelSetup` is a thin transport adapter around the shared
 * `ChannelSetupCard` (body + composable wiring, tested on its own in
 * `features/ai/shared/components/ChannelSetupCard.test.ts`). Here we only
 * prove the adapter's own job: mapping the shared `resolve` event onto
 * instance AI's confirm transport (`confirmAction` + `resolveConfirmation`,
 * with the MAX_CONFIRM_ATTEMPTS retry semantics) and gating a duplicate
 * resolve when the request is already resolved.
 */
vi.mock('@/features/ai/shared/components/ChannelSetupCard.vue', () => ({
	default: {
		props: ['integrationType', 'agentId', 'projectId', 'disabled'],
		emits: ['resolve'],
		// No hardcoded `data-test-id` on the root: the adapter passes its own
		// (`instance-ai-channel-setup`) as a fallthrough attribute, which would
		// just overwrite one set here anyway.
		template:
			'<div :data-disabled="disabled">' +
			'<button data-test-id="mock-resolve-approved" @click="$emit(\'resolve\', { approved: true })" />' +
			'<button data-test-id="mock-resolve-skipped" @click="$emit(\'resolve\', { approved: false })" />' +
			'</div>',
	},
}));

const renderComponent = createThreadComponentRenderer(InstanceAiChannelSetup);

const defaultProps = {
	requestId: 'req-channel',
	integrationType: 'slack',
	agentId: 'agent-1',
	projectId: 'project-1',
};

describe('InstanceAiChannelSetup', () => {
	let thread: ThreadRuntime;

	beforeEach(() => {
		vi.clearAllMocks();

		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		thread = useInstanceAiStore().getOrCreateRuntime('thread-1');
		thread.messages = [];
		thread.resolvedConfirmationIds.clear();
	});

	it('renders the shared channel-setup card', () => {
		const { getByTestId } = renderComponent({ props: defaultProps });

		expect(getByTestId('instance-ai-channel-setup')).toBeInTheDocument();
	});

	it('confirms and resolves approved when the shared card resolves connected', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-resolve-approved'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-channel', 'approved'));
		expect(confirmSpy).toHaveBeenCalledWith('req-channel', { kind: 'approval', approved: true });
	});

	it('confirms and resolves deferred when the shared card resolves skipped', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-resolve-skipped'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-channel', 'deferred'));
		expect(confirmSpy).toHaveBeenCalledWith('req-channel', { kind: 'approval', approved: false });
	});

	it('retries a failed confirmAction once before resolving', async () => {
		const confirmSpy = vi
			.spyOn(thread, 'confirmAction')
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-resolve-approved'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-channel', 'approved'));
		expect(confirmSpy).toHaveBeenCalledTimes(2);
	});

	it('resolves locally without reopening setup when every confirmAction attempt fails', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId, queryByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-resolve-approved'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-channel', 'approved'));
		expect(confirmSpy).toHaveBeenCalledTimes(2);
		expect(queryByTestId('instance-ai-channel-setup')).toBeNull();
	});

	it('does not resolve twice for a duplicate resolve event', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		const button = getByTestId('mock-resolve-approved');
		// Fire both synchronously (no await between) to prove the adapter's
		// own guard — not just the shared card's — blocks a duplicate resolve.
		await fireEvent.click(button);
		await fireEvent.click(button);

		await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
	});

	it('passes disabled=true to the shared card and ignores a resolve event once the request is already resolved', async () => {
		thread.resolveConfirmation('req-channel', 'approved');
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		expect(getByTestId('instance-ai-channel-setup')).toHaveAttribute('data-disabled', 'true');

		await userEvent.click(getByTestId('mock-resolve-approved'));

		expect(confirmSpy).not.toHaveBeenCalled();
	});
});
