import { createTestingPinia } from '@pinia/testing';
import AuthView from '@/views/AuthView.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(AuthView, {
	pinia: createTestingPinia(),
	global: {
		stubs: {
			SSOLogin: {
				template: '<div data-test-id="sso-login"></div>',
			},
		},
	},
});

describe('AuthView', () => {
	it('should render with subtitle', () => {
		const { getByText } = renderComponent({
			props: {
				subtitle: 'Some text',
			},
		});
		expect(getByText('Some text')).toBeInTheDocument();
	});

	it('should render without SSO component', () => {
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('sso-login')).not.toBeInTheDocument();
	});

	it('should render with SSO component', () => {
		const { getByTestId } = renderComponent({
			props: {
				withSso: true,
			},
		});
		expect(getByTestId('sso-login')).toBeInTheDocument();
	});
});
