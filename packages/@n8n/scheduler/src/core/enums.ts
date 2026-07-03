// Temporary: re-exports the enums whose source of truth is the `@n8n/db`
// schema (CHECK constraints), so `core` doesn't duplicate the value lists.
// Revisit once the legacy scheduler is deprecated and/or the sweep
// implementation shows whether core genuinely needs its own copies.
export {
	ScheduledJobKind,
	ScheduledJobKindList,
	ScheduledTaskStatus,
	ScheduledTaskStatusList,
} from '@n8n/db';
