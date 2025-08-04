import FormBox from './FormBox.vue';
import { createComponentRenderer } from '../../__tests__/render';

const render = createComponentRenderer(FormBox);

describe('FormBox', () => {
	it('should render the component', () => {
		const { container } = render({
			props: {
				title: 'Title',
				inputs: [
					{
						name: 'name',
						properties: {
							label: 'Name',
							type: 'text',
							required: true,
							showRequiredAsterisk: true,
							validateOnBlur: false,
							autocomplete: 'email',
							capitalize: true,
							labelSize: 'small',
							tagSize: 'small',
						},
					},
					{
						name: 'email',
						properties: {
							label: 'Email',
							type: 'email',
							required: true,
							showRequiredAsterisk: true,
							validateOnBlur: false,
							autocomplete: 'email',
							capitalize: true,
							labelSize: 'medium',
							tagSize: 'medium',
						},
					},
					{
						name: 'password',
						properties: {
							label: 'Password',
							type: 'password',
							required: true,
							showRequiredAsterisk: true,
							validateOnBlur: false,
							autocomplete: 'current-password',
							capitalize: true,
						},
					},
				],
			},
		});
		expect(container).toMatchSnapshot();
	});
});
