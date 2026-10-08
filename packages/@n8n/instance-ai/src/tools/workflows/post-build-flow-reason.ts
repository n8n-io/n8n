/**
 * The `postBuildFlow.reason` of a direct build of a one-off workflow. A small module of its own,
 * so the repeatable-work signals can read it without loading the build tool.
 */
export const ONE_OFF_BUILD_SUCCEEDED_REASON = 'direct-one-off-build-succeeded';
