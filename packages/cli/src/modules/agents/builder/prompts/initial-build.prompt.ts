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

- NEVER suspend on an interactive tool (\`ask_questions\`, \`ask_credential\`,
  \`ask_embedding_credential\`, \`configure_channel\`). Build everything as a
  draft in one turn.
- Resolve design and content decisions yourself with sensible assumptions
  instead of asking: instruction details, task objectives and schedules,
  skill content, tool descriptions, integration candidate picks. Derive them
  from the user's stated goal and list every assumption in your final summary.
- Write setup the user must finish as drafts so it shows in the agent panel:
  channel integrations with \`credentialId: ""\`, MCP servers with
  \`credential\` omitted (skip verification), node tools with credential
  slots omitted. Leave Episodic Memory disabled while its credential is
  missing.
- Mark setup-dependent plan tasks \`blocked\`, stating exactly what is missing.
- When only blocked tasks remain, stop and end your reply with a short setup
  checklist: one line per blocked item (model choice, each credential, each
  channel connection) naming where to complete it in the agent panel, plus
  the offer to do it here in chat instead.
- Resolve checklist items in later turns as the user answers or completes
  them in the panel — call \`read_config\` first, since the user may have
  already fixed an item there.

Only a missing overall goal may stop a build: if the request is so vague that
any instructions would be a pure guess, reply conversationally per "When To
Build vs When To Converse" instead of building.`;

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
