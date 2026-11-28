import type { PolicyAction } from '@n8n/api-types';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CredentialTypeAccessDialog from './CredentialTypeAccessDialog.vue';
import { useInstancePolicyStore } from '../instance-policy.store';
import { useRestrictReviewStore } from '../restrict-review/restrict-review.store';

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	fetchInstanceAccess: vi.fn(),
	setInstanceTypeAccess: vi.fn(),
	fetchNodeTypeUsage: vi.fn(),
	fetchCredentialTypeUsage: vi.fn(),
}));

const toast = vi.hoisted(() => ({ showError: vi.fn(), showMessage: vi.fn() }));

vi.mock('../../type-availability-policies.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	...mocks,
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost', pushRef: 'test' } }),
}));

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nDialog: {
			name: 'N8nDialog',
			props: ['open', 'header'],
			template: '<div v-if="open"><h2>{{ header }}</h2><slot /></div>',
		},
	};
});

// Element Plus selects do not open in jsdom, so the stub shows the value and picks the other one.
const typeAccessSelectStub = {
	props: ['modelValue', 'label', 'disabled'],
	emits: ['update:modelValue'],
	template:
		'<button data-test-id="type-access-select" :data-value="modelValue" :disabled="disabled" @click="$emit(\'update:modelValue\', modelValue === \'deny\' ? \'allow\' : \'deny\')">{{ label }}</button>',
};

function nodeType(name: string, displayName: string, credentials: string[], version = 1) {
	return {
		name,
		displayName,
		version,
		credentials: credentials.map((credential) => ({ name: credential })),
	} as INodeTypeDescription;
}

const NODE_TYPES = [
	nodeType('n8n-nodes-base.airtable', 'Airtable', ['airtableApi'], 1),
	nodeType('n8n-nodes-base.airtable', 'Airtable', ['airtableTokenApi', 'airtableOAuth2Api'], 2),
	nodeType('n8n-nodes-base.airtableTrigger', 'Airtable Trigger', [
		'airtableApi',
		'airtableTokenApi',
		'airtableOAuth2Api',
	]),
	nodeType('n8n-nodes-base.activeCampaign', 'ActiveCampaign', ['activeCampaignApi']),
	nodeType('n8n-nodes-base.activeCampaignTrigger', 'ActiveCampaign Trigger', ['activeCampaignApi']),
	nodeType('n8n-nodes-base.httpRequest', 'HTTP Request', ['httpHeaderAuth']),
	...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter) =>
		nodeType(`n8n-nodes-base.many${letter}`, `Many ${letter}`, ['manyApi']),
	),
];

const CREDENTIAL_NAMES: Record<string, string> = {
	airtableApi: 'Airtable API',
	airtableTokenApi: 'Airtable Personal Access Token API',
	airtableOAuth2Api: 'Airtable OAuth2 API',
	activeCampaignApi: 'ActiveCampaign API',
	httpHeaderAuth: 'Header Auth',
	manyApi: 'Many API',
};

type AccessEntry = PolicyAction | { access: PolicyAction; matchedRuleId: string };

const access = (byName: Record<string, AccessEntry>, version = 1) => ({
	scopeId: null,
	version,
	defaultAction: 'allow',
	types: Object.entries(byName).map(([name, entry]) =>
		typeof entry === 'string' ? { name, access: entry, matchedRuleId: null } : { name, ...entry },
	),
});

const NODE_ACCESS = {
	'n8n-nodes-base.airtable': 'allow',
	'n8n-nodes-base.airtableTrigger': 'deny',
} as const;

const CREDENTIAL_ACCESS = {
	airtableApi: 'allow',
	airtableTokenApi: 'allow',
	airtableOAuth2Api: 'deny',
} as const;

const renderDialog = createComponentRenderer(CredentialTypeAccessDialog, {
	global: { stubs: { TypeAccessSelect: typeAccessSelectStub } },
});

