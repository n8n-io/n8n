import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiChannelSetup from '../components/InstanceAiChannelSetup.vue';

/**
 * `InstanceAiChannelSetup` is a thin transport adapter around the shared
 * `ChannelSetupCard` (tested on its own). Here we only prove the adapter's job:
 * mapping the shared `resolve` event onto the Assistant confirm body.
 */
vi.mock('@/features/ai/shared/components/ChannelSetupCard.vue', () => ({
	default: {
		props: ['integrationType', 'agentId', 'projectId', 'disabled'],
		emits: ['resolve'],
		template:
			'<div :data-disabled="disabled">' +
			'<button data-test-id="mock-resolve-approved" @click="$emit(\'resolve\', { approved: true })" />' +
			'<button data-test-id="mock-resolve-skipped" @click="$emit(\'resolve\', { approved: false })" />' +
			'</div>',
	},
}));

const renderComponent = createComponentRenderer(InstanceAiChannelSetup);

describe('InstanceAiChannelSetup', () => {
	const submit = vi.fn();
	const props = () => ({
		requestId: 'req-channel',
		integrationType: 'slack',
		agentId: 'agent-1',
		projectId: 'project-1',
		submit,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
	});

	it('should render the shared channel-setup card', () => {
		const { getByTestId } = renderComponent({ props: props() });

		expect(getByTestId('instance-ai-channel-setup')).toBeInTheDocument();
	});

	it('should submit an approval when the shared card resolves connected', async () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: props() });

		await userEvent.click(getByTestId('mock-resolve-approved'));

		await waitFor(() => expect(submit).toHaveBeenCalledWith({ kind: 'approval', approved: true }));
		expect(queryByTestId('instance-ai-channel-setup')).toBeNull();
	});

	it('should submit a deferral when the shared card resolves skipped', async () => {
		const { getByTestId } = renderComponent({ props: props() });

		await userEvent.click(getByTestId('mock-resolve-skipped'));

		await waitFor(() => expect(submit).toHaveBeenCalledWith({ kind: 'approval', approved: false }));
	});

	it('should submit once for a duplicate resolve event', async () => {
		const { getByTestId } = renderComponent({ props: props() });

		const button = getByTestId('mock-resolve-approved');
		await fireEvent.click(button);
		await fireEvent.click(button);

		expect(submit).toHaveBeenCalledTimes(1);
	});
});
