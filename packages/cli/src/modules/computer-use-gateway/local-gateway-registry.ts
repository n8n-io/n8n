import type {
	InstanceAiGatewayCapabilities,
	McpTool,
	McpToolCallResult,
	ToolCategory,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';

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

export class LocalGatewayRegistry {
	private readonly userGateways = new Map<string, UserGatewayState>();

	private readonly apiKeyToUserId = new Map<string, string>();

	private generateUniqueKey(prefix: string): string {
		let key: string;
		do {
			key = `${prefix}_${nanoid(32)}`;
		} while (this.apiKeyToUserId.has(key));
		return key;
	}

	private getOrCreate(userId: string): UserGatewayState {
		let state = this.userGateways.get(userId);
		if (!state) {
			state = {
				gateway: new LocalGateway(),
				pairingToken: null,
				activeSessionKey: null,
				disconnectTimer: null,
				reconnectCount: 0,
			};
			this.userGateways.set(userId, state);
		}
		return state;
	}

	getUserIdForApiKey(key: string): string | undefined {
		const userId = this.apiKeyToUserId.get(key);
		if (!userId) return undefined;

		const state = this.userGateways.get(userId);
		if (state?.pairingToken?.token === key) {
			if (Date.now() - state.pairingToken.createdAt > PAIRING_TOKEN_TTL_MS) {
				this.apiKeyToUserId.delete(state.pairingToken.token);
				state.pairingToken = null;
				return undefined;
			}
		}
		return userId;
	}

	generatePairingToken(userId: string): string {
		const state = this.getOrCreate(userId);
		const existing = this.getPairingToken(userId);
		if (existing) return existing;

		const token = this.generateUniqueKey('gw');
		state.pairingToken = { token, createdAt: Date.now() };
		this.apiKeyToUserId.set(token, userId);
		return token;
	}

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

	getApiKeyExpiresAt(userId: string, key: string): Date | null {
		const state = this.userGateways.get(userId);
		if (!state?.pairingToken || state.pairingToken.token !== key) return null;
		const token = this.getPairingToken(userId);
		if (!token) return null;
		return new Date(state.pairingToken.createdAt + PAIRING_TOKEN_TTL_MS);
	}

	consumePairingToken(userId: string, token: string): string | null {
		const state = this.userGateways.get(userId);
		const valid = this.getPairingToken(userId);
		if (!state || !valid || valid !== token) return null;

		this.apiKeyToUserId.delete(token);
		state.pairingToken = null;
		const sessionKey = this.generateUniqueKey('sess');
		state.activeSessionKey = sessionKey;
		this.apiKeyToUserId.set(sessionKey, userId);
		return sessionKey;
	}

	getActiveSessionKey(userId: string): string | null {
		return this.userGateways.get(userId)?.activeSessionKey ?? null;
	}

	clearActiveSessionKey(userId: string): void {
		const state = this.userGateways.get(userId);
		if (!state?.activeSessionKey) return;
		this.apiKeyToUserId.delete(state.activeSessionKey);
		state.activeSessionKey = null;
	}

	getGateway(userId: string): LocalGateway {
		return this.getOrCreate(userId).gateway;
	}

	findGateway(userId: string): LocalGateway | undefined {
		return this.userGateways.get(userId)?.gateway;
	}

	initGateway(userId: string, data: InstanceAiGatewayCapabilities): void {
		const state = this.getOrCreate(userId);
		this.clearDisconnectTimer(userId);
		state.reconnectCount = 0;
		state.gateway.init(data);
	}

	resolveGatewayRequest(
		userId: string,
		requestId: string,
		result?: McpToolCallResult,
		error?: string,
	): boolean {
		return this.userGateways.get(userId)?.gateway.resolveRequest(requestId, result, error) ?? false;
	}

	disconnectGateway(userId: string): void {
		this.userGateways.get(userId)?.gateway.disconnect();
	}

	getGatewayStatus(userId: string): {
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
		hostIdentifier: string | null;
		toolCategories: ToolCategory[];
		tools: McpTool[];
	} {
		return (
			this.userGateways.get(userId)?.gateway.getStatus() ?? {
				connected: false,
				connectedAt: null,
				directory: null,
				hostIdentifier: null,
				toolCategories: [],
				tools: [],
			}
		);
	}

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

	clearDisconnectTimer(userId: string): void {
		const state = this.userGateways.get(userId);
		if (!state?.disconnectTimer) return;
		clearTimeout(state.disconnectTimer);
		state.disconnectTimer = null;
	}

	getConnectedUserIds(): string[] {
		return [...this.userGateways.entries()]
			.filter(([, state]) => state.gateway.getStatus().connected)
			.map(([userId]) => userId);
	}

	disconnectAll(): void {
		for (const state of this.userGateways.values()) {
			if (state.disconnectTimer) clearTimeout(state.disconnectTimer);
			state.gateway.disconnect();
		}
		this.userGateways.clear();
		this.apiKeyToUserId.clear();
	}
}
