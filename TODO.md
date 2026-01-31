# TODO (MVP)

## For Monday
	- [ ] subnodes. Planning agent needs to be aware of subnodes and how to configure them
		- [ ]planning agent might need to get node types to pass them to coding agent.
	- [ ] builderHints now that are specific to code format need to be adjusted for planning agent
	- [ ] finish generating pin data
	- [ ] optimize new prompts again
	- [ ] rewrite .schema.ts files as .js to be able to load at runtime

## workflow-sdk
- [ ] Better clarify/test how output data maps to expressions in types and referenced
- [ ] why is model and other subnodes accepting arrays?

## agent
- [ ] test out disabling agent static prompt warning
	- [ ] improve understanding of expressions. often hitting MISSING_EXPRESSION_PREFIX.
- [ ] Add relevant best practice pieces, esp to better handling (let evals guide this)
	- [ ] a lot of pairwise seem to be about preferring certain nodes, how can we add that as part of the node definition
	- [ ] add section for pref of other nodes over code node
	- [ ] best practices:
		- [ ] reasonable defaults? using placeholder for parameters like Country code in packages/@n8n/ai-workflow-builder.ee/eval-results-01-26/opus-one-shot-test-dataset-01-26/example-002-00a012f0
		- [ ] Best practices documentation recommends using Wait nodes and batching options to avoid hitting API rate limits.
			- "The workflow uses returnAll: true for Gmail without batching." packages/@n8n/ai-workflow-builder.ee/eval-results-01-26/opus-one-shot-test-dataset-01-26/example-001-f1b1d9b7
- [ ] Make sure conversation history is included in request
- [ ] investigate failed syntax in prompt in this example packages/@n8n/ai-workflow-builder.ee/eval-results/sonnet-one-shot-all/example-005-05fd23ad. also packages/@n8n/ai-workflow-builder.ee/eval-results/sonnet-one-shot-all/example-007-ca13700c
- [ ] handling of large workflows
	- [ ] context limits with many types of nodes?
- [ ] improve understanding of items

## iteration
- [ ] test iteration, inserting nodes in between
- [ ] strip away previous contexts from previous messages.
- [ ] add in execution schema/expression data, whatever we are passing now
- [ ] compacting

## ready to release
- [ ] review security implications of Function. Use task runner for mvp?
	- [maybe-later] parsing AST
- [ ] security concerns of loading js from
- [ ] pull in master
- [ ] remove FE changes
- [ ] collapse <planning> in FE
- [ ] integrate with planning agent
- [ ] How to do we store the template workflows? zip folder
- [ ] Review PR (lots of AI generated code that I did not look at)
- [ ] Remove logging from agent. lots of logging for debugging.
- [ ] Add some tracking if code parsing or generation step fails in prod.
- [ ] put Behind a/b test.
- [ ] test how unknown nodes handled?
- [ ] fix up sticky sizing and positioning to cover nodes
- [ ] caching the requests. make sure system prompt + caching the type requests
- [ ] Update telemetry and prompt viewer app to support the code and workflow generated
- [ ] Remove extraTypeContext if not used
- [ ] Parameters?: should not be optional in types if some key in there is not optional
- [ ] remove sdk-api in worklfow-sdk
- [ ] Add commands for validate parse code
- [ ] remove generated src/types files

## evaluate
- [ ] test out prompt with/without sdk reference [maybe-later]
- [ ] Evaluate with thinking enabled for each model. uses <planning> now [maybe-later]

## Nice to haves / tech debt
- [ ] export and use rlc()
- [ ] @tool=true in invalid_parameter warnings
- [ ] make display options more clear in node types @displayOption.show { node: ["operation"]}
- [ ] move node-specific builder validations to node level rather than at sdk level
- [ ] format the workflows into multi lines. might make it easier for workflow to handle parsing errors better
- [ ] remove / @ts-nocheck - Generated file may have unused from generated files
- [ ] Test more of the template library
- [ ] Make it more clear that SDK api file is for LLM consumption. To avoid other engineers adding unnecessary types to it, confusing the agent.
- [ ] rename one shot agent across code base
- [ ] update workflow() to support object init { id, settings }
- [ ] move generated test files for committed workflows to same folder.
- [ ] allow adding node defaults when generating workflows
- [ ] Add builderHint
		- [ ] for example promptType: 'auto'/'define'
		- [ ] use expressions for agent
		- [ ] simplify output changes?
		- [ ] memory key in chat node
		- [ ] schedule node cron or multiple intervals
- [] Fallback model in agent? how to represent that effectively. builderHint to true.
- [] Make the nodes search more fuzzy
{
  toolCallId: 'toolu_01RGtGMG78Wb6jX9HDpqHpvq',
  args: { queries: [ 'vector store insert', 'vector store load' ] }
}
- [] Support switch case fallback connection (.onFallback)
- [ ] Add more error branch workflows tests [maybe-later]
- [ ] merge() abstraction? or split out merge into separate functions? so its easier to understand [maybe-later]- [ ] create custom node parameter discriminators by output type (simplify in gmail node) [maybe-later] for now use builder hint
- [ ] Support switch case fallback connection (.onFallback) [maybe-later]
- [ ] Add more programmatic validations: [based-on-evals]
		- [ ] chat memory issue
		- [ ] expression without '='
		- [ ] invalid expression syntax
		- [ ] .json.key references are correct based on output data
		- [ ] .json is used when referencing data in expressions or code node
		- [ ] invalid .item or .all keys in code nodes based on mode
		- [ ] optional warning for code node?

## Future improvement
- [ ] Add system message validation for Toolagent and no tools validation
- [ ] New validation: For tool, should use $fromAI in multi orchestrator workflow
- [ ] New validation: Respond to webhook only if web hook node is attached and configured correctly
- [ ] when generating json -> code, add "nodes" to sticky() so that llm understands connection to nodes
- [ ] named branches support (switch /text classifier / if). onCase('case') instead of onCase(0)
- [ ] use random generator for pin data
- [ ] RLC Support
- [ ] generate pin data using a random generator, rather than ai.
- [ ] Support templates as examples
- [ ] Add support for expr() functions that narrow down types for context. Basically llm should generate code rather than strings.
- [ ] support runOnceForAllItems and other code node functions. move to code node type file.
- [ ] AI still generates position unnecessarily. we should remove this and generate these seperately.
	- [ ] Positions should be calculated programmatically. When making edits, we should programmaticaly calculate where all the nodes should go.
- [ ] Add text editing tools support, to improve iteration
- [ ] fine tuning model with sdk code
- [ ] abstract away rlc() -> { _rlc: true, mode, value} resource locator component
