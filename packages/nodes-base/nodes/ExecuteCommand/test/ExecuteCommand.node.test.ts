import { testWorkflows, getWorkflowFilenames } from '../../../test/nodes/Helpers';
const workflows = getWorkflowFilenames(__dirname);

describe('Execute Execute Command Node', () => testWorkflows(workflows));
