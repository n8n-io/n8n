# TASK-CREATION Mode Instructions

You are in TASK-CREATION mode, specialized in analyzing projects and creating structured, actionable tasks with comprehensive quality frameworks.

## Decision Framework: When to Create Tasks

### CREATE TASKS FOR:
- **Multi-step work** (3+ distinct operations)
- **Cross-cutting changes** (multiple files/components)
- **Research-required features** (unknown implementation details)
- **Quality assurance work** (testing, security, performance)
- **Integration work** (external systems, API changes)

### CREATE SUBTASKS FOR:
- **Task complexity** > 4 hours estimated work
- **Clear sequential dependencies** between work items
- **Parallel execution opportunities** (different team members)
- **Risk isolation** (separate high-risk from low-risk work)

### SKIP TASK CREATION FOR:
- **Single-file edits** < 30 minutes
- **Simple configuration changes**
- **Obvious bug fixes** with known solutions
- **Documentation updates** without research needs

## Task Quality Templates

### Feature Task Template
```
Title: Implement [Feature Name]
Description: [User value and technical approach]
Mode: development
Priority: [high|medium|low based on Priority Matrix]
Success Criteria:
- Feature works as specified in requirements
- All automated tests pass
- Code coverage maintains minimum threshold
- Documentation updated
Estimate: [2-6 hours]
Dependencies: [list of blocking tasks]
Important Files: [key files that will be modified]
```

### Bug Fix Task Template
```
Title: Fix [Bug Description]
Description: [Root cause analysis and solution approach]
Mode: development
Priority: [critical|high|medium|low based on impact/urgency]
Success Criteria:
- Bug no longer reproducible
- Regression tests added
- Root cause documented
- Fix verified in production-like environment
Estimate: [1-4 hours]
```

### Research Spike Template
```
Title: Research [Technology/Approach]
Description: [Questions to answer and decisions to make]
Mode: research
Priority: [based on blocking impact]
Success Criteria:
- Key questions answered with evidence
- Recommendation documented with pros/cons
- Proof of concept completed (if applicable)
- Implementation approach defined
- Research report created: ./development/research-reports/research-report-{task_id}.md
Estimate: [2-8 hours]
Time-boxed: [maximum research time allowed]
Important Files: [
  "./development/research-reports/research-report-{task_id}.md"
]
```

### Refactoring Task Template
```
Title: Refactor [Component/System]
Description: [Quality improvements and architectural goals]
Mode: refactoring
Priority: [typically medium unless blocking]
Success Criteria:
- Code quality metrics improved
- No functional behavior changes
- All existing tests pass
- Performance maintained or improved
Estimate: [2-8 hours]
Risk Level: [low|medium|high based on scope]
```

## Priority Matrix Framework

### High Priority (P0/P1)
- **Business Critical**: User-facing features, revenue-blocking bugs
- **Security Issues**: Vulnerabilities, data exposure risks
- **System Stability**: Performance degradation, service outages
- **Dependency Blockers**: Tasks blocking other team members

### Medium Priority (P2)
- **User Experience**: Performance improvements, UX enhancements
- **Technical Debt**: Code quality, maintainability improvements
- **Feature Enhancements**: New functionality with clear user value
- **Documentation**: Critical documentation gaps

### Low Priority (P3/P4)
- **Nice-to-Have Features**: Limited user impact or edge cases
- **Code Cleanup**: Non-blocking refactoring opportunities
- **Internal Tools**: Developer productivity improvements
- **Documentation Polish**: Comprehensive documentation updates

## Dependency Mapping

### Dependency Types
- **Hard Dependencies**: Cannot start until blocker completes
- **Soft Dependencies**: Can start but optimal to wait
- **Resource Dependencies**: Same person/team required
- **Integration Dependencies**: Multiple tasks need coordination

### Dependency Documentation
```
Task A → Task B (hard): Task B cannot begin until Task A deliverables complete
Task C ⟷ Task D (integration): Tasks must coordinate during implementation
Task E ≈ Task F (resource): Same specialist required for both tasks
```

## Task Decomposition Strategies

### Vertical Slicing (User Value)
Break features into complete, shippable increments that deliver value to users.
- **Thin slice approach**: Minimal viable feature implementation
- **User journey mapping**: Complete user workflow segments
- **Value validation**: Each slice provides measurable user benefit

### Horizontal Slicing (Technical Layers)  
Split by architectural components when integration complexity requires it.
- **API-first development**: Backend endpoints before frontend
- **Data layer isolation**: Database changes before business logic
- **Infrastructure preparation**: Environment setup before feature work

### Risk-First Decomposition
Tackle unknowns and high-risk components early to reduce project uncertainty.
- **Technical spikes**: Research and proof-of-concept work
- **Integration testing**: Early validation of system boundaries
- **Performance validation**: Load testing and bottleneck identification

## Task Creation Workflow

### 1. Analysis Phase
- **Project State Assessment**: Current codebase, infrastructure, team capacity
- **Requirement Clarification**: User stories, acceptance criteria, business constraints
- **Technical Discovery**: Architecture review, dependency analysis, risk assessment
- **Research Report Integration**: Check for existing research reports at `./development/research-reports/research-report-{related_task_id}.md`

### 2. Decomposition Phase
- **Work Breakdown Structure**: Hierarchical task organization
- **Effort Estimation**: Story points or hour-based estimates with confidence intervals
- **Dependency Mapping**: Task relationships and coordination needs
- **Research Report Planning**: For research tasks, automatically include `./development/research-reports/research-report-{task_id}.md` in important_files

### 3. Prioritization Phase
- **Business Value Scoring**: User impact and revenue considerations
- **Technical Risk Assessment**: Implementation complexity and unknown factors
- **Resource Optimization**: Team skills alignment and parallel work opportunities

### 4. Validation Phase
- **SMART Criteria Check**: Specific, Measurable, Achievable, Relevant, Time-bound
- **Acceptance Criteria Review**: Testable and complete success conditions
- **Definition of Done Alignment**: Quality standards and completion requirements
- **Research Integration Validation**: Ensure research tasks include standardized report creation and consumption

## Quality Assurance Integration

### Built-in Quality Gates
- **Code Review Requirements**: Peer review and automated checks
- **Testing Standards**: Unit, integration, and acceptance test coverage
- **Documentation Updates**: README, API docs, and architectural decisions
- **Performance Benchmarks**: Response time and throughput validation

### Success Metrics
- **Task Completion Rate**: Percentage of tasks completed without rework
- **Estimate Accuracy**: Actual vs. estimated effort variance
- **Quality Metrics**: Defect rates, code coverage, performance benchmarks
- **Team Velocity**: Sprint capacity and throughput trends

## TaskManager API Integration

Reference CLAUDE.md for complete TaskManager API and CLI usage patterns.

### Automatic Research Report Integration

When creating tasks that require research:

1. **Check for existing reports**: Look for `./development/research-reports/research-report-{related_task_id}.md`
2. **Include in important_files**: Add research report path to task important_files
3. **Update success criteria**: Include research report creation/review in success criteria

### Research Task Integration Pattern
```javascript
// For research tasks, automatically include research report
const researchTask = {
  title: "Research Authentication Patterns",
  mode: "research",
  important_files: [
    `./development/research-reports/research-report-${taskId}.md`,
    ...otherFiles
  ],
  success_criteria: [
    "Research questions answered with evidence",
    "Recommendation documented with pros/cons", 
    `Research report created: ./development/research-reports/research-report-${taskId}.md`,
    ...otherCriteria
  ]
};

// For implementation tasks that depend on research
const implementationTask = {
  title: "Implement Authentication System",
  mode: "development",
  important_files: [
    `./development/research-reports/research-report-${researchTaskId}.md`, // Reference research
    ...implementationFiles
  ],
  dependencies: [researchTaskId]
};
```

### Quick Task Creation Commands
```bash
# Create feature task with research report integration
node -e "const TaskManager = require('./lib/taskManager'); const tm = new TaskManager('./TODO.json'); /* task creation logic with research integration */"

# Add subtasks to existing task
node -e "const TaskManager = require('./lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.addSubtask('parent_id', {...})"

# Update task priority/status
node -e "const TaskManager = require('./lib/taskManager'); const tm = new TaskManager('./TODO.json'); tm.updateTaskStatus('task_id', 'in_progress')"
```