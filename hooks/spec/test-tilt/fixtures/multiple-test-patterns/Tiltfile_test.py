#!/usr/bin/env python3
"""Test file following Tiltfile_test.py pattern."""

import unittest


class TestTiltfilePattern1(unittest.TestCase):
    """Tests using Tiltfile_test.py naming convention."""
    
    def test_pattern1_basic(self):
        """Basic test for pattern 1."""
        self.assertEqual(1 + 1, 2)
    
    def test_pattern1_docker_build(self):
        """Test docker build configuration."""
        # Would test docker_build('webapp', '.') in real scenario
        self.assertTrue(True)


if __name__ == '__main__':
    unittest.main()