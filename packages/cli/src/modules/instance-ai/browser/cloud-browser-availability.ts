/**
 * Whether a run gets the cloud browser. The admin switches are applied here
 * together with the rollout flag, which only the run start can read.
 */
export function isCloudBrowserEnabledForRun({
	allowed,
	rolledOut,
	onCloud,
	browserUseEnabled,
	cloudBrowserEnabled,
}: {
	/** False for runs that must not open a cloud session, such as background tasks. */
	allowed: boolean;
	rolledOut: boolean;
	onCloud: boolean;
	browserUseEnabled: boolean;
	cloudBrowserEnabled: boolean;
}): boolean {
	return allowed && rolledOut && onCloud && browserUseEnabled && cloudBrowserEnabled;
}
