export const SCIM_STORE = 'scim';

/** Route name of the SCIM settings page. The shell mounts it under `/settings/sso/scim`. */
export const SCIM_SETTINGS_VIEW = 'ScimSettings';

export const SCIM_DOCS_URL = 'https://docs.n8n.io/user-management/scim/';

/** The docs section that explains how to send a test request from the identity provider. */
export const SCIM_TEST_CONNECTION_DOCS_URL = `${SCIM_DOCS_URL}#test-the-connection`;

/** How often the page asks the backend for the connection status while it waits for the first request. */
export const SCIM_STATUS_POLL_INTERVAL_MS = 5_000;

/** Delay between the last keystroke in the transfer target picker and the search request. */
export const SCIM_TRANSFER_TARGET_SEARCH_DEBOUNCE_MS = 300;
