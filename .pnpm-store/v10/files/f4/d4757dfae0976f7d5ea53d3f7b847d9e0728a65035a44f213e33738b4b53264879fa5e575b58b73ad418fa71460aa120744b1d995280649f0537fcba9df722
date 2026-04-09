/**
 * Main SandboxClient class for interacting with the sandbox server API.
 */
import { getLangSmithEnvironmentVariable } from "../../utils/env.js";
import { _getFetchImplementation } from "../../singletons/fetch.js";
import { AsyncCaller } from "../../utils/async_caller.js";
import { Sandbox } from "./sandbox.js";
import { LangSmithResourceCreationError, LangSmithResourceNameConflictError, LangSmithResourceNotFoundError, LangSmithResourceTimeoutError, LangSmithSandboxAPIError, } from "./errors.js";
import { handleClientHttpError, handleConflictError, handlePoolError, handleResourceInUseError, handleSandboxCreationError, handleVolumeCreationError, validateTtl, } from "./helpers.js";
/**
 * Get the default sandbox API endpoint from environment.
 *
 * Derives the endpoint from LANGSMITH_ENDPOINT (or LANGCHAIN_ENDPOINT).
 */
function getDefaultApiEndpoint() {
    const base = getLangSmithEnvironmentVariable("ENDPOINT") ??
        "https://api.smith.langchain.com";
    return `${base.replace(/\/$/, "")}/v2/sandboxes`;
}
/**
 * Get the default API key from environment.
 */
function getDefaultApiKey() {
    return getLangSmithEnvironmentVariable("API_KEY");
}
/**
 * Client for interacting with the Sandbox Server API.
 *
 * This client provides a simple interface for managing sandboxes and templates.
 *
 * @example
 * ```typescript
 * import { SandboxClient } from "langsmith/experimental/sandbox";
 *
 * // Uses LANGSMITH_ENDPOINT and LANGSMITH_API_KEY from environment
 * const client = new SandboxClient();
 *
 * // Or with explicit configuration
 * const client = new SandboxClient({
 *   apiEndpoint: "https://api.smith.langchain.com/v2/sandboxes",
 *   apiKey: "your-api-key",
 * });
 *
 * // Create a sandbox and run commands
 * const sandbox = await client.createSandbox("python-sandbox");
 * try {
 *   const result = await sandbox.run("python --version");
 *   console.log(result.stdout);
 * } finally {
 *   await sandbox.delete();
 * }
 * ```
 */
