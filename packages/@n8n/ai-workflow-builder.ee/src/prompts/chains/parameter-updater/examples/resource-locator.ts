import type { NodeTypeExamples } from '../types';

export const RESOURCE_LOCATOR_EXAMPLES: NodeTypeExamples = {
	patterns: ['*'],
	condition: (ctx) => ctx.hasResourceLocatorParams === true,
	content: `
### ResourceLocator Examples

#### Example 1: Slack Node - Channel by ID
Current Parameters:
{
  "select": "channel",
  "channelId": { "__rl": true, "value": "", "mode": "list" },
  "otherOptions": {}
}

Requested Changes: Send to channel C0122KQ70S7E

Output:
{
  "parameters": [
    { "path": "select", "type": "string", "value": "channel" },
    { "path": "channelId.__rl", "type": "boolean", "value": "true" },
    { "path": "channelId.mode", "type": "string", "value": "id" },
    { "path": "channelId.value", "type": "string", "value": "C0122KQ70S7E" }
  ]
}

#### Example 2: Google Drive Node - File by URL
Current Parameters:
{
  "operation": "download",
  "fileId": { "__rl": true, "value": "", "mode": "list" }
}

Requested Changes: Use file https://drive.google.com/file/d/1ABC123XYZ/view

Output:
{
  "parameters": [
    { "path": "operation", "type": "string", "value": "download" },
    { "path": "fileId.__rl", "type": "boolean", "value": "true" },
    { "path": "fileId.mode", "type": "string", "value": "url" },
    { "path": "fileId.value", "type": "string", "value": "https://drive.google.com/file/d/1ABC123XYZ/view" }
  ]
}

#### Example 3: Notion Node - Page ID from Expression
Current Parameters:
{
  "resource": "databasePage",
  "operation": "get",
  "pageId": { "__rl": true, "value": "hardcoded-page-id", "mode": "id" }
}

Requested Changes: Use page ID from the previous node's output

Output:
{
  "parameters": [
    { "path": "resource", "type": "string", "value": "databasePage" },
    { "path": "operation", "type": "string", "value": "get" },
    { "path": "pageId.__rl", "type": "boolean", "value": "true" },
    { "path": "pageId.mode", "type": "string", "value": "id" },
    { "path": "pageId.value", "type": "string", "value": "={{ $('Previous Node').item.json.pageId }}" }
  ]
}`,
};
