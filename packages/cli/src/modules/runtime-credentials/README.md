# Runtime credentials module

This module turns a value in an incoming request, for example a bearer token, into the secret of a
credential for one execution. The feature flag is `N8N_ENV_FEAT_RUNTIME_CREDENTIALS`.

Read the architecture guide first: [`docs/backend/runtime-credentials.md`](../../../../../docs/backend/runtime-credentials.md).
It lists the components, the data flow, the hook phases, and the order in which to read the code.

The decision records are in [`packages/cli/docs/adr/`](../../../docs/adr/) and
[`packages/core/docs/adr/`](../../../../core/docs/adr/). Their names start with `ADR-20261118`.
