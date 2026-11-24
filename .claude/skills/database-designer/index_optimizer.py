#!/usr/bin/env python3
"""
Database Index Optimizer

Analyzes schema definitions and query patterns to recommend optimal indexes:
- Identifies missing indexes for common query patterns
- Detects redundant and overlapping indexes
- Suggests composite index column ordering
- Estimates selectivity and performance impact
- Generates CREATE INDEX statements with rationale

Input: Schema JSON + Query patterns JSON
Output: Index recommendations + CREATE INDEX SQL + before/after analysis

Usage:
    python index_optimizer.py --schema schema.json --queries queries.json --output recommendations.json
    python index_optimizer.py --schema schema.json --queries queries.json --format text
    python index_optimizer.py --schema schema.json --queries queries.json --analyze-existing
"""

import argparse
import json
import re
import sys
from collections import defaultdict, namedtuple, Counter
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, asdict
import hashlib


@dataclass
class Column:
    name: str
    data_type: str
    nullable: bool = True
    unique: bool = False
    cardinality_estimate: Optional[int] = None


@dataclass
class Index:
    name: str
    table: str
    columns: List[str]
    unique: bool = False
    index_type: str = "btree"
    partial_condition: Optional[str] = None
    include_columns: List[str] = None
    size_estimate: Optional[int] = None


@dataclass
class QueryPattern:
    query_id: str
    query_type: str  # SELECT, INSERT, UPDATE, DELETE
    table: str
    where_conditions: List[Dict[str, Any]]
    join_conditions: List[Dict[str, Any]]
    order_by: List[Dict[str, str]]  # column, direction
    group_by: List[str]
    frequency: int = 1
    avg_execution_time_ms: Optional[float] = None


@dataclass
class IndexRecommendation:
    recommendation_id: str
    table: str
    recommended_index: Index
    reason: str
    query_patterns_helped: List[str]
    estimated_benefit: str
    estimated_overhead: str
    priority: int  # 1 = highest priority
    sql_statement: str
    selectivity_analysis: Dict[str, Any]


@dataclass
class RedundancyIssue:
    issue_type: str  # DUPLICATE, OVERLAPPING, UNUSED
    affected_indexes: List[str]
    table: str
    description: str
    recommendation: str
    sql_statements: List[str]


class SelectivityEstimator:
    """Estimates column selectivity based on naming patterns and data types."""
    
    def __init__(self):
        # Selectivity patterns based on common column names and types
        self.high_selectivity_patterns = [
            r'.*_id$', r'^id$', r'uuid', r'guid', r'email', r'username', r'ssn',
            r'account.*number', r'transaction.*id', r'reference.*number'
        ]
        
        self.medium_selectivity_patterns = [
            r'name$', r'title$', r'description$', r'address', r'phone', r'zip',
            r'postal.*code', r'serial.*number', r'sku', r'product.*code'
        ]
        
        self.low_selectivity_patterns = [
            r'status$', r'type$', r'category', r'state$', r'flag$', r'active$',
            r'enabled$', r'deleted$', r'visible$', r'gender$', r'priority$'
        ]
        
        self.very_low_selectivity_patterns = [
            r'is_.*', r'has_.*', r'can_.*', r'boolean', r'bool'
        ]
    
    def estimate_selectivity(self, column: Column, table_size_estimate: int = 10000) -> float:
        """Estimate column selectivity (0.0 = all same values, 1.0 = all unique values)."""
        column_name_lower = column.name.lower()
        
        # Primary key or unique columns
        if column.unique or column.name.lower() in ['id', 'uuid', 'guid']:
            return 1.0
        
        # Check cardinality estimate if available
        if column.cardinality_estimate:
            return min(column.cardinality_estimate / table_size_estimate, 1.0)
        
        # Pattern-based estimation
        for pattern in self.high_selectivity_patterns:
            if re.search(pattern, column_name_lower):
                return 0.9  # Very high selectivity
        
        for pattern in self.medium_selectivity_patterns:
            if re.search(pattern, column_name_lower):
                return 0.7  # Good selectivity
        
        for pattern in self.low_selectivity_patterns:
            if re.search(pattern, column_name_lower):
                return 0.2  # Poor selectivity
        
        for pattern in self.very_low_selectivity_patterns:
            if re.search(pattern, column_name_lower):
                return 0.1  # Very poor selectivity
        
        # Data type based estimation
        data_type_upper = column.data_type.upper()
        if data_type_upper.startswith('BOOL'):
            return 0.1
        elif data_type_upper.startswith(('TINYINT', 'SMALLINT')):
            return 0.3
        elif data_type_upper.startswith('INT'):
            return 0.8
        elif data_type_upper.startswith(('VARCHAR', 'TEXT')):
            # Estimate based on column name
            if 'name' in column_name_lower:
                return 0.7
            elif 'description' in column_name_lower or 'comment' in column_name_lower:
                return 0.9
            else:
                return 0.6
        
        # Default moderate selectivity
        return 0.5


