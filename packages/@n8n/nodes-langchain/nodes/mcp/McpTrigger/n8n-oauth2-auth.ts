import { UnexpectedError, type IWebhookFunctions } from 'n8n-workflow';

function trimTrailingSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getBearerToken(headerValue: string | undefined): string | null {
	if (!headerValue) return null;
	const split = headerValue.split(' ');
	if (split.length !== 2 || split[0].toLowerCase() !== 'bearer') {
		return null;
	}
	return split[1];
}

function sendUnauthorizedResponse(
	resp: ReturnType<IWebhookFunctions['getResponseObject']>,
	prmUrl: string,
	error?: string,
) {
	const authenticateHeader =
		`Bearer realm="n8n MCP Server", resource_metadata="${prmUrl}"` +
		(error ? `, error="${error}"` : '');
	resp.writeHead(401, {
		'WWW-Authenticate': authenticateHeader,
	});
	resp.end();
}

export const n8nOAuth2Auth = async (
	context: IWebhookFunctions,
): Promise<
	| {
			status: 'ok';
			token: string;
			resource: string;
	  }
	| 'handled'
> => {
	const webhookUrl = context.getNodeWebhookUrl('default');
	if (!webhookUrl) {
		throw new UnexpectedError('Webhook URL is not available');
	}

	const resourceUrl = trimTrailingSlash(webhookUrl);

	const u = new URL(resourceUrl);

	const prmUrl = `${u.origin}/.well-known/oauth-protected-resource${u.pathname}`;

	const resp = context.getResponseObject();
	const req = context.getRequestObject();

	const authHeader = req.headers['authorization'];
	const token = getBearerToken(authHeader);
	if (!token) {
		sendUnauthorizedResponse(resp, prmUrl);
		return 'handled';
	}

	const validationResult = await context.validateN8nOAuth2Token(token, resourceUrl);
	if (!validationResult.valid) {
		if (validationResult.reason === 'invalid_token') {
			sendUnauthorizedResponse(resp, prmUrl, 'invalid_token');
		} else {
			resp.status(503).send('OAuth token validation is not available');
		}
		return 'handled';
	}
	return {
		status: 'ok',
		token,
		resource: resourceUrl,
	};
};
