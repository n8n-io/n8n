# Pyodide to Local Python Migration Guide

This comprehensive guide covers migrating Python workflows from Pyodide (browser-based) execution to local Python execution in n8n.

## Overview

The migration from Pyodide to local Python execution provides significant benefits:

- **5-10x performance improvement** over browser-based execution
- **Full Python ecosystem access** including C extensions
- **Better resource utilization** and memory management
- **Enhanced security** with proper sandboxing
- **Improved debugging capabilities** with native Python tools

## Prerequisites

### System Requirements

- **Python 3.8+** installed on the system
- **Virtual environment support** (`python -m venv`)
- **Package installer** (`pip`)
- **n8n CLI tools** with migration commands

### Verification Commands

```bash
# Check Python availability
python3 --version

# Verify pip installation
pip3 --version

# Test virtual environment creation
python3 -m venv test-venv && rm -rf test-venv

# Check n8n migration tools
npx n8n migrate-python --help
```

## Migration Process

### Phase 1: Analysis and Planning

#### 1.1 Workflow Discovery

Use the analysis tool to identify Python workflows requiring migration:

```bash
# Analyze all workflows in a directory
npx n8n migrate-python --workflows ./workflows --analyze-only

# Analyze a single workflow
npx n8n migrate-python --single-workflow ./my-workflow.json --analyze-only
```

The analysis report includes:
- **Compatibility assessment** (0-100% score)
- **Complexity breakdown** (simple/moderate/complex/critical)
- **Required packages** and dependencies
- **Potential issues** and manual review requirements
- **Estimated migration time** per workflow

#### 1.2 Understanding Compatibility Issues

Common compatibility issues and their solutions:

| Issue | Description | Solution | Auto-fixable |
|-------|-------------|----------|--------------|
| **JavaScript Interop** | `js.*` calls from Pyodide | Replace with Python alternatives | No |
| **Pyodide API Calls** | `pyodide.*` function calls | Remove or replace with local equivalents | Yes |
| **Async Patterns** | Unnecessary `async`/`await` | Remove for synchronous operations | Yes |
| **Security Issues** | `os.system()`, `eval()` calls | Manual security review required | No |
| **Package Conflicts** | Browser vs. system package differences | Update package names/versions | Partial |

#### 1.3 Risk Assessment

**Low Risk Workflows:**
- Simple calculations and data processing
- Standard library usage only
- No external integrations

**Medium Risk Workflows:**
- Third-party package usage
- File system operations
- Network requests

**High Risk Workflows:**
- JavaScript interoperability
- System-level operations
- Custom security restrictions

### Phase 2: Migration Execution

#### 2.1 Backup Strategy

Always create backups before migration:

```bash
# Automatic backup during migration
npx n8n migrate-python --workflows ./workflows --backup

# Manual backup
cp -r ./workflows ./workflows-backup-$(date +%Y%m%d)
```

#### 2.2 Dry Run Testing

Test migrations without making changes:

```bash
# Dry run for all workflows
npx n8n migrate-python --workflows ./workflows --dry-run

# Dry run for single workflow with verbose output
npx n8n migrate-python --single-workflow ./workflow.json --dry-run --verbose
```

#### 2.3 Incremental Migration

Migrate workflows in phases based on complexity:

```bash
# Phase 1: Simple workflows only
npx n8n migrate-python --workflows ./workflows --output ./migrated-phase1 --include-patterns "simple-*.json"

# Phase 2: Moderate complexity
npx n8n migrate-python --workflows ./workflows --output ./migrated-phase2 --include-patterns "moderate-*.json"

# Phase 3: Complex workflows with manual review
npx n8n migrate-python --workflows ./workflows --output ./migrated-phase3 --force --interactive
```

#### 2.4 Interactive Migration

For critical workflows, use interactive mode:

```bash
npx n8n migrate-python --workflows ./workflows --interactive
```

