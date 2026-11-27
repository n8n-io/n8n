import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';

import ProjectPolicyView from './ProjectPolicyView.vue';
import { mockProjectPolicy } from '../__tests__/mocks';
import { findPopupItem, MENU_ITEM } from '../__tests__/popups';
import {
	INSTANCE_POLICY_VIEW,
	POLICIES_LANDING_VIEW,
} from '../type-availability-policies.constants';

const {
	push,
	replace,
	fetchProjectPolicies,
	fetchProjectPolicyVersions,
	deleteProjectPolicy,
	confirm,
	showMessage,
	showError,
} = vi.hoisted(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	fetchProjectPolicies: vi.fn(),
	fetchProjectPolicyVersions: vi.fn(),
	deleteProjectPolicy: vi.fn(),
	confirm: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

const route = reactive({ params: { teamProjectId: 'security' } });

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ push, replace }),
}));

vi.mock('../type-availability-policies.api', () => ({
	fetchProjectPolicies,
	fetchProjectPolicyVersions,
	deleteProjectPolicy,
}));

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	useMessage: () => ({ confirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage, showError }) }));

const renderView = createComponentRenderer(ProjectPolicyView);

const VERSIONS = { nodeTypesVersion: 3, credentialTypesVersion: 0 };

function renderWithScopes(
	scopes: Array<'nodeTypePolicy:manage' | 'credentialTypePolicy:manage'> = [
		'nodeTypePolicy:manage',
		'credentialTypePolicy:manage',
	],
) {
	const pinia = createTestingPinia({ stubActions: false });
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(scopes);
	return renderView({ pinia });
}

async function openDeleteItem(view: ReturnType<typeof renderWithScopes>) {
	await userEvent.click(await view.findByRole('button', { name: 'Policy actions' }));
	return await findPopupItem(MENU_ITEM, 'Delete policy');
}

/** Opens the menu once the versions are read, so "Delete policy" is on, and picks it. */
async function confirmDelete(
	view: ReturnType<typeof renderWithScopes>,
	answer: 'confirm' | 'cancel' = 'confirm',
) {
	confirm.mockResolvedValue(answer);
	await waitFor(() => expect(fetchProjectPolicyVersions).toHaveBeenCalled());
	const item = await openDeleteItem(view);
	await waitFor(() => expect(item).not.toHaveAttribute('data-disabled'));
	await userEvent.click(item);
}

/** Holds the delete request open until the test settles it. */
function deferDelete() {
	let settle!: { resolve: () => void; reject: (error: unknown) => void };
	deleteProjectPolicy.mockReturnValue(
		new Promise<void>((resolve, reject) => {
			settle = { resolve, reject };
		}),
	);
	return settle;
}

