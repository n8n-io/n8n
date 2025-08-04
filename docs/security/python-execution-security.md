# Python Execution Security Framework

## Overview

This document describes the comprehensive security framework implemented for n8n's local Python execution system. The framework provides multiple layers of security to ensure safe execution of user-provided Python code while maintaining full Python capabilities.

## Security Architecture

### Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│              Python Security Middleware                     │
├─────────────────────────────────────────────────────────────┤
│                Python Sandbox Service                       │
├─────────────────────────────────────────────────────────────┤
│                   Docker Container                          │
├─────────────────────────────────────────────────────────────┤
│                   Host Operating System                     │
└─────────────────────────────────────────────────────────────┘
```

### Security Components

1. **Python Security Middleware** - Request validation and rate limiting
2. **Python Sandbox Service** - Core security orchestration
3. **Docker Container** - Isolated execution environment  
4. **Resource Monitor Service** - System resource monitoring and alerting
5. **Security Configuration** - Centralized security policies

## Security Features

### 1. Docker-Based Sandboxing

#### Container Security
- **Non-root execution**: All Python code runs as user `1000:1000`
- **Read-only filesystem**: Container filesystem is mounted read-only
- **Capability dropping**: All Linux capabilities are dropped (`--cap-drop ALL`)
- **No new privileges**: Prevents privilege escalation (`--security-opt no-new-privileges:true`)
- **Resource limits**: CPU, memory, and execution time constraints
- **Network isolation**: Optional network access control

#### Resource Limits
```json
{
  "memory": "512MB",
  "cpu": "80%",
  "executionTime": "30 seconds",
  "concurrentExecutions": 5
}
```

### 2. Code Security Validation

#### Static Code Analysis
- **Dangerous import detection**: Blocks imports like `subprocess`, `os`, `socket`
- **Dynamic execution prevention**: Prohibits `eval()`, `exec()`, `__import__()`
- **File operation restrictions**: Controls file read/write operations
- **Code size limits**: Maximum 50,000 characters and 1,000 lines

#### Runtime Security
- **Built-in function overrides**: Replaces dangerous functions with security blocks
- **Module import filtering**: Whitelist/blacklist system for Python modules
- **Context sanitization**: Removes dangerous variables from execution context

### 3. Package Management Security

#### Allowed Packages (Whitelist)
```python
ALLOWED_PACKAGES = [
    # Data Science
    'numpy', 'pandas', 'scipy', 'scikit-learn', 'matplotlib',
    
    # Web & API
    'requests', 'httpx', 'aiohttp', 'fastapi', 'flask',
    
    # Data Processing  
    'beautifulsoup4', 'lxml', 'openpyxl', 'pillow',
    
    # Utilities
    'python-dateutil', 'pytz', 'jinja2', 'click',
    
    # Security (controlled)
    'cryptography', 'pyjwt', 'passlib', 'bcrypt'
]
```

#### Blocked Packages (Blacklist)
```python
BLOCKED_PACKAGES = [
    # System Access
    'subprocess32', 'psutil', 'py-cpuinfo',
    
    # Process Control
    'pexpect', 'fabric', 'paramiko',
    
    # Platform Specific
    'pywin32', 'wmi', 'win32api',
    
    # Serialization (security risk)
    'pickle', 'dill', 'marshal'
]
```

### 4. Network Security

#### Network Access Control
- **Configurable network access**: Can be enabled/disabled per execution
- **Domain whitelist/blacklist**: Control which domains can be accessed
- **Port restrictions**: Only allow specific ports (80, 443, 8080)
- **Connection limits**: Maximum concurrent network connections
- **Metadata service blocking**: Prevents access to cloud metadata endpoints

#### Protected Endpoints
```
Blocked by default:
- localhost / 127.0.0.1
- 169.254.169.254 (AWS metadata)
- metadata.google.internal (GCP metadata)
- Private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
```

### 5. File System Security

#### Access Control
- **Workspace isolation**: Each execution gets isolated `/workspace` directory
- **Read-only system**: System directories are read-only or blocked
- **Temporary storage**: Limited `/tmp` access with size restrictions
- **Path validation**: All file operations are validated against allowed paths

#### Restricted Paths
```
Blocked directories:
- /etc (system configuration) 
- /root (root user home)
- /home (user directories)
- /usr (system programs)
- /var (system data)
- /sys (system information)
- /proc (process information)
```

### 6. Resource Monitoring

#### System Metrics
- **CPU usage**: Per-core and overall utilization
- **Memory usage**: RAM and swap utilization
- **Disk usage**: Storage consumption and I/O
- **Network traffic**: Bytes and packet counters
- **Process information**: Running/sleeping/zombie processes

#### Container Metrics  
- **Per-container CPU**: Individual container CPU usage
- **Memory limits**: Container memory usage vs limits
- **Network I/O**: Container-specific network statistics
- **Block I/O**: Container disk read/write operations
- **Process count**: Number of processes in container

#### Alert Thresholds
```json
{
  "cpu": {
    "warning": 80,
    "critical": 95
  },
  "memory": {
    "warning": 85, 
    "critical": 95
  },
  "disk": {
    "warning": 90,
    "critical": 98
  }
}
```

### 7. Security Monitoring & Auditing

#### Audit Logging
Every Python execution is logged with:
- **Execution ID**: Unique identifier for traceability
- **User ID**: User who initiated the execution
- **Code hash**: SHA-256 hash of executed code (not full code for privacy)
- **Resource usage**: CPU, memory, and execution time
- **Security violations**: Any security rules that were triggered
- **Exit status**: Success/failure and error details

#### Security Events
- **Authentication failures**: Invalid or missing authentication
- **Authorization failures**: Insufficient permissions
- **Rate limit violations**: Too many requests
- **Code validation failures**: Dangerous patterns detected
- **Resource threshold breaches**: System resource alerts

#### Metrics Collection
```typescript
interface SecurityMetrics {
  totalExecutions: number;
  failedExecutions: number;
  securityViolations: number;
  averageExecutionTime: number;
  failureRate: number;
  lastSecurityEvent: Date;
}
```

## Configuration Profiles

### Development Profile
- **Execution time**: 60 seconds
- **Memory limit**: 1GB
- **Network access**: Enabled
- **Custom packages**: Allowed
- **Code validation**: Relaxed

### Production Profile  
- **Execution time**: 15 seconds
- **Memory limit**: 256MB
- **Network access**: Disabled
- **Custom packages**: Blocked
- **Code validation**: Strict

### Enterprise Profile
- **Execution time**: 120 seconds
- **Memory limit**: 2GB
- **Concurrent executions**: 20
- **Custom packages**: Allowed with approval
- **Advanced monitoring**: Enabled

## API Security

### Authentication & Authorization
```typescript
// Required headers
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}

