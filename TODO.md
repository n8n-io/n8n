# TODO (MVP)

## workflow-sdk
- [ ] Add more error branch workflows
- [ ] Better clarify how output data maps to expressions in types and referenced
- [ ] better interface? onTrue() onFalse() for ifElse. onCase for switchCase. what to do with merge?
	- [ ] split out merge into separate functions? so its easier to understand
- [ ] create custom node parameter discriminators by output type (simplify in gmail node)
- [ ] Add examples with switch case fallback connection

## agent
- [ ] transpile current workflow to code
- [ ] fix evaluation runs to include error logs
- [ ] test out prompt with/without sdk reference
- [ ] build out new evaluation suites for this type of agent
- [ ] Test opus again with simplified prompt
- [ ] Add relevant best practice pieces, esp to better handling (let evals guide this)
	- [ ] a lot of pairwise seem to be about preferring certain nodes, how can we add that as part of the node definition
	- [ ] add section for pref of other nodes over code node
- [ ] Make sure conversation history is included in request
- [ ] Evaluate with thinking enabled for each model
- [ ] in programmatic checks validation step, only skip warnings if repeated for the same node
- [ ] investigate failed syntax in prompt in this example packages/@n8n/ai-workflow-builder.ee/eval-results/sonnet-one-shot-all/example-005-05fd23ad. also packages/@n8n/ai-workflow-builder.ee/eval-results/sonnet-one-shot-all/example-007-ca13700c
	- [ ] Also why are programmatic evals showing it has no expression, even though it does
- [ ] strip away previous contexts from previous messages
- [ ] fix new code llm judge, review how it works
- [ ] Add more programmatic validations:
		- [ ] chat memory issue
		- [ ] invalid expression syntax
		- [ ] .json.key references are correct based on output data
		- [ ] .json is used when referencing data in expressions or code node
		- [ ] invalid .item or .all keys in code nodes based on mode
		- [ ] optional warning for code node?

## ready to release
- [ ] deploy agent to test instance
- [ ] How to do we store the template workflows? Do we commit to repo? Or keep fetching from API? Template creators might not be happy. If we keep fetching from API they might change or get deleted. Maybe a zip folder in repo that's expanded before running tests?
- [ ] Review PR (lots of AI generated code that I did not look at)
- [ ] Remove logging from agent. lots of logging for debugging.
- [ ] Add some tracking if code parsing or generation step fails in prod.
- [ ] Figure out how to integrate/release it. Behind a/b test?
- [ ] add in execution schema/expression data, whatever we are passing now
- [ ] format the workflows into multi lines. might make it easier for workflow to handle parsing errors better
- [ ] test how unknown nodes handled?
- [ ] when generating json -> code, add "nodes" to sticky() so that llm understands connection to nodes
- [ ] fix up sticky sizing and positioning to cover nodes
- [ ] test out iteration, inserting nodes in between
- [ ] Update telemetry and prompt viewer app to support the code and workflow generated
- [ ] Refactor interface to simplify branching interface??

## Nice to haves / tech debt
- [ ] Test more of the template library
- [ ] refactor code gen to use plugin arch for composites
- [ ] Make it more clear that SDK api file is for LLM consumption. To avoid other engineers adding unnecessary types to it, confusing the agent.
- [ ] rename one shot agent across code base
- [ ] update workflow() to support object init { id, settings }
- [ ] clean up old codegen impl
- [ ] move generated test files for committed workflows to same folder.
- [ ] allow adding node defaults when generating workflows
- [ ] Add builderHint (for example promptType: 'auto'/'define')

## Future improvement
- [ ] use random generator for pin data
- [ ] RLC Support
- [ ] Support branching for weird nodes out there with multiple inputs or outputs, that we don't support now.
- [ ] generate pin data using a random generator, rather than ai.
- [ ] Support templates as examples
- [ ] Add support for expr() functions that narrow down types for context. Basically llm should generate code rather than strings.
- [ ] support runOnceForAllItems and other code node functions. move to code node type file.
- [ ] AI still generates position unnecessarily. we should remove this and generate these seperately.
	- [ ] Positions should be calculated programmatically. When making edits, we should programmaticaly calculate where all the nodes should go.
- [ ] Add text editing tools support, to improve iteration

## Done
- [X] Add programmatic validation similar to current agent
- [X] prompt optimization per model
- [X] get workflow-sdk to support roundtrip test of a lot of our template library
- [X] refactor code generation to simplify implementation, with learnings from POC
- [X] Add more examples for more complex flows (like loops or multi level orchestrator) to prompt
- [X] Split node types by resource operation into files. less input tokens, faster, more accurate. Query by operation/resource.
- [X] support $fromAI in types. Add example.
- [X] Support passing nodes to sticky function
- [X] test out more edge cases
- [X] rerun evaluations, get to parity with current agent
- [X] Rename ifBranch to ifElse, update branches with clearer naming.
- [X] run evaluations against Opus


# Prompts to test
Search google drive for files, generate pin data for it and extract important fields using set node

get issues from linear and triage them as bug or not, use switch node, and update them with tags. if linear errors, send message to slack. mock linear nodes with pin data
get emails from gmail inbox, search body for "test" or "prod", use switch between types and send message to slack. add pin data for services. if gmail errors, also send message to slack with error
