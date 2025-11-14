"""
Calculate workflow similarity using graph edit distance.
"""

import networkx as nx
from typing import Dict, List, Any
from src.config_loader import WorkflowComparisonConfig
from src.cost_functions import (
    node_substitution_cost,
    node_deletion_cost,
    node_insertion_cost,
    edge_substitution_cost,
    edge_deletion_cost,
    edge_insertion_cost,
)


def calculate_graph_edit_distance(
    g1: nx.DiGraph, g2: nx.DiGraph, config: WorkflowComparisonConfig
) -> Dict[str, Any]:
    """
    Calculate graph edit distance with custom cost functions.

    Args:
        g1: First workflow graph (generated)
        g2: Second workflow graph (ground truth)
        config: Configuration with cost weights

    Returns:
        Dictionary with:
            - similarity_score: 0-1 (1 = identical)
            - edit_cost: Total cost of edits
            - max_possible_cost: Theoretical maximum cost
            - top_edits: List of most important edit operations
    """
    # Handle empty graphs
    if g1.number_of_nodes() == 0 and g2.number_of_nodes() == 0:
        return {
            "similarity_score": 1.0,
            "edit_cost": 0.0,
            "max_possible_cost": 0.0,
            "top_edits": [],
        }

    # Create cost function closures with config
    # NetworkX passes node ATTRIBUTE DICTS, not node names
    def node_subst_cost(n1_attrs, n2_attrs):
        return node_substitution_cost(n1_attrs, n2_attrs, config)

    def node_del_cost(n_attrs):
        return node_deletion_cost(n_attrs, config)

    def node_ins_cost(n_attrs):
        return node_insertion_cost(n_attrs, config)

    # Edge cost functions receive edge attribute dicts from NetworkX
    def edge_subst_cost(e1_attrs, e2_attrs):
        return edge_substitution_cost(e1_attrs, e2_attrs, config)

    def edge_del_cost(e_attrs):
        return edge_deletion_cost(e_attrs, config)

    def edge_ins_cost(e_attrs):
        return edge_insertion_cost(e_attrs, config)

    # Node match function that compares hashable attributes
    def node_match(n1_attrs, n2_attrs):
        """Compare nodes using only hashable attributes"""
        return n1_attrs.get("type") == n2_attrs.get("type") and n1_attrs.get(
            "parameters_hash"
        ) == n2_attrs.get("parameters_hash")

    # Edge match function
    def edge_match(e1_attrs, e2_attrs):
        """Compare edges using hashable attributes"""
        return e1_attrs.get("connection_type") == e2_attrs.get("connection_type")

    # Calculate GED using NetworkX
    # Note: This can be slow for large graphs, but workflow graphs are typically small
    try:
        # Use optimize_graph_edit_distance for better performance
        # This returns an iterator of possible edit costs
        edit_paths = list(
            nx.optimize_graph_edit_distance(
                g1,
                g2,
                node_match=node_match,
                edge_match=edge_match,
                node_subst_cost=node_subst_cost,
                node_del_cost=node_del_cost,
                node_ins_cost=node_ins_cost,
                edge_subst_cost=edge_subst_cost,
                edge_del_cost=edge_del_cost,
                edge_ins_cost=edge_ins_cost,
                upper_bound=None,  # Calculate exact
            )
        )

        if not edit_paths:
            # Fallback to basic calculation
            edit_cost = _calculate_basic_edit_cost(g1, g2, config)
        else:
            edit_cost = min(edit_paths)  # Best (lowest cost) path

    except Exception as e:
        # Fallback if NetworkX GED fails
        print(f"Warning: GED calculation failed, using fallback: {e}")
        edit_cost = _calculate_basic_edit_cost(g1, g2, config)

    # Calculate theoretical maximum cost
    max_cost = _calculate_max_cost(g1, g2, config)

    # Avoid division by zero
    if max_cost == 0:
        similarity_score = 1.0 if edit_cost == 0 else 0.0
    else:
        # Similarity score: 1 - (cost / max_cost)
        similarity_score = max(0.0, min(1.0, 1.0 - (edit_cost / max_cost)))

    # Extract and rank edit operations
    edit_ops = _extract_edit_operations(g1, g2, config)

    return {
        "similarity_score": similarity_score,
        "edit_cost": edit_cost,
        "max_possible_cost": max_cost,
        "top_edits": sorted(edit_ops, key=lambda x: x["cost"], reverse=True),
    }


