import type { Scope } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useInstancePolicy } from './useInstancePolicy';
import type { InstancePolicy } from '../type-availability-policies.api';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const mocks = vi.hoisted(() => ({
	fetchInstancePolicy: vi.fn(),
	saveInstancePolicy: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => ({
	fetchInstancePolicy: mocks.fetchInstancePolicy,
	saveInstancePolicy: mocks.saveInstancePolicy,
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError, showMessage: mocks.showMessage }),
}));

const policy = (version: number): InstancePolicy<'node'> => ({
	scopeId: 'scope-1',
	rules: [],
	defaultAction: 'allow',
	version,
});

const setup = (scopes: Scope[] = ['nodeTypePolicy:manage', 'credentialTypePolicy:manage']) => {
	useSettingsStore().isModuleActive = vi.fn(() => true);
	useRBACStore().setGlobalScopes(scopes);
	vi.spyOn(useTypeAvailabilityPoliciesStore(), 'reload').mockResolvedValue();
	return useInstancePolicy();
};

describe('useInstancePolicy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.fetchInstancePolicy.mockResolvedValue(policy(1));
	});

	it('loads both kinds for a user with both policy scopes', async () => {
		const instancePolicy = setup();

		await instancePolicy.load();

		expect(mocks.fetchInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'node');
		expect(mocks.fetchInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'credential');
	});

	it('does not request the credential policy for a user with only the node scope', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);

		await instancePolicy.load();

		expect(mocks.fetchInstancePolicy).toHaveBeenCalledTimes(1);
		expect(mocks.fetchInstancePolicy).toHaveBeenCalledWith(expect.anything(), 'node');
	});

	it('shows an error when the policy fails to load', async () => {
		const error = new Error('Network');
		mocks.fetchInstancePolicy.mockRejectedValue(error);
		const instancePolicy = setup(['nodeTypePolicy:manage']);

		await instancePolicy.load();

		expect(mocks.showError).toHaveBeenCalledWith(error, 'Could not load the policy');
	});

	it('says that the policy changed when it changed after the load', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.saveInstancePolicy.mockRejectedValue(
			new ResponseError('Policy scope has changed', { httpStatusCode: 409 }),
		);
		mocks.fetchInstancePolicy.mockResolvedValue(policy(2));

		const result = await instancePolicy.save('node', (current) => current);

		expect(result.status).toBe('changed');
		expect(mocks.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'warning', title: 'The policy changed' }),
		);
		expect(instancePolicy.policies.node?.version).toBe(2);
	});

	it('says once that the policy changed when several saves were queued', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.saveInstancePolicy.mockRejectedValue(
			new ResponseError('Policy scope has changed', { httpStatusCode: 409 }),
		);
		mocks.fetchInstancePolicy.mockResolvedValue(policy(2));

		await Promise.all([
			instancePolicy.save('node', (current) => current),
			instancePolicy.save('node', (current) => current),
		]);

		expect(mocks.showMessage).toHaveBeenCalledTimes(1);
		expect(mocks.showError).not.toHaveBeenCalled();
	});

	it('explains a policy that the page cannot edit, without the server message', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.saveInstancePolicy.mockRejectedValue(
			new ResponseError('Cannot replace the policy of a scope with 2 attached documents', {
				httpStatusCode: 409,
			}),
		);

		const result = await instancePolicy.save('node', (current) => current);

		expect(result.status).toBe('notEditable');
		expect(mocks.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'error',
				title: 'Could not save the policy',
				message: expect.stringContaining('Use the API to change it.'),
			}),
		);
		expect(mocks.showError).not.toHaveBeenCalled();
	});

	it('shows an error when a save fails', async () => {
		const error = new ResponseError('Invalid rule', { httpStatusCode: 400 });
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.saveInstancePolicy.mockRejectedValue(error);

		await instancePolicy.save('node', (current) => current);

		expect(mocks.showError).toHaveBeenCalledWith(error, 'Could not save the policy');
		expect(mocks.showMessage).not.toHaveBeenCalled();
	});

	it('shows nothing after a successful save', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.saveInstancePolicy.mockResolvedValue({ ...policy(2), warnings: [] });

		await instancePolicy.save('node', (current) => current);

		expect(mocks.showError).not.toHaveBeenCalled();
		expect(mocks.showMessage).not.toHaveBeenCalled();
	});
});
