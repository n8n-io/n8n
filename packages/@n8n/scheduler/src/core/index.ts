export type { Scheduler, SchedulerPasses } from './scheduler';
export { createScheduler, DEFAULT_DISPATCH_LAG_WARN_THRESHOLD_SECONDS } from './factory';
export type {
	SchedulerDeps,
	SchedulerEvent,
	SchedulerEventLevel,
	SchedulerTaskStore,
} from './factory';

export type {
	ClaimedTask,
	CronSchedule,
	IntervalSchedule,
	OneOffSchedule,
	RecurringCronSchedule,
	Schedule,
} from './types';
export { computeFirstRunAt, computeNextRunAt } from './recurrence/next-run';
export { validateSchedule } from './recurrence/validate';

export {
	CLOCK_SKEW_WARN_THRESHOLD_MS,
	DEFAULT_CLOCK_SKEW_OPTIONS,
	isClockSkewSignificant,
	measureClockSkew,
} from './clock-skew';
export type { ClockSkew, ClockSkewOptions } from './clock-skew';

export { provision, deprovision, createJobProvisioner, scheduleFingerprint } from './provisioning';
export type {
	JobProvisioner,
	JobProvisionerDeps,
	ProvisionTransaction,
	RunInProvisionTransaction,
	DeprovisionTransaction,
	RunInDeprovisionTransaction,
	ScheduleDefinition,
	CronDefinition,
	RecurringCronDefinition,
	IntervalDefinition,
	OneOffDefinition,
	DesiredJob,
	ExistingJob,
	ProvisionedJob,
	ProvisionSummary,
} from './provisioning';
export { createDispatchReporter } from './executor';
export type {
	ExecutorOptions,
	TaskHandler,
	DispatchReporter,
	DispatchDecision,
} from './executor';
export { DEFAULT_MATERIALIZER_OPTIONS, materialize } from './materializer';
export type {
	MaterializerOptions,
	MaterializerSummary,
	NewOccurrence,
	RunInTransaction,
} from './materializer';
export { pollLookaheadSeconds } from './lifecycle';
export type { ConcurrencyMode, LifecycleOptions } from './lifecycle';
export type { ReaperOptions, ReapResult } from './reaper';
export type { RetentionOptions, RetentionSummary } from './retention';

export { SpanStatus, noopTracer } from '../observability/tracer';
export type { Tracer, Span, SpanOptions } from '../observability/tracer';
export { noopMetrics } from '../observability/metrics';
export type { SchedulerMetrics } from '../observability/metrics';
