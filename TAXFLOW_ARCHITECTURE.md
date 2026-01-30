# TaxFlow Architecture Design
## Enterprise-Grade Tax Workflow Platform Inspired by n8n

**Design Date:** 2025-11-22
**Based On:** n8n v1.121.0 Architecture Analysis
**Target:** Browser-based tax calculation and reporting platform

---

## Executive Summary

TaxFlow adapts n8n's proven workflow automation architecture for tax-specific workflows. It combines:
- **n8n's robust workflow engine** → Tax-aware calculation flows
- **n8n's node system** → Tax-specific nodes (W-2 import, 1040 generation, etc.)
- **n8n's expression language** → Tax calculations and validations
- **Browser-first design** → No backend required (initially)

---

## 1. Core Architecture

### 1.1 High-Level Components

```
┌──────────────────────────────────────────────────────────┐
│                    TaxFlow Platform                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────┐ │
│  │  Workflow      │  │  Node Library  │  │  UI/Editor │ │
│  │  Engine        │←→│  (Tax Nodes)   │←→│            │ │
│  └────────────────┘  └────────────────┘  └────────────┘ │
│          ↕                    ↕                  ↕        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────┐ │
│  │  Expression    │  │  IRS Rules     │  │  Storage   │ │
│  │  Engine        │  │  Engine        │  │  (IndexedDB)│ │
│  └────────────────┘  └────────────────┘  └────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Frontend
- **Framework:** React 18+ with TypeScript 5+
- **State Management:** Zustand (lighter than Redux, similar to Pinia)
- **Canvas:** React Flow or custom Canvas API
- **Styling:** TailwindCSS + CSS Variables
- **Build:** Vite
- **Testing:** Vitest + Playwright

#### Libraries
- **Excel Processing:** xlsx (same as n8n)
- **PDF Generation:** pdf-lib
- **Math/Calculations:** decimal.js (for precision)
- **Date Handling:** date-fns (lighter than Luxon)
- **Validation:** zod (same as n8n)
- **Storage:** Dexie.js (IndexedDB wrapper)

#### Why Browser-Only (Phase 1)?
1. **Simplicity:** No server deployment, no database setup
2. **Privacy:** Tax data never leaves user's computer
3. **Cost:** Free to run (no hosting costs)
4. **Speed:** Immediate calculations, no network latency
5. **Offline:** Works without internet

---

## 2. Workflow Engine Design

### 2.1 Core Classes

#### `TaxWorkflow` Class
Adapted from `n8n Workflow` class:

```typescript
export interface TaxWorkflowSettings {
  taxYear: number  // 🆕 First-class tax year support
  filingStatus: 'single' | 'married-joint' | 'married-separate' | 'hoh' | 'qss'
  taxpayerInfo: {
    firstName: string
    lastName: string
    ssn: string
    address: Address
  }
  spouseInfo?: {
    firstName: string
    lastName: string
    ssn: string
  }
  dependents?: Dependent[]
  state?: string  // 🆕 State for state tax calculation
}

export class TaxWorkflow {
  id: string
  name: string
  description?: string

  // Core workflow structure (from n8n)
  nodes: Map<string, TaxNode>
  connections: TaxConnections

  // Tax-specific settings
  settings: TaxWorkflowSettings

  // Execution
  staticData: Record<string, any>  // Prior year data, cached IRS tables
  executionHistory: TaxExecution[]

  // Results
  calculatedReturns: Map<number, TaxReturn>  // Year → TaxReturn

  // Engine components
  private nodeRegistry: TaxNodeRegistry
  private expressionEngine: TaxExpressionEngine
  private validationEngine: IRSValidationEngine

  constructor(params: TaxWorkflowParams) {
    // Similar to n8n Workflow constructor
    this.nodes = new Map(params.nodes.map(n => [n.id, n]))
    this.connections = this.buildConnectionMaps(params.connections)
    this.settings = { taxYear: 2024, ...params.settings }
  }

  async execute(): Promise<TaxReturn> {
    // Execute workflow and return calculated tax return
  }

  private buildConnectionMaps(connections: TaxConnection[]) {
    // Build bidirectional connection maps (from n8n pattern)
  }

