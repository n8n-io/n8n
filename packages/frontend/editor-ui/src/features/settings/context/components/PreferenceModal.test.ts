import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@n8n/stores/users.store';
import userEvent from '@testing-library/user-event';

import { TELEMETRY_EVENT } from '@n8n/telemetry';

import PreferenceModal from './PreferenceModal.vue';
import { PREFERENCE_MODAL_KEY, PREFERENCE_TEXT_MAX_LENGTH } from '../context.constants';
import { useContextStore } from '../context.store';
import type { Preference } from '../context.types';

const trackMock = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

const initialState = {
	[STORES.UI]: {
		modalStateById: { [PREFERENCE_MODAL_KEY]: { open: true } },
		modalStack: [PREFERENCE_MODAL_KEY],
	},
	[STORES.PROJECTS]: {
		myProjects: [
			// Project admins and editors both resolve to `projectVariable:create`.
			{ id: 'p-write', name: 'Writable Project', type: 'team', scopes: ['projectVariable:create'] },
			{ id: 'p-read', name: 'Read Only Project', type: 'team', scopes: ['projectVariable:read'] },
		],
	},
};

const global = { stubs: { Modal: ModalStub } };
const renderModal = createComponentRenderer(PreferenceModal);

let pinia: ReturnType<typeof createTestingPinia>;
let contextStore: MockedStore<typeof useContextStore>;
let usersStore: MockedStore<typeof useUsersStore>;

function scopeOptions() {
	return Array.from(document.querySelectorAll('li.el-select-dropdown__item'));
}

function findOption(label: string) {
	return scopeOptions().find((li) => li.textContent?.includes(label));
}

describe('PreferenceModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
		contextStore = mockedStore(useContextStore);
		usersStore = mockedStore(useUsersStore);
		usersStore.isAdminOrOwner = false;
		trackMock.mockReset();
	});

	describe('scope options', () => {
		it('always offers "Just you"', () => {
			renderModal({ props: { mode: 'new' }, global, pinia });

			expect(findOption('Just you')?.className).not.toContain('is-disabled');
		});

		it('disables "Everyone" for a user who is not an instance owner or admin', () => {
			usersStore.isAdminOrOwner = false;

			renderModal({ props: { mode: 'new' }, global, pinia });

			expect(findOption('Everyone')?.className).toContain('is-disabled');
		});

		it('enables "Everyone" for an instance owner or admin', () => {
			usersStore.isAdminOrOwner = true;

			renderModal({ props: { mode: 'new' }, global, pinia });

			expect(findOption('Everyone')?.className).not.toContain('is-disabled');
		});

		it('offers only the projects the user may write', () => {
			renderModal({ props: { mode: 'new' }, global, pinia });

			expect(findOption('Writable Project')?.className).not.toContain('is-disabled');
			expect(findOption('Read Only Project')?.className).toContain('is-disabled');
		});
	});

	describe('validation', () => {
		it('keeps Save disabled while the text is empty', () => {
			const { getByTestId } = renderModal({ props: { mode: 'new' }, global, pinia });

			expect(getByTestId('preference-modal-save-button')).toBeDisabled();
		});

		it('enables Save once the text is filled', async () => {
			const { getByTestId } = renderModal({ props: { mode: 'new' }, global, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Keep replies short.',
			);

			expect(getByTestId('preference-modal-save-button')).toBeEnabled();
		});

		it('caps the text at the injection budget', () => {
			const { getByTestId } = renderModal({ props: { mode: 'new' }, global, pinia });

			const textarea = getByTestId('preference-modal-text-input').querySelector('textarea');
			expect(textarea).toHaveAttribute('maxlength', String(PREFERENCE_TEXT_MAX_LENGTH));
		});
	});

	describe('submitting', () => {
		it('creates a user-scoped preference by default', async () => {
			const { getByTestId } = renderModal({ props: { mode: 'new' }, global, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Keep replies short.',
			);
			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(contextStore.createPreference).toHaveBeenCalledWith({
				text: 'Keep replies short.',
				scopeType: 'user',
				projectId: null,
			});
		});

		it('reports a created preference without its text', async () => {
			const { getByTestId } = renderModal({ props: { mode: 'new' }, global, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Keep replies short.',
			);
			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_CREATED_PREFERENCE, {
				scope_type: 'user',
				text_length: 'Keep replies short.'.length,
			});
		});

		it('keeps the project scope when editing a project preference', async () => {
			const preference: Preference = {
				id: 'p1',
				text: 'Use sub-workflows.',
				scopeType: 'project',
				projectId: 'p-write',
				project: { id: 'p-write', name: 'Writable Project' },
				scopes: ['preference:read', 'preference:update', 'preference:delete'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			const { getByTestId } = renderModal({ props: { mode: 'edit', preference }, global, pinia });

			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(contextStore.updatePreference).toHaveBeenCalledWith('p1', {
				text: 'Use sub-workflows.',
				scopeType: 'project',
				projectId: 'p-write',
			});
		});

		it('reports an unchanged scope as scope_changed false', async () => {
			const preference: Preference = {
				id: 'p1',
				text: 'Use sub-workflows.',
				scopeType: 'project',
				projectId: 'p-write',
				project: { id: 'p-write', name: 'Writable Project' },
				scopes: ['preference:read', 'preference:update', 'preference:delete'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			const { getByTestId } = renderModal({ props: { mode: 'edit', preference }, global, pinia });

			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE, {
				scope_type: 'project',
				text_length: 'Use sub-workflows.'.length,
				scope_changed: false,
				project_id: 'p-write',
			});
		});
	});
});
