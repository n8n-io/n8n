export const RESOURCE_LOCATOR_EXAMPLES = `
### ResourceLocator Examples

#### Example 1: Slack Node - Channel by ID
Current Parameters:
{
  "select": "channel",
  "channelId": {
    "__rl": true,
    "value": "",
    "mode": "list"
  },
  "otherOptions": {}
}

Requested Changes: Send to channel C0122KQ70S7E

Expected Output:
{
  "select": "channel",
  "channelId": {
    "__rl": true,
    "mode": "id",
    "value": "C0122KQ70S7E"
  },
  "otherOptions": {}
}

#### Example 2: Google Drive Node - File by URL
Current Parameters:
{
  "operation": "download",
  "fileId": {
    "__rl": true,
    "value": "",
    "mode": "list"
  }
}

Requested Changes: Use file https://drive.google.com/file/d/1ABC123XYZ/view

Expected Output:
{
  "operation": "download",
  "fileId": {
    "__rl": true,
    "mode": "url",
    "value": "https://drive.google.com/file/d/1ABC123XYZ/view"
  }
}

#### Example 3: Notion Node - Page ID from Expression
Current Parameters:
{
  "resource": "databasePage",
  "operation": "get",
  "pageId": {
    "__rl": true,
    "value": "hardcoded-page-id",
    "mode": "id"
  }
}

Requested Changes: Use page ID from the previous node's output

Expected Output:
{
  "resource": "databasePage",
  "operation": "get",
  "pageId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $('Previous Node').item.json.pageId }}"
  }
}`;
