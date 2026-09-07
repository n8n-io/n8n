/** Prefix for every route the data plane calls. Auth and body limits mount on it. */
export const CONTROL_PLANE_PREFIX = '/internal';

/** Where the data plane posts lifecycle event batches. Shared, so the two sides cannot disagree. */
export const STATUS_CALLBACK_PATH = `${CONTROL_PLANE_PREFIX}/status-callback`;
