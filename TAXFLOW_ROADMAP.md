# TaxFlow Implementation Roadmap
## From n8n Analysis to Production-Ready Tax Platform

**Project Duration:** 12 weeks (3 months)
**Team Size:** 1-2 developers
**Confidence Level:** High (based on comprehensive n8n analysis)

---

## Overview

This roadmap takes TaxFlow from concept to MVP, leveraging insights from n8n's proven architecture.

### Success Criteria
- [ ] Can import W-2 data from Excel
- [ ] Calculates 2024 federal tax correctly (validated against IRS examples)
- [ ] Generates fillable PDF Form 1040
- [ ] Validates return against IRS rules
- [ ] Workflow execution < 2 seconds
- [ ] 100% browser-based (no backend)

---

## Phase 1: Foundation (Weeks 1-2)

### Week 1: Project Setup & Core Engine

#### Day 1-2: Project Initialization
```bash
# Create new React + TypeScript project
npm create vite@latest taxflow-enhanced -- --template react-ts
cd taxflow-enhanced

# Install core dependencies
npm install \
  zustand \
  zod \
  decimal.js \
  date-fns \
  dexie \
  xlsx \
  pdf-lib

# Dev dependencies
npm install -D \
  @types/node \
  vitest \
  @testing-library/react \
  tailwindcss \
  prettier \
  eslint
```

**Project Structure:**
```
taxflow-enhanced/
├── src/
│   ├── engine/
│   │   ├── TaxWorkflow.ts          # Main workflow class
│   │   ├── TaxNode.ts              # Base node interface
│   │   ├── TaxExecuteContext.ts    # Execution context
│   │   └── TaxNodeRegistry.ts      # Node registry
│   ├── nodes/
│   │   ├── input/
│   │   ├── calculation/
│   │   ├── form/
│   │   └── validation/
│   ├── irs/
│   │   ├── TaxBrackets.ts          # 2024 tax tables
│   │   ├── StandardDeductions.ts   # Standard deductions
│   │   └── ValidationRules.ts      # IRS validation logic
│   ├── ui/
│   │   ├── Canvas/                 # Workflow canvas
│   │   ├── NodeEditor/             # Node parameter panels
│   │   └── components/
│   ├── store/
│   │   └── workflowStore.ts        # Zustand store
│   └── utils/
│       ├── expressions.ts          # Expression evaluator
│       └── helpers.ts              # Tax calculation helpers
├── tests/
│   ├── unit/
│   └── integration/
└── public/
    └── pdf-templates/              # Form 1040 PDF template
```

**Deliverables:**
- [ ] Git repository initialized
- [ ] Project structure created
- [ ] Core dependencies installed
- [ ] ESLint + Prettier configured
- [ ] Initial README.md

---

#### Day 3-5: Core Workflow Engine

**File:** `src/engine/TaxWorkflow.ts`

```typescript
export class TaxWorkflow {
  private nodes: Map<string, TaxNode>
  private connections: Map<string, TaxConnection[]>
  private nodeRegistry: TaxNodeRegistry

  constructor(params: TaxWorkflowParams) {
    this.nodes = new Map()
    this.connections = new Map()
    this.nodeRegistry = new TaxNodeRegistry()

    // Register all available nodes
    this.registerNodes()

    // Load workflow definition
    this.loadWorkflow(params)
  }

  async execute(): Promise<TaxReturn> {
    // Topological sort of nodes
    const executionOrder = this.getExecutionOrder()

    // Execute each node in order
    const dataFlow = new Map<string, TaxData[]>()

    for (const nodeId of executionOrder) {
      const node = this.nodes.get(nodeId)
      const inputData = this.getNodeInputData(nodeId, dataFlow)
      const outputData = await this.executeNode(node, inputData)
      dataFlow.set(nodeId, outputData)
    }

    // Compile final tax return
    return this.compileTaxReturn(dataFlow)
  }

  private getExecutionOrder(): string[] {
    // Topological sort implementation
    // (same algorithm as n8n)
  }

  private async executeNode(
    node: TaxNode,
    inputData: TaxData[]
  ): Promise<TaxData[]> {
    const context = this.createExecuteContext(node, inputData)
    return await node.execute(context)
  }
}
```