describe('ProjectPolicyView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		route.params.teamProjectId = 'security';
		fetchProjectPolicies.mockResolvedValue({
			projects: [
				mockProjectPolicy({ projectId: 'security', name: 'Security Engineering', hasPolicy: true }),
			],
		});
		fetchProjectPolicyVersions.mockResolvedValue(VERSIONS);
		deleteProjectPolicy.mockResolvedValue(undefined);
	});

	it('names the page after the project from a direct link', async () => {
		const { findByText } = renderWithScopes();

		expect(await findByText('Security Engineering policy')).toBeInTheDocument();
	});

	it('goes back to the landing page', async () => {
		const { getByText } = renderWithScopes();

		await fireEvent.click(getByText('Node and credential policies'));

		expect(push).toHaveBeenCalledWith({ name: POLICIES_LANDING_VIEW });
	});

	it.each(['nodeTypePolicy:manage', 'credentialTypePolicy:manage'] as const)(
		'redirects a user with only %s to the instance policy page',
		(scope) => {
			const { queryByRole } = renderWithScopes([scope]);

			expect(replace).toHaveBeenCalledWith({ name: INSTANCE_POLICY_VIEW });
			expect(fetchProjectPolicies).not.toHaveBeenCalled();
			expect(fetchProjectPolicyVersions).not.toHaveBeenCalled();
			expect(queryByRole('button', { name: 'Policy actions' })).not.toBeInTheDocument();
		},
	);

	describe('delete policy', () => {
		it('turns the action off with a reason when the project has no policy', async () => {
			fetchProjectPolicies.mockResolvedValue({
				projects: [
					mockProjectPolicy({
						projectId: 'security',
						name: 'Security Engineering',
						hasPolicy: false,
					}),
				],
			});
			const view = renderWithScopes();

			const item = await openDeleteItem(view);

			expect(item).toHaveAttribute('data-disabled');
			const reason = item.querySelector('svg');
			expect(reason).not.toBeNull();
			await userEvent.hover(reason!);
			expect(
				await view.findByText(
					'This project follows the instance policy. It has no policy to delete.',
				),
			).toBeInTheDocument();
		});

		it('keeps the action off and says why when the versions cannot be read', async () => {
			const error = new Error('offline');
			fetchProjectPolicyVersions.mockRejectedValue(error);
			const view = renderWithScopes();

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(error, 'Could not load the policy'),
			);
			expect(await openDeleteItem(view)).toHaveAttribute('data-disabled');
		});

		it('asks before it deletes and sends nothing when the admin cancels', async () => {
			await confirmDelete(renderWithScopes(), 'cancel');

			await waitFor(() =>
				expect(confirm).toHaveBeenCalledWith(
					expect.any(String),
					'Delete the Security Engineering policy?',
					expect.objectContaining({ confirmButtonText: 'Delete policy' }),
				),
			);
			expect(deleteProjectPolicy).not.toHaveBeenCalled();
			expect(push).not.toHaveBeenCalled();
		});

		it('sends the versions read on load, confirms and opens the landing page', async () => {
			await confirmDelete(renderWithScopes());

			await waitFor(() => expect(push).toHaveBeenCalledWith({ name: POLICIES_LANDING_VIEW }));
			expect(deleteProjectPolicy).toHaveBeenCalledWith(expect.anything(), 'security', VERSIONS);
			expect(showMessage).toHaveBeenCalledWith({
				type: 'success',
				title: 'Security Engineering policy deleted',
				message: 'The projects follow the instance policy again.',
			});
		});

		it('turns the action off while the delete runs', async () => {
			const request = deferDelete();
			const view = renderWithScopes();
			await confirmDelete(view);
			await waitFor(() => expect(deleteProjectPolicy).toHaveBeenCalled());

			expect(await openDeleteItem(view)).toHaveAttribute('data-disabled');

			request.resolve();
			await waitFor(() => expect(push).toHaveBeenCalled());
		});

		it('stays on the page it opened when the admin left before the delete ended', async () => {
			const request = deferDelete();
			await confirmDelete(renderWithScopes());
			await waitFor(() => expect(deleteProjectPolicy).toHaveBeenCalled());

			route.params.teamProjectId = 'other';
			request.resolve();

			await waitFor(() => expect(showMessage).toHaveBeenCalled());
			expect(push).not.toHaveBeenCalled();
		});

		it('reads the policy again and sends the new versions when another admin changed it', async () => {
			const newVersions = { nodeTypesVersion: 4, credentialTypesVersion: 0 };
			fetchProjectPolicyVersions.mockResolvedValueOnce(VERSIONS).mockResolvedValue(newVersions);
			deleteProjectPolicy.mockRejectedValueOnce(
				new ResponseError('The node types policy scope has changed', { httpStatusCode: 409 }),
			);
			const view = renderWithScopes();
			await confirmDelete(view);

			await waitFor(() =>
				expect(showMessage).toHaveBeenCalledWith(
					expect.objectContaining({ type: 'warning', title: 'The policy changed' }),
				),
			);
			expect(fetchProjectPolicies).toHaveBeenCalledTimes(2);
			expect(push).not.toHaveBeenCalled();

			await waitFor(() => expect(fetchProjectPolicyVersions).toHaveBeenCalledTimes(2));
			await confirmDelete(view);

			await waitFor(() =>
				expect(deleteProjectPolicy).toHaveBeenLastCalledWith(
					expect.anything(),
					'security',
					newVersions,
				),
			);
		});

		it('keeps the action off when the read after a change fails', async () => {
			fetchProjectPolicyVersions
				.mockResolvedValueOnce(VERSIONS)
				.mockRejectedValue(new Error('offline'));
			deleteProjectPolicy.mockRejectedValue(
				new ResponseError('The node types policy scope has changed', { httpStatusCode: 409 }),
			);
			const view = renderWithScopes();
			await confirmDelete(view);

			await waitFor(() => expect(fetchProjectPolicyVersions).toHaveBeenCalledTimes(2));

			expect(await openDeleteItem(view)).toHaveAttribute('data-disabled');
		});

		it('does not reload a page that the admin left when another admin changed the policy', async () => {
			const request = deferDelete();
			await confirmDelete(renderWithScopes());
			await waitFor(() => expect(deleteProjectPolicy).toHaveBeenCalled());

			route.params.teamProjectId = 'other';
			request.reject(new ResponseError('changed', { httpStatusCode: 409 }));
			await new Promise((resolve) => setTimeout(resolve));

			expect(fetchProjectPolicies).toHaveBeenCalledTimes(1);
			expect(showMessage).not.toHaveBeenCalled();
			expect(fetchProjectPolicyVersions).toHaveBeenCalledTimes(1);
		});

		it('opens the landing page when another admin already deleted the policy', async () => {
			deleteProjectPolicy.mockRejectedValue(
				new ResponseError('Project has no policy: security', { httpStatusCode: 404 }),
			);
			await confirmDelete(renderWithScopes());

			await waitFor(() => expect(push).toHaveBeenCalledWith({ name: POLICIES_LANDING_VIEW }));
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'warning', title: 'The project has no policy' }),
			);
		});

		it('stays where the admin went when the policy was already deleted', async () => {
			const request = deferDelete();
			await confirmDelete(renderWithScopes());
			await waitFor(() => expect(deleteProjectPolicy).toHaveBeenCalled());

			route.params.teamProjectId = 'other';
			request.reject(new ResponseError('no policy', { httpStatusCode: 404 }));

			await waitFor(() => expect(showMessage).toHaveBeenCalled());
			expect(push).not.toHaveBeenCalled();
		});

		it('shows any other failure and stays on the page', async () => {
			const error = new ResponseError('Server error', { httpStatusCode: 500 });
			deleteProjectPolicy.mockRejectedValue(error);
			await confirmDelete(renderWithScopes());

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(error, 'Could not delete the policy'),
			);
			expect(push).not.toHaveBeenCalled();
		});
	});
});
