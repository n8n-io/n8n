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

describe('EVAL_SETUP_AGENT_PROMPT — multi-target sub-component rewrites', () => {
	it('mentions sub-components in the PRODUCTION ADAPTER instructions', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/sub-components|memory|tools/i);
	});

	it('instructs to rewrite each line under section 3 of the PRODUCTION ADAPTER', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/each rewrite line under section 3/i);
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/Do not skip any target node/i);
	});

	it("warns sub-component rewrites use $('<AgentName>').item.json form, not $json", () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/Do not assume the replacement is always/);
		expect(EVAL_SETUP_AGENT_PROMPT).toMatch(/sub-components do not see `\$json`/i);
	});
});
