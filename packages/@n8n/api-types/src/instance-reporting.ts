export type InstanceReportingStatus = {
	/**
	 * When the receiver last accepted a report, as an ISO 8601 UTC string, or
	 * `null` when it never did.
	 */
	lastSuccessfulReport: string | null;
};
