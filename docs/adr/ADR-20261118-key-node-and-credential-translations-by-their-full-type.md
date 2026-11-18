# Key node and credential translations by their full type

Date: 2026-11-18

Status: Active

Decision Owner: API & OEM

Source: https://linear.app/n8n/issue/API-92

## Context

The UI translates the text of a node with keys in a locale catalog. Operators write these
catalogs, and node packages will ship them. The UI builds the keys in `@n8n/i18n`. The current
keys have three problems:

- The keys of every node start with `n8n-nodes-base.nodes.`. Custom, community, and LangChain
  nodes are not in `n8n-nodes-base`.
- The UI removes the prefix `n8n-nodes-base.` from built-in node types only. Each tool that
  builds or reads keys must copy this rule.
- The name and the description of a node are under `headers.<type>`. Its parameters are under
  `n8n-nodes-base.nodes.<type>.nodeView`.

The type of a custom node depends on how it is installed, for example `CUSTOM.example` or
`n8n-nodes-demo-node.example`. The documented translation file format has keys relative to the
node: `header.*` and `nodeView.*`.

## Decision

The key of a node text is `nodeTypes.<type>.` followed by the key of the documented file format.
The key of a credential text is `credentialTypes.<credType>.` followed by the key of the
credential file format.

| Text | Key |
|---|---|
| Node name | `nodeTypes.<type>.header.displayName` |
| Parameter label | `nodeTypes.<type>.nodeView.<path>.displayName` |
| Option label | `nodeTypes.<type>.nodeView.<path>.options.<value>.displayName` |
| Credential field label | `credentialTypes.<credType>.<param>.displayName` |

`<type>` is the full node type for every node, for example `n8n-nodes-base.okta`,
`CUSTOM.example`, or `@n8n/n8n-nodes-langchain.agent`. No package has a special case.

The main reason: one rule for all nodes. The docs then explain one format for operator catalogs,
package files, and node files. Every tool that builds or reads keys uses the same rule.

## Alternatives Considered

**Keep the current keys.** We rejected it because the problems become permanent when the
operator docs publish the keys. A later rename would break every operator catalog.

**Use the new root, but remove `n8n-nodes-base.` from built-in node types.** We rejected it
because it keeps the special case. The keys of built-in nodes would be shorter, but translators
copy keys from an extraction tool and do not type them.

**Rename the keys of non-base nodes only.** We rejected it because each tool would need two
schemes. It would also protect only the keys of built-in nodes, and almost no catalogs have them.

**Use a key relative to the package, without the package name.** We rejected it because two
packages can have a node with the same name. The loader must add the package name to keep the
keys unique.

## Consequences

- Catalogs with the old keys stop working unless the UI maps the old keys to the new keys. Such
  catalogs can exist in forks and OEM installations.
- The keys of built-in nodes are longer, for example
  `nodeTypes.n8n-nodes-base.okta.nodeView.operation.displayName`.
- A node type contains dots. A tool cannot split a key on dots to find the type. It must find the
  type as the part between `nodeTypes.` and `.header.` or `.nodeView.`.
- An operator key for a custom node changes when the operator changes how the node is installed,
  for example from `CUSTOM.example` to `n8n-nodes-demo-node.example`.
- A package file has keys relative to the package. The loader adds the type, so a node author
  does not need to know it.
- `nodeTypes` and `credentialTypes` are reserved roots. A UI text key must not use them.

## Links

RFC: -

Documentation: PLAN-node-translations.md

Related ADRs: -
