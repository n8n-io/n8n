import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import GatewayResourceDecision from '../GatewayResourceDecision.vue';

const { telemetryTrack } = vi.hoisted(() => ({ telemetryTrack: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const render = createComponentRenderer(GatewayResourceDecision, { pinia: createTestingPinia() });

const props = {
	resource: '/tmp/a.txt',
	description: 'Read /tmp/a.txt',
	options: ['denyOnce', 'allowOnce', 'allowForSession'] as const,
	threadId: 'thread-1',
	inputThreadId: 'input-thread-1',
};

describe('GatewayResourceDecision', () => {
	beforeEach(() => {
		telemetryTrack.mockReset();
	});

	it('emits the decision, and reports the thread that it is given', async () => {
		const { getByTestId, emitted } = render({ props: { ...props, options: [...props.options] } });

		await fireEvent.click(getByTestId('gateway-decision-deny'));

		expect(emitted().decide).toEqual([['denyOnce']]);
		expect(telemetryTrack).toHaveBeenCalledWith(
			'User finished providing input',
			expect.objectContaining({
				thread_id: 'thread-1',
				input_thread_id: 'input-thread-1',
				type: 'resource-decision',
			}),
		);
	});
});
