import { normalizeBasePath } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

/**
 * Service for resolving full endpoint paths with the configured base path.
 * Encapsulates path resolution logic for consistent URL construction across the application.
 *
 * This is the single source of truth for all path resolution in n8n.
 */
@Service()
export class PathResolvingService {
	/** The normalized base path combining N8N_BASE_PATH and N8N_PATH */
	private readonly basePath: string;

	constructor(private readonly globalConfig: GlobalConfig) {
		this.basePath = normalizeBasePath(globalConfig.basePath, globalConfig.path);
	}

	/**
	 * Returns the normalized base path.
	 * This is the combination of N8N_BASE_PATH and N8N_PATH, normalized to:
	 * - Start with `/`
	 * - NOT end with `/`
	 * - Return `/` for root path
	 */
	getBasePath(): string {
		return this.basePath;
	}

	/**
	 * Resolves a full endpoint path by prepending the base path.
	 * @param endpoint - The endpoint path (e.g., 'healthz', 'rest/workflows')
	 * @returns The full path (e.g., '/custom-path/healthz')
	 */
	resolveEndpoint(endpoint: string): string {
		// Remove leading slash from endpoint if present
		const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
		if (!normalizedEndpoint) {
			return this.basePath;
		}
		// Handle root basePath case to avoid double slashes
		if (this.basePath === '/') {
			return `/${normalizedEndpoint}`;
		}
		return `${this.basePath}/${normalizedEndpoint}`;
	}

	// ==================== REST API ====================

