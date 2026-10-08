import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import {
	CREDENTIAL_BLANKING_VALUE,
	type INodeProperties,
	type INodeListSearchResult,
} from 'n8n-workflow';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialInputs from './CredentialInputs.vue';
import { getCredentialOptions } from '../../credentials.api';

vi.mock('../../credentials.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getCredentialOptions: vi.fn(),
}));

const renderComponent = createComponentRenderer(CredentialInputs);

describe('compact CredentialInputs', () => {
	beforeEach(() => setActivePinia(createTestingPinia()));

	it('preserves multiline private keys and validates required fields only after submission', async () => {
		const rendered = renderComponent({
			props: {
				compact: true,
				credentialData: { privateKey: '' },
				documentationUrl: '',
				credentialProperties: [
					{
						name: 'privateKey',
						displayName: 'Private key',
						type: 'string',
						required: true,
						default: '',
						typeOptions: { rows: 4, password: true },
					},
				],
			},
		});
		const input = rendered.getByLabelText('Private key');
		expect(input.tagName).toBe('TEXTAREA');
		expect(input).toHaveAttribute('rows', '4');
		expect(rendered.queryByRole('alert')).toBeNull();
		await fireEvent.blur(input);
		expect(rendered.queryByRole('alert')).toBeNull();
		await rendered.rerender({ showValidationWarnings: true });
		expect(rendered.getByRole('alert')).toHaveTextContent('This field is required');
		const key = '-----BEGIN PRIVATE KEY-----\nexample\n-----END PRIVATE KEY-----';
		await fireEvent.update(input, key);
		expect(rendered.emitted('update')).toContainEqual([{ name: 'privateKey', value: key }]);
		await rendered.rerender({ credentialData: { privateKey: key } });
		expect(rendered.queryByRole('alert')).toBeNull();
		expect(input).toHaveValue(key);
	});

	it('keeps compact OAuth labels visible and focuses their inputs on click', async () => {
		const rendered = renderComponent({
			props: {
				compact: true,
				credentialType: 'oAuth2Api',
				documentationUrl: '',
				credentialData: { clientId: '', clientSecret: '' },
				credentialProperties: [
					{
						name: 'clientId',
						displayName: 'Client ID',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'app-client-id',
					},
					{
						name: 'clientSecret',
						displayName: 'Client Secret',
						type: 'string',
						default: '',
						required: true,
						typeOptions: { password: true },
					},
				],
			},
		});
		const client = rendered.getByRole('textbox', { name: 'Client ID' });
		const clientLabel = rendered.getByText('Client ID');
		const secretLabel = rendered.getByText('Client Secret');
		expect(clientLabel.closest('label')).toHaveAttribute('for', client.id);
		expect(clientLabel).toBeVisible();
		expect(secretLabel).toBeVisible();
		expect(client).toHaveAttribute('placeholder', 'app-client-id');
		expect(rendered.getByLabelText('Client Secret')).toHaveAttribute('type', 'password');
		await userEvent.click(clientLabel);
		expect(client).toHaveFocus();
		await fireEvent.update(client, 'app-client');
		expect(rendered.emitted('update')).toContainEqual([{ name: 'clientId', value: 'app-client' }]);
		await rendered.rerender({
			credentialData: { clientId: 'app-client', clientSecret: 'demo-secret' },
		});
		expect(clientLabel).toBeVisible();
		expect(secretLabel).toBeVisible();
	});
});

