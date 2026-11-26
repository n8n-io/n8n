import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CredentialTypeAccessDialog from './CredentialTypeAccessDialog.vue';
import { useInstancePolicyStore } from '../instance-policy.store';

// The real dialog, unlike the dialog tests, so that its focus on open runs.

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	fetchInstanceAccess: vi.fn(),
	saveInstancePolicy: vi.fn(),
}));

vi.mock('../../type-availability-policies.api', () => mocks);

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost', pushRef: 'test' } }),
}));

// A focusable stand-in, so that the dialog would focus it if nothing stopped it.
const typeAccessSelectStub = {
	props: ['modelValue', 'label', 'disabled'],
	template: '<button data-test-id="type-access-select">{{ modelValue }}</button>',
};

const NODE_TYPES = [
	{
		name: 'n8n-nodes-base.airtable',
		displayName: 'Airtable',
		version: 1,
		credentials: [{ name: 'airtableApi' }],
	},
] as INodeTypeDescription[];

const global = { stubs: { TypeAccessSelect: typeAccessSelectStub } };
const renderCredentialDialog = createComponentRenderer(CredentialTypeAccessDialog, { global });

async function setupStore() {
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(['nodeTypePolicy:manage', 'credentialTypePolicy:manage']);
	await useInstancePolicyStore().load(['node', 'credential']);
	return pinia;
}

describe('access dialog focus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchInstancePolicy.mockResolvedValue({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 1,
		});
		mocks.fetchInstanceAccess.mockResolvedValue({
			scopeId: null,
			version: 1,
			defaultAction: 'allow',
			types: [],
		});
		componentRegistry.register('node-type-icon', { template: '<span />' });
		componentRegistry.register('credential-type-icon', { template: '<span />' });
		capabilityRegistry.provide(capabilities.typeDescriptions, {
			load: vi.fn(async () => {}),
			nodeTypes: () => NODE_TYPES,
			credentialTypeDisplayName: () => 'Airtable API',
		});
	});

	afterEach(() => {
		capabilityRegistry.clear();
		componentRegistry.clear();
	});

	it('focuses the credential dialog, not its first Access select, when it opens', async () => {
		const pinia = await setupStore();
		const { getByRole } = renderCredentialDialog({
			pinia,
			props: { credentialType: 'airtableApi', open: true },
		});

		await waitFor(() => expect(document.activeElement).toBe(getByRole('dialog')));
	});
});
