# n8n Workflow Engine Analysis
## Deep Dive into Execution Model and Data Flow

**Analysis Date:** 2025-11-22
**Focus:** Understanding how workflows execute and how to adapt for TaxFlow

---

## 1. Workflow Execution Model

### Workflow Class Structure

Located in `packages/workflow/src/workflow.ts`:

```typescript
export class Workflow {
  // Core properties
  id: string
  name: string | undefined
  nodes: INodes = {}  // Keyed by node name
  connectionsBySourceNode: IConnections = {}
  connectionsByDestinationNode: IConnections = {}
  nodeTypes: INodeTypes  // Registry of node type definitions
  expression: Expression  // Expression evaluator instance
  active: boolean
  settings: IWorkflowSettings = {}
  timezone: string
  staticData: IDataObject  // Persistent data (webhooks, etc.)
  pinData?: IPinData  // Test data pinning
}
```

### Key Workflow Methods

#### Constructor Flow
1. **Node Type Resolution:** For each node, get its `INodeType` from registry
2. **Default Parameters:** Apply default values using `NodeHelpers.getNodeParameters()`
3. **Node Storage:** Convert node array to object keyed by node name
4. **Connection Mapping:** Build bidirectional connection maps
5. **Expression Setup:** Create `Expression` instance with workflow context
6. **Observable Static Data:** Wrap static data in observable object

#### Connection Management
```typescript
setConnections(connections: IConnections) {
  this.connectionsBySourceNode = connections
  this.connectionsByDestinationNode = mapConnectionsByDestination(connections)
}
```

**Connection Structure:**
```typescript
// Source → Destination mapping
connectionsBySourceNode: {
  "Node1": {
    "main": [  // Connection type (main, ai_tool, etc.)
      [  // Output index 0
        { node: "Node2", type: "main", index: 0 },
        { node: "Node3", type: "main", index: 0 }
      ]
    ]
  }
}
```

---

## 2. Node Execution Context

### IExecuteFunctions Interface

Nodes receive `this: IExecuteFunctions` which provides:

```typescript
interface IExecuteFunctions {
  // Input/Output
  getInputData(inputIndex?: number): INodeExecutionData[]

  // Parameters
  getNodeParameter(
    parameterName: string,
    itemIndex: number,
    fallbackValue?: any,
    options?: { extractValue: boolean }
  ): any

  // Credentials
  getCredentials(type: string): Promise<ICredentialDataDecryptedObject>

  // HTTP Helpers
  helpers: {
    httpRequest(options: IHttpRequestOptions): Promise<any>
    httpRequestWithAuthentication(
      credentialsType: string,
      options: IHttpRequestOptions
    ): Promise<any>
    // ... many more helpers
  }

  // Workflow Context
  getWorkflow(): Workflow
  getNode(): INode
  getExecutionId(): string
  getMode(): WorkflowExecuteMode

  // Data Flow
  addOutputData(
    outputIndex: number,
    data: INodeExecutionData[][]
  ): void

  // And many more methods...
}
```

---

## 3. Node Types and Patterns

### Pattern 1: Simple Transform Node (If, Set, Switch)

**Example: If Node (V2)**
```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const trueItems: INodeExecutionData[] = []
  const falseItems: INodeExecutionData[] = []

  this.getInputData().forEach((item, itemIndex) => {
    const pass = this.getNodeParameter('conditions', itemIndex, false, {
      extractValue: true
    }) as boolean

    if (pass) {
      trueItems.push(item)
    } else {
      falseItems.push(item)
    }
  })

  return [trueItems, falseItems]  // Two outputs: true/false
}
```

**Key Characteristics:**
- Synchronous item-by-item processing
- Multiple outputs (routing logic)
- Simple parameter evaluation
- No external API calls

---

### Pattern 2: Data Transformation (Set/Edit Fields)

**Example: Set Node (V3)**
```typescript
// Mode selection
properties: [
  {
    displayName: 'Mode',
    name: 'mode',
    type: 'options',
    options: [
      { name: 'Manual Mapping', value: 'manual' },
      { name: 'JSON', value: 'raw' }
    ],
    default: 'manual'
  }
]

async execute(this: IExecuteFunctions) {
  const items = this.getInputData()
  const mode = this.getNodeParameter('mode', 0) as Mode

  if (mode === 'manual') {
    return await manual.execute.call(this, items)
  }
  if (mode === 'raw') {
    return await raw.execute.call(this, items)
  }
}
```

**Key Characteristics:**
- Mode-based operation
- Field-level manipulation
- Can add/remove/modify fields
- Supports expressions in field values

---

### Pattern 3: Code Execution (Code Node)

