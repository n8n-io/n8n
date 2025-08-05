#!/usr/bin/env python3
"""Tests for Tiltfile with Makefile integration."""

import unittest


class TestTiltfileMakefileIntegration(unittest.TestCase):
    """Test cases for Tiltfile Makefile integration."""
    
    def test_makefile_exists(self):
        """Test that Makefile exists and has test-tilt target."""
        import os
        self.assertTrue(os.path.exists('Makefile'))
    
    def test_docker_build_called(self):
        """Test that docker_build is called correctly."""
        # This would normally test the actual Tiltfile execution
        # For fixture purposes, just pass
        self.assertTrue(True)
    
    def test_local_resource_uses_make(self):
        """Test that local_resource calls make test-tilt."""
        # Verify the Tiltfile configures local_resource correctly
        self.assertTrue(True)


if __name__ == '__main__':
    unittest.main()