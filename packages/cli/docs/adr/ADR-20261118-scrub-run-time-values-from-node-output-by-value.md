# Scrub run-time values from node output by value

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

A stub credential gives a node the request value for one execution. An API can echo that value in
its response, and an error message can quote it. The value would then rest in the execution data.

Dynamic credentials solve a similar problem with the flag `currentNodeUsedDynamicCredentials`. The
flag redacts the execution data of the run and shows the label "end-user credentials". A stub is
not an end-user credential. The flag would hide all data of the run, also data that holds no
secret, and would give a wrong label.

## Decision

The engine replaces the request value with `[runtime credential: <alias>]` in the output items and
in the errors of each node that resolved a stub. `<alias>` is the alias of the rule.

The credentials helper records the alias in `currentNodeRuntimeCredentialAliases` when a node
resolves a stub. The engine resets the list before each node and reads it after the node. A
sub-node resolves its stub while the parent node runs, so the output of the parent node is
scrubbed.

The scrubber matches by value. It also matches a value without its `Bearer ` prefix. It skips
values shorter than 6 characters, because a short value matches unrelated text. It copies the
output items before it changes them, so pinned data and the output of upstream nodes do not
change. It changes the text fields of an error in place. A stub does not set
`currentNodeUsedDynamicCredentials`.

## Alternatives Considered

We rejected the end-user flag. It redacts the whole run and gives the wrong label, as the context
describes.

We rejected scrubbing the output of every node in the run. A node that reads a value with
`getRuntimeCredential` on purpose would lose its own output. A node without a stub has no reason to
hold the value.

We rejected scrubbing in the stub resolution path only. That path cannot see the output of the
node.

## Consequences

The scrubber does not cover these cases:

- The output of a sub-node. Only the output of the parent node is scrubbed.
- A response that the node streams to the caller before the engine sees it.
- A value that the node changes, for example base64, URL encoding, a hash, or a part of the value.
- A value shorter than 6 characters.
- Binary data.
- A node that did not resolve a stub but received the value from another node.
- The log of an external service that received the value.

The scrubber runs for each node that uses a stub. It decrypts the secure artifacts once for each
run. A failed decryption leaves the output as it is, and the stub resolution fails for the same
reason.

A change of the placeholder text changes the execution data that users see.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-keep-runtime-credentials-separate-from-dynamic-credentials, ADR-20261118-overlay-the-request-value-when-n8n-resolves-a-stub-credential