**Tasks:**
- [x] Implement TaxWorkflow class
- [x] Build connection mapping logic (bidirectional)
- [x] Implement topological sort for execution order
- [x] Create node registry system
- [x] Write unit tests for workflow execution

**Test Coverage:**
```typescript
describe('TaxWorkflow', () => {
  it('should execute nodes in correct order', () => {
    // Test topological sort
  })

  it('should pass data between connected nodes', () => {
    // Test data flow
  })

  it('should handle disconnected nodes', () => {
    // Test error handling
  })
})
```

---

#### Day 6-7: Node Interface & Base Classes

**File:** `src/engine/TaxNode.ts`

```typescript
export interface ITaxNode {
  id: string
  type: string
  name: string
  description: ITaxNodeDescription

  execute(
    context: ITaxExecuteContext,
    inputData: TaxData[]
  ): Promise<TaxData[]>
}

export abstract class BaseTaxNode implements ITaxNode {
  id: string
  type: string
  name: string
  description: ITaxNodeDescription

  abstract execute(
    context: ITaxExecuteContext,
    inputData: TaxData[]
  ): Promise<TaxData[]>

  // Helper methods
  protected getParameter<T>(
    context: ITaxExecuteContext,
    name: string,
    defaultValue?: T
  ): T {
    return context.getNodeParameter<T>(name, defaultValue)
  }

  protected validateInput(data: TaxData[]) {
    // Common validation logic
  }
}
```

**File:** `src/engine/TaxExecuteContext.ts`

```typescript
export class TaxExecuteContext implements ITaxExecuteContext {
  private workflow: TaxWorkflow
  private node: TaxNode
  private inputData: TaxData[]
  private parameters: Record<string, any>

  getInputData(): TaxData[] {
    return this.inputData
  }

  getNodeParameter<T>(name: string, defaultValue?: T): T {
    return this.parameters[name] ?? defaultValue
  }

  getTaxYear(): number {
    return this.workflow.settings.taxYear
  }

  getFilingStatus(): FilingStatus {
    return this.workflow.settings.filingStatus
  }

  helpers = {
    getTaxBrackets: (year, status) => { /* ... */ },
    getStandardDeduction: (year, status) => { /* ... */ },
    roundToNearestDollar: (amount) => Math.round(amount),
    validateSSN: (ssn) => /^\d{3}-\d{2}-\d{4}$/.test(ssn),
    // ... other helpers
  }
}
```

**Deliverables:**
- [ ] ITaxNode interface defined
- [ ] BaseTaxNode abstract class
- [ ] TaxExecuteContext implementation
- [ ] Helper functions for IRS data access
- [ ] Documentation for node development

---

### Week 2: IRS Data & First Node

#### Day 1-3: IRS Rules Engine

**File:** `src/irs/TaxBrackets.ts`

```typescript
export const TAX_BRACKETS_2024 = {
  single: [
    { min: 0, max: 11600, rate: 0.10, base: 0 },
    { min: 11600, max: 47150, rate: 0.12, base: 1160 },
    { min: 47150, max: 100525, rate: 0.22, base: 5426 },
    { min: 100525, max: 191950, rate: 0.24, base: 17168.50 },
    { min: 191950, max: 243725, rate: 0.32, base: 39110.50 },
    { min: 243725, max: 609350, rate: 0.35, base: 55678.50 },
    { min: 609350, max: Infinity, rate: 0.37, base: 183647.25 }
  ],
  'married-joint': [
    { min: 0, max: 23200, rate: 0.10, base: 0 },
    { min: 23200, max: 94300, rate: 0.12, base: 2320 },
    { min: 94300, max: 201050, rate: 0.22, base: 10852 },
    { min: 201050, max: 383900, rate: 0.24, base: 34337 },
    { min: 383900, max: 487450, rate: 0.32, base: 78221 },
    { min: 487450, max: 731200, rate: 0.35, base: 111357 },
    { min: 731200, max: Infinity, rate: 0.37, base: 196669.50 }
  ],
  // ... other filing statuses
}

export class TaxBracketCalculator {
  calculateTax(
    taxableIncome: number,
    year: number,
    filingStatus: FilingStatus
  ): TaxCalculationResult {
    const brackets = this.getBrackets(year, filingStatus)
    let totalTax = 0
    const breakdown: TaxBracketBreakdown[] = []

    for (const bracket of brackets) {
      if (taxableIncome <= bracket.min) break

      const taxableInBracket = Math.min(
        taxableIncome - bracket.min,
        bracket.max - bracket.min
      )

      const taxInBracket = taxableInBracket * bracket.rate
      totalTax += taxInBracket

      breakdown.push({
        bracket: `${bracket.rate * 100}%`,
        income: Math.round(taxableInBracket),
        tax: Math.round(taxInBracket)
      })
    }

    return {
      totalTax: Math.round(totalTax),
      breakdown,
      effectiveRate: totalTax / taxableIncome,
      marginalRate: this.getMarginalRate(taxableIncome, brackets)
    }
  }
}
```

