import * as quansync_types from 'quansync/types';
import { d as DetectResult, D as DetectOptions, a as AgentName } from './shared/package-manager-detector.ncFwAKgD.cjs';

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
declare const detect: quansync_types.QuansyncFn<DetectResult | null, [options?: DetectOptions | undefined]>;
declare const detectSync: (options?: DetectOptions | undefined) => DetectResult | null;

export { detect, detectSync, getUserAgent };
