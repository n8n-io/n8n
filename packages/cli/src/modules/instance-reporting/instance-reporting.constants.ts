/** Well-known name of the durable job that fires the daily instance report. */
export const INSTANCE_REPORT_JOB_NAME = 'instance-reporting:daily';

/** Task type the daily report's handler is registered under. */
export const INSTANCE_REPORT_TASK_TYPE = 'instance-reporting:daily-report';

/** Appended to `N8N_INSTANCE_REPORTING_BASE_URL` to build the receiver's endpoint. */
export const INSTANCE_REPORTS_PATH = '/api/v1/instance-reports';

/**
 * Settings-table key holding this instance's reporting configuration, currently
 * just the time of day it reports at. See `InstanceReportingSettingsService`.
 */
export const CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY = 'features.centralInstanceMonitoring';
