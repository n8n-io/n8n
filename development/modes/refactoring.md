# REFACTORING Mode Instructions

You are in REFACTORING mode, focused on improving code structure without changing external behavior through systematic risk assessment and incremental improvement strategies.

*Note: All core quality standards, file organization, subagent requirements, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds refactoring-specific risk frameworks only.*

## Risk Assessment Framework

### 1. Refactoring Risk Classification

#### Low Risk Refactoring (Safe to Execute)
```
Characteristics:
├── Single function/method improvements
├── Local variable renaming
├── Code formatting and style cleanup
├── Comment additions and documentation updates
└── Dead code removal (unused variables/functions)

Safety Measures:
- Unit tests cover affected code paths
- Changes are atomic and easily reversible
- No external API or interface modifications
- Performance impact is negligible
```

#### Medium Risk Refactoring (Requires Caution)
```
Characteristics:
├── Function signature changes with backward compatibility
├── Class structure modifications
├── Module reorganization and file moves
├── Algorithm optimization with equivalent behavior
└── Dependency injection and inversion of control

Safety Measures:
- Comprehensive test coverage (95% minimum)
- Staged rollout with feature flags
- Performance benchmarking before/after
- Multiple code review rounds
- Deprecation warnings for changed interfaces
```

#### High Risk Refactoring (Extensive Planning Required)
```
Characteristics:
├── Database schema changes
├── API contract modifications
├── Core architecture restructuring
├── Cross-service interface changes
└── Legacy system replacement

Safety Measures:
- Technical design document and review
- Parallel system operation during transition
- Comprehensive integration testing
- Rollback procedures tested and documented
- Stakeholder communication and approval
```

### 2. Pre-Refactoring Assessment Checklist

#### Code Analysis Requirements
- [ ] **Test Coverage**: Minimum 85% line coverage for affected code
- [ ] **Performance Baseline**: Current metrics captured for comparison
- [ ] **Dependency Mapping**: All consumers and dependencies identified
- [ ] **Interface Contracts**: Public APIs and their usage patterns documented
- [ ] **Error Scenarios**: Exception handling and edge cases understood

#### Impact Assessment
- [ ] **User Impact**: No changes to user-visible behavior
- [ ] **System Integration**: Effects on connected systems evaluated
- [ ] **Performance Impact**: Resource usage and response time implications
- [ ] **Deployment Impact**: Changes to build, deployment, or configuration
- [ ] **Team Impact**: Knowledge transfer and documentation needs

## Incremental Refactoring Strategies

### 1. The Strangler Fig Pattern
```
Application: Legacy system modernization
Strategy:
1. Identify discrete functional boundaries
2. Build new implementation alongside old system
3. Gradually route traffic to new implementation
4. Monitor and validate new system behavior
5. Decommission old system components incrementally

Timeline: 3-6 months for major systems
Risk Level: Medium (well-contained with proper routing)
```

### 2. Branch by Abstraction
```
Application: Core component replacement in production systems
Strategy:
1. Create abstraction layer over existing implementation
2. Route all usage through abstraction
3. Implement new version behind abstraction
4. Add feature flag to switch between implementations
5. Gradually migrate to new implementation
6. Remove old implementation and abstraction

Timeline: 2-4 months for complex components
Risk Level: Low (old system remains functional throughout)
```

### 3. Parallel Change (Expand-Contract)
```
Application: Interface evolution without breaking consumers
Strategy:
1. EXPAND: Add new interface alongside existing one
2. Migrate consumers to new interface incrementally
3. CONTRACT: Remove old interface once all consumers migrated
4. Validate no consumers remain on old interface

Timeline: 1-3 months depending on consumer count
Risk Level: Low (consumers can migrate at their own pace)
```

### 4. Feature Toggle Refactoring
```
Application: Algorithmic improvements and behavioral changes
Strategy:
1. Implement new behavior behind feature flag
2. Deploy with flag disabled (old behavior active)
3. Enable for small percentage of traffic
4. Monitor metrics and gradually increase percentage
5. Make new behavior default once validated
6. Remove feature flag and old code

Timeline: 2-6 weeks for algorithmic changes
Risk Level: Very Low (instant rollback capability)
```

## Refactoring Quality Metrics

### Code Quality Improvement Targets
- **Cyclomatic Complexity**: Reduce by 20-30% for complex functions
- **Code Duplication**: Eliminate >90% of identified duplicate code blocks
- **Module Coupling**: Reduce inter-module dependencies by 15-25%
- **Test Coverage**: Maintain or improve coverage (never decrease)
- **Documentation Coverage**: 100% for public APIs and complex algorithms

### Performance Impact Validation
- **Response Time**: No degradation >5% for critical paths
- **Memory Usage**: No increase >10% in steady-state operation
- **CPU Utilization**: No increase >10% under normal load
- **Database Performance**: Query execution time maintained or improved

### Maintainability Metrics
- **Lines of Code per Function**: Target <50 lines, maximum 100 lines
- **Function Parameter Count**: Target <5 parameters, maximum 8
- **Class Size**: Target <300 lines, maximum 500 lines
- **File Size**: Follow CLAUDE.md limits (250 target, 400 maximum)

## Incremental Implementation Workflow

### Phase 1: Preparation and Analysis
```
Duration: 1-2 weeks
Activities:
├── Code smell identification and prioritization
├── Test coverage analysis and gap filling
├── Performance baseline establishment
├── Risk assessment and mitigation planning
└── Stakeholder communication and approval
```

### Phase 2: Infrastructure Setup
```
Duration: 3-5 days
Activities:
├── Feature flag implementation (if needed)
├── Monitoring and alerting enhancement
├── Rollback procedure documentation and testing
├── Development environment preparation
└── Code review process establishment
```

### Phase 3: Incremental Implementation
```
Duration: 2-8 weeks (varies by scope)
Activities:
├── Small, atomic changes with immediate testing
├── Continuous integration and deployment
├── Real-time monitoring and metric tracking
├── Regular stakeholder updates and feedback
└── Course correction based on findings
```

### Phase 4: Validation and Cleanup
```
Duration: 1-2 weeks
Activities:
├── Comprehensive system testing
├── Performance validation and optimization
├── Documentation updates and knowledge transfer
├── Legacy code removal and cleanup
└── Post-refactoring retrospective and lessons learned
```

## Safety Mechanisms and Rollback Procedures

### Automated Safety Checks
- **Pre-deployment Testing**: All tests must pass before deployment
- **Performance Regression Detection**: Automatic rollback if metrics degrade
- **Error Rate Monitoring**: Alert and consider rollback if error rates spike
- **User Impact Tracking**: Monitor user experience metrics for degradation

### Manual Rollback Triggers
- **Unexpected Behavior**: Any behavior change not covered by test cases
- **Performance Issues**: Response time or resource usage exceeding thresholds
- **Integration Failures**: Downstream system compatibility issues
- **Stakeholder Concerns**: Business or user experience concerns raised

### Rollback Execution Procedures
```
Immediate Rollback (< 5 minutes):
1. Disable feature flags or revert to previous deployment
2. Verify system returns to baseline behavior
3. Communicate rollback to stakeholders
4. Begin root cause analysis

Full System Rollback (< 30 minutes):
1. Execute automated rollback procedures
2. Verify all system components restored
3. Validate data integrity and consistency
4. Resume normal operations monitoring
5. Schedule post-incident review
```

## Mode-Specific Focus

This mode supplements CLAUDE.md with refactoring-specific risk classification, incremental improvement strategies, and safety mechanism frameworks for behavior-preserving code improvements.