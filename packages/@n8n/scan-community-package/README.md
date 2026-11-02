## n8n community-package static analysis tool

Checks [npm provenance](https://docs.npmjs.com/generating-provenance-statements/) and runs static analysis for n8n community packages.

### How to use this

```
$ npx @n8n/scan-community-package n8n-nodes-PACKAGE
```

The package name can include a version, a version range, or a dist-tag. Scoped packages are supported:

```
$ npx @n8n/scan-community-package n8n-nodes-PACKAGE@1.2.3
$ npx @n8n/scan-community-package n8n-nodes-PACKAGE@1.x
$ npx @n8n/scan-community-package @SCOPE/n8n-nodes-PACKAGE@beta
```

Without a version, the scanner checks the `latest` dist-tag.

### What it checks

The scanner runs these steps in sequence. It stops at the first step that fails.

1. **npm provenance.** The package version must have an [npm provenance](https://docs.npmjs.com/generating-provenance-statements/) attestation (SLSA v1). See [Submit community nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/) to publish with provenance.
2. **Attested source.** The scanner reads the source repository and commit from the attestation. Then it downloads that commit from GitHub. The repository must be public and on GitHub. If GitHub rejects the download (for example, the repository is private or the commit does not exist), the scan fails. If the download fails for another reason (for example, a timeout), the scan is incomplete.
3. **Static analysis.** The scanner lints two sets of files with ESLint. Both must pass:
   - the attested source: `package.json` and the files in `nodes/` and `credentials/`
   - the published npm tarball: all `.js` files and `package.json`

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | The package passed all checks. |
| `1`  | The scan could not complete, for example because of an invalid package name, a registry or network error, or a scanner crash. This result says nothing about the package. Retry the scan or examine the output. |
| `2`  | The package failed a check, for example because of ESLint violations, missing provenance, or a source repository that GitHub rejects with a 4xx response (other than 408 or 429). |
