#!/usr/bin/env python3
"""Tests for main Tiltfile."""

import unittest


class TestMainTiltfile(unittest.TestCase):
    """Test the main Tiltfile (not ignored)."""
    
    def test_main_tiltfile(self):
        """Test main Tiltfile configuration."""
        self.assertTrue(True)


if __name__ == '__main__':
    unittest.main()