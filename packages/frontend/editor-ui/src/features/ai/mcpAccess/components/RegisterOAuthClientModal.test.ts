import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import RegisterOAuthClientModal from '@/features/ai/mcpAccess/components/RegisterOAuthClientModal.vue';
import { createOAuthClient } from '@/features/ai/mcpAccess/mcp.test.utils';

const createComponent = createComponentRenderer(RegisterOAuthClientModal, {
	pinia: createTestingPinia(),
});

/** The dialog renders outside the component root, so queries go through the document. */
const inDialog = (testId: string) =>
	document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`);

const input = (testId: string) => {
	const element = inDialog(testId);
	const field = element?.tagName === 'INPUT' ? element : element?.querySelector('input');
	if (!field) throw new Error(`No input for ${testId}`);
	return field as HTMLInputElement;
};

const renderOpen = async (props: Record<string, unknown> = {}) => {
	const rendered = createComponent({ props: { open: true, ...props } });
	await waitFor(() => expect(inDialog('mcp-register-client-modal')).not.toBeNull());
	return rendered;
};

describe('RegisterOAuthClientModal', () => {
	it('should open with an empty form, without pre-filling any client', async () => {
		await renderOpen();

		expect(input('mcp-register-client-name').value).toBe('');
		expect(input('mcp-register-client-redirect-uri-0').value).toBe('');
	});

	it('should emit the entered name and callback URL', async () => {
		const { emitted } = await renderOpen();

		await userEvent.type(input('mcp-register-client-name'), '  My Client  ');
		await userEvent.type(
			input('mcp-register-client-redirect-uri-0'),
			'https://example.com/oauth/callback',
		);
		await userEvent.click(inDialog('mcp-register-client-submit')!);

		expect(emitted('submit')).toEqual([
			[
				{
					name: 'My Client',
					redirectUris: ['https://example.com/oauth/callback'],
					confidential: false,
				},
			],
		]);
	});

	it('should reject a non-loopback http callback URL without emitting', async () => {
		const { emitted } = await renderOpen();

		await userEvent.type(input('mcp-register-client-name'), 'My Client');
		await userEvent.type(
			input('mcp-register-client-redirect-uri-0'),
			'http://example.com/callback',
		);
		await userEvent.click(inDialog('mcp-register-client-submit')!);

		await waitFor(() =>
			expect(inDialog('mcp-register-client-error')).toHaveTextContent('HTTPS required'),
		);
		expect(emitted('submit')).toBeUndefined();
	});

	it('should require a name and a callback URL', async () => {
		const { emitted } = await renderOpen();

		await userEvent.click(inDialog('mcp-register-client-submit')!);

		await waitFor(() => expect(inDialog('mcp-register-client-error')).not.toBeNull());
		expect(emitted('submit')).toBeUndefined();
	});

	it('should add and remove callback URL rows', async () => {
		await renderOpen();

		await userEvent.click(inDialog('mcp-register-client-add-redirect-uri')!);
		await waitFor(() => expect(inDialog('mcp-register-client-redirect-uri-1')).not.toBeNull());

		await userEvent.click(inDialog('mcp-register-client-remove-redirect-uri-1')!);
		await waitFor(() => expect(inDialog('mcp-register-client-redirect-uri-1')).toBeNull());
	});

	it('should pre-fill the existing values when editing', async () => {
		await renderOpen({
			client: createOAuthClient({
				name: 'Existing Client',
				redirectUris: ['https://example.com/callback'],
				registration: 'manual',
			}),
		});

		expect(input('mcp-register-client-name').value).toBe('Existing Client');
		expect(input('mcp-register-client-redirect-uri-0').value).toBe('https://example.com/callback');
	});

	const createdClient = (overrides: Record<string, unknown> = {}) => ({
		id: 'generated-client-id',
		name: 'Claude',
		redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
		grantTypes: ['authorization_code', 'refresh_token'],
		tokenEndpointAuthMethod: 'none',
		createdAt: '2025-09-09T14:14:04.155Z',
		updatedAt: '2025-09-09T14:14:04.155Z',
		registration: 'manual' as const,
		...overrides,
	});

	it('should show the generated client id on the result step', async () => {
		await renderOpen({ createdClient: createdClient() });

		const result = inDialog('mcp-register-client-result');
		expect(result).not.toBeNull();
		expect(result?.querySelector<HTMLInputElement>('input')?.value).toBe('generated-client-id');
		expect(result).toHaveTextContent('This client has no secret');
		expect(inDialog('mcp-register-client-submit')).toBeNull();
	});

	it('should request a secret when the confidential option is ticked', async () => {
		const { emitted } = await renderOpen();

		await userEvent.type(input('mcp-register-client-name'), 'Server Connector');
		await userEvent.type(
			input('mcp-register-client-redirect-uri-0'),
			'https://example.com/oauth/callback',
		);
		await userEvent.click(inDialog('mcp-register-client-confidential')!);
		await userEvent.click(inDialog('mcp-register-client-submit')!);

		expect(emitted('submit')[0]).toEqual([
			{
				name: 'Server Connector',
				redirectUris: ['https://example.com/oauth/callback'],
				confidential: true,
			},
		]);
	});

	it('should reveal a generated secret once, with the copy-now warning', async () => {
		await renderOpen({
			createdClient: createdClient({
				tokenEndpointAuthMethod: 'client_secret_post',
				clientSecret: 'generated-secret',
			}),
		});

		const result = inDialog('mcp-register-client-result');
		const values = [...(result?.querySelectorAll<HTMLInputElement>('input') ?? [])].map(
			(field) => field.value,
		);
		expect(values).toContain('generated-secret');
		expect(result).toHaveTextContent('not shown again');
		expect(result).not.toHaveTextContent('This client has no secret');
	});

	it('should offer replacing the secret of a confidential client when editing', async () => {
		const client = createOAuthClient({
			name: 'Server Connector',
			registration: 'manual',
			canManage: true,
			tokenEndpointAuthMethod: 'client_secret_post',
		});
		const { emitted } = await renderOpen({ client });

		expect(inDialog('mcp-register-client-confidential')).toBeNull();
		await userEvent.click(inDialog('mcp-register-client-rotate-secret')!);

		expect(emitted('rotateSecret')[0]).toEqual([client]);
	});

	it('should not offer replacing a secret for a public client', async () => {
		await renderOpen({
			client: createOAuthClient({
				registration: 'manual',
				canManage: true,
				tokenEndpointAuthMethod: 'none',
			}),
		});

		expect(inDialog('mcp-register-client-rotate-secret')).toBeNull();
	});
});