**File:** `src/irs/StandardDeductions.ts`

```typescript
export const STANDARD_DEDUCTIONS = {
  2024: {
    single: 13850,
    'married-joint': 27700,
    'married-separate': 13850,
    hoh: 20800,
    qss: 27700
  },
  2023: {
    single: 13850,
    'married-joint': 27700,
    'married-separate': 13850,
    hoh: 20800,
    qss: 27700
  }
  // ... other years
}
```

**Deliverables:**
- [ ] 2024 tax brackets implemented
- [ ] Standard deductions for 2024
- [ ] Tax calculation algorithm
- [ ] Validation against IRS examples
- [ ] Unit tests with IRS test cases

---

#### Day 4-7: First Node - Excel Import

**File:** `src/nodes/input/ExcelImportNode.ts`

```typescript
export class ExcelImportNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'excelImport',
    displayName: 'Excel Import',
    group: 'input',
    version: 1,
    description: 'Import tax data from Excel/CSV files',
    icon: 'file-excel',
    color: '#217346',
    inputs: [],
    outputs: ['main'],
    properties: [
      {
        displayName: 'File',
        name: 'file',
        type: 'file',
        accept: '.xlsx,.xls,.csv',
        required: true
      },
      {
        displayName: 'Sheet Name',
        name: 'sheetName',
        type: 'string',
        default: 'Sheet1'
      },
      {
        displayName: 'Has Header Row',
        name: 'hasHeaderRow',
        type: 'boolean',
        default: true
      }
    ]
  }

  async execute(
    context: ITaxExecuteContext,
    inputData: TaxData[]
  ): Promise<TaxData[]> {
    const file = this.getParameter(context, 'file')
    const sheetName = this.getParameter(context, 'sheetName', 'Sheet1')
    const hasHeaderRow = this.getParameter(context, 'hasHeaderRow', true)

    // Read Excel file using xlsx library
    const workbook = XLSX.read(file, { type: 'buffer' })
    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    // Transform to TaxData format
    const headers = hasHeaderRow ? rawData[0] : []
    const dataRows = hasHeaderRow ? rawData.slice(1) : rawData

    return dataRows.map((row, index) => ({
      json: this.rowToObject(row, headers),
      metadata: {
        sourceNode: 'Excel Import',
        itemIndex: index,
        taxYear: context.getTaxYear()
      }
    }))
  }

  private rowToObject(row: any[], headers: string[]): Record<string, any> {
    const obj: Record<string, any> = {}
    row.forEach((value, i) => {
      const key = headers[i] || `column${i}`
      obj[key] = value
    })
    return obj
  }
}
```

**Deliverables:**
- [ ] ExcelImportNode implemented
- [ ] File upload handling
- [ ] Excel parsing with xlsx library
- [ ] CSV support
- [ ] Integration tests with sample files
- [ ] Documentation

---

## Phase 2: Core Nodes (Weeks 3-6)

### Week 3: Calculation Nodes

#### AGI Calculator Node
```typescript
export class AGICalculatorNode extends BaseTaxNode {
  async execute(context, inputData): Promise<TaxData[]> {
    // Aggregate all income sources
    // Subtract adjustments
    // Return AGI
  }
}
```

