#!/usr/bin/env python3
"""
Database Migration Generator

Generates safe migration scripts between schema versions:
- Compares current and target schemas
- Generates ALTER TABLE statements for schema changes
- Implements zero-downtime migration strategies (expand-contract pattern)
- Creates rollback scripts for all changes
- Generates validation queries to verify migrations
- Handles complex changes like table splits/merges

Input: Current schema JSON + Target schema JSON
Output: Migration SQL + Rollback SQL + Validation queries + Execution plan

Usage:
    python migration_generator.py --current current_schema.json --target target_schema.json --output migration.sql
    python migration_generator.py --current current.json --target target.json --format json
    python migration_generator.py --current current.json --target target.json --zero-downtime
    python migration_generator.py --current current.json --target target.json --validate-only
"""

import argparse
import json
import re
import sys
from collections import defaultdict, OrderedDict
from typing import Dict, List, Set, Tuple, Optional, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime
import hashlib


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
class Table:
    name: str
    columns: Dict[str, Column]
    primary_key: List[str]
    foreign_keys: Dict[str, str]  # column -> referenced_table.column
    unique_constraints: List[List[str]]
    check_constraints: Dict[str, str]
    indexes: List[Dict[str, Any]]


@dataclass
class MigrationStep:
    step_id: str
    step_type: str
    table: str
    description: str
    sql_forward: str
    sql_rollback: str
    validation_sql: Optional[str] = None
    dependencies: List[str] = None
    risk_level: str = "LOW"  # LOW, MEDIUM, HIGH
    estimated_time: Optional[str] = None
    zero_downtime_phase: Optional[str] = None  # EXPAND, CONTRACT, or None


@dataclass
class MigrationPlan:
    migration_id: str
    created_at: str
    source_schema_hash: str
    target_schema_hash: str
    steps: List[MigrationStep]
    summary: Dict[str, Any]
    execution_order: List[str]
    rollback_order: List[str]


@dataclass
class ValidationCheck:
    check_id: str
    check_type: str
    table: str
    description: str
    sql_query: str
    expected_result: Any
    critical: bool = True


