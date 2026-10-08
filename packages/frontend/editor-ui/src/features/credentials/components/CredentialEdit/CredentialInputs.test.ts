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
			name: 'project',
			displayName: 'Project',
			type: 'options',
			options: [{ name: 'Custom', value: '__custom__' }],
			default: '__custom__',
			required: true,
			typeOptions: { loadOptionsMethod: 'projects', loadOptionsDependsOn: ['email', 'privateKey'] },
		},
	];
	const data = {
		email: 'service@example.com',
		privateKey: 'draft-key',
		region: 'global',
		project: '__custom__',
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
		'keeps manual entry available while loading all project pages for credential %s',
		async (credentialId) => {
			let resolveNextPage!: (result: INodeListSearchResult) => void;
			lookup.mockResolvedValueOnce({
				results: [{ name: 'First project (first-project)', value: 'first-project' }],
				paginationToken: 'next-page',
			});
			lookup.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveNextPage = resolve;
				}),
			);
			const credentialData = {
				...data,
				project: 'first-project',
				privateKey: credentialId ? CREDENTIAL_BLANKING_VALUE : 'draft-key',
			};
			const view = renderOptions({ props: { credentialId, credentialData } });
			const input = await view.findByLabelText('Project');
			await waitFor(() => expect(input).toHaveValue('First project (first-project)'));
			expect(view.getByRole('status')).toBeVisible();
			await userEvent.click(input);
			await userEvent.click(view.getByRole('option', { name: 'Custom' }));
			expect(view.emitted('update')).toContainEqual([{ name: 'project', value: '__custom__' }]);
			await view.rerender({
				credentialData: { ...credentialData, project: '__custom__' },
				credentialProperties: [
					...properties,
					{
						name: 'projectId',
						displayName: 'Project ID',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'my-project-id',
						displayOptions: { show: { project: ['__custom__'] } },
					},
				],
			});
			const manualProjectInput = view.getByPlaceholderText('my-project-id');
			expect(manualProjectInput).toHaveValue('saved-project');
			await fireEvent.update(manualProjectInput, 'manual-project');
			expect(view.emitted('update')).toContainEqual([
				{ name: 'projectId', value: 'manual-project' },
			]);
			expect(view.getByRole('status')).toBeVisible();
			resolveNextPage({
				results: [{ name: 'Target project (target-project)', value: 'target-project' }],
			});
			await waitFor(() => expect(view.queryByRole('status')).toBeNull());
			await userEvent.click(input);
			expect(await view.findByText('First project (first-project)')).toBeVisible();
			const updatesBeforeFiltering = view.emitted('update')?.slice();
			await userEvent.type(input, 'Target');
			expect(view.emitted('update')).toEqual(updatesBeforeFiltering);
			await userEvent.click(await view.findByText('Target project (target-project)'));
			expect(lookup).toHaveBeenLastCalledWith(
				expect.anything(),
				credentialId
					? { kind: 'stored', credentialId }
					: { kind: 'project', projectId: 'n8n-project' },
				{
					type: 'googleVertexAiApi',
					data: credentialData,
					propertyName: 'project',
					paginationToken: 'next-page',
				},
			);
			expect(view.emitted('update')).toContainEqual([{ name: 'project', value: 'target-project' }]);
		},
	);

	it('loads projects when both service account fields are filled without opening the list', async () => {
		const view = renderOptions({
			props: {
				showValidationWarnings: true,
				credentialData: { ...data, email: '', privateKey: '' },
			},
		});
		const input = await view.findByLabelText('Project');
		expect(input).toHaveValue('Custom');
		expect(input).toBeEnabled();
		expect(within(input.closest('form')!).queryByRole('alert')).toBeNull();
		expect(within(input.closest('form')!).queryByRole('status')).toBeNull();
		await view.rerender({ credentialData: { ...data, privateKey: '' } });
		expect(lookup).not.toHaveBeenCalled();
		await view.rerender({ credentialData: data });
		await waitFor(() => expect(lookup).toHaveBeenCalled());
		await waitFor(() => expect(input).toBeEnabled());
		expect(input).toHaveValue('Custom');
		await userEvent.click(input);
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
		const input = await view.findByLabelText('Project');
		await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1));
		await view.rerender({ credentialData: { ...data, privateKey: 'updated-key' } });
		await waitFor(() => expect(input).toBeEnabled());
		await userEvent.click(input);
		expect(await view.findByText('Target project (target-project)')).toBeVisible();
		resolveOldRequest({ results: [{ name: 'Outdated project', value: 'old-project' }] });
		await flushPromises();
		expect(view.queryByText('Outdated project')).toBeNull();
		await view.rerender({ credentialData: { ...data, privateKey: 'updated-key', region: 'eu' } });
		await userEvent.keyboard('{Escape}');
		expect(input).toHaveValue('Custom');
		await userEvent.click(input);
		expect(await view.findByText('Target project (target-project)')).toBeVisible();
		expect(lookup).toHaveBeenCalledTimes(2);
		expect(view.emitted('update')).toBeUndefined();
	});

	it.each(['failure', 'empty'])('silently keeps Custom after %s discovery', async (result) => {
		if (result === 'failure') lookup.mockRejectedValue(new Error('Permission denied'));
		if (result === 'empty') lookup.mockResolvedValue({ results: [] });
		const view = renderOptions();
		const input = await view.findByLabelText('Project');
		await waitFor(() => expect(input).toBeEnabled());
		expect(input).toHaveValue('Custom');
		expect(view.queryByRole('status')).toBeNull();
		expect(view.emitted('update')).toBeUndefined();
		await userEvent.click(input);
		expect(view.getAllByRole('option')).toHaveLength(1);
		await userEvent.click(await view.findByText('Custom'));
		expect(input).toHaveValue('Custom');
	});
});
