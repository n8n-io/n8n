# Building nodes

## Overview
Community nodes depend on `n8n-workflow` package that has different interfaces,
classes and helper functions.

Nodes can be built using one of two styles. To identify which style an
existing node uses:
- **Declarative-style** — no `execute` method. Instead, the node has
  `requestDefaults` and parameters use `routing` (with `routing.request`,
  `routing.send.preSend`, `routing.output.postReceive`, etc.) to
  describe HTTP calls. See `.agents/nodes-declarative.md`
- **Programmatic-style** — has an `async execute(this: IExecuteFunctions)`
  method that manually calls APIs (via `this.helpers.httpRequest` /
  `httpRequestWithAuthentication`), loops over items, and builds the
  return array. See `.agents/nodes-programmatic.md`

## Node description
Nodes have `description` which defines:
- `displayName`, `name`
- `icon`, `group`, `version`
- `inputs`, `outputs`
- `properties`
- Optional `subtitle`, `usableAsTool`, etc
and an optional `execute` function for programmatic-style nodes.

Example node description (simplified, using WordPress **only as an
example**):
```typescript
description: INodeTypeDescription = {
  displayName: 'Wordpress',
  name: 'wordpress',
  icon: 'file:wordpress.svg',
  group: ['output'],
  version: 1,
  subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
  description: 'Consume Wordpress API',
  defaults: {
    name: 'Wordpress',
  },
  usableAsTool: true,
  inputs: [NodeConnectionTypes.Main],
  outputs: [NodeConnectionTypes.Main],
  credentials: [
    {
        name: 'wordpressApi',
        required: true,
    },
  ],
  properties: [
    {
      displayName: 'Resource',
      name: 'resource',
      type: 'options',
      noDataExpression: true,
      options: [
        { name: 'Post', value: 'post' },
        { name: 'Page', value: 'page' },
        { name: 'User', value: 'user' },
      ],
      default: 'post',
    },
    // other properties for specific resources and operations
  ],
};
```

## Description fields
- `inputs` and `outputs` specify which inputs and outputs a node has.
  - **Most nodes will need only 1 main input and 1 main output, unless
    there is specific reason to have something else** (e.g. a node like
    `If` that has a `true` and `false` outputs).
- `usableAsTool`
  - Set to `true` to allow n8n to use this node as a tool for the AI
    agent.
  - Set to `false` or omit this if node works heavily with **binary
    data** which tools don't support
- `properties` define the UI parameters
  - Use the convention: first a **"Resource"** parameter and for each resource an **"Operation"** parameter.
  - You can choose to not follow this convention **ONLY if it's not
    applicable to the node you're developing** (i.e. data transformation
    nodes, etc.)

## Resource and operation pattern
Example "operations":
```typescript
export const postOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['post'],
      },
    },
    options: [
      { name: 'Create', value: 'create', description: 'Create a post', action: 'Create a post', },
      { name: 'Get', value: 'get', description: 'Get a post', action: 'Get a post', },
      { name: 'Get Many', value: 'getAll', description: 'Get many posts', action: 'Get many posts', },
      { name: 'Update', value: 'update', description: 'Update a post', action: 'Update a post', },
    ],
    default: 'create',
  },
];
```
In your implementation:
- Replace `post` and operation names with the **real resource and operations** for the target API.

Example properties for "Create post" operation:
```typescript
export const postFields: INodeProperties[] = [
  {
    displayName: 'Title',
    name: 'title',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['post'],
        operation: ['create'],
      },
    },
    description: 'The title for the post',
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['post'],
        operation: ['create'],
      },
    },
    options: [
      {
        displayName: 'Content',
        name: 'content',
        type: 'string',
        default: '',
        description: 'The content for the post',
      },
      // Add more fields as needed for the real API
    ],
  },
];
```
**Important**:
- In a real node, replace `post`, `Title`, `Content`, etc. with the
  **real names** from the target API.
- Do not reuse these exact WordPress-specific field names unless the
  node is actually for WordPress.
- Remember that these examples are **incomplete** and n8n provides a lot
  of options for defining properties. Refer to their docs, when in doubt

## General guidelines
- `icon` property can either be a string, which starts with `file:` and
  contains a path to a PNG or an SVG. That path **is relative to the current
  file**, you can reference icons in other folders: `file:../icon.svg`. If the
  node has different icons for light and dark mode, provide an object for the
  `icon` property: `{ light: 'file:icon.light.svg', dark: 'file:icon.dark.svg' }`
- For operations that are supposed to return multiple items, like "Get Many
  Posts", make sure you return those items, instead of single object that has
  them. I.e. if you have an object like `{ data: [{ ... }, { ... }], count: 2 }`,
  then return the items inside `data` array
- If the API response is complex, you can add a "Simplify Output" toggle. When
  it's `false` - return the raw response. If it's `true` - return a more
  user-friendly response with only the essential data
- For "Get Many" operations add "Return All" toggle that would return all of
  the items, and a "Limit" parameter to limit the number of items, if "Return
  All" is `false`
- Don't forget to mark required properties as `required: true`
- Use camelCase for property names