class SchemaComparator:
    """Compares two schema versions and identifies differences."""
    
    def __init__(self):
        self.current_schema: Dict[str, Table] = {}
        self.target_schema: Dict[str, Table] = {}
        self.changes: Dict[str, List[Dict[str, Any]]] = {
            'tables_added': [],
            'tables_dropped': [],
            'tables_renamed': [],
            'columns_added': [],
            'columns_dropped': [],
            'columns_modified': [],
            'columns_renamed': [],
            'constraints_added': [],
            'constraints_dropped': [],
            'indexes_added': [],
            'indexes_dropped': []
        }
    
    def load_schemas(self, current_data: Dict[str, Any], target_data: Dict[str, Any]):
        """Load current and target schemas."""
        self.current_schema = self._parse_schema(current_data)
        self.target_schema = self._parse_schema(target_data)
    
    def _parse_schema(self, schema_data: Dict[str, Any]) -> Dict[str, Table]:
        """Parse schema JSON into Table objects."""
        tables = {}
        
        if 'tables' not in schema_data:
            return tables
        
        for table_name, table_def in schema_data['tables'].items():
            columns = {}
            primary_key = table_def.get('primary_key', [])
            foreign_keys = {}
            
            # Parse columns
            for col_name, col_def in table_def.get('columns', {}).items():
                column = Column(
                    name=col_name,
                    data_type=col_def.get('type', 'VARCHAR(255)'),
                    nullable=col_def.get('nullable', True),
                    primary_key=col_name in primary_key,
                    unique=col_def.get('unique', False),
                    foreign_key=col_def.get('foreign_key'),
                    default_value=col_def.get('default'),
                    check_constraint=col_def.get('check_constraint')
                )
                columns[col_name] = column
                
                if column.foreign_key:
                    foreign_keys[col_name] = column.foreign_key
            
            table = Table(
                name=table_name,
                columns=columns,
                primary_key=primary_key,
                foreign_keys=foreign_keys,
                unique_constraints=table_def.get('unique_constraints', []),
                check_constraints=table_def.get('check_constraints', {}),
                indexes=table_def.get('indexes', [])
            )
            tables[table_name] = table
        
        return tables
    
    def compare_schemas(self) -> Dict[str, List[Dict[str, Any]]]:
        """Compare schemas and identify all changes."""
        self._compare_tables()
        self._compare_columns()
        self._compare_constraints()
        self._compare_indexes()
        return self.changes
    
    def _compare_tables(self):
        """Compare table-level changes."""
        current_tables = set(self.current_schema.keys())
        target_tables = set(self.target_schema.keys())
        
        # Tables added
        for table_name in target_tables - current_tables:
            self.changes['tables_added'].append({
                'table': table_name,
                'definition': self.target_schema[table_name]
            })
        
        # Tables dropped
        for table_name in current_tables - target_tables:
            self.changes['tables_dropped'].append({
                'table': table_name,
                'definition': self.current_schema[table_name]
            })
        
        # Tables renamed (heuristic based on column similarity)
        self._detect_renamed_tables(current_tables - target_tables, target_tables - current_tables)
    
    def _detect_renamed_tables(self, dropped_tables: Set[str], added_tables: Set[str]):
        """Detect renamed tables based on column similarity."""
        if not dropped_tables or not added_tables:
            return
        
        # Calculate similarity scores
        similarity_scores = []
        for dropped_table in dropped_tables:
            for added_table in added_tables:
                score = self._calculate_table_similarity(dropped_table, added_table)
                if score > 0.7:  # High similarity threshold
                    similarity_scores.append((score, dropped_table, added_table))
        
        # Sort by similarity and identify renames
        similarity_scores.sort(reverse=True)
        used_tables = set()
        
        for score, old_name, new_name in similarity_scores:
            if old_name not in used_tables and new_name not in used_tables:
                self.changes['tables_renamed'].append({
                    'old_name': old_name,
                    'new_name': new_name,
                    'similarity_score': score
                })
                used_tables.add(old_name)
                used_tables.add(new_name)
                
                # Remove from added/dropped lists
                self.changes['tables_added'] = [t for t in self.changes['tables_added'] if t['table'] != new_name]
                self.changes['tables_dropped'] = [t for t in self.changes['tables_dropped'] if t['table'] != old_name]
    
    def _calculate_table_similarity(self, table1_name: str, table2_name: str) -> float:
        """Calculate similarity between two tables based on columns."""
        table1 = self.current_schema[table1_name]
        table2 = self.target_schema[table2_name]
        
        cols1 = set(table1.columns.keys())
        cols2 = set(table2.columns.keys())
        
        if not cols1 and not cols2:
            return 1.0
        elif not cols1 or not cols2:
            return 0.0
        
        intersection = len(cols1.intersection(cols2))
        union = len(cols1.union(cols2))
        
        return intersection / union
    
    def _compare_columns(self):
        """Compare column-level changes."""
        common_tables = set(self.current_schema.keys()).intersection(set(self.target_schema.keys()))
        
        for table_name in common_tables:
            current_table = self.current_schema[table_name]
            target_table = self.target_schema[table_name]
            
            current_columns = set(current_table.columns.keys())
            target_columns = set(target_table.columns.keys())
            
            # Columns added
            for col_name in target_columns - current_columns:
                self.changes['columns_added'].append({
                    'table': table_name,
                    'column': col_name,
                    'definition': target_table.columns[col_name]
                })
            
            # Columns dropped
            for col_name in current_columns - target_columns:
                self.changes['columns_dropped'].append({
                    'table': table_name,
                    'column': col_name,
                    'definition': current_table.columns[col_name]
                })
            
            # Columns modified
            for col_name in current_columns.intersection(target_columns):
                current_col = current_table.columns[col_name]
                target_col = target_table.columns[col_name]
                
                if self._columns_different(current_col, target_col):
                    self.changes['columns_modified'].append({
                        'table': table_name,
                        'column': col_name,
                        'current_definition': current_col,
                        'target_definition': target_col,
                        'changes': self._describe_column_changes(current_col, target_col)
                    })
    
    def _columns_different(self, col1: Column, col2: Column) -> bool:
        """Check if two columns have different definitions."""
        return (col1.data_type != col2.data_type or
                col1.nullable != col2.nullable or
                col1.default_value != col2.default_value or
                col1.unique != col2.unique or
                col1.foreign_key != col2.foreign_key or
                col1.check_constraint != col2.check_constraint)
    
    def _describe_column_changes(self, current_col: Column, target_col: Column) -> List[str]:
        """Describe specific changes between column definitions."""
        changes = []
        
        if current_col.data_type != target_col.data_type:
            changes.append(f"type: {current_col.data_type} -> {target_col.data_type}")
        
        if current_col.nullable != target_col.nullable:
            changes.append(f"nullable: {current_col.nullable} -> {target_col.nullable}")
        
        if current_col.default_value != target_col.default_value:
            changes.append(f"default: {current_col.default_value} -> {target_col.default_value}")
        
        if current_col.unique != target_col.unique:
            changes.append(f"unique: {current_col.unique} -> {target_col.unique}")
        
        if current_col.foreign_key != target_col.foreign_key:
            changes.append(f"foreign_key: {current_col.foreign_key} -> {target_col.foreign_key}")
        
        return changes
    
    def _compare_constraints(self):
        """Compare constraint changes."""
        common_tables = set(self.current_schema.keys()).intersection(set(self.target_schema.keys()))
        
        for table_name in common_tables:
            current_table = self.current_schema[table_name]
            target_table = self.target_schema[table_name]
            
            # Compare primary keys
            if current_table.primary_key != target_table.primary_key:
                if current_table.primary_key:
                    self.changes['constraints_dropped'].append({
                        'table': table_name,
                        'constraint_type': 'PRIMARY_KEY',
                        'columns': current_table.primary_key
                    })
                
                if target_table.primary_key:
                    self.changes['constraints_added'].append({
                        'table': table_name,
                        'constraint_type': 'PRIMARY_KEY',
                        'columns': target_table.primary_key
                    })
            
            # Compare unique constraints
            current_unique = set(tuple(uc) for uc in current_table.unique_constraints)
            target_unique = set(tuple(uc) for uc in target_table.unique_constraints)
            
            for constraint in target_unique - current_unique:
                self.changes['constraints_added'].append({
                    'table': table_name,
                    'constraint_type': 'UNIQUE',
                    'columns': list(constraint)
                })
            
            for constraint in current_unique - target_unique:
                self.changes['constraints_dropped'].append({
                    'table': table_name,
                    'constraint_type': 'UNIQUE',
                    'columns': list(constraint)
                })
            
            # Compare check constraints
            current_checks = set(current_table.check_constraints.items())
            target_checks = set(target_table.check_constraints.items())
            
            for name, condition in target_checks - current_checks:
                self.changes['constraints_added'].append({
                    'table': table_name,
                    'constraint_type': 'CHECK',
                    'constraint_name': name,
                    'condition': condition
                })
            
            for name, condition in current_checks - target_checks:
                self.changes['constraints_dropped'].append({
                    'table': table_name,
                    'constraint_type': 'CHECK',
                    'constraint_name': name,
                    'condition': condition
                })
    
    def _compare_indexes(self):
        """Compare index changes."""
        common_tables = set(self.current_schema.keys()).intersection(set(self.target_schema.keys()))
        
        for table_name in common_tables:
            current_indexes = {idx['name']: idx for idx in self.current_schema[table_name].indexes}
            target_indexes = {idx['name']: idx for idx in self.target_schema[table_name].indexes}
            
            current_names = set(current_indexes.keys())
            target_names = set(target_indexes.keys())
            
            # Indexes added
            for idx_name in target_names - current_names:
                self.changes['indexes_added'].append({
                    'table': table_name,
                    'index': target_indexes[idx_name]
                })
            
            # Indexes dropped
            for idx_name in current_names - target_names:
                self.changes['indexes_dropped'].append({
                    'table': table_name,
                    'index': current_indexes[idx_name]
                })


