import { request } from '@n8n/rest-api-client';
import {
	applyProjectSelection,
	continueApplyProjectSelection,
	continueApplyPromotion,
} from './promotionsSettings.api';
import { blocked } from './__tests__/bindings.fixtures';

vi.mock('@n8n/rest-api-client', () => ({ request: vi.fn() }));

it('uses the public API context and returns the complete result', async () => {
	const result = blocked();
	const context = { baseUrl: '/custom/api/v2' };
	vi.mocked(request).mockResolvedValue(result);

	const body = { expectedSource: { configId: result.configId, ...result.git } };
	expect(await continueApplyPromotion(context, result.connectionId, body)).toBe(result);
	expect(request).toHaveBeenLastCalledWith({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: '/promotions/connections/connection-id/apply/continue',
		data: body,
	});
});

it('posts the selection to the project apply endpoint', async () => {
	const result = blocked();
	const context = { baseUrl: '/custom/api/v2' };
	vi.mocked(request).mockResolvedValue(result);

	const body = {
		workflowIds: ['wf-a', 'wf-b'],
		expectedSource: { configId: result.configId, ...result.git },
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
		expectedSource: { configId: result.configId, ...result.git },
	};
	expect(await continueApplyProjectSelection(context, 'project-id', body)).toBe(result);
	expect(request).toHaveBeenLastCalledWith({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: '/promotions/projects/project-id/apply/continue',
		data: body,
	});
});
