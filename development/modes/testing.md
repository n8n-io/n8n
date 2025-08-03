# TESTING Mode Instructions

You are in TESTING mode, focused on comprehensive test coverage and quality assurance with strategic testing frameworks.

*Note: All core TDD patterns, quality standards, subagent requirements, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds testing-specific strategy frameworks only.*

## Test Strategy Selection Matrix

### 1. Component Type-Based Testing Strategy

#### API/Service Components
```
Coverage Requirement: 95% minimum
Test Types Required:
├── Unit Tests (90%): Business logic, validation, error handling
├── Integration Tests (85%): Database operations, external service calls
├── Contract Tests (100%): API schema compliance and backward compatibility
└── Performance Tests: Response time <200ms, throughput benchmarks
```

#### Frontend Components
```
Coverage Requirement: 85% minimum
Test Types Required:
├── Unit Tests (80%): Component logic, state management, utility functions
├── Integration Tests (70%): Component interaction, data flow, routing
├── Visual Regression Tests: UI consistency across browsers/devices
└── E2E Tests: Critical user journeys (login, checkout, core workflows)
```

#### Data Layer Components
```
Coverage Requirement: 100% minimum
Test Types Required:
├── Unit Tests (100%): Query logic, data transformations, validation
├── Integration Tests (95%): Database transactions, migration safety
├── Performance Tests: Query execution time, connection pooling
└── Data Integrity Tests: Constraint validation, referential integrity
```

#### Infrastructure/DevOps Components
```
Coverage Requirement: 90% minimum
Test Types Required:
├── Infrastructure Tests: Configuration validation, resource provisioning
├── Security Tests: Vulnerability scanning, penetration testing
├── Deployment Tests: Blue-green deployment, rollback procedures
└── Chaos Engineering: Fault injection, disaster recovery validation
```

### 2. Testing Approach Decision Framework

#### Test-First Development (Complexity: High, Risk: High)
```
When to Use:
- New feature development with unclear requirements
- Critical business logic with complex edge cases
- API development requiring contract validation
- Legacy code modernization

Approach:
1. Write failing tests based on acceptance criteria
2. Implement minimal code to pass tests
3. Refactor with confidence (tests as safety net)
4. Expand test coverage for edge cases
```

#### Test-Alongside Development (Complexity: Medium, Risk: Medium)
```
When to Use:
- Feature enhancement of existing codebase
- Bug fixes with well-understood scope
- Integration work with established patterns

Approach:
1. Implement feature increment
2. Write tests for new functionality
3. Verify existing functionality not broken
4. Add regression tests for discovered issues
```

#### Test-After Development (Complexity: Low, Risk: Low)
```
When to Use:
- Simple utility functions with clear inputs/outputs
- Configuration changes with limited scope
- Documentation and non-functional updates

Approach:
1. Complete implementation
2. Add comprehensive test suite
3. Validate edge cases and error conditions
4. Ensure coverage meets minimum thresholds
```

## Coverage Requirements by Context

### Development Phase Coverage Targets
- **Feature Development**: 80% minimum line coverage, 70% branch coverage
- **Bug Fixes**: 95% minimum coverage for affected code paths
- **Refactoring**: Maintain existing coverage levels, target 85% minimum
- **Security Features**: 100% coverage required for authentication/authorization

### Component Criticality-Based Coverage
- **Critical Path Components** (payments, authentication): 95% minimum
- **Core Business Logic**: 90% minimum
- **User Interface Components**: 80% minimum
- **Utility/Helper Functions**: 85% minimum
- **Configuration/Setup Code**: 70% minimum

### Test Environment Requirements

#### Unit Test Environment
- **Isolation**: No external dependencies (APIs, databases, file system)
- **Speed**: All tests complete in <30 seconds
- **Deterministic**: Same inputs always produce same outputs
- **Independent**: Tests can run in any order without side effects

#### Integration Test Environment
- **Realistic Data**: Sanitized production-like datasets
- **Service Dependencies**: Test doubles or containerized services
- **Network Conditions**: Simulate latency and failures
- **Database State**: Clean, consistent state for each test run

#### End-to-End Test Environment
- **Production Parity**: Infrastructure matching production
- **Real Data**: Anonymized production data or synthetic realistic data
- **Complete Workflows**: Full user journeys without mocking
- **Cross-Browser**: Multiple browser/device combinations

## Quality Gate Enforcement

### Pre-Commit Quality Gates
- [ ] **Unit Tests**: All tests pass, coverage meets minimum threshold
- [ ] **Linting**: Code style and quality checks pass
- [ ] **Security Scan**: No high/critical vulnerabilities introduced
- [ ] **Performance**: No regression in critical path performance

### Pre-Deployment Quality Gates
- [ ] **Full Test Suite**: All test categories pass without failures
- [ ] **Integration Tests**: External service interactions validated
- [ ] **Security Testing**: Penetration testing for security-sensitive changes
- [ ] **Performance Testing**: Load testing for performance-critical changes

### Post-Deployment Monitoring
- [ ] **Error Rate**: <0.1% error rate within 24 hours
- [ ] **Performance**: Response times within established SLA
- [ ] **User Impact**: No critical user journey disruptions
- [ ] **Security**: No new security incidents or vulnerabilities

## Testing Strategy by Feature Type

### Data Processing Features
- **Property-Based Testing**: Generate random inputs to test edge cases
- **Snapshot Testing**: Verify consistent output formats over time
- **Performance Testing**: Memory usage and processing time benchmarks
- **Data Quality Testing**: Validation of data transformation accuracy

### User Interface Features
- **Visual Regression Testing**: Automated screenshot comparison
- **Accessibility Testing**: WCAG compliance and screen reader compatibility
- **Cross-Platform Testing**: Multiple browsers, devices, and screen sizes
- **User Experience Testing**: Task completion time and error rate metrics

### API/Service Features
- **Contract Testing**: Producer/consumer contract validation
- **Rate Limiting Testing**: Behavior under high load conditions
- **Error Handling Testing**: Graceful degradation and recovery
- **Security Testing**: Authentication, authorization, and input validation

### Integration Features
- **Circuit Breaker Testing**: Fault tolerance and recovery mechanisms
- **Data Consistency Testing**: Transaction integrity across services
- **Event Processing Testing**: Message ordering and delivery guarantees
- **Rollback Testing**: System recovery after deployment failures

## Test Data Management

### Test Data Strategy
- **Static Test Data**: Predictable, version-controlled datasets for consistent results
- **Generated Test Data**: Programmatically created data for edge case testing
- **Anonymized Production Data**: Real-world data patterns with privacy protection
- **Synthetic Data**: AI-generated realistic data for comprehensive testing

### Data Lifecycle Management
- **Setup**: Automated test data provisioning before test execution
- **Isolation**: Each test gets clean, independent data state
- **Cleanup**: Automatic data removal after test completion
- **Versioning**: Test data schema changes tracked with application versions

## Mode-Specific Focus

This mode supplements CLAUDE.md with testing-specific strategy selection matrices, coverage requirements by component type, and quality gate enforcement frameworks.