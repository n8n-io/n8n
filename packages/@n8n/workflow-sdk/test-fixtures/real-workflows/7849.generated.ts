return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.googleDriveTrigger', version: 1, config: { parameters: {
      event: 'fileCreated',
      options: {},
      pollTimes: { item: [{ mode: 'everyMinute' }] },
      triggerOn: 'specificFolder',
      folderToWatch: {
        __rl: true,
        mode: 'list',
        value: '1E8rvLEWKguorMT36yCD1jY78G0u8g6g7',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1E8rvLEWKguorMT36yCD1jY78G0u8g6g7',
        cachedResultName: 'test_data'
      }
    }, position: [944, 560] } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
      options: {},
      operation: 'download'
    }, position: [1152, 560], name: 'Download file' } }))
  .then(node({ type: '@vlm-run/n8n-nodes-vlmrun.vlmRun', version: 1, config: { parameters: { domain: 'healthcare.claims-processing' }, position: [1504, 560], name: 'VLM Run' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { parameters: {
      columns: {
        value: {
          'FORM TYPE': '={{ $json.response.form_type }}',
          'AMOUNT DUE': '={{ $json.response.balance_due }}',
          'AMOUNT PAID': '={{ $json.response.amount_paid }}',
          'INSURED DOB': '={{ $json.response.insured_dob }}',
          'INSURED SEX': '={{ $json.response.insured_sex }}',
          'PATIENT SEX': '={{ $json.response.patient_sex }}',
          'CARRIER NAME': '={{ $json.response.carrier_name }}',
          'FORM VERSION': '={{ $json.response.form_version }}',
          'INSURANCE ID': '={{ $json.response.insured_id_number }}',
          'INSURED NAME': '={{ $json.response.insured_name }}',
          'PATIENT NAME': '={{ $json.response.patient_name }}',
          'TOTAL CHARGE': '={{ $json.response.total_charge }}',
          'AUTO ACCIDENT': '={{ $json.response.auto_accident }}',
          'INSURANCE TYPE': '={{ $json.response.insurance_type }}',
          'MARTIAL STATUS': '={{ $json.response.marital_status }}',
          'OTHER ACCIDENT': '={{ $json.response.other_accident }}',
          'INSURED ADDRESS': '={{ $json.response.insured_address.street }}, {{ $json.response.insured_address.city }}, {{ $json.response.insured_address.state }}, {{ $json.response.insured_address.zip_code }}',
          'PATIENT ADDRESS': '={{ $json.response.patient_address.street }}, {{ $json.response.patient_address.city }}, {{ $json.response.patient_address.state }}, {{ $json.response.patient_address.zip_code }}',
          'INSURED EMPLOYER': '={{ $json.response.insured_employer }}',
          'INSURED PHONE NO': '={{ $json.response.insured_address.phone }}',
          'PATIENT PHONE NO': '={{ $json.response.patient_address.phone }}',
          'PROCESSING NOTES': '={{ $json.response.processing_notes }}',
          'EMPLOYMENT STATUS': '={{ $json.response.employment_status }}',
          'OTHER INSURED DOB': '={{ $json.response.other_insured_dob }}',
          'OTHER INSURED SEX': '={{ $json.response.other_insured_sex }}',
          'UNABLE TO WORK TO': '={{ $json.response.unable_to_work_to }}',
          'EMPLOYMENT RELATED': '={{ $json.response.employment_related }}',
          'FORM APPROVAL DATE': '={{ $json.response.form_approval_date }}',
          'HOSPITALIZATION TO': '={{ $json.response.hospitalization_to }}',
          'OTHER INSURED NAME': '={{ $json.response.other_insured_name }}',
          'PATIENT ACCOUNT NO': '={{ $json.response.patient_account_number }}',
          'PATIENT BIRTH DATE': '={{ $json.response.patient_birth_date }}',
          'UNABLE TO WORK FROM': '={{ $json.response.unable_to_work_from }}',
          'CURRENT ILLNESS DATE': '={{ $json.response.current_illness_date }}',
          'HOSPITALIZATION FROM': '={{ $json.response.hospitalization_from }}',
          'INSURED POLICY GROUP': '={{ $json.response.insured_policy_group }}',
          'PATIENT RELATIONSHIP': '={{ $json.response.patient_relationship }}',
          'SIMILLAR ILLNESS DATE': '={{ $json.response.similar_illness_date }}',
          'INSURED INSURANCE PLAN': '={{ $json.response.insured_insurance_plan }}',
          'OTHER INSURED EMPLOYER': '={{ $json.response.other_insured_employer }}',
          'REFERRING PHYSICIAN NAME': '={{ $json.response.referring_physician_name }}',
          'OTHER INSURED POLICY GROUP': '={{ $json.response.other_insured_policy_group }}',
          'OTHER INSURED INSURANCE PLAN': '={{ $json.response.other_insured_insurance_plan }}'
        },
        schema: [
          {
            id: 'FORM TYPE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'FORM TYPE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'FORM VERSION',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'FORM VERSION',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'FORM APPROVAL DATE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'FORM APPROVAL DATE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'CARRIER NAME',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'CARRIER NAME',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'PATIENT NAME',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'PATIENT NAME',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'PATIENT BIRTH DATE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'PATIENT BIRTH DATE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'PATIENT SEX',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'PATIENT SEX',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'PATIENT ADDRESS',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'PATIENT ADDRESS',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'PATIENT RELATIONSHIP',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'PATIENT RELATIONSHIP',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'PATIENT PHONE NO',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'PATIENT PHONE NO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'MARTIAL STATUS',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'MARTIAL STATUS',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'EMPLOYMENT STATUS',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'EMPLOYMENT STATUS',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'EMPLOYMENT RELATED',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'EMPLOYMENT RELATED',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'AUTO ACCIDENT',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'AUTO ACCIDENT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'OTHER ACCIDENT',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'OTHER ACCIDENT',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'CURRENT ILLNESS DATE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'CURRENT ILLNESS DATE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'SIMILLAR ILLNESS DATE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'SIMILLAR ILLNESS DATE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'UNABLE TO WORK FROM',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'UNABLE TO WORK FROM',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'UNABLE TO WORK TO',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'UNABLE TO WORK TO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'HOSPITALIZATION FROM',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'HOSPITALIZATION FROM',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'HOSPITALIZATION TO',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'HOSPITALIZATION TO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'PATIENT ACCOUNT NO',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'PATIENT ACCOUNT NO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'TOTAL CHARGE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'TOTAL CHARGE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'AMOUNT DUE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'AMOUNT DUE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'AMOUNT PAID',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'AMOUNT PAID',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'PROCESSING NOTES',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'PROCESSING NOTES',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURANCE TYPE',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURANCE TYPE',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURANCE ID',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURANCE ID',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURED NAME',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURED NAME',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURED ADDRESS',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURED ADDRESS',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURED PHONE NO',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURED PHONE NO',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURED POLICY GROUP',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURED POLICY GROUP',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURED DOB',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURED DOB',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURED SEX',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURED SEX',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURED EMPLOYER',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURED EMPLOYER',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'INSURED INSURANCE PLAN',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'INSURED INSURANCE PLAN',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'OTHER INSURED NAME',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'OTHER INSURED NAME',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'OTHER INSURED POLICY GROUP',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'OTHER INSURED POLICY GROUP',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'OTHER INSURED DOB',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'OTHER INSURED DOB',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'OTHER INSURED SEX',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'OTHER INSURED SEX',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'OTHER INSURED EMPLOYER',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'OTHER INSURED EMPLOYER',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'OTHER INSURED INSURANCE PLAN',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'OTHER INSURED INSURANCE PLAN',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'REFERRING PHYSICIAN NAME',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'REFERRING PHYSICIAN NAME',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1wZQDu7Hd0iV8dqiLbfUzAwUqKnn8J0ZQFO1weZ_ShxQ/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1wZQDu7Hd0iV8dqiLbfUzAwUqKnn8J0ZQFO1weZ_ShxQ',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1wZQDu7Hd0iV8dqiLbfUzAwUqKnn8J0ZQFO1weZ_ShxQ/edit?usp=drivesdk',
        cachedResultName: 'healthcare claim'
      }
    }, position: [1952, 560], name: 'Append row in sheet' } }))
  .add(sticky('# Health Care Claim Processing with VLM Run\n\nAutomatically extracts structured health care claim details from uploaded documents in Google Drive and saves them into a Google Sheet for tracking, compliance, or reporting.\n\n## Workflow\n\n1. 📂 Detect file upload in Google Drive\n2. ⬇️ Download the uploaded document\n3. 🤖 Convert document to structured text using VLM Run (`healthcare.claims-processing`)\n4. 📊 Append extracted order data to Google Sheet\n\n## Perfect for\n\n* Healthcare claim submission forms\n* Insurance reimbursement requests\n* Prior authorization documentation\n* Denial and appeal workflows\n* Automated payer compliance reporting\n\n\n## Requirements\n\n* VLM Run API access\n* Google Drive + Sheets OAuth2\n* n8n server with active workflow', { name: 'Sticky Note', color: 7, position: [448, 0], width: 416, height: 816 }))
  .add(sticky('# Append Row in Sheet\n\n**Function:** Appends extracted structured data into a Google Sheet.\n\n* Columns could be: Patient, DOB, Insurance ID, CPT/HCPCS Code, Diagnosis Code, Billed Amount, Modifiers, Provider, Date of Service, Payer Response\n\n\n**Benefit:** Provides a structured, continuously updated database for tracking orders', { name: 'Sticky Note2', color: 7, position: [1792, 0], width: 416, height: 816 }))
  .add(sticky('# VLM Run (Document)\n\n**Function:** Sends the health care claim file to VLM Run under the category `healthcare.claims-processing`.\n\n* Extracts structured details such as:\n\n  * Patient name, DOB, insurance ID\n  * Claim details (CPT/HCPCS, diagnosis codes, billed amount, modifiers)\n  * Provider details (name, NPI, signature/date of service)\n  * Payer response (approval, denial, adjustment codes)\n\n\n**Benefit:** Turns complex medical forms into machine-readable JSON', { name: 'Sticky Note3', position: [1344, 0], width: 416, height: 816 }))
  .add(sticky('# 📁 Input Processing\n\n**Monitors & downloads healthcare claim files from Google Drive.**\n\n**Process:**\n1. Watches designated Drive folder\n2. Auto-triggers on new uploads\n3. Downloads files for AI processing\n\n**Supported Formats:**\n- Images (JPG, PNG, WEBP)\n- PDF documents\n- Mobile camera uploads\n- Scanned receipts', { name: '📁 Input Processing Documentation', color: 7, position: [896, 0], width: 416, height: 824 }))