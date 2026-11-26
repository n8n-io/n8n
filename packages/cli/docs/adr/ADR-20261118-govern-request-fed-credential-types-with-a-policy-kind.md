# Govern request-fed credential types with a policy kind

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

An instance admin must be able to say which credential types may receive a value from the request.
A project admin must be able to narrow that choice for the workflows of the project. The type
availability policy framework already stores policies per scope and evaluates `allow`, `deny`, and
`delegate` verdicts over type names. It has the kinds node types and credential types.

The mapping rules of runtime credentials have a different shape. A mapping rule has a trigger node
type, a path, and a transform.

## Decision

Request-fed credential types are a third kind of the framework, `request-fed-credential-types`.
The kind reuses the store, the evaluator, and the DTOs. It has its own routes and its own scope,
`credentialTypePolicy:manageRequestFed`.

- With no policy, every type is allowed. The feature works with no setup.
- A project policy can deny a type for its workflows. A project policy cannot loosen the instance
  choice.
- The check runs in the credential overlay, before n8n reads any request value. A denied type
  fails the node with an error that says whether an instance or a project policy blocked it.
- The routes need the license feature of the framework. When the license expires, n8n stops
  enforcing the policy.

The mapping rules are not policy rules. They have their own store.

## Alternatives Considered

We rejected the existing `credential-types` kind. It governs which types a project may use at
all. Request-fed use is a narrower right, and an admin must grant the two separately.

We rejected mapping rules as policy rules. The evaluator returns a verdict for a type name. A
mapping rule has no verdict and no type selector, so it would need a second rule shape in the
evaluator.

We rejected default deny. The feature would not work until an admin writes a policy, and the
existence of a rule already shows the admin intent.

## Consequences

A policy and a rule are separate records. A type can have a rule and be denied. The node then
fails with the policy error.

The check depends on the policy module. Before the module starts, no policy exists and the
check allows every type.

The instance routes and the project routes both use `credentialTypePolicy:manageRequestFed`. An
admin who holds only `credentialTypePolicy:manage` cannot change this policy.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-overlay-the-request-value-when-n8n-resolves-a-stub-credential, ADR-20261118-store-rules-in-the-environment-and-the-database