  async executeNode(nodeId: string, inputData: TaxData[]): Promise<TaxData[]> {
    // Execute a single node with context
  }
}
```

### 2.2 Node Interface

#### `ITaxNode` Interface
Adapted from `INodeType`:

```typescript
export interface ITaxNodeDescription {
  name: string
  displayName: string
  description: string
  version: number
  group: 'input' | 'calculation' | 'validation' | 'form' | 'output'
  icon: string
  color: string

  inputs: TaxNodeConnectionType[]
  outputs: TaxNodeConnectionType[]

  properties: ITaxNodeProperty[]

  defaults: {
    name: string
    color: string
  }
}

export interface ITaxNode {
  description: ITaxNodeDescription

  execute(
    this: ITaxExecuteContext,
    inputData: TaxData[]
  ): Promise<TaxData[]> | TaxData[]

  // Optional hooks
  onWorkflowExecuteStart?(): void
  onWorkflowExecuteEnd?(): void

  // For nodes with dynamic options
  methods?: {
    loadOptions?: () => Promise<NodeOption[]>
  }
}
```

### 2.3 Execution Context

#### `ITaxExecuteContext`
Adapted from `IExecuteFunctions`:

```typescript
export interface ITaxExecuteContext {
  // Input
  getInputData(): TaxData[]

  // Parameters
  getNodeParameter<T = any>(
    parameterName: string,
    itemIndex?: number,
    defaultValue?: T
  ): T

  // Workflow context
  getWorkflow(): TaxWorkflow
  getNode(): TaxNode
  getTaxYear(): number
  getFilingStatus(): FilingStatus

  // Tax-specific helpers
  helpers: {
    // IRS data access
    getTaxBrackets(year: number, status: FilingStatus): TaxBracket[]
    getStandardDeduction(year: number, status: FilingStatus): number
    getFormDefinition(formType: string, year: number): FormDefinition

    // Calculations
    calculateTax(taxableIncome: number, year: number, status: FilingStatus): number
    roundToNearestDollar(amount: number): number

    // Validation
    validateSSN(ssn: string): boolean
    validateEIN(ein: string): boolean

    // File operations
    readExcel(binary: BinaryData): Promise<any[]>
    generatePDF(formData: FormData, template: string): Promise<BinaryData>
  }

  // Error handling
  continueOnFail(): boolean
  addWarning(message: string): void
  addError(error: Error, itemIndex?: number): void

  // Expression evaluation
  evaluateExpression(expression: string, itemIndex: number): any
}
```

---

## 3. Tax-Specific Data Model

### 3.1 Core Data Types

```typescript
// Main data structure passed between nodes
export interface TaxData {
  json: Record<string, any>  // Like n8n INodeExecutionData
  metadata?: {
    sourceForm?: string  // W-2, 1099-NEC, etc.
    sourceNode?: string
    itemIndex?: number
    taxYear?: number
  }
  errors?: TaxError[]
  warnings?: TaxWarning[]
}

// Complete tax return
export interface TaxReturn {
  taxYear: number
  filingStatus: FilingStatus
  taxpayer: TaxpayerInfo
  spouse?: TaxpayerInfo
  dependents: Dependent[]

  // Income
  income: {
    wages: number  // Form 1040 Line 1
    interest: number  // Line 2
    dividends: number  // Line 3
    iRAdistributions: number  // Line 4
    // ... all income lines
    totalIncome: number
  }

  // Adjustments to income
  adjustments: {
    iraDeduction: number
    studentLoanInterest: number
    // ... all adjustments
    totalAdjustments: number
  }

  // AGI
  agi: number  // totalIncome - totalAdjustments

  // Deductions
  deductionType: 'standard' | 'itemized'
  deductionAmount: number

  // Taxable income
  taxableIncome: number  // AGI - deduction

  // Tax calculation
  taxBeforeCredits: number
  credits: {
    childTaxCredit: number
    earnedIncomeCredit: number
    // ... all credits
    totalCredits: number
  }
  taxAfterCredits: number

  // Other taxes
  otherTaxes: {
    selfEmploymentTax: number
    // ... other taxes
    totalOtherTaxes: number
  }

  // Total tax
  totalTax: number

  // Payments
  payments: {
    federalWithholding: number
    estimatedTaxPayments: number
    // ... all payments
    totalPayments: number
  }

  // Refund or amount owed
  refundOrAmountOwed: number

