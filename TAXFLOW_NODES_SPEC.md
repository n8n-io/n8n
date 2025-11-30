# TaxFlow Node Library Specification
## Complete Tax-Specific Node Definitions

**Version:** 1.0
**Target Tax Year:** 2024 (extensible to other years)
**Total Nodes:** 18 specialized tax nodes

---

## Node Classification

### Input Nodes (4)
1. Excel Import
2. W-2 Import
3. 1099 Import
4. Manual Income Entry

### Calculation Nodes (6)
5. AGI Calculator
6. Standard/Itemized Deduction
7. Tax Bracket Calculator
8. Credits Calculator
9. Self-Employment Tax
10. State Tax Calculator

### Form Nodes (4)
11. Form 1040 Generator
12. Schedule A Generator
13. Schedule C Generator
14. Schedule SE Generator

### Validation Nodes (2)
15. IRS Rules Validator
16. Math Check

### Output Nodes (2)
17. PDF Package Generator
18. Excel Report Generator

---

## 1. Excel Import Node

### Description
Import tax data from Excel/CSV files (W-2s, 1099s, expense tracking, etc.)

### Node Definition
```typescript
{
  name: 'excelImport',
  displayName: 'Excel Import',
  description: 'Import tax data from Excel or CSV files',
  version: 1,
  group: 'input',
  icon: 'file-excel',
  color: '#217346',

  inputs: [],  // No inputs - starting node
  outputs: ['main'],

  properties: [
    {
      displayName: 'File Source',
      name: 'fileSource',
      type: 'options',
      options: [
        { name: 'Upload File', value: 'upload' },
        { name: 'From URL', value: 'url' }
      ],
      default: 'upload'
    },
    {
      displayName: 'File',
      name: 'file',
      type: 'file',
      accept: '.xlsx,.xls,.csv',
      displayOptions: {
        show: { fileSource: ['upload'] }
      }
    },
    {
      displayName: 'Sheet Name',
      name: 'sheetName',
      type: 'string',
      default: 'Sheet1',
      description: 'Name of the Excel sheet to read'
    },
    {
      displayName: 'Has Header Row',
      name: 'hasHeaderRow',
      type: 'boolean',
      default: true
    },
    {
      displayName: 'Column Mapping',
      name: 'columnMapping',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true
      },
      default: {},
      options: [
        {
          name: 'mapping',
          displayName: 'Mapping',
          values: [
            {
              displayName: 'Excel Column',
              name: 'excelColumn',
              type: 'string',
              default: 'A'
            },
            {
              displayName: 'Field Name',
              name: 'fieldName',
              type: 'string',
              default: ''
            },
            {
              displayName: 'Data Type',
              name: 'dataType',
              type: 'options',
              options: [
                { name: 'Text', value: 'string' },
                { name: 'Number', value: 'number' },
                { name: 'Currency', value: 'currency' },
                { name: 'Date', value: 'date' },
                { name: 'SSN', value: 'ssn' }
              ],
              default: 'string'
            }
          ]
        }
      ]
    }
  ]
}
```

### Execute Logic
```typescript
async execute(context: ITaxExecuteContext): Promise<TaxData[]> {
  const file = context.getNodeParameter('file', 0)
  const sheetName = context.getNodeParameter('sheetName', 0)
  const hasHeaderRow = context.getNodeParameter('hasHeaderRow', 0)
  const columnMapping = context.getNodeParameter('columnMapping', 0)

  // Read Excel file
  const workbook = await context.helpers.readExcel(file)
  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // Apply column mapping
  const headers = hasHeaderRow ? rawData[0] : columnMapping.map(m => m.fieldName)
  const dataRows = hasHeaderRow ? rawData.slice(1) : rawData

  const results: TaxData[] = dataRows.map((row, index) => {
    const json: Record<string, any> = {}

    columnMapping.forEach((mapping, i) => {
      const value = row[i]
      json[mapping.fieldName] = this.convertDataType(value, mapping.dataType)
    })

    return {
      json,
      metadata: {
        sourceNode: 'Excel Import',
        itemIndex: index,
        taxYear: context.getTaxYear()
      }
    }
  })

  return results
}

private convertDataType(value: any, type: string): any {
  switch (type) {
    case 'number':
    case 'currency':
      return parseFloat(value) || 0
    case 'date':
      return new Date(value)
    case 'ssn':
      return value.toString().replace(/[^0-9]/g, '')
    default:
      return value
  }
}
```

