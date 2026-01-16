import { createComponentRenderer } from '@/__tests__/render';
import ConnectionTracker from '@/app/components/ConnectionTracker.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

let isConnected = true;
let isConnectionRequested = true;
let isOnline = true;

vi.mock('@/app/stores/pushConnection.store', () => {
	return {
		usePushConnectionStore: vi.fn(() => ({
			isConnected,
			isConnectionRequested,
		})),
	};
});

vi.mock('@/app/stores/network.store', () => {
	return {
		useNetworkStore: vi.fn(() => ({
			isOnline,
		})),
	};
});

describe('ConnectionTracker', () => {
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

		return createComponentRenderer(ConnectionTracker, {
			global: { stubs: { N8nIcon: true } },
		})();
	};

	beforeEach(() => {
		// Reset to default values
		isConnected = true;
		isConnectionRequested = true;
		isOnline = true;
	});

	it('should not render error when connected and online', () => {
		isConnected = true;
		isConnectionRequested = true;
		isOnline = true;
		const { container } = render();

		expect(container).toMatchSnapshot();
	});

	it('should render network error when offline (priority 1)', () => {
		isConnected = true;
		isConnectionRequested = true;
		isOnline = false; // Offline takes priority
		const { container } = render();

		expect(container).toMatchSnapshot();
		expect(container.textContent).toContain('Connection lost, auto save paused');
	});

	it('should render push error when push disconnected and online', () => {
		isConnected = false;
		isConnectionRequested = true;
		isOnline = true;
		const { container } = render();

		expect(container).toMatchSnapshot();
		expect(container.textContent).toContain('Connection lost');
		expect(container.textContent).not.toContain('auto save paused');
	});

	it('should not render error when push connected and connection not requested', () => {
		isConnected = true;
		isConnectionRequested = false;
		isOnline = true;
		const { container } = render();

		expect(container).toMatchSnapshot();
	});

	it('should render network error when both offline and push disconnected', () => {
		isConnected = false;
		isConnectionRequested = true;
		isOnline = false; // Offline takes priority
		const { container } = render();

		expect(container).toMatchSnapshot();
		expect(container.textContent).toContain('Connection lost, auto save paused');
	});
});