def _calculate_basic_edit_cost(
    g1: nx.DiGraph, g2: nx.DiGraph, config: WorkflowComparisonConfig
) -> float:
    """
    Calculate a basic edit cost when full GED fails.
    Uses simple node and edge count differences.

    Args:
        g1: First graph
        g2: Second graph
        config: Configuration

    Returns:
        Estimated edit cost
    """
    cost = 0.0

    # Node differences
    nodes1 = set(g1.nodes())
    nodes2 = set(g2.nodes())

    # Nodes only in g1 (need to be deleted)
    deleted_nodes = nodes1 - nodes2
    cost += len(deleted_nodes) * config.node_deletion_cost

    # Nodes only in g2 (need to be inserted)
    inserted_nodes = nodes2 - nodes1
    cost += len(inserted_nodes) * config.node_insertion_cost

    # Nodes in both (might need substitution)
    common_nodes = nodes1 & nodes2
    for node in common_nodes:
        subst_cost = node_substitution_cost(g1.nodes[node], g2.nodes[node], config)
        cost += subst_cost

    # Edge differences
    edges1 = set(g1.edges())
    edges2 = set(g2.edges())

    deleted_edges = edges1 - edges2
    cost += len(deleted_edges) * config.edge_deletion_cost

    inserted_edges = edges2 - edges1
    cost += len(inserted_edges) * config.edge_insertion_cost

    return cost


def _calculate_max_cost(
    g1: nx.DiGraph, g2: nx.DiGraph, config: WorkflowComparisonConfig
) -> float:
    """
    Calculate theoretical maximum edit cost.
    This represents the cost of completely transforming g1 to g2.

    Args:
        g1: First graph
        g2: Second graph
        config: Configuration

    Returns:
        Maximum possible cost
    """
    # Worst case: delete all of g1, insert all of g2
    delete_cost = (
        len(g1.nodes()) * config.node_deletion_cost
        + len(g1.edges()) * config.edge_deletion_cost
    )
    insert_cost = (
        len(g2.nodes()) * config.node_insertion_cost
        + len(g2.edges()) * config.edge_insertion_cost
    )

    return delete_cost + insert_cost


def _extract_edit_operations(
    g1: nx.DiGraph, g2: nx.DiGraph, config: WorkflowComparisonConfig
) -> List[Dict[str, Any]]:
    """
    Extract and describe edit operations needed to transform g1 to g2.

    Args:
        g1: First graph (generated)
        g2: Second graph (ground truth)
        config: Configuration

    Returns:
        List of edit operations with descriptions and costs
    """
    operations = []

    nodes1 = set(g1.nodes())
    nodes2 = set(g2.nodes())

    # Node deletions (in generated but not in ground truth)
    for node in nodes1 - nodes2:
        node_data = g1.nodes[node]
        cost = node_deletion_cost(node_data, config)
        operations.append(
            {
                "type": "node_delete",
                "description": f"Remove node '{node}' (type: {node_data.get('type', 'unknown')})",
                "cost": cost,
                "priority": _determine_priority(cost, config),
                "node_name": node,
            }
        )

    # Node insertions (in ground truth but not in generated)
    for node in nodes2 - nodes1:
        node_data = g2.nodes[node]
        cost = node_insertion_cost(node_data, config)
        operations.append(
            {
                "type": "node_insert",
                "description": f"Add missing node '{node}' (type: {node_data.get('type', 'unknown')})",
                "cost": cost,
                "priority": _determine_priority(cost, config),
                "node_name": node,
            }
        )

    # Node substitutions (in both but potentially different)
    for node in nodes1 & nodes2:
        node1_data = g1.nodes[node]
        node2_data = g2.nodes[node]
        cost = node_substitution_cost(node1_data, node2_data, config)

        if cost > 0:
            type1 = node1_data.get("type", "unknown")
            type2 = node2_data.get("type", "unknown")

            if type1 != type2:
                desc = f"Change node '{node}' from type '{type1}' to '{type2}'"
            else:
                desc = f"Update parameters of node '{node}' (type: {type1})"

            operations.append(
                {
                    "type": "node_substitute",
                    "description": desc,
                    "cost": cost,
                    "priority": _determine_priority(cost, config),
                    "node_name": node,
                }
            )

    # Edge operations
    edges1 = set(g1.edges())
    edges2 = set(g2.edges())

    # Edge deletions
    for edge in edges1 - edges2:
        edge_data = g1.edges[edge]
        cost = edge_deletion_cost(edge_data, config)
        source, target = edge
        operations.append(
            {
                "type": "edge_delete",
                "description": f"Remove connection from '{source}' to '{target}'",
                "cost": cost,
                "priority": _determine_priority(cost, config),
            }
        )

    # Edge insertions
    for edge in edges2 - edges1:
        edge_data = g2.edges[edge]
        cost = edge_insertion_cost(edge_data, config)
        source, target = edge
        operations.append(
            {
                "type": "edge_insert",
                "description": f"Add missing connection from '{source}' to '{target}'",
                "cost": cost,
                "priority": _determine_priority(cost, config),
            }
        )

    return operations


def _determine_priority(cost: float, config: WorkflowComparisonConfig) -> str:
    """
    Determine priority level based on cost.

    Args:
        cost: Edit operation cost
        config: Configuration

    Returns:
        Priority level: 'critical', 'major', or 'minor'
    """
    # Critical: trigger mismatches and high-cost operations
    if cost >= config.node_substitution_trigger * 0.8:
        return "critical"
    elif cost >= config.node_substitution_different_type * 0.8:
        return "major"
    else:
        return "minor"
