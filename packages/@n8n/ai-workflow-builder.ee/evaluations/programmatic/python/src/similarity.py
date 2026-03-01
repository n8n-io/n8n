"""
Calculate workflow similarity using graph edit distance.
"""

import networkx as nx
from typing import Dict, List, Any, Optional
from src.config_loader import WorkflowComparisonConfig
from src.cost_functions import (
    node_substitution_cost,
    node_deletion_cost,
    node_insertion_cost,
    edge_substitution_cost,
    edge_deletion_cost,
    edge_insertion_cost,
    get_parameter_diff,
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
        return node_substitution_cost(n1_attrs, n2_attrs, config)

    def node_del_cost(n_attrs):
        return node_deletion_cost(n_attrs, config)

    def node_ins_cost(n_attrs):
        return node_insertion_cost(n_attrs, config)

    # Edge match function - returns True if edges are equivalent
    # This is better than cost functions for preventing false positives
    def edge_match(e1_attrs, e2_attrs):
        """Check if two edges match (same connection type or equivalent)"""
        conn_type1 = e1_attrs.get("connection_type", "main")
        conn_type2 = e2_attrs.get("connection_type", "main")

        # Exact match
        if conn_type1 == conn_type2:
            return True

        # Check for equivalent types in config
        for equiv_group in config.equivalent_connection_types:
            if conn_type1 in equiv_group and conn_type2 in equiv_group:
                return True

        return False

    # Calculate GED using NetworkX
    # Note: This can be slow for large graphs, but workflow graphs are typically small
    try:
        # Use optimize_edit_paths with edge_match instead of edge cost functions
        # This prevents false positive edge insertions/deletions
        edit_path_generator = nx.optimize_edit_paths(
            g1_relabeled,
            g2_relabeled,
            node_subst_cost=node_subst_cost,
            node_del_cost=node_del_cost,
            node_ins_cost=node_ins_cost,
            edge_match=edge_match,
            upper_bound=None,  # Calculate exact
        )

        # Get the best (first) edit path
        best_edit_path = None
        for node_edit_path, edge_edit_path, cost in edit_path_generator:
            best_edit_path = (node_edit_path, edge_edit_path, cost)
            break  # Take the first (best) path

        if not best_edit_path:
            # Fallback to basic calculation
            edit_cost = _calculate_basic_edit_cost(g1, g2, config)
            node_edit_path = []
            edge_edit_path = []
        else:
            node_edit_path, edge_edit_path, edit_cost = best_edit_path

        # Extract and rank edit operations
        # Use the actual edit path from NetworkX if available
        if best_edit_path:
            edit_ops = _extract_operations_from_path(
                node_edit_path,
                edge_edit_path,
                g1_relabeled,
                g2_relabeled,
                config,
                g1_mapping,
                g2_mapping,
            )
        else:
            edit_ops = []
    except Exception as e:
        # Fallback if NetworkX GED fails
        print(f"Warning: GED calculation failed, using fallback: {e}")
        edit_cost = _calculate_basic_edit_cost(g1, g2, config)
        edit_ops = []

    # Calculate theoretical maximum cost
    max_cost = _calculate_max_cost(g1, g2, config)

    # Avoid division by zero
    if max_cost == 0:
        similarity_score = 1.0 if edit_cost == 0 else 0.0
    else:
        # Similarity score: 1 - (cost / max_cost)
        similarity_score = max(0.0, min(1.0, 1.0 - (edit_cost / max_cost)))

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


def _extract_operations_from_path(
    node_edit_path: List[tuple],
    edge_edit_path: List[tuple],
    g1: nx.DiGraph,
    g2: nx.DiGraph,
    config: WorkflowComparisonConfig,
    g1_name_mapping: Dict[str, str],
    g2_name_mapping: Dict[str, str],
) -> List[Dict[str, Any]]:
    """
    Extract edit operations from NetworkX's edit path.

    Args:
        node_edit_path: List of node edit tuples (u, v) where:
            - (u, v): nodes u in g1 and v in g2 are matched/substituted
            - (u, None): node u in g1 is deleted
            - (None, v): node v in g2 is inserted
        edge_edit_path: List of edge edit tuples ((u1, v1), (u2, v2))
        g1, g2: Relabeled graphs
        config: Configuration
        g1_name_mapping, g2_name_mapping: Mappings to original names

    Returns:
        List of edit operations with descriptions and costs
    """
    operations = []

    # Helper to get display name
    def get_display_name(
        node_id: str, mapping: Dict[str, str], graph: nx.DiGraph
    ) -> str:
        if mapping and node_id in mapping:
            return mapping[node_id]
        return graph.nodes[node_id].get("_original_name", node_id)

    # Process node edits
    for u, v in node_edit_path:
        if u is None:
            # Node insertion (v in g2 is inserted)
            node_data = g2.nodes[v]
            display_name = get_display_name(v, g2_name_mapping, g2)
            cost = node_insertion_cost(node_data, config)
            if cost > 0:
                operations.append(
                    {
                        "type": "node_insert",
                        "description": f"Add missing node '{display_name}' (type: {node_data.get('type', 'unknown')})",
                        "cost": cost,
                        "priority": _determine_priority(
                            cost, config, node_data, "node_insert"
                        ),
                        "node_name": display_name,
                    }
                )
        elif v is None:
            # Node deletion (u in g1 is deleted)
            node_data = g1.nodes[u]
            display_name = get_display_name(u, g1_name_mapping, g1)
            cost = node_deletion_cost(node_data, config)
            if cost > 0:
                operations.append(
                    {
                        "type": "node_delete",
                        "description": f"Remove node '{display_name}' (type: {node_data.get('type', 'unknown')})",
                        "cost": cost,
                        "priority": _determine_priority(
                            cost, config, node_data, "node_delete"
                        ),
                        "node_name": display_name,
                    }
                )
        else:
            # Node substitution (u in g1 matched to v in g2)
            node1_data = g1.nodes[u]
            node2_data = g2.nodes[v]
            display_name = get_display_name(u, g1_name_mapping, g1)
            cost = node_substitution_cost(node1_data, node2_data, config)
            if cost > 0:
                type1 = node1_data.get("type", "unknown")
                type2 = node2_data.get("type", "unknown")

                operation_data = {
                    "type": "node_substitute",
                    "cost": cost,
                    "priority": _determine_priority(
                        cost, config, node1_data, "node_substitute"
                    ),
                    "node_name": display_name,
                }

                if type1 != type2:
                    operation_data["description"] = (
                        f"Change node '{display_name}' from type '{type1}' to '{type2}'"
                    )
                else:
                    operation_data["description"] = (
                        f"Update parameters of node '{display_name}' (type: {type1})"
                    )
                    # Extract parameter diff for same-type substitutions
                    params1 = node1_data.get("parameters", {})
                    params2 = node2_data.get("parameters", {})
                    if params1 or params2:
                        param_diff = get_parameter_diff(params1, params2, type1, config)
                        if param_diff:
                            operation_data["parameter_diff"] = param_diff

                operations.append(operation_data)

    # Process edge edits
    # Note: With edge_match function, the GED algorithm should only report
    # edges that truly differ, so we don't need complex filtering here
    for e1, e2 in edge_edit_path:
        if e1 is None:
            # Edge insertion
            u2, v2 = e2
            edge_data = g2.edges[e2]
            source_display = get_display_name(u2, g2_name_mapping, g2)
            target_display = get_display_name(v2, g2_name_mapping, g2)
            cost = edge_insertion_cost(edge_data, config)
            if cost > 0:
                operations.append(
                    {
                        "type": "edge_insert",
                        "description": f"Add missing connection from '{source_display}' to '{target_display}'",
                        "cost": cost,
                        "priority": _determine_priority(cost, config),
                    }
                )
        elif e2 is None:
            # Edge deletion
            u1, v1 = e1
            edge_data = g1.edges[e1]
            source_display = get_display_name(u1, g1_name_mapping, g1)
            target_display = get_display_name(v1, g1_name_mapping, g1)
            cost = edge_deletion_cost(edge_data, config)
            if cost > 0:
                operations.append(
                    {
                        "type": "edge_delete",
                        "description": f"Remove connection from '{source_display}' to '{target_display}'",
                        "cost": cost,
                        "priority": _determine_priority(cost, config),
                    }
                )
        else:
            # Edge substitution
            u1, v1 = e1
            u2, v2 = e2
            edge1_data = g1.edges[e1]
            edge2_data = g2.edges[e2]
            cost = edge_substitution_cost(edge1_data, edge2_data, config)
            if cost > 0:
                source_display = get_display_name(u1, g1_name_mapping, g1)
                target_display = get_display_name(v1, g1_name_mapping, g1)
                operations.append(
                    {
                        "type": "edge_substitute",
                        "description": f"Update connection from '{source_display}' to '{target_display}'",
                        "cost": cost,
                        "priority": _determine_priority(cost, config),
                    }
                )

    return operations


def _determine_priority(
    cost: float,
    config: WorkflowComparisonConfig,
    node_data: Optional[Dict[str, Any]] = None,
    operation_type: Optional[str] = None,
) -> str:
    """
    Determine priority level based on cost, node type, and operation.

    Args:
        cost: Edit operation cost
        config: Configuration
        node_data: Optional node data to check if it's a trigger
        operation_type: Type of operation (node_insert, node_delete, node_substitute, etc.)

    Returns:
        Priority level: 'critical', 'major', or 'minor'
    """
    # Critical: trigger deletions/insertions (but not minor parameter updates)
    if node_data and node_data.get("is_trigger", False):
        if operation_type in ("node_insert", "node_delete"):
            return "critical"

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
    # Sort nodes by structural properties for consistent matching
    nodes_with_data = list(graph.nodes(data=True))

    # Define sorting key based on structural properties
    def node_sort_key(node_tuple):
        name, data = node_tuple
        return (
            data.get("type", ""),  # Sort by type for consistency
            -graph.out_degree(name),  # Then by out-degree (descending)
            -graph.in_degree(name),  # Then by in-degree (descending)
            name,  # Finally by name for deterministic ordering
        )

    # Separate and sort triggers and non-triggers
    triggers = sorted(
        [
            (name, data)
            for name, data in nodes_with_data
            if data.get("is_trigger", False)
        ],
        key=node_sort_key,
    )
    non_triggers = sorted(
        [
            (name, data)
            for name, data in nodes_with_data
            if not data.get("is_trigger", False)
        ],
        key=node_sort_key,
    )

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

    # Create relabeled graph - this preserves all node attributes
    relabeled = nx.relabel_nodes(graph, mapping, copy=True)

    # Store original names in node attributes for matching
    # This helps the GED algorithm match nodes correctly
    for new_label, original_name in reverse_mapping.items():
        if new_label in relabeled.nodes:
            relabeled.nodes[new_label]["_original_name"] = original_name
            # Add a normalized name hash to help with matching nodes of the same type
            # Normalize by replacing smart quotes with regular quotes for comparison
            # U+2018 (') -> U+0027 ('), U+2019 (') -> U+0027 (')
            # U+201C (") -> U+0022 ("), U+201D (") -> U+0022 (")
            normalized_name = original_name.replace("\u2018", "'").replace(
                "\u2019", "'"
            )
            normalized_name = normalized_name.replace("\u201c", '"').replace(
                "\u201d", '"'
            )
            relabeled.nodes[new_label]["_name_hash"] = hash(normalized_name)

    return relabeled, reverse_mapping
