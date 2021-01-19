# n8n Breaking Changes

This list shows all the versions which include breaking changes and how to upgrade.

## 0.103.0

### What changed?
In the Hubspot Trigger, now multiple events can be provided and the field `APP ID` was moved to the credentials.

### When is action necessary?
If you are using the Hubspot Trigger node.

### How to upgrade:
Open the Hubspot Trigger and set the events again. Also open the credentials `Hubspot Developer API` and set your APP ID.

## 0.102.0

### What changed?
- The `As User` property  and the `User Name` field got combined and renamed to `Send as User`. It also got moved under “Add Options”.
- The `Ephemeral` property got removed. To send an ephemeral message, you have to select the "Post (Ephemeral)" operation.

### When is action necessary?
If you are using the following fields or properties in the Slack node:
- As User
- Ephemeral
- User Name

### How to upgrade:
Open the Slack node and set them again to the appropriate values.

----------------------------

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
|--|--|
| Identify | Create |
| Track | Event |
| Track | Page |
| Group | Add |

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

| Resource | Operation |
|--|--|
| Deal | Get All |
| Connector | Get All |
|  E-commerce Order | Get All |
|  E-commerce Customer | Get All |
|  E-commerce Order Products | Get All |

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


----------------------------


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


----------------------------

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