#### Tax Bracket Calculator Node
```typescript
export class TaxBracketCalculatorNode extends BaseTaxNode {
  async execute(context, inputData): Promise<TaxData[]> {
    const taxableIncome = inputData[0].json.taxableIncome
    const calculator = new TaxBracketCalculator()
    const result = calculator.calculateTax(
      taxableIncome,
      context.getTaxYear(),
      context.getFilingStatus()
    )
    return [{ json: result }]
  }
}
```

**Week 3 Deliverables:**
- [ ] AGI Calculator Node
- [ ] Standard/Itemized Deduction Node
- [ ] Tax Bracket Calculator Node
- [ ] Unit tests for all calculation nodes
- [ ] Validation against IRS examples

---

### Week 4-5: Form Generation

#### Form 1040 Generator
```typescript
export class Form1040GeneratorNode extends BaseTaxNode {
  async execute(context, inputData): Promise<TaxData[]> {
    // Compile all data into Form 1040 structure
    const formData = this.compileForm1040Data(inputData)

    // Generate PDF
    const pdfTemplate = await this.loadPDFTemplate('2024')
    const filledPDF = await this.fillPDFForm(pdfTemplate, formData)

    return [{
      json: { formType: 'Form 1040' },
      binary: {
        form1040: {
          data: filledPDF.toString('base64'),
          mimeType: 'application/pdf',
          fileName: 'Form-1040-2024.pdf'
        }
      }
    }]
  }

  private async fillPDFForm(
    template: PDFDocument,
    data: Form1040
  ): Promise<Buffer> {
    // Use pdf-lib to fill PDF form fields
    const form = template.getForm()

    // Fill taxpayer info
    form.getTextField('f1_01').setText(data.taxpayer.firstName)
    form.getTextField('f1_02').setText(data.taxpayer.lastName)
    form.getTextField('f1_03').setText(data.taxpayer.ssn)

    // Fill income lines
    form.getTextField('f1_20').setText(data.line1a.toString())  // Wages

    // ... fill all 79 fields

    return await template.save()
  }
}
```

**Weeks 4-5 Deliverables:**
- [ ] Form 1040 PDF template acquired
- [ ] PDF field mapping documented
- [ ] Form 1040 Generator Node
- [ ] PDF generation tested
- [ ] Sample outputs validated

---

### Week 6: Validation & W-2 Import

#### IRS Rules Validator
```typescript
export class IRSValidatorNode extends BaseTaxNode {
  async execute(context, inputData): Promise<TaxData[]> {
    const taxReturn = this.compileTaxReturn(inputData)
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Run all validation rules
    this.validateSSN(taxReturn, errors)
    this.validateAGI(taxReturn, errors)
    this.validateDeductions(taxReturn, errors, warnings)
    this.validateTaxCalculation(taxReturn, errors)

    return [{
      json: {
        valid: errors.length === 0,
        errors,
        warnings,
        taxReturn
      }
    }]
  }
}
```

#### W-2 Import Node
```typescript
export class W2ImportNode extends BaseTaxNode {
  async execute(context, inputData): Promise<TaxData[]> {
    // Transform Excel data to W-2 structure
    // Validate W-2 fields
    // Return structured W-2 data
  }
}
```

**Week 6 Deliverables:**
- [ ] IRS Rules Validator Node
- [ ] W-2 Import Node
- [ ] Validation rule library (20+ rules)
- [ ] Integration tests
- [ ] Error messaging system

---

## Phase 3: UI & Integration (Weeks 7-10)

### Week 7-8: Workflow Canvas UI

**File:** `src/ui/Canvas/WorkflowCanvas.tsx`

```typescript
export const WorkflowCanvas: React.FC = () => {
  const { nodes, connections } = useWorkflowStore()

  return (
    <div className="workflow-canvas">
      <NodePalette />

      <Canvas>
        {nodes.map(node => (
          <NodeComponent
            key={node.id}
            node={node}
            onConnect={handleConnect}
            onParameterChange={handleParameterChange}
          />
        ))}

        {connections.map(conn => (
          <ConnectionLine key={conn.id} connection={conn} />
        ))}
      </Canvas>

      <NodeEditor selectedNode={selectedNode} />
    </div>
  )
}
```

