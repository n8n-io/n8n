# @n8n/eslint-plugin-community-nodes

ESLint plugin for linting n8n community node packages to ensure consistency and best practices.

## Install

```sh
npm install --save-dev eslint @n8n/eslint-plugin-community-nodes
```

**Requires ESLint `>=9` and [flat config](https://eslint.org/docs/latest/use/configure/configuration-files)

## Usage

See the [ESLint docs](https://eslint.org/docs/latest/use/configure/configuration-files) for more information about extending config files.

### Recommended config

This plugin exports a `recommended` config that enforces good practices.

```js
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';

export default [
		// …
		n8nCommunityNodesPlugin.configs.recommended,
		{
			rules: {
				'@n8n/community-nodes/node-usable-as-tool': 'warn',
			},
		},
];
```

## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
⚠️ Configurations set to warn in.\
✅ Set in the `recommended` configuration.\
☑️ Set in the `recommendedWithoutN8nCloudSupport` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).\
❌ Deprecated.

| Name                                                                                     | Description                                                                                                                                 | 💼   | ⚠️   | 🔧 | 💡 | ❌  |
| :--------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ | :--- | :--- | :- | :- | :- |
| [ai-node-package-json](docs/rules/ai-node-package-json.md)                               | Enforce consistency between n8n.aiNodeSdkVersion and ai-node-sdk peer dependency in community node packages                                 | ✅ ☑️ |      |    |    |    |
| [cred-class-field-icon-missing](docs/rules/cred-class-field-icon-missing.md)             | Credential class must have an `icon` property defined                                                                                       | ✅ ☑️ |      |    | 💡 |    |
| [credential-documentation-url](docs/rules/credential-documentation-url.md)               | Enforce valid credential documentationUrl format (URL or lowercase alphanumeric slug)                                                       | ✅ ☑️ |      | 🔧 |    |    |
| [credential-password-field](docs/rules/credential-password-field.md)                     | Ensure credential fields with sensitive names have typeOptions.password = true                                                              | ✅ ☑️ |      | 🔧 |    |    |
| [credential-test-required](docs/rules/credential-test-required.md)                       | Ensure credentials have a credential test                                                                                                   | ✅ ☑️ |      |    | 💡 |    |
| [icon-validation](docs/rules/icon-validation.md)                                         | Validate node and credential icon files exist, are SVG format, and light/dark icons are different                                           | ✅ ☑️ |      |    | 💡 |    |
| [missing-paired-item](docs/rules/missing-paired-item.md)                                 | Require pairedItem on INodeExecutionData objects in execute() methods to preserve item linking.                                             | ✅ ☑️ |      |    |    |    |
| [no-credential-reuse](docs/rules/no-credential-reuse.md)                                 | Prevent credential re-use security issues by ensuring nodes only reference credentials from the same package                                | ✅ ☑️ |      |    | 💡 |    |
| [no-deprecated-workflow-functions](docs/rules/no-deprecated-workflow-functions.md)       | Disallow usage of deprecated functions and types from n8n-workflow package                                                                  | ✅ ☑️ |      |    | 💡 |    |
| [no-forbidden-lifecycle-scripts](docs/rules/no-forbidden-lifecycle-scripts.md)           | Ban lifecycle scripts (prepare, preinstall, postinstall, etc.) in community node packages                                                   | ✅ ☑️ |      |    |    |    |
| [no-http-request-with-manual-auth](docs/rules/no-http-request-with-manual-auth.md)       | Disallow this.helpers.httpRequest() in functions that call this.getCredentials(). Use this.helpers.httpRequestWithAuthentication() instead. | ✅ ☑️ |      |    |    |    |
| [no-restricted-globals](docs/rules/no-restricted-globals.md)                             | Disallow usage of restricted global variables in community nodes.                                                                           | ✅    |      |    |    |    |
| [no-restricted-imports](docs/rules/no-restricted-imports.md)                             | Disallow usage of restricted imports in community nodes.                                                                                    | ✅    |      |    |    |    |
| [node-class-description-icon-missing](docs/rules/node-class-description-icon-missing.md) | Node class description must have an `icon` property defined. Deprecated: use `require-node-description-fields` instead.                     |      |      |    | 💡 | ❌  |
| [node-connection-type-literal](docs/rules/node-connection-type-literal.md)               | Disallow string literals in node description `inputs`/`outputs` — use `NodeConnectionTypes` enum instead                                    | ✅ ☑️ |      | 🔧 |    |    |
| [node-usable-as-tool](docs/rules/node-usable-as-tool.md)                                 | Ensure node classes have usableAsTool property                                                                                              | ✅ ☑️ |      | 🔧 |    |    |
| [options-sorted-alphabetically](docs/rules/options-sorted-alphabetically.md)             | Enforce alphabetical ordering of options arrays in n8n node properties                                                                      |      | ✅ ☑️ |    |    |    |
| [package-name-convention](docs/rules/package-name-convention.md)                         | Enforce correct package naming convention for n8n community nodes                                                                           | ✅ ☑️ |      |    | 💡 |    |
| [require-continue-on-fail](docs/rules/require-continue-on-fail.md)                       | Require continueOnFail() handling in execute() methods of node classes                                                                      | ✅ ☑️ |      |    |    |    |
| [require-node-api-error](docs/rules/require-node-api-error.md)                           | Require NodeApiError or NodeOperationError for error wrapping in catch blocks. Raw errors lose HTTP context in the n8n UI.                  | ✅ ☑️ |      |    |    |    |
| [require-node-description-fields](docs/rules/require-node-description-fields.md)         | Node class description must define all required fields: icon, subtitle                                                                      | ✅ ☑️ |      |    |    |    |
| [resource-operation-pattern](docs/rules/resource-operation-pattern.md)                   | Enforce proper resource/operation pattern for better UX in n8n nodes                                                                        |      | ✅ ☑️ |    |    |    |

<!-- end auto-generated rules list -->
