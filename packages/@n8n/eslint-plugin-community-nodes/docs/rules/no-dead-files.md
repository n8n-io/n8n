# Disallow leftover backup, editor, and test-artifact files in the `nodes/` and `credentials/` directories of a community node package (`@n8n/community-nodes/no-dead-files`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Community node packages sometimes ship stray files that were never meant to be
published: editor backups, scratch test scripts, or Windows "mark of the web"
alternate-data-stream files that leaked in when the package was zipped up on
another machine. These files add noise to the published artifact and are a
strong signal that the package was assembled by hand rather than from a clean
build.

This rule scans the package's `nodes/` and `credentials/` directories
(recursively) and reports any file whose name matches a known dead-file
pattern:

- `*.backup`
- `*.bak`
- `*Zone.Identifier` (Windows alternate-data-stream artifacts)
- `test.js`
- `test.ts`

The check is anchored on `package.json`, so it runs once per package regardless
of how many files match. It is reported as a **warning** — the files should be
removed before publishing, but their presence does not break the node at
runtime.

## Examples

### Incorrect

```
nodes/
  MyNode/
    MyNode.node.ts
    MyNode.node.ts.bak      ← leftover editor backup
    test.js                 ← stray test script
    MyNode.node.ts:Zone.Identifier  ← Windows mark-of-the-web artifact
credentials/
  MyApi.credentials.ts
  MyApi.credentials.ts.backup  ← leftover editor backup
```

### Correct

```
nodes/
  MyNode/
    MyNode.node.ts
    MyNode.node.json
credentials/
  MyApi.credentials.ts
```
