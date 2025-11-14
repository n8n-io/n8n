"""
Tests for similarity module.
"""

from src.graph_builder import build_workflow_graph
from src.similarity import calculate_graph_edit_distance
from src.config_loader import WorkflowComparisonConfig


def test_identical_workflows():
    """Test that identical workflows have 100% similarity"""
    workflow = {
        "name": "Test",
        "nodes": [
            {
                "id": "1",
                "name": "Trigger",
                "type": "n8n-nodes-base.webhook",
                "parameters": {"path": "/test"},
            }
        ],
        "connections": {},
    }

    config = WorkflowComparisonConfig()
    g1 = build_workflow_graph(workflow, config)
    g2 = build_workflow_graph(workflow, config)

    result = calculate_graph_edit_distance(g1, g2, config)

    assert result["similarity_score"] == 1.0
    assert result["edit_cost"] == 0.0
    assert len(result["top_edits"]) == 0


def test_empty_workflows():
    """Test that empty workflows are identical"""
    workflow = {"name": "Empty", "nodes": [], "connections": {}}

    config = WorkflowComparisonConfig()
    g1 = build_workflow_graph(workflow, config)
    g2 = build_workflow_graph(workflow, config)

    result = calculate_graph_edit_distance(g1, g2, config)

    assert result["similarity_score"] == 1.0
    assert result["edit_cost"] == 0.0


def test_missing_node():
    """Test similarity when one workflow is missing a node"""
    workflow1 = {
        "name": "Test1",
        "nodes": [{"id": "1", "name": "Node1", "type": "test.node", "parameters": {}}],
        "connections": {},
    }

    workflow2 = {
        "name": "Test2",
        "nodes": [
            {"id": "1", "name": "Node1", "type": "test.node", "parameters": {}},
            {"id": "2", "name": "Node2", "type": "test.node", "parameters": {}},
        ],
        "connections": {},
    }

    config = WorkflowComparisonConfig()
    g1 = build_workflow_graph(workflow1, config)
    g2 = build_workflow_graph(workflow2, config)

    result = calculate_graph_edit_distance(g1, g2, config)

    # Should have less than 100% similarity
    assert result["similarity_score"] < 1.0
    # Should have edit operations
    assert len(result["top_edits"]) > 0
    # Should have a node insertion edit
    assert any(edit["type"] == "node_insert" for edit in result["top_edits"])


def test_trigger_mismatch():
    """Test that trigger mismatches have high cost"""
    workflow1 = {
        "name": "Test1",
        "nodes": [
            {
                "id": "1",
                "name": "Trigger",
                "type": "n8n-nodes-base.webhook",
                "parameters": {},
            }
        ],
        "connections": {},
    }

    workflow2 = {
        "name": "Test2",
        "nodes": [
            {
                "id": "1",
                "name": "Trigger",
                "type": "n8n-nodes-base.manualTrigger",
                "parameters": {},
            }
        ],
        "connections": {},
    }

    config = WorkflowComparisonConfig()
    g1 = build_workflow_graph(workflow1, config)
    g2 = build_workflow_graph(workflow2, config)

    result = calculate_graph_edit_distance(g1, g2, config)

    # Trigger mismatch should result in low similarity
    assert result["similarity_score"] < 0.8

    # NetworkX may choose delete+insert (cost 20) over substitution (cost 50)
    # but the important thing is that we detect it as a critical issue
    assert result["edit_cost"] >= (
        config.node_deletion_cost + config.node_insertion_cost
    )

    # Should have critical priority edit in the top edits
    assert len(result["top_edits"]) > 0
    assert any(edit["priority"] == "critical" for edit in result["top_edits"])


def test_parameter_differences():
    """Test that parameter differences affect similarity"""
    workflow1 = {
        "name": "Test1",
        "nodes": [
            {
                "id": "1",
                "name": "Node",
                "type": "test.node",
                "parameters": {"value": "a"},
            }
        ],
        "connections": {},
    }

    workflow2 = {
        "name": "Test2",
        "nodes": [
            {
                "id": "1",
                "name": "Node",
                "type": "test.node",
                "parameters": {"value": "b"},
            }
        ],
        "connections": {},
    }

    config = WorkflowComparisonConfig()
    g1 = build_workflow_graph(workflow1, config)
    g2 = build_workflow_graph(workflow2, config)

    result = calculate_graph_edit_distance(g1, g2, config)

    # Should not be identical due to parameter difference
    assert result["similarity_score"] < 1.0
    # But should still be fairly similar (same structure)
    assert result["similarity_score"] > 0.8


def test_connection_difference():
    """Test that connection differences are detected"""
    workflow1 = {
        "name": "Test1",
        "nodes": [
            {"id": "1", "name": "Node1", "type": "test.node", "parameters": {}},
            {"id": "2", "name": "Node2", "type": "test.node", "parameters": {}},
        ],
        "connections": {},  # No connections
    }

    workflow2 = {
        "name": "Test2",
        "nodes": [
            {"id": "1", "name": "Node1", "type": "test.node", "parameters": {}},
            {"id": "2", "name": "Node2", "type": "test.node", "parameters": {}},
        ],
        "connections": {
            "Node1": {"main": [[{"node": "Node2", "type": "main", "index": 0}]]}
        },
    }

    config = WorkflowComparisonConfig()
    g1 = build_workflow_graph(workflow1, config)
    g2 = build_workflow_graph(workflow2, config)

    result = calculate_graph_edit_distance(g1, g2, config)

    # Should have lower similarity due to missing connection
    assert result["similarity_score"] < 1.0
    # Should have edge insertion in edits
    assert any(edit["type"] == "edge_insert" for edit in result["top_edits"])
