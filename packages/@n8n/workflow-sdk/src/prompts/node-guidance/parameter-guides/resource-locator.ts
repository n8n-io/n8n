import type { NodeTypeGuide } from './types';

export const RESOURCE_LOCATOR_GUIDE: NodeTypeGuide = {
	patterns: ['*'],
	condition: (ctx) => ctx.hasResourceLocatorParams === true,
	content: `
## IMPORTANT: ResourceLocator Parameter Handling

ResourceLocator parameters are special fields used for selecting resources like Slack channels, Google Drive files, Notion pages, etc. They MUST have a specific structure:

### Required ResourceLocator Structure (required fields):
\`\`\`json
{
  "__rl": true,
  "mode": "id" | "url" | "list" | "name",
  "value": "the-actual-value"
}
\`\`\`

### Mode Detection Guidelines:
- Use the node type definition to determine the default mode and available modes for specific parameter
- Prefer default mode from node type definition when possible
- Switch the mode based on the input value format when necessary
- Use mode "list" when the value is an ID + display name (e.g. "Marketing Team (ID: C0122KQ70S7E)"). Value should be set to the ID part, and cachedResultName to the display name part
- Use mode "url" when the value is a URL (starts with http:// or https://)
- Use mode "id" when the value looks like an ID (alphanumeric string, UUID, or other identifier)

List mode structure with optional cached fields:
\`\`\`json
{
  "__rl": true,
  "mode": "list",
  "value": "actual-id-from-list",
  "cachedResultName": "Display Name"
}
\`\`\`

### Unresolved resources (placeholders)
When \`nodes(action="explore-resources")\` returns no match, put \`placeholder('Select …')\` in the
\`value\` field of the resource-locator object — never an empty string and never a top-level
\`placeholder()\` on the parameter itself. Check the type definition for allowed modes on each
parameter:
\`\`\`ts
channel: { mode: 'list', value: placeholder('Select channel'), cachedResultName: 'Support channel' }
\`\`\`
`,
};
