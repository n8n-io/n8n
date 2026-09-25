// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

export interface ControlledTabId {
	targetId: string;
	chromeTabId: number;
}

export type ConnectionStatus = 'disconnected' | 'connected' | 'connecting';

export interface ConnectResponse {
	success: boolean;
	error?: string;
}

export interface StatusResponse {
	connected?: boolean;
	tabIds?: ControlledTabId[];
	/** Relay URL of the live session, so any view can name the instance it is bound to. */
	relayUrl?: string;
}

// ---------------------------------------------------------------------------
// Extension messages (UI → background)
// ---------------------------------------------------------------------------

export interface GetTabsMessage {
	type: 'getTabs';
}

export interface ConnectMessage {
	type: 'connect';
	relayUrl: string;
	selectedTabIds: number[];
}

export interface DisconnectMessage {
	type: 'disconnect';
}

export interface GetStatusMessage {
	type: 'getStatus';
}

export interface GetRelayUrlMessage {
	type: 'getRelayUrl';
}

export interface ClearRelayUrlMessage {
	type: 'clearRelayUrl';
}

export type ExtensionMessage =
	| GetTabsMessage
	| ConnectMessage
	| DisconnectMessage
	| GetStatusMessage
	| GetRelayUrlMessage
	| ClearRelayUrlMessage;

// ---------------------------------------------------------------------------
// External messages (web page → background, via externally_connectable)
// ---------------------------------------------------------------------------

export interface ExternalConnectMessage {
	type: 'connect';
	relayUrl: string;
}

export interface ExternalConnectResultMessage {
	type: 'connectResult';
	relayUrl: string;
}

export type ExternalMessage = ExternalConnectMessage | ExternalConnectResultMessage;

export interface ExternalConnectResponse {
	accepted: boolean;
	/**
	 * False when the host was already allowed and no confirmation was shown, so the page can
	 * say "connecting" rather than point at a popup that never appears. Older extensions
	 * omit it — treat as true.
	 */
	confirmationRequired?: boolean;
}

export interface ExternalConnectResultResponse {
	connected: boolean;
}

// ---------------------------------------------------------------------------
// Background → UI push messages
// ---------------------------------------------------------------------------

export interface RelayUrlReadyMessage {
	type: 'relayUrlReady';
	relayUrl: string;
}

export interface StatusChangedMessage {
	type: 'statusChanged';
	connected: boolean;
	tabIds?: ControlledTabId[];
	relayUrl?: string;
}

export type BackgroundPushMessage = RelayUrlReadyMessage | StatusChangedMessage;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isExternalMessage(raw: unknown): raw is ExternalMessage {
	if (raw === null || typeof raw !== 'object') return false;
	const obj = raw as Record<string, unknown>;
	return (
		(obj.type === 'connect' || obj.type === 'connectResult') && typeof obj.relayUrl === 'string'
	);
}

export function isConnectResponse(raw: unknown): raw is ConnectResponse {
	if (raw === null || typeof raw !== 'object') return false;
	const obj = raw as Record<string, unknown>;
	if (typeof obj.success !== 'boolean') return false;
	if ('error' in obj && typeof obj.error !== 'string') return false;
	return true;
}

export function isStatusResponse(raw: unknown): raw is StatusResponse {
	if (raw === null || typeof raw !== 'object') return false;
	const obj = raw as Record<string, unknown>;
	if ('connected' in obj && typeof obj.connected !== 'boolean') return false;
	if (obj.relayUrl !== undefined && typeof obj.relayUrl !== 'string') return false;
	if ('tabIds' in obj) {
		if (!Array.isArray(obj.tabIds)) return false;
		for (const item of obj.tabIds) {
			if (
				!item ||
				typeof item !== 'object' ||
				typeof (item as Record<string, unknown>).targetId !== 'string' ||
				typeof (item as Record<string, unknown>).chromeTabId !== 'number'
			) {
				return false;
			}
		}
	}
	return true;
}
