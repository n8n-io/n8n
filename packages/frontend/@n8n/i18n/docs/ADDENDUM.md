# Addendum for i18n in n8n

## Base text

### Pluralization

Certain base text strings accept [singular and plural versions](https://kazupon.github.io/vue-i18n/guide/pluralization.html) separated by a `|` character:

```json
{
	"tagsView.inUse": "{count} workflow | {count} workflows"
}
```

### Interpolation

Certain base text strings use [interpolation](https://kazupon.github.io/vue-i18n/guide/formatting.html#named-formatting) to allow for a variable between curly braces:

```json
{
	"stopExecution.message": "The execution with the ID {activeExecutionId} got stopped!",
	"stopExecution.title": "Execution stopped"
}
```

When translating a string containing an interpolated variable, leave the variable untranslated:

```json
{
	"stopExecution.message": "Die Ausführung mit der ID {activeExecutionId} wurde gestoppt",
	"stopExecution.title": "Execution stopped"
}
```

### Reusable base text

As a convenience, the base text file may contain the special key `_reusableBaseText`, which defines strings that can be shared among other strings with the syntax `@:_reusableBaseText.key`, as follows:

```json
{
	"_reusableBaseText.save": "🇩🇪 Save",
	"duplicateWorkflowDialog.enterWorkflowName": "🇩🇪 Enter workflow name",
	"duplicateWorkflowDialog.save": "@:_reusableBaseText.save",
	"saveButton.save": "@:_reusableBaseText.save",
	"saveButton.saving": "🇩🇪 Saving",
	"saveButton.saved": "🇩🇪 Saved"
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
	"_reusableDynamicText.oauth2.clientId": "🇩🇪 Client ID",
	"_reusableDynamicText.oauth2.clientSecret": "🇩🇪 Client Secret"
}
```

### Special cases

`eventTriggerDescription` and `activationMessage` are dynamic node properties that are not part of node parameters. To translate them, set the key at the root level of the `nodeView` property in the node translation file.

Webhook node:

```json
{
	"nodeView.eventTriggerDescription": "🇩🇪 Waiting for you to call the Test URL"
}
```

Cron node:

```json
{
	"nodeView.activationMessage": "🇩🇪 'Your cron trigger will now trigger executions on the schedule you have defined."
}
```
