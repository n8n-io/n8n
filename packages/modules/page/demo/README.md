# Pages demo

Sample content to try the page module on a local instance.

## Contents

- `workflows/`: nine workflows, one JSON file for each.
- `pages/`: two pages in Markdown. They link the workflows, their nodes, a credential and a data table.
- `manifest.json`: the ids that the files use, and the credential and the data table to create.
- `seed.mjs`: loads all of it into the personal project of a user.
- `seed-undocumented.mjs`: loads a team project "Acme Operations" with 15 workflows, 5 credentials and no page.

## Load the demo

Start n8n, then run from the repository root:

```bash
export N8N_EMAIL=<your login email>
export N8N_PASSWORD=<your password>
node packages/modules/page/demo/seed.mjs
```

Set `N8N_BASE_URL` when the instance is not at `http://localhost:5678`.

The script keeps a resource whose name already exists, so you can run it again.
It replaces the ids in the files with the ids of your instance.
The credential holds a placeholder value, and the workflows call `example.com` addresses.
They are made to be read, not run. The workflow "Daily sales report" is the exception: "Run now" runs it without network.

## What to try

1. Open the page "Orders runbook". Hover a chip, then look at "Links" under the title.
2. Open the workflow "Sync orders to CRM". Its sticky note shows the page, and three nodes have a pages badge.
3. Open "AI inbox assistant", select the pages button, then "Document with AI". This needs the n8n Assistant.
4. Open the page "Daily sales report" in one tab. In another tab, run the workflow "Daily sales report" from "Run now". The section "Latest report" of the page changes without a reload.

## Try "Sort it out!"

This needs the n8n Assistant and team projects.

```bash
node packages/modules/page/demo/seed-undocumented.mjs
```

1. Open the project "Acme Operations". Its overview shows the list of workflows and the button "Sort it out!".
2. Select "Sort it out!". The assistant writes pages for the most important workflows.
3. Open the project again. Its overview is now the documentation board. Workflows without a page show with a dashed border.
