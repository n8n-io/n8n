#!/usr/bin/env python3
"""Test file in directory with spaces."""

import unittest
import os


class TestSpacesInPaths(unittest.TestCase):
    """Test handling of spaces in directory and file names."""
    
    def test_current_directory_has_spaces(self):
        """Test that we're in a directory with spaces."""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.assertIn(' ', current_dir)
        self.assertIn('directory with spaces', current_dir)
    
    def test_can_handle_quoted_paths(self):
        """Test quoted path handling."""
        path = '"directory with spaces"'
        unquoted = path.strip('"')
        self.assertEqual(unquoted, 'directory with spaces')
    
    def test_nested_folder_reference(self):
        """Test reference to nested folder."""
        nested_path = os.path.join('.', 'nested folder', 'test.py')
        self.assertIn('nested folder', nested_path)


if __name__ == '__main__':
    unittest.main()