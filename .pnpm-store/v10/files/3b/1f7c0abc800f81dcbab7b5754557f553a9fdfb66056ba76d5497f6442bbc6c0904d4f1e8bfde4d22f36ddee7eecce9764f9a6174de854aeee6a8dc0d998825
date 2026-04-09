import { d as DetectOptions, e as DetectResult, a as AgentName } from './shared/package-manager-detector.DksAilYA.mjs';

/**
 * Detects the package manager used in the running process.
 *
 * This method will check for `process.env.npm_config_user_agent`.
 */
declare function getUserAgent(): AgentName | null;
/**
 * Detects the package manager used in the project.
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {Promise<DetectResult | null>} The detected package manager or `null` if not found.
 */
declare function detect(options?: DetectOptions): Promise<DetectResult | null>;

export { detect, getUserAgent };
