import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { FrontendSettings } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';

import type { IUsedCredential } from '../credentials.types';
import { useUnusableWorkflowCredentials } from './useUnusableWorkflowCredentials';

describe('useUnusableWorkflowCredentials', () => {
	const usable: IUsedCredential = {
		id: 'ok',
		name: 'Team Gmail',
		credentialType: 'gmailOAuth2',
		currentUserHasAccess: true,
	};

	const personallyOwned: IUsedCredential = {
		id: 'nope',
		name: "Alice's Gmail",
		credentialType: 'gmailOAuth2',
		currentUserHasAccess: false,
		homeProject: {
			id: 'p1',
			name: 'Alice Chen <alice@acme.io>',
			type: 'personal',
			icon: null,
			createdAt: '',
			updatedAt: '',
		},
	};

	const setup = (
		credentials: IUsedCredential[],
		{ flagEnabled = true }: { flagEnabled?: boolean } = {},
	) => {
		setActivePinia(createTestingPinia());
		useSettingsStore().settings = {
			granularCredentialSharing: flagEnabled,
		} as FrontendSettings;

		return useUnusableWorkflowCredentials(Object.fromEntries(credentials.map((c) => [c.id, c])));
	};

	it('blocks nothing when every credential is usable', () => {
		const { isBlocked, executeReason, publishReason } = setup([usable]);

		expect(isBlocked.value).toBe(false);
		expect(executeReason.value).toBe('');
		expect(publishReason.value).toBe('');
	});

	it('blocks on a credential the user cannot use, naming it and its owner', () => {
		const { isBlocked, unusable, executeReason } = setup([usable, personallyOwned]);

		expect(isBlocked.value).toBe(true);
		expect(unusable.value).toEqual([personallyOwned]);
		expect(executeReason.value).toContain("Alice's Gmail");
		expect(executeReason.value).toContain('Alice Chen');
		// A personal project is named "Name <email>"; the email is not shown.
		expect(executeReason.value).not.toContain('alice@acme.io');
	});

	// The publish copy has to explain the reason, which is not access alone.
	it('explains that a published workflow runs as its publisher', () => {
		const { publishReason } = setup([personallyOwned]);

		expect(publishReason.value).toContain('runs as whoever published it');
	});

	it('names the project when the credential belongs to a team', () => {
		const { executeReason } = setup([
			{
				...personallyOwned,
				homeProject: { ...personallyOwned.homeProject!, name: 'Sales Ops', type: 'team' },
			},
		]);

		expect(executeReason.value).toContain('Sales Ops');
	});

	it('still explains itself when the owner is unknown', () => {
		const { isBlocked, executeReason } = setup([{ ...personallyOwned, homeProject: undefined }]);

		expect(isBlocked.value).toBe(true);
		expect(executeReason.value).toContain('its owner');
	});

	// Every user-facing change sits behind the flag.
	it('blocks nothing while the feature flag is off', () => {
		const { isBlocked, executeReason } = setup([personallyOwned], { flagEnabled: false });

		expect(isBlocked.value).toBe(false);
		expect(executeReason.value).toBe('');
	});
});
