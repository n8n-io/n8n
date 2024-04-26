import 'reflect-metadata';

export {
	suite,
	task,
	beforeEachTask,
	afterEachTask,
	collectSuites,
	registerSuites,
} from './registration';

export { agent } from './agent';

export type { Suites } from './types';

export { setup, teardown } from './hooks/setup-and-teardown';
