# Node property types

`NodePropertyTypes` in `packages/workflow/src/interfaces.ts` defines the controls
available in node and credential descriptions. Types in each group are ordered
from most to least prevalent in production TypeScript source. The examples are
condensed from real definitions, with unrelated properties omitted.

Most controls also support the shared `typeOptions.multipleValues` option.
When enabled, `multipleValueButtonText` customizes the add button and `sortable`
makes the values reorderable.

# Input

## `string`

A text input. It can also render a multiline field or a specialized code
editor.

Available `typeOptions`:

- `password` masks sensitive text.
- `rows` renders a multiline input.
- `editor` selects `codeNodeEditor`, `jsEditor`, `htmlEditor`, `sqlEditor`, or
`cssEditor`.
- `editorIsReadOnly` makes the editor read-only.
- `codeAutocomplete` enables function or function-item completion.
- `sqlDialect` configures the SQL editor dialect.
- `copyButton` adds a copy affordance to a read-only value.
- `binaryDataProperty` marks the value as a binary-data property name.

Source: `packages/nodes-base/credentials/S3.credentials.ts`

```ts
{
	displayName: 'S3 Endpoint',
	name: 'endpoint',
	type: 'string',
	default: '',
}
```



## `options`

A single-select dropdown with static or dynamically loaded choices.

Available `typeOptions`:

- `loadOptionsMethod` names a node method that returns choices.
- `loadOptionsDependsOn` lists parameters that invalidate loaded choices.
- `loadOptions` configures declarative routing for loading choices.

Source: `packages/nodes-base/credentials/HaloPSAApi.credentials.ts`

```ts
{
	displayName: 'Hosting Type',
	name: 'hostingType',
	type: 'options',
	default: 'onPremise',
	options: [
		{ name: 'On-premise', value: 'onPremise' },
		{ name: 'Cloud', value: 'cloud' },
	],
}
```



## `boolean`

A checkbox that stores `true` or `false`.

Source: `packages/nodes-base/credentials/S3.credentials.ts`

```ts
{
	displayName: 'Force Path Style',
	name: 'forcePathStyle',
	type: 'boolean',
	default: false,
}
```



## `number`

A numeric input.

Available `typeOptions`:

- `minValue` and `maxValue` constrain the accepted range.
- `numberPrecision` controls decimal precision.

Source: `packages/nodes-base/nodes/Copper/descriptions/UserDescription.ts`

```ts
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	typeOptions: { minValue: 1, maxValue: 100 },
	default: 5,
}
```



## `collection`

An expandable group of optional, named sub-fields.

Source: `packages/nodes-base/nodes/Google/Calendar/EventDescription.ts`

```ts
{
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	options: [
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
		},
	],
}
```



## `fixedCollection`

A structured collection whose entries contain a predefined set of fields.

Available `typeOptions`:

- `multipleValues` permits multiple entries. Omitting it, or setting it to
`false`, allows one entry.
- `multipleValueButtonText` customizes the add-entry button.
- `sortable` makes multiple entries reorderable.
- `fixedCollection.itemTitle` derives an entry title from its value or index.
- `fixedCollection.layout: 'inline'` renders sub-fields side by side.
- `minRequiredFields` and `maxAllowedFields` constrain populated fields.
- `hideOptionalFields` initially hides non-required fields.
- `addOptionalFieldButtonText` labels the reveal-optional-fields button.
- `showEvenWhenOptional` keeps a field visible when optional fields are hidden.



### Without `typeOptions`

This renders one structured address. Used for grouping related properties under one section.

Source: `packages/nodes-base/nodes/HelpScout/CustomerDescription.ts`

```ts
{
	displayName: 'Address',
	name: 'addressUi',
	placeholder: 'Add Address',
	type: 'fixedCollection',
	default: {},
	options: [
		{
			displayName: 'Address',
			name: 'address',
			values: [
				{ displayName: 'City', name: 'city', type: 'string', default: '' },
			],
		},
	],
}
```



### Multiple values and a custom add button

This permits multiple entries and provides a specific add-button label.

Source: `packages/nodes-base/nodes/ExecutionData/ExecutionData.node.ts`

```ts
{
	displayName: 'Data to Save',
	name: 'dataToSave',
	placeholder: 'Add Saved Field',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
		multipleValueButtonText: 'Add Saved Field',
	},
	default: {},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{ displayName: 'Key', name: 'key', type: 'string', default: '' },
				{ displayName: 'Value', name: 'value', type: 'string', default: '' },
			],
		},
	],
}
```



