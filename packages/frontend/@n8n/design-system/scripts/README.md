# Component API manifest

Run from the repository root:

```sh
pnpm --filter @n8n/design-system generate:manifest
```

The script writes `component-manifest.json` in this package. The package publishes this file at `@n8n/design-system/component-manifest.json`.

The manifest has props, emits, slots, and variables for each local Vue component export. `vue-component-meta` resolves imported types and Vue models without loading the component at runtime. Defaults remain source text. Entries without descriptions have an empty description. The generator does not infer prose from implementation code.

Type definitions include only declarations inside this package. Collection stops at external package boundaries, including `node_modules`. Prop annotations retain external type names without copying their definitions.

The reader follows local export barrels and the default-import/default-export pattern used in this package. It does not include external re-exports, composables, or runtime plugin registrations. Review new barrel patterns when you add them. Slot inference depends on Vue metadata and can be less precise without `defineSlots`.

CSS extraction uses the Vue SFC parser, PostCSS SCSS parser, and a CSS value parser. It includes `--n8n-*` declarations and references, including nested fallbacks. It excludes internal `--n8n--*` helpers and other prefixes. Local stylesheet imports are followed once per scope, with cycle protection and a package boundary. Sass mixins and interpolation are not evaluated. Each occurrence retains its selector path, conditions, scope, source line, and default. Conflicting defaults stay in occurrences; the summary default is null. This is source metadata, not proof of browser override behavior. No allowlist controls membership.

The pre-commit guard refuses unstaged or untracked files in this package when it has staged changes. Stage all package inputs first. The final hook runs after format commands and stages only the generated manifest. Deleted package inputs also trigger generation. Format changes that remain unstaged cause a refusal rather than inclusion of unrelated source.

Output has no timestamp or commit SHA. Package version identifies the release without causing a change on each commit. The first docs mock came from branch `ds-docs-manifest-script`, based on `238376de3ac`.

The manifest tests check the generated artifact. CSS fixture tests cover public prefixes, nested fallbacks, source locations, conditions, cyclic imports, and conflicting defaults. These tests do not replace browser tests for CSS overrides.
