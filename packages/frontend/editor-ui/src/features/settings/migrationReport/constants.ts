import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';

const targetVersionMajor = MIGRATION_REPORT_TARGET_VERSION?.slice(1) ?? '2';

/** General breaking-changes docs for the target major version. */
export const BREAKING_CHANGES_DOCUMENTATION_URL = `https://docs.n8n.io/${targetVersionMajor}-0-breaking-changes/`;

/**
 * A workflow that did not run within this many days is flagged as probably unused.
 * A workflow that never ran is flagged too.
 */
export const UNUSED_WORKFLOW_THRESHOLD_DAYS = 90;
