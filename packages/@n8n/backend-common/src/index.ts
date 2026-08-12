export * from './license-state';
export type * from './types';

export { inDevelopment, inProduction, inTest } from './environment';
export { isObjectLiteral } from './utils/is-object-literal';
export { Logger, LogTransport } from './logging/logger';
export type { LogTransportOptions } from './logging/logger';
export { getExecutionContext, runWithExecutionContext } from './logging/execution-context';
export type { LogExecutionContext } from './logging/execution-context';
export { ModuleRegistry } from './modules/module-registry';
export type { ModuleName } from './modules/modules.config';
export { ModulesConfig } from './modules/modules.config';
export {
	isContainedWithin,
	safeJoinPath,
	pathComponents,
	pathSegmentsBetween,
	containsSymlinkedComponent,
} from './utils/path-util';
export { assertDir, exists } from './utils/fs';
export { parseFlatted } from './utils/parse-flatted';
export { CliParser } from './cli-parser';
export { TypedEmitter } from './typed-emitter';

export { LockService } from './locking/lock.service';
export {
	type ILockService,
	LockNamespace,
	LockAcquisitionTimeoutError,
} from './locking/lock-service.interface';
