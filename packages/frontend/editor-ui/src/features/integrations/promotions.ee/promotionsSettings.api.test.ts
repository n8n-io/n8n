import { makePublicApiRequest, ResponseError } from '@n8n/rest-api-client';
import {
	applyProjectSelection,
	continueApplyProjectSelection,
	continueApplyPromotion,
	deleteProviderIfUnused,
	fetchPromotionRepositories,
	fetchPromotionBranches,
} from './promotionsSettings.api';
import { blocked } from './__tests__/bindings.fixtures';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makePublicApiRequest: vi.fn(),
}));

it('requests repositories with the encoded provider, query, and public API base URL', async () => {
	const result = { data: [], nextCursor: 'next' };
	const context = { baseUrl: '/custom/api/v2' };
	const query = { search: 'team', cursor: 'page', limit: 50 };
	vi.mocked(makePublicApiRequest).mockResolvedValue(result);
	expect(await fetchPromotionRepositories(context, 'provider/one', query)).toBe(result);
	expect(makePublicApiRequest).toHaveBeenLastCalledWith(
		context,
		'GET',
		'/promotions/providers/provider%2Fone/repositories',
		query,
	);
});

it('requests branches with the encoded repository path and returns the complete page', async () => {
	const result = { data: [], nextCursor: 'next' };
	const context = { baseUrl: '/custom/api/v2' };
	const query = { search: 'release/', cursor: 'page', limit: 50 };
	vi.mocked(makePublicApiRequest).mockResolvedValue(result);
	expect(await fetchPromotionBranches(context, 'provider/one', 'team/workflows', query)).toBe(
		result,
	);
	expect(makePublicApiRequest).toHaveBeenLastCalledWith(
		context,
		'GET',
		'/promotions/providers/provider%2Fone/repositories/team%2Fworkflows/branches',
		query,
	);
});

it('uses the public API context and returns the complete result', async () => {
	const result = blocked();
	const context = { baseUrl: '/custom/api/v2' };
	vi.mocked(makePublicApiRequest).mockResolvedValue(result);

	const body = { expectedSource: { environmentId: result.environmentId, ...result.git } };
	expect(await continueApplyPromotion(context, result.environmentId, body)).toBe(result);
	expect(makePublicApiRequest).toHaveBeenLastCalledWith(
		context,
		'POST',
		'/promotions/environments/environment-id/apply/continue',
		body,
	);
});

it('posts the selection to the project apply endpoint', async () => {
	const result = blocked();
	const context = { baseUrl: '/custom/api/v2' };
	vi.mocked(makePublicApiRequest).mockResolvedValue(result);

	const body = {
		workflowIds: ['wf-a', 'wf-b'],
		expectedSource: { environmentId: result.environmentId, ...result.git },
	};
	expect(await applyProjectSelection(context, 'project-id', body)).toBe(result);
	expect(makePublicApiRequest).toHaveBeenLastCalledWith(
		context,
		'POST',
		'/promotions/projects/project-id/apply',
		body,
	);
});

it('posts the selection to the project apply continue endpoint', async () => {
	const result = blocked();
	const context = { baseUrl: '/custom/api/v2' };
	vi.mocked(makePublicApiRequest).mockResolvedValue(result);

	const body = {
		workflowIds: ['wf-a', 'wf-b'],
		expectedSource: { environmentId: result.environmentId, ...result.git },
	};
	expect(await continueApplyProjectSelection(context, 'project-id', body)).toBe(result);
	expect(makePublicApiRequest).toHaveBeenLastCalledWith(
		context,
		'POST',
		'/promotions/projects/project-id/apply/continue',
		body,
	);
});

it('treats a provider that is gone or still in use as handled', async () => {
	const context = { baseUrl: '/custom/api/v2' };
	const failWith = (httpStatusCode: number) =>
		vi
			.mocked(makePublicApiRequest)
			.mockRejectedValueOnce(new ResponseError('refused', { httpStatusCode }));

	failWith(404);
	await expect(deleteProviderIfUnused(context, 'provider-id')).resolves.toBeUndefined();
	failWith(409);
	await expect(deleteProviderIfUnused(context, 'provider-id')).resolves.toBeUndefined();
	failWith(500);
	await expect(deleteProviderIfUnused(context, 'provider-id')).rejects.toThrow('refused');
});
