# Security Policy

## Reporting a Vulnerability

If you discover a (suspected) security vulnerability, please report it through our [Vulnerability Disclosure Program](https://n8n.notion.site/n8n-vulnerability-disclosure-program).

### What to Include in Your Report

Please include the following information in your vulnerability report:

- **Description**: Detailed description of the vulnerability
- **Impact**: Potential impact and severity assessment
- **Reproduction Steps**: Clear steps to reproduce the vulnerability
- **Affected Versions**: Which versions are affected
- **Proof of Concept**: Code or screenshots demonstrating the issue
- **Suggested Fix**: If you have recommendations for fixing the issue

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Investigation**: We will investigate and validate the reported vulnerability
- **Updates**: We will provide regular updates on the progress
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Disclosure**: We follow coordinated disclosure practices

### Security Best Practices

For deployment and operational security best practices, see:
- [SECURITY_BEST_PRACTICES.md](./SECURITY_BEST_PRACTICES.md) - Comprehensive security guide
- [SECURITY_ANALYSIS.md](./SECURITY_ANALYSIS.md) - Security analysis and recommendations

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

Please upgrade to the latest version to ensure you have the latest security fixes.

## Security Features

n8n includes several security features:

- **Credential Encryption**: All credentials are encrypted at rest
- **Input Validation**: Comprehensive input validation to prevent injection attacks
- **XSS Protection**: Content Security Policy and input sanitization
- **Rate Limiting**: Protection against brute force attacks
- **Audit Logging**: Comprehensive logging of security-relevant events
- **File Access Controls**: Restrictions on file system access
- **Sandbox Execution**: Isolated execution environment for workflows

## Security Contacts

- **Security Team**: security@n8n.io
- **Vulnerability Disclosure Program**: https://n8n.notion.site/n8n-vulnerability-disclosure-program

## Security Updates

Subscribe to security updates:
- **GitHub Security Advisories**: Watch this repository
- **Release Notes**: Check CHANGELOG.md for security fixes
- **Security Mailing List**: Contact security@n8n.io to subscribe

## Known Security Considerations

### Self-Hosted Deployments

When self-hosting n8n, please ensure:

1. **HTTPS**: Always use HTTPS in production
2. **Strong Secrets**: Use strong, randomly generated secrets
3. **Database Security**: Secure your database with strong passwords and encryption
4. **Network Security**: Use firewalls and network segmentation
5. **Regular Updates**: Keep n8n and dependencies up to date
6. **Backup Security**: Encrypt and secure your backups
7. **Access Control**: Implement proper user access controls
8. **Monitoring**: Monitor for security events and anomalies

See [SECURITY_BEST_PRACTICES.md](./SECURITY_BEST_PRACTICES.md) for detailed guidance.

### Workflow Security

When creating workflows:

1. **Input Validation**: Always validate external inputs
2. **Credential Management**: Use credential system, never hardcode secrets
3. **Error Handling**: Don't expose sensitive information in error messages
4. **Code Execution**: Be cautious with Code nodes and expressions
5. **External APIs**: Validate responses from external APIs
6. **File Operations**: Restrict file access to necessary directories only

## Compliance

n8n supports various compliance requirements:

- **GDPR**: Data protection and privacy features
- **SOC 2**: Security controls and audit logging
- **HIPAA**: Available with enterprise license

Contact our sales team for enterprise compliance features.

## Security Audit History

- **2025**: Comprehensive security analysis (see SECURITY_ANALYSIS.md)
- Regular dependency updates via automated tools
- Continuous security monitoring

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated**: November 7, 2025
