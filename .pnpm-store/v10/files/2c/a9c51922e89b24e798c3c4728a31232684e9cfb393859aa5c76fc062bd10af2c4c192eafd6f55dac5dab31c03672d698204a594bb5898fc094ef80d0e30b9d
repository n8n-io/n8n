# Copyright (c) 2014 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""
This script is intended for use as a GYP_GENERATOR. It takes as input (by way of
the generator flag config_path) the path of a json file that dictates the files
and targets to search for. The following keys are supported:
files: list of paths (relative) of the files to search for.
test_targets: unqualified target names to search for. Any target in this list
that depends upon a file in |files| is output regardless of the type of target
or chain of dependencies.
additional_compile_targets: Unqualified targets to search for in addition to
test_targets. Targets in the combined list that depend upon a file in |files|
are not necessarily output. For example, if the target is of type none then the
target is not output (but one of the descendants of the target will be).

The following is output:
error: only supplied if there is an error.
compile_targets: minimal set of targets that directly or indirectly (for
  targets of type none) depend on the files in |files| and is one of the
  supplied targets or a target that one of the supplied targets depends on.
  The expectation is this set of targets is passed into a build step. This list
  always contains the output of test_targets as well.
test_targets: set of targets from the supplied |test_targets| that either
  directly or indirectly depend upon a file in |files|. This list if useful
  if additional processing needs to be done for certain targets after the
  build, such as running tests.
status: outputs one of three values: none of the supplied files were found,
  one of the include files changed so that it should be assumed everything
  changed (in this case test_targets and compile_targets are not output) or at
  least one file was found.
invalid_targets: list of supplied targets that were not found.

Example:
Consider a graph like the following:
  A     D
 / \
B   C
A depends upon both B and C, A is of type none and B and C are executables.
D is an executable, has no dependencies and nothing depends on it.
If |additional_compile_targets| = ["A"], |test_targets| = ["B", "C"] and
files = ["b.cc", "d.cc"] (B depends upon b.cc and D depends upon d.cc), then
the following is output:
|compile_targets| = ["B"] B must built as it depends upon the changed file b.cc
and the supplied target A depends upon it. A is not output as a build_target
as it is of type none with no rules and actions.
|test_targets| = ["B"] B directly depends upon the change file b.cc.

Even though the file d.cc, which D depends upon, has changed D is not output
as it was not supplied by way of |additional_compile_targets| or |test_targets|.

If the generator flag analyzer_output_path is specified, output is written
there. Otherwise output is written to stdout.

