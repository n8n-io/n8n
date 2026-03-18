/**
 * Local type declarations for @n8n/fs-proxy subpath exports.
 *
 * These mirror the public API surface used by this package.
 * They are needed for typecheck because the fs-proxy dist may not be built
 * in all development environments.  At runtime the actual package is used.
 */

declare module '@n8n/fs-proxy/config' {
	import { z } from 'zod';

	export const gatewayConfigSchema: z.ZodObject<
		{
			logLevel: z.ZodDefault<z.ZodEnum<['silent', 'error', 'warn', 'info', 'debug']>>;
			port: z.ZodDefault<z.ZodNumber>;
			allowedOrigins: z.ZodDefault<z.ZodArray<z.ZodString>>;
			filesystem: z.ZodDefault<
				z.ZodUnion<[z.ZodLiteral<false>, z.ZodObject<{ dir: z.ZodDefault<z.ZodString> }>]>
			>;
			computer: z.ZodDefault<
				z.ZodObject<{
					shell: z.ZodDefault<
						z.ZodUnion<[z.ZodLiteral<false>, z.ZodObject<{ timeout: z.ZodDefault<z.ZodNumber> }>]>
					>;
					screenshot: z.ZodDefault<
						z.ZodUnion<[z.ZodLiteral<false>, z.ZodObject<Record<string, never>>]>
					>;
					mouseKeyboard: z.ZodDefault<
						z.ZodUnion<[z.ZodLiteral<false>, z.ZodObject<Record<string, never>>]>
					>;
				}>
			>;
			browser: z.ZodDefault<
				z.ZodUnion<[z.ZodLiteral<false>, z.ZodObject<Record<string, z.ZodTypeAny>>]>
			>;
		},
		z.UnknownKeysParam,
		z.ZodTypeAny
	>;

	export type GatewayConfig = {
		logLevel?: string;
		port?: number;
		allowedOrigins?: string[];
		filesystem?: false | { dir?: string };
		computer?: {
			shell?: false | { timeout?: number };
			screenshot?: false | Record<string, never>;
			mouseKeyboard?: false | Record<string, never>;
		};
		browser?: false | Record<string, unknown>;
	};

	export type ResolvedGatewayConfig = {
		logLevel: string;
		port: number;
		allowedOrigins: string[];
		filesystem: false | { dir: string };
		computer: {
			shell: false | { timeout: number };
			screenshot: false | Record<string, never>;
			mouseKeyboard: false | Record<string, never>;
		};
		browser: false | Record<string, unknown>;
	};
}

declare module '@n8n/fs-proxy/daemon' {
	import * as http from 'node:http';
	import type { ResolvedGatewayConfig } from '@n8n/fs-proxy/config';

	export interface DaemonOptions {
		confirmConnect?: (url: string) => Promise<boolean>;
		onStatusChange?: (status: 'connected' | 'disconnected', url?: string) => void;
		managedMode?: boolean;
	}

	export function startDaemon(config: ResolvedGatewayConfig, options?: DaemonOptions): http.Server;
}

declare module '@n8n/fs-proxy/logger' {
	export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';
	export function configure(options: { level?: LogLevel }): void;
	export const logger: {
		error(message: string, meta?: Record<string, unknown>): void;
		warn(message: string, meta?: Record<string, unknown>): void;
		info(message: string, meta?: Record<string, unknown>): void;
		debug(message: string, meta?: Record<string, unknown>): void;
	};
}
