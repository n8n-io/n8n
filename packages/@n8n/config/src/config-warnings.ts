export type ConfigWarningHandler = (message: string) => void;

const defaultHandler: ConfigWarningHandler = (message) => console.warn(message);

let handler: ConfigWarningHandler = defaultHandler;

/**
 * Route the warnings that reading the configuration emits (an invalid
 * environment variable value, a trimmed `_FILE` value) through this handler.
 *
 * This package cannot depend on the logger, so the warnings go to the console
 * until the process has a logger and hands it over here. Configs read before
 * that, such as the global config during bootstrap, keep the console.
 */
export function setConfigWarningHandler(next: ConfigWarningHandler) {
	handler = next;
}

/** Restores the console as the handler. For tests. */
export function resetConfigWarningHandler() {
	handler = defaultHandler;
}

export function emitConfigWarning(message: string) {
	handler(message);
}
