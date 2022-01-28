import express = require('express');
import request = require('superagent');
import { URL } from 'url';
import { Role } from '../src/databases/entities/Role';
import { REST_PATH_SEGMENT } from './constants';

/**
 * Log all the routes mounted on the Express app, for debugging.
 */
export const logRoutes = (app: express.Application) => {
	app._router.stack.forEach((r: { route?: { path?: string } }) => {
		if (r?.route?.path) console.log(r.route.path);
	});
};

/**
 * Extract the `n8n-auth` cookie from the headers of a response.
 */
export const extractAuthCookie = (
	response: Omit<request.Response, 'headers'> & { headers: { 'set-cookie': string[] } },
) => {
	const { 'set-cookie': cookie } = response.headers;

	if (Array.isArray(cookie) && cookie.length === 1) {
		return cookie.pop()!.split(';').shift()!.split('=').pop()!;
	}

	throw new Error('Failed to extract cookie from response');
};

/**
 * Validate that a role in a response corresponds to a global owner.
 */
export const expectOwnerGlobalRole = (globalRole: Role) => {
	expect(globalRole.id).toBe(1);
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');
	expect(typeof globalRole.createdAt).toBe('string');
	expect(typeof globalRole.updatedAt).toBe('string');
};

/**
 * Prefix a path segment into the pathname of a request URL.
 */
const prefixPathname = (pathSegment: string) => {
	return function (request: request.SuperAgentRequest) {
		const url = new URL(request.url);
		url.pathname = pathSegment + url.pathname;
		request.url = url.toString();

		return request;
	};
};

/**
 * Plugin to prefix the base n8n REST API path segment into the pathname of a request URL.
 *
 * Example:
 * http://127.0.0.1:62100/me/password → http://127.0.0.1:62100/rest/me/password
 */
export const restPrefix = prefixPathname(REST_PATH_SEGMENT);
