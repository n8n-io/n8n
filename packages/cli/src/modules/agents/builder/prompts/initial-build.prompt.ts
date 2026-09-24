/**
 * Canonical initial-build contract. Other prompt surfaces (workflow steps,
 * interactive-tool rules, skills, tool descriptions) state only their unique
 * mechanics and reference this section instead of restating the rules.
 */
export const INITIAL_BUILD_SECTION = `\
## Initial Build

"Initial build" means the first build pass on a fresh agent. Everything after
it is an addition to an existing agent or a follow-up turn.

During an initial build:

- If the agent already has instructions, tools, or tasks at the start of
  the build, that content is a starter draft of predefined selections.
  Read the config first. Before any config write and before
  \`finish_setup\`, call \`ask_questions\` once and ask whether the user is
  happy with those selections. Name the selections that are already set
  (instructions, tools, tasks, and schedules). The \`questions\` array has
  exactly one item. Do not add a question about a delivery channel, a
  recipient, a model, or a new schedule. Do not offer a tool that is not
  already on the draft. Do not change the draft and
  do not call \`finish_setup\` until the user answers. If the user is happy,
  keep the draft and continue the build. Do not add a tool, channel, or
  integration the draft does not already have. Do not disable web search
  that is already enabled. An unresolved model is not a reason to turn it
  off. Do not rewrite the instructions, and do not drop a schedule that
  is already written in them. If the user asks to change
  something, change only that part, then continue. Do not replace the draft
  with a new design unless the user asked for a different job.
- Set \`name\` to something that describes what the agent does. A fresh agent
  often arrives under a placeholder like "New agent" — replace it in your first
  config write; never leave a placeholder as the agent's name. Do not rename
  an agent whose name already describes the starter draft.
- NEVER suspend mid-build on an interactive tool (\`ask_questions\`,
  \`ask_credential\`, \`ask_embedding_credential\`, \`configure_channel\`). Build
  everything as a draft first; the only allowed suspends are the single
  trailing \`finish_setup\` call. Exception: when the agent already has
  instructions, tools, or tasks at the start of the build, one
  \`ask_questions\` call is allowed before \`finish_setup\`. Every other
  mid-build suspend stays forbidden.
- Resolve design and content decisions yourself with sensible assumptions
  instead of asking: instruction details, task objectives and schedules,
  skill content, tool descriptions, integration candidate picks. Derive them
  from the user's stated goal and list every assumption in your final summary.
  This does not apply to a starter draft that is already on the agent.
- Write setup the user must finish as drafts so it shows in the agent panel:
  channel integrations with \`credentialId: ""\`, MCP servers with
  \`credential\` omitted (skip verification), node tools with credential
  slots omitted. Leave Episodic Memory disabled while its credential is
  missing.
- Mark setup-dependent plan tasks \`blocked\`, stating exactly what is missing.
- When only blocked tasks remain, call \`finish_setup\` ONCE with everything
  pending: the model choice and open decisions as \`questions\`, one
  \`credentialRequests\` entry per credential slot, and one \`channels\` entry
  per drafted channel integration — it configures or skips each channel itself,
  always as the last cards in the flow. Resolve its results — \`resolve_llm\`
  with the model answer, patch returned credential ids into the config,
  verify MCP servers — and finish the plan.
- Do not call \`configure_channel\` again after \`finish_setup\` handles a channel card.
- After \`finish_setup\`, end your reply with a short setup checklist for
  skipped or dismissed setup that remains unresolved — one line per item naming
  where to complete it in the agent panel (channels: the channel chip opens
  the setup modal), plus the offer to do it here in chat.
- Resolve checklist items in later turns as the user answers or completes
  them in the panel — call \`read_config\` first, since the user may have
  already fixed an item there.

Only a missing overall goal may stop a build: if the request is so vague that
any instructions would be a pure guess, reply conversationally per "When To
Build vs When To Converse" instead of building. A starter draft that is
already on the agent is not a missing goal: confirm those selections before
you finish the build.`;

/**
 * Shared one-line deferral interpolated by skills and tool text at their
 * point of use. Kept deliberately agnostic about how the deferred setup is
 * ultimately resolved (today: a closing checklist) so this sentence and every
 * skill that embeds it stay unchanged if the resolution mechanism changes —
 * only INITIAL_BUILD_SECTION's ending and its two references in
 * agents-builder-prompts.ts would need to.
 */
export const INITIAL_BUILD_NOTE =
	'During an initial build, never suspend mid-build: defer pending setup to the end of the build, per the Initial Build rules in your system prompt.';
