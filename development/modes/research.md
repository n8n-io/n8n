# RESEARCH Mode Instructions

You are in RESEARCH mode, focused on comprehensive evaluation and analysis with structured research methodologies.

*Note: All core subagent coordination, parallel execution patterns, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds research-specific methodologies only.*

## Research Question Framework

### 1. Research Type Classification

#### Technology Evaluation Research
```
Core Questions:
├── What problems does this technology solve?
├── How does it compare to existing solutions?
├── What are the implementation requirements and constraints?
├── What are the long-term maintenance and scaling implications?
└── What are the security and compliance considerations?

Success Criteria:
- Technology comparison matrix with scoring criteria
- Implementation feasibility assessment
- Total cost of ownership analysis
- Risk/benefit trade-off evaluation
```

#### Architecture Decision Research
```
Core Questions:
├── What architectural patterns best fit the requirements?
├── How will this integrate with existing systems?
├── What are the performance and scalability implications?
├── What are the failure modes and recovery strategies?
└── How will this evolve with future requirements?

Success Criteria:
- Architecture decision record (ADR) document
- System integration diagram
- Performance benchmark projections
- Failure mode analysis and recovery procedures
```

#### Problem Investigation Research
```
Core Questions:
├── What is the root cause of the issue?
├── What are the contributing factors and dependencies?
├── What are the potential solutions and their trade-offs?
├── What is the impact of not addressing this issue?
└── What are the testing and validation requirements?

Success Criteria:
- Root cause analysis with evidence
- Solution options with implementation effort estimates
- Impact assessment (users, systems, business)
- Validation and testing strategy
```

### 2. Evidence Collection Methodology

#### Quantitative Evidence Collection
- **Performance Metrics**: Response times, throughput, resource utilization
- **Usage Analytics**: User behavior patterns, feature adoption rates
- **System Metrics**: Error rates, availability, capacity utilization
- **Business Metrics**: Cost analysis, time-to-market, ROI projections

#### Qualitative Evidence Collection
- **Code Analysis**: Architecture patterns, code quality, maintainability
- **Stakeholder Interviews**: User needs, business requirements, constraints
- **Industry Research**: Best practices, case studies, expert opinions
- **Competitive Analysis**: Feature comparisons, market positioning

#### Evidence Validation Framework
```
Primary Sources (Highest Reliability):
├── Direct measurement and testing
├── Production system monitoring
├── User feedback and analytics
└── Official documentation and specifications

Secondary Sources (Medium Reliability):
├── Industry benchmarks and reports
├── Peer code reviews and analysis
├── Community discussions and forums
└── Third-party evaluations and comparisons

Tertiary Sources (Requires Validation):
├── Marketing materials and vendor claims
├── Unverified community content
├── Outdated or deprecated information
└── Anecdotal evidence without data support
```

## Research Decision Criteria

### Technical Decision Framework
- **Functionality**: Does it meet all functional requirements?
- **Performance**: Does it meet performance and scalability needs?
- **Maintainability**: Can it be maintained and extended efficiently?
- **Integration**: How well does it integrate with existing systems?
- **Security**: Does it meet security and compliance requirements?

### Business Decision Framework
- **Cost**: What are the total implementation and ongoing costs?
- **Time**: How long will implementation and deployment take?
- **Risk**: What are the technical and business risks?
- **Strategic Alignment**: How well does it align with business goals?
- **Vendor/Community**: What is the long-term viability and support?

### Risk Assessment Matrix
```
High Impact, High Probability: AVOID - Find alternatives
High Impact, Low Probability: MITIGATE - Plan contingencies
Low Impact, High Probability: ACCEPT - Monitor and manage
Low Impact, Low Probability: IGNORE - Document for awareness
```

## Research Execution Patterns

### Parallel Research Strategy
```
Research Coordination Approach:
1. Break complex research into domain-specific areas
2. Delegate each area to specialized subagents simultaneously
3. Define consistent evaluation criteria across all areas
4. Synthesize findings into comprehensive analysis
5. Make recommendations based on integrated evidence
```

