import { evaluate, Eval } from '@n8n/agents';
import { getActiveAgent, getActiveEvals } from '../../utils/agent-runtime';
import { listCredentials, getCredentialKey } from '../../utils/credentials-db';

interface EvalRunRequest {
	dataset: Array<{
		input: string;
		expected?: string;
		approvals?: Record<string, 'approve' | 'deny'>;
	}>;
}

export default defineEventHandler(async (event) => {
	const body = await readBody<EvalRunRequest>(event);

	if (!body?.dataset?.length) {
		throw createError({
			statusCode: 400,
			statusMessage: 'dataset is required and must not be empty',
		});
	}

	const agent = getActiveAgent();
	if (!agent) {
		throw createError({ statusCode: 400, statusMessage: 'No active agent. Compile code first.' });
	}

	const builtEvals = getActiveEvals();
	if (!builtEvals.length) {
		throw createError({
			statusCode: 400,
			statusMessage: 'No evals attached to the agent. Add .eval() to your agent.',
		});
	}

	// Set env vars from credentials DB for LLM-as-judge evals
	for (const cred of listCredentials()) {
		const key = getCredentialKey(cred.name);
		if (key) {
			process.env[`${cred.name.toUpperCase()}_API_KEY`] = key;
		}
	}

	// Wrap BuiltEvals into Eval instances for evaluate()
	const evalWrappers = builtEvals.map((be) => {
		const wrapper = new Eval(be.name)
			.description(be.description ?? '')
			.check(async (input) => await be._run(input));
		return wrapper;
	});

	try {
		const results = await evaluate(agent, {
			dataset: body.dataset,
			evals: evalWrappers,
		});

		return { results };
	} catch (e) {
		throw createError({
			statusCode: 500,
			statusMessage: e instanceof Error ? e.message : 'Eval run failed',
		});
	}
});
