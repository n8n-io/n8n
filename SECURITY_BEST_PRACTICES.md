# n8n Security Best Practices Guide

This guide provides security best practices for deploying and operating n8n in production environments.

## Table of Contents

1. [Configuration Security](#configuration-security)
2. [Authentication & Authorization](#authentication--authorization)
3. [Network Security](#network-security)
4. [Workflow Security](#workflow-security)
5. [Database Security](#database-security)
6. [Credential Management](#credential-management)
7. [Monitoring & Auditing](#monitoring--auditing)
8. [Secure Development](#secure-development)

---

## Configuration Security

### Environment Variables

**DO:**
- ✅ Use strong, randomly generated secrets for `N8N_USER_MANAGEMENT_JWT_SECRET`
- ✅ Set `N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES=true` to prevent workflows from accessing n8n files
- ✅ Configure `N8N_RESTRICT_FILE_ACCESS_TO` to limit file system access
- ✅ Use environment-specific configuration files
- ✅ Store secrets in a secure secret management system (e.g., Vault, AWS Secrets Manager)

**DON'T:**
- ❌ Use default or weak secrets like "secret", "password", "123456"
- ❌ Commit secrets to version control
- ❌ Log sensitive configuration values
- ❌ Share secrets across environments (dev, staging, prod)

### Content Security Policy

Configure a strict CSP to prevent XSS attacks:

```bash
export N8N_CONTENT_SECURITY_POLICY='{
  "default-src": ["'\''self'\''"],
  "script-src": ["'\''self'\''"],
  "style-src": ["'\''self'\''", "'\''unsafe-inline'\''"],
  "img-src": ["'\''self'\''", "data:", "https:"],
  "font-src": ["'\''self'\''", "data:"],
  "connect-src": ["'\''self'\''"],
  "frame-ancestors": ["'\''none'\''"],
  "base-uri": ["'\''self'\''"],
  "form-action": ["'\''self'\''"]
}'
```

### File Access Restrictions

Limit file system access to specific directories:

```bash
# Restrict to data directory only
export N8N_RESTRICT_FILE_ACCESS_TO=/home/n8n/data

# Block access to n8n configuration files
export N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES=true
```

---

## Authentication & Authorization

### Password Policy

**Requirements:**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and special characters
- No common words or patterns
- Regular password rotation (90 days recommended)

### Multi-Factor Authentication

**Enable MFA for all users:**
- Particularly important for admin/owner accounts
- Use TOTP-based authenticators (Google Authenticator, Authy)
- Securely store recovery codes

### JWT Configuration

```bash
# Use a strong, random JWT secret (minimum 32 characters)
export N8N_USER_MANAGEMENT_JWT_SECRET='aB3$dF6!hJ9@kL0#mN2%pQ5^rS8&tU1*vW4...'

# Set appropriate token expiration
export N8N_USER_MANAGEMENT_JWT_ACCESS_TOKEN_EXPIRATION='15m'
export N8N_USER_MANAGEMENT_JWT_REFRESH_TOKEN_EXPIRATION='7d'
```

### SSO Configuration

When using SAML/OIDC:
- Validate all SAML assertions
- Verify issuer and audience
- Implement proper session timeout
- Enable account lockout after failed attempts

---

## Network Security

### HTTPS/TLS

**Always use HTTPS in production:**

```bash
# Enable secure cookies
export N8N_PROTOCOL=https
export N8N_SSL_KEY=/path/to/ssl/key.pem
export N8N_SSL_CERT=/path/to/ssl/cert.pem
```

**TLS Best Practices:**
- Use TLS 1.2 or higher
- Disable weak cipher suites
- Enable HSTS (HTTP Strict Transport Security)
- Use valid certificates from trusted CAs
- Implement certificate pinning for critical services

### Firewall Rules

**Configure firewall to:**
- Allow only necessary inbound ports (443 for HTTPS)
- Block direct database access from internet
- Restrict webhook endpoints to specific IPs when possible
- Use network segmentation for different components

### Reverse Proxy Configuration

Use Nginx/Apache as reverse proxy:

```nginx
# Nginx example
server {
    listen 443 ssl http2;
    server_name n8n.example.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /rest/login {
        limit_req zone=login burst=2 nodelay;
        proxy_pass http://localhost:5678;
    }
}
```

---

## Workflow Security

### Code Execution

**Sandboxing:**
- Keep `N8N_RUNNERS_INSECURE_MODE` disabled in production
- Use `NODE_FUNCTION_ALLOW_BUILTIN` to restrict built-in modules
- Use `NODE_FUNCTION_ALLOW_EXTERNAL` to restrict external packages

```bash
# Restrict to safe modules only
export NODE_FUNCTION_ALLOW_BUILTIN='fs,path,util'
export NODE_FUNCTION_ALLOW_EXTERNAL='lodash,moment'
```

### Input Validation

**In workflows:**
- Validate all user inputs
- Sanitize data before use in expressions
- Use schema validation for API responses
- Implement size limits on file uploads

### Credential Access

**Best Practices:**
- Use least privilege principle
- Limit credential sharing
- Regularly audit credential usage
- Rotate credentials regularly
- Monitor for unusual credential access patterns

---

## Database Security

### Connection Security

**PostgreSQL Example:**

```bash
export DB_TYPE=postgresdb
export DB_POSTGRESDB_HOST=localhost
export DB_POSTGRESDB_PORT=5432
export DB_POSTGRESDB_DATABASE=n8n
export DB_POSTGRESDB_USER=n8n_user
export DB_POSTGRESDB_PASSWORD='StrongDatabasePassword123!'

# Enable SSL for database connections
export DB_POSTGRESDB_SSL_ENABLED=true
export DB_POSTGRESDB_SSL_CA=/path/to/ca.pem
export DB_POSTGRESDB_SSL_CERT=/path/to/client-cert.pem
export DB_POSTGRESDB_SSL_KEY=/path/to/client-key.pem
```

### Database Hardening

**DO:**
- ✅ Use strong database passwords (minimum 16 characters)
- ✅ Enable encryption at rest
- ✅ Enable encryption in transit (SSL/TLS)
- ✅ Implement regular backups
- ✅ Test backup restoration regularly
- ✅ Use separate database credentials per environment
- ✅ Limit database user privileges to minimum required

**DON'T:**
- ❌ Use database root/admin accounts for application
- ❌ Store database credentials in code
- ❌ Allow database access from internet
- ❌ Use default database ports without firewall rules

### Backup Security

```bash
# Encrypt backups
pg_dump n8n | gpg --encrypt --recipient admin@example.com > backup.sql.gpg

# Store backups in secure location
# - Use encrypted storage
# - Implement access controls
# - Regular backup testing
# - Offsite backup storage
```

---

## Credential Management

### Encryption

**n8n encrypts credentials at rest:**
- Encryption key is auto-generated if not provided
- **CRITICAL:** Back up encryption key securely
- Store encryption key in HSM or secure vault in production

```bash
# Explicitly set encryption key (recommended for production)
export N8N_ENCRYPTION_KEY='your-secure-encryption-key-here'
```

### Key Rotation

**Implement key rotation process:**
1. Generate new encryption key
2. Re-encrypt all credentials with new key
3. Update `N8N_ENCRYPTION_KEY`
4. Securely destroy old key
5. Document rotation in audit log

### Credential Sharing

**Best Practices:**
- Limit credential sharing to minimum required
- Use workflow-level credentials when possible
- Implement approval workflow for credential access
- Regular access reviews
- Revoke access promptly when no longer needed

---

## Monitoring & Auditing

### Audit Logging

**Enable comprehensive logging:**

```bash
export N8N_LOG_LEVEL=info
export N8N_LOG_OUTPUT=file
export N8N_LOG_FILE_LOCATION=/var/log/n8n/
```

**Events to log:**
- Authentication attempts (success and failure)
- Credential access
- Workflow execution
- Configuration changes
- User management actions
- API requests

### Security Monitoring

**Set up alerts for:**
- Failed authentication attempts (>5 in 10 minutes)
- Unusual workflow execution patterns
- Credential access from new IPs
- Configuration changes
- Error rate spikes
- Database connection failures

### Log Analysis

**Use SIEM tools:**
- Aggregate logs from all n8n instances
- Correlate security events
- Detect anomalies
- Generate compliance reports

---

## Secure Development

### Code Review

**Security checklist for workflows:**
- [ ] Input validation implemented
- [ ] No hardcoded credentials
- [ ] Error handling doesn't expose sensitive data
- [ ] File operations restricted to safe paths
- [ ] External API calls validated
- [ ] Rate limiting considered
- [ ] Logging doesn't include sensitive data

### Testing

**Security testing:**
- Unit tests for input validation
- Integration tests for authentication
- Penetration testing for production deployment
- Dependency vulnerability scanning
- Static code analysis (SAST)
- Dynamic analysis (DAST)

### Dependency Management

```bash
# Regular dependency updates
pnpm update

# Check for vulnerabilities
pnpm audit

# Fix vulnerabilities
pnpm audit fix
```

### Security Headers

**Implement security headers:**

```javascript
// In your reverse proxy or application
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}
```

---

## Security Incident Response

### Incident Response Plan

**Preparation:**
1. Document incident response procedures
2. Identify incident response team
3. Establish communication channels
4. Prepare forensics tools

**Detection & Analysis:**
1. Monitor security alerts
2. Analyze suspicious activity
3. Determine incident severity
4. Document findings

**Containment:**
1. Isolate affected systems
2. Preserve evidence
3. Block malicious activity
4. Implement temporary fixes

**Eradication:**
1. Remove malware/threats
2. Patch vulnerabilities
3. Reset compromised credentials
4. Update security controls

**Recovery:**
1. Restore systems from backups
2. Verify system integrity
3. Monitor for re-infection
4. Return to normal operations

**Post-Incident:**
1. Document lessons learned
2. Update security procedures
3. Implement preventive measures
4. Conduct security training

---

## Compliance

### GDPR Compliance

**Data Protection:**
- Implement data minimization
- Enable data portability
- Implement right to be forgotten
- Maintain processing records
- Implement data breach notification

### SOC 2 Compliance

**Security Controls:**
- Access controls
- Encryption
- Change management
- Monitoring
- Incident response
- Regular audits

---

## Quick Security Checklist

### Pre-Production

- [ ] Strong JWT secret configured
- [ ] Database encryption enabled
- [ ] HTTPS/TLS configured
- [ ] File access restrictions set
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Backups configured and tested
- [ ] Firewall rules implemented
- [ ] Security monitoring set up

### Post-Deployment

- [ ] Regular security updates
- [ ] Credential rotation
- [ ] Access reviews
- [ ] Log analysis
- [ ] Vulnerability scanning
- [ ] Penetration testing
- [ ] Incident response drills
- [ ] Compliance audits

---

## Additional Resources

- [n8n Security Documentation](https://docs.n8n.io/hosting/securing/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Cloud Security Alliance](https://cloudsecurityalliance.org/)

---

**Document Version:** 1.0  
**Last Updated:** November 7, 2025  
**Next Review:** February 7, 2026
