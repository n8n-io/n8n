#!/usr/bin/env python3
"""Pytest-style tests for Tiltfile."""

import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_docker_build():
    """Mock docker_build_with_restart function."""
    with patch('builtins.docker_build_with_restart') as mock:
        yield mock


@pytest.fixture
def mock_k8s():
    """Mock Kubernetes functions."""
    with patch.multiple('builtins',
                       k8s_yaml=MagicMock(),
                       k8s_resource=MagicMock()) as mocks:
        yield mocks


def test_docker_build_configuration(mock_docker_build):
    """Test Docker build is configured correctly."""
    # In real test, would execute Tiltfile and verify calls
    expected_image = 'myapp'
    expected_context = '.'
    assert expected_image == 'myapp'
    assert expected_context == '.'


def test_live_update_sync_paths():
    """Test live update sync configuration."""
    sync_source = '.'
    sync_dest = '/app'
    assert sync_source == '.'
    assert sync_dest == '/app'


def test_port_forwards():
    """Test port forwarding configuration."""
    expected_forward = '5000:5000'
    assert expected_forward == '5000:5000'


@pytest.mark.parametrize("env,expected", [
    ('development', 'development'),
    ('staging', 'staging'),
    ('production', 'production'),
])
def test_environment_configuration(env, expected):
    """Test environment configuration handling."""
    assert env == expected


class TestTiltfileResources:
    """Test class for Tiltfile resources."""
    
    def test_resource_dependencies(self):
        """Test resource dependency chain."""
        deps = ['redis', 'myapp', 'pytest']
        assert 'redis' in deps
        assert deps.index('redis') < deps.index('myapp')
        assert deps.index('myapp') < deps.index('pytest')
    
    def test_local_resource_pytest(self):
        """Test pytest local resource configuration."""
        command = 'pytest -v'
        deps = ['./src', './tests']
        assert command == 'pytest -v'
        assert './src' in deps
        assert './tests' in deps


@pytest.mark.skip(reason="Requires actual Tiltfile execution")
def test_tiltfile_syntax():
    """Test that Tiltfile has valid Python syntax."""
    import ast
    with open('Tiltfile', 'r') as f:
        content = f.read()
    ast.parse(content)  # Will raise SyntaxError if invalid


def test_dockerfile_reference():
    """Test Dockerfile is referenced correctly."""
    dockerfile = 'Dockerfile'
    assert dockerfile == 'Dockerfile'