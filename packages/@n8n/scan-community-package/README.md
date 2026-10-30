## n8n community-package static analysis tool

Checks npm provenance and runs static analysis for n8n community packages.

### How to use this

```
$ npx @n8n/scan-community-package n8n-nodes-PACKAGE
```

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | The package passed all checks |
| `1`  | The scan could not complete (invalid package spec, registry or network error, scanner crash). This says nothing about the package, so retry or check the output |
| `2`  | The scan ran and the package failed a check (ESLint violations, missing provenance, unreachable source repository) |
