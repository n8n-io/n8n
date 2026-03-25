"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utility = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const version_1 = require("./version");
/**
 * Utility class providing helper methods for agent runtime operations.
 */
class Utility {
    /**
     * Reads the application name from package.json at module load time.
     * This ensures file I/O happens during initialization, not during requests.
     *
     * Note: Uses process.cwd() which assumes the application is started from its root directory.
     * This is a fallback mechanism - npm_package_name (checked first in getApplicationName) is
     * the preferred source as it's reliably set by npm/pnpm when running package scripts.
     */
    static initPackageName() {
        try {
            const packageJsonPath = path_1.default.resolve(process.cwd(), 'package.json');
            const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf-8'));
            return packageJson.name || null;
        }
        catch {
            // TODO: Add debug-level logging once a logger implementation is available
            // to help troubleshoot package.json read failures in production environments
            return null;
        }
    }
    /**
     * **WARNING: NO SIGNATURE VERIFICATION** - This method uses jwt.decode() which does NOT
     * verify the token signature. The token claims can be spoofed by malicious actors.
     * This method is ONLY suitable for logging, analytics, and diagnostics purposes.
     * Do NOT use the returned value for authorization, access control, or security decisions.
     *
     * Decodes the current token and retrieves the App ID (appid or azp claim).
     *
     * Note: Returns a default GUID ('00000000-0000-0000-0000-000000000000') for empty tokens
     * for backward compatibility with callers that expect a valid-looking GUID.
     * For agent identification where empty string is preferred, use {@link getAgentIdFromToken}.
     *
     * @param token Token to Decode
     * @returns AppId, or default GUID for empty token, or empty string if decode fails
     */
    static GetAppIdFromToken(token) {
        if (!token || token.trim() === '') {
            return '00000000-0000-0000-0000-000000000000';
        }
        try {
            const decoded = jwt.decode(token);
            if (!decoded) {
                return '';
            }
            // Look for appid claim first, then azp claim as fallback
            const appIdClaim = decoded['appid'] || decoded['azp'];
            return appIdClaim || '';
        }
        catch (_error) {
            // Silent error handling - return empty string on decode failure
            return '';
        }
    }
    /**
     * **WARNING: NO SIGNATURE VERIFICATION** - This method uses jwt.decode() which does NOT
     * verify the token signature. The token claims can be spoofed by malicious actors.
     * This method is ONLY suitable for logging, analytics, and diagnostics purposes.
     * Do NOT use the returned value for authorization, access control, or security decisions.
     *
     * Decodes the token and retrieves the best available agent identifier.
     * Checks claims in priority order: xms_par_app_azp (agent blueprint ID) > appid > azp.
     *
     * Note: Returns empty string for empty/missing tokens (unlike {@link GetAppIdFromToken} which
     * returns a default GUID). This allows callers to omit headers when no identifier is available.
     *
     * @param token JWT token to decode
     * @returns Agent ID (GUID) or empty string if not found or token is empty
     */
    static getAgentIdFromToken(token) {
        if (!token || token.trim() === '') {
            return '';
        }
        try {
            const decoded = jwt.decode(token);
            if (!decoded) {
                return '';
            }
            // Priority: xms_par_app_azp (agent blueprint ID) > appid > azp
            return decoded['xms_par_app_azp'] || decoded['appid'] || decoded['azp'] || '';
        }
        catch (_error) {
            // Silent error handling - return empty string on decode failure
            return '';
        }
    }
    /**
     * Resolves the agent identity from the turn context or auth token.
     * @param context Turn Context of the turn.
     * @param authToken Auth token if available.
     * @returns Agent identity (App ID)
     */
    static ResolveAgentIdentity(context, authToken) {
        // App ID is required to pass to MCP server URL.
        const agenticAppId = context.activity.isAgenticRequest()
            ? context.activity.getAgenticInstanceId() || ''
            : this.GetAppIdFromToken(authToken);
        return agenticAppId;
    }
    /**
     * Generates a User-Agent header string containing SDK version, OS type, Node.js version, and orchestrator.
     * @param orchestrator Optional orchestrator identifier to include in the User-Agent string.
     * @returns Formatted User-Agent header string.
     */
    static GetUserAgentHeader(orchestrator) {
        const osType = os_1.default.type();
        const orchestratorPart = orchestrator ? `; ${orchestrator}` : '';
        return `Agent365SDK/${version_1.LIB_VERSION} (${osType}; Node.js ${process.version}${orchestratorPart})`;
    }
    /**
     * Gets the application name from npm_package_name environment variable or package.json.
     * The package.json result is cached at module load time to avoid sync I/O during requests.
     * @returns Application name or undefined if not available.
     */
    static getApplicationName() {
        // First try npm_package_name (set automatically by npm/pnpm when running scripts)
        // eslint-disable-next-line no-restricted-properties -- npm_package_name is set by npm at runtime, not a configurable setting
        if (process.env.npm_package_name) {
            // eslint-disable-next-line no-restricted-properties -- npm_package_name is set by npm at runtime, not a configurable setting
            return process.env.npm_package_name;
        }
        // Fall back to cached package.json name (read at module load time)
        return this.cachedPackageName || undefined;
    }
    /**
     * Resets the cached application name. Used for testing purposes.
     * @internal
     */
    static resetApplicationNameCache() {
        this.cachedPackageName = Utility.initPackageName();
    }
}
exports.Utility = Utility;
// Cache for application name read from package.json
// null = checked but not found, string = found
// Eagerly initialized at module load time to avoid sync I/O during requests
Utility.cachedPackageName = Utility.initPackageName();
//# sourceMappingURL=utility.js.map