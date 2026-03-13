import { deleteCredential } from '../../utils/credentials-db';

export default defineEventHandler((event) => {
	const name = getRouterParam(event, 'name');
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Credential name is required' });
	}

	const deleted = deleteCredential(name);
	if (!deleted) {
		throw createError({ statusCode: 404, statusMessage: `Credential "${name}" not found` });
	}

	return { ok: true };
});
