# SECURITY Mode Instructions

You are in SECURITY mode, focused on comprehensive security analysis, vulnerability assessment, and defensive security implementation with compliance frameworks.

*Note: All core quality standards, subagent requirements, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds security-specific assessment and remediation frameworks only.*

## Security Assessment Framework

### 1. Threat Classification Matrix

#### Critical Security Issues (P0 - Immediate Action Required)
```
Impact: Data breach, system compromise, regulatory violation
Examples:
├── SQL injection vulnerabilities
├── Remote code execution (RCE) flaws
├── Authentication bypass vulnerabilities
├── Hardcoded secrets in code/config
├── Privilege escalation vulnerabilities
└── Data exposure through logs/errors

Response Time: < 2 hours
Escalation: Block all deployments, notify security team
```

#### High Security Issues (P1 - 24 Hour Response)
```
Impact: Potential data exposure, service disruption
Examples:
├── Cross-site scripting (XSS) vulnerabilities
├── Cross-site request forgery (CSRF) flaws
├── Insecure direct object references
├── Security misconfiguration
├── Broken access control
└── Insecure cryptographic storage

Response Time: < 24 hours
Escalation: Security review required before deployment
```

#### Medium Security Issues (P2 - 72 Hour Response)
```
Impact: Security weakness, potential attack vector
Examples:
├── Information disclosure
├── Insecure session management
├── Insufficient input validation
├── Missing security headers
├── Weak password policies
└── Unencrypted data transmission

Response Time: < 72 hours
Escalation: Include in next security sprint
```

### 2. Security Scanning Workflows

#### Automated Security Scanning Pipeline
```bash
# Static Application Security Testing (SAST)
npm audit --audit-level high                    # Node.js vulnerabilities
bandit -r . -f json                             # Python security issues
gosec ./...                                     # Go security scanner
semgrep --config=auto                           # Multi-language security patterns

# Dynamic Application Security Testing (DAST)
zap-baseline.py -t http://localhost:3000        # OWASP ZAP baseline scan
sqlmap -u "http://localhost/api/users?id=1"     # SQL injection testing

# Container Security Scanning
docker scout cves                               # Docker vulnerability scan
trivy image myapp:latest                        # Container image scanning

# Infrastructure as Code Security
checkov -d ./terraform                          # Terraform security scan
kube-score score *.yaml                         # Kubernetes security assessment
```

#### Manual Security Assessment Checklist
- [ ] **Authentication Security**: Multi-factor authentication, password policies, session management
- [ ] **Authorization Controls**: Role-based access control (RBAC), principle of least privilege
- [ ] **Input Validation**: SQL injection, XSS, command injection prevention
- [ ] **Data Protection**: Encryption at rest and in transit, PII handling
- [ ] **API Security**: Rate limiting, input validation, secure endpoints
- [ ] **Infrastructure Security**: Network segmentation, firewall rules, secure configurations

### 3. Compliance Framework Integration

#### SOC 2 Type II Compliance
```
Control Areas:
├── Security: Access controls, vulnerability management, incident response
├── Availability: System monitoring, backup procedures, disaster recovery
├── Processing Integrity: Data validation, error handling, transaction controls
├── Confidentiality: Data classification, encryption, access restrictions
└── Privacy: Data collection, retention, disposal policies

Assessment Requirements:
- Quarterly security assessments
- Annual penetration testing
- Continuous compliance monitoring
- Audit trail maintenance
```

#### GDPR Compliance Framework
```
Privacy by Design Requirements:
├── Data minimization and purpose limitation
├── Consent management and withdrawal mechanisms
├── Right to access and data portability
├── Right to rectification and erasure
├── Data breach notification procedures
└── Privacy impact assessments (PIAs)

Technical Safeguards:
- Pseudonymization and anonymization
- Encryption of personal data
- Access logging and monitoring
- Secure data transfer protocols
```

#### PCI DSS Compliance (Payment Processing)
```
Core Requirements:
├── Build and maintain secure networks and systems
├── Protect cardholder data with strong cryptography
├── Maintain vulnerability management programs
├── Implement strong access control measures
├── Regularly monitor and test networks
└── Maintain information security policies

Security Controls:
- Network segmentation for cardholder data environment
- Strong cryptography for data transmission and storage
- Regular security testing and vulnerability assessments
- Secure coding practices and code reviews
```

## Security Implementation Patterns

### 1. Secure Authentication Implementation

