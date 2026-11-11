/** Prefix for every route the data plane calls. Auth and body limits mount on it. */
export const CONTROL_PLANE_PREFIX = '/internal';

/** Where the data plane asks for the decrypted data of one credential. */
export const CREDENTIALS_RESOLVE_PATH = `${CONTROL_PLANE_PREFIX}/credentials/resolve`;

/** Where the data plane sends one data table operation of a step it runs. */
export const DATA_TABLES_CALL_PATH = `${CONTROL_PLANE_PREFIX}/data-tables/call`;

/**
 * Status of a refused data table call. The body names the v1 error to raise.
 * 422 keeps a refusal apart from the 400 of a malformed request, which carries
 * no such body.
 */
export const DATA_TABLES_CALL_REFUSED_STATUS = 422;

/** Where the data plane asks for the graph of a sub-workflow a step calls. */
export const SUB_WORKFLOWS_RESOLVE_PATH = `${CONTROL_PLANE_PREFIX}/sub-workflows/resolve`;
