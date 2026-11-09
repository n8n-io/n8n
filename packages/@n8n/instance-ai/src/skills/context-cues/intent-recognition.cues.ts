import type { ContextCueSet } from '@n8n/agents';

/**
 * Context cues for the `intent-recognition` skill. The skill makes its
 * routing decision in the model call right after it loads, so retrieval scores
 * these cues only in that call (`on-load`). Later steps of the turn
 * (build, credential setup) get none of them.
 */
export const INTENT_RECOGNITION_CUES: ContextCueSet = {
	skillId: 'intent-recognition',
	delivery: 'on-load',
	cues: [
		{
			id: 'explicit-agent-no-ask-user',
			text: 'An explicit Agent request decides the anchor. Load `agent-builder` next, with no `ask_user` call before it, and do not choose services, tools, topics or schedules for it: Agent Builder asks those questions.',
			appliesWhen:
				'The user explicitly asks to build an agent, assistant or bot that does something.',
			fixes:
				'Asked setup questions or offered a workflow before handing an explicit Agent request to agent-builder.',
			origin: '#42331',
			evalCases: [],
		},
		{
			id: 'explicit-agent-no-silent-workflow',
			text: 'Do not silently build a workflow, or an AI Agent step inside a workflow, for an explicit Agent request. You may mention a simpler workflow, but switch only when the user picks it.',
			appliesWhen:
				'The user asks for an agent, but a scheduled or fixed workflow could also do the same job.',
			fixes: 'Replaced a requested Agent with a scheduled workflow or an embedded AI Agent node.',
			origin: '#38329',
			evalCases: [],
		},
		{
			id: 'chat-trigger-is-not-an-agent',
			text: 'Never satisfy an agent-anchored request with a Chat Trigger + AI Agent node workflow. A Chat Trigger workflow is right when chat only starts a fixed graph (paste an input, run fixed steps, reply). It is also right when the user explicitly asks for a workflow: build that workflow and do not ask. An explicit Agent request still goes to `agent-builder`.',
			appliesWhen:
				'The user asks for an agent, assistant or bot that people chat with, and does not ask for a workflow or name its nodes.',
			fixes: 'Built Chat Trigger + AI Agent node workflows for chat assistants.',
			origin: '#34086',
			evalCases: [],
		},
		{
			id: 'close-pair-chat-workflow',
			text: 'When the user names a workflow but people message it over time and each reply needs judgment or memory, it fits the Agent / chat-workflow close pair: ask whether it should hold a conversation and decide its replies, or run fixed steps on every message, before you build either. Do not ask when the user names the nodes (Chat Trigger, AI Agent node), pastes a workflow, or explicitly asks for a workflow with a chat-triggered agent: build that workflow.',
			appliesWhen:
				'The user asks for a workflow that talks to customers, shoppers or users in chat, DMs or a messaging channel.',
			fixes: 'Built a chat workflow when the user needed an Agent, or the reverse, without asking.',
			origin: '#41435',
			evalCases: [],
		},
		{
			id: 'degenerate-shell',
			text: 'A workflow that is only a trigger plus one AI Agent step doing all the work is an Agent in a workflow shell. Re-anchor to an Agent (a scheduled duty becomes a task on it).',
			appliesWhen:
				'A recurring or on-demand duty is open-ended (research, investigate, decide what matters), and a workflow would only add a schedule and a destination.',
			fixes: 'Shipped trigger + single AI Agent node workflows for delegated duties.',
			origin: '#34200',
			evalCases: [],
		},
		{
			id: 'schedule-is-anchor-neutral',
			text: 'A schedule alone does not make a workflow: Agents run scheduled tasks. Classify by the body of each run: fixed steps → workflow; judgment each run → Agent task.',
			appliesWhen:
				'The request runs every day, week, morning or on a schedule and does something each time.',
			fixes: 'Routed scheduled judgment work to workflows because of the cron trigger.',
			origin: '#34200',
			evalCases: [],
		},
		{
			id: 'unreachable-report-is-agent',
			text: 'A one-off question or report about systems you cannot query directly (private tracker, wiki, CRM) is not out-of-scope. When answering needs judgment over those systems, build an Agent with their tools that the user can ask again; do not offer "a workflow or I do it myself".',
			appliesWhen:
				'The user asks how something is progressing or for a status report using data in their issue tracker, wiki, CRM or other internal tool.',
			fixes:
				'Built a manual-trigger workflow with one embedded agent, or refused, for on-demand reports.',
			origin: '#34200',
			evalCases: [],
		},
		{
			id: 'trigger-my-workflow',
			text: 'Before you read "run/trigger my X" as a build, call `list_workflows`: a workflow name can contain a build verb ("X — Create"), and a link to a service is an input value, not a request to build an integration.',
			appliesWhen:
				'The user asks to run, trigger or execute a workflow, or names something that could be an existing workflow.',
			fixes: 'Started a new build when the user wanted to run an existing workflow.',
			origin: '#38073',
			evalCases: [],
		},
		{
			id: 'one-off-effect-is-workflow',
			text: 'A one-time task with an external effect (export, copy, migrate, backfill) is workflow-anchored, not out-of-scope. Load `one-off-operations` and pass `executionIntent: "one-off"` to `workflow_builder_build_workflow`. Users rarely say "one-off": judge by shape (data in hand, imperative, no repeat words).',
			appliesWhen:
				'The user asks once to export, copy, move, import, migrate or backfill data into another system, with no schedule or trigger.',
			fixes: 'Answered or refused one-time data operations instead of running them once.',
			origin: '#36184',
			evalCases: [],
		},
		{
			id: 'one-off-content-is-out-of-scope',
			text: 'A one-time content task you can do yourself (summarize, translate, draft this once) is out-of-scope: do it directly, do not build an automation.',
			appliesWhen:
				'The user asks to summarize, translate, rewrite or draft a piece of text one time.',
			fixes: 'Built a workflow with one LLM step for a one-time text task.',
			origin: '#33843',
			evalCases: [],
		},
		{
			id: 'split-on-lifecycle-only',
			text: 'Split a request only on separate lifecycles (unrelated triggers, audiences or cadences), which one plain sentence can contain. Never split on a list of tools or steps.',
			appliesWhen:
				'The request lists many tools, steps or separate things to automate in one message.',
			fixes: 'Split one agent into parts per tool, or merged two automations into one build.',
			origin: '#33843',
			evalCases: [],
		},
		{
			id: 'existing-agent-in-editor',
			text: 'An agent opened in the editor that the user asks to change is agent-anchored: build that agent with `agent-builder`, even when a workflow could do it, and even when a capability is unsupported.',
			appliesWhen:
				'An existing agent is open in the editor, no workflow is in context, and the user asks it to also do something, or to change its tools, model, instructions or tasks.',
			fixes: 'Started a workflow build to add a capability to an open agent.',
			origin: '#37479',
			evalCases: [],
		},
		{
			id: 'mixed-context-ask-target',
			text: 'When both an agent and a workflow are in context and the change could belong to either, ask which one. Do not assume the workflow.',
			appliesWhen:
				'Both an agent and a workflow are open or in context, and the user asks to add or change something without naming which.',
			fixes: 'Changed the workflow when the user meant the agent.',
			origin: '#37479',
			evalCases: [],
		},
		{
			id: 'unsupported-agent-channel',
			text: 'Before classifying an Agent on a named channel (Instagram, Messenger…), call `agent-context` with `type: "capabilities"`. If the channel is absent, say so and offer an `agent-entrypoint` bridge workflow or a supported channel. Do not build a standalone workflow, add the platform as a tool, or claim it is configured.',
			appliesWhen:
				'The user wants an agent that replies on a specific messaging platform or channel such as Instagram, Messenger, WhatsApp or Telegram.',
			fixes: 'Faked unsupported agent channels with workflow nodes.',
			origin: '#37479',
			evalCases: [],
		},
		{
			id: 'mid-build-recurring-duty-is-task',
			text: 'A recurring duty added during an Agent build ("also send me a Monday summary") is a scheduled task on that agent, not a new workflow. A notification on completion is a new tool on it.',
			appliesWhen:
				'During an agent build, the user asks it to also do something every week, day or on a schedule, or to post updates.',
			fixes: 'Spawned scheduled workflows next to an agent being built.',
			origin: '#34200',
			evalCases: [],
		},
		{
			id: 'clarify-in-plain-terms',
			text: 'Until the anchor is chosen, ask in plain terms: the result, once now or on a repeat, and whether people chat with it. Do not say workflow or Agent, and do not ask about triggers, nodes or steps.',
			appliesWhen:
				'The request is vague, such as flag what is important, handle things, or take action depending on the result, and you need to ask what it should do.',
			fixes: 'Asked users to choose between "workflow" and "Agent" or about trigger nodes.',
			origin: '#41435',
			evalCases: [],
		},
		{
			id: 'role-noun-is-not-enough',
			text: '"Agent", "assistant", "bot", "workflow" or "automate" inside a task description, a long step list, or AI use does not decide the anchor. Classify the shape. Classify-then-route is a workflow unless the model chooses each next action from earlier results.',
			appliesWhen:
				'The request uses words like assistant, bot or AI, or describes a long multi-step process with classification and routing.',
			fixes: 'Labelled long or AI-flavoured pipelines as agents.',
			origin: '#33843',
			evalCases: [],
		},
		{
			id: 'workflow-tool-only-for-procedures',
			text: 'Agent tools are direct node tools by default. Use a workflow tool only when one tool call must run an ordered multi-node procedure, or the user wants it reusable outside the agent; then build the workflow first and set `embeds_other: true`.',
			appliesWhen:
				'An agent needs actions such as looking up, updating or creating records, or the user wants some actions also callable elsewhere.',
			fixes: 'Wrapped single node actions in workflow tools.',
			origin: '#35823',
			evalCases: [],
		},
	],
};
