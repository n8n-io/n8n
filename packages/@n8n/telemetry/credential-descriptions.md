# Credential description metrics

## Adoption

Measure the share of users who save at least one nonempty credential description
among users who create or save a credential in the same seven-day window.
Use identified users on instances with the instrumentation enabled.
Exclude events that do not have the new description properties.

Use `User created credentials` and `User saved credentials`.
Join the user identity from the event envelope with the instance identity.
Count each user once in the numerator and once in the denominator.
The server and editor can both emit the creation event.
Do not use raw event counts as counts of users or credentials.

`has_description` reports whether the saved description is nonempty.
`description_length` reports the length of the trimmed, saved text in UTF-16 code
units. A missing or blank description has length zero.
These values come from the saved credential, even when a connection test fails.
The events never include the description text.

This measures use of descriptions among users who save credentials.
It does not measure the share of all stored credentials that have a description.

## Correctness

The correctness metric is the percentage of eval runs in which the assistant
selects the intended credential from two credentials of the same type using
their descriptions.

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
