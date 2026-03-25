# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""New implementation of Visual Studio project generation."""

import hashlib
import os
import random
from operator import attrgetter

import gyp.common


def cmp(x, y):
    return (x > y) - (x < y)


# Initialize random number generator
random.seed()

# GUIDs for project types
ENTRY_TYPE_GUIDS = {
    "project": "{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}",
    "folder": "{2150E333-8FDC-42A3-9474-1A3956D46DE8}",
}

# ------------------------------------------------------------------------------
# Helper functions


def MakeGuid(name, seed="msvs_new"):
    """Returns a GUID for the specified target name.

  Args:
    name: Target name.
    seed: Seed for MD5 hash.
  Returns:
    A GUID-line string calculated from the name and seed.

  This generates something which looks like a GUID, but depends only on the
  name and seed.  This means the same name/seed will always generate the same
  GUID, so that projects and solutions which refer to each other can explicitly
  determine the GUID to refer to explicitly.  It also means that the GUID will
  not change when the project for a target is rebuilt.
  """
    # Calculate a MD5 signature for the seed and name.
    d = hashlib.md5((str(seed) + str(name)).encode("utf-8")).hexdigest().upper()
    # Convert most of the signature to GUID form (discard the rest)
    guid = (
        "{"
        + d[:8]
        + "-"
        + d[8:12]
        + "-"
        + d[12:16]
        + "-"
        + d[16:20]
        + "-"
        + d[20:32]
        + "}"
    )
    return guid


# ------------------------------------------------------------------------------


class MSVSSolutionEntry:
    def __cmp__(self, other):
        # Sort by name then guid (so things are in order on vs2008).
        return cmp((self.name, self.get_guid()), (other.name, other.get_guid()))


class MSVSFolder(MSVSSolutionEntry):
    """Folder in a Visual Studio project or solution."""

    def __init__(self, path, name=None, entries=None, guid=None, items=None):
        """Initializes the folder.

    Args:
      path: Full path to the folder.
      name: Name of the folder.
      entries: List of folder entries to nest inside this folder.  May contain
          Folder or Project objects.  May be None, if the folder is empty.
      guid: GUID to use for folder, if not None.
      items: List of solution items to include in the folder project.  May be
          None, if the folder does not directly contain items.
    """
        if name:
            self.name = name
        else:
            # Use last layer.
            self.name = os.path.basename(path)

        self.path = path
        self.guid = guid

        # Copy passed lists (or set to empty lists)
        self.entries = sorted(entries or [], key=attrgetter("path"))
        self.items = list(items or [])

        self.entry_type_guid = ENTRY_TYPE_GUIDS["folder"]

    def get_guid(self):
        if self.guid is None:
            # Use consistent guids for folders (so things don't regenerate).
            self.guid = MakeGuid(self.path, seed="msvs_folder")
        return self.guid


# ------------------------------------------------------------------------------


class MSVSProject(MSVSSolutionEntry):
    """Visual Studio project."""

    def __init__(
        self,
        path,
        name=None,
        dependencies=None,
        guid=None,
        spec=None,
        build_file=None,
        config_platform_overrides=None,
        fixpath_prefix=None,
    ):
        """Initializes the project.

    Args:
      path: Absolute path to the project file.
      name: Name of project.  If None, the name will be the same as the base
          name of the project file.
      dependencies: List of other Project objects this project is dependent
          upon, if not None.
      guid: GUID to use for project, if not None.
      spec: Dictionary specifying how to build this project.
      build_file: Filename of the .gyp file that the vcproj file comes from.
      config_platform_overrides: optional dict of configuration platforms to
          used in place of the default for this target.
      fixpath_prefix: the path used to adjust the behavior of _fixpath
    """
        self.path = path
        self.guid = guid
        self.spec = spec
        self.build_file = build_file
        # Use project filename if name not specified
        self.name = name or os.path.splitext(os.path.basename(path))[0]

        # Copy passed lists (or set to empty lists)
        self.dependencies = list(dependencies or [])

        self.entry_type_guid = ENTRY_TYPE_GUIDS["project"]

        if config_platform_overrides:
            self.config_platform_overrides = config_platform_overrides
        else:
            self.config_platform_overrides = {}
        self.fixpath_prefix = fixpath_prefix
        self.msbuild_toolset = None

    def set_dependencies(self, dependencies):
        self.dependencies = list(dependencies or [])

    def get_guid(self):
        if self.guid is None:
            # Set GUID from path
            # TODO(rspangler): This is fragile.
            # 1. We can't just use the project filename sans path, since there could
            #    be multiple projects with the same base name (for example,
            #    foo/unittest.vcproj and bar/unittest.vcproj).
            # 2. The path needs to be relative to $SOURCE_ROOT, so that the project
            #    GUID is the same whether it's included from base/base.sln or
            #    foo/bar/baz/baz.sln.
            # 3. The GUID needs to be the same each time this builder is invoked, so
            #    that we don't need to rebuild the solution when the project changes.
            # 4. We should be able to handle pre-built project files by reading the
            #    GUID from the files.
            self.guid = MakeGuid(self.name)
        return self.guid

    def set_msbuild_toolset(self, msbuild_toolset):
        self.msbuild_toolset = msbuild_toolset


# ------------------------------------------------------------------------------


