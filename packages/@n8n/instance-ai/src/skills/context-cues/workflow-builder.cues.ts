import type { ContextCueSet } from '@n8n/agents';

/**
 * Context cues for the `workflow-builder` skill. They are not in
 * `SKILL.md`: the runtime retrieves each one when the current step matches its
 * `appliesWhen`. Record the eval cases that fail without a cue after an
 * ablation run, and delete cues that no eval needs.
 */
export const WORKFLOW_BUILDER_CUES: ContextCueSet = {
	skillId: 'workflow-builder',
	cues: [
		{
			id: 'if-branches-on-builder',
			text: 'Do NOT wire branches as standalone statements after `export default` (`ifNode.onTrue(...)` on its own line): those calls never reach the builder.',
			appliesWhen:
				'Writing workflow SDK code with an IF, Switch or Filter node and connecting its true/false branches.',
			fixes: 'IF branches written after `export default` were dropped from the saved graph.',
			origin: '#32844',
			evalCases: [],
		},
		{
			id: 'filter-is-not-an-action',
			text: 'An IF or Filter only selects items. When the user asks to archive, update, send or create only matching items, wire the action node on the matching branch, and give an IF both outputs.',
			appliesWhen:
				'The user wants to archive, update, send, label or create only the items that match a condition.',
			fixes: 'Builds filtered items but never performed the requested side effect.',
			origin: '#33530',
			evalCases: [],
		},
		{
			id: 'zero-based-indices',
			text: 'Switch outputs and Merge inputs are zero-based: `.onCase(0, …)` and `.input(0)` are the first.',
			appliesWhen: 'Wiring Switch node outputs or Merge node inputs in workflow code.',
			fixes: 'Sources wired to `.input(1)` as the first Merge input.',
			origin: 'unknown',
			evalCases: [],
		},
		{
			id: 'on-error-one-handler',
			text: '`.onError()` takes one handler, not an array. Call it once for each handler.',
			appliesWhen: 'Adding error output handling or error branches to a node in workflow code.',
			fixes: 'Passed an array to `.onError()`, which lost the error routes.',
			origin: '#38254',
			evalCases: [],
		},
		{
			id: 'zero-items-end-branch',
			text: 'Zero items end a branch. Do not add `alwaysOutputData: true` or empty-check IF gates, unless a digest or alert must still send when upstream is empty.',
			appliesWhen:
				'Handling the case where a search, query or fetch returns no items or an empty result.',
			fixes: 'Added needless empty-check IF gates and `alwaysOutputData`.',
			origin: '#33530',
			evalCases: [],
		},
		{
			id: 'always-output-data-empty-json',
			text: 'When a digest or alert must send on empty input, set `alwaysOutputData: true` on every node that can emit zero items before it; the result is one item with empty json (`{}`), so the formatter must filter out empty-json items before counting rows.',
			appliesWhen:
				'A digest, report or alert must still be sent when there is nothing new or no rows were found.',
			fixes: 'Digests reported one row when upstream returned nothing.',
			origin: '#33530',
			evalCases: [],
		},
		{
			id: 'execute-once',
			text: 'Set `executeOnce: true` on a node that receives many items but must run once (summary notification, report, shared-context fetch). Duplicate notifications mean it is missing.',
			appliesWhen:
				'Sending one summary message, report or notification after processing many items, or duplicate notifications were sent.',
			fixes: 'Summary notifications were sent once for each item.',
			origin: '#31412',
			evalCases: [],
		},
		{
			id: 'first-is-not-per-item',
			text: "Do not use `.first()` or `$input.first()` for per-item data: every item then reuses item 0. Use `$('Node').item.json`.",
			appliesWhen:
				'Writing expressions that reference data from an earlier node for each item, or every item got the same value.',
			fixes: 'Every item reused the first item value through `.first()`.',
			origin: '#31660',
			evalCases: [],
		},
		{
			id: 'insert-node-replaces-payload',
			phase: 'editing',
			text: "Inserting a write/create/send node into A→B replaces what B receives with that node's API response. Branch it in parallel, move it upstream, or make B read `$('Data Node')`.",
			appliesWhen:
				'Editing an existing workflow to insert a new create, write, log or send node between two connected nodes.',
			fixes: 'An inserted create node replaced the downstream payload with API metadata.',
			origin: '#36184',
			evalCases: [],
		},
		{
			id: 'polling-dedupe',
			requiresAny: [
				'n8n-nodes-base.gmailTrigger',
				'n8n-nodes-base.microsoftOutlookTrigger',
				'n8n-nodes-base.rssFeedReadTrigger',
				'n8n-nodes-base.emailReadImap',
			],
			text: 'A polling trigger (Gmail, Outlook) that feeds a create/write action can return the same item again. Mark each item handled, or record handled ids in a Data Table and skip ids already seen. Check the id before creating, and record it only after the create succeeds.',
			appliesWhen:
				'A polling trigger such as Gmail, Outlook or an RSS feed starts a workflow that creates records, tickets or rows.',
			fixes: 'Polling triggers created duplicate records for re-polled items.',
			origin: '#37436',
			evalCases: [],
		},
		{
			id: 'digest-reads-stored-rows',
			text: 'A period summary ("weekly digest") must read that period\'s rows back from where the workflow stores them, and its cadence comes from the schedule, never from `$now.weekday == N`.',
			appliesWhen:
				'Building a daily, weekly or monthly summary or digest of items collected over time.',
			fixes: 'Weekly summaries used only the current run, or gated on `$now.weekday`.',
			origin: '#33530',
			evalCases: [],
		},
		{
			id: 'normalize-free-text',
			text: 'When Code nodes compare free-text human values ("≈ $12,500", "1.5k", "ASAP"), normalize first and give every classifier a fallback bucket.',
			appliesWhen:
				'A Code node parses, classifies or compares free-text values such as amounts, priorities or dates written by people.',
			fixes: 'Code-node classifiers matched one phrasing and misrouted the rest.',
			origin: 'unknown',
			evalCases: [],
		},
		{
			id: 'mock-output-raw-json',
			text: 'SDK node mock `output` items are raw `$json` objects: write `[{ total: 42 }]`, never `[{ json: { total: 42 } }]`.',
			appliesWhen: 'Writing mock output or sample data for nodes in workflow SDK code.',
			fixes: 'Mock output wrapped items in `{ json }`, which broke expression checks.',
			origin: 'unknown',
			evalCases: [],
		},
		{
			id: 'mock-output-all-fields',
			text: 'Mock `output` must include every field later read by `$json` expressions, including optional trigger fields used in filters (Slack `subtype`, `bot_id`).',
			appliesWhen:
				'Writing mock output for a trigger or node whose fields are read by later expressions, or verification reports a missing field.',
			fixes: 'Expression-path validation failed on optional fields missing from mocks.',
			origin: '#31340',
			evalCases: [],
		},
		{
			id: 'mock-output-cardinality',
			text: 'When a real response is a list (HTTP list endpoints, search results, a top-level array), declare at least two mock items so single-item assumptions fail in verification.',
			appliesWhen:
				'Writing mock output for an HTTP request, search or list endpoint that returns many results.',
			fixes: 'Single-item mocks hid list-vs-single bugs until the first real run.',
			origin: '#32144',
			evalCases: [],
		},
		{
			id: 'webhook-envelope-shape',
			text: "Webhook mocks for third-party platforms use that platform's documented envelope. AI/voice tool-call webhooks nest arguments in `body.message.toolCalls[0].function.arguments`. n8n expressions cannot read a property named `arguments` in any form, because the expression sandbox blocks it. Read `function.arguments` in a Code node and pass the values on as normal fields.",
			appliesWhen:
				'A Webhook trigger receives calls from a third-party platform such as a voice agent, Stripe or GitHub, and needs mock data.',
			fixes: 'Invented flat webhook mocks verified green, then parsed empty on real calls.',
			origin: 'unknown',
			evalCases: [],
		},
		{
			id: 'outside-payload-contract',
			text: 'When an outside system calls the workflow (a voice or chat platform, a form tool, a partner webhook) and the request does not give its field names, tool names or value formats, do not invent them. Ask the user for the payload, or for a sample call, before you write the nodes that read it. Match the case of field names exactly: `$json.date` and `$json.Date` are different fields. Verify often warns when an expression reads a field that no input item has, but it does not check every node, so do not rely on it.',
			appliesWhen:
				'A Webhook, Form or chat trigger receives data from an outside system, and later nodes read fields, tool names or values from it.',
			fixes:
				'The builder guessed argument names, tool names and date formats for a voice agent backend, so scoring, routing and booking read empty values.',
			origin: 'r11 voice-agent-crm-backend, form-entry-to-excel',
			evalCases: ['voice-agent-crm-backend', 'form-entry-to-excel'],
		},
		{
			id: 'split-wrapped-arrays',
			text: 'An HTTP Request or API node that returns one object with a list inside (`{ orders: [...] }`, `{ data: [...] }`) outputs one item, not one item per entry. Add a Split Out node on that field before nodes that work on each entry, and read entry fields from the Split Out output.',
			appliesWhen:
				'A node fetches a list from an API, and later nodes act on each entry or read entry fields such as `$json.id`.',
			fixes:
				'Per-order nodes read `$json.id` from a `{ orders: [...] }` response, which was undefined.',
			origin: 'r11 loop-anti-nested-batches',
			evalCases: ['loop-anti-nested-batches'],
		},
		{
			id: 'expression-sandbox-limits',
			text: "n8n expressions block `prototype`, `constructor` and any property named `arguments`. To check for a key, write `'key' in $json` or `$json.key !== undefined`. Put anything more complex in a Code node.",
			appliesWhen:
				'Writing an n8n expression that checks keys, calls prototype methods, or reads a property named `arguments`.',
			fixes:
				'An expression used `Object.prototype.hasOwnProperty.call`, which the sandbox rejects.',
			origin: 'r11 carry-accumulated-facts',
			evalCases: ['carry-accumulated-facts'],
		},
		{
			id: 'pinned-model-ids',
			text: 'When the user names a model version (for example Gemini 3 Flash), set the pinned model ID for that version. Do not use a moving alias such as `-latest` or `models/gemini-flash-latest`, which can point to a different model.',
			appliesWhen: 'Choosing the model ID for an AI or chat model node.',
			fixes:
				'The builder set `models/gemini-flash-latest` when the user asked for a 3.x Gemini model.',
			origin: 'r11 gemini-model-hint-compliance',
			evalCases: ['gemini-model-hint-compliance'],
		},
		{
			id: 'code-in-reply-fenced',
			phase: 'after-build',
			text: 'When the final reply shows Code node code, put it in a fenced block with its language, for example ```javascript.',
			appliesWhen: 'The final reply includes code from a Code node.',
			fixes: 'The reply showed Code node code without a fenced ```javascript block.',
			origin: 'r11 code-node-syntax-survives-formatting-edit',
			evalCases: ['code-node-syntax-survives-formatting-edit'],
		},
		{
			id: 'openai-output-shape',
			requiresAny: ['@n8n/n8n-nodes-langchain.openAi'],
			text: 'OpenAI node output: v2+ text is `$json.output[0].content[0].text`, v1 is `$json.message.content`, and `json_schema` output is already parsed. Read `knowledge-base/reference/open-ai-output-shape.md` before mapping it.',
			appliesWhen:
				'A workflow uses the OpenAI node and later nodes read its generated text or structured output.',
			fixes: 'Downstream nodes read `$json.text` from OpenAI output.',
			origin: '#32484',
			evalCases: [],
		},
		{
			id: 'anthropic-output-shape',
			requiresAny: ['@n8n/n8n-nodes-langchain.anthropic'],
			text: 'Anthropic node `$json.content` is an array of blocks: read `$json.merged_response` (with Include Merged Response on) or `$json.content.find(c => c.type === "text")?.text`, never `content[0]`, which can be a tool block. See `knowledge-base/reference/anthropic-output-shape.md`.',
			appliesWhen:
				'A workflow uses the Anthropic or Claude node and later nodes read its generated text.',
			fixes: 'Downstream nodes treated Anthropic `$json.content` as a string.',
			origin: '#35850',
			evalCases: [],
		},
		{
			id: 'gemini-output-shape',
			requiresAny: ['@n8n/n8n-nodes-langchain.googleGemini'],
			text: 'Google Gemini node (Message a Model, Simplify Output on) returns one item for each candidate: read the text as `$json.content.parts[0].text`. With Include Merged Response on, read `$json.mergedResponse`. With Output Content as JSON on, the text is a JSON string: parse it before you read fields.',
			appliesWhen:
				'A workflow uses the Google Gemini node and later nodes read its generated text or JSON.',
			fixes:
				'The agent searched the knowledge base for the Gemini output shape or read `$json.text`.',
			origin: 'thread b281879a',
			evalCases: [],
		},
		{
			id: 'python-native-runner',
			text: "Python Code nodes (`language: 'pythonNative'`) define only `_items`, `_item` and `print()`, and allow no imports by default unless the system prompt says otherwise.",
			appliesWhen: 'Writing a Code node in Python.',
			fixes: 'Python Code nodes used helpers or imports that the native runner rejects.',
			origin: '#37083',
			evalCases: [],
		},
		{
			id: 'placeholder-not-wrapped',
			text: "Use `placeholder('hint')` directly as the parameter value. Do not wrap it in `expr()`, objects or arrays.",
			appliesWhen:
				'A node parameter value is unknown and needs a placeholder the user fills in later.',
			fixes: 'Placeholders wrapped in `expr()` were not detected by setup.',
			origin: '#31412',
			evalCases: [],
		},
		{
			id: 'resource-locator-shape',
			text: 'Resource-locator fields use `{ __rl: true, mode, value }`. Use `name` mode with a name the user gave, `list` mode with an empty value and a `cachedResultName` hint only when nothing is known, and never a raw `placeholder()` unless the resource has no options; then use `placeholder("Select <resource>")` as the `value`.',
			appliesWhen:
				'Setting a resource-locator parameter such as a spreadsheet, channel, board, folder, base or document.',
			fixes: 'Resource locators were left empty or held names in `list` mode.',
			origin: '#32940',
			evalCases: [],
		},
		{
			id: 'keep-user-values',
			text: 'Keep concrete values the user gave (URL, channel, table, folder). Placeholder only the unknown part.',
			appliesWhen:
				'The user gave concrete values such as a URL, channel name, email address, sheet or folder for the workflow.',
			fixes: 'Concrete user-provided values were replaced with placeholders.',
			origin: '#32969',
			evalCases: [],
		},
		{
			id: 'keep-node-ids-and-layout',
			phase: 'editing',
			text: 'When editing a saved workflow, keep every `config.id` exactly as `get_workflow_as_code` wrote it, omit `id` on new nodes, and never add `position`.',
			appliesWhen: 'Editing, fixing or extending an existing saved workflow from its code.',
			fixes: 'Edits changed node ids or positions, which reset state and layout.',
			origin: '#36236',
			evalCases: [],
		},
		{
			id: 'unique-webhook-path',
			text: 'Give every Webhook and Form Trigger an explicit, readable `path` specific to this workflow (`acme-contact-form`): paths are shared across the instance.',
			appliesWhen: 'The workflow starts with a Webhook trigger or a Form Trigger.',
			fixes: 'Generic webhook paths collided with other workflows on publish.',
			origin: '#42005',
			evalCases: [],
		},
		{
			id: 'inbound-auth-none',
			text: 'Inbound trigger nodes (Webhook, Form, Chat, MCP Trigger) keep authentication `none` unless the user asks to authenticate inbound traffic.',
			appliesWhen:
				'Configuring a Webhook, Form, Chat or MCP Server trigger that receives inbound requests.',
			fixes: 'The builder added authentication to inbound triggers by default.',
			origin: '#29648',
			evalCases: [],
		},
		{
			id: 'tool-names',
			text: 'Set an explicit snake_case `config.name` on every `tool(...)` node (`get_email`), without a service prefix (`gmail_get_email` is wrong).',
			appliesWhen:
				'Building an AI Agent node with tools attached, such as Gmail, Sheets or HTTP tools.',
			fixes: 'AI tool nodes had default or service-prefixed names.',
			origin: '#33604',
			evalCases: [],
		},
		{
			id: 'data-table-snake-case',
			text: 'Data Table column names are normalized to snake_case (`dayName` → `day_name`). Call `get_data_table_schema` before using a table in code.',
			appliesWhen: 'The workflow reads from or writes to an n8n Data Table.',
			fixes: 'Workflow code used camelCase Data Table columns that do not exist.',
			origin: '#31412',
			evalCases: [],
		},
		{
			id: 'data-table-no-unfiltered',
			text: 'Never query a Data Table unfiltered: rows can hold very large values.',
			appliesWhen: 'Querying or inspecting rows of an n8n Data Table.',
			fixes: 'Unfiltered table queries pulled large rows into the context.',
			origin: '#37489',
			evalCases: [],
		},
		{
			id: 'resolved-credentials-are-connected',
			phase: 'after-build',
			text: 'When `workflow_builder_build_workflow` returns `resolvedCredentialsByNode`, those credentials (including Gateway credits) are connected: do not route them to setup.',
			appliesWhen:
				'A workflow build finished and its result lists credentials that were resolved or attached to nodes.',
			fixes: 'Auto-attached credentials were sent to setup again.',
			origin: '#33802',
			evalCases: [],
		},
		{
			id: 'no-raw-credential-objects',
			phase: 'editing',
			text: 'Never write raw credential objects (`{ id, name }`) in SDK code; replace them with `newCredential()` when editing.',
			appliesWhen:
				'Editing workflow code that already contains credential references on its nodes.',
			fixes: 'Round-tripped code kept raw credential objects.',
			origin: 'unknown',
			evalCases: [],
		},
		{
			id: 'gateway-covered-before-asking',
			text: 'When the user did not name a service for a capability (web search, scraping), discover coverage by calling `search_nodes` with `gatewayCreditsOnly: true` and use a Gateway credits–covered node instead of asking.',
			appliesWhen:
				'The user wants web search, scraping, enrichment or another capability without naming which service to use.',
			fixes: 'The builder asked which search or scraping service to use.',
			origin: '#35019',
			evalCases: [],
		},
		{
			id: 'no-re-ask',
			text: 'Never re-ask an answered, deferred or skipped question. A skip grants no permission to change authentication, delete nodes or expand scope.',
			appliesWhen:
				'The user answered, skipped or deferred an earlier question and the agent is about to ask the user again.',
			fixes: 'The builder re-asked answered or skipped questions.',
			origin: '#32755',
			evalCases: [],
		},
		{
			id: 'debug-before-repair',
			text: 'When the user reports a node erroring, inspect it first via `debugging-executions` before editing anything.',
			appliesWhen:
				'The user reports that a workflow or node fails, errors or does not work and asks to fix it.',
			fixes: 'Repairs changed nodes on a guess without reading the real error.',
			origin: 'unknown',
			evalCases: [],
		},
		{
			id: 'no-dismissing-live-errors',
			phase: 'after-build',
			text: 'Never dismiss a live execution error as a harness or stale-state artifact without re-running.',
			appliesWhen:
				'A workflow execution or verification run returned an error that may look unrelated to the change.',
			fixes: 'Live execution errors were dismissed as harness artifacts.',
			origin: '#32835',
			evalCases: [],
		},
		{
			id: 'capability-honesty',
			text: 'If part of the request is infeasible, never quietly substitute a stand-in: name the gap in the completion summary.',
			appliesWhen:
				'Part of the request cannot be done with the available nodes, credentials or services.',
			fixes: 'Infeasible capabilities were silently replaced with stand-ins.',
			origin: '#33063',
			evalCases: [],
		},
		{
			id: 'missing-resource',
			text: "When a required resource has no options, use `placeholder('Select <resource>')`, or create it only when the user asked and the node has a create operation.",
			appliesWhen:
				'A required resource such as a sheet, channel, table or folder does not exist or has no options to pick from.',
			fixes: 'Builds stalled or invented ids when a required resource did not exist.',
			origin: 'unknown',
			evalCases: [],
		},
		{
			id: 'folder-placement',
			text: "When the new workflow's folder is clear, pass `folderPath` to the build. When editing, read sibling workflows by calling `list_workflows` with `folderPath`, and match their style.",
			appliesWhen:
				'The user mentions a folder or project for the workflow, or the workflow being edited sits in a folder.',
			fixes: 'New workflows landed at the project root when their folder was clear.',
			origin: '#37865',
			evalCases: [],
		},
		{
			id: 'early-setup-not-visible',
			text: 'Early setup calls are tool calls, not visible text: they do not break the rule to keep visible text for the final step.',
			appliesWhen:
				'Starting credential or service connection setup before the workflow build is finished.',
			fixes: 'The visible-output rule stopped early credential setup calls.',
			origin: 'f3f50622cd1',
			evalCases: [],
		},
		{
			id: 'no-auto-publish',
			phase: 'after-build',
			text: "Do not publish the main workflow automatically. Publishing is the user's decision.",
			appliesWhen:
				'The workflow build and verification are done and the workflow could be published or activated.',
			fixes: 'The builder published workflows before the user tested them.',
			origin: 'unknown',
			evalCases: [],
		},
	],
};
