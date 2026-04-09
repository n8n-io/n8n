/**
 * Main SandboxClient class for interacting with the sandbox server API.
 */
import type { CreatePoolOptions, CreateSandboxOptions, CreateTemplateOptions, CreateVolumeOptions, Pool, ResourceStatus, SandboxClientConfig, SandboxTemplate, UpdatePoolOptions, UpdateSandboxOptions, UpdateTemplateOptions, UpdateVolumeOptions, Volume, WaitForSandboxOptions } from "./types.js";
import { Sandbox } from "./sandbox.js";
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
export declare class SandboxClient {
    private _baseUrl;
    private _apiKey?;
    private _fetchImpl;
    private _caller;
    constructor(config?: SandboxClientConfig);
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
    createVolume(name: string, options: CreateVolumeOptions): Promise<Volume>;
    /**
     * Get a volume by name.
     *
     * @param name - Volume name.
     * @returns Volume.
     * @throws LangSmithResourceNotFoundError if volume not found.
     */
    getVolume(name: string): Promise<Volume>;
    /**
     * List all volumes.
     *
     * @returns List of Volumes.
     */
    listVolumes(): Promise<Volume[]>;
    /**
     * Delete a volume.
     *
     * @param name - Volume name.
     * @throws LangSmithResourceNotFoundError if volume not found.
     * @throws ResourceInUseError if volume is referenced by templates.
     */
    deleteVolume(name: string): Promise<void>;
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
    updateVolume(name: string, options: UpdateVolumeOptions): Promise<Volume>;
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
    createTemplate(name: string, options: CreateTemplateOptions): Promise<SandboxTemplate>;
    /**
     * Get a SandboxTemplate by name.
     *
     * @param name - Template name.
     * @returns SandboxTemplate.
     * @throws LangSmithResourceNotFoundError if template not found.
     */
    getTemplate(name: string): Promise<SandboxTemplate>;
    /**
     * List all SandboxTemplates.
     *
     * @returns List of SandboxTemplates.
     */
    listTemplates(): Promise<SandboxTemplate[]>;
    /**
     * Update a template.
     *
     * @param name - Current template name.
     * @param options - Update options (e.g., newName).
     * @returns Updated SandboxTemplate.
     * @throws LangSmithResourceNotFoundError if template not found.
     * @throws LangSmithResourceNameConflictError if newName is already in use.
     */
    updateTemplate(name: string, options: UpdateTemplateOptions): Promise<SandboxTemplate>;
    /**
     * Delete a SandboxTemplate.
     *
     * @param name - Template name.
     * @throws LangSmithResourceNotFoundError if template not found.
     * @throws ResourceInUseError if template is referenced by sandboxes or pools.
     */
    deleteTemplate(name: string): Promise<void>;
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
    createPool(name: string, options: CreatePoolOptions): Promise<Pool>;
    /**
     * Get a Pool by name.
     *
     * @param name - Pool name.
     * @returns Pool.
     * @throws LangSmithResourceNotFoundError if pool not found.
     */
    getPool(name: string): Promise<Pool>;
    /**
     * List all Pools.
     *
     * @returns List of Pools.
     */
    listPools(): Promise<Pool[]>;
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
    updatePool(name: string, options: UpdatePoolOptions): Promise<Pool>;
    /**
     * Delete a Pool.
     *
     * This will terminate all sandboxes in the pool.
     *
     * @param name - Pool name.
     * @throws LangSmithResourceNotFoundError if pool not found.
     */
    deletePool(name: string): Promise<void>;
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
    createSandbox(templateName: string, options?: CreateSandboxOptions): Promise<Sandbox>;
    /**
     * Get a Sandbox by name.
     *
     * The sandbox is NOT automatically deleted. Use deleteSandbox() for cleanup.
     *
     * @param name - Sandbox name.
     * @returns Sandbox.
     * @throws LangSmithResourceNotFoundError if sandbox not found.
     */
    getSandbox(name: string): Promise<Sandbox>;
    /**
     * List all Sandboxes.
     *
     * @returns List of Sandboxes.
     */
    listSandboxes(): Promise<Sandbox[]>;
    /**
     * Update a sandbox's display name.
     *
     * @param name - Current sandbox name.
     * @param newName - New display name.
     */
    updateSandbox(name: string, newName: string): Promise<Sandbox>;
    /**
     * Update a sandbox's name and/or TTL settings.
     *
     * @param name - Current sandbox name.
     * @param options - Fields to update. Omit a field to leave it unchanged.
     * @returns Updated Sandbox. If no fields are provided, returns the current sandbox.
     * @throws LangSmithResourceNotFoundError if sandbox not found.
     * @throws LangSmithResourceNameConflictError if newName is already in use.
     * @throws LangSmithValidationError if TTL values are invalid.
     */
    updateSandbox(name: string, options: UpdateSandboxOptions): Promise<Sandbox>;
    /**
     * Delete a Sandbox.
     *
     * @param name - Sandbox name.
     * @throws LangSmithResourceNotFoundError if sandbox not found.
     */
    deleteSandbox(name: string): Promise<void>;
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
    getSandboxStatus(name: string): Promise<ResourceStatus>;
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
    waitForSandbox(name: string, options?: WaitForSandboxOptions): Promise<Sandbox>;
}
