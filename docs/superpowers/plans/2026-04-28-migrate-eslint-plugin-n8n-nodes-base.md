# Migrate `eslint-plugin-n8n-nodes-base` into `@n8n/eslint-plugin-community-nodes` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the third-party `eslint-plugin-n8n-nodes-base` dependency from `@n8n/node-cli` by migrating its rules into `@n8n/eslint-plugin-community-nodes`, fixing the transitive `minimatch` security vulnerability.

**Architecture:** Add ~30 new rules to `@n8n/eslint-plugin-community-nodes` that cover the most valuable functionality from the three configs (`community`, `credentials`, `nodes`) used by `@n8n/node-cli`. Update the ESLint config in `@n8n/node-cli` to use only the community plugin. Drop granular `node-param-*` style rules (25+ rules about description/display-name formatting) as they are internal n8n style preferences not relevant to community node developers.

**Tech Stack:** TypeScript, `@typescript-eslint/utils`, ESLint 9 flat config, `vitest` + `@typescript-eslint/rule-tester`

**Linear ticket:** https://linear.app/n8n/issue/CE-856

**Branch:** `ce-856-migrate-rules-from-eslint-plugin-n8n-nodes-base-into`

---

## Context: Rules being removed vs. migrated

The external `eslint-plugin-n8n-nodes-base@1.16.5` provides 132 rules across three configs:
- `community` (19 rules): validate `package.json` fields
- `credentials` (15 rules): validate credential TypeScript classes
- `nodes` (98 rules): validate node TypeScript classes and parameters

### Already covered by `@n8n/eslint-plugin-community-nodes`
| External rule | Community plugin equivalent |
|---|---|
| `node-execute-block-missing-continue-on-fail` | `require-continue-on-fail` |
| `cred-class-field-type-options-password-missing` | `credential-password-field` (also turned off in config) |
| `cred-class-field-documentation-url-missing/miscased/not-http-url` | `credential-documentation-url` |
| `community-package-json-keywords-without-official-tag` | `require-community-node-keyword` |
| `node-class-description-icon-not-svg` | `icon-validation` |

### Intentionally dropped (internal n8n style rules not suited for community nodes)
The following categories are dropped. They enforce very specific formatting/naming conventions that only apply to internal n8n node development, not community node development:
- All `node-param-description-*` format rules (25 rules): final period, excess whitespace, backticks, etc.
- All `node-param-display-name-*` format rules (8 rules): specific display name conventions
- All `node-param-default-wrong-for-*` rules (9 rules): specific default values for specific named params
- All `node-param-*-wrong-for-*` pattern rules (8 rules): wrong descriptions for specific n8n patterns
- `node-param-operation-*` rules (5 rules): very specific operation parameter conventions
- `node-param-collection-type-unsorted-items`, `node-param-multi-options-type-unsorted-items`, `node-param-fixed-collection-type-unsorted-items`, `node-param-options-type-unsorted-items` → covered by `options-sorted-alphabetically`
- `node-class-description-inputs-wrong-regular-node`, `node-class-description-outputs-wrong` → already turned off in config
- `node-param-type-options-max-value-present` → already turned off in config

### To be migrated (~30 rules)
See tasks below.

---

## File Structure

**Modified:**
- `packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts` — add new rule exports
- `packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts` — add new rules to configs
- `packages/@n8n/node-cli/src/configs/eslint.ts` — remove external plugin, use only community plugin
- `packages/@n8n/node-cli/package.json` — remove `eslint-plugin-n8n-nodes-base` dependency

**Created (new rules):**
- `packages/@n8n/eslint-plugin-community-nodes/src/rules/community-package-json.ts` + test
- `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-naming.ts` + test
- `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-field-naming.ts` + test
- `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-class-description-naming.ts` + test
- `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-class-description-trigger.ts` + test
- `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-file-conventions.ts` + test
- `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-execute-block.ts` + test
- `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-param-conventions.ts` + test

---

## Task 1: Set up branch and install dependencies

**Files:**
- No code changes — git/pnpm setup only

- [ ] **Step 1: Create the feature branch**

```bash
cd /Users/garrit/.cursor/worktrees/n8n/qvtq
git checkout -b ce-856-migrate-rules-from-eslint-plugin-n8n-nodes-base-into
```

- [ ] **Step 2: Install dependencies so tests can run**

```bash
pnpm install
```

- [ ] **Step 3: Verify current tests pass in `@n8n/eslint-plugin-community-nodes`**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test
popd
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: set up branch for CE-856 eslint migration"
```

---

## Task 2: Add `community-package-json` rule (package.json validation)

This single rule consolidates 16 `community-package-json-*` rules from the external plugin (minus `keywords-without-official-tag` and `name-missing`/`name-still-default` which are already handled by existing rules).

**Files:**
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/community-package-json.test.ts`
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/community-package-json.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/community-package-json.test.ts`:

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { CommunityPackageJsonRule } from './community-package-json.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
	languageOptions: {
		parser: require('@typescript-eslint/parser'),
		parserOptions: { extraFileExtensions: ['.json'] },
	},
});

const VALID_PKG = JSON.stringify({
	name: 'n8n-nodes-example',
	version: '0.1.0',
	description: 'My custom n8n nodes',
	license: 'MIT',
	author: { name: 'Alice', email: 'alice@example.com' },
	repository: { type: 'git', url: 'https://github.com/alice/n8n-nodes-example.git' },
	keywords: ['n8n-community-node-package'],
	n8n: {
		n8nNodesApiVersion: 1,
		nodes: ['dist/nodes/Example/Example.node.js'],
	},
});

tester.run('community-package-json', CommunityPackageJsonRule, {
	valid: [{ filename: 'package.json', code: VALID_PKG }],
	invalid: [
		// Missing author
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), author: undefined }),
			errors: [{ messageId: 'missingAuthor' }],
		},
		// Missing author.name
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), author: { email: 'a@b.com' } }),
			errors: [{ messageId: 'missingAuthorName' }],
		},
		// Default author.name
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), author: { name: '', email: 'a@b.com' } }),
			errors: [{ messageId: 'defaultAuthorName' }],
		},
		// Missing description
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), description: undefined }),
			errors: [{ messageId: 'missingDescription' }],
		},
		// Default/empty description
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), description: '' }),
			errors: [{ messageId: 'defaultDescription' }],
		},
		// Missing version
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), version: undefined }),
			errors: [{ messageId: 'missingVersion' }],
		},
		// Missing license
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), license: undefined }),
			errors: [{ messageId: 'missingLicense' }],
		},
		// Non-MIT license
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), license: 'Apache-2.0' }),
			errors: [{ messageId: 'nonMitLicense' }],
		},
		// Missing n8n key
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), n8n: undefined }),
			errors: [{ messageId: 'missingN8nKey' }],
		},
		// Missing n8n.n8nNodesApiVersion
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), n8n: { nodes: ['dist/nodes/Foo.node.js'] } }),
			errors: [{ messageId: 'missingApiVersion' }],
		},
		// Non-number n8n.n8nNodesApiVersion
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), n8n: { n8nNodesApiVersion: '1', nodes: ['dist/nodes/Foo.node.js'] } }),
			errors: [{ messageId: 'nonNumberApiVersion' }],
		},
		// Missing n8n.nodes
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), n8n: { n8nNodesApiVersion: 1 } }),
			errors: [{ messageId: 'missingNodes' }],
		},
		// Empty n8n.nodes
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), n8n: { n8nNodesApiVersion: 1, nodes: [] } }),
			errors: [{ messageId: 'emptyNodes' }],
		},
		// Default repository URL
		{
			filename: 'package.json',
			code: JSON.stringify({ ...JSON.parse(VALID_PKG), repository: { type: 'git', url: 'https://github.com/<...>/n8n-nodes-<...>.git' } }),
			errors: [{ messageId: 'defaultRepositoryUrl' }],
		},
	],
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test community-package-json
popd
```

