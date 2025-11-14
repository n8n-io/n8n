"""
Cost functions for graph edit distance operations.
Configuration-aware costs for node and edge operations.
"""

import json
from typing import Dict, Any
from src.config_loader import WorkflowComparisonConfig, ParameterComparisonRule


def node_substitution_cost(
    node1_data: Dict[str, Any],
    node2_data: Dict[str, Any],
    config: WorkflowComparisonConfig,
) -> float:
    """
    Calculate cost of substituting node1 with node2.

    Args:
        node1_data: Attributes of first node
        node2_data: Attributes of second node
        config: Configuration with cost weights

    Returns:
        Cost value (0 = identical, higher = more different)
    """
    # Check for exemptions
    original_json = node1_data.get("_original_data_json", "{}")
    original_data = json.loads(original_json)
    exemption_penalty = config.get_exemption_penalty(original_data, "generated")
    if exemption_penalty is not None:
        return exemption_penalty

    # Get node types first for trigger detection
    type1 = node1_data.get("type", "")
    type2 = node2_data.get("type", "")

    # Critical: Trigger nodes
    is_trigger1 = node1_data.get("is_trigger", False)
    is_trigger2 = node2_data.get("is_trigger", False)

    # If both are triggers but different types, high cost
    if is_trigger1 and is_trigger2 and type1 != type2:
        return config.node_substitution_trigger

    # If one is trigger and other isn't, high cost
    if is_trigger1 != is_trigger2:
        return config.node_substitution_trigger

    # Same type: compare parameters

    if type1 == type2:
        # Parse parameters from JSON
        params1 = json.loads(node1_data.get("_parameters_json", "{}"))
        params2 = json.loads(node2_data.get("_parameters_json", "{}"))

        param_diff = compare_parameters(params1, params2, type1, config)

        # If parameters are identical, no cost
        if param_diff == 0:
            return 0.0

        # Otherwise, base cost plus parameter difference
        return config.node_substitution_same_type + (
            param_diff * config.parameter_mismatch_weight
        )

    # Similar types (from config)
    if config.are_node_types_similar(type1, type2):
        return config.node_substitution_similar_type

    # Completely different
    return config.node_substitution_different_type


def node_deletion_cost(
    node_data: Dict[str, Any], config: WorkflowComparisonConfig
) -> float:
    """
    Calculate cost of deleting a node.

    Args:
        node_data: Attributes of the node to delete
        config: Configuration with cost weights

    Returns:
        Cost value
    """
    # Check for exemptions
    original_json = node_data.get("_original_data_json", "{}")
    original_data = json.loads(original_json)
    exemption_penalty = config.get_exemption_penalty(original_data, "generated")
    if exemption_penalty is not None:
        return exemption_penalty

    return config.node_deletion_cost


def node_insertion_cost(
    node_data: Dict[str, Any], config: WorkflowComparisonConfig
) -> float:
    """
    Calculate cost of inserting a node.

    Args:
        node_data: Attributes of the node to insert
        config: Configuration with cost weights

    Returns:
        Cost value
    """
    # Check for exemptions
    original_json = node_data.get("_original_data_json", "{}")
    original_data = json.loads(original_json)
    exemption_penalty = config.get_exemption_penalty(original_data, "ground_truth")
    if exemption_penalty is not None:
        return exemption_penalty

    return config.node_insertion_cost


def edge_substitution_cost(
    edge1_data: Dict[str, Any],
    edge2_data: Dict[str, Any],
    config: WorkflowComparisonConfig,
) -> float:
    """
    Calculate cost of changing edge connection type.

    Args:
        edge1_data: Attributes of first edge
        edge2_data: Attributes of second edge
        config: Configuration with cost weights

    Returns:
        Cost value
    """
    # Check if connection types are equivalent
    conn_type1 = edge1_data.get("connection_type", "main")
    conn_type2 = edge2_data.get("connection_type", "main")

    # Check for equivalent types in config
    for equiv_group in config.equivalent_connection_types:
        if conn_type1 in equiv_group and conn_type2 in equiv_group:
            return 0.0  # No cost for equivalent types

    # Lower cost if connection type stays the same
    if conn_type1 == conn_type2:
        return config.edge_substitution_cost * 0.5

    return config.edge_substitution_cost


def edge_deletion_cost(
    edge_data: Dict[str, Any], config: WorkflowComparisonConfig
) -> float:
    """Calculate cost of deleting an edge"""
    return config.edge_deletion_cost


def edge_insertion_cost(
    edge_data: Dict[str, Any], config: WorkflowComparisonConfig
) -> float:
    """Calculate cost of inserting an edge"""
    return config.edge_insertion_cost