### Example Output
```json
[
  {
    "json": {
      "employerName": "Acme Corp",
      "wages": 75000,
      "federalTax": 12000,
      "ssn": "123456789"
    },
    "metadata": {
      "sourceNode": "Excel Import",
      "itemIndex": 0,
      "taxYear": 2024
    }
  }
]
```

---

## 2. W-2 Import Node

### Description
Import W-2 (Wage and Tax Statement) data with validation

### Properties
```typescript
{
  displayName: 'Import Method',
  name: 'importMethod',
  type: 'options',
  options: [
    { name: 'From Excel Import', value: 'excel' },
    { name: 'Manual Entry', value: 'manual' },
    { name: 'PDF Parse', value: 'pdf' }
  ],
  default: 'excel'
}

// If manual:
{
  displayName: 'Employer Information',
  name: 'employerInfo',
  type: 'collection',
  default: {},
  options: [
    { displayName: 'Employer Name', name: 'name', type: 'string' },
    { displayName: 'EIN', name: 'ein', type: 'string', placeholder: '12-3456789' },
    // ... address fields
  ]
}

{
  displayName: 'W-2 Boxes',
  name: 'w2Boxes',
  type: 'collection',
  default: {},
  options: [
    { displayName: 'Box 1 - Wages', name: 'box1', type: 'number' },
    { displayName: 'Box 2 - Federal Tax Withheld', name: 'box2', type: 'number' },
    { displayName: 'Box 3 - Social Security Wages', name: 'box3', type: 'number' },
    { displayName: 'Box 4 - Social Security Tax', name: 'box4', type: 'number' },
    { displayName: 'Box 5 - Medicare Wages', name: 'box5', type: 'number' },
    { displayName: 'Box 6 - Medicare Tax', name: 'box6', type: 'number' },
    // ... boxes 7-20
  ]
}
```

### Execute Logic
```typescript
async execute(context: ITaxExecuteContext): Promise<TaxData[]> {
  const importMethod = context.getNodeParameter('importMethod', 0)

  if (importMethod === 'excel') {
    // Get data from previous node (Excel Import)
    const inputData = context.getInputData()
    return inputData.map(item => this.transformToW2(item))
  } else if (importMethod === 'manual') {
    const employerInfo = context.getNodeParameter('employerInfo', 0)
    const w2Boxes = context.getNodeParameter('w2Boxes', 0)

    return [{
      json: {
        formType: 'W-2',
        employer: employerInfo,
        boxes: w2Boxes,
        year: context.getTaxYear()
      },
      metadata: {
        sourceForm: 'W-2',
        sourceNode: 'W-2 Import'
      }
    }]
  }

  // Validate W-2 data
  this.validateW2(w2Data)

  return [w2Data]
}

private validateW2(data: any) {
  // Box 1 should be >= Box 3 (SS wages can't exceed total wages)
  if (data.json.boxes.box3 > data.json.boxes.box1) {
    context.addWarning('Box 3 (SS wages) exceeds Box 1 (wages)')
  }

  // Box 4 should be ~6.2% of Box 3
  const expectedSSTax = data.json.boxes.box3 * 0.062
  if (Math.abs(data.json.boxes.box4 - expectedSSTax) > 1) {
    context.addWarning(`Box 4 (SS tax) seems incorrect. Expected ~${expectedSSTax}`)
  }

  // Validate EIN format
  if (!context.helpers.validateEIN(data.json.employer.ein)) {
    context.addError('Invalid EIN format')
  }
}
```

---

## 3. AGI Calculator Node

### Description
Calculate Adjusted Gross Income (Total Income - Adjustments)

