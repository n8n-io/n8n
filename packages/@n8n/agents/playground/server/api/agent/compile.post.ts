import { compileSource } from '../../utils/compile';
import { setActiveAgent, setActiveEvals, clearAgent } from '../../utils/agent-runtime';
import type { Agent } from '@n8n/agents';

export default defineEventHandler(async (event) => {
	const body = await readBody<{ source: string }>(event);

	const result = await compileSource(body?.source ?? '');

	if (result.ok && result.exported) {
		const agent = result.exported as Agent;
		setActiveAgent(agent);
		setActiveEvals(agent.evaluations);
	} else {
		clearAgent();
	}

	return { ok: result.ok, error: result.error, evalNames: result.evalNames };
});
