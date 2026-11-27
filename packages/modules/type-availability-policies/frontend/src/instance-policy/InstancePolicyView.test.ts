import { VIEWS } from '@n8n/frontend-constants/views';
import type { Scope } from '@n8n/permissions';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick, reactive } from 'vue';

import InstancePolicyView from './InstancePolicyView.vue';
import { useInstancePolicyStore } from './instance-policy.store';
import { accessFilter } from '../__tests__/table';
import { useRestrictReviewStore } from './restrict-review/restrict-review.store';
import { POLICIES_LANDING_VIEW } from '../type-availability-policies.constants';

const { route, push, replace, track, fetchInstancePolicy, fetchInstanceAccess } = vi.hoisted(
	() => ({
		route: { query: {} as Record<string, string> },
		track: vi.fn(),
		push: vi.fn(),
		replace: vi.fn(),
		fetchInstancePolicy: vi.fn(),
		fetchInstanceAccess: vi.fn(),
	}),
);

vi.mock('../type-availability-policies.api', () => ({
	fetchInstancePolicy,
	setInstanceTypeAccess: vi.fn(),
	fetchInstanceAccess,
	fetchCredentialTypeSummaries: vi.fn(
		async () => new Map([['bitlyApi', { displayName: 'Bitly API' }]]),
	),
	fetchNodeTypeSummaries: vi.fn(
		async () => new Map([['n8n-nodes-base.notion', { displayName: 'Notion', hidden: false }]]),
	),
	fetchCredentialTypeUsage: vi.fn(async () => ({})),
	fetchNodeTypeUsage: vi.fn(async () => ({})),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

// Reactive, so that a test can change the query of a mounted page.
const reactiveRoute = reactive(route);

vi.mock('vue-router', () => ({
	useRoute: () => reactiveRoute,
	useRouter: () => ({ push, replace }),
}));

// Closes as the real dialog does: it asks to close, then announces where the focus returns.
const closeDialog = {
	close(this: { $emit: (event: string, ...args: unknown[]) => void }) {
		this.$emit('update:open', false);
		this.$emit('closeAutoFocus', new Event('focusScope.autoFocusOnUnmount', { cancelable: true }));
	},
};

const nodeTypeAccessDialogStub = {
	props: ['open', 'nodeType'],
	emits: ['update:open', 'closeAutoFocus'],
	methods: closeDialog,
	template:
		'<button data-test-id="node-type-access-dialog" :data-node-type="nodeType" @click="close" />',
};

const credentialTypeAccessDialogStub = {
	props: ['open', 'credentialType'],
	emits: ['update:open', 'closeAutoFocus'],
	methods: closeDialog,
	template:
		'<button data-test-id="credential-type-access-dialog" :data-credential-type="credentialType" @click="close" />',
};

const renderView = createComponentRenderer(InstancePolicyView, {
	global: {
		stubs: {
			NodeTypeAccessDialog: nodeTypeAccessDialogStub,
			CredentialTypeAccessDialog: credentialTypeAccessDialogStub,
		},
	},
});

const BOTH_SCOPES: Scope[] = ['nodeTypePolicy:manage', 'credentialTypePolicy:manage'];

const setup = (scopes: Scope[] = BOTH_SCOPES, query: Record<string, string> = {}) => {
	route.query = query;
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(scopes);
	return renderView({ pinia });
};

const credentialAccess = (names: string[]) => ({
	scopeId: null,
	version: 0,
	defaultAction: 'allow',
	types: names.map((name) => ({ name, access: 'allow', matchedRuleId: null })),
});

/** Opens the view with the access that an earlier visit left in the store. */
const setupAfterEarlierVisit = async (query: Record<string, string>) => {
	route.query = query;
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(BOTH_SCOPES);
	fetchInstanceAccess.mockResolvedValueOnce(credentialAccess(['bitlyApi']));
	await useInstancePolicyStore().load(['credential']);
	return renderView({ pinia });
};

describe('InstancePolicyView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchInstancePolicy.mockResolvedValue({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 0,
		});
		fetchInstanceAccess.mockResolvedValue({
			scopeId: null,
			version: 0,
			defaultAction: 'allow',
			types: [
				{ name: 'bitlyApi', access: 'allow', matchedRuleId: null },
				{ name: 'airtableApi', access: 'allow', matchedRuleId: null },
				{ name: 'n8n-nodes-base.notion', access: 'allow', matchedRuleId: null },
			],
		});
	});

	it('loads the node and credential policies when it opens', async () => {
		setup();

		await waitFor(() => expect(fetchInstancePolicy).toHaveBeenCalledTimes(2));
		expect(fetchInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'node');
		expect(fetchInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'credential');
	});

	it('loads only the node policy for a user with only the node scope', async () => {
		setup(['nodeTypePolicy:manage']);

		await waitFor(() => expect(fetchInstancePolicy).toHaveBeenCalled());
		expect(fetchInstancePolicy).toHaveBeenCalledTimes(1);
		expect(fetchInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'node');
	});

	it('renders the page frame with the Nodes tab selected', () => {
		const { getByText, getByRole } = setup();

		expect(getByText('Global instance policy')).toBeInTheDocument();
		expect(
			getByText('Applies to every project. Projects can restrict it, not lift it.'),
		).toBeInTheDocument();
		expect(getByRole('radio', { checked: true })).toHaveTextContent('Nodes');
	});

	it('links to the documentation of node and credential availability', () => {
		const { getByRole } = setup();

		expect(getByRole('link', { name: /documentation/ })).toHaveAttribute(
			'href',
			'https://docs.n8n.io/administer/manage-users-and-access/control-node-availability',
		);
	});

	it('marks the page as a preview', () => {
		const { getByTestId } = setup();

		expect(getByTestId('instance-policy-preview-badge')).toBeInTheDocument();
	});

	it('goes back to the landing page', async () => {
		const { getByText } = setup();

		await fireEvent.click(getByText('Node and credential policies'));

		expect(push).toHaveBeenCalledWith({ name: POLICIES_LANDING_VIEW });
	});

	it('goes back to the Policies page for a user who skips the landing page', async () => {
		const { getByText } = setup(['nodeTypePolicy:manage']);

		await fireEvent.click(getByText('Policies'));

		expect(push).toHaveBeenCalledWith({ name: VIEWS.SECURITY_SETTINGS });
	});

	it('shows both tabs to a user with both scopes', () => {
		const { getByTestId } = setup();

		expect(getByTestId('instance-policy-tabs')).toHaveTextContent('Nodes');
		expect(getByTestId('instance-policy-tabs')).toHaveTextContent('Credentials');
	});

	it('shows only the Nodes tab to a user with only the node scope', () => {
		const { getByTestId } = setup(['nodeTypePolicy:manage']);

		expect(getByTestId('instance-policy-tabs')).toHaveTextContent('Nodes');
		expect(getByTestId('instance-policy-tabs')).not.toHaveTextContent('Credentials');
	});

	it('opens the Credentials tab for a user with only the credential scope', () => {
		const { getByTestId, getByRole } = setup(['credentialTypePolicy:manage']);

		expect(getByTestId('instance-policy-tabs')).not.toHaveTextContent('Nodes');
		expect(getByRole('radio', { checked: true })).toHaveTextContent('Credentials');
	});

	it('opens the tab named in the query', () => {
		const { getByRole } = setup(BOTH_SCOPES, { tab: 'credential' });

		expect(getByRole('radio', { checked: true })).toHaveTextContent('Credentials');
	});

	it('shows the node types on the Nodes tab', async () => {
		const { findByText } = setup();

		expect(await findByText('Notion')).toBeInTheDocument();
		expect(fetchInstanceAccess).toHaveBeenCalledWith(expect.anything(), 'node');
	});

	it('shows the credential types on the Credentials tab', async () => {
		const { findByText } = setup(BOTH_SCOPES, { tab: 'credential' });

		expect(await findByText('Bitly API')).toBeInTheDocument();
		expect(fetchInstanceAccess).toHaveBeenCalledWith(expect.anything(), 'credential');
	});

	it('does not load the credential types for a user with only the node scope', async () => {
		const { queryByTestId } = setup(['nodeTypePolicy:manage'], { tab: 'credential' });

		await waitFor(() =>
			expect(fetchInstanceAccess).toHaveBeenCalledWith(expect.anything(), 'node'),
		);
		expect(queryByTestId('credential-types-tab')).not.toBeInTheDocument();
		expect(queryByTestId('node-types-tab')).toBeInTheDocument();
		expect(fetchInstanceAccess).not.toHaveBeenCalledWith(expect.anything(), 'credential');
	});

	it('falls back to the first tab the user can manage when the query names another', () => {
		const { getByRole } = setup(['nodeTypePolicy:manage'], { tab: 'credential' });

		expect(getByRole('radio', { checked: true })).toHaveTextContent('Nodes');
	});

	it('writes the selected tab to the query', async () => {
		const { getByText } = setup();

		await fireEvent.click(getByText('Credentials'));

		expect(replace).toHaveBeenCalledWith({ query: { tab: 'credential' } });
	});

	it('opens the node dialog named in the query', () => {
		const { getByTestId } = setup(BOTH_SCOPES, { details: 'n8n-nodes-base.notion' });

		expect(getByTestId('node-type-access-dialog')).toHaveAttribute(
			'data-node-type',
			'n8n-nodes-base.notion',
		);
	});

	it('does not open the node dialog for a user who cannot manage node types', () => {
		const { queryByTestId } = setup(['credentialTypePolicy:manage'], {
			tab: 'node',
			details: 'n8n-nodes-base.notion',
		});

		expect(queryByTestId('node-type-access-dialog')).not.toBeInTheDocument();
		expect(queryByTestId('credential-type-access-dialog')).not.toBeInTheDocument();
	});

	it('opens no dialog for a link to a tab the user cannot see', () => {
		const { queryByTestId } = setup(['nodeTypePolicy:manage'], {
			tab: 'credential',
			details: 'airtableApi',
		});

		expect(queryByTestId('node-type-access-dialog')).not.toBeInTheDocument();
		expect(queryByTestId('credential-type-access-dialog')).not.toBeInTheDocument();
	});

	it('reads a link without a tab as a node link', () => {
		const { queryByTestId } = setup(['credentialTypePolicy:manage'], {
			details: 'n8n-nodes-base.notion',
		});

		expect(queryByTestId('credential-type-access-dialog')).not.toBeInTheDocument();
	});

	it('opens the credential dialog named in the query on the Credentials tab', () => {
		const { getByTestId, queryByTestId } = setup(BOTH_SCOPES, {
			tab: 'credential',
			details: 'airtableApi',
		});

		expect(getByTestId('credential-type-access-dialog')).toHaveAttribute(
			'data-credential-type',
			'airtableApi',
		);
		expect(queryByTestId('node-type-access-dialog')).not.toBeInTheDocument();
	});

	it('closes the dialog of a type that the server does not list', async () => {
		setup(BOTH_SCOPES, { tab: 'credential', details: 'unknownApi' });

		await waitFor(() => expect(replace).toHaveBeenCalledWith({ query: { tab: 'credential' } }));
	});

	it('keeps the dialog of a listed type open after the access loads', async () => {
		const { getByTestId } = setup(BOTH_SCOPES, { tab: 'credential', details: 'airtableApi' });

		await waitFor(() =>
			expect(fetchInstanceAccess).toHaveBeenCalledWith(expect.anything(), 'credential'),
		);
		await new Promise((resolve) => setTimeout(resolve));

		expect(replace).not.toHaveBeenCalled();
		expect(getByTestId('credential-type-access-dialog')).toBeInTheDocument();
	});

	it('keeps the dialog open when the access does not load', async () => {
		fetchInstanceAccess.mockRejectedValue(new Error('offline'));
		setup(BOTH_SCOPES, { tab: 'credential', details: 'unknownApi' });

		await waitFor(() =>
			expect(fetchInstanceAccess).toHaveBeenCalledWith(expect.anything(), 'credential'),
		);
		await new Promise((resolve) => setTimeout(resolve));

		expect(replace).not.toHaveBeenCalled();
	});

	it('keeps the dialog of a type installed after an earlier visit open', async () => {
		fetchInstanceAccess.mockResolvedValue(credentialAccess(['bitlyApi', 'newApi']));
		const { getByTestId } = await setupAfterEarlierVisit({ tab: 'credential', details: 'newApi' });

		await waitFor(() => expect(fetchInstanceAccess).toHaveBeenCalledTimes(3));
		await new Promise((resolve) => setTimeout(resolve));

		expect(replace).not.toHaveBeenCalled();
		expect(getByTestId('credential-type-access-dialog')).toBeInTheDocument();
	});

	it('keeps the dialog open when the access of this visit does not load', async () => {
		fetchInstanceAccess.mockRejectedValue(new Error('offline'));
		await setupAfterEarlierVisit({ tab: 'credential', details: 'newApi' });

		// The view reads the access, and the tab reads it again after that read fails.
		await waitFor(() => expect(fetchInstanceAccess).toHaveBeenCalledTimes(3));
		await new Promise((resolve) => setTimeout(resolve));

		expect(replace).not.toHaveBeenCalled();
	});

	it('closes the dialog of an unknown type after an earlier visit once the access loads', async () => {
		fetchInstanceAccess.mockResolvedValue(credentialAccess(['bitlyApi']));
		await setupAfterEarlierVisit({ tab: 'credential', details: 'unknownApi' });

		await waitFor(() => expect(replace).toHaveBeenCalledWith({ query: { tab: 'credential' } }));
	});

	it('opens the credential dialog for a user who can manage only credential types', () => {
		const { getByTestId } = setup(['credentialTypePolicy:manage'], {
			tab: 'credential',
			details: 'airtableApi',
		});

		expect(getByTestId('credential-type-access-dialog')).toBeInTheDocument();
	});

	it('opens the credential dialog when the admin clicks a row of the Credentials tab', async () => {
		fetchInstanceAccess.mockResolvedValue({
			scopeId: null,
			version: 0,
			defaultAction: 'allow',
			types: [{ name: 'bitlyApi', access: 'allow', matchedRuleId: null }],
		});
		const { findByText } = setup(BOTH_SCOPES, { tab: 'credential' });

		await fireEvent.click(await findByText('Bitly API'));

		expect(replace).toHaveBeenCalledWith({ query: { tab: 'credential', details: 'bitlyApi' } });
	});

	it('opens the node dialog when the admin clicks a row of the Nodes tab', async () => {
		fetchInstanceAccess.mockResolvedValue({
			scopeId: null,
			version: 0,
			defaultAction: 'allow',
			types: [{ name: 'n8n-nodes-base.notion', access: 'allow', matchedRuleId: null }],
		});
		const { findByText } = setup(BOTH_SCOPES, { tab: 'node' });

		await fireEvent.click(await findByText('Notion'));

		expect(replace).toHaveBeenCalledWith({
			query: { tab: 'node', details: 'n8n-nodes-base.notion' },
		});
	});

	it('closes the dialog when the admin changes the tab', async () => {
		const { getByText } = setup(BOTH_SCOPES, { tab: 'credential', details: 'airtableApi' });

		await fireEvent.click(getByText('Nodes'));

		expect(replace).toHaveBeenCalledWith({ query: { tab: 'node' } });
	});

	it('removes the node from the query when the dialog closes', async () => {
		const { getByTestId } = setup(BOTH_SCOPES, { tab: 'node', details: 'n8n-nodes-base.notion' });

		await fireEvent.click(getByTestId('node-type-access-dialog'));

		expect(replace).toHaveBeenCalledWith({ query: { tab: 'node' } });
	});

	describe('focus when the dialog closes', () => {
		const NODE_DIALOG = { tab: 'node', details: 'n8n-nodes-base.notion' };
		const NOTION_ROW = 'instance-policy-open-n8n-nodes-base.notion';
		// The focus is inside the open dialog when it closes.
		const closeFromInside = async (dialog: HTMLElement) => {
			dialog.focus();
			await fireEvent.click(dialog);
		};

		it('returns the focus to the row of the type', async () => {
			const { getByTestId, findByTestId } = setup(BOTH_SCOPES, NODE_DIALOG);
			const rowButton = await findByTestId(NOTION_ROW);

			await closeFromInside(getByTestId('node-type-access-dialog'));

			expect(rowButton).toHaveFocus();
		});

		it('moves the focus to the access filter when the row is not in the table', async () => {
			const { getByTestId, getByRole, findByTestId, getByPlaceholderText, queryByTestId } = setup(
				BOTH_SCOPES,
				NODE_DIALOG,
			);
			await findByTestId(NOTION_ROW);
			await fireEvent.update(getByPlaceholderText('Search nodes'), 'no match');
			expect(queryByTestId(NOTION_ROW)).not.toBeInTheDocument();

			await closeFromInside(getByTestId('node-type-access-dialog'));

			expect(accessFilter(getByRole)).toHaveFocus();
		});

		it('returns the focus on the Credentials tab too', async () => {
			const { getByTestId, findByTestId } = setup(BOTH_SCOPES, {
				tab: 'credential',
				details: 'bitlyApi',
			});
			const rowButton = await findByTestId('instance-policy-open-bitlyApi');

			await closeFromInside(getByTestId('credential-type-access-dialog'));

			expect(rowButton).toHaveFocus();
		});
	});

	it('cancels the reviews of the access dialog when the dialog closes', async () => {
		setup(BOTH_SCOPES, { tab: 'node', details: 'n8n-nodes-base.notion' });
		const cancelAll = vi.spyOn(useRestrictReviewStore(), 'cancelAll');

		reactiveRoute.query = { tab: 'node' };
		await nextTick();

		expect(cancelAll).toHaveBeenCalledTimes(1);
	});

	it('keeps the reviews of the table when an access dialog opens', async () => {
		setup(BOTH_SCOPES, { tab: 'node' });
		const cancelAll = vi.spyOn(useRestrictReviewStore(), 'cancelAll');

		reactiveRoute.query = { tab: 'node', details: 'n8n-nodes-base.notion' };
		await nextTick();

		expect(cancelAll).not.toHaveBeenCalled();
	});

	it('cancels the open review and each review that still loads when the admin leaves', () => {
		const { unmount } = setup();
		const cancelAll = vi.spyOn(useRestrictReviewStore(), 'cancelAll');

		unmount();

		expect(cancelAll).toHaveBeenCalledTimes(1);
	});

	describe('telemetry', () => {
		const openedEvent = TELEMETRY_EVENT.TYPE_AVAILABILITY_POLICIES.USER_OPENED_TYPE_ACCESS_DIALOG;

		it('reports a dialog that a link opens once the server lists the type', async () => {
			setup(BOTH_SCOPES, { tab: 'credential', details: 'airtableApi' });

			await waitFor(() =>
				expect(track).toHaveBeenCalledWith(openedEvent, {
					kind: 'credential-types',
					type_name: 'airtableApi',
					source: 'link',
					current_access: 'allow',
				}),
			);
			expect(track).toHaveBeenCalledTimes(1);
		});

		it('does not report a link to a type that the server does not list', async () => {
			setup(BOTH_SCOPES, { tab: 'credential', details: 'unknownApi' });

			await waitFor(() => expect(replace).toHaveBeenCalledWith({ query: { tab: 'credential' } }));
			expect(track).not.toHaveBeenCalledWith(openedEvent, expect.anything());
		});

		it('reports a dialog that a click in the table opens', async () => {
			replace.mockImplementationOnce(({ query }: { query: Record<string, string> }) => {
				reactiveRoute.query = query;
			});
			fetchInstanceAccess.mockResolvedValue({
				scopeId: null,
				version: 0,
				defaultAction: 'allow',
				types: [{ name: 'n8n-nodes-base.notion', access: 'deny', matchedRuleId: 'rule-1' }],
			});
			const { findByText } = setup(BOTH_SCOPES, { tab: 'node' });

			await fireEvent.click(await findByText('Notion'));

			await waitFor(() =>
				expect(track).toHaveBeenCalledWith(openedEvent, {
					kind: 'node-types',
					type_name: 'n8n-nodes-base.notion',
					source: 'table',
					current_access: 'deny',
				}),
			);
			expect(track).toHaveBeenCalledTimes(1);
		});

		it('reports each opening of the same type, and a link after a table click as a link', async () => {
			const followReplace = ({ query }: { query: Record<string, string> }) => {
				reactiveRoute.query = query;
			};
			replace.mockImplementationOnce(followReplace).mockImplementationOnce(followReplace);
			fetchInstanceAccess.mockResolvedValue(credentialAccess(['bitlyApi', 'airtableApi']));
			const { findByTestId } = setup(BOTH_SCOPES, { tab: 'credential' });

			await fireEvent.click(await findByTestId('instance-policy-open-bitlyApi'));
			await waitFor(() => expect(track).toHaveBeenCalledTimes(1));
			reactiveRoute.query = { tab: 'credential' };
			await nextTick();
			await fireEvent.click(await findByTestId('instance-policy-open-bitlyApi'));
			await waitFor(() => expect(track).toHaveBeenCalledTimes(2));
			reactiveRoute.query = { tab: 'credential', details: 'airtableApi' };

			await waitFor(() => expect(track).toHaveBeenCalledTimes(3));
			expect(track.mock.calls.map(([, { type_name, source }]) => [type_name, source])).toEqual([
				['bitlyApi', 'table'],
				['bitlyApi', 'table'],
				['airtableApi', 'link'],
			]);
		});

		it('does not report a link that only the access of an earlier visit lists', async () => {
			fetchInstanceAccess.mockResolvedValue(credentialAccess([]));
			await setupAfterEarlierVisit({ tab: 'credential', details: 'bitlyApi' });

			await waitFor(() => expect(replace).toHaveBeenCalledWith({ query: { tab: 'credential' } }));
			expect(track).not.toHaveBeenCalledWith(openedEvent, expect.anything());
		});
	});
});
