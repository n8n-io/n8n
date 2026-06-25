# @n8n/engine

n8n workflow execution engine (v2).

See the [Engine 2.0 project](https://linear.app/n8n/project/engine-20-59ba0ba60995)
for context. Public API and core interfaces are still being defined; the package
is currently a scaffold and is not yet wired into n8n.

## Dependencies

Be careful adding dependencies here. This package should not have runtime
dependencies on other n8n components, only interfaces. If there is some
functionality that should be shared, it should be factored into a common
library.