### Sortable values with generated titles

This permits reordering and derives each item title from its field type.

Source: `packages/nodes-base/nodes/Form/common.descriptions.ts`

```ts
{
	displayName: 'Form Elements',
	name: 'formFields',
	type: 'fixedCollection',
	default: {},
	typeOptions: {
		multipleValues: true,
		sortable: true,
		fixedCollection: {
			itemTitle: '={{ $collection.item.value.fieldType }}',
		},
	},
	options: formOptions,
}
```



### Hidden optional fields

This keeps the initial form compact and exposes optional attributes on demand.

Source: `packages/nodes-base/nodes/Form/common.descriptions.ts`

```ts
{
	displayName: 'Form Elements',
	name: 'formFields',
	type: 'fixedCollection',
	default: {},
	typeOptions: {
		multipleValues: true,
		sortable: true,
		hideOptionalFields: true,
		addOptionalFieldButtonText: 'Add Attributes',
	},
	options: formOptions,
}
```



## `dateTime`

A date-and-time picker.

Available `typeOptions`: `dateOnly` removes the time input.

Source: `packages/nodes-base/nodes/Splunk/v1/descriptions/SearchJobDescription.ts`

```ts
{
	displayName: 'Earliest Index',
	name: 'earliestTime',
	type: 'dateTime',
	default: '',
}
```



## `multiOptions`

A multi-select dropdown whose default is normally an array. Like `options`, it
can use dynamic loading options.

Source: `packages/nodes-base/nodes/Stripe/StripeTrigger.node.ts`

```ts
{
	displayName: 'Events',
	name: 'events',
	type: 'multiOptions',
	default: [],
	options: [
		{ name: 'Customer Created', value: 'customer.created' },
	],
}
```



## `resourceLocator`

A resource selector with lookup modes such as list, ID, URL, or a
service-specific identifier. Mode-level options support search methods,
searchability, credential-check behavior, slow-load notices, and creating a
new resource.

Source: `packages/nodes-base/nodes/Twitter/V2/UserDescription.ts`

```ts
{
	displayName: 'User',
	name: 'user',
	type: 'resourceLocator',
	default: { mode: 'username', value: '' },
	modes: [
		{
			displayName: 'By Username',
			name: 'username',
			type: 'string',
		},
	],
}
```



## `json`

A JSON editor, commonly used for JSON Schema or request-body configuration.

Available `typeOptions`:

- `alwaysOpenEditWindow` opens the full editor immediately.
- `redactJsonLeaves` hides JSON leaf values in credential fields.

Source: `packages/@n8n/nodes-langchain/nodes/output_parser/OutputParserStructured/OutputParserStructured.node.ts`

```ts
{
	displayName: 'JSON Schema',
	name: 'schema',
	type: 'json',
	default: '{\n\t"example": "value"\n}',
}
```



## `resourceMapper`

A field-mapping editor that maps input data to a resource schema.

`typeOptions.resourceMapper` configures the mapper mode, schema-loading method,
matching fields, automatic mapping, type conversion, empty values, and schema
refresh behavior.

Source: `packages/nodes-base/nodes/Airtable/v2/actions/record/create.operation.ts`

```ts
{
	displayName: 'Columns',
	name: 'columns',
	type: 'resourceMapper',
	default: {
		mappingMode: 'defineBelow',
		value: null,
	},
	typeOptions: {
		resourceMapper: {
			resourceMapperMethod: 'getColumns',
			mode: 'add',
		},
	},
}
```



## `color`

A color picker.

Available `typeOptions`: `showAlpha` enables alpha-channel selection.

Source: `packages/nodes-base/nodes/Discourse/CategoryDescription.ts`

```ts
{
	displayName: 'Color',
	name: 'color',
	type: 'color',
	default: '0000FF',
}
```



## `filter`

A visual condition builder.

`typeOptions.filter` configures its pinned version, case sensitivity, fixed
left-hand value, permitted combinators, maximum conditions, and validation
strictness.

Source: `packages/nodes-base/nodes/Filter/V2/FilterV2.node.ts`

```ts
{
	displayName: 'Conditions',
	name: 'conditions',
	type: 'filter',
	default: {},
	typeOptions: {
		filter: {
			caseSensitive: true,
			typeValidation: 'strict',
			version: 2,
		},
	},
}
```



