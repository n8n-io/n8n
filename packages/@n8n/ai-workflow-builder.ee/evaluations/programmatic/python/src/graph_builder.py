"""
Build NetworkX graphs from n8n workflow JSON structures.
"""

import networkx as nx
from typing import Dict, Any, Optional
from src.config_loader import WorkflowComparisonConfig


def build_workflow_graph(
    workflow: Dict[str, Any], config: Optional[WorkflowComparisonConfig] = None
) -> nx.DiGraph:
    """
    Convert n8n workflow to NetworkX directed graph.

    Args:
        workflow: n8n workflow JSON (with 'nodes' and 'connections')
        config: Optional configuration for filtering

    Returns:
        NetworkX DiGraph with nodes and edges
    """
    G = nx.DiGraph()

    if config is None:
        config = WorkflowComparisonConfig()

    # Add nodes with attributes
    for node in workflow.get("nodes", []):
        # Check if node should be ignored
        if config.should_ignore_node(node):
            continue

        node_name = node.get("name", node.get("id", "unknown"))

        # Filter parameters based on config
        filtered_params = _filter_parameters(
            node.get("parameters", {}), node.get("type", ""), config
        )

        # Add node with filtered parameters
        G.add_node(
            node_name,
            type=node.get("type", ""),
            type_version=node.get("typeVersion", 1),
            parameters=filtered_params,
            is_trigger=_is_trigger_node(node),
        )

    # Add edges from connections
    connections = workflow.get("connections", {})
    for source_name, source_conns in connections.items():
        # Skip if source node was filtered out
        if source_name not in G:
            continue

        for conn_type, conn_arrays in source_conns.items():
            # Check if this connection type should be ignored
            if conn_type in config.ignored_connection_types:
                continue

            # conn_arrays is typically: [[connections], [connections], ...]
            # where first index is output index
            for output_index, conn_array in enumerate(conn_arrays):
                if conn_array is None:
                    continue

                for conn in conn_array:
                    target_name = conn.get("node")

                    # Skip if target node was filtered out
                    if target_name not in G:
                        continue

                    # Add edge with connection metadata
                    # Include source and target node info for better matching
                    source_node_data = G.nodes[source_name]
                    target_node_data = G.nodes[target_name]

                    G.add_edge(
                        source_name,
                        target_name,
                        connection_type=conn.get("type", "main"),
                        source_index=output_index,
                        target_index=conn.get("index", 0),
                        source_node_type=source_node_data.get("type", ""),
                        target_node_type=target_node_data.get("type", ""),
                    )

    return G


def _filter_parameters(
    params: Dict[str, Any],
    node_type: str,
    config: WorkflowComparisonConfig,
    path_prefix: str = "",
) -> Dict[str, Any]:
    """
    Filter parameters based on configuration ignore rules.

    Args:
        params: Parameter dictionary to filter
        node_type: Type of the node (for node-specific filtering)
        config: Configuration with ignore rules
        path_prefix: Current parameter path (for nested params)

    Returns:
        Filtered parameter dictionary
    """
    filtered = {}

    for key, value in params.items():
        param_path = f"{path_prefix}.{key}" if path_prefix else key

        # Check if this parameter should be ignored
        if config.should_ignore_parameter(node_type, param_path):
            continue

        # Recursively filter nested dictionaries
        if isinstance(value, dict):
            nested_filtered = _filter_parameters(value, node_type, config, param_path)
            if nested_filtered:  # Only include if not empty
                filtered[key] = nested_filtered
        else:
            filtered[key] = value

    return filtered


def _is_trigger_node(node: Dict[str, Any]) -> bool:
    """
    Detect if a node is a trigger node.

    Args:
        node: Node dictionary

    Returns:
        True if node is a trigger
    """
    node_type = node.get("type", "").lower()
    node_name = node.get("name", "").lower()

    # Check if 'trigger' is in type or name
    if "trigger" in node_type or "trigger" in node_name:
        return True

    # Check for known trigger node types that don't have 'trigger' in the name
    trigger_types = [
        "webhook",  # n8n-nodes-base.webhook
        "webhooktrigger",
        "manualtrigger",
        "scheduletrigger",
        "chattrigger",
        "cron",  # n8n-nodes-base.cron
    ]

    for trigger_type in trigger_types:
        if trigger_type in node_type:
            return True

    return False


def get_node_data(graph: nx.DiGraph, node_name: str) -> Dict[str, Any]:
    """
    Get all data for a node from the graph.

    Args:
        graph: NetworkX graph
        node_name: Name of the node

    Returns:
        Dictionary with node attributes
    """
    if node_name not in graph:
        return {}

    return dict(graph.nodes[node_name])


def get_edge_data(graph: nx.DiGraph, source: str, target: str) -> Dict[str, Any]:
    """
    Get all data for an edge from the graph.

    Args:
        graph: NetworkX graph
        source: Source node name
        target: Target node name

    Returns:
        Dictionary with edge attributes
    """
    if not graph.has_edge(source, target):
        return {}

    return dict(graph.edges[source, target])


def graph_stats(graph: nx.DiGraph) -> Dict[str, Any]:
    """
    Get statistics about a workflow graph.

    Args:
        graph: NetworkX graph

    Returns:
        Dictionary with graph statistics
    """
    return {
        "node_count": graph.number_of_nodes(),
        "edge_count": graph.number_of_edges(),
        "trigger_count": sum(
            1 for _, data in graph.nodes(data=True) if data.get("is_trigger", False)
        ),
        "node_types": list(
            set(data.get("type", "unknown") for _, data in graph.nodes(data=True))
        ),
        "is_connected": nx.is_weakly_connected(graph)
        if graph.number_of_nodes() > 0
        else False,
    }
