/** Prefix for every route the data plane calls. Auth and body limits mount on it. */
export const CONTROL_PLANE_PREFIX = '/internal';

/** Where the data plane asks for the decrypted data of one credential. */
export const CREDENTIALS_RESOLVE_PATH = `${CONTROL_PLANE_PREFIX}/credentials/resolve`;
