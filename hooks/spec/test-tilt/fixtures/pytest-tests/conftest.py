#!/usr/bin/env python3
"""Pytest configuration and shared fixtures."""

import pytest
import os
import sys

# Add current directory to path for Tiltfile imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(scope="session")
def tiltfile_path():
    """Path to the Tiltfile being tested."""
    return os.path.join(os.path.dirname(__file__), 'Tiltfile')


@pytest.fixture
def clean_environment():
    """Provide clean environment for each test."""
    original_env = os.environ.copy()
    yield
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def mock_tilt_functions():
    """Mock all Tilt built-in functions."""
    from unittest.mock import MagicMock
    
    mocks = {
        'load': MagicMock(),
        'docker_build': MagicMock(),
        'docker_build_with_restart': MagicMock(),
        'k8s_yaml': MagicMock(),
        'k8s_resource': MagicMock(),
        'local_resource': MagicMock(),
        'config': MagicMock(),
    }
    
    # Setup config mock
    mocks['config'].define_string = MagicMock()
    mocks['config'].parse = MagicMock(return_value={'env': 'development'})
    
    return mocks


# Pytest markers
def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow"
    )