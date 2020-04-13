# Nodes

## Function and Function Item Node

These are the most powerful nodes in n8n. With these, almost everything can be done if you know how to
write JavaScript code. Both nodes work very similarly. They simply give you access to the incoming data
and you can manipulate it.


### Difference between both nodes

The difference is that the code of the Function-Node does get executed only once and it receives the
full items (JSON and binary data) as an array and expects as return value again an array of items. The items
returned can be totally different from the incoming ones. So is it not just possible to remove and edit
existing items it is also possible to add or return totally new ones.

The code of the Function Item-Node on the other does get executed once for every item. It receives
as input one item at a time and also just the JSON data. As a return value, it again expects the JSON data
of one single item. That makes it possible to very easily add, remove and edit JSON properties of items
but it is not possible to add new or remove existing items. Accessing and changing binary data is only
possible via the methods `getBinaryData` and `setBinaryData`.

Both nodes support promises. So instead of returning the item or items directly, it is also possible to
return a promise which resolves accordingly.


### Function-Node

#### Variable: items

It contains all the items the node received as input.

Information about how the data is structured can be found on the page [Data Structure](data-structure.md)

The data can be accessed and manipulated like this:

```typescript
// Sets the JSON data property "myFileName" of the first item to the name of the
// file which is set in the binary property "image" of the same item.
items[0].json.myFileName = items[0].binary.image.fileName;

return items;
```

This example creates 10 dummy items with the ids 0 to 9:

```typescript
const newItems = [];

for (let i=0;i<10;i++) {
  newItems.push({
    json: {
      id: i
    }
  });
}

return newItems;
```


#### Method: $item(index: number, runIndex?: number)

With `$item` it is possible to access the data of parent nodes. That can be the item data but also
the parameters. It expects as input an index of the item the data should be returned for. This is
needed because for each item the data returned can be different. This is probably obvious for the
item data itself but maybe less for data like parameters. The reason why it is also needed there is
that they may contain an expression. Expressions get always executed of the context for an item.
If that would not be the case, for example, the Email Send-Node not would be able to send multiple
emails at once to different people. Instead, the same person would receive multiple emails.

The index is 0 based. So `$item(0)` will return the first item, `$item(1)` the second one, ...

By default will the item of the last run of the node be returned. So if the referenced node did run
3x (its last runIndex is 2) and the current node runs the first time (its runIndex is 0) will the
data of runIndex 2 of the referenced node be returned.

For more information about what data can be accessed via $node check [here](#variable-node).

Example:

```typescript
// Returns the value of the JSON data property "myNumber" of Node "Set" (first item)
const myNumber = $item(0).$node["Set"].json["myNumber"];
// Like above but data of the 6th item
const myNumber = $item(5).$node["Set"].json["myNumber"];

// Returns the value of the parameter "channel" of Node "Slack".
// If it contains an expression the value will be resolved with the
// data of the first item.
const channel = $item(0).$node["Slack"].parameter["channel"];
// Like above but resolved with the value of the 10th item.
const channel = $item(9).$node["Slack"].parameter["channel"];
```


#### Method: $items(nodeName?: string, outputIndex?: number, runIndex?: number)

Gives access to all the items of current or parent nodes. If no parameters get supplied
it returns all the items of the current node.
If a node-name is given, it returns the items the node did output on it`s first output
(index: 0, most nodes only have one output, exceptions are IF and Switch-Node) on
its last run.

Example:

```typescript
// Returns all the items of the current node and current run
const allItems = $items();

// Returns all items the node "IF" outputs (index: 0 which is Output "true" of its most recent run)
const allItems = $items("IF");

// Returns all items the node "IF" outputs (index: 0 which is Output "true" of the same run as current node)
const allItems = $items("IF", 0, $runIndex);

// Returns all items the node "IF" outputs (index: 1 which is Output "false" of run 0 which is the first run)
const allItems = $items("IF", 1, 0);
```


#### Variable: $node

Works exactly like `$item` with the difference that it will always return the data of the first item and
the last run of the node.

```typescript
// Returns the fileName of binary property "data" of Node "HTTP Request"
const fileName = $node["HTTP Request"].binary["data"]["fileName"]}}

// Returns the context data "noItemsLeft" of Node "SplitInBatches"
const noItemsLeft = $node["SplitInBatches"].context["noItemsLeft"];

// Returns the value of the JSON data property "myNumber" of Node "Set"
const myNumber = $node["Set"].json['myNumber'];

// Returns the value of the parameter "channel" of Node "Slack"
const channel = $node["Slack"].parameter["channel"];

// Returns the index of the last run of Node "HTTP Request"
const runIndex = $node["HTTP Request"].runIndex}}
```


#### Variable: $runIndex

Contains the index of the current run of the node.

```typescript
// Returns all items the node "IF" outputs (index: 0 which is Output "true" of the same run as current node)
const allItems = $items("IF", 0, $runIndex);
```


#### Variable: $workflow

Gives information about the current workflow.

```typescript
const isActive = $workflow.active;
const workflowId = $workflow.id;
const workflowName = $workflow.name;
```


#### Method: $evaluateExpression(expression: string, itemIndex: number)

Evaluates a given string as expression.
If no `itemIndex` is provided it uses by default in the Function-Node the data of item 0 and
in the Function Item-Node the data of the current item.

Example:

```javascript
items[0].json.variable1 = $evaluateExpression('{{1+2}}');
items[0].json.variable2 = $evaluateExpression($node["Set"].json["myExpression"], 1);

return items;
```


#### Method: getWorkflowStaticData(type)

Gives access to the static workflow data.
It is possible to save data directly with the workflow. This data should, however, be very small.
A common use case is to for example to save a timestamp of the last item that got processed from
an RSS-Feed or database. It will always return an object. Properties can then read, deleted or
set on that object. When the workflow execution did succeed n8n will check automatically if data
changed and will save it if necessary.

There are two types of static data. The "global" and the "node" one. Global static data is the
same in the whole workflow. And every node in the workflow can access it. The node static data
, however, is different for every node and only the node which did set it can retrieve it again.

Example:

```javascript
// Get the global workflow static data
const staticData = getWorkflowStaticData('global');
// Get the static data of the node
const staticData = getWorkflowStaticData('node');

// Access its data
const lastExecution = staticData.lastExecution;

// Update its data
staticData.lastExecution = new Date().getTime();

// Delete data
delete staticData.lastExecution;
```

It is important to know that static data can not be read and written when testing via the UI.
The data will there always be empty and changes will not be persisted. Only when a workflow
is active and it gets called by a Trigger or Webhook will the static data be saved.



### Function Item-Node


#### Variable: item

It contains the "json" data of the currently processed item.

The data can be accessed and manipulated like this:

```json
// Uses the data of an already existing key to create a new additional one
item.newIncrementedCounter = item.existingCounter + 1;
return item;
```


#### Method: getBinaryData()

Returns all the binary data (all keys) of the item which gets currently processed.


#### Method: setBinaryData(binaryData)

Sets all the binary data (all keys) of the item which gets currently processed.


#### Method: getWorkflowStaticData(type)

As described above for Function-Node.
