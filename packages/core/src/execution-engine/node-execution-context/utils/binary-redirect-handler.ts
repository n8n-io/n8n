import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import type { AgentOptions } from 'https';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { createHttpProxyAgent, createHttpsProxyAgent } from '@/http-proxy';

/**
 * Utility for handling binary downloads that involve HTTP redirects.
 * 
 * This module solves the problem of socket hang up errors (ECONNRESET) that occur
 * when downloading binary content from APIs that redirect to CDNs.
 * 
 * The issue occurs because:
 * 1. Axios starts streaming the response body immediately
 * 2. If the server returns a redirect (302/307), axios follows it while streaming
 * 3. The TLS socket/agent is reused across different hosts
 * 4. Authorization headers may be sent to the CDN (cross-origin)
 * 5. The CDN closes the connection, causing ECONNRESET
 * 
 * The solution:
 * 1. Resolve all redirects BEFORE starting the binary download
 * 2. Create fresh HTTP agents for the final URL
 * 3. Strip Authorization headers on cross-origin redirects
 * 4. Only then start the actual binary download
 */

export interface RedirectResolutionResult {
	/** The final URL after all redirects */
	finalUrl: string;
	/** Whether the redirect crossed origins (different domain) */
	crossOriginRedirect: boolean;
	/** The original origin */
	originalOrigin: string;
	/** The final origin */
	finalOrigin: string;
}

/**
 * Resolves all HTTP redirects for a given URL without downloading the response body.
 * Uses HEAD requests to follow redirects efficiently.
 * 
 * @param axiosConfig - The axios configuration for the request
 * @returns Information about the final URL and whether cross-origin redirects occurred
 */
export async function resolveRedirectsForBinary(
	axiosConfig: AxiosRequestConfig,
): Promise<RedirectResolutionResult> {
	const originalUrl = axiosConfig.url!;
	const originalOrigin = new URL(originalUrl, axiosConfig.baseURL).origin;

	const logger = Container.get(Logger);

	// Make a HEAD request to follow redirects without downloading body
	const headConfig: AxiosRequestConfig = {
		...axiosConfig,
		method: 'HEAD',
		maxRedirects: axiosConfig.maxRedirects ?? 5,
		validateStatus: (status) => status >= 200 && status < 400,
		// Don't stream for HEAD request
		responseType: undefined,
	};

	try {
		const response = await axios(headConfig);
		
		// Get the final URL from the response
		// Different axios versions/configurations may store this differently
		const finalUrl =
			response.request?.res?.responseUrl ||
			response.request?.responseURL ||
			response.config.url ||
			originalUrl;

		const finalOrigin = new URL(finalUrl).origin;
		const crossOriginRedirect = originalOrigin !== finalOrigin;

		if (crossOriginRedirect) {
			logger.debug('Detected cross-origin redirect for binary download', {
				originalOrigin,
				finalOrigin,
				originalUrl,
				finalUrl,
			});
		}

		return {
			finalUrl,
			crossOriginRedirect,
			originalOrigin,
			finalOrigin,
		};
	} catch (error) {
		// If HEAD fails (some servers don't support HEAD), return original URL
		// The actual request will be attempted with the original method
		logger.debug('HEAD request failed during redirect resolution, using original URL', {
			originalUrl,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			finalUrl: originalUrl,
			crossOriginRedirect: false,
			originalOrigin,
			finalOrigin: originalOrigin,
		};
	}
}

/**
 * Creates a fresh axios config for the final URL after redirect resolution.
 * This ensures that:
 * - New HTTP agents are created (no socket reuse)
 * - Authorization headers are stripped for cross-origin requests
 * - The request goes directly to the final URL (no more redirects)
 * 
 * @param originalConfig - The original axios configuration
 * @param redirectInfo - Information about the resolved redirects
 * @returns A new axios configuration for the final request
 */
export function createBinarySafeConfig(
	originalConfig: AxiosRequestConfig,
	redirectInfo: RedirectResolutionResult,
): AxiosRequestConfig {
	const logger = Container.get(Logger);

	// Create a new config for the final URL
	const finalConfig: AxiosRequestConfig = {
		...originalConfig,
		url: redirectInfo.finalUrl,
		maxRedirects: 0, // Don't follow redirects again
	};

	// Remove Authorization header if cross-origin redirect occurred
	if (redirectInfo.crossOriginRedirect && finalConfig.headers?.Authorization) {
		logger.debug('Removing Authorization header for cross-origin binary request', {
			from: redirectInfo.originalOrigin,
			to: redirectInfo.finalOrigin,
		});

		delete finalConfig.headers.Authorization;
	}

	// Create fresh agents for the final URL to avoid socket reuse issues
	const host = new URL(redirectInfo.finalUrl).hostname;
	const agentOptions: AgentOptions = {
		keepAlive: true,
		keepAliveMsecs: 1000,
		maxSockets: Infinity,
		maxFreeSockets: 256,
		timeout: 300000, // 5 minutes
		scheduling: 'lifo',
		servername: host,
	};

	// Handle proxy configuration
	const customProxyUrl =
		typeof originalConfig.proxy === 'string' ? originalConfig.proxy : null;

	finalConfig.httpAgent = createHttpProxyAgent(
		customProxyUrl,
		redirectInfo.finalUrl,
		agentOptions,
	);
	finalConfig.httpsAgent = createHttpsProxyAgent(
		customProxyUrl,
		redirectInfo.finalUrl,
		agentOptions,
	);

	return finalConfig;
}

/**
 * Performs a binary-safe HTTP request by resolving redirects first.
 * This is the main entry point for downloading binary content safely.
 * 
 * @param axiosConfig - The axios configuration for the request
 * @returns The axios response with the binary data
 */
export async function executeBinarySafeRequest(
	axiosConfig: AxiosRequestConfig,
): Promise<AxiosResponse> {
	// Step 1: Resolve all redirects first
	const redirectInfo = await resolveRedirectsForBinary(axiosConfig);

	// Step 2: Create a safe config for the final URL
	const finalConfig = createBinarySafeConfig(axiosConfig, redirectInfo);

	// Step 3: Execute the request to the final URL
	return await axios(finalConfig);
}