### Properties
```typescript
{
  displayName: 'Income Sources',
  name: 'incomeSources',
  type: 'fixedCollection',
  typeOptions: { multipleValues: true },
  default: {},
  options: [
    {
      name: 'source',
      displayName: 'Income Source',
      values: [
        {
          displayName: 'Source Type',
          name: 'type',
          type: 'options',
          options: [
            { name: 'Wages (W-2)', value: 'wages' },
            { name: 'Interest Income', value: 'interest' },
            { name: 'Dividend Income', value: 'dividends' },
            { name: 'Business Income', value: 'business' },
            { name: 'Capital Gains', value: 'capitalGains' },
            { name: 'Other Income', value: 'other' }
          ]
        },
        {
          displayName: 'Amount',
          name: 'amount',
          type: 'number',
          typeOptions: { numberPrecision: 2 }
        }
      ]
    }
  ]
}

{
  displayName: 'Adjustments to Income',
  name: 'adjustments',
  type: 'fixedCollection',
  typeOptions: { multipleValues: true },
  default: {},
  options: [
    {
      name: 'adjustment',
      displayName: 'Adjustment',
      values: [
        {
          displayName: 'Type',
          name: 'type',
          type: 'options',
          options: [
            { name: 'IRA Deduction', value: 'ira' },
            { name: 'Student Loan Interest', value: 'studentLoan' },
            { name: 'HSA Deduction', value: 'hsa' },
            { name: 'Self-Employment Tax Deduction', value: 'seTax' },
            { name: 'Educator Expenses', value: 'educator' }
          ]
        },
        {
          displayName: 'Amount',
          name: 'amount',
          type: 'number'
        }
      ]
    }
  ]
}
```

### Execute Logic
```typescript
async execute(context: ITaxExecuteContext): Promise<TaxData[]> {
  const inputData = context.getInputData()
  const incomeSources = context.getNodeParameter('incomeSources', 0)
  const adjustments = context.getNodeParameter('adjustments', 0)

  // Aggregate income from input data (W-2s, 1099s, etc.)
  let totalIncome = 0
  const incomeBreakdown: Record<string, number> = {}

  // From input nodes
  inputData.forEach(item => {
    if (item.json.formType === 'W-2') {
      const wages = item.json.boxes.box1
      totalIncome += wages
      incomeBreakdown.wages = (incomeBreakdown.wages || 0) + wages
    } else if (item.json.formType === '1099-NEC') {
      const income = item.json.box1
      totalIncome += income
      incomeBreakdown.business = (incomeBreakdown.business || 0) + income
    }
  })

  // From manual sources
  incomeSources.forEach(source => {
    totalIncome += source.amount
    incomeBreakdown[source.type] = (incomeBreakdown[source.type] || 0) + source.amount
  })

  // Calculate total adjustments
  let totalAdjustments = 0
  const adjustmentBreakdown: Record<string, number> = {}

  adjustments.forEach(adj => {
    // Apply limits (e.g., student loan interest max $2,500)
    let amount = adj.amount
    if (adj.type === 'studentLoan') {
      amount = Math.min(amount, 2500)
    }
    if (adj.type === 'educator') {
      amount = Math.min(amount, 300)
    }

    totalAdjustments += amount
    adjustmentBreakdown[adj.type] = amount
  })

  // Calculate AGI
  const agi = totalIncome - totalAdjustments

  return [{
    json: {
      totalIncome: context.helpers.roundToNearestDollar(totalIncome),
      incomeBreakdown,
      totalAdjustments: context.helpers.roundToNearestDollar(totalAdjustments),
      adjustmentBreakdown,
      agi: context.helpers.roundToNearestDollar(agi)
    },
    metadata: {
      sourceNode: 'AGI Calculator',
      calculation: 'AGI = Total Income - Adjustments'
    }
  }]
}
```

### Example Output
```json
{
  "json": {
    "totalIncome": 87500,
    "incomeBreakdown": {
      "wages": 75000,
      "interest": 2500,
      "business": 10000
    },
    "totalAdjustments": 5000,
    "adjustmentBreakdown": {
      "ira": 3000,
      "studentLoan": 2000
    },
    "agi": 82500
  }
}
```

