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

| Name                                                                                         | Description                                                                                                                                                                            | 💼   | ⚠️   | 🔧 | 💡 | ❌  |
| :------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- | :--- | :- | :- | :- |
| [ai-node-package-json](docs/rules/ai-node-package-json.md)                                   | Enforce consistency between n8n.aiNodeSdkVersion and ai-node-sdk peer dependency in community node packages                                                                            | ✅ ☑️ |      |    |    |    |
| [cred-class-field-icon-missing](docs/rules/cred-class-field-icon-missing.md)                 | Credential class must have an `icon` property defined                                                                                                                                  | ✅ ☑️ |      |    | 💡 |    |
| [cred-class-name-field-conventions](docs/rules/cred-class-name-field-conventions.md)         | Credential `name` field must end with `Api` and start with a lowercase letter                                                                                                          | ✅ ☑️ |      | 🔧 |    |    |
| [cred-class-name-suffix](docs/rules/cred-class-name-suffix.md)                               | Credential class names must be suffixed with `Api`                                                                                                                                     | ✅ ☑️ |      | 🔧 |    |    |
| [cred-class-oauth2-naming](docs/rules/cred-class-oauth2-naming.md)                           | OAuth2 credentials must include `OAuth2` in the class name, `name`, and `displayName`                                                                                                  | ✅ ☑️ |      | 🔧 |    |    |
| [cred-filename-against-convention](docs/rules/cred-filename-against-convention.md)           | Credential filename must match the credential class name                                                                                                                               | ✅ ☑️ |      |    |    |    |
| [credential-documentation-url](docs/rules/credential-documentation-url.md)                   | Enforce valid credential documentationUrl format (URL or lowercase alphanumeric slug)                                                                                                  | ✅ ☑️ |      | 🔧 |    |    |
| [credential-password-field](docs/rules/credential-password-field.md)                         | Ensure credential fields with sensitive names have typeOptions.password = true                                                                                                         | ✅ ☑️ |      | 🔧 |    |    |
| [credential-test-required](docs/rules/credential-test-required.md)                           | Ensure credentials have a credential test                                                                                                                                              | ✅ ☑️ |      |    | 💡 |    |
| [icon-prefer-themed-variants](docs/rules/icon-prefer-themed-variants.md)                     | Encourage node and credential icons to provide light/dark variants instead of a single icon file                                                                                       |      | ✅ ☑️ |    |    |    |
| [icon-validation](docs/rules/icon-validation.md)                                             | Validate node and credential icon files exist, use the file: protocol, and that light/dark icons are different                                                                         | ✅ ☑️ |      |    | 💡 |    |
| [missing-paired-item](docs/rules/missing-paired-item.md)                                     | Require pairedItem on INodeExecutionData objects in execute() methods to preserve item linking.                                                                                        | ✅ ☑️ |      |    |    |    |
| [n8n-object-validation](docs/rules/n8n-object-validation.md)                                 | Validate the structure of the "n8n" object in community node package.json (required keys, types, and dist/ paths)                                                                      | ✅ ☑️ |      |    |    |    |
| [no-asterisk-in-option-names](docs/rules/no-asterisk-in-option-names.md)                     | Disallow asterisk characters in node option name values                                                                                                                                |      | ✅ ☑️ |    | 💡 |    |
| [no-builder-hint-leakage](docs/rules/no-builder-hint-leakage.md)                             | Disallow wire-format expression syntax (={{...}}) and NodeConnectionType string literals in builderHint texts and AI-builder prompts. Use expr() and SDK-canonical references instead. | ✅ ☑️ |      |    |    |    |
| [no-credential-reuse](docs/rules/no-credential-reuse.md)                                     | Prevent credential re-use security issues by ensuring nodes only reference credentials from the same package                                                                           | ✅ ☑️ |      |    | 💡 |    |
| [no-dangerous-functions](docs/rules/no-dangerous-functions.md)                               | Disallow `eval`, the `Function` constructor, and `child_process` process-spawning functions (`exec`, `spawn`, etc.) in community nodes.                                                | ✅ ☑️ |      |    |    |    |
| [no-deprecated-workflow-functions](docs/rules/no-deprecated-workflow-functions.md)           | Disallow usage of deprecated functions and types from n8n-workflow package                                                                                                             | ✅ ☑️ |      |    | 💡 |    |
| [no-duplicate-param-options](docs/rules/no-duplicate-param-options.md)                       | Disallow duplicate option names or values within a single node parameter                                                                                                               |      | ✅ ☑️ |    |    |    |
| [no-emoji-in-options](docs/rules/no-emoji-in-options.md)                                     | Disallow emoji characters in node option name and displayName values                                                                                                                   | ✅ ☑️ |      |    |    |    |
| [no-forbidden-lifecycle-scripts](docs/rules/no-forbidden-lifecycle-scripts.md)               | Ban lifecycle scripts (prepare, preinstall, postinstall, etc.) in community node packages                                                                                              | ✅ ☑️ |      |    |    |    |
| [no-http-request-with-manual-auth](docs/rules/no-http-request-with-manual-auth.md)           | Disallow this.helpers.httpRequest() in functions that call this.getCredentials(). Use this.helpers.httpRequestWithAuthentication() instead.                                            | ✅ ☑️ |      |    |    |    |
| [no-overrides-field](docs/rules/no-overrides-field.md)                                       | Ban the "overrides" field in community node package.json                                                                                                                               | ✅ ☑️ |      |    |    |    |
| [no-restricted-globals](docs/rules/no-restricted-globals.md)                                 | Disallow usage of restricted global variables in community nodes.                                                                                                                      | ✅    |      |    |    |    |
| [no-restricted-imports](docs/rules/no-restricted-imports.md)                                 | Disallow usage of restricted imports in community nodes.                                                                                                                               | ✅    |      |    |    |    |
| [no-runtime-dependencies](docs/rules/no-runtime-dependencies.md)                             | Disallow non-empty "dependencies" in community node package.json                                                                                                                       | ✅ ☑️ |      |    |    |    |
| [no-template-placeholders](docs/rules/no-template-placeholders.md)                           | Disallow unresolved template placeholders in package.json                                                                                                                              | ✅ ☑️ |      |    |    |    |
| [node-class-description-icon-missing](docs/rules/node-class-description-icon-missing.md)     | Node class description must have an `icon` property defined. Deprecated: use `require-node-description-fields` instead.                                                                |      |      |    | 💡 | ❌  |
| [node-class-description-name-camelcase](docs/rules/node-class-description-name-camelcase.md) | Node class `description.name` must be camelCase                                                                                                                                        | ✅ ☑️ |      | 🔧 |    |    |
| [node-connection-type-literal](docs/rules/node-connection-type-literal.md)                   | Disallow string literals in node description `inputs`/`outputs` — use `NodeConnectionTypes` enum instead                                                                               | ✅ ☑️ |      | 🔧 |    |    |
| [node-filename-against-convention](docs/rules/node-filename-against-convention.md)           | Node filename must match the node `description.name`                                                                                                                                   | ✅ ☑️ |      |    |    |    |
| [node-operation-error-itemindex](docs/rules/node-operation-error-itemindex.md)               | Require { itemIndex } in NodeOperationError / NodeApiError options inside item loops                                                                                                   | ✅ ☑️ |      |    |    |    |
| [node-registration-complete](docs/rules/node-registration-complete.md)                       | Ensure every `.node.ts` file in the `nodes/` directory is registered in the "n8n.nodes" array of package.json                                                                          |      | ✅ ☑️ |    |    |    |
| [node-usable-as-tool](docs/rules/node-usable-as-tool.md)                                     | Ensure node classes have usableAsTool property                                                                                                                                         | ✅ ☑️ |      | 🔧 |    |    |
| [options-sorted-alphabetically](docs/rules/options-sorted-alphabetically.md)                 | Enforce alphabetical ordering of options arrays in n8n node properties                                                                                                                 |      | ✅ ☑️ |    |    |    |
| [package-name-convention](docs/rules/package-name-convention.md)                             | Enforce correct package naming convention for n8n community nodes                                                                                                                      | ✅ ☑️ |      |    | 💡 |    |
| [require-community-node-keyword](docs/rules/require-community-node-keyword.md)               | Require the "n8n-community-node-package" keyword in community node package.json                                                                                                        |      | ✅ ☑️ | 🔧 |    |    |
| [require-continue-on-fail](docs/rules/require-continue-on-fail.md)                           | Require continueOnFail() handling in execute() methods of node classes                                                                                                                 | ✅ ☑️ |      |    |    |    |
| [require-mit-license](docs/rules/require-mit-license.md)                                     | Require the "license" field in community node package.json to be "MIT"                                                                                                                 | ✅ ☑️ |      | 🔧 |    |    |
| [require-node-api-error](docs/rules/require-node-api-error.md)                               | Require NodeApiError or NodeOperationError for error wrapping in catch blocks. Raw errors lose HTTP context in the n8n UI.                                                             | ✅ ☑️ |      |    |    |    |
| [require-node-description-fields](docs/rules/require-node-description-fields.md)             | Node class description must define all required fields: icon, subtitle                                                                                                                 | ✅ ☑️ |      |    |    |    |
| [require-param-default](docs/rules/require-param-default.md)                                 | Require every node parameter to declare a default value.                                                                                                                               | ✅ ☑️ |      |    |    |    |
| [require-version](docs/rules/require-version.md)                                             | Require a valid "version" field in community node package.json                                                                                                                         | ✅ ☑️ |      |    |    |    |
| [resource-operation-pattern](docs/rules/resource-operation-pattern.md)                       | Enforce proper resource/operation pattern for better UX in n8n nodes                                                                                                                   |      | ✅ ☑️ |    |    |    |
| [trigger-node-conventions](docs/rules/trigger-node-conventions.md)                           | Trigger nodes (class name ends with `Trigger`) must label themselves consistently as triggers                                                                                          | ✅ ☑️ |      |    |    |    |
| [valid-author](docs/rules/valid-author.md)                                                   | Require a non-empty author name and email in package.json                                                                                                                              | ✅ ☑️ |      |    |    |    |
| [valid-credential-references](docs/rules/valid-credential-references.md)                     | Ensure credentials referenced in node descriptions exist as credential classes in the package                                                                                          | ✅ ☑️ |      |    | 💡 |    |
| [valid-description](docs/rules/valid-description.md)                                         | Require a non-empty "description" field in community node package.json                                                                                                                 | ✅ ☑️ |      |    |    |    |
| [valid-peer-dependencies](docs/rules/valid-peer-dependencies.md)                             | Require community node package.json peerDependencies to contain only "n8n-workflow": "*" (and optionally "@n8n/ai-node-sdk")                                                           | ✅ ☑️ |      | 🔧 |    |    |
| [webhook-lifecycle-complete](docs/rules/webhook-lifecycle-complete.md)                       | Require webhook trigger nodes to implement the complete webhookMethods lifecycle (checkExists, create, delete)                                                                         | ✅ ☑️ |      |    |    |    |

<!-- end auto-generated rules list -->
