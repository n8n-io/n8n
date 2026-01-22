import { Container } from '@n8n/di';
import type { Request } from 'express';
import { ExecutionContextHookRegistry } from 'n8n-core';
import { toExecutionContextEstablishmentHookParameter, type Workflow } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { AUTH_COOKIE_NAME } from '@/constants';

const BROWSER_ID_COOKIE_NAME = 'n8n-browserId';

const DISALLOWED_COOKIES = new Set([AUTH_COOKIE_NAME, BROWSER_ID_COOKIE_NAME]);

/**
 * Removes a cookie with the given name from the request header
 */
const removeCookiesFromHeader = (req: Request) => {
	const cookiesHeader = req.headers.cookie;
	if (typeof cookiesHeader !== 'string') {
		return;
	}

	const cookies = cookiesHeader.split(';').map((cookie) => cookie.trim());
	const filteredCookies = cookies.filter((cookie) => {
		const cookieName = cookie.split('=')[0];
		return !DISALLOWED_COOKIES.has(cookieName);
	});

	if (filteredCookies.length !== cookies.length) {
		req.headers.cookie = filteredCookies.join('; ');
	}
};

/**
 * Removes a cookie with the given name from the parsed cookies object
 */
const removeCookiesFromParsedCookies = (req: Request) => {
	if (req.cookies !== null && typeof req.cookies === 'object') {
		for (const cookieName of DISALLOWED_COOKIES) {
			delete req.cookies[cookieName];
		}
	}
};

/**
 * Removes headers that are targeted by context establishment hooks from the request.
 * This ensures that identity extractors (like BearerTokenExtractor, HttpHeaderExtractor)
 * can extract the identity, but the headers are removed from the request before
 * being included in the execution data.
 */
export const removeContextEstablishmentHookTargets = (
	req: Request,
	workflow: Workflow,
	workflowStartNode: INode,
): void => {
	const hookRegistry = Container.get(ExecutionContextHookRegistry);
	const nodeParams = {
		...(workflow.getNode(workflowStartNode.name)?.parameters ?? {}),
		...workflowStartNode.parameters,
	};

	const hookParamsResult = toExecutionContextEstablishmentHookParameter(nodeParams);
	if (!hookParamsResult || hookParamsResult.error) {
		return;
	}

	const hooks = hookParamsResult.data.contextEstablishmentHooks.hooks;
	if (!hooks || hooks.length === 0) {
		return;
	}

	const headersToRemove = new Set<string>();

	for (const hookConfig of hooks) {
		const hook = hookRegistry.getHookByName(hookConfig.hookName);
		if (!hook) {
			continue;
		}

		if (hookConfig.hookName === 'BearerTokenExtractor') {
			headersToRemove.add('authorization');
		}

		if (hookConfig.hookName === 'HttpHeaderExtractor') {
			const headerName =
				(hookConfig.options as { headerName?: string })?.headerName ?? 'authorization';
			headersToRemove.add(headerName.toLowerCase());
		}
	}

	if (headersToRemove.size > 0 && req.headers) {
		for (const headerName of headersToRemove) {
			for (const key of Object.keys(req.headers)) {
				if (key.toLowerCase() === headerName) {
					delete req.headers[key];
					break;
				}
			}
		}
	}
};

export const sanitizeWebhookRequest = (req: Request) => {
	removeCookiesFromHeader(req);
	removeCookiesFromParsedCookies(req);
};