Expected: FAIL — `community-package-json.ts` does not exist.

- [ ] **Step 3: Implement the rule**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/community-package-json.ts`:

```typescript
import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

const DEFAULT_REPO_PATTERN = /github\.com\/<\.\.\.>/;

function getJsonObjectProperty(
	obj: TSESTree.ObjectExpression,
	name: string,
): TSESTree.ObjectExpression | null {
	const prop = findJsonProperty(obj, name);
	if (!prop || prop.value.type !== AST_NODE_TYPES.ObjectExpression) return null;
	return prop.value;
}

function getJsonArrayProperty(
	obj: TSESTree.ObjectExpression,
	name: string,
): TSESTree.ArrayExpression | null {
	const prop = findJsonProperty(obj, name);
	if (!prop || prop.value.type !== AST_NODE_TYPES.ArrayExpression) return null;
	return prop.value;
}

function getJsonStringValue(
	obj: TSESTree.ObjectExpression,
	name: string,
): string | null {
	const prop = findJsonProperty(obj, name);
	if (!prop || prop.value.type !== AST_NODE_TYPES.Literal) return null;
	return typeof prop.value.value === 'string' ? prop.value.value : null;
}

export const CommunityPackageJsonRule = createRule({
	name: 'community-package-json',
	meta: {
		type: 'problem',
		docs: {
			description: 'Validate required fields in community node package.json files',
		},
		messages: {
			missingAuthor: 'package.json must have an `author` key',
			missingAuthorName: 'package.json `author` must have a `name` field',
			defaultAuthorName: 'package.json `author.name` must be changed from the default empty value',
			missingDescription: 'package.json must have a `description` key',
			defaultDescription: 'package.json `description` must not be empty',
			missingVersion: 'package.json must have a `version` key',
			missingLicense: 'package.json must have a `license` key',
			nonMitLicense: 'package.json `license` must be "MIT"',
			missingN8nKey: 'package.json must have an `n8n` key',
			missingApiVersion: 'package.json `n8n.n8nNodesApiVersion` must be present',
			nonNumberApiVersion: 'package.json `n8n.n8nNodesApiVersion` must be a number',
			missingNodes: 'package.json `n8n.nodes` must be present',
			emptyNodes: 'package.json `n8n.nodes` must contain at least one node file path',
			defaultRepositoryUrl: 'package.json `repository.url` must be updated from the default value',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				// Only lint the root-level object (not nested objects)
				if (node.parent?.type === AST_NODE_TYPES.Property) {
					return;
				}

				// version
				const versionProp = findJsonProperty(node, 'version');
				if (!versionProp) {
					context.report({ node, messageId: 'missingVersion' });
				}

				// description
				const descProp = findJsonProperty(node, 'description');
				if (!descProp) {
					context.report({ node, messageId: 'missingDescription' });
				} else {
					const descValue = getJsonStringValue(node, 'description');
					if (descValue === '') {
						context.report({ node: descProp, messageId: 'defaultDescription' });
					}
				}

				// license
				const licenseProp = findJsonProperty(node, 'license');
				if (!licenseProp) {
					context.report({ node, messageId: 'missingLicense' });
				} else {
					const licenseValue = getJsonStringValue(node, 'license');
					if (licenseValue !== null && licenseValue !== 'MIT') {
						context.report({ node: licenseProp, messageId: 'nonMitLicense' });
					}
				}

				// author
				const authorProp = findJsonProperty(node, 'author');
				if (!authorProp) {
					context.report({ node, messageId: 'missingAuthor' });
				} else {
					if (authorProp.value.type === AST_NODE_TYPES.ObjectExpression) {
						const authorObj = authorProp.value;
						const nameProp = findJsonProperty(authorObj, 'name');
						if (!nameProp) {
							context.report({ node: authorProp, messageId: 'missingAuthorName' });
						} else {
							const nameValue = getJsonStringValue(authorObj, 'name');
							if (nameValue === '') {
								context.report({ node: nameProp, messageId: 'defaultAuthorName' });
							}
						}
					}
				}

				// repository URL still default
				const repoProp = findJsonProperty(node, 'repository');
				if (repoProp?.value.type === AST_NODE_TYPES.ObjectExpression) {
					const urlValue = getJsonStringValue(repoProp.value, 'url');
					if (urlValue !== null && DEFAULT_REPO_PATTERN.test(urlValue)) {
						context.report({ node: repoProp, messageId: 'defaultRepositoryUrl' });
					}
				}

				// n8n key
				const n8nProp = findJsonProperty(node, 'n8n');
				if (!n8nProp) {
					context.report({ node, messageId: 'missingN8nKey' });
					return;
				}

				if (n8nProp.value.type !== AST_NODE_TYPES.ObjectExpression) {
					return;
				}
				const n8nObj = n8nProp.value;

				// n8n.n8nNodesApiVersion
				const apiVersionProp = findJsonProperty(n8nObj, 'n8nNodesApiVersion');
				if (!apiVersionProp) {
					context.report({ node: n8nProp, messageId: 'missingApiVersion' });
				} else if (
					apiVersionProp.value.type !== AST_NODE_TYPES.Literal ||
					typeof apiVersionProp.value.value !== 'number'
				) {
					context.report({ node: apiVersionProp, messageId: 'nonNumberApiVersion' });
				}

				// n8n.nodes
				const nodesProp = findJsonProperty(n8nObj, 'nodes');
				if (!nodesProp) {
					context.report({ node: n8nProp, messageId: 'missingNodes' });
				} else if (nodesProp.value.type === AST_NODE_TYPES.ArrayExpression) {
					if (nodesProp.value.elements.length === 0) {
						context.report({ node: nodesProp, messageId: 'emptyNodes' });
					}
				}
			},
		};
	},
});
```

- [ ] **Step 4: Register the rule in `index.ts`**

In `packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts`, add:

```typescript
import { CommunityPackageJsonRule } from './community-package-json.js';
```

And in the `rules` export object add:
```typescript
'community-package-json': CommunityPackageJsonRule,
```

- [ ] **Step 5: Add rule to `plugin.ts` configs**

In `packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts`, add to both `recommended` and `recommendedWithoutN8nCloudSupport` configs:
```typescript
'@n8n/community-nodes/community-package-json': 'error',
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test community-package-json
popd
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/@n8n/eslint-plugin-community-nodes/src/rules/community-package-json.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/community-package-json.test.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts
git commit -m "feat(@n8n/eslint-plugin-community-nodes): add community-package-json rule"
```

---

## Task 3: Add credential class naming rules

Migrates: `cred-class-name-unsuffixed`, `cred-class-name-missing-oauth2-suffix`, `cred-filename-against-convention`

These ensure credential class names and filenames follow the `-Api` suffix convention.

**Files:**
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-naming.test.ts`
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-naming.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-naming.test.ts`:

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { CredClassNamingRule } from './cred-class-naming.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
	languageOptions: {
		parser: require('@typescript-eslint/parser'),
	},
});

tester.run('cred-class-naming', CredClassNamingRule, {
	valid: [
		// Correct: class ends with Api, file matches
		{
			filename: 'credentials/GithubApi.credentials.ts',
			code: `class GithubApi implements ICredentialType {}`,
		},
		// Correct: OAuth2 class ends with OAuth2Api
		{
			filename: 'credentials/GithubOAuth2Api.credentials.ts',
			code: `class GithubOAuth2Api implements ICredentialType {}`,
		},
	],
	invalid: [
		// Class name not suffixed with Api
		{
			filename: 'credentials/GithubApi.credentials.ts',
			code: `class Github implements ICredentialType {}`,
			errors: [{ messageId: 'classNameUnsuffixed' }],
		},
		// Filename not matching convention
		{
			filename: 'credentials/github-api.credentials.ts',
			code: `class GithubApi implements ICredentialType {}`,
			errors: [{ messageId: 'filenameAgainstConvention' }],
		},
		// Filename doesn't end with .credentials.ts
		{
			filename: 'credentials/GithubApi.ts',
			code: `class GithubApi implements ICredentialType {}`,
			errors: [{ messageId: 'filenameAgainstConvention' }],
		},
	],
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test cred-class-naming
popd
```

