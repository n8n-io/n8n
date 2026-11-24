# Database Designer - POWERFUL Tier Skill

A comprehensive database design and analysis toolkit that provides expert-level schema analysis, index optimization, and migration generation capabilities for modern database systems.

## Features

### 🔍 Schema Analyzer
- **Normalization Analysis**: Automated detection of 1NF through BCNF violations
- **Data Type Optimization**: Identifies antipatterns and inappropriate types
- **Constraint Analysis**: Finds missing foreign keys, unique constraints, and checks
- **ERD Generation**: Creates Mermaid diagrams from DDL or JSON schema
- **Naming Convention Validation**: Ensures consistent naming patterns

### ⚡ Index Optimizer  
- **Missing Index Detection**: Identifies indexes needed for query patterns
- **Composite Index Design**: Optimizes column ordering for maximum efficiency
- **Redundancy Analysis**: Finds duplicate and overlapping indexes
- **Performance Modeling**: Estimates selectivity and query performance impact
- **Covering Index Recommendations**: Eliminates table lookups

### 🚀 Migration Generator
- **Zero-Downtime Migrations**: Implements expand-contract patterns
- **Schema Evolution**: Handles column changes, table renames, constraint updates
- **Data Migration Scripts**: Automated data transformation and validation
- **Rollback Planning**: Complete reversal capabilities for all changes
- **Execution Orchestration**: Dependency-aware migration ordering

## Quick Start

### Prerequisites
- Python 3.7+ (no external dependencies required)
- Database schema in SQL DDL format or JSON
- Query patterns (for index optimization)

### Installation
```bash
# Clone or download the database-designer skill
cd engineering/database-designer/

# Make scripts executable
chmod +x *.py
```

## Usage Examples

### Schema Analysis

**Analyze SQL DDL file:**
```bash
python schema_analyzer.py --input assets/sample_schema.sql --output-format text
```

**Generate ERD diagram:**
```bash
python schema_analyzer.py --input assets/sample_schema.sql --generate-erd --output analysis.txt
```

**JSON schema analysis:**
```bash
python schema_analyzer.py --input assets/sample_schema.json --output-format json --output results.json
```

### Index Optimization

**Basic index analysis:**
```bash
python index_optimizer.py --schema assets/sample_schema.json --queries assets/sample_query_patterns.json
```

**High-priority recommendations only:**
```bash
python index_optimizer.py --schema assets/sample_schema.json --queries assets/sample_query_patterns.json --min-priority 2
```

**JSON output with existing index analysis:**
```bash
python index_optimizer.py --schema assets/sample_schema.json --queries assets/sample_query_patterns.json --format json --analyze-existing
```

### Migration Generation

**Generate migration between schemas:**
```bash
python migration_generator.py --current assets/current_schema.json --target assets/target_schema.json
```

**Zero-downtime migration:**
```bash
python migration_generator.py --current current.json --target target.json --zero-downtime --format sql
```

**Include validation queries:**
```bash
python migration_generator.py --current current.json --target target.json --include-validations --output migration_plan.txt
```

## Tool Documentation

### Schema Analyzer

**Input Formats:**
- SQL DDL files (.sql)
- JSON schema definitions (.json)

**Key Capabilities:**
- Detects 1NF violations (non-atomic values, repeating groups)
- Identifies 2NF issues (partial dependencies in composite keys)
- Finds 3NF problems (transitive dependencies)
- Checks BCNF compliance (determinant key requirements)
- Validates data types (VARCHAR(255) antipattern, inappropriate types)
- Missing constraints (NOT NULL, UNIQUE, CHECK, foreign keys)
- Naming convention adherence

**Sample Command:**
```bash
python schema_analyzer.py \
  --input sample_schema.sql \
  --generate-erd \
  --output-format text \
  --output analysis.txt
```

**Output:**
- Comprehensive text or JSON analysis report
- Mermaid ERD diagram
- Prioritized recommendations
- SQL statements for improvements

### Index Optimizer

**Input Requirements:**
- Schema definition (JSON format)
- Query patterns with frequency and selectivity data

**Analysis Features:**
- Selectivity estimation based on column patterns
- Composite index column ordering optimization  
- Covering index recommendations for SELECT queries
- Foreign key index validation
- Redundancy detection (duplicates, overlaps, unused indexes)
- Performance impact modeling

**Sample Command:**
```bash
python index_optimizer.py \
  --schema schema.json \
  --queries query_patterns.json \
  --format text \
  --min-priority 3 \
  --output recommendations.txt
```

**Output:**
- Prioritized index recommendations
- CREATE INDEX statements
- Drop statements for redundant indexes
- Performance impact analysis
- Storage size estimates

### Migration Generator

**Input Requirements:**
- Current schema (JSON format)
- Target schema (JSON format)

**Migration Strategies:**
- Standard migrations with ALTER statements
- Zero-downtime expand-contract patterns
- Data migration and transformation scripts
- Constraint management (add/drop in correct order)
- Index management with timing estimates

**Sample Command:**
```bash
python migration_generator.py \
  --current current_schema.json \
  --target target_schema.json \
  --zero-downtime \
  --include-validations \
  --format text
```

**Output:**
- Step-by-step migration plan
- Forward and rollback SQL statements
- Risk assessment for each step
- Validation queries
- Execution time estimates

## File Structure

