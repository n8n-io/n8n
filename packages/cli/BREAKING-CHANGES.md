# n8n Breaking Changes

This list shows all the versions which include breaking changes and how to upgrade.

## 0.198.0

### What changed?

The Merge node list of operations was rearranged.

### When is action necessary?

If you are using the overhauled Merge node and 'Merge By Fields', 'Merge By Position' or 'Multiplex' operation.

### How to upgrade:

Go to the workflows that use the Merge node, select 'Combine' operation and then choose an option from 'Combination Mode' that matches an operation that was previously used. If you want to continue even on error, you can set "Continue on Fail" to true.

## 0.171.0

### What changed?

The GraphQL node now errors when the response includes an error.

### When is action necessary?

If you are using the GraphQL node.

### How to upgrade:

Go to the workflows that use the GraphQL node and adjust them to the new behavior. If you want to continue even on error, you can set "Continue on Fail" to true.

## 0.165.0

### What changed?

The Hive node now correctly rejects invalid SSL certificates when the "Ignore SSL Issues" option is set to False.

### When is action necessary?

If you are using a self signed certificate with The Hive.

### How to upgrade:

Go to the credentials for The Hive, Enable the "Ignore SSL Issues" option.

## 0.139.0

### What changed?

For the HubSpot Trigger node, the authentication process has changed to OAuth2.

### When is action necessary?

If you are using the Hubspot Trigger.

### How to upgrade:

Create an app in HubSpot, use the Client ID, Client Secret, App ID, and the Developer Key, and complete the OAuth2 flow.

## 0.135.0

### What changed?

The in-node core methods for credentials and binary data have changed.

### When is action necessary?

If you are using custom n8n nodes.

### How to upgrade:

1. The method `this.getCredentials(myNodeCredentials)` is now async. So `await` has to be added in front of it.

Example:

```typescript
// Before 0.135.0:
const credentials = this.getCredentials(credentialTypeName);

// From 0.135.0:
const credentials = await this.getCredentials(myNodeCredentials);
```

2. Binary data should not get accessed directly anymore, instead the method `await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName)` has to be used.

Example:

```typescript
const items = this.getInputData();

for (const i = 0; i < items.length; i++) {
	const item = items[i].binary as IBinaryKeyData;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
	const binaryData = item[binaryPropertyName] as IBinaryData;
	// Before 0.135.0:
	const binaryDataBuffer = Buffer.from(binaryData.data, BINARY_ENCODING);
	// From 0.135.0:
	const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
}
```

## 0.131.0

### What changed?

For the Pipedrive regular node, the `deal:create` operation now requires an organization ID or person ID, in line with upcoming changes to the Pipedrive API.

### When is action necessary?

If you are using the `deal:create` operation in the Pipedrive regular node, set an organization ID or a person ID.

## 0.130.0

### What changed?

For the Taiga regular and trigger nodes, the server and cloud credentials types are now unified into a single credentials type and the `version` param has been removed. Also, the `issue:create` operation now automatically loads the tags as `multiOptions`.

### When is action necessary?

If you are using the Taiga nodes, reconnect the credentials. If you are using tags in the `issue:create` operation, reselect them.

## 0.127.0

### What changed?

For the Zoho node, the `lead:create` operation now requires a "Company" parameter, the parameter "Address" is now inside "Additional Options", and the parameters "Title" and "Is Duplicate Record" were removed. Also, the `lead:delete` operation now returns only the `id` of the deleted lead.

### When is action necessary?

If you are using `lead:create` with "Company" or "Address", reset the parameters; for the other two parameters, no action needed. If you are using the response from `lead:delete`, reselect the `id` key.

## 0.118.0

### What changed?

The minimum Node.js version required for n8n is now v14.

### When is action necessary?

If you're using n8n via npm or PM2 or if you're contributing to n8n.

### How to upgrade:

Update the Node.js version to v14 or above.

---

### What changed?

In the Postgres, CrateDB, QuestDB and TimescaleDB nodes the `Execute Query` operation returns the result from all queries executed instead of just one of the results.

### When is action necessary?

If you use any of the above mentioned nodes with the `Execute Query` operation and the result is relevant to you, you are encouraged to revisit your logic. The node output may now contain more information than before. This change was made so that the behavior is more consistent across n8n where input with multiple rows should yield results acccording all input data instead of only one. Please note: n8n was already running multiple queries based on input. Only the output was changed.

## 0.117.0

### What changed?

Removed the "Activation Trigger" node. This node was replaced by two other nodes.

The "Activation Trigger" node was added on version 0.113.0 but was not fully compliant to UX, so we decided to refactor and change it ASAP so it affects the least possible users.

