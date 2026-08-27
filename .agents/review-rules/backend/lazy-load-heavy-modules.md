# Lazy-load heavy or native modules

Applies to: backend packages (`cli`, `@n8n/db`, `core`, `workflow`) and the node packages.

A top-level `import` of a module used only on a specific code path loads it into
every process at startup, raising baseline memory. Native modules (e.g.
`isolated-vm`) can crash instances that lack the binary. Large parsers (e.g.
`jsdom`, ~16 MB heap) waste memory when the path is rarely hit.

Fix: `await import()` at point of use. For barrel files, use `export type`
instead of a value re-export when consumers only need the type.
