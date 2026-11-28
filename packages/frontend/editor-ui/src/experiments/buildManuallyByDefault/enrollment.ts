import { NEW_CLOUD_ONBOARDING_TRACKS as TRACKS } from '@/app/constants/experiments';

/**
 * True when the user is on this experiment's onboarding track. PostHog enforces
 * the track with a flag dependency. This check also keeps a misconfigured
 * experiment flag from enrolling, or tracking, users of the other track.
 */
export function isOnBuildManuallyTrack(getFlag: (name: string) => unknown): boolean {
	return getFlag(TRACKS.name) === TRACKS.buildManually;
}
