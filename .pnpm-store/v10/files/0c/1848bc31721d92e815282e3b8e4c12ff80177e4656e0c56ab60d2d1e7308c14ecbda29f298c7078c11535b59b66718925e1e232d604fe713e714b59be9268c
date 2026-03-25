import { Client, DebugImage, Envelope, Event, EventEnvelope, Profile, ProfileChunk, Span, ThreadCpuProfile } from '@sentry/core';
import { BrowserOptions } from '../client';
import { JSSelfProfile, JSSelfProfiler } from './jsSelfProfiling';
export declare const PROFILER_THREAD_ID_STRING: string;
export declare const PROFILER_THREAD_NAME: string;
/**
 *
 */
export declare function enrichWithThreadInformation(profile: ThreadCpuProfile | JSSelfProfile): ThreadCpuProfile;
export interface ProfiledEvent extends Event {
    sdkProcessingMetadata: {
        profile?: JSSelfProfile;
    };
}
/**
 * Creates a profiling event envelope from a Sentry event. If profile does not pass
 * validation, returns null.
 * @param event
 * @param dsn
 * @param metadata
 * @param tunnel
 * @returns {EventEnvelope | null}
 */
/**
 * Creates a profiling event envelope from a Sentry event.
 */
export declare function createProfilePayload(profile_id: string, start_timestamp: number | undefined, processed_profile: JSSelfProfile, event: ProfiledEvent): Profile;
/**
 * Create a profile chunk envelope item
 */
export declare function createProfileChunkPayload(jsSelfProfile: JSSelfProfile, client: Client, profilerId?: string): ProfileChunk;
/**
 * Validate a profile chunk against the Sample Format V2 requirements.
 * https://develop.sentry.dev/sdk/telemetry/profiles/sample-format-v2/
 * - Presence of samples, stacks, frames
 * - Required metadata fields
 */
export declare function validateProfileChunk(chunk: ProfileChunk): {
    valid: true;
} | {
    reason: string;
};
/**
 *
 */
export declare function isProfiledTransactionEvent(event: Event): event is ProfiledEvent;
/**
 *
 */
export declare function isAutomatedPageLoadSpan(span: Span): boolean;
/**
 * Converts a JSSelfProfile to a our sampled format.
 * Does not currently perform stack indexing.
 */
export declare function convertJSSelfProfileToSampledFormat(input: JSSelfProfile): Profile['profile'];
/**
 * Adds items to envelope if they are not already present - mutates the envelope.
 * @param envelope
 */
export declare function addProfilesToEnvelope(envelope: EventEnvelope, profiles: Profile[]): Envelope;
/**
 * Finds transactions with profile_id context in the envelope
 * @param envelope
 * @returns
 */
export declare function findProfiledTransactionsFromEnvelope(envelope: Envelope): Event[];
/**
 * Applies debug meta data to an event from a list of paths to resources (sourcemaps)
 */
export declare function applyDebugMetadata(resource_paths: ReadonlyArray<string>): DebugImage[];
/**
 * Checks the given sample rate to make sure it is valid type and value (a boolean, or a number between 0 and 1).
 */
export declare function isValidSampleRate(rate: unknown): boolean;
export declare const MAX_PROFILE_DURATION_MS = 30000;
/**
 * Starts the profiler and returns the profiler instance.
 */
export declare function startJSSelfProfile(): JSSelfProfiler | undefined;
/**
 * Determine if a profile should be profiled.
 */
export declare function shouldProfileSpanLegacy(span: Span): boolean;
/**
 * Determine if a profile should be created for the current session.
 */
export declare function shouldProfileSession(options: BrowserOptions): boolean;
/**
 * Checks if legacy profiling is configured.
 */
export declare function hasLegacyProfiling(options: BrowserOptions): boolean;
/**
 * Creates a profiling envelope item, if the profile does not pass validation, returns null.
 * @param event
 * @returns {Profile | null}
 */
export declare function createProfilingEvent(profile_id: string, start_timestamp: number | undefined, profile: JSSelfProfile, event: ProfiledEvent): Profile | null;
/**
 *
 */
export declare function getActiveProfilesCount(): number;
/**
 * Retrieves profile from global cache and removes it.
 */
export declare function takeProfileFromGlobalCache(profile_id: string): JSSelfProfile | undefined;
/**
 * Adds profile to global cache and evicts the oldest profile if the cache is full.
 */
export declare function addProfileToGlobalCache(profile_id: string, profile: JSSelfProfile): void;
/**
 * Attaches the profiled thread information to the event's trace context.
 */
export declare function attachProfiledThreadToEvent(event: Event): Event;
//# sourceMappingURL=utils.d.ts.map