const BOTH_SCOPES: Scope[] = ['nodeTypePolicy:manage', 'credentialTypePolicy:manage'];

async function setup(name: string, scopes: Scope[] = BOTH_SCOPES) {
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(scopes);
	await useInstancePolicyStore().load(
		scopes.includes('nodeTypePolicy:manage') ? ['node', 'credential'] : ['credential'],
	);
	const rendered = renderDialog({ pinia, props: { credentialType: name, open: true } });
	// Lets the dialog finish loading the node and credential types.
	await new Promise((resolve) => setTimeout(resolve));
	return rendered;
}

const usageIn = (section: HTMLElement) =>
	within(section)
		.queryAllByTestId('type-access-item-usage')
		.map((line) => line.textContent?.trim());

const selectsIn = (section: HTMLElement) => within(section).getAllByTestId('type-access-select');

describe('CredentialTypeAccessDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchInstancePolicy.mockImplementation(async () => ({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 1,
		}));
		mocks.fetchInstanceAccess.mockImplementation(async (_context, kind: string) =>
			access(kind === 'node' ? NODE_ACCESS : CREDENTIAL_ACCESS),
		);
		mocks.setInstanceTypeAccess.mockImplementation(async () => ({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 2,
			warnings: [],
		}));
		mocks.fetchNodeTypeUsage.mockResolvedValue({
			'n8n-nodes-base.airtable': { uses: 1, workflows: 1, activeWorkflows: 1, projects: 1 },
		});
		mocks.fetchCredentialTypeUsage.mockResolvedValue({
			airtableTokenApi: { uses: 3, workflows: 2, activeWorkflows: 0, projects: 1 },
		});
		componentRegistry.register('node-type-icon', {
			props: ['nodeType', 'size'],
			template: '<span data-test-id="node-icon" :data-type="nodeType?.name" />',
		});
		componentRegistry.register('credential-type-icon', {
			props: ['credentialTypeName', 'size'],
			template: '<span data-test-id="credential-icon" :data-type="credentialTypeName" />',
		});
		capabilityRegistry.provide(capabilities.typeDescriptions, {
			load: vi.fn(async () => {}),
			nodeTypes: () => NODE_TYPES,
			credentialTypeDisplayName: (name: string) => CREDENTIAL_NAMES[name],
		});
	});

	afterEach(() => {
		capabilityRegistry.clear();
		componentRegistry.clear();
	});

	it('shows the credential type with its icon and access under an item-specific title', async () => {
		const { getByText, getByTestId } = await setup('airtableApi');

		expect(getByText('Airtable API credential access')).toBeInTheDocument();
		const credential = getByTestId('credential-type-access-credential');
		expect(within(credential).getByTestId('credential-icon')).toHaveAttribute(
			'data-type',
			'airtableApi',
		);
		expect(within(credential).getByTestId('type-access-select')).toHaveAttribute(
			'data-value',
			'allow',
		);
	});

	it('shows the usage of the credential type and of each related type', async () => {
		const { getByTestId } = await setup('airtableApi');

		expect(usageIn(getByTestId('credential-type-access-credential'))).toEqual([
			'Not used in any workflow',
		]);
		expect(usageIn(getByTestId('credential-type-access-related-node'))).toEqual([
			'Used 1 time across 1 workflow · 1 active',
			'Not used in any workflow',
		]);
		expect(usageIn(getByTestId('credential-type-access-related-credential'))).toEqual([
			'Not used in any workflow',
			'Used 3 times across 2 workflows · 0 active',
		]);
	});

	it('shows no usage of node types to a user who cannot manage them', async () => {
		const { getByTestId } = await setup('airtableApi', ['credentialTypePolicy:manage']);

		expect(usageIn(getByTestId('credential-type-access-related-credential'))).toEqual([
			'Not used in any workflow',
			'Used 3 times across 2 workflows · 0 active',
		]);
		expect(usageIn(getByTestId('credential-type-access-related-node'))).toEqual([]);
		expect(mocks.fetchNodeTypeUsage).not.toHaveBeenCalled();
	});

	it('lists the related node types and credential types with their access', async () => {
		const { getByTestId, getByText } = await setup('airtableApi');

		expect(getByText('Possibly related nodes and credentials')).toBeInTheDocument();
		expect(getByTestId('credential-type-access-description')).toHaveTextContent(
			'These nodes and credentials could be related to Airtable API.',
		);
		expect(
			selectsIn(getByTestId('credential-type-access-related-node')).map((el) => [
				el.textContent,
				el.dataset.value,
			]),
		).toEqual([
			['Airtable', 'allow'],
			['Airtable Trigger', 'deny'],
		]);
		expect(
			selectsIn(getByTestId('credential-type-access-related-credential')).map((el) => [
				el.textContent,
				el.dataset.value,
			]),
		).toEqual([
			['Airtable OAuth2 API', 'deny'],
			['Airtable Personal Access Token API', 'allow'],
		]);
	});

	it('shows only a Nodes section when the node types use no other credential type', async () => {
		const { getByTestId, queryByTestId } = await setup('activeCampaignApi');

		expect(getByTestId('credential-type-access-description')).toHaveTextContent(
			'These nodes could be related to ActiveCampaign API. You may want to review their access as well.',
		);
		expect(getByTestId('credential-type-access-related-node')).toHaveTextContent(
			'ActiveCampaign Trigger',
		);
		expect(queryByTestId('credential-type-access-related-credential')).not.toBeInTheDocument();
	});

	it('shows an empty state for a generic credential type', async () => {
		const { getByTestId, queryByTestId } = await setup('httpHeaderAuth');

		expect(getByTestId('credential-type-access-empty')).toHaveTextContent(
			'No other nodes or credentials look related to Header Auth.',
		);
		expect(queryByTestId('credential-type-access-related-node')).not.toBeInTheDocument();
	});

	it('shows six items per section and the rest on request', async () => {
		const { getByTestId, getByText } = await setup('manyApi');
		const nodes = () =>
			within(getByTestId('credential-type-access-related-node')).getAllByTestId('type-access-item');

		expect(nodes()).toHaveLength(6);
		await fireEvent.click(getByText('And 2 more…'));

		expect(nodes()).toHaveLength(8);
	});

	it('saves only the changed related node type, not the credential type', async () => {
		mocks.fetchNodeTypeUsage.mockResolvedValue({});
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		const { getByTestId } = await setup('airtableApi');

		await fireEvent.click(selectsIn(getByTestId('credential-type-access-related-node'))[0]);

		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1));
		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledWith(expect.anything(), 'node', {
			changes: [{ type: 'n8n-nodes-base.airtable', access: 'deny' }],
			version: 1,
		});
		// Lets the save and its access read end, so that a later save of the credential type would show.
		await new Promise((resolve) => setTimeout(resolve));
		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
		expect(
			within(getByTestId('credential-type-access-credential')).getByTestId('type-access-select'),
		).toHaveAttribute('data-value', 'allow');
	});

	it('asks before it restricts a related node type in use, and keeps Allowed when the admin cancels', async () => {
		const { getByTestId } = await setup('airtableApi');
		const review = useRestrictReviewStore();
		const airtableSelect = () => selectsIn(getByTestId('credential-type-access-related-node'))[0];

		await fireEvent.click(airtableSelect());

		await waitFor(() =>
			expect(review.request).toEqual({
				kind: 'node',
				name: 'n8n-nodes-base.airtable',
				label: 'Airtable',
				usage: { uses: 1, workflows: 1, activeWorkflows: 1, projects: 1 },
			}),
		);
		expect(airtableSelect()).toHaveAttribute('data-value', 'allow');

		review.resolve(false);
		await waitFor(() => expect(review.request).toBeNull());
		expect(airtableSelect()).toHaveAttribute('data-value', 'allow');
		expect(mocks.setInstanceTypeAccess).not.toHaveBeenCalled();
	});

	it('restricts the credential type in use when the admin confirms', async () => {
		const { getByTestId } = await setup('airtableTokenApi');
		const review = useRestrictReviewStore();

		await fireEvent.click(
			within(getByTestId('credential-type-access-credential')).getByTestId('type-access-select'),
		);
		await waitFor(() =>
			expect(review.request).toMatchObject({ kind: 'credential', name: 'airtableTokenApi' }),
		);
		review.resolve(true);

		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1));
		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledWith(expect.anything(), 'credential', {
			changes: [{ type: 'airtableTokenApi', access: 'deny' }],
			version: 1,
		});
	});

	it('shows node types without access for a user who cannot manage them', async () => {
		const { getByTestId } = await setup('airtableApi', ['credentialTypePolicy:manage']);
		const nodes = getByTestId('credential-type-access-related-node');

		expect(nodes).toHaveTextContent('Airtable Trigger');
		expect(within(nodes).queryByTestId('type-access-select')).not.toBeInTheDocument();
		expect(selectsIn(getByTestId('credential-type-access-related-credential'))).toHaveLength(2);
	});

	it('shows the chosen access while the save runs, then an error and the saved access when it fails', async () => {
		const save = createDeferredPromise<unknown>();
		mocks.setInstanceTypeAccess.mockReturnValueOnce(save.promise);
		const { getByTestId } = await setup('airtableApi');
		const credentialSelect = () =>
			within(getByTestId('credential-type-access-credential')).getByTestId('type-access-select');

		await fireEvent.click(credentialSelect());
		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1));

		expect(credentialSelect()).toHaveAttribute('data-value', 'deny');
		expect(useInstancePolicyStore().typeAccess.credential?.types.get('airtableApi')?.access).toBe(
			'allow',
		);

		save.reject(new Error('offline'));

		await waitFor(() =>
			expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), 'Could not save the policy'),
		);
		await waitFor(() => expect(credentialSelect()).toHaveAttribute('data-value', 'allow'));
	});

	it('shows an error and the saved access again when the save of a related node fails', async () => {
		// No workflow uses a type, so a change applies with no review.
		mocks.fetchNodeTypeUsage.mockResolvedValue({});
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		mocks.setInstanceTypeAccess.mockRejectedValue(new Error('offline'));
		const { getByTestId } = await setup('airtableApi');
		const airtableSelect = () => selectsIn(getByTestId('credential-type-access-related-node'))[0];

		await fireEvent.click(airtableSelect());

		await waitFor(() =>
			expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), 'Could not save the policy'),
		);
		await waitFor(() => expect(airtableSelect()).toHaveAttribute('data-value', 'allow'));
	});

	it('shows no access, not the access before the save, when the read after a save fails', async () => {
		const { getByTestId } = await setup('airtableApi');
		mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));
		const credentialSelect = () =>
			within(getByTestId('credential-type-access-credential')).getByTestId('type-access-select');

		await fireEvent.click(credentialSelect());

		await waitFor(() =>
			expect(toast.showError).toHaveBeenCalledWith(
				expect.any(Error),
				'Could not load the access of the types',
			),
		);
		expect(credentialSelect()).not.toHaveAttribute('data-value');
	});

	it('keeps showing a later choice when the save of an earlier choice ends', async () => {
		const firstSave = createDeferredPromise<unknown>();
		const secondSave = createDeferredPromise<unknown>();
		mocks.setInstanceTypeAccess
			.mockReturnValueOnce(firstSave.promise)
			.mockReturnValueOnce(secondSave.promise);
		const { getByTestId } = await setup('airtableApi');
		// The server reads the type as restricted after the first save.
		mocks.fetchInstanceAccess.mockImplementation(async (_context, kind: string) =>
			kind === 'node'
				? access(NODE_ACCESS)
				: access({ ...CREDENTIAL_ACCESS, airtableApi: 'deny' }, 2),
		);
		const credentialSelect = () =>
			within(getByTestId('credential-type-access-credential')).getByTestId('type-access-select');

		// Restricts the type, then allows it again while the first save runs.
		await fireEvent.click(credentialSelect());
		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1));
		await fireEvent.click(credentialSelect());
		firstSave.resolve({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 2,
			warnings: [],
		});
		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(2));
		await waitFor(() =>
			expect(useInstancePolicyStore().typeAccess.credential?.types.get('airtableApi')?.access).toBe(
				'deny',
			),
		);
		// Lets the first change end, so that the check below sees what its end leaves.
		await new Promise((resolve) => setTimeout(resolve));

		expect(credentialSelect()).toHaveAttribute('data-value', 'allow');
	});

	it('does not let the admin change a type that a rule leaves open to project opt-in', async () => {
		mocks.fetchInstanceAccess.mockImplementation(async (_context, kind: string) =>
			access(
				kind === 'node'
					? NODE_ACCESS
					: {
							...CREDENTIAL_ACCESS,
							airtableTokenApi: { access: 'delegate', matchedRuleId: 'rule-1' },
						},
			),
		);
		const { getByTestId } = await setup('airtableApi');

		const [oauth, token] = selectsIn(getByTestId('credential-type-access-related-credential'));
		expect(token).toHaveAttribute('data-value', 'delegate');
		expect(token).toBeDisabled();
		expect(oauth).toBeEnabled();
	});

	it('reads the lock of a type only from the access of the current policy version', async () => {
		mocks.fetchInstanceAccess.mockImplementation(async (_context, kind: string) =>
			access(
				kind === 'node'
					? NODE_ACCESS
					: {
							...CREDENTIAL_ACCESS,
							airtableTokenApi: { access: 'delegate', matchedRuleId: 'rule-1' },
						},
			),
		);
		const { getByTestId } = await setup('airtableApi');
		mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));

		await fireEvent.click(
			within(getByTestId('credential-type-access-credential')).getByTestId('type-access-select'),
		);
		await waitFor(() => expect(toast.showError).toHaveBeenCalled());

		const [, token] = selectsIn(getByTestId('credential-type-access-related-credential'));
		expect(token).not.toHaveAttribute('data-value');
		expect(token).toBeEnabled();
	});

	it('closes on Done', async () => {
		const { getByTestId, emitted } = await setup('airtableApi');

		await fireEvent.click(getByTestId('credential-type-access-done'));

		expect(emitted('update:open')).toEqual([[false]]);
	});

	it('claims no related types until the types load, and reports a failed load', async () => {
		capabilityRegistry.clear();
		capabilityRegistry.provide(capabilities.typeDescriptions, {
			load: vi.fn(async () => await Promise.reject(new Error('offline'))),
			nodeTypes: () => [],
			credentialTypeDisplayName: () => undefined,
		});
		const { getByTestId, queryByTestId, queryByText } = await setup('airtableApi');

		await waitFor(() => expect(toast.showError).toHaveBeenCalled());
		expect(getByTestId('credential-type-access-credential')).toBeInTheDocument();
		expect(queryByText('Possibly related nodes and credentials')).not.toBeInTheDocument();
		expect(queryByTestId('credential-type-access-empty')).not.toBeInTheDocument();
	});

	it('reads the access again when it opens after an earlier read failed', async () => {
		mocks.fetchInstanceAccess.mockRejectedValueOnce(new Error('offline'));
		const { getByTestId } = await setup('airtableApi', ['credentialTypePolicy:manage']);

		await waitFor(() =>
			expect(
				within(getByTestId('credential-type-access-credential')).getByTestId('type-access-select'),
			).toHaveAttribute('data-value', 'allow'),
		);
		expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2);
	});
});
