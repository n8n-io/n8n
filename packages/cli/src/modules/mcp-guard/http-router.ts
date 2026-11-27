import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { HttpVendorProfile } from './http-profiles';
import { looksLikeId, NO_BODY_STATUS, toToolCall, type HttpToolArgs } from './http-tool-caller';
import type { McpCaller } from './mcp-upstream';
import type { CapturedRequest } from './network';
import {
	currentRequestContext,
	runWithRequestContext,
	type RequestContext,
} from './request-context';
import { redactPathSecret } from './path-secret';
import { isReadShaped } from './request-classifier';
import type { Hydrator } from './router';
import { canonicalHost, vendorForRequest } from './vendor-knowledge';

export interface HttpGuardRouterDeps {
	// The real service. Only a read-shaped request reaches it.
	upstream: McpCaller;
	gym: McpCaller;
	hydrator: Hydrator;
	profile: HttpVendorProfile;
	// The ids that the gym made. Vendors of one tenant share them. Without this, the router keeps its own.
	gymIds?: Set<string>;
}

const refusal = (status: number, text: string): Response => new Response(text, { status });

// A 401, 403 or 5xx of a real read goes back to the node. A 404 stays with the gym: the id can be its own.
const isPassedBack = (status: unknown): boolean =>
	typeof status === 'number' && (status === 401 || status === 403 || status >= 500);

const textOf = (res: CallToolResult): string =>
	res.content.flatMap((c) => (c.type === 'text' ? [c.text] : [])).join('\n');

function toResponse(res: CallToolResult): Response {
	const status = typeof res._meta?.status === 'number' ? res._meta.status : res.isError ? 500 : 200;
	const type =
		typeof res._meta?.contentType === 'string' ? res._meta.contentType : 'application/json';
	const body = NO_BODY_STATUS.has(status) ? null : textOf(res);
	return new Response(body, { status, headers: { 'content-type': type } });
}

// `parentFolderId` names a folder that the gym made, when a message of the gym is read.
const ID_FIELD = /"(?:id|threadId|spreadsheetId|parentFolderId)"\s*:\s*"([^"]+)"/g;

// A path can hold an id with `%2B` or `%3D`. The gym answer holds it as plain text.
const decodeSegment = (segment: string): string => {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
};

/**
 * Routes the HTTP requests of one chat. A read-shaped request reads the real service, then the gym
 * gets a copy of the answer and answers. Every other request goes only to the gym. The model never
 * decides which requests may reach the real service: `isReadShaped` does.
 */
export class HttpGuardRouter {
	// Ids that the gym made. The real service does not know them.
	private readonly gymIds: Set<string>;

	constructor(private readonly deps: HttpGuardRouterDeps) {
		this.gymIds = deps.gymIds ?? new Set<string>();
	}

	async handle(incoming: CapturedRequest, signal?: AbortSignal): Promise<Response> {
		// Take a secret out of the path first. Nothing below, not a log, an error or the gym, sees it.
		const { url, secret } = redactPathSecret(incoming.url, this.deps.profile.pathSecret);
		const req = secret === undefined ? incoming : { ...incoming, url };
		const host = canonicalHost(req.url.hostname);
		const vendor = vendorForRequest(host, req.url.pathname);
		if (!vendor) return refusal(403, 'mcp-guard: this host is not available in a preview chat');

		// The real reads of the hydration use the credential and the host of this request.
		const context: RequestContext = { origin: `${req.url.protocol}//${req.url.host}`, signal };
		if (req.headers.authorization) context.authorization = req.headers.authorization;
		if (secret !== undefined) context.pathSecret = secret;
		return await runWithRequestContext(context, async () => {
			const readShaped = isReadShaped(req, vendor.readPaths, vendor.graphqlPaths);
			const { name, args } = toToolCall(req, readShaped);
			return readShaped ? await this.read(name, args) : await this.write(name, args);
		});
	}

	private async write(name: string, args: HttpToolArgs): Promise<Response> {
		const { hydrator, profile } = this.deps;
		this.log(args, 'gym');
		if (profile.hydrateWrite?.(args, this.gymIds)) {
			// A failed parent read must not block the write. The gym then answers with its own error.
			await hydrator.hydrateWrite?.(name, args).catch(() => undefined);
		}
		// An id in the answer of a write names an object that the gym made, also for a vendor with real ids.
		const res = await this.callGym(name, args, true);
		if (res instanceof Response) return res;
		if (!res.isError) hydrator.noteWrite?.(name, res);
		return toResponse(res);
	}

	private async read(name: string, args: HttpToolArgs): Promise<Response> {
		const { upstream, hydrator, profile } = this.deps;
		// An id that the gym made names nothing in the real service. A path can hold other ids too,
		// such as a range ("Sheet1!A1:C10"), so one id of the gym is enough.
		const gymOnly = args.path
			.split('/')
			.map(decodeSegment)
			.some((segment) => looksLikeId(segment) && this.gymIds.has(segment));
		this.log(args, gymOnly ? 'gym (an id of the gym)' : 'real read, then gym');
		if (!gymOnly) {
			try {
				const real = await upstream.callTool(name, args);
				if (real.isError)
					this.warn(args, `real read failed with status ${String(real._meta?.status)}`);
				// The node must see these failures. An expired token (401) makes the node refresh its credential.
				// The others (a closed API, a denied scope, a service error) are no empty result.
				if (isPassedBack(real._meta?.status)) return toResponse(real);
				// Any other failed real read (a 404 for an id that only the gym knows) leaves the gym to answer.
				if (!real.isError && profile.hydrateRead?.(args, safeJson(textOf(real))) !== false) {
					await hydrator.hydrate(name, args, real).catch(() => {
						Container.get(Logger).warn(`mcp-guard http hydration failed for ${name}`);
					});
				}
			} catch {
				Container.get(Logger).warn(`mcp-guard http real read failed for ${name}`);
			}
		}
		// A read of a vendor with real ids shows real ids. Only a write makes an id that the gym alone knows.
		const res = await this.callGym(name, args, !profile.opaqueIds);
		return res instanceof Response ? res : toResponse(res);
	}

	// Method, host and path only. Never the query, the headers or the body.
	private warn(args: HttpToolArgs, text: string): void {
		const host = new URL(currentRequestContext().origin).host;
		Container.get(Logger).warn(`mcp-guard http ${args.method} ${host}${args.path}: ${text}`);
	}

	// Method, host and path only. Never the query, the headers or the body.
	private log(args: HttpToolArgs, route: string): void {
		const host = new URL(currentRequestContext().origin).host;
		Container.get(Logger).info(`mcp-guard http ${args.method} ${host}${args.path} -> ${route}`);
	}

	private async callGym(
		name: string,
		args: HttpToolArgs,
		remember: boolean,
	): Promise<CallToolResult | Response> {
		try {
			const res = await this.deps.gym.callTool(name, args);
			if (remember) {
				for (const match of textOf(res).matchAll(ID_FIELD)) this.gymIds.add(match[1]);
			}
			return res;
		} catch {
			return refusal(502, 'mcp-guard: the gym could not be reached');
		}
	}
}

function safeJson(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
}
