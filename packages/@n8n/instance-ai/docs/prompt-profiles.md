# Prompt profiles

A prompt profile selects a system prompt version, skill variants, and tool
exclusions together. Definitions live in `src/prompts/prompt-profiles.ts`.
The backend resolves the profile before creating the agent. Prompt rendering
does not read feature flags.

The initial profiles are `default@1` and `progressive@1`. The general system
prompt is the same in both. The progressive profile changes the workflow
skills and removes the planning skill and `create-tasks` tool.

`concise@1` (INS-1195) keeps every `default@1` policy and skill. It changes only
the system prompt version, which selects a different `## Communication Style`
block: sentence-level limits, one concrete next step, light formatting, and a
worked example. Each published system prompt version binds one style block
through `createSystemPromptRenderer`, so the general prompt body holds no
profile-specific conditions.

Measured against `default@1` over three runs each of the LangTracer case
`response-style-verbose-recap` (baseline suite, `response-style` tier): 30% less
emitted text, roughly half the bold and bullet density, and the share of
sentences longer than 20 words down from 18% to 15%. That case grades whichever
profile the lane runs, so set `N8N_EVAL_PROMPT_VERSION=concise@1` to measure
this arm.

## Selection and recovery

Selection reads a version and a mode, and **any version beats any mode**.

The version is the first of: the request's `promptVersion` for this turn, the
version already selected for the thread (both share one slot, so a request pin
replaces the thread's), then the instance-wide operator pin
`N8N_INSTANCE_AI_PROMPT_VERSION`. Only when all three are empty does the mode
decide: the thread's stored build mode, else the backend experiment assignment.

Because a version outranks a mode, pinning a `default`-mode profile such as
`concise@1` also overrides a progressive building assignment. The operator pin
is instance-wide so the two system prompts never fragment the prompt cache
within one instance. An unknown pin fails the run instead of silently serving
the default profile; the rest of n8n is unaffected.

Internal follow-ups retain the selected version. Checkpoints store the request
pin in `persistence.hostMetadata.promptVersion`. They do not store the operator
pin or the experiment assignment, so a resumed run derives those again. Change
or remove `N8N_INSTANCE_AI_PROMPT_VERSION` while a run is suspended, and the
resumed run uses the new value. Build mode differs: the checkpoint stores it and
recovery restores it exactly. If a stored version is no longer registered
after deployment, recovery selects the default profile and records `fallbackFrom`.
Legacy checkpoints use their saved mode, or default when no valid mode exists.
An unknown explicit request pin is rejected instead of silently falling back.

## Define a variant

1. Put reusable instructions in a skill fragment.
2. Add a versioned `SkillVariant` with its target skill IDs and fragment IDs.
3. Declare required tools in the fragment's `dependencies.tools`. The composer
   rejects a profile that disables a required tool. Recommended tools are optional;
   disabled recommendations are removed from the selected catalog.
4. Add the variant to a profile. Put skill and tool exclusions in that same variant.
5. Add selection and behavior tests. Include existing-resource operations when
   changing workflow-building behavior.

Different variants may change different skills. Duplicate variants, overlapping
skill changes, and changes to excluded skills are rejected. Use an explicit
combined variant when two policies must change the same skill. Fragment order
within a skill is its original body followed by the selected fragment.
Fragments do not appear as standalone catalog entries.

Published version IDs identify immutable definitions. Add a new version when
changing a published policy or system template. Keep the old renderer and fragments
if old runs must remain reproducible. Otherwise remove the old profile and use the
documented default fallback. Content hashes identify the concrete instructions
in addition to their version IDs.

## Inspect a profile

From this package:

```sh
pnpm prompts:print --profile default@1
pnpm prompts:print --profile progressive@1
pnpm prompts:print --profile concise@1
```

The output contains the system prompt, selected skill bodies, and a manifest.
This shows the profile before user-specific feature gates and context are applied.

Include `promptVersion` in a chat request to select an exact profile. Send the
pin with each new user message. Internal follow-ups retain the selected version.

Traces include `prompt_configuration` and the rendered `system_prompt_hash`.
Thread status includes `promptConfiguration` with the selected version and skill
hash. Both include fallback information when available.

Trace metadata also includes `prompt_version`, such as `progressive@1`, for
filtering. The same property is sent with `instance_ai_run_finished`,
`Builder sent message`, `Builder satisfied user intent`, and
`Builder generation errored`. It identifies the resolved profile for that run,
including after a resume. Events omit it when no resolved profile is available.

## Evaluate profiles

Set `promptVersion` in a local eval case, or set `N8N_EVAL_PROMPT_VERSION` for a
suite. Case version pins take precedence. An explicit case mode also overrides
suite settings. The runner sends the selected pin with every user message and
rejects unknown versions before provisioning resources.

Eval rows carry the backend's selected version and skill hash in
`run.outputs.buildTrace.promptConfiguration` when the status lookup succeeds.
Keep pinned case files local while the LangTracer case-write contract does not
carry their version field. Existing suites can use the runner's environment
override without changing their stored cases.

## Active skills and compaction

The agents SDK retains loaded skill IDs outside the conversation text. It renders
their current bodies in a cached instruction block, so memory compaction can
remove large tool results without removing the active instructions.

Checkpoints retain the IDs. Memory backends can implement `BuiltMemory.skillState`
to retain them across separate runs. The in-memory backend and Instance AI's
database adapter provide this store. It is scoped by thread, resource, and agent.
Custom memory backends need this optional store for cross-run retention after
compaction. Resumes always load content from the selected catalog; removed skills
are dropped, and a changed version replaces the old body.

Tools that inline skill guidance should use `ToolContext.loadSkill`. This activates
the selected skill and avoids persisting another copy of its instructions in a
tool result. Ordinary tool output remains untrusted data for memory extraction.

## Roll back or remove a profile

Switch the assignment to default for new user messages. Internal follow-ups keep
their selected version until that user turn ends. New turns resolve the assignment
again, and active IDs load their bodies from the newly selected catalog.

To retire a version, remove its profile entry after deciding whether existing
checkpoints may use the default fallback. Remove unreferenced variants and fragments
and update the mode-to-profile defaults. Run the selection, recovery, and behavior
tests. Do not leave profile-specific conditions in the general system prompt.
