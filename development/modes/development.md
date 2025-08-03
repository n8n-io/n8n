# DEVELOPMENT Mode Instructions

You are in DEVELOPMENT mode, focused on implementing production-ready features with architectural decision-making frameworks.

*Note: All core patterns, quality standards, subagent requirements, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds development-specific decision frameworks only.*

## Implementation Decision Tree

### 1. Feature Complexity Assessment
```
Simple Feature (1-2 files, <4 hours):
├── Direct implementation with standard error handling
├── Unit tests + integration test
└── Documentation update

Moderate Feature (3-5 files, 4-8 hours):
├── Architecture spike (1 hour research phase)
├── Interface design before implementation
├── Staged rollout with feature flags
└── Comprehensive test suite

Complex Feature (6+ files, 8+ hours):
├── Technical design document
├── Proof of concept implementation
├── Security and performance review
├── Gradual integration with circuit breakers
└── Full observability instrumentation
```

### 2. Architectural Pattern Selection

#### When to Use Each Pattern
**Adapter Pattern**: 
- Integrating with external APIs or legacy systems
- API versioning and backward compatibility needs
- Third-party service abstractions

**Facade Pattern**:
- Complex subsystems with multiple interaction points  
- Simplifying client interfaces to internal complexity
- Cross-cutting concerns (logging, validation, caching)

**Event-Driven Architecture**:
- Microservice communication
- Decoupling high-frequency operations
- Real-time data processing pipelines

**Repository Pattern**:
- Data access abstraction
- Testing with mock data sources
- Multiple data storage backends

### 3. Development Quality Gates

#### Pre-Implementation Checklist
- [ ] **Context Assessment**: Current system architecture understood
- [ ] **Impact Analysis**: Downstream effects identified and documented
- [ ] **Resource Planning**: Dependencies, APIs, and data requirements mapped
- [ ] **Security Review**: Authentication, authorization, and data protection considered
- [ ] **Performance Baseline**: Current metrics captured for comparison

#### During Implementation
- [ ] **Interface First**: Public APIs defined before internal implementation
- [ ] **Error Boundaries**: Failure modes identified and handled gracefully
- [ ] **Incremental Integration**: Features built in testable, deployable increments
- [ ] **Documentation as Code**: API documentation generated from implementation
- [ ] **Observability Built-In**: Metrics, logs, and traces included from start

#### Pre-Completion Validation
- [ ] **Feature Completeness**: All acceptance criteria met and verified
- [ ] **Integration Testing**: End-to-end workflows validated
- [ ] **Performance Verification**: Response times and resource usage within targets
- [ ] **Security Validation**: Vulnerability scanning and access control testing
- [ ] **Rollback Readiness**: Deployment reversal strategy tested and documented

## Context-Specific Implementation Strategies

### API Development
- **Contract-First Design**: OpenAPI/GraphQL schema before implementation
- **Versioning Strategy**: Semantic versioning with deprecation timelines
- **Rate Limiting**: Built-in throttling and quota management
- **Input Validation**: Schema-based validation with detailed error responses

### Data Layer Implementation
- **Transaction Boundaries**: Clear ACID compliance requirements
- **Migration Strategy**: Backward-compatible schema changes with rollback plans
- **Caching Layer**: Redis/in-memory caching for frequently accessed data
- **Data Validation**: Input sanitization and business rule enforcement

### Frontend Integration
- **Component Isolation**: Self-contained components with clear props interfaces
- **State Management**: Predictable state updates with immutability patterns
- **Error Boundaries**: Graceful degradation when components fail
- **Accessibility**: WCAG compliance built into component design

### Third-Party Integration
- **Circuit Breakers**: Automatic failure detection and service isolation
- **Retry Logic**: Exponential backoff with jitter for transient failures
- **Timeout Configuration**: Request and connection timeouts for all external calls
- **Fallback Strategies**: Graceful degradation when external services fail

## Mode-Specific Success Criteria

### Development Quality Metrics
- **Code Coverage**: Minimum 80% line coverage with meaningful test scenarios
- **Performance Benchmarks**: Response time <200ms for critical paths
- **Error Rate**: <0.1% error rate in production after 48 hours
- **Security Compliance**: Zero high/critical security vulnerabilities

### Implementation Excellence Indicators
- **Architecture Consistency**: Follows established patterns and conventions
- **Documentation Quality**: Clear setup, usage, and troubleshooting guides
- **Deployment Readiness**: Zero-downtime deployment capability
- **Monitoring Integration**: Comprehensive alerting and dashboard coverage

### Development Velocity Optimization
- **Feature Flags**: Progressive rollout capability for all new features
- **Automated Testing**: CI/CD pipeline with comprehensive test coverage
- **Environment Parity**: Development, staging, and production consistency
- **Rollback Capability**: Sub-minute rollback for any deployment

## Mode-Specific Focus

This mode supplements CLAUDE.md with development-specific architectural decision frameworks and implementation quality gates.