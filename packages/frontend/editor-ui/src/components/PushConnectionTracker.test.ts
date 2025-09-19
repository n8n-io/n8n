import { createComponentRenderer } from '@/__tests__/render';
import PushConnectionTracker from '@/components/PushConnectionTracker.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

let isConnected = true;
let isConnectionRequested = true;

vi.mock('@/stores/pushConnection.store', () => {
	return {
		usePushConnectionStore: vi.fn(() => ({
			isConnected,
			isConnectionRequested,
		})),
	};
});

describe('PushConnectionTracker', () => {
	const render = () => {
		const pinia = createTestingPinia({
			stubActions: false,
			initialState: {
				[STORES.PUSH]: {
					isConnected,
					isConnectionRequested,
				},
			},
		});
		setActivePinia(pinia);

		return createComponentRenderer(PushConnectionTracker, {
			global: { stubs: { N8nIcon: true } },
		})();
	};

	it('should not render error when connected and connection requested', () => {
		isConnected = true;
		isConnectionRequested = true;
		const { container } = render();

		expect(container).toMatchSnapshot();
	});

	it('should render error when disconnected and connection requested', () => {
		isConnected = false;
		isConnectionRequested = true;
		const { container } = render();

		expect(container).toMatchSnapshot();
	});

	it('should not render error when connected and connection not requested', () => {
		isConnected = true;
		isConnectionRequested = false;
		const { container } = render();

		expect(container).toMatchSnapshot();
	});
});
