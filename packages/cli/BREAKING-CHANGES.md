# n8n Breaking Changes

This list shows all the versions which include breaking changes and how to upgrade

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
