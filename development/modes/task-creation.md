# TASK-CREATION Mode Instructions

You are in TASK-CREATION mode, specialized in autonomous analysis using maximum subagent deployment and creating structured, actionable tasks with comprehensive quality frameworks.

*Note: All core subagent coordination, parallel execution patterns, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds task creation-specific frameworks only.*

## Decision Framework: When to Create Tasks

### 🚨 CRITICAL: CREATE TASKS ONLY FOR SPECIFIC, ACTIONABLE WORK

**Core Principle**: Tasks must have **CONCRETE PURPOSE** and **MEASURABLE OUTCOMES**. Never create vague tasks that lack clear deliverables or success criteria.

**🚫 ABSOLUTE PROHIBITION**: Agents must NEVER follow or create vague tasks. Vague tasks should be SKIPPED entirely and replaced with specific, actionable alternatives or rejected outright.

### CREATE TASKS FOR:
- **Multi-step work** (3+ distinct operations with clear deliverables)
- **Cross-cutting changes** (multiple files/components requiring coordination)
- **Research-required features** (unknown implementation details needing investigation)
- **Quality assurance work** (testing, security, performance with specific problems to solve)
- **Integration work** (external systems, API changes with defined scope)
- **Complex problem solving** (issues requiring analysis and experimentation)

**Task Creation Filter**: Ask "What specific problem does this solve?" and "What concrete deliverable will be produced?" If answers are vague, DON'T create the task.

**🚨 MANDATORY VAGUE TASK REJECTION PROTOCOL**:
1. **IDENTIFY** vague tasks immediately upon encountering them
2. **REJECT** vague tasks - do not attempt to follow or execute them
3. **SKIP** to next actionable task with specific deliverables
4. **REPLACE** vague tasks with specific alternatives when possible
5. **NEVER CREATE** placeholder or generic improvement tasks

### CREATE SUBTASKS FOR:
- **Task complexity** > 4 hours estimated work
- **Clear sequential dependencies** between work items
- **Parallel execution opportunities** (different team members)
- **Risk isolation** (separate high-risk from low-risk work)
- **Independent deliverables** (components that can be validated separately)

### 🚨 SKIP TASK CREATION FOR (MANDATORY AVOIDANCE):
- **Single-file edits** < 30 minutes
- **Simple configuration changes**
- **Obvious bug fixes** with known solutions
- **Documentation updates** without research needs
- **Vague improvement tasks** without specific problems or solutions
- **Generic quality tasks** without measurable outcomes
- **Tasks created just to meet arbitrary numbers**
- **Open-ended directives** ("improve X", "review Y", "enhance Z")
- **Maintenance tasks** without identified specific issues
- **Placeholder tasks** created for task count rather than value

**🚫 ANTI-PATTERNS - NEVER CREATE THESE TASKS:**
- "Review codebase for improvements"
- "Enhance system performance"
- "Improve code quality"
- "Update documentation"
- "Optimize user experience"
- "Clean up technical debt"

**Instead, create specific tasks like:**
- "Fix memory leak in user session handler"
- "Add JSDoc comments to authentication module"
- "Reduce login API response time from 3s to <1s"

## 🚨 MANDATORY: Balanced Task Creation Principles

### Value-Driven Task Creation (STRICT ENFORCEMENT)
- **Create tasks ONLY when they add organizational value**, never for administrative overhead
- **Focus exclusively on actionable work** with clear deliverables and success criteria
- **Aggressively avoid task proliferation** - combine related small tasks when it makes sense
- **Quality over quantity** - fewer, well-defined tasks are infinitely better than many vague ones
- **Specific purpose requirement** - every task must solve a concrete problem or deliver specific value

### 🚫 VAGUE TASK PREVENTION PROTOCOL
- **Question every task**: "What specific problem does this solve?"
- **Demand concrete outcomes**: "What exact deliverable will be produced?"
- **Reject improvement language**: Replace "improve" with specific metrics and targets
- **Require success criteria**: Every task must have measurable completion conditions
- **Enforce problem-solution fit**: Tasks must address identified issues, not create work

