export * from './license-state';
export type * from './types';

export { inDevelopment, inProduction, inTest } from './environment';
export { isObjectLiteral } from './utils/is-object-literal';
export { Logger } from './logging/logger';
export { ModuleRegistry } from './modules/module-registry';
export { InstanceVersion } from './modules/ports/instance-version';
export { ModulePubSubPublisher } from './modules/ports/module-pubsub-publisher';
export {
	WorkflowProjectLookup,
	type WorkflowProjectSummary,
} from './modules/ports/workflow-project-lookup';
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
	SingleFlightLease,
	type SingleFlightLeaseOptions,
} from './locking/single-flight-lease';
export {
	type ILockService,
	LockNamespace,
	LockAcquisitionTimeoutError,
} from './locking/lock-service.interface';
