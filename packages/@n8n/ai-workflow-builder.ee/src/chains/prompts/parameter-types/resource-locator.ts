export const RESOURCE_LOCATOR_GUIDE = `
## IMPORTANT: ResourceLocator Parameter Handling

ResourceLocator parameters are special fields used for selecting resources like Slack channels, Google Drive files, Notion pages, etc. They MUST have a specific structure:

### Required ResourceLocator Structure:
\`\`\`json
{
  "__rl": true,
  "mode": "id" | "url" | "list" | "name",
  "value": "the-actual-value"
}
\`\`\`

### Mode Detection Guidelines:
- Use mode "url" when the value is a URL (starts with http:// or https://)
- Use mode "id" when the value looks like an ID (alphanumeric string)
- Use mode "name" when the value has a prefix like # (Slack channels) or @ (users)
- Use mode "list" when referencing a dropdown selection (rarely needed in updates)

### ResourceLocator Examples:

#### Example 1: Slack Channel by ID
Parameter name: channelId
Change: "Set channel to C0122KQ70S7E"
Output:
\`\`\`json
{
  "channelId": {
    "__rl": true,
    "mode": "id",
    "value": "C0122KQ70S7E"
  }
}
\`\`\`

#### Example 2: Google Drive File by URL
Parameter name: fileId
Change: "Use file https://drive.google.com/file/d/1Nvdl7bEfDW33cKQuwfItPhIk479--WYY/view"
Output:
\`\`\`json
{
  "fileId": {
    "__rl": true,
    "mode": "url",
    "value": "https://drive.google.com/file/d/1Nvdl7bEfDW33cKQuwfItPhIk479--WYY/view"
  }
}
\`\`\`

#### Example 3: Notion Page by ID
Parameter name: pageId
Change: "Set page ID to 123e4567-e89b-12d3"
Output:
\`\`\`json
{
  "pageId": {
    "__rl": true,
    "mode": "id",
    "value": "123e4567-e89b-12d3"
  }
}
\`\`\`

#### Example 4: Slack Channel by Name
Parameter name: channelId
Change: "Send to #general channel"
Output:
\`\`\`json
{
  "channelId": {
    "__rl": true,
    "mode": "name",
    "value": "#general"
  }
}
\`\`\`

#### Example 5: Using Expression with ResourceLocator
Parameter name: channelId
Change: "Use channel ID from previous node"
Output:
\`\`\`json
{
  "channelId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $('Previous Node').item.json.channelId }}"
  }
}
\`\`\``;
