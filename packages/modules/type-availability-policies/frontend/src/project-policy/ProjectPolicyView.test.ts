import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectPolicyView from './ProjectPolicyView.vue';
import { mockProjectPolicy } from '../__tests__/mocks';
import {
	INSTANCE_POLICY_VIEW,
	POLICIES_LANDING_VIEW,
} from '../type-availability-policies.constants';

const { push, replace, fetchProjectPolicies } = vi.hoisted(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	fetchProjectPolicies: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: { teamProjectId: 'security' } }),
	useRouter: () => ({ push, replace }),
}));

vi.mock('../type-availability-policies.api', () => ({ fetchProjectPolicies }));

const renderView = createComponentRenderer(ProjectPolicyView);

function renderWithScopes(scopes: Array<'nodeTypePolicy:manage' | 'credentialTypePolicy:manage'>) {
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(scopes);
	return renderView({ pinia });
}

describe('ProjectPolicyView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchProjectPolicies.mockResolvedValue({
			projects: [
				mockProjectPolicy({ projectId: 'security', name: 'Security Engineering', hasPolicy: true }),
			],
		});
	});

	it('names the page after the project from a direct link', async () => {
		const { findByText } = renderWithScopes([
			'nodeTypePolicy:manage',
			'credentialTypePolicy:manage',
		]);

		expect(await findByText('Security Engineering policy')).toBeInTheDocument();
	});

	it('goes back to the landing page', async () => {
		const { getByText } = renderWithScopes([
			'nodeTypePolicy:manage',
			'credentialTypePolicy:manage',
		]);

		await fireEvent.click(getByText('Node and credential policies'));

		expect(push).toHaveBeenCalledWith({ name: POLICIES_LANDING_VIEW });
	});

	it.each(['nodeTypePolicy:manage', 'credentialTypePolicy:manage'] as const)(
		'redirects a user with only %s to the instance policy page',
		(scope) => {
			renderWithScopes([scope]);

			expect(replace).toHaveBeenCalledWith({ name: INSTANCE_POLICY_VIEW });
			expect(fetchProjectPolicies).not.toHaveBeenCalled();
		},
	);
});
