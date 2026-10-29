import { UserError } from 'n8n-workflow';

/**
 * A credential is bound to a managed OAuth app that the overwrites do not hold, or its stored
 * version is not valid. The user must reconnect the credential. Callers catch this class
 * to offer a reconnect and let any other error through.
 */
export class ManagedAppUnavailableError extends UserError {}