  // Schedules
  schedules: {
    scheduleA?: ScheduleA  // Itemized deductions
    scheduleB?: ScheduleB  // Interest and dividends
    scheduleC?: ScheduleC  // Business income
    scheduleD?: ScheduleD  // Capital gains
    scheduleE?: ScheduleE  // Rental income
    scheduleSE?: ScheduleSE  // Self-employment tax
  }

  // Forms
  forms: {
    form1040: Form1040Data
    w2s: W2[]
    form1099s: Form1099[]
  }

  // Generated PDFs
  generatedForms?: {
    form1040PDF?: Blob
    scheduleAPDF?: Blob
    // ... other PDFs
  }
}
```

### 3.2 Form Data Structures

```typescript
// W-2 Wage and Tax Statement
export interface W2 {
  employer: {
    name: string
    ein: string
    address: Address
  }
  employee: {
    name: string
    ssn: string
    address: Address
  }
  box1_wages: number  // Wages, tips, other compensation
  box2_federalTax: number  // Federal income tax withheld
  box3_socialSecurityWages: number
  box4_socialSecurityTax: number
  box5_medicareWages: number
  box6_medicareTax: number
  // ... boxes 7-20
}

// Form 1099-NEC (Nonemployee Compensation)
export interface Form1099NEC {
  payer: {
    name: string
    ein: string
    address: Address
  }
  recipient: {
    name: string
    ssn: string
    address: Address
  }
  box1_nonemployeeCompensation: number
  box2_payerMadeDirect Sales: boolean
  box4_federalTaxWithheld: number
  box5_stateTaxWithheld: number
  box6_stateIncome: number
  box7_state: string
}

// Schedule A (Itemized Deductions)
export interface ScheduleA {
  medicalDentalExpenses: number
  taxesPaid: {
    stateLocalIncomeTax: number
    realEstateTax: number
    personalPropertyTax: number
    totalTaxes: number  // Capped at $10,000
  }
  interestPaid: {
    homeMortgageInterest: number
    investmentInterest: number
  }
  giftsToCharity: {
    cashContributions: number
    nonCashContributions: number
  }
  casualtyAndTheftLosses: number
  otherItemizedDeductions: number
  totalItemizedDeductions: number
}
```

---

## 4. IRS Rules Engine

### 4.1 Tax Bracket System

```typescript
export interface TaxBracket {
  min: number
  max: number | Infinity
  rate: number
  base: number  // Tax on amount up to min
}

export class TaxBracketCalculator {
  private brackets: Map<string, TaxBracket[]>  // "2024-single" → brackets

  constructor() {
    this.loadTaxBrackets()
  }

  private loadTaxBrackets() {
    // 2024 Tax Brackets - Single
    this.brackets.set('2024-single', [
      { min: 0, max: 11600, rate: 0.10, base: 0 },
      { min: 11600, max: 47150, rate: 0.12, base: 1160 },
      { min: 47150, max: 100525, rate: 0.22, base: 5426 },
      { min: 100525, max: 191950, rate: 0.24, base: 17168.50 },
      { min: 191950, max: 243725, rate: 0.32, base: 39110.50 },
      { min: 243725, max: 609350, rate: 0.35, base: 55678.50 },
      { min: 609350, max: Infinity, rate: 0.37, base: 183647.25 }
    ])

    // 2024 Tax Brackets - Married Filing Jointly
    this.brackets.set('2024-married-joint', [
      { min: 0, max: 23200, rate: 0.10, base: 0 },
      { min: 23200, max: 94300, rate: 0.12, base: 2320 },
      { min: 94300, max: 201050, rate: 0.22, base: 10852 },
      { min: 201050, max: 383900, rate: 0.24, base: 34337 },
      { min: 383900, max: 487450, rate: 0.32, base: 78221 },
      { min: 487450, max: 731200, rate: 0.35, base: 111357 },
      { min: 731200, max: Infinity, rate: 0.37, base: 196669.50 }
    ])

    // ... other filing statuses and years
  }

