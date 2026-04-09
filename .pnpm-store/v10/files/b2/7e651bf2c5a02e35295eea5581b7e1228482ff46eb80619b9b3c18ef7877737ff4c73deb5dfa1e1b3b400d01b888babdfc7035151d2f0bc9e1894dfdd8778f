/**
 * TypeScript interfaces for the sandbox module.
 *
 * Field names use snake_case to match API response format.
 */
/**
 * Result of executing a command in a sandbox.
 */
export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exit_code: number;
}
/**
 * Resource specification for a sandbox.
 */
export interface ResourceSpec {
    cpu?: string;
    memory?: string;
    storage?: string;
}
/**
 * Specification for mounting a volume in a sandbox template.
 */
export interface VolumeMountSpec {
    volume_name: string;
    mount_path: string;
}
/**
 * Represents a persistent volume.
 */
export interface Volume {
    id?: string;
    name: string;
    size: string;
    storage_class: string;
    created_at?: string;
    updated_at?: string;
}
/**
 * Represents a SandboxTemplate.
 *
 * Templates define the image, resource limits, and volume mounts for sandboxes.
 */
export interface SandboxTemplate {
    id?: string;
    name: string;
    image: string;
    resources: ResourceSpec;
    volume_mounts?: VolumeMountSpec[];
    created_at?: string;
    updated_at?: string;
}
/**
 * Represents a Sandbox Pool for pre-provisioned sandboxes.
 *
 * Pools pre-provision sandboxes from a template for faster startup.
 */
export interface Pool {
    id?: string;
    name: string;
    template_name: string;
    replicas: number;
    created_at?: string;
    updated_at?: string;
}
/**
 * Lightweight provisioning status for any async-created resource.
 */
export interface ResourceStatus {
    /** One of "provisioning", "ready", "failed". */
    status: string;
    /** Human-readable details when failed. */
    status_message?: string;
}
/**
 * Data representing a sandbox instance from the API.
 */
export interface SandboxData {
    id?: string;
    name: string;
    template_name: string;
    dataplane_url?: string;
    status?: string;
    status_message?: string;
    created_at?: string;
    updated_at?: string;
    /** Maximum lifetime TTL in seconds (`0` means disabled, omitted/`undefined` means not set). */
    ttl_seconds?: number;
    /** Idle timeout TTL in seconds (`0` means disabled, omitted/`undefined` means not set). */
    idle_ttl_seconds?: number;
    /** Computed expiration timestamp when a TTL is active, else omitted/`undefined`. */
    expires_at?: string;
}
/**
 * Configuration options for the SandboxClient.
 */
export interface SandboxClientConfig {
    /**
     * Full URL of the sandbox API endpoint.
     * If not provided, derived from LANGSMITH_ENDPOINT environment variable.
     */
    apiEndpoint?: string;
    /**
     * API key for authentication.
     * If not provided, uses LANGSMITH_API_KEY environment variable.
     */
    apiKey?: string;
    /**
     * Default HTTP timeout in milliseconds.
     */
    timeoutMs?: number;
    /**
     * Maximum number of retries for transient failures (network errors, 5xx, 429).
     * Defaults to 3.
     */
    maxRetries?: number;
    /**
     * Maximum number of concurrent requests.
     * Defaults to Infinity (no limit).
     */
    maxConcurrency?: number;
}
/**
 * A single chunk of streaming output from command execution.
 */
export interface OutputChunk {
    /** Either "stdout" or "stderr". */
    stream: "stdout" | "stderr";
    /** The text content of this chunk. */
    data: string;
    /** Byte offset within the stream. Used internally for reconnection. */
    offset: number;
}
/**
 * Internal WebSocket message type from the server.
 */
export interface WsMessage {
    type: "started" | "stdout" | "stderr" | "exit" | "error";
    [key: string]: unknown;
}
/**
 * Options for the low-level WebSocket stream functions.
 */
export interface WsRunOptions {
    /** Command timeout in seconds. Default: 60. */
    timeout?: number;
    /** Environment variables to set for the command. */
    env?: Record<string, string>;
    /** Working directory for command execution. */
    cwd?: string;
    /** Shell to use. Default: "/bin/bash". */
    shell?: string;
    /** Callback invoked with each stdout chunk. */
    onStdout?: (data: string) => void;
    /** Callback invoked with each stderr chunk. */
    onStderr?: (data: string) => void;
    /** Client-assigned command ID. */
    commandId?: string;
    /**
     * Idle timeout in seconds. If the command has no connected clients for
     * this duration, it is killed. Defaults to 300 (5 minutes).
     * Set to -1 for no idle timeout.
     */
    idleTimeout?: number;
    /**
     * If true, kill the command immediately when the last client disconnects.
     * Defaults to false (command continues running and can be reconnected to).
     */
    killOnDisconnect?: boolean;
    /**
     * How long (in seconds) a finished command's session is kept for
     * reconnection. Defaults to 600 (10 minutes). Set to -1 to keep indefinitely.
     */
    ttlSeconds?: number;
    /** Whether to allocate a PTY. */
    pty?: boolean;
}
/**
 * Options for running a command in a sandbox.
 */
