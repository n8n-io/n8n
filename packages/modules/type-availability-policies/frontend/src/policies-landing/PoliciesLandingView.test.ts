import type { InstanceTypeAccessResponse } from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import {
	createComponentRenderer,
	waitAllPromises as flushPromises,
} from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';

import PoliciesLandingView from './PoliciesLandingView.vue';
import { mockProjectPolicy } from '../__tests__/mocks';
import {
	INSTANCE_POLICY_DOCS_URL,
	INSTANCE_POLICY_VIEW,
	PROJECT_POLICY_VIEW,
} from '../type-availability-policies.constants';

const { push, replace, api } = vi.hoisted(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	api: {
		fetchInstanceAccess: vi.fn(),
		fetchProjectPolicies: vi.fn(),
		createProjectPolicy: vi.fn(),
	},
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({}),
	useRouter: () => ({ push, replace }),
}));

vi.mock('../type-availability-policies.api', () => api);

// Element Plus selects do not open in jsdom, so a native select stands in for it.
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<object>()),
	N8nSelect: {
		name: 'N8nSelect',
		inheritAttrs: false,
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<select v-bind="$attrs" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
	},
	N8nOption: {
		name: 'N8nOption',
		props: ['value', 'label'],
		template: '<option :value="value">{{ label }}</option>',
	},
}));

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