---

## 4. Tax Bracket Calculator Node

### Description
Calculate federal income tax based on taxable income, filing status, and tax year

### Properties
```typescript
{
  displayName: 'Tax Year',
  name: 'taxYear',
  type: 'number',
  default: 2024,
  description: 'Tax year for bracket selection'
}

{
  displayName: 'Filing Status',
  name: 'filingStatus',
  type: 'options',
  options: [
    { name: 'Single', value: 'single' },
    { name: 'Married Filing Jointly', value: 'married-joint' },
    { name: 'Married Filing Separately', value: 'married-separate' },
    { name: 'Head of Household', value: 'hoh' },
    { name: 'Qualifying Surviving Spouse', value: 'qss' }
  ],
  default: 'single'
}

{
  displayName: 'Taxable Income',
  name: 'taxableIncome',
  type: 'number',
  default: 0,
  description: 'Taxable income (AGI - deductions)'
}

{
  displayName: 'Show Breakdown',
  name: 'showBreakdown',
  type: 'boolean',
  default: true,
  description: 'Include tax bracket breakdown in output'
}
```

### Execute Logic
```typescript
async execute(context: ITaxExecuteContext): Promise<TaxData[]> {
  const inputData = context.getInputData()
  const taxYear = context.getNodeParameter('taxYear', 0)
  const filingStatus = context.getNodeParameter('filingStatus', 0)
  const showBreakdown = context.getNodeParameter('showBreakdown', 0)

  // Get taxable income from input or parameter
  const taxableIncome = inputData[0]?.json.taxableIncome ??
                        context.getNodeParameter('taxableIncome', 0)

  // Get tax brackets for year and status
  const brackets = context.helpers.getTaxBrackets(taxYear, filingStatus)

  // Calculate tax
  let totalTax = 0
  const breakdown: Array<{bracket: string, income: number, tax: number}> = []

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break

    const taxableInBracket = Math.min(
      taxableIncome - bracket.min,
      bracket.max - bracket.min
    )

    const taxInBracket = taxableInBracket * bracket.rate
    totalTax += taxInBracket

    if (showBreakdown) {
      breakdown.push({
        bracket: `${bracket.rate * 100}%`,
        income: context.helpers.roundToNearestDollar(taxableInBracket),
        tax: context.helpers.roundToNearestDollar(taxInBracket)
      })
    }
  }

  const effectiveRate = totalTax / taxableIncome
  const marginalRate = this.getMarginalRate(taxableIncome, brackets)

  return [{
    json: {
      taxableIncome: context.helpers.roundToNearestDollar(taxableIncome),
      totalTax: context.helpers.roundToNearestDollar(totalTax),
      effectiveRate: Math.round(effectiveRate * 10000) / 100,  // Percentage with 2 decimals
      marginalRate: Math.round(marginalRate * 100),
      breakdown: showBreakdown ? breakdown : undefined,
      taxYear,
      filingStatus
    },
    metadata: {
      sourceNode: 'Tax Bracket Calculator',
      calculation: '2024 Federal Tax Brackets'
    }
  }]
}

private getMarginalRate(income: number, brackets: TaxBracket[]): number {
  for (const bracket of brackets) {
    if (income >= bracket.min && income < bracket.max) {
      return bracket.rate
    }
  }
  return brackets[brackets.length - 1].rate  // Highest bracket
}
```

### Example Output
```json
{
  "json": {
    "taxableIncome": 82500,
    "totalTax": 14260,
    "effectiveRate": 17.29,
    "marginalRate": 22,
    "breakdown": [
      { "bracket": "10%", "income": 11600, "tax": 1160 },
      { "bracket": "12%", "income": 35550, "tax": 4266 },
      { "bracket": "22%", "income": 35350, "tax": 7777 }
    ],
    "taxYear": 2024,
    "filingStatus": "single"
  }
}
```

---

## 5. Form 1040 Generator Node

### Description
Generate PDF Form 1040 (U.S. Individual Income Tax Return)

