export const MIN_RUNS_FOR_ANALYSIS = 20;
export const MIN_CLUSTER_RUNS = 5;
export const MAX_COLLECTED_RUNS = 200;
export const HOLDOUT_SHARE = 0.2;
export const MIN_MATCH_RATE = 0.8;
/** Fewer held-out replays than this is too little evidence for a badge. */
export const MIN_HOLDOUT_RUNS = 5;
export const MIN_GAIN_POINTS = 20;

export const DRAFT_OUTPUT_NODE_NAME = 'Output';
export const FALLBACK_NODE_NAME = 'Agent fallback';
export const DRAFT_TAG_NAME = 'generated';
export const DRAFT_NAME_SUFFIX = '(deterministic draft)';
/** Train runs replayed to find what the first draft gets wrong. */
export const VALIDATION_RUNS = 5;
/** Redrafts with replay failures, as the lab script's `convert --feedback` does. */
export const FEEDBACK_ROUNDS = 2;