```
database-designer/
├── README.md                          # This file
├── SKILL.md                          # Comprehensive database design guide
├── schema_analyzer.py                # Schema analysis tool
├── index_optimizer.py                # Index optimization tool  
├── migration_generator.py            # Migration generation tool
├── references/                       # Reference documentation
│   ├── normalization_guide.md        # Normalization principles and patterns
│   ├── index_strategy_patterns.md    # Index design and optimization guide
│   └── database_selection_decision_tree.md # Database technology selection
├── assets/                           # Sample files and test data
│   ├── sample_schema.sql            # Sample DDL with various issues
│   ├── sample_schema.json           # JSON schema definition
│   └── sample_query_patterns.json   # Query patterns for index analysis
└── expected_outputs/                 # Example tool outputs
    ├── schema_analysis_sample.txt   # Sample schema analysis report
    ├── index_optimization_sample.txt # Sample index recommendations
    └── migration_sample.txt         # Sample migration plan
```

## JSON Schema Format

The tools use a standardized JSON format for schema definitions:

```json
{
  "tables": {
    "table_name": {
      "columns": {
        "column_name": {
          "type": "VARCHAR(255)",
          "nullable": true,
          "unique": false,
          "foreign_key": "other_table.column",
          "default": "default_value",
          "cardinality_estimate": 1000
        }
      },
      "primary_key": ["id"],
      "unique_constraints": [["email"], ["username"]],
      "check_constraints": {
        "chk_positive_price": "price > 0"
      },
      "indexes": [
        {
          "name": "idx_table_column",
          "columns": ["column_name"],
          "unique": false,
          "partial_condition": "status = 'active'"
        }
      ]
    }
  }
}
```

## Query Patterns Format

For index optimization, provide query patterns in this format:

```json
{
  "queries": [
    {
      "id": "user_lookup",
      "type": "SELECT",
      "table": "users",
      "where_conditions": [
        {
          "column": "email",
          "operator": "=",
          "selectivity": 0.95
        }
      ],
      "join_conditions": [
        {
          "local_column": "user_id",
          "foreign_table": "orders",
          "foreign_column": "id",
          "join_type": "INNER"
        }
      ],
      "order_by": [
        {"column": "created_at", "direction": "DESC"}
      ],
      "frequency": 1000,
      "avg_execution_time_ms": 5.2
    }
  ]
}
```

## Best Practices

### Schema Analysis
1. **Start with DDL**: Use actual CREATE TABLE statements when possible
2. **Include Constraints**: Capture all existing constraints and indexes
3. **Consider History**: Some denormalization may be intentional for performance
4. **Validate Results**: Review recommendations against business requirements

### Index Optimization  
1. **Real Query Patterns**: Use actual application queries, not theoretical ones
2. **Include Frequency**: Query frequency is crucial for prioritization
3. **Monitor Performance**: Validate recommendations with actual performance testing
4. **Gradual Implementation**: Add indexes incrementally and monitor impact

### Migration Planning
1. **Test Migrations**: Always test on non-production environments first
2. **Backup First**: Ensure complete backups before running migrations
3. **Monitor Progress**: Watch for locks and performance impacts during execution
4. **Rollback Ready**: Have rollback procedures tested and ready

## Advanced Usage

### Custom Selectivity Estimation
The index optimizer uses pattern-based selectivity estimation. You can improve accuracy by providing cardinality estimates in your schema JSON:

```json
{
  "columns": {
    "status": {
      "type": "VARCHAR(20)",
      "cardinality_estimate": 5  # Only 5 distinct values
    }
  }
}
```

### Zero-Downtime Migration Strategy
For production systems, use the zero-downtime flag to generate expand-contract migrations:

1. **Expand Phase**: Add new columns/tables without constraints
2. **Dual Write**: Application writes to both old and new structures  
3. **Backfill**: Populate new structures with existing data
4. **Contract Phase**: Remove old structures after validation

### Integration with CI/CD
Integrate these tools into your deployment pipeline:

```bash
# Schema validation in CI
python schema_analyzer.py --input schema.sql --output-format json | \
  jq '.constraint_analysis.total_issues' | \
  test $(cat) -eq 0 || exit 1

# Generate migrations automatically
python migration_generator.py \
  --current prod_schema.json \
  --target new_schema.json \
  --zero-downtime \
  --output migration.sql
```

## Troubleshooting

### Common Issues

**"No tables found in input file"**
- Ensure SQL DDL uses standard CREATE TABLE syntax
- Check for syntax errors in DDL
- Verify file encoding (UTF-8 recommended)

**"Invalid JSON schema"**  
- Validate JSON syntax with a JSON validator
- Ensure all required fields are present
- Check that foreign key references use "table.column" format

**"Analysis shows no issues but problems exist"**
- Tools use heuristic analysis - review recommendations carefully
- Some design decisions may be intentional (denormalization for performance)
- Consider domain-specific requirements not captured by general rules

### Performance Tips

**Large Schemas:**
- Use `--output-format json` for machine processing
- Consider analyzing subsets of tables for very large schemas
- Provide cardinality estimates for better index recommendations

**Complex Queries:**
- Include actual execution times in query patterns
- Provide realistic frequency estimates
- Consider seasonal or usage pattern variations

## Contributing

This is a self-contained skill with no external dependencies. To extend functionality:

1. Follow the existing code patterns
2. Maintain Python standard library only requirement
3. Add comprehensive test cases for new features
4. Update documentation and examples

## License

This database designer skill is part of the claude-skills collection and follows the same licensing terms.