# Store rules in the environment and the database

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

An operator who manages n8n as code wants rules in configuration. An instance admin wants to edit
rules in the editor without a restart. A cluster has several mains, and each main keeps rules in
memory because the hook runs on every execution.

## Decision

Rules come from two sources. The environment variable `N8N_SECURITY_SENSITIVE_FIELD_RULES` holds
a JSON object keyed by alias. The table `runtime_credential_rule` holds the rules that admins
create in the editor.

- On an alias clash the environment rule wins.
- An environment rule is read-only. The API answers 403 for an update or delete.
- The API is `/rest/runtime-credential-rules`. Every route needs the global scope
  `securitySettings:manage`, which Owner and Admin hold.
- The alias and the credential type of a rule cannot change. The API answers 400.
- A rule that fails validation is skipped and logged, so one bad row cannot disable the others.
- After a change, the main that handled it reloads its rules and publishes the pubsub command
  `reload-runtime-credential-rules`. Every other main reloads on that command.
- A create call also creates the stub credential. A delete call keeps it.

## Alternatives Considered

We rejected environment rules only. Each change would need a restart and an operator.

We rejected database rules only. An operator would lose configuration as code, and a fresh
instance would start with no rules.

We rejected a second admin scope for the rules. The rules decide which request values leave the
trigger output, so they belong with the other security settings.

## Consequences

A main that misses the pubsub command keeps the old rules until the next start or the next
change. A failed publish logs a warning. The change is stored.

The table has a unique constraint on `alias`. A concurrent create of the same alias answers 409
for the loser.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-create-one-stub-credential-for-each-rule-at-startup, ADR-20261118-govern-request-fed-credential-types-with-a-policy-kind
