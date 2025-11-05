# Pull Request: Add Support for AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE (EKS Pod Identity)

## Overview
This PR adds support for `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` in n8n's AWS credential handling, enabling native support for Amazon EKS Pod Identity authentication.

## Problem Statement
As described in issue #21581, n8n cannot authenticate with AWS services when deployed on Amazon EKS clusters using Pod Identity. The current implementation only checks for `AWS_CONTAINER_AUTHORIZATION_TOKEN` (direct token) but EKS Pod Identity uses `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` (file path) instead.

### How EKS Pod Identity Works
EKS automatically injects these environment variables into pods:
- `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`: Path to token file (e.g., `/var/run/secrets/pods.eks.amazonaws.com/serviceaccount/eks-pod-identity-token`)
- `AWS_CONTAINER_CREDENTIALS_FULL_URI`: Credentials endpoint URL (e.g., `http://169.254.170.23/v1/credentials`)

### AWS SDK Standard Behavior
Per the AWS SDK credential provider documentation, the container credentials provider checks **both**:
1. `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` (file path - takes precedence)
2. `AWS_CONTAINER_AUTHORIZATION_TOKEN` (direct token)

## Changes Made

### 1. Updated `system-credentials-utils.ts`
- Added `readFile` import from `fs/promises`
- Enhanced `getPodIdentityCredentials()` function to:
  - Check for `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` first
  - Read and trim the token from the file if it exists
  - Fall back to `AWS_CONTAINER_AUTHORIZATION_TOKEN` if file read fails
  - Maintain backward compatibility with existing ECS Task Role implementations

### 2. Added Comprehensive Test Coverage
Added 7 new test cases in `system-credentials-utils.test.ts`:

1. **File-based token support**: Verifies token is read from file when `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` is set
2. **Whitespace handling**: Ensures whitespace is trimmed from file-based tokens
3. **Fallback behavior**: Confirms fallback to direct token when file read fails
4. **Precedence order**: Validates file-based token takes priority over direct token
5. **Conditional file reading**: Ensures file is not read when env var is not set
6. **Backward compatibility**: Verifies existing direct token behavior still works
7. **No-token scenario**: Tests that credentials work without any authorization token

## Benefits

### ✅ Native EKS Pod Identity Support
- Works out of the box with EKS Pod Identity (AWS's recommended authentication method)
- No need for more complex IRSA (IAM Roles for Service Accounts) setup
- Eliminates need for hardcoded credentials

### ✅ Backward Compatibility
- Existing ECS Task Role implementations continue to work unchanged
- Falls back gracefully to direct token if file-based token is unavailable

### ✅ AWS SDK Alignment
- Follows the same credential provider chain behavior as official AWS SDKs
- File-based token takes precedence over direct token (matching AWS SDK standard)

### ✅ Better Security Posture
- Supports AWS's recommended authentication mechanism
- Enables principle of least privilege via Pod Identity
- Reduces attack surface by eliminating static credentials

## Testing Instructions

### Manual Testing (EKS Environment)
1. Deploy n8n to an EKS cluster
2. Create an IAM role with necessary permissions
3. Create an EKS Pod Identity association between the service account and IAM role
4. Deploy n8n pod (EKS will inject `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`)
5. Use any AWS node (S3, Lambda, DynamoDB, etc.) with "Use System Credentials"
6. Verify successful authentication and operation

### Automated Testing
```bash
# Run the specific test file
pnpm test credentials/common/aws/system-credentials-utils.test.ts

# Or run all tests
pnpm test
```

## Compatibility

### ✅ Works With
- **EKS Pod Identity** (file-based token) ← NEW
- **ECS Task Roles** (direct token)
- **IAM Roles for Service Accounts (IRSA)** (existing support)
- **EC2 Instance Profiles** (existing support)
- **Environment Variables** (existing support)

## Related Issues/PRs
- Fixes #21581 - AWS credentials missing support for AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE
- Related to #21568 - AWS Credential(s) does not respect default credential chain
- Builds upon #20626 - feat: AWS Assume role credentials

## Code Quality
- ✅ Follows existing code patterns and conventions
- ✅ Comprehensive test coverage (7 new test cases)
- ✅ Proper error handling with graceful fallbacks
- ✅ Well-documented with inline comments and JSDoc
- ✅ Backward compatible with existing implementations

## Performance Impact
- Minimal: Only reads file when `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` is set
- File read is async and properly error-handled
- No impact on existing credential provider chains

## Security Considerations
- ✅ File permissions are managed by EKS Pod Identity agent
- ✅ Token file is mounted read-only by Kubernetes
- ✅ Tokens are automatically rotated by AWS
- ✅ No additional attack surface introduced

## Documentation Updates Needed
Consider updating documentation to mention:
- EKS Pod Identity is now supported for AWS system credentials
- Setup instructions for EKS Pod Identity with n8n
- Credential provider chain order

---

## Verification Checklist
- [x] Code follows existing patterns and conventions
- [x] Comprehensive automated tests added
- [x] Backward compatibility maintained
- [x] Error handling properly implemented
- [x] Documentation comments updated
- [x] No breaking changes introduced
- [x] Aligns with AWS SDK standard behavior

