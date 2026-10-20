import { request } from '@n8n/rest-api-client';
import {
	applyProjectSelection,
	continueApplyProjectSelection,
	continueApplyPromotion,
	fetchPromotionRepositories,
	fetchPromotionBranches,
} from './promotionsSettings.api';
import { blocked } from './__tests__/bindings.fixtures';

vi.mock('@n8n/rest-api-client', () => ({ request: vi.fn() }));

it('requests repositories with the encoded provider, query, and public API base URL', async () => {
	const result = { data: [], nextCursor: 'next' };
	const context = { baseUrl: '/custom/api/v2' };
	const query = { search: 'team', cursor: 'page', limit: 50 };
	vi.mocked(request).mockResolvedValue(result);
	expect(await fetchPromotionRepositories(context, 'provider/one', query)).toBe(result);
	expect(request).toHaveBeenLastCalledWith({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: '/promotions/providers/provider%2Fone/repositories',
		data: query,
	});
});

it('requests branches with the encoded repository path and returns the complete page', async () => {
	const result = { data: [], nextCursor: 'next' };
	const context = { baseUrl: '/custom/api/v2' };
	const query = { search: 'release/', cursor: 'page', limit: 50 };
	vi.mocked(request).mockResolvedValue(result);
	expect(await fetchPromotionBranches(context, 'provider/one', 'team/workflows', query)).toBe(
		result,
	);
	expect(request).toHaveBeenLastCalledWith({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: '/promotions/providers/provider%2Fone/repositories/team%2Fworkflows/branches',
		data: query,
	});
});

it('uses the public API context and returns the complete result', async () => {
	const result = blocked();
	const context = { baseUrl: '/custom/api/v2' };
	vi.mocked(request).mockResolvedValue(result);

	const body = { expectedSource: { environmentId: result.environmentId, ...result.git } };
	expect(await continueApplyPromotion(context, result.environmentId, body)).toBe(result);
	expect(request).toHaveBeenLastCalledWith({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: '/promotions/environments/environment-id/apply/continue',
		data: body,
	});
});

it('posts the selection to the project apply endpoint', async () => {
	const result = blocked();
	const context = { baseUrl: '/custom/api/v2' };
	vi.mocked(request).mockResolvedValue(result);

	const body = {
		workflowIds: ['wf-a', 'wf-b'],
		expectedSource: { environmentId: result.environmentId, ...result.git },
	};
	expect(await applyProjectSelection(context, 'project-id', body)).toBe(result);
	expect(request).toHaveBeenLastCalledWith({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: '/promotions/projects/project-id/apply',
		data: body,
	});
});

it('posts the selection to the project apply continue endpoint', async () => {
	const result = blocked();
	const context = { baseUrl: '/custom/api/v2' };
	vi.mocked(request).mockResolvedValue(result);

	const body = {
		workflowIds: ['wf-a', 'wf-b'],
		expectedSource: { environmentId: result.environmentId, ...result.git },
	};
	expect(await continueApplyProjectSelection(context, 'project-id', body)).toBe(result);
	expect(request).toHaveBeenLastCalledWith({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: '/promotions/projects/project-id/apply/continue',
		data: body,
	});
});
