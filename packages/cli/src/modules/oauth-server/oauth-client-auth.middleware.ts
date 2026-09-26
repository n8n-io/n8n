import { InvalidRequestError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { isRecord } from '@n8n/utils/is-record';
import type { RequestHandler } from 'express';

const decodeFormComponent = (value: string) => decodeURIComponent(value.replace(/\+/g, ' '));

// The MCP SDK reads credentials only from the body. Normalize OAuth Basic
// credentials before its token and revocation handlers validate the client.
export const oauthClientAuth: RequestHandler = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization || !/^Basic(?:\s|$)/i.test(authorization)) {
		next();
		return;
	}

	try {
		const match = /^Basic +([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
		if (!match) throw new InvalidRequestError('Invalid HTTP Basic credentials');

		const encoded = match[1];
		const decoded = Buffer.from(encoded, 'base64');
		if (decoded.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
			throw new InvalidRequestError('Invalid HTTP Basic credentials');
		}

		const credentials = decoded.toString('utf8');
		const separator = credentials.indexOf(':');
		if (separator < 0) throw new InvalidRequestError('Invalid HTTP Basic credentials');

		if (!isRecord(req.body)) throw new InvalidRequestError('Invalid request body');
		if ('client_id' in req.body || 'client_secret' in req.body) {
			throw new InvalidRequestError('Use one client authentication method per request');
		}

		const clientId = decodeFormComponent(credentials.slice(0, separator));
		const clientSecret = decodeFormComponent(credentials.slice(separator + 1));
		req.body.client_id = clientId;
		req.body.client_secret = clientSecret;
	} catch (error) {
		const oauthError =
			error instanceof InvalidRequestError
				? error
				: new InvalidRequestError('Invalid HTTP Basic credentials');
		res.status(400).json(oauthError.toResponseObject());
		return;
	}

	next();
};
