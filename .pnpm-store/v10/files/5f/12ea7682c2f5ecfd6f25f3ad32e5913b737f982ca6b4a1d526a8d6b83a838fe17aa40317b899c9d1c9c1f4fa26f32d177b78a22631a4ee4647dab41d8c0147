# eslint-plugin-n8n-nodes-base

[![NPM version](https://img.shields.io/npm/v/eslint-plugin-n8n-nodes-base.svg?style=flat)](https://npmjs.org/package/eslint-plugin-n8n-nodes-base)

ESLint plugin for linting n8n nodes.

## Usage

Install this plugin:

```sh
pnpm i -D eslint-plugin-n8n-nodes-base
```

Create an [ESLint configuration file](<(https://eslint.org/docs/latest/user-guide/configuring/configuration-files)>) and decide how to set up the plugin.

### Specify only plugin

If you specify only the plugin, all rules in the plugin are **disabled by default** and must be individually enabled:

```js
{
  plugins: [ "eslint-plugin-n8n-nodes-base" ],
  rules: {
    "n8n-nodes-base/node-param-array-type-assertion": "warn",
    "n8n-nodes-base/node-param-default-wrong-for-collection": "error"
  }
}
```

### Specify plugin and config

If you specify both the plugin and a config, all config rules are **enabled by default** and must be individually disabled:

```js
{
  plugins: [ "eslint-plugin-n8n-nodes-base" ],
  extends: [ "plugin:n8n-nodes-base/nodes" ],
  rules: {
    "n8n-nodes-base/node-param-array-type-assertion": "off",
    "n8n-nodes-base/node-param-default-wrong-for-collection": "off"
  }
}
```

| Config        | Content                                             |
| ------------- | --------------------------------------------------- |
| `nodes`       | Ruleset for n8n nodes                               |
| `credentials` | Ruleset for n8n credentials                         |
| `community`   | Ruleset for `package.json` in n8n community package |

### User-defined defaults

In the `community` ruleset, the five `*-still-default` rules allow you to define your own default values:

```js
{
  plugins: [ "eslint-plugin-n8n-nodes-base" ],
  extends: [ "plugin:n8n-nodes-base/nodes" ],
  rules: {
    "n8n-nodes-base/community-package-json-author-name-still-default": [
      "error",
      { authorName: "Neil Armstrong" }, // user-defined default
    ],
  }
}
```

## Ruleset

<!-- RULES_TABLE -->
| Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description | Autofixable |
| :-- | :-- | :-- |
| [community-package-json-author-email-still-default](docs/rules/community-package-json-author-email-still-default.md) | The `author.email` value in the `package.json` of a community package must be different from the default value `''` (empty string) or a user-defined default. | No |
| [community-package-json-author-missing](docs/rules/community-package-json-author-missing.md) | The `author` key must be present in the `package.json` of a community package. | No |
| [community-package-json-author-name-missing](docs/rules/community-package-json-author-name-missing.md) | The `author.name` key must be present in the `package.json` of a community package. | No |
| [community-package-json-author-name-still-default](docs/rules/community-package-json-author-name-still-default.md) | The `author.name` value in the `package.json` of a community package must be different from the default value `''` (empty string) or a user-defined default. | No |
| [community-package-json-description-missing](docs/rules/community-package-json-description-missing.md) | The `description` key must be present in the `package.json` of a community package. | No |
| [community-package-json-description-still-default](docs/rules/community-package-json-description-still-default.md) | The `description` value in the `package.json` of a community package must be different from the default value `''` (empty string) or a user-defined default. | No |
| [community-package-json-keywords-missing](docs/rules/community-package-json-keywords-missing.md) | The `keywords` key must be present in the `package.json` of a community package. | No |
| [community-package-json-keywords-without-official-tag](docs/rules/community-package-json-keywords-without-official-tag.md) | The `keywords` value in the `package.json` of a community package must be an array containing the value `'n8n-community-node-package'`. | No |
| [community-package-json-license-missing](docs/rules/community-package-json-license-missing.md) | The `description` key must be present in the `package.json` of a community package. | No |
| [community-package-json-license-not-default](docs/rules/community-package-json-license-not-default.md) | The `license` key in the `package.json` of a community package must be the default value `MIT`. | No |
| [community-package-json-n8n-api-version-missing](docs/rules/community-package-json-n8n-api-version-missing.md) | The `n8n.n8nNodesApiVersion` key must be present in the `package.json` of a community package. | No |
| [community-package-json-n8n-api-version-not-number](docs/rules/community-package-json-n8n-api-version-not-number.md) | The `n8n.n8nNodesApiVersion` value in the `package.json` of a community package must be a number. | No |
| [community-package-json-n8n-missing](docs/rules/community-package-json-n8n-missing.md) | The `n8n` key must be present in the `package.json` of a community package. | No |
| [community-package-json-n8n-nodes-empty](docs/rules/community-package-json-n8n-nodes-empty.md) | The `n8n.nodes` value in the `package.json` of a community package must contain at least one filepath. | No |
| [community-package-json-n8n-nodes-missing](docs/rules/community-package-json-n8n-nodes-missing.md) | The `n8n.nodes` key must be present in the `package.json` of a community package. | No |
| [community-package-json-name-missing](docs/rules/community-package-json-name-missing.md) | The `name` key must be present in the `package.json` of a community package. | No |
| [community-package-json-name-still-default](docs/rules/community-package-json-name-still-default.md) | The `name` key in the `package.json` of a community package must be different from the default value `n8n-nodes-<...>` or a user-defined default. | No |
| [community-package-json-repository-url-still-default](docs/rules/community-package-json-repository-url-still-default.md) | The `repository.url` value in the `package.json` of a community package must be different from the default value `https://github.com/<...>/n8n-nodes-<...>.git` or a user-defined default. | No |
| [community-package-json-version-missing](docs/rules/community-package-json-version-missing.md) | The `version` key must be present in the `package.json` of a community package. | No |
| [cred-class-field-authenticate-type-assertion](docs/rules/cred-class-field-authenticate-type-assertion.md) | In a credential class, the field `authenticate` must be typed `IAuthenticateGeneric` | Yes |
| [cred-class-field-display-name-miscased](docs/rules/cred-class-field-display-name-miscased.md) | `displayName` field in credential class must be title cased, except for `n8n API` and `E-goi API` | Yes |
| [cred-class-field-display-name-missing-api](docs/rules/cred-class-field-display-name-missing-api.md) | `displayName` field in credential class must be end with `API`. | Yes |
| [cred-class-field-display-name-missing-oauth2](docs/rules/cred-class-field-display-name-missing-oauth2.md) | `displayName` field in credential class must mention `OAuth2` if the credential is OAuth2. | No |
| [cred-class-field-documentation-url-miscased](docs/rules/cred-class-field-documentation-url-miscased.md) | `documentationUrl` field in credential class must be camel cased. Only applicable to nodes in the main repository. | Yes |
| [cred-class-field-documentation-url-missing](docs/rules/cred-class-field-documentation-url-missing.md) | `documentationUrl` field in credential class must be present. | Yes |
| [cred-class-field-documentation-url-not-http-url](docs/rules/cred-class-field-documentation-url-not-http-url.md) | `documentationUrl` field in credential class must be an HTTP URL. Only applicable to community credentials. | No |
| [cred-class-field-name-missing-oauth2](docs/rules/cred-class-field-name-missing-oauth2.md) | `name` field in credential class must mention `OAuth2` if the credential is OAuth2. | No |
| [cred-class-field-name-unsuffixed](docs/rules/cred-class-field-name-unsuffixed.md) | `name` field in credential class must be suffixed with `-Api`. | Yes |
| [cred-class-field-name-uppercase-first-char](docs/rules/cred-class-field-name-uppercase-first-char.md) | First char in `name` in credential class must be lowercase. | Yes |
| [cred-class-field-placeholder-url-missing-eg](docs/rules/cred-class-field-placeholder-url-missing-eg.md) | `placeholder` for a URL in credential class must be prepended with `e.g.`. | Yes |
| [cred-class-field-properties-assertion](docs/rules/cred-class-field-properties-assertion.md) | In a credential class, the field `properties` must be typed `INodeProperties` and individual properties must have no assertions. | Yes |
| [cred-class-field-type-options-password-missing](docs/rules/cred-class-field-type-options-password-missing.md) | In a sensitive string-type field, `typeOptions.password` must be set to `true` to obscure the input. A field name is sensitive if it contains the strings: `secret`,`password`,`token`,`key`. See exceptions in source. | Yes |
| [cred-class-name-missing-oauth2-suffix](docs/rules/cred-class-name-missing-oauth2-suffix.md) | Credential class name must mention `OAuth2` if the credential is OAuth2. | No |
| [cred-class-name-unsuffixed](docs/rules/cred-class-name-unsuffixed.md) | Credential class name must be suffixed with `-Api`. | Yes |
| [cred-filename-against-convention](docs/rules/cred-filename-against-convention.md) | Credentials filename must match credentials class name, excluding the filename suffix. Example: `TestApi.credentials.ts` matches `TestApi` in `class TestApi implements ICredentialType`. | No |
| [node-class-description-credentials-name-unsuffixed](docs/rules/node-class-description-credentials-name-unsuffixed.md) | `name` under `credentials` in node class description must be suffixed with `-Api`. | Yes |
| [node-class-description-display-name-unsuffixed-trigger-node](docs/rules/node-class-description-display-name-unsuffixed-trigger-node.md) | `displayName` in node class description for trigger node must be suffixed with `-Trigger`. | Yes |
| [node-class-description-empty-string](docs/rules/node-class-description-empty-string.md) | `description` in node class description must be filled out. | No |
| [node-class-description-icon-not-svg](docs/rules/node-class-description-icon-not-svg.md) | `icon` in node class description should be an SVG icon. | No |
| [node-class-description-inputs-wrong-regular-node](docs/rules/node-class-description-inputs-wrong-regular-node.md) | The number of `inputs` in node class description for regular node should be one, or two for Merge node. | Yes |
| [node-class-description-inputs-wrong-trigger-node](docs/rules/node-class-description-inputs-wrong-trigger-node.md) | The number of `inputs` in node class description for trigger node should be zero. | Yes |
| [node-class-description-missing-subtitle](docs/rules/node-class-description-missing-subtitle.md) | `subtitle` in node class description must be present. | Yes |
| [node-class-description-name-miscased](docs/rules/node-class-description-name-miscased.md) | `name` in node class description must be camel cased. | Yes |
| [node-class-description-name-unsuffixed-trigger-node](docs/rules/node-class-description-name-unsuffixed-trigger-node.md) | `name` in node class description for trigger node must be suffixed with `-Trigger`. | Yes |
| [node-class-description-non-core-color-present](docs/rules/node-class-description-non-core-color-present.md) | `color` in node class description is deprecated and must not be present, except for nodes whose icon is a Font Awesome icon - usually core nodes. | Yes |
| [node-class-description-outputs-wrong](docs/rules/node-class-description-outputs-wrong.md) | The number of `outputs` in node class description for any node must be one, or two for If node, or four for Switch node. | Yes |
| [node-dirname-against-convention](docs/rules/node-dirname-against-convention.md) | Node dirname must match node filename, excluding the filename suffix. Example: `Test` node dirname matches `Test` section of `Test.node.ts` node filename. | No |
| [node-execute-block-double-assertion-for-items](docs/rules/node-execute-block-double-assertion-for-items.md) | In the `execute()` method there is no need to double assert the type of `items.length`. | Yes |
| [node-execute-block-error-missing-item-index](docs/rules/node-execute-block-error-missing-item-index.md) | In the operations in the `execute()` method in a node, `NodeApiError` and `NodeOperationError` must specify `itemIndex` as the third argument. | No |
| [node-execute-block-missing-continue-on-fail](docs/rules/node-execute-block-missing-continue-on-fail.md) | The `execute()` method in a node must implement `continueOnFail` in a try-catch block. | No |
| [node-execute-block-wrong-error-thrown](docs/rules/node-execute-block-wrong-error-thrown.md) | The `execute()` method in a node may only throw `ApplicationError`, NodeApiError`, `NodeOperationError`, or `TriggerCloseError`. | No |
| [node-filename-against-convention](docs/rules/node-filename-against-convention.md) | `name` in node class description must match the node filename without the `.node.ts` suffix. Example: If `description.name` is `Test`, then filename must be `Test.node.ts`. Version suffix in filename (e.g. `-V2`) is disregarded. | No |
| [node-param-array-type-assertion](docs/rules/node-param-array-type-assertion.md) | Array of node parameters must be typed, not type-asserted. | Yes |
| [node-param-collection-type-item-required](docs/rules/node-param-collection-type-item-required.md) | Items in collection-type node parameter must not have a `required` property. | Yes |
| [node-param-collection-type-unsorted-items](docs/rules/node-param-collection-type-unsorted-items.md) | Items in collection-type node parameter must be alphabetized by `name` if five or more than five. | No |
| [node-param-color-type-unused](docs/rules/node-param-color-type-unused.md) | `string`-type color-related node parameter must be `color`-type. | Yes |
| [node-param-default-missing](docs/rules/node-param-default-missing.md) | `default` must be present in a node parameter, except in node parameters under `modes`. | Yes |
| [node-param-default-wrong-for-boolean](docs/rules/node-param-default-wrong-for-boolean.md) | `default` for boolean-type node parameter must be a boolean. | Yes |
| [node-param-default-wrong-for-collection](docs/rules/node-param-default-wrong-for-collection.md) | `default` for collection-type node parameter must be an object. | Yes |
| [node-param-default-wrong-for-fixed-collection](docs/rules/node-param-default-wrong-for-fixed-collection.md) | `default` for fixed-collection-type node parameter must be an object. | Yes |
| [node-param-default-wrong-for-limit](docs/rules/node-param-default-wrong-for-limit.md) | `default` for a Limit node parameter must be `50`. | Yes |
| [node-param-default-wrong-for-multi-options](docs/rules/node-param-default-wrong-for-multi-options.md) | `default` for a multi-options-type node parameter must be an array. | Yes |
| [node-param-default-wrong-for-number](docs/rules/node-param-default-wrong-for-number.md) | `default` for a number-type node parameter must be a number, except for a number-type ID parameter. | Yes |
| [node-param-default-wrong-for-options](docs/rules/node-param-default-wrong-for-options.md) | `default` for an options-type node parameter must be one of the options. | Yes |
| [node-param-default-wrong-for-simplify](docs/rules/node-param-default-wrong-for-simplify.md) | `default` for a Simplify node parameter must be `true`. | Yes |
| [node-param-default-wrong-for-string](docs/rules/node-param-default-wrong-for-string.md) | `default` for a string-type node parameter must be a string, unless `typeOptions.multipleValues` is set to `true`. | Yes |
| [node-param-description-boolean-without-whether](docs/rules/node-param-description-boolean-without-whether.md) | `description` in a boolean node parameter must start with `Whether`. | No |
| [node-param-description-comma-separated-hyphen](docs/rules/node-param-description-comma-separated-hyphen.md) | The string `comma-separated` in `description` must be hyphenated. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-empty-string](docs/rules/node-param-description-empty-string.md) | `description` in node parameter or in option in options-type and multi-options-type param must be filled out or removed. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-excess-final-period](docs/rules/node-param-description-excess-final-period.md) | `description` in node parameter must end without a final period if a single-sentence description. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-excess-inner-whitespace](docs/rules/node-param-description-excess-inner-whitespace.md) | `description` in node parameter must not contain excess inner whitespace. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-identical-to-display-name](docs/rules/node-param-description-identical-to-display-name.md) | `description` in node parameter must not be identical to `displayName`. | Yes |
| [node-param-description-line-break-html-tag](docs/rules/node-param-description-line-break-html-tag.md) | `description` in node parameter must not contain an HTML line break. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-lowercase-first-char](docs/rules/node-param-description-lowercase-first-char.md) | First char in `description` in node parameter must be uppercase. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-miscased-id](docs/rules/node-param-description-miscased-id.md) | `ID` in `description` in node parameter must be fully uppercased. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-miscased-json](docs/rules/node-param-description-miscased-json.md) | `JSON` in `description` in node parameter must be fully uppercased. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-miscased-url](docs/rules/node-param-description-miscased-url.md) | `URL` in `description` in node parameter must be fully uppercased. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-missing-final-period](docs/rules/node-param-description-missing-final-period.md) | `description` in node parameter must end with a final period if a multiple-sentence description, unless ending with `</code>`. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-missing-for-ignore-ssl-issues](docs/rules/node-param-description-missing-for-ignore-ssl-issues.md) | `description` for Ignore SSL node parameter must be present. | Yes |
| [node-param-description-missing-for-return-all](docs/rules/node-param-description-missing-for-return-all.md) | `description` for Return All node parameter must be present. | Yes |
| [node-param-description-missing-for-simplify](docs/rules/node-param-description-missing-for-simplify.md) | `description` for Simplify node parameter must be present. | Yes |
| [node-param-description-missing-from-dynamic-multi-options](docs/rules/node-param-description-missing-from-dynamic-multi-options.md) | `description` in dynamic-multi-options-type node parameter must be present. | Yes |
| [node-param-description-missing-from-dynamic-options](docs/rules/node-param-description-missing-from-dynamic-options.md) | `description` in dynamic-options-type node parameter must be present. | Yes |
| [node-param-description-missing-from-limit](docs/rules/node-param-description-missing-from-limit.md) | `description` in Limit node parameter must be present. | Yes |
| [node-param-description-unencoded-angle-brackets](docs/rules/node-param-description-unencoded-angle-brackets.md) | `description` in node parameter must encode angle brackets for them to render. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-unneeded-backticks](docs/rules/node-param-description-unneeded-backticks.md) | `description` in node parameter must not use unneeded backticks. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-untrimmed](docs/rules/node-param-description-untrimmed.md) | `description` in node parameter must be trimmed. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-url-missing-protocol](docs/rules/node-param-description-url-missing-protocol.md) | `description` in node parameter must include protocol e.g. `https://` when containing a URL. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-weak](docs/rules/node-param-description-weak.md) | `description` in node parameter must be either useful or omitted. Applicable by extension to `description` in option in options-type and multi-options-type node parameter. | Yes |
| [node-param-description-wrong-for-dynamic-multi-options](docs/rules/node-param-description-wrong-for-dynamic-multi-options.md) | `description` in dynamic-multi-options-type node parameter must be `Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>` | Yes |
| [node-param-description-wrong-for-dynamic-options](docs/rules/node-param-description-wrong-for-dynamic-options.md) | `description` in dynamic-options-type node parameter must be `Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>` | Yes |
| [node-param-description-wrong-for-ignore-ssl-issues](docs/rules/node-param-description-wrong-for-ignore-ssl-issues.md) | `description` for Ignore SSL node parameter must be `Whether to connect even if SSL certificate validation is not possible` | Yes |
| [node-param-description-wrong-for-limit](docs/rules/node-param-description-wrong-for-limit.md) | `description` for Limit node parameter must be `Max number of results to return` | Yes |
| [node-param-description-wrong-for-return-all](docs/rules/node-param-description-wrong-for-return-all.md) | `description` for Return All node parameter must be `Whether to return all results or only up to a given limit` | Yes |
| [node-param-description-wrong-for-simplify](docs/rules/node-param-description-wrong-for-simplify.md) | `description` for Simplify node parameter must be `Whether to return a simplified version of the response instead of the raw data` | Yes |
| [node-param-description-wrong-for-upsert](docs/rules/node-param-description-wrong-for-upsert.md) | `description` for Upsert node parameter must be `Create a new record, or update the current one if it already exists (upsert)`. The resource name e.g. `'contact'` is also allowed instead of `'record'`. | Yes |
| [node-param-display-name-excess-inner-whitespace](docs/rules/node-param-display-name-excess-inner-whitespace.md) | `displayName` in node parameter or in fixed collection section must not contain excess inner whitespace. Applicable by extension to `name` in options-type or multi-options-type node parameter. | Yes |
| [node-param-display-name-miscased-id](docs/rules/node-param-display-name-miscased-id.md) | `ID` in `displayName` in node parameter must be fully uppercased. Applicable by extension to `name` in options-type or multi-options-type node parameter. | Yes |
| [node-param-display-name-miscased](docs/rules/node-param-display-name-miscased.md) | `displayName` in node parameter or in fixed collection section must title cased. Applicable by extension to `name` in options-type or multi-options-type node parameter. | Yes |
| [node-param-display-name-not-first-position](docs/rules/node-param-display-name-not-first-position.md) | By convention, `displayName` in node parameter must be placed first. | Yes |
| [node-param-display-name-untrimmed](docs/rules/node-param-display-name-untrimmed.md) | `displayName` in node parameter or in fixed collection section must be trimmed. Applicable by extension to `name` in options-type or multi-options-type node parameter. | Yes |
| [node-param-display-name-wrong-for-dynamic-multi-options](docs/rules/node-param-display-name-wrong-for-dynamic-multi-options.md) | `displayName` for dynamic-multi-options-type node parameter must end with `Names or IDs` | Yes |
| [node-param-display-name-wrong-for-dynamic-options](docs/rules/node-param-display-name-wrong-for-dynamic-options.md) | `displayName` for dynamic-options-type node parameter must end with `Name or ID` | Yes |
| [node-param-display-name-wrong-for-simplify](docs/rules/node-param-display-name-wrong-for-simplify.md) | `displayName` for Simplify node parameter must be Simplify | Yes |
| [node-param-display-name-wrong-for-update-fields](docs/rules/node-param-display-name-wrong-for-update-fields.md) | `displayName` for Update operation node parameter must be `Update Fields` | Yes |
| [node-param-fixed-collection-type-unsorted-items](docs/rules/node-param-fixed-collection-type-unsorted-items.md) | Items in a fixed-collection-type node parameter section must be alphabetized by `displayName` if five or more than five, unless the items are address fields. | Yes |
| [node-param-hint-untrimmed](docs/rules/node-param-hint-untrimmed.md) | `hint` in node parameter must be trimmed. | Yes |
| [node-param-hint-url-missing-protocol](docs/rules/node-param-hint-url-missing-protocol.md) | `hint` in node parameter must include protocol e.g. `https://` when containing a URL. | Yes |
| [node-param-min-value-wrong-for-limit](docs/rules/node-param-min-value-wrong-for-limit.md) | `minValue` for Limit node parameter must be a positive integer. | Yes |
| [node-param-multi-options-type-unsorted-items](docs/rules/node-param-multi-options-type-unsorted-items.md) | Items in a multi-options-type node parameter must be alphabetized by `name` if five or more than five. | No |
| [node-param-name-untrimmed](docs/rules/node-param-name-untrimmed.md) | `name` in node parameter or in fixed collection section must be trimmed. | Yes |
| [node-param-operation-option-action-miscased](docs/rules/node-param-operation-option-action-miscased.md) | The property `action` in an option in an Operation node parameter must be sentence-cased. | Yes |
| [node-param-operation-option-action-wrong-for-get-many](docs/rules/node-param-operation-option-action-wrong-for-get-many.md) | The property `action` in a Get Many option in an Operation node parameter must start with `Get many`. | Yes |
| [node-param-operation-option-description-wrong-for-get-many](docs/rules/node-param-operation-option-description-wrong-for-get-many.md) | The property `description` in a Get Many option in an Operation node parameter must mention `many` instead of `all`. | Yes |
| [node-param-operation-option-without-action](docs/rules/node-param-operation-option-without-action.md) | An option in an Operation node parameter must have an `action` property. The `action` property may or may not be identical to the `description` property. | Yes |
| [node-param-operation-without-no-data-expression](docs/rules/node-param-operation-without-no-data-expression.md) | `noDataExpression` in an Operation node parameter must be present and enabled. | Yes |
| [node-param-option-description-identical-to-name](docs/rules/node-param-option-description-identical-to-name.md) | `description` in option in options-type node parameter must not be identical to `name`. | Yes |
| [node-param-option-name-containing-star](docs/rules/node-param-option-name-containing-star.md) | Option `name` in options-type node parameter must not contain `*`. Use `[All]` instead. | Yes |
| [node-param-option-name-duplicate](docs/rules/node-param-option-name-duplicate.md) | Option `name` in options-type node parameter must not be a duplicate. | Yes |
| [node-param-option-name-wrong-for-get-many](docs/rules/node-param-option-name-wrong-for-get-many.md) | Option `name` for Get Many node parameter must be `Get Many` | Yes |
| [node-param-option-name-wrong-for-upsert](docs/rules/node-param-option-name-wrong-for-upsert.md) | Option `name` for Upsert node parameter must be `Create or Update`. | Yes |
| [node-param-option-value-duplicate](docs/rules/node-param-option-value-duplicate.md) | Option `value` in options-type node parameter must not be a duplicate. | Yes |
| [node-param-options-type-unsorted-items](docs/rules/node-param-options-type-unsorted-items.md) | Items in options-type node parameter must be alphabetized by `name` if five or more than five. | No |
| [node-param-placeholder-miscased-id](docs/rules/node-param-placeholder-miscased-id.md) | `ID` in `placeholder` in node parameter must be fully uppercased. | Yes |
| [node-param-placeholder-missing-email](docs/rules/node-param-placeholder-missing-email.md) | `placeholder` for Email node parameter must exist. | Yes |
| [node-param-required-false](docs/rules/node-param-required-false.md) | `required: false` in node parameter must be removed because it is implied. | Yes |
| [node-param-resource-with-plural-option](docs/rules/node-param-resource-with-plural-option.md) | Option `name` for a Resource node parameter must be singular. | Yes |
| [node-param-resource-without-no-data-expression](docs/rules/node-param-resource-without-no-data-expression.md) | `noDataExpression` in a Resource node parameter must be present and enabled. | Yes |
| [node-param-type-options-max-value-present](docs/rules/node-param-type-options-max-value-present.md) | `maxValue` in `typeOptions` in Limit node parameter is deprecated and must not be present. | Yes |
| [node-param-type-options-missing-from-limit](docs/rules/node-param-type-options-missing-from-limit.md) | `typeOptions` in Limit node parameter must be present. | Yes |
| [node-param-type-options-password-missing](docs/rules/node-param-type-options-password-missing.md) | In a sensitive string-type parameter, `typeOptions.password` must be set to `true` to obscure the input. A node parameter name is sensitive if it contains the strings: `secret`,`password`,`token`,`apiKey`. See exceptions in source. | Yes |
| [node-resource-description-filename-against-convention](docs/rules/node-resource-description-filename-against-convention.md) | Resource description file must use singular form. Example: `UserDescription.ts`, not `UsersDescription.ts`. | No |
<!-- /RULES_TABLE -->

## Release

1. Make a PR updating `version` in `package.json` to the new version following semver. Merge it. 

2. Make a tag for the new version:

```sh
git tag v1.16.2
git push origin v1.16.2
```

3. Create a [release](https://github.com/ivov/eslint-plugin-n8n-nodes-base/releases/new) using the tag.

4. Check that the [npm publish action](https://github.com/ivov/eslint-plugin-n8n-nodes-base/actions/workflows/ci-release.yml) succeeds. 

## Author

© 2024 [Iván Ovejero](https://github.com/ivov)
