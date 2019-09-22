# Node


## Types

There are two main node types in n8n Trigger- and Regular-Nodes.


### Trigger Nodes

The Trigger-Nodes start a workflow and supply the initial data. A workflow can contain multiple trigger nodes but with each execution, just one of them will execute as they do not have any input and they are the nodes from which the execution starts.


### Regular Nodes

These nodes do the actual “work”. They can add, remove and edit the data in the flow, request and send data to external APIs and can do everything possible with Node.js in general.


## Credentials

External services need a way to identify and authenticate users. That data, which can range from API key over email/password combination to a very long multi-line private key, get saved in n8n as credentials.

To make sure that the data is secure, it gets saved to the database encrypted. As encryption key does a random personal encryption key gets used which gets automatically generated on the first start of n8n and then saved under `~/.n8n/config`.

Nodes in n8n can then request that credential information. As an additional layer of security can credentials only be accessed by node types which specifically got the right to do so.


## Expressions

With the help of expressions, it is possible to set node parameters dynamically by referencing other data. That can be data from the flow, nodes, the environment or self-generated data. They are normal text with placeholders (everything between {{...}}) that can execute JavaScript code which offers access to special variables to access data.

An expression could look like this:

My name is: `{{$node["Webhook"].data["query"]["name"]}}`

This one would return "My name is: " and then attach the value that the node with the name "Webhook" outputs and there select the property "query" and its key "name". So if the node would output this data:

```json
{
  "query": {
    "name": "Jim"
  }
}
```

the value would be: "My name is: Jim"

The following special variables are available:

 - **$binary**: Incoming binary data of a node
 - **$data**: Incoming JSON data of a node
 - **$env**: Environment variables
 - **$node**: Data of other nodes (output-data, parameters)
 - **$parameters**: Parameters of the current node

Normally it is not needed to write the JavaScript variables manually as they can be simply selected with the help of the Expression Editor.


## Parameters

On the most nodes in n8n parameters can be set. The values that get set define what exactly a node does.

That values which are set are by default static and are always the same no matter what data they process. It is however also possible to set the values dynamically with the help of Expressions. With them, it is possible to make the value depending on other factors like the data of flow or parameters of other nodes.

More information about it can be found under [Expressions](#expressions).


## Pausing Node

Sometimes when creating and debugging a workflow it is helpful to not execute some specific nodes. To make that as simple as possible and not having to disconnect each node, it is possible to pause them. When a node gets paused the data simple passes through the node without being changed.

There are two ways to pause a node. Either pressing the pause button which gets displayed above the node when hovering over it. Or by selecting the node and pressing “d”.