  calculateTax(
    taxableIncome: number,
    year: number,
    filingStatus: FilingStatus
  ): TaxCalculationResult {
    const key = `${year}-${filingStatus}`
    const brackets = this.brackets.get(key)

    if (!brackets) {
      throw new Error(`No tax brackets for ${key}`)
    }

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
        income: taxableInBracket,
        tax: taxInBracket
      })
    }

    return {
      totalTax: Math.round(totalTax),  // IRS rounds to nearest dollar
      breakdown,
      effectiveRate: totalTax / taxableIncome
    }
  }
}
```

### 4.2 Validation Rules

```typescript
export class IRSValidationEngine {
  validateReturn(taxReturn: TaxReturn): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // SSN validation
    if (!this.isValidSSN(taxReturn.taxpayer.ssn)) {
      errors.push({
        field: 'taxpayer.ssn',
        message: 'Invalid SSN format. Must be XXX-XX-XXXX',
        code: 'INVALID_SSN'
      })
    }

    // AGI calculation
    const calculatedAGI = taxReturn.income.totalIncome - taxReturn.adjustments.totalAdjustments
    if (Math.abs(calculatedAGI - taxReturn.agi) > 1) {
      errors.push({
        field: 'agi',
        message: `AGI mismatch. Calculated: ${calculatedAGI}, Reported: ${taxReturn.agi}`,
        code: 'AGI_MISMATCH'
      })
    }

    // SALT cap (State and Local Tax deduction limit)
    if (taxReturn.schedules.scheduleA) {
      const saltTotal = taxReturn.schedules.scheduleA.taxesPaid.totalTaxes
      if (saltTotal > 10000) {
        warnings.push({
          field: 'scheduleA.taxesPaid',
          message: `SALT deduction is capped at $10,000. You claimed ${saltTotal}`,
          code: 'SALT_CAP_EXCEEDED'
        })
      }
    }

    // Standard deduction vs itemized
    const standardDeduction = this.getStandardDeduction(
      taxReturn.taxYear,
      taxReturn.filingStatus
    )
    const itemizedTotal = taxReturn.schedules.scheduleA?.totalItemizedDeductions ?? 0

    if (taxReturn.deductionType === 'itemized' && itemizedTotal < standardDeduction) {
      warnings.push({
        field: 'deductionType',
        message: `Standard deduction ($${standardDeduction}) is higher than itemized ($${itemizedTotal})`,
        code: 'SUBOPTIMAL_DEDUCTION'
      })
    }

    // ... many more validations

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  private isValidSSN(ssn: string): boolean {
    return /^\d{3}-\d{2}-\d{4}$/.test(ssn)
  }

  private getStandardDeduction(year: number, status: FilingStatus): number {
    const deductions: Record<string, Record<FilingStatus, number>> = {
      '2024': {
        'single': 13850,
        'married-joint': 27700,
        'married-separate': 13850,
        'hoh': 20800,
        'qss': 27700
      }
      // ... other years
    }

    return deductions[year.toString()]?.[status] ?? 0
  }
}
```

---

## 5. Expression Engine

### 5.1 Tax Expression Language

Similar to n8n but tax-focused:

```javascript
// Basic field access
{{ $json.wages }}

// Tax calculations
{{ $json.wages * 0.153 }}  // Self-employment tax

// IRS rounding
{{ $helpers.round($json.wages * 0.153) }}

// Conditional logic
{{ $json.income > 100000 ? 'high' : 'low' }}

// Access IRS data
{{ $irs.standardDeduction($taxYear, $filingStatus) }}
{{ $irs.taxBrackets($taxYear, $filingStatus) }}

// Multi-line calculations
{{
  const agi = $json.totalIncome - $json.adjustments
  const deduction = $irs.standardDeduction($taxYear, $filingStatus)
  const taxableIncome = agi - deduction
  return $helpers.round(taxableIncome)
}}

// Access other nodes
{{ $node["W2 Import"].json.wages }}

// Array operations
{{ $input.all().map(item => item.json.wages).sum() }}

