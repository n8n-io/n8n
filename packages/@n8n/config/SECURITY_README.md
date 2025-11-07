# Security Features and Improvements

This directory contains security validation utilities and configuration defaults for n8n.

## Overview

The security validators and utilities provide comprehensive security configuration validation and input sanitization to help prevent common security vulnerabilities.

## Components

### 1. SecurityValidator

Located in `validators/security-validator.ts`

Validates security-critical configuration settings:

- **CSP Validation**: Ensures Content Security Policy is properly configured
- **File Access Validation**: Validates file access restrictions
- **JWT Secret Validation**: Ensures JWT secrets meet security requirements
- **Database Password Validation**: Validates database password strength
- **Rate Limiting Validation**: Ensures rate limiting is properly configured

**Usage:**

```typescript
import { SecurityValidator } from '@n8n/config/validators';

// Validate CSP
const cspResult = SecurityValidator.validateCSP(
  JSON.stringify({ 'default-src': ["'self'"] }),
  false
);

// Validate all security settings
const result = SecurityValidator.validateAllSecuritySettings({
  csp: '{"default-src": ["\'self\'"]}',
  jwtSecret: 'your-strong-secret-here',
  dbPassword: 'StrongDatabasePassword123!',
  dbType: 'postgresdb',
  rateLimitEnabled: true,
});

// Enforce (throws error if validation fails)
SecurityValidator.enforceSecuritySettings(result);

// Log warnings
SecurityValidator.logSecurityWarnings(result);
```

### 2. InputValidator

Located in `validators/input-validator.ts`

Provides comprehensive input validation and sanitization:

- **Email Validation**: RFC-compliant email validation
- **File Path Sanitization**: Prevents path traversal attacks
- **URL Validation**: Prevents SSRF attacks by blocking private IPs
- **SQL Identifier Sanitization**: Prevents SQL injection in identifiers
- **HTML Sanitization**: Prevents XSS attacks
- **Number/String/Array/Object Validation**: Type-safe input validation
- **Password Strength Validation**: Ensures strong passwords
- **JWT Format Validation**: Validates JWT token structure

**Usage:**

```typescript
import { InputValidator } from '@n8n/config/validators';

// Validate email
const isValid = InputValidator.validateEmail('user@example.com');

// Sanitize file path (prevents path traversal)
const safePath = InputValidator.sanitizeFilePath(
  '/home/user/data/file.txt',
  ['/home/user/data']
);

// Validate URL (prevents SSRF)
InputValidator.validateUrl('https://api.example.com/data', {
  allowedProtocols: ['https'],
  blockPrivateIPs: true,
  blockLocalhost: true,
});

// Sanitize HTML (prevents XSS)
const safeHtml = InputValidator.sanitizeHTML('<p>Hello</p>');

// Validate password strength
InputValidator.validatePasswordStrength('MyStrongP@ssw0rd!', {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
});

// Validate complex objects
const validatedData = InputValidator.validateObject(userInput, {
  name: (val) => InputValidator.validateString(val as string, { maxLength: 100 }),
  email: (val) => {
    if (InputValidator.validateEmail(val as string)) return val;
    throw new Error('Invalid email');
  },
  age: (val) => InputValidator.validateNumber(val, { min: 18, max: 120 }),
});
```

### 3. Secure Defaults

Located in `secure-defaults.ts`

Provides secure default configurations for production deployments:

- **CSP Defaults**: Strict Content Security Policy
- **Security Headers**: Recommended security headers
- **Rate Limiting**: Default rate limit configurations
- **Session Configuration**: Secure session settings
- **Password Policy**: Strong password requirements
- **File Access**: Secure file access restrictions
- **Workflow Execution**: Safe execution limits
- **Database Security**: Secure database configuration
- **Logging**: Security-focused logging configuration

**Usage:**

```typescript
import { SECURE_DEFAULTS, getSecureDefaults } from '@n8n/config/secure-defaults';

// Get all secure defaults
const allDefaults = getSecureDefaults();

// Get specific category
const cspDefaults = getSecureDefaults('csp');
const rateLimitDefaults = getSecureDefaults('rateLimit');

// Use in configuration
const cspHeader = JSON.stringify(SECURE_DEFAULTS.csp);
```

## Testing

All validators include comprehensive test coverage:

```bash
# Run security validator tests
pnpm test --filter=@n8n/config -- validators/__tests__/security-validator.test.ts

# Run all config package tests
pnpm test --filter=@n8n/config
```

## Security Best Practices

For comprehensive security guidance, see:

- [SECURITY_BEST_PRACTICES.md](../../../SECURITY_BEST_PRACTICES.md) - Deployment security guide
- [SECURITY_ANALYSIS.md](../../../SECURITY_ANALYSIS.md) - Security analysis and findings
- [SECURITY.md](../../../SECURITY.md) - Security policy and vulnerability reporting

## Integration

### In Application Startup

```typescript
import { SecurityValidator } from '@n8n/config/validators';
import { SECURE_DEFAULTS } from '@n8n/config/secure-defaults';

// Validate configuration on startup
const validationResult = SecurityValidator.validateAllSecuritySettings({
  csp: process.env.N8N_CONTENT_SECURITY_POLICY,
  jwtSecret: process.env.N8N_USER_MANAGEMENT_JWT_SECRET,
  // ... other settings
});

// Log warnings
SecurityValidator.logSecurityWarnings(validationResult);

// Enforce critical settings (throws if validation fails)
SecurityValidator.enforceSecuritySettings(validationResult);
```

### In API Controllers

```typescript
import { InputValidator } from '@n8n/config/validators';

class UserController {
  async createUser(req: Request, res: Response) {
    // Validate input
    const validatedData = InputValidator.validateObject(req.body, {
      email: (val) => {
        if (!InputValidator.validateEmail(val as string)) {
          throw new Error('Invalid email');
        }
        return val as string;
      },
      password: (val) => {
        InputValidator.validatePasswordStrength(val as string);
        return val as string;
      },
      name: (val) => InputValidator.validateString(val as string, { 
        minLength: 1, 
        maxLength: 100 
      }),
    });

    // Use validated data
    await this.userService.create(validatedData);
  }
}
```

### In File Operations

```typescript
import { InputValidator } from '@n8n/config/validators';

function readUserFile(filename: string) {
  // Sanitize file path to prevent path traversal
  const safePath = InputValidator.sanitizeFilePath(
    filename,
    ['/home/n8n/data'] // allowed base paths
  );

  return fs.readFileSync(safePath);
}
```

## Contributing

When adding new validators:

1. Add the validator function to the appropriate file
2. Add comprehensive tests
3. Update this README with usage examples
4. Update TypeScript types/interfaces
5. Run tests to ensure everything passes

## Version History

- **v1.0.0** (November 2025)
  - Initial security validators
  - SecurityValidator with CSP, JWT, database, rate limiting validation
  - InputValidator with comprehensive input sanitization
  - Secure defaults configuration
  - Full test coverage

## License

See the main project [LICENSE](../../../LICENSE.md).
