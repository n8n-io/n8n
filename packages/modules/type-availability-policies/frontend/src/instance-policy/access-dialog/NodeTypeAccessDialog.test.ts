import type { PolicyAction } from '@n8n/api-types';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NodeTypeAccessDialog from './NodeTypeAccessDialog.vue';
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
	props: ['modelValue', 'label', 'loading'],
	emits: ['update:modelValue'],
	template:
		'<button data-test-id="type-access-select" :data-value="modelValue" :data-loading="loading" @click="$emit(\'update:modelValue\', modelValue === \'deny\' ? \'allow\' : \'deny\')">{{ label }}</button>',
};

function nodeType(name: string, displayName: string, credentials: string[] = []) {
	return {
		name,
		displayName,
		version: 1,
		credentials: credentials.map((credential) => ({ name: credential })),
	} as INodeTypeDescription;
}

const NODE_TYPES = [
	nodeType('n8n-nodes-base.notion', 'Notion', ['notionApi', 'notionOAuth2Api', 'httpHeaderAuth']),
	nodeType('n8n-nodes-base.notionTrigger', 'Notion Trigger', ['notionApi']),
	nodeType('n8n-nodes-base.gmail', 'Gmail', ['googleApi', 'gmailOAuth2']),
	nodeType('n8n-nodes-base.googleDrive', 'Google Drive', ['googleApi']),
	nodeType('n8n-nodes-base.hackerNews', 'Hacker News'),
	nodeType('n8n-nodes-base.httpRequest', 'HTTP Request', ['httpHeaderAuth']),
	nodeType('n8n-nodes-base.many', 'Many', ['manyApi']),
	...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter) =>
		nodeType(`n8n-nodes-base.other${letter}`, `Other ${letter}`, ['manyApi']),
	),
];

const CREDENTIAL_NAMES: Record<string, string> = {
	notionApi: 'Notion API',
	notionOAuth2Api: 'Notion OAuth2 API',
	googleApi: 'Google Service Account API',
	gmailOAuth2: 'Gmail OAuth2 API',
};

const access = (kind: string, byName: Record<string, PolicyAction>, version = 1) => ({
	scopeId: null,
	version,
	defaultAction: 'allow',
	types: Object.entries(byName).map(([name, action]) => ({
		name,
		access: action,
		matchedRuleId: null,
	})),
	kind,
});

const renderDialog = createComponentRenderer(NodeTypeAccessDialog, {
	global: { stubs: { TypeAccessSelect: typeAccessSelectStub } },
});

async function setup(
	name: string,
	scopes: Scope[] = ['nodeTypePolicy:manage', 'credentialTypePolicy:manage'],
) {
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(scopes);
	await useInstancePolicyStore().load(
		scopes.includes('credentialTypePolicy:manage') ? ['node', 'credential'] : ['node'],
	);
	const rendered = renderDialog({ pinia, props: { nodeType: name, open: true } });
	// Lets the dialog finish loading the node and credential types.
	await new Promise((resolve) => setTimeout(resolve));
	return rendered;
}

const usageIn = (section: HTMLElement) =>
	within(section)
		.queryAllByTestId('type-access-item-usage')
		.map((line) => line.textContent?.trim());