### Properties
```typescript
{
  displayName: 'Form Template',
  name: 'formTemplate',
  type: 'options',
  options: [
    { name: '2024 Form 1040', value: '2024' },
    { name: '2023 Form 1040', value: '2023' }
  ],
  default: '2024'
}

{
  displayName: 'Output Format',
  name: 'outputFormat',
  type: 'options',
  options: [
    { name: 'PDF', value: 'pdf' },
    { name: 'JSON (Data Only)', value: 'json' }
  ],
  default: 'pdf'
}

{
  displayName: 'Taxpayer Information',
  name: 'taxpayerInfo',
  type: 'collection',
  default: {},
  options: [
    { displayName: 'First Name', name: 'firstName', type: 'string' },
    { displayName: 'Last Name', name: 'lastName', type: 'string' },
    { displayName: 'SSN', name: 'ssn', type: 'string' },
    { displayName: 'Address', name: 'address', type: 'string' },
    { displayName: 'City', name: 'city', type: 'string' },
    { displayName: 'State', name: 'state', type: 'string' },
    { displayName: 'ZIP', name: 'zip', type: 'string' }
  ]
}
```

### Execute Logic
```typescript
async execute(context: ITaxExecuteContext): Promise<TaxData[]> {
  const inputData = context.getInputData()
  const template = context.getNodeParameter('formTemplate', 0)
  const outputFormat = context.getNodeParameter('outputFormat', 0)
  const taxpayerInfo = context.getNodeParameter('taxpayerInfo', 0)

  // Gather all data from workflow
  const form1040Data = this.compileForm1040Data(inputData, taxpayerInfo)

  // Validate all required fields
  this.validateForm1040(form1040Data)

  if (outputFormat === 'json') {
    return [{ json: form1040Data }]
  }

  // Generate PDF
  const pdfTemplate = await this.loadPDFTemplate(template)
  const filledPDF = await this.fillPDFForm(pdfTemplate, form1040Data)

  return [{
    json: {
      formType: 'Form 1040',
      taxYear: form1040Data.taxYear,
      generatedDate: new Date().toISOString()
    },
    binary: {
      form1040: {
        data: filledPDF.toString('base64'),
        mimeType: 'application/pdf',
        fileName: `Form-1040-${form1040Data.taxYear}.pdf`
      }
    }
  }]
}

private compileForm1040Data(inputData: TaxData[], taxpayerInfo: any): Form1040 {
  // Find relevant data from input nodes
  const agiData = inputData.find(d => d.metadata?.sourceNode === 'AGI Calculator')
  const taxData = inputData.find(d => d.metadata?.sourceNode === 'Tax Bracket Calculator')
  const deductionData = inputData.find(d => d.metadata?.sourceNode === 'Deduction Calculator')
  const creditsData = inputData.find(d => d.metadata?.sourceNode === 'Credits Calculator')

  return {
    // Filing information
    taxYear: 2024,
    filingStatus: 'single',
    taxpayer: taxpayerInfo,

    // Income (Lines 1-9)
    line1a: agiData?.json.incomeBreakdown.wages || 0,  // Wages
    line2a: agiData?.json.incomeBreakdown.interest || 0,  // Interest
    line3a: agiData?.json.incomeBreakdown.dividends || 0,  // Dividends
    line8: agiData?.json.totalIncome || 0,  // Total income

    // Adjustments (Lines 10-11)
    line10a: agiData?.json.adjustmentBreakdown.ira || 0,
    line10b: agiData?.json.adjustmentBreakdown.studentLoan || 0,
    line11: agiData?.json.agi || 0,  // Adjusted Gross Income

    // Deductions (Line 12)
    line12: deductionData?.json.deductionAmount || 0,  // Standard/itemized

    // Taxable income (Line 15)
    line15: taxData?.json.taxableIncome || 0,

    // Tax (Line 16)
    line16: taxData?.json.totalTax || 0,

    // Credits (Lines 17-21)
    line17: creditsData?.json.childTaxCredit || 0,
    line20: creditsData?.json.totalCredits || 0,

    // Total tax (Line 24)
    line24: (taxData?.json.totalTax || 0) - (creditsData?.json.totalCredits || 0),

    // ... all other lines
  }
}

private async fillPDFForm(template: PDFDocument, data: Form1040): Promise<Buffer> {
  const form = template.getForm()

  // Fill each field
  form.getTextField('topmostSubform[0].Page1[0].f1_01[0]').setText(data.taxpayer.firstName)
  form.getTextField('topmostSubform[0].Page1[0].f1_02[0]').setText(data.taxpayer.lastName)
  form.getTextField('topmostSubform[0].Page1[0].f1_03[0]').setText(data.taxpayer.ssn)

  // Line 1a - Wages
  form.getTextField('topmostSubform[0].Page1[0].f1_20[0]').setText(data.line1a.toString())

  // ... fill all 79+ fields on Form 1040

  return await template.save()
}
```