#### Multi-Factor Authentication (MFA)
```javascript
// Secure MFA implementation pattern
const authenticationFlow = {
  primaryFactor: {
    method: 'password',
    requirements: ['min8chars', 'complexity', 'notCompromised'],
    rateLimit: '5 attempts per 15 minutes'
  },
  secondaryFactor: {
    methods: ['TOTP', 'SMS', 'push_notification'],
    backupCodes: 'encrypted_storage',
    deviceTrust: 'remember_for_30_days'
  },
  sessionManagement: {
    tokenType: 'JWT',
    expiration: '15 minutes',
    refreshToken: '7 days',
    secureStorage: 'httpOnly_sameSite_secure'
  }
};
```

#### OAuth 2.0 / OpenID Connect Security
- **Authorization Code Flow with PKCE**: Prevent authorization code interception
- **State Parameter**: CSRF protection for authorization requests
- **Nonce Parameter**: Replay attack prevention for ID tokens
- **Secure Token Storage**: HttpOnly cookies or secure storage APIs
- **Token Validation**: Signature verification, expiration, audience claims

### 2. Input Validation and Sanitization

#### Comprehensive Input Validation Framework
```python
# Secure input validation pattern
class SecurityValidator:
    def validate_sql_input(self, input_data):
        # Parameterized queries only - no string concatenation
        if self.contains_sql_patterns(input_data):
            raise SecurityException("Potential SQL injection detected")
        return self.sanitize_sql_input(input_data)
    
    def validate_xss_input(self, input_data):
        # HTML encoding and CSP headers
        sanitized = html.escape(input_data)
        if self.contains_script_patterns(sanitized):
            raise SecurityException("Potential XSS attack detected")
        return sanitized
    
    def validate_file_upload(self, file_data):
        # File type validation, size limits, virus scanning
        allowed_types = ['image/jpeg', 'image/png', 'application/pdf']
        if file_data.content_type not in allowed_types:
            raise SecurityException("File type not allowed")
        return self.scan_for_malware(file_data)
```

#### API Security Implementation
- **Rate Limiting**: Per-user and per-endpoint throttling
- **Request Size Limits**: Prevent DoS attacks through large payloads
- **CORS Configuration**: Restrict cross-origin requests appropriately
- **Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- **API Versioning**: Secure deprecation of older, vulnerable endpoints

### 3. Data Protection and Encryption

#### Encryption Standards Implementation
```go
// Secure encryption implementation
type SecurityEncryption struct {
    keyManagement *KeyManager
}

func (s *SecurityEncryption) EncryptSensitiveData(data []byte) ([]byte, error) {
    // Use AES-256-GCM for authenticated encryption
    key := s.keyManagement.GetCurrentKey()
    cipher, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    
    gcm, err := cipher.NewGCM()
    if err != nil {
        return nil, err
    }
    
    nonce := make([]byte, gcm.NonceSize())
    rand.Read(nonce)
    
    encrypted := gcm.Seal(nonce, nonce, data, nil)
    return encrypted, nil
}

func (s *SecurityEncryption) SecureKeyRotation() {
    // Automated key rotation every 90 days
    newKey := s.keyManagement.GenerateKey()
    s.keyManagement.RotateKey(newKey)
    s.reEncryptDataWithNewKey()
}
```

#### Database Security Configuration
- **Connection Encryption**: TLS 1.3 for all database connections
- **Access Controls**: Database-level user permissions and role separation
- **Query Parameterization**: Prepared statements for all dynamic queries
- **Audit Logging**: All data access and modification operations logged
- **Data Masking**: PII obfuscation in non-production environments

## Security Testing Strategies

### 1. Penetration Testing Framework

#### Internal Security Testing
```bash
# Automated penetration testing workflow
#!/bin/bash

# Network reconnaissance
nmap -sS -O target_host
nmap --script vuln target_host

# Web application testing
nikto -h http://target_host
dirb http://target_host /usr/share/dirb/wordlists/common.txt

# SSL/TLS testing
sslscan target_host:443
testssl.sh target_host

# API security testing
zap-api-scan.py -t http://target_host/openapi.json
```

#### Security Code Review Checklist
- [ ] **Authentication Bypass**: Check for logic flaws in auth mechanisms
- [ ] **Authorization Flaws**: Verify proper access control enforcement
- [ ] **Input Validation**: Review all user input handling and sanitization
- [ ] **Cryptographic Implementation**: Assess encryption usage and key management
- [ ] **Session Management**: Evaluate session handling and timeout policies
- [ ] **Error Handling**: Ensure no sensitive information in error messages

