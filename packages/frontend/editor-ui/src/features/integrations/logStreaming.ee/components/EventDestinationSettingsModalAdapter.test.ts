import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from '@n8n/utils/event-bus';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { defineComponent } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import EventDestinationSettingsModalAdapter from './EventDestinationSettingsModalAdapter.vue';

const receivedProps = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock('./EventDestinationSettingsModal.vue', () => ({
	default: defineComponent({
		props: ['modalName', 'destination', 'isNew', 'eventBus'],
		setup(props) {
			receivedProps.value = { ...props };
			return () => null;
		},
	}),
}));

const renderComponent = createComponentRenderer(EventDestinationSettingsModalAdapter);

describe('EventDestinationSettingsModalAdapter', () => {
	beforeEach(() => {
		createTestingPinia();
		receivedProps.value = {};
	});

	it('should pass the modal data to the modal as separate props', () => {
		const destination = { id: 'dest-1', label: 'My webhook' } as MessageEventBusDestinationOptions;
		const eventBus = createEventBus();

		renderComponent({
			props: {
				modalName: 'settingsLogStream',
				data: { destination, isNew: true, eventBus },
			},
		});

		expect(receivedProps.value).toEqual({
			modalName: 'settingsLogStream',
			destination,
			isNew: true,
			eventBus,
		});
	});

	it('should pass undefined values when the modal has no data', () => {
		renderComponent({ props: { modalName: 'settingsLogStream' } });

		expect(receivedProps.value).toEqual({
			modalName: 'settingsLogStream',
			destination: undefined,
			isNew: undefined,
			eventBus: undefined,
		});
	});
});
