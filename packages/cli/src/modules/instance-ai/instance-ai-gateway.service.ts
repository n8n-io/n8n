import type {
	InstanceAiGatewayCapabilities,
	McpToolCallResult,
	ToolCategory,
} from '@n8n/api-types';
import { Service } from '@n8n/di';

import { Telemetry } from '@/telemetry';

import { LocalGatewayRegistry, type LocalGateway } from './filesystem';
import { InstanceAiSettingsService } from './instance-ai-settings.service';

/** Tool category advertised by the local gateway for browser automation tools. */
export const BROWSER_TOOL_CATEGORY = 'browser';

/**
 * Per-user Local Gateway connections (pairing tokens, session keys,
 * request routing, connection lifecycle). Owns the in-memory
 * `LocalGatewayRegistry` and the few cross-cutting concerns around it
 * (connect telemetry).
 */
@Service()
export class InstanceAiGatewayService {
	private readonly registry = new LocalGatewayRegistry();

	constructor(
		private readonly telemetry: Telemetry,
		private readonly settingsService: InstanceAiSettingsService,
	) {}

	/**
	 * Sync a gateway's exposed tool categories with the instance Browser Use policy.
	 * When Browser Use is disabled instance-wide, the gateway's browser tools are
	 * hidden everywhere they surface (agent tools, status reads, frontend pushes).
	 */
	applyToolPolicy(userId: string): void {
		this.findGateway(userId)?.setExcludedToolCategories(
			this.settingsService.isBrowserUseEnabled() ? [] : [BROWSER_TOOL_CATEGORY],
		);
	}

	getUserIdForApiKey(key: string): string | undefined {
		return this.registry.getUserIdForApiKey(key);
	}

	generatePairingToken(userId: string): string {
		return this.registry.generatePairingToken(userId);
	}

	getGatewayApiKeyExpiresAt(userId: string, key: string): Date | null {
		return this.registry.getApiKeyExpiresAt(userId, key);
	}

	getPairingToken(userId: string): string | null {
		return this.registry.getPairingToken(userId);
	}

	consumePairingToken(userId: string, token: string): string | null {
		return this.registry.consumePairingToken(userId, token);
	}

	getActiveSessionKey(userId: string): string | null {
		return this.registry.getActiveSessionKey(userId);
	}

	clearActiveSessionKey(userId: string): void {
		this.registry.clearActiveSessionKey(userId);
	}

	getLocalGateway(userId: string): LocalGateway {
		return this.registry.getGateway(userId);
	}

	/** Look up a gateway without creating one — used by the run loop to wire up tools. */
	findGateway(userId: string): LocalGateway | undefined {
		return this.registry.findGateway(userId);
	}

	initGateway(userId: string, data: InstanceAiGatewayCapabilities): void {
		this.registry.initGateway(userId, data);
		this.telemetry.track('User connected to Computer Use', {
			user_id: userId,
			tool_groups: data.toolCategories.filter((c) => c.enabled).map((c) => c.name),
		});
	}

	resolveGatewayRequest(
		userId: string,
		requestId: string,
		result?: McpToolCallResult,
		error?: string,
	): boolean {
		return this.registry.resolveGatewayRequest(userId, requestId, result, error);
	}

	disconnectGateway(userId: string): void {
		this.registry.disconnectGateway(userId);
	}

	/** Disconnect all connected gateways and return the user IDs that were connected. */
	disconnectAllGateways(): string[] {
		const connectedUserIds = this.registry.getConnectedUserIds();
		this.registry.disconnectAll();
		return connectedUserIds;
	}

	/** Disconnect every gateway without collecting the user IDs — used on shutdown. */
	disconnectAll(): void {
		this.registry.disconnectAll();
	}

	getGatewayStatus(userId: string): {
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
		hostIdentifier: string | null;
		toolCategories: ToolCategory[];
	} {
		return this.registry.getGatewayStatus(userId);
	}

	startDisconnectTimer(userId: string, onDisconnect: () => void): void {
		this.registry.startDisconnectTimer(userId, onDisconnect);
	}

	clearDisconnectTimer(userId: string): void {
		this.registry.clearDisconnectTimer(userId);
	}
}
