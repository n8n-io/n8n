#!/usr/bin/env python3

# Copyright (c) 2013 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

""" Unit tests for the xcode.py file. """

import gyp.generator.xcode as xcode
import unittest
import sys


class TestEscapeXcodeDefine(unittest.TestCase):
    if sys.platform == "darwin":

        def test_InheritedRemainsUnescaped(self):
            self.assertEqual(xcode.EscapeXcodeDefine("$(inherited)"), "$(inherited)")

        def test_Escaping(self):
            self.assertEqual(xcode.EscapeXcodeDefine('a b"c\\'), 'a\\ b\\"c\\\\')


if __name__ == "__main__":
    unittest.main()
