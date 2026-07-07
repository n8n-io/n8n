import { assertPathAndBasePathAreNotBothSet, normalizeBasePath } from '@n8n/backend-common';
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
	/** The normalized mount base path from N8N_BASE_PATH. */
	private readonly basePath: string;

	/** The normalized URL base path from N8N_BASE_PATH or legacy N8N_PATH. */
	private readonly urlBasePath: string;

	constructor(private readonly globalConfig: GlobalConfig) {
		assertPathAndBasePathAreNotBothSet(globalConfig.path, globalConfig.basePath);
		this.basePath = normalizeBasePath(globalConfig.basePath);
		this.urlBasePath = this.basePath === '/' ? normalizeBasePath(globalConfig.path) : this.basePath;
	}

	/**
	 * Returns the normalized mount base path. Only N8N_BASE_PATH affects backend
	 * Express route registration; legacy N8N_PATH must not move backend routes.
	 */
	getBasePath(): string {
		return this.basePath;
	}

	/**
	 * Returns the normalized URL base path. N8N_BASE_PATH takes precedence, while
	 * legacy N8N_PATH still prefixes generated/frontend-facing URLs when set alone.
	 */
	getUrlBasePath(): string {
		return this.urlBasePath;
	}

	/**
	 * Resolves a full endpoint path by prepending the base path.
	 * @param endpoint - The endpoint path (e.g., 'healthz', 'rest/workflows')
	 * @returns The full path (e.g., '/custom-path/healthz')
	 */
	resolveEndpoint(endpoint: string): string {
		const normalizedEndpoint = this.stripLeadingSlash(endpoint);
		if (!normalizedEndpoint) {
			return this.basePath;
		}
		if (this.basePath === '/') {
			return `/${normalizedEndpoint}`;
		}
		return `${this.basePath}/${normalizedEndpoint}`;
	}

	private stripLeadingSlash(path: string) {
		return path.startsWith('/') ? path.slice(1) : path;
	}

	private resolveConfiguredEndpoint(endpoint: string, path: string = ''): string {
		const normalizedPath = this.stripLeadingSlash(path);
		return this.resolveEndpoint(
			normalizedPath ? `${this.stripLeadingSlash(endpoint)}/${normalizedPath}` : endpoint,
		);
	}

	// ==================== REST API ====================

	/**
	 * Resolves a REST API endpoint path.
	 * @param path - The REST path (e.g., 'workflows', 'credentials')
	 * @returns The full REST path (e.g., '/custom-path/rest/workflows')
	 */
	resolveRestEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.rest, path);
	}

	// ==================== Webhooks ====================

	/**
	 * Resolves a webhook endpoint path.
	 * @param path - The webhook path (e.g., 'my-webhook-id')
	 * @returns The full webhook path (e.g., '/custom-path/webhook/my-webhook-id')
	 */
	resolveWebhookEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.webhook, path);
	}

	/**
	 * Resolves a test webhook endpoint path.
	 * @param path - The webhook path
	 * @returns The full test webhook path (e.g., '/custom-path/webhook-test/my-webhook-id')
	 */
	resolveWebhookTestEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.webhookTest, path);
	}

	/**
	 * Resolves a waiting webhook endpoint path.
	 * @param path - The webhook path
	 * @returns The full waiting webhook path (e.g., '/custom-path/webhook-waiting/path')
	 */
	resolveWebhookWaitingEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.webhookWaiting, path);
	}

	// ==================== Forms ====================

	/**
	 * Resolves a form endpoint path.
	 * @param path - The form path
	 * @returns The full form path (e.g., '/custom-path/form/my-form-id')
	 */
	resolveFormEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.form, path);
	}

	/**
	 * Resolves a test form endpoint path.
	 * @param path - The form path
	 * @returns The full test form path (e.g., '/custom-path/form-test/my-form-id')
	 */
	resolveFormTestEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.formTest, path);
	}

	/**
	 * Resolves a waiting form endpoint path.
	 * @param path - The form path
	 * @returns The full waiting form path (e.g., '/custom-path/form-waiting/path')
	 */
	resolveFormWaitingEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.formWaiting, path);
	}

	// ==================== MCP ====================

	/**
	 * Resolves an MCP endpoint path.
	 * @param path - The MCP path
	 * @returns The full MCP path (e.g., '/custom-path/mcp/path')
	 */
	resolveMcpEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.mcp, path);
	}

	/**
	 * Resolves a test MCP endpoint path.
	 * @param path - The MCP path
	 * @returns The full test MCP path (e.g., '/custom-path/mcp-test/path')
	 */
	resolveMcpTestEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.mcpTest, path);
	}

	// ==================== Public API ====================

	/**
	 * Resolves the public API endpoint path.
	 * @param path - The API path
	 * @returns The full public API path (e.g., '/custom-path/api/v1/workflows')
	 */
	resolvePublicApiEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.publicApi.path, path);
	}

	// ==================== Static Assets ====================

	/**
	 * Resolves an icons endpoint path.
	 * @param path - The icon path (e.g., 'n8n-nodes-base/dist/nodes/Telegram/telegram.svg')
	 * @returns The full icons path (e.g., '/custom-path/icons/n8n-nodes-base/...')
	 */
	resolveIconsEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint('icons', path);
	}

	/**
	 * Resolves a types endpoint path.
	 * @param path - The types path (e.g., 'nodes.json')
	 * @returns The full types path (e.g., '/custom-path/types/nodes.json')
	 */
	resolveTypesEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint('types', path);
	}

	/**
	 * Resolves a schemas endpoint path.
	 * @param path - The schema path
	 * @returns The full schemas path (e.g., '/custom-path/schemas/...')
	 */
	resolveSchemasEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint('schemas', path);
	}

	// ==================== Health Check ====================

	/**
	 * Resolves the health check endpoint path (configurable via N8N_ENDPOINT_HEALTH).
	 * @param path - Additional path (e.g., 'readiness')
	 * @returns The full healthz path (e.g., '/custom-path/healthz/readiness')
	 */
	resolveHealthzEndpoint(path: string = ''): string {
		return this.resolveConfiguredEndpoint(this.globalConfig.endpoints.health, path);
	}
}
