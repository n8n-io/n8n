import { clearConversation } from '../../utils/builder-memory';

export default defineEventHandler(async (event) => {
	const body = await readBody<{ sessionId: string }>(event);
	clearConversation(body?.sessionId || 'default');
	return { ok: true };
});
