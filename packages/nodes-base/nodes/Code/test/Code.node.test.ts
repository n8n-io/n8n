import {
	testWorkflows,
	getWorkflowFilenames,
	initBinaryDataManager,
} from '../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

beforeAll(async () => {
	await initBinaryDataManager();
});

describe('Test Code Node', () => testWorkflows(workflows));