describe('credential project options', () => {
	const properties: INodeProperties[] = [
		{
			name: 'email',
			displayName: 'Service Account Email',
			type: 'string',
			default: '',
			required: true,
		},
		{
			name: 'privateKey',
			displayName: 'Private Key',
			type: 'string',
			default: '',
			required: true,
			typeOptions: { password: true },
		},
		{
			name: 'projectId',
			displayName: 'Project ID',
			type: 'string',
			default: '',
			required: true,
			typeOptions: { loadOptionsMethod: 'projects', loadOptionsDependsOn: ['email', 'privateKey'] },
		},
	];
	const data = {
		email: 'service@example.com',
		privateKey: 'draft-key',
		region: 'global',
		projectId: 'saved-project',
	};
	const renderOptions = createComponentRenderer(CredentialInputs, {
		props: {
			credentialProperties: properties,
			credentialData: data,
			documentationUrl: '',
			credentialType: 'googleVertexAiApi',
			n8nProjectId: 'n8n-project',
		},
	});
	const lookup = vi.mocked(getCredentialOptions);

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		lookup.mockReset();
		lookup.mockResolvedValue({
			results: [{ name: 'Target project (target-project)', value: 'target-project' }],
		});
	});

	it.each([undefined, 'saved-credential'])(
		'loads all project pages without a workflow for credential %s',
		async (credentialId) => {
			lookup.mockResolvedValueOnce({
				results: [{ name: 'First project (first-project)', value: 'first-project' }],
				paginationToken: 'next-page',
			});
			const credentialData = {
				...data,
				privateKey: credentialId ? CREDENTIAL_BLANKING_VALUE : 'draft-key',
			};
			const view = renderOptions({ props: { credentialId, credentialData } });
			const input = await view.findByLabelText('Project ID');
			expect(input).toHaveValue('saved-project');
			await userEvent.click(input);
			expect(await view.findByText('First project (first-project)')).toBeVisible();
			await userEvent.click(await view.findByText('Target project (target-project)'));
			expect(lookup).toHaveBeenLastCalledWith(
				expect.anything(),
				credentialId
					? { kind: 'stored', credentialId }
					: { kind: 'project', projectId: 'n8n-project' },
				{
					type: 'googleVertexAiApi',
					data: credentialData,
					propertyName: 'projectId',
					paginationToken: 'next-page',
				},
			);
			expect(view.emitted('update')).toContainEqual([
				{ name: 'projectId', value: 'target-project' },
			]);
		},
	);

	it('waits for the service account fields and validates an empty project', async () => {
		const view = renderOptions({
			props: {
				showValidationWarnings: true,
				credentialData: { ...data, email: '', privateKey: '', projectId: '' },
			},
		});
		const input = await view.findByLabelText('Project ID');
		expect(within(input.closest('form')!).getByRole('alert')).toHaveTextContent(
			'This field is required',
		);
		await userEvent.click(input);
		expect(lookup).not.toHaveBeenCalled();
		await view.rerender({ credentialData: data });
		expect(await view.findByText('Target project (target-project)')).toBeVisible();
	});

	it('discards old results and keeps the project and cached options when Region changes', async () => {
		let resolveOldRequest!: (result: INodeListSearchResult) => void;
		lookup.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveOldRequest = resolve;
			}),
		);
		const view = renderOptions();
		const input = await view.findByLabelText('Project ID');
		await userEvent.click(input);
		await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1));
		await view.rerender({ credentialData: { ...data, privateKey: 'updated-key' } });
		expect(await view.findByText('Target project (target-project)')).toBeVisible();
		resolveOldRequest({ results: [{ name: 'Outdated project', value: 'old-project' }] });
		await flushPromises();
		expect(view.queryByText('Outdated project')).toBeNull();
		await view.rerender({ credentialData: { ...data, privateKey: 'updated-key', region: 'eu' } });
		await userEvent.keyboard('{Escape}');
		expect(input).toHaveValue('saved-project');
		await userEvent.click(input);
		expect(await view.findByText('Target project (target-project)')).toBeVisible();
		expect(lookup).toHaveBeenCalledTimes(2);
		expect(view.emitted('update')).toBeUndefined();
	});

	it.each(['failure', 'empty', 'loading'])(
		'accepts a typed project ID during %s discovery',
		async (result) => {
			if (result === 'failure') lookup.mockRejectedValue(new Error('Permission denied'));
			if (result === 'empty') lookup.mockResolvedValue({ results: [] });
			if (result === 'loading') lookup.mockReturnValue(new Promise(() => {}));
			const view = renderOptions({ props: { credentialData: { ...data, projectId: '' } } });
			const input = await view.findByLabelText('Project ID');
			await userEvent.type(input, 'manual-project');
			expect(view.emitted('update')).toContainEqual([
				{ name: 'projectId', value: 'manual-project' },
			]);
			await view.rerender({ credentialData: { ...data, projectId: 'manual-project' } });
			await userEvent.keyboard('{Escape}');
			expect(input).toHaveValue('manual-project');
		},
	);
});
