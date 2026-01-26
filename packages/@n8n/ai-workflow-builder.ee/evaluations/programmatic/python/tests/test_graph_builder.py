"""
Tests for graph_builder module.
"""

from src.graph_builder import build_workflow_graph, graph_stats, _is_trigger_node
from src.config_loader import WorkflowComparisonConfig


def test_build_simple_workflow_graph():
    """Test building graph from simple workflow"""
    workflow = {
        "name": "Test Workflow",
        "nodes": [
            {
                "id": "1",
                "name": "Trigger",
                "type": "n8n-nodes-base.webhook",
                "parameters": {"path": "/test"},
            },
            {
                "id": "2",
                "name": "Process",
                "type": "n8n-nodes-base.code",
                "parameters": {},
            },
        ],
        "connections": {
            "Trigger": {"main": [[{"node": "Process", "type": "main", "index": 0}]]}
        },
    }

    graph = build_workflow_graph(workflow)

    assert graph.number_of_nodes() == 2
    assert graph.number_of_edges() == 1
    assert "Trigger" in graph.nodes
    assert "Process" in graph.nodes
    assert graph.has_edge("Trigger", "Process")


def test_build_graph_with_filtering():
    """Test that ignored nodes are filtered out"""
    workflow = {
        "name": "Test Workflow",
        "nodes": [
            {
                "id": "1",
                "name": "Note",
                "type": "n8n-nodes-base.stickyNote",
                "parameters": {"content": "This is a note"},
            },
            {
                "id": "2",
                "name": "Trigger",
                "type": "n8n-nodes-base.webhook",
                "parameters": {},
            },
        ],
        "connections": {},
    }

    config = WorkflowComparisonConfig()
    config.ignored_node_types.add("n8n-nodes-base.stickyNote")

    graph = build_workflow_graph(workflow, config)

    # Sticky note should be filtered out
    assert graph.number_of_nodes() == 1
    assert "Trigger" in graph.nodes
    assert "Note" not in graph.nodes


def test_parameter_filtering():
    """Test that ignored parameters are filtered"""
    workflow = {
        "name": "Test",
        "nodes": [
            {
                "id": "1",
                "name": "Node1",
                "type": "test.node",
                "position": [100, 200],
                "parameters": {
                    "important": "value",
                    "position": [100, 200],
                    "id": "123",
                },
            }
        ],
        "connections": {},
    }

    config = WorkflowComparisonConfig()
    config.ignored_global_parameters = {"position", "id"}

    graph = build_workflow_graph(workflow, config)

    node_data = graph.nodes["Node1"]
    params = node_data["parameters"]

    assert "important" in params
    assert "position" not in params
    assert "id" not in params


def test_is_trigger_node():
    """Test trigger node detection"""
    trigger_node = {"type": "n8n-nodes-base.webhook", "name": "Webhook Trigger"}
    assert _is_trigger_node(trigger_node) is True

    regular_node = {"type": "n8n-nodes-base.httpRequest", "name": "HTTP Request"}
    assert _is_trigger_node(regular_node) is False


def test_graph_stats():
    """Test graph statistics calculation"""
    workflow = {
        "name": "Test",
        "nodes": [
            {
                "id": "1",
                "name": "Trigger",
                "type": "n8n-nodes-base.manualTrigger",
                "parameters": {},
            },
            {
                "id": "2",
                "name": "Node1",
                "type": "n8n-nodes-base.code",
                "parameters": {},
            },
            {
                "id": "3",
                "name": "Node2",
                "type": "n8n-nodes-base.code",
                "parameters": {},
            },
        ],
        "connections": {
            "Trigger": {"main": [[{"node": "Node1", "type": "main", "index": 0}]]},
            "Node1": {"main": [[{"node": "Node2", "type": "main", "index": 0}]]},
        },
    }

    graph = build_workflow_graph(workflow)
    stats = graph_stats(graph)

    assert stats["node_count"] == 3
    assert stats["edge_count"] == 2
    assert stats["trigger_count"] == 1
    assert stats["is_connected"] is True


def test_empty_workflow():
    """Test building graph from empty workflow"""
    workflow = {"name": "Empty", "nodes": [], "connections": {}}

    graph = build_workflow_graph(workflow)

    assert graph.number_of_nodes() == 0
    assert graph.number_of_edges() == 0