---

## 6. IRS Rules Validator Node

### Description
Validate tax return against IRS rules and common errors

### Properties
```typescript
{
  displayName: 'Validation Level',
  name: 'validationLevel',
  type: 'options',
  options: [
    { name: 'Basic', value: 'basic' },
    { name: 'Standard', value: 'standard' },
    { name: 'Strict', value: 'strict' }
  ],
  default: 'standard'
}

{
  displayName: 'Stop on Error',
  name: 'stopOnError',
  type: 'boolean',
  default: false,
  description: 'Stop workflow execution if errors are found'
}

{
  displayName: 'Include Warnings',
  name: 'includeWarnings',
  type: 'boolean',
  default: true
}
```

### Execute Logic
```typescript
async execute(context: ITaxExecuteContext): Promise<TaxData[]> {
  const inputData = context.getInputData()
  const validationLevel = context.getNodeParameter('validationLevel', 0)
  const stopOnError = context.getNodeParameter('stopOnError', 0)
  const includeWarnings = context.getNodeParameter('includeWarnings', 0)

  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Compile full tax return from input data
  const taxReturn = this.compileTaxReturn(inputData)

  // Run validation rules
  this.validateSSN(taxReturn, errors)
  this.validateAGI(taxReturn, errors)
  this.validateDeductions(taxReturn, errors, warnings)
  this.validateTaxCalculation(taxReturn, errors)
  this.validateCredits(taxReturn, errors, warnings)

  if (validationLevel === 'strict') {
    this.validateAdvancedRules(taxReturn, errors, warnings)
  }

  // Filter warnings if not included
  const issues = includeWarnings ? [...errors, ...warnings] : errors

  if (stopOnError && errors.length > 0) {
    throw new Error(`Validation failed with ${errors.length} errors`)
  }

  return [{
    json: {
      valid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings: includeWarnings ? warnings : undefined,
      taxReturn: taxReturn
    }
  }]
}

private validateAGI(taxReturn: TaxReturn, errors: ValidationError[]) {
  const calculatedAGI = taxReturn.income.totalIncome - taxReturn.adjustments.totalAdjustments

  if (Math.abs(calculatedAGI - taxReturn.agi) > 1) {
    errors.push({
      code: 'AGI_MISMATCH',
      field: 'agi',
      message: `AGI calculation error. Calculated: ${calculatedAGI}, Reported: ${taxReturn.agi}`,
      severity: 'error'
    })
  }
}

private validateDeductions(
  taxReturn: TaxReturn,
  errors: ValidationError[],
  warnings: ValidationWarning[]
) {
  // SALT cap validation
  if (taxReturn.schedules.scheduleA) {
    const saltTotal = taxReturn.schedules.scheduleA.taxesPaid.totalTaxes
    if (saltTotal > 10000) {
      warnings.push({
        code: 'SALT_CAP_EXCEEDED',
        field: 'scheduleA.taxesPaid',
        message: `SALT deduction capped at $10,000. You claimed $${saltTotal}. Will be reduced.`,
        severity: 'warning'
      })
    }
  }

  // Standard vs itemized optimization
  const standardDeduction = this.getStandardDeduction(
    taxReturn.taxYear,
    taxReturn.filingStatus
  )
  const itemizedTotal = taxReturn.schedules.scheduleA?.totalItemizedDeductions || 0

  if (taxReturn.deductionType === 'itemized' && itemizedTotal < standardDeduction) {
    warnings.push({
      code: 'SUBOPTIMAL_DEDUCTION',
      field: 'deductionType',
      message: `Standard deduction ($${standardDeduction}) exceeds itemized ($${itemizedTotal}). Consider using standard.`,
      severity: 'warning'
    })
  }
}
```

