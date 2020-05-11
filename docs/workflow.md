# Workflow


## Activate

Activating a workflow means that the Trigger and Webhook nodes get activated and can trigger a workflow to run. By default all the newly created workflows are deactivated. That means that even if a Trigger node like the Cron node should start a workflow because a predefined time is reached, it will not unless the workflow gets activated. It is only possible to activate a workflow which contains a Trigger or a Webhook node.


## Data Flow

Nodes do not only process one "item", they process multiple ones. So if the Trello node is set to "Create-Card" and it has an expression set for "Name" to be set depending on "name" property, it will create a card for each item, always choosing the name-property-value of the current one.

This data would, for example, create two boards. One named "test1" the other one named "test2":

```json
[
	{
		name: "test1"
	},
	{
		name: "test2"
	}
]
```


## Error Workflows

For each workflow, an optional "Error Workflow" can be set. It gets executed in case the execution of the workflow fails. That makes it possible to, for instance, inform the user via Email or Slack if something goes wrong. The same "Error Workflow" can be set on multiple workflows.

The only difference between a regular workflow and an "Error Workflow" is that it contains an "Error Trigger" node. So it is important to make sure that this node gets created before setting a workflow as "Error Workflow".

The "Error Trigger" node will trigger in case the execution fails and receives information about it. The data looks like this:

```json
[
	{
		"execution": {
			"id": "231",
			"url": "https://n8n.example.com/execution/231",
			"retryOf": "34",
			"error": {
				"message": "Example Error Message",
				"stack": "Stacktrace"
			},
			"lastNodeExecuted": "Node With Error",
			"mode": "manual"
		},
		"workflow": {
			"id": "1",
			"name": "Example Workflow"
		}
	}
]

```

All information is always present except:
- **execution.id**: Only present when the execution gets saved in the database
- **execution.url**: Only present when the execution gets saved in the database
- **execution.retryOf**: Only present when the execution is a retry of a previously failed execution


### Setting Error Workflow

An "Error Workflow" can be set in the Workflow Settings which can be accessed by pressing the "Workflow" button in the menu on the on the left side. The last option is "Settings". In the window that appears, the "Error Workflow" can be selected via the Dropdown "Error Workflow".


## Share Workflows

All workflows are JSON and can be shared very easily.

There are multiple ways to download a workflow as JSON to then share it with other people via Email, Slack, Skype, Dropbox, …

  1. Press the "Download" button under the Workflow menu in the sidebar on the left. It then downloads the workflow as a JSON file.
  1. Select the nodes in the editor which should be exported and then copy them (Ctrl + c). The nodes then get saved as JSON in the clipboard and can be pasted wherever desired (Ctrl + v).

Importing that JSON representation again into n8n is as easy and can also be done in different ways:

  1. Press "Import from File" or "Import from URL" under the Workflow menu in the sidebar on the left.
  1. Copy the JSON workflow to the clipboard (Ctrl + c) and then simply pasting it directly into the editor (Ctrl + v).


## Workflow Settings

On each workflow, it is possible to set some custom settings and overwrite some of the global default settings. Currently, the following settings can be set:


### Error Workflow

Workflow to run in case the execution of the current workflow fails. More information in section [Error Workflows](#error-workflows).


### Timezone

The timezone to use in the current workflow. If not set, the global Timezone (by default "New York" gets used). For instance, this is important for the Cron Trigger node.


### Save Data Error Execution

If the Execution data of the workflow should be saved when it fails.


### Save Data Success Execution

If the Execution data of the workflow should be saved when it succeeds.


### Save Manual Executions

If executions started from the Editor UI should be saved.
