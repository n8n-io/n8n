import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	deleteCustomAction,
	getCustomActionVersion,
	getCustomNodeIconUrl,
	listCustomNodes,
	previewCustomAction,
	rollbackCustomActionRevision,
	setCustomNodeIcon,
} from './custom-nodes.api';
import { createDraft } from './custom-nodes.test.utils';

const context = { baseUrl: '/rest', pushRef: 'ref' };

vi.mock('@n8n/rest-api-client', () => ({ makeRestApiRequest: vi.fn() }));

describe('custom-nodes.api', () => {
	const request = vi.mocked(makeRestApiRequest);

	beforeEach(() => {
		request.mockReset().mockResolvedValue(undefined);
	});

	it.each([
		['list', async () => await listCustomNodes(context), 'GET', '/custom-nodes', undefined],
		[
			'version',
			async () => await getCustomActionVersion(context, 'a/1', 2),
			'GET',
			'/custom-nodes/actions/a%2F1/versions/2',
			undefined,
		],
		[
			'rollback',
			async () => await rollbackCustomActionRevision(context, 'a1', 2, { revision: 1 }),
			'POST',
			'/custom-nodes/actions/a1/versions/2/rollback',
			{ revision: 1 },
		],
		[
			'delete action',
			async () => await deleteCustomAction(context, 'a1'),
			'DELETE',
			'/custom-nodes/actions/a1',
			undefined,
		],
		[
			'icon',
			async () =>
				await setCustomNodeIcon(context, 'n1', { iconDataUri: 'data:image/png;base64,AA==' }),
			'PUT',
			'/custom-nodes/nodes/n1/icon',
			{ iconDataUri: 'data:image/png;base64,AA==' },
		],
		[
			'preview',
			async () => await previewCustomAction(context, { draft: createDraft() }),
			'POST',
			'/custom-nodes/preview',
			{ draft: createDraft() },
		],
	])('%s uses the right method and path', async (_name, call, method, path, body) => {
		await call();

		const args = request.mock.calls[0];
		expect(args.slice(0, 3)).toEqual([context, method, path]);
		expect(args[3]).toEqual(body);
	});

	it('builds the icon url', () => {
		expect(getCustomNodeIconUrl(context, 'n1')).toBe('/rest/custom-nodes/nodes/n1/icon');
	});
});
