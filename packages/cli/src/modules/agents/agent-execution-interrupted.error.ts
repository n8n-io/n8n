import { OperationalError } from '@n8n/errors';

/**
 * The turn stopped because its process shut down or lost the database. Its
 * row is already marked interrupted. Chat replies use neutral text for it.
 */
export class AgentExecutionInterruptedError extends OperationalError {}
