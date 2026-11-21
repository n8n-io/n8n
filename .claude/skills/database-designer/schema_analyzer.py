#!/usr/bin/env python3
"""
Database Schema Analyzer

Analyzes SQL DDL statements and JSON schema definitions for:
- Normalization level compliance (1NF-BCNF)
- Missing constraints (FK, NOT NULL, UNIQUE)
- Data type issues and antipatterns
- Naming convention violations
- Missing indexes on foreign key columns
- Table relationship mapping
- Generates Mermaid ERD diagrams

Input: SQL DDL file or JSON schema definition
Output: Analysis report + Mermaid ERD + recommendations

Usage:
    python schema_analyzer.py --input schema.sql --output-format json
    python schema_analyzer.py --input schema.json --output-format text
    python schema_analyzer.py --input schema.sql --generate-erd --output analysis.json
"""

import argparse
import json
import re
import sys
from collections import defaultdict, namedtuple
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, asdict


@dataclass
class Column:
    name: str
    data_type: str
    nullable: bool = True
    primary_key: bool = False
    unique: bool = False
    foreign_key: Optional[str] = None
    default_value: Optional[str] = None
    check_constraint: Optional[str] = None


@dataclass
class Index:
    name: str
    table: str
    columns: List[str]
    unique: bool = False
    index_type: str = "btree"


@dataclass
class Table:
    name: str
    columns: List[Column]
    primary_key: List[str]
    foreign_keys: List[Tuple[str, str]]  # (column, referenced_table.column)
    unique_constraints: List[List[str]]
    check_constraints: Dict[str, str]
    indexes: List[Index]


@dataclass
class NormalizationIssue:
    table: str
    issue_type: str
    severity: str
    description: str
    suggestion: str
    columns_affected: List[str]


@dataclass
class DataTypeIssue:
    table: str
    column: str
    current_type: str
    issue: str
    suggested_type: str
    rationale: str


@dataclass
class ConstraintIssue:
    table: str
    issue_type: str
    severity: str
    description: str
    suggestion: str
    columns_affected: List[str]


@dataclass
class NamingIssue:
    table: str
    column: Optional[str]
    issue: str
    current_name: str
    suggested_name: str


