import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import OauthButton from '@/components/CredentialEdit/OauthButton.vue';

const renderComponent = createComponentRenderer(OauthButton, {
	pinia: createTestingPinia(),
});

describe('OauthButton', () => {
	test.each([
		['GoogleAuthButton', true],
		['n8n-button', false],
	])('should emit click event only once when %s is clicked', async (name, isGoogleOAuthType) => {
		const { emitted, getByRole } = renderComponent({
			props: { isGoogleOAuthType },
		});

		const button = getByRole('button');
		await userEvent.click(button);

		expect(emitted().click).toHaveLength(1);
	});
});
