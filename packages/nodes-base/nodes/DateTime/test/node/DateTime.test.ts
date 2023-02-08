import { testWorkflows, getWorkflowFilenames } from '../../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

// ! When making changes to the Workflow test files make sure to export env TZ=UTC as Github Actions runs in UTC timezone
describe('Test DateTime Node', () => testWorkflows(workflows));