In Gyp the "all" target is shorthand for the root targets in the files passed
to gyp. For example, if file "a.gyp" contains targets "a1" and
"a2", and file "b.gyp" contains targets "b1" and "b2" and "a2" has a dependency
on "b2" and gyp is supplied "a.gyp" then "all" consists of "a1" and "a2".
Notice that "b1" and "b2" are not in the "all" target as "b.gyp" was not
directly supplied to gyp. OTOH if both "a.gyp" and "b.gyp" are supplied to gyp
then the "all" target includes "b1" and "b2".
"""


import gyp.common
import json
import os
import posixpath

debug = False

found_dependency_string = "Found dependency"
no_dependency_string = "No dependencies"
# Status when it should be assumed that everything has changed.
all_changed_string = "Found dependency (all)"

# MatchStatus is used indicate if and how a target depends upon the supplied
# sources.
# The target's sources contain one of the supplied paths.
MATCH_STATUS_MATCHES = 1
# The target has a dependency on another target that contains one of the
# supplied paths.
MATCH_STATUS_MATCHES_BY_DEPENDENCY = 2
# The target's sources weren't in the supplied paths and none of the target's
# dependencies depend upon a target that matched.
MATCH_STATUS_DOESNT_MATCH = 3
# The target doesn't contain the source, but the dependent targets have not yet
# been visited to determine a more specific status yet.
MATCH_STATUS_TBD = 4

generator_supports_multiple_toolsets = gyp.common.CrossCompileRequested()

generator_wants_static_library_dependencies_adjusted = False

generator_default_variables = {}
for dirname in [
    "INTERMEDIATE_DIR",
    "SHARED_INTERMEDIATE_DIR",
    "PRODUCT_DIR",
    "LIB_DIR",
    "SHARED_LIB_DIR",
]:
    generator_default_variables[dirname] = "!!!"

for unused in [
    "RULE_INPUT_PATH",
    "RULE_INPUT_ROOT",
    "RULE_INPUT_NAME",
    "RULE_INPUT_DIRNAME",
    "RULE_INPUT_EXT",
    "EXECUTABLE_PREFIX",
    "EXECUTABLE_SUFFIX",
    "STATIC_LIB_PREFIX",
    "STATIC_LIB_SUFFIX",
    "SHARED_LIB_PREFIX",
    "SHARED_LIB_SUFFIX",
    "CONFIGURATION_NAME",
]:
    generator_default_variables[unused] = ""


def _ToGypPath(path):
    """Converts a path to the format used by gyp."""
    if os.sep == "\\" and os.altsep == "/":
        return path.replace("\\", "/")
    return path


def _ResolveParent(path, base_path_components):
    """Resolves |path|, which starts with at least one '../'. Returns an empty
  string if the path shouldn't be considered. See _AddSources() for a
  description of |base_path_components|."""
    depth = 0
    while path.startswith("../"):
        depth += 1
        path = path[3:]
    # Relative includes may go outside the source tree. For example, an action may
    # have inputs in /usr/include, which are not in the source tree.
    if depth > len(base_path_components):
        return ""
    if depth == len(base_path_components):
        return path
    return (
        "/".join(base_path_components[0 : len(base_path_components) - depth])
        + "/"
        + path
    )


def _AddSources(sources, base_path, base_path_components, result):
    """Extracts valid sources from |sources| and adds them to |result|. Each
  source file is relative to |base_path|, but may contain '..'. To make
  resolving '..' easier |base_path_components| contains each of the
  directories in |base_path|. Additionally each source may contain variables.
  Such sources are ignored as it is assumed dependencies on them are expressed
  and tracked in some other means."""
    # NOTE: gyp paths are always posix style.
    for source in sources:
        if not len(source) or source.startswith("!!!") or source.startswith("$"):
            continue
        # variable expansion may lead to //.
        org_source = source
        source = source[0] + source[1:].replace("//", "/")
        if source.startswith("../"):
            source = _ResolveParent(source, base_path_components)
            if len(source):
                result.append(source)
            continue
        result.append(base_path + source)
        if debug:
            print("AddSource", org_source, result[len(result) - 1])


def _ExtractSourcesFromAction(action, base_path, base_path_components, results):
    if "inputs" in action:
        _AddSources(action["inputs"], base_path, base_path_components, results)


def _ToLocalPath(toplevel_dir, path):
    """Converts |path| to a path relative to |toplevel_dir|."""
    if path == toplevel_dir:
        return ""
    if path.startswith(toplevel_dir + "/"):
        return path[len(toplevel_dir) + len("/") :]
    return path


def _ExtractSources(target, target_dict, toplevel_dir):
    # |target| is either absolute or relative and in the format of the OS. Gyp
    # source paths are always posix. Convert |target| to a posix path relative to
    # |toplevel_dir_|. This is done to make it easy to build source paths.
    base_path = posixpath.dirname(_ToLocalPath(toplevel_dir, _ToGypPath(target)))
    base_path_components = base_path.split("/")

    # Add a trailing '/' so that _AddSources() can easily build paths.
    if len(base_path):
        base_path += "/"

    if debug:
        print("ExtractSources", target, base_path)

    results = []
    if "sources" in target_dict:
        _AddSources(target_dict["sources"], base_path, base_path_components, results)
    # Include the inputs from any actions. Any changes to these affect the
    # resulting output.
    if "actions" in target_dict:
        for action in target_dict["actions"]:
            _ExtractSourcesFromAction(action, base_path, base_path_components, results)
    if "rules" in target_dict:
        for rule in target_dict["rules"]:
            _ExtractSourcesFromAction(rule, base_path, base_path_components, results)

    return results


class Target:
    """Holds information about a particular target:
  deps: set of Targets this Target depends upon. This is not recursive, only the
    direct dependent Targets.
  match_status: one of the MatchStatus values.
  back_deps: set of Targets that have a dependency on this Target.
  visited: used during iteration to indicate whether we've visited this target.
    This is used for two iterations, once in building the set of Targets and
    again in _GetBuildTargets().
  name: fully qualified name of the target.
  requires_build: True if the target type is such that it needs to be built.
    See _DoesTargetTypeRequireBuild for details.
  added_to_compile_targets: used when determining if the target was added to the
    set of targets that needs to be built.
  in_roots: true if this target is a descendant of one of the root nodes.
  is_executable: true if the type of target is executable.
  is_static_library: true if the type of target is static_library.
  is_or_has_linked_ancestor: true if the target does a link (eg executable), or
    if there is a target in back_deps that does a link."""

    def __init__(self, name):
        self.deps = set()
        self.match_status = MATCH_STATUS_TBD
        self.back_deps = set()
        self.name = name
        # TODO(sky): I don't like hanging this off Target. This state is specific
        # to certain functions and should be isolated there.
        self.visited = False
        self.requires_build = False
        self.added_to_compile_targets = False
        self.in_roots = False
        self.is_executable = False
        self.is_static_library = False
        self.is_or_has_linked_ancestor = False


class Config:
    """Details what we're looking for
  files: set of files to search for
  targets: see file description for details."""

    def __init__(self):
        self.files = []
        self.targets = set()
        self.additional_compile_target_names = set()
        self.test_target_names = set()

    def Init(self, params):
        """Initializes Config. This is a separate method as it raises an exception
    if there is a parse error."""
        generator_flags = params.get("generator_flags", {})
        config_path = generator_flags.get("config_path", None)
        if not config_path:
            return
        try:
            f = open(config_path)
            config = json.load(f)
            f.close()
        except OSError:
            raise Exception("Unable to open file " + config_path)
        except ValueError as e:
            raise Exception("Unable to parse config file " + config_path + str(e))
        if not isinstance(config, dict):
            raise Exception("config_path must be a JSON file containing a dictionary")
        self.files = config.get("files", [])
        self.additional_compile_target_names = set(
            config.get("additional_compile_targets", [])
        )
        self.test_target_names = set(config.get("test_targets", []))


def _WasBuildFileModified(build_file, data, files, toplevel_dir):
    """Returns true if the build file |build_file| is either in |files| or
  one of the files included by |build_file| is in |files|. |toplevel_dir| is
  the root of the source tree."""
    if _ToLocalPath(toplevel_dir, _ToGypPath(build_file)) in files:
        if debug:
            print("gyp file modified", build_file)
        return True

    # First element of included_files is the file itself.
    if len(data[build_file]["included_files"]) <= 1:
        return False

    for include_file in data[build_file]["included_files"][1:]:
        # |included_files| are relative to the directory of the |build_file|.
        rel_include_file = _ToGypPath(
            gyp.common.UnrelativePath(include_file, build_file)
        )
        if _ToLocalPath(toplevel_dir, rel_include_file) in files:
            if debug:
                print(
                    "included gyp file modified, gyp_file=",
                    build_file,
                    "included file=",
                    rel_include_file,
                )
            return True
    return False


def _GetOrCreateTargetByName(targets, target_name):
    """Creates or returns the Target at targets[target_name]. If there is no
  Target for |target_name| one is created. Returns a tuple of whether a new
  Target was created and the Target."""
    if target_name in targets:
        return False, targets[target_name]
    target = Target(target_name)
    targets[target_name] = target
    return True, target


def _DoesTargetTypeRequireBuild(target_dict):
    """Returns true if the target type is such that it needs to be built."""
    # If a 'none' target has rules or actions we assume it requires a build.
    return bool(
        target_dict["type"] != "none"
        or target_dict.get("actions")
        or target_dict.get("rules")
    )


def _GenerateTargets(data, target_list, target_dicts, toplevel_dir, files, build_files):
    """Returns a tuple of the following:
  . A dictionary mapping from fully qualified name to Target.
  . A list of the targets that have a source file in |files|.
  . Targets that constitute the 'all' target. See description at top of file
    for details on the 'all' target.
  This sets the |match_status| of the targets that contain any of the source
  files in |files| to MATCH_STATUS_MATCHES.
  |toplevel_dir| is the root of the source tree."""
    # Maps from target name to Target.
    name_to_target = {}

    # Targets that matched.
    matching_targets = []

    # Queue of targets to visit.
    targets_to_visit = target_list[:]

    # Maps from build file to a boolean indicating whether the build file is in
    # |files|.
    build_file_in_files = {}

    # Root targets across all files.
    roots = set()

    # Set of Targets in |build_files|.
    build_file_targets = set()

    while len(targets_to_visit) > 0:
        target_name = targets_to_visit.pop()
        created_target, target = _GetOrCreateTargetByName(name_to_target, target_name)
        if created_target:
            roots.add(target)
        elif target.visited:
            continue

        target.visited = True
        target.requires_build = _DoesTargetTypeRequireBuild(target_dicts[target_name])
        target_type = target_dicts[target_name]["type"]
        target.is_executable = target_type == "executable"
        target.is_static_library = target_type == "static_library"
        target.is_or_has_linked_ancestor = (
            target_type == "executable" or target_type == "shared_library"
        )

        build_file = gyp.common.ParseQualifiedTarget(target_name)[0]
        if build_file not in build_file_in_files:
            build_file_in_files[build_file] = _WasBuildFileModified(
                build_file, data, files, toplevel_dir
            )

        if build_file in build_files:
            build_file_targets.add(target)

        # If a build file (or any of its included files) is modified we assume all
        # targets in the file are modified.
        if build_file_in_files[build_file]:
            print("matching target from modified build file", target_name)
            target.match_status = MATCH_STATUS_MATCHES
            matching_targets.append(target)
        else:
            sources = _ExtractSources(
                target_name, target_dicts[target_name], toplevel_dir
            )
            for source in sources:
                if _ToGypPath(os.path.normpath(source)) in files:
                    print("target", target_name, "matches", source)
                    target.match_status = MATCH_STATUS_MATCHES
                    matching_targets.append(target)
                    break

        # Add dependencies to visit as well as updating back pointers for deps.
        for dep in target_dicts[target_name].get("dependencies", []):
            targets_to_visit.append(dep)

            created_dep_target, dep_target = _GetOrCreateTargetByName(
                name_to_target, dep
            )
            if not created_dep_target:
                roots.discard(dep_target)

            target.deps.add(dep_target)
            dep_target.back_deps.add(target)

    return name_to_target, matching_targets, roots & build_file_targets


def _GetUnqualifiedToTargetMapping(all_targets, to_find):
    """Returns a tuple of the following:
  . mapping (dictionary) from unqualified name to Target for all the
    Targets in |to_find|.
  . any target names not found. If this is empty all targets were found."""
    result = {}
    if not to_find:
        return {}, []
    to_find = set(to_find)
    for target_name in all_targets.keys():
        extracted = gyp.common.ParseQualifiedTarget(target_name)
        if len(extracted) > 1 and extracted[1] in to_find:
            to_find.remove(extracted[1])
            result[extracted[1]] = all_targets[target_name]
            if not to_find:
                return result, []
    return result, [x for x in to_find]


def _DoesTargetDependOnMatchingTargets(target):
    """Returns true if |target| or any of its dependencies is one of the
  targets containing the files supplied as input to analyzer. This updates
  |matches| of the Targets as it recurses.
  target: the Target to look for."""
    if target.match_status == MATCH_STATUS_DOESNT_MATCH:
        return False
    if (
        target.match_status == MATCH_STATUS_MATCHES
        or target.match_status == MATCH_STATUS_MATCHES_BY_DEPENDENCY
    ):
        return True
    for dep in target.deps:
        if _DoesTargetDependOnMatchingTargets(dep):
            target.match_status = MATCH_STATUS_MATCHES_BY_DEPENDENCY
            print("\t", target.name, "matches by dep", dep.name)
            return True
    target.match_status = MATCH_STATUS_DOESNT_MATCH
    return False


def _GetTargetsDependingOnMatchingTargets(possible_targets):
    """Returns the list of Targets in |possible_targets| that depend (either
  directly on indirectly) on at least one of the targets containing the files
  supplied as input to analyzer.
  possible_targets: targets to search from."""
    found = []
    print("Targets that matched by dependency:")
    for target in possible_targets:
        if _DoesTargetDependOnMatchingTargets(target):
            found.append(target)
    return found


def _AddCompileTargets(target, roots, add_if_no_ancestor, result):
    """Recurses through all targets that depend on |target|, adding all targets
  that need to be built (and are in |roots|) to |result|.
  roots: set of root targets.
  add_if_no_ancestor: If true and there are no ancestors of |target| then add
  |target| to |result|. |target| must still be in |roots|.
  result: targets that need to be built are added here."""
    if target.visited:
        return

    target.visited = True
    target.in_roots = target in roots

    for back_dep_target in target.back_deps:
        _AddCompileTargets(back_dep_target, roots, False, result)
        target.added_to_compile_targets |= back_dep_target.added_to_compile_targets
        target.in_roots |= back_dep_target.in_roots
        target.is_or_has_linked_ancestor |= back_dep_target.is_or_has_linked_ancestor

    # Always add 'executable' targets. Even though they may be built by other
    # targets that depend upon them it makes detection of what is going to be
    # built easier.
    # And always add static_libraries that have no dependencies on them from
    # linkables. This is necessary as the other dependencies on them may be
    # static libraries themselves, which are not compile time dependencies.
    if target.in_roots and (
        target.is_executable
        or (
            not target.added_to_compile_targets
            and (add_if_no_ancestor or target.requires_build)
        )
        or (
            target.is_static_library
            and add_if_no_ancestor
            and not target.is_or_has_linked_ancestor
        )
    ):
        print(
            "\t\tadding to compile targets",
            target.name,
            "executable",
            target.is_executable,
            "added_to_compile_targets",
            target.added_to_compile_targets,
            "add_if_no_ancestor",
            add_if_no_ancestor,
            "requires_build",
            target.requires_build,
            "is_static_library",
            target.is_static_library,
            "is_or_has_linked_ancestor",
            target.is_or_has_linked_ancestor,
        )
        result.add(target)
        target.added_to_compile_targets = True


def _GetCompileTargets(matching_targets, supplied_targets):
    """Returns the set of Targets that require a build.
  matching_targets: targets that changed and need to be built.
  supplied_targets: set of targets supplied to analyzer to search from."""
    result = set()
    for target in matching_targets:
        print("finding compile targets for match", target.name)
        _AddCompileTargets(target, supplied_targets, True, result)
    return result


def _WriteOutput(params, **values):
    """Writes the output, either to stdout or a file is specified."""
    if "error" in values:
        print("Error:", values["error"])
    if "status" in values:
        print(values["status"])
    if "targets" in values:
        values["targets"].sort()
        print("Supplied targets that depend on changed files:")
        for target in values["targets"]:
            print("\t", target)
    if "invalid_targets" in values:
        values["invalid_targets"].sort()
        print("The following targets were not found:")
        for target in values["invalid_targets"]:
            print("\t", target)
    if "build_targets" in values:
        values["build_targets"].sort()
        print("Targets that require a build:")
        for target in values["build_targets"]:
            print("\t", target)
    if "compile_targets" in values:
        values["compile_targets"].sort()
        print("Targets that need to be built:")
        for target in values["compile_targets"]:
            print("\t", target)
    if "test_targets" in values:
        values["test_targets"].sort()
        print("Test targets:")
        for target in values["test_targets"]:
            print("\t", target)

    output_path = params.get("generator_flags", {}).get("analyzer_output_path", None)
    if not output_path:
        print(json.dumps(values))
        return
    try:
        f = open(output_path, "w")
        f.write(json.dumps(values) + "\n")
        f.close()
    except OSError as e:
        print("Error writing to output file", output_path, str(e))


def _WasGypIncludeFileModified(params, files):
    """Returns true if one of the files in |files| is in the set of included
  files."""
    if params["options"].includes:
        for include in params["options"].includes:
            if _ToGypPath(os.path.normpath(include)) in files:
                print("Include file modified, assuming all changed", include)
                return True
    return False


def _NamesNotIn(names, mapping):
    """Returns a list of the values in |names| that are not in |mapping|."""
    return [name for name in names if name not in mapping]


def _LookupTargets(names, mapping):
    """Returns a list of the mapping[name] for each value in |names| that is in
  |mapping|."""
    return [mapping[name] for name in names if name in mapping]


def CalculateVariables(default_variables, params):
    """Calculate additional variables for use in the build (called by gyp)."""
    flavor = gyp.common.GetFlavor(params)
    if flavor == "mac":
        default_variables.setdefault("OS", "mac")
    elif flavor == "win":
        default_variables.setdefault("OS", "win")
        gyp.msvs_emulation.CalculateCommonVariables(default_variables, params)
    else:
        operating_system = flavor
        if flavor == "android":
            operating_system = "linux"  # Keep this legacy behavior for now.
        default_variables.setdefault("OS", operating_system)


class TargetCalculator:
    """Calculates the matching test_targets and matching compile_targets."""

    def __init__(
        self,
        files,
        additional_compile_target_names,
        test_target_names,
        data,
        target_list,
        target_dicts,
        toplevel_dir,
        build_files,
    ):
        self._additional_compile_target_names = set(additional_compile_target_names)
        self._test_target_names = set(test_target_names)
        (
            self._name_to_target,
            self._changed_targets,
            self._root_targets,
        ) = _GenerateTargets(
            data, target_list, target_dicts, toplevel_dir, frozenset(files), build_files
        )
        (
            self._unqualified_mapping,
            self.invalid_targets,
        ) = _GetUnqualifiedToTargetMapping(
            self._name_to_target, self._supplied_target_names_no_all()
        )

    def _supplied_target_names(self):
        return self._additional_compile_target_names | self._test_target_names

    def _supplied_target_names_no_all(self):
        """Returns the supplied test targets without 'all'."""
        result = self._supplied_target_names()
        result.discard("all")
        return result

    def is_build_impacted(self):
        """Returns true if the supplied files impact the build at all."""
        return self._changed_targets

    def find_matching_test_target_names(self):
        """Returns the set of output test targets."""
        assert self.is_build_impacted()
        # Find the test targets first. 'all' is special cased to mean all the
        # root targets. To deal with all the supplied |test_targets| are expanded
        # to include the root targets during lookup. If any of the root targets
        # match, we remove it and replace it with 'all'.
        test_target_names_no_all = set(self._test_target_names)
        test_target_names_no_all.discard("all")
        test_targets_no_all = _LookupTargets(
            test_target_names_no_all, self._unqualified_mapping
        )
        test_target_names_contains_all = "all" in self._test_target_names
        if test_target_names_contains_all:
            test_targets = [
                x for x in (set(test_targets_no_all) | set(self._root_targets))
            ]
        else:
            test_targets = [x for x in test_targets_no_all]
        print("supplied test_targets")
        for target_name in self._test_target_names:
            print("\t", target_name)
        print("found test_targets")
        for target in test_targets:
            print("\t", target.name)
        print("searching for matching test targets")
        matching_test_targets = _GetTargetsDependingOnMatchingTargets(test_targets)
        matching_test_targets_contains_all = test_target_names_contains_all and set(
            matching_test_targets
        ) & set(self._root_targets)
        if matching_test_targets_contains_all:
            # Remove any of the targets for all that were not explicitly supplied,
            # 'all' is subsequentely added to the matching names below.
            matching_test_targets = [
                x for x in (set(matching_test_targets) & set(test_targets_no_all))
            ]
        print("matched test_targets")
        for target in matching_test_targets:
            print("\t", target.name)
        matching_target_names = [
            gyp.common.ParseQualifiedTarget(target.name)[1]
            for target in matching_test_targets
        ]
        if matching_test_targets_contains_all:
            matching_target_names.append("all")
            print("\tall")
        return matching_target_names

    def find_matching_compile_target_names(self):
        """Returns the set of output compile targets."""
        assert self.is_build_impacted()
        # Compile targets are found by searching up from changed targets.
        # Reset the visited status for _GetBuildTargets.
        for target in self._name_to_target.values():
            target.visited = False

        supplied_targets = _LookupTargets(
            self._supplied_target_names_no_all(), self._unqualified_mapping
        )
        if "all" in self._supplied_target_names():
            supplied_targets = [
                x for x in (set(supplied_targets) | set(self._root_targets))
            ]
        print("Supplied test_targets & compile_targets")
        for target in supplied_targets:
            print("\t", target.name)
        print("Finding compile targets")
        compile_targets = _GetCompileTargets(self._changed_targets, supplied_targets)
        return [
            gyp.common.ParseQualifiedTarget(target.name)[1]
            for target in compile_targets
        ]


def GenerateOutput(target_list, target_dicts, data, params):
    """Called by gyp as the final stage. Outputs results."""
    config = Config()
    try:
        config.Init(params)

        if not config.files:
            raise Exception(
                "Must specify files to analyze via config_path generator " "flag"
            )

        toplevel_dir = _ToGypPath(os.path.abspath(params["options"].toplevel_dir))
        if debug:
            print("toplevel_dir", toplevel_dir)

        if _WasGypIncludeFileModified(params, config.files):
            result_dict = {
                "status": all_changed_string,
                "test_targets": list(config.test_target_names),
                "compile_targets": list(
                    config.additional_compile_target_names | config.test_target_names
                ),
            }
            _WriteOutput(params, **result_dict)
            return

        calculator = TargetCalculator(
            config.files,
            config.additional_compile_target_names,
            config.test_target_names,
            data,
            target_list,
            target_dicts,
            toplevel_dir,
            params["build_files"],
        )
        if not calculator.is_build_impacted():
            result_dict = {
                "status": no_dependency_string,
                "test_targets": [],
                "compile_targets": [],
            }
            if calculator.invalid_targets:
                result_dict["invalid_targets"] = calculator.invalid_targets
            _WriteOutput(params, **result_dict)
            return

        test_target_names = calculator.find_matching_test_target_names()
        compile_target_names = calculator.find_matching_compile_target_names()
        found_at_least_one_target = compile_target_names or test_target_names
        result_dict = {
            "test_targets": test_target_names,
            "status": found_dependency_string
            if found_at_least_one_target
            else no_dependency_string,
            "compile_targets": list(set(compile_target_names) | set(test_target_names)),
        }
        if calculator.invalid_targets:
            result_dict["invalid_targets"] = calculator.invalid_targets
        _WriteOutput(params, **result_dict)

    except Exception as e:
        _WriteOutput(params, error=str(e))
