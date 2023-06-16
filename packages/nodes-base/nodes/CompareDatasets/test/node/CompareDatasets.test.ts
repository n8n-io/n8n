import { testWorkflows, getWorkflowFilenames } from '../../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test Compare Datasets Node', () => testWorkflows(workflows));
