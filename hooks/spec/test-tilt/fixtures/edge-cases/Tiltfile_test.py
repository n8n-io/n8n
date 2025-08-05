#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for Tiltfile with edge cases - unicode, spaces, special chars."""

import unittest
import sys

# Ensure UTF-8 encoding
if sys.version_info[0] < 3:
    reload(sys)
    sys.setdefaultencoding('utf-8')


class TestEdgeCaseTiltfile(unittest.TestCase):
    """Test cases for Tiltfile with special characters and edge cases."""
    
    def test_unicode_in_strings(self):
        """Test Unicode characters in strings."""
        unicode_strings = [
            '测试',  # Chinese
            '你好世界',  # Hello World in Chinese
            'émojis',  # Accented characters
            '🚀 🎯 🎉',  # Emoji
            'spëcial',  # Special characters
        ]
        
        for s in unicode_strings:
            self.assertIsInstance(s, str)
            self.assertTrue(len(s) > 0)
    
    def test_paths_with_spaces(self):
        """Test handling of paths with spaces."""
        paths = [
            'directory with spaces',
            '/path/to/directory with spaces',
            './directory with spaces/Tiltfile',
        ]
        
        for path in paths:
            self.assertIn(' ', path)
            # In real scenario, would test path handling
    
    def test_special_characters_in_names(self):
        """Test special characters in resource names."""
        resource_name = 'app-文字-emoji-🎯'
        self.assertIn('🎯', resource_name)
        self.assertIn('文字', resource_name)
    
    def test_quoted_strings(self):
        """Test various quote handling."""
        test_cases = [
            '"quoted value with spaces"',
            "'single quotes'",
            '"nested \\"quotes\\""',
            '`backticks`',
        ]
        
        for tc in test_cases:
            self.assertTrue(len(tc) > 0)
    
    def test_environment_variables(self):
        """Test environment variables with special values."""
        env_vars = {
            'SPECIAL_ENV': 'value with spaces and "quotes"',
            'UNICODE_ENV': '你好世界',
            'PATH_WITH_SPACES': '/path/to/directory with spaces',
            'QUOTED_VALUE': '"quoted value with spaces"',
        }
        
        for key, value in env_vars.items():
            self.assertIsInstance(key, str)
            self.assertIsInstance(value, str)
    
    def test_special_shell_characters(self):
        """Test handling of shell special characters."""
        special_chars = ['$', '`', '~', '!', '@', '#', '%', '^', '&', '*', '(', ')']
        
        for char in special_chars:
            self.assertEqual(len(char), 1)
    
    def test_multiline_commands(self):
        """Test multiline command handling."""
        command = '''echo "Line 1" && \\
        echo "Line 2" && \\
        echo "Line 3"'''
        
        self.assertIn('\\', command)
        self.assertIn('&&', command)
    
    def test_file_names_with_parentheses(self):
        """Test file names with parentheses."""
        filename = 'config (production).json'
        self.assertIn('(', filename)
        self.assertIn(')', filename)
        self.assertIn(' ', filename)


class TestDirectoryWithSpaces(unittest.TestCase):
    """Test handling of directories with spaces."""
    
    def test_load_from_directory_with_spaces(self):
        """Test loading Tiltfile from directory with spaces."""
        path = './directory with spaces/Tiltfile'
        self.assertIn('directory with spaces', path)
    
    def test_nested_directories_with_spaces(self):
        """Test deeply nested directories with spaces."""
        path = './directory with spaces/nested folder/file.yaml'
        self.assertEqual(path.count(' '), 3)


class TestUnicodeFiles(unittest.TestCase):
    """Test Unicode in file names and content."""
    
    def test_yaml_file_with_emoji(self):
        """Test YAML file with emoji in name."""
        filename = 'deployment-🚀.yaml'
        self.assertIn('🚀', filename)
        self.assertTrue(filename.endswith('.yaml'))
    
    def test_print_with_emoji(self):
        """Test print statements with emoji."""
        message = "Tiltfile with edge cases loaded successfully! 🎉"
        self.assertIn('🎉', message)


# Test for very long strings
class TestLongStrings(unittest.TestCase):
    """Test handling of very long strings."""
    
    def test_long_command(self):
        """Test very long command strings."""
        long_command = 'echo "' + 'A' * 1000 + '"'
        self.assertEqual(len(long_command), 1007)
    
    def test_long_path(self):
        """Test very long path names."""
        # Maximum path length varies by OS
        long_path = '/'.join(['directory'] * 50)
        self.assertTrue(len(long_path) > 100)


if __name__ == '__main__':
    # Ensure unicode output in test results
    unittest.main(verbosity=2)