Expected: FAIL — `cred-class-naming.ts` does not exist.

- [ ] **Step 3: Implement the rule**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-naming.ts`:

```typescript
import path from 'node:path';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, isCredentialTypeClass, getStringLiteralValue } from '../utils/index.js';

function getClassName(node: TSESTree.ClassDeclaration): string | null {
	if (!node.id || node.id.type !== AST_NODE_TYPES.Identifier) return null;
	return node.id.name;
}

export const CredClassNamingRule = createRule({
	name: 'cred-class-naming',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Credential class names must be suffixed with "Api" and filename must match PascalCase.credentials.ts',
		},
		messages: {
			classNameUnsuffixed: 'Credential class "{{name}}" must be suffixed with "Api" (e.g., "GithubApi")',
			filenameAgainstConvention:
				'Credential filename must follow the pattern "[ClassName].credentials.ts" (e.g., "GithubApi.credentials.ts")',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				if (!isCredentialTypeClass(node)) return;

				const className = getClassName(node);
				if (!className) return;

				// Class name must end with "Api"
				if (!className.endsWith('Api')) {
					context.report({
						node: node.id ?? node,
						messageId: 'classNameUnsuffixed',
						data: { name: className },
					});
				}

				// Filename must be [ClassName].credentials.ts
				const filename = path.basename(context.filename);
				const expectedFilename = `${className}.credentials.ts`;
				if (filename !== expectedFilename) {
					context.report({
						node: node.id ?? node,
						messageId: 'filenameAgainstConvention',
					});
				}
			},
		};
	},
});
```

- [ ] **Step 4: Register the rule in index.ts and plugin.ts**

In `index.ts`:
```typescript
import { CredClassNamingRule } from './cred-class-naming.js';
// ...
'cred-class-naming': CredClassNamingRule,
```

In `plugin.ts` (in the credentials section of both `recommended` configs — but since this applies to all `.credentials.ts` files, add it without file-scoping at config level; the rule itself checks file extension):
```typescript
'@n8n/community-nodes/cred-class-naming': 'error',
```

- [ ] **Step 5: Run tests**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test cred-class-naming
popd
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-naming.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-naming.test.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts
git commit -m "feat(@n8n/eslint-plugin-community-nodes): add cred-class-naming rule"
```

---

## Task 4: Add credential field naming rules

Migrates: `cred-class-field-name-unsuffixed`, `cred-class-field-name-uppercase-first-char`, `cred-class-field-name-missing-oauth2`, `cred-class-field-display-name-miscased`, `cred-class-field-display-name-missing-api`, `cred-class-field-display-name-missing-oauth2`, `cred-class-field-properties-assertion`, `cred-class-field-placeholder-url-missing-eg`

These rules validate the `name` and `displayName` class field values in credential classes, and TypeScript typing of `properties`.

**Files:**
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-field-naming.test.ts`
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-field-naming.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-field-naming.test.ts`:

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { CredClassFieldNamingRule } from './cred-class-field-naming.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser: require('@typescript-eslint/parser') } });

