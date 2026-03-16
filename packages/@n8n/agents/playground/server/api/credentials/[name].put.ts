import { updateCredential } from '../../utils/credentials-db';

export default defineEventHandler(async (event) => {
	const name = getRouterParam(event, 'name');
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Credential name is required' });
	}

	const body = await readBody<{ apiKey?: string }>(event);
	if (!body?.apiKey?.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'apiKey is required' });
	}

	const updated = updateCredential(name, body.apiKey.trim());
	if (!updated) {
		throw createError({ statusCode: 404, statusMessage: `Credential "${name}" not found` });
	}

	return { ok: true };
});
