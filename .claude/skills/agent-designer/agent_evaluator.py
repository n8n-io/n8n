#!/usr/bin/env python3
"""
Agent Evaluator - Multi-Agent System Performance Analysis

Takes agent execution logs (task, actions taken, results, time, tokens used) 
and evaluates performance: task success rate, average cost per task, latency 
distribution, error patterns, tool usage efficiency, identifies bottlenecks 
and improvement opportunities.

Input: execution logs JSON
Output: performance report + bottleneck analysis + optimization recommendations
"""

import json
import argparse
import sys
import statistics
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
from datetime import datetime, timedelta
import re


@dataclass
class ExecutionLog:
    """Single execution log entry"""
    task_id: str
    agent_id: str
    task_type: str
    task_description: str
    start_time: str
    end_time: str
    duration_ms: int
    status: str  # success, failure, partial, timeout
    actions: List[Dict[str, Any]]
    results: Dict[str, Any]
    tokens_used: Dict[str, int]  # input_tokens, output_tokens, total_tokens
    cost_usd: float
    error_details: Optional[Dict[str, Any]]
    tools_used: List[str]
    retry_count: int
    metadata: Dict[str, Any]


@dataclass
class PerformanceMetrics:
    """Performance metrics for an agent or system"""
    total_tasks: int
    successful_tasks: int
    failed_tasks: int
    partial_tasks: int
    timeout_tasks: int
    success_rate: float
    failure_rate: float
    average_duration_ms: float
    median_duration_ms: float
    percentile_95_duration_ms: float
    min_duration_ms: int
    max_duration_ms: int
    total_tokens_used: int
    average_tokens_per_task: float
    total_cost_usd: float
    average_cost_per_task: float
    cost_per_token: float
    throughput_tasks_per_hour: float
    error_rate: float
    retry_rate: float


@dataclass
class ErrorAnalysis:
    """Error pattern analysis"""
    error_type: str
    count: int
    percentage: float
    affected_agents: List[str]
    affected_task_types: List[str]
    common_patterns: List[str]
    suggested_fixes: List[str]
    impact_level: str  # high, medium, low


@dataclass
class BottleneckAnalysis:
    """System bottleneck analysis"""
    bottleneck_type: str  # agent, tool, communication, resource
    location: str
    severity: str  # critical, high, medium, low
    description: str
    impact_on_performance: Dict[str, float]
    affected_workflows: List[str]
    optimization_suggestions: List[str]
    estimated_improvement: Dict[str, float]


@dataclass
class OptimizationRecommendation:
    """Performance optimization recommendation"""
    category: str  # performance, cost, reliability, scalability
    priority: str  # high, medium, low
    title: str
    description: str
    implementation_effort: str  # low, medium, high
    expected_impact: Dict[str, Any]
    estimated_cost_savings: Optional[float]
    estimated_performance_gain: Optional[float]
    implementation_steps: List[str]
    risks: List[str]
    prerequisites: List[str]


@dataclass
class EvaluationReport:
    """Complete evaluation report"""
    summary: Dict[str, Any]
    system_metrics: PerformanceMetrics
    agent_metrics: Dict[str, PerformanceMetrics]
    task_type_metrics: Dict[str, PerformanceMetrics]
    tool_usage_analysis: Dict[str, Any]
    error_analysis: List[ErrorAnalysis]
    bottleneck_analysis: List[BottleneckAnalysis]
    optimization_recommendations: List[OptimizationRecommendation]
    trends_analysis: Dict[str, Any]
    cost_breakdown: Dict[str, Any]
    sla_compliance: Dict[str, Any]
    metadata: Dict[str, Any]


