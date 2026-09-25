import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import { setActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@n8n/stores/users.store';
import { mockedStore } from '@/__tests__/utils';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { ResponseError } from '@n8n/rest-api-client';

import type { Preference } from './context.types';
import {
	canWriteInstanceScope,
	canWriteProjectScope,
	preferenceAudience,
	preferenceScope,
	preferenceUserName,
	preferenceWriteRejectionReason,
	toPreferencePermissions,
} from './context.utils';

function preference(overrides: Partial<Preference> = {}): Preference {
	return {
		id: 'p1',
		content: 'Keep replies short.',
		userId: 'user-1',
		user: { id: 'user-1', email: 'me@n8n.io', firstName: 'Me', lastName: 'Myself' },
		projectId: null,
		project: null,
		source: 'ui',
		scopes: [],
		createdAt: '2026-09-08T00:00:00.000Z',
		updatedAt: '2026-09-08T00:00:00.000Z',
		...overrides,
	};
}

const initialState = {
	[STORES.PROJECTS]: {
		personalProject: { id: 'personal-1', name: 'Me Myself <me@n8n.io>', type: 'personal' },
		myProjects: [
			// Project admins and editors both hold `projectAiPreference:create`.
			{ id: 'writable', name: 'Writable', type: 'team', scopes: ['projectAiPreference:create'] },
			{ id: 'readonly', name: 'Read only', type: 'team', scopes: ['projectAiPreference:read'] },
		],
	},
};

describe('context.utils', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ initialState }));
	});

	describe('preferenceAudience', () => {
		it("tells the viewer's own user row from another user's", () => {
			expect(preferenceAudience(preference(), 'user-1')).toMatchObject({ kind: 'user', own: true });
			expect(preferenceAudience(preference(), 'user-2')).toMatchObject({
				kind: 'user',
				own: false,
				user: { id: 'user-1' },
			});
		});

		it('reads the owner of a personal project out of its name', () => {
			const row = preference({
				userId: null,
				user: null,
				projectId: 'personal-2',
				project: {
					id: 'personal-2',
					name: 'Jane Doe <jane@acme.com>',
					type: 'personal',
					icon: null,
				},
			});

			expect(preferenceAudience(row, 'user-1')).toEqual({
				kind: 'personalProject',
				own: false,
				ownerName: 'Jane Doe',
			});
		});

		it("marks the viewer's personal project as their own", () => {
			const row = preference({
				userId: null,
				user: null,
				projectId: 'personal-1',
				project: { id: 'personal-1', name: 'Me Myself <me@n8n.io>', type: 'personal', icon: null },
			});

			expect(preferenceAudience(row, 'user-1')).toMatchObject({
				kind: 'personalProject',
				own: true,
			});
		});

		it('keeps a team project and the instance apart from the user kinds', () => {
			expect(
				preferenceAudience(
					preference({
						userId: null,
						user: null,
						projectId: 'team',
						project: { id: 'team', name: 'Sales', type: 'team', icon: null },
					}),
					'user-1',
				),
			).toEqual({ kind: 'project', name: 'Sales' });
			expect(preferenceAudience(preference({ userId: null, user: null }), 'user-1')).toEqual({
				kind: 'instance',
			});
		});
	});

	describe('preferenceUserName', () => {
		it('prefers the full name and falls back to the email', () => {
			expect(
				preferenceUserName({ id: 'u', email: 'jane@acme.com', firstName: 'Jane', lastName: 'Doe' }),
			).toBe('Jane Doe');
			expect(
				preferenceUserName({ id: 'u', email: 'jane@acme.com', firstName: null, lastName: null }),
			).toBe('jane@acme.com');
			expect(preferenceUserName(null)).toBe('');
		});
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
			expect(toPreferencePermissions(preference({ scopes: ['aiPreference:read'] }))).toEqual({
				update: false,
				delete: false,
			});
		});

		it('reads update and delete independently', () => {
			expect(
				toPreferencePermissions(
					preference({ scopes: ['aiPreference:read', 'aiPreference:update'] }),
				),
			).toEqual({ update: true, delete: false });

			expect(
				toPreferencePermissions(
					preference({ scopes: ['aiPreference:read', 'aiPreference:delete'] }),
				),
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
		it('allows a user holding the global create scope', () => {
			const usersStore = mockedStore(useUsersStore);

			usersStore.currentUser = mock<IUser>({ globalScopes: ['aiPreference:create'] });
			expect(canWriteInstanceScope()).toBe(true);
		});

		it('refuses a user without it', () => {
			const usersStore = mockedStore(useUsersStore);

			usersStore.currentUser = mock<IUser>({ globalScopes: ['aiPreference:read'] });
			expect(canWriteInstanceScope()).toBe(false);

			usersStore.currentUser = null;
			expect(canWriteInstanceScope()).toBe(false);
		});
	});

	describe('preferenceWriteRejectionReason', () => {
		it.each([
			[409, 'dup', 'duplicate'],
			[400, 'A user cannot hold more than 50 preferences', 'scope_full'],
			[403, 'no', 'not_permitted'],
			[500, 'boom', 'failed'],
		])('maps %s to %s', (status, message, reason) => {
			expect(
				preferenceWriteRejectionReason(new ResponseError(message, { httpStatusCode: status })),
			).toBe(reason);
		});

		// A 400 covers malformed requests too, and calling one of those a full scope would
		// corrupt the number that reviews the cap.
		it('reports a 400 that is not the cap as a failure', () => {
			expect(
				preferenceWriteRejectionReason(
					new ResponseError('An edit of a user preference must name the user', {
						httpStatusCode: 400,
					}),
				),
			).toBe('failed');
		});

		it('reports anything that is not a response as a failure', () => {
			expect(preferenceWriteRejectionReason(new Error('offline'))).toBe('failed');
		});
	});
});
