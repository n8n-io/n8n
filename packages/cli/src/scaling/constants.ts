import { Time } from '@n8n/constants';

export const JOB_TYPE_NAME = 'job';

/** How often a main rechecks the DB for a queued job whose completion event it may have missed. */
export const JOB_WAIT_RECHECK_INTERVAL_MS = 60 * Time.seconds.toMilliseconds;
