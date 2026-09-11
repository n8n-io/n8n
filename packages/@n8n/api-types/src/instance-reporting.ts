/**
 * Live reporting state, from `GET /rest/instance-reporting/status`.
 *
 * Read here rather than from the module's `/rest/module-settings` entry, which
 * is cached for the lifetime of the process.
 */
export type InstanceReportingStatus = {
	/**
	 * When the receiver last accepted a report, as an ISO 8601 UTC string, or
	 * `null` when it never did.
	 */
	lastSuccessfulReport: string | null;
};