// Date formatting
{{ $json.date.format("MM/DD/YYYY") }}
```

### 5.2 Tax Helper Functions

```typescript
export const taxHelpers = {
  // IRS rounding rules
  round(amount: number): number {
    return Math.round(amount)  // Round to nearest dollar
  },

  roundTo(amount: number, decimals: number): number {
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals)
  },

  // Format SSN
  formatSSN(ssn: string): string {
    return ssn.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3')
  },

  // Format EIN
  formatEIN(ein: string): string {
    return ein.replace(/(\d{2})(\d{7})/, '$1-$2')
  },

  // Tax bracket lookup
  getTaxRate(income: number, year: number, status: FilingStatus): number {
    // Return marginal tax rate
  },

  // Calculate tax on specific amount
  calculateTax(income: number, year: number, status: FilingStatus): number {
    // Return total tax
  }
}
```

---

## 6. Storage Architecture

### 6.1 IndexedDB Schema

```typescript
// Using Dexie.js
export class TaxFlowDB extends Dexie {
  workflows!: Table<TaxWorkflow, string>
  taxReturns!: Table<TaxReturn, string>
  documents!: Table<Document, string>
  settings!: Table<Setting, string>

  constructor() {
    super('TaxFlowDB')

    this.version(1).stores({
      workflows: 'id, name, taxYear, lastModified',
      taxReturns: 'id, taxYear, filingStatus, taxpayerSSN',
      documents: 'id, type, taxYear, uploadDate',
      settings: 'key'
    })
  }
}

// Usage
const db = new TaxFlowDB()

// Save workflow
await db.workflows.put({
  id: 'workflow-1',
  name: '2024 Tax Return',
  taxYear: 2024,
  nodes: [...],
  connections: [...],
  lastModified: new Date()
})

// Query tax returns
const returns2024 = await db.taxReturns
  .where('taxYear')
  .equals(2024)
  .toArray()
```

### 6.2 Data Migration

```typescript
// Version upgrades
this.version(2).stores({
  workflows: 'id, name, taxYear, lastModified',
  taxReturns: 'id, taxYear, filingStatus, taxpayerSSN',
  documents: 'id, type, taxYear, uploadDate',
  settings: 'key',
  priorYearData: 'taxYear, importDate'  // 🆕 Add prior year imports
}).upgrade(async tx => {
  // Migrate existing data
  const workflows = await tx.table('workflows').toArray()
  for (const workflow of workflows) {
    // Add default taxYear if missing
    if (!workflow.taxYear) {
      workflow.taxYear = 2024
      await tx.table('workflows').put(workflow)
    }
  }
})
```

---

## 7. Deployment Strategy

### Phase 1: Browser-Only (MVP)
```
User's Browser
  ↓
TaxFlow Web App (React)
  ↓
IndexedDB (Local Storage)
```

**Pros:**
- ✅ Complete privacy (data never leaves browser)
- ✅ No hosting costs
- ✅ Works offline
- ✅ No authentication needed

**Cons:**
- ❌ No sync across devices
- ❌ Data loss if browser storage cleared
- ❌ Limited to browser storage limits (~50MB-1GB)

### Phase 2: Hybrid (Local + Cloud Sync)
```
User's Browser
  ↓
TaxFlow Web App
  ↓
IndexedDB (Primary)
  ↓ (Optional Sync)
Cloud Storage (Firebase/Supabase)
```

**Additions:**
- ✅ Sync across devices
- ✅ Backup in cloud
- ✅ Share returns with tax preparer
- ⚠️ Requires authentication
- ⚠️ Need to handle encryption

### Phase 3: Full Platform (Enterprise)
```
User's Browser → API Gateway → Backend Services
                                      ↓
                            ┌─────────┴─────────┐
                    Database (PostgreSQL)   File Storage (S3)
```

**Additions:**
- ✅ Multi-user collaboration
- ✅ Tax preparer features
- ✅ Bulk processing
- ✅ Audit logs
- ⚠️ Higher complexity
- ⚠️ Hosting costs

**Recommendation:** Start with Phase 1, validate concept, then add sync.

---

## 8. Security & Privacy

### 8.1 Data Encryption

```typescript
// Encrypt sensitive fields before storage
export class TaxDataEncryption {
  private key: CryptoKey

