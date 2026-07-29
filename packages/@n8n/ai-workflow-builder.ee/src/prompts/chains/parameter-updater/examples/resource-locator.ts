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

#### Example 2: Slack Node - Channel by name
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

Requested Changes: Set channel to general (ID: C0A45D6GBLD)

Expected Output:
{
  "select": "channel",
  "channelId": {
    "__rl": true,
    "mode": "list",
		"value": "C0A45D6GBLD",
		"cachedResultName": "general"
  },
  "otherOptions": {}
}

#### Example 3: Google Sheets Node - Spreadsheet by name
Current Parameters:
{
  "operation": "read",
  "documentId": {
    "__rl": true,
    "value": "",
    "mode": "list"
  },
  "sheetName": {
    "__rl": true,
    "value": "",
    "mode": "list"
  }
}

Requested Changes: Use the "Sales Report 2024" spreadsheet and "Q1 Data" sheet

Expected Output:
{
  "operation": "read",
  "documentId": {
    "__rl": true,
    "mode": "list",
    "value": "2wtaOwM07OTFmEijOVvzDAlxtR76hBYVBRlIwuUgDsVE",
    "cachedResultName": "Sales Report 2024",
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/2wtaOwM07OTFmEijOVvzDAlxtR76hBYVBRlIwuUgDsVE/edit?usp=drivesdk"
    
  },
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": "gid=0",
    "cachedResultName": "Q1 Data"
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/2wtaOwM07OTFmEijOVvzDAlxtR76hBYVBRlIwuUgDsVE/edit#gid=0"
  }
}

#### Example 4: Google Drive Node - File by URL
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

#### Example 5: Notion Node - Page ID from Expression
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
}

#### Example 6: Mode Switch - From ID to List
Current Parameters:
{
  "operation": "append",
  "documentId": {
    "__rl": true,
    "value": "1ABC123XYZ",
    "mode": "id"
  }
}

Requested Changes: Use the "Customer Database" (ID: 9XYZ789DEF) spreadsheet

Expected Output:
{
  "operation": "append",
  "documentId": {
    "__rl": true,
    "mode": "list",
    "value": "9XYZ789DEF",
    "cachedResultName": "Customer Database"
  }
}`,
};
