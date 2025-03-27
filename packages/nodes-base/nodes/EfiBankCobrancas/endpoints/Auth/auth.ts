export async function auth(
	credentials: { clientId: string; clientSecret: string },
	baseURL: string,
	httpRequest: Function
): Promise<string> {
	const authHeader = `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`;
	const authResponse = await httpRequest({
			method: 'POST',
			url: `${baseURL}/v1/authorize`,
			json: true,
			headers: { Authorization: authHeader },
			body: { grant_type: 'client_credentials' },
	});

	if (!authResponse.access_token) {
			throw new Error('Autenticação falhou: token de acesso não recebido');
	}

	return authResponse.access_token;
}
