# REVIEWER Mode Instructions

You are in REVIEWER mode, responsible for comprehensive code review using the three-strike validation system with quality gate enforcement.

*Note: All core quality standards, security protocols, performance optimization patterns, subagent requirements, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds three-strike validation system only.*

## Three-Strike Review System

### Strike 1: Build Verification ⚙️
**Objective**: Project builds completely without errors

**Quick Validation**:
```bash
# Critical build check
npm ci && npm run build  # or equivalent for project type
# Must have: zero exit code, no error messages, all artifacts generated
```

**Pass Criteria**: Clean build, no compilation errors, all dependencies resolved  
**Fail Criteria**: Any build errors, missing dependencies, configuration issues

### Strike 2: Code Quality & Linting 🧹
**Objective**: Zero linter errors and consistent code quality

**Quick Validation**:
```bash
# Run all available linters
npm run lint || npx eslint . --no-warn-ignored  # JS projects
ruff check . && mypy .  # Python projects
```

**Pass Criteria**: Zero lint errors, consistent formatting, no code smells  
**Fail Criteria**: Any lint errors, style violations, dead code blocks

### Strike 3: Test Coverage & Success 🎯
**Objective**: Comprehensive test coverage with all tests passing

**Coverage Requirements by Component**:
- **Critical Components** (auth, payments, security): 100% minimum
- **Core Business Logic**: 95% minimum  
- **Utilities & Helpers**: 90% minimum
- **UI Components**: 85% minimum

**Pass Criteria**: All tests pass, coverage meets minimums, no flaky tests  
**Fail Criteria**: Any failing tests, coverage below thresholds, test instability

## Review Decision Framework

### Strike Failure Response
```
STRIKE [N] FAILED ❌
1. Document specific failures with file:line references
2. Create remediation tasks in TODO.json via TaskManager API
3. Assign appropriate mode (DEVELOPMENT/TESTING/DEBUGGING)
4. Set priority based on failure severity (critical > high > medium)
5. Block progression until all failures resolved
```

### Strike Success Response
```
STRIKE [N] PASSED ✅
1. Document any warnings for future attention
2. Record metrics for trend analysis
3. Proceed to next strike or mark review complete
4. Update project quality score
```

## Review Quality Gates

### Pre-Review Validation
- [ ] **Clean Environment**: Fresh dependency install, clean build state
- [ ] **Branch State**: Current with target branch, no merge conflicts
- [ ] **Tool Availability**: All required linters/test runners functional

### Strike-Specific Gates

#### Strike 1 Gates
- [ ] **Build Tools**: Package managers, compilers, bundlers operational
- [ ] **Dependencies**: All declared dependencies installable and compatible
- [ ] **Configuration**: Environment variables, config files present and valid
- [ ] **Artifacts**: Expected build outputs generated successfully

#### Strike 2 Gates  
- [ ] **Syntax**: No syntax errors in any source files
- [ ] **Style**: Consistent formatting, naming conventions followed
- [ ] **Imports**: Organized, no unused imports, no circular dependencies
- [ ] **Dead Code**: No commented-out code blocks or unused variables

#### Strike 3 Gates
- [ ] **Test Execution**: All tests run successfully without errors
- [ ] **Coverage Analysis**: Line and branch coverage meet component-specific thresholds
- [ ] **Test Quality**: Tests are meaningful, not just coverage-padding
- [ ] **Performance**: No significant performance regressions in test runs

## Automated Review Integration

### Security Scanning (Critical Priority)
```bash
# Quick security validation
npm audit --audit-level high  # Node.js
pip-audit  # Python
# Block on: high/critical vulnerabilities, hardcoded secrets
```

### Performance Baseline Check
- Response time regression > 10% = Strike 3 failure
- Memory usage increase > 15% = Strike 3 failure  
- Build time increase > 25% = Strike 1 failure

## Remediation Task Creation

### Task Generation Logic
```javascript
// Strike failures automatically create TODO.json tasks
const remediationTask = {
  title: `Fix Strike ${strikeNumber} Failures`,
  description: `Address ${failureCount} ${failureType} issues`,
  mode: failureType === 'build' ? 'DEVELOPMENT' : 
        failureType === 'lint' ? 'DEVELOPMENT' : 'TESTING',
  priority: 'high',
  success_criteria: [`Strike ${strikeNumber} passes without errors`],
  important_files: failedFiles.map(f => f.path)
};
```

### Escalation Triggers
- **Strike 1 failures** → DEVELOPMENT mode with build focus
- **Strike 2 failures** → DEVELOPMENT mode with code quality focus  
- **Strike 3 failures** → TESTING mode with coverage focus
- **Repeated failures** → REFACTORING mode with architectural review

## Review Efficiency Optimization

### Fast-Fail Strategy
1. **Run cheapest validations first** (lint < build < tests)
2. **Stop on first strike failure** (no need to run subsequent strikes)
3. **Batch similar issues** in single remediation task
4. **Use cached results** when possible (unchanged files)

### Parallel Validation
- Run linting and security scans simultaneously during build
- Execute unit and integration tests in parallel where possible
- Perform coverage analysis concurrently with test execution

## Mode-Specific Focus

This mode supplements CLAUDE.md with the three-strike review system, automated validation logic, and remediation task creation workflows for quality gate enforcement.