#!/usr/bin/env python3
"""Test file with dashes in name (non-standard for Python modules)."""

import unittest


# Note: This file has dashes which makes it non-importable as a module
# but it can still be run directly

class TestDashesInFilename(unittest.TestCase):
    """Test file with dashes in the filename."""
    
    def test_file_with_dashes(self):
        """Test that files with dashes can be tested."""
        self.assertTrue(True)
    
    def test_not_importable(self):
        """Test that this file cannot be imported due to dashes."""
        # This file can be run but not imported due to dashes
        filename = 'test-file-with-dashes.py'
        self.assertIn('-', filename)


if __name__ == '__main__':
    unittest.main()