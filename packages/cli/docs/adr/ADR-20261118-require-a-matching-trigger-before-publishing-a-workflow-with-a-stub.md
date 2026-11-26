# Require a matching trigger before publishing a workflow with a stub

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

A stub credential gets its value from a rule, and a rule applies to one trigger node type or to all
of them. A workflow that uses a stub but has no trigger that the rule matches never gets a value.
The node would fail at the first run in production, far from the cause.

## Decision

Publishing a workflow checks each stub that the workflow uses. At least one enabled trigger node of
the workflow must match the rule of the stub. A rule with node type `*` matches every trigger. If
no trigger matches, publishing fails. The error names the credential and asks an instance admin to
add a rule.

## Alternatives Considered

We rejected a check at save time. A builder adds the trigger and the node in any order, so a
draft is often incomplete.

We rejected no check. The failure would show only at run time and would look like an error of the
app.

We rejected a check that also matches the path against the trigger output. The output of a
trigger exists only at run time.

## Consequences

The check proves that a rule can apply. It does not prove that a caller sends the value.

A workflow that is already published keeps running if an admin later removes the rule. Its nodes
then fail at run time, because no rule exists for the stub.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-overlay-the-request-value-when-n8n-resolves-a-stub-credential
