import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AvatarSourcePicker, { type AvatarOrbOption } from './AvatarSourcePicker.vue';

const options: AvatarOrbOption[] = [
	{ value: 'sso', label: 'From Google', face: { kind: 'image', url: '/sso.png' } },
	{
		value: 'generated',
		label: 'Generated',
		face: { kind: 'generated', variant: 'marble', seed: 'seed', colors: ['#f00', '#0f0'] },
	},
	{ value: 'upload', label: 'Uploaded', face: { kind: 'empty' } },
];

const renderComponent = createComponentRenderer(AvatarSourcePicker, {
	props: { modelValue: 'generated', options, label: 'Picture' },
});

describe('AvatarSourcePicker', () => {
	it('should expose the orbs as one radio group with the chosen orb checked', () => {
		const { getByRole, getAllByRole } = renderComponent();

		expect(getByRole('radiogroup', { name: 'Picture' })).toBeInTheDocument();
		expect(getAllByRole('radio')).toHaveLength(3);
		expect(getByRole('radio', { name: 'Generated' })).toBeChecked();
		expect(getByRole('radio', { name: 'From Google' })).not.toBeChecked();
	});

	it('should be a single tab stop on the chosen orb', () => {
		const { getByRole } = renderComponent();

		expect(getByRole('radio', { name: 'Generated' })).toHaveAttribute('tabindex', '0');
		expect(getByRole('radio', { name: 'From Google' })).toHaveAttribute('tabindex', '-1');
		expect(getByRole('radio', { name: 'Uploaded' })).toHaveAttribute('tabindex', '-1');
	});

	it('should choose an orb on click, and not re-emit for the chosen one', async () => {
		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('radio', { name: 'Uploaded' }));
		await userEvent.click(getByRole('radio', { name: 'Generated' }));

		expect(emitted('update:modelValue')).toEqual([['upload']]);
	});

	it('should move to the neighbouring orb and choose it with the arrow keys', async () => {
		const { getByRole, emitted } = renderComponent();

		getByRole('radio', { name: 'Generated' }).focus();
		await userEvent.keyboard('{ArrowRight}');

		expect(emitted('update:modelValue')).toEqual([['upload']]);
		expect(getByRole('radio', { name: 'Uploaded' })).toHaveFocus();
	});

	it('should wrap around at the ends and jump with Home and End', async () => {
		const { getByRole, emitted } = renderComponent({ props: { modelValue: 'upload' } });

		getByRole('radio', { name: 'Uploaded' }).focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(getByRole('radio', { name: 'From Google' })).toHaveFocus();

		await userEvent.keyboard('{End}');
		expect(getByRole('radio', { name: 'Uploaded' })).toHaveFocus();

		await userEvent.keyboard('{Home}');
		expect(getByRole('radio', { name: 'From Google' })).toHaveFocus();

		// `modelValue` stays 'upload' here, so End chooses nothing new.
		expect(emitted('update:modelValue')).toEqual([['sso'], ['sso']]);
	});

	it('should not respond while disabled', async () => {
		const { getByRole, emitted } = renderComponent({ props: { disabled: true } });

		await userEvent.click(getByRole('radio', { name: 'Uploaded' }));

		expect(getByRole('radio', { name: 'Uploaded' })).toBeDisabled();
		expect(emitted('update:modelValue')).toBeUndefined();
	});
});
