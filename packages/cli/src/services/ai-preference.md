# AI preferences

An AI preference is one instruction that a user writes once, and that every AI surface
then applies: node and credential choices, naming, how work is organized, and patterns to
avoid. The n8n Assistant, the MCP server and the settings area all read the same rows
through `AiPreferenceService`.

## The data

One table, `ai_preference`. See
[the table](../../../@n8n/db/src/migrations/common/1788882375989-CreateAiPreferenceTable.ts),
[the `source` column with its backfill](../../../@n8n/db/src/migrations/common/1789479099132-AddSourceToAiPreference.ts)
and [the entity](../../../@n8n/db/src/entities/ai-preference.ts).

| Column | Meaning |
| --- | --- |
| `content` | The instruction, as the person wrote it |
| `userId` | Set for a personal preference |
| `projectId` | Set for a project preference |
| `source` | The surface that wrote the row: `ui`, `aia` or `mcp` |
| `createdById` | The author. NULL after the author is deleted |

A CHECK constraint forbids a row that names both a user and a project. The scope of a row
comes from the two id columns:

- A `projectId` makes it a project preference.
- A `userId` makes it a personal preference.
- Neither makes it an instance preference, which an admin sets for everyone.

An update never changes `source`. The column records the surface that created the row, so
an assistant edit of a row a person wrote does not make the row the assistant's.

`source` is NOT NULL and carries no database default. The service names the surface on
every write, so a new write path that forgets to name one fails instead of recording a
silent `ui`. The telemetry and the settings list use this column to tell an assistant
write from a person's own write.

## Writes without a scope in hand

`updateContent(user, id, content)` replaces the text and keeps the scope where it is. It
serves callers that hold an id and no scope, such as an MCP client editing a row that
`get_user_preferences` returned; `update()` needs the full request and would read a missing
scope as a move. It reaches only the caller's own personal rows. A project row, an instance
row or another user's row answers like a missing row, whatever the role: those rules apply to
other people, and the settings area owns them.

The chat card endpoint answers the same need from the other side. A card names the scope of
its own last write, and a move made on the settings page or over MCP leaves that name stale.
An edit that carries no `scope` therefore keeps the target the row holds now: the endpoint
reads the row and repeats its scope, so `update()` sees no move. A text-only edit cannot undo
a move made elsewhere. An edit that carries a `scope` still moves the row, and the owner rule
below applies to it.

`undoWrite(user, id, source)` removes a row only when the named surface created it for the
caller and it is still the caller's personal row: `source`, `createdById` and `userId` must
all match. A row the person has since moved to a project or the instance is out of reach,
whatever their role. It is the undo of an assistant write,
narrower than `delete()` on purpose, so a client can take back what it saved and nothing the
person wrote by hand. A row that fails the check answers like one that does not exist.

## The assistant write

Every assistant surface writes through `writeAssistantPreference` in
[`ai-preference-write.ts`](./ai-preference-write.ts): the n8n Assistant tool with
`surface: 'aia'` and the MCP tool with `surface: 'mcp'`. It sets `source`, maps a refusal
to one of six reasons (`too_long`, `scope_full`, `duplicate`, `not_permitted`,
`blocked_by_admin`, `failed`) and fires the events, so the two surfaces cannot drift.
A `scope_full` refusal carries `limit` and `actual` from `AiPreferenceScopeFullError`.
Any other 4xx passes its message through as `failed`. A 5xx or a plain error keeps its
message internal and is logged.

## The MCP write tools

Three tools in `packages/cli/src/modules/mcp/tools/`, all behind the `aiPreference:write`
OAuth scope and the `CONTEXT_PREFERENCES_FLAG`:

| Tool | Does |
| --- | --- |
| `save_user_preference` | Creates a personal preference with `source` set to `mcp`, at once, with no confirmation gate. The result names the saved text, the id and the settings page. |
| `update_user_preference` | Changes a row by id: the text through `updateContent`, or the text and the scope together through `update`. |
| `undo_user_preference` | Removes a row through `undoWrite`, so only what MCP saved for this user. |

On a client that declares the elicitation capability, the save follows the write with one
form: the saved text, prefilled and editable. It is the second round of the same
`tools/call` (multi-round-trip elicitation, revision 2026-07-28); the row id travels in
`requestState`, and the retry re-authorizes through the service. Accept keeps the text as
shown, edited or not. Decline removes the row: every client offers that answer, and a press
after the write means "not this one". A cancelled form keeps the row, because a client with
no way to show the form answers cancel on its own, and silence must not delete data.

The form also carries the scope, for a user who holds the global `aiPreference:create`
right: `Just you` or `Everyone on this n8n instance`. The tool always writes `user`, as the
chat card does, and the form is where the person moves the row. A project needs an id that
no form can supply, so a move to a project goes through `update_user_preference` with a
`projectId` from `search_projects`. Every move runs through `update()`, so the right to
write the new scope is checked in one place for every surface.

## Who may read and write

`AiPreferenceService` holds the rules for every surface, and the REST controller adds
none of its own.

- A user always reads and writes their own personal rows.
- A project role decides the project rows, through the `projectAiPreference:*` scopes.
- The global `aiPreference:*` scopes cover the instance rows and other users' rows.
- A row the caller cannot see answers like a row that does not exist.

An update that moves a row to another scope needs the delete right on the old scope and
the create right on the new one.

An edit names its owner. A `PATCH` with scope `user` and no `userId` answers 400. Only a
create defaults a missing `userId` to the caller, because a create has no owner to lose.

