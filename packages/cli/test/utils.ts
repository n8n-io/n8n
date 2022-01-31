import express = require('express');
import * as superagent from 'superagent';
import { URL } from 'url';

import { REST_PATH_SEGMENT } from './constants';

/**
 * Log all the routes mounted on the test server app, for debugging.
 */
export const logRoutes = (app: express.Application) => {
	app._router.stack.forEach((r: { route?: { path?: string } }) => {
		if (r?.route?.path) console.log(r.route.path);
	});
};

/**
 * Plugin to prefix a path segment into a request URL pathname .
 *
 * Example:
 * http://127.0.0.1:62100/me/password → http://127.0.0.1:62100/rest/me/password
 */
const prefix = (pathSegment: string) => {
	return function (request: superagent.SuperAgentRequest) {
		const url = new URL(request.url);

		// enforce consistency at call sites
		if (url.pathname[0] !== '/') {
			throw new Error('Pathname must start with a forward slash');
		}

		url.pathname = pathSegment + url.pathname;
		request.url = url.toString();

		return request;
	};
};

export const restPrefix = prefix(REST_PATH_SEGMENT);