**Example: Code Node**
```typescript
async execute(this: IExecuteFunctions) {
  const workflowMode = this.getMode()
  const node = this.getNode()
  const language = this.getNodeParameter('language', 0) as CodeNodeLanguageOption
  const executionMode = this.getNodeParameter('mode', 0) as CodeExecutionMode

  if (language === 'javaScript') {
    // JavaScript execution in sandbox
    const sandbox = new JavaScriptSandbox(context, code, itemIndex, helpers)
    return await sandbox.runCode()
  } else if (language === 'python') {
    // Python execution
    const sandbox = new PythonSandbox(context, code, itemIndex, helpers)
    return await sandbox.runCode()
  }
}
```

**Key Characteristics:**
- Sandboxed code execution
- Multiple language support (JS, Python)
- Two modes: run once for all items, or once per item
- Access to special variables: `$input`, `$json`, `$node`, etc.

---

### Pattern 4: File Operations (SpreadsheetFile)

**Example: SpreadsheetFile Node (V2)**
```typescript
async execute(this: IExecuteFunctions) {
  const items = this.getInputData()
  const operation = this.getNodeParameter('operation', 0)

  if (operation === 'fromFile') {
    // Read Excel/CSV from binary data
    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0)
    const binaryData = items[0].binary![binaryPropertyName]

    // Use xlsx library to parse
    const workbook = XLSX.read(binaryData.data, { type: 'buffer' })
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(sheet)

    return [jsonData.map(row => ({ json: row }))]
  }

  if (operation === 'toFile') {
    // Write Excel/CSV from JSON data
    const worksheet = XLSX.utils.json_to_sheet(items.map(i => i.json))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    const buffer = XLSX.write(workbook, { type: 'buffer' })

    return [{
      json: {},
      binary: {
        data: { data: buffer.toString('base64'), mimeType: 'application/vnd.openxmlformats...' }
      }
    }]
  }
}
```

**Key Characteristics:**
- Binary data handling
- External library usage (xlsx)
- File format conversion
- Base64 encoding for binary data

---

### Pattern 5: External API Calls (Microsoft Excel)

**Example: Microsoft Excel Node (V2)**
```typescript
async execute(this: IExecuteFunctions) {
  // Uses router pattern
  return await router.call(this)
}

// In router:
const resource = this.getNodeParameter('resource', 0)
const operation = this.getNodeParameter('operation', 0)

if (resource === 'table') {
  if (operation === 'getAll') {
    // Make authenticated API call
    const response = await this.helpers.httpRequestWithAuthentication.call(
      this,
      'microsoftExcelOAuth2Api',
      {
        method: 'GET',
        url: `/me/drive/items/${workbookId}/workbook/tables`,
        json: true
      }
    )
    return [response.value.map(table => ({ json: table }))]
  }
}
```

**Key Characteristics:**
- OAuth 2.0 authentication
- REST API integration
- Credential-based requests
- Response transformation

---

## 4. Data Flow Between Nodes

### INodeExecutionData Structure

```typescript
interface INodeExecutionData {
  json: IDataObject  // Main JSON data
  binary?: IBinaryKeyData  // Optional binary files
  pairedItem?: IPairedItemData  // Lineage tracking
  error?: Error  // Error information
  source?: ISourceData[]  // Where data came from
}
```

### Example Data Flow

```
Input Node (CSV Import)
  ↓
  [
    { json: { name: "John", income: 50000 }, pairedItem: { item: 0 } }
  ]
  ↓
Set Node (Calculate Tax)
  ↓
  [
    { json: { name: "John", income: 50000, tax: 7500 }, pairedItem: { item: 0 } }
  ]
  ↓
If Node (Income > 40000?)
  ↓ (true output)
  [
    { json: { name: "John", income: 50000, tax: 7500 }, pairedItem: { item: 0 } }
  ]
```

### Paired Item Tracking

**Purpose:** Track which output items came from which input items

```typescript
{
  json: { result: "processed" },
  pairedItem: {
    item: 0,  // Came from input item index 0
    input: 0   // From input connection index 0
  }
}
```

This is crucial for:
- Debugging data flow
- Merging nodes (combining data from different branches)
- Error attribution

---

## 5. Expression System

### Expression Syntax

```javascript
// Basic field access
{{ $json.fieldName }}

// Node data access
{{ $node["NodeName"].json.fieldName }}

// Array access
{{ $json.items[0].name }}

// Functions
{{ $json.date.toDateTime() }}
{{ $json.amount.toNumber() * 1.15 }}

// Conditionals
{{ $json.income > 50000 ? "high" : "low" }}
```

