import { VIEWS } from '@n8n/frontend-constants/views';
import type { Scope } from '@n8n/permissions';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import InstancePolicyView from './InstancePolicyView.vue';
import { POLICIES_LANDING_VIEW } from '../type-availability-policies.constants';

const { route, push, replace, fetchInstancePolicy, fetchInstanceAccess } = vi.hoisted(() => ({
	route: { query: {} as Record<string, string> },
	push: vi.fn(),
	replace: vi.fn(),
	fetchInstancePolicy: vi.fn(),
	fetchInstanceAccess: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => ({
	fetchInstancePolicy,
	saveInstancePolicy: vi.fn(),
	fetchInstanceAccess,
	fetchCredentialTypeSummaries: vi.fn(
		async () => new Map([['bitlyApi', { displayName: 'Bitly API' }]]),
	),
	fetchNodeTypeSummaries: vi.fn(
		async () => new Map([['n8n-nodes-base.notion', { displayName: 'Notion', hidden: false }]]),
	),
	fetchCredentialTypeUsage: vi.fn(async () => ({})),
}));

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ push, replace }),
}));

const renderView = createComponentRenderer(InstancePolicyView);

const BOTH_SCOPES: Scope[] = ['nodeTypePolicy:manage', 'credentialTypePolicy:manage'];

const setup = (scopes: Scope[] = BOTH_SCOPES, query: Record<string, string> = {}) => {
	route.query = query;
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(scopes);
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
});
