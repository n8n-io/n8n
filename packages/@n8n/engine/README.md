# @n8n/engine

n8n workflow execution engine (v2).

See the [Engine 2.0 project](https://linear.app/n8n/project/engine-20-59ba0ba60995)
for context. Public API and core interfaces are still being defined; the package
is currently a scaffold and is not yet wired into n8n.

## Dependencies

Be careful adding dependencies here. This package is intended to be deployable
independently from the rest of n8n, so prefer external runtime deps over
workspace ones. Established n8n mechanisms — currently `@n8n/config` for
env-var handling — are an accepted exception when the alternative is
re-implementing the same thing locally.