The new nodes are "n8n Trigger" and "Workflow Trigger". Behavior-wise, the nodes do the same, we just split the functionality to make it more intuitive to users.

### When is action necessary?

If you use the "Activation Trigger" in any of your workflows, please replace it by the new nodes.

### How to upgrade:

Remove the previous node and add the new ones according to your workflows.

---

Changed the behavior for nodes that use Postgres Wire Protocol: Postgres, QuestDB, CrateDB and TimescaleDB.

All nodes have been standardized and now follow the same patterns. Behavior will be the same for most cases, but new added functionality can now be explored.

You can now also inform how you would like n8n to execute queries. Default mode is `Multiple queries` which translates to previous behavior, but you can now run them `Independently` or `Transaction`. Also, `Continue on Fail` now plays a major role for the new modes.

The node output for `insert` operations now rely on the new parameter `Return fields`, just like `update` operations did previously.

### When is action necessary?

If you rely on the output returned by `insert` operations for any of the mentioned nodes, we recommend you review your workflows.

By default, all `insert` operations will have `Return fields: *` as the default, setting, returning all information inserted.

Previously, the node would return all information it received, without taking into account what actually happened in the database.

## 0.113.0

### What changed?

In the Dropbox node, both credential types (Access Token & OAuth2) have a new parameter called "APP Access Type".

### When is action necessary?

If you are using a Dropbox APP with permission type, "App Folder".

### How to upgrade:

Open your Dropbox node's credentials and set the "APP Access Type" parameter to "App Folder".

## 0.111.0

### What changed?

In the Dropbox node, now all operations are performed relative to the user's root directory.

### When is action necessary?

If you are using any resource/operation with OAuth2 authentication.

If you are using the `folder:list` operation with the parameter `Folder Path` empty (root path) and have a Team Space in your Dropbox account.

### How to upgrade:

Open the Dropbox node, go to the OAuth2 credential you are using and reconnect it again.

Also, if you are using the `folder:list` operation, make sure your logic is taking into account the team folders in the response.

## 0.105.0

### What changed?

In the Hubspot Trigger, now multiple events can be provided and the field `App ID` was so moved to the credentials.

### When is action necessary?

If you are using the Hubspot Trigger node.

### How to upgrade:

Open the Hubspot Trigger and set the events again. Also open the credentials `Hubspot Developer API` and set your APP ID.

## 0.104.0

### What changed?

Support for MongoDB as a database for n8n has been dropped as MongoDB had problems saving large amounts of data in a document, among other issues.

### When is action necessary?

If you have been using MongoDB as a database for n8n. Please note that this is not related to the MongoDB node.

### How to upgrade:

Before upgrading, you can [export](https://docs.n8n.io/reference/start-workflows-via-cli.html#export-workflows-and-credentials) all your credentials and workflows using the CLI.

```
n8n export:workflow --backup --output=backups/latest/
n8n export:credentials --backup --output=backups/latest/
```

You can then change the database to one of the supported databases mentioned [here](https://docs.n8n.io/reference/data/database.html). Finally, you can upgrade n8n and [import](https://docs.n8n.io/reference/start-workflows-via-cli.html#import-workflows-and-credentials) all your credentials and workflows back into n8n.

```
n8n import:workflow --separate --input=backups/latest/
n8n import:credentials --separate --input=backups/latest/
```

## 0.102.0

### What changed?

- The `As User` property and the `User Name` field got combined and renamed to `Send as User`. It also got moved under “Add Options”.
- The `Ephemeral` property got removed. To send an ephemeral message, you have to select the "Post (Ephemeral)" operation.

### When is action necessary?

If you are using the following fields or properties in the Slack node:

- As User
- Ephemeral
- User Name

### How to upgrade:

Open the Slack node and set them again to the appropriate values.

---

### What changed?

If you have a question in Typeform that uses a previously answered question as part of its text, the question text would look like this in the Typeform Trigger node:

`You have chosen {{field:23234242}} as your answer. Is this correct?`

Those curly braces broke the expression editor. The change makes it now display like this:

`You have chosen [field:23234242] as your answer. Is this correct?`

### When is action necessary?

If you are using the Typeform Trigger node with questions using the [Recall information](https://help.typeform.com/hc/en-us/articles/360050447072-What-is-Recall-information-) feature.

### How to upgrade:

In workflows using the Typeform Trigger node, nodes that reference such key names (questions that use a previously answered question as part of its text) will need to be updated.

## 0.95.0

### What changed?

In the Harvest Node, we moved the account field from the credentials to the node parameters. This will allow you to work witn multiples accounts without having to create multiples credentials.

### When is action necessary?

If you are using the Harvest Node.

### How to upgrade:

Open the node set the parameter `Account ID`.

## 0.94.0

### What changed?

In the Segment Node, we have changed how the properties 'traits' and 'properties' are defined. Now, key/value pairs can be provided, allowing you to send customs traits/properties.

### When is action necessary?

When the properties 'traits' or 'properties' are set, and one of the following resources/operations is used:

| Resource | Operation |
| -------- | --------- |
| Identify | Create    |
| Track    | Event     |
| Track    | Page      |
| Group    | Add       |

### How to upgrade:

Open the affected resource/operation and set the parameters 'traits' or 'properties' again.

## 0.93.0

### What changed?

Change in naming of the Authentication field for the Pipedrive Trigger node.

### When is action necessary?

If you had set "Basic Auth" for the "Authentication" field in the node.

### How to upgrade:

The "Authentication" field has been renamed to "Incoming Authentication". Please set the parameter “Incoming Authentication” to “Basic Auth” to activate it again.

## 0.90.0

### What changed?

Node.js version 12.9 or newer is required to run n8n.

### When is action necessary?

If you are running Node.js version older than 12.9.

### How to upgrade:

You can find download and install the latest version of Node.js from [here](https://nodejs.org/en/download/).

## 0.87.0

### What changed?

The link.fish node got removed because the service is shutting down.

### When is action necessary?

If you are are actively using the link.fish node.

### How to upgrade:

Unfortunately, that's not possible. We'd recommend you to look for an alternative service.

## 0.83.0

### What changed?

In the Active Campaign Node, we have changed how the `getAll` operation works with various resources for the sake of consistency. To achieve this, a new parameter called 'Simple' has been added.

### When is action necessary?

When one of the following resources/operations is used:

| Resource                  | Operation |
| ------------------------- | --------- |
| Deal                      | Get All   |
| Connector                 | Get All   |
| E-commerce Order          | Get All   |
| E-commerce Customer       | Get All   |
| E-commerce Order Products | Get All   |

### How to upgrade:

Open the affected resource/operation and set the parameter `Simple` to false.

## 0.79.0

### What changed?

We have renamed the operations in the Todoist Node for consistency with the codebase. We also deleted the `close_match` and `delete_match` operations as these can be accomplished using the following operations: `getAll`, `close`, and `delete`.

### When is action necessary?

When one of the following operations is used:

- close_by
- close_match
- delete_id
- delete_match

### How to upgrade:

After upgrading, open all workflows which contain the Todoist Node. Set the corresponding operation, and then save the workflow.

If the operations `close_match` or `delete_match` are used, recreate them using the operations: `getAll`, `delete`, and `close`.

## 0.69.0

### What changed?

We have simplified how attachments are handled by the Twitter node. Rather than clicking on `Add Attachments` and having to specify the `Catergory`, you can now add attachments by just clicking on `Add Field` and selecting `Attachments`. There's no longer an option to specify the type of attachment you are adding.

### When is action necessary?

If you have used the Attachments option in your Twitter nodes.

### How to upgrade:

You'll need to re-create the attachments for the Twitter node.

## 0.68.0

### What changed?

To make it easier to use the data which the Slack-Node outputs we no longer return the whole
object the Slack-API returns if the only other property is `"ok": true`. In this case it returns
now directly the data under "channel".

### When is action necessary?

When you currently use the Slack-Node with Operations Channel -> Create and you use
any of the data the node outputs.

### How to upgrade:

All values that get referenced which were before under the property "channel" are now on the main level.
This means that these expressions have to get adjusted.

Meaning if the expression used before was:

```
{{ $node["Slack"].data["channel"]["id"] }}
```

it has to get changed to:

```
{{ $node["Slack"].data["id"] }}
```

## 0.67.0

### What changed?

The names of the following nodes were not set correctly and got fixed:

- AMQP Sender
- Bitbucket-Trigger
- Coda
- Eventbrite-Trigger
- Flow
- Flow-Trigger
- Gumroad-Trigger
- Jira
- Mailchimp-Trigger
- PayPal Trigger
- Read PDF
- Rocketchat
- Shopify
- Shopify-Trigger
- Stripe-Trigger
- Toggl-Trigger

### When is action necessary?

If any of the nodes mentioned above, are used in any of your workflows.

### How to upgrade:

For the nodes mentioned above, you'll need to give them access to the credentials again by opening the credentials and moving them from "No Access" to "Access". After you've done that, there are two ways to upgrade the workflows and to make them work in the new version:

**Simple**

- Note down the settings of the nodes before upgrading
- After upgrading, delete the nodes mentioned above from your workflow, and recreate them

**Advanced**

After upgrading, select the whole workflow in the editor, copy it, and paste it into a text editor. In the JSON, change the node types manually by replacing the values for "type" as follows:

- "n8n-nodes-base.amqpSender" -> "n8n-nodes-base.amqp"
- "n8n-nodes-base.bitbucket" -> "n8n-nodes-base.bitbucketTrigger"
- "n8n-nodes-base.Coda" -> "n8n-nodes-base.coda"
- "n8n-nodes-base.eventbrite" -> "n8n-nodes-base.eventbriteTrigger"
- "n8n-nodes-base.Flow" -> "n8n-nodes-base.flow"
- "n8n-nodes-base.flow" -> "n8n-nodes-base.flowTrigger"
- "n8n-nodes-base.gumroad" -> "n8n-nodes-base.gumroadTrigger"
- "n8n-nodes-base.Jira Software Cloud" -> "n8n-nodes-base.jira"
- "n8n-nodes-base.Mailchimp" -> "n8n-nodes-base.mailchimpTrigger"
- "n8n-nodes-base.PayPal" -> "n8n-nodes-base.payPalTrigger"
- "n8n-nodes-base.Read PDF" -> "n8n-nodes-base.readPDF"
- "n8n-nodes-base.Rocketchat" -> "n8n-nodes-base.rocketchat"
- "n8n-nodes-base.shopify" -> "n8n-nodes-base.shopifyTrigger"
- "n8n-nodes-base.shopifyNode" -> "n8n-nodes-base.shopify"
- "n8n-nodes-base.stripe" -> "n8n-nodes-base.stripeTrigger"
- "n8n-nodes-base.toggl" -> "n8n-nodes-base.togglTrigger"

Then delete all existing nodes, and then paste the changed JSON directly into n8n. It should then recreate all the nodes and connections again, this time with working nodes.

## 0.62.0

### What changed?

The function "evaluateExpression(...)" got renamed to "$evaluateExpression()"
in Function and FunctionItem Nodes to simplify code and to normalize function
names.

### When is action necessary?

If "evaluateExpression(...)" gets used in any Function or FunctionItem Node.

### How to upgrade:

Simply replace the "evaluateExpression(...)" with "$evaluateExpression(...)".

## 0.52.0

### What changed?

To make sure that all nodes work similarly, to allow to easily use the value
from other parts of the workflow and to be able to construct the source-date
manually in an expression, the node had to be changed. Instead of getting the
source-date directly from the flow the value has now to be manually set via
an expression.

### When is action necessary?

If you currently use "Date & Time"-Nodes.

### How to upgrade:

Open the "Date & Time"-Nodes and reference the date that should be converted
via an expression. Also, set the "Property Name" to the name of the property the
converted date should be set on.

## 0.37.0

### What changed?

To make it possible to support also Rocketchat on-premise the credentials had to be changed.
The `subdomain` parameter had to get renamed to `domain`.

### When is action necessary?

When you currently use the Rocketchat-Node.

### How to upgrade:

Open the Rocketchat credentials and fill the parameter `domain`. If you had previously the
subdomain "example" set you have to set now "https://example.rocket.chat".

## 0.19.0

### What changed?

The node "Read File From Url" got removed as its functionality got added to
"HTTP Request" node where it belongs.

### When is action necessary?

If the "Read File From Url" node gets used in any workflow.

### How to upgrade:

After upgrading open all workflows which contain a "Read File From Url" node.
They will have a "?" as icon as they are not known anymore. Create a new
"HTTP Request" node to replace the old one and add the same URL as the previous
node had (in case you do not know it anymore you can select the old node, copy
it and paste it in a text-editor, it will display all the data the node
contained). Then set the "Response Format" to "File". Everything will then
function again like before.

---

### What changed?

When "HTTP Request" property "Response Format" was set to "String" it did save
the data by default in the property "response". In the new version that can now
be configured. The default value got also changed from "response" to "data" to
match other nodes with similar functionality.

### When is action necessary?

When "HTTP Request" nodes get used which have "Response Format" set to "String".

### How to upgrade:

After upgrading open all workflows which contain the concerning Nodes and set
"Binary Property" to "response".

## 0.18.0

### What changed?

Because of a typo very often `reponse` instead of `response` got used in code. So also on the Webhook-Node. Its parameter `reponseMode` had to be renamed to correct spelling `responseMode`.

### When is action necessary?

When Webhook-Nodes get used which have "Response Mode" set to "Last Node".

### How to upgrade:

After upgrading open all workflows which contain the concerning Webhook-Nodes and set "Response Mode" again manually to "Last Node".

---

### What changed?

Because the CLI library n8n used was not maintained anymore and included
packages with security vulnerabilities we had to switch to a different one.

### When is action necessary?

When you currently start n8n in your setup directly via its JavaScript file.
For example like this:

```
/usr/local/bin/node ./dist/index.js start
```

### How to upgrade:

Change the path to its new location:

```
/usr/local/bin/node bin/n8n start
```