  async encrypt(data: TaxReturn): Promise<EncryptedTaxReturn> {
    // Encrypt SSN, financial data
    const sensitiveFields = {
      ssn: data.taxpayer.ssn,
      spouseSSN: data.spouse?.ssn,
      income: data.income,
      // ... other sensitive data
    }

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.generateIV() },
      this.key,
      JSON.stringify(sensitiveFields)
    )

    return {
      ...data,
      encryptedData: encrypted,
      taxpayer: { ...data.taxpayer, ssn: '[ENCRYPTED]' }
    }
  }
}
```

### 8.2 Best Practices

1. **Never log sensitive data** (SSNs, income amounts)
2. **Use Crypto API** for encryption
3. **Clear sensitive data** from memory after use
4. **No analytics** on tax data (privacy first)
5. **Local processing only** (Phase 1)

---

## 9. Architecture Decision Records (ADRs)

### ADR-001: Browser-First Architecture
**Decision:** Build TaxFlow as browser-only application initially

**Rationale:**
- Tax data is highly sensitive
- Users prefer privacy (local processing)
- Eliminates backend complexity
- Faster time to market
- Lower operational cost

**Consequences:**
- Limited storage capacity
- No cross-device sync (initially)
- Requires client-side PDF generation
- Browser compatibility concerns

---

### ADR-002: React over Vue
**Decision:** Use React instead of n8n's Vue

**Rationale:**
- Larger ecosystem for business apps
- Better TypeScript support
- More familiar to contributors
- Better component libraries (Radix UI, Shadcn)

**Consequences:**
- Can't directly use n8n's Vue components
- Need to reimplement canvas/editor

---

### ADR-003: Zustand over Redux
**Decision:** Use Zustand for state management

**Rationale:**
- Simpler API than Redux
- Less boilerplate
- Good TypeScript support
- Similar to Vue's Pinia (n8n uses)

**Consequences:**
- Less middleware ecosystem
- Smaller community than Redux

---

### ADR-004: decimal.js for Calculations
**Decision:** Use decimal.js for all financial calculations

**Rationale:**
- Avoid floating-point errors
- IRS requires exact calculations
- Example: 0.1 + 0.2 = 0.30000000000000004 in JS

**Consequences:**
- Slightly slower than native numbers
- Need to convert to/from Decimal objects

---

## 10. Migration from Current TaxFlow

### Current TaxFlow (8 nodes)
```
1. Input Node
2. W-2 Parser
3. Income Aggregator
4. Deduction Calculator
5. Tax Calculator
6. Form Generator
7. Validation Node
8. Output Node
```

### Migration Strategy

**Option A: Big Bang Rewrite**
- Build complete new system
- Migrate all 8 nodes at once
- Switch over when complete

**Option B: Gradual Migration (Recommended)**
1. Build new TaxFlow engine alongside old system
2. Migrate 1-2 nodes at a time
3. Run both systems in parallel
4. Gradually deprecate old system

**Step-by-Step:**
```
Week 1-2: Build core engine (Workflow, Node interfaces)
Week 3-4: Migrate Input + W-2 Parser nodes
Week 5-6: Migrate aggregation + calculation nodes
Week 7-8: Migrate form generation + validation
Week 9-10: Polish, test, deploy
Week 11-12: Deprecate old system
```

---

## 11. Key Differences from n8n

| Feature | n8n | TaxFlow |
|---------|-----|---------|
| **Deployment** | Server-based | Browser-only (Phase 1) |
| **Node Count** | 400+ integrations | ~15-20 tax nodes |
| **Data Storage** | PostgreSQL/MySQL | IndexedDB |
| **Authentication** | OAuth, SAML, LDAP | None (Phase 1) |
| **Execution** | Backend workers | Browser main thread / Web Workers |
| **Webhooks** | Supported | Not needed |
| **Scheduling** | Cron jobs | Not needed (manual runs) |
| **API Integrations** | Many cloud services | IRS data only (local) |
| **Multi-user** | Yes | No (Phase 1) |
| **Workflow Sharing** | Yes | No (Phase 1) |

---

## 12. Success Metrics

### Technical Metrics
- [ ] Workflow execution < 2 seconds for typical tax return
- [ ] Support for 10+ years of tax rules (2015-2025)
- [ ] 100% accuracy on IRS test cases
- [ ] < 100 KB bundle size for core engine
- [ ] Works on Chrome, Firefox, Safari, Edge

### User Metrics
- [ ] Can import W-2 from Excel in < 30 seconds
- [ ] Can calculate complete 1040 in < 5 minutes
- [ ] Generates valid PDF Form 1040
- [ ] Catches 95%+ of common tax errors
- [ ] Zero server dependencies

---

**Status:** ✅ Architecture Design Complete
**Next:** Tax Node Library Specification
**Ready for Implementation:** Yes
