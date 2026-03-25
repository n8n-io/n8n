#!/usr/bin/env python3

# Copyright (c) 2011 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

""" Unit tests for the easy_xml.py file. """

import gyp.easy_xml as easy_xml
import unittest

from io import StringIO


class TestSequenceFunctions(unittest.TestCase):
    def setUp(self):
        self.stderr = StringIO()

    def test_EasyXml_simple(self):
        self.assertEqual(
            easy_xml.XmlToString(["test"]),
            '<?xml version="1.0" encoding="utf-8"?><test/>',
        )

        self.assertEqual(
            easy_xml.XmlToString(["test"], encoding="Windows-1252"),
            '<?xml version="1.0" encoding="Windows-1252"?><test/>',
        )

    def test_EasyXml_simple_with_attributes(self):
        self.assertEqual(
            easy_xml.XmlToString(["test2", {"a": "value1", "b": "value2"}]),
            '<?xml version="1.0" encoding="utf-8"?><test2 a="value1" b="value2"/>',
        )

    def test_EasyXml_escaping(self):
        original = "<test>'\"\r&\nfoo"
        converted = "&lt;test&gt;'&quot;&#xD;&amp;&#xA;foo"
        converted_apos = converted.replace("'", "&apos;")
        self.assertEqual(
            easy_xml.XmlToString(["test3", {"a": original}, original]),
            '<?xml version="1.0" encoding="utf-8"?><test3 a="%s">%s</test3>'
            % (converted, converted_apos),
        )

    def test_EasyXml_pretty(self):
        self.assertEqual(
            easy_xml.XmlToString(
                ["test3", ["GrandParent", ["Parent1", ["Child"]], ["Parent2"]]],
                pretty=True,
            ),
            '<?xml version="1.0" encoding="utf-8"?>\n'
            "<test3>\n"
            "  <GrandParent>\n"
            "    <Parent1>\n"
            "      <Child/>\n"
            "    </Parent1>\n"
            "    <Parent2/>\n"
            "  </GrandParent>\n"
            "</test3>\n",
        )

    def test_EasyXml_complex(self):
        # We want to create:
        target = (
            '<?xml version="1.0" encoding="utf-8"?>'
            "<Project>"
            '<PropertyGroup Label="Globals">'
            "<ProjectGuid>{D2250C20-3A94-4FB9-AF73-11BC5B73884B}</ProjectGuid>"
            "<Keyword>Win32Proj</Keyword>"
            "<RootNamespace>automated_ui_tests</RootNamespace>"
            "</PropertyGroup>"
            '<Import Project="$(VCTargetsPath)\\Microsoft.Cpp.props"/>'
            "<PropertyGroup "
            "Condition=\"'$(Configuration)|$(Platform)'=="
            '\'Debug|Win32\'" Label="Configuration">'
            "<ConfigurationType>Application</ConfigurationType>"
            "<CharacterSet>Unicode</CharacterSet>"
            "</PropertyGroup>"
            "</Project>"
        )

        xml = easy_xml.XmlToString(
            [
                "Project",
                [
                    "PropertyGroup",
                    {"Label": "Globals"},
                    ["ProjectGuid", "{D2250C20-3A94-4FB9-AF73-11BC5B73884B}"],
                    ["Keyword", "Win32Proj"],
                    ["RootNamespace", "automated_ui_tests"],
                ],
                ["Import", {"Project": "$(VCTargetsPath)\\Microsoft.Cpp.props"}],
                [
                    "PropertyGroup",
                    {
                        "Condition": "'$(Configuration)|$(Platform)'=='Debug|Win32'",
                        "Label": "Configuration",
                    },
                    ["ConfigurationType", "Application"],
                    ["CharacterSet", "Unicode"],
                ],
            ]
        )
        self.assertEqual(xml, target)


if __name__ == "__main__":
    unittest.main()
