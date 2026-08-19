/**
 * Policy check contract.
 *
 * Shared by every policy feature: the points where policies apply, what a check looks
 * like, and the shape of a violation. Types only — the service that calls checks lives in
 * cli core, and the code that runs and combines them lives in the policy-infrastructure
 * module, so a policy feature never imports either.
 */

export {
	PolicyCheck,
	PolicyCheckMetadata,
	UnknownEnforcementPointError,
} from './policy-check-metadata';
export * from './policy-check';
