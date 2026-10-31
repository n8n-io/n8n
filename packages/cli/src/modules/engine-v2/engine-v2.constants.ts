/** Prefix for every route the data plane calls. Auth and body limits mount on it. */
export const CONTROL_PLANE_PREFIX = '/internal';

/** Where the data plane posts lifecycle event batches. Shared, so the two sides cannot disagree. */
export const STATUS_CALLBACK_PATH = `${CONTROL_PLANE_PREFIX}/status-callback`;

/** Where the data plane asks for the decrypted data of one credential. */
export const CREDENTIALS_RESOLVE_PATH = `${CONTROL_PLANE_PREFIX}/credentials/resolve`;

/** Where the data plane sends one data table operation of a step it runs. */
export const DATA_TABLES_CALL_PATH = `${CONTROL_PLANE_PREFIX}/data-tables/call`;