### Research Documentation Standards

#### Executive Summary Format
```markdown
# Research Summary: [Topic]

## Key Findings
- [3-5 bullet points of most important discoveries]

## Recommendation
- [Clear, actionable recommendation with rationale]

## Implementation Next Steps
- [Specific actions required to proceed]

## Risk Considerations
- [Primary risks and mitigation strategies]
```

#### Detailed Analysis Structure
```markdown
## Research Scope and Methodology
- Research questions addressed
- Evidence sources and collection methods
- Evaluation criteria and decision framework

## Findings and Analysis
- Quantitative data and metrics
- Qualitative observations and insights
- Comparative analysis of options

## Trade-off Analysis
- Benefits and advantages of each option
- Limitations and disadvantages
- Implementation effort and complexity

## Risk Assessment
- Technical risks and mitigation strategies
- Business risks and impact analysis
- Timeline and resource risks

## Recommendations and Rationale
- Primary recommendation with justification
- Alternative options and when to consider them
- Implementation roadmap and milestones
```

## Research Quality Assurance

### Evidence Validation Checklist
- [ ] **Source Reliability**: Evidence from credible, authoritative sources
- [ ] **Data Recency**: Information is current and relevant to project timeline
- [ ] **Context Relevance**: Evidence applies to project's specific context and constraints
- [ ] **Bias Assessment**: Potential biases in sources identified and accounted for
- [ ] **Completeness**: All major aspects of research question addressed

### Research Completeness Criteria
- [ ] **Multiple Perspectives**: Different viewpoints and approaches considered
- [ ] **Quantitative Support**: Numerical data supporting qualitative conclusions
- [ ] **Implementation Feasibility**: Practical aspects of implementation researched
- [ ] **Future Considerations**: Long-term implications and evolution path considered
- [ ] **Stakeholder Impact**: Effects on different stakeholders evaluated

## Research Output Standards

### Standardized Research Report Naming
All research reports MUST follow the standardized naming convention:

**Format**: `research-report-{task_id}.md`
**Location**: `./development/research-reports/` directory

**Examples**:
- `./development/research-reports/research-report-task-1.md`
- `./development/research-reports/research-report-task-1-sub-1.md`
- `./development/research-reports/research-report-quality-improvement-1753472873685.md`

### Research Report Template
```markdown
# Research Report: {Task Title}

**Task ID**: {task_id}
**Research Type**: [Technology Evaluation|Architecture Decision|Problem Investigation]
**Date**: {current_date}
**Researcher**: Claude Code

## Executive Summary
- [3-5 bullet points of most important discoveries]

## Research Scope and Methodology
- Research questions addressed
- Evidence sources and collection methods
- Evaluation criteria and decision framework

## Key Findings
[Detailed findings based on research type]

## Recommendation
- [Clear, actionable recommendation with rationale]

## Implementation Next Steps
- [Specific actions required to proceed]

## Risk Considerations
- [Primary risks and mitigation strategies]

## Supporting Evidence
[Links to sources, data, and analysis]
```

### Document Creation Instructions
When conducting research, ALWAYS create the standardized research report:

1. **Create the report file**: `./development/research-reports/research-report-{current_task_id}.md`
2. **Use the template above** with task-specific information
3. **Include comprehensive findings** following the research methodology
4. **Save all supporting evidence** and reference materials

### Decision Documentation Requirements
- **Architecture Decision Records (ADRs)**: For architectural choices
- **Technology Evaluation Reports**: For tool/framework selections
- **Investigation Reports**: For problem analysis and root cause determination
- **Feasibility Studies**: For new feature or integration assessments

### Knowledge Transfer Formats
- **Technical Briefings**: Concise summaries for development teams
- **Stakeholder Reports**: Business-focused summaries for leadership
- **Implementation Guides**: Step-by-step guidance for execution teams
- **Risk Registers**: Comprehensive risk documentation for project management

## Mode-Specific Focus

This mode supplements CLAUDE.md with research-specific question frameworks, evidence collection methodologies, and standardized research report templates for `./development/research-reports/` directory.