### Example Output
```json
{
  "json": {
    "valid": false,
    "errorCount": 1,
    "warningCount": 2,
    "errors": [
      {
        "code": "AGI_MISMATCH",
        "field": "agi",
        "message": "AGI calculation error. Calculated: 82500, Reported: 82000",
        "severity": "error"
      }
    ],
    "warnings": [
      {
        "code": "SALT_CAP_EXCEEDED",
        "field": "scheduleA.taxesPaid",
        "message": "SALT deduction capped at $10,000. You claimed $15,000. Will be reduced.",
        "severity": "warning"
      },
      {
        "code": "SUBOPTIMAL_DEDUCTION",
        "field": "deductionType",
        "message": "Standard deduction ($13,850) exceeds itemized ($12,000). Consider using standard.",
        "severity": "warning"
      }
    ]
  }
}
```

---

## Implementation Priority

### Phase 1 (MVP - Week 1-4)
1. ✅ Excel Import Node
2. ✅ AGI Calculator Node
3. ✅ Tax Bracket Calculator Node
4. ✅ Form 1040 Generator Node
5. ✅ IRS Rules Validator Node

### Phase 2 (Week 5-8)
6. W-2 Import Node
7. 1099 Import Node
8. Standard/Itemized Deduction Node
9. Credits Calculator Node
10. PDF Package Generator Node

### Phase 3 (Week 9-12)
11. Manual Income Entry Node
12. Self-Employment Tax Node
13. State Tax Calculator Node
14. Schedule A Generator
15. Schedule C Generator
16. Schedule SE Generator
17. Math Check Node
18. Excel Report Generator

---

## Node Testing Strategy

### Unit Tests
```typescript
describe('AGI Calculator Node', () => {
  it('should calculate AGI correctly', async () => {
    const node = new AGICalculatorNode()
    const context = createMockContext({
      inputData: [
        { json: { formType: 'W-2', boxes: { box1: 75000 } } }
      ],
      parameters: {
        adjustments: [
          { type: 'ira', amount: 5000 }
        ]
      }
    })

    const result = await node.execute(context)

    expect(result[0].json.agi).toBe(70000)
  })

  it('should enforce student loan interest cap', async () => {
    // Test that student loan interest is capped at $2,500
  })
})
```

### Integration Tests
```typescript
describe('Full Tax Workflow', () => {
  it('should calculate complete 1040 correctly', async () => {
    const workflow = new TaxWorkflow({
      nodes: [
        new ExcelImportNode(),
        new W2ImportNode(),
        new AGICalculatorNode(),
        new DeductionNode(),
        new TaxBracketCalculatorNode(),
        new Form1040GeneratorNode()
      ],
      connections: [/* ... */]
    })

    const result = await workflow.execute()

    expect(result.totalTax).toBe(14260)  // Expected value
  })
})
```

### IRS Test Cases
Use official IRS test scenarios:
```typescript
describe('IRS Test Scenarios', () => {
  it('should match IRS Example 1 - Single filer, wage income only', async () => {
    // IRS Publication 17 Example 1
    const input = {
      wages: 50000,
      filingStatus: 'single',
      standardDeduction: true
    }

    const result = await runFullWorkflow(input)

    expect(result.agi).toBe(50000)
    expect(result.taxableIncome).toBe(36150)  // 50000 - 13850
    expect(result.totalTax).toBe(4146)  // Per IRS example
  })
})
```

---

**Status:** ✅ Node Specifications Complete
**Total Nodes Defined:** 18
**Implementation Ready:** Yes
**Next:** Implementation Roadmap
