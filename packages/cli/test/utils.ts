import express = require('express');
import request = require('superagent');
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
 * Build the full path of a test server route.
 */
export const rest = (endpoint: string) => [`/${REST_PATH_SEGMENT}`, endpoint].join('/');
