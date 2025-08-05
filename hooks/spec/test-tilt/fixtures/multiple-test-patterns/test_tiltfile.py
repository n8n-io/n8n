#!/usr/bin/env python3
"""Test file following test_*.py pattern."""



def test_pattern2_basic():
    """Basic test using pytest style."""
    assert 2 * 2 == 4


def test_pattern2_k8s_config():
    """Test Kubernetes configuration."""
    # Would test k8s_yaml and k8s_resource in real scenario
    assert True


class TestPattern2Class:
    """Test class using pytest."""
    
    def test_port_forward(self):
        """Test port forwarding configuration."""
        expected_port = '3000:3000'
        # Would validate actual Tiltfile config
        assert expected_port == '3000:3000'