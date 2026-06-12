/**
 * Custom URI scheme registered with the OS for this app's deep links (the OAuth
 * redirect, and historically the connect hand-off). Single source of truth —
 * reused by the OAuth config, the deep-link parsers, and OS protocol registration.
 */
export const APP_URL_SCHEME = 'n8n';

/** Port and base URL of the embedded local n8n instance. Shared so the renderer can detect local mode. */
export const LOCAL_INSTANCE_PORT = 5680;
export const LOCAL_INSTANCE_URL = `http://127.0.0.1:${LOCAL_INSTANCE_PORT}`;
