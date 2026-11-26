# Clear request values after the node configured hooks run

Date: 2026-11-18

Status: Active

Decision Owner: Core Application

## Context

When an execution starts, context establishment hooks read the trigger items and write the
execution context. Two groups run first: global hooks, then the hooks that the trigger node
configures.

The bearer token and header extractors of dynamic credentials read `headers.authorization`. They
then replace the header with a mask. A runtime credentials rule often names the same header. If
the rule clears the value first, the extractors find nothing. If the rule clears the value after
them, it captures the mask and not the token.

## Decision

The hook registry has a third phase. A hook with the option `runAfterNodeHooks` runs for every
execution after the hooks that the trigger node configures. It sees the items as those hooks left
them. The hook does not run in the global phase, even when `alwaysExecute` is also set.

The order is:

1. Global hooks. Runtime credentials copies the matched values into the encrypted context here.
   It works on a copy and leaves the trigger items as they are.
2. Hooks that the trigger node configures. They read the real values.
3. Post-node hooks. Runtime credentials replaces the matched values with the marker here.

The capture step drops a value that is the marker, because a partial run can start from a node
whose input the clear step already changed.

## Alternatives Considered

We rejected hooks that call each other by name. Each hook would then depend on the others, and
a new hook would need changes in the old ones.

We rejected a check that blocks a runtime rule and a dynamic extractor on the same header. The
check would forbid a setup that the phase order supports.

We rejected clearing in the credential overlay. The values would stay in the trigger output of
the execution until a node asks for the credential.

## Consequences

Any future hook that must see the final trigger items can use the same option.

A post-node hook runs even when the trigger node has no configured hooks or when its hook
parameters fail to parse.

Capture and clear are two hooks that share one service. A change to the matching code changes both.

## Links

RFC: -

Documentation: [Runtime credentials](../../../../docs/backend/runtime-credentials.md)

Related ADRs: ADR-20261118-keep-runtime-credentials-separate-from-dynamic-credentials
