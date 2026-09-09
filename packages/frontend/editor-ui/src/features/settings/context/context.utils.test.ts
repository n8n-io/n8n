import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@n8n/stores/users.store';
import { mockedStore } from '@/__tests__/utils';

import type { Preference } from './context.types';
import {
	canWriteInstanceScope,
	canWriteProjectScope,
	preferenceScope,
	toPreferencePermissions,
} from './context.utils';

function preference(overrides: Partial<Preference> = {}): Preference {
	return {
		id: 'p1',
		content: 'Keep replies short.',
		userId: 'user-1',
		projectId: null,
		project: null,
		scopes: [],
		createdAt: '2026-09-08T00:00:00.000Z',
		updatedAt: '2026-09-08T00:00:00.000Z',
		...overrides,
	};
}

const initialState = {
	[STORES.PROJECTS]: {
		myProjects: [
			// Project admins and editors both resolve to `projectVariable:create`.
			{ id: 'writable', name: 'Writable', type: 'team', scopes: ['projectVariable:create'] },
			{ id: 'readonly', name: 'Read only', type: 'team', scopes: ['projectVariable:read'] },
		],
	},
};

describe('context.utils', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ initialState }));
	});

	describe('preferenceScope', () => {
		it('reads a user row from its userId', () => {
			expect(preferenceScope(preference({ userId: 'user-1', projectId: null }))).toBe('user');
		});

		it('reads a project row from its projectId', () => {
			expect(preferenceScope(preference({ userId: null, projectId: 'proj' }))).toBe('project');
		});

		it('reads a row with neither id as instance-wide', () => {
			expect(preferenceScope(preference({ userId: null, projectId: null }))).toBe('instance');
		});

		it('lets projectId win, matching how the prompt renderer groups rows', () => {
			// A CHECK constraint forbids both, so this only guards against a bad row.
			expect(preferenceScope(preference({ userId: 'user-1', projectId: 'proj' }))).toBe('project');
		});
	});

	describe('toPreferencePermissions', () => {
		it('grants nothing when the row carries no write scopes', () => {
			expect(toPreferencePermissions(preference({ scopes: ['preference:read'] }))).toEqual({
				update: false,
				delete: false,
			});
		});

		it('reads update and delete independently', () => {
			expect(
				toPreferencePermissions(preference({ scopes: ['preference:read', 'preference:update'] })),
			).toEqual({ update: true, delete: false });

			expect(
				toPreferencePermissions(preference({ scopes: ['preference:read', 'preference:delete'] })),
			).toEqual({ update: false, delete: true });
		});
	});

	describe('canWriteProjectScope', () => {
		it('allows a project the user can write', () => {
			expect(canWriteProjectScope('writable')).toBe(true);
		});

		it('refuses a project the user can only read', () => {
			expect(canWriteProjectScope('readonly')).toBe(false);
		});

		it('refuses an unknown or absent project', () => {
			expect(canWriteProjectScope('missing')).toBe(false);
			expect(canWriteProjectScope(null)).toBe(false);
			expect(canWriteProjectScope(undefined)).toBe(false);
		});
	});

	describe('canWriteInstanceScope', () => {
		it('allows instance owners and admins only', () => {
			const usersStore = mockedStore(useUsersStore);

			usersStore.isAdminOrOwner = true;
			expect(canWriteInstanceScope()).toBe(true);

			usersStore.isAdminOrOwner = false;
			expect(canWriteInstanceScope()).toBe(false);
		});
	});
});