Interactive mode provides:
- **Per-workflow confirmation** with difficulty assessment
- **Change preview** before applying modifications
- **Skip options** for problematic workflows
- **Custom migration parameters** per workflow

### Phase 3: Validation and Testing

#### 3.1 Automated Validation

The migration system includes built-in validation:

```bash
# Run migration with validation
npx n8n migrate-python --workflows ./workflows --output ./migrated --validate
```

Validation checks:
- **Syntax correctness** of migrated Python code
- **Package availability** in local environment
- **Security compliance** with configured policies
- **Performance regression** testing (optional)

#### 3.2 Manual Testing

Test migrated workflows thoroughly:

1. **Execute workflows** in test environment
2. **Compare outputs** with original Pyodide versions
3. **Verify performance improvements** using benchmarks
4. **Test error handling** and edge cases
5. **Validate security restrictions**

#### 3.3 Performance Benchmarking

Compare performance before and after migration:

```bash
# Run performance benchmarks
node scripts/benchmark-python-execution.js

# Compare specific workflow performance
npx n8n benchmark --workflow ./migrated-workflow.json --iterations 50
```

### Phase 4: Production Deployment

#### 4.1 Environment Preparation

Prepare production environment:

```bash
# Install required Python packages
pip install -r requirements.txt

# Configure virtual environments
export N8N_PYTHON_VENV_DIR=/opt/n8n/python-venvs
export N8N_PYTHON_MAX_VENVS=20

# Set security parameters
export N8N_PYTHON_MAX_EXECUTION_TIME=60000
export N8N_PYTHON_MAX_MEMORY_MB=1024
export N8N_PYTHON_NETWORK_ACCESS=false
```

#### 4.2 Gradual Rollout

Deploy migrations gradually:

1. **Canary deployment** with low-risk workflows
2. **Monitor performance** and error rates
3. **Progressive rollout** to more workflows
4. **Full deployment** after validation

#### 4.3 Rollback Strategy

Maintain rollback capabilities:

```bash
# Keep original workflows for rollback
mv ./workflows ./workflows-original
mv ./migrated-workflows ./workflows

# Quick rollback if needed
mv ./workflows ./workflows-migrated
mv ./workflows-original ./workflows
```

## Migration Tools Reference

### Command Line Interface

#### Basic Commands

```bash
# Analyze workflows
npx n8n migrate-python --workflows <path> --analyze-only

# Migrate with backup
npx n8n migrate-python --workflows <path> --output <output> --backup

# Interactive migration
npx n8n migrate-python --workflows <path> --interactive

# Dry run migration
npx n8n migrate-python --workflows <path> --dry-run
```

#### Advanced Options

```bash
# Force migration of high-risk workflows
npx n8n migrate-python --workflows <path> --force

# Custom output format
npx n8n migrate-python --workflows <path> --output-format json

# Pattern-based filtering
npx n8n migrate-python --workflows <path> --include-patterns "*.json" --exclude-patterns "test-*.json"

# Verbose logging
npx n8n migrate-python --workflows <path> --verbose
```

### Programmatic Usage

#### Migration Service

```typescript
import { PyodideToLocalPythonMigrationService } from '@/migration/pyodide-to-local-python.service';

const migrationService = Container.get(PyodideToLocalPythonMigrationService);

// Analyze workflows
const analysis = await migrationService.analyzeWorkflows('./workflows');

// Get recommendations
const recommendations = await migrationService.getMigrationRecommendations(workflow);

// Perform migration
const result = await migrationService.migrateWorkflow(workflow);
```

#### Compatibility Service

```typescript
import { PyodideCompatibilityService } from '@/compatibility/pyodide-compat';

const compatService = Container.get(PyodideCompatibilityService);

// Check compatibility
const compatibility = await compatService.checkCompatibility(pythonCode);

// Execute with compatibility layer
const result = await compatService.executeWithCompatibility(code, context, {
  compatibilityMode: 'auto',
  allowJsInterop: false,
});
```

#### Batch Migration Script