### Expression Context Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `$json` | Current item's JSON data | `{{ $json.name }}` |
| `$binary` | Current item's binary data | `{{ $binary.file.fileName }}` |
| `$input` | Input data items | `{{ $input.all()[0].json.id }}` |
| `$node` | Other node's data | `{{ $node["Import"].json.total }}` |
| `$workflow` | Workflow metadata | `{{ $workflow.name }}` |
| `$now` | Current timestamp | `{{ $now }}` |
| `$today` | Today's date | `{{ $today }}` |
| `$env` | Environment variables | `{{ $env.API_KEY }}` |
| `$itemIndex` | Current item index | `{{ $itemIndex }}` |
| `$runIndex` | Current run index | `{{ $runIndex }}` |

### Expression Extensions

#### String Extensions
```javascript
{{ "hello".toUpperCase() }}  // "HELLO"
{{ "  text  ".trim() }}  // "text"
{{ "a,b,c".split(",") }}  // ["a", "b", "c"]
```

#### Number Extensions
```javascript
{{ "123".toNumber() }}  // 123
{{ 123.456.toFixed(2) }}  // "123.46"
{{ 10.5.round() }}  // 11
```

#### Date Extensions
```javascript
{{ "2024-01-15".toDateTime() }}
{{ $now.format("yyyy-MM-dd") }}
{{ $today.plus({ days: 7 }) }}
```

#### Array Extensions
```javascript
{{ [1,2,3,4,5].sum() }}  // 15
{{ [1,2,3].first() }}  // 1
{{ [1,2,3].last() }}  // 3
{{ ["a","b","c"].length }}  // 3
```

---

## 6. Node Parameter System

### Parameter Types

```typescript
interface INodeProperties {
  displayName: string  // UI label
  name: string  // Internal name
  type: 'string' | 'number' | 'boolean' | 'options' | 'multiOptions' |
        'collection' | 'fixedCollection' | 'filter' | 'json' | 'code' | ...
  default: any
  required?: boolean
  description?: string

  // Conditional display
  displayOptions?: {
    show?: { [parameter: string]: any[] }
    hide?: { [parameter: string]: any[] }
  }

  // Type-specific options
  typeOptions?: {
    minValue?: number
    maxValue?: number
    numberPrecision?: number
    rows?: number  // For text areas
    loadOptionsMethod?: string  // Dynamic options
    // ... many more
  }

  // Options for select/multi-select
  options?: INodePropertyOptions[]
}
```

### Example: Dynamic Parameters Based on Selection

```typescript
// Tax Form Node Example (conceptual)
properties: [
  {
    displayName: 'Tax Form',
    name: 'taxForm',
    type: 'options',
    options: [
      { name: 'Form 1040', value: '1040' },
      { name: 'Schedule A', value: 'scheduleA' },
      { name: 'Schedule C', value: 'scheduleC' }
    ],
    default: '1040'
  },
  {
    displayName: 'Filing Status',
    name: 'filingStatus',
    type: 'options',
    displayOptions: {
      show: {
        taxForm: ['1040']  // Only show for Form 1040
      }
    },
    options: [
      { name: 'Single', value: 'single' },
      { name: 'Married Filing Jointly', value: 'married-joint' },
      // ...
    ],
    default: 'single'
  }
]
```

---

## 7. Error Handling Patterns

### Node-Level Error Handling

```typescript
async execute(this: IExecuteFunctions) {
  const items = this.getInputData()
  const returnData: INodeExecutionData[] = []

  for (let i = 0; i < items.length; i++) {
    try {
      const result = await this.processItem(items[i])
      returnData.push({ json: result })
    } catch (error) {
      if (this.continueOnFail()) {
        // Continue processing, mark item with error
        returnData.push({
          json: { error: error.message },
          error: error,
          pairedItem: { item: i }
        })
      } else {
        // Throw and stop workflow
        throw new NodeOperationError(this.getNode(), error, { itemIndex: i })
      }
    }
  }

  return [returnData]
}
```

### Error Types

- `NodeOperationError`: General node execution error
- `NodeApiError`: External API call error
- `UserError`: User-facing error (input validation, etc.)
- `ExpressionError`: Expression evaluation error
- `WorkflowOperationError`: Workflow-level error

---

## 8. Key Insights for TaxFlow

### What to Adopt

#### ✅ Excellent Patterns for Tax Workflows

1. **Bidirectional Connection Maps**
   - Easy to trace data flow backward and forward
   - Critical for debugging complex tax calculations

2. **Expression System**
   - Perfect for tax calculations: `{{ $json.income * 0.15 }}`
   - Can handle conditional logic: `{{ $json.income > 50000 ? 12000 : 10000 }}`
   - Extensions useful for formatting: `{{ $json.ssn.replace(/-/g, '') }}`

3. **Parameter Display Logic**
   - Show/hide fields based on tax form type
   - Example: Only show mortgage interest for Schedule A

4. **Paired Item Tracking**
   - Track which W-2 produced which income line
   - Trace deductions back to source documents

5. **Multi-Output Nodes**
   - Route to different paths based on income level
   - Separate itemized vs standard deduction flows

