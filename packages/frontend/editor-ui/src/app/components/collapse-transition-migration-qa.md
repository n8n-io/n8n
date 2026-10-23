Local QA notes for this branch.

This branch replaces `ElCollapseTransition` with `N8nAnimatedCollapsibleContent`. Confirm each list opens and closes, and the URLs stay copyable.

## Node settings

Open a workflow. Add a Webhook node. Open the node.

- The settings pane shows **Webhook URLs**.
- Click **Webhook URLs**. The URL list closes. Click it again. The list opens.
- The chevron turns when the list opens.
- Click a URL. The URL is copied.
- Switch **Test URL** and **Production URL** when both are shown.
- Repeat the open and close check on a Form Trigger (**Form URLs**), a Chat Trigger (**Chat URL**), and an MCP trigger (**MCP URL**).
- `packages/frontend/editor-ui/src/features/ndv/settings/components/NodeWebhooks.vue`

## Setup panel

Open a workflow that has a trigger. Open the setup panel. Start listening so the trigger shows a webhook URL.

- The card shows **Webhook URL**.
- Click **Webhook URL**. The URL list closes. Click it again. The list opens.
- Click a URL. The URL is copied.
- `packages/frontend/editor-ui/src/features/setupPanel/components/WebhookUrlPreview.vue`
- `packages/frontend/editor-ui/src/features/setupPanel/components/cards/SetupCard.vue`
- `packages/frontend/editor-ui/src/features/ai/assistant/components/Agent/BuilderSetupCard.vue`