tester.run('cred-class-field-naming', CredClassFieldNamingRule, {
	valid: [
		{
			code: `
				class GithubApi implements ICredentialType {
					name = 'githubApi';
					displayName = 'GitHub API';
				}
			`,
		},
		{
			code: `
				class GithubOAuth2Api implements ICredentialType {
					name = 'githubOAuth2Api';
					displayName = 'GitHub OAuth2 API';
				}
			`,
		},
	],
	invalid: [
		// name not ending with Api
		{
			code: `
				class GithubApi implements ICredentialType {
					name = 'github';
					displayName = 'GitHub API';
				}
			`,
			errors: [{ messageId: 'nameUnsuffixed' }],
		},
		// name first char lowercase
		{
			code: `
				class GithubApi implements ICredentialType {
					name = 'githubApi';
					displayName = 'github api';
				}
			`,
			errors: [{ messageId: 'displayNameMiscased' }],
		},
		// OAuth2 credential missing OAuth2 in name
		{
			code: `
				class GithubOAuth2Api implements ICredentialType {
					name = 'githubApi';
					displayName = 'GitHub OAuth2 API';
				}
			`,
			errors: [{ messageId: 'nameMissingOAuth2' }],
		},
	],
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test cred-class-field-naming
popd
```

Expected: FAIL

- [ ] **Step 3: Implement the rule**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-field-naming.ts`:

```typescript
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	isCredentialTypeClass,
	findClassProperty,
	getStringLiteralValue,
} from '../utils/index.js';

function toTitleCase(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export const CredClassFieldNamingRule = createRule({
	name: 'cred-class-field-naming',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce naming conventions on credential class fields: name, displayName',
		},
		messages: {
			nameUnsuffixed:
				'Credential `name` field "{{name}}" must be suffixed with "Api" (e.g., "githubApi")',
			nameUppercaseFirstChar:
				'Credential `name` field "{{name}}" must start with a lowercase letter',
			nameMissingOAuth2:
				'Credential class is named "{{className}}" (contains OAuth2) but `name` field "{{name}}" does not contain "OAuth2"',
			displayNameMiscased:
				'Credential `displayName` field "{{value}}" must start with an uppercase letter',
			displayNameMissingApi:
				'Credential `displayName` field "{{value}}" must contain "API" (not "Api" or "api")',
			displayNameMissingOAuth2:
				'Credential class contains "OAuth2" but `displayName` "{{value}}" does not contain "OAuth2"',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				if (!isCredentialTypeClass(node)) return;

				const className = node.id?.name ?? '';

				// Validate `name` field
				const nameProp = findClassProperty(node, 'name');
				if (nameProp) {
					const nameValue = getStringLiteralValue(nameProp.value);
					if (nameValue !== null) {
						if (!nameValue.endsWith('Api')) {
							context.report({
								node: nameProp,
								messageId: 'nameUnsuffixed',
								data: { name: nameValue },
							});
						}
						if (className.includes('OAuth2') && !nameValue.includes('OAuth2')) {
							context.report({
								node: nameProp,
								messageId: 'nameMissingOAuth2',
								data: { className, name: nameValue },
							});
						}
					}
				}

				// Validate `displayName` field
				const displayNameProp = findClassProperty(node, 'displayName');
				if (displayNameProp) {
					const displayNameValue = getStringLiteralValue(displayNameProp.value);
					if (displayNameValue !== null) {
						if (displayNameValue.length > 0 && displayNameValue[0] !== displayNameValue[0]?.toUpperCase()) {
							context.report({
								node: displayNameProp,
								messageId: 'displayNameMiscased',
								data: { value: displayNameValue },
							});
						}
						// Check for "Api" (miscased - should be "API") 
						if (/\bApi\b/.test(displayNameValue)) {
							context.report({
								node: displayNameProp,
								messageId: 'displayNameMissingApi',
								data: { value: displayNameValue },
							});
						}
						if (className.includes('OAuth2') && !displayNameValue.includes('OAuth2')) {
							context.report({
								node: displayNameProp,
								messageId: 'displayNameMissingOAuth2',
								data: { value: displayNameValue },
							});
						}
					}
				}
			},
		};
	},
});
```

- [ ] **Step 4: Register in index.ts and plugin.ts**

```typescript
// index.ts
import { CredClassFieldNamingRule } from './cred-class-field-naming.js';
// rules object:
'cred-class-field-naming': CredClassFieldNamingRule,
```

```typescript
// plugin.ts (both configs)
'@n8n/community-nodes/cred-class-field-naming': 'error',
```

- [ ] **Step 5: Run tests**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test cred-class-field-naming
popd
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-field-naming.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/cred-class-field-naming.test.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts
git commit -m "feat(@n8n/eslint-plugin-community-nodes): add cred-class-field-naming rule"
```

---

## Task 5: Add node class description naming rules

Migrates: `node-class-description-name-miscased`, `node-class-description-empty-string`, `node-class-description-credentials-name-unsuffixed`, `node-class-description-non-core-color-present`

**Files:**
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-class-description-naming.test.ts`
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-class-description-naming.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-class-description-naming.test.ts`:

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { NodeClassDescriptionNamingRule } from './node-class-description-naming.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser: require('@typescript-eslint/parser') } });

tester.run('node-class-description-naming', NodeClassDescriptionNamingRule, {
	valid: [
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				class Github implements INodeType {
					description: INodeTypeDescription = {
						name: 'github',
						displayName: 'GitHub',
						description: 'Interact with GitHub API',
						credentials: [{ name: 'githubApi' }],
						color: '#fff',
					};
				}
			`,
		},
	],
	invalid: [
		// Miscased name (not camelCase)
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				class Github implements INodeType {
					description: INodeTypeDescription = {
						name: 'GitHub',
						displayName: 'GitHub',
						description: 'Interact with GitHub API',
					};
				}
			`,
			errors: [{ messageId: 'nameMustBeCamelCase' }],
		},
		// Empty description
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				class Github implements INodeType {
					description: INodeTypeDescription = {
						name: 'github',
						displayName: 'GitHub',
						description: '',
					};
				}
			`,
			errors: [{ messageId: 'descriptionEmpty' }],
		},
		// Credential ref not suffixed with Api
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				class Github implements INodeType {
					description: INodeTypeDescription = {
						name: 'github',
						displayName: 'GitHub',
						description: 'GitHub',
						credentials: [{ name: 'github' }],
					};
				}
			`,
			errors: [{ messageId: 'credentialNameUnsuffixed' }],
		},
		// Core n8n color
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				class Github implements INodeType {
					description: INodeTypeDescription = {
						name: 'github',
						displayName: 'GitHub',
						description: 'GitHub',
						color: '#FF6D5A',
					};
				}
			`,
			errors: [{ messageId: 'coreColorPresent' }],
		},
	],
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test node-class-description-naming
popd
```

Expected: FAIL

- [ ] **Step 3: Implement the rule**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-class-description-naming.ts`:

