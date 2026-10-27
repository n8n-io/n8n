import { createTestingPinia } from '@pinia/testing';
import AuthView from './AuthView.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(AuthView, {
	pinia: createTestingPinia(),
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

	it('should render the form box when a form is passed', () => {
		const { getByTestId, getByText } = renderComponent({
			props: {
				form: { title: 'Form title', inputs: [] },
			},
		});
		expect(getByTestId('auth-form')).toBeInTheDocument();
		expect(getByText('Form title')).toBeInTheDocument();
	});

	it('should render the default slot in place of the form box', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				form: { title: 'Form title', inputs: [] },
			},
			slots: {
				default: '<div data-test-id="custom-card"></div>',
			},
		});
		expect(getByTestId('custom-card')).toBeInTheDocument();
		expect(queryByTestId('auth-form')).not.toBeInTheDocument();
	});
});
