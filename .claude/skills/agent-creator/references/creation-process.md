# Agent Creation Process

End-to-end workflow for creating production agents.

## Requirements Analysis

**Ask Critical Questions**:
- What domain expertise is needed?
- Who is the target user?
- What problems should this agent solve?
- What are the constraints (scope, complexity, context size)?
- How will this agent interact with others?

**Example Analysis**:
```
User Request: "Create an agent for database optimization"

Analysis:
- Domain: Database administration, query optimization, indexing
- User: Backend developers, DBAs
- Problems: Slow queries, inefficient schemas, scaling issues
- Scope: Focus on PostgreSQL/MySQL, common patterns
- Integration: Should work with code review agents
```

## Capability Mapping

**Core Competencies Structure**:
```markdown
## Core Competencies

### [Category 1]
- **[Skill A]**: Description, when to use, examples
- **[Skill B]**: Description, when to use, examples

### [Category 2]
- **[Skill C]**: Description, when to use, examples
```

**Problem-Solving Patterns**:
```markdown
## Common Problems & Solutions

### Problem: [Specific scenario]
**Approach**:
1. Step-by-step process
2. Key considerations
3. Code/examples
4. Validation method
```

## Rapid Prototyping Workflow

| Step | Time | Activity |
|------|------|----------|
| 1. Understand Need | 2 min | What capability is missing? |
| 2. Design Persona | 3 min | What expert would solve this? |
| 3. Map Knowledge | 10 min | What do they need to know? |
| 4. Create Structure | 5 min | Organize into template |
| 5. Add Examples | 10 min | Concrete, runnable code |
| 6. Write Documentation | 5 min | How to use it |
| 7. Test & Refine | 10 min | Validate with sample queries |

**Total Time**: ~45 minutes for a quality agent

## Agent Quality Checklist

### Expertise Quality
- [ ] Clear domain boundaries
- [ ] Specific, actionable guidance
- [ ] Real-world examples
- [ ] Common pitfalls covered
- [ ] Best practices with rationale

### Usability
- [ ] Clear mission statement
- [ ] Easy-to-scan structure
- [ ] Progressive detail disclosure
- [ ] Concrete code examples
- [ ] Appropriate tone and voice

### Integration
- [ ] Works standalone
- [ ] Can combine with other agents
- [ ] Clear input/output formats
- [ ] Proper error handling
- [ ] State management (if needed)

### Documentation
- [ ] Usage examples
- [ ] When to use this agent
- [ ] What problems it solves
- [ ] Integration patterns
- [ ] Limitations noted

## Meta-Learning: Improving Agent Design

### Feedback Loop
1. **Deploy**: Release agent
2. **Monitor**: Track usage patterns
3. **Analyze**: Identify gaps and issues
4. **Refine**: Update knowledge and patterns
5. **Iterate**: Continuous improvement

### Common Improvements
- Add missing domain knowledge
- Refine examples for clarity
- Improve error handling
- Optimize context usage
- Better integration patterns

## Example: SQL Optimization Agent

**User Request**: "I need an agent that can help with SQL query optimization"

**Agent Creation Process**:

1. **Requirements**: PostgreSQL/MySQL focus, query analysis, indexing advice
2. **Persona**: Senior DBA with 20 years experience
3. **Capabilities**: EXPLAIN analysis, index recommendations, query rewriting
4. **Structure**: Use technical expert template
5. **Knowledge**: Common anti-patterns, optimization techniques, example queries
6. **MCP Tool**: SQL parser and analyzer (optional)
7. **Documentation**: When to use, example optimizations

**Result**: Production-ready SQL optimization agent in ~45 minutes
