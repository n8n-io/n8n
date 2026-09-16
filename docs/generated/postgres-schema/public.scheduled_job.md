# public.scheduled_job

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| cronExpression | varchar(255) |  | true |  |  | Cron expression. For kind 'cron' it is the schedule; for 'recurring_cron' it lists the candidate run times that the every-N-periods filter then keeps every Nth of. |
| enabled | boolean | true | false |  |  | Whether the scheduler considers this job for firing. |
| fireAt | timestamp(3) with time zone |  | true |  |  | Absolute time the job fires once; set only when kind is 'one_off'. |
| id | integer |  | false | [public.scheduled_task](public.scheduled_task.md) |  |  |
| intervalSeconds | integer |  | true |  |  | Gap between fires in seconds; set only when kind is 'interval'. |
| kind | varchar(16) |  | false |  |  | Recurrence kind; selects which of the schedule columns below apply. |
| lastFiredAt | timestamp(3) with time zone |  | true |  |  | Last time an occurrence was materialized; used to recompute nextRunAt. |
| maxAttempts | integer | 1 | false |  |  | Retry ceiling copied onto each occurrence this job materializes. |
| misfireGraceSeconds | integer | 60 | false |  |  | How late an occurrence may be before the misfire policy applies to it; an ordinary restart stays inside it. |
| misfirePolicy | varchar(16) | 'coalesce'::character varying | false |  |  | What to do with occurrences that came due while nothing ran them: 'coalesce' records a single late run per job, 'coalesce_owner' a single one across every job the same owner scheduled, 'skip' records none. |
| name | varchar(255) |  | false |  |  | Human-readable job name. A well-known scheduler key for system jobs; generated for workflow trigger jobs. |
| nextRunAt | timestamp(3) with time zone |  | true |  |  | Next time an occurrence is due; the scheduler sweep reads this to find work. NULL once disabled or a one-off has fired. |
| orphanedAt | timestamp(3) with time zone |  | true |  |  | When the reconciliation sweep last confirmed this job's owner was gone; NULL while it is alive. Quarantine marker: the job's clock is cleared first and it is deleted only once this is older than the quarantine grace. |
| ownerId | varchar(255) |  | false |  |  | Which owner of that kind: a workflow id, a system task name, an agent id. Deleting the owner does not delete this row; the owning module deprovisions explicitly and the reconciliation sweep is the backstop. |
| ownerMemberId | varchar(36) |  | true |  |  | Optional sub-identity within the owner, e.g. the trigger node id for a workflow; NULL when the owner has no parts. |
| ownerType | varchar(32) |  | false |  |  | What kind of thing owns this job, e.g. 'workflow' or 'system-task'. Not an enum: the scheduler only compares it, so a new owner kind needs no schema change. |
| payload | json | '{}'::json | false |  |  | Input passed to the task handler when an occurrence runs. |
| recurrenceSize | integer |  | true |  |  | The N in a recurring_cron schedule's every-N-periods filter, e.g. 3 for every 3 weeks; at least 2. Set only when kind is 'recurring_cron'. |
| recurrenceUnit | varchar(16) |  | true |  |  | Calendar period counted by a recurring_cron schedule's every-N-periods filter (hours, days, weeks, months). Set only when kind is 'recurring_cron'. |
| taskType | varchar(128) |  | false |  |  | Selects which registered handler runs the task. |
| timezone | varchar(64) |  | true |  |  | IANA timezone the cron expression is evaluated in; NULL uses the instance default. |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| CHK_scheduled_job_cron_expression | CHECK | CHECK ((((kind)::text <> 'cron'::text) OR ("cronExpression" IS NOT NULL))) |
| CHK_scheduled_job_fire_at | CHECK | CHECK ((((kind)::text <> 'one_off'::text) OR ("fireAt" IS NOT NULL))) |
| CHK_scheduled_job_interval_seconds | CHECK | CHECK ((((kind)::text <> 'interval'::text) OR ("intervalSeconds" IS NOT NULL))) |
| CHK_scheduled_job_kind | CHECK | CHECK (((kind)::text = ANY ((ARRAY['cron'::character varying, 'interval'::character varying, 'one_off'::character varying, 'recurring_cron'::character varying])::text[]))) |
| CHK_scheduled_job_misfireGraceSeconds | CHECK | CHECK (("misfireGraceSeconds" > 0)) |
| CHK_scheduled_job_misfirePolicy | CHECK | CHECK ((("misfirePolicy")::text = ANY ((ARRAY['coalesce'::character varying, 'skip'::character varying, 'coalesce_owner'::character varying])::text[]))) |
| CHK_scheduled_job_recurrence_size | CHECK | CHECK (("recurrenceSize" >= 2)) |
| CHK_scheduled_job_recurrence_unit | CHECK | CHECK ((("recurrenceUnit")::text = ANY ((ARRAY['hours'::character varying, 'days'::character varying, 'weeks'::character varying, 'months'::character varying])::text[]))) |
| CHK_scheduled_job_recurring_cron | CHECK | CHECK ((((kind)::text <> 'recurring_cron'::text) OR (("cronExpression" IS NOT NULL) AND ("recurrenceUnit" IS NOT NULL) AND ("recurrenceSize" IS NOT NULL)))) |
| PK_893185383f029ca8d57bb781fa8 | PRIMARY KEY | PRIMARY KEY (id) |
| scheduled_job_createdAt_not_null | n | NOT NULL "createdAt" |
| scheduled_job_enabled_not_null | n | NOT NULL enabled |
| scheduled_job_id_not_null | n | NOT NULL id |
| scheduled_job_kind_not_null | n | NOT NULL kind |
| scheduled_job_maxAttempts_not_null | n | NOT NULL "maxAttempts" |
| scheduled_job_misfireGraceSeconds_not_null | n | NOT NULL "misfireGraceSeconds" |
| scheduled_job_misfirePolicy_not_null | n | NOT NULL "misfirePolicy" |
| scheduled_job_name_not_null | n | NOT NULL name |
| scheduled_job_ownerId_not_null | n | NOT NULL "ownerId" |
| scheduled_job_ownerType_not_null | n | NOT NULL "ownerType" |
| scheduled_job_payload_not_null | n | NOT NULL payload |
| scheduled_job_taskType_not_null | n | NOT NULL "taskType" |
| scheduled_job_updatedAt_not_null | n | NOT NULL "updatedAt" |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_scheduled_job_name | CREATE UNIQUE INDEX "IDX_scheduled_job_name" ON public.scheduled_job USING btree (name) |
| IDX_scheduled_job_nextRunAt | CREATE INDEX "IDX_scheduled_job_nextRunAt" ON public.scheduled_job USING btree ("nextRunAt") WHERE ((enabled = true) AND ("nextRunAt" IS NOT NULL)) |
| IDX_scheduled_job_ownerType_ownerId_ownerMemberId | CREATE INDEX "IDX_scheduled_job_ownerType_ownerId_ownerMemberId" ON public.scheduled_job USING btree ("ownerType", "ownerId", "ownerMemberId") |
| PK_893185383f029ca8d57bb781fa8 | CREATE UNIQUE INDEX "PK_893185383f029ca8d57bb781fa8" ON public.scheduled_job USING btree (id) |

## Relations

```mermaid
erDiagram

"public.scheduled_task" }o--|| "public.scheduled_job" : "FOREIGN KEY (#quot;jobId#quot;) REFERENCES scheduled_job(id) ON DELETE CASCADE"

"public.scheduled_job" {
  timestamp_3__with_time_zone createdAt
  varchar_255_ cronExpression
  boolean enabled
  timestamp_3__with_time_zone fireAt
  integer id
  integer intervalSeconds
  varchar_16_ kind
  timestamp_3__with_time_zone lastFiredAt
  integer maxAttempts
  integer misfireGraceSeconds
  varchar_16_ misfirePolicy
  varchar_255_ name
  timestamp_3__with_time_zone nextRunAt
  timestamp_3__with_time_zone orphanedAt
  varchar_255_ ownerId
  varchar_36_ ownerMemberId
  varchar_32_ ownerType
  json payload
  integer recurrenceSize
  varchar_16_ recurrenceUnit
  varchar_128_ taskType
  varchar_64_ timezone
  timestamp_3__with_time_zone updatedAt
}
"public.scheduled_task" {
  integer attempts
  varchar_255_ claimedBy
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone dispatchedAt
  text errorMessage
  timestamp_3__with_time_zone finishedAt
  bigint id
  integer jobId FK
  integer leaseEpoch
  timestamp_3__with_time_zone leaseExpiresAt
  integer maxAttempts
  timestamp_3__with_time_zone missedAfter
  json payload
  timestamp_3__with_time_zone runAt
  timestamp_3__with_time_zone scheduledFor
  timestamp_3__with_time_zone startedAt
  varchar_16_ status
  varchar_128_ taskType
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
