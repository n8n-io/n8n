# Airtable Field IDs Feature Documentation

## Overview

The Airtable node now supports using field IDs instead of field names for create and update operations, and can return field data using field IDs in get and search operations. This makes workflows more resilient to field name changes in your Airtable bases.

## Features

### 1. Use Field IDs (Create/Update Operations)

When creating or updating records, you can now use field IDs instead of field names by enabling the "Use Field IDs" option.

#### Benefits:
- **Resilient to field name changes**: If someone renames a field in Airtable, your workflow won't break
- **Handle special characters**: Field names with special characters (/, @, $, etc.) work reliably
- **Consistent API usage**: Aligns with Airtable's API which uses field IDs internally

#### How to use:
1. In the Create or Update node, expand the "Options" section
2. Enable "Use Field IDs" toggle
3. The node will automatically map your field names to field IDs when executing

**Note**: In the UI, you'll still see and work with field names for ease of use. The conversion to field IDs happens automatically during execution.

#### Example:
```json
// What you configure (with field names):
{
  "Name": "John Doe",
  "Email": "john@example.com",
  "Status": "Active"
}

// What gets sent to Airtable API (with field IDs):
{
  "fld1234abc": "John Doe",
  "fld5678def": "john@example.com",
  "fld9012ghi": "Active"
}
```

### 2. Return Fields By Field ID (Get/Search Operations)

When retrieving records, you can request that Airtable returns the data with field IDs as keys instead of field names.

#### Benefits:
- **Consistent field references**: Field IDs never change, unlike field names
- **Easier field mapping**: When processing returned data, you can rely on stable field IDs

#### How to use:
1. In the Get or Search node, expand the "Options" section
2. Enable "Return Fields By Field ID" toggle
3. The response will use field IDs as keys instead of field names

#### Example:
```json
// Normal response (field names):
{
  "id": "recXXX",
  "Name": "John Doe",
  "Email": "john@example.com"
}

// Response with field IDs:
{
  "id": "recXXX",
  "fld1234abc": "John Doe",
  "fld5678def": "john@example.com"
}
```

## Important Notes

1. **Field Mapping**: The node fetches field mappings once per execution for efficiency. All items in a batch will use the same field mapping.

2. **Backwards Compatibility**: If you don't enable these options, the node works exactly as before using field names.

3. **Mixed Fields**: If a field name cannot be mapped to an ID (e.g., a new field added after the workflow was created), the node will use the field name as-is.

4. **Error Handling**: If the node cannot fetch field mappings (e.g., due to permissions issues), it will show a clear error message.

## Use Cases

### Scenario 1: Handling Field Renames
Your workflow creates records with a field called "Customer Email". If someone renames it to "Email Address" in Airtable, a workflow using field IDs will continue to work without modification.

### Scenario 2: Special Characters
You have fields with names like "Cost ($)" or "Status / Progress". Using field IDs avoids any issues with special character handling.

### Scenario 3: Consistent Data Processing
When building complex workflows that process Airtable data through multiple steps, using field IDs ensures consistent field references throughout the workflow.

## Migration Guide

To migrate existing workflows to use field IDs:

1. Edit your Airtable Create/Update nodes
2. Enable "Use Field IDs" in the options
3. Test the workflow with sample data
4. No changes needed to field mappings - they'll work as before

## Troubleshooting

### "Failed to fetch field mappings from Airtable"
- Check that your API credentials have access to the base schema
- Verify the base and table IDs are correct
- Ensure you have permission to read the table structure

### Fields not being mapped to IDs
- Some fields might be new and not in the cached mapping
- Try refreshing the node or re-executing the workflow
- Check if the field name exactly matches (including spaces and special characters)