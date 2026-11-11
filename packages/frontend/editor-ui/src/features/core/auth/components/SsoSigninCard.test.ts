import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import SsoSigninCard from './SsoSigninCard.vue';
import type { IFormBoxConfig } from '@/Interface';

vi.mock('vue-router', () => ({
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

const form: IFormBoxConfig = {
	title: 'Sign in',
	buttonText: 'Sign in',
	redirectText: 'Forgot my password',
	redirectLink: '/forgot-password',
	inputs: [
		{
			name: 'emailOrLdapLoginId',
			properties: { label: 'Email', type: 'email', required: true },
		},
		{
			name: 'password',
			properties: { label: 'Password', type: 'password', required: true },
		},
	],
};

const renderComponent = createComponentRenderer(SsoSigninCard, {
	pinia: createTestingPinia(),
	props: { form },
});

const getEmailInput = (container: Element) =>
	container.querySelector<HTMLInputElement>('input[type="email"]');

describe('SsoSigninCard', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should lead with the SSO button and keep the password form collapsed', () => {
		const { getByRole, getByText, container } = renderComponent();

		expect(getByRole('button', { name: 'Continue with SSO' })).toBeVisible();
		expect(getByText('Your organization uses single sign-on (SSO).')).toBeVisible();
		expect(getByRole('button', { name: /sign in with email and password/i })).toHaveAttribute(
			'aria-expanded',
			'false',
		);
		expect(getEmailInput(container)).not.toBeVisible();
	});

	it('should reveal the password form when the disclosure is clicked', async () => {
		const { getByRole, getByText, container } = renderComponent();

		const disclosure = getByRole('button', { name: /sign in with email and password/i });
		await userEvent.click(disclosure);

		expect(disclosure).toHaveAttribute('aria-expanded', 'true');
		const controlledContent = document.getElementById(
			disclosure.getAttribute('aria-controls') ?? '',
		);
		expect(controlledContent).toContainElement(getEmailInput(container));
		expect(getEmailInput(container)).toBeVisible();
		expect(container.querySelector('input[type="password"]')).toBeVisible();
		expect(getByRole('button', { name: 'Sign in' })).toBeVisible();
		expect(getByText('Forgot my password')).toBeVisible();
	});

	it('should focus the email field when the disclosure opens', async () => {
		const { getByRole, container } = renderComponent();

		await userEvent.click(getByRole('button', { name: /sign in with email and password/i }));

		await waitFor(() => expect(getEmailInput(container)).toHaveFocus());
	});

	it('should keep the entered credentials when the disclosure is closed and reopened', async () => {
		const { getByRole, emitted, container } = renderComponent({
			props: { defaultExpanded: true },
		});
		const disclosure = getByRole('button', { name: /sign in with email and password/i });
		const emailInput = getEmailInput(container);
		const passwordInput = container.querySelector('input[type="password"]');
		if (!emailInput || !passwordInput) {
			throw new Error('Inputs not found');
		}

		await userEvent.type(emailInput, 'test@n8n.io');
		await userEvent.type(passwordInput, 'password');
		await userEvent.click(disclosure);
		expect(emailInput).not.toBeVisible();
		await userEvent.click(disclosure);
		expect(emailInput).toBeVisible();
		expect(emailInput).toHaveValue('test@n8n.io');

		await userEvent.click(getByRole('button', { name: 'Sign in' }));

		expect(emitted('submit')).toEqual([
			[{ emailOrLdapLoginId: 'test@n8n.io', password: 'password' }],
		]);
	});

	it('should start with the password form revealed and focused when defaultExpanded is set', async () => {
		const { container } = renderComponent({ props: { defaultExpanded: true } });

		expect(getEmailInput(container)).toBeVisible();
		await waitFor(() => expect(getEmailInput(container)).toHaveFocus());
	});

	it('should emit ssoLogin from the primary button', async () => {
		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button', { name: 'Continue with SSO' }));

		expect(emitted('ssoLogin')).toHaveLength(1);
	});

	it('should emit submit with the entered credentials', async () => {
		const { getByRole, emitted, container } = renderComponent({
			props: { defaultExpanded: true },
		});
		const emailInput = getEmailInput(container);
		const passwordInput = container.querySelector('input[type="password"]');
		if (!emailInput || !passwordInput) {
			throw new Error('Inputs not found');
		}

		await userEvent.type(emailInput, 'test@n8n.io');
		await userEvent.type(passwordInput, 'password');
		await userEvent.click(getByRole('button', { name: 'Sign in' }));

		expect(emitted('submit')).toEqual([
			[{ emailOrLdapLoginId: 'test@n8n.io', password: 'password' }],
		]);
	});

	it('should show the SSO-required callout with its own SSO action', async () => {
		const { getByTestId, queryByTestId, rerender, emitted } = renderComponent({
			props: { defaultExpanded: true },
		});
		expect(queryByTestId('sso-required-callout')).not.toBeInTheDocument();

		await rerender({ form, defaultExpanded: true, ssoRequired: true });

		const callout = getByTestId('sso-required-callout');
		expect(callout).toBeVisible();
		await waitFor(() => expect(callout).toHaveFocus());
		expect(within(callout).getByText('Your account uses single sign-on (SSO)')).toBeVisible();
		expect(
			within(callout).getByText("Password sign-in isn't available for this account."),
		).toBeVisible();

		await userEvent.click(within(callout).getByRole('button', { name: 'Continue with SSO' }));

		expect(emitted('ssoLogin')).toHaveLength(1);
	});
});
