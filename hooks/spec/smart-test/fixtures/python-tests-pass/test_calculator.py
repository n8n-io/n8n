"""Tests for calculator module."""

import unittest
from calculator import add, subtract

class TestCalculator(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)
        
    def test_subtract(self):
        self.assertEqual(subtract(5, 3), 2)

if __name__ == '__main__':
    unittest.main()