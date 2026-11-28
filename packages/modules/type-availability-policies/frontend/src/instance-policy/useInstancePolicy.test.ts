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
	fetchInstanceAccess: vi.fn(),
	setInstanceTypeAccess: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => ({
	fetchInstancePolicy: mocks.fetchInstancePolicy,
	fetchInstanceAccess: mocks.fetchInstanceAccess,
	setInstanceTypeAccess: mocks.setInstanceTypeAccess,
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
		mocks.fetchInstanceAccess.mockResolvedValue({
			scopeId: 'scope-1',
			version: 1,
			defaultAction: 'allow',
			types: [],
		});
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

	it('shows an access error, not a policy error, when only the access fails to load', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));

		await instancePolicy.load();

		expect(mocks.showError).toHaveBeenCalledTimes(1);
		expect(mocks.showError).toHaveBeenCalledWith(
			new Error('offline'),
			'Could not load the access of the types',
		);
	});

	it('shows the policy error and the access error when one kind fails each way', async () => {
		const instancePolicy = setup();
		const policyError = new Error('Network');
		const accessError = new Error('offline');
		mocks.fetchInstancePolicy.mockImplementation(async (_context: unknown, kind: string) =>
			kind === 'node' ? await Promise.reject(policyError) : policy(1),
		);
		mocks.fetchInstanceAccess.mockRejectedValue(accessError);

		await instancePolicy.load();

		expect(mocks.showError).toHaveBeenCalledWith(policyError, 'Could not load the policy');
		expect(mocks.showError).toHaveBeenCalledWith(
			accessError,
			'Could not load the access of the types',
		);
	});

	it('reads the access again and shows an error when it still fails', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));
		await instancePolicy.load();
		mocks.showError.mockClear();

		await instancePolicy.loadAccess();

		expect(mocks.fetchInstanceAccess).toHaveBeenCalledTimes(2);
		expect(mocks.showError).toHaveBeenCalledWith(
			new Error('offline'),
			'Could not load the access of the types',
		);
	});

	it('says that the policy changed when it changed after the load', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('Policy scope has changed', { httpStatusCode: 409 }),
		);
		mocks.fetchInstancePolicy.mockResolvedValue(policy(2));

		const result = await instancePolicy.setAccess('node', 'a', 'deny');

		expect(result.status).toBe('changed');
		expect(mocks.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'warning', title: 'The policy changed' }),
		);
		expect(instancePolicy.policies.node?.version).toBe(2);
	});

	it('says once that the policy changed when several saves were queued', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('Policy scope has changed', { httpStatusCode: 409 }),
		);
		mocks.fetchInstancePolicy.mockResolvedValue(policy(2));

		await Promise.all([
			instancePolicy.setAccess('node', 'a', 'deny'),
			instancePolicy.setAccess('node', 'a', 'deny'),
		]);

		expect(mocks.showMessage).toHaveBeenCalledTimes(1);
		expect(mocks.showError).not.toHaveBeenCalled();
	});

	it('explains a policy that the page cannot edit, without the server message', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('Cannot replace the policy of a scope with 2 attached documents', {
				httpStatusCode: 409,
			}),
		);

		const result = await instancePolicy.setAccess('node', 'a', 'deny');

		expect(result.status).toBe('notEditable');
		expect(mocks.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'error',
				title: 'Could not save the policy',
				message:
					'This page cannot change this policy, because it uses several policy documents or a document that other scopes share. Use the API to change it.',
			}),
		);
		expect(mocks.showError).not.toHaveBeenCalled();
	});

	it('explains a policy that the page cannot edit only once', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('Cannot replace the policy', { httpStatusCode: 409 }),
		);

		await Promise.all([
			instancePolicy.setAccess('node', 'a', 'deny'),
			instancePolicy.setAccess('node', 'a', 'deny'),
		]);
		await instancePolicy.setAccess('node', 'a', 'deny');

		expect(mocks.showMessage).toHaveBeenCalledTimes(1);
		expect(instancePolicy.notEditable.node).toBe(true);
	});

	it('shows an error when a save fails', async () => {
		const error = new ResponseError('Invalid rule', { httpStatusCode: 400 });
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.setInstanceTypeAccess.mockRejectedValue(error);

		await instancePolicy.setAccess('node', 'a', 'deny');

		expect(mocks.showError).toHaveBeenCalledWith(error, 'Could not save the policy');
		expect(mocks.showMessage).not.toHaveBeenCalled();
	});

	it('shows nothing after a successful save', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });

		await instancePolicy.setAccess('node', 'a', 'deny');

		expect(mocks.showError).not.toHaveBeenCalled();
		expect(mocks.showMessage).not.toHaveBeenCalled();
	});

	describe('setAccessMany', () => {
		it('sends the access of each type in one write, with the loaded version', async () => {
			mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });
			const instancePolicy = setup(['nodeTypePolicy:manage']);
			await instancePolicy.load();

			await instancePolicy.setAccessMany('node', ['a', 'b'], 'deny');

			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledTimes(1);
			expect(mocks.setInstanceTypeAccess).toHaveBeenCalledWith(expect.anything(), 'node', {
				changes: [
					{ type: 'a', access: 'deny' },
					{ type: 'b', access: 'deny' },
				],
				version: 1,
			});
		});
	});

	it('shows an error when a save succeeds but the access cannot be read', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.setInstanceTypeAccess.mockResolvedValue({ ...policy(2), warnings: [] });
		mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));

		const result = await instancePolicy.setAccess('node', 'a', 'deny');

		expect(result.status).toBe('saved');
		expect(mocks.showError).toHaveBeenCalledWith(
			new Error('offline'),
			'Could not load the access of the types',
		);
	});

	it('shows an error when the policy changed and the access of the new policy cannot be read', async () => {
		const instancePolicy = setup(['nodeTypePolicy:manage']);
		await instancePolicy.load();
		mocks.setInstanceTypeAccess.mockRejectedValue(
			new ResponseError('Policy scope has changed', { httpStatusCode: 409 }),
		);
		mocks.fetchInstancePolicy.mockResolvedValue(policy(2));
		mocks.fetchInstanceAccess.mockRejectedValue(new Error('offline'));

		const result = await instancePolicy.setAccess('node', 'a', 'deny');

		expect(result).toEqual({ status: 'changed', accessError: new Error('offline') });
		expect(mocks.showError).toHaveBeenCalledWith(
			new Error('offline'),
			'Could not load the access of the types',
		);
	});
});
