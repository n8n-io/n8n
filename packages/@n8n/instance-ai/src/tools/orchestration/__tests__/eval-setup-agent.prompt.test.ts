import { EVAL_SETUP_AGENT_PROMPT } from '../eval-setup-agent.prompt';

describe('EVAL_SETUP_AGENT_PROMPT — direct wiring', () => {
	it('instructs to connect EvaluationTrigger directly to the agent', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/connect.*evaluationtrigger.*directly.*agent/i);
	});

	it('instructs to rewrite agent parameters with $json.<column> when needed', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/rewrite.*agent.*parameters/i);
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/\$json\.<column>/i);
	});
});

describe('EVAL_SETUP_AGENT_PROMPT — production adapter pattern', () => {
	it('mentions the PRODUCTION ADAPTER concept', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/PRODUCTION ADAPTER/);
	});

	it('instructs the sub-agent to follow the adapter section literally when present', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(
			/follow.*PRODUCTION ADAPTER.*literally|exactly|verbatim/i,
		);
	});

	it('describes the dual-input topology (eval trigger AND adapter both feed agent)', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/TWO incoming.*main.*connections/i);
	});
});

describe('EVAL_SETUP_AGENT_PROMPT — no DataTable creation tool', () => {
	it('instructs the sub-agent to use the provided DataTable id as-is', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/use it as-is/i);
	});
});