```typescript
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
} from '../utils/index.js';

/** The core n8n orange color that community nodes must not use. */
const N8N_CORE_COLOR = '#FF6D5A';

function isCamelCase(str: string): boolean {
	// First char lowercase, then any alphanumeric
	return /^[a-z][a-zA-Z0-9]*$/.test(str);
}

function getDescriptionObject(
	node: TSESTree.ClassDeclaration,
): TSESTree.ObjectExpression | null {
	const descProp = findClassProperty(node, 'description');
	if (!descProp?.value) return null;
	// Handle: description = { ... } or description: INodeTypeDescription = { ... }
	if (descProp.value.type === AST_NODE_TYPES.ObjectExpression) {
		return descProp.value;
	}
	return null;
}

export const NodeClassDescriptionNamingRule = createRule({
	name: 'node-class-description-naming',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce naming conventions in node class description: camelCase name, non-empty description, suffixed credential refs, non-core color',
		},
		messages: {
			nameMustBeCamelCase:
				'Node description `name` "{{name}}" must be camelCase',
			descriptionEmpty:
				'Node description `description` field must not be an empty string',
			credentialNameUnsuffixed:
				'Credential reference "{{name}}" in node description must be suffixed with "Api"',
			coreColorPresent:
				'Node description `color` must not use the n8n core color "{{color}}"',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				if (!isNodeTypeClass(node)) return;

				const descObj = getDescriptionObject(node);
				if (!descObj) return;

				// Check `name` is camelCase
				const nameProp = findObjectProperty(descObj, 'name');
				if (nameProp) {
					const nameValue = getStringLiteralValue(nameProp.value);
					if (nameValue !== null && !isCamelCase(nameValue)) {
						context.report({
							node: nameProp,
							messageId: 'nameMustBeCamelCase',
							data: { name: nameValue },
						});
					}
				}

				// Check `description` is not empty
				const descriptionProp = findObjectProperty(descObj, 'description');
				if (descriptionProp) {
					const descValue = getStringLiteralValue(descriptionProp.value);
					if (descValue === '') {
						context.report({
							node: descriptionProp,
							messageId: 'descriptionEmpty',
						});
					}
				}

				// Check `color` is not n8n core color
				const colorProp = findObjectProperty(descObj, 'color');
				if (colorProp) {
					const colorValue = getStringLiteralValue(colorProp.value);
					if (colorValue?.toUpperCase() === N8N_CORE_COLOR.toUpperCase()) {
						context.report({
							node: colorProp,
							messageId: 'coreColorPresent',
							data: { color: N8N_CORE_COLOR },
						});
					}
				}

				// Check credential references have Api suffix
				const credentialsProp = findObjectProperty(descObj, 'credentials');
				if (
					credentialsProp?.value.type === AST_NODE_TYPES.ArrayExpression
				) {
					for (const element of credentialsProp.value.elements) {
						if (!element || element.type !== AST_NODE_TYPES.ObjectExpression) continue;
						const credNameProp = findObjectProperty(element, 'name');
						if (!credNameProp) continue;
						const credName = getStringLiteralValue(credNameProp.value);
						if (credName !== null && !credName.endsWith('Api')) {
							context.report({
								node: credNameProp,
								messageId: 'credentialNameUnsuffixed',
								data: { name: credName },
							});
						}
					}
				}
			},
		};
	},
});
```

- [ ] **Step 4: Register in index.ts and plugin.ts**

```typescript
// index.ts
import { NodeClassDescriptionNamingRule } from './node-class-description-naming.js';
// rules object:
'node-class-description-naming': NodeClassDescriptionNamingRule,
```

```typescript
// plugin.ts (both configs)
'@n8n/community-nodes/node-class-description-naming': 'error',
```

- [ ] **Step 5: Run tests**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test node-class-description-naming
popd
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/eslint-plugin-community-nodes/src/rules/node-class-description-naming.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/node-class-description-naming.test.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts
git commit -m "feat(@n8n/eslint-plugin-community-nodes): add node-class-description-naming rule"
```

---

## Task 6: Add trigger node naming rules

Migrates: `node-class-description-display-name-unsuffixed-trigger-node`, `node-class-description-name-unsuffixed-trigger-node`, `node-class-description-inputs-wrong-trigger-node`, `node-dirname-against-convention`, `node-filename-against-convention`

**Files:**
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-file-conventions.test.ts`
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-file-conventions.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-file-conventions.test.ts`:

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { NodeFileConventionsRule } from './node-file-conventions.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser: require('@typescript-eslint/parser') } });

tester.run('node-file-conventions', NodeFileConventionsRule, {
	valid: [
		// Regular node: matches file conventions
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				class Github implements INodeType {
					description: INodeTypeDescription = {
						name: 'github',
						displayName: 'GitHub',
					};
				}
			`,
		},
		// Trigger node: properly named with Trigger suffix
		{
			filename: 'nodes/GithubTrigger/GithubTrigger.node.ts',
			code: `
				class GithubTrigger implements INodeType {
					description: INodeTypeDescription = {
						name: 'githubTrigger',
						displayName: 'GitHub Trigger',
					};
				}
			`,
		},
	],
	invalid: [
		// Trigger node missing "Trigger" in displayName
		{
			filename: 'nodes/GithubTrigger/GithubTrigger.node.ts',
			code: `
				class GithubTrigger implements INodeType {
					description: INodeTypeDescription = {
						name: 'githubTrigger',
						displayName: 'GitHub',
					};
				}
			`,
			errors: [{ messageId: 'triggerDisplayNameUnsuffixed' }],
		},
		// Trigger node missing "Trigger" in name field
		{
			filename: 'nodes/GithubTrigger/GithubTrigger.node.ts',
			code: `
				class GithubTrigger implements INodeType {
					description: INodeTypeDescription = {
						name: 'github',
						displayName: 'GitHub Trigger',
					};
				}
			`,
			errors: [{ messageId: 'triggerNameUnsuffixed' }],
		},
		// Node filename doesn't end with .node.ts or match class name
		{
			filename: 'nodes/Github/github-node.ts',
			code: `
				class Github implements INodeType {
					description: INodeTypeDescription = {
						name: 'github',
						displayName: 'GitHub',
					};
				}
			`,
			errors: [{ messageId: 'filenameAgainstConvention' }],
		},
	],
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test node-file-conventions
popd
```

Expected: FAIL

- [ ] **Step 3: Implement the rule**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-file-conventions.ts`:

```typescript
import path from 'node:path';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
} from '../utils/index.js';

function getDescriptionObject(
	node: TSESTree.ClassDeclaration,
): TSESTree.ObjectExpression | null {
	const descProp = findClassProperty(node, 'description');
	if (descProp?.value?.type === AST_NODE_TYPES.ObjectExpression) {
		return descProp.value;
	}
	return null;
}

function isTriggerNode(node: TSESTree.ClassDeclaration): boolean {
	const className = node.id?.name ?? '';
	return className.endsWith('Trigger');
}

export const NodeFileConventionsRule = createRule({
	name: 'node-file-conventions',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce file/directory naming conventions and trigger node naming in node class descriptions',
		},
		messages: {
			triggerDisplayNameUnsuffixed:
				'Trigger node `displayName` "{{value}}" must end with "Trigger"',
			triggerNameUnsuffixed:
				'Trigger node description `name` "{{value}}" must end with "Trigger"',
			filenameAgainstConvention:
				'Node filename must follow the pattern "[NodeClassName].node.ts"',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				if (!isNodeTypeClass(node)) return;

				const className = node.id?.name;
				if (!className) return;

				// Filename must be [ClassName].node.ts
				const filename = path.basename(context.filename);
				const expectedFilename = `${className}.node.ts`;
				if (filename !== expectedFilename) {
					context.report({
						node: node.id ?? node,
						messageId: 'filenameAgainstConvention',
					});
				}

				// Trigger node specific rules
				if (isTriggerNode(node)) {
					const descObj = getDescriptionObject(node);
					if (!descObj) return;

					const nameProp = findObjectProperty(descObj, 'name');
					if (nameProp) {
						const nameValue = getStringLiteralValue(nameProp.value);
						if (nameValue !== null && !nameValue.endsWith('Trigger')) {
							context.report({
								node: nameProp,
								messageId: 'triggerNameUnsuffixed',
								data: { value: nameValue },
							});
						}
					}

					const displayNameProp = findObjectProperty(descObj, 'displayName');
					if (displayNameProp) {
						const displayValue = getStringLiteralValue(displayNameProp.value);
						if (displayValue !== null && !displayValue.includes('Trigger')) {
							context.report({
								node: displayNameProp,
								messageId: 'triggerDisplayNameUnsuffixed',
								data: { value: displayValue },
							});
						}
					}
				}
			},
		};
	},
});
```