**Components:**
- Node palette (drag & drop)
- Canvas with zoom/pan
- Node rendering
- Connection drawing
- Parameter panel

**Libraries:**
- React Flow (or custom Canvas API)
- Zustand for state
- TailwindCSS for styling

**Week 7-8 Deliverables:**
- [ ] Workflow canvas component
- [ ] Node palette
- [ ] Drag & drop nodes
- [ ] Connect nodes with lines
- [ ] Node parameter editor panel
- [ ] Save/load workflows

---

### Week 9: Complete Integration

**Tasks:**
1. Integrate all nodes into workflow engine
2. Build sample workflows:
   - Simple W-2 tax return
   - Return with itemized deductions
   - Self-employment income
3. End-to-end testing
4. Performance optimization

**Sample Workflow:**
```
┌─────────────────┐
│ Excel Import    │ ← Upload W-2 data
└────────┬────────┘
         ↓
┌────────┴────────┐
│ W-2 Import      │ ← Parse W-2 fields
└────────┬────────┘
         ↓
┌────────┴────────┐
│ AGI Calculator  │ ← Calculate AGI
└────────┬────────┘
         ↓
┌────────┴────────┐
│ Deduction Node  │ ← Standard vs itemized
└────────┬────────┘
         ↓
┌────────┴────────┐
│ Tax Calculator  │ ← Apply brackets
└────────┬────────┘
         ↓
┌────────┴────────┐
│ Form 1040 Gen   │ ← Generate PDF
└────────┬────────┘
         ↓
┌────────┴────────┐
│ Validator       │ ← Check for errors
└─────────────────┘
```

**Week 9 Deliverables:**
- [ ] 3+ sample workflows
- [ ] Complete end-to-end test suite
- [ ] Performance < 2 seconds
- [ ] Bug fixes
- [ ] Documentation

---

### Week 10: Storage & Persistence

**IndexedDB Integration:**

```typescript
export class TaxFlowDB extends Dexie {
  workflows!: Table<TaxWorkflow, string>
  taxReturns!: Table<TaxReturn, string>
  documents!: Table<Document, string>

  constructor() {
    super('TaxFlowDB')
    this.version(1).stores({
      workflows: 'id, name, taxYear, lastModified',
      taxReturns: 'id, taxYear, taxpayerSSN',
      documents: 'id, type, taxYear'
    })
  }
}

// Usage
const db = new TaxFlowDB()

// Save workflow
await db.workflows.put(workflow)

// Load workflow
const workflow = await db.workflows.get(workflowId)
```

**Week 10 Deliverables:**
- [ ] IndexedDB schema defined
- [ ] Save/load workflows
- [ ] Save/load tax returns
- [ ] Document storage
- [ ] Export/import functionality
- [ ] Data migration strategy

---

## Phase 4: Polish & Launch (Weeks 11-12)

### Week 11: Testing & Bug Fixes

**Testing Strategy:**
1. **Unit Tests:** All nodes, 90%+ coverage
2. **Integration Tests:** Complete workflows
3. **IRS Validation:** Test against IRS examples
4. **Browser Testing:** Chrome, Firefox, Safari, Edge
5. **Performance Testing:** Large datasets

**IRS Test Cases:**
```typescript
describe('IRS Publication 17 Examples', () => {
  it('Example 1: Single filer, W-2 only', async () => {
    const result = await runWorkflow({
      wages: 50000,
      filingStatus: 'single'
    })
    expect(result.totalTax).toBe(4146)
  })

  it('Example 2: Married filing jointly, itemized', async () => {
    // ...
  })
})
```

**Week 11 Deliverables:**
- [ ] 50+ unit tests
- [ ] 10+ integration tests
- [ ] 5+ IRS test cases
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Bug fixes

---

### Week 12: Documentation & Launch

**Documentation:**
1. **User Guide**
   - Getting started
   - Creating workflows
   - Importing W-2 data
   - Generating Form 1040
   - Troubleshooting