class AgentEvaluator:
    """Evaluate multi-agent system performance from execution logs"""
    
    def __init__(self):
        self.error_patterns = self._define_error_patterns()
        self.performance_thresholds = self._define_performance_thresholds()
    
    def _define_error_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Define common error patterns and their classifications"""
        return {
            "timeout": {
                "patterns": [r"timeout", r"timed out", r"deadline exceeded"],
                "category": "performance",
                "severity": "high",
                "common_fixes": [
                    "Increase timeout values",
                    "Optimize slow operations",
                    "Add retry logic with exponential backoff",
                    "Parallelize independent operations"
                ]
            },
            "rate_limit": {
                "patterns": [r"rate limit", r"too many requests", r"quota exceeded"],
                "category": "resource",
                "severity": "medium",
                "common_fixes": [
                    "Implement request throttling",
                    "Add circuit breaker pattern",
                    "Use request queuing",
                    "Negotiate higher limits"
                ]
            },
            "authentication": {
                "patterns": [r"unauthorized", r"authentication failed", r"invalid credentials"],
                "category": "security",
                "severity": "high",
                "common_fixes": [
                    "Check credential rotation",
                    "Implement token refresh logic",
                    "Add authentication retry",
                    "Verify permission scopes"
                ]
            },
            "network": {
                "patterns": [r"connection refused", r"network error", r"dns resolution"],
                "category": "infrastructure",
                "severity": "high",
                "common_fixes": [
                    "Add network retry logic",
                    "Implement fallback endpoints",
                    "Use connection pooling",
                    "Add health checks"
                ]
            },
            "validation": {
                "patterns": [r"validation error", r"invalid input", r"schema violation"],
                "category": "data",
                "severity": "medium",
                "common_fixes": [
                    "Strengthen input validation",
                    "Add data sanitization",
                    "Improve error messages",
                    "Add input examples"
                ]
            },
            "resource": {
                "patterns": [r"out of memory", r"disk full", r"cpu overload"],
                "category": "resource",
                "severity": "critical",
                "common_fixes": [
                    "Scale up resources",
                    "Optimize memory usage",
                    "Add resource monitoring",
                    "Implement graceful degradation"
                ]
            }
        }
    
    def _define_performance_thresholds(self) -> Dict[str, Any]:
        """Define performance thresholds for different metrics"""
        return {
            "success_rate": {"excellent": 0.98, "good": 0.95, "acceptable": 0.90, "poor": 0.80},
            "average_duration": {"excellent": 1000, "good": 3000, "acceptable": 10000, "poor": 30000},
            "error_rate": {"excellent": 0.01, "good": 0.03, "acceptable": 0.05, "poor": 0.10},
            "retry_rate": {"excellent": 0.05, "good": 0.10, "acceptable": 0.20, "poor": 0.40},
            "cost_per_task": {"excellent": 0.01, "good": 0.05, "acceptable": 0.10, "poor": 0.25},
            "throughput": {"excellent": 100, "good": 50, "acceptable": 20, "poor": 5}  # tasks per hour
        }
    
    # _define_cost_benchmarks() was removed. It hardcoded per-token prices for
    # gpt-4, gpt-3.5-turbo and claude-3 — all retired, all priced at 2024
    # rates — and the result was assigned to self.cost_benchmarks and never
    # read by anything. Cost analysis in this tool uses the cost_usd field the
    # caller supplies in each execution log, which is the only figure that can
    # be accurate. See engineering-team/skills/senior-prompt-engineer/scripts/
    # prompt_optimizer.py for the --price-per-mtok pattern if a price is
    # genuinely needed.

    def parse_execution_logs(self, logs_data: List[Dict[str, Any]]) -> List[ExecutionLog]:
        """Parse raw execution logs into structured format"""
        logs = []
        
        for log_entry in logs_data:
            try:
                log = ExecutionLog(
                    task_id=log_entry.get("task_id", ""),
                    agent_id=log_entry.get("agent_id", ""),
                    task_type=log_entry.get("task_type", "unknown"),
                    task_description=log_entry.get("task_description", ""),
                    start_time=log_entry.get("start_time", ""),
                    end_time=log_entry.get("end_time", ""),
                    duration_ms=log_entry.get("duration_ms", 0),
                    status=log_entry.get("status", "unknown"),
                    actions=log_entry.get("actions", []),
                    results=log_entry.get("results", {}),
                    tokens_used=log_entry.get("tokens_used", {"total_tokens": 0}),
                    cost_usd=log_entry.get("cost_usd", 0.0),
                    error_details=log_entry.get("error_details"),
                    tools_used=log_entry.get("tools_used", []),
                    retry_count=log_entry.get("retry_count", 0),
                    metadata=log_entry.get("metadata", {})
                )
                logs.append(log)
            except Exception as e:
                print(f"Warning: Failed to parse log entry: {e}", file=sys.stderr)
                continue
        
        return logs
    
    def calculate_performance_metrics(self, logs: List[ExecutionLog]) -> PerformanceMetrics:
        """Calculate performance metrics from execution logs"""
        if not logs:
            return PerformanceMetrics(
                total_tasks=0, successful_tasks=0, failed_tasks=0, partial_tasks=0,
                timeout_tasks=0, success_rate=0.0, failure_rate=0.0,
                average_duration_ms=0.0, median_duration_ms=0.0, percentile_95_duration_ms=0.0,
                min_duration_ms=0, max_duration_ms=0, total_tokens_used=0,
                average_tokens_per_task=0.0, total_cost_usd=0.0, average_cost_per_task=0.0,
                cost_per_token=0.0, throughput_tasks_per_hour=0.0, error_rate=0.0, retry_rate=0.0
            )
        
        total_tasks = len(logs)
        successful_tasks = sum(1 for log in logs if log.status == "success")
        failed_tasks = sum(1 for log in logs if log.status == "failure")
        partial_tasks = sum(1 for log in logs if log.status == "partial")
        timeout_tasks = sum(1 for log in logs if log.status == "timeout")
        
        success_rate = successful_tasks / total_tasks if total_tasks > 0 else 0.0
        failure_rate = (failed_tasks + timeout_tasks) / total_tasks if total_tasks > 0 else 0.0
        
        durations = [log.duration_ms for log in logs if log.duration_ms > 0]
        if durations:
            average_duration_ms = statistics.mean(durations)
            median_duration_ms = statistics.median(durations)
            percentile_95_duration_ms = self._percentile(durations, 95)
            min_duration_ms = min(durations)
            max_duration_ms = max(durations)
        else:
            average_duration_ms = median_duration_ms = percentile_95_duration_ms = 0.0
            min_duration_ms = max_duration_ms = 0
        
        total_tokens = sum(log.tokens_used.get("total_tokens", 0) for log in logs)
        average_tokens_per_task = total_tokens / total_tasks if total_tasks > 0 else 0.0
        
        total_cost = sum(log.cost_usd for log in logs)
        average_cost_per_task = total_cost / total_tasks if total_tasks > 0 else 0.0
        cost_per_token = total_cost / total_tokens if total_tokens > 0 else 0.0
        
        # Calculate throughput (tasks per hour)
        if logs and len(logs) > 1:
            start_time = min(log.start_time for log in logs if log.start_time)
            end_time = max(log.end_time for log in logs if log.end_time)
            if start_time and end_time:
                try:
                    start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                    end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                    time_diff_hours = (end_dt - start_dt).total_seconds() / 3600
                    throughput_tasks_per_hour = total_tasks / time_diff_hours if time_diff_hours > 0 else 0.0
                except:
                    throughput_tasks_per_hour = 0.0
            else:
                throughput_tasks_per_hour = 0.0
        else:
            throughput_tasks_per_hour = 0.0
        
        error_rate = sum(1 for log in logs if log.error_details) / total_tasks if total_tasks > 0 else 0.0
        retry_rate = sum(1 for log in logs if log.retry_count > 0) / total_tasks if total_tasks > 0 else 0.0
        
        return PerformanceMetrics(
            total_tasks=total_tasks,
            successful_tasks=successful_tasks,
            failed_tasks=failed_tasks,
            partial_tasks=partial_tasks,
            timeout_tasks=timeout_tasks,
            success_rate=success_rate,
            failure_rate=failure_rate,
            average_duration_ms=average_duration_ms,
            median_duration_ms=median_duration_ms,
            percentile_95_duration_ms=percentile_95_duration_ms,
            min_duration_ms=min_duration_ms,
            max_duration_ms=max_duration_ms,
            total_tokens_used=total_tokens,
            average_tokens_per_task=average_tokens_per_task,
            total_cost_usd=total_cost,
            average_cost_per_task=average_cost_per_task,
            cost_per_token=cost_per_token,
            throughput_tasks_per_hour=throughput_tasks_per_hour,
            error_rate=error_rate,
            retry_rate=retry_rate
        )
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile value from data"""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower_index = int(index)
            upper_index = lower_index + 1
            weight = index - lower_index
            return sorted_data[lower_index] * (1 - weight) + sorted_data[upper_index] * weight
    
    def analyze_errors(self, logs: List[ExecutionLog]) -> List[ErrorAnalysis]:
        """Analyze error patterns in execution logs"""
        error_analyses = []
        
        # Collect all errors
        errors = []
        for log in logs:
            if log.error_details:
                errors.append({
                    "error": log.error_details,
                    "agent_id": log.agent_id,
                    "task_type": log.task_type,
                    "task_id": log.task_id
                })
        
        if not errors:
            return error_analyses
        
        # Group errors by pattern
        error_groups = defaultdict(list)
        unclassified_errors = []
        
        for error in errors:
            error_message = str(error.get("error", {})).lower()
            classified = False
            
            for pattern_name, pattern_info in self.error_patterns.items():
                for pattern in pattern_info["patterns"]:
                    if re.search(pattern, error_message):
                        error_groups[pattern_name].append(error)
                        classified = True
                        break
                if classified:
                    break
            
            if not classified:
                unclassified_errors.append(error)
        
        # Analyze each error group
        total_errors = len(errors)
        
        for error_type, error_list in error_groups.items():
            count = len(error_list)
            percentage = (count / total_errors) * 100 if total_errors > 0 else 0.0
            
            affected_agents = list(set(error["agent_id"] for error in error_list))
            affected_task_types = list(set(error["task_type"] for error in error_list))
            
            # Extract common patterns from error messages
            common_patterns = self._extract_common_patterns([str(e["error"]) for e in error_list])
            
            # Get suggested fixes
            pattern_info = self.error_patterns.get(error_type, {})
            suggested_fixes = pattern_info.get("common_fixes", [])
            
            # Determine impact level
            if percentage > 20 or pattern_info.get("severity") == "critical":
                impact_level = "high"
            elif percentage > 10 or pattern_info.get("severity") == "high":
                impact_level = "medium"
            else:
                impact_level = "low"
            
            error_analysis = ErrorAnalysis(
                error_type=error_type,
                count=count,
                percentage=percentage,
                affected_agents=affected_agents,
                affected_task_types=affected_task_types,
                common_patterns=common_patterns,
                suggested_fixes=suggested_fixes,
                impact_level=impact_level
            )
            
            error_analyses.append(error_analysis)
        
        # Handle unclassified errors
        if unclassified_errors:
            count = len(unclassified_errors)
            percentage = (count / total_errors) * 100
            
            error_analysis = ErrorAnalysis(
                error_type="unclassified",
                count=count,
                percentage=percentage,
                affected_agents=list(set(error["agent_id"] for error in unclassified_errors)),
                affected_task_types=list(set(error["task_type"] for error in unclassified_errors)),
                common_patterns=self._extract_common_patterns([str(e["error"]) for e in unclassified_errors]),
                suggested_fixes=["Review and classify error patterns", "Add specific error handling"],
                impact_level="medium" if percentage > 10 else "low"
            )
            
            error_analyses.append(error_analysis)
        
        # Sort by impact and count
        error_analyses.sort(key=lambda x: (x.impact_level == "high", x.count), reverse=True)
        
        return error_analyses
    
    def _extract_common_patterns(self, error_messages: List[str]) -> List[str]:
        """Extract common patterns from error messages"""
        if not error_messages:
            return []
        
        # Simple pattern extraction - find common phrases
        word_counts = Counter()
        for message in error_messages:
            words = re.findall(r'\w+', message.lower())
            for word in words:
                if len(word) > 3:  # Ignore short words
                    word_counts[word] += 1
        
        # Return most common words/patterns
        common_patterns = [word for word, count in word_counts.most_common(5) 
                          if count > 1]
        
        return common_patterns
    
    def identify_bottlenecks(self, logs: List[ExecutionLog], 
                           agent_metrics: Dict[str, PerformanceMetrics]) -> List[BottleneckAnalysis]:
        """Identify system bottlenecks"""
        bottlenecks = []
        
        # Agent performance bottlenecks
        for agent_id, metrics in agent_metrics.items():
            if metrics.success_rate < 0.8:
                severity = "critical" if metrics.success_rate < 0.5 else "high"
                bottlenecks.append(BottleneckAnalysis(
                    bottleneck_type="agent",
                    location=agent_id,
                    severity=severity,
                    description=f"Agent {agent_id} has low success rate ({metrics.success_rate:.1%})",
                    impact_on_performance={
                        "success_rate_impact": (0.95 - metrics.success_rate) * 100,
                        "cost_impact": metrics.average_cost_per_task * metrics.failed_tasks
                    },
                    affected_workflows=self._get_agent_workflows(agent_id, logs),
                    optimization_suggestions=[
                        "Review and improve agent logic",
                        "Add better error handling",
                        "Optimize tool usage",
                        "Consider agent specialization"
                    ],
                    estimated_improvement={
                        "success_rate_gain": min(0.15, 0.95 - metrics.success_rate),
                        "cost_reduction": metrics.average_cost_per_task * 0.2
                    }
                ))
            
            if metrics.average_duration_ms > 30000:  # 30 seconds
                severity = "high" if metrics.average_duration_ms > 60000 else "medium"
                bottlenecks.append(BottleneckAnalysis(
                    bottleneck_type="agent",
                    location=agent_id,
                    severity=severity,
                    description=f"Agent {agent_id} has high latency ({metrics.average_duration_ms/1000:.1f}s avg)",
                    impact_on_performance={
                        "latency_impact": metrics.average_duration_ms - 10000,
                        "throughput_impact": max(0, 50 - metrics.total_tasks)
                    },
                    affected_workflows=self._get_agent_workflows(agent_id, logs),
                    optimization_suggestions=[
                        "Profile and optimize slow operations",
                        "Implement caching strategies",
                        "Parallelize independent tasks",
                        "Optimize API calls"
                    ],
                    estimated_improvement={
                        "latency_reduction": min(0.5, (metrics.average_duration_ms - 10000) / metrics.average_duration_ms),
                        "throughput_gain": 1.3
                    }
                ))
        
        # Tool usage bottlenecks
        tool_usage = self._analyze_tool_usage(logs)
        for tool, usage_stats in tool_usage.items():
            if usage_stats.get("error_rate", 0) > 0.2:
                bottlenecks.append(BottleneckAnalysis(
                    bottleneck_type="tool",
                    location=tool,
                    severity="high" if usage_stats["error_rate"] > 0.4 else "medium",
                    description=f"Tool {tool} has high error rate ({usage_stats['error_rate']:.1%})",
                    impact_on_performance={
                        "reliability_impact": usage_stats["error_rate"] * usage_stats["usage_count"],
                        "retry_overhead": usage_stats.get("retry_count", 0) * 1000  # ms
                    },
                    affected_workflows=usage_stats.get("affected_workflows", []),
                    optimization_suggestions=[
                        "Review tool implementation",
                        "Add better error handling for tool",
                        "Implement tool fallbacks",
                        "Consider alternative tools"
                    ],
                    estimated_improvement={
                        "error_reduction": usage_stats["error_rate"] * 0.7,
                        "performance_gain": 1.2
                    }
                ))
        
        # Communication bottlenecks
        communication_analysis = self._analyze_communication_patterns(logs)
        if communication_analysis.get("high_latency_communications", 0) > 5:
            bottlenecks.append(BottleneckAnalysis(
                bottleneck_type="communication",
                location="inter_agent_communication",
                severity="medium",
                description="High latency in inter-agent communications detected",
                impact_on_performance={
                    "communication_overhead": communication_analysis.get("avg_communication_latency", 0),
                    "coordination_efficiency": 0.8  # Assumed impact
                },
                affected_workflows=communication_analysis.get("affected_workflows", []),
                optimization_suggestions=[
                    "Optimize message serialization",
                    "Implement message batching",
                    "Add communication caching",
                    "Consider direct communication patterns"
                ],
                estimated_improvement={
                    "communication_latency_reduction": 0.4,
                    "overall_efficiency_gain": 1.15
                }
            ))
        
        # Resource bottlenecks
        resource_analysis = self._analyze_resource_usage(logs)
        if resource_analysis.get("high_token_usage_tasks", 0) > 10:
            bottlenecks.append(BottleneckAnalysis(
                bottleneck_type="resource",
                location="token_usage",
                severity="medium",
                description="High token usage detected in multiple tasks",
                impact_on_performance={
                    "cost_impact": resource_analysis.get("excess_token_cost", 0),
                    "latency_impact": resource_analysis.get("token_processing_overhead", 0)
                },
                affected_workflows=resource_analysis.get("high_usage_workflows", []),
                optimization_suggestions=[
                    "Optimize prompt engineering",
                    "Implement response caching",
                    "Use more efficient models for simple tasks",
                    "Add token usage monitoring"
                ],
                estimated_improvement={
                    "cost_reduction": 0.3,
                    "efficiency_gain": 1.1
                }
            ))
        
        # Sort bottlenecks by severity and impact
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        bottlenecks.sort(key=lambda x: (severity_order[x.severity], 
                                       -sum(x.impact_on_performance.values())))
        
        return bottlenecks
    
    def _get_agent_workflows(self, agent_id: str, logs: List[ExecutionLog]) -> List[str]:
        """Get workflows affected by a specific agent"""
        workflows = set()
        for log in logs:
            if log.agent_id == agent_id:
                workflows.add(log.task_type)
        return list(workflows)
    
    def _analyze_tool_usage(self, logs: List[ExecutionLog]) -> Dict[str, Dict[str, Any]]:
        """Analyze tool usage patterns"""
        tool_stats = defaultdict(lambda: {
            "usage_count": 0,
            "error_count": 0,
            "total_duration": 0,
            "affected_workflows": set(),
            "retry_count": 0
        })
        
        for log in logs:
            for tool in log.tools_used:
                stats = tool_stats[tool]
                stats["usage_count"] += 1
                stats["total_duration"] += log.duration_ms
                stats["affected_workflows"].add(log.task_type)
                
                if log.error_details:
                    stats["error_count"] += 1
                if log.retry_count > 0:
                    stats["retry_count"] += log.retry_count
        
        # Calculate derived metrics
        result = {}
        for tool, stats in tool_stats.items():
            result[tool] = {
                "usage_count": stats["usage_count"],
                "error_rate": stats["error_count"] / stats["usage_count"] if stats["usage_count"] > 0 else 0,
                "avg_duration": stats["total_duration"] / stats["usage_count"] if stats["usage_count"] > 0 else 0,
                "affected_workflows": list(stats["affected_workflows"]),
                "retry_count": stats["retry_count"]
            }
        
        return result
    
    def _analyze_communication_patterns(self, logs: List[ExecutionLog]) -> Dict[str, Any]:
        """Analyze communication patterns between agents"""
        # This is a simplified analysis - in a real system, you'd have more detailed communication logs
        communication_actions = []
        for log in logs:
            for action in log.actions:
                if action.get("type") in ["message", "delegate", "coordinate", "respond"]:
                    communication_actions.append({
                        "duration": action.get("duration_ms", 0),
                        "success": action.get("success", True),
                        "workflow": log.task_type
                    })
        
        if not communication_actions:
            return {}
        
        avg_latency = sum(action["duration"] for action in communication_actions) / len(communication_actions)
        high_latency_count = sum(1 for action in communication_actions if action["duration"] > 5000)
        
        return {
            "total_communications": len(communication_actions),
            "avg_communication_latency": avg_latency,
            "high_latency_communications": high_latency_count,
            "affected_workflows": list(set(action["workflow"] for action in communication_actions))
        }
    
    def _analyze_resource_usage(self, logs: List[ExecutionLog]) -> Dict[str, Any]:
        """Analyze resource usage patterns"""
        token_usage = [log.tokens_used.get("total_tokens", 0) for log in logs]
        
        if not token_usage:
            return {}
        
        avg_tokens = sum(token_usage) / len(token_usage)
        high_usage_threshold = avg_tokens * 2
        high_usage_tasks = sum(1 for tokens in token_usage if tokens > high_usage_threshold)
        
        # Estimate excess cost
        excess_tokens = sum(max(0, tokens - avg_tokens) for tokens in token_usage)
        excess_cost = excess_tokens * 0.00002  # Rough estimate
        
        return {
            "avg_token_usage": avg_tokens,
            "high_token_usage_tasks": high_usage_tasks,
            "excess_token_cost": excess_cost,
            "token_processing_overhead": high_usage_tasks * 500,  # Estimated overhead in ms
            "high_usage_workflows": [log.task_type for log in logs 
                                   if log.tokens_used.get("total_tokens", 0) > high_usage_threshold]
        }
    
    def generate_optimization_recommendations(self, 
                                            system_metrics: PerformanceMetrics,
                                            error_analyses: List[ErrorAnalysis],
                                            bottlenecks: List[BottleneckAnalysis]) -> List[OptimizationRecommendation]:
        """Generate optimization recommendations based on analysis"""
        recommendations = []
        
        # Performance optimization recommendations
        if system_metrics.success_rate < 0.9:
            recommendations.append(OptimizationRecommendation(
                category="reliability",
                priority="high",
                title="Improve System Reliability",
                description=f"System success rate is {system_metrics.success_rate:.1%}, below target of 90%",
                implementation_effort="medium",
                expected_impact={
                    "success_rate_improvement": min(0.1, 0.95 - system_metrics.success_rate),
                    "cost_reduction": system_metrics.average_cost_per_task * 0.15
                },
                estimated_cost_savings=system_metrics.total_cost_usd * 0.1,
                estimated_performance_gain=1.2,
                implementation_steps=[
                    "Identify and fix top error patterns",
                    "Implement better error handling and retries",
                    "Add comprehensive monitoring and alerting",
                    "Implement graceful degradation patterns"
                ],
                risks=["Temporary increase in complexity", "Potential initial performance overhead"],
                prerequisites=["Error analysis completion", "Monitoring infrastructure"]
            ))
        
        # Cost optimization recommendations
        if system_metrics.average_cost_per_task > 0.1:
            recommendations.append(OptimizationRecommendation(
                category="cost",
                priority="medium",
                title="Optimize Token Usage and Costs",
                description=f"Average cost per task (${system_metrics.average_cost_per_task:.3f}) is above optimal range",
                implementation_effort="low",
                expected_impact={
                    "cost_reduction": system_metrics.average_cost_per_task * 0.3,
                    "efficiency_improvement": 1.15
                },
                estimated_cost_savings=system_metrics.total_cost_usd * 0.3,
                estimated_performance_gain=1.05,
                implementation_steps=[
                    "Implement prompt optimization",
                    "Add response caching for repeated queries",
                    "Use smaller models for simple tasks",
                    "Implement token usage monitoring and alerts"
                ],
                risks=["Potential quality reduction with smaller models"],
                prerequisites=["Token usage analysis", "Caching infrastructure"]
            ))
        
        # Performance optimization recommendations
        if system_metrics.average_duration_ms > 10000:
            recommendations.append(OptimizationRecommendation(
                category="performance",
                priority="high",
                title="Reduce Task Latency",
                description=f"Average task duration ({system_metrics.average_duration_ms/1000:.1f}s) exceeds target",
                implementation_effort="high",
                expected_impact={
                    "latency_reduction": min(0.5, (system_metrics.average_duration_ms - 5000) / system_metrics.average_duration_ms),
                    "throughput_improvement": 1.5
                },
                estimated_cost_savings=None,
                estimated_performance_gain=1.4,
                implementation_steps=[
                    "Profile and optimize slow operations",
                    "Implement parallel processing where possible",
                    "Add caching for expensive operations",
                    "Optimize API calls and reduce round trips"
                ],
                risks=["Increased system complexity", "Potential resource usage increase"],
                prerequisites=["Performance profiling tools", "Caching infrastructure"]
            ))
        
        # Error-based recommendations
        high_impact_errors = [ea for ea in error_analyses if ea.impact_level == "high"]
        if high_impact_errors:
            for error_analysis in high_impact_errors[:3]:  # Top 3 high impact errors
                recommendations.append(OptimizationRecommendation(
                    category="reliability",
                    priority="high",
                    title=f"Address {error_analysis.error_type.title()} Errors",
                    description=f"{error_analysis.error_type.title()} errors occur in {error_analysis.percentage:.1f}% of cases",
                    implementation_effort="medium",
                    expected_impact={
                        "error_reduction": error_analysis.percentage / 100,
                        "reliability_improvement": 1.1
                    },
                    estimated_cost_savings=system_metrics.total_cost_usd * (error_analysis.percentage / 100) * 0.5,
                    estimated_performance_gain=None,
                    implementation_steps=error_analysis.suggested_fixes,
                    risks=["May require significant code changes"],
                    prerequisites=["Root cause analysis", "Testing framework"]
                ))
        
        # Bottleneck-based recommendations
        critical_bottlenecks = [b for b in bottlenecks if b.severity in ["critical", "high"]]
        for bottleneck in critical_bottlenecks[:2]:  # Top 2 critical bottlenecks
            recommendations.append(OptimizationRecommendation(
                category="performance",
                priority="high" if bottleneck.severity == "critical" else "medium",
                title=f"Address {bottleneck.bottleneck_type.title()} Bottleneck",
                description=bottleneck.description,
                implementation_effort="medium",
                expected_impact=bottleneck.estimated_improvement,
                estimated_cost_savings=None,
                estimated_performance_gain=list(bottleneck.estimated_improvement.values())[0] if bottleneck.estimated_improvement else 1.1,
                implementation_steps=bottleneck.optimization_suggestions,
                risks=["System downtime during implementation", "Potential cascade effects"],
                prerequisites=["Impact assessment", "Rollback plan"]
            ))
        
        # Scalability recommendations
        if system_metrics.throughput_tasks_per_hour < 20:
            recommendations.append(OptimizationRecommendation(
                category="scalability",
                priority="medium",
                title="Improve System Scalability",
                description="Current throughput indicates potential scalability issues",
                implementation_effort="high",
                expected_impact={
                    "throughput_improvement": 2.0,
                    "scalability_headroom": 5.0
                },
                estimated_cost_savings=None,
                estimated_performance_gain=2.0,
                implementation_steps=[
                    "Implement horizontal scaling for agents",
                    "Add load balancing and resource pooling",
                    "Optimize resource allocation algorithms",
                    "Implement auto-scaling policies"
                ],
                risks=["High implementation complexity", "Increased operational overhead"],
                prerequisites=["Infrastructure scaling capability", "Monitoring and metrics"]
            ))
        
        # Sort recommendations by priority and impact
        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda x: (
            priority_order[x.priority],
            -x.estimated_performance_gain if x.estimated_performance_gain else 0,
            -x.estimated_cost_savings if x.estimated_cost_savings else 0
        ))
        
        return recommendations
    
    def generate_report(self, logs: List[ExecutionLog]) -> EvaluationReport:
        """Generate complete evaluation report"""
        
        # Calculate system metrics
        system_metrics = self.calculate_performance_metrics(logs)
        
        # Calculate per-agent metrics
        agents = set(log.agent_id for log in logs)
        agent_metrics = {}
        for agent_id in agents:
            agent_logs = [log for log in logs if log.agent_id == agent_id]
            agent_metrics[agent_id] = self.calculate_performance_metrics(agent_logs)
        
        # Calculate per-task-type metrics
        task_types = set(log.task_type for log in logs)
        task_type_metrics = {}
        for task_type in task_types:
            task_logs = [log for log in logs if log.task_type == task_type]
            task_type_metrics[task_type] = self.calculate_performance_metrics(task_logs)
        
        # Analyze tool usage
        tool_usage_analysis = self._analyze_tool_usage(logs)
        
        # Analyze errors
        error_analysis = self.analyze_errors(logs)
        
        # Identify bottlenecks
        bottleneck_analysis = self.identify_bottlenecks(logs, agent_metrics)
        
        # Generate optimization recommendations
        optimization_recommendations = self.generate_optimization_recommendations(
            system_metrics, error_analysis, bottleneck_analysis)
        
        # Generate trends analysis (simplified)
        trends_analysis = self._generate_trends_analysis(logs)
        
        # Generate cost breakdown
        cost_breakdown = self._generate_cost_breakdown(logs, agent_metrics)
        
        # Check SLA compliance
        sla_compliance = self._check_sla_compliance(system_metrics)
        
        # Create summary
        summary = {
            "evaluation_period": {
                "start_time": min(log.start_time for log in logs if log.start_time) if logs else None,
                "end_time": max(log.end_time for log in logs if log.end_time) if logs else None,
                "total_duration_hours": system_metrics.total_tasks / system_metrics.throughput_tasks_per_hour if system_metrics.throughput_tasks_per_hour > 0 else 0
            },
            "overall_health": self._assess_overall_health(system_metrics),
            "key_findings": self._extract_key_findings(system_metrics, error_analysis, bottleneck_analysis),
            "critical_issues": len([b for b in bottleneck_analysis if b.severity == "critical"]),
            "improvement_opportunities": len(optimization_recommendations)
        }
        
        # Create metadata
        metadata = {
            "generated_at": datetime.now().isoformat(),
            "evaluator_version": "1.0",
            "total_logs_processed": len(logs),
            "agents_analyzed": len(agents),
            "task_types_analyzed": len(task_types),
            "analysis_completeness": "full"
        }
        
        return EvaluationReport(
            summary=summary,
            system_metrics=system_metrics,
            agent_metrics=agent_metrics,
            task_type_metrics=task_type_metrics,
            tool_usage_analysis=tool_usage_analysis,
            error_analysis=error_analysis,
            bottleneck_analysis=bottleneck_analysis,
            optimization_recommendations=optimization_recommendations,
            trends_analysis=trends_analysis,
            cost_breakdown=cost_breakdown,
            sla_compliance=sla_compliance,
            metadata=metadata
        )
    
    def _generate_trends_analysis(self, logs: List[ExecutionLog]) -> Dict[str, Any]:
        """Generate trends analysis (simplified version)"""
        # Group logs by time periods (daily)
        daily_metrics = defaultdict(list)
        
        for log in logs:
            if log.start_time:
                try:
                    date = log.start_time.split('T')[0]  # Extract date part
                    daily_metrics[date].append(log)
                except:
                    continue
        
        trends = {}
        if len(daily_metrics) > 1:
            daily_success_rates = {}
            daily_avg_durations = {}
            daily_costs = {}
            
            for date, date_logs in daily_metrics.items():
                if date_logs:
                    metrics = self.calculate_performance_metrics(date_logs)
                    daily_success_rates[date] = metrics.success_rate
                    daily_avg_durations[date] = metrics.average_duration_ms
                    daily_costs[date] = metrics.total_cost_usd
            
            trends = {
                "daily_success_rates": daily_success_rates,
                "daily_avg_durations": daily_avg_durations,
                "daily_costs": daily_costs,
                "trend_direction": {
                    "success_rate": "stable",  # Simplified
                    "duration": "stable",
                    "cost": "stable"
                }
            }
        
        return trends
    
    def _generate_cost_breakdown(self, logs: List[ExecutionLog], 
                                agent_metrics: Dict[str, PerformanceMetrics]) -> Dict[str, Any]:
        """Generate cost breakdown analysis"""
        total_cost = sum(log.cost_usd for log in logs)
        
        # Cost by agent
        agent_costs = {}
        for agent_id, metrics in agent_metrics.items():
            agent_costs[agent_id] = metrics.total_cost_usd
        
        # Cost by task type
        task_type_costs = defaultdict(float)
        for log in logs:
            task_type_costs[log.task_type] += log.cost_usd
        
        # Token cost breakdown
        total_tokens = sum(log.tokens_used.get("total_tokens", 0) for log in logs)
        
        return {
            "total_cost": total_cost,
            "cost_by_agent": dict(agent_costs),
            "cost_by_task_type": dict(task_type_costs),
            "cost_per_token": total_cost / total_tokens if total_tokens > 0 else 0,
            "top_cost_drivers": sorted(task_type_costs.items(), key=lambda x: x[1], reverse=True)[:5]
        }
    
    def _check_sla_compliance(self, metrics: PerformanceMetrics) -> Dict[str, Any]:
        """Check SLA compliance"""
        thresholds = self.performance_thresholds
        
        compliance = {
            "success_rate": {
                "target": 0.95,
                "actual": metrics.success_rate,
                "compliant": metrics.success_rate >= 0.95,
                "gap": max(0, 0.95 - metrics.success_rate)
            },
            "average_latency": {
                "target": 10000,  # 10 seconds
                "actual": metrics.average_duration_ms,
                "compliant": metrics.average_duration_ms <= 10000,
                "gap": max(0, metrics.average_duration_ms - 10000)
            },
            "error_rate": {
                "target": 0.05,  # 5%
                "actual": metrics.error_rate,
                "compliant": metrics.error_rate <= 0.05,
                "gap": max(0, metrics.error_rate - 0.05)
            }
        }
        
        overall_compliance = all(sla["compliant"] for sla in compliance.values())
        
        return {
            "overall_compliant": overall_compliance,
            "sla_details": compliance,
            "compliance_score": sum(1 for sla in compliance.values() if sla["compliant"]) / len(compliance)
        }
    
    def _assess_overall_health(self, metrics: PerformanceMetrics) -> str:
        """Assess overall system health"""
        health_score = 0
        
        # Success rate contribution (40%)
        if metrics.success_rate >= 0.95:
            health_score += 40
        elif metrics.success_rate >= 0.90:
            health_score += 30
        elif metrics.success_rate >= 0.80:
            health_score += 20
        else:
            health_score += 10
        
        # Performance contribution (30%)
        if metrics.average_duration_ms <= 5000:
            health_score += 30
        elif metrics.average_duration_ms <= 10000:
            health_score += 20
        elif metrics.average_duration_ms <= 30000:
            health_score += 15
        else:
            health_score += 5
        
        # Error rate contribution (20%)
        if metrics.error_rate <= 0.02:
            health_score += 20
        elif metrics.error_rate <= 0.05:
            health_score += 15
        elif metrics.error_rate <= 0.10:
            health_score += 10
        else:
            health_score += 0
        
        # Cost efficiency contribution (10%)
        if metrics.cost_per_token <= 0.00005:
            health_score += 10
        elif metrics.cost_per_token <= 0.0001:
            health_score += 7
        else:
            health_score += 3
        
        if health_score >= 85:
            return "excellent"
        elif health_score >= 70:
            return "good"
        elif health_score >= 50:
            return "fair"
        else:
            return "poor"
    
    def _extract_key_findings(self, metrics: PerformanceMetrics, 
                            errors: List[ErrorAnalysis],
                            bottlenecks: List[BottleneckAnalysis]) -> List[str]:
        """Extract key findings from analysis"""
        findings = []
        
        # Performance findings
        if metrics.success_rate < 0.9:
            findings.append(f"Success rate ({metrics.success_rate:.1%}) below target")
        
        if metrics.average_duration_ms > 15000:
            findings.append(f"High average latency ({metrics.average_duration_ms/1000:.1f}s)")
        
        # Error findings
        high_impact_errors = [e for e in errors if e.impact_level == "high"]
        if high_impact_errors:
            findings.append(f"{len(high_impact_errors)} high-impact error patterns identified")
        
        # Bottleneck findings
        critical_bottlenecks = [b for b in bottlenecks if b.severity == "critical"]
        if critical_bottlenecks:
            findings.append(f"{len(critical_bottlenecks)} critical bottlenecks found")
        
        # Cost findings
        if metrics.cost_per_token > 0.0001:
            findings.append("Token usage costs above optimal range")
        
        return findings


