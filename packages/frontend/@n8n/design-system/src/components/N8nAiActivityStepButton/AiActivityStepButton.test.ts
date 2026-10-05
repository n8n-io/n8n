import { render } from '@testing-library/vue';
import AiActivityStepButton from './AiActivityStepButton.vue';

describe('AiActivityStepButton', () => {
	it('keeps the label and trailing content in a full-width header', () => {
		const label = 'Check the status of all outstanding background tasks';
		const { getByRole, getByText } = render(AiActivityStepButton, {
			props: { fullWidth: true },
			slots: { default: label, suffix: '<span>12:34</span>' },
		});
		expect(getByRole('button')).toHaveTextContent(label);
		expect(getByText('12:34')).toBeVisible();
	});
});
