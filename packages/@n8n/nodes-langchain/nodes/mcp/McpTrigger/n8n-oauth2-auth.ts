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

export const n8nOAuth2Auth = async (context: IWebhookFunctions): Promise<'ok' | 'handled'> => {
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
		resp.writeHead(401, {
			'WWW-Authenticate': `Bearer realm="n8n MCP Server", resource_metadata="${prmUrl}"`,
		});
		resp.end();
		return 'handled';
	}

	const validationResult = await context.validateN8nOAuth2Token(token, resourceUrl);
	if (validationResult.valid) {
		return 'ok';
	}
	if (validationResult.reason === 'invalid_token') {
		resp.writeHead(401, {
			'WWW-Authenticate': `Bearer realm="n8n MCP Server", error="invalid_token", resource_metadata="${prmUrl}"`,
		});
		resp.end();
	} else {
		resp.status(503).send('OAuth token validation is not available');
	}
	return 'handled';
};