### 2. Vulnerability Management Workflow

#### Vulnerability Assessment Process
```
1. DISCOVERY: Automated scanning and manual testing
   ├── Static code analysis (SAST)
   ├── Dynamic application testing (DAST)
   ├── Infrastructure scanning
   └── Third-party dependency analysis

2. ANALYSIS: Risk assessment and impact evaluation
   ├── CVSS scoring and risk prioritization
   ├── Exploitability assessment
   ├── Business impact analysis
   └── Compliance impact evaluation

3. REMEDIATION: Fix implementation and validation
   ├── Security patch development
   ├── Configuration changes
   ├── Compensating controls
   └── Fix verification testing

4. MONITORING: Ongoing security posture assessment
   ├── Continuous vulnerability scanning
   ├── Security metrics tracking
   ├── Incident response readiness
   └── Compliance reporting
```

#### Security Metrics and KPIs
- **Mean Time to Detection (MTTD)**: Average time to identify security incidents
- **Mean Time to Response (MTTR)**: Average time to respond to security incidents
- **Vulnerability Remediation Time**: Time from discovery to fix deployment
- **Security Test Coverage**: Percentage of codebase covered by security tests
- **False Positive Rate**: Accuracy of automated security scanning tools

## Incident Response Framework

### 1. Security Incident Classification

#### Incident Severity Levels
```
CRITICAL (P0): Active attack, data breach, system compromise
├── Response Time: Immediate (< 15 minutes)
├── Escalation: CISO, legal team, executive leadership
├── Actions: Isolate systems, preserve evidence, activate crisis team
└── Communication: Customer notification, regulatory reporting

HIGH (P1): Potential breach, significant vulnerability exploitation
├── Response Time: < 1 hour
├── Escalation: Security team lead, engineering management
├── Actions: Contain threat, assess impact, implement fixes
└── Communication: Internal stakeholders, affected users

MEDIUM (P2): Security policy violation, suspicious activity
├── Response Time: < 4 hours
├── Escalation: Security analyst, development team
├── Actions: Investigate, document, implement preventive measures
└── Communication: Security team, relevant development teams

LOW (P3): Security awareness, policy updates, training needs
├── Response Time: < 24 hours
├── Escalation: Security awareness team
├── Actions: Update policies, schedule training, monitor trends
└── Communication: All staff, security awareness communications
```

### 2. Incident Response Procedures

#### Immediate Response Checklist
- [ ] **Identify and Contain**: Isolate affected systems to prevent spread
- [ ] **Assess Impact**: Determine scope and severity of the incident
- [ ] **Preserve Evidence**: Maintain forensic integrity for investigation
- [ ] **Communicate**: Notify appropriate stakeholders and authorities
- [ ] **Document**: Record all actions taken during incident response
- [ ] **Recover**: Restore systems to secure operational state

#### Post-Incident Activities
- [ ] **Root Cause Analysis**: Detailed investigation of incident origins
- [ ] **Lessons Learned**: Document findings and improvement opportunities
- [ ] **Policy Updates**: Revise security policies based on incident learnings
- [ ] **Training Updates**: Enhance security awareness based on incidents
- [ ] **Process Improvements**: Update incident response procedures

## Security Quality Gates

### Pre-Deployment Security Validation
- [ ] **SAST Results**: No high/critical static analysis findings
- [ ] **Dependency Check**: No known vulnerable dependencies
- [ ] **Security Headers**: All required security headers implemented
- [ ] **Authentication Testing**: Auth mechanisms function correctly
- [ ] **Authorization Testing**: Access controls properly enforced
- [ ] **Input Validation**: All user inputs properly validated and sanitized

### Production Security Monitoring
- [ ] **Intrusion Detection**: Real-time monitoring for attack patterns
- [ ] **Anomaly Detection**: Unusual behavior pattern identification
- [ ] **Access Monitoring**: Privileged account usage tracking
- [ ] **Data Loss Prevention**: Sensitive data movement monitoring
- [ ] **Compliance Monitoring**: Ongoing regulatory requirement validation

## Mode-Specific Focus

This mode supplements CLAUDE.md with security-specific threat assessment frameworks, vulnerability management workflows, compliance integration patterns, and incident response procedures for comprehensive defensive security implementation.