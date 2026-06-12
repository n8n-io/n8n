/**
 * Thread-metadata key the desktop-assistant promote completion report is
 * persisted under by the `report-promoted-workflow` tool. Lives in its own
 * dependency-free module so the package index (and the CLI, which reads the
 * report) can import the key without pulling in the tool runtime.
 */
export const PROMOTED_BUILD_METADATA_KEY = 'desktopAssistantPromotedBuild';

/**
 * Thread-metadata key recording the build run a promote kicked off, written by
 * the CLI's promote endpoint at run start. `report-promote-outcome` stamps its
 * report with this marker's value, and the confirming promote call settles
 * only a report whose stamp matches it.
 */
export const PROMOTE_RUN_ID_KEY = 'desktopAssistantPromoteRunId';
