## n8n community-package static analysis tool

Checks npm provenance and runs static analysis for n8n community packages.

### How to use this

```
$ npx @n8n/scan-community-package n8n-nodes-PACKAGE
```

### Credential names in scan results

The programmatic `analyzePackageByName(packageName, version)` result includes
`credentialNames` when source analysis extracts all declared credential names.
This is a sorted list of unique internal credential type names
from the provenance-attested source. The scanner uses the same static reader as
the local credential-reference lint rules. It reads the `name` field of credential
classes registered in `package.json` under `n8n.credentials`. It does not load or
run the package. A package without credential definitions returns an empty list.
If a declared credential source is missing, cannot be parsed, or has no literal
name, the scan fails and omits `credentialNames`.

Before analysis, the scanner compares the `n8n.credentials` file paths in the
source and published `package.json` files. It ignores entry order and duplicate
paths. If the lists differ, the scan fails and omits `credentialNames`.
This check requires a source registration for every published credential.
It checks registrations, not whether the compiled credential names match the source.

Results can also omit `credentialNames` when provenance checks, source fetches,
package downloads, or analysis fail. The approval service must require
`passed: true` and a `credentialNames` array before it checks for collisions.
It must not treat a missing value as an empty list.

For example, a package can declare a credential with `name = 'githubApi'` and
reference that name from its node. Its local reference checks pass because the
definition and reference agree. The built-in GitHub credential also uses
`githubApi`. Neither the display name nor the npm package name identifies this
collision.

The scan result exposes the internal name for the approval service:

```js
const result = await analyzePackageByName('n8n-nodes-example', '1.0.0');
// result.credentialNames: ['githubApi']
```

The approval service must compare these names with a registry of built-in and
approved community credential type names. An exact match with a name owned by
another package identifies a collision. The service must exclude the package
under review from this comparison so an update can keep its credential names.

This scanner supplies the metadata for that comparison. It does not have the
cross-package registry and does not reject collisions. `passed: true` means that
the scan checks passed. It does not mean that the credential names are unique
across packages. The regression test uses `githubApi` to check that the scan
reports the name even when all local lint checks pass.
