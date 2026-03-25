# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Visual Studio project reader/writer."""

import gyp.easy_xml as easy_xml

# ------------------------------------------------------------------------------


class Tool:
    """Visual Studio tool."""

    def __init__(self, name, attrs=None):
        """Initializes the tool.

    Args:
      name: Tool name.
      attrs: Dict of tool attributes; may be None.
    """
        self._attrs = attrs or {}
        self._attrs["Name"] = name

    def _GetSpecification(self):
        """Creates an element for the tool.

    Returns:
      A new xml.dom.Element for the tool.
    """
        return ["Tool", self._attrs]


class Filter:
    """Visual Studio filter - that is, a virtual folder."""

    def __init__(self, name, contents=None):
        """Initializes the folder.

    Args:
      name: Filter (folder) name.
      contents: List of filenames and/or Filter objects contained.
    """
        self.name = name
        self.contents = list(contents or [])


# ------------------------------------------------------------------------------


class Writer:
    """Visual Studio XML project writer."""

    def __init__(self, project_path, version, name, guid=None, platforms=None):
        """Initializes the project.

    Args:
      project_path: Path to the project file.
      version: Format version to emit.
      name: Name of the project.
      guid: GUID to use for project, if not None.
      platforms: Array of string, the supported platforms.  If null, ['Win32']
    """
        self.project_path = project_path
        self.version = version
        self.name = name
        self.guid = guid

        # Default to Win32 for platforms.
        if not platforms:
            platforms = ["Win32"]

        # Initialize the specifications of the various sections.
        self.platform_section = ["Platforms"]
        for platform in platforms:
            self.platform_section.append(["Platform", {"Name": platform}])
        self.tool_files_section = ["ToolFiles"]
        self.configurations_section = ["Configurations"]
        self.files_section = ["Files"]

        # Keep a dict keyed on filename to speed up access.
        self.files_dict = dict()

    def AddToolFile(self, path):
        """Adds a tool file to the project.

    Args:
      path: Relative path from project to tool file.
    """
        self.tool_files_section.append(["ToolFile", {"RelativePath": path}])

    def _GetSpecForConfiguration(self, config_type, config_name, attrs, tools):
        """Returns the specification for a configuration.

    Args:
      config_type: Type of configuration node.
      config_name: Configuration name.
      attrs: Dict of configuration attributes; may be None.
      tools: List of tools (strings or Tool objects); may be None.
    Returns:
    """
        # Handle defaults
        if not attrs:
            attrs = {}
        if not tools:
            tools = []

        # Add configuration node and its attributes
        node_attrs = attrs.copy()
        node_attrs["Name"] = config_name
        specification = [config_type, node_attrs]

        # Add tool nodes and their attributes
        if tools:
            for t in tools:
                if isinstance(t, Tool):
                    specification.append(t._GetSpecification())
                else:
                    specification.append(Tool(t)._GetSpecification())
        return specification

    def AddConfig(self, name, attrs=None, tools=None):
        """Adds a configuration to the project.

    Args:
      name: Configuration name.
      attrs: Dict of configuration attributes; may be None.
      tools: List of tools (strings or Tool objects); may be None.
    """
        spec = self._GetSpecForConfiguration("Configuration", name, attrs, tools)
        self.configurations_section.append(spec)

    def _AddFilesToNode(self, parent, files):
        """Adds files and/or filters to the parent node.

    Args:
      parent: Destination node
      files: A list of Filter objects and/or relative paths to files.

    Will call itself recursively, if the files list contains Filter objects.
    """
        for f in files:
            if isinstance(f, Filter):
                node = ["Filter", {"Name": f.name}]
                self._AddFilesToNode(node, f.contents)
            else:
                node = ["File", {"RelativePath": f}]
                self.files_dict[f] = node
            parent.append(node)

    def AddFiles(self, files):
        """Adds files to the project.

    Args:
      files: A list of Filter objects and/or relative paths to files.

    This makes a copy of the file/filter tree at the time of this call.  If you
    later add files to a Filter object which was passed into a previous call
    to AddFiles(), it will not be reflected in this project.
    """
        self._AddFilesToNode(self.files_section, files)
        # TODO(rspangler) This also doesn't handle adding files to an existing
        # filter.  That is, it doesn't merge the trees.

    def AddFileConfig(self, path, config, attrs=None, tools=None):
        """Adds a configuration to a file.

    Args:
      path: Relative path to the file.
      config: Name of configuration to add.
      attrs: Dict of configuration attributes; may be None.
      tools: List of tools (strings or Tool objects); may be None.

    Raises:
      ValueError: Relative path does not match any file added via AddFiles().
    """
        # Find the file node with the right relative path
        parent = self.files_dict.get(path)
        if not parent:
            raise ValueError('AddFileConfig: file "%s" not in project.' % path)

        # Add the config to the file node
        spec = self._GetSpecForConfiguration("FileConfiguration", config, attrs, tools)
        parent.append(spec)

    def WriteIfChanged(self):
        """Writes the project file."""
        # First create XML content definition
        content = [
            "VisualStudioProject",
            {
                "ProjectType": "Visual C++",
                "Version": self.version.ProjectVersion(),
                "Name": self.name,
                "ProjectGUID": self.guid,
                "RootNamespace": self.name,
                "Keyword": "Win32Proj",
            },
            self.platform_section,
            self.tool_files_section,
            self.configurations_section,
            ["References"],  # empty section
            self.files_section,
            ["Globals"],  # empty section
        ]
        easy_xml.WriteXmlIfChanged(content, self.project_path, encoding="Windows-1252")
