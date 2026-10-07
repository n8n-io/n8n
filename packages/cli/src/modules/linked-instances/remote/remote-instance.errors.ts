import { OperationalError } from '@n8n/errors';

export const REMOTE_INSTANCE_ERROR_REASONS = [
	/**
	 * No usable answer: network error, refused address, redirect, unexpected status, oversized
	 * response or closed connection. Also a timeout or a protocol error while the connection
	 * is set up.
	 */
	'unreachable',
	/** The instance answers, but its MCP access is turned off. */
	'mcp-disabled',
	/** The instance refused the access token. */
	'unauthorised',
	/** The remote returned an error to the tool call, or its result cannot be read. */
	'tool-error',
	/** A request on an open connection got no answer before the time limit. */
	'timeout',
] as const;

export type RemoteInstanceErrorReason = (typeof REMOTE_INSTANCE_ERROR_REASONS)[number];

const DEFAULT_MESSAGES: Record<RemoteInstanceErrorReason, string> = {
	unreachable: 'n8n could not reach the linked instance.',
	'mcp-disabled': 'MCP access is turned off on the linked instance.',
	unauthorised: 'The linked instance refused the access token.',
	'tool-error': 'The tool on the linked instance failed.',
	timeout: 'The linked instance did not answer in time.',
};

/**
 * A failed request to a linked n8n instance. Callers branch on `reason`.
 * The message never holds the access token, and the error never carries a `cause`,
 * because SDK errors can hold raw request or response data.
 */
export class RemoteInstanceError extends OperationalError {
	readonly reason: RemoteInstanceErrorReason;

	constructor(reason: RemoteInstanceErrorReason, message: string = DEFAULT_MESSAGES[reason]) {
		super(message);
		this.name = 'RemoteInstanceError';
		this.reason = reason;
	}
}
