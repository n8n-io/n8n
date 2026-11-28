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

/**
 * The third policy kind: which credential types may receive a value from the incoming request
 * through a run-time stub credential. Rules name credential types, so it evaluates like
 * `CREDENTIAL_TYPES_KIND`. Its REST surface mounts on `/request-fed-credential-type-policies`,
 * gated on `credentialTypePolicy:manageRequestFed`.
 */
export const REQUEST_FED_CREDENTIAL_TYPES_KIND = 'request-fed-credential-types';

/** Kinds whose rules name credential types, with `extends` selectors and ancestor matching. */
export function isCredentialTypeKind(kind: string): boolean {
	return kind === CREDENTIAL_TYPES_KIND || kind === REQUEST_FED_CREDENTIAL_TYPES_KIND;
}
