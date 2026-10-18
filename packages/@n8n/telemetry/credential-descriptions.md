# Credential description metrics

## Adoption

Measure the share of users who save at least one nonempty credential description
among users who create or update a credential through the internal credential API
in the same seven-day window. The editor uses this API.
Use identified users on instances with the instrumentation enabled.

The instance PostHog flag `120_credential_descriptions` must be boolean `true`.
The backend evaluates it for the `company` group. When the flag is false or
missing, credential events omit description properties and keep their prior shape.

Use these backend events:

- `User created credentials` with `source = backend` and `public_api = false`.
- `User updated credentials` with `source = backend`.

Require both description properties on each event.
Existing frontend creation events have no `source` property.
Exclude frontend events and events that lack the required properties from both
counts. Join `user_id` with the instance identity from the event envelope.
Count each user once in the numerator and once in the denominator.
Do not use raw event counts as counts of users or credentials.

Public API creation stays tracked with `public_api = true` but does not count in
this metric. Imports and writes that bypass these controllers are outside this
metric. Calls to the internal API can also come from scripts. These events do not
prove that a person used the editor.

`has_description` reports whether the saved description is nonempty.
`description_length` reports the length of the trimmed, saved text in UTF-16 code
units. A missing or blank description has length zero.
The server emits these values after persistence. A later OAuth or connection
test result does not change them. A connection without a save does not count.
The events never include the description text.

This measures use of descriptions among users who save credentials.
An update can preserve an existing description without changing its text.
It does not measure the share of all stored credentials that have a description.
The existing telemetry transport is best effort. This change does not guarantee
delivery after a server failure.

## Correctness

The correctness metric is the percentage of eval runs in which the assistant
selects the credential whose description matches the request when two
credentials share one type.

Use neutral credential names. Give the credentials different purposes in their
descriptions. Ask for one purpose without naming the credential.
Keep the distinguishing context within the list previews from CONTEXT-150.
Check the selected credential, not just whether the assistant read a description.
Keep the credential order fixed within a comparison. Repeat the comparison with
the descriptions swapped to expose a preference for one position or name.

Run the same cases before and after the CONTEXT-150 read changes.
Keep the model, prompt configuration, case revision, and run count the same.
Report successful selections and total completed runs with each percentage.
Report infrastructure failures separately. Do not count them as selections.

## Do-not-harm

Credential selection accuracy must not fall below the baseline on the same cases
when all descriptions are absent.
Use cases where the request and credential names identify the intended choice.
Do not assign an arbitrary correct answer to indistinguishable credentials.
Report the change in percentage points with the underlying counts.

## Release evidence

Record the following on CONTEXT-151 before shipment:

- Case and suite links.
- Baseline and candidate commit IDs.
- Model and prompt configuration.
- Successful selections, completed runs, and infrastructure failures.
- Correctness percentages and the do-not-harm change.

The telemetry change alone does not establish a correctness result.
The comparison requires the CONTEXT-150 read changes on the candidate instance.
