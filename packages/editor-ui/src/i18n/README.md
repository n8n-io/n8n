# Translating n8n

You can translate:

- strings for node-specific params, e.g. `Resource` and `Operation` in the GitHub node.
- strings for credentials-specific params, e.g. `Server` in the GitHub node's OAuth2 credentials.
- strings for base UI elements, i.e. any other string in the n8n frontend.

Any untranslated parameter values will fall back to the originals in English.

## Locale identifiers

To translate, you will need to get the locale identifier for the translated language.

A locale identifiers is a two-letter language code compatible with the [`Accept-Language` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language), e.g. `de.ts` (German), `es.ts` (Spanish), `ja.ts` (Japanese), etc. Please ignore locale variants, e.g. `US` in `en-US`.

## Translating node-specific params

To translate node-specific params:

  1. Select a node to translate.
  2. Navigate to `/packages/nodes-base/nodes/{node}`.
  3. Create a dir called `translations`.
  4. Create a `{localeIdentifier}.ts` file containing the translations, e.g. `de.ts`.
  5. Populate the `{localeIdentifier}.ts` file - see below.

To populate the `{localeIdentifier}.ts` file, you will need:

- the name of the node to translate (`nodeName` below), located in `/packages/nodes-base/nodes/{node}/{node}.node.ts`, in the class field `name`, e.g. for the GitHub node it is `github`, and
- the names of the node params to translate (`parameterName` below), located in `/packages/nodes-base/nodes/{node}/{node}.node.ts`, in the class field `properties`, and, if present, located in `/packages/nodes-base/nodes/{node}/**/{node}Description.ts`, in the `*Operations` and `*Fields` constants.

Example:

```ts
module.exports = {
	de: {
		[nodeName]: {
			params: {
				[parameterName]: {
					displayName: 'Parameter\'s display name'
				}
			}
		}
	}
};
```

The square brackets `[]` indicate a value to enter and should _not_ be included. For larger examples, see the GitHub node translations at `/packages/nodes-base/nodes/GitHub/translations/de.ts` and the Bitwarden node translations at `/packages/nodes-base/nodes/Bitwarden/translations/de.ts`.

Inside `[parameterName]`, translatable keys may be:

- `displayName`,
- `name`,
- `description`,
- `placeholder`,
- `options`, and
- `multipleValueButtonText`.

This applies to all param types:

- `string`,
- `number`,
- `boolean`,
- `options`,
- `collection`, and
- `fixedCollection`.

> Note: Only keys _existing in the node param_ may be translated. If a node has a parameter that does not have a description, then adding a translation for `description` will have no effect.

The `options` key may contain further params, structured in the same manner:

Example:

```ts
resource: {
	displayName: 'Ressource',
	options: {
		issue: {
			displayName: 'Thema',
			description: 'Beschreibung eines Themas',
		},
		file: {
			displayName: 'Datei',
		},
		repository: {
			displayName: 'Repo',
		},
	},
},
```

`options` type params contain items in a dropdown, but `collection` and `fixedCollection` type params contain a set of _input fields or dropdowns_. In these last two cases, note that their member fields must be placed at the same level of nesting as their container.

Example:

```ts
// fixed collection
additionalparams: {
	displayName: 'Zusätzliche Parameter',
	description: 'Beschreibung der zusätzlichen Parameter',
	placeholder: 'Deutsch',
	// dropdown items, nested inside fixed collection
	options: {
		author: {
			displayName: 'Autor',
		},
		branch: {
			displayName: 'Ast',
		},
		committer: {
			displayName: 'Commit-Macher',
		},
	},
},

// input fields for fixed collection, at same level of nesting
committer: {
	displayName: 'Commit-Macher',
	description: 'Beschreibung',
},
```

## Translating credentials-specific params

To translate credentials-specific params:

 1. Select a node's credentials to translate.
 2. Navigate to `/packages/nodes-base/nodes/{node}`.
 3. Create a dir called `translations`.
 4. Create a `{localeIdentifier}.ts` file containing the translations, e.g. `de.ts`.
 5. Populate the `{localeIdentifier}.ts` file - see below.

> If you already have a `.ts` file for node-specific params, use that one. There should be only one locale identifier file per language.

To populate the `{localeIdentifier}.ts` file, you will need:

  - the name of the node to translate (`nodeName` below), located in `/packages/nodes-base/nodes/{node}/{node}.node.ts`, in the class field `name`, e.g. for the GitHub node it is `github`,
  - the name of the credentials type(s) to translate (`credentialsType1` and `credentialsType2` below), located in `/packages/nodes-base/nodes/{node}/{node}.node.ts`, in the class field `credentials`, in the key `name`, and
  - the names of the credentials params to translate (`parameterName` below), located in `/packages/nodes-base/credentials/{node}Api.credentials.ts` or `/packages/nodes-base/credentials/{node}OAuth2Api.credentials.ts`, in the class field `properties`.

Example:

```ts
module.exports = {
	de: {
		[nodeName]: {
			credentials: {
				[credentialsType1]: {
					server: {
						displayName: '...',
						description: '...',
					},
				},
				[credentialsType2]: {
					server: {
						displayName: '...',
						description: '...',
					},
				},
			},
		}
	}
};
```

For a larger example, see the GitHub node translations at `/packages/nodes-base/nodes/GitHub/translations/de.ts`

The properties in the class field `properties` with `type: "hidden"` are not user-visible and need no translation. The properties `Client ID` and `Client Secret` for OAuth2 are not editable via credentials specific params. Since these two properties are shared by all OAuth2 credentials, they are translated as base UI strings - see the next section.

## Translating base UI strings

To translate base UI strings:

  1. Navigate to `/packages/editor-ui/i18n/locales`.
  2.1. Create a `{localeIdentifier}.ts` file containing the translations, e.g. `de.ts`.
  2.2. Copy the `en.ts` file and place it alongside the original.
  2.3. Rename the copy using the locale identifier, e.g. `de.ts`.
  2.4. Replace `en` in line 2 of the copy with the locale identifier.
  3. Populate the `{localeIdentifier}.ts` file - see below.
  4. Add `'n8n-nodes-base': {},` to the `{localeIdentifier}.ts` file.

Example:

```ts
export default {
	de: {
		about: {
			aboutN8n: 'Über n8n',
```

To populate the `{localeIdentifier}.ts` file, translate the strings and remove those that will not be translated. Any untranslated strings will fall back to the originals in English.

For base UI strings that contain a variable in curly braces `{var}`, e.g. `'The execution with the id {activeExecutionId} got stopped!'`, the translation _must not modify_ the variable with curly braces, keeping it exactly as in English: `'Die Ausführung mit der ID {activeExecutionId} wurde gestoppt!'`.