def main():
    parser = argparse.ArgumentParser(description="Multi-Agent System Performance Evaluator")
    parser.add_argument("input_file", help="JSON file with execution logs")
    parser.add_argument("-o", "--output", help="Output file prefix (default: evaluation_report)")
    parser.add_argument("--format", choices=["json", "both"], default="both", 
                       help="Output format")
    parser.add_argument("--detailed", action="store_true", 
                       help="Include detailed analysis in output")
    
    args = parser.parse_args()
    
    try:
        # Load execution logs
        with open(args.input_file, 'r') as f:
            logs_data = json.load(f)
        
        # Parse logs
        evaluator = AgentEvaluator()
        logs = evaluator.parse_execution_logs(logs_data.get("execution_logs", []))
        
        if not logs:
            print("No valid execution logs found in input file", file=sys.stderr)
            sys.exit(1)
        
        # Generate evaluation report
        report = evaluator.generate_report(logs)
        
        # Prepare output
        output_data = asdict(report)
        
        # Output files
        output_prefix = args.output or "evaluation_report"
        
        if args.format in ["json", "both"]:
            with open(f"{output_prefix}.json", 'w') as f:
                json.dump(output_data, f, indent=2, default=str)
            print(f"JSON report written to {output_prefix}.json")
        
        if args.format == "both":
            # Generate separate detailed files
            
            # Performance summary
            summary_data = {
                "summary": report.summary,
                "system_metrics": asdict(report.system_metrics),
                "sla_compliance": report.sla_compliance
            }
            with open(f"{output_prefix}_summary.json", 'w') as f:
                json.dump(summary_data, f, indent=2, default=str)
            print(f"Summary report written to {output_prefix}_summary.json")
            
            # Recommendations
            recommendations_data = {
                "optimization_recommendations": [asdict(rec) for rec in report.optimization_recommendations],
                "bottleneck_analysis": [asdict(b) for b in report.bottleneck_analysis]
            }
            with open(f"{output_prefix}_recommendations.json", 'w') as f:
                json.dump(recommendations_data, f, indent=2)
            print(f"Recommendations written to {output_prefix}_recommendations.json")
            
            # Error analysis
            error_data = {
                "error_analysis": [asdict(e) for e in report.error_analysis],
                "error_summary": {
                    "total_errors": sum(e.count for e in report.error_analysis),
                    "high_impact_errors": len([e for e in report.error_analysis if e.impact_level == "high"])
                }
            }
            with open(f"{output_prefix}_errors.json", 'w') as f:
                json.dump(error_data, f, indent=2)
            print(f"Error analysis written to {output_prefix}_errors.json")
        
        # Print executive summary
        print(f"\n{'='*60}")
        print(f"AGENT SYSTEM EVALUATION REPORT")
        print(f"{'='*60}")
        print(f"Overall Health: {report.summary['overall_health'].upper()}")
        print(f"Total Tasks: {report.system_metrics.total_tasks}")
        print(f"Success Rate: {report.system_metrics.success_rate:.1%}")
        print(f"Average Duration: {report.system_metrics.average_duration_ms/1000:.1f}s")
        print(f"Total Cost: ${report.system_metrics.total_cost_usd:.2f}")
        print(f"Agents Analyzed: {len(report.agent_metrics)}")
        
        print(f"\nKey Findings:")
        for finding in report.summary['key_findings']:
            print(f"  • {finding}")
        
        print(f"\nTop Recommendations:")
        high_priority_recs = [r for r in report.optimization_recommendations if r.priority == "high"][:3]
        for i, rec in enumerate(high_priority_recs, 1):
            print(f"  {i}. {rec.title}")
        
        if report.summary['critical_issues'] > 0:
            print(f"\n⚠️  CRITICAL: {report.summary['critical_issues']} critical issues require immediate attention")
        
        print(f"\n📊 Detailed reports available in generated files")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()