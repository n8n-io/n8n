# @n8n/engine

n8n workflow execution engine (v2).

See the [Engine 2.0 project](https://linear.app/n8n/project/engine-20-59ba0ba60995)
for context. Public API and core interfaces are still being defined; the package
is currently a scaffold and is not yet wired into n8n.

## Dependencies

This package intentionally has **no runtime dependencies on other workspace
packages** at this stage — and in particular, **no dependency on `@n8n/di`**.
That is a deliberate architectural choice, not an oversight:

- A clean boundary between the engine and the rest of the codebase is
  load-bearing for Engine 2.0. Once a package starts resolving services through
  `@n8n/di`, it tends to pull in concrete implementations from other packages
  and end up tightly coupled — exactly what we want to avoid here.
- We will prefer explicit constructor injection / factory functions over a DI
  container until there's a clear, specific reason to do otherwise.

If you're tempted to add `@n8n/di` (or another workspace package) as a
dependency, please raise it explicitly in review rather than adding it
silently. The same applies to TypeScript decorator support: the
`emitDecoratorMetadata` / `experimentalDecorators` flags are deliberately
**off**, so accidental use of decorator-based DI will fail to compile.
