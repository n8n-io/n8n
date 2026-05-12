# Declarative nodes

Preferred for most integrations that simply call external APIs.

Also read `.agents/nodes.md` for shared node anatomy and conventions.

## When to use
- The integration is mostly simple HTTP/REST requests and responses
- You can express the behavior by mapping parameters to
  URL/query/body/headers

If you need multiple dependent API calls, complex control flow, or heavy
transformations, use programmatic-style instead (see
`.agents/nodes-programmatic.md`).

## What you define
- Node `properties` (parameters)
- `requestDefaults` (base URL, default headers)
- `routing` on parameters and operations:
  - Where to send the request (URL, method)
  - How to map parameters to query/body/headers
  - Optional pre-send and post-receive transformations

## requestDefaults
```typescript
requestDefaults: {
  baseURL: 'https://api.nasa.gov',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
},
```

## Parameter routing
Example parameter with `routing`:
```typescript
{
  displayName: 'Rover Name',
  description: 'Choose which Mars Rover to get a photo from',
  required: true,
  name: 'roverName',
  type: 'options',
  options: [
    { name: 'Curiosity', value: 'curiosity' },
    { name: 'Opportunity', value: 'opportunity' },
    { name: 'Perseverance', value: 'perseverance' },
    { name: 'Spirit', value: 'spirit' },
  ],
  routing: {
    request: {
      method: 'GET',
      url: '=/mars-photos/api/v1/rovers/{{$value}}/photos',
    },
  },
  default: 'curiosity',
  displayOptions: {
    show: {
      resource: ['marsRoverPhotos'],
    },
  },
}
```

## Post-receive transformations
You can modify response data with `routing.output.postReceive`:
```typescript
postReceive: [
  {
    type: 'setKeyValue',
    properties: {
      name: '={{$responseItem.modelName}}',
      description: '={{$responseItem.modelArn}}',
      value: '={{$responseItem.modelId}}',
    },
  },
  {
    type: 'sort',
    properties: {
      key: 'name',
    },
  },
  async function (
    this: IExecuteSingleFunctions,
    data: INodeExecutionData[],
    response: IN8nHttpFullResponse,
  ): Promise<INodeExecutionData[]> {
    // Custom transformation if needed
    return data;
  },
]
```

## Pre-send transformations
You can also use `routing.send.preSend` to change the request before
sending (e.g. add custom headers or body transformations).

## Guidelines
- Prefer **declarative transformations** like `setKeyValue`, `sort`, etc
  (there are other transformations that are not in the example).
- Only add custom functions when necessary.
- Declarative-style nodes only support **light versioning** (not full
  versioning). See `.agents/versioning.md` for details.
