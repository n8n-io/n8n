import { nanoid } from 'nanoid';

import type {
	InstanceAiGatewayCapabilities,
	McpToolCallResult,
	ToolCategory,
} from '@n8n/api-types';

import { LocalGateway } from './local-gateway';

interface UserGatewayState {
	gateway: LocalGateway;
	pairingToken: { token: string; createdAt: number } | null;
	activeSessionKey: string | null;
	disconnectTimer: ReturnType<typeof setTimeout> | null;
	reconnectCount: number;
}

const INITIAL_GRACE_MS = 10_000;
const MAX_GRACE_MS = 120_000;
const PAIRING_TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * Manages per-user Local Gateway connections.
 * Each user has their own LocalGateway instance, pairing token, and session key.
 * Provides a reverse lookup from API key to userId for routing daemon requests.
 */
export class LocalGatewayRegistry {
	private readonly userGateways = new Map<string, UserGatewayState>();

	/** Reverse lookup: pairing token or session key → userId. Used to route daemon requests. */
	private readonly apiKeyToUserId = new Map<string, string>();

	/** Generate a key with the given prefix that is not already in the reverse lookup. */
	private generateUniqueKey(prefix: string): string {
		let key: string;
		do {
			key = `${prefix}_${nanoid(32)}`;
		} while (this.apiKeyToUserId.has(key));
		return key;
	}

	private getOrCreate(userId: string): UserGatewayState {
		if (!this.userGateways.has(userId)) {
			this.userGateways.set(userId, {
				gateway: new LocalGateway(),
				pairingToken: null,
				activeSessionKey: null,
				disconnectTimer: null,
				reconnectCount: 0,
			});
		}
		return this.userGateways.get(userId)!;
	}

	/** Resolve an API key (pairing token or session key) back to the owning userId. */
	getUserIdForApiKey(key: string): string | undefined {
		return this.apiKeyToUserId.get(key);
	}

	/** Generate a one-time pairing token for UI-initiated connections. */
	generatePairingToken(userId: string): string {
		const state = this.getOrCreate(userId);
		// If there's an active session key, return it so the daemon can reconnect
		// without losing its authenticated session (e.g. after a page reload).
		if (state.activeSessionKey) return state.activeSessionKey;

		// Reuse existing valid token to prevent race conditions between concurrent callers.
		const existing = this.getPairingToken(userId);
		if (existing) return existing;

		const token = this.generateUniqueKey('gw');
		state.pairingToken = { token, createdAt: Date.now() };
		this.apiKeyToUserId.set(token, userId);
		return token;
	}

	/** Get the current pairing token. Returns null if expired or already consumed. */
	getPairingToken(userId: string): string | null {
		const state = this.userGateways.get(userId);
		if (!state?.pairingToken) return null;
		if (Date.now() - state.pairingToken.createdAt > PAIRING_TOKEN_TTL_MS) {
			this.apiKeyToUserId.delete(state.pairingToken.token);
			state.pairingToken = null;
			return null;
		}
		return state.pairingToken.token;
	}

	/**
	 * Consume the pairing token and issue a long-lived session key.
	 * Returns the session key, or null if the token is invalid or expired.
	 */
	consumePairingToken(userId: string, token: string): string | null {
		const state = this.userGateways.get(userId);
		const valid = this.getPairingToken(userId);
		if (!state || !valid || valid !== token) return null;

		this.apiKeyToUserId.delete(token);
		state.pairingToken = null; // Consumed — cannot be reused
		const sessionKey = this.generateUniqueKey('sess');
		state.activeSessionKey = sessionKey;
		this.apiKeyToUserId.set(sessionKey, userId);
		return sessionKey;
	}

	/** Get the active session key for a user. */
	getActiveSessionKey(userId: string): string | null {
		return this.userGateways.get(userId)?.activeSessionKey ?? null;
	}

	/** Clear the active session key (called on explicit disconnect). */
	clearActiveSessionKey(userId: string): void {
		const state = this.userGateways.get(userId);
		if (!state?.activeSessionKey) return;
		this.apiKeyToUserId.delete(state.activeSessionKey);
		state.activeSessionKey = null;
	}

	/** Return the user's LocalGateway instance, creating state if needed. */
	getGateway(userId: string): LocalGateway {
		return this.getOrCreate(userId).gateway;
	}

	/** Return the user's LocalGateway if state exists, or undefined if the user has never connected. */
	findGateway(userId: string): LocalGateway | undefined {
		return this.userGateways.get(userId)?.gateway;
	}

	/** Initialize the gateway from daemon capabilities. Clears any pending disconnect timer. */
	initGateway(userId: string, data: InstanceAiGatewayCapabilities): void {
		const state = this.getOrCreate(userId);
		this.clearDisconnectTimer(userId);
		state.reconnectCount = 0;
		state.gateway.init(data);
	}

	/** Resolve a pending tool call request dispatched to a user's daemon. */
	resolveGatewayRequest(
		userId: string,
		requestId: string,
		result?: McpToolCallResult,
		error?: string,
	): boolean {
		return this.userGateways.get(userId)?.gateway.resolveRequest(requestId, result, error) ?? false;
	}

	/** Disconnect the user's gateway. */
	disconnectGateway(userId: string): void {
		this.userGateways.get(userId)?.gateway.disconnect();
	}

	/** Return connection status for the user's gateway. */
	getGatewayStatus(userId: string): {
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
		hostIdentifier: string | null;
		toolCategories: ToolCategory[];
	} {
		return (
			this.userGateways.get(userId)?.gateway.getStatus() ?? {
				connected: false,
				connectedAt: null,
				directory: null,
				hostIdentifier: null,
				toolCategories: [],
			}
		);
	}

	/**
	 * Start a grace-period timer. If the daemon doesn't reconnect within the window,
	 * the gateway is disconnected and `onDisconnect` is called.
	 * Uses exponential backoff: 10s → 20s → 40s → … → 120s.
	 */
	startDisconnectTimer(userId: string, onDisconnect: () => void): void {
		const state = this.getOrCreate(userId);
		this.clearDisconnectTimer(userId);
		const graceMs = Math.min(INITIAL_GRACE_MS * Math.pow(2, state.reconnectCount), MAX_GRACE_MS);
		state.reconnectCount++;
		state.disconnectTimer = setTimeout(() => {
			state.disconnectTimer = null;
			this.disconnectGateway(userId);
			// Session key is kept alive so the daemon can re-authenticate on reconnect.
			// It is only cleared on explicit /gateway/disconnect.
			onDisconnect();
		}, graceMs);
	}

	/** Cancel a pending disconnect timer (e.g. daemon reconnected in time). */
	clearDisconnectTimer(userId: string): void {
		const state = this.userGateways.get(userId);
		if (!state?.disconnectTimer) return;
		clearTimeout(state.disconnectTimer);
		state.disconnectTimer = null;
	}

	/** Disconnect all gateways and clear all state (called on service shutdown). */
	disconnectAll(): void {
		for (const state of this.userGateways.values()) {
			if (state.disconnectTimer) clearTimeout(state.disconnectTimer);
			state.gateway.disconnect();
		}
		this.userGateways.clear();
		this.apiKeyToUserId.clear();
	}
}
