import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';

const targetVersionMajor = MIGRATION_REPORT_TARGET_VERSION?.slice(1) ?? '2';

/** General breaking-changes docs for the target major version. */
export const BREAKING_CHANGES_DOCUMENTATION_URL = `https://docs.n8n.io/${targetVersionMajor}-0-breaking-changes/`;
