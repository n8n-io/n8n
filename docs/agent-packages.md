# Agent packages

Agent Builder uses `.n8np` packages to move agent definitions between instances.
These actions use the same package service as workflow imports and exports.
Legacy agent `.json` files are no longer supported.

## Export an agent

1. Open a saved agent in Agent Builder.
2. Open the agent menu.
3. Select **Export package**.

The editor saves pending changes before it downloads the package. The package
contains the latest draft and its required sub-agents and workflows. It includes
skill bodies, custom tools, task definitions, and credential requirements.
Credential expressions can be exported. Literal credential values are excluded.

Your project role must allow agent export. You must also have export access to
each dependency. A missing or inaccessible dependency stops the export.

## Import a package

1. Open Agent Builder in the target project.
2. Open the agent menu.
3. Select **Import package**.
4. Choose an `.n8np` file.
5. Select **Import package** in the dialog.

Your project role must allow agent import. Packages with workflows also require
workflow import access. Loose agents are imported into the open project. A
whole-project package uses the project identities in the package.

Import keeps source IDs and adds a new version when an agent already exists in
the target project. It does not replace the open agent just because it is open.
If a source ID belongs to another project, the import stops. Use that project
or use the package CLI with new IDs.

New agents stay unpublished. Existing agents keep their publication state. The
dialog lists imported agents and reports credential placeholders and publication
failures. Imported content remains available if publication fails. Connect the
required credentials or install missing node types before you publish again.

Agent Builder refreshes the current agent if the result includes it. Otherwise,
it opens an agent from the result. An editor refresh failure does not undo an
import. Reload the page to view the imported content.

## Scope and advanced options

Knowledge base files, conversations, executions, checkpoints, learned memory,
and version history are excluded.

Use the [package CLI](../packages/@n8n/cli/docs/commands/package.md) to select
version, conflict, identity, dependency, and publishing policies.
