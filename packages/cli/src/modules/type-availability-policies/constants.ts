/**
 * The first `kind` this module's REST surface manages, mounted on `/node-type-policies` and
 * `/projects/:projectId/node-type-policies`. A second kind reuses the same store, evaluator and
 * DTOs, and gets its own controller mounted on its own path — see `CREDENTIAL_TYPES_KIND`.
 */
export const NODE_TYPES_KIND = 'node-types';

/**
 * The second policy kind: credential types (e.g. `slackApi`), not node types. Its REST surface
 * is `CredentialTypePolicyInstanceController` and `CredentialTypePolicyProjectController`,
 * mounted on `/credential-type-policies` and `/projects/:projectId/credential-type-policies`,
 * gated on `credentialTypePolicy:manage` rather than `nodeTypePolicy:manage`.
 */
export const CREDENTIAL_TYPES_KIND = 'credential-types';