// Required permissions
{
  "permissions": ["python:execute"],
  "role": "editor" | "admin"
}
```

### Rate Limiting
```
Anonymous users: 5 requests / 15 minutes
Regular users:   50 requests / 15 minutes  
Editor users:    200 requests / 15 minutes
Admin users:     500 requests / 15 minutes
```

### Request Validation
- **Code size**: Maximum 50KB
- **Context size**: Maximum 100KB  
- **Package count**: Maximum 50 packages
- **Timeout**: 1-120 seconds based on profile

## Security Best Practices

### For Administrators

1. **Regular Updates**
   - Keep Docker images updated with latest security patches
   - Update Python packages regularly
   - Monitor security advisories for dependencies

2. **Configuration Management**
   - Use appropriate security profile for environment
   - Regularly review allowed/blocked package lists
   - Monitor resource usage and adjust limits

3. **Monitoring & Alerting**
   - Set up alerts for security violations
   - Monitor resource usage trends
   - Review audit logs regularly

### For Developers

1. **Code Review**
   - Review Python code for security issues before execution
   - Avoid hardcoded secrets or credentials
   - Use parameterized inputs instead of string concatenation

2. **Error Handling**
   - Implement proper error handling in Python code
   - Don't expose sensitive information in error messages
   - Log errors appropriately for debugging

3. **Resource Usage**
   - Optimize code for memory and CPU efficiency
   - Avoid infinite loops or resource-intensive operations
   - Clean up resources (files, connections) after use

## Threat Model & Mitigations

### Identified Threats

1. **Code Injection Attacks**
   - **Threat**: Malicious code execution through user input
   - **Mitigation**: Static code analysis, input validation, sandboxing

2. **Resource Exhaustion**
   - **Threat**: DoS through excessive resource consumption
   - **Mitigation**: Resource limits, monitoring, rate limiting

3. **Information Disclosure**
   - **Threat**: Access to sensitive system information
   - **Mitigation**: File system restrictions, network controls

4. **Privilege Escalation**
   - **Threat**: Gaining elevated system privileges
   - **Mitigation**: Non-root execution, capability dropping

5. **Network Attacks**
   - **Threat**: Unauthorized network access or SSRF
   - **Mitigation**: Network isolation, domain filtering

### Security Controls Matrix

| Threat | Prevention | Detection | Response |
|--------|------------|-----------|----------|
| Code Injection | Static analysis, input validation | Pattern detection | Block execution |
| Resource Exhaustion | Resource limits | Monitoring alerts | Terminate process |
| Information Disclosure | Access controls | Audit logging | Revoke access |
| Privilege Escalation | Container security | Capability monitoring | Kill container |
| Network Attacks | Network isolation | Traffic analysis | Block connections |

## Compliance & Standards

### Security Standards
- **OWASP Top 10**: Protection against common web vulnerabilities
- **NIST Cybersecurity Framework**: Identify, Protect, Detect, Respond, Recover
- **ISO 27001**: Information security management system

### Privacy Protection
- **Code Privacy**: User code is not stored permanently
- **Data Minimization**: Only necessary data is logged
- **Audit Trail**: Comprehensive logging for compliance

### Regulatory Compliance
- **GDPR**: Personal data protection and privacy rights
- **SOC 2**: Security and availability controls
- **HIPAA**: Healthcare data protection (when applicable)

## Incident Response

### Security Incident Types
1. **Code Execution Violations**: Attempts to execute dangerous code
2. **Resource Abuse**: Excessive resource consumption
3. **Authentication Failures**: Repeated failed login attempts
4. **Data Exfiltration**: Unauthorized data access attempts

### Response Procedures
1. **Detection**: Automated alerts and monitoring
2. **Assessment**: Determine severity and impact
3. **Containment**: Block malicious activity
4. **Investigation**: Analyze logs and forensic data
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security controls

### Contact Information
- **Security Team**: security@n8n.io
- **Emergency Response**: +1-xxx-xxx-xxxx
- **Bug Bounty**: security-bounty@n8n.io

## Performance Impact

### Security Overhead
- **Code validation**: ~10-50ms per execution
- **Container startup**: ~500-2000ms first execution
- **Resource monitoring**: ~1-5% CPU overhead
- **Audit logging**: ~5-10ms per execution

### Optimization Strategies
- **Container caching**: Reuse containers when possible
- **Validation caching**: Cache validation results
- **Monitoring optimization**: Efficient metric collection
- **Log batching**: Batch audit log writes

## Troubleshooting

### Common Issues

1. **Execution Timeout**
   - **Cause**: Code takes too long to execute
   - **Solution**: Optimize code or increase timeout limit

2. **Memory Limit Exceeded**
   - **Cause**: Code uses too much memory
   - **Solution**: Optimize memory usage or increase limit

3. **Package Installation Failed**
   - **Cause**: Package not in whitelist or blocked
   - **Solution**: Add package to allowed list

4. **Network Access Denied**
   - **Cause**: Network access disabled or domain blocked
   - **Solution**: Enable network access or whitelist domain

### Debug Information
```bash
# Check Docker logs
docker logs <container_id>

# Check n8n logs
tail -f /var/log/n8n/python-execution.log

# Check resource usage
docker stats --no-stream

# Check security alerts
curl -H "Authorization: Bearer <token>" \
     http://localhost:5678/api/v1/python/security/metrics
```

## Future Enhancements

### Planned Features
1. **Advanced Static Analysis**: More sophisticated code analysis
2. **Machine Learning Detection**: ML-based threat detection
3. **Distributed Execution**: Multi-node Python execution
4. **Custom Sandboxes**: User-defined execution environments

### Security Roadmap
- Q1 2024: Enhanced monitoring and alerting
- Q2 2024: Advanced threat detection
- Q3 2024: Compliance automation
- Q4 2024: AI-powered security analysis

---

**Document Version**: 1.0.0  
**Last Updated**: August 2025  
**Review Cycle**: Quarterly  
**Owner**: n8n Security Team