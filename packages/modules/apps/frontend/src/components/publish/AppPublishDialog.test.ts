import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { getProject, type Project } from '@n8n/rest-api-client/api/projects';
import { flushPromises } from '@vue/test-utils';

import { PUBLISHED_URL, testApp, testVersion } from '../../__tests__/fixtures';
import { getAppPublishPreview, publishApp } from '../../apps.api';
import AppPublishDialog from './AppPublishDialog.vue';

vi.mock('../../apps.api');
vi.mock('@n8n/rest-api-client/api/projects', () => ({ getProject: vi.fn() }));

const renderComponent = createComponentRenderer(AppPublishDialog, {
	props: { open: true, app: testApp(), version: testVersion },
	global: {
		stubs: {
			AppLinkField: { props: ['url'], template: '<span data-test-id="link">{{ url }}</span>' },
		},
	},
});

describe('AppPublishDialog', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('suggests the app name as the version name and publishes the version', async () => {
		const published = testApp({ publishedVersionId: 'v2' });
		vi.mocked(publishApp).mockResolvedValue(published);
		const { emitted } = renderComponent();
		expect(await screen.findByTestId('app-publish-name')).toHaveValue('Expense tracker');

		await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
		expect(publishApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', {
			versionId: 'v2',
			label: 'Expense tracker',
			description: '',
			publishResources: true,
		});
		expect(emitted('updated')).toEqual([[published]]);
	});

	it('publishes the name and description in one request', async () => {
		vi.mocked(publishApp).mockResolvedValue(testApp());
		renderComponent();
		const name = await screen.findByTestId('app-publish-name');

		await userEvent.clear(name);
		await userEvent.type(name, 'Launch');
		await userEvent.type(screen.getByTestId('app-publish-description'), 'Adds charts');
		await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

		await waitFor(() => expect(publishApp).toHaveBeenCalledOnce());
		expect(publishApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', {
			versionId: 'v2',
			label: 'Launch',
			description: 'Adds charts',
			publishResources: true,
		});
	});

	it('starts from the label and description of the version', async () => {
		renderComponent({
			props: { version: { ...testVersion, label: 'Beta', description: 'First draft' } },
		});

		expect(await screen.findByTestId('app-publish-name')).toHaveValue('Beta');
		expect(screen.getByTestId('app-publish-description')).toHaveValue('First draft');
	});

	it('disables publish without a version name', async () => {
		renderComponent();

		await userEvent.clear(await screen.findByTestId('app-publish-name'));

		expect(screen.getByTestId('app-publish-dialog-confirm')).toBeDisabled();
		expect(screen.getByText('0/128')).toBeInTheDocument();
	});

	it('stays open and shows the error when the publish fails', async () => {
		vi.mocked(publishApp).mockRejectedValue(
			new Error('Could not publish "Sales": Credential is missing'),
		);
		const { emitted } = renderComponent();

		await userEvent.click(await screen.findByTestId('app-publish-dialog-confirm'));

		expect(await screen.findByTestId('app-publish-error')).toHaveTextContent(
			'Could not publish "Sales": Credential is missing',
		);
		expect(emitted('update:open')).toBeUndefined();
	});

	it('keeps the error visible while the next publish runs', async () => {
		vi.mocked(publishApp).mockRejectedValueOnce(new Error('Could not publish "Sales"'));
		let resolveSecond: (app: ReturnType<typeof testApp>) => void = () => {};
		vi.mocked(publishApp).mockReturnValueOnce(
			new Promise((done) => {
				resolveSecond = done;
			}),
		);
		renderComponent();
		await userEvent.click(await screen.findByTestId('app-publish-dialog-confirm'));
		await screen.findByTestId('app-publish-error');

		await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));
		expect(publishApp).toHaveBeenCalledTimes(2);

		expect(screen.getByTestId('app-publish-error')).toHaveTextContent('Could not publish "Sales"');

		resolveSecond(testApp());
		await flushPromises();
	});

	it('replaces the error with the new one when the next publish fails', async () => {
		vi.mocked(publishApp).mockRejectedValueOnce(new Error('Could not publish "Sales"'));
		vi.mocked(publishApp).mockRejectedValueOnce(new Error('Could not publish "Support"'));
		renderComponent();
		await userEvent.click(await screen.findByTestId('app-publish-dialog-confirm'));
		await screen.findByText('Could not publish "Sales"');

		await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

		expect(await screen.findByText('Could not publish "Support"')).toBeInTheDocument();
		expect(screen.queryByText('Could not publish "Sales"')).not.toBeInTheDocument();
	});

	describe('attached resources', () => {
		const sales = {
			key: 'sales',
			kind: 'workflow' as const,
			resourceId: 'workflow-1',
			name: 'Sales',
			published: false,
			hasChanges: false,
			canPublish: true,
		};
		const support = {
			key: 'support',
			kind: 'agent' as const,
			resourceId: 'agent-1',
			name: 'Support',
			published: false,
			hasChanges: false,
			canPublish: true,
		};

		it('lists the connections that will be published with a type icon', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({ resources: [sales, support] });
			renderComponent();

			const list = await screen.findByTestId('app-publish-connections');

			expect(list).toHaveTextContent(
				'When you publish the app, these connections will be published too',
			);
			expect(screen.getByTestId('app-publish-connection-sales')).toHaveTextContent('Sales');
			expect(screen.getByTestId('app-publish-connection-support')).toHaveTextContent('Support');
			expect(screen.getByTestId('app-publish-connection-sales-icon')).toBeInTheDocument();
			expect(screen.getByTestId('app-publish-connection-support-icon')).toBeInTheDocument();
			expect(screen.queryByTestId('app-publish-connections-skipped')).not.toBeInTheDocument();
			expect(getAppPublishPreview).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'app-1',
				'v2',
			);
		});

		it('lists the connections in the order that the server returns them', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({ resources: [sales, support] });
			renderComponent();
			await screen.findByTestId('app-publish-connections');

			const rows = screen.getAllByTestId(/^app-publish-connection-[a-z]+$/);

			expect(rows.map((row) => row.textContent?.trim())).toEqual(['Sales', 'Support']);
		});

		it('does not list a published connection, even with draft changes', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({
				resources: [{ ...sales, published: true, hasChanges: true }, support],
			});
			renderComponent();
			await screen.findByTestId('app-publish-connections');

			expect(screen.queryByTestId('app-publish-connection-sales')).not.toBeInTheDocument();
			expect(screen.getByTestId('app-publish-connection-support')).toBeInTheDocument();
		});

		it('shows no list when every connection is published', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({
				resources: [{ ...sales, published: true }],
			});
			renderComponent();
			await flushPromises();

			expect(screen.queryByTestId('app-publish-connections')).not.toBeInTheDocument();
			expect(screen.queryByTestId('app-publish-connections-skipped')).not.toBeInTheDocument();
		});

		it('always publishes the connections with the app', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({ resources: [sales] });
			vi.mocked(publishApp).mockResolvedValue(testApp());
			renderComponent();
			await screen.findByTestId('app-publish-connections');

			await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

			await waitFor(() =>
				expect(publishApp).toHaveBeenCalledWith(
					expect.anything(),
					'project-1',
					'app-1',
					expect.objectContaining({ publishResources: true }),
				),
			);
		});

		it('warns about a connection that the user cannot publish and still allows the publish', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({
				resources: [{ ...sales, canPublish: false }, support],
			});
			vi.mocked(publishApp).mockResolvedValue(testApp());
			renderComponent();

			const warning = await screen.findByTestId('app-publish-connections-skipped');

			expect(warning).toHaveTextContent("These connections can't be published yet");
			expect(warning).toHaveTextContent('Sales');
			expect(warning).not.toHaveTextContent('Support');
			expect(screen.getByTestId('app-publish-connections')).not.toHaveTextContent('Sales');
			expect(screen.getByTestId('app-publish-dialog-confirm')).toBeEnabled();

			await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

			await waitFor(() => expect(publishApp).toHaveBeenCalledOnce());
		});

		it('shows only the warning when no connection can be published', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({
				resources: [{ ...sales, canPublish: false }],
			});
			renderComponent();

			expect(await screen.findByTestId('app-publish-connections-skipped')).toBeInTheDocument();
			expect(screen.queryByTestId('app-publish-connections')).not.toBeInTheDocument();
		});

		it('warns and still publishes when the preview cannot be loaded', async () => {
			vi.mocked(getAppPublishPreview).mockRejectedValue(new Error('offline'));
			vi.mocked(publishApp).mockResolvedValue(testApp());
			renderComponent();

			expect(await screen.findByTestId('app-publish-resources-error')).toBeInTheDocument();
			expect(screen.queryByTestId('app-publish-connections')).not.toBeInTheDocument();

			await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

			await waitFor(() => expect(publishApp).toHaveBeenCalledOnce());
		});

		it('ignores an older preview response that arrives after a newer one', async () => {
			type Preview = { resources: Array<typeof sales | typeof support> };
			let resolveFirst: (value: Preview) => void = () => {};
			vi.mocked(getAppPublishPreview).mockReturnValueOnce(
				new Promise((done) => {
					resolveFirst = done;
				}),
			);
			vi.mocked(getAppPublishPreview).mockResolvedValueOnce({ resources: [support] });
			vi.mocked(publishApp).mockRejectedValue(new Error('denied'));
			renderComponent();

			await userEvent.click(await screen.findByTestId('app-publish-dialog-confirm'));
			await screen.findByTestId('app-publish-connection-support');
			resolveFirst({ resources: [sales, support] });

			await flushPromises();

			expect(getAppPublishPreview).toHaveBeenCalledTimes(2);
			expect(screen.queryByTestId('app-publish-connection-sales')).not.toBeInTheDocument();
			expect(screen.getByTestId('app-publish-connection-support')).toBeInTheDocument();
		});

		it('reloads the list after a failed publish', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValueOnce({ resources: [sales, support] });
			vi.mocked(publishApp).mockRejectedValue(new Error('Could not publish "Support": denied'));
			renderComponent();
			await screen.findByTestId('app-publish-connection-sales');
			vi.mocked(getAppPublishPreview).mockResolvedValueOnce({ resources: [support] });

			await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

			await waitFor(() =>
				expect(screen.queryByTestId('app-publish-connection-sales')).not.toBeInTheDocument(),
			);
			expect(screen.getByTestId('app-publish-connection-support')).toBeInTheDocument();
			expect(getAppPublishPreview).toHaveBeenCalledTimes(2);
		});
	});

	describe('availability', () => {
		it('names the project of the app', async () => {
			vi.mocked(getProject).mockResolvedValue({
				id: 'project-1',
				name: 'Sales',
				type: 'team',
			} as Project);
			renderComponent();

			const line = await screen.findByText('Sales');

			expect(line.tagName).toBe('STRONG');
			expect(screen.getByTestId('app-publish-availability')).toHaveTextContent(
				'This app will be available to everyone in the Sales project',
			);
			expect(getProject).toHaveBeenCalledWith(expect.anything(), 'project-1');
		});

		it('names a personal project Personal', async () => {
			vi.mocked(getProject).mockResolvedValue({
				id: 'project-1',
				name: 'Jane Doe <jane@example.com>',
				type: 'personal',
			} as Project);
			renderComponent();

			await waitFor(() =>
				expect(screen.getByTestId('app-publish-availability')).toHaveTextContent(
					'This app will be available to everyone in the Personal project',
				),
			);
		});

		it('falls back to this project when the project cannot be loaded', async () => {
			vi.mocked(getProject).mockRejectedValue(new Error('offline'));
			renderComponent();
			await flushPromises();

			expect(screen.getByTestId('app-publish-availability')).toHaveTextContent(
				'This app will be available to everyone in this project',
			);
		});

		it('says the whole instance for an app that the whole instance can open', async () => {
			vi.mocked(getProject).mockResolvedValue({
				id: 'project-1',
				name: 'Sales',
				type: 'team',
			} as Project);
			renderComponent({ props: { app: testApp({ visibility: 'instance' }) } });
			await flushPromises();

			expect(screen.getByTestId('app-publish-availability')).toHaveTextContent(
				'This app will be available to everyone in your n8n instance',
			);
		});

		it('has no access control', async () => {
			renderComponent();
			await screen.findByTestId('app-publish-name');

			expect(screen.queryByText('Who can open it')).not.toBeInTheDocument();
		});
	});

	it('shows the link only for a published app', async () => {
		const { rerender } = renderComponent();
		await screen.findByTestId('app-publish-name');
		expect(screen.queryByTestId('link')).not.toBeInTheDocument();

		await rerender({ app: testApp({ publishedVersionId: 'v1', publishedUrl: PUBLISHED_URL }) });

		expect(await screen.findByTestId('link')).toHaveTextContent(PUBLISHED_URL);
	});
});
