# TODO (MVP)
[] refactor code generation to simplify implementation, with learnings from POC
[] get workflow-sdk to support a lot of our template library
[] Add more examples for more complex flows (like loops or multi level orchestrator)
[] rerun evaluations
[] Rename ifBranch to ifElse (nice to do)
[] Split node types by resource operation into files. less input tokens, faster, more accurate. Query by operation/resource.
[] support $fromAI in types. Add example.
[] Better clarify how output data maps to expressions in types and referenced
[] deploy agent to test instance
[] Add relevant best practice pieces, esp to better handling
	[] a lot of best practices seem to be about prefering certain nodes, how can we add that as part of the node defintion
[] How to do we store the template workflows? Do we commit to repo? Or keep fetching from API? Template creators might not be happy. If we keep fetching from API they might change or get deleted.
[] Review PR (lots of AI generated code that I did not look at)
[] Make sure conversation history is included in request
[] Make it more clear that SDK api file is for LLM consumption. To avoid other engineers adding unnecessary types to it, confusing the agent.
[] Remove logging from agent. lots of logging for debugging.
[] Add some tracking if code generation step fails in prod.
[] Figure out how to integrate/release it. Behind a/b test

Future improvement
[] Support passing nodes to sticky function
[] Update prompt viewer app to support the code generated
[] Support branching for weird nodes out there with multiple inputs or outputs, that we don't support now.
[] generate pin data using a random generator, rather than ai.
[] Add templates
[] Add support for expr() functions that narrow down types for context. Basically llm should generate code rather than strings.
[] clarify runOnceForAllItems and other code node functions. move to code node type file.
[] AI still generates position unnecessarily. we should remove this and generate these seperately.
	[] Positions should be calculated programmatically. When making edits, we should programmaticaly calculate where all the nodes should go.
[] Add text editing tools support, to improve iteration


# Prompts to test
Search google drive for files, generate pin data for it and extract important fields using set node

get issues from linear and triage them as bug or not, use switch node, and update them with tags. if linear errors, send message to slack. mock linear nodes with pin data
get emails from gmail inbox, search body for "test" or "prod", use switch between types and send message to slack. add pin data for services. if gmail errors, also send message to slack with error
