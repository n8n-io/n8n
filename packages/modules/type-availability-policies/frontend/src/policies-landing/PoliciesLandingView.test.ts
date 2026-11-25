import type { InstanceTypeAccessResponse } from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import PoliciesLandingView from './PoliciesLandingView.vue';
import {
	INSTANCE_POLICY_DOCS_URL,
	INSTANCE_POLICY_VIEW,
} from '../type-availability-policies.constants';

const { push, replace, api } = vi.hoisted(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	api: {
		fetchInstanceAccess: vi.fn(),
	},
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push, replace }),
}));

vi.mock('../type-availability-policies.api', () => api);

const access = (types: InstanceTypeAccessResponse['types']): InstanceTypeAccessResponse => ({
	scopeId: 'scope-1',
	version: 1,
	defaultAction: 'allow',
	types,
});

const NODE_ACCESS = access([
	{ name: 'n8n-nodes-base.slack', access: 'deny', matchedRuleId: 'rule-1' },
	{ name: 'n8n-nodes-base.httpRequest', access: 'allow', matchedRuleId: null },
]);

const CREDENTIAL_ACCESS = access([
	{ name: 'slackApi', access: 'deny', matchedRuleId: 'rule-2' },
	{ name: 'githubApi', access: 'deny', matchedRuleId: 'rule-2' },
	{ name: 'httpBasicAuth', access: 'delegate', matchedRuleId: 'rule-3' },
	{ name: 'notionApi', access: 'allow', matchedRuleId: null },
]);

const renderView = createComponentRenderer(PoliciesLandingView);

const renderDefault = () => renderView({ pinia: createTestingPinia() });

function renderForAdmin() {
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(['nodeTypePolicy:manage', 'credentialTypePolicy:manage']);
	return renderView({ pinia });
}

describe('PoliciesLandingView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		api.fetchInstanceAccess.mockImplementation(async (_context, kind: string) =>
			kind === 'node' ? NODE_ACCESS : CREDENTIAL_ACCESS,
		);
	});

	it('renders the page frame with the Global section', () => {
		const { getByText, getByTestId } = renderDefault();

		expect(getByText('Node and credential policies')).toBeInTheDocument();
		expect(getByTestId('policies-landing-global-section')).toHaveTextContent('Global');
		expect(getByTestId('policies-landing-instance-row')).toHaveTextContent(
			'Global instance policy',
		);
		expect(getByTestId('policies-landing-instance-row')).toHaveTextContent('Configure');
	});

	it('names the Global instance policy row by its title', () => {
		const { getByRole } = renderDefault();

		expect(getByRole('button', { name: 'Global instance policy' })).toBeInTheDocument();
	});

	it('links the page description to the documentation', () => {
		const { getByRole } = renderDefault();

		expect(getByRole('link', { name: /documentation/ })).toHaveAttribute(
			'href',
			INSTANCE_POLICY_DOCS_URL,
		);
	});

	it('marks the page as a preview', () => {
		const { getByTestId } = renderDefault();

		expect(getByTestId('policies-landing-preview-badge')).toBeInTheDocument();
	});

	it('shows an icon on the Global instance policy row', () => {
		const { getByTestId } = renderDefault();

		expect(
			getByTestId('policies-landing-instance-row').querySelector(
				'[data-test-id="settings-row-visual"] svg',
			),
		).toBeInTheDocument();
	});

	it('shows how many types the instance policy restricts, and opens to project opt-in when it does', async () => {
		const { findByTestId } = renderForAdmin();

		expect(await findByTestId('policies-landing-instance-counts')).toHaveTextContent(
			'1 of 2 nodes restricted · 2 of 4 credentials restricted, 1 open to project opt-in',
		);
	});

	it('shows no counts when the access list fails to load', async () => {
		api.fetchInstanceAccess.mockRejectedValue(new Error('Request failed'));
		const { queryByTestId } = renderForAdmin();

		await waitFor(() => expect(api.fetchInstanceAccess).toHaveBeenCalled());
		// Lets the other request settle, so that counts would render if the failure were swallowed.
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(queryByTestId('policies-landing-instance-counts')).not.toBeInTheDocument();
	});

	it('opens the instance policy page from the Global instance policy row', async () => {
		const { getByTestId } = renderDefault();

		await fireEvent.click(getByTestId('policies-landing-instance-row'));

		expect(push).toHaveBeenCalledWith({ name: INSTANCE_POLICY_VIEW });
	});

	it('goes back to the Policies page', async () => {
		const { getByText } = renderDefault();

		await fireEvent.click(getByText('Policies'));

		expect(push).toHaveBeenCalledWith({ name: VIEWS.SECURITY_SETTINGS });
	});

	it('redirects a user with one policy scope to the instance policy page', () => {
		const pinia = createTestingPinia({ stubActions: false });
		useSettingsStore().isModuleActive = vi.fn(() => true);
		useRBACStore().setGlobalScopes(['nodeTypePolicy:manage']);

		renderView({ pinia });

		expect(replace).toHaveBeenCalledWith({ name: INSTANCE_POLICY_VIEW });
		expect(api.fetchInstanceAccess).not.toHaveBeenCalled();
	});

	it('stays on the landing page for a user with both policy scopes', () => {
		renderForAdmin();

		expect(replace).not.toHaveBeenCalled();
	});
});
