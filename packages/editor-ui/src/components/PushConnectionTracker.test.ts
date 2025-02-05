import { createComponentRenderer } from '@/__tests__/render';
import PushConnectionTracker from '@/components/PushConnectionTracker.vue';
import { STORES } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

let isConnected = true;

vi.mock('@/stores/pushConnection.store', () => {
	return {
		usePushConnectionStore: vi.fn(() => ({
			isConnected,
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
				},
			},
		});
		setActivePinia(pinia);

		return createComponentRenderer(PushConnectionTracker)();
	};

	it('should render when connected', () => {
		isConnected = true;
		const { container } = render();

		expect(container).toMatchSnapshot();
	});

	it('should render when disconnected', () => {
		isConnected = false;
		const { container } = render();

		expect(container).toMatchSnapshot();
	});
});
