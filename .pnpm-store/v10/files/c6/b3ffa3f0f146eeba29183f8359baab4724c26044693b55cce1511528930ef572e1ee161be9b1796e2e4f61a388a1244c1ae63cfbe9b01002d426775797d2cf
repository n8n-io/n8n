# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Visual Studio project reader/writer."""

import gyp.easy_xml as easy_xml


class Writer:
    """Visual Studio XML tool file writer."""

    def __init__(self, tool_file_path, name):
        """Initializes the tool file.

    Args:
      tool_file_path: Path to the tool file.
      name: Name of the tool file.
    """
        self.tool_file_path = tool_file_path
        self.name = name
        self.rules_section = ["Rules"]

    def AddCustomBuildRule(
        self, name, cmd, description, additional_dependencies, outputs, extensions
    ):
        """Adds a rule to the tool file.

    Args:
      name: Name of the rule.
      description: Description of the rule.
      cmd: Command line of the rule.
      additional_dependencies: other files which may trigger the rule.
      outputs: outputs of the rule.
      extensions: extensions handled by the rule.
    """
        rule = [
            "CustomBuildRule",
            {
                "Name": name,
                "ExecutionDescription": description,
                "CommandLine": cmd,
                "Outputs": ";".join(outputs),
                "FileExtensions": ";".join(extensions),
                "AdditionalDependencies": ";".join(additional_dependencies),
            },
        ]
        self.rules_section.append(rule)

    def WriteIfChanged(self):
        """Writes the tool file."""
        content = [
            "VisualStudioToolFile",
            {"Version": "8.00", "Name": self.name},
            self.rules_section,
        ]
        easy_xml.WriteXmlIfChanged(
            content, self.tool_file_path, encoding="Windows-1252"
        )
