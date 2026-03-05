import { compileSource } from '../../utils/compile';
import { setActiveAgent, clearAgent } from '../../utils/agent-runtime';
import type { Agent } from '@n8n/agents';

export default defineEventHandler(async (event) => {
	const body = await readBody<{ source: string }>(event);

	const result = await compileSource(body?.source ?? '');

	if (result.ok && result.exported) {
		setActiveAgent(result.exported as Agent);
	} else {
		clearAgent();
	}

	return { ok: result.ok, error: result.error };
});
