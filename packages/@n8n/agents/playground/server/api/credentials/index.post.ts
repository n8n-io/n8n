import { createCredential } from '../../utils/credentials-db';

export default defineEventHandler(async (event) => {
	const body = await readBody<{ name?: string; apiKey?: string }>(event);

	if (!body?.name?.trim() || !body?.apiKey?.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'name and apiKey are required' });
	}

	const created = createCredential(body.name.trim(), body.apiKey.trim());
	if (!created) {
		throw createError({
			statusCode: 409,
			statusMessage: `Credential "${body.name}" already exists`,
		});
	}

	return { ok: true };
});