6. **Binary Data Handling**
   - Import PDF W-2s
   - Generate PDF Form 1040
   - Store images of receipts

7. **Observable Static Data**
   - Store prior year returns for comparison
   - Cache IRS tax tables

8. **Validation Framework**
   - Parameter-level validation (min/max, regex)
   - Type checking (ensure income is number)
   - Cross-field validation

#### 🔧 Adaptations Needed for Tax

1. **Tax Year as First-Class Concept**
   - Add `taxYear` to workflow settings
   - Different tax brackets per year
   - Form version changes (1040 2023 vs 2024)

2. **IRS-Specific Validation**
   - SSN format validation
   - EIN validation
   - AGI calculation rules
   - Dependent eligibility rules

3. **Form Relationships**
   - Schedule A flows into Form 1040 line 12
   - W-2 Box 1 flows into Form 1040 line 1a
   - Need explicit form linkage system

4. **Precision and Rounding**
   - IRS rounding rules: round to nearest dollar
   - Percentage calculations: 2 decimal places
   - Ensure no floating-point errors

5. **State Context**
   - 50 different state tax rules
   - Reciprocity agreements
   - State-specific deductions

### Simplified Implementation for Browser

Since TaxFlow will initially be browser-only:

1. **No Backend Execution**
   - Execute nodes client-side in browser
   - Use Web Workers for heavy calculations

2. **LocalStorage/IndexedDB**
   - Instead of database, use IndexedDB
   - Store workflows, tax returns, settings

3. **No Authentication** (Initially)
   - Skip OAuth, JWT, etc.
   - Can add later for cloud sync

4. **Subset of Nodes**
   - ~15-20 tax-specific nodes vs n8n's 200+
   - Focus on tax domain only

5. **Simplified Expression Engine**
   - Can use simpler expression parser
   - Don't need all n8n extensions
   - Focus on math, conditionals, formatting

---

## 9. Execution Flow Summary

### Complete Workflow Execution

```
1. Workflow.constructor()
   ↓
2. Resolve node types from registry
   ↓
3. Apply default parameters
   ↓
4. Build connection maps
   ↓
5. For each node (topological order):
   a. Get input data from connected nodes
   b. Evaluate parameters (with expressions)
   c. Call node.execute(this: IExecuteFunctions)
   d. Store output data
   e. Pass to next nodes
   ↓
6. Return final output(s)
```

### Tax Workflow Example

```
┌─────────────────┐
│ W-2 Import      │ ← Read Excel file with W-2 data
└────────┬────────┘
         ↓ [{ json: { wages: 50000, fedTax: 7500 } }]
┌────────┴────────┐
│ Extract Income  │ ← Pull wages into income structure
└────────┬────────┘
         ↓ [{ json: { wages: 50000 } }]
┌────────┴────────┐
│ Calculate AGI   │ ← Subtract adjustments (IRA, etc.)
└────────┬────────┘
         ↓ [{ json: { agi: 47000 } }]
┌────────┴────────┐
│ Deduction Node  │ ← Compare standard vs itemized
└────────┬────────┘
         ↓ [{ json: { agi: 47000, deduction: 13850 } }]
┌────────┴────────┐
│ Taxable Income  │ ← AGI - deduction
└────────┬────────┘
         ↓ [{ json: { taxableIncome: 33150 } }]
┌────────┴────────┐
│ Tax Calculation │ ← Apply 2024 tax brackets
└────────┬────────┘
         ↓ [{ json: { taxOwed: 3738 } }]
┌────────┴────────┐
│ Form 1040 Gen   │ ← Generate PDF Form 1040
└────────┬────────┘
         ↓ [{ binary: { form1040: {...} } }]
┌────────┴────────┐
│ Output          │
└─────────────────┘
```

---

## 10. Next Steps

### Implementation Priorities

**Phase 1: Core Engine**
- [ ] Implement simplified Workflow class
- [ ] Create INode and IConnection interfaces
- [ ] Build node registry system
- [ ] Simple expression evaluator (just math + conditionals)

**Phase 2: Node Framework**
- [ ] INodeType interface
- [ ] IExecuteFunctions mock implementation
- [ ] Parameter system (properties, defaults)
- [ ] Basic validation

**Phase 3: Tax Nodes**
- [ ] Excel Import node
- [ ] AGI Calculator node
- [ ] Tax Bracket Lookup node
- [ ] Form 1040 Generator node

**Phase 4: UI**
- [ ] Canvas for node placement
- [ ] Connection drawing
- [ ] Parameter panels
- [ ] Execution visualization

---

**Status:** ✅ Workflow Engine Analysis Complete
**Next:** Node System Deep Dive + Tax-Specific Features
**Confidence:** High - Ready to design TaxFlow architecture
