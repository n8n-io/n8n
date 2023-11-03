import SetupView from '@/views/SetupView.vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';

const renderComponent = createComponentRenderer(SetupView, {
	pinia: createTestingPinia(),
});

describe('SetupView', () => {
	it('Should render all elements', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('auth-form')).toBeInTheDocument();
		expect(getByTestId('email')).toBeInTheDocument();
		expect(getByTestId('firstName')).toBeInTheDocument();
		expect(getByTestId('lastName')).toBeInTheDocument();
		expect(getByTestId('password')).toBeInTheDocument();
		expect(getByTestId('agree')).toBeInTheDocument();
		expect(getByTestId('form-submit-button')).toBeInTheDocument();
	});

	it('Should validate inputs', async () => {
		const user = userEvent.setup();
		const { getByTestId, getByText } = renderComponent();
		const inputs = ['email', 'firstName', 'lastName', 'password'];
		const errorMessages = [
			'Must be a valid email',
			'Invalid First Name',
			'Invalid Last Name',
			'8+ characters, at least 1 number and 1 capital letter',
		];
		const testValues = ['test', 'https://n8n.io', 'https://n8n.io', '123'];

		for (let i = 0; i < inputs.length; i++) {
			const inputElement = getByTestId(inputs[i]).querySelector('input');
			if (!inputElement) {
				throw new Error(`${inputs[i]} input not found`);
			}
			await user.type(inputElement, testValues[i]);
			await user.click(getByTestId('auth-form'));
			expect(getByText(errorMessages[i])).toBeInTheDocument();
		}
	});
});
