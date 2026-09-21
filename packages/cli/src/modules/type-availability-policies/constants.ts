/**
 * The `kind` this module's REST surface manages today. A second kind reuses the same store,
 * evaluator and DTOs, and gets its own controller mounted on its own path.
 */
export const NODE_TYPES_KIND = 'node-types';

/**
 * The second policy kind: credential types (e.g. `slackApi`), not node types. Its own REST
 * surface is a later ticket; this module already evaluates and validates rules of this kind,
 * since `TypeAvailabilityPolicyService` is parameterized by `kind` throughout.
 */
export const CREDENTIAL_TYPES_KIND = 'credential-types';
