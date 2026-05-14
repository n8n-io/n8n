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

	it('should render correctly and include passed text', () => {
		const text = 'This text is displayed correctly';
		const wrapper = renderComponent({ pinia, props: { text } });

		expect(wrapper.getByText(text)).toBeInTheDocument();
	});

	it('should not render when text is empty and no disclaimer is provided', () => {
		const wrapper = renderComponent({ pinia, props: { text: '' } });

		expect(wrapper.queryByTestId('quick-connect-banner')).not.toBeInTheDocument();
	});

	it('should render the disclaimer text and link with provided linkUrl and linkLabel', () => {
		const wrapper = renderComponent({
			pinia,
			props: {
				disclaimer: {
					text: 'Subject to terms (available {link}).',
					linkUrl: 'https://example.com/terms',
					linkLabel: 'over here',
				},
			},
		});

		const disclaimer = wrapper.getByTestId('quick-connect-banner-disclaimer');
		expect(disclaimer).toBeInTheDocument();
		expect(disclaimer).toHaveTextContent('Subject to terms (available over here).');
		const link = disclaimer.querySelector('a');
		expect(link).not.toBeNull();
		expect(link).toHaveAttribute('href', 'https://example.com/terms');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveTextContent('over here');
	});

	it('should default linkLabel to "here" when omitted', () => {
		const wrapper = renderComponent({
			pinia,
			props: {
				disclaimer: {
					text: 'Subject to terms (available {link}).',
					linkUrl: 'https://example.com/terms',
				},
			},
		});

		const disclaimer = wrapper.getByTestId('quick-connect-banner-disclaimer');
		expect(disclaimer.querySelector('a')).toHaveTextContent('here');
	});

	it('should escape HTML in disclaimer text, linkLabel, and linkUrl', () => {
		const wrapper = renderComponent({
			pinia,
			props: {
				disclaimer: {
					text: 'Read <terms> (available {link}).',
					linkUrl: 'https://example.com/terms?a=1&b=2',
					linkLabel: '<b>evil</b>',
				},
			},
		});

		const disclaimer = wrapper.getByTestId('quick-connect-banner-disclaimer');
		expect(disclaimer.querySelector('b')).toBeNull();
		expect(disclaimer).toHaveTextContent('Read <terms> (available <b>evil</b>).');

		const link = disclaimer.querySelector('a');
		expect(link).not.toBeNull();
		expect(link).toHaveTextContent('<b>evil</b>');
		expect(link).toHaveAttribute('href', 'https://example.com/terms?a=1&b=2');
	});

	it('should render disclaimer alongside callout text', () => {
		const wrapper = renderComponent({
			pinia,
			props: {
				text: 'Offer text',
				disclaimer: {
					text: 'Subject to terms (available {link}).',
					linkUrl: 'https://example.com/terms',
				},
			},
		});

		expect(wrapper.getByText('Offer text')).toBeInTheDocument();
		expect(wrapper.getByTestId('quick-connect-banner-disclaimer')).toBeInTheDocument();
	});

	it('should not render the disclaimer paragraph when disclaimer prop is omitted', () => {
		const wrapper = renderComponent({ pinia, props: { text: 'Offer text' } });

		expect(wrapper.queryByTestId('quick-connect-banner-disclaimer')).not.toBeInTheDocument();
	});

	it('should render only the disclaimer when text is empty but disclaimer is provided', () => {
		const wrapper = renderComponent({
			pinia,
			props: {
				disclaimer: {
					text: 'Subject to terms (available {link}).',
					linkUrl: 'https://example.com/terms',
				},
			},
		});

		expect(wrapper.getByTestId('quick-connect-banner')).toBeInTheDocument();
		expect(wrapper.getByTestId('quick-connect-banner-disclaimer')).toBeInTheDocument();
	});
});
