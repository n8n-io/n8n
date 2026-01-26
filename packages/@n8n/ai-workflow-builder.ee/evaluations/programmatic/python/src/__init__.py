"""
n8n Workflow Comparison Module

Graph-based workflow similarity comparison using NetworkX.
"""

from __future__ import annotations

from src.config_loader import WorkflowComparisonConfig, load_config
from src.graph_builder import build_workflow_graph, graph_stats
from src.similarity import calculate_graph_edit_distance

__version__ = "0.1.0"

__all__ = [
    "WorkflowComparisonConfig",
    "load_config",
    "build_workflow_graph",
    "graph_stats",
    "calculate_graph_edit_distance",
]
