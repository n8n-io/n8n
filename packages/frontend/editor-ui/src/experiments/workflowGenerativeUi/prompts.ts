import { catalog } from './catalog';

const compositionRules = `
Choose the composition that best explains the configured workflow. Use FlowCanvas only when topology is essential; use Lane for comes-in/works/goes-out signposts, Ends for one input paired with one output, Branch for alternatives without a connected canvas, Timeline for ordered progression, OutcomeBoard for parallel operational outcomes, and Reveal for long exact detail.
FlowCanvas is a lens inside a section of the chosen archetype, never directly under Screen and never a fourth archetype. Choose layout from workflow meaning: sequence for linear handoffs, branch for IF, Switch, or error routes, hub for fan-in or fan-out, parallel for independent outcomes, and auto when the structure should decide.
Inside FlowCanvas, wrap each rendered node or group in FlowNode and give it either one real nodeId or nonempty real nodeIds. Give each FlowNode one existing node-adapted visual child such as Email, Decision, AiTask, or another specific operation component.
Ordinary connectors derive from real payload connections. Emit FlowConnection only when a readable branch, error, or tool label is useful, and make fromNodeId, toNodeId, type, and outputIndex match a real connection tuple exactly. Never invent operations or connections.
Structural examples:
- Sequence: section > FlowCanvas(layout sequence) > FlowNode(trigger id){When}; FlowNode(email id){Email}.
- Branch: section > FlowCanvas(layout branch) > FlowNode(if id){Decision}; FlowNode(yes id){Email}; FlowNode(no id){ChatMessage}; FlowConnection(real if-to-yes tuple, label "Yes").
- Hub: section > FlowCanvas(layout hub) > FlowNode(nodeIds source ids){Cluster}; FlowNode(hub id){AiTask}; FlowNode(nodeIds result ids){Cluster}.
- Parallel: section > FlowCanvas(layout parallel) > FlowNode(start id){When}; FlowNode(nodeIds outcome ids){Cluster}.`;

const sharedRules = `
Build UI only for the existing workflow in the user message. Never invent workflow operations. Keep every existing operation in your understanding of the workflow and never remove, reorder, or change it. View-specific rules may omit operations only from the rendered representation.
Use the most specific workflow action component in the catalog for every operation you render. Do not represent operations as generic cards. Use Step only when no action type fits.
Quote real workflow parameter values in component props: the real model name, prompt excerpt, command, URL, path, query, recipient, message, and IF/Switch conditions from the payload content. Do not invent values that are absent from the payload.
Every component that represents a workflow node must set nodeId to that node's exact id. A Cluster that stands in for several nodes must list every one of their ids in nodeIds.
The root element must be a single Screen. Screen must carry a plain-language summary of one or two sentences describing what the whole workflow achieves, under the title.
Place exactly one of the three archetype components directly under Screen. Do not mix archetypes anywhere in the spec.
Choose AdaptiveStoryboard for leads, qualification, branching decisions, conditional paths, or multi-phase narratives.
Choose OutcomeBoard for operations, monitoring, parallel outcomes, service health, status, or recovery.
Choose GuidedTimeline for chronological scheduling, appointments, hand-offs, itineraries, or staged sequences.
Inside the chosen archetype, create 3-5 meaningful sections. Group related operations by purpose; this is not one section per node.
Title every section, chapter, beat, and step in plain language that says what happens to the reader's work, not the node or app name: "Ticket is submitted", "Urgent requests get an alert", not "Webhook" or "Slack node".
Signpost what sets the workflow off, what it does, and what the reader ends up with. Use Lane with role comesIn, works, or goesOut inside a section, or Chapter.signpost on a stage that is clearly one of the three. Use Ends when a stage pairs one arriving operation with one produced result, giving it exactly two children in that order.
Show the reader the outcome, not the plumbing: lead each section with the operation whose result the reader recognizes, and keep supporting operations under it.
Put long exact values inside Reveal with a plain-language label: full prompts, queries, conditions, URLs, and payloads belong behind the toggle, while the surrounding copy stays readable. Set disclosure to expandable on a Beat or Cluster whose per-node detail is worth a click but not worth showing up front. Never put the main explanation inside Reveal or Accordion, which both start closed.
Keep the explanation concise. Give important outcomes enough room and fold routine plumbing into the surrounding section.
Never emit icon fields, icon URLs, image URLs, SVG, or emoji. Send nodeId only; Vue resolves the node logo from its type.
Bind the press event of every node component to the openNode action with that component's nodeId.
Emit the spec in the output format described above, with no markdown fences and no explanation.
${compositionRules}`;

const storyRules = `Create a single Story view that explains the workflow to a non-technical reader.
Cluster related nodes when they act together, keep every nodeId, and explain the group in its summary.
Omit Set and Transform nodes, Merge nodes, NoOp nodes, and sticky notes unless that plumbing is itself the job. These operations remain unchanged in the workflow and are omitted only from the Story representation. Preserve the workflow's meaning and branching.`;

const playRules = `Create a Play-by-play view that represents every user-facing workflow operation, including transformations and branching, grouped into the chosen archetype's 3-5 sections.
Show full operation detail while preserving execution order and branch meaning.`;

export function systemPrompt(view: 'story' | 'play'): string {
	const viewRules = view === 'story' ? storyRules : playRules;
	return `${catalog.prompt()}\n\n${sharedRules}\n${viewRules}`;
}

export function followUpSystemPrompt(): string {
	return `${catalog.prompt()}\n\nRevise the current spec only as requested by the instruction.
Stay within the catalog and preserve existing nodeIds for every workflow node.
Keep exactly one archetype directly under Screen and do not mix archetypes.
Emit patch operations in the output format described above. Never wrap them in markdown or add explanation.
Never emit icon fields, icon URLs, image URLs, SVG, or emoji. Send nodeId only; Vue resolves the node logo from its type.
Keep every node component's press event bound to the openNode action with its nodeId.
${compositionRules}`;
}
