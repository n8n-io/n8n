/** One field a workflow declares on its trigger, rendered as one form input. */
export type CatalogField = {
	name: string;
	type: string;
};

/** How the workflow is entered, which decides whether it takes input at all. */
export type CatalogTrigger = 'execute-workflow-trigger' | 'manual-trigger';

export type CatalogEntry = {
	id: string;
	name: string;
	description: string | null;
	trigger: CatalogTrigger;
	fields: CatalogField[];
};

export type CatalogListing = {
	workflows: CatalogEntry[];
	/** The backend capped the list; say so rather than let it read as complete. */
	truncated: boolean;
};

/** One person's own schedule for a catalog workflow. */
export type CatalogSubscription = {
	id: string;
	workflowId: string;
	workflowName: string | null;
	cronExpression: string;
	timezone: string;
	inputs: Record<string, unknown>;
	enabled: boolean;
	/** Null while the schedule is paused. */
	nextRunAt: string | null;
};

export type CatalogSubscriptionInput = {
	cronExpression: string;
	timezone: string;
	inputs: Record<string, unknown>;
	enabled: boolean;
};

/** How often a schedule repeats, before it is written out as a cron expression. */
export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly';

export type ScheduleDraft = {
	frequency: ScheduleFrequency;
	/** Minute past the hour, for every frequency. */
	minute: number;
	/** Hour of day; ignored when hourly. */
	hour: number;
	/** 0 = Sunday, matching cron; used when weekly. */
	weekday: number;
};