export class SandboxClient {
    constructor(config = {}) {
        Object.defineProperty(this, "_baseUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_apiKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_fetchImpl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_caller", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._baseUrl = (config.apiEndpoint ?? getDefaultApiEndpoint()).replace(/\/$/, "");
        this._apiKey = config.apiKey ?? getDefaultApiKey();
        this._fetchImpl = _getFetchImplementation();
        this._caller = new AsyncCaller({
            maxRetries: config.maxRetries ?? 3,
            maxConcurrency: config.maxConcurrency ?? Infinity,
        });
    }
    /**
     * Internal fetch method that adds authentication headers.
     *
     * Uses AsyncCaller to handle retries for transient failures
     * (network errors, 5xx, 429).
     *
     * @internal
     */
    async _fetch(url, init = {}) {
        const headers = new Headers(init.headers);
        if (this._apiKey) {
            headers.set("X-Api-Key", this._apiKey);
        }
        return this._caller.call(() => this._fetchImpl(url, {
            ...init,
            headers,
        }));
    }
    /**
     * Get the API key for WebSocket authentication.
     * @internal
     */
    getApiKey() {
        return this._apiKey;
    }
    // =========================================================================
    // Volume Operations
    // =========================================================================
    /**
     * Create a new persistent volume.
     *
     * Creates a persistent storage volume that can be referenced in templates.
     *
     * @param name - Volume name.
     * @param options - Creation options including size and optional timeout.
     * @returns Created Volume.
     * @throws SandboxCreationError if volume provisioning fails.
     * @throws ResourceTimeoutError if volume doesn't become ready within timeout.
     */
    async createVolume(name, options) {
        const { size, timeout = 60 } = options;
        const url = `${this._baseUrl}/volumes`;
        const payload = {
            name,
            size,
            wait_for_ready: true,
            timeout,
        };
        const response = await this._fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout((timeout + 30) * 1000),
        });
        if (!response.ok) {
            await handleVolumeCreationError(response);
        }
        return (await response.json());
    }
    /**
     * Get a volume by name.
     *
     * @param name - Volume name.
     * @returns Volume.
     * @throws LangSmithResourceNotFoundError if volume not found.
     */
    async getVolume(name) {
        const url = `${this._baseUrl}/volumes/${encodeURIComponent(name)}`;
        const response = await this._fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Volume '${name}' not found`, "volume");
            }
            await handleClientHttpError(response);
        }
        return (await response.json());
    }
    /**
     * List all volumes.
     *
     * @returns List of Volumes.
     */
    async listVolumes() {
        const url = `${this._baseUrl}/volumes`;
        const response = await this._fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithSandboxAPIError(`API endpoint not found: ${url}. Check that apiEndpoint is correct.`);
            }
            await handleClientHttpError(response);
        }
        const data = await response.json();
        return (data.volumes ?? []);
    }
    /**
     * Delete a volume.
     *
     * @param name - Volume name.
     * @throws LangSmithResourceNotFoundError if volume not found.
     * @throws ResourceInUseError if volume is referenced by templates.
     */
    async deleteVolume(name) {
        const url = `${this._baseUrl}/volumes/${encodeURIComponent(name)}`;
        const response = await this._fetch(url, { method: "DELETE" });
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Volume '${name}' not found`, "volume");
            }
            if (response.status === 409) {
                await handleResourceInUseError(response, "volume");
            }
            await handleClientHttpError(response);
        }
    }
    /**
     * Update a volume's name and/or size.
     *
     * You can update the display name, size, or both in a single request.
     * Only storage size increases are allowed (storage backend limitation).
     *
     * @param name - Current volume name.
     * @param options - Update options.
     * @returns Updated Volume.
     * @throws LangSmithResourceNotFoundError if volume not found.
     * @throws ValidationError if storage decrease attempted.
     * @throws LangSmithResourceNameConflictError if newName is already in use.
     */
    async updateVolume(name, options) {
        const { newName, size } = options;
        if (newName === undefined && size === undefined) {
            // Nothing to update, just return the current volume
            return this.getVolume(name);
        }
        const url = `${this._baseUrl}/volumes/${encodeURIComponent(name)}`;
        const payload = {};
        if (newName !== undefined) {
            payload.name = newName;
        }
        if (size !== undefined) {
            payload.size = size;
        }
        const response = await this._fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Volume '${name}' not found`, "volume");
            }
            if (response.status === 409) {
                await handleConflictError(response, "volume");
            }
            await handleClientHttpError(response);
        }
        return (await response.json());
    }
    // =========================================================================
    // Template Operations
    // =========================================================================
    /**
     * Create a new SandboxTemplate.
     *
     * Only the container image, resource limits, and volume mounts can be
     * configured. All other container details are handled by the server.
     *
     * @param name - Template name.
     * @param options - Creation options including image and resource limits.
     * @returns Created SandboxTemplate.
     */
    async createTemplate(name, options) {
        const { image, cpu = "500m", memory = "512Mi", storage, volumeMounts, } = options;
        const url = `${this._baseUrl}/templates`;
        const payload = {
            name,
            image,
            resources: {
                cpu,
                memory,
            },
        };
        if (storage) {
            payload.resources.storage = storage;
        }
        if (volumeMounts && volumeMounts.length > 0) {
            payload.volume_mounts = volumeMounts.map((vm) => ({
                volume_name: vm.volume_name,
                mount_path: vm.mount_path,
            }));
        }
        const response = await this._fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            await handleClientHttpError(response);
        }
        return (await response.json());
    }
    /**
     * Get a SandboxTemplate by name.
     *
     * @param name - Template name.
     * @returns SandboxTemplate.
     * @throws LangSmithResourceNotFoundError if template not found.
     */
    async getTemplate(name) {
        const url = `${this._baseUrl}/templates/${encodeURIComponent(name)}`;
        const response = await this._fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Template '${name}' not found`, "template");
            }
            await handleClientHttpError(response);
        }
        return (await response.json());
    }
    /**
     * List all SandboxTemplates.
     *
     * @returns List of SandboxTemplates.
     */
    async listTemplates() {
        const url = `${this._baseUrl}/templates`;
        const response = await this._fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithSandboxAPIError(`API endpoint not found: ${url}. Check that apiEndpoint is correct.`);
            }
            await handleClientHttpError(response);
        }
        const data = await response.json();
        return (data.templates ?? []);
    }
    /**
     * Update a template.
     *
     * @param name - Current template name.
     * @param options - Update options (e.g., newName).
     * @returns Updated SandboxTemplate.
     * @throws LangSmithResourceNotFoundError if template not found.
     * @throws LangSmithResourceNameConflictError if newName is already in use.
     */
    async updateTemplate(name, options) {
        const { newName } = options;
        if (newName === undefined) {
            // Nothing to update, just return the current template
            return this.getTemplate(name);
        }
        const url = `${this._baseUrl}/templates/${encodeURIComponent(name)}`;
        const payload = { name: newName };
        const response = await this._fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Template '${name}' not found`, "template");
            }
            if (response.status === 409) {
                await handleConflictError(response, "template");
            }
            await handleClientHttpError(response);
        }
        return (await response.json());
    }
    /**
     * Delete a SandboxTemplate.
     *
     * @param name - Template name.
     * @throws LangSmithResourceNotFoundError if template not found.
     * @throws ResourceInUseError if template is referenced by sandboxes or pools.
     */
    async deleteTemplate(name) {
        const url = `${this._baseUrl}/templates/${encodeURIComponent(name)}`;
        const response = await this._fetch(url, { method: "DELETE" });
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Template '${name}' not found`, "template");
            }
            if (response.status === 409) {
                await handleResourceInUseError(response, "template");
            }
            await handleClientHttpError(response);
        }
    }
    // =========================================================================
    // Pool Operations
    // =========================================================================
    /**
     * Create a new Sandbox Pool.
     *
     * Pools pre-provision sandboxes from a template for faster startup.
     *
     * @param name - Pool name (lowercase letters, numbers, hyphens; max 63 chars).
     * @param options - Creation options including templateName, replicas, and optional timeout.
     * @returns Created Pool.
     * @throws LangSmithResourceNotFoundError if template not found.
     * @throws ValidationError if template has volumes attached.
     * @throws ResourceAlreadyExistsError if pool with this name already exists.
     * @throws ResourceTimeoutError if pool doesn't reach ready state within timeout.
     * @throws QuotaExceededError if organization quota is exceeded.
     */
    async createPool(name, options) {
        const { templateName, replicas, timeout = 30 } = options;
        const url = `${this._baseUrl}/pools`;
        const payload = {
            name,
            template_name: templateName,
            replicas,
            wait_for_ready: true,
            timeout,
        };
        const response = await this._fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout((timeout + 30) * 1000),
        });
        if (!response.ok) {
            await handlePoolError(response);
        }
        return (await response.json());
    }
    /**
     * Get a Pool by name.
     *
     * @param name - Pool name.
     * @returns Pool.
     * @throws LangSmithResourceNotFoundError if pool not found.
     */
    async getPool(name) {
        const url = `${this._baseUrl}/pools/${encodeURIComponent(name)}`;
        const response = await this._fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Pool '${name}' not found`, "pool");
            }
            await handleClientHttpError(response);
        }
        return (await response.json());
    }
    /**
     * List all Pools.
     *
     * @returns List of Pools.
     */
    async listPools() {
        const url = `${this._baseUrl}/pools`;
        const response = await this._fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithSandboxAPIError(`API endpoint not found: ${url}. Check that apiEndpoint is correct.`);
            }
            await handleClientHttpError(response);
        }
        const data = await response.json();
        return (data.pools ?? []);
    }
    /**
     * Update a Pool's name and/or replica count.
     *
     * You can update the display name, replica count, or both.
     * The template reference cannot be changed after creation.
     *
     * @param name - Current pool name.
     * @param options - Update options.
     * @returns Updated Pool.
     * @throws LangSmithResourceNotFoundError if pool not found.
     * @throws ValidationError if template was deleted.
     * @throws LangSmithResourceNameConflictError if newName is already in use.
     * @throws QuotaExceededError if quota exceeded when scaling up.
     */
    async updatePool(name, options) {
        const { newName, replicas } = options;
        if (newName === undefined && replicas === undefined) {
            // Nothing to update, just return the current pool
            return this.getPool(name);
        }
        const url = `${this._baseUrl}/pools/${encodeURIComponent(name)}`;
        const payload = {};
        if (newName !== undefined) {
            payload.name = newName;
        }
        if (replicas !== undefined) {
            payload.replicas = replicas;
        }
        const response = await this._fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Pool '${name}' not found`, "pool");
            }
            if (response.status === 409) {
                await handleConflictError(response, "pool");
            }
            await handlePoolError(response);
        }
        return (await response.json());
    }
    /**
     * Delete a Pool.
     *
     * This will terminate all sandboxes in the pool.
     *
     * @param name - Pool name.
     * @throws LangSmithResourceNotFoundError if pool not found.
     */
    async deletePool(name) {
        const url = `${this._baseUrl}/pools/${encodeURIComponent(name)}`;
        const response = await this._fetch(url, { method: "DELETE" });
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Pool '${name}' not found`, "pool");
            }
            await handleClientHttpError(response);
        }
    }
    // =========================================================================
    // Sandbox Operations
    // =========================================================================
    /**
     * Create a new Sandbox.
     *
     * Remember to call `sandbox.delete()` when done to clean up resources.
     *
     * @param templateName - Name of the SandboxTemplate to use.
     * @param options - Creation options.
     * @returns Created Sandbox.
     * @throws ResourceTimeoutError if timeout waiting for sandbox to be ready.
     * @throws SandboxCreationError if sandbox creation fails.
     * @throws LangSmithValidationError if TTL values are invalid.
     *
     * @example
     * ```typescript
     * const sandbox = await client.createSandbox("python-sandbox");
     * try {
     *   const result = await sandbox.run("echo hello");
     *   console.log(result.stdout);
     * } finally {
     *   await sandbox.delete();
     * }
     * ```
     */
    async createSandbox(templateName, options = {}) {
        const { name, timeout = 30, waitForReady = true, ttlSeconds, idleTtlSeconds, } = options;
        validateTtl(ttlSeconds, "ttlSeconds");
        validateTtl(idleTtlSeconds, "idleTtlSeconds");
        const url = `${this._baseUrl}/boxes`;
        const payload = {
            template_name: templateName,
            wait_for_ready: waitForReady,
        };
        if (waitForReady) {
            payload.timeout = timeout;
        }
        if (name) {
            payload.name = name;
        }
        if (ttlSeconds !== undefined) {
            payload.ttl_seconds = ttlSeconds;
        }
        if (idleTtlSeconds !== undefined) {
            payload.idle_ttl_seconds = idleTtlSeconds;
        }
        const httpTimeout = waitForReady ? (timeout + 30) * 1000 : 30 * 1000;
        const response = await this._fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(httpTimeout),
        });
        if (!response.ok) {
            await handleSandboxCreationError(response);
        }
        const data = (await response.json());
        return new Sandbox(data, this);
    }
    /**
     * Get a Sandbox by name.
     *
     * The sandbox is NOT automatically deleted. Use deleteSandbox() for cleanup.
     *
     * @param name - Sandbox name.
     * @returns Sandbox.
     * @throws LangSmithResourceNotFoundError if sandbox not found.
     */
    async getSandbox(name) {
        const url = `${this._baseUrl}/boxes/${encodeURIComponent(name)}`;
        const response = await this._fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Sandbox '${name}' not found`, "sandbox");
            }
            await handleClientHttpError(response);
        }
        const data = (await response.json());
        return new Sandbox(data, this);
    }
    /**
     * List all Sandboxes.
     *
     * @returns List of Sandboxes.
     */
    async listSandboxes() {
        const url = `${this._baseUrl}/boxes`;
        const response = await this._fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithSandboxAPIError(`API endpoint not found: ${url}. Check that apiEndpoint is correct.`);
            }
            await handleClientHttpError(response);
        }
        const data = await response.json();
        return (data.sandboxes ?? []).map((s) => new Sandbox(s, this));
    }
    async updateSandbox(name, newNameOrOptions) {
        const options = typeof newNameOrOptions === "string"
            ? { newName: newNameOrOptions }
            : newNameOrOptions;
        const { newName, ttlSeconds, idleTtlSeconds } = options;
        validateTtl(ttlSeconds, "ttlSeconds");
        validateTtl(idleTtlSeconds, "idleTtlSeconds");
        if (newName === undefined &&
            ttlSeconds === undefined &&
            idleTtlSeconds === undefined) {
            return this.getSandbox(name);
        }
        const url = `${this._baseUrl}/boxes/${encodeURIComponent(name)}`;
        const payload = {};
        if (newName !== undefined) {
            payload.name = newName;
        }
        if (ttlSeconds !== undefined) {
            payload.ttl_seconds = ttlSeconds;
        }
        if (idleTtlSeconds !== undefined) {
            payload.idle_ttl_seconds = idleTtlSeconds;
        }
        const response = await this._fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Sandbox '${name}' not found`, "sandbox");
            }
            if (response.status === 409) {
                throw new LangSmithResourceNameConflictError(newName !== undefined
                    ? `Sandbox name '${newName}' already in use`
                    : "Sandbox update conflict (name may already be in use)", "sandbox");
            }
            await handleClientHttpError(response);
        }
        const data = (await response.json());
        return new Sandbox(data, this);
    }
    /**
     * Delete a Sandbox.
     *
     * @param name - Sandbox name.
     * @throws LangSmithResourceNotFoundError if sandbox not found.
     */
    async deleteSandbox(name) {
        const url = `${this._baseUrl}/boxes/${encodeURIComponent(name)}`;
        const response = await this._fetch(url, { method: "DELETE" });
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Sandbox '${name}' not found`, "sandbox");
            }
            await handleClientHttpError(response);
        }
    }
    /**
     * Get the provisioning status of a sandbox.
     *
     * This is a lightweight endpoint designed for polling during async creation.
     * Use this instead of getSandbox() when you only need the status.
     *
     * @param name - Sandbox name.
     * @returns ResourceStatus with status and optional status_message.
     * @throws LangSmithResourceNotFoundError if sandbox not found.
     */
    async getSandboxStatus(name) {
        const url = `${this._baseUrl}/boxes/${encodeURIComponent(name)}/status`;
        const response = await this._fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new LangSmithResourceNotFoundError(`Sandbox '${name}' not found`, "sandbox");
            }
            await handleClientHttpError(response);
        }
        return (await response.json());
    }
    /**
     * Wait for a sandbox to become ready.
     *
     * Polls getSandboxStatus() until the sandbox reaches "ready" or "failed" status,
     * then returns the full Sandbox object.
     *
     * @param name - Sandbox name.
     * @param options - Polling options (timeout, pollInterval).
     * @returns Ready Sandbox.
     * @throws LangSmithResourceCreationError if sandbox status becomes "failed".
     * @throws LangSmithResourceTimeoutError if timeout expires while still provisioning.
     * @throws LangSmithResourceNotFoundError if sandbox not found.
     *
     * @example
     * ```typescript
     * const sandbox = await client.createSandbox("python-sandbox", { waitForReady: false });
     * // ... do other work ...
     * const readySandbox = await client.waitForSandbox(sandbox.name);
     * ```
     */
    async waitForSandbox(name, options = {}) {
        const { timeout = 120, pollInterval = 1.0 } = options;
        const deadline = Date.now() + timeout * 1000;
        let lastStatus = "provisioning";
        while (Date.now() < deadline) {
            const statusResult = await this.getSandboxStatus(name);
            lastStatus = statusResult.status;
            if (statusResult.status === "ready") {
                return this.getSandbox(name);
            }
            if (statusResult.status === "failed") {
                throw new LangSmithResourceCreationError(statusResult.status_message ?? `Sandbox '${name}' creation failed`, "sandbox");
            }
            // Wait before polling again
            await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
        }
        throw new LangSmithResourceTimeoutError(`Sandbox '${name}' did not become ready within ${timeout}s`, "sandbox", lastStatus);
    }
}
