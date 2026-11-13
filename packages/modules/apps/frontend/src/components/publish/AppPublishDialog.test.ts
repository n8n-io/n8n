import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import { PUBLISHED_URL, testApp, testVersion } from '../../__tests__/fixtures';
import { getAppPublishPreview, publishApp } from '../../apps.api';
import AppPublishDialog from './AppPublishDialog.vue';

vi.mock('../../apps.api');

const renderComponent = createComponentRenderer(AppPublishDialog, {
	props: { open: true, app: testApp(), version: testVersion },
	global: {
		stubs: {
			RouterLink: {
				props: ['to'],
				template: '<a :data-route="JSON.stringify(to)"><slot /></a>',
			},
			AppLinkField: { props: ['url'], template: '<span data-test-id="link">{{ url }}</span>' },
			AppVisibilitySelect: {
				props: ['modelValue'],
				emits: ['update:modelValue'],
				template:
					'<button data-test-id="visibility" @click="$emit(\'update:modelValue\', \'instance\')">{{ modelValue }}</button>',
			},
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
			visibility: undefined,
			publishResources: true,
		});
		expect(emitted('updated')).toEqual([[published]]);
	});

	it('publishes the name, description and a changed visibility in one request', async () => {
		vi.mocked(publishApp).mockResolvedValue(testApp({ visibility: 'instance' }));
		renderComponent();
		const name = await screen.findByTestId('app-publish-name');

		await userEvent.clear(name);
		await userEvent.type(name, 'Launch');
		await userEvent.type(screen.getByTestId('app-publish-description'), 'Adds charts');
		await userEvent.click(screen.getByTestId('visibility'));
		await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

		await waitFor(() => expect(publishApp).toHaveBeenCalledOnce());
		expect(publishApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', {
			versionId: 'v2',
			label: 'Launch',
			description: 'Adds charts',
			visibility: 'instance',
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

		it('checks the publish-all checkbox by default and lists the resources with a type icon', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({ resources: [sales, support] });
			renderComponent();

			const list = await screen.findByTestId('app-publish-resources-list');

			expect(list).toHaveTextContent('Resources to be published');
			expect(list).toHaveTextContent('Sales');
			expect(list).toHaveTextContent('Support');
			expect(screen.getByTestId('app-publish-resource-sales-icon')).toBeInTheDocument();
			expect(screen.getByTestId('app-publish-resource-support-icon')).toBeInTheDocument();
			expect(screen.getByTestId('app-publish-resources')).toBeChecked();
			expect(getAppPublishPreview).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'app-1',
				'v2',
			);
		});

		it('hides the list when the box is unchecked and shows it again when checked', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({ resources: [sales] });
			renderComponent();
			await screen.findByTestId('app-publish-resources-list');

			await userEvent.click(screen.getByTestId('app-publish-resources'));
			expect(screen.queryByTestId('app-publish-resources-list')).not.toBeInTheDocument();

			await userEvent.click(screen.getByTestId('app-publish-resources'));
			expect(screen.getByTestId('app-publish-resources-list')).toBeInTheDocument();
		});

		it('shows the list while the preview loads', async () => {
			let resolve: (value: { resources: Array<typeof sales> }) => void = () => {};
			vi.mocked(getAppPublishPreview).mockReturnValue(
				new Promise((done) => {
					resolve = done;
				}),
			);
			renderComponent();

			expect(await screen.findByTestId('app-publish-resources-list')).toBeInTheDocument();
			expect(screen.queryByTestId('app-publish-resource-sales')).not.toBeInTheDocument();

			resolve({ resources: [sales] });

			expect(await screen.findByTestId('app-publish-resource-sales')).toBeInTheDocument();
		});

		it('lists the resources in the order that the server returns them', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({ resources: [sales, support] });
			renderComponent();
			await screen.findByTestId('app-publish-resources-list');

			const rows = screen.getAllByTestId(/^app-publish-resource-[a-z]+$/);

			expect(rows.map((row) => row.textContent)).toEqual(['Sales', 'Support']);
		});

		it('links each resource to its page in a new tab', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({ resources: [sales, support] });
			renderComponent();

			const workflowLink = await screen.findByTestId('app-publish-resource-sales');
			const agentLink = screen.getByTestId('app-publish-resource-support');

			expect(workflowLink).toHaveAttribute('target', '_blank');
			expect(workflowLink).toHaveAttribute('data-route', expect.stringContaining('workflow-1'));
			expect(agentLink).toHaveAttribute('target', '_blank');
			expect(agentLink).toHaveAttribute('data-route', expect.stringContaining('agent-1'));
		});

		it('lists a published resource with changes', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({
				resources: [{ ...sales, published: true, hasChanges: true }],
			});
			renderComponent();

			expect(await screen.findByTestId('app-publish-resources-list')).toHaveTextContent('Sales');
		});

		it('lists only the resources that need a publish', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({
				resources: [{ ...sales, published: true }, support],
			});
			renderComponent();

			const list = await screen.findByTestId('app-publish-resources-list');

			expect(list).not.toHaveTextContent('Sales');
			expect(list).toHaveTextContent('Support');
		});

		it('hides the list when all resources are published and unchanged', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({
				resources: [{ ...sales, published: true }],
			});
			renderComponent();
			await screen.findByTestId('app-publish-resources');

			expect(screen.queryByTestId('app-publish-resources-list')).not.toBeInTheDocument();
		});

		it('sends publishResources false when the box is unchecked', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({ resources: [sales] });
			vi.mocked(publishApp).mockResolvedValue(testApp());
			renderComponent();
			await screen.findByTestId('app-publish-resources-list');

			await userEvent.click(screen.getByTestId('app-publish-resources'));
			await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

			await waitFor(() =>
				expect(publishApp).toHaveBeenCalledWith(
					expect.anything(),
					'project-1',
					'app-1',
					expect.objectContaining({ publishResources: false }),
				),
			);
		});

		it('marks a resource that the user cannot publish and still allows the publish', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValue({
				resources: [{ ...sales, canPublish: false }, support],
			});
			vi.mocked(publishApp).mockResolvedValue(testApp());
			renderComponent();

			expect(await screen.findByTestId('app-publish-resource-sales-warning')).toBeInTheDocument();
			expect(screen.queryByTestId('app-publish-resource-support-warning')).not.toBeInTheDocument();
			expect(screen.getByTestId('app-publish-dialog-confirm')).toBeEnabled();

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

		it('warns and still publishes when the preview cannot be loaded', async () => {
			vi.mocked(getAppPublishPreview).mockRejectedValue(new Error('offline'));
			vi.mocked(publishApp).mockResolvedValue(testApp());
			renderComponent();

			expect(await screen.findByTestId('app-publish-resources-error')).toBeInTheDocument();
			expect(screen.queryByTestId('app-publish-resources-list')).not.toBeInTheDocument();

			await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

			await waitFor(() => expect(publishApp).toHaveBeenCalledOnce());
		});

		it('does not warn about the preview when the box is unchecked', async () => {
			vi.mocked(getAppPublishPreview).mockRejectedValue(new Error('offline'));
			renderComponent();
			await screen.findByTestId('app-publish-resources-error');

			await userEvent.click(screen.getByTestId('app-publish-resources'));

			expect(screen.queryByTestId('app-publish-resources-error')).not.toBeInTheDocument();
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
			await screen.findByTestId('app-publish-resource-support');
			resolveFirst({ resources: [sales, support] });

			await flushPromises();

			expect(getAppPublishPreview).toHaveBeenCalledTimes(2);
			expect(screen.queryByTestId('app-publish-resource-sales')).not.toBeInTheDocument();
			expect(screen.getByTestId('app-publish-resource-support')).toBeInTheDocument();
		});

		it('reloads the list after a failed publish', async () => {
			vi.mocked(getAppPublishPreview).mockResolvedValueOnce({ resources: [sales, support] });
			vi.mocked(publishApp).mockRejectedValue(new Error('Could not publish "Support": denied'));
			renderComponent();
			await screen.findByTestId('app-publish-resource-sales');
			vi.mocked(getAppPublishPreview).mockResolvedValueOnce({ resources: [support] });

			await userEvent.click(screen.getByTestId('app-publish-dialog-confirm'));

			await waitFor(() =>
				expect(screen.queryByTestId('app-publish-resource-sales')).not.toBeInTheDocument(),
			);
			expect(screen.getByTestId('app-publish-resource-support')).toBeInTheDocument();
			expect(getAppPublishPreview).toHaveBeenCalledTimes(2);
		});
	});

	it('shows the link only for a published app', async () => {
		const { rerender } = renderComponent();
		await screen.findByTestId('visibility');
		expect(screen.queryByTestId('link')).not.toBeInTheDocument();

		await rerender({ app: testApp({ publishedVersionId: 'v1', publishedUrl: PUBLISHED_URL }) });

		expect(await screen.findByTestId('link')).toHaveTextContent(PUBLISHED_URL);
	});
});
