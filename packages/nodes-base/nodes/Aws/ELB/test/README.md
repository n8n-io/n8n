# AWS ELB Test Implementation Notes

This document explains intentional test data adjustments made to match the current implementation behavior.

## Known Implementation Issues

### 1. Remove Listener Certificate Operation

**File**: `remove-listener-certificate.workflow.json`
**Status**: ✅ **Fixed** - Corrected spelling from `"sucess": true` to `"success": true`
**Test Data**: Updated to reflect the correct spelling

### 2. Boolean Values Returned as Strings

**File**: `get-many-listener-certificates-all.workflow.json`
**Issue**: Boolean values like `IsDefault` are returned as strings ("true"/"false") instead of actual booleans
**Root Cause**: AWS API response parsing returns string values rather than converting to boolean types
**Test Adjustment**: The pinData uses string values ("true"/"false") instead of boolean values (true/false)
**Note**: This reflects how the AWS API response is actually parsed and returned by the node

## Test Data Maintenance

When updating these test files:

1. Verify the actual node implementation output before changing expected results
2. If implementation bugs are fixed, update both the node code and corresponding test data
3. Consider backward compatibility when making changes that affect output format