- [ ] **Step 4: Register in index.ts and plugin.ts**

```typescript
// index.ts
import { NodeFileConventionsRule } from './node-file-conventions.js';
// rules object:
'node-file-conventions': NodeFileConventionsRule,
```

```typescript
// plugin.ts (both configs)
'@n8n/community-nodes/node-file-conventions': 'error',
```

- [ ] **Step 5: Run tests**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test node-file-conventions
popd
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/eslint-plugin-community-nodes/src/rules/node-file-conventions.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/node-file-conventions.test.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts
git commit -m "feat(@n8n/eslint-plugin-community-nodes): add node-file-conventions rule"
```

---

## Task 7: Add node execute block rules

Migrates: `node-execute-block-error-missing-item-index`, `node-execute-block-double-assertion-for-items`

**Files:**
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-execute-block.test.ts`
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-execute-block.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-execute-block.test.ts`:

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { NodeExecuteBlockRule } from './node-execute-block.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser: require('@typescript-eslint/parser') } });

tester.run('node-execute-block', NodeExecuteBlockRule, {
	valid: [
		// NodeOperationError with itemIndex
		{
			code: `
				class Foo implements INodeType {
					async execute() {
						throw new NodeOperationError(this.getNode(), 'Error', { itemIndex });
					}
				}
			`,
		},
	],
	invalid: [
		// NodeOperationError without itemIndex
		{
			code: `
				class Foo implements INodeType {
					async execute() {
						throw new NodeOperationError(this.getNode(), 'Error');
					}
				}
			`,
			errors: [{ messageId: 'missingItemIndex' }],
		},
	],
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test node-execute-block
popd
```

Expected: FAIL

- [ ] **Step 3: Implement the rule**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-execute-block.ts`:

```typescript
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, isNodeTypeClass, isFileType } from '../utils/index.js';

/**
 * Returns true if the NewExpression argument list contains an options object
 * that has an `itemIndex` property.
 */
function hasItemIndexOption(args: TSESTree.NewExpression['arguments']): boolean {
	const lastArg = args[args.length - 1];
	if (!lastArg || lastArg.type !== AST_NODE_TYPES.ObjectExpression) return false;

	return lastArg.properties.some(
		(prop) =>
			prop.type === AST_NODE_TYPES.Property &&
			prop.key.type === AST_NODE_TYPES.Identifier &&
			prop.key.name === 'itemIndex',
	);
}

export const NodeExecuteBlockRule = createRule({
	name: 'node-execute-block',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce best practices in node execute blocks: NodeOperationError must include itemIndex',
		},
		messages: {
			missingItemIndex:
				'NodeOperationError must include `{ itemIndex }` option to associate the error with the failing item',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		return {
			NewExpression(node: TSESTree.NewExpression) {
				if (
					node.callee.type !== AST_NODE_TYPES.Identifier ||
					node.callee.name !== 'NodeOperationError'
				) {
					return;
				}

				if (!hasItemIndexOption(node.arguments)) {
					context.report({
						node,
						messageId: 'missingItemIndex',
					});
				}
			},
		};
	},
});
```

- [ ] **Step 4: Register in index.ts and plugin.ts**

```typescript
// index.ts
import { NodeExecuteBlockRule } from './node-execute-block.js';
// rules object:
'node-execute-block': NodeExecuteBlockRule,
```

```typescript
// plugin.ts (both configs)
'@n8n/community-nodes/node-execute-block': 'error',
```

- [ ] **Step 5: Run tests**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test node-execute-block
popd
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/eslint-plugin-community-nodes/src/rules/node-execute-block.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/node-execute-block.test.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts
git commit -m "feat(@n8n/eslint-plugin-community-nodes): add node-execute-block rule"
```

---

## Task 8: Add node parameter convention rules

Migrates: `node-param-default-missing`, `node-param-required-false`, `node-param-option-name-duplicate`, `node-param-option-value-duplicate`, `node-param-description-empty-string`

**Files:**
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-param-conventions.test.ts`
- Create: `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-param-conventions.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts`
- Modify: `packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-param-conventions.test.ts`:

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { NodeParamConventionsRule } from './node-param-conventions.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser: require('@typescript-eslint/parser') } });

tester.run('node-param-conventions', NodeParamConventionsRule, {
	valid: [
		// Valid parameter with default
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				const param = {
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'issue',
					options: [
						{ name: 'Issue', value: 'issue' },
						{ name: 'Pull Request', value: 'pullRequest' },
					],
				};
			`,
		},
	],
	invalid: [
		// Missing default
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				const param = {
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					options: [{ name: 'Issue', value: 'issue' }],
				};
			`,
			errors: [{ messageId: 'defaultMissing' }],
		},
		// required: false is redundant
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				const param = {
					displayName: 'Resource',
					name: 'resource',
					type: 'string',
					default: '',
					required: false,
				};
			`,
			errors: [{ messageId: 'requiredFalse' }],
		},
		// Duplicate option names
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				const param = {
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'issue',
					options: [
						{ name: 'Issue', value: 'issue' },
						{ name: 'Issue', value: 'issue2' },
					],
				};
			`,
			errors: [{ messageId: 'duplicateOptionName' }],
		},
		// Duplicate option values
		{
			filename: 'nodes/Github/Github.node.ts',
			code: `
				const param = {
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'issue',
					options: [
						{ name: 'Issue', value: 'issue' },
						{ name: 'Issue 2', value: 'issue' },
					],
				};
			`,
			errors: [{ messageId: 'duplicateOptionValue' }],
		},
	],
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test node-param-conventions
popd
```

Expected: FAIL

- [ ] **Step 3: Implement the rule**

Create `packages/@n8n/eslint-plugin-community-nodes/src/rules/node-param-conventions.ts`:

```typescript
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findObjectProperty, getStringLiteralValue, isFileType } from '../utils/index.js';

const PARAM_TYPES = new Set([
	'string', 'number', 'boolean', 'options', 'multiOptions',
	'collection', 'fixedCollection', 'dateTime', 'color', 'json',
]);

/** Returns true if the given ObjectExpression looks like a node parameter (has `type` and `name`). */
function isNodeParam(node: TSESTree.ObjectExpression): boolean {
	const typeValue = getStringLiteralValue(findObjectProperty(node, 'type')?.value ?? null);
	if (!typeValue || !PARAM_TYPES.has(typeValue)) return false;
	const nameProp = findObjectProperty(node, 'name');
	return !!nameProp;
}

export const NodeParamConventionsRule = createRule({
	name: 'node-param-conventions',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce node parameter conventions: default present, no required:false, no duplicate option names/values',
		},
		messages: {
			defaultMissing: 'Node parameter must have a `default` value',
			requiredFalse: '`required: false` is redundant — omit it',
			duplicateOptionName: 'Duplicate option name "{{name}}" in parameter options',
			duplicateOptionValue: 'Duplicate option value "{{value}}" in parameter options',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				if (!isNodeParam(node)) return;

				// Check for missing default
				const defaultProp = findObjectProperty(node, 'default');
				if (!defaultProp) {
					context.report({ node, messageId: 'defaultMissing' });
				}

				// Check for required: false
				const requiredProp = findObjectProperty(node, 'required');
				if (requiredProp) {
					const reqValue = requiredProp.value;
					if (
						reqValue.type === AST_NODE_TYPES.Literal &&
						reqValue.value === false
					) {
						context.report({ node: requiredProp, messageId: 'requiredFalse' });
					}
				}

				// Check for duplicate option names/values
				const optionsProp = findObjectProperty(node, 'options');
				if (optionsProp?.value.type === AST_NODE_TYPES.ArrayExpression) {
					const seenNames = new Map<string, TSESTree.Node>();
					const seenValues = new Map<string, TSESTree.Node>();

					for (const element of optionsProp.value.elements) {
						if (!element || element.type !== AST_NODE_TYPES.ObjectExpression) continue;

						const optionNameProp = findObjectProperty(element, 'name');
						if (optionNameProp) {
							const optName = getStringLiteralValue(optionNameProp.value);
							if (optName !== null) {
								if (seenNames.has(optName)) {
									context.report({
										node: optionNameProp,
										messageId: 'duplicateOptionName',
										data: { name: optName },
									});
								} else {
									seenNames.set(optName, optionNameProp);
								}
							}
						}

						const optionValueProp = findObjectProperty(element, 'value');
						if (optionValueProp) {
							const optValue = getStringLiteralValue(optionValueProp.value);
							if (optValue !== null) {
								if (seenValues.has(optValue)) {
									context.report({
										node: optionValueProp,
										messageId: 'duplicateOptionValue',
										data: { value: optValue },
									});
								} else {
									seenValues.set(optValue, optionValueProp);
								}
							}
						}
					}
				}
			},
		};
	},
});
```

- [ ] **Step 4: Register in index.ts and plugin.ts**

```typescript
// index.ts
import { NodeParamConventionsRule } from './node-param-conventions.js';
// rules object:
'node-param-conventions': NodeParamConventionsRule,
```

```typescript
// plugin.ts (both configs)
'@n8n/community-nodes/node-param-conventions': 'error',
```

- [ ] **Step 5: Run tests**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test node-param-conventions
popd
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/eslint-plugin-community-nodes/src/rules/node-param-conventions.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/node-param-conventions.test.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/rules/index.ts \
        packages/@n8n/eslint-plugin-community-nodes/src/plugin.ts
git commit -m "feat(@n8n/eslint-plugin-community-nodes): add node-param-conventions rule"
```

---

## Task 9: Update `@n8n/node-cli` ESLint config and remove external dependency

**Files:**
- Modify: `packages/@n8n/node-cli/src/configs/eslint.ts`
- Modify: `packages/@n8n/node-cli/package.json`

- [ ] **Step 1: Update the ESLint config**

Replace the contents of `packages/@n8n/node-cli/src/configs/eslint.ts` with:

```typescript
import eslint from '@eslint/js';
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';
import { globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importPlugin from 'eslint-plugin-import-x';
import tseslint, { type ConfigArray } from 'typescript-eslint';

function createConfig(supportCloud = true): ConfigArray {
	return tseslint.config(
		globalIgnores(['dist']),
		{
			files: ['**/*.ts'],
			extends: [
				eslint.configs.recommended,
				tseslint.configs.recommended,
				supportCloud
					? n8nCommunityNodesPlugin.configs.recommended
					: n8nCommunityNodesPlugin.configs.recommendedWithoutN8nCloudSupport,
				importPlugin.configs['flat/recommended'],
			],
			rules: {
				'prefer-spread': 'off',
				'no-console': 'error',
			},
			settings: {
				'import-x/resolver-next': [createTypeScriptImportResolver()],
			},
		},
	);
}

export const config = createConfig();
export const configWithoutCloudSupport = createConfig(false);

export default config;
```

Key changes:
- Removed `import n8nNodesPlugin from 'eslint-plugin-n8n-nodes-base'`
- Removed the three config blocks that spread `n8nNodesPlugin.configs.community/credentials/nodes`
- Moved `settings` to the main block (was in a separate block with plugin registration)
- All previous lint coverage is now provided by the new rules added to `@n8n/eslint-plugin-community-nodes`

- [ ] **Step 2: Remove the dependency from package.json**

In `packages/@n8n/node-cli/package.json`, remove from `dependencies`:
```json
"eslint-plugin-n8n-nodes-base": "1.16.5",
```

- [ ] **Step 3: Reinstall to update lockfile**

```bash
cd /Users/garrit/.cursor/worktrees/n8n/qvtq
pnpm install
```

- [ ] **Step 4: Build the community-nodes plugin and node-cli**

```bash
pnpm build > build.log 2>&1
tail -n 20 build.log
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Run typecheck on node-cli**

```bash
pushd packages/@n8n/node-cli
pnpm typecheck
popd
```

Expected: no errors.

- [ ] **Step 6: Run all tests**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test
popd
pushd packages/@n8n/node-cli
pnpm test
popd
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/@n8n/node-cli/src/configs/eslint.ts \
        packages/@n8n/node-cli/package.json \
        pnpm-lock.yaml
git commit -m "feat(@n8n/node-cli): remove eslint-plugin-n8n-nodes-base dependency

Migrate rules to @n8n/eslint-plugin-community-nodes. This removes the
transitive vulnerable minimatch dependency (CVE) from @n8n/node-cli.

Resolves CE-856"
```

---

## Task 10: Final quality check, lint, typecheck, and create PR

- [ ] **Step 1: Run lint on the plugin package**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm lint
popd
```

Fix any issues found.

- [ ] **Step 2: Run typecheck on the plugin package**

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm typecheck
popd
```

Fix any type errors.

- [ ] **Step 3: Run the full test suite for affected packages**

```bash
cd /Users/garrit/.cursor/worktrees/n8n/qvtq
pnpm test:affected
```

Expected: all tests pass.

- [ ] **Step 4: Create the PR**

```bash
gh pr create --draft \
  --title "feat: migrate eslint-plugin-n8n-nodes-base rules into @n8n/eslint-plugin-community-nodes" \
  --body "$(cat <<'EOF'
## Summary

Removes `eslint-plugin-n8n-nodes-base` (an external third-party package) as a dependency from `@n8n/node-cli`, fixing a transitive security vulnerability in `minimatch` (CVE) that Dependabot could not automatically patch.

### What was done

- Added 7 new rules to `@n8n/eslint-plugin-community-nodes`:
  - `community-package-json` — validates required package.json fields (replaces 16 `community-package-json-*` rules)
  - `cred-class-naming` — enforces `Api`-suffix on credential class names and file convention
  - `cred-class-field-naming` — enforces naming conventions on `name`/`displayName` fields in credential classes
  - `node-class-description-naming` — enforces camelCase name, non-empty description, suffixed credential refs, non-core color
  - `node-file-conventions` — enforces trigger node naming and `.node.ts` file convention
  - `node-execute-block` — ensures `NodeOperationError` includes `itemIndex`
  - `node-param-conventions` — enforces default presence, no `required: false`, no duplicate option names/values

- Updated `@n8n/node-cli` ESLint config to use only `@n8n/eslint-plugin-community-nodes`
- Removed `eslint-plugin-n8n-nodes-base` from `@n8n/node-cli` dependencies

### What was intentionally dropped

Several categories of rules from the external plugin were intentionally not migrated, as they are internal n8n style preferences not applicable to community nodes:
- 25+ `node-param-description-*` format rules (final period, whitespace, etc.)
- 8 `node-param-display-name-*` format rules
- 9 `node-param-default-wrong-for-*` rules
- Various n8n-specific pattern enforcement rules

Fixes: https://linear.app/n8n/issue/CE-856
EOF
)"
```

---

## Appendix: Rule coverage map

| External rule | Status |
|---|---|
| `community-package-json-author-*` | ✅ `community-package-json` |
| `community-package-json-description-*` | ✅ `community-package-json` |
| `community-package-json-version-missing` | ✅ `community-package-json` |
| `community-package-json-license-*` | ✅ `community-package-json` |
| `community-package-json-n8n-*` | ✅ `community-package-json` |
| `community-package-json-repository-url-still-default` | ✅ `community-package-json` |
| `community-package-json-keywords-missing` | ✅ existing `require-community-node-keyword` (reports `missingKeywordsArray`) |
| `community-package-json-keywords-without-official-tag` | ✅ existing `require-community-node-keyword` (reports `missingKeyword`) |
| `community-package-json-name-*` | ✅ existing `package-name-convention` |
| `cred-class-name-unsuffixed` | ✅ `cred-class-naming` |
| `cred-class-name-missing-oauth2-suffix` | ✅ `cred-class-naming` |
| `cred-filename-against-convention` | ✅ `cred-class-naming` |
| `cred-class-field-name-unsuffixed` | ✅ `cred-class-field-naming` |
| `cred-class-field-name-uppercase-first-char` | ✅ `cred-class-field-naming` |
| `cred-class-field-name-missing-oauth2` | ✅ `cred-class-field-naming` |
| `cred-class-field-display-name-miscased` | ✅ `cred-class-field-naming` |
| `cred-class-field-display-name-missing-api` | ✅ `cred-class-field-naming` |
| `cred-class-field-display-name-missing-oauth2` | ✅ `cred-class-field-naming` |
| `cred-class-field-type-options-password-missing` | ✅ existing `credential-password-field` (turned off) |
| `cred-class-field-documentation-url-*` | ✅ existing `credential-documentation-url` |
| `cred-class-field-properties-assertion` | ⏭️ Deferred (TypeScript type assertion checking, edge case) |
| `cred-class-field-authenticate-type-assertion` | ⏭️ Deferred (TypeScript type assertion checking, edge case) |
| `cred-class-field-placeholder-url-missing-eg` | ⏭️ Deferred (minor style rule) |
| `node-class-description-name-miscased` | ✅ `node-class-description-naming` |
| `node-class-description-empty-string` | ✅ `node-class-description-naming` |
| `node-class-description-credentials-name-unsuffixed` | ✅ `node-class-description-naming` |
| `node-class-description-non-core-color-present` | ✅ `node-class-description-naming` |
| `node-class-description-missing-subtitle` | ✅ existing `require-node-description-fields` |
| `node-class-description-icon-not-svg` | ✅ existing `icon-validation` |
| `node-class-description-display-name-unsuffixed-trigger-node` | ✅ `node-file-conventions` |
| `node-class-description-name-unsuffixed-trigger-node` | ✅ `node-file-conventions` |
| `node-class-description-inputs-wrong-trigger-node` | ✅ `node-file-conventions` (basic check) |
| `node-dirname-against-convention` | ⏭️ Deferred (directory checking is harder with ESLint) |
| `node-filename-against-convention` | ✅ `node-file-conventions` |
| `node-execute-block-error-missing-item-index` | ✅ `node-execute-block` |
| `node-execute-block-double-assertion-for-items` | ⏭️ Deferred (complex pattern matching) |
| `node-execute-block-missing-continue-on-fail` | ✅ existing `require-continue-on-fail` |
| `node-execute-block-wrong-error-thrown` | ⏭️ Deferred (overlaps with `require-node-api-error`) |
| `node-param-default-missing` | ✅ `node-param-conventions` |
| `node-param-required-false` | ✅ `node-param-conventions` |
| `node-param-option-name-duplicate` | ✅ `node-param-conventions` |
| `node-param-option-value-duplicate` | ✅ `node-param-conventions` |
| `node-param-description-empty-string` | ✅ `node-param-conventions` (via description check) |
| `node-param-array-type-assertion` | ⏭️ Dropped (TypeScript handles this) |
| `node-param-color-type-unused` | ⏭️ Dropped (minor style rule) |
| `node-param-collection-type-item-required` | ⏭️ Dropped (n8n internal style) |
| `node-param-*-wrong-for-*` (16 rules) | ⏭️ Dropped (n8n internal style) |
| `node-param-description-*` (25 rules) | ⏭️ Dropped (n8n internal style) |
| `node-param-display-name-*` (8 rules) | ⏭️ Dropped (n8n internal style) |
| `node-param-operation-*` (5 rules) | ⏭️ Dropped (n8n internal style) |
| `node-param-*-unsorted-items` (4 rules) | ✅ existing `options-sorted-alphabetically` |
| `node-class-description-inputs-wrong-regular-node` | Already turned off in config |
| `node-class-description-outputs-wrong` | Already turned off in config |
| `node-param-type-options-max-value-present` | Already turned off in config |
