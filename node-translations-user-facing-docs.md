# Translate nodes

You can show the text of nodes in the language of your users. This includes:

- The node name and description in the nodes panel.
- The actions in the nodes panel, for example **Create a new user**.
- The parameter labels, descriptions, hints, and placeholders in the node settings.
- The options of a dropdown.
- The button texts of collections, for example **Add Field**.
- The field labels of credentials.

This page has two guides:

- [Translate built-in nodes](#translate-built-in-nodes): nodes that come with n8n.
- [Translate custom nodes](#translate-custom-nodes): community nodes and your own nodes.

Before you start, set up a language with `N8N_LOCALES`. Refer to the docs about UI languages.

## How a translation key works

Each text has a key. n8n shows the translation if the key exists in the catalog of the active
language. If the key does not exist, n8n shows the English text.

A node key has this form:

```text
nodeTypes.<node type>.<section>.<path>
```

- `<node type>` is the full type of the node, for example `n8n-nodes-base.okta`.
- `<section>` is `header` for the node name and description, or `nodeView` for parameters and
  actions.
- `<path>` names the text, for example `operation.options.create.displayName`.

A credential key has this form:

```text
credentialTypes.<credential type>.<parameter name>.<field>
```

### Key reference

| Text | Key |
|---|---|
| Node name | `nodeTypes.<type>.header.displayName` |
| Node description | `nodeTypes.<type>.header.description` |
| Parameter label | `nodeTypes.<type>.nodeView.<param>.displayName` |
| Parameter tooltip | `nodeTypes.<type>.nodeView.<param>.description` |
| Parameter hint | `nodeTypes.<type>.nodeView.<param>.hint` |
| Parameter placeholder | `nodeTypes.<type>.nodeView.<param>.placeholder` |
| Option label | `nodeTypes.<type>.nodeView.<param>.options.<value>.displayName` |
| Option description | `nodeTypes.<type>.nodeView.<param>.options.<value>.description` |
| Action in the nodes panel | `nodeTypes.<type>.nodeView.operation.options.<value>.action` |
| Button to add a value | `nodeTypes.<type>.nodeView.<param>.multipleValueButtonText` |
| Button to add an optional field | `nodeTypes.<type>.nodeView.<param>.addOptionalFieldButtonText` |
| Text of a waiting trigger | `nodeTypes.<type>.nodeView.eventTriggerDescription` |
| Credential field label | `credentialTypes.<credType>.<param>.displayName` |
| Credential field tooltip | `credentialTypes.<credType>.<param>.description` |

`<param>` is the `name` of the parameter, not its label. `<value>` is the `value` of the option.

The description of an action uses the option description key.

### Keys of nested parameters

A parameter in a collection has a longer `<param>`. The key alternates `options` and `values`:

| Parameter | `<param>` |
|---|---|
| Field `label` in the collection `labels` | `labels.options.label` |
| Field `name` in the group `author` of the fixed collection `additionalParameters` | `additionalParameters.options.author.values.name` |

You do not need to make these keys yourself. The extraction commands in the guides write all keys
of a node.

## Translate built-in nodes

Built-in nodes come with n8n, for example Slack, Okta, or the HTTP Request node. You add their
translations to the catalog of your language. This is the same JSON file that you set in
`N8N_LOCALES`.

### Step 1: Write the English keys to a file

Run this command on your n8n instance:

```sh
n8n locales:extract-nodes --output=/home/node/en.nodes.json
```

With Docker, run the command in the container:

```sh
docker exec -it n8n n8n locales:extract-nodes --output=/home/node/.n8n/en.nodes.json
```

The file has the keys of all installed nodes and their English text:

```json
{
  "nodeTypes.n8n-nodes-base.okta.header.displayName": "Okta",
  "nodeTypes.n8n-nodes-base.okta.header.description": "Use the Okta API",
  "nodeTypes.n8n-nodes-base.okta.nodeView.operation.displayName": "Operation",
  "nodeTypes.n8n-nodes-base.okta.nodeView.operation.options.create.displayName": "Create",
  "nodeTypes.n8n-nodes-base.okta.nodeView.operation.options.create.action": "Create a new user"
}
```

### Step 2: Select the keys to translate

You do not have to translate all nodes. Copy the keys of the nodes that your users need. Delete
the other keys.

### Step 3: Translate the text

Replace the English text with your translation:

```json
{
  "nodeTypes.n8n-nodes-base.okta.header.description": "Usar la API de Okta",
  "nodeTypes.n8n-nodes-base.okta.nodeView.operation.displayName": "Operación",
  "nodeTypes.n8n-nodes-base.okta.nodeView.operation.options.create.displayName": "Crear",
  "nodeTypes.n8n-nodes-base.okta.nodeView.operation.options.create.action": "Crear un usuario"
}
```

Some characters have a special function in a catalog: `{`, `}`, `@`, and `|`. To show them as
text, write them as `{'{'}`, `{'}'}`, `{'@'}`, and `{'|'}`. The extraction command already writes
the English text in this form. Keep this form in your translation.

| You write | n8n shows |
|---|---|
| `e.g. {'{'}{'{'} $json.id {'}'}{'}'}` | `e.g. {{ $json.id }}` |
| `name{'@'}example.com` | `name@example.com` |
| `A {'|'} B` | `A | B` |

If you do not write a `|` in this form, n8n shows only the text before the `|`. If you do not
write `{`, `}`, or `@` in this form, n8n shows the English text.

### Step 4: Add the keys to your catalog

Add the translated keys to the JSON file of your language. Keep the other keys of the file.

```json
{
  "auth.signin": "Iniciar sesión",
  "nodeTypes.n8n-nodes-base.okta.nodeView.operation.displayName": "Operación"
}
```

If you load the catalog from `N8N_VERSIONED_LOCALES_BASE_URL`, add the keys to the file for each
n8n version that you serve.

### Step 5: Restart n8n

n8n reads a local catalog when it starts. Restart n8n after each change to the file.

### Step 6: Check the result

1. Open n8n and select the language. If `N8N_LOCALE_USER_OVERRIDE` is `true`, each user selects
   a language in **Settings** > **Personal**.
2. Open the nodes panel. Search for the node. Make sure that the node name, the description, and
   the actions show your translation.
3. Add the node to a workflow. Open its settings. Make sure that the parameters show your
   translation.

A text that shows in English has no key in the catalog, or the key has a typing error. Compare
the key with the output of step 1.

## Translate custom nodes

Custom nodes are community nodes and nodes that you build yourself. There are two ways to
translate them:

- [As the node author](#translate-as-the-node-author): you add the translations to the node
  package. All instances that install the package get them.
- [As the operator of an instance](#translate-as-the-operator-of-an-instance): you add the
  translations to the catalog of your instance. Use this way for a package that you do not own.

If both have a key, n8n shows the text from the catalog of the instance.

### Translate as the node author

The translation files of a package use keys without the package name. n8n adds the full node type
when it loads the package. So the keys work for each type of installation.

#### Step 1: Write the English keys to a file

In the folder of your node package, run:

```sh
npx n8n-node translations extract
```

The command writes `translations/en.json`. The file has the keys of all nodes and credentials in
the package:

```json
{
  "nodes.example.header.displayName": "Example",
  "nodes.example.header.description": "Basic Example Node",
  "nodes.example.nodeView.myString.displayName": "My String",
  "nodes.example.nodeView.myString.placeholder": "Placeholder value",
  "credentials.myCustomCredentialApi.apiKey.displayName": "API Key"
}
```

- `nodes.<name>` uses the `name` of the node from its description, for example `example`.
- `credentials.<name>` uses the `name` of the credential type.

#### Step 2: Make a file for each language

1. Copy `translations/en.json` to a file for the language, for example `translations/es.json`.
2. Translate the text. Do not change the keys.

```json
{
  "nodes.example.header.displayName": "Ejemplo",
  "nodes.example.header.description": "Nodo de ejemplo básico",
  "nodes.example.nodeView.myString.displayName": "Mi texto",
  "nodes.example.nodeView.myString.placeholder": "Valor de ejemplo",
  "credentials.myCustomCredentialApi.apiKey.displayName": "Clave de API"
}
```

Write the text as plain text. n8n shows characters such as `{` and `}` as they are.

You do not have to translate all keys. n8n shows the English text for a key that is missing.

#### Step 3: Declare the files in `package.json`

Add the field `translations` to the `n8n` section. Each key is a language code. Each value is
the path to the file:

```json
{
  "files": ["dist", "translations"],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "nodes": ["dist/nodes/Example/Example.node.js"],
    "credentials": ["dist/credentials/MyCustomCredentialApi.credentials.js"],
    "translations": {
      "es": "translations/es.json"
    }
  }
}
```

Add the folder `translations` to `files`. If you do not, npm does not publish the files.

n8n loads only the languages that the operator sets in `N8N_LOCALES`. A file for another
language has no effect.

#### Step 4: Test the translations

1. Build the package and install it in your local n8n, for example in `~/.n8n/custom`.
2. Start n8n with the language set in `N8N_LOCALES`.
3. Check the node in the nodes panel and in the node settings. Refer to step 6 of
   [Translate built-in nodes](#step-6-check-the-result).

n8n logs a warning if a translation file is not valid. Look for the name of your package in the
log.

#### Step 5: Publish the package

Publish a new version of the package. When an operator installs or updates the package, n8n loads
its translations. A restart is not necessary.

### Translate as the operator of an instance

Use this way when the package has no translations or when you want to change them.

#### Step 1: Find the type of the node

The key uses the full node type. The type depends on how you installed the package:

| Installation | Type |
|---|---|
| Community package, installed in **Settings** > **Community nodes** | `<package name>.<node name>`, for example `n8n-nodes-demo-node.example` |
| Folder `~/.n8n/custom` or `N8N_CUSTOM_EXTENSIONS` | `CUSTOM.<node name>`, for example `CUSTOM.example` |

To see the type, add the node to a workflow, select it, and copy it. Paste the content into a
text editor. The type is in the field `"type"`.

If you change how the package is installed, the type changes. Update the keys in your catalog
after such a change.

#### Step 2: Write the English keys to a file

Run the extraction command from
[Translate built-in nodes](#step-1-write-the-english-keys-to-a-file). The output includes all
installed nodes, also custom nodes:

```json
{
  "nodeTypes.CUSTOM.example.header.displayName": "Example",
  "nodeTypes.CUSTOM.example.nodeView.myString.displayName": "My String"
}
```

#### Step 3: Translate and add the keys

Do steps 2 to 6 of [Translate built-in nodes](#translate-built-in-nodes) with the keys of the
custom node:

```json
{
  "nodeTypes.CUSTOM.example.header.displayName": "Ejemplo",
  "nodeTypes.CUSTOM.example.nodeView.myString.displayName": "Mi texto",
  "credentialTypes.myCustomCredentialApi.apiKey.displayName": "Clave de API"
}
```

The keys in your catalog replace the keys of the package. Other keys of the package stay.

## Limits

- n8n does not translate the output of a node, error messages, or execution data.
- n8n does not translate the subtitle of a node on the canvas.
- A translation does not change the name of a node that is already in a workflow. It changes the
  default name of a node that you add.
- The search in the nodes panel finds the translated names and the English names.

## Catalogs with old keys

Catalogs from older n8n versions can have keys that start with `n8n-nodes-base.nodes.`,
`headers.`, or `n8n-nodes-base.credentials.`. n8n changes these keys to the new form when it
loads the catalog, and logs a warning. Replace the old keys with the output of the extraction
command. A future version of n8n will not support the old keys.
