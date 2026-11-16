import { VIEWS } from '@n8n/frontend-constants/views';
import type { Scope } from '@n8n/permissions';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import InstancePolicyView from './InstancePolicyView.vue';
import { POLICIES_LANDING_VIEW } from '../type-availability-policies.constants';

const { route, push, replace } = vi.hoisted(() => ({
	route: { query: {} as Record<string, string> },
	push: vi.fn(),
	replace: vi.fn(),
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
	});

	it('renders the page frame with an empty table area', () => {
		const { getByText, getByTestId } = setup();

		expect(getByText('Global instance policy')).toBeInTheDocument();
		expect(
			getByText('Applies to every project. Projects can restrict it, not lift it.'),
		).toBeInTheDocument();
		expect(getByTestId('instance-policy-node-table')).toBeEmptyDOMElement();
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

		expect(getByTestId('instance-policy-tabs')).toHaveTextContent('Node types');
		expect(getByTestId('instance-policy-tabs')).toHaveTextContent('Credential types');
	});

	it('shows only the Node types tab to a user with only the node scope', () => {
		const { getByTestId } = setup(['nodeTypePolicy:manage']);

		expect(getByTestId('instance-policy-tabs')).toHaveTextContent('Node types');
		expect(getByTestId('instance-policy-tabs')).not.toHaveTextContent('Credential types');
	});

	it('opens the Credential types tab for a user with only the credential scope', () => {
		const { getByTestId, queryByTestId } = setup(['credentialTypePolicy:manage']);

		expect(getByTestId('instance-policy-tabs')).not.toHaveTextContent('Node types');
		expect(getByTestId('instance-policy-credential-table')).toBeInTheDocument();
		expect(queryByTestId('instance-policy-node-table')).not.toBeInTheDocument();
	});

	it('opens the tab named in the query', () => {
		const { getByTestId } = setup(BOTH_SCOPES, { tab: 'credential' });

		expect(getByTestId('instance-policy-credential-table')).toBeInTheDocument();
	});

	it('falls back to the first tab the user can manage when the query names another', () => {
		const { getByTestId } = setup(['nodeTypePolicy:manage'], { tab: 'credential' });

		expect(getByTestId('instance-policy-node-table')).toBeInTheDocument();
	});

	it('writes the selected tab to the query', async () => {
		const { getByText } = setup();

		await fireEvent.click(getByText('Credential types'));

		expect(replace).toHaveBeenCalledWith({ query: { tab: 'credential' } });
	});
});
