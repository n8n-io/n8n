import type { AppResponse, AppVersionResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { unpublishApp } from '../apps.api';
import AppPublishButton from './AppPublishButton.vue';

vi.mock('../apps.api');

const { confirm, showError } = vi.hoisted(() => ({ confirm: vi.fn(), showError: vi.fn() }));
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	useMessage: () => ({ confirm }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const PUBLISHED_URL = 'https://expenses.apps.example.com/';

const app = (publishedVersionId: string | null = null): AppResponse => ({
	id: 'app-1',
	projectId: 'project-1',
	name: 'Expense tracker',
	namespace: 'expenses',
	visibility: 'project',
	draftVersionId: 'v2',
	publishedVersionId,
	publishedUrl: publishedVersionId ? PUBLISHED_URL : null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
});

const version: AppVersionResponse = {
	id: 'v2',
	appId: 'app-1',
	label: null,
	description: null,
	sourceArtifactId: 1,
	bundleArtifactId: 2,
	buildStatus: 'succeeded',
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-01T10:00:00.000Z',
};

const renderComponent = createComponentRenderer(AppPublishButton, {
	props: { app: app(), version },
	global: {
		stubs: {
			ActionDropdown: {
				props: ['items'],
				emits: ['select'],
				template: `<div>
					<slot name="activator" />
					<button
						v-for="item in items"
						:key="item.id"
						:data-test-id="'menu-' + item.id"
						@click="$emit('select', item.id)"
					>{{ item.label }}</button>
				</div>`,
			},
			AppPublishDialog: {
				props: ['open', 'app', 'version'],
				emits: ['update:open', 'updated'],
				template: `<div v-if="open" data-test-id="publish-dialog">
					<button data-test-id="publish-dialog-confirm" @click="$emit('updated', { ...app, publishedVersionId: version.id })" />
				</div>`,
			},
		},
	},
});

function providePermissions(scopes: Scope[], readOnly = false) {
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => readOnly,
	});
}

describe('AppPublishButton', () => {
	afterEach(() => {
		capabilityRegistry.clear();
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('opens the publish dialog and passes its update on', async () => {
		providePermissions(['app:update']);
		const { getByTestId, queryByTestId, emitted } = renderComponent();
		expect(queryByTestId('publish-dialog')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('app-publish-button'));
		await userEvent.click(getByTestId('publish-dialog-confirm'));

		expect(emitted('updated')).toEqual([[{ ...app(), publishedVersionId: 'v2' }]]);
	});

	it.each<[string, Scope[], boolean, AppVersionResponse | null]>([
		['without a built version', ['app:update'], false, null],
		['without the update scope', ['app:read'], false, version],
		['in a read-only instance', ['app:update'], true, version],
	])('disables publish %s', (_case, scopes, readOnly, publishable) => {
		providePermissions(scopes, readOnly);
		const { getByTestId } = renderComponent({ props: { version: publishable } });

		expect(getByTestId('app-publish-button')).toBeDisabled();
	});

	it('shows the published state when the version is published', () => {
		providePermissions(['app:update']);
		const { getByTestId } = renderComponent({ props: { app: app('v2') } });

		expect(getByTestId('app-publish-button')).toBeDisabled();
		expect(getByTestId('app-publish-button')).toHaveTextContent('Published');
	});

	it('allows to publish a newer version than the published one', () => {
		providePermissions(['app:update']);
		const { getByTestId } = renderComponent({ props: { app: app('v1') } });

		expect(getByTestId('app-publish-button')).toBeEnabled();
		expect(getByTestId('app-publish-button')).toHaveTextContent('Publish');
	});

	it('disables the menu while an unpublish runs', async () => {
		providePermissions(['app:update']);
		confirm.mockResolvedValue('confirm');
		vi.mocked(unpublishApp).mockReturnValue(new Promise(() => {}));
		const { getByTestId } = renderComponent({ props: { app: app('v1') } });
		expect(getByTestId('app-publish-menu-trigger')).toBeEnabled();

		await userEvent.click(getByTestId('menu-unpublish'));

		await waitFor(() => expect(getByTestId('app-publish-menu-trigger')).toBeDisabled());
	});

	it('hides the menu when the app is not published', () => {
		providePermissions(['app:update']);
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('app-publish-menu-trigger')).not.toBeInTheDocument();
	});

	it('opens the published URL in a new tab', async () => {
		providePermissions(['app:read']);
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const { getByTestId } = renderComponent({ props: { app: app('v2') } });

		await userEvent.click(getByTestId('menu-open'));

		expect(open).toHaveBeenCalledWith(PUBLISHED_URL, '_blank', 'noopener');
	});

	it('unpublishes the app after confirmation', async () => {
		providePermissions(['app:update']);
		confirm.mockResolvedValue('confirm');
		vi.mocked(unpublishApp).mockResolvedValue(app());
		const { getByTestId, emitted } = renderComponent({ props: { app: app('v2') } });

		await userEvent.click(getByTestId('menu-unpublish'));

		await waitFor(() => expect(emitted('updated')).toEqual([[app()]]));
		expect(unpublishApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1');
	});

	it('does not unpublish when the confirmation is cancelled', async () => {
		providePermissions(['app:update']);
		confirm.mockResolvedValue('cancel');
		const { getByTestId, emitted } = renderComponent({ props: { app: app('v2') } });

		await userEvent.click(getByTestId('menu-unpublish'));

		expect(unpublishApp).not.toHaveBeenCalled();
		expect(emitted('updated')).toBeUndefined();
	});

	it('hides unpublish without the update scope', () => {
		providePermissions(['app:read']);
		const { getByTestId, queryByTestId } = renderComponent({ props: { app: app('v2') } });

		expect(getByTestId('menu-open')).toBeInTheDocument();
		expect(queryByTestId('menu-unpublish')).not.toBeInTheDocument();
	});

	it('shows an error toast when unpublish fails', async () => {
		providePermissions(['app:update']);
		confirm.mockResolvedValue('confirm');
		vi.mocked(unpublishApp).mockRejectedValue(new Error('denied'));
		const { getByTestId, emitted } = renderComponent({ props: { app: app('v1') } });

		await userEvent.click(getByTestId('menu-unpublish'));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Could not unpublish the app'),
		);
		expect(emitted('updated')).toBeUndefined();
	});
});
