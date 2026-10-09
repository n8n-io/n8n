import type {
	LinkedInstanceCredentialNeedingSetup,
	LinkedInstancePushResult,
} from '@n8n/api-types';

/**
 * The state of the copy in the linked instance after the move. `keptLive`: the copy was live
 * there before the move, and a version of it stays live. It can be the new or an earlier version.
 */
export type RemoteCopyState = 'live' | 'earlierLive' | 'keptLive' | 'notLive';

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
 * an earlier version stays live there. `publishFailed` is `false` when the move did not ask to
 * publish, so then the result does not tell which version is live. The warnings of the linked
 * instance say it.
 */
export function remoteCopyState(
	result: Pick<LinkedInstancePushResult, 'published' | 'publishFailed'>,
	publishAsked: boolean,
): RemoteCopyState {
	if (!result.published) return 'notLive';
	if (!publishAsked) return 'keptLive';
	return result.publishFailed ? 'earlierLive' : 'live';
}

/** `publishAsked`: the `publish` field of the request of the move. */
export function transferResultView(
	result: LinkedInstancePushResult,
	baseUrl: string,
	publishAsked: boolean,
): TransferResultView {
	const needsAttention =
		result.publishFailed ||
		result.credentialsNeedingSetup.length > 0 ||
		result.missingNodeTypes.length > 0 ||
		result.warnings.length > 0;

	return {
		tone: needsAttention ? 'warning' : 'success',
		remoteState: remoteCopyState(result, publishAsked),
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
