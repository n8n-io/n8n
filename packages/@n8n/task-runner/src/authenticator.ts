import { ApplicationError } from 'n8n-workflow';
import * as a from 'node:assert/strict';

export type AuthOpts = {
	n8nUri: string;
	authToken: string;
};

/**
 * Requests a one-time token that can be used to establish a task runner connection
 */
export async function authenticate(opts: AuthOpts) {
	try {
		const authEndpoint = `http://${opts.n8nUri}/rest/runners/auth`;
		const response = await fetch(authEndpoint, {
			method: 'POST',
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				token: opts.authToken,
			}),
		});

		if (!response.ok) {
			throw new ApplicationError(
				`Invalid response status ${response.status}: ${await response.text()}`,
			);
		}

		const { data } = (await response.json()) as { data: { token: string } };
		const grantToken = data.token;
		a.ok(grantToken);

		return grantToken;
	} catch (e) {
		console.error(e);
		const error = e as Error;
		throw new ApplicationError(
			`Could not connect to n8n message broker ${opts.n8nUri}: ${error.message}`,
			{
				cause: error,
			},
		);
	}
}
