import type { InstanceGatewayResourceDecision } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import GatewayResourceDecision from '../components/GatewayResourceDecision.vue';

const { thread } = vi.hoisted(() => ({
	thread: {
		id: 'thread-1',
		findToolCallByRequestId: vi.fn(() => undefined),
		confirmResourceDecision: vi.fn(async () => {}),
	},
}));

vi.mock('../instanceAi.store', () => ({
	useThread: () => thread,
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

const renderComponent = createComponentRenderer(GatewayResourceDecision, {
	pinia: createTestingPinia(),
});

describe('GatewayResourceDecision', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('browser choice', () => {
		const props = {
			requestId: 'request-1',
			resource: 'browser',
			description: 'Choose which browser n8n Assistant should use',
			options: [
				'useLocalBrowserForChat',
				'useLocalBrowserAlways',
				'useCloudBrowserForChat',
				'useCloudBrowserAlways',
			] as InstanceGatewayResourceDecision[],
		};

		it('asks which browser to use and offers both browsers', () => {
			const { getByText, getByTestId } = renderComponent({ props });

			expect(getByText('Which browser should n8n Assistant use?')).toBeVisible();
			expect(getByTestId('gateway-decision-browser-local')).toBeVisible();
			expect(getByTestId('gateway-decision-browser-cloud')).toBeVisible();
		});

		it('confirms the browser picked for this chat', async () => {
			const { getByTestId } = renderComponent({ props });

			await fireEvent.click(getByTestId('gateway-decision-browser-cloud'));

			expect(thread.confirmResourceDecision).toHaveBeenCalledWith(
				'request-1',
				'useCloudBrowserForChat',
			);
		});
	});

	it('keeps the allow and deny buttons for resource access', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				requestId: 'request-1',
				resource: 'example.com',
				description: 'Browser: example.com',
				options: ['denyOnce', 'allowOnce', 'allowForSession'] as InstanceGatewayResourceDecision[],
			},
		});

		expect(getByTestId('gateway-decision-deny')).toBeVisible();
		expect(queryByTestId('gateway-decision-browser-cloud')).toBeNull();
	});
});
