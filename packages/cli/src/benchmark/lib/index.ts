import 'reflect-metadata';

export { suite, task, beforeEachTask, afterEachTask, collectSuites, registerSuites } from './api';
export { agent } from './agent';
export { setup, teardown } from './hooks/setup-and-teardown';
export type { Suites } from './types';

export { log, logResults, toOneLineJson } from './log';
