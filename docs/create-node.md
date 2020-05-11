# Create Node

It is quite easy to create your own nodes in n8n. Mainly three things have to be defined:

 1. Generic information like name, description, image/icon
 1. The parameters to display via which the user can interact with it
 1. The code to run once the node gets executed

To simplify the development process, we created a very basic CLI which creates boilerplate code to get started, builds the node (as they are written in TypeScript), and copies it to the correct location.


## Create the first basic node

 1. Install the n8n-node-dev CLI: `npm install -g n8n-node-dev`
 1. Create and go into the newly created folder in which you want to keep the code of the node
 1. Use CLI to create boilerplate node code: `n8n-node-dev new`
 1. Answer the questions (the “Execute” node type is the regular node type that you probably want to create).
    It will then create the node in the current folder.
 1. Program… Add the functionality to the node
 1. Build the node and copy to correct location: `n8n-node-dev build`
    That command will build the JavaScript version of the node from the TypeScript code and copy it to the user folder where custom nodes get read from `~/.n8n/custom/`
 1. Restart n8n and refresh the window so that the new node gets displayed


## Create own custom n8n-nodes-module

If you want to create multiple custom nodes which are either:

  - Only for yourself/your company
  - Are only useful for a small number of people
  - Require many or large dependencies

It is best to create your own `n8n-nodes-module` which can be installed separately.
That is a simple npm package that contains the nodes and is set up in a way
that n8n can automatically find and load them on startup.

When creating such a module the following rules have to be followed that n8n
can automatically find the nodes in the module:

  - The name of the module has to start with `n8n-nodes-`
  - The `package.json` file has to contain a key `n8n` with the paths to nodes and credentials
  - The module has to be installed alongside n8n

An example starter module which contains one node and credentials and implements
the above can be found here:

[https://github.com/n8n-io/n8n-nodes-starter](https://github.com/n8n-io/n8n-nodes-starter)


### Setup to use n8n-nodes-module

To use a custom `n8n-nodes-module`, it simply has to be installed alongside n8n.
For example like this:

```bash
# Create folder for n8n installation
mkdir my-n8n
cd my-n8n

# Install n8n
npm install n8n

# Install custom nodes module
npm install n8n-nodes-my-custom-nodes

# Start n8n
n8n
```


### Development/Testing of custom n8n-nodes-module

This works in the same way as for any other npm module.

Execute in the folder which contains the code of the custom `n8n-nodes-module`
which should be loaded with n8n:

```bash
# Build the code
npm run build

# "Publish" the package locally
npm link
```

Then in the folder in which n8n is installed:

```bash
# "Install" the above locally published module
npm link n8n-nodes-my-custom-nodes

# Start n8n
n8n
```



## Node Development Guidelines


Please make sure that everything works correctly and that no unnecessary code gets added. It is important to follow the following guidelines:


### Do not change incoming data

Never change the incoming data a node receives (which can be queried with `this.getInputData()`) as it gets shared by all nodes. If data has to get added, changed or deleted it has to be cloned and the new data returned. If that is not done, sibling nodes which execute after the current one will operate on the altered data and would process different data than they were supposed to.
It is however not needed to always clone all the data. If a node for, example only, changes only the binary data but not the JSON data, a new item can be created which reuses the reference to the JSON item.

An example can be seen in the code of the [ReadBinaryFile-Node](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/ReadBinaryFile.node.ts#L69-L83).


### Write nodes in TypeScript

All code of n8n is written in TypeScript and hence, the nodes should also be written in TypeScript. That makes development easier, faster, and avoids at least some bugs.


### Use the built in request library

Some third-party services have their own libraries on npm which make it easier to create an integration. It can be quite tempting to use them. The problem with those is that you add another dependency and not just one you add but also all the dependencies of the dependencies. This means more and more code gets added, has to get loaded, can introduce security vulnerabilities, bugs and so on. So please use the built-in module which can be used like this:

```typescript
const response = await this.helpers.request(options);
```

That is simply using the npm package [`request-promise-native`](https://github.com/request/request-promise-native) which is the basic npm `request` module but with promises. For a full set of `options` consider looking at [the underlying `request` options documentation](https://github.com/request/request#requestoptions-callback).


### Reuse parameter names

When a node can perform multiple operations like edit and delete some kind of entity, for both operations, it would need an entity-id. Do not call them "editId" and "deleteId" simply call them "id". n8n can handle multiple parameters with the same name without a problem as long as only one is visible. To make sure that is the case, the "displayOptions" can be used. By keeping the same name, the value can be kept if a user switches the operation from "edit" to "delete".


### Create an "Options" parameter

Some nodes may need a lot of options. Add only the very important ones to the top level and for all others, create an "Options" parameter where they can be added if needed. This ensures that the interface stays clean and does not unnecessarily confuse people. A good example of that would be the XML node.


### Follow exiting parameter naming guideline

There is not much of a guideline yet but if your node can do multiple things, call the parameter which sets the behavior either "mode" (like "Merge" and "XML" node) or "operation" like the most other ones. If these operations can be done on different resources (like "User" or "Order) create a "resource" parameter (like "Pipedrive" and "Trello" node)


### Node Icons

Check existing node icons as a reference when you create own ones. The resolution of an icon should be 60x60px and saved as PNG.