```javascript
const PythonWorkflowMigrator = require('./scripts/migrate-python-workflows.js');

const migrator = new PythonWorkflowMigrator({
  batchSize: 5,
  maxConcurrentMigrations: 2,
});

const stats = await migrator.migrate('./workflows', './migrated', {
  backup: true,
  dryRun: false,
});
```

## Troubleshooting

### Common Issues

#### Issue: Migration fails with "Python not found"

**Solution:**
```bash
# Set Python path explicitly
export N8N_PYTHON_PATH=/usr/bin/python3

# Or install Python
sudo apt-get install python3 python3-pip python3-venv  # Ubuntu/Debian
brew install python3  # macOS
```

#### Issue: Package installation fails

**Solution:**
```bash
# Update pip
python3 -m pip install --upgrade pip

# Install with user flag
pip3 install --user <package-name>

# Use specific index
pip3 install --index-url https://pypi.org/simple/ <package-name>
```

#### Issue: Virtual environment creation fails

**Solution:**
```bash
# Install venv module
sudo apt-get install python3-venv  # Ubuntu/Debian

# Create with specific Python version
python3.9 -m venv /path/to/venv

# Fix permissions
sudo chown -R $USER:$USER /path/to/venv
```

#### Issue: JavaScript interop code not working

**Solution:**
Replace JavaScript interoperability with Python alternatives:

```python
# Before (Pyodide)
from js import console, Object
console.log("Hello")
data = Object.fromEntries(my_dict)

# After (Local Python)
print("Hello")  # Use Python print
data = dict(my_dict)  # Use Python dict
```

#### Issue: Async/await patterns causing errors

**Solution:**
Remove unnecessary async patterns:

```python
# Before (Pyodide)
async def process_data():
    result = await some_operation()
    return result

# After (Local Python)
def process_data():
    result = some_operation()  # Remove await if not truly async
    return result
```

### Performance Issues

#### Issue: Slower than expected performance

**Diagnosis:**
```bash
# Check virtual environment usage
export N8N_LOG_LEVEL=debug

# Monitor resource usage
htop

# Profile Python execution
python3 -m cProfile -o profile.stats script.py
```

**Solutions:**
- Enable worker pool: `N8N_PYTHON_POOL_MIN_WORKERS=4`
- Increase cache size: `N8N_PYTHON_CACHE_MAX_ENVIRONMENTS=50`
- Optimize package installations
- Use SSD storage for virtual environments

#### Issue: High memory usage

**Solutions:**
```bash
# Limit memory per execution
export N8N_PYTHON_MAX_MEMORY_MB=512

# Reduce cache size
export N8N_PYTHON_CACHE_MAX_MEMORY=536870912  # 512MB

# Clean up environments more frequently
export N8N_PYTHON_CACHE_ENV_TTL=1800000  # 30 minutes
```

### Security Issues

#### Issue: Security restrictions too strict

**Solutions:**
```bash
# Allow specific modules
export N8N_PYTHON_ALLOWED_MODULES=requests,pandas,numpy

# Enable network access for specific workflows
export N8N_PYTHON_NETWORK_ACCESS=true

# Increase execution timeout
export N8N_PYTHON_MAX_EXECUTION_TIME=120000  # 2 minutes
```

## Best Practices

### Pre-Migration

1. **Create comprehensive backups** of all workflows
2. **Document custom modifications** and dependencies
3. **Test in development environment** first
4. **Plan rollback strategy** before starting
5. **Communicate changes** to workflow users

### During Migration

1. **Migrate in phases** starting with simple workflows
2. **Use dry-run mode** extensively for testing
3. **Monitor system resources** during batch operations
4. **Validate each phase** before proceeding
5. **Keep detailed logs** of changes and issues

### Post-Migration

1. **Monitor performance metrics** continuously
2. **Set up alerting** for execution failures
3. **Document changes** made to workflows
4. **Train users** on new capabilities and limitations
5. **Plan regular maintenance** of Python environments