### 🚫 WHEN NOT TO CREATE TASKS (STRICT AVOIDANCE RULES)

**MANDATORY TASK REJECTION CRITERIA:**
- **"Review everything" tasks** - create specific review tasks for known issues only
- **"Improve quality" tasks** - instead, create tasks for specific quality problems
- **Routine maintenance** unless there are specific identified issues
- **Placeholder tasks** - only create tasks when work is ready to begin
- **Meta-tasks** like "create more tasks" or "organize project"
- **Exploration without direction** - require specific research questions
- **Performance tasks without metrics** - must have measurable targets
- **Documentation tasks without gaps** - only for identified missing information

**VAGUE TASK EXAMPLES TO NEVER CREATE:**
- ❌ "Review authentication system"
- ❌ "Improve error handling"
- ❌ "Optimize database queries"
- ❌ "Clean up code structure"
- ❌ "Enhance user interface"
- ❌ "Update project documentation"
- ❌ "Refactor legacy components"

**SPECIFIC ALTERNATIVES TO CREATE INSTEAD:**
- ✅ "Fix JWT token validation bug in login endpoint"
- ✅ "Add try-catch blocks to payment processing functions"
- ✅ "Reduce user search query response time from 5s to <2s"
- ✅ "Extract duplicate validation logic into shared utility functions"
- ✅ "Add loading states to dashboard data tables"
- ✅ "Document API rate limiting configuration in README"
- ✅ "Migrate user model from class-based to functional component"

### 🚨 TASK CREATION RED FLAGS (IMMEDIATE REJECTION CRITERIA)

**REJECT TASKS IMMEDIATELY IF:**
- **Vague titles** like "Review X" or "Improve Y" without specific goals
- **No clear success criteria** or measurable deliverables
- **Created for task count** rather than organizing actual work
- **Duplicate existing work** covered by TODO items or project management
- **Overlapping scope** that could be combined into one focused task
- **Generic improvement language** without identified specific problems
- **Open-ended exploration** without defined research questions
- **Maintenance directives** without specific issues or failure points

**VAGUE TASK DETECTION PATTERNS:**
- Contains words: "improve", "enhance", "review", "optimize", "clean", "update" without specifics
- No concrete deliverable mentioned
- Success criteria are subjective or unmeasurable
- Title could apply to any project or codebase
- No clear problem statement or user value

**QUALITY TEST**: If a task could be copy-pasted to any project and still make sense, it's too vague and must be REJECTED immediately.

### 🚨 CRITICAL: Vague Task Execution Prohibition

**ABSOLUTE RULE**: Agents must NEVER attempt to follow or execute vague tasks. When encountering vague tasks:

1. **IMMEDIATE IDENTIFICATION**: Recognize vague language patterns ("improve", "review", "enhance", "optimize" without specifics)
2. **MANDATORY REJECTION**: Skip vague tasks entirely - do not attempt execution
3. **SPECIFIC ALTERNATIVE CREATION**: If the underlying need is valid, create a specific task with concrete deliverables
4. **DOCUMENTATION**: Note why vague tasks were rejected in task management system

**ENFORCEMENT**: Attempting to follow vague tasks is considered a critical workflow failure and must be corrected immediately.

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

**🚨 CRITICAL**: Follow all CLAUDE.md thinking escalation and subagent coordination requirements throughout task creation.

### Task Creation Process

**Follow CLAUDE.md patterns for:**
- Thinking escalation based on complexity
- Subagent deployment and coordination 
- Quality assurance validation
- Documentation and research integration

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

## Mode-Specific Focus

This mode supplements CLAUDE.md with task creation decision frameworks, vague task rejection protocols, quality templates, and priority matrices specifically for structured task decomposition and validation.

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