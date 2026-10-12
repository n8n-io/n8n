import type { IRestApiContext } from '../../types';
import * as utils from '../../utils';
import { updateFindingStatuses } from '../breaking-changes';

vi.mock('../../utils');

const context = {} as IRestApiContext;

describe('updateFindingStatuses', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sends a PATCH to the rule workflows endpoint with the workflow IDs and status', async () => {
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce(undefined);

		await updateFindingStatuses(context, 'removed-nodes-v3', ['wf-1', 'wf-2'], 'wont_fix');

		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(1);
		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'PATCH',
			'/breaking-changes/report/removed-nodes-v3/workflows',
			{ workflowIds: ['wf-1', 'wf-2'], status: 'wont_fix' },
		);
	});
});