### Code Quality

1. **Remove all Pyodide-specific code** completely
2. **Replace JavaScript interop** with Python alternatives
3. **Add proper error handling** for local execution
4. **Use type hints** where beneficial
5. **Follow Python PEP standards**

### Security

1. **Review all system calls** and external operations
2. **Validate user inputs** thoroughly
3. **Use principle of least privilege** for execution environments
4. **Monitor for suspicious activities**
5. **Keep Python and packages updated**

## Configuration Reference

### Environment Variables

#### Core Settings

```bash
# Python executable path
N8N_PYTHON_PATH=/usr/bin/python3

# Virtual environment directory
N8N_PYTHON_VENV_DIR=/opt/n8n/python-venvs

# Maximum execution time (milliseconds)
N8N_PYTHON_MAX_EXECUTION_TIME=30000

# Maximum memory per execution (MB)
N8N_PYTHON_MAX_MEMORY_MB=1024
```

#### Pool Configuration

```bash
# Worker pool settings
N8N_PYTHON_POOL_MIN_WORKERS=2
N8N_PYTHON_POOL_MAX_WORKERS=8
N8N_PYTHON_POOL_MAX_IDLE_TIME=300000
N8N_PYTHON_POOL_MAX_EXECUTIONS=100
```

#### Cache Configuration

```bash
# Cache settings
N8N_PYTHON_CACHE_MAX_ENVIRONMENTS=20
N8N_PYTHON_CACHE_MAX_CODE_SIZE=1000
N8N_PYTHON_CACHE_MAX_MEMORY=1073741824
N8N_PYTHON_CACHE_ENV_TTL=3600000
N8N_PYTHON_CACHE_CODE_TTL=1800000
```

#### Security Settings

```bash
# Security configuration
N8N_PYTHON_NETWORK_ACCESS=false
N8N_PYTHON_ALLOWED_MODULES=requests,pandas,numpy
N8N_BLOCK_ENV_ACCESS_IN_NODE=true
N8N_PYTHON_SANDBOX=true
```

#### Migration Settings

```bash
# Migration behavior
N8N_PYTHON_LEGACY_MODE=false
N8N_PYTHON_STRICT_COMPAT=false
N8N_PYTHON_PERFORMANCE_OPT=true
N8N_PYTHON_SECURITY_CHECKS=true
```

### Package Management

#### Common Packages

Pre-install commonly used packages to improve performance:

```bash
# Data processing
pip install pandas numpy scipy matplotlib seaborn

# Web requests
pip install requests urllib3 aiohttp

# Date/time handling
pip install python-dateutil pytz

# JSON/XML processing
pip install jsonschema xmltodict

# File processing
pip install openpyxl python-docx PyPDF2

# Database connectivity
pip install psycopg2-binary pymongo redis

# Machine learning
pip install scikit-learn tensorflow pytorch

# Utilities
pip install tqdm rich click
```

#### Virtual Environment Templates

Create template environments for common use cases:

```bash
# Data science template
python3 -m venv /opt/n8n/templates/data-science
source /opt/n8n/templates/data-science/bin/activate
pip install pandas numpy scipy matplotlib seaborn jupyter

# Web scraping template
python3 -m venv /opt/n8n/templates/web-scraping
source /opt/n8n/templates/web-scraping/bin/activate
pip install requests beautifulsoup4 selenium scrapy

# Machine learning template
python3 -m venv /opt/n8n/templates/ml
source /opt/n8n/templates/ml/bin/activate
pip install scikit-learn tensorflow pytorch transformers
```

## Migration Checklist

### Pre-Migration Checklist

- [ ] **System Requirements Met**
  - [ ] Python 3.8+ installed and accessible
  - [ ] Virtual environment support available
  - [ ] Sufficient disk space for environments
  - [ ] Required system packages installed

