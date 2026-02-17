import { createComponentRenderer } from '@/__tests__/render';
import { type TestingPinia, createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import QuickConnectBanner from './QuickConnectBanner.vue';

describe('QuickConnectBanner', () => {
	const renderComponent = createComponentRenderer(QuickConnectBanner);
	let pinia: TestingPinia;

	beforeEach(() => {
		pinia = createTestingPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should render correctly and include passed text', async () => {
		const text = 'This text is displayed correctly';
		const wrapper = renderComponent({ pinia, props: { text } });

		expect(wrapper.getByText(text)).toBeInTheDocument();
	});
});
