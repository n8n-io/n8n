import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import { PUBLISHED_URL, testApp, testVersion } from '../../__tests__/fixtures';
import { publishApp } from '../../apps.api';
import AppPublishDialog from './AppPublishDialog.vue';

vi.mock('../../apps.api');

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const renderComponent = createComponentRenderer(AppPublishDialog, {
	props: { open: true, app: testApp(), version: testVersion },
	global: {
		stubs: {
			AppLinkField: { props: ['url'], template: '<span data-test-id="link">{{ url }}</span>' },
			AppVisibilitySelect: {
				props: ['modelValue'],
				emits: ['update:modelValue'],
				template:
					'<button data-test-id="visibility" @click="$emit(\'update:modelValue\', \'public\')">{{ modelValue }}</button>',
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
		});
		expect(emitted('updated')).toEqual([[published]]);
	});

	it('publishes the name, description and a changed visibility in one request', async () => {
		vi.mocked(publishApp).mockResolvedValue(testApp({ visibility: 'public' }));
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
			visibility: 'public',
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

	it('stays open and shows an error toast when the publish fails', async () => {
		vi.mocked(publishApp).mockRejectedValue(new Error('denied'));
		const { emitted } = renderComponent();

		await userEvent.click(await screen.findByTestId('app-publish-dialog-confirm'));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Could not publish the app'),
		);
		expect(emitted('update:open')).toBeUndefined();
	});

	it('shows the link only for a published app', async () => {
		const { rerender } = renderComponent();
		await screen.findByTestId('visibility');
		expect(screen.queryByTestId('link')).not.toBeInTheDocument();

		await rerender({ app: testApp({ publishedVersionId: 'v1', publishedUrl: PUBLISHED_URL }) });

		expect(await screen.findByTestId('link')).toHaveTextContent(PUBLISHED_URL);
	});
});
