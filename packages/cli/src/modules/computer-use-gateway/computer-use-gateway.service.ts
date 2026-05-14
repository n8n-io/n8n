import type {
	InstanceAiGatewayCapabilities,
	McpTool,
	McpToolCallResult,
	ToolCategory,
} from '@n8n/api-types';
import { Service } from '@n8n/di';

import type { LocalGateway } from './local-gateway';
import { LocalGatewayRegistry } from './local-gateway-registry';

export interface ComputerUseGatewayStatus {
	connected: boolean;
	connectedAt: string | null;
	directory: string | null;
	hostIdentifier: string | null;
	toolCategories: ToolCategory[];
	tools: McpTool[];
}

@Service()
export class ComputerUseGatewayService {
	private readonly gatewayRegistry = new LocalGatewayRegistry();

	getUserIdForApiKey(key: string): string | undefined {
		return this.gatewayRegistry.getUserIdForApiKey(key);
	}

	generatePairingToken(userId: string): string {
		return this.gatewayRegistry.generatePairingToken(userId);
	}

	getGatewayApiKeyExpiresAt(userId: string, key: string): Date | null {
		return this.gatewayRegistry.getApiKeyExpiresAt(userId, key);
	}

	getPairingToken(userId: string): string | null {
		return this.gatewayRegistry.getPairingToken(userId);
	}

	consumePairingToken(userId: string, token: string): string | null {
		return this.gatewayRegistry.consumePairingToken(userId, token);
	}

	getActiveSessionKey(userId: string): string | null {
		return this.gatewayRegistry.getActiveSessionKey(userId);
	}

	clearActiveSessionKey(userId: string): void {
		this.gatewayRegistry.clearActiveSessionKey(userId);
	}

	getLocalGateway(userId: string): LocalGateway {
		return this.gatewayRegistry.getGateway(userId);
	}

	findGateway(userId: string): LocalGateway | undefined {
		return this.gatewayRegistry.findGateway(userId);
	}

	initGateway(userId: string, data: InstanceAiGatewayCapabilities): void {
		this.gatewayRegistry.initGateway(userId, data);
	}

	resolveGatewayRequest(
		userId: string,
		requestId: string,
		result?: McpToolCallResult,
		error?: string,
	): boolean {
		return this.gatewayRegistry.resolveGatewayRequest(userId, requestId, result, error);
	}

	disconnectGateway(userId: string): void {
		this.gatewayRegistry.disconnectGateway(userId);
	}

	disconnectAllGateways(): string[] {
		const connectedUserIds = this.gatewayRegistry.getConnectedUserIds();
		this.gatewayRegistry.disconnectAll();
		return connectedUserIds;
	}

	getGatewayStatus(userId: string): ComputerUseGatewayStatus {
		const gateway = this.gatewayRegistry.findGateway(userId);
		if (!gateway) {
			return {
				connected: false,
				connectedAt: null,
				directory: null,
				hostIdentifier: null,
				toolCategories: [],
				tools: [],
			};
		}
		return gateway.getStatus();
	}

	startDisconnectTimer(userId: string, onDisconnect: () => void): void {
		this.gatewayRegistry.startDisconnectTimer(userId, onDisconnect);
	}

	clearDisconnectTimer(userId: string): void {
		this.gatewayRegistry.clearDisconnectTimer(userId);
	}

	disconnectAll(): void {
		this.gatewayRegistry.disconnectAll();
	}
}