class SchemaAnalyzer:
    def __init__(self):
        self.tables: Dict[str, Table] = {}
        self.normalization_issues: List[NormalizationIssue] = []
        self.datatype_issues: List[DataTypeIssue] = []
        self.constraint_issues: List[ConstraintIssue] = []
        self.naming_issues: List[NamingIssue] = []
        
        # Data type antipatterns
        self.varchar_255_pattern = re.compile(r'VARCHAR\(255\)', re.IGNORECASE)
        self.bad_datetime_patterns = [
            re.compile(r'VARCHAR\(\d+\)', re.IGNORECASE),
            re.compile(r'CHAR\(\d+\)', re.IGNORECASE)
        ]
        
        # Naming conventions
        self.table_naming_pattern = re.compile(r'^[a-z][a-z0-9_]*[a-z0-9]$')
        self.column_naming_pattern = re.compile(r'^[a-z][a-z0-9_]*[a-z0-9]$')
        
    def parse_sql_ddl(self, ddl_content: str) -> None:
        """Parse SQL DDL statements and extract schema information."""
        # Remove comments and normalize whitespace
        ddl_content = re.sub(r'--.*$', '', ddl_content, flags=re.MULTILINE)
        ddl_content = re.sub(r'/\*.*?\*/', '', ddl_content, flags=re.DOTALL)
        ddl_content = re.sub(r'\s+', ' ', ddl_content.strip())
        
        # Extract CREATE TABLE statements
        create_table_pattern = re.compile(
            r'CREATE\s+TABLE\s+(\w+)\s*\(\s*(.*?)\s*\)',
            re.IGNORECASE | re.DOTALL
        )
        
        for match in create_table_pattern.finditer(ddl_content):
            table_name = match.group(1).lower()
            table_definition = match.group(2)
            
            table = self._parse_table_definition(table_name, table_definition)
            self.tables[table_name] = table
            
        # Extract CREATE INDEX statements
        self._parse_indexes(ddl_content)
        
    def _parse_table_definition(self, table_name: str, definition: str) -> Table:
        """Parse individual table definition."""
        columns = []
        primary_key = []
        foreign_keys = []
        unique_constraints = []
        check_constraints = {}
        
        # Split by commas, but handle nested parentheses
        parts = self._split_table_parts(definition)
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
                
            if part.upper().startswith('PRIMARY KEY'):
                primary_key = self._parse_primary_key(part)
            elif part.upper().startswith('FOREIGN KEY'):
                fk = self._parse_foreign_key(part)
                if fk:
                    foreign_keys.append(fk)
            elif part.upper().startswith('UNIQUE'):
                unique = self._parse_unique_constraint(part)
                if unique:
                    unique_constraints.append(unique)
            elif part.upper().startswith('CHECK'):
                check = self._parse_check_constraint(part)
                if check:
                    check_constraints.update(check)
            else:
                # Column definition
                column = self._parse_column_definition(part)
                if column:
                    columns.append(column)
                    if column.primary_key:
                        primary_key.append(column.name)
        
        return Table(
            name=table_name,
            columns=columns,
            primary_key=primary_key,
            foreign_keys=foreign_keys,
            unique_constraints=unique_constraints,
            check_constraints=check_constraints,
            indexes=[]
        )
    
    def _split_table_parts(self, definition: str) -> List[str]:
        """Split table definition by commas, respecting nested parentheses."""
        parts = []
        current_part = ""
        paren_count = 0
        
        for char in definition:
            if char == '(':
                paren_count += 1
            elif char == ')':
                paren_count -= 1
            elif char == ',' and paren_count == 0:
                parts.append(current_part.strip())
                current_part = ""
                continue
            
            current_part += char
        
        if current_part.strip():
            parts.append(current_part.strip())
            
        return parts
    
    def _parse_column_definition(self, definition: str) -> Optional[Column]:
        """Parse individual column definition."""
        # Pattern for column definition
        pattern = re.compile(
            r'(\w+)\s+([A-Z]+(?:\(\d+(?:,\d+)?\))?)\s*(.*)',
            re.IGNORECASE
        )
        
        match = pattern.match(definition.strip())
        if not match:
            return None
            
        column_name = match.group(1).lower()
        data_type = match.group(2).upper()
        constraints = match.group(3).upper() if match.group(3) else ""
        
        column = Column(
            name=column_name,
            data_type=data_type,
            nullable='NOT NULL' not in constraints,
            primary_key='PRIMARY KEY' in constraints,
            unique='UNIQUE' in constraints
        )
        
        # Parse foreign key reference
        fk_pattern = re.compile(r'REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)', re.IGNORECASE)
        fk_match = fk_pattern.search(constraints)
        if fk_match:
            column.foreign_key = f"{fk_match.group(1).lower()}.{fk_match.group(2).lower()}"
        
        # Parse default value
        default_pattern = re.compile(r'DEFAULT\s+([^,\s]+)', re.IGNORECASE)
        default_match = default_pattern.search(constraints)
        if default_match:
            column.default_value = default_match.group(1)
        
        return column
    
    def _parse_primary_key(self, definition: str) -> List[str]:
        """Parse PRIMARY KEY constraint."""
        pattern = re.compile(r'PRIMARY\s+KEY\s*\(\s*(.*?)\s*\)', re.IGNORECASE)
        match = pattern.search(definition)
        if match:
            columns = [col.strip().lower() for col in match.group(1).split(',')]
            return columns
        return []
    
    def _parse_foreign_key(self, definition: str) -> Optional[Tuple[str, str]]:
        """Parse FOREIGN KEY constraint."""
        pattern = re.compile(
            r'FOREIGN\s+KEY\s*\(\s*(\w+)\s*\)\s+REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)',
            re.IGNORECASE
        )
        match = pattern.search(definition)
        if match:
            column = match.group(1).lower()
            ref_table = match.group(2).lower()
            ref_column = match.group(3).lower()
            return (column, f"{ref_table}.{ref_column}")
        return None
    
    def _parse_unique_constraint(self, definition: str) -> Optional[List[str]]:
        """Parse UNIQUE constraint."""
        pattern = re.compile(r'UNIQUE\s*\(\s*(.*?)\s*\)', re.IGNORECASE)
        match = pattern.search(definition)
        if match:
            columns = [col.strip().lower() for col in match.group(1).split(',')]
            return columns
        return None
    
    def _parse_check_constraint(self, definition: str) -> Optional[Dict[str, str]]:
        """Parse CHECK constraint."""
        pattern = re.compile(r'CHECK\s*\(\s*(.*?)\s*\)', re.IGNORECASE)
        match = pattern.search(definition)
        if match:
            constraint_name = f"check_constraint_{len(self.tables)}"
            return {constraint_name: match.group(1)}
        return None
    
    def _parse_indexes(self, ddl_content: str) -> None:
        """Parse CREATE INDEX statements."""
        index_pattern = re.compile(
            r'CREATE\s+(?:(UNIQUE)\s+)?INDEX\s+(\w+)\s+ON\s+(\w+)\s*\(\s*(.*?)\s*\)',
            re.IGNORECASE
        )
        
        for match in index_pattern.finditer(ddl_content):
            unique = match.group(1) is not None
            index_name = match.group(2).lower()
            table_name = match.group(3).lower()
            columns_str = match.group(4)
            
            columns = [col.strip().lower() for col in columns_str.split(',')]
            
            index = Index(
                name=index_name,
                table=table_name,
                columns=columns,
                unique=unique
            )
            
            if table_name in self.tables:
                self.tables[table_name].indexes.append(index)
    
    def parse_json_schema(self, json_content: str) -> None:
        """Parse JSON schema definition."""
        try:
            schema = json.loads(json_content)
            
            if 'tables' not in schema:
                raise ValueError("JSON schema must contain 'tables' key")
            
            for table_name, table_def in schema['tables'].items():
                table = self._parse_json_table(table_name.lower(), table_def)
                self.tables[table_name.lower()] = table
                
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")
    
    def _parse_json_table(self, table_name: str, table_def: Dict[str, Any]) -> Table:
        """Parse JSON table definition."""
        columns = []
        primary_key = table_def.get('primary_key', [])
        foreign_keys = []
        unique_constraints = table_def.get('unique_constraints', [])
        check_constraints = table_def.get('check_constraints', {})
        
        for col_name, col_def in table_def.get('columns', {}).items():
            column = Column(
                name=col_name.lower(),
                data_type=col_def.get('type', 'VARCHAR(255)').upper(),
                nullable=col_def.get('nullable', True),
                primary_key=col_name.lower() in [pk.lower() for pk in primary_key],
                unique=col_def.get('unique', False),
                foreign_key=col_def.get('foreign_key'),
                default_value=col_def.get('default')
            )
            
            columns.append(column)
            
            if column.foreign_key:
                foreign_keys.append((column.name, column.foreign_key))
        
        return Table(
            name=table_name,
            columns=columns,
            primary_key=[pk.lower() for pk in primary_key],
            foreign_keys=foreign_keys,
            unique_constraints=unique_constraints,
            check_constraints=check_constraints,
            indexes=[]
        )
    
    def analyze_normalization(self) -> None:
        """Analyze normalization compliance."""
        for table_name, table in self.tables.items():
            self._check_first_normal_form(table)
            self._check_second_normal_form(table)
            self._check_third_normal_form(table)
            self._check_bcnf(table)
    
    def _check_first_normal_form(self, table: Table) -> None:
        """Check First Normal Form compliance."""
        # Check for atomic values (no arrays or delimited strings)
        for column in table.columns:
            if any(pattern in column.data_type.upper() for pattern in ['ARRAY', 'JSON', 'TEXT']):
                if 'JSON' in column.data_type.upper():
                    # JSON columns can violate 1NF if storing arrays
                    self.normalization_issues.append(NormalizationIssue(
                        table=table.name,
                        issue_type="1NF_VIOLATION",
                        severity="WARNING",
                        description=f"Column '{column.name}' uses JSON type which may contain non-atomic values",
                        suggestion="Consider normalizing JSON arrays into separate tables",
                        columns_affected=[column.name]
                    ))
            
            # Check for potential delimited values in VARCHAR/TEXT
            if column.data_type.upper().startswith(('VARCHAR', 'CHAR', 'TEXT')):
                if any(delimiter in column.name.lower() for delimiter in ['list', 'array', 'tags', 'items']):
                    self.normalization_issues.append(NormalizationIssue(
                        table=table.name,
                        issue_type="1NF_VIOLATION",
                        severity="HIGH",
                        description=f"Column '{column.name}' appears to store delimited values",
                        suggestion="Create separate table for individual values with foreign key relationship",
                        columns_affected=[column.name]
                    ))
    
    def _check_second_normal_form(self, table: Table) -> None:
        """Check Second Normal Form compliance."""
        if len(table.primary_key) <= 1:
            return  # 2NF only applies to tables with composite primary keys
        
        # Look for potential partial dependencies
        non_key_columns = [col for col in table.columns if col.name not in table.primary_key]
        
        for column in non_key_columns:
            # Heuristic: columns that seem related to only part of the composite key
            for pk_part in table.primary_key:
                if pk_part in column.name or column.name.startswith(pk_part.split('_')[0]):
                    self.normalization_issues.append(NormalizationIssue(
                        table=table.name,
                        issue_type="2NF_VIOLATION",
                        severity="MEDIUM",
                        description=f"Column '{column.name}' may have partial dependency on '{pk_part}'",
                        suggestion=f"Consider moving '{column.name}' to a separate table related to '{pk_part}'",
                        columns_affected=[column.name, pk_part]
                    ))
                    break
    
    def _check_third_normal_form(self, table: Table) -> None:
        """Check Third Normal Form compliance."""
        # Look for transitive dependencies
        non_key_columns = [col for col in table.columns if col.name not in table.primary_key]
        
        # Group columns by potential entities they describe
        entity_groups = defaultdict(list)
        for column in non_key_columns:
            # Simple heuristic: group by prefix before underscore
            prefix = column.name.split('_')[0]
            if prefix != column.name:  # Has underscore
                entity_groups[prefix].append(column.name)
        
        for entity, columns in entity_groups.items():
            if len(columns) > 1 and entity != table.name.split('_')[0]:
                # Potential entity that should be in its own table
                id_column = f"{entity}_id"
                if id_column in [col.name for col in table.columns]:
                    self.normalization_issues.append(NormalizationIssue(
                        table=table.name,
                        issue_type="3NF_VIOLATION",
                        severity="MEDIUM",
                        description=f"Columns {columns} may have transitive dependency through '{id_column}'",
                        suggestion=f"Consider creating separate '{entity}' table with these columns",
                        columns_affected=columns + [id_column]
                    ))
    
    def _check_bcnf(self, table: Table) -> None:
        """Check Boyce-Codd Normal Form compliance."""
        # BCNF violations are complex to detect without functional dependencies
        # Provide general guidance for composite keys
        if len(table.primary_key) > 2:
            self.normalization_issues.append(NormalizationIssue(
                table=table.name,
                issue_type="BCNF_WARNING",
                severity="LOW",
                description=f"Table has composite primary key with {len(table.primary_key)} columns",
                suggestion="Review functional dependencies to ensure BCNF compliance",
                columns_affected=table.primary_key
            ))
    
    def analyze_data_types(self) -> None:
        """Analyze data type usage for antipatterns."""
        for table_name, table in self.tables.items():
            for column in table.columns:
                self._check_varchar_255_antipattern(table.name, column)
                self._check_inappropriate_types(table.name, column)
                self._check_size_optimization(table.name, column)
    
    def _check_varchar_255_antipattern(self, table_name: str, column: Column) -> None:
        """Check for VARCHAR(255) antipattern."""
        if self.varchar_255_pattern.match(column.data_type):
            self.datatype_issues.append(DataTypeIssue(
                table=table_name,
                column=column.name,
                current_type=column.data_type,
                issue="VARCHAR(255) antipattern",
                suggested_type="Appropriately sized VARCHAR or TEXT",
                rationale="VARCHAR(255) is often used as default without considering actual data length requirements"
            ))
    
    def _check_inappropriate_types(self, table_name: str, column: Column) -> None:
        """Check for inappropriate data types."""
        # Date/time stored as string
        if column.name.lower() in ['date', 'time', 'created', 'updated', 'modified', 'timestamp']:
            if column.data_type.upper().startswith(('VARCHAR', 'CHAR', 'TEXT')):
                self.datatype_issues.append(DataTypeIssue(
                    table=table_name,
                    column=column.name,
                    current_type=column.data_type,
                    issue="Date/time stored as string",
                    suggested_type="TIMESTAMP, DATE, or TIME",
                    rationale="Proper date/time types enable date arithmetic and indexing optimization"
                ))
        
        # Boolean stored as string/integer
        if column.name.lower() in ['active', 'enabled', 'deleted', 'visible', 'published']:
            if not column.data_type.upper().startswith('BOOL'):
                self.datatype_issues.append(DataTypeIssue(
                    table=table_name,
                    column=column.name,
                    current_type=column.data_type,
                    issue="Boolean value stored as non-boolean type",
                    suggested_type="BOOLEAN",
                    rationale="Boolean type is more explicit and can be more storage efficient"
                ))
        
        # Numeric IDs as VARCHAR
        if column.name.lower().endswith('_id') or column.name.lower() == 'id':
            if column.data_type.upper().startswith(('VARCHAR', 'CHAR')):
                self.datatype_issues.append(DataTypeIssue(
                    table=table_name,
                    column=column.name,
                    current_type=column.data_type,
                    issue="Numeric ID stored as string",
                    suggested_type="INTEGER, BIGINT, or UUID",
                    rationale="Numeric types are more efficient for ID columns and enable better indexing"
                ))
    
    def _check_size_optimization(self, table_name: str, column: Column) -> None:
        """Check for size optimization opportunities."""
        # Oversized integer types
        if column.data_type.upper() == 'BIGINT':
            if not any(keyword in column.name.lower() for keyword in ['timestamp', 'big', 'large', 'count']):
                self.datatype_issues.append(DataTypeIssue(
                    table=table_name,
                    column=column.name,
                    current_type=column.data_type,
                    issue="Potentially oversized integer type",
                    suggested_type="INTEGER",
                    rationale="INTEGER is sufficient for most ID and count fields unless very large values are expected"
                ))
    
    def analyze_constraints(self) -> None:
        """Analyze missing constraints."""
        for table_name, table in self.tables.items():
            self._check_missing_primary_key(table)
            self._check_missing_foreign_key_constraints(table)
            self._check_missing_not_null_constraints(table)
            self._check_missing_unique_constraints(table)
            self._check_missing_check_constraints(table)
    
    def _check_missing_primary_key(self, table: Table) -> None:
        """Check for missing primary key."""
        if not table.primary_key:
            self.constraint_issues.append(ConstraintIssue(
                table=table.name,
                issue_type="MISSING_PRIMARY_KEY",
                severity="HIGH",
                description="Table has no primary key defined",
                suggestion="Add a primary key column (e.g., 'id' with auto-increment)",
                columns_affected=[]
            ))
    
    def _check_missing_foreign_key_constraints(self, table: Table) -> None:
        """Check for missing foreign key constraints."""
        for column in table.columns:
            if column.name.endswith('_id') and column.name != 'id':
                # Potential foreign key column
                if not column.foreign_key:
                    referenced_table = column.name[:-3]  # Remove '_id' suffix
                    if referenced_table in self.tables or referenced_table + 's' in self.tables:
                        self.constraint_issues.append(ConstraintIssue(
                            table=table.name,
                            issue_type="MISSING_FOREIGN_KEY",
                            severity="MEDIUM",
                            description=f"Column '{column.name}' appears to be a foreign key but has no constraint",
                            suggestion=f"Add foreign key constraint referencing {referenced_table} table",
                            columns_affected=[column.name]
                        ))
    
    def _check_missing_not_null_constraints(self, table: Table) -> None:
        """Check for missing NOT NULL constraints."""
        for column in table.columns:
            if column.nullable and column.name in ['email', 'name', 'title', 'status']:
                self.constraint_issues.append(ConstraintIssue(
                    table=table.name,
                    issue_type="MISSING_NOT_NULL",
                    severity="LOW",
                    description=f"Column '{column.name}' allows NULL but typically should not",
                    suggestion=f"Consider adding NOT NULL constraint to '{column.name}'",
                    columns_affected=[column.name]
                ))
    
    def _check_missing_unique_constraints(self, table: Table) -> None:
        """Check for missing unique constraints."""
        for column in table.columns:
            if column.name in ['email', 'username', 'slug', 'code'] and not column.unique:
                if column.name not in table.primary_key:
                    self.constraint_issues.append(ConstraintIssue(
                        table=table.name,
                        issue_type="MISSING_UNIQUE",
                        severity="MEDIUM",
                        description=f"Column '{column.name}' should likely have UNIQUE constraint",
                        suggestion=f"Add UNIQUE constraint to '{column.name}'",
                        columns_affected=[column.name]
                    ))
    
    def _check_missing_check_constraints(self, table: Table) -> None:
        """Check for missing check constraints."""
        for column in table.columns:
            # Email format validation
            if column.name == 'email' and 'email' not in str(table.check_constraints):
                self.constraint_issues.append(ConstraintIssue(
                    table=table.name,
                    issue_type="MISSING_CHECK_CONSTRAINT",
                    severity="LOW",
                    description=f"Email column lacks format validation",
                    suggestion="Add CHECK constraint for email format validation",
                    columns_affected=[column.name]
                ))
            
            # Positive values for counts, prices, etc.
            if column.name.lower() in ['price', 'amount', 'count', 'quantity', 'age']:
                if column.name not in str(table.check_constraints):
                    self.constraint_issues.append(ConstraintIssue(
                        table=table.name,
                        issue_type="MISSING_CHECK_CONSTRAINT",
                        severity="LOW",
                        description=f"Column '{column.name}' should validate positive values",
                        suggestion=f"Add CHECK constraint: {column.name} > 0",
                        columns_affected=[column.name]
                    ))
    
    def analyze_naming_conventions(self) -> None:
        """Analyze naming convention compliance."""
        for table_name, table in self.tables.items():
            self._check_table_naming(table_name)
            for column in table.columns:
                self._check_column_naming(table_name, column.name)
    
    def _check_table_naming(self, table_name: str) -> None:
        """Check table naming conventions."""
        if not self.table_naming_pattern.match(table_name):
            suggested_name = self._suggest_table_name(table_name)
            self.naming_issues.append(NamingIssue(
                table=table_name,
                column=None,
                issue="Invalid table naming convention",
                current_name=table_name,
                suggested_name=suggested_name
            ))
        
        # Check for plural naming
        if not table_name.endswith('s') and table_name not in ['data', 'information']:
            self.naming_issues.append(NamingIssue(
                table=table_name,
                column=None,
                issue="Table name should be plural",
                current_name=table_name,
                suggested_name=table_name + 's'
            ))
    
    def _check_column_naming(self, table_name: str, column_name: str) -> None:
        """Check column naming conventions."""
        if not self.column_naming_pattern.match(column_name):
            suggested_name = self._suggest_column_name(column_name)
            self.naming_issues.append(NamingIssue(
                table=table_name,
                column=column_name,
                issue="Invalid column naming convention",
                current_name=column_name,
                suggested_name=suggested_name
            ))
    
    def _suggest_table_name(self, table_name: str) -> str:
        """Suggest corrected table name."""
        # Convert to snake_case and make plural
        name = re.sub(r'([A-Z])', r'_\1', table_name).lower().strip('_')
        return name + 's' if not name.endswith('s') else name
    
    def _suggest_column_name(self, column_name: str) -> str:
        """Suggest corrected column name."""
        # Convert to snake_case
        return re.sub(r'([A-Z])', r'_\1', column_name).lower().strip('_')
    
    def check_missing_indexes(self) -> List[Dict[str, Any]]:
        """Check for missing indexes on foreign key columns."""
        missing_indexes = []
        
        for table_name, table in self.tables.items():
            existing_indexed_columns = set()
            
            # Collect existing indexed columns
            for index in table.indexes:
                existing_indexed_columns.update(index.columns)
            
            # Primary key columns are automatically indexed
            existing_indexed_columns.update(table.primary_key)
            
            # Check foreign key columns
            for column in table.columns:
                if column.foreign_key and column.name not in existing_indexed_columns:
                    missing_indexes.append({
                        'table': table_name,
                        'column': column.name,
                        'type': 'foreign_key',
                        'suggestion': f"CREATE INDEX idx_{table_name}_{column.name} ON {table_name} ({column.name});"
                    })
        
        return missing_indexes
    
    def generate_mermaid_erd(self) -> str:
        """Generate Mermaid ERD diagram."""
        erd_lines = ["erDiagram"]
        
        # Add table definitions
        for table_name, table in self.tables.items():
            erd_lines.append(f"    {table_name.upper()} {{")
            
            for column in table.columns:
                data_type = column.data_type
                constraints = []
                
                if column.primary_key:
                    constraints.append("PK")
                if column.foreign_key:
                    constraints.append("FK")
                if not column.nullable:
                    constraints.append("NOT NULL")
                if column.unique:
                    constraints.append("UNIQUE")
                
                constraint_str = " ".join(constraints)
                if constraint_str:
                    constraint_str = f" \"{constraint_str}\""
                
                erd_lines.append(f"        {data_type} {column.name}{constraint_str}")
            
            erd_lines.append("    }")
        
        # Add relationships
        relationships = set()
        for table_name, table in self.tables.items():
            for column in table.columns:
                if column.foreign_key:
                    ref_table = column.foreign_key.split('.')[0]
                    if ref_table in self.tables:
                        relationship = f"    {ref_table.upper()} ||--o{{ {table_name.upper()} : has"
                        relationships.add(relationship)
        
        erd_lines.extend(sorted(relationships))
        
        return "\n".join(erd_lines)
    
    def get_analysis_summary(self) -> Dict[str, Any]:
        """Get comprehensive analysis summary."""
        return {
            "schema_overview": {
                "total_tables": len(self.tables),
                "total_columns": sum(len(table.columns) for table in self.tables.values()),
                "tables_with_primary_keys": len([t for t in self.tables.values() if t.primary_key]),
                "total_foreign_keys": sum(len(table.foreign_keys) for table in self.tables.values()),
                "total_indexes": sum(len(table.indexes) for table in self.tables.values())
            },
            "normalization_analysis": {
                "total_issues": len(self.normalization_issues),
                "by_severity": {
                    "high": len([i for i in self.normalization_issues if i.severity == "HIGH"]),
                    "medium": len([i for i in self.normalization_issues if i.severity == "MEDIUM"]),
                    "low": len([i for i in self.normalization_issues if i.severity == "LOW"]),
                    "warning": len([i for i in self.normalization_issues if i.severity == "WARNING"])
                },
                "issues": [asdict(issue) for issue in self.normalization_issues]
            },
            "data_type_analysis": {
                "total_issues": len(self.datatype_issues),
                "issues": [asdict(issue) for issue in self.datatype_issues]
            },
            "constraint_analysis": {
                "total_issues": len(self.constraint_issues),
                "by_severity": {
                    "high": len([i for i in self.constraint_issues if i.severity == "HIGH"]),
                    "medium": len([i for i in self.constraint_issues if i.severity == "MEDIUM"]),
                    "low": len([i for i in self.constraint_issues if i.severity == "LOW"])
                },
                "issues": [asdict(issue) for issue in self.constraint_issues]
            },
            "naming_analysis": {
                "total_issues": len(self.naming_issues),
                "issues": [asdict(issue) for issue in self.naming_issues]
            },
            "missing_indexes": self.check_missing_indexes(),
            "recommendations": self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate high-level recommendations."""
        recommendations = []
        
        # High severity issues
        high_severity_issues = [
            i for i in self.normalization_issues + self.constraint_issues 
            if i.severity == "HIGH"
        ]
        
        if high_severity_issues:
            recommendations.append(f"Address {len(high_severity_issues)} high-severity issues immediately")
        
        # Missing primary keys
        tables_without_pk = [name for name, table in self.tables.items() if not table.primary_key]
        if tables_without_pk:
            recommendations.append(f"Add primary keys to tables: {', '.join(tables_without_pk)}")
        
        # Data type improvements
        varchar_255_issues = [i for i in self.datatype_issues if "VARCHAR(255)" in i.issue]
        if varchar_255_issues:
            recommendations.append(f"Review {len(varchar_255_issues)} VARCHAR(255) columns for right-sizing")
        
        # Missing foreign keys
        missing_fks = [i for i in self.constraint_issues if i.issue_type == "MISSING_FOREIGN_KEY"]
        if missing_fks:
            recommendations.append(f"Consider adding {len(missing_fks)} foreign key constraints for referential integrity")
        
        # Normalization improvements
        normalization_issues_count = len(self.normalization_issues)
        if normalization_issues_count > 0:
            recommendations.append(f"Review {normalization_issues_count} normalization issues for schema optimization")
        
        return recommendations
    
    def format_text_report(self, analysis: Dict[str, Any]) -> str:
        """Format analysis as human-readable text report."""
        lines = []
        lines.append("DATABASE SCHEMA ANALYSIS REPORT")
        lines.append("=" * 50)
        lines.append("")
        
        # Overview
        overview = analysis["schema_overview"]
        lines.append("SCHEMA OVERVIEW")
        lines.append("-" * 15)
        lines.append(f"Total Tables: {overview['total_tables']}")
        lines.append(f"Total Columns: {overview['total_columns']}")
        lines.append(f"Tables with Primary Keys: {overview['tables_with_primary_keys']}")
        lines.append(f"Total Foreign Keys: {overview['total_foreign_keys']}")
        lines.append(f"Total Indexes: {overview['total_indexes']}")
        lines.append("")
        
        # Recommendations
        if analysis["recommendations"]:
            lines.append("KEY RECOMMENDATIONS")
            lines.append("-" * 18)
            for i, rec in enumerate(analysis["recommendations"], 1):
                lines.append(f"{i}. {rec}")
            lines.append("")
        
        # Normalization Issues
        norm_analysis = analysis["normalization_analysis"]
        if norm_analysis["total_issues"] > 0:
            lines.append(f"NORMALIZATION ISSUES ({norm_analysis['total_issues']} total)")
            lines.append("-" * 25)
            severity_counts = norm_analysis["by_severity"]
            lines.append(f"High: {severity_counts['high']}, Medium: {severity_counts['medium']}, "
                        f"Low: {severity_counts['low']}, Warning: {severity_counts['warning']}")
            lines.append("")
            
            for issue in norm_analysis["issues"][:5]:  # Show first 5
                lines.append(f"• {issue['table']}: {issue['description']}")
                lines.append(f"  Suggestion: {issue['suggestion']}")
                lines.append("")
        
        # Data Type Issues
        dt_analysis = analysis["data_type_analysis"]
        if dt_analysis["total_issues"] > 0:
            lines.append(f"DATA TYPE ISSUES ({dt_analysis['total_issues']} total)")
            lines.append("-" * 20)
            for issue in dt_analysis["issues"][:5]:  # Show first 5
                lines.append(f"• {issue['table']}.{issue['column']}: {issue['issue']}")
                lines.append(f"  Current: {issue['current_type']} → Suggested: {issue['suggested_type']}")
                lines.append(f"  Rationale: {issue['rationale']}")
                lines.append("")
        
        # Constraint Issues
        const_analysis = analysis["constraint_analysis"]
        if const_analysis["total_issues"] > 0:
            lines.append(f"CONSTRAINT ISSUES ({const_analysis['total_issues']} total)")
            lines.append("-" * 20)
            severity_counts = const_analysis["by_severity"]
            lines.append(f"High: {severity_counts['high']}, Medium: {severity_counts['medium']}, "
                        f"Low: {severity_counts['low']}")
            lines.append("")
            
            for issue in const_analysis["issues"][:5]:  # Show first 5
                lines.append(f"• {issue['table']}: {issue['description']}")
                lines.append(f"  Suggestion: {issue['suggestion']}")
                lines.append("")
        
        # Missing Indexes
        missing_idx = analysis["missing_indexes"]
        if missing_idx:
            lines.append(f"MISSING INDEXES ({len(missing_idx)} total)")
            lines.append("-" * 17)
            for idx in missing_idx[:5]:  # Show first 5
                lines.append(f"• {idx['table']}.{idx['column']} ({idx['type']})")
                lines.append(f"  SQL: {idx['suggestion']}")
                lines.append("")
        
        return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Analyze database schema for design issues and generate ERD")
    parser.add_argument("--input", "-i", required=True, help="Input file (SQL DDL or JSON schema)")
    parser.add_argument("--output", "-o", help="Output file (default: stdout)")
    parser.add_argument("--output-format", "-f", choices=["json", "text"], default="text",
                       help="Output format")
    parser.add_argument("--generate-erd", "-e", action="store_true", help="Include Mermaid ERD in output")
    parser.add_argument("--erd-only", action="store_true", help="Output only the Mermaid ERD")
    
    args = parser.parse_args()
    
    try:
        # Read input file
        with open(args.input, 'r') as f:
            content = f.read()
        
        # Initialize analyzer
        analyzer = SchemaAnalyzer()
        
        # Parse input based on file extension
        if args.input.lower().endswith('.json'):
            analyzer.parse_json_schema(content)
        else:
            analyzer.parse_sql_ddl(content)
        
        if not analyzer.tables:
            print("Error: No tables found in input file", file=sys.stderr)
            return 1
        
        if args.erd_only:
            # Output only ERD
            erd = analyzer.generate_mermaid_erd()
            if args.output:
                with open(args.output, 'w') as f:
                    f.write(erd)
            else:
                print(erd)
            return 0
        
        # Perform analysis
        analyzer.analyze_normalization()
        analyzer.analyze_data_types()
        analyzer.analyze_constraints()
        analyzer.analyze_naming_conventions()
        
        # Generate report
        analysis = analyzer.get_analysis_summary()
        
        if args.generate_erd:
            analysis["mermaid_erd"] = analyzer.generate_mermaid_erd()
        
        # Output results
        if args.output_format == "json":
            output = json.dumps(analysis, indent=2)
        else:
            output = analyzer.format_text_report(analysis)
            if args.generate_erd:
                output += "\n\nMERMAID ERD\n" + "=" * 11 + "\n"
                output += analysis["mermaid_erd"]
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
        else:
            print(output)
        
        return 0
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())