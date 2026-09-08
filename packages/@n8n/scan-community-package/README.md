## n8n community-package static analysis tool

Checks npm provenance and runs static analysis for n8n community packages.

### How to use this

```
$ npx @n8n/scan-community-package n8n-nodes-PACKAGE
```

### What it checks

1. **npm provenance** — the version must carry a provenance attestation.
2. **ESLint** — `@n8n/eslint-plugin-community-nodes` and
   `eslint-plugin-n8n-nodes-base` on the attested source and on the published
   `dist/`.
3. **YARA malware rules** — run on the published package through YARA-X
   compiled to WebAssembly (`@virustotal/yara-x`). No Python or Docker is
   needed. The ruleset is from
   [DataDog/guarddog](https://github.com/DataDog/guarddog) (Apache-2.0,
   vendored in `scanner/rules/guarddog/`); GuardDog itself does not run. Only
   `threat-*` rules fail the scan; `capability-*` rules are informational.

To update the vendored rules to a new GuardDog release:

```
$ node scanner/rules/sync-guarddog-rules.mjs v3.2.0
$ pnpm test
```