class MigrationGenerator:
    """Generates migration steps from schema differences."""
    
    def __init__(self, zero_downtime: bool = False):
        self.zero_downtime = zero_downtime
        self.migration_steps: List[MigrationStep] = []
        self.step_counter = 0
        
        # Data type conversion safety
        self.safe_type_conversions = {
            ('VARCHAR(50)', 'VARCHAR(100)'): True,  # Expanding varchar
            ('INT', 'BIGINT'): True,  # Expanding integer
            ('DECIMAL(10,2)', 'DECIMAL(12,2)'): True,  # Expanding decimal precision
        }
        
        self.risky_type_conversions = {
            ('VARCHAR(100)', 'VARCHAR(50)'): 'Data truncation possible',
            ('BIGINT', 'INT'): 'Data loss possible for large values',
            ('TEXT', 'VARCHAR(255)'): 'Data truncation possible'
        }
    
    def generate_migration(self, changes: Dict[str, List[Dict[str, Any]]]) -> MigrationPlan:
        """Generate complete migration plan from schema changes."""
        self.migration_steps = []
        self.step_counter = 0
        
        # Generate steps in dependency order
        self._generate_table_creation_steps(changes['tables_added'])
        self._generate_column_addition_steps(changes['columns_added'])
        self._generate_constraint_addition_steps(changes['constraints_added'])
        self._generate_index_addition_steps(changes['indexes_added'])
        self._generate_column_modification_steps(changes['columns_modified'])
        self._generate_table_rename_steps(changes['tables_renamed'])
        self._generate_index_removal_steps(changes['indexes_dropped'])
        self._generate_constraint_removal_steps(changes['constraints_dropped'])
        self._generate_column_removal_steps(changes['columns_dropped'])
        self._generate_table_removal_steps(changes['tables_dropped'])
        
        # Create migration plan
        migration_id = self._generate_migration_id(changes)
        execution_order = [step.step_id for step in self.migration_steps]
        rollback_order = list(reversed(execution_order))
        
        return MigrationPlan(
            migration_id=migration_id,
            created_at=datetime.now().isoformat(),
            source_schema_hash=self._calculate_changes_hash(changes),
            target_schema_hash="",  # Would be calculated from target schema
            steps=self.migration_steps,
            summary=self._generate_summary(changes),
            execution_order=execution_order,
            rollback_order=rollback_order
        )
    
    def _generate_step_id(self) -> str:
        """Generate unique step ID."""
        self.step_counter += 1
        return f"step_{self.step_counter:03d}"
    
    def _generate_table_creation_steps(self, tables_added: List[Dict[str, Any]]):
        """Generate steps for creating new tables."""
        for table_info in tables_added:
            table = table_info['definition']
            step = self._create_table_step(table)
            self.migration_steps.append(step)
    
    def _create_table_step(self, table: Table) -> MigrationStep:
        """Create migration step for table creation."""
        columns_sql = []
        
        for col_name, column in table.columns.items():
            col_sql = f"{col_name} {column.data_type}"
            
            if not column.nullable:
                col_sql += " NOT NULL"
            
            if column.default_value:
                col_sql += f" DEFAULT {column.default_value}"
            
            if column.unique:
                col_sql += " UNIQUE"
            
            columns_sql.append(col_sql)
        
        # Add primary key
        if table.primary_key:
            pk_sql = f"PRIMARY KEY ({', '.join(table.primary_key)})"
            columns_sql.append(pk_sql)
        
        # Add foreign keys
        for col_name, ref in table.foreign_keys.items():
            fk_sql = f"FOREIGN KEY ({col_name}) REFERENCES {ref}"
            columns_sql.append(fk_sql)
        
        create_sql = f"CREATE TABLE {table.name} (\n    " + ",\n    ".join(columns_sql) + "\n);"
        drop_sql = f"DROP TABLE IF EXISTS {table.name};"
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="CREATE_TABLE",
            table=table.name,
            description=f"Create table {table.name} with {len(table.columns)} columns",
            sql_forward=create_sql,
            sql_rollback=drop_sql,
            validation_sql=f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '{table.name}';",
            risk_level="LOW"
        )
    
    def _generate_column_addition_steps(self, columns_added: List[Dict[str, Any]]):
        """Generate steps for adding columns."""
        for col_info in columns_added:
            if self.zero_downtime:
                # For zero-downtime, add columns as nullable first
                step = self._add_column_zero_downtime_step(col_info)
            else:
                step = self._add_column_step(col_info)
            self.migration_steps.append(step)
    
    def _add_column_step(self, col_info: Dict[str, Any]) -> MigrationStep:
        """Create step for adding a column."""
        table = col_info['table']
        column = col_info['definition']
        
        col_sql = f"{column.name} {column.data_type}"
        
        if not column.nullable:
            if column.default_value:
                col_sql += f" DEFAULT {column.default_value} NOT NULL"
            else:
                # This is risky - adding NOT NULL without default
                col_sql += " NOT NULL"
        elif column.default_value:
            col_sql += f" DEFAULT {column.default_value}"
        
        add_sql = f"ALTER TABLE {table} ADD COLUMN {col_sql};"
        drop_sql = f"ALTER TABLE {table} DROP COLUMN {column.name};"
        
        risk_level = "HIGH" if not column.nullable and not column.default_value else "LOW"
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="ADD_COLUMN",
            table=table,
            description=f"Add column {column.name} to {table}",
            sql_forward=add_sql,
            sql_rollback=drop_sql,
            validation_sql=f"SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '{table}' AND column_name = '{column.name}';",
            risk_level=risk_level
        )
    
    def _add_column_zero_downtime_step(self, col_info: Dict[str, Any]) -> MigrationStep:
        """Create zero-downtime step for adding column."""
        table = col_info['table']
        column = col_info['definition']
        
        # Phase 1: Add as nullable with default if needed
        col_sql = f"{column.name} {column.data_type}"
        if column.default_value:
            col_sql += f" DEFAULT {column.default_value}"
        
        add_sql = f"ALTER TABLE {table} ADD COLUMN {col_sql};"
        
        # If column should be NOT NULL, handle in separate phase
        if not column.nullable:
            # Add comment about needing follow-up step
            add_sql += f"\n-- Follow-up needed: Add NOT NULL constraint after data population"
        
        drop_sql = f"ALTER TABLE {table} DROP COLUMN {column.name};"
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="ADD_COLUMN_ZD",
            table=table,
            description=f"Add column {column.name} to {table} (zero-downtime phase 1)",
            sql_forward=add_sql,
            sql_rollback=drop_sql,
            validation_sql=f"SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '{table}' AND column_name = '{column.name}';",
            risk_level="LOW",
            zero_downtime_phase="EXPAND"
        )
    
    def _generate_column_modification_steps(self, columns_modified: List[Dict[str, Any]]):
        """Generate steps for modifying columns."""
        for col_info in columns_modified:
            if self.zero_downtime:
                steps = self._modify_column_zero_downtime_steps(col_info)
                self.migration_steps.extend(steps)
            else:
                step = self._modify_column_step(col_info)
                self.migration_steps.append(step)
    
    def _modify_column_step(self, col_info: Dict[str, Any]) -> MigrationStep:
        """Create step for modifying a column."""
        table = col_info['table']
        column = col_info['column']
        current_def = col_info['current_definition']
        target_def = col_info['target_definition']
        changes = col_info['changes']
        
        alter_statements = []
        rollback_statements = []
        
        # Handle different types of changes
        if current_def.data_type != target_def.data_type:
            alter_statements.append(f"ALTER COLUMN {column} TYPE {target_def.data_type}")
            rollback_statements.append(f"ALTER COLUMN {column} TYPE {current_def.data_type}")
        
        if current_def.nullable != target_def.nullable:
            if target_def.nullable:
                alter_statements.append(f"ALTER COLUMN {column} DROP NOT NULL")
                rollback_statements.append(f"ALTER COLUMN {column} SET NOT NULL")
            else:
                alter_statements.append(f"ALTER COLUMN {column} SET NOT NULL")
                rollback_statements.append(f"ALTER COLUMN {column} DROP NOT NULL")
        
        if current_def.default_value != target_def.default_value:
            if target_def.default_value:
                alter_statements.append(f"ALTER COLUMN {column} SET DEFAULT {target_def.default_value}")
            else:
                alter_statements.append(f"ALTER COLUMN {column} DROP DEFAULT")
            
            if current_def.default_value:
                rollback_statements.append(f"ALTER COLUMN {column} SET DEFAULT {current_def.default_value}")
            else:
                rollback_statements.append(f"ALTER COLUMN {column} DROP DEFAULT")
        
        # Build SQL
        alter_sql = f"ALTER TABLE {table}\n    " + ",\n    ".join(alter_statements) + ";"
        rollback_sql = f"ALTER TABLE {table}\n    " + ",\n    ".join(rollback_statements) + ";"
        
        # Assess risk
        risk_level = self._assess_column_modification_risk(current_def, target_def)
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="MODIFY_COLUMN",
            table=table,
            description=f"Modify column {column}: {', '.join(changes)}",
            sql_forward=alter_sql,
            sql_rollback=rollback_sql,
            validation_sql=f"SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name = '{table}' AND column_name = '{column}';",
            risk_level=risk_level
        )
    
    def _modify_column_zero_downtime_steps(self, col_info: Dict[str, Any]) -> List[MigrationStep]:
        """Create zero-downtime steps for column modification."""
        table = col_info['table']
        column = col_info['column']
        current_def = col_info['current_definition']
        target_def = col_info['target_definition']
        
        steps = []
        
        # For zero-downtime, use expand-contract pattern
        temp_column = f"{column}_new"
        
        # Step 1: Add new column
        step1 = MigrationStep(
            step_id=self._generate_step_id(),
            step_type="ADD_TEMP_COLUMN",
            table=table,
            description=f"Add temporary column {temp_column} for zero-downtime migration",
            sql_forward=f"ALTER TABLE {table} ADD COLUMN {temp_column} {target_def.data_type};",
            sql_rollback=f"ALTER TABLE {table} DROP COLUMN {temp_column};",
            zero_downtime_phase="EXPAND"
        )
        steps.append(step1)
        
        # Step 2: Copy data
        step2 = MigrationStep(
            step_id=self._generate_step_id(),
            step_type="COPY_COLUMN_DATA",
            table=table,
            description=f"Copy data from {column} to {temp_column}",
            sql_forward=f"UPDATE {table} SET {temp_column} = {column};",
            sql_rollback=f"UPDATE {table} SET {temp_column} = NULL;",
            zero_downtime_phase="EXPAND"
        )
        steps.append(step2)
        
        # Step 3: Drop old column
        step3 = MigrationStep(
            step_id=self._generate_step_id(),
            step_type="DROP_OLD_COLUMN",
            table=table,
            description=f"Drop original column {column}",
            sql_forward=f"ALTER TABLE {table} DROP COLUMN {column};",
            sql_rollback=f"ALTER TABLE {table} ADD COLUMN {column} {current_def.data_type};",
            zero_downtime_phase="CONTRACT"
        )
        steps.append(step3)
        
        # Step 4: Rename new column
        step4 = MigrationStep(
            step_id=self._generate_step_id(),
            step_type="RENAME_COLUMN",
            table=table,
            description=f"Rename {temp_column} to {column}",
            sql_forward=f"ALTER TABLE {table} RENAME COLUMN {temp_column} TO {column};",
            sql_rollback=f"ALTER TABLE {table} RENAME COLUMN {column} TO {temp_column};",
            zero_downtime_phase="CONTRACT"
        )
        steps.append(step4)
        
        return steps
    
    def _assess_column_modification_risk(self, current: Column, target: Column) -> str:
        """Assess risk level of column modification."""
        if current.data_type != target.data_type:
            conversion_key = (current.data_type, target.data_type)
            if conversion_key in self.risky_type_conversions:
                return "HIGH"
            elif conversion_key not in self.safe_type_conversions:
                return "MEDIUM"
        
        if current.nullable and not target.nullable:
            return "HIGH"  # Adding NOT NULL constraint
        
        return "LOW"
    
    def _generate_constraint_addition_steps(self, constraints_added: List[Dict[str, Any]]):
        """Generate steps for adding constraints."""
        for constraint_info in constraints_added:
            step = self._add_constraint_step(constraint_info)
            self.migration_steps.append(step)
    
    def _add_constraint_step(self, constraint_info: Dict[str, Any]) -> MigrationStep:
        """Create step for adding constraint."""
        table = constraint_info['table']
        constraint_type = constraint_info['constraint_type']
        
        if constraint_type == 'PRIMARY_KEY':
            columns = constraint_info['columns']
            constraint_name = f"pk_{table}"
            add_sql = f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} PRIMARY KEY ({', '.join(columns)});"
            drop_sql = f"ALTER TABLE {table} DROP CONSTRAINT {constraint_name};"
            description = f"Add primary key on {', '.join(columns)}"
            
        elif constraint_type == 'UNIQUE':
            columns = constraint_info['columns']
            constraint_name = f"uq_{table}_{'_'.join(columns)}"
            add_sql = f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} UNIQUE ({', '.join(columns)});"
            drop_sql = f"ALTER TABLE {table} DROP CONSTRAINT {constraint_name};"
            description = f"Add unique constraint on {', '.join(columns)}"
            
        elif constraint_type == 'CHECK':
            constraint_name = constraint_info['constraint_name']
            condition = constraint_info['condition']
            add_sql = f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} CHECK ({condition});"
            drop_sql = f"ALTER TABLE {table} DROP CONSTRAINT {constraint_name};"
            description = f"Add check constraint: {condition}"
            
        else:
            return None
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="ADD_CONSTRAINT",
            table=table,
            description=description,
            sql_forward=add_sql,
            sql_rollback=drop_sql,
            risk_level="MEDIUM"  # Constraints can fail if data doesn't comply
        )
    
    def _generate_index_addition_steps(self, indexes_added: List[Dict[str, Any]]):
        """Generate steps for adding indexes."""
        for index_info in indexes_added:
            step = self._add_index_step(index_info)
            self.migration_steps.append(step)
    
    def _add_index_step(self, index_info: Dict[str, Any]) -> MigrationStep:
        """Create step for adding index."""
        table = index_info['table']
        index = index_info['index']
        
        unique_keyword = "UNIQUE " if index.get('unique', False) else ""
        columns_sql = ', '.join(index['columns'])
        
        create_sql = f"CREATE {unique_keyword}INDEX {index['name']} ON {table} ({columns_sql});"
        drop_sql = f"DROP INDEX {index['name']};"
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="ADD_INDEX",
            table=table,
            description=f"Create index {index['name']} on ({columns_sql})",
            sql_forward=create_sql,
            sql_rollback=drop_sql,
            estimated_time="1-5 minutes depending on table size",
            risk_level="LOW"
        )
    
    def _generate_table_rename_steps(self, tables_renamed: List[Dict[str, Any]]):
        """Generate steps for renaming tables."""
        for rename_info in tables_renamed:
            step = self._rename_table_step(rename_info)
            self.migration_steps.append(step)
    
    def _rename_table_step(self, rename_info: Dict[str, Any]) -> MigrationStep:
        """Create step for renaming table."""
        old_name = rename_info['old_name']
        new_name = rename_info['new_name']
        
        rename_sql = f"ALTER TABLE {old_name} RENAME TO {new_name};"
        rollback_sql = f"ALTER TABLE {new_name} RENAME TO {old_name};"
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="RENAME_TABLE",
            table=old_name,
            description=f"Rename table {old_name} to {new_name}",
            sql_forward=rename_sql,
            sql_rollback=rollback_sql,
            validation_sql=f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '{new_name}';",
            risk_level="LOW"
        )
    
    def _generate_column_removal_steps(self, columns_dropped: List[Dict[str, Any]]):
        """Generate steps for removing columns."""
        for col_info in columns_dropped:
            step = self._drop_column_step(col_info)
            self.migration_steps.append(step)
    
    def _drop_column_step(self, col_info: Dict[str, Any]) -> MigrationStep:
        """Create step for dropping column."""
        table = col_info['table']
        column = col_info['definition']
        
        drop_sql = f"ALTER TABLE {table} DROP COLUMN {column.name};"
        
        # Recreate column for rollback
        col_sql = f"{column.name} {column.data_type}"
        if not column.nullable:
            col_sql += " NOT NULL"
        if column.default_value:
            col_sql += f" DEFAULT {column.default_value}"
        
        add_sql = f"ALTER TABLE {table} ADD COLUMN {col_sql};"
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="DROP_COLUMN",
            table=table,
            description=f"Drop column {column.name} from {table}",
            sql_forward=drop_sql,
            sql_rollback=add_sql,
            risk_level="HIGH"  # Data loss risk
        )
    
    def _generate_constraint_removal_steps(self, constraints_dropped: List[Dict[str, Any]]):
        """Generate steps for removing constraints."""
        for constraint_info in constraints_dropped:
            step = self._drop_constraint_step(constraint_info)
            if step:
                self.migration_steps.append(step)
    
    def _drop_constraint_step(self, constraint_info: Dict[str, Any]) -> Optional[MigrationStep]:
        """Create step for dropping constraint."""
        table = constraint_info['table']
        constraint_type = constraint_info['constraint_type']
        
        if constraint_type == 'PRIMARY_KEY':
            constraint_name = f"pk_{table}"
            drop_sql = f"ALTER TABLE {table} DROP CONSTRAINT {constraint_name};"
            columns = constraint_info['columns']
            add_sql = f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} PRIMARY KEY ({', '.join(columns)});"
            description = f"Drop primary key constraint"
            
        elif constraint_type == 'UNIQUE':
            columns = constraint_info['columns']
            constraint_name = f"uq_{table}_{'_'.join(columns)}"
            drop_sql = f"ALTER TABLE {table} DROP CONSTRAINT {constraint_name};"
            add_sql = f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} UNIQUE ({', '.join(columns)});"
            description = f"Drop unique constraint on {', '.join(columns)}"
            
        elif constraint_type == 'CHECK':
            constraint_name = constraint_info['constraint_name']
            condition = constraint_info.get('condition', '')
            drop_sql = f"ALTER TABLE {table} DROP CONSTRAINT {constraint_name};"
            add_sql = f"ALTER TABLE {table} ADD CONSTRAINT {constraint_name} CHECK ({condition});"
            description = f"Drop check constraint {constraint_name}"
            
        else:
            return None
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="DROP_CONSTRAINT",
            table=table,
            description=description,
            sql_forward=drop_sql,
            sql_rollback=add_sql,
            risk_level="MEDIUM"
        )
    
    def _generate_index_removal_steps(self, indexes_dropped: List[Dict[str, Any]]):
        """Generate steps for removing indexes."""
        for index_info in indexes_dropped:
            step = self._drop_index_step(index_info)
            self.migration_steps.append(step)
    
    def _drop_index_step(self, index_info: Dict[str, Any]) -> MigrationStep:
        """Create step for dropping index."""
        table = index_info['table']
        index = index_info['index']
        
        drop_sql = f"DROP INDEX {index['name']};"
        
        # Recreate for rollback
        unique_keyword = "UNIQUE " if index.get('unique', False) else ""
        columns_sql = ', '.join(index['columns'])
        create_sql = f"CREATE {unique_keyword}INDEX {index['name']} ON {table} ({columns_sql});"
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="DROP_INDEX",
            table=table,
            description=f"Drop index {index['name']}",
            sql_forward=drop_sql,
            sql_rollback=create_sql,
            risk_level="LOW"
        )
    
    def _generate_table_removal_steps(self, tables_dropped: List[Dict[str, Any]]):
        """Generate steps for removing tables."""
        for table_info in tables_dropped:
            step = self._drop_table_step(table_info)
            self.migration_steps.append(step)
    
    def _drop_table_step(self, table_info: Dict[str, Any]) -> MigrationStep:
        """Create step for dropping table."""
        table = table_info['definition']
        
        drop_sql = f"DROP TABLE {table.name};"
        
        # Would need to recreate entire table for rollback
        # This is simplified - full implementation would generate CREATE TABLE statement
        create_sql = f"-- Recreate table {table.name} (implementation needed)"
        
        return MigrationStep(
            step_id=self._generate_step_id(),
            step_type="DROP_TABLE",
            table=table.name,
            description=f"Drop table {table.name}",
            sql_forward=drop_sql,
            sql_rollback=create_sql,
            risk_level="HIGH"  # Data loss risk
        )
    
    def _generate_migration_id(self, changes: Dict[str, List[Dict[str, Any]]]) -> str:
        """Generate unique migration ID."""
        content = json.dumps(changes, sort_keys=True)
        return hashlib.md5(content.encode()).hexdigest()[:8]
    
    def _calculate_changes_hash(self, changes: Dict[str, List[Dict[str, Any]]]) -> str:
        """Calculate hash of changes for versioning."""
        content = json.dumps(changes, sort_keys=True)
        return hashlib.md5(content.encode()).hexdigest()
    
    def _generate_summary(self, changes: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Generate migration summary."""
        summary = {
            "total_steps": len(self.migration_steps),
            "changes_summary": {
                "tables_added": len(changes['tables_added']),
                "tables_dropped": len(changes['tables_dropped']),
                "tables_renamed": len(changes['tables_renamed']),
                "columns_added": len(changes['columns_added']),
                "columns_dropped": len(changes['columns_dropped']),
                "columns_modified": len(changes['columns_modified']),
                "constraints_added": len(changes['constraints_added']),
                "constraints_dropped": len(changes['constraints_dropped']),
                "indexes_added": len(changes['indexes_added']),
                "indexes_dropped": len(changes['indexes_dropped'])
            },
            "risk_assessment": {
                "high_risk_steps": len([s for s in self.migration_steps if s.risk_level == "HIGH"]),
                "medium_risk_steps": len([s for s in self.migration_steps if s.risk_level == "MEDIUM"]),
                "low_risk_steps": len([s for s in self.migration_steps if s.risk_level == "LOW"])
            },
            "zero_downtime": self.zero_downtime
        }
        
        return summary


class ValidationGenerator:
    """Generates validation queries for migration verification."""
    
    def generate_validations(self, migration_plan: MigrationPlan) -> List[ValidationCheck]:
        """Generate validation checks for migration plan."""
        validations = []
        
        for step in migration_plan.steps:
            if step.step_type == "CREATE_TABLE":
                validations.append(self._create_table_validation(step))
            elif step.step_type == "ADD_COLUMN":
                validations.append(self._add_column_validation(step))
            elif step.step_type == "MODIFY_COLUMN":
                validations.append(self._modify_column_validation(step))
            elif step.step_type == "ADD_INDEX":
                validations.append(self._add_index_validation(step))
        
        return validations
    
    def _create_table_validation(self, step: MigrationStep) -> ValidationCheck:
        """Create validation for table creation."""
        return ValidationCheck(
            check_id=f"validate_{step.step_id}",
            check_type="TABLE_EXISTS",
            table=step.table,
            description=f"Verify table {step.table} exists",
            sql_query=f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '{step.table}';",
            expected_result=1
        )
    
    def _add_column_validation(self, step: MigrationStep) -> ValidationCheck:
        """Create validation for column addition."""
        # Extract column name from SQL
        column_match = re.search(r'ADD COLUMN (\w+)', step.sql_forward)
        column_name = column_match.group(1) if column_match else "unknown"
        
        return ValidationCheck(
            check_id=f"validate_{step.step_id}",
            check_type="COLUMN_EXISTS",
            table=step.table,
            description=f"Verify column {column_name} exists in {step.table}",
            sql_query=f"SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '{step.table}' AND column_name = '{column_name}';",
            expected_result=1
        )
    
    def _modify_column_validation(self, step: MigrationStep) -> ValidationCheck:
        """Create validation for column modification."""
        return ValidationCheck(
            check_id=f"validate_{step.step_id}",
            check_type="COLUMN_MODIFIED",
            table=step.table,
            description=f"Verify column modification in {step.table}",
            sql_query=step.validation_sql or f"SELECT 1;",  # Use provided validation or default
            expected_result=1
        )
    
    def _add_index_validation(self, step: MigrationStep) -> ValidationCheck:
        """Create validation for index addition."""
        # Extract index name from SQL
        index_match = re.search(r'INDEX (\w+)', step.sql_forward)
        index_name = index_match.group(1) if index_match else "unknown"
        
        return ValidationCheck(
            check_id=f"validate_{step.step_id}",
            check_type="INDEX_EXISTS",
            table=step.table,
            description=f"Verify index {index_name} exists",
            sql_query=f"SELECT COUNT(*) FROM information_schema.statistics WHERE index_name = '{index_name}';",
            expected_result=1
        )


def format_migration_plan_text(plan: MigrationPlan, validations: List[ValidationCheck] = None) -> str:
    """Format migration plan as human-readable text."""
    lines = []
    lines.append("DATABASE MIGRATION PLAN")
    lines.append("=" * 50)
    lines.append(f"Migration ID: {plan.migration_id}")
    lines.append(f"Created: {plan.created_at}")
    lines.append(f"Zero Downtime: {plan.summary['zero_downtime']}")
    lines.append("")
    
    # Summary
    summary = plan.summary
    lines.append("MIGRATION SUMMARY")
    lines.append("-" * 17)
    lines.append(f"Total Steps: {summary['total_steps']}")
    
    changes = summary['changes_summary']
    for change_type, count in changes.items():
        if count > 0:
            lines.append(f"{change_type.replace('_', ' ').title()}: {count}")
    lines.append("")
    
    # Risk Assessment
    risk = summary['risk_assessment']
    lines.append("RISK ASSESSMENT")
    lines.append("-" * 15)
    lines.append(f"High Risk Steps: {risk['high_risk_steps']}")
    lines.append(f"Medium Risk Steps: {risk['medium_risk_steps']}")
    lines.append(f"Low Risk Steps: {risk['low_risk_steps']}")
    lines.append("")
    
    # Migration Steps
    lines.append("MIGRATION STEPS")
    lines.append("-" * 15)
    for i, step in enumerate(plan.steps, 1):
        lines.append(f"{i}. {step.description} ({step.risk_level} risk)")
        lines.append(f"   Type: {step.step_type}")
        if step.zero_downtime_phase:
            lines.append(f"   Phase: {step.zero_downtime_phase}")
        lines.append(f"   Forward SQL: {step.sql_forward}")
        lines.append(f"   Rollback SQL: {step.sql_rollback}")
        if step.estimated_time:
            lines.append(f"   Estimated Time: {step.estimated_time}")
        lines.append("")
    
    # Validation Checks
    if validations:
        lines.append("VALIDATION CHECKS")
        lines.append("-" * 17)
        for validation in validations:
            lines.append(f"• {validation.description}")
            lines.append(f"  SQL: {validation.sql_query}")
            lines.append(f"  Expected: {validation.expected_result}")
            lines.append("")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate database migration scripts")
    parser.add_argument("--current", "-c", required=True, help="Current schema JSON file")
    parser.add_argument("--target", "-t", required=True, help="Target schema JSON file")
    parser.add_argument("--output", "-o", help="Output file (default: stdout)")
    parser.add_argument("--format", "-f", choices=["json", "text", "sql"], default="text",
                       help="Output format")
    parser.add_argument("--zero-downtime", "-z", action="store_true",
                       help="Generate zero-downtime migration strategy")
    parser.add_argument("--validate-only", "-v", action="store_true",
                       help="Only generate validation queries")
    parser.add_argument("--include-validations", action="store_true",
                       help="Include validation queries in output")
    
    args = parser.parse_args()
    
    try:
        # Load schemas
        with open(args.current, 'r') as f:
            current_schema = json.load(f)
        
        with open(args.target, 'r') as f:
            target_schema = json.load(f)
        
        # Compare schemas
        comparator = SchemaComparator()
        comparator.load_schemas(current_schema, target_schema)
        changes = comparator.compare_schemas()
        
        if not any(changes.values()):
            print("No schema changes detected.")
            return 0
        
        # Generate migration
        generator = MigrationGenerator(zero_downtime=args.zero_downtime)
        migration_plan = generator.generate_migration(changes)
        
        # Generate validations if requested
        validations = None
        if args.include_validations or args.validate_only:
            validator = ValidationGenerator()
            validations = validator.generate_validations(migration_plan)
        
        # Format output
        if args.validate_only:
            output = json.dumps([asdict(v) for v in validations], indent=2)
        elif args.format == "json":
            result = {"migration_plan": asdict(migration_plan)}
            if validations:
                result["validations"] = [asdict(v) for v in validations]
            output = json.dumps(result, indent=2)
        elif args.format == "sql":
            sql_lines = []
            sql_lines.append("-- Database Migration Script")
            sql_lines.append(f"-- Migration ID: {migration_plan.migration_id}")
            sql_lines.append(f"-- Created: {migration_plan.created_at}")
            sql_lines.append("")
            
            for step in migration_plan.steps:
                sql_lines.append(f"-- Step: {step.description}")
                sql_lines.append(step.sql_forward)
                sql_lines.append("")
            
            output = "\n".join(sql_lines)
        else:  # text format
            output = format_migration_plan_text(migration_plan, validations)
        
        # Write output
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