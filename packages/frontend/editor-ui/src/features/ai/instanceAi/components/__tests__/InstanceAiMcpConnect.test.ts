import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import InstanceAiMcpConnect from '../InstanceAiMcpConnect.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../../instanceAi.store';
import { createThreadComponentRenderer } from '../../__tests__/createThreadComponentRenderer';

const { telemetryTrackMock } = vi.hoisted(() => ({ telemetryTrackMock: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrackMock }),
}));

vi.mock('../InstanceAiMcpConnectCard.vue', () => ({
	default: {
		props: ['servers', 'readOnly', 'expired'],
		emits: ['resolve'],
		template:
			'<div data-test-id="mcp-connect-card" :data-read-only="readOnly">' +
			'<button data-test-id="mock-connected" @click="$emit(\'resolve\', { approved: true, connectedSlugs: [\'brave\'] })" />' +
			'<button data-test-id="mock-skipped" @click="$emit(\'resolve\', { approved: false, connectedSlugs: [] })" />' +
			'</div>',
	},
}));

const renderComponent = createThreadComponentRenderer(InstanceAiMcpConnect);

const defaultProps = {
	requestId: 'req-mcp',
	inputThreadId: 'input-1',
	servers: [
		{
			serverSlug: 'brave',
			title: 'Brave',
			usesCredentials: [{ credentialType: 'braveMcpOAuth2Api', name: 'OAuth2', value: 'oAuth2' }],
		},
	],
};

describe('InstanceAiMcpConnect', () => {
	let thread: ThreadRuntime;

	beforeEach(() => {
		vi.clearAllMocks();

		setActivePinia(createTestingPinia({ stubActions: false }));
		thread = useInstanceAiStore().getOrCreateRuntime('thread-1');
		thread.messages = [];
		thread.resolvedConfirmationIds.clear();
	});

	it('confirms and resolves approved when a server was connected', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-connected'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-mcp', 'approved'));
		expect(confirmSpy).toHaveBeenCalledWith('req-mcp', {
			kind: 'mcpConnect',
			approved: true,
			connectedSlugs: ['brave'],
		});
	});

	it('confirms and resolves deferred when the card was skipped', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-skipped'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-mcp', 'deferred'));
		expect(confirmSpy).toHaveBeenCalledWith('req-mcp', {
			kind: 'mcpConnect',
			approved: false,
			connectedSlugs: [],
		});
	});

	it('keeps the card mounted after resolving, in read-only state', async () => {
		vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-connected'));

		await waitFor(() =>
			expect(getByTestId('mcp-connect-card')).toHaveAttribute('data-read-only', 'true'),
		);
	});

	it('retries a failed confirmAction once before resolving', async () => {
		const confirmSpy = vi
			.spyOn(thread, 'confirmAction')
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-connected'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-mcp', 'approved'));
		expect(confirmSpy).toHaveBeenCalledTimes(2);
	});

	it('stays actionable when every confirmAction attempt fails', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-connected'));

		await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(2));
		expect(resolveSpy).not.toHaveBeenCalled();
		expect(telemetryTrackMock).not.toHaveBeenCalled();
		expect(getByTestId('mcp-connect-card')).toHaveAttribute('data-read-only', 'false');
	});

	it('does not resolve twice for a duplicate resolve event', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		const button = getByTestId('mock-connected');
		await fireEvent.click(button);
		await fireEvent.click(button);

		await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
	});

	it('ignores a resolve event once the request is already resolved', async () => {
		thread.resolveConfirmation('req-mcp', 'approved');
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		expect(getByTestId('mcp-connect-card')).toHaveAttribute('data-read-only', 'true');

		await userEvent.click(getByTestId('mock-connected'));

		expect(confirmSpy).not.toHaveBeenCalled();
	});

	it('tracks the resolution as an mcp-connect input', async () => {
		vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-connected'));

		expect(telemetryTrackMock).toHaveBeenCalledWith(
			'User finished providing input',
			expect.objectContaining({
				type: 'mcp-connect',
				input_thread_id: 'input-1',
				provided_inputs: [{ label: 'mcp-connect', options: ['brave'], option_chosen: ['brave'] }],
				skipped_inputs: [],
			}),
		);
	});

	it('tracks a skip as a skipped input', async () => {
		vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-skipped'));

		expect(telemetryTrackMock).toHaveBeenCalledWith(
			'User finished providing input',
			expect.objectContaining({
				type: 'mcp-connect',
				provided_inputs: [],
				skipped_inputs: [{ label: 'mcp-connect', options: ['brave'] }],
			}),
		);
	});
});
