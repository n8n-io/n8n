import { EVAL_SETUP_AGENT_PROMPT } from '../eval-setup-agent.prompt';

describe('EVAL_SETUP_AGENT_PROMPT', () => {
	it('is a non-empty string', () => {
		expect(typeof EVAL_SETUP_AGENT_PROMPT).toBe('string');
		expect(EVAL_SETUP_AGENT_PROMPT.length).toBeGreaterThan(2000);
	});

	it('declares role as eval setup specialist', () => {
		expect(EVAL_SETUP_AGENT_PROMPT.toLowerCase()).toContain('eval setup');
	});

	it('instructs to be terse and report to parent agent', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('parent agent');
		expect(EVAL_SETUP_AGENT_PROMPT.toLowerCase()).toContain('terse');
	});

	it('references the eval node types the agent must use', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('n8n-nodes-base.evaluationTrigger');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('n8n-nodes-base.evaluation');
	});

	it('describes all four Evaluation operations', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('setInputs');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('setOutputs');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('setMetrics');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('checkIfEvaluating');
	});

	it('lists the canned metric keys', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('correctness');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('relevance');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('tool_use');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('helpfulness');
	});

	it('describes LangChain agent output shape', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('langchain.agent');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('$json.output');
	});

	it('describes the required topology with checkIfEvaluating', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('checkIfEvaluating');
		expect(EVAL_SETUP_AGENT_PROMPT.toLowerCase()).toContain('topology');
		expect(EVAL_SETUP_AGENT_PROMPT.toLowerCase()).toContain('side-effect');
	});

	it('keeps EvaluationTrigger wiring guidance on the regular Set shape bridge', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('EvaluationTrigger] ──→ [Set: reshape');
		expect(EVAL_SETUP_AGENT_PROMPT).not.toContain('EvaluationTrigger → `Evaluation(setInputs)`');
	});

	it('instructs eval runs to enter the target AI node directly', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('[EvaluationTrigger] ──→ [Set: reshape');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('──→ [AI Agent]');
		expect(EVAL_SETUP_AGENT_PROMPT).not.toContain('first processing node');
	});

	it('forbids shape bridge assignments from reading original workflow nodes', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('Shape bridge assignment values');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('$json.<dataset_column>');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain("Never use $('Some Node').item.json");
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('$node[');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('$input.item');
	});

	it('forbids rewriting production AI agent prompts or parameters', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('Do not modify existing production node parameters');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('do not rewrite the AI Agent prompt');
		expect(EVAL_SETUP_AGENT_PROMPT).toContain(
			'cannot be made standalone with topology-only eval setup',
		);
	});

	it('includes validation instructions after patching', () => {
		expect(EVAL_SETUP_AGENT_PROMPT.toLowerCase()).toContain('re-read');
		expect(EVAL_SETUP_AGENT_PROMPT.toLowerCase()).toContain('validate');
	});

	it('instructs fallback to nodes tool for schema lookup', () => {
		expect(EVAL_SETUP_AGENT_PROMPT).toContain('nodes');
		expect(EVAL_SETUP_AGENT_PROMPT.toLowerCase()).toMatch(/schema|get-schema/);
	});
});