describe('NodeTypeAccessDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchInstancePolicy.mockImplementation(async () => ({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 1,
		}));
		mocks.fetchInstanceAccess.mockImplementation(async (_context, kind: string) =>
			kind === 'node'
				? access(kind, {
						'n8n-nodes-base.notion': 'allow',
						'n8n-nodes-base.notionTrigger': 'allow',
					})
				: access(kind, { notionApi: 'deny', notionOAuth2Api: 'allow' }),
		);
		mocks.setInstanceTypeAccess.mockImplementation(async () => ({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 2,
			warnings: [],
		}));
		mocks.fetchNodeTypeUsage.mockResolvedValue({
			'n8n-nodes-base.notion': { uses: 3, workflows: 2, activeWorkflows: 1, projects: 1 },
		});
		mocks.fetchCredentialTypeUsage.mockResolvedValue({
			notionApi: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
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

	it('shows the icon of the node and of each related type', async () => {
		const { getByTestId } = await setup('n8n-nodes-base.notion');

		expect(within(getByTestId('node-type-access-node')).getByTestId('node-icon')).toHaveAttribute(
			'data-type',
			'n8n-nodes-base.notion',
		);
		expect(
			within(getByTestId('node-type-access-related-node')).getByTestId('node-icon'),
		).toHaveAttribute('data-type', 'n8n-nodes-base.notionTrigger');
		expect(
			within(getByTestId('node-type-access-related-credential'))
				.getAllByTestId('credential-icon')
				.map((icon) => icon.dataset.type),
		).toEqual(['notionApi', 'notionOAuth2Api']);
	});

	it('shows the node with its access, and its related nodes and credentials', async () => {
		const { getByText, getByTestId } = await setup('n8n-nodes-base.notion');

		expect(getByText('Notion node access')).toBeInTheDocument();
		expect(
			within(getByTestId('node-type-access-node')).getByTestId('type-access-select'),
		).toHaveAttribute('data-value', 'allow');

		const nodes = within(getByTestId('node-type-access-related-node')).getAllByTestId(
			'type-access-select',
		);
		expect(nodes.map((el) => [el.textContent, el.dataset.value])).toEqual([
			['Notion Trigger', 'allow'],
		]);

		const credentials = within(getByTestId('node-type-access-related-credential')).getAllByTestId(
			'type-access-select',
		);
		expect(credentials.map((el) => [el.textContent, el.dataset.value])).toEqual([
			['Notion API', 'deny'],
			['Notion OAuth2 API', 'allow'],
		]);
	});

	it('shows the usage of the node and of each related type', async () => {
		const { getByTestId } = await setup('n8n-nodes-base.notion');

		expect(usageIn(getByTestId('node-type-access-node'))).toEqual([
			'Used 3 times across 2 workflows · 1 active',
		]);
		expect(usageIn(getByTestId('node-type-access-related-node'))).toEqual([
			'Not used in any workflow',
		]);
		expect(usageIn(getByTestId('node-type-access-related-credential'))).toEqual([
			'Used 1 time across 1 workflow · 0 active',
			'Not used in any workflow',
		]);
	});

	it('shows no usage of credential types to a user who cannot manage them', async () => {
		const { getByTestId } = await setup('n8n-nodes-base.notion', ['nodeTypePolicy:manage']);

		expect(usageIn(getByTestId('node-type-access-node'))).toEqual([
			'Used 3 times across 2 workflows · 1 active',
		]);
		expect(usageIn(getByTestId('node-type-access-related-credential'))).toEqual([]);
		expect(mocks.fetchCredentialTypeUsage).not.toHaveBeenCalled();
	});

	it('shows no usage of a kind whose counts do not load, and the usage of the other kind', async () => {
		mocks.fetchNodeTypeUsage.mockRejectedValue(new Error('offline'));
		const { getByTestId } = await setup('n8n-nodes-base.notion');

		expect(usageIn(getByTestId('node-type-access-node'))).toEqual([]);
		expect(usageIn(getByTestId('node-type-access-related-node'))).toEqual([]);
		expect(usageIn(getByTestId('node-type-access-related-credential'))).toEqual([
			'Used 1 time across 1 workflow · 0 active',
			'Not used in any workflow',
		]);
		expect(
			within(getByTestId('node-type-access-node')).getByTestId('type-access-select'),
		).toHaveAttribute('data-value', 'allow');
	});

	it('does not relate Gmail to other Google nodes through the shared Google credential', async () => {
		const { queryByTestId, getByTestId } = await setup('n8n-nodes-base.gmail');

		expect(queryByTestId('node-type-access-related-node')).not.toBeInTheDocument();
		expect(getByTestId('node-type-access-related-credential')).toHaveTextContent(
			'Google Service Account API',
		);
	});

	it('shows an empty state for a node type with no related types', async () => {
		const { getByTestId, queryByTestId } = await setup('n8n-nodes-base.hackerNews');

		expect(getByTestId('node-type-access-empty')).toHaveTextContent(
			'No other nodes or credentials are related to Hacker News.',
		);
		expect(queryByTestId('node-type-access-related-node')).not.toBeInTheDocument();
	});

	it('explains that HTTP Request can use almost any credential type', async () => {
		const { getByTestId, queryByTestId } = await setup('n8n-nodes-base.httpRequest');

		expect(getByTestId('node-type-access-any-credential')).toHaveTextContent('HTTP Request');
		expect(queryByTestId('node-type-access-empty')).not.toBeInTheDocument();
	});

	it('shows six items per section and the rest on request', async () => {
		const { getByTestId, getByText } = await setup('n8n-nodes-base.many');
		const nodes = () =>
			within(getByTestId('node-type-access-related-node')).getAllByTestId('type-access-item');

		expect(nodes()).toHaveLength(6);
		await fireEvent.click(getByText('And 2 more…'));

		expect(nodes()).toHaveLength(8);
	});

	it('saves only the changed related credential type, not the node type', async () => {
		const { getByTestId } = await setup('n8n-nodes-base.notion');
		const notionOAuth = within(getByTestId('node-type-access-related-credential')).getAllByTestId(
			'type-access-select',
		)[1];

		await fireEvent.click(notionOAuth);

		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1));
		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledWith(expect.anything(), 'credential', {
			changes: [{ type: 'notionOAuth2Api', access: 'deny' }],
			version: 1,
		});
	});

	it('shows credential types without access for a user who cannot manage them', async () => {
		const { getByTestId } = await setup('n8n-nodes-base.notion', ['nodeTypePolicy:manage']);
		const credentials = getByTestId('node-type-access-related-credential');

		expect(credentials).toHaveTextContent('Notion API');
		expect(within(credentials).queryByTestId('type-access-select')).not.toBeInTheDocument();
		expect(
			within(getByTestId('node-type-access-related-node')).getByTestId('type-access-select'),
		).toBeInTheDocument();
	});

	it('reads the access again on open when an earlier read failed', async () => {
		mocks.fetchInstanceAccess.mockRejectedValueOnce(new Error('offline'));
		const { getByTestId } = await setup('n8n-nodes-base.notion', ['nodeTypePolicy:manage']);

		await waitFor(() =>
			expect(
				within(getByTestId('node-type-access-node')).getByTestId('type-access-select'),
			).toHaveAttribute('data-value', 'allow'),
		);
	});

	it('closes on Done', async () => {
		const { getByTestId, emitted } = await setup('n8n-nodes-base.notion');

		await fireEvent.click(getByTestId('node-type-access-done'));

		expect(emitted('update:open')).toEqual([[false]]);
	});

	it('shows the chosen access while the save runs, and the saved access again when it fails', async () => {
		const save = createDeferredPromise<never>();
		mocks.setInstanceTypeAccess.mockReturnValue(save.promise);
		const { getByTestId } = await setup('n8n-nodes-base.notion');
		const notionOAuth = () =>
			within(getByTestId('node-type-access-related-credential')).getAllByTestId(
				'type-access-select',
			)[1];

		await fireEvent.click(notionOAuth());
		await waitFor(() => expect(notionOAuth()).toHaveAttribute('data-value', 'deny'));
		save.reject(new Error('offline'));

		await waitFor(() =>
			expect(toast.showError).toHaveBeenCalledWith(
				new Error('offline'),
				'Could not save the policy',
			),
		);
		await waitFor(() => expect(notionOAuth()).toHaveAttribute('data-value', 'allow'));
	});

	it('claims no related types until the types load, and reports a failed load', async () => {
		capabilityRegistry.clear();
		capabilityRegistry.provide(capabilities.typeDescriptions, {
			load: vi.fn(async () => await Promise.reject(new Error('offline'))),
			nodeTypes: () => [],
			credentialTypeDisplayName: () => undefined,
		});
		const { queryByTestId } = await setup('n8n-nodes-base.notion');

		await waitFor(() => expect(toast.showError).toHaveBeenCalled());
		expect(queryByTestId('node-type-access-empty')).not.toBeInTheDocument();
	});

	it('keeps showing the latest choice when an earlier save on the same row ends', async () => {
		mocks.fetchNodeTypeUsage.mockResolvedValue({});
		mocks.fetchCredentialTypeUsage.mockResolvedValue({});
		const firstSave = createDeferredPromise<unknown>();
		const secondSave = createDeferredPromise<unknown>();
		mocks.setInstanceTypeAccess
			.mockReturnValueOnce(firstSave.promise)
			.mockReturnValueOnce(secondSave.promise);
		const { getByTestId } = await setup('n8n-nodes-base.notion');
		const nodeSelect = () =>
			within(getByTestId('node-type-access-node')).getByTestId('type-access-select');

		await fireEvent.click(nodeSelect());
		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1));
		await fireEvent.click(nodeSelect());
		expect(nodeSelect()).toHaveAttribute('data-value', 'allow');

		// The server now holds the first choice, so only the pending second choice shows Allowed.
		mocks.fetchInstanceAccess.mockResolvedValue(
			access('node', { 'n8n-nodes-base.notion': 'deny' }, 2),
		);
		firstSave.resolve({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 2,
			warnings: [],
		});
		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(2));

		expect(nodeSelect()).toHaveAttribute('data-value', 'allow');
	});

	it('asks before it restricts a node type in use, and keeps Allowed when the admin cancels', async () => {
		const { getByTestId } = await setup('n8n-nodes-base.notion');
		const review = useRestrictReviewStore();
		const nodeSelect = () =>
			within(getByTestId('node-type-access-node')).getByTestId('type-access-select');

		await fireEvent.click(nodeSelect());

		await waitFor(() =>
			expect(review.request).toEqual({
				kind: 'node',
				name: 'n8n-nodes-base.notion',
				label: 'Notion',
				usage: { uses: 3, workflows: 2, activeWorkflows: 1, projects: 1 },
			}),
		);
		expect(nodeSelect()).toHaveAttribute('data-value', 'allow');

		review.resolve(false);
		await waitFor(() => expect(review.request).toBeNull());
		expect(nodeSelect()).toHaveAttribute('data-value', 'allow');
		expect(mocks.setInstanceTypeAccess).not.toHaveBeenCalled();
	});

	it('shows that a restriction waits for the usage counts', async () => {
		const { getByTestId } = await setup('n8n-nodes-base.notion');
		const counts = createDeferredPromise<Record<string, unknown>>();
		mocks.fetchNodeTypeUsage.mockReturnValue(counts.promise);
		const nodeSelect = () =>
			within(getByTestId('node-type-access-node')).getByTestId('type-access-select');

		await fireEvent.click(nodeSelect());

		await waitFor(() => expect(nodeSelect()).toHaveAttribute('data-loading', 'true'));

		counts.resolve({});
		await waitFor(() => expect(nodeSelect()).toHaveAttribute('data-loading', 'false'));
		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1));
	});

	it('restricts a node type in use when the admin confirms', async () => {
		const { getByTestId } = await setup('n8n-nodes-base.notion');
		const review = useRestrictReviewStore();

		await fireEvent.click(
			within(getByTestId('node-type-access-node')).getByTestId('type-access-select'),
		);
		await waitFor(() => expect(review.request).not.toBeNull());
		review.resolve(true);

		await waitFor(() => expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1));
		expect(mocks.setInstanceTypeAccess).toHaveBeenCalledWith(expect.anything(), 'node', {
			changes: [{ type: 'n8n-nodes-base.notion', access: 'deny' }],
			version: 1,
		});
	});

	it('shows no Credentials tab advice to a user who cannot manage credential types', async () => {
		const { queryByTestId, getByTestId } = await setup('n8n-nodes-base.httpRequest', [
			'nodeTypePolicy:manage',
		]);

		expect(queryByTestId('node-type-access-any-credential')).not.toBeInTheDocument();
		expect(getByTestId('node-type-access-empty')).toBeInTheDocument();
	});
});
