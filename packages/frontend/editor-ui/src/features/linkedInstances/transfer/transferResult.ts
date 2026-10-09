import type {
	LinkedInstanceCredentialNeedingSetup,
	LinkedInstancePushResult,
} from '@n8n/api-types';

/** The state of the copy in the linked instance after the move. */
export type RemoteCopyState = 'live' | 'earlierLive' | 'notLive';

export type TransferSetUpLink = LinkedInstanceCredentialNeedingSetup & {
	/** Opens the credential in the linked instance. `undefined` when its address is not http(s). */
	url: string | undefined;
};

/** What the message after a move shows. Text from the linked instance stays plain text. */
export interface TransferResultView {
	/** `warning` when something needs the user: set-up, missing node types or a warning. */
	tone: 'success' | 'warning';
	remoteState: RemoteCopyState;
	turnedOffHere: boolean;
	/** Opens the copy in the linked instance. `undefined` when the address is not http(s). */
	openUrl: string | undefined;
	needsSetUp: TransferSetUpLink[];
	missingNodeTypes: string[];
	warnings: string[];
}

/** The URL as the browser reads it, or `undefined` for any scheme but http and https. */
export function safeHttpUrl(value: string): string | undefined {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
	} catch {
		return undefined;
	}
}

/** Opens a credential in the n8n editor at `baseUrl`, as `/home/credentials/<id>` does here. */
export function remoteCredentialUrl(baseUrl: string, credentialId: string): string | undefined {
	const base = safeHttpUrl(baseUrl);
	if (base === undefined) return undefined;
	return `${base.replace(/\/+$/, '')}/home/credentials/${encodeURIComponent(credentialId)}`;
}

/**
 * The fields tell the state, never the warning texts. `publishFailed` with `published` means that
 * an earlier version stays live there.
 */
export function remoteCopyState(
	result: Pick<LinkedInstancePushResult, 'published' | 'publishFailed'>,
): RemoteCopyState {
	if (!result.published) return 'notLive';
	return result.publishFailed ? 'earlierLive' : 'live';
}

export function transferResultView(
	result: LinkedInstancePushResult,
	baseUrl: string,
): TransferResultView {
	const needsAttention =
		result.publishFailed ||
		result.credentialsNeedingSetup.length > 0 ||
		result.missingNodeTypes.length > 0 ||
		result.warnings.length > 0;

	return {
		tone: needsAttention ? 'warning' : 'success',
		remoteState: remoteCopyState(result),
		turnedOffHere: result.localDeactivated,
		openUrl: safeHttpUrl(result.remoteUrl),
		needsSetUp: result.credentialsNeedingSetup.map((credential) => ({
			...credential,
			url: remoteCredentialUrl(baseUrl, credential.id),
		})),
		missingNodeTypes: [...result.missingNodeTypes],
		warnings: [...result.warnings],
	};
}
