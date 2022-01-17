# Addendum for i18n in n8n

## Base text

### Interpolation

Certain base text strings use [interpolation](https://kazupon.github.io/vue-i18n/guide/formatting.html#named-formatting) to allow for a variable to be passed in, signalled by curly braces:

```json
{
	"stopExecution": {
		"message": "The execution with the ID {activeExecutionId} got stopped!",
		"title": "Execution stopped"
	}
}
```

When translating a string containing an interpolated variable, leave the variable untranslated:

```json
{
	"stopExecution": {
		"message": "Die Ausführung mit der ID {activeExecutionId} wurde gestoppt",
		"title": "Execution stopped"
	}
}
```

### Reusable base text

As a convenience, the base text file may contain the special key `reusableBaseText`, which defines strings that can be shared among other strings with the syntax `@:reusableBaseText.key`, as follows:

```json
{
	"reusableBaseText": {
		"save": "🇩🇪 Save",
	},
	"duplicateWorkflowDialog": {
		"enterWorkflowName": "🇩🇪 Enter workflow name",
		"save": "@:reusableBaseText.save",
	},
	"saveButton": {
		"save": "@:reusableBaseText.save",
		"saving": "🇩🇪 Saving",
		"saved": "🇩🇪 Saved",
	},
}
```

For more information, refer to Vue i18n's [linked locale messages](https://kazupon.github.io/vue-i18n/guide/messages.html#linked-locale-messages).

### Nodes in versioned dirs

For nodes in versioned dirs, place the `/translations` dir for the node translation file alongside the versioned `*.node.ts` file:

```
Mattermost
  └── Mattermost.node.ts
    └── v1
        ├── MattermostV1.node.ts
        ├── actions
        ├── methods
        ├── transport
        └── translations
            └── de
                └── mattermost.json
```

### Nodes in grouping dirs

For nodes in grouping dirs, e.g. Google nodes, place the `/translations` dir for the node translation file alongside the `*.node.ts` file:

```
Google
  ├── Books
  ├── Calendar
  └── Drive
      ├── GoogleDrive.node.ts
      └── translations
          └── de
              ├── googleDrive.json
              └── googleDriveTrigger.json
```

## Dynamic text

### Reusable dynamic text

The base text file may contain the special key `reusableDynamicText`, allowing for a node parameter to be translated once and reused in all other node parameter translations.

Currently only the keys `oauth.clientId` and `oauth.clientSecret` are supported as a PoC - these two translations will be reused in all node credential parameters.

```json
{
	"reusableDynamicText": {
		"oauth2": {
			"clientId": "🇩🇪 Client ID",
			"clientSecret": "🇩🇪 Client Secret",
		}
	}
}
```

### Special cases

`eventTriggerDescription` and `activationMessage` are dynamic node properties that are not part of node parameters. To translate them, set the key at the root level of the `nodeView` property in the node translation file.

Webhook node:

```json
{
	"nodeView": {
		"eventTriggerDescription": "🇩🇪 Waiting for you to call the Test URL",
	}
}
```

Cron node:

```json
{
	"nodeView": {
		"activationMessage": "🇩🇪 'Your cron trigger will now trigger executions on the schedule you have defined."
	}
}
```

## Best practices for UI development

When creating a new component, create a new component key in `en.json` with the component name in camel case. Place the key in `en.json` in alphabetical order.

In most cases, the new component is created in `/components`, e.g. `/components/About.vue`. But if the component is created in a nested dir, e.g. `/components/CredentialEdit/CredentialConfig.vue`, ensure this nesting is reflected in `en.json`.

```json
{
	"credentialEdit": {
		"credentialConfig": {
			"accountConnected": "Account connected"
		}
	}
}
```

The translation key should be the display string in camel case, cropped if too long. HTML is allowed in the display string.

```json
{
	"workflowActivator": {
		"theWorkflowIsSetToBeActiveBut": "The workflow is set to be active but could not be started.<br />Click to display error message."
	}
}
```

As an exception, keys for toast contents should use `message` and `title`.

```json
{
	"workflowRun": {
		"noActiveConnectionToTheServer": "No active connection to server. It is maybe down.",
		"showMessage": {
			"message": "The workflow has issues. Please fix them first",
			"title": "Workflow cannot be executed"
		}
	}
}
```

Differentiate multiple toasts with symbols from the code (e.g. method name) and if needed with numbers.

```json
{
	"workflowSettings": {
		"showError": {
			"saveSettings1": {
				"errorMessage": "Timeout is activated but set to 0",
				"message": "There was a problem saving the settings",
				"title": "Problem saving settings"
			},
			"saveSettings2": {
				"errorMessage": "Maximum Timeout is: {hours} hours, {minutes} minutes, {seconds} seconds",
				"message": "Set timeout is exceeding the maximum timeout!",
				"title": "Problem saving settings"
			},
			"saveSettings3": {
				"message": "There was a problem saving the settings",
				"title": "Problem saving settings"
			}
		}
	}
}
```

Escape double quotes.

```json
{
	"tagsDropdown": {
		"createTag": "Create tag \"{filter}\"",
	}
}
```
