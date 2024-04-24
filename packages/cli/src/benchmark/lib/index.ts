import 'reflect-metadata';

export { BACKEND_BASE_URL } from './constants';
export {
	suite,
	task,
	beforeEachTask,
	afterEachTask,
	collectSuites,
	registerSuites,
} from './registration';
export * as hooks from './hooks';
export type { Suites } from './types';
export { UnsupportedDatabaseError } from './errors/unsupported-db.error';
