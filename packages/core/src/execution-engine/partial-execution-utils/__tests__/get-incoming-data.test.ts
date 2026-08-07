import { NodeConnectionTypes, type IRunData } from 'n8n-workflow';

import { toITaskData } from './helpers';
import { getIncomingData } from '../get-incoming-data';

describe('getIncomingData', () => {
	test('returns null, instead of throwing, when the run data lacks the requested connection type', () => {
		const runData: IRunData = {
			'Basic Node': [toITaskData([{ data: { value: 1 } }])],
		};

		expect(() =>
			getIncomingData(runData, 'Basic Node', 0, NodeConnectionTypes.AiTool, 0),
		).not.toThrow();
		expect(getIncomingData(runData, 'Basic Node', 0, NodeConnectionTypes.AiTool, 0)).toBeNull();
	});
});
