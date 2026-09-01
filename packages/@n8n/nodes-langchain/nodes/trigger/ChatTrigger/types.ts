import type { INode, IUser } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const validOptions = ['notSupported', 'memory', 'manually'] as const;
export type AuthenticationChatOption = 'none' | 'basicAuth' | 'n8nUserAuth';
export type LoadPreviousSessionChatOption = (typeof validOptions)[number];

/**
 * Identity resolved server-side for the shell's sandboxed frame: who the visitor is,
 * plus the AS token their messages carry (the frame has no origin, so it can send no
 * cookie of its own). The two only ever arrive together — the frame can resolve
 * neither for itself.
 */
export type ChatFrameIdentity = { visitor: IUser; authToken: string };

/** One credential row in the outer shell's "Connect your accounts" panel. */
export type ChatShellCredentialRow = {
	id: string;
	name: string;
	connected: boolean;
	/** Letter tile, used whenever the provider icon doesn't resolve. */
	initial: string;
	iconUrl?: string;
	authorizationUrl?: string;
	revokeUrl?: string;
	resolverId?: string;
	/** The connected identity shown as "Connected as …" — the visitor themselves. */
	account?: string;
};

/**
 * View model for the outer shell's connect panel. One required credential gets
 * its own row with a Connect button that opens the OAuth popup directly; two or
 * more collapse behind a summary line plus the "Connect your accounts" dialog —
 * mirrors Form's shipped `FormShellViewModel`.
 */
export type ChatShellViewModel = {
	credentials: ChatShellCredentialRow[];
	total: number;
	connectedCount: number;
	useDialog: boolean;
	footerText: string;
};

function isValidLoadPreviousSessionOption(value: unknown): value is LoadPreviousSessionChatOption {
	return typeof value === 'string' && (validOptions as readonly string[]).includes(value);
}

export function assertValidLoadPreviousSessionOption(
	value: string | undefined,
	node: INode,
): asserts value is LoadPreviousSessionChatOption | undefined {
	if (value && !isValidLoadPreviousSessionOption(value)) {
		throw new NodeOperationError(node, `Invalid loadPreviousSession option: ${value}`);
	}
}
