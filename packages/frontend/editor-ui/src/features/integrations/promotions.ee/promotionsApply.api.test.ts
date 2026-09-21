import { request } from '@n8n/rest-api-client';
import { applyPackage, continueApplyPackage } from './promotionsApply.api';
import { blocked } from './__tests__/bindings.fixtures';

vi.mock('@n8n/rest-api-client', () => ({ request: vi.fn() }));

it('uses the public API context and returns the complete result', async () => {
	const result = blocked();
	const context = { baseUrl: '/custom/api/v2' };
	vi.mocked(request).mockResolvedValue(result);

	expect(await applyPackage(context, result.connectionId)).toBe(result);
	expect(request).toHaveBeenLastCalledWith({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: '/promotions/connections/connection-id/apply',
	});

	const body = { expectedSource: { configId: result.configId, ...result.git } };
	expect(await continueApplyPackage(context, result.connectionId, body)).toBe(result);
	expect(request).toHaveBeenLastCalledWith({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: '/promotions/connections/connection-id/apply/continue',
		data: body,
	});
});
