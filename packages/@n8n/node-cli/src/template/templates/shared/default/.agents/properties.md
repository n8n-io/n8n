# Properties, expressions, and dynamic options

## Expressions
Parameter values can be expressions when they start with `=`. Everything
inside `{{ ... }}` is evaluated as JavaScript. Common (but not all)
special variables:
- `$value` - the value of the current parameter
- `$parameter` - object with all of the parameter values (key = name)
- `$credentials` - object with all of the credential values

## displayOptions
You can show or hide parameters based on other parameters using `displayOptions`:
```typescript
{
  // ...
  displayOptions: {
    show: {
      // show this parameter when parameter `inputMode` has value of `'json'`
      inputMode: ['json'],
    },
  },
}
```
Using condition:
```typescript
{
  // ...
  displayOptions: {
    show: {
      // show this parameter when parameter `inputMode` ends with `'json'`
      inputMode: [{ _cnd: { endsWith: 'json' } }],
    },
  },
}
```
Hide example:
```typescript
{
  // ...
  displayOptions: {
    hide: {
      // hide this parameter when `resource` is either `'user'` or `'organization'` and `operation` is `'getRepositories'`
      resource: ['user', 'organization'],
      operation: ['getRepositories'],
    },
  },
}
```
You can also show/hide based on the node's version using `@version`:
```typescript
{
  displayOptions: {
    show: {
      // only show for versions earlier than 1.4
      '@version': [{ _cnd: { lt: 1.4 } }],
    },
  },
}
```

## Loading dynamic options
Most properties are entirely defined in the code, but sometimes some
data needs to be fetched dynamically. For that case, you can use one of:

### loadOptionsMethod
For `options` / `multiOptions`:
```typescript
{
  displayName: 'Category',
  name: 'categoryId',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getCategories',
  },
  default: '',
  description: 'Choose a category',
}
```
Node class:
```typescript
methods = {
  loadOptions: {
    async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
      // Make an API call and return an array of { name, value }
      return [];
    },
  },
};
```

### resourceLocator
Used when the user can either choose from a list or specify an ID manually:
```typescript
{
  displayName: 'Tool',
  name: 'tool',
  type: 'resourceLocator',
  default: { mode: 'list', value: '' },
  required: true,
  description: 'The tool to use',
  modes: [
    {
      displayName: 'From List',
      name: 'list',
      type: 'list',
      typeOptions: {
        searchListMethod: 'getTools',
        searchable: true,
      },
    },
    {
      displayName: 'ID',
      name: 'id',
      type: 'string',
    },
  ],
}
```
Node class:
```typescript
methods = {
  listSearch: {
    async getTools(this: ILoadOptionsFunctions) {
      // Return items suitable for a searchable list
    },
  },
};
```

### resourceMapper
Use when the **schema is dynamic**, e.g. Google Sheets, where columns
can change:
```typescript
{
  displayName: 'Parameters',
  name: 'parameters',
  type: 'resourceMapper',
  default: {
    mappingMode: 'defineBelow',
    value: null,
  },
  noDataExpression: true,
  required: true,
  typeOptions: {
    loadOptionsDependsOn: ['tool.value'],
    resourceMapper: {
      resourceMapperMethod: 'getToolParameters',
      hideNoDataError: true,
      addAllFields: false,
      supportAutoMap: false,
      mode: 'add',
      fieldWords: {
        singular: 'parameter',
        plural: 'parameters',
      },
    },
  },
  displayOptions: {
    show: {
      inputMode: ['manual'],
    },
  },
}
```
Node class:
```typescript
export async function getToolParameters(
  this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
  // Implementation omitted; build fields based on the external tool
  return { fields: [] };
}
```
Use `resourceMapper` **only when necessary**, as it is more advanced.
