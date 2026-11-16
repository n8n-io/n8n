# @n8n/engine

n8n workflow execution engine (v2).

**This engine is under active development. Do not use it.** It is not supported,
its API and data model change without notice, and a workflow that runs on it
today can stop running tomorrow. n8n runs every workflow on the existing engine
unless a developer opts a workflow into v2 on a test instance.

The package runs in two ways: in-process inside n8n through the `engine-v2`
module in `packages/cli`, or as a standalone data plane container started by
`serve.ts`. See `AGENTS.md` for the package structure and its rules, and the
[Engine v2 project](https://linear.app/n8n/project/engine-v2-59ba0ba60995) for
context.

## Dependencies

Be careful adding dependencies here. This package should not have runtime
dependencies on other n8n components, only interfaces. If there is some
functionality that should be shared, it should be factored into a common
library.
