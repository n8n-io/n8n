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

    # Relabel graphs to use structural IDs instead of node names
    # This ensures nodes are matched by type/position, not by name
    g1_relabeled, g1_mapping = _relabel_graph_by_structure(g1)
    g2_relabeled, g2_mapping = _relabel_graph_by_structure(g2)

    # Create cost function closures with config
    # NetworkX passes node ATTRIBUTE DICTS, not node names
    def node_subst_cost(n1_attrs, n2_attrs):
        cost = node_substitution_cost(n1_attrs, n2_attrs, config)
        print(f"DEBUG node_subst_cost: {cost}", file=__import__("sys").stderr)
        return cost

    def node_del_cost(n_attrs):
        cost = node_deletion_cost(n_attrs, config)
        print(f"DEBUG node_del_cost: {cost}", file=__import__("sys").stderr)
        return cost

    def node_ins_cost(n_attrs):
        cost = node_insertion_cost(n_attrs, config)
        print(f"DEBUG node_ins_cost: {cost}")
        return cost

    # Edge cost functions receive edge attribute dicts from NetworkX
    def edge_subst_cost(e1_attrs, e2_attrs):
        cost = edge_substitution_cost(e1_attrs, e2_attrs, config)
        print(f"DEBUG edge_subst_cost: {cost}")
        return cost

    def edge_del_cost(e_attrs):
        cost = edge_deletion_cost(e_attrs, config)
        print(f"DEBUG edge_del_cost: {cost}")
        return cost

    def edge_ins_cost(e_attrs):
        cost = edge_insertion_cost(e_attrs, config)
        print(f"DEBUG edge_ins_cost: {cost}")
        return cost

    # Calculate GED using NetworkX
    # Note: This can be slow for large graphs, but workflow graphs are typically small
    try:
        # Use optimize_graph_edit_distance for better performance
        # This returns an iterator of possible edit costs
        edit_paths = list(
            nx.optimize_graph_edit_distance(
                g1_relabeled,
                g2_relabeled,
                node_subst_cost=node_subst_cost,
                node_del_cost=node_del_cost,
                node_ins_cost=node_ins_cost,
                edge_subst_cost=edge_subst_cost,
                edge_del_cost=edge_del_cost,
                edge_ins_cost=edge_ins_cost,
                upper_bound=None,  # Calculate exact
            )
        )

        print(f"DEBUG: edit_paths = {edit_paths}", file=__import__("sys").stderr)

        if not edit_paths:
            # Fallback to basic calculation
            print("DEBUG: Using fallback", file=__import__("sys").stderr)
            edit_cost = _calculate_basic_edit_cost(g1, g2, config)
        else:
            edit_cost = min(edit_paths)  # Best (lowest cost) path
            print(
                f"DEBUG: Using NetworkX GED, min cost = {edit_cost}",
                file=__import__("sys").stderr,
            )

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
    # Use relabeled graphs for structural matching, but keep original names for display
    edit_ops = _extract_edit_operations(
        g1_relabeled, g2_relabeled, config, g1_mapping, g2_mapping
    )

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
    g1: nx.DiGraph,
    g2: nx.DiGraph,
    config: WorkflowComparisonConfig,
    g1_name_mapping: Dict[str, str] = None,
    g2_name_mapping: Dict[str, str] = None,
) -> List[Dict[str, Any]]:
    """
    Extract and describe edit operations needed to transform g1 to g2.

    Args:
        g1: First graph (generated, possibly relabeled)
        g2: Second graph (ground truth, possibly relabeled)
        config: Configuration
        g1_name_mapping: Optional mapping from structural IDs to original names for g1
        g2_name_mapping: Optional mapping from structural IDs to original names for g2

    Returns:
        List of edit operations with descriptions and costs
    """
    operations = []

    # Helper to get display name
    def get_display_name(node_id: str, mapping: Dict[str, str], graph: nx.DiGraph) -> str:
        if mapping and node_id in mapping:
            return mapping[node_id]
        # Fallback to _original_name attribute or the ID itself
        return graph.nodes[node_id].get("_original_name", node_id)

    nodes1 = set(g1.nodes())
    nodes2 = set(g2.nodes())

    # Node deletions (in generated but not in ground truth)
    for node in nodes1 - nodes2:
        node_data = g1.nodes[node]
        display_name = get_display_name(node, g1_name_mapping, g1)
        cost = node_deletion_cost(node_data, config)
        operations.append(
            {
                "type": "node_delete",
                "description": f"Remove node '{display_name}' (type: {node_data.get('type', 'unknown')})",
                "cost": cost,
                "priority": _determine_priority(cost, config),
                "node_name": display_name,
            }
        )

    # Node insertions (in ground truth but not in generated)
    for node in nodes2 - nodes1:
        node_data = g2.nodes[node]
        display_name = get_display_name(node, g2_name_mapping, g2)
        cost = node_insertion_cost(node_data, config)
        operations.append(
            {
                "type": "node_insert",
                "description": f"Add missing node '{display_name}' (type: {node_data.get('type', 'unknown')})",
                "cost": cost,
                "priority": _determine_priority(cost, config),
                "node_name": display_name,
            }
        )

    # Node substitutions (in both but potentially different)
    for node in nodes1 & nodes2:
        node1_data = g1.nodes[node]
        node2_data = g2.nodes[node]
        display_name = get_display_name(node, g1_name_mapping, g1)
        cost = node_substitution_cost(node1_data, node2_data, config)

        if cost > 0:
            type1 = node1_data.get("type", "unknown")
            type2 = node2_data.get("type", "unknown")

            if type1 != type2:
                desc = f"Change node '{display_name}' from type '{type1}' to '{type2}'"
            else:
                desc = f"Update parameters of node '{display_name}' (type: {type1})"

            operations.append(
                {
                    "type": "node_substitute",
                    "description": desc,
                    "cost": cost,
                    "priority": _determine_priority(cost, config),
                    "node_name": display_name,
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
        source_display = get_display_name(source, g1_name_mapping, g1)
        target_display = get_display_name(target, g1_name_mapping, g1)
        operations.append(
            {
                "type": "edge_delete",
                "description": f"Remove connection from '{source_display}' to '{target_display}'",
                "cost": cost,
                "priority": _determine_priority(cost, config),
            }
        )

    # Edge insertions
    for edge in edges2 - edges1:
        edge_data = g2.edges[edge]
        cost = edge_insertion_cost(edge_data, config)
        source, target = edge
        source_display = get_display_name(source, g2_name_mapping, g2)
        target_display = get_display_name(target, g2_name_mapping, g2)
        operations.append(
            {
                "type": "edge_insert",
                "description": f"Add missing connection from '{source_display}' to '{target_display}'",
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


def _relabel_graph_by_structure(graph: nx.DiGraph) -> tuple[nx.DiGraph, Dict[str, str]]:
    """
    Relabel graph nodes using structural IDs instead of names.

    This ensures nodes are matched by their type and position in the workflow,
    not by their display names. The original name is preserved as a node attribute.

    Args:
        graph: Original graph with name-based node IDs

    Returns:
        Tuple of (relabeled_graph, mapping_dict) where:
        - relabeled_graph: Graph with structural IDs
        - mapping_dict: Maps new IDs back to original names
    """
    # Sort nodes by type (triggers first) and then by their original order
    nodes_with_data = list(graph.nodes(data=True))

    # Separate triggers and non-triggers
    triggers = [(name, data) for name, data in nodes_with_data if data.get("is_trigger", False)]
    non_triggers = [(name, data) for name, data in nodes_with_data if not data.get("is_trigger", False)]

    # Create new labels: trigger_0, trigger_1, node_0, node_1, etc.
    mapping = {}
    reverse_mapping = {}

    for i, (original_name, _) in enumerate(triggers):
        new_label = f"trigger_{i}"
        mapping[original_name] = new_label
        reverse_mapping[new_label] = original_name

    for i, (original_name, _) in enumerate(non_triggers):
        new_label = f"node_{i}"
        mapping[original_name] = new_label
        reverse_mapping[new_label] = original_name

    # Create relabeled graph
    relabeled = nx.relabel_nodes(graph, mapping, copy=True)

    # Store original names in node attributes
    for new_label, original_name in reverse_mapping.items():
        if new_label in relabeled.nodes:
            relabeled.nodes[new_label]["_original_name"] = original_name

    return relabeled, reverse_mapping
