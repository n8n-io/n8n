# Workflow Builder Intake Guardrails

Use these rules for webhook, form, chat-command, and other intake workflows that
fan one incoming item into multiple requested side effects such as email,
Telegram/Slack notification, webhook response, CRM create/update, and
spreadsheet logging.

## Normalize Before Effects

Normalize the incoming payload before the first side effect. For webhook/form
payloads, copy nested fields such as `$json.body.name`, `$json.body.email`, and
`$json.body.message` into stable top-level fields with Set/Edit Fields or Code.
Downstream final actions should read from fields such as `$json.name`,
`$json.email`, and `$json.message`, not from the raw trigger envelope.

For resource mapper writes such as Google Sheets or Airtable `defineBelow`,
map columns from those normalized top-level fields. Do not pass raw `$json.body`
paths directly into mapped columns.

## Gate Effects Independently

Separate whole-item rejection from side-effect eligibility:

1. Reject the whole item only when it is unusable for every requested effect.
2. If one effect needs a field, gate only that effect.
3. Let effects that can use fallback text continue.
4. Preserve logging, notifications, acknowledgements, and responses whenever
   they can still be meaningful.

Examples:

- An invalid email can skip or error-handle only the email send. Telegram, Slack,
  Google Sheets, and webhook response paths should still run when they have
  usable data.
- A missing name or empty message should use fallback text like "Unknown sender"
  or "No message provided" instead of blocking unrelated effects.
- A generic `valid`, `isComplete`, or `allFieldsPresent` flag is usually too
  broad for multi-effect intake. Prefer per-effect booleans such as
  `canSendEmail` and `canNotifyTeam`.

## Branch Topology

Do not route all requested side effects through the true branch of one
IF/Switch/Filter and leave the false/unmatched branch empty unless the user
explicitly asked for all-or-nothing behavior.

Use this default topology for partial intake handling:

1. Normalize the trigger payload once.
2. Fan out durable effects that can use fallback text, such as team
   notification, spreadsheet/table logging, and webhook acknowledgement, from
   the normalized item.
3. Put field-specific checks only on the effect that needs the field, such as
   `canSendEmail -> Send Auto-Reply`.
4. Let the false branch end, record a skipped effect, or continue to the
   non-email effects. Do not build `Normalize -> Is Valid Submission -> all
   effects` when the false branch only returns/rejects the whole item.

For IF/Switch/Filter gates:

- The branch that fails an email-only check should still connect to non-email
  effects when those effects can use the remaining fields.
- Filter nodes need an explicit unmatched-output path when the unmatched items
  still need logging, notification, response, or another final effect.
- Content gates on optional fields such as `name`, `message`, `subject`,
  `phone`, or `company` should not block final actions that can use fallback
  content.

## Independent Failure Handling

When multiple final effects are requested, one external service failure should
not silently discard all unrelated effects. Use supported `onError` behavior for
independent sends/posts/writes when the workflow should continue, and convert
failures into explicit error records or alternate responses where useful.