	/**
	 * Resolves a REST API endpoint path.
	 * @param path - The REST path (e.g., 'workflows', 'credentials')
	 * @returns The full REST path (e.g., '/custom-path/rest/workflows')
	 */
	resolveRestEndpoint(path: string = ''): string {
		const restEndpoint = this.globalConfig.endpoints.rest;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(restEndpoint);
		}
		return this.resolveEndpoint(`${restEndpoint}/${normalizedPath}`);
	}

	// ==================== Webhooks ====================

	/**
	 * Resolves a webhook endpoint path.
	 * @param path - The webhook path (e.g., 'my-webhook-id')
	 * @returns The full webhook path (e.g., '/custom-path/webhook/my-webhook-id')
	 */
	resolveWebhookEndpoint(path: string = ''): string {
		const webhookEndpoint = this.globalConfig.endpoints.webhook;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(webhookEndpoint);
		}
		return this.resolveEndpoint(`${webhookEndpoint}/${normalizedPath}`);
	}

	/**
	 * Resolves a test webhook endpoint path.
	 * @param path - The webhook path
	 * @returns The full test webhook path (e.g., '/custom-path/webhook-test/my-webhook-id')
	 */
	resolveWebhookTestEndpoint(path: string = ''): string {
		const webhookTestEndpoint = this.globalConfig.endpoints.webhookTest;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(webhookTestEndpoint);
		}
		return this.resolveEndpoint(`${webhookTestEndpoint}/${normalizedPath}`);
	}

	/**
	 * Resolves a waiting webhook endpoint path.
	 * @param path - The webhook path
	 * @returns The full waiting webhook path (e.g., '/custom-path/webhook-waiting/path')
	 */
	resolveWebhookWaitingEndpoint(path: string = ''): string {
		const webhookWaitingEndpoint = this.globalConfig.endpoints.webhookWaiting;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(webhookWaitingEndpoint);
		}
		return this.resolveEndpoint(`${webhookWaitingEndpoint}/${normalizedPath}`);
	}

	// ==================== Forms ====================

	/**
	 * Resolves a form endpoint path.
	 * @param path - The form path
	 * @returns The full form path (e.g., '/custom-path/form/my-form-id')
	 */
	resolveFormEndpoint(path: string = ''): string {
		const formEndpoint = this.globalConfig.endpoints.form;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(formEndpoint);
		}
		return this.resolveEndpoint(`${formEndpoint}/${normalizedPath}`);
	}

	/**
	 * Resolves a test form endpoint path.
	 * @param path - The form path
	 * @returns The full test form path (e.g., '/custom-path/form-test/my-form-id')
	 */
	resolveFormTestEndpoint(path: string = ''): string {
		const formTestEndpoint = this.globalConfig.endpoints.formTest;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(formTestEndpoint);
		}
		return this.resolveEndpoint(`${formTestEndpoint}/${normalizedPath}`);
	}

	/**
	 * Resolves a waiting form endpoint path.
	 * @param path - The form path
	 * @returns The full waiting form path (e.g., '/custom-path/form-waiting/path')
	 */
	resolveFormWaitingEndpoint(path: string = ''): string {
		const formWaitingEndpoint = this.globalConfig.endpoints.formWaiting;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(formWaitingEndpoint);
		}
		return this.resolveEndpoint(`${formWaitingEndpoint}/${normalizedPath}`);
	}

	// ==================== MCP ====================

	/**
	 * Resolves an MCP endpoint path.
	 * @param path - The MCP path
	 * @returns The full MCP path (e.g., '/custom-path/mcp/path')
	 */
	resolveMcpEndpoint(path: string = ''): string {
		const mcpEndpoint = this.globalConfig.endpoints.mcp;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(mcpEndpoint);
		}
		return this.resolveEndpoint(`${mcpEndpoint}/${normalizedPath}`);
	}

	/**
	 * Resolves a test MCP endpoint path.
	 * @param path - The MCP path
	 * @returns The full test MCP path (e.g., '/custom-path/mcp-test/path')
	 */
	resolveMcpTestEndpoint(path: string = ''): string {
		const mcpTestEndpoint = this.globalConfig.endpoints.mcpTest;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(mcpTestEndpoint);
		}
		return this.resolveEndpoint(`${mcpTestEndpoint}/${normalizedPath}`);
	}

	// ==================== Public API ====================

	/**
	 * Resolves the public API endpoint path.
	 * @param path - The API path
	 * @returns The full public API path (e.g., '/custom-path/api/v1/workflows')
	 */
	resolvePublicApiEndpoint(path: string = ''): string {
		const publicApiEndpoint = this.globalConfig.publicApi.path;
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint(publicApiEndpoint);
		}
		return this.resolveEndpoint(`${publicApiEndpoint}/${normalizedPath}`);
	}

	// ==================== Static Assets ====================

	/**
	 * Resolves an icons endpoint path.
	 * @param path - The icon path (e.g., 'n8n-nodes-base/dist/nodes/Telegram/telegram.svg')
	 * @returns The full icons path (e.g., '/custom-path/icons/n8n-nodes-base/...')
	 */
	resolveIconsEndpoint(path: string = ''): string {
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint('icons');
		}
		return this.resolveEndpoint(`icons/${normalizedPath}`);
	}

	/**
	 * Resolves a types endpoint path.
	 * @param path - The types path (e.g., 'nodes.json')
	 * @returns The full types path (e.g., '/custom-path/types/nodes.json')
	 */
	resolveTypesEndpoint(path: string = ''): string {
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint('types');
		}
		return this.resolveEndpoint(`types/${normalizedPath}`);
	}

	/**
	 * Resolves a schemas endpoint path.
	 * @param path - The schema path
	 * @returns The full schemas path (e.g., '/custom-path/schemas/...')
	 */
	resolveSchemasEndpoint(path: string = ''): string {
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint('schemas');
		}
		return this.resolveEndpoint(`schemas/${normalizedPath}`);
	}

	// ==================== Health Check ====================

	/**
	 * Resolves the health check endpoint path.
	 * @param path - Additional path (e.g., 'readiness')
	 * @returns The full healthz path (e.g., '/custom-path/healthz/readiness')
	 */
	resolveHealthzEndpoint(path: string = ''): string {
		const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
		if (!normalizedPath) {
			return this.resolveEndpoint('healthz');
		}
		return this.resolveEndpoint(`healthz/${normalizedPath}`);
	}
}
