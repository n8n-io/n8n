# Match request values by key path with linear-time globs

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

A rule must find the one value in the trigger output that becomes a secret. The trigger output is
data that a caller controls, so a rule must run in bounded time on any input. A rule must also not
reach into the prototype of an object. Admins want to match more than one header name, for example
a family of `x-auth-` headers.

The repository has no regular expression engine with a linear-time guarantee.

## Decision

A rule matches by node type and key path only.

- `nodeType` is a trigger node type, or `*` for every trigger.
- `path` is an exact dot path. `[*]` after a key iterates an array. A `*` inside a key is a glob
  that matches any run of characters in that key.
- The glob matcher runs in linear time. It uses no regular expression.
- A rule never matches on a value.
- A path with the segment `__proto__`, `constructor`, or `prototype` never matches. Only own
  properties match.
- The rule `transform` is `bearer` or `field:<name>`. `bearer` removes a `Bearer ` prefix and sets
  `oauthTokenData.access_token`. `field:<name>` copies the value to one field. The default is
  `bearer`. A transform needs a credential type.
- A matched value in the trigger output becomes the marker `[moved to credential: <type>]`.

## Alternatives Considered

We rejected regular expressions on key paths. A pattern from an admin on input from a caller
needs a linear-time engine, and the repository has none. Globs cover the real cases.

We rejected matching on values, for example on the prefix `Bearer `. A value rule would examine
every value and would miss tokens in other forms.

We rejected removing the matched key. The marker tells a reader of the execution that the value
moved, and an expression on the path gets a string and not `undefined`.

## Consequences

An admin lists the one path where the token arrives. A copy in another place stays in the output.

Expressions that read a matched path see the marker. Pin data taken from an execution output
shows the marker. A real value that a user pastes into pin data is not removed.

A rule for a new transform needs a code change in `applyTransform` and in the schema.

If a rule needs regular expressions later, a new record must name a linear-time engine.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-overlay-the-request-value-when-n8n-resolves-a-stub-credential