- [ ] **Backup Strategy**
  - [ ] Full workflow backup created
  - [ ] Backup location documented
  - [ ] Restore procedure tested
  - [ ] Rollback plan documented

- [ ] **Analysis Completed**
  - [ ] All workflows analyzed for compatibility
  - [ ] Risk assessment completed
  - [ ] Migration plan created
  - [ ] Timeline established

### Migration Checklist

- [ ] **Phase 1: Simple Workflows**
  - [ ] Low-risk workflows identified
  - [ ] Dry run completed successfully
  - [ ] Migration executed
  - [ ] Testing completed
  - [ ] Issues documented

- [ ] **Phase 2: Moderate Workflows**
  - [ ] Medium-risk workflows migrated
  - [ ] Manual review completed
  - [ ] Testing completed
  - [ ] Performance validated

- [ ] **Phase 3: Complex Workflows**
  - [ ] High-risk workflows reviewed
  - [ ] Custom solutions implemented
  - [ ] Extensive testing completed
  - [ ] Security validation passed

### Post-Migration Checklist

- [ ] **Validation**
  - [ ] All workflows functional
  - [ ] Performance improvements confirmed
  - [ ] Security restrictions effective
  - [ ] Error handling working

- [ ] **Documentation**
  - [ ] Changes documented
  - [ ] User guides updated
  - [ ] Troubleshooting guide created
  - [ ] Rollback procedures documented

- [ ] **Monitoring**
  - [ ] Performance monitoring enabled
  - [ ] Error alerting configured
  - [ ] Resource usage tracked
  - [ ] Regular maintenance scheduled

## FAQ

### General Questions

**Q: How long does migration typically take?**
A: Migration time varies by workflow complexity:
- Simple workflows: 15-30 minutes each
- Moderate workflows: 1-2 hours each  
- Complex workflows: 4-8 hours each
- Critical workflows: 1-2 days each

**Q: Can I migrate workflows gradually?**
A: Yes, the migration system supports incremental migration. You can migrate workflows in phases based on complexity and risk level.

**Q: What happens to existing Pyodide workflows during migration?**
A: Original workflows are preserved (especially with backup option). Migration creates modified versions that use local Python execution.

### Technical Questions

**Q: Will migrated workflows run faster?**
A: Yes, local Python execution typically provides 5-10x performance improvement over Pyodide browser execution.

**Q: Do I need to change my Python code?**
A: Most Python code requires minimal changes. The main changes involve removing Pyodide-specific API calls and JavaScript interoperability.

**Q: Can I use all Python packages after migration?**
A: Yes, local execution provides access to the full Python ecosystem, including C extensions that weren't available in Pyodide.

### Compatibility Questions

**Q: What if my workflow uses JavaScript interoperability?**
A: JavaScript interop needs to be replaced with Python-native alternatives. The compatibility layer provides some automatic conversions, but manual review is usually required.

**Q: How are async/await patterns handled?**
A: Simple async patterns are automatically converted to synchronous execution. Complex async operations using asyncio libraries are preserved.

**Q: What about security restrictions?**
A: Local execution provides more granular security controls through virtual environments and configurable restrictions.

## Support and Resources

### Documentation

- [Python Performance Optimization Guide](../performance/python-optimization.md)
- [n8n Code Node Documentation](../nodes/code-node-python.md)
- [Security Best Practices](../security/python-execution.md)

### Tools and Scripts

- Migration CLI: `npx n8n migrate-python`
- Batch migration: `node scripts/migrate-python-workflows.js`
- Performance benchmarks: `node scripts/benchmark-python-execution.js`

### Community Resources

- n8n Community Forum: Python Migration discussions
- GitHub Issues: Report migration problems
- Discord: Real-time migration support

### Professional Support

For enterprise migrations or complex scenarios:
- n8n Professional Services
- Migration consulting
- Custom tool development
- Performance optimization services

---

This guide provides comprehensive coverage of the Pyodide to local Python migration process. For additional help or specific questions not covered here, please refer to the community resources or contact support.