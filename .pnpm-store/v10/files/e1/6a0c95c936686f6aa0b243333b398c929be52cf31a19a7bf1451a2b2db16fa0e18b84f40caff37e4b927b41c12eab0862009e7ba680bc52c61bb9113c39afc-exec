#!/usr/bin/env python3
# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

""" Unit tests for the msvs.py file. """

import gyp.generator.msvs as msvs
import unittest

from io import StringIO


class TestSequenceFunctions(unittest.TestCase):
    def setUp(self):
        self.stderr = StringIO()

    def test_GetLibraries(self):
        self.assertEqual(msvs._GetLibraries({}), [])
        self.assertEqual(msvs._GetLibraries({"libraries": []}), [])
        self.assertEqual(
            msvs._GetLibraries({"other": "foo", "libraries": ["a.lib"]}), ["a.lib"]
        )
        self.assertEqual(msvs._GetLibraries({"libraries": ["-la"]}), ["a.lib"])
        self.assertEqual(
            msvs._GetLibraries(
                {
                    "libraries": [
                        "a.lib",
                        "b.lib",
                        "c.lib",
                        "-lb.lib",
                        "-lb.lib",
                        "d.lib",
                        "a.lib",
                    ]
                }
            ),
            ["c.lib", "b.lib", "d.lib", "a.lib"],
        )


if __name__ == "__main__":
    unittest.main()
