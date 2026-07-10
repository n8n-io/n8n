# @n8n/module-sdk

Frontend module contract and registries for n8n.

This package owns the `FrontendModuleDescription` descriptor (v2) and the
registries that back it (modals, resources, push handlers, command-bar
contributions). The wiring that iterates the module manifest and drives these
registries lives in the `editor-ui` shell, not here.

## Contents

- `FrontendModuleDescription` — the declarative contract a frontend module
  exposes to the shell. All v2 fields are optional and additive.
- Registries — `modalRegistry`, `resourceRegistry`, `pushHandlerRegistry`,
  `commandRegistry`. Same functional pattern; import the one you need from
  `@n8n/module-sdk/registries/<name>` or the package root.

## License

For more details, please read our [LICENSE.md](LICENSE.md).