## The two caps

Both numbers live in
[`ai-preference.schema.ts`](../../../@n8n/api-types/src/schemas/ai-preference.schema.ts),
so one value serves every reader:

- `AI_PREFERENCE_CONTENT_MAX_LENGTH` is 2,000 characters for one preference. The request
  DTO validates it through `aiPreferenceContentSchema`, and the settings modal reads the
  same constant.
- `AI_PREFERENCE_MAX_PER_SCOPE` is 50 preferences for one scope. The service is its only
  reader: `create()` counts the target scope, and `update()` counts it again when the write
  moves a row to another scope. A full scope refuses with `AiPreferenceScopeFullError`,
  whose `meta` carries the limit and the count, so the `save_user_preference` tool can
  return both numbers to the model instead of the message alone.

The `describe()` text on `aiPreferenceContentSchema` states both limits for a model, and
the `save_user_preference` tool reuses that schema for its content field.

The caps apply on the write, never on the read. A read that dropped a row would hide a
colleague's preference with no way to tell. A write can refuse the text while the person
who wrote it is still looking at it.

Nothing bounds the rendered block itself, and that is the number to watch. One scope at the
cap renders about 100,000 characters, and the block adds a group for every project the
caller can read, so a caller in ten full projects renders about 1.3 million characters,
which is past every context window. The MCP read reports the unwrapped text length as
`rendered_length` on its tool event, and `PREFERENCES_APPLIED_TO_TURN` reports the block
length on every assistant turn that runs the preferences path. The two differ by the
tags and the replacement sentence, not by the content, so one 95th percentile covers
both. Review the caps, and
bound the block, if that percentile passes 8,000 characters, which is about 2,000 tokens.

## What the AI surfaces receive

`AiPreferenceService` returns `ApplicableAiPreferences`, which groups the rows by scope
and carries the id of each row. Three renderers read that one structure:

| Function | Output | Reader |
| --- | --- | --- |
| `renderAiPreferencesBlock` | One `<ai-preferences>` block | The n8n Assistant turn |
| `renderAiPreferences` | The same text with no wrapping tag | The `get_user_preferences` MCP tool |
| `flattenAiPreferences` | One item for each preference, with its id and scope | Structured tool output |

The prompt text carries no ids. A tool result carries them, because an edit must address
a row.

The personal project of the caller folds into their personal preferences. Both are theirs
alone, and the name of a personal project is an email address that only confuses a reader.

User text cannot forge a heading or close the block: the renderer escapes the block tags,
and a preference keeps a two-space continuation indent, so no part of a preference starts
at column 0.

A failed read costs the preferences, not the turn. Every AI surface treats the read as
best effort.

## What one turn reads, and what it reports

The n8n Assistant rebuilds the block on every user turn, so a preference saved anywhere —
another session, the settings area, an MCP client — reaches an open thread on its next
turn. The turn re-sends the block only when its text differs from the last block in the
thread's persisted messages: the earlier copy travels with the history on every request,
so an unchanged conversation carries exactly one copy. The block says it replaces the
earlier copies, and when every preference is gone a constant cleared block says so once.

A turn publishes `preferences-applied` with the preferences it carried, the rendered
length, and whether it sent a new block. The event is the answer to "which preferences
applied here", and the chat and the plus menu read it rather than deriving an answer from
`GET /rest/ai-preferences`, which lists every visible row and knows nothing about the
turn.

The payload names rows by id and scope, not by text. The plus menu reads the latest
payload from `GET /rest/instance-ai/threads/:threadId/messages`, which carries it as
`appliedPreferences`, and from the live event after that. It then resolves the display text
with `GET /rest/ai-preferences?ids=`, which narrows the same visibility rules to the named
rows and never widens them. The menu keeps a row the lookup does not return and marks it
as removed, so the list the user sees stays the list the turn carried.

See
[the streaming protocol](../../../@n8n/instance-ai/docs/streaming-protocol.md#preferences-applied)
for the frame, and `buildAppliedPreferencesPayload` in
[`ai-preference.service.ts`](./ai-preference.service.ts) for the mapping.

## Telemetry

The events live in the `CONTEXT` domain of
[`@n8n/telemetry`](../../../@n8n/telemetry/src/events/context.ts). Three cover the settings
area. Six more cover the assistant paths: the preferences applied to a turn, an assistant
write, the confirmation shown and answered, the scope accepted against the scope offered,
and a refused write with its reason.
The chat card fires the scope event a second time when the user moves the row from the
Edit modal, with the scope the row left as the offered one.

The `get_user_preferences` MCP tool reports the count
and the scopes it returned on the existing tool event.

The MCP write tools fire the same events with `surface` set to `mcp`, through the shared
write. A removal from the review form, or through the undo tool, is `User deleted
preferences` with `source` set to `rejected`, as the chat card reports its Undo, and carries
`seconds_since_saved`; a declined form counts as a removal. An edit from the form is
`accepted_after_edit`. A cancelled form fires
no event of its own; the tool event records it, along with whether the client declared
elicitation at all.

Run `pnpm --filter @n8n/telemetry catalog` to read the registered events and their
properties. No event carries preference text. The events report lengths, counts and
scopes.

## The feature flag

`CONTEXT_PREFERENCES_FLAG` gates the surfaces that read preferences, not the writes. The
settings area writes rows whatever the flag says, and a row that no surface reads is
inert.