## `credentials`

A credential picker for a specific credential type.

Available `typeOptions`: `ignoreCredentialExpressionResolveError` allows this
field to be used outside execution contexts where expressions may not resolve.

Source: `packages/nodes-base/nodes/Evaluation/EvaluationTrigger/EvaluationTrigger.node.ee.ts`

```ts
{
	displayName: 'Credentials',
	name: 'credentials',
	type: 'credentials',
	default: '',
}
```



## `credentialsSelect`

A selector constrained to credentials with specified capabilities or base
types.

Source: `packages/@n8n/nodes-langchain/nodes/tools/ToolHttpRequest/descriptions.ts`

```ts
{
	displayName: 'Credential Type',
	name: 'credentialType',
	type: 'credentialsSelect',
	default: '',
	credentialTypes: ['extends:oAuth2Api', 'extends:oAuth1Api', 'has:authenticate'],
}
```



## `workflowSelector`

A selector for a workflow stored in the n8n instance.

Source: `packages/nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflow/ExecuteWorkflow.node.ts`

```ts
{
	displayName: 'Workflow',
	name: 'workflowId',
	type: 'workflowSelector',
	default: '',
}
```



## `agentSelector`

A selector for an agent configured in the instance.

Source: `packages/nodes-base/nodes/MessageAnAgent/v2/MessageAnAgentV2.node.ts`

```ts
{
	displayName: 'Agent',
	name: 'agent',
	type: 'agentSelector',
	default: {
		__rl: true,
		mode: 'list',
		value: '',
	},
}
```



## `assignmentCollection`

A repeatable list of named field assignments.

`typeOptions.assignment` can set a default field type, hide the type selector,
or disable type changes.

Source: `packages/nodes-base/nodes/Set/v2/manual.mode.ts`

```ts
{
	displayName: 'Fields to Set',
	name: 'assignments',
	type: 'assignmentCollection',
	default: {},
	typeOptions: {
		assignment: { hideType: false },
	},
}
```

# Misc



## `hidden`

A persisted value with no visible editor.

Available `typeOptions`: `expirable` marks a hidden credential property as
expirable.

Source: `packages/nodes-base/credentials/HarvestOAuth2Api.credentials.ts`

```ts
{
	name: 'grantType',
	type: 'hidden',
	default: 'authorizationCode',
}
```



## `notice`

A non-interactive notice for warnings, deprecations, or setup help.

Available `typeOptions`: `containerClass` applies a container CSS class.

Source: `packages/nodes-base/credentials/BaserowApi.credentials.ts`

```ts
{
	displayName: 'Deprecated',
	name: 'deprecated',
	type: 'notice',
	default: '',
}
```



## `button`

An action button, optionally accompanied by an input field. It does not behave
like a normal persisted parameter input.

`typeOptions.buttonConfig` configures its action, label, optional input field,
and input length limit.

Source: `packages/nodes-base/nodes/AiTransform/AiTransform.node.ts`

```ts
{
	displayName: 'Generate code',
	name: 'generateCode',
	type: 'button',
	default: '',
	typeOptions: {
		buttonConfig: {
			label: 'Generate code',
			hasInputField: true,
			inputFieldMaxLength: 500,
			action: {
				type: 'askAiCodeGeneration',
				target: AI_TRANSFORM_JS_CODE,
			},
		},
	},
}
```



## `callout`

An informational callout that can include a supported action.

Available `typeOptions`: `calloutAction` currently supports opening a sample
workflow template.

Source: `packages/@n8n/ai-utilities/src/utils/vector-store/createVectorStoreNode/createVectorStoreNode.ts`

```ts
{
	displayName: 'Tip: Get a feel for vector stores in n8n with our',
	name: 'ragStarterCallout',
	type: 'callout',
	default: '',
	typeOptions: {
		calloutAction: {
			type: 'openSampleWorkflowTemplate',
			label: 'RAG starter template',
			templateId: 'rag-starter-template',
		},
	},
}
```



## `curlImport`

An action surface that imports a cURL command into HTTP Request parameters.

Source: `packages/nodes-base/nodes/HttpRequest/V3/Description.ts`

```ts
{
	displayName: 'Import cURL',
	name: 'curlImport',
	type: 'curlImport',
	default: '',
}
```

