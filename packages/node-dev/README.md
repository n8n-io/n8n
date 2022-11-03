![n8n.io - Workflow Automation](https://user-images.githubusercontent.com/65276001/173571060-9f2f6d7b-bac0-43b6-bdb2-001da9694058.png)

# n8n-node-dev

Currently very simple and not very sophisticated CLI which makes it easier
to create credentials and nodes in TypeScript for n8n.

```
npm install n8n-node-dev -g
```

## Contents

- [Usage](#usage)
- [Commands](#commands)
- [Create a node](#create-a-node)
    - [Node Type](#node-type)
    - [Node Type Description](#node-type-description)
    - [Node Properties](#node-properties)
    - [Node Property Options](#node-property-options)
- [License](#license)


## Usage

The commandline tool can be started with `n8n-node-dev <COMMAND>`



## Commands

The following commands exist:


### build

Builds credentials and nodes in the current folder and copies them into the
n8n custom extension folder (`~/.n8n/custom/`) unless destination path is
overwritten with `--destination <FOLDER_PATH>`

When "--watch" gets set it starts in watch mode and automatically builds and
copies files whenever they change. To stop press "ctrl + c".


### new

Creates new basic credentials or node of the selected type to have a first starting point.



## Create a node

The easiest way to create a new node is via the "n8n-node-dev" cli. It sets up
all the basics.

A n8n node is a JavaScript file (normally written in TypeScript) which describes
some basic information (like name, description, ...) and also at least one method.
Depending on which method got implemented defines if it is a a regular-, trigger-
or webhook-node.

A simple regular node which:
 - defines one node property
 - sets its value do all items it receives

would look like this:

File named: `MyNode.node.ts`
```TypeScript
import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class MyNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'My Node',
		name: 'myNode',
		group: ['transform'],
		version: 1,
		description: 'Adds "myString" on all items to defined value.',
		defaults: {
			name: 'My Node',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'My String',
				name: 'myString',
				type: 'string',
				default: '',
				placeholder: 'Placeholder value',
				description: 'The description text',
			}
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();

		let item: INodeExecutionData;
		let myString: string;

		// Itterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			myString = this.getNodeParameter('myString', itemIndex, '') as string;
			item = items[itemIndex];

			item.json['myString'] = myString;
		}

		return this.prepareOutputData(items);

	}
}
```

The "description" property has to be set on all nodes because it contains all
the base information. Additionally do all nodes have to have exactly one of the
following methods defined which contains the actual logic:

**Regular node**

Method get called when the workflow gets executed
 - `execute`: Executed once no matter how many items
 - `executeSingle`: Executed once for every item

By default always `execute` should be used especially when creating a
third-party integration. The reason for that is that it is way more flexible
and allows to, for example, return a different amount of items than it received
as input. This is very important when a node should query data like *return
all users*. In that case, does the node normally just receive one input-item
but returns as many as users exist. So in doubt always `execute` should be
used!


**Trigger node**

Method gets called once when the workflow gets activated. It can then trigger
workflow runs which data it provides by itself.

 - `trigger`

 **Webhook node**

Method gets called when webhook gets called.

 - `webhook`


### Node Type

Property overview

 - **description** [required]: Describes the node like its name, properties, hooks, ... see `Node Type Description` bellow.
 - **execute** [optional]: Method get called when the workflow gets executed (once).
 - **executeSingle** [optional]: Method get called when the workflow gets executed (once for every item).
 - **hooks** [optional]: The hook methods.
 - **methods** [optional]: Additional methods. Currently only "loadOptions" exists which allows loading options for parameters from external services
 - **trigger** [optional]: Method gets called once when the workflow gets activated.
 - **webhook** [optional]: Method gets called when webhook gets called.
 - **webhookMethods** [optional]: Methods to setup webhooks on external services.



### Node Type Description

The following properties can be set in the node description:

 - **credentials** [optional]: Credentials the node requests access to
 - **defaults** [required]: Default "name" and "color" to set on node when it gets created
 - **displayName** [required]: Name to display users in Editor UI
 - **description** [required]: Description to display users in Editor UI
 - **group** [required]: Node group for example "transform" or "trigger"
 - **hooks** [optional]: Methods to execute at different points in time like when the workflow gets activated or deactivated
 - **icon** [optional]: Icon to display (can be an icon or a font awsome icon)
 - **inputs** [required]: Types of inputs the node has (currently only "main" exists) and the amount
 - **outputs** [required]: Types of outputs the node has (currently only "main" exists) and the amount
 - **outputNames** [optional]: In case a node has multiple outputs names can be set that users know what data to expect
 - **maxNodes** [optional]: If not an unlimited amount of nodes of that type can exist in a workflow the max-amount can be specified
 - **name** [required]: Name of the node (for n8n to use internally, in camelCase)
 - **properties** [required]: Properties which get displayed in the Editor UI and can be set by the user
 - **subtitle** [optional]: Text which should be displayed underneath the name of the node in the Editor UI (can be an expression)
 - **version** [required]: Version of the node. Currently always "1" (integer). For future usage, does not get used yet.
 - **webhooks** [optional]: Webhooks the node should listen to


### Node Properties

The following properties can be set in the node properties:

 - **default** [required]: Default value of the property
 - **description** [required]: Description that is displayed to users in the Editor UI
 - **displayName** [required]: Name that is displayed to users in the Editor UI
 - **displayOptions**  [optional]: Defines logic to decide if a property should be displayed or not
 - **name** [required]: Name of the property (for n8n to use internally, in camelCase)
 - **options** [optional]: The options the user can select when type of property is "collection", "fixedCollection" or "options"
 - **placeholder** [optional]: Placeholder text that is displayed to users in the Editor UI
 - **type** [required]: Type of the property. If it is for example a "string", "number", ...
 - **typeOptions** [optional]: Additional options for type. Like for example the min or max value of a number
 - **required** [optional]: Defines if the value has to be set or if it can stay empty


### Node Property Options

The following properties can be set in the node property options.

All properties are optional. However, most only work when the node-property is of a specfic type.

- **alwaysOpenEditWindow** [type: string]: If set then the "Editor Window" will always open when the user tries to edit the field. Helpful if long text is typically used in the property.
- **loadOptionsMethod** [type: options]: Method to use to load options from an external service
- **maxValue** [type: number]: Maximum value of the number
- **minValue** [type: number]: Minimum value of the number
- **multipleValues** [type: all]: If set the property gets turned into an Array and the user can add multiple values
- **multipleValueButtonText** [type: all]: Custom text for add button in case "multipleValues" got set
- **numberPrecision** [type: number]: The precision of the number. By default it is "0" and will so only allow integers.
- **password** [type: string]: If a password field should be displayed (normally only used by credentials because all node data is not encrypted and get saved in clear-text)
- **rows** [type: string]: Number of rows the input field should have. By default it is "1"

## License

n8n is [fair-code](http://faircode.io) distributed under the [**Sustainable Use License**](https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md).

Additional information about the license can be found in the [docs](https://docs.n8n.io/reference/license/).