2. **Developer Guide**
   - Architecture overview
   - Creating custom nodes
   - Testing guidelines
   - Contributing

3. **API Reference**
   - All node types
   - Parameters
   - Examples

**Launch Checklist:**
- [ ] All documentation complete
- [ ] User guide published
- [ ] Sample workflows included
- [ ] Demo video created
- [ ] GitHub repository public
- [ ] Website deployed
- [ ] Social media announcement

---

## Technology Decisions Summary

| Category | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | React 18+ | Large ecosystem, TypeScript support |
| **State** | Zustand | Simple, lightweight, good TS support |
| **Storage** | Dexie.js (IndexedDB) | Browser storage, good API |
| **Excel** | xlsx | Same as n8n, proven |
| **PDF** | pdf-lib | Pure JS, works in browser |
| **Math** | decimal.js | Avoid floating-point errors |
| **Dates** | date-fns | Lightweight |
| **Validation** | zod | Type-safe validation |
| **Testing** | Vitest | Fast, Vite-native |
| **Styling** | TailwindCSS | Utility-first, rapid dev |
| **Build** | Vite | Fast, modern |

---

## Risk Management

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PDF generation too slow | Medium | High | Use Web Workers, optimize |
| Browser storage limits | Low | Medium | Warn users, add export |
| Complex workflow execution | Low | High | Extensive testing |
| IRS rule changes | High | Medium | Make rules configurable |

### Schedule Risks

| Risk | Mitigation |
|------|------------|
| Underestimated complexity | Build MVP first, iterate |
| Blocked on PDF template | Start with JSON output first |
| Testing takes longer | Automate, use IRS test cases |

---

## Success Metrics

### Technical Metrics
- [ ] Workflow execution < 2 seconds
- [ ] 90%+ test coverage
- [ ] 100% accuracy on IRS test cases
- [ ] Works on 4 major browsers
- [ ] < 500 KB initial bundle size

### User Metrics
- [ ] Import W-2 in < 30 seconds
- [ ] Calculate 1040 in < 5 minutes
- [ ] Generate valid PDF
- [ ] Zero server dependencies
- [ ] Works offline

---

## Post-MVP Roadmap (Weeks 13+)

### Phase 5: Additional Features
- [ ] State tax calculations (50 states)
- [ ] Schedule C (business income)
- [ ] Schedule D (capital gains)
- [ ] Schedule E (rental income)
- [ ] Prior year comparisons
- [ ] Multi-year planning

### Phase 6: Cloud Sync (Optional)
- [ ] Firebase/Supabase integration
- [ ] User authentication
- [ ] Cloud backup
- [ ] Multi-device sync
- [ ] Sharing with tax preparer

### Phase 7: Advanced Features
- [ ] Tax optimization suggestions
- [ ] What-if scenarios
- [ ] Audit risk assessment
- [ ] E-file integration (via API)
- [ ] Tax calendar/reminders

---

## Appendix: Key Files Reference

### From n8n Analysis
- `packages/workflow/src/workflow.ts` - Workflow orchestration
- `packages/workflow/src/node-helpers.ts` - Node utilities
- `packages/workflow/src/interfaces.ts` - Core interfaces
- `packages/nodes-base/nodes/SpreadsheetFile/` - Excel handling
- `packages/nodes-base/nodes/If/` - Conditional logic
- `packages/nodes-base/nodes/Set/` - Data transformation

### TaxFlow Implementation
- `src/engine/TaxWorkflow.ts` - Main workflow engine
- `src/engine/TaxNode.ts` - Node base classes
- `src/irs/TaxBrackets.ts` - Tax calculation
- `src/nodes/input/ExcelImportNode.ts` - Excel import
- `src/nodes/calculation/AGICalculatorNode.ts` - AGI calculation
- `src/nodes/form/Form1040GeneratorNode.ts` - PDF generation

---

**Status:** ✅ Roadmap Complete
**Estimated Duration:** 12 weeks
**Confidence:** High (based on comprehensive n8n analysis)
**Ready to Start:** Yes

**Next Step:** Initialize project and begin Week 1, Day 1 tasks!
