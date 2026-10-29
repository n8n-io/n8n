import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import InstanceAiChannelSetup from '../components/InstanceAiChannelSetup.vue';

/**
 * `InstanceAiChannelSetup` is a thin adapter around the shared
 * `ChannelSetupCard` (body + composable wiring, tested on its own in
 * `features/ai/shared/components/ChannelSetupCard.test.ts`). Here we only
 * prove the adapter's own job: turning the shared `resolve` event into one
 * `decide` event. The parent sends the answer (see the confirmation panel
 * tests for the current Assistant thread).
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

const renderComponent = createComponentRenderer(InstanceAiChannelSetup, {
	pinia: createTestingPinia(),
});

const defaultProps = {
	integrationType: 'slack',
	agentId: 'agent-1',
	projectId: 'project-1',
};

describe('InstanceAiChannelSetup', () => {
	it('renders the shared channel-setup card', () => {
		const { getByTestId } = renderComponent({ props: defaultProps });

		expect(getByTestId('instance-ai-channel-setup')).toBeInTheDocument();
	});

	it('emits an approval when the shared card resolves connected', async () => {
		const { getByTestId, emitted } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-resolve-approved'));

		expect(emitted().decide).toEqual([[true]]);
	});

	it('emits a deferral when the shared card resolves skipped', async () => {
		const { getByTestId, emitted } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-resolve-skipped'));

		expect(emitted().decide).toEqual([[false]]);
	});

	it('emits once for a duplicate resolve event, and hides the card', async () => {
		const { getByTestId, queryByTestId, emitted } = renderComponent({ props: defaultProps });

		const button = getByTestId('mock-resolve-approved');
		// Fire both synchronously (no await between) to prove the adapter's own guard.
		await fireEvent.click(button);
		await fireEvent.click(button);

		expect(emitted().decide).toEqual([[true]]);
		expect(queryByTestId('instance-ai-channel-setup')).toBeNull();
	});
});