def compare_parameters(
    params1: Dict[str, Any],
    params2: Dict[str, Any],
    node_type: str,
    config: WorkflowComparisonConfig,
    path_prefix: str = "",
) -> float:
    """
    Deep comparison of parameters with config-aware filtering.

    Args:
        params1: First parameter dictionary
        params2: Second parameter dictionary
        node_type: Type of the node (for node-specific rules)
        config: Configuration with comparison rules
        path_prefix: Current parameter path (for nested params)

    Returns:
        Score representing parameter difference (higher = more different)
    """
    all_keys = set(params1.keys()) | set(params2.keys())
    diff_score = 0.0

    for key in all_keys:
        param_path = f"{path_prefix}.{key}" if path_prefix else key

        # Check if this parameter should be ignored (should be filtered already, but double-check)
        if config.should_ignore_parameter(node_type, param_path):
            continue

        # Get comparison rule for this parameter
        rule = config.get_parameter_rule(param_path)

        # Handle missing keys
        if key not in params1 or key not in params2:
            diff_score += 1.0
            continue

        val1, val2 = params1[key], params2[key]

        # Apply comparison rule if exists
        if rule:
            cost = apply_comparison_rule(val1, val2, rule)
            diff_score += cost
            continue

        # Default comparison logic
        if isinstance(val1, dict) and isinstance(val2, dict):
            # Recursive for nested objects
            nested_diff = compare_parameters(val1, val2, node_type, config, param_path)
            diff_score += nested_diff * config.parameter_nested_weight
        elif isinstance(val1, list) and isinstance(val2, list):
            # Compare lists (order matters)
            diff_score += compare_lists(val1, val2, config)
        elif val1 != val2:
            diff_score += 1.0

    return diff_score


def compare_lists(list1: list, list2: list, config: WorkflowComparisonConfig) -> float:
    """
    Compare two lists with tolerance for order and content.

    Args:
        list1: First list
        list2: Second list
        config: Configuration

    Returns:
        Difference score
    """
    # Simple approach: penalize length difference and content difference
    if len(list1) != len(list2):
        return abs(len(list1) - len(list2)) * 0.5

    # Compare elements pairwise
    diff = 0.0
    for v1, v2 in zip(list1, list2):
        if isinstance(v1, dict) and isinstance(v2, dict):
            # Nested dict comparison (simplified)
            if v1 != v2:
                diff += 0.5
        elif v1 != v2:
            diff += 1.0

    return diff


def apply_comparison_rule(val1: Any, val2: Any, rule: ParameterComparisonRule) -> float:
    """
    Apply custom comparison rule to parameter values.

    Args:
        val1: First value
        val2: Second value
        rule: Comparison rule to apply

    Returns:
        Cost based on rule
    """
    if rule.type == "semantic":
        # Semantic similarity (simplified version)
        similarity = calculate_semantic_similarity(str(val1), str(val2))
        if similarity >= (rule.threshold or 0.8):
            return 0.0
        return rule.cost_if_below

    elif rule.type == "numeric":
        # Numeric tolerance
        try:
            num1, num2 = float(val1), float(val2)
            if abs(num1 - num2) <= (rule.tolerance or 0):
                return 0.0
            return rule.cost_if_exceeded
        except (ValueError, TypeError):
            # Not numeric, count as different
            return 1.0

    elif rule.type == "normalized":
        # Normalized comparison (e.g., URLs)
        norm1 = normalize_value(val1, rule.options)
        norm2 = normalize_value(val2, rule.options)
        if norm1 == norm2:
            return 0.0
        return 1.0

    # Default: exact match
    return 0.0 if val1 == val2 else 1.0


def calculate_semantic_similarity(text1: str, text2: str) -> float:
    """
    Calculate semantic similarity between two text strings.

    This is a placeholder using simple word overlap (Jaccard similarity).
    In a production system, this could use sentence-transformers or similar.

    Args:
        text1: First text
        text2: Second text

    Returns:
        Similarity score 0-1 (1 = identical)
    """
    # Convert to lowercase and split into words
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())

    if not words1 and not words2:
        return 1.0
    if not words1 or not words2:
        return 0.0

    # Jaccard similarity: intersection / union
    intersection = words1 & words2
    union = words1 | words2

    return len(intersection) / len(union)


def normalize_value(value: Any, options: Dict[str, Any]) -> Any:
    """
    Normalize value based on options.

    Args:
        value: Value to normalize
        options: Normalization options

    Returns:
        Normalized value
    """
    if isinstance(value, str):
        # URL normalization
        if value.startswith("http"):
            normalized = value
            if options.get("ignore_trailing_slash", False):
                normalized = normalized.rstrip("/")
            # Could add more URL normalization here
            return normalized

        # String normalization
        if options.get("case_insensitive", False):
            return value.lower()

    return value