class MSVSSolution:
    """Visual Studio solution."""

    def __init__(
        self, path, version, entries=None, variants=None, websiteProperties=True
    ):
        """Initializes the solution.

    Args:
      path: Path to solution file.
      version: Format version to emit.
      entries: List of entries in solution.  May contain Folder or Project
          objects.  May be None, if the folder is empty.
      variants: List of build variant strings.  If none, a default list will
          be used.
      websiteProperties: Flag to decide if the website properties section
          is generated.
    """
        self.path = path
        self.websiteProperties = websiteProperties
        self.version = version

        # Copy passed lists (or set to empty lists)
        self.entries = list(entries or [])

        if variants:
            # Copy passed list
            self.variants = variants[:]
        else:
            # Use default
            self.variants = ["Debug|Win32", "Release|Win32"]
        # TODO(rspangler): Need to be able to handle a mapping of solution config
        # to project config.  Should we be able to handle variants being a dict,
        # or add a separate variant_map variable?  If it's a dict, we can't
        # guarantee the order of variants since dict keys aren't ordered.

        # TODO(rspangler): Automatically write to disk for now; should delay until
        # node-evaluation time.
        self.Write()

    def Write(self, writer=gyp.common.WriteOnDiff):
        """Writes the solution file to disk.

    Raises:
      IndexError: An entry appears multiple times.
    """
        # Walk the entry tree and collect all the folders and projects.
        all_entries = set()
        entries_to_check = self.entries[:]
        while entries_to_check:
            e = entries_to_check.pop(0)

            # If this entry has been visited, nothing to do.
            if e in all_entries:
                continue

            all_entries.add(e)

            # If this is a folder, check its entries too.
            if isinstance(e, MSVSFolder):
                entries_to_check += e.entries

        all_entries = sorted(all_entries, key=attrgetter("path"))

        # Open file and print header
        f = writer(self.path)
        f.write(
            "Microsoft Visual Studio Solution File, "
            "Format Version %s\r\n" % self.version.SolutionVersion()
        )
        f.write("# %s\r\n" % self.version.Description())

        # Project entries
        sln_root = os.path.split(self.path)[0]
        for e in all_entries:
            relative_path = gyp.common.RelativePath(e.path, sln_root)
            # msbuild does not accept an empty folder_name.
            # use '.' in case relative_path is empty.
            folder_name = relative_path.replace("/", "\\") or "."
            f.write(
                'Project("%s") = "%s", "%s", "%s"\r\n'
                % (
                    e.entry_type_guid,  # Entry type GUID
                    e.name,  # Folder name
                    folder_name,  # Folder name (again)
                    e.get_guid(),  # Entry GUID
                )
            )

            # TODO(rspangler): Need a way to configure this stuff
            if self.websiteProperties:
                f.write(
                    "\tProjectSection(WebsiteProperties) = preProject\r\n"
                    '\t\tDebug.AspNetCompiler.Debug = "True"\r\n'
                    '\t\tRelease.AspNetCompiler.Debug = "False"\r\n'
                    "\tEndProjectSection\r\n"
                )

            if isinstance(e, MSVSFolder):
                if e.items:
                    f.write("\tProjectSection(SolutionItems) = preProject\r\n")
                    for i in e.items:
                        f.write(f"\t\t{i} = {i}\r\n")
                    f.write("\tEndProjectSection\r\n")

            if isinstance(e, MSVSProject):
                if e.dependencies:
                    f.write("\tProjectSection(ProjectDependencies) = postProject\r\n")
                    for d in e.dependencies:
                        f.write(f"\t\t{d.get_guid()} = {d.get_guid()}\r\n")
                    f.write("\tEndProjectSection\r\n")

            f.write("EndProject\r\n")

        # Global section
        f.write("Global\r\n")

        # Configurations (variants)
        f.write("\tGlobalSection(SolutionConfigurationPlatforms) = preSolution\r\n")
        for v in self.variants:
            f.write(f"\t\t{v} = {v}\r\n")
        f.write("\tEndGlobalSection\r\n")

        # Sort config guids for easier diffing of solution changes.
        config_guids = []
        config_guids_overrides = {}
        for e in all_entries:
            if isinstance(e, MSVSProject):
                config_guids.append(e.get_guid())
                config_guids_overrides[e.get_guid()] = e.config_platform_overrides
        config_guids.sort()

        f.write("\tGlobalSection(ProjectConfigurationPlatforms) = postSolution\r\n")
        for g in config_guids:
            for v in self.variants:
                nv = config_guids_overrides[g].get(v, v)
                # Pick which project configuration to build for this solution
                # configuration.
                f.write(
                    "\t\t%s.%s.ActiveCfg = %s\r\n"
                    % (
                        g,  # Project GUID
                        v,  # Solution build configuration
                        nv,  # Project build config for that solution config
                    )
                )

                # Enable project in this solution configuration.
                f.write(
                    "\t\t%s.%s.Build.0 = %s\r\n"
                    % (
                        g,  # Project GUID
                        v,  # Solution build configuration
                        nv,  # Project build config for that solution config
                    )
                )
        f.write("\tEndGlobalSection\r\n")

        # TODO(rspangler): Should be able to configure this stuff too (though I've
        # never seen this be any different)
        f.write("\tGlobalSection(SolutionProperties) = preSolution\r\n")
        f.write("\t\tHideSolutionNode = FALSE\r\n")
        f.write("\tEndGlobalSection\r\n")

        # Folder mappings
        # Omit this section if there are no folders
        if any([e.entries for e in all_entries if isinstance(e, MSVSFolder)]):
            f.write("\tGlobalSection(NestedProjects) = preSolution\r\n")
            for e in all_entries:
                if not isinstance(e, MSVSFolder):
                    continue  # Does not apply to projects, only folders
                for subentry in e.entries:
                    f.write(f"\t\t{subentry.get_guid()} = {e.get_guid()}\r\n")
            f.write("\tEndGlobalSection\r\n")

        f.write("EndGlobal\r\n")

        f.close()
