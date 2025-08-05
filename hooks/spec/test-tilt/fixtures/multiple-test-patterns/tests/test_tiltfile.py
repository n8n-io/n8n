#!/usr/bin/env python3
"""Test file in tests/ directory."""

import pytest


def test_pattern3_in_tests_dir():
    """Test located in tests directory."""
    result = 10 / 2
    assert result == 5.0


def test_local_resources():
    """Test local resource definitions."""
    resources = ['test-tiltfile', 'test-prefix', 'test-dir']
    assert len(resources) == 3
    assert 'test-tiltfile' in resources


@pytest.mark.parametrize("input,expected", [
    (1, 1),
    (2, 4),
    (3, 9),
    (4, 16),
])
def test_parametrized(input, expected):
    """Parametrized test example."""
    assert input ** 2 == expected