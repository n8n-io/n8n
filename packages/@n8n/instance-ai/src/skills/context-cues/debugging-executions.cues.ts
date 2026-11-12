import { type ContextCueSet, whileSkillLoaded } from '@n8n/agents';

/**
 * Context cues for the `debugging-executions` skill and the `model-selection`
 * reference. The skill files keep the procedure and the safety rules. These
 * details for step runs, tool runs, saved runs and model errors arrive only
 * when the step matches.
 */
export const DEBUGGING_EXECUTIONS_CUES: ContextCueSet = {
	id: 'debugging-executions',
	isActive: whileSkillLoaded('debugging-executions'),
	cues: [
		{
			id: 'unreconstructable-context',
			text: 'Entries in `failedExpressions` or `emptyResolutions` tagged `reason: "unreconstructable-context"` are not bugs. They reference `$vars`, `$secrets`, `$response`, `$request`, `$pageCount` or `$ai`, which replay does not rebuild.',
			appliesWhen: 'Reading the resolved parameters of a failed node from debug_execution.',
		},
		{
			id: 'unsaved-manual-run',
			text: 'When the execution id the user is viewing is not found, n8n did not keep that manual run. Say you cannot read it, and ask the user to run it again or offer to run it yourself after you check for write nodes.',
			appliesWhen: 'The execution the user is looking at cannot be found by its id.',
		},
		{
			id: 'replay-refused',
			text: 'A replay is refused when it would re-run a node above the target: an unpinned node the execution never reached, one that failed there, or an unfinished loop. Pick another execution, or tell the user which node would run again.',
			appliesWhen: 'run_workflow_step with reuseExecutionId was refused.',
		},
		{
			id: 'partial-success-repeats',
			text: '"It already ran anyway" holds only for a node that errored and changed nothing. A node that partly succeeded before it failed, such as a send that hit a rate limit, delivers again on a re-run.',
			appliesWhen: 'Deciding whether to re-run a write node that already failed in an execution.',
		},
		{
			id: 'mocked-run-claims',
			text: 'A run with `mockInput` shows only that the node handles the input you gave it. Report the node behaviour, not the workflow behaviour. Mocked input does not make a write node safe: it still runs for real.',
			appliesWhen: 'Running a single node with mockInput, or reporting the result of a mocked run.',
		},
		{
			id: 'tool-step-run-targets-agent',
			text: 'A step run on a tool runs through its Agent: `mockInput` feeds the Agent input, `reuseExecutionId` replays nodes above the Agent, and a chain run runs every node above it for real. Pass the tool arguments in `toolArguments`, named as in its `$fromAI` calls, or a plain string for a single free-text tool.',
			appliesWhen: 'Running an AI tool sub-node of an Agent with run_workflow_step.',
		},
		{
			id: 'ran-through-node-names',
			text: '`ranThroughNodeNames` lists every Agent that can run the tool, not the one that ran it. Do not name a single Agent when it holds more than one.',
			appliesWhen: 'Reporting which Agent ran a tool after a tool step run.',
		},
		{
			id: 'tool-step-run-refusals',
			text: 'A tool with `$fromAI` arguments is refused without `toolArguments`. MCP Client Tool and `@n8n/mcp-registry.*` nodes are refused outright, and so is a tool on two stacked Agents. Run the Agent instead and read the node with `get_execution_node_output`.',
			appliesWhen: 'A step run on a tool or an MCP node was refused.',
		},
		{
			id: 'non-tool-sub-node',
			text: 'A model, memory or embeddings sub-node cannot be step-run. Run the Agent, then read the sub-node with `get_execution_node_output` on that execution.',
			appliesWhen: 'Debugging a language model, memory or embeddings sub-node of an Agent.',
		},
	],
};

export const MODEL_SELECTION_CUES: ContextCueSet = {
	id: 'model-selection',
	isActive: whileSkillLoaded('model-selection'),
	cues: [
		{
			id: 'openrouter-query-by-maker',
			text: 'Keep the requested serving provider and model maker. For Claude through OpenRouter call `search_models({ provider: "openrouter", query: "claude" })`; for OpenAI use `query: "openai"`. Use an exact returned ID; never build OpenRouter IDs from direct-provider names.',
			appliesWhen: 'Choosing a model served through OpenRouter.',
			requiresAny: ['openrouter', 'OpenRouter', 'lmChatOpenRouter'],
		},
		{
			id: 'catalog-is-advisory',
			text: 'Catalog results are advisory and may include previews. Prefer a stable model, report the source and freshness, and say what access remains unverified. Catalog presence does not prove credential access.',
			appliesWhen: 'Recommending a model from search_models catalog results.',
		},
		{
			id: 'simulated-vs-real-run',
			text: 'Use execution records to tell simulated verification from real provider calls; the current credential list does not show it. Keep unsupported causes as hypotheses, and never claim a live fix from mocked verification.',
			appliesWhen:
				'A model works in one run and fails in another, or direct execution and chat behave differently.',
		},
	],
};