// Tooltips open on hover after a delay. The stub renders the text of a disabled control's tooltip.
const renderView = createComponentRenderer(PoliciesLandingView, {
	global: {
		stubs: {
			N8nTooltip: {
				props: ['disabled'],
				template:
					'<div><slot /><span v-if="!disabled" data-test-id="tooltip-content"><slot name="content" /></span></div>',
			},
		},
	},
});

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
		api.fetchProjectPolicies.mockResolvedValue({ projects: [] });
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

	describe('Projects section', () => {
		const withPolicy = (index: number, updatedAt: string) =>
			mockProjectPolicy({
				projectId: `with-${index}`,
				name: `With policy ${index}`,
				hasPolicy: true,
				updatedAt,
				memberCount: 6,
			});
		const withoutPolicy = (index: number) =>
			mockProjectPolicy({ projectId: `without-${index}`, name: `No policy ${index}` });

		const nineProjects = [
			withPolicy(1, '2026-11-01T00:00:00.000Z'),
			withPolicy(2, '2026-11-20T00:00:00.000Z'),
			withPolicy(3, '2026-11-10T00:00:00.000Z'),
			withPolicy(4, '2026-10-01T00:00:00.000Z'),
			withPolicy(5, '2026-11-15T00:00:00.000Z'),
			withPolicy(6, '2026-09-01T00:00:00.000Z'),
			withoutPolicy(1),
			withoutPolicy(2),
			withoutPolicy(3),
		];

		it('shows the 4 most recently changed project policies and how many projects have one', async () => {
			api.fetchProjectPolicies.mockResolvedValue({ projects: nineProjects });
			const { findAllByTestId, getByTestId } = renderForAdmin();

			const rows = await findAllByTestId('policies-landing-project-row');
			expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
				'With policy 2',
				'With policy 5',
				'With policy 3',
				'With policy 1',
			]);
			expect(getByTestId('policies-landing-all-projects-row')).toHaveTextContent(
				'6 of 9 projects have a custom policy',
			);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('shows the members, the time of the last change and the summary on a card', async () => {
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(new Date('2026-11-23T00:00:00.000Z'));
			api.fetchProjectPolicies.mockResolvedValue({
				projects: [
					mockProjectPolicy({
						projectId: 'finance',
						name: 'Finance Automation',
						hasPolicy: true,
						memberCount: 6,
						updatedAt: '2026-11-09T00:00:00.000Z',
						node: { restricted: 5, optedIn: 0, effective: { allowed: 0, restricted: 0 } },
						credential: { restricted: 2, optedIn: 0, effective: { allowed: 0, restricted: 0 } },
					}),
				],
			});
			const { findByTestId } = renderForAdmin();

			const row = await findByTestId('policies-landing-project-row');
			expect(row).toHaveTextContent('Finance Automation');
			expect(row).toHaveTextContent('6 members · Updated 2 weeks ago');
			expect(row).toHaveTextContent('Restricts 5 nodes and 2 credentials');
		});

		it('names a single member in the singular', async () => {
			api.fetchProjectPolicies.mockResolvedValue({
				projects: [{ ...withPolicy(1, '2026-11-01T00:00:00.000Z'), memberCount: 1 }],
			});
			const { findByTestId } = renderForAdmin();

			expect(await findByTestId('policies-landing-project-row')).toHaveTextContent('1 member ·');
		});

		it('opens the project policy page from a card', async () => {
			api.fetchProjectPolicies.mockResolvedValue({ projects: nineProjects });
			const { findAllByTestId } = renderForAdmin();

			await fireEvent.click((await findAllByTestId('policies-landing-project-row'))[0]);

			expect(push).toHaveBeenCalledWith({
				name: PROJECT_POLICY_VIEW,
				params: { teamProjectId: 'with-2' },
			});
		});

		it('shows the empty state when no project has a policy', async () => {
			api.fetchProjectPolicies.mockResolvedValue({ projects: [withoutPolicy(1)] });
			const { findByTestId, queryByTestId } = renderForAdmin();

			const empty = await findByTestId('policies-landing-projects-empty');
			expect(empty).toHaveTextContent('No project policies yet');
			expect(empty).toHaveTextContent('Every project follows the instance policy.');
			expect(empty.querySelector('button')).toHaveTextContent('Add project policy');
			expect(empty.querySelector('button')).toBeEnabled();
			expect(queryByTestId('policies-landing-add-project-policy')).not.toBeInTheDocument();
			expect(queryByTestId('policies-landing-all-projects-row')).not.toBeInTheDocument();
		});

		it('disables Add project policy when every team project has a policy', async () => {
			api.fetchProjectPolicies.mockResolvedValue({
				projects: [withPolicy(1, '2026-11-01T00:00:00.000Z')],
			});
			const { findByTestId, getByTestId } = renderForAdmin();

			expect(await findByTestId('policies-landing-add-project-policy')).toBeDisabled();
			expect(getByTestId('tooltip-content')).toHaveTextContent(
				'Every team project already has a custom policy.',
			);
		});

		it('disables Add project policy in the empty state when there is no team project', async () => {
			const { findByTestId, getByTestId } = renderForAdmin();

			expect(
				(await findByTestId('policies-landing-projects-empty')).querySelector('button'),
			).toBeDisabled();
			expect(getByTestId('tooltip-content')).toHaveTextContent('There is no team project yet.');
		});

		it('offers only the team projects without a policy in the Add project policy dialog', async () => {
			api.fetchProjectPolicies.mockResolvedValue({ projects: nineProjects });
			const { findByTestId, getByTestId } = renderForAdmin();

			await fireEvent.click(await findByTestId('policies-landing-add-project-policy'));

			const select = await waitFor(() => getByTestId('add-project-policy-select'));
			expect([...select.querySelectorAll('option')].map((option) => option.textContent)).toEqual([
				'No policy 1',
				'No policy 2',
				'No policy 3',
			]);
		});

		it('opens the Add project policy dialog from the empty state', async () => {
			api.fetchProjectPolicies.mockResolvedValue({ projects: [withoutPolicy(1)] });
			const { findByTestId } = renderForAdmin();

			const empty = await findByTestId('policies-landing-projects-empty');
			await fireEvent.click(empty.querySelector('button')!);

			expect(await findByTestId('add-project-policy-dialog')).toBeInTheDocument();
		});

		it('reads the list again when another admin added the policy first', async () => {
			api.fetchProjectPolicies.mockResolvedValue({ projects: nineProjects });
			api.createProjectPolicy.mockRejectedValue(
				new ResponseError('The project already has a policy', { httpStatusCode: 409 }),
			);
			const { findByTestId, getByTestId, getAllByTestId } = renderForAdmin();

			await fireEvent.click(await findByTestId('policies-landing-add-project-policy'));
			await fireEvent.update(
				await waitFor(() => getByTestId('add-project-policy-select')),
				'without-1',
			);
			await fireEvent.click(getByTestId('add-project-policy-submit'));

			await waitFor(() => expect(api.fetchProjectPolicies).toHaveBeenCalledTimes(2));
			expect(getByTestId('add-project-policy-error')).toBeInTheDocument();
			expect(getAllByTestId('policies-landing-project-row')).toHaveLength(4);
		});

		it('reads the list again when the admin closes the dialog before the add ends', async () => {
			api.fetchProjectPolicies.mockResolvedValue({ projects: nineProjects });
			let resolveAdd: (value: unknown) => void = () => {};
			api.createProjectPolicy.mockReturnValue(
				new Promise((resolve) => {
					resolveAdd = resolve;
				}),
			);
			const { findByTestId, getByTestId, getByRole } = renderForAdmin();

			await fireEvent.click(await findByTestId('policies-landing-add-project-policy'));
			await fireEvent.update(
				await waitFor(() => getByTestId('add-project-policy-select')),
				'without-1',
			);
			await fireEvent.click(getByTestId('add-project-policy-submit'));
			await fireEvent.click(getByRole('button', { name: 'Cancel' }));
			resolveAdd(withoutPolicy(1));

			await waitFor(() => expect(api.fetchProjectPolicies).toHaveBeenCalledTimes(2));
			expect(push).not.toHaveBeenCalled();
		});

		it('shows no Projects section when the project list fails to load', async () => {
			api.fetchProjectPolicies.mockRejectedValue(new Error('Request failed'));
			const { getByTestId, queryByTestId } = renderForAdmin();

			await flushPromises();

			expect(api.fetchProjectPolicies).toHaveBeenCalled();
			expect(getByTestId('policies-landing-instance-row')).toBeInTheDocument();
			expect(queryByTestId('policies-landing-projects-section')).not.toBeInTheDocument();
		});

		it.each(['nodeTypePolicy:manage', 'credentialTypePolicy:manage'] as const)(
			'does not read the project list for a user with only %s',
			(scope) => {
				const pinia = createTestingPinia({ stubActions: false });
				useSettingsStore().isModuleActive = vi.fn(() => true);
				useRBACStore().setGlobalScopes([scope]);

				renderView({ pinia });

				expect(api.fetchProjectPolicies).not.toHaveBeenCalled();
			},
		);
	});
});
