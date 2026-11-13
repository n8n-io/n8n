import { makePublicApiRequest } from '@n8n/rest-api-client';

import { blocked } from './__tests__/bindings.fixtures';
import { applyProjectSelection, continueApplyProjectSelection } from './promotions.api';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makePublicApiRequest: vi.fn(),
}));

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