export interface RunOptions {
    /**
     * Command timeout in seconds.
     */
    timeout?: number;
    /**
     * Environment variables to set for the command.
     */
    env?: Record<string, string>;
    /**
     * Working directory for command execution.
     */
    cwd?: string;
    /**
     * Shell to use for command execution. Defaults to "/bin/bash".
     */
    shell?: string;
    /**
     * Whether to wait for the command to complete before returning.
     * When true (default), returns an ExecutionResult.
     * When false, returns a CommandHandle for streaming output.
     */
    wait?: boolean;
    /**
     * Callback invoked with each stdout chunk during streaming execution.
     * When provided, WebSocket streaming is used.
     */
    onStdout?: (data: string) => void;
    /**
     * Callback invoked with each stderr chunk during streaming execution.
     * When provided, WebSocket streaming is used.
     */
    onStderr?: (data: string) => void;
    /**
     * Idle timeout in seconds. If the command has no connected clients for
     * this duration, it is killed. Defaults to 300 (5 minutes).
     * Set to -1 for no idle timeout.
     */
    idleTimeout?: number;
    /**
     * If true, kill the command immediately when the last client disconnects.
     * Defaults to false (command continues running and can be reconnected to).
     */
    killOnDisconnect?: boolean;
    /**
     * How long (in seconds) a finished command's session is kept for
     * reconnection. Defaults to 600 (10 minutes). Set to -1 to keep indefinitely.
     */
    ttlSeconds?: number;
    /**
     * If true, allocate a pseudo-terminal (PTY) for the command.
     * Useful for commands that require a TTY (e.g., interactive programs,
     * commands that use terminal control codes). Defaults to false.
     */
    pty?: boolean;
}
/**
 * Options for creating a sandbox.
 */
export interface CreateSandboxOptions {
    /**
     * Optional sandbox name (auto-generated if not provided).
     */
    name?: string;
    /**
     * Timeout in seconds when waiting for ready.
     */
    timeout?: number;
    /**
     * Whether to wait for the sandbox to be ready before returning.
     * When false, returns immediately with status "provisioning".
     * Use getSandboxStatus() or waitForSandbox() to poll for readiness.
     * Default: true.
     */
    waitForReady?: boolean;
    /**
     * Maximum lifetime in seconds from creation. The sandbox is deleted after
     * this duration. Must be a multiple of 60, or `0`/`undefined` to disable or omit.
     */
    ttlSeconds?: number;
    /**
     * Idle timeout in seconds. The sandbox is deleted after this much inactivity.
     * Must be a multiple of 60, or `0`/`undefined` to disable or omit.
     */
    idleTtlSeconds?: number;
}
/**
 * Options for updating a sandbox (name and/or TTL).
 */
export interface UpdateSandboxOptions {
    /** New display name. */
    newName?: string;
    /**
     * Maximum lifetime in seconds from creation. Must be a multiple of 60.
     * Pass `0` to disable absolute TTL.
     */
    ttlSeconds?: number;
    /**
     * Idle timeout in seconds. Must be a multiple of 60. Pass `0` to disable.
     */
    idleTtlSeconds?: number;
}
/**
 * Options for waiting for a sandbox to become ready.
 */
export interface WaitForSandboxOptions {
    /**
     * Maximum time in seconds to wait for the sandbox to become ready.
     * Default: 120.
     */
    timeout?: number;
    /**
     * Time in seconds between status polls.
     * Default: 1.0.
     */
    pollInterval?: number;
}
/**
 * Options for creating a volume.
 */
export interface CreateVolumeOptions {
    /**
     * Storage size (e.g., "1Gi", "10Gi").
     */
    size: string;
    /**
     * Timeout in seconds when waiting for volume to be ready. Default: 60.
     */
    timeout?: number;
}
/**
 * Options for creating a template.
 */
export interface CreateTemplateOptions {
    /**
     * Container image (e.g., "python:3.12-slim", "node:20-slim").
     */
    image: string;
    /**
     * CPU limit (e.g., "500m", "1", "2"). Default: "500m".
     */
    cpu?: string;
    /**
     * Memory limit (e.g., "256Mi", "1Gi"). Default: "512Mi".
     */
    memory?: string;
    /**
     * Ephemeral storage limit (e.g., "1Gi"). Optional.
     */
    storage?: string;
    /**
     * List of volumes to mount in the sandbox. Optional.
     */
    volumeMounts?: VolumeMountSpec[];
}
/**
 * Options for updating a template.
 */
export interface UpdateTemplateOptions {
    /**
     * New display name (optional).
     */
    newName?: string;
}
/**
 * Options for creating a pool.
 */
export interface CreatePoolOptions {
    /**
     * Name of the template to use for sandboxes in this pool.
     */
    templateName: string;
    /**
     * Number of pre-warmed sandboxes to maintain (0-100).
     */
    replicas: number;
    /**
     * Timeout in seconds when waiting for pool to be ready. Default: 30.
     */
    timeout?: number;
}
/**
 * Options for updating a volume.
 */
export interface UpdateVolumeOptions {
    /**
     * New display name (optional).
     */
    newName?: string;
    /**
     * New storage size (must be >= current size). Optional.
     */
    size?: string;
}
/**
 * Options for updating a pool.
 */
export interface UpdatePoolOptions {
    /**
     * New display name (optional).
     */
    newName?: string;
    /**
     * New number of replicas (0-100). Set to 0 to pause.
     */
    replicas?: number;
}
