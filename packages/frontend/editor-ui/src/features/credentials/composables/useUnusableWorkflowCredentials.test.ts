import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { FrontendSettings } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';

import type { INodeUi } from '@/Interface';

import { createTestNode } from '@/__tests__/mocks';
import type { IUsedCredential } from '../credentials.types';
import { useUnusableWorkflowCredentials } from './useUnusableWorkflowCredentials';

describe('useUnusableWorkflowCredentials', () => {
	const usable: IUsedCredential = {
		id: 'ok',
		name: 'Team Gmail',
		credentialType: 'gmailOAuth2',
		currentUserCanUse: true,
	};

	const personallyOwned: IUsedCredential = {
		id: 'nope',
		name: "Alice's Gmail",
		credentialType: 'gmailOAuth2',
		currentUserCanUse: false,
		homeProject: {
			id: 'p1',
			name: 'Alice Chen <alice@acme.io>',
			type: 'personal',
			icon: null,
			createdAt: '',
			updatedAt: '',
		},
	};

	/** A node that uses every credential passed in, so the workflow references them. */
	const nodeUsing = (credentials: IUsedCredential[], { disabled = false } = {}) =>
		createTestNode({
			name: 'Gmail',
			disabled,
			credentials: Object.fromEntries(
				credentials.map((c) => [c.credentialType, { id: c.id, name: c.name }]),
			),
		});

	const setup = (
		credentials: IUsedCredential[],
		{ flagEnabled = true, nodes }: { flagEnabled?: boolean; nodes?: INodeUi[] } = {},
	) => {
		setActivePinia(createTestingPinia());
		useSettingsStore().settings = {
			granularCredentialSharing: flagEnabled,
		} as FrontendSettings;

		return useUnusableWorkflowCredentials(
			Object.fromEntries(credentials.map((c) => [c.id, c])),
			nodes ?? [nodeUsing(credentials)],
		);
	};

	it('blocks nothing when every credential is usable', () => {
		const { isBlocked, reason } = setup([usable]);

		expect(isBlocked.value).toBe(false);
		expect(reason.value).toBe('');
	});

	it('blocks on a credential the user cannot use, naming it and its owner', () => {
		const { isBlocked, unusable, reason } = setup([usable, personallyOwned]);

		expect(isBlocked.value).toBe(true);
		expect(unusable.value).toEqual([personallyOwned]);
		expect(reason.value).toContain("Alice's Gmail");
		expect(reason.value).toContain('Alice Chen');
		// A personal project is named "Name <email>"; the email is not shown.
		expect(reason.value).not.toContain('alice@acme.io');
	});

	// One sentence covers both actions, and says what the user can still do.
	it('names both blocked actions and the way out', () => {
		const { reason } = setup([personallyOwned]);

		expect(reason.value).toContain('can run or publish with it');
		expect(reason.value).toContain('You can still edit the workflow');
	});

	it('names the project when the credential belongs to a team', () => {
		const { reason } = setup([
			{
				...personallyOwned,
				homeProject: { ...personallyOwned.homeProject!, name: 'Sales Ops', type: 'team' },
			},
		]);

		expect(reason.value).toContain('Sales Ops');
	});

	it('still explains itself when the owner is unknown', () => {
		const { isBlocked, reason } = setup([{ ...personallyOwned, homeProject: undefined }]);

		expect(isBlocked.value).toBe(true);
		expect(reason.value).toContain('its owner');
	});

	// Every user-facing change sits behind the flag.
	it('blocks nothing while the feature flag is off', () => {
		const { isBlocked, reason } = setup([personallyOwned], { flagEnabled: false });

		expect(isBlocked.value).toBe(false);
		expect(reason.value).toBe('');
	});

	// The used-credential metadata only changes on load and on save, so the
	// block has to follow the nodes instead.
	it('unblocks as soon as the node switches to another credential', () => {
		const { isBlocked } = setup([personallyOwned], { nodes: [nodeUsing([usable])] });

		expect(isBlocked.value).toBe(false);
	});

	it('unblocks when the node that used the credential is gone', () => {
		const { isBlocked } = setup([personallyOwned], { nodes: [] });

		expect(isBlocked.value).toBe(false);
	});

	// A disabled node does not run, and the backend skips it too.
	it('does not block on a disabled node', () => {
		const { isBlocked } = setup([personallyOwned], {
			nodes: [nodeUsing([personallyOwned], { disabled: true })],
		});

		expect(isBlocked.value).toBe(false);
	});
});
