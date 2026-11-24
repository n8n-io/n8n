# Architecture Decision Record (ADR) Template
# Based on Michael Nygard's ADR format

```markdown
# ADR-NNN: [Short Title of Decision]

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Date

YYYY-MM-DD

## Context

[Describe the issue that motivates this decision. What is the problem we are trying to solve? What forces are at play? Include any constraints, requirements, or trade-offs that need to be considered.]

### Options Considered

1. **Option A** - Brief description
2. **Option B** - Brief description
3. **Option C** - Brief description

## Decision

[State the decision clearly. Use active voice: "We will use..." not "It was decided..."]

## Rationale

### Why [Chosen Option]

[Explain why this option was selected over alternatives. Include:]
- Key factors that led to this decision
- How it addresses the forces identified in Context
- Benefits this option provides

### Why Not [Other Options]

[Briefly explain why other options were rejected]
- **Option A**: [Reason for rejection]
- **Option B**: [Reason for rejection]

## Consequences

### Positive

[List the benefits and positive outcomes of this decision]
- Benefit 1
- Benefit 2
- Benefit 3

### Negative

[List the drawbacks and trade-offs accepted]
- Trade-off 1
- Trade-off 2

### Risks

[List any risks and mitigation strategies]
- **Risk 1**: [Description]
- **Mitigation**: [How we'll address this risk]

## Related Decisions

[List related ADRs]
- ADR-XXX: [Related decision title]
- ADR-YYY: [Another related decision]

## References

[Links to external resources, documentation, or research]
- [Link 1](url)
- [Link 2](url)
```

---

## Complete Example: Database Selection

```markdown
# ADR-001: Use PostgreSQL as Primary Database

## Status

Accepted

## Date

2024-01-15

## Context

We need to select a primary database for the application. The requirements are:
- ACID compliance for transactional integrity
- Support for JSON data alongside relational data
- Horizontal read scalability
- Strong ecosystem and tooling support
- Team familiarity

### Options Considered

1. **PostgreSQL** - Open-source relational database
2. **MySQL** - Open-source relational database
3. **MongoDB** - Document-oriented NoSQL database
4. **CockroachDB** - Distributed SQL database

## Decision

We will use PostgreSQL as our primary database.

## Rationale

### Why PostgreSQL

- **JSONB support**: Native JSON storage with indexing solves our semi-structured data needs without requiring a separate document store
- **Strong consistency**: ACID compliance ensures data integrity for financial transactions
- **Mature ecosystem**: Excellent tooling (pgAdmin, pg_dump, logical replication)
- **Extensions**: PostGIS for geospatial, pg_trgm for fuzzy search, timescaledb for time-series
- **Team experience**: 3 of 4 developers have PostgreSQL production experience
- **Read replicas**: Can scale reads horizontally when needed

### Why Not Others

- **MySQL**: Less capable JSON support, fewer advanced features
- **MongoDB**: Team unfamiliar, eventual consistency concerns for transactions
- **CockroachDB**: Overkill for current scale, higher operational complexity

## Consequences

### Positive

- Single database technology reduces operational overhead
- JSONB eliminates need for separate document store
- Strong hiring pool familiar with PostgreSQL
- Clear upgrade path to managed services (RDS, Cloud SQL)

### Negative

- Must manage schema migrations carefully
- Write scaling limited to vertical scaling initially
- Need to monitor connection pooling (pgBouncer may be needed)

### Risks

- **Data growth**: If data exceeds single-node capacity, will need sharding strategy
- **Mitigation**: Monitor growth, plan sharding evaluation at 500GB

## Related Decisions

- ADR-002: Connection pooling strategy
- ADR-003: Backup and recovery procedures

## References

- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [The Twelve-Factor App: Backing Services](https://12factor.net/backing-services)
```

---

## ADR Best Practices

### Naming Convention
- `ADR-001-use-postgresql-for-database.md`
- Numbered, lowercase, hyphen-separated

### When to Write an ADR
- Significant architectural decisions
- Technology selections
- Design pattern choices
- Security-critical decisions
- Anything someone might question later

### When NOT to Write an ADR
- Obvious choices with no alternatives
- Purely implementation details
- Temporary decisions during prototyping

### ADR Lifecycle
1. **Proposed** - Under discussion
2. **Accepted** - Decision made, in effect
3. **Deprecated** - No longer recommended but still exists
4. **Superseded** - Replaced by newer decision
