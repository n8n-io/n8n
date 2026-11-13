import type { Scope } from '@n8n/permissions';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilityRegistry } from '@n8n/frontend-module-sdk';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { PUBLISHED_URL, providePermissions, testApp } from '../../__tests__/fixtures';
import { updateApp } from '../../apps.api';
import AppSharePopover from './AppSharePopover.vue';

vi.mock('../../apps.api');

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const published = testApp({ publishedVersionId: 'v2', publishedUrl: PUBLISHED_URL });

const renderComponent = createComponentRenderer(AppSharePopover, {
	props: { app: published, url: PUBLISHED_URL },
	global: {
		stubs: {
			N8nPopover: { template: '<div><slot name="trigger" /><slot name="content" /></div>' },
			AppLinkField: { props: ['url'], template: '<span data-test-id="link">{{ url }}</span>' },
			AppVisibilitySelect: {
				props: ['modelValue', 'disabled'],
				emits: ['update:modelValue'],
				template:
					'<button data-test-id="visibility" :disabled="disabled" @click="$emit(\'update:modelValue\', \'instance\')">{{ modelValue }}</button>',
			},
		},
	},
});

describe('AppSharePopover', () => {
	afterEach(() => {
		capabilityRegistry.clear();
		vi.clearAllMocks();
	});

	it('shows the link and the current visibility', () => {
		providePermissions(['app:update']);
		const { getByTestId } = renderComponent();

		expect(getByTestId('link')).toHaveTextContent(PUBLISHED_URL);
		expect(getByTestId('visibility')).toHaveTextContent('project');
	});

	it('saves a new visibility at once and emits the updated app', async () => {
		providePermissions(['app:update']);
		vi.mocked(updateApp).mockResolvedValue({ ...published, visibility: 'instance' });
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('visibility'));

		await waitFor(() =>
			expect(emitted('updated')).toEqual([[{ ...published, visibility: 'instance' }]]),
		);
		expect(updateApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', {
			visibility: 'instance',
		});
	});

	it.each<[string, Scope[], boolean]>([
		['without the update scope', ['app:read'], false],
		['in a read-only instance', ['app:update'], true],
	])('shows the visibility as read-only %s', (_case, scopes, readOnly) => {
		providePermissions(scopes, readOnly);
		const { getByTestId } = renderComponent();

		expect(getByTestId('visibility')).toBeDisabled();
	});

	it('shows an error toast when the save fails', async () => {
		providePermissions(['app:update']);
		vi.mocked(updateApp).mockRejectedValue(new Error('denied'));
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('visibility'));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(
				expect.any(Error),
				'Could not change who can open the app',
			),
		);
		expect(emitted('updated')).toBeUndefined();
	});
});
