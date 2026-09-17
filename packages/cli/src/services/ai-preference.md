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

## Who may read and write

`AiPreferenceService` holds the rules for every surface, and the REST controller adds
none of its own.

- A user always reads and writes their own personal rows.
- A project role decides the project rows, through the `projectAiPreference:*` scopes.
- The global `aiPreference:*` scopes cover the instance rows and other users' rows.
- A row the caller cannot see answers like a row that does not exist.

An update that moves a row to another scope needs the delete right on the old scope and
the create right on the new one.

## The two caps

Both numbers live in
[`ai-preference.schema.ts`](../../../@n8n/api-types/src/schemas/ai-preference.schema.ts),
so one value serves every reader:

- `AI_PREFERENCE_CONTENT_MAX_LENGTH` is 2,000 characters for one preference. The request
  DTO validates it through `aiPreferenceContentSchema`, and the settings modal reads the
  same constant.
- `AI_PREFERENCE_MAX_PER_SCOPE` is 50 preferences for one scope. The service is its only
  reader: `create()` counts the target scope, and `update()` counts it again when the write
  moves a row to another scope.

No tool input schema carries either number yet, because no tool writes a preference yet.
The `describe()` text on `aiPreferenceContentSchema` states both limits for a model, and
the write tool of CONTEXT-138 reuses that schema for its content field.

The caps apply on the write, never on the read. A read that dropped a row would hide a
colleague's preference with no way to tell. A write can refuse the text while the person
who wrote it is still looking at it.

Nothing bounds the rendered block itself, and that is the number to watch. One scope at the
cap renders about 100,000 characters, and the block adds a group for every project the
caller can read, so a caller in ten full projects renders about 1.3 million characters,
which is past every context window. The MCP read reports `rendered_length` on its tool
event, and `PREFERENCES_APPLIED_TO_TURN` carries the same number once CONTEXT-139 fires it.
Review the caps, and bound the block, if the 95th percentile of a rendered block passes
8,000 characters, which is about 2,000 tokens.

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

## What one turn reports

A turn publishes `preferences-applied` with the preferences it carried, the rendered
length, and whether it sent a new block. The event is the answer to "which preferences
applied here", and the chat and the plus menu read it rather than deriving an answer from
`GET /rest/ai-preferences`, which lists every visible row and knows nothing about the
turn.

See
[the streaming protocol](../../../@n8n/instance-ai/docs/streaming-protocol.md#preferences-applied)
for the frame, and `buildAppliedPreferencesPayload` in
[`ai-preference.service.ts`](./ai-preference.service.ts) for the mapping.

## Telemetry

The events live in the `CONTEXT` domain of
[`@n8n/telemetry`](../../../@n8n/telemetry/src/events/context.ts). Three cover the settings
area. Six more cover the assistant paths: the preferences applied to a turn, an assistant
write, the confirmation shown and answered, the scope accepted against the scope offered,
and a refused write with its reason. The `get_user_preferences` MCP tool reports the count
and the scopes it returned on the existing tool event.

Run `pnpm --filter @n8n/telemetry catalog` to read the registered events and their
properties. No event carries preference text. The events report lengths, counts and
scopes.

## The feature flag

`CONTEXT_PREFERENCES_FLAG` gates the surfaces that read preferences, not the writes. The
settings area writes rows whatever the flag says, and a row that no surface reads is
inert.
