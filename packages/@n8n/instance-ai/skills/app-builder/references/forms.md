# Forms

A `form` block renders the **Form Trigger** of a published workflow and posts the
visitor's answers to it. When the workflow continues with **n8n Form** nodes
(page type "Next Form Page" and "Form Ending"), the block walks the visitor
through every page and shows the ending on the same App page. Nothing else is
needed on the App side: one `form` block covers a one-page form and a
multi-page form alike.

## Build the workflow first

Use `workflow-builder` to create and publish the workflow, then reference its
id from the block:

```json
{ "id": "signup", "type": "form", "data": { "workflowId": "wf_xyz789", "submitLabel": "Start" } }
```

- The first node must be a **Form Trigger**. Its fields are the first page.
- Each further page is an **n8n Form** node with page type "Next Form Page".
  Its title, description, fields and button label come from that node; the
  block's `submitLabel` applies to the first page only.
- The last page is an **n8n Form** node with page type "Form Ending"
  (`completionTitle`, `completionMessage`). The block shows the title and the
  message in place of the form. A "Redirect URL" ending is shown as a link the
  visitor clicks; the App never navigates away on its own.
- Without a "Form Ending" node the block shows `successMessage` when the run
  ends.

## What the visitor sees

1. The Form Trigger page at the App page's URL.
2. After the first submit, the URL gains `?_form=<blockId>&_exec=<execution>&_sig=<token>`.
   Every further page and the ending render under that query. The token is the
   run's own resume token, the same one n8n's hosted form puts in its URL.
3. While the workflow runs between two pages the block shows "Processing…"
   with a refresh link. A page that is no longer available (the run failed or
   was deleted) shows a notice with a "Start over" link.

Field types on later pages: text, email, number, date, textarea, dropdown,
checkbox and radio lists, hidden fields and "Custom HTML" (sanitized). **File
uploads are not supported** on any page: a file field renders disabled with a
note. Form Trigger authentication options (basic auth, n8n user auth) are not
supported; leave authentication on "None".

## In `code` blocks

`ctx.workflows.submitForm(workflowId, fields)` starts the run the same way.
When the workflow pauses on a Form node the result is
`{ status: 'waiting', executionId }`, not an error. A code block cannot walk
the visitor through the later pages; use a `form` block for that. Treat
`waiting` like `success` when you only need to know that the submission was
recorded.

```tsx
export const actions = {
  async signup(ctx: ActionContext) {
    const result = await ctx.workflows.submitForm('wf_xyz789', { name: ctx.input.name });
    if (result.status === 'error') return { error: result.error };
    return { redirect: '?_status=ok' };
  },
};
```

`ctx.workflows.execute` (Execute Workflow Trigger) returns the same
`waiting` shape when that workflow pauses on a Wait node.
