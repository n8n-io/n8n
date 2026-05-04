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
	activeSession: { key: string; createdAt: number; expiresAt: number; rotateAfter: number } | null;
	disconnectTimer: ReturnType<typeof setTimeout> | null;
	reconnectCount: number;
}

const INITIAL_GRACE_MS = 10_000;
const MAX_GRACE_MS = 120_000;
const PAIRING_TOKEN_TTL_MS = 5 * 60 * 1000;
const SESSION_KEY_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_KEY_ROTATION_MS = 60 * 60 * 1000;

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
				activeSession: null,
				disconnectTimer: null,
				reconnectCount: 0,
			});
		}
		return this.userGateways.get(userId)!;
	}

	private clearPairingToken(state: UserGatewayState): void {
		if (!state.pairingToken) return;
		this.apiKeyToUserId.delete(state.pairingToken.token);
		state.pairingToken = null;
	}

	private clearActiveSession(state: UserGatewayState): void {
		if (!state.activeSession) return;
		this.apiKeyToUserId.delete(state.activeSession.key);
		state.activeSession = null;
	}

	private expireActiveSessionIfNeeded(state: UserGatewayState): void {
		if (!state.activeSession) return;
		if (Date.now() <= state.activeSession.expiresAt) return;
		this.clearActiveSession(state);
		state.gateway.disconnect();
	}

	private createSession(userId: string, state: UserGatewayState): string {
		const now = Date.now();
		const sessionKey = this.generateUniqueKey('sess');
		this.clearActiveSession(state);
		state.activeSession = {
			key: sessionKey,
			createdAt: now,
			expiresAt: now + SESSION_KEY_TTL_MS,
			rotateAfter: now + SESSION_KEY_ROTATION_MS,
		};
		this.apiKeyToUserId.set(sessionKey, userId);
		return sessionKey;
	}

	/** Resolve an API key (pairing token or session key) back to the owning userId. */
	getUserIdForApiKey(key: string): string | undefined {
		const userId = this.apiKeyToUserId.get(key);
		if (!userId) return undefined;

		const state = this.userGateways.get(userId);
		if (!state) {
			this.apiKeyToUserId.delete(key);
			return undefined;
		}

		if (state.pairingToken?.token === key) {
			if (Date.now() - state.pairingToken.createdAt > PAIRING_TOKEN_TTL_MS) {
				this.clearPairingToken(state);
				return undefined;
			}
			return userId;
		}

		if (state.activeSession?.key === key) {
			this.expireActiveSessionIfNeeded(state);
			return state.activeSession?.key === key ? userId : undefined;
		}

		this.apiKeyToUserId.delete(key);
		return undefined;
	}

	/** Generate a one-time pairing token for UI-initiated connections. */
	generatePairingToken(userId: string): string {
		const state = this.getOrCreate(userId);
		this.expireActiveSessionIfNeeded(state);

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
			this.clearPairingToken(state);
			return null;
		}
		return state.pairingToken.token;
	}

	/** Get the expiry time for an active pairing token or session key. */
	getApiKeyExpiresAt(userId: string, key: string): Date | null {
		const state = this.userGateways.get(userId);
		if (!state) return null;
		if (state.pairingToken?.token === key) {
			if (!this.getPairingToken(userId)) return null;
			const freshPairingToken = state.pairingToken;
			return freshPairingToken
				? new Date(freshPairingToken.createdAt + PAIRING_TOKEN_TTL_MS)
				: null;
		}
		if (state.activeSession?.key === key) {
			this.expireActiveSessionIfNeeded(state);
			return state.activeSession?.key === key ? new Date(state.activeSession.expiresAt) : null;
		}
		return null;
	}

	/**
	 * Consume the pairing token and issue a long-lived session key.
	 * Returns the session key, or null if the token is invalid or expired.
	 */
	consumePairingToken(userId: string, token: string): string | null {
		const state = this.userGateways.get(userId);
		const valid = this.getPairingToken(userId);
		if (!state || !valid || valid !== token) return null;

		this.clearPairingToken(state); // Consumed — cannot be reused
		return this.createSession(userId, state);
	}

	/** Get the active session key for a user. */
	getActiveSessionKey(userId: string): string | null {
		const state = this.userGateways.get(userId);
		if (!state) return null;
		this.expireActiveSessionIfNeeded(state);
		return state.activeSession?.key ?? null;
	}

	/** Rotate the active session key when a reconnect arrives after the rotation window. */
	rotateSessionKeyIfNeeded(userId: string, key: string): string | null {
		const state = this.userGateways.get(userId);
		if (!state?.activeSession || state.activeSession.key !== key) return null;
		this.expireActiveSessionIfNeeded(state);
		if (!state.activeSession || Date.now() < state.activeSession.rotateAfter) return null;

		this.clearActiveSession(state);
		return this.createSession(userId, state);
	}

	/** Whether this active session key should be rotated on the next reconnect. */
	isSessionKeyDueForRotation(userId: string, key: string): boolean {
		const state = this.userGateways.get(userId);
		if (!state?.activeSession || state.activeSession.key !== key) return false;
		this.expireActiveSessionIfNeeded(state);
		return !!state.activeSession && Date.now() >= state.activeSession.rotateAfter;
	}

	/** Get the time after which the active session key should be rotated. */
	getSessionKeyRotateAfter(userId: string, key: string): Date | null {
		const state = this.userGateways.get(userId);
		if (!state?.activeSession || state.activeSession.key !== key) return null;
		this.expireActiveSessionIfNeeded(state);
		return state.activeSession?.key === key ? new Date(state.activeSession.rotateAfter) : null;
	}

	/** Clear the active session key (called on explicit disconnect). */
	clearActiveSessionKey(userId: string): void {
		const state = this.userGateways.get(userId);
		if (!state) return;
		this.clearActiveSession(state);
	}

	/** Revoke local gateway auth material and disconnect the user's gateway. */
	revokeSession(userId: string): boolean {
		const state = this.userGateways.get(userId);
		if (!state) return false;

		const hadState =
			state.gateway.getStatus().connected || !!state.activeSession || !!state.pairingToken;
		this.clearDisconnectTimer(userId);
		this.clearPairingToken(state);
		this.clearActiveSession(state);
		state.gateway.disconnect();
		state.reconnectCount = 0;
		return hadState;
	}

	/** Return the user's LocalGateway instance, creating state if needed. */
	getGateway(userId: string): LocalGateway {
		return this.getOrCreate(userId).gateway;
	}

	/** Return the user's LocalGateway if state exists, or undefined if the user has never connected. */
	findGateway(userId: string): LocalGateway | undefined {
		const state = this.userGateways.get(userId);
		if (!state) return undefined;
		this.expireActiveSessionIfNeeded(state);
		return state.gateway;
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
		const state = this.userGateways.get(userId);
		if (state) {
			this.expireActiveSessionIfNeeded(state);
		}
		return (
			state?.gateway.getStatus() ?? {
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

	/** Return IDs of users with an active gateway connection. */
	getConnectedUserIds(): string[] {
		return [...this.userGateways.entries()]
			.filter(([, state]) => state.gateway.getStatus().connected)
			.map(([userId]) => userId);
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