class IndexOptimizer:
    def __init__(self):
        self.tables: Dict[str, Dict[str, Column]] = {}
        self.existing_indexes: Dict[str, List[Index]] = {}
        self.query_patterns: List[QueryPattern] = []
        self.selectivity_estimator = SelectivityEstimator()
        
        # Configuration
        self.max_composite_index_columns = 6
        self.min_selectivity_for_index = 0.1
        self.redundancy_overlap_threshold = 0.8
    
    def load_schema(self, schema_data: Dict[str, Any]) -> None:
        """Load schema definition."""
        if 'tables' not in schema_data:
            raise ValueError("Schema must contain 'tables' key")
        
        for table_name, table_def in schema_data['tables'].items():
            self.tables[table_name] = {}
            self.existing_indexes[table_name] = []
            
            # Load columns
            for col_name, col_def in table_def.get('columns', {}).items():
                column = Column(
                    name=col_name,
                    data_type=col_def.get('type', 'VARCHAR(255)'),
                    nullable=col_def.get('nullable', True),
                    unique=col_def.get('unique', False),
                    cardinality_estimate=col_def.get('cardinality_estimate')
                )
                self.tables[table_name][col_name] = column
            
            # Load existing indexes
            for idx_def in table_def.get('indexes', []):
                index = Index(
                    name=idx_def['name'],
                    table=table_name,
                    columns=idx_def['columns'],
                    unique=idx_def.get('unique', False),
                    index_type=idx_def.get('type', 'btree'),
                    partial_condition=idx_def.get('partial_condition'),
                    include_columns=idx_def.get('include_columns', [])
                )
                self.existing_indexes[table_name].append(index)
    
    def load_query_patterns(self, query_data: Dict[str, Any]) -> None:
        """Load query patterns for analysis."""
        if 'queries' not in query_data:
            raise ValueError("Query data must contain 'queries' key")
        
        for query_def in query_data['queries']:
            pattern = QueryPattern(
                query_id=query_def['id'],
                query_type=query_def.get('type', 'SELECT').upper(),
                table=query_def['table'],
                where_conditions=query_def.get('where_conditions', []),
                join_conditions=query_def.get('join_conditions', []),
                order_by=query_def.get('order_by', []),
                group_by=query_def.get('group_by', []),
                frequency=query_def.get('frequency', 1),
                avg_execution_time_ms=query_def.get('avg_execution_time_ms')
            )
            self.query_patterns.append(pattern)
    
    def analyze_missing_indexes(self) -> List[IndexRecommendation]:
        """Identify missing indexes based on query patterns."""
        recommendations = []
        
        for pattern in self.query_patterns:
            table_name = pattern.table
            if table_name not in self.tables:
                continue
            
            # Analyze WHERE conditions for single-column indexes
            for condition in pattern.where_conditions:
                column = condition.get('column')
                operator = condition.get('operator', '=')
                
                if column and column in self.tables[table_name]:
                    if not self._has_covering_index(table_name, [column]):
                        recommendation = self._create_single_column_recommendation(
                            table_name, column, pattern, operator
                        )
                        if recommendation:
                            recommendations.append(recommendation)
            
            # Analyze composite indexes for multi-column WHERE conditions
            where_columns = [cond.get('column') for cond in pattern.where_conditions 
                           if cond.get('column') and cond.get('column') in self.tables[table_name]]
            
            if len(where_columns) > 1:
                composite_recommendation = self._create_composite_recommendation(
                    table_name, where_columns, pattern
                )
                if composite_recommendation:
                    recommendations.append(composite_recommendation)
            
            # Analyze covering indexes for SELECT with ORDER BY
            if pattern.order_by and where_columns:
                covering_recommendation = self._create_covering_index_recommendation(
                    table_name, where_columns, pattern
                )
                if covering_recommendation:
                    recommendations.append(covering_recommendation)
            
            # Analyze JOIN conditions
            for join_condition in pattern.join_conditions:
                local_column = join_condition.get('local_column')
                if local_column and local_column in self.tables[table_name]:
                    if not self._has_covering_index(table_name, [local_column]):
                        recommendation = self._create_join_index_recommendation(
                            table_name, local_column, pattern, join_condition
                        )
                        if recommendation:
                            recommendations.append(recommendation)
        
        # Remove duplicates and prioritize
        recommendations = self._deduplicate_recommendations(recommendations)
        recommendations = self._prioritize_recommendations(recommendations)
        
        return recommendations
    
    def _has_covering_index(self, table_name: str, columns: List[str]) -> bool:
        """Check if existing indexes cover the specified columns."""
        if table_name not in self.existing_indexes:
            return False
        
        for index in self.existing_indexes[table_name]:
            # Check if index starts with required columns (prefix match for composite)
            if len(index.columns) >= len(columns):
                if index.columns[:len(columns)] == columns:
                    return True
        
        return False
    
    def _create_single_column_recommendation(
        self, 
        table_name: str, 
        column: str, 
        pattern: QueryPattern,
        operator: str
    ) -> Optional[IndexRecommendation]:
        """Create recommendation for single-column index."""
        column_obj = self.tables[table_name][column]
        selectivity = self.selectivity_estimator.estimate_selectivity(column_obj)
        
        # Skip very low selectivity columns unless frequently used
        if selectivity < self.min_selectivity_for_index and pattern.frequency < 100:
            return None
        
        index_name = f"idx_{table_name}_{column}"
        index = Index(
            name=index_name,
            table=table_name,
            columns=[column],
            unique=column_obj.unique,
            index_type="btree"
        )
        
        reason = f"Optimize WHERE {column} {operator} queries"
        if pattern.frequency > 10:
            reason += f" (used {pattern.frequency} times)"
        
        return IndexRecommendation(
            recommendation_id=self._generate_recommendation_id(table_name, [column]),
            table=table_name,
            recommended_index=index,
            reason=reason,
            query_patterns_helped=[pattern.query_id],
            estimated_benefit=self._estimate_benefit(selectivity, pattern.frequency),
            estimated_overhead="Low (single column)",
            priority=self._calculate_priority(selectivity, pattern.frequency, 1),
            sql_statement=f"CREATE INDEX {index_name} ON {table_name} ({column});",
            selectivity_analysis={
                "column_selectivity": selectivity,
                "estimated_reduction": f"{int(selectivity * 100)}%"
            }
        )
    
    def _create_composite_recommendation(
        self, 
        table_name: str, 
        columns: List[str], 
        pattern: QueryPattern
    ) -> Optional[IndexRecommendation]:
        """Create recommendation for composite index."""
        if len(columns) > self.max_composite_index_columns:
            columns = columns[:self.max_composite_index_columns]
        
        # Order columns by selectivity (most selective first)
        column_selectivities = []
        for col in columns:
            col_obj = self.tables[table_name][col]
            selectivity = self.selectivity_estimator.estimate_selectivity(col_obj)
            column_selectivities.append((col, selectivity))
        
        # Sort by selectivity descending
        column_selectivities.sort(key=lambda x: x[1], reverse=True)
        ordered_columns = [col for col, _ in column_selectivities]
        
        # Calculate combined selectivity
        combined_selectivity = min(sum(sel for _, sel in column_selectivities) / len(columns), 0.95)
        
        index_name = f"idx_{table_name}_{'_'.join(ordered_columns)}"
        if len(index_name) > 63:  # PostgreSQL limit
            index_name = f"idx_{table_name}_composite_{abs(hash('_'.join(ordered_columns))) % 10000}"
        
        index = Index(
            name=index_name,
            table=table_name,
            columns=ordered_columns,
            index_type="btree"
        )
        
        reason = f"Optimize multi-column WHERE conditions: {', '.join(ordered_columns)}"
        
        return IndexRecommendation(
            recommendation_id=self._generate_recommendation_id(table_name, ordered_columns),
            table=table_name,
            recommended_index=index,
            reason=reason,
            query_patterns_helped=[pattern.query_id],
            estimated_benefit=self._estimate_benefit(combined_selectivity, pattern.frequency),
            estimated_overhead=f"Medium (composite index with {len(ordered_columns)} columns)",
            priority=self._calculate_priority(combined_selectivity, pattern.frequency, len(ordered_columns)),
            sql_statement=f"CREATE INDEX {index_name} ON {table_name} ({', '.join(ordered_columns)});",
            selectivity_analysis={
                "column_selectivities": {col: sel for col, sel in column_selectivities},
                "combined_selectivity": combined_selectivity,
                "column_order_rationale": "Ordered by selectivity (most selective first)"
            }
        )
    
    def _create_covering_index_recommendation(
        self, 
        table_name: str, 
        where_columns: List[str], 
        pattern: QueryPattern
    ) -> Optional[IndexRecommendation]:
        """Create recommendation for covering index."""
        order_columns = [col['column'] for col in pattern.order_by if col['column'] in self.tables[table_name]]
        
        # Combine WHERE and ORDER BY columns
        index_columns = where_columns.copy()
        include_columns = []
        
        # Add ORDER BY columns to index columns
        for col in order_columns:
            if col not in index_columns:
                index_columns.append(col)
        
        # Limit index columns
        if len(index_columns) > self.max_composite_index_columns:
            include_columns = index_columns[self.max_composite_index_columns:]
            index_columns = index_columns[:self.max_composite_index_columns]
        
        index_name = f"idx_{table_name}_covering_{'_'.join(index_columns[:3])}"
        if len(index_name) > 63:
            index_name = f"idx_{table_name}_covering_{abs(hash('_'.join(index_columns))) % 10000}"
        
        index = Index(
            name=index_name,
            table=table_name,
            columns=index_columns,
            include_columns=include_columns,
            index_type="btree"
        )
        
        reason = f"Covering index for WHERE + ORDER BY optimization"
        
        # Calculate selectivity for main columns
        main_selectivity = 0.5  # Default for covering indexes
        if where_columns:
            selectivities = [
                self.selectivity_estimator.estimate_selectivity(self.tables[table_name][col])
                for col in where_columns[:2]  # Consider first 2 columns
            ]
            main_selectivity = max(selectivities)
        
        sql_parts = [f"CREATE INDEX {index_name} ON {table_name} ({', '.join(index_columns)})"]
        if include_columns:
            sql_parts.append(f" INCLUDE ({', '.join(include_columns)})")
        sql_statement = ''.join(sql_parts) + ";"
        
        return IndexRecommendation(
            recommendation_id=self._generate_recommendation_id(table_name, index_columns, "covering"),
            table=table_name,
            recommended_index=index,
            reason=reason,
            query_patterns_helped=[pattern.query_id],
            estimated_benefit="High (eliminates table lookups for SELECT)",
            estimated_overhead=f"High (covering index with {len(index_columns)} columns)",
            priority=self._calculate_priority(main_selectivity, pattern.frequency, len(index_columns)),
            sql_statement=sql_statement,
            selectivity_analysis={
                "main_columns_selectivity": main_selectivity,
                "covering_benefit": "Eliminates table lookup for SELECT queries"
            }
        )
    
    def _create_join_index_recommendation(
        self, 
        table_name: str, 
        column: str, 
        pattern: QueryPattern,
        join_condition: Dict[str, Any]
    ) -> Optional[IndexRecommendation]:
        """Create recommendation for JOIN optimization index."""
        column_obj = self.tables[table_name][column]
        selectivity = self.selectivity_estimator.estimate_selectivity(column_obj)
        
        index_name = f"idx_{table_name}_{column}_join"
        index = Index(
            name=index_name,
            table=table_name,
            columns=[column],
            index_type="btree"
        )
        
        foreign_table = join_condition.get('foreign_table', 'unknown')
        reason = f"Optimize JOIN with {foreign_table} table on {column}"
        
        return IndexRecommendation(
            recommendation_id=self._generate_recommendation_id(table_name, [column], "join"),
            table=table_name,
            recommended_index=index,
            reason=reason,
            query_patterns_helped=[pattern.query_id],
            estimated_benefit=self._estimate_join_benefit(pattern.frequency),
            estimated_overhead="Low (single column for JOIN)",
            priority=2,  # JOINs are generally high priority
            sql_statement=f"CREATE INDEX {index_name} ON {table_name} ({column});",
            selectivity_analysis={
                "column_selectivity": selectivity,
                "join_optimization": True
            }
        )
    
    def _generate_recommendation_id(self, table: str, columns: List[str], suffix: str = "") -> str:
        """Generate unique recommendation ID."""
        content = f"{table}_{'_'.join(sorted(columns))}_{suffix}"
        return hashlib.md5(content.encode()).hexdigest()[:8]
    
    def _estimate_benefit(self, selectivity: float, frequency: int) -> str:
        """Estimate performance benefit of index."""
        if selectivity > 0.8 and frequency > 50:
            return "Very High"
        elif selectivity > 0.6 and frequency > 20:
            return "High"
        elif selectivity > 0.4 or frequency > 10:
            return "Medium"
        else:
            return "Low"
    
    def _estimate_join_benefit(self, frequency: int) -> str:
        """Estimate benefit for JOIN indexes."""
        if frequency > 50:
            return "Very High (frequent JOINs)"
        elif frequency > 20:
            return "High (regular JOINs)"
        elif frequency > 5:
            return "Medium (occasional JOINs)"
        else:
            return "Low (rare JOINs)"
    
    def _calculate_priority(self, selectivity: float, frequency: int, column_count: int) -> int:
        """Calculate priority score (1 = highest priority)."""
        # Base score calculation
        score = 0
        
        # Selectivity contribution (0-50 points)
        score += int(selectivity * 50)
        
        # Frequency contribution (0-30 points)
        score += min(frequency, 30)
        
        # Penalty for complex indexes (subtract points)
        score -= (column_count - 1) * 5
        
        # Convert to priority levels
        if score >= 70:
            return 1  # Highest
        elif score >= 50:
            return 2  # High
        elif score >= 30:
            return 3  # Medium
        else:
            return 4  # Low
    
    def _deduplicate_recommendations(self, recommendations: List[IndexRecommendation]) -> List[IndexRecommendation]:
        """Remove duplicate recommendations."""
        seen_indexes = set()
        unique_recommendations = []
        
        for rec in recommendations:
            index_signature = (rec.table, tuple(rec.recommended_index.columns))
            if index_signature not in seen_indexes:
                seen_indexes.add(index_signature)
                unique_recommendations.append(rec)
            else:
                # Merge query patterns helped
                for existing_rec in unique_recommendations:
                    if (existing_rec.table == rec.table and 
                        existing_rec.recommended_index.columns == rec.recommended_index.columns):
                        existing_rec.query_patterns_helped.extend(rec.query_patterns_helped)
                        break
        
        return unique_recommendations
    
    def _prioritize_recommendations(self, recommendations: List[IndexRecommendation]) -> List[IndexRecommendation]:
        """Sort recommendations by priority."""
        return sorted(recommendations, key=lambda x: (x.priority, -len(x.query_patterns_helped)))
    
    def analyze_redundant_indexes(self) -> List[RedundancyIssue]:
        """Identify redundant, overlapping, and potentially unused indexes."""
        redundancy_issues = []
        
        for table_name, indexes in self.existing_indexes.items():
            if len(indexes) < 2:
                continue
            
            # Find duplicate indexes
            duplicates = self._find_duplicate_indexes(table_name, indexes)
            redundancy_issues.extend(duplicates)
            
            # Find overlapping indexes
            overlapping = self._find_overlapping_indexes(table_name, indexes)
            redundancy_issues.extend(overlapping)
            
            # Find potentially unused indexes
            unused = self._find_unused_indexes(table_name, indexes)
            redundancy_issues.extend(unused)
        
        return redundancy_issues
    
    def _find_duplicate_indexes(self, table_name: str, indexes: List[Index]) -> List[RedundancyIssue]:
        """Find exactly duplicate indexes."""
        issues = []
        seen_signatures = {}
        
        for index in indexes:
            signature = (tuple(index.columns), index.unique, index.partial_condition)
            if signature in seen_signatures:
                existing_index = seen_signatures[signature]
                issues.append(RedundancyIssue(
                    issue_type="DUPLICATE",
                    affected_indexes=[existing_index.name, index.name],
                    table=table_name,
                    description=f"Indexes '{existing_index.name}' and '{index.name}' are identical",
                    recommendation=f"Drop one of the duplicate indexes",
                    sql_statements=[f"DROP INDEX {index.name};"]
                ))
            else:
                seen_signatures[signature] = index
        
        return issues
    
    def _find_overlapping_indexes(self, table_name: str, indexes: List[Index]) -> List[RedundancyIssue]:
        """Find overlapping indexes that might be redundant."""
        issues = []
        
        for i, index1 in enumerate(indexes):
            for index2 in indexes[i+1:]:
                overlap_ratio = self._calculate_overlap_ratio(index1, index2)
                
                if overlap_ratio >= self.redundancy_overlap_threshold:
                    # Determine which index to keep
                    if len(index1.columns) <= len(index2.columns):
                        redundant_index = index1
                        keep_index = index2
                    else:
                        redundant_index = index2
                        keep_index = index1
                    
                    issues.append(RedundancyIssue(
                        issue_type="OVERLAPPING",
                        affected_indexes=[index1.name, index2.name],
                        table=table_name,
                        description=f"Index '{redundant_index.name}' overlaps {int(overlap_ratio * 100)}% "
                                   f"with '{keep_index.name}'",
                        recommendation=f"Consider dropping '{redundant_index.name}' as it's largely "
                                     f"covered by '{keep_index.name}'",
                        sql_statements=[f"DROP INDEX {redundant_index.name};"]
                    ))
        
        return issues
    
    def _calculate_overlap_ratio(self, index1: Index, index2: Index) -> float:
        """Calculate overlap ratio between two indexes."""
        cols1 = set(index1.columns)
        cols2 = set(index2.columns)
        
        if not cols1 or not cols2:
            return 0.0
        
        intersection = len(cols1.intersection(cols2))
        union = len(cols1.union(cols2))
        
        return intersection / union if union > 0 else 0.0
    
    def _find_unused_indexes(self, table_name: str, indexes: List[Index]) -> List[RedundancyIssue]:
        """Find potentially unused indexes based on query patterns."""
        issues = []
        
        # Collect all columns used in query patterns for this table
        used_columns = set()
        table_patterns = [p for p in self.query_patterns if p.table == table_name]
        
        for pattern in table_patterns:
            # Add WHERE condition columns
            for condition in pattern.where_conditions:
                if condition.get('column'):
                    used_columns.add(condition['column'])
            
            # Add JOIN columns
            for join in pattern.join_conditions:
                if join.get('local_column'):
                    used_columns.add(join['local_column'])
            
            # Add ORDER BY columns
            for order in pattern.order_by:
                if order.get('column'):
                    used_columns.add(order['column'])
            
            # Add GROUP BY columns
            used_columns.update(pattern.group_by)
        
        if not used_columns:
            return issues  # Can't determine usage without query patterns
        
        for index in indexes:
            index_columns = set(index.columns)
            if not index_columns.intersection(used_columns):
                issues.append(RedundancyIssue(
                    issue_type="UNUSED",
                    affected_indexes=[index.name],
                    table=table_name,
                    description=f"Index '{index.name}' columns {index.columns} are not used in any query patterns",
                    recommendation="Consider dropping this index if it's truly unused (verify with query logs)",
                    sql_statements=[f"-- Review usage before dropping\n-- DROP INDEX {index.name};"]
                ))
        
        return issues
    
    def estimate_index_sizes(self) -> Dict[str, Dict[str, Any]]:
        """Estimate storage requirements for recommended indexes."""
        size_estimates = {}
        
        # This is a simplified estimation - in practice, would need actual table statistics
        for table_name in self.tables:
            size_estimates[table_name] = {
                "estimated_table_rows": 10000,  # Default estimate
                "existing_indexes_size_mb": len(self.existing_indexes.get(table_name, [])) * 5,  # Rough estimate
                "index_overhead_per_column_mb": 2  # Rough estimate per column
            }
        
        return size_estimates
    
    def generate_analysis_report(self) -> Dict[str, Any]:
        """Generate comprehensive analysis report."""
        recommendations = self.analyze_missing_indexes()
        redundancy_issues = self.analyze_redundant_indexes()
        size_estimates = self.estimate_index_sizes()
        
        # Calculate statistics
        total_existing_indexes = sum(len(indexes) for indexes in self.existing_indexes.values())
        tables_analyzed = len(self.tables)
        query_patterns_analyzed = len(self.query_patterns)
        
        # Categorize recommendations by priority
        high_priority = [r for r in recommendations if r.priority <= 2]
        medium_priority = [r for r in recommendations if r.priority == 3]
        low_priority = [r for r in recommendations if r.priority >= 4]
        
        return {
            "analysis_summary": {
                "tables_analyzed": tables_analyzed,
                "query_patterns_analyzed": query_patterns_analyzed,
                "existing_indexes": total_existing_indexes,
                "total_recommendations": len(recommendations),
                "high_priority_recommendations": len(high_priority),
                "redundancy_issues_found": len(redundancy_issues)
            },
            "index_recommendations": {
                "high_priority": [asdict(r) for r in high_priority],
                "medium_priority": [asdict(r) for r in medium_priority],
                "low_priority": [asdict(r) for r in low_priority]
            },
            "redundancy_analysis": [asdict(issue) for issue in redundancy_issues],
            "size_estimates": size_estimates,
            "sql_statements": {
                "create_indexes": [rec.sql_statement for rec in recommendations],
                "drop_redundant": [
                    stmt for issue in redundancy_issues 
                    for stmt in issue.sql_statements
                ]
            },
            "performance_impact": self._generate_performance_impact_analysis(recommendations)
        }
    
    def _generate_performance_impact_analysis(self, recommendations: List[IndexRecommendation]) -> Dict[str, Any]:
        """Generate performance impact analysis."""
        impact_analysis = {
            "query_optimization": {},
            "write_overhead": {},
            "storage_impact": {}
        }
        
        # Analyze query optimization impact
        query_benefits = defaultdict(list)
        for rec in recommendations:
            for query_id in rec.query_patterns_helped:
                query_benefits[query_id].append(rec.estimated_benefit)
        
        impact_analysis["query_optimization"] = {
            "queries_improved": len(query_benefits),
            "high_impact_queries": len([q for q, benefits in query_benefits.items() 
                                      if any("High" in benefit for benefit in benefits)]),
            "benefit_distribution": dict(Counter(
                rec.estimated_benefit for rec in recommendations
            ))
        }
        
        # Analyze write overhead
        impact_analysis["write_overhead"] = {
            "total_new_indexes": len(recommendations),
            "estimated_insert_overhead": f"{len(recommendations) * 5}%",  # Rough estimate
            "tables_most_affected": list(Counter(rec.table for rec in recommendations).most_common(3))
        }
        
        return impact_analysis
    
    def format_text_report(self, analysis: Dict[str, Any]) -> str:
        """Format analysis as human-readable text report."""
        lines = []
        lines.append("DATABASE INDEX OPTIMIZATION REPORT")
        lines.append("=" * 50)
        lines.append("")
        
        # Summary
        summary = analysis["analysis_summary"]
        lines.append("ANALYSIS SUMMARY")
        lines.append("-" * 16)
        lines.append(f"Tables Analyzed: {summary['tables_analyzed']}")
        lines.append(f"Query Patterns: {summary['query_patterns_analyzed']}")
        lines.append(f"Existing Indexes: {summary['existing_indexes']}")
        lines.append(f"New Recommendations: {summary['total_recommendations']}")
        lines.append(f"High Priority: {summary['high_priority_recommendations']}")
        lines.append(f"Redundancy Issues: {summary['redundancy_issues_found']}")
        lines.append("")
        
        # High Priority Recommendations
        high_priority = analysis["index_recommendations"]["high_priority"]
        if high_priority:
            lines.append(f"HIGH PRIORITY RECOMMENDATIONS ({len(high_priority)})")
            lines.append("-" * 35)
            for i, rec in enumerate(high_priority[:10], 1):  # Show top 10
                lines.append(f"{i}. {rec['table']}: {rec['reason']}")
                lines.append(f"   Columns: {', '.join(rec['recommended_index']['columns'])}")
                lines.append(f"   Benefit: {rec['estimated_benefit']}")
                lines.append(f"   SQL: {rec['sql_statement']}")
                lines.append("")
        
        # Redundancy Issues
        redundancy = analysis["redundancy_analysis"]
        if redundancy:
            lines.append(f"REDUNDANCY ISSUES ({len(redundancy)})")
            lines.append("-" * 20)
            for issue in redundancy[:5]:  # Show first 5
                lines.append(f"• {issue['issue_type']}: {issue['description']}")
                lines.append(f"  Recommendation: {issue['recommendation']}")
                if issue['sql_statements']:
                    lines.append(f"  SQL: {issue['sql_statements'][0]}")
                lines.append("")
        
        # Performance Impact
        perf_impact = analysis["performance_impact"]
        lines.append("PERFORMANCE IMPACT ANALYSIS")
        lines.append("-" * 30)
        query_opt = perf_impact["query_optimization"]
        lines.append(f"Queries to be optimized: {query_opt['queries_improved']}")
        lines.append(f"High impact optimizations: {query_opt['high_impact_queries']}")
        
        write_overhead = perf_impact["write_overhead"]
        lines.append(f"Estimated insert overhead: {write_overhead['estimated_insert_overhead']}")
        lines.append("")
        
        # SQL Statements Summary
        sql_statements = analysis["sql_statements"]
        create_statements = sql_statements["create_indexes"]
        if create_statements:
            lines.append("RECOMMENDED CREATE INDEX STATEMENTS")
            lines.append("-" * 36)
            for i, stmt in enumerate(create_statements[:10], 1):
                lines.append(f"{i}. {stmt}")
            
            if len(create_statements) > 10:
                lines.append(f"... and {len(create_statements) - 10} more")
            lines.append("")
        
        return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Optimize database indexes based on schema and query patterns")
    parser.add_argument("--schema", "-s", required=True, help="Schema definition JSON file")
    parser.add_argument("--queries", "-q", required=True, help="Query patterns JSON file")
    parser.add_argument("--output", "-o", help="Output file (default: stdout)")
    parser.add_argument("--format", "-f", choices=["json", "text"], default="text", 
                       help="Output format")
    parser.add_argument("--analyze-existing", "-e", action="store_true", 
                       help="Include analysis of existing indexes")
    parser.add_argument("--min-priority", "-p", type=int, default=4, 
                       help="Minimum priority level to include (1=highest, 4=lowest)")
    
    args = parser.parse_args()
    
    try:
        # Load schema
        with open(args.schema, 'r') as f:
            schema_data = json.load(f)
        
        # Load queries
        with open(args.queries, 'r') as f:
            query_data = json.load(f)
        
        # Initialize optimizer
        optimizer = IndexOptimizer()
        optimizer.load_schema(schema_data)
        optimizer.load_query_patterns(query_data)
        
        # Generate analysis
        analysis = optimizer.generate_analysis_report()
        
        # Filter by priority if specified
        if args.min_priority < 4:
            for priority_level in ["high_priority", "medium_priority", "low_priority"]:
                analysis["index_recommendations"][priority_level] = [
                    rec for rec in analysis["index_recommendations"][priority_level]
                    if rec["priority"] <= args.min_priority
                ]
        
        # Format output
        if args.format == "json":
            output = json.dumps(analysis, indent=2)
        else:
            output = optimizer.format_text_report(analysis)
        
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