import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import AuthView from '@/views/AuthView.vue';

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		AuthView,
		merge(
			{
				pinia: createTestingPinia(),
				stubs: {
					SSOLogin: {
						template: '<div data-test-id="sso-login"></div>',
					},
				},
			},
			renderOptions,
		),
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);

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
