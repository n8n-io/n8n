# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.


import ast

import gyp.common
import gyp.simple_copy
import multiprocessing
import os.path
import re
import shlex
import signal
import subprocess
import sys
import threading
import traceback
from distutils.version import StrictVersion
from gyp.common import GypError
from gyp.common import OrderedSet

# A list of types that are treated as linkable.
linkable_types = [
    "executable",
    "shared_library",
    "loadable_module",
    "mac_kernel_extension",
    "windows_driver",
]

# A list of sections that contain links to other targets.
dependency_sections = ["dependencies", "export_dependent_settings"]

# base_path_sections is a list of sections defined by GYP that contain
# pathnames.  The generators can provide more keys, the two lists are merged
# into path_sections, but you should call IsPathSection instead of using either
# list directly.
base_path_sections = [
    "destination",
    "files",
    "include_dirs",
    "inputs",
    "libraries",
    "outputs",
    "sources",
]
path_sections = set()

# These per-process dictionaries are used to cache build file data when loading
# in parallel mode.
per_process_data = {}
per_process_aux_data = {}


def IsPathSection(section):
    # If section ends in one of the '=+?!' characters, it's applied to a section
    # without the trailing characters.  '/' is notably absent from this list,
    # because there's no way for a regular expression to be treated as a path.
    while section and section[-1:] in "=+?!":
        section = section[:-1]

    if section in path_sections:
        return True

    # Sections matching the regexp '_(dir|file|path)s?$' are also
    # considered PathSections. Using manual string matching since that
    # is much faster than the regexp and this can be called hundreds of
    # thousands of times so micro performance matters.
    if "_" in section:
        tail = section[-6:]
        if tail[-1] == "s":
            tail = tail[:-1]
        if tail[-5:] in ("_file", "_path"):
            return True
        return tail[-4:] == "_dir"

    return False


# base_non_configuration_keys is a list of key names that belong in the target
# itself and should not be propagated into its configurations.  It is merged
# with a list that can come from the generator to
# create non_configuration_keys.
base_non_configuration_keys = [
    # Sections that must exist inside targets and not configurations.
    "actions",
    "configurations",
    "copies",
    "default_configuration",
    "dependencies",
    "dependencies_original",
    "libraries",
    "postbuilds",
    "product_dir",
    "product_extension",
    "product_name",
    "product_prefix",
    "rules",
    "run_as",
    "sources",
    "standalone_static_library",
    "suppress_wildcard",
    "target_name",
    "toolset",
    "toolsets",
    "type",
    # Sections that can be found inside targets or configurations, but that
    # should not be propagated from targets into their configurations.
    "variables",
]
non_configuration_keys = []

# Keys that do not belong inside a configuration dictionary.
invalid_configuration_keys = [
    "actions",
    "all_dependent_settings",
    "configurations",
    "dependencies",
    "direct_dependent_settings",
    "libraries",
    "link_settings",
    "sources",
    "standalone_static_library",
    "target_name",
    "type",
]

# Controls whether or not the generator supports multiple toolsets.
multiple_toolsets = False

# Paths for converting filelist paths to output paths: {
#   toplevel,
#   qualified_output_dir,
# }
generator_filelist_paths = None


def GetIncludedBuildFiles(build_file_path, aux_data, included=None):
    """Return a list of all build files included into build_file_path.

  The returned list will contain build_file_path as well as all other files
  that it included, either directly or indirectly.  Note that the list may
  contain files that were included into a conditional section that evaluated
  to false and was not merged into build_file_path's dict.

  aux_data is a dict containing a key for each build file or included build
  file.  Those keys provide access to dicts whose "included" keys contain
  lists of all other files included by the build file.

  included should be left at its default None value by external callers.  It
  is used for recursion.

  The returned list will not contain any duplicate entries.  Each build file
  in the list will be relative to the current directory.
  """

    if included is None:
        included = []

    if build_file_path in included:
        return included

    included.append(build_file_path)

    for included_build_file in aux_data[build_file_path].get("included", []):
        GetIncludedBuildFiles(included_build_file, aux_data, included)

    return included


def CheckedEval(file_contents):
    """Return the eval of a gyp file.
  The gyp file is restricted to dictionaries and lists only, and
  repeated keys are not allowed.
  Note that this is slower than eval() is.
  """

    syntax_tree = ast.parse(file_contents)
    assert isinstance(syntax_tree, ast.Module)
    c1 = syntax_tree.body
    assert len(c1) == 1
    c2 = c1[0]
    assert isinstance(c2, ast.Expr)
    return CheckNode(c2.value, [])


def CheckNode(node, keypath):
    if isinstance(node, ast.Dict):
        dict = {}
        for key, value in zip(node.keys, node.values):
            assert isinstance(key, ast.Str)
            key = key.s
            if key in dict:
                raise GypError(
                    "Key '"
                    + key
                    + "' repeated at level "
                    + repr(len(keypath) + 1)
                    + " with key path '"
                    + ".".join(keypath)
                    + "'"
                )
            kp = list(keypath)  # Make a copy of the list for descending this node.
            kp.append(key)
            dict[key] = CheckNode(value, kp)
        return dict
    elif isinstance(node, ast.List):
        children = []
        for index, child in enumerate(node.elts):
            kp = list(keypath)  # Copy list.
            kp.append(repr(index))
            children.append(CheckNode(child, kp))
        return children
    elif isinstance(node, ast.Str):
        return node.s
    else:
        raise TypeError(
            "Unknown AST node at key path '" + ".".join(keypath) + "': " + repr(node)
        )


def LoadOneBuildFile(build_file_path, data, aux_data, includes, is_target, check):
    if build_file_path in data:
        return data[build_file_path]

    if os.path.exists(build_file_path):
        build_file_contents = open(build_file_path, encoding='utf-8').read()
    else:
        raise GypError(f"{build_file_path} not found (cwd: {os.getcwd()})")

    build_file_data = None
    try:
        if check:
            build_file_data = CheckedEval(build_file_contents)
        else:
            build_file_data = eval(build_file_contents, {"__builtins__": {}}, None)
    except SyntaxError as e:
        e.filename = build_file_path
        raise
    except Exception as e:
        gyp.common.ExceptionAppend(e, "while reading " + build_file_path)
        raise

    if type(build_file_data) is not dict:
        raise GypError("%s does not evaluate to a dictionary." % build_file_path)

    data[build_file_path] = build_file_data
    aux_data[build_file_path] = {}

    # Scan for includes and merge them in.
    if "skip_includes" not in build_file_data or not build_file_data["skip_includes"]:
        try:
            if is_target:
                LoadBuildFileIncludesIntoDict(
                    build_file_data, build_file_path, data, aux_data, includes, check
                )
            else:
                LoadBuildFileIncludesIntoDict(
                    build_file_data, build_file_path, data, aux_data, None, check
                )
        except Exception as e:
            gyp.common.ExceptionAppend(
                e, "while reading includes of " + build_file_path
            )
            raise

    return build_file_data


def LoadBuildFileIncludesIntoDict(
    subdict, subdict_path, data, aux_data, includes, check
):
    includes_list = []
    if includes is not None:
        includes_list.extend(includes)
    if "includes" in subdict:
        for include in subdict["includes"]:
            # "include" is specified relative to subdict_path, so compute the real
            # path to include by appending the provided "include" to the directory
            # in which subdict_path resides.
            relative_include = os.path.normpath(
                os.path.join(os.path.dirname(subdict_path), include)
            )
            includes_list.append(relative_include)
        # Unhook the includes list, it's no longer needed.
        del subdict["includes"]

    # Merge in the included files.
    for include in includes_list:
        if "included" not in aux_data[subdict_path]:
            aux_data[subdict_path]["included"] = []
        aux_data[subdict_path]["included"].append(include)

        gyp.DebugOutput(gyp.DEBUG_INCLUDES, "Loading Included File: '%s'", include)

        MergeDicts(
            subdict,
            LoadOneBuildFile(include, data, aux_data, None, False, check),
            subdict_path,
            include,
        )

    # Recurse into subdictionaries.
    for k, v in subdict.items():
        if type(v) is dict:
            LoadBuildFileIncludesIntoDict(v, subdict_path, data, aux_data, None, check)
        elif type(v) is list:
            LoadBuildFileIncludesIntoList(v, subdict_path, data, aux_data, check)


# This recurses into lists so that it can look for dicts.
def LoadBuildFileIncludesIntoList(sublist, sublist_path, data, aux_data, check):
    for item in sublist:
        if type(item) is dict:
            LoadBuildFileIncludesIntoDict(
                item, sublist_path, data, aux_data, None, check
            )
        elif type(item) is list:
            LoadBuildFileIncludesIntoList(item, sublist_path, data, aux_data, check)


# Processes toolsets in all the targets. This recurses into condition entries
# since they can contain toolsets as well.
def ProcessToolsetsInDict(data):
    if "targets" in data:
        target_list = data["targets"]
        new_target_list = []
        for target in target_list:
            # If this target already has an explicit 'toolset', and no 'toolsets'
            # list, don't modify it further.
            if "toolset" in target and "toolsets" not in target:
                new_target_list.append(target)
                continue
            if multiple_toolsets:
                toolsets = target.get("toolsets", ["target"])
            else:
                toolsets = ["target"]
            # Make sure this 'toolsets' definition is only processed once.
            if "toolsets" in target:
                del target["toolsets"]
            if len(toolsets) > 0:
                # Optimization: only do copies if more than one toolset is specified.
                for build in toolsets[1:]:
                    new_target = gyp.simple_copy.deepcopy(target)
                    new_target["toolset"] = build
                    new_target_list.append(new_target)
                target["toolset"] = toolsets[0]
                new_target_list.append(target)
        data["targets"] = new_target_list
    if "conditions" in data:
        for condition in data["conditions"]:
            if type(condition) is list:
                for condition_dict in condition[1:]:
                    if type(condition_dict) is dict:
                        ProcessToolsetsInDict(condition_dict)


# TODO(mark): I don't love this name.  It just means that it's going to load
# a build file that contains targets and is expected to provide a targets dict
# that contains the targets...
def LoadTargetBuildFile(
    build_file_path,
    data,
    aux_data,
    variables,
    includes,
    depth,
    check,
    load_dependencies,
):
    # If depth is set, predefine the DEPTH variable to be a relative path from
    # this build file's directory to the directory identified by depth.
    if depth:
        # TODO(dglazkov) The backslash/forward-slash replacement at the end is a
        # temporary measure. This should really be addressed by keeping all paths
        # in POSIX until actual project generation.
        d = gyp.common.RelativePath(depth, os.path.dirname(build_file_path))
        if d == "":
            variables["DEPTH"] = "."
        else:
            variables["DEPTH"] = d.replace("\\", "/")

    # The 'target_build_files' key is only set when loading target build files in
    # the non-parallel code path, where LoadTargetBuildFile is called
    # recursively.  In the parallel code path, we don't need to check whether the
    # |build_file_path| has already been loaded, because the 'scheduled' set in
    # ParallelState guarantees that we never load the same |build_file_path|
    # twice.
    if "target_build_files" in data:
        if build_file_path in data["target_build_files"]:
            # Already loaded.
            return False
        data["target_build_files"].add(build_file_path)

    gyp.DebugOutput(
        gyp.DEBUG_INCLUDES, "Loading Target Build File '%s'", build_file_path
    )

    build_file_data = LoadOneBuildFile(
        build_file_path, data, aux_data, includes, True, check
    )

    # Store DEPTH for later use in generators.
    build_file_data["_DEPTH"] = depth

    # Set up the included_files key indicating which .gyp files contributed to
    # this target dict.
    if "included_files" in build_file_data:
        raise GypError(build_file_path + " must not contain included_files key")

    included = GetIncludedBuildFiles(build_file_path, aux_data)
    build_file_data["included_files"] = []
    for included_file in included:
        # included_file is relative to the current directory, but it needs to
        # be made relative to build_file_path's directory.
        included_relative = gyp.common.RelativePath(
            included_file, os.path.dirname(build_file_path)
        )
        build_file_data["included_files"].append(included_relative)

    # Do a first round of toolsets expansion so that conditions can be defined
    # per toolset.
    ProcessToolsetsInDict(build_file_data)

    # Apply "pre"/"early" variable expansions and condition evaluations.
    ProcessVariablesAndConditionsInDict(
        build_file_data, PHASE_EARLY, variables, build_file_path
    )

    # Since some toolsets might have been defined conditionally, perform
    # a second round of toolsets expansion now.
    ProcessToolsetsInDict(build_file_data)

    # Look at each project's target_defaults dict, and merge settings into
    # targets.
    if "target_defaults" in build_file_data:
        if "targets" not in build_file_data:
            raise GypError("Unable to find targets in build file %s" % build_file_path)

        index = 0
        while index < len(build_file_data["targets"]):
            # This procedure needs to give the impression that target_defaults is
            # used as defaults, and the individual targets inherit from that.
            # The individual targets need to be merged into the defaults.  Make
            # a deep copy of the defaults for each target, merge the target dict
            # as found in the input file into that copy, and then hook up the
            # copy with the target-specific data merged into it as the replacement
            # target dict.
            old_target_dict = build_file_data["targets"][index]
            new_target_dict = gyp.simple_copy.deepcopy(
                build_file_data["target_defaults"]
            )
            MergeDicts(
                new_target_dict, old_target_dict, build_file_path, build_file_path
            )
            build_file_data["targets"][index] = new_target_dict
            index += 1

        # No longer needed.
        del build_file_data["target_defaults"]

    # Look for dependencies.  This means that dependency resolution occurs
    # after "pre" conditionals and variable expansion, but before "post" -
    # in other words, you can't put a "dependencies" section inside a "post"
    # conditional within a target.

    dependencies = []
    if "targets" in build_file_data:
        for target_dict in build_file_data["targets"]:
            if "dependencies" not in target_dict:
                continue
            for dependency in target_dict["dependencies"]:
                dependencies.append(
                    gyp.common.ResolveTarget(build_file_path, dependency, None)[0]
                )

    if load_dependencies:
        for dependency in dependencies:
            try:
                LoadTargetBuildFile(
                    dependency,
                    data,
                    aux_data,
                    variables,
                    includes,
                    depth,
                    check,
                    load_dependencies,
                )
            except Exception as e:
                gyp.common.ExceptionAppend(
                    e, "while loading dependencies of %s" % build_file_path
                )
                raise
    else:
        return (build_file_path, dependencies)


def CallLoadTargetBuildFile(
    global_flags,
    build_file_path,
    variables,
    includes,
    depth,
    check,
    generator_input_info,
):
    """Wrapper around LoadTargetBuildFile for parallel processing.

     This wrapper is used when LoadTargetBuildFile is executed in
     a worker process.
  """

    try:
        signal.signal(signal.SIGINT, signal.SIG_IGN)

        # Apply globals so that the worker process behaves the same.
        for key, value in global_flags.items():
            globals()[key] = value

        SetGeneratorGlobals(generator_input_info)
        result = LoadTargetBuildFile(
            build_file_path,
            per_process_data,
            per_process_aux_data,
            variables,
            includes,
            depth,
            check,
            False,
        )
        if not result:
            return result

        (build_file_path, dependencies) = result

        # We can safely pop the build_file_data from per_process_data because it
        # will never be referenced by this process again, so we don't need to keep
        # it in the cache.
        build_file_data = per_process_data.pop(build_file_path)

        # This gets serialized and sent back to the main process via a pipe.
        # It's handled in LoadTargetBuildFileCallback.
        return (build_file_path, build_file_data, dependencies)
    except GypError as e:
        sys.stderr.write("gyp: %s\n" % e)
        return None
    except Exception as e:
        print("Exception:", e, file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return None


class ParallelProcessingError(Exception):
    pass


class ParallelState:
    """Class to keep track of state when processing input files in parallel.

  If build files are loaded in parallel, use this to keep track of
  state during farming out and processing parallel jobs. It's stored
  in a global so that the callback function can have access to it.
  """

    def __init__(self):
        # The multiprocessing pool.
        self.pool = None
        # The condition variable used to protect this object and notify
        # the main loop when there might be more data to process.
        self.condition = None
        # The "data" dict that was passed to LoadTargetBuildFileParallel
        self.data = None
        # The number of parallel calls outstanding; decremented when a response
        # was received.
        self.pending = 0
        # The set of all build files that have been scheduled, so we don't
        # schedule the same one twice.
        self.scheduled = set()
        # A list of dependency build file paths that haven't been scheduled yet.
        self.dependencies = []
        # Flag to indicate if there was an error in a child process.
        self.error = False

    def LoadTargetBuildFileCallback(self, result):
        """Handle the results of running LoadTargetBuildFile in another process.
    """
        self.condition.acquire()
        if not result:
            self.error = True
            self.condition.notify()
            self.condition.release()
            return
        (build_file_path0, build_file_data0, dependencies0) = result
        self.data[build_file_path0] = build_file_data0
        self.data["target_build_files"].add(build_file_path0)
        for new_dependency in dependencies0:
            if new_dependency not in self.scheduled:
                self.scheduled.add(new_dependency)
                self.dependencies.append(new_dependency)
        self.pending -= 1
        self.condition.notify()
        self.condition.release()


def LoadTargetBuildFilesParallel(
    build_files, data, variables, includes, depth, check, generator_input_info
):
    parallel_state = ParallelState()
    parallel_state.condition = threading.Condition()
    # Make copies of the build_files argument that we can modify while working.
    parallel_state.dependencies = list(build_files)
    parallel_state.scheduled = set(build_files)
    parallel_state.pending = 0
    parallel_state.data = data

    try:
        parallel_state.condition.acquire()
        while parallel_state.dependencies or parallel_state.pending:
            if parallel_state.error:
                break
            if not parallel_state.dependencies:
                parallel_state.condition.wait()
                continue

            dependency = parallel_state.dependencies.pop()

            parallel_state.pending += 1
            global_flags = {
                "path_sections": globals()["path_sections"],
                "non_configuration_keys": globals()["non_configuration_keys"],
                "multiple_toolsets": globals()["multiple_toolsets"],
            }

            if not parallel_state.pool:
                parallel_state.pool = multiprocessing.Pool(multiprocessing.cpu_count())
            parallel_state.pool.apply_async(
                CallLoadTargetBuildFile,
                args=(
                    global_flags,
                    dependency,
                    variables,
                    includes,
                    depth,
                    check,
                    generator_input_info,
                ),
                callback=parallel_state.LoadTargetBuildFileCallback,
            )
    except KeyboardInterrupt as e:
        parallel_state.pool.terminate()
        raise e

    parallel_state.condition.release()

    parallel_state.pool.close()
    parallel_state.pool.join()
    parallel_state.pool = None

    if parallel_state.error:
        sys.exit(1)


# Look for the bracket that matches the first bracket seen in a
# string, and return the start and end as a tuple.  For example, if
# the input is something like "<(foo <(bar)) blah", then it would
# return (1, 13), indicating the entire string except for the leading
# "<" and trailing " blah".
LBRACKETS = set("{[(")
BRACKETS = {"}": "{", "]": "[", ")": "("}


def FindEnclosingBracketGroup(input_str):
    stack = []
    start = -1
    for index, char in enumerate(input_str):
        if char in LBRACKETS:
            stack.append(char)
            if start == -1:
                start = index
        elif char in BRACKETS:
            if not stack:
                return (-1, -1)
            if stack.pop() != BRACKETS[char]:
                return (-1, -1)
            if not stack:
                return (start, index + 1)
    return (-1, -1)


def IsStrCanonicalInt(string):
    """Returns True if |string| is in its canonical integer form.

  The canonical form is such that str(int(string)) == string.
  """
    if type(string) is str:
        # This function is called a lot so for maximum performance, avoid
        # involving regexps which would otherwise make the code much
        # shorter. Regexps would need twice the time of this function.
        if string:
            if string == "0":
                return True
            if string[0] == "-":
                string = string[1:]
                if not string:
                    return False
            if "1" <= string[0] <= "9":
                return string.isdigit()

    return False


# This matches things like "<(asdf)", "<!(cmd)", "<!@(cmd)", "<|(list)",
# "<!interpreter(arguments)", "<([list])", and even "<([)" and "<(<())".
# In the last case, the inner "<()" is captured in match['content'].
early_variable_re = re.compile(
    r"(?P<replace>(?P<type><(?:(?:!?@?)|\|)?)"
    r"(?P<command_string>[-a-zA-Z0-9_.]+)?"
    r"\((?P<is_array>\s*\[?)"
    r"(?P<content>.*?)(\]?)\))"
)

# This matches the same as early_variable_re, but with '>' instead of '<'.
late_variable_re = re.compile(
    r"(?P<replace>(?P<type>>(?:(?:!?@?)|\|)?)"
    r"(?P<command_string>[-a-zA-Z0-9_.]+)?"
    r"\((?P<is_array>\s*\[?)"
    r"(?P<content>.*?)(\]?)\))"
)

# This matches the same as early_variable_re, but with '^' instead of '<'.
latelate_variable_re = re.compile(
    r"(?P<replace>(?P<type>[\^](?:(?:!?@?)|\|)?)"
    r"(?P<command_string>[-a-zA-Z0-9_.]+)?"
    r"\((?P<is_array>\s*\[?)"
    r"(?P<content>.*?)(\]?)\))"
)

# Global cache of results from running commands so they don't have to be run
# more then once.
cached_command_results = {}


def FixupPlatformCommand(cmd):
    if sys.platform == "win32":
        if type(cmd) is list:
            cmd = [re.sub("^cat ", "type ", cmd[0])] + cmd[1:]
        else:
            cmd = re.sub("^cat ", "type ", cmd)
    return cmd


PHASE_EARLY = 0
PHASE_LATE = 1
PHASE_LATELATE = 2


def ExpandVariables(input, phase, variables, build_file):
    # Look for the pattern that gets expanded into variables
    if phase == PHASE_EARLY:
        variable_re = early_variable_re
        expansion_symbol = "<"
    elif phase == PHASE_LATE:
        variable_re = late_variable_re
        expansion_symbol = ">"
    elif phase == PHASE_LATELATE:
        variable_re = latelate_variable_re
        expansion_symbol = "^"
    else:
        assert False

    input_str = str(input)
    if IsStrCanonicalInt(input_str):
        return int(input_str)

    # Do a quick scan to determine if an expensive regex search is warranted.
    if expansion_symbol not in input_str:
        return input_str

    # Get the entire list of matches as a list of MatchObject instances.
    # (using findall here would return strings instead of MatchObjects).
    matches = list(variable_re.finditer(input_str))
    if not matches:
        return input_str

    output = input_str
    # Reverse the list of matches so that replacements are done right-to-left.
    # That ensures that earlier replacements won't mess up the string in a
    # way that causes later calls to find the earlier substituted text instead
    # of what's intended for replacement.
    matches.reverse()
    for match_group in matches:
        match = match_group.groupdict()
        gyp.DebugOutput(gyp.DEBUG_VARIABLES, "Matches: %r", match)
        # match['replace'] is the substring to look for, match['type']
        # is the character code for the replacement type (< > <! >! <| >| <@
        # >@ <!@ >!@), match['is_array'] contains a '[' for command
        # arrays, and match['content'] is the name of the variable (< >)
        # or command to run (<! >!). match['command_string'] is an optional
        # command string. Currently, only 'pymod_do_main' is supported.

        # run_command is true if a ! variant is used.
        run_command = "!" in match["type"]
        command_string = match["command_string"]

        # file_list is true if a | variant is used.
        file_list = "|" in match["type"]

        # Capture these now so we can adjust them later.
        replace_start = match_group.start("replace")
        replace_end = match_group.end("replace")

        # Find the ending paren, and re-evaluate the contained string.
        (c_start, c_end) = FindEnclosingBracketGroup(input_str[replace_start:])

        # Adjust the replacement range to match the entire command
        # found by FindEnclosingBracketGroup (since the variable_re
        # probably doesn't match the entire command if it contained
        # nested variables).
        replace_end = replace_start + c_end

        # Find the "real" replacement, matching the appropriate closing
        # paren, and adjust the replacement start and end.
        replacement = input_str[replace_start:replace_end]

        # Figure out what the contents of the variable parens are.
        contents_start = replace_start + c_start + 1
        contents_end = replace_end - 1
        contents = input_str[contents_start:contents_end]

        # Do filter substitution now for <|().
        # Admittedly, this is different than the evaluation order in other
        # contexts. However, since filtration has no chance to run on <|(),
        # this seems like the only obvious way to give them access to filters.
        if file_list:
            processed_variables = gyp.simple_copy.deepcopy(variables)
            ProcessListFiltersInDict(contents, processed_variables)
            # Recurse to expand variables in the contents
            contents = ExpandVariables(contents, phase, processed_variables, build_file)
        else:
            # Recurse to expand variables in the contents
            contents = ExpandVariables(contents, phase, variables, build_file)

        # Strip off leading/trailing whitespace so that variable matches are
        # simpler below (and because they are rarely needed).
        contents = contents.strip()

        # expand_to_list is true if an @ variant is used.  In that case,
        # the expansion should result in a list.  Note that the caller
        # is to be expecting a list in return, and not all callers do
        # because not all are working in list context.  Also, for list
        # expansions, there can be no other text besides the variable
        # expansion in the input string.
        expand_to_list = "@" in match["type"] and input_str == replacement

        if run_command or file_list:
            # Find the build file's directory, so commands can be run or file lists
            # generated relative to it.
            build_file_dir = os.path.dirname(build_file)
            if build_file_dir == "" and not file_list:
                # If build_file is just a leaf filename indicating a file in the
                # current directory, build_file_dir might be an empty string.  Set
                # it to None to signal to subprocess.Popen that it should run the
                # command in the current directory.
                build_file_dir = None

        # Support <|(listfile.txt ...) which generates a file
        # containing items from a gyp list, generated at gyp time.
        # This works around actions/rules which have more inputs than will
        # fit on the command line.
        if file_list:
            if type(contents) is list:
                contents_list = contents
            else:
                contents_list = contents.split(" ")
            replacement = contents_list[0]
            if os.path.isabs(replacement):
                raise GypError('| cannot handle absolute paths, got "%s"' % replacement)

            if not generator_filelist_paths:
                path = os.path.join(build_file_dir, replacement)
            else:
                if os.path.isabs(build_file_dir):
                    toplevel = generator_filelist_paths["toplevel"]
                    rel_build_file_dir = gyp.common.RelativePath(
                        build_file_dir, toplevel
                    )
                else:
                    rel_build_file_dir = build_file_dir
                qualified_out_dir = generator_filelist_paths["qualified_out_dir"]
                path = os.path.join(qualified_out_dir, rel_build_file_dir, replacement)
                gyp.common.EnsureDirExists(path)

            replacement = gyp.common.RelativePath(path, build_file_dir)
            f = gyp.common.WriteOnDiff(path)
            for i in contents_list[1:]:
                f.write("%s\n" % i)
            f.close()

        elif run_command:
            use_shell = True
            if match["is_array"]:
                contents = eval(contents)
                use_shell = False

            # Check for a cached value to avoid executing commands, or generating
            # file lists more than once. The cache key contains the command to be
            # run as well as the directory to run it from, to account for commands
            # that depend on their current directory.
            # TODO(http://code.google.com/p/gyp/issues/detail?id=111): In theory,
            # someone could author a set of GYP files where each time the command
            # is invoked it produces different output by design. When the need
            # arises, the syntax should be extended to support no caching off a
            # command's output so it is run every time.
            cache_key = (str(contents), build_file_dir)
            cached_value = cached_command_results.get(cache_key, None)
            if cached_value is None:
                gyp.DebugOutput(
                    gyp.DEBUG_VARIABLES,
                    "Executing command '%s' in directory '%s'",
                    contents,
                    build_file_dir,
                )

                replacement = ""

                if command_string == "pymod_do_main":
                    # <!pymod_do_main(modulename param eters) loads |modulename| as a
                    # python module and then calls that module's DoMain() function,
                    # passing ["param", "eters"] as a single list argument. For modules
                    # that don't load quickly, this can be faster than
                    # <!(python modulename param eters). Do this in |build_file_dir|.
                    oldwd = os.getcwd()  # Python doesn't like os.open('.'): no fchdir.
                    if build_file_dir:  # build_file_dir may be None (see above).
                        os.chdir(build_file_dir)
                    sys.path.append(os.getcwd())
                    try:

                        parsed_contents = shlex.split(contents)
                        try:
                            py_module = __import__(parsed_contents[0])
                        except ImportError as e:
                            raise GypError(
                                "Error importing pymod_do_main"
                                "module (%s): %s" % (parsed_contents[0], e)
                            )
                        replacement = str(
                            py_module.DoMain(parsed_contents[1:])
                        ).rstrip()
                    finally:
                        sys.path.pop()
                        os.chdir(oldwd)
                    assert replacement is not None
                elif command_string:
                    raise GypError(
                        "Unknown command string '%s' in '%s'."
                        % (command_string, contents)
                    )
                else:
                    # Fix up command with platform specific workarounds.
                    contents = FixupPlatformCommand(contents)
                    try:
                        p = subprocess.Popen(
                            contents,
                            shell=use_shell,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE,
                            cwd=build_file_dir,
                        )
                    except Exception as e:
                        raise GypError(
                            "%s while executing command '%s' in %s"
                            % (e, contents, build_file)
                        )

                    p_stdout, p_stderr = p.communicate("")
                    p_stdout = p_stdout.decode("utf-8")
                    p_stderr = p_stderr.decode("utf-8")

                    if p.wait() != 0 or p_stderr:
                        sys.stderr.write(p_stderr)
                        # Simulate check_call behavior, since check_call only exists
                        # in python 2.5 and later.
                        raise GypError(
                            "Call to '%s' returned exit status %d while in %s."
                            % (contents, p.returncode, build_file)
                        )
                    replacement = p_stdout.rstrip()

                cached_command_results[cache_key] = replacement
            else:
                gyp.DebugOutput(
                    gyp.DEBUG_VARIABLES,
                    "Had cache value for command '%s' in directory '%s'",
                    contents,
                    build_file_dir,
                )
                replacement = cached_value

        else:
            if contents not in variables:
                if contents[-1] in ["!", "/"]:
                    # In order to allow cross-compiles (nacl) to happen more naturally,
                    # we will allow references to >(sources/) etc. to resolve to
                    # and empty list if undefined. This allows actions to:
                    # 'action!': [
                    #   '>@(_sources!)',
                    # ],
                    # 'action/': [
                    #   '>@(_sources/)',
                    # ],
                    replacement = []
                else:
                    raise GypError(
                        "Undefined variable " + contents + " in " + build_file
                    )
            else:
                replacement = variables[contents]

        if isinstance(replacement, bytes) and not isinstance(replacement, str):
            replacement = replacement.decode("utf-8")  # done on Python 3 only
        if type(replacement) is list:
            for item in replacement:
                if isinstance(item, bytes) and not isinstance(item, str):
                    item = item.decode("utf-8")  # done on Python 3 only
                if not contents[-1] == "/" and type(item) not in (str, int):
                    raise GypError(
                        "Variable "
                        + contents
                        + " must expand to a string or list of strings; "
                        + "list contains a "
                        + item.__class__.__name__
                    )
            # Run through the list and handle variable expansions in it.  Since
            # the list is guaranteed not to contain dicts, this won't do anything
            # with conditions sections.
            ProcessVariablesAndConditionsInList(
                replacement, phase, variables, build_file
            )
        elif type(replacement) not in (str, int):
            raise GypError(
                "Variable "
                + contents
                + " must expand to a string or list of strings; "
                + "found a "
                + replacement.__class__.__name__
            )

        if expand_to_list:
            # Expanding in list context.  It's guaranteed that there's only one
            # replacement to do in |input_str| and that it's this replacement.  See
            # above.
            if type(replacement) is list:
                # If it's already a list, make a copy.
                output = replacement[:]
            else:
                # Split it the same way sh would split arguments.
                output = shlex.split(str(replacement))
        else:
            # Expanding in string context.
            encoded_replacement = ""
            if type(replacement) is list:
                # When expanding a list into string context, turn the list items
                # into a string in a way that will work with a subprocess call.
                #
                # TODO(mark): This isn't completely correct.  This should
                # call a generator-provided function that observes the
                # proper list-to-argument quoting rules on a specific
                # platform instead of just calling the POSIX encoding
                # routine.
                encoded_replacement = gyp.common.EncodePOSIXShellList(replacement)
            else:
                encoded_replacement = replacement

            output = (
                output[:replace_start] + str(encoded_replacement) + output[replace_end:]
            )
        # Prepare for the next match iteration.
        input_str = output

    if output == input:
        gyp.DebugOutput(
            gyp.DEBUG_VARIABLES,
            "Found only identity matches on %r, avoiding infinite " "recursion.",
            output,
        )
    else:
        # Look for more matches now that we've replaced some, to deal with
        # expanding local variables (variables defined in the same
        # variables block as this one).
        gyp.DebugOutput(gyp.DEBUG_VARIABLES, "Found output %r, recursing.", output)
        if type(output) is list:
            if output and type(output[0]) is list:
                # Leave output alone if it's a list of lists.
                # We don't want such lists to be stringified.
                pass
            else:
                new_output = []
                for item in output:
                    new_output.append(
                        ExpandVariables(item, phase, variables, build_file)
                    )
                output = new_output
        else:
            output = ExpandVariables(output, phase, variables, build_file)

    # Convert all strings that are canonically-represented integers into integers.
    if type(output) is list:
        for index, outstr in enumerate(output):
            if IsStrCanonicalInt(outstr):
                output[index] = int(outstr)
    elif IsStrCanonicalInt(output):
        output = int(output)

    return output


# The same condition is often evaluated over and over again so it
# makes sense to cache as much as possible between evaluations.
cached_conditions_asts = {}


def EvalCondition(condition, conditions_key, phase, variables, build_file):
    """Returns the dict that should be used or None if the result was
  that nothing should be used."""
    if type(condition) is not list:
        raise GypError(conditions_key + " must be a list")
    if len(condition) < 2:
        # It's possible that condition[0] won't work in which case this
        # attempt will raise its own IndexError.  That's probably fine.
        raise GypError(
            conditions_key
            + " "
            + condition[0]
            + " must be at least length 2, not "
            + str(len(condition))
        )

    i = 0
    result = None
    while i < len(condition):
        cond_expr = condition[i]
        true_dict = condition[i + 1]
        if type(true_dict) is not dict:
            raise GypError(
                "{} {} must be followed by a dictionary, not {}".format(
                    conditions_key, cond_expr, type(true_dict)
                )
            )
        if len(condition) > i + 2 and type(condition[i + 2]) is dict:
            false_dict = condition[i + 2]
            i = i + 3
            if i != len(condition):
                raise GypError(
                    "{} {} has {} unexpected trailing items".format(
                        conditions_key, cond_expr, len(condition) - i
                    )
                )
        else:
            false_dict = None
            i = i + 2
        if result is None:
            result = EvalSingleCondition(
                cond_expr, true_dict, false_dict, phase, variables, build_file
            )

    return result


def EvalSingleCondition(cond_expr, true_dict, false_dict, phase, variables, build_file):
    """Returns true_dict if cond_expr evaluates to true, and false_dict
  otherwise."""
    # Do expansions on the condition itself.  Since the condition can naturally
    # contain variable references without needing to resort to GYP expansion
    # syntax, this is of dubious value for variables, but someone might want to
    # use a command expansion directly inside a condition.
    cond_expr_expanded = ExpandVariables(cond_expr, phase, variables, build_file)
    if type(cond_expr_expanded) not in (str, int):
        raise ValueError(
            "Variable expansion in this context permits str and int "
            + "only, found "
            + cond_expr_expanded.__class__.__name__
        )

    try:
        if cond_expr_expanded in cached_conditions_asts:
            ast_code = cached_conditions_asts[cond_expr_expanded]
        else:
            ast_code = compile(cond_expr_expanded, "<string>", "eval")
            cached_conditions_asts[cond_expr_expanded] = ast_code
        env = {"__builtins__": {}, "v": StrictVersion}
        if eval(ast_code, env, variables):
            return true_dict
        return false_dict
    except SyntaxError as e:
        syntax_error = SyntaxError(
            "%s while evaluating condition '%s' in %s "
            "at character %d." % (str(e.args[0]), e.text, build_file, e.offset),
            e.filename,
            e.lineno,
            e.offset,
            e.text,
        )
        raise syntax_error
    except NameError as e:
        gyp.common.ExceptionAppend(
            e,
            f"while evaluating condition '{cond_expr_expanded}' in {build_file}",
        )
        raise GypError(e)


def ProcessConditionsInDict(the_dict, phase, variables, build_file):
    # Process a 'conditions' or 'target_conditions' section in the_dict,
    # depending on phase.
    # early -> conditions
    # late -> target_conditions
    # latelate -> no conditions
    #
    # Each item in a conditions list consists of cond_expr, a string expression
    # evaluated as the condition, and true_dict, a dict that will be merged into
    # the_dict if cond_expr evaluates to true.  Optionally, a third item,
    # false_dict, may be present.  false_dict is merged into the_dict if
    # cond_expr evaluates to false.
    #
    # Any dict merged into the_dict will be recursively processed for nested
    # conditionals and other expansions, also according to phase, immediately
    # prior to being merged.

    if phase == PHASE_EARLY:
        conditions_key = "conditions"
    elif phase == PHASE_LATE:
        conditions_key = "target_conditions"
    elif phase == PHASE_LATELATE:
        return
    else:
        assert False

    if conditions_key not in the_dict:
        return

    conditions_list = the_dict[conditions_key]
    # Unhook the conditions list, it's no longer needed.
    del the_dict[conditions_key]

    for condition in conditions_list:
        merge_dict = EvalCondition(
            condition, conditions_key, phase, variables, build_file
        )

        if merge_dict is not None:
            # Expand variables and nested conditinals in the merge_dict before
            # merging it.
            ProcessVariablesAndConditionsInDict(
                merge_dict, phase, variables, build_file
            )

            MergeDicts(the_dict, merge_dict, build_file, build_file)


def LoadAutomaticVariablesFromDict(variables, the_dict):
    # Any keys with plain string values in the_dict become automatic variables.
    # The variable name is the key name with a "_" character prepended.
    for key, value in the_dict.items():
        if type(value) in (str, int, list):
            variables["_" + key] = value


def LoadVariablesFromVariablesDict(variables, the_dict, the_dict_key):
    # Any keys in the_dict's "variables" dict, if it has one, becomes a
    # variable.  The variable name is the key name in the "variables" dict.
    # Variables that end with the % character are set only if they are unset in
    # the variables dict.  the_dict_key is the name of the key that accesses
    # the_dict in the_dict's parent dict.  If the_dict's parent is not a dict
    # (it could be a list or it could be parentless because it is a root dict),
    # the_dict_key will be None.
    for key, value in the_dict.get("variables", {}).items():
        if type(value) not in (str, int, list):
            continue

        if key.endswith("%"):
            variable_name = key[:-1]
            if variable_name in variables:
                # If the variable is already set, don't set it.
                continue
            if the_dict_key == "variables" and variable_name in the_dict:
                # If the variable is set without a % in the_dict, and the_dict is a
                # variables dict (making |variables| a variables sub-dict of a
                # variables dict), use the_dict's definition.
                value = the_dict[variable_name]
        else:
            variable_name = key

        variables[variable_name] = value


def ProcessVariablesAndConditionsInDict(
    the_dict, phase, variables_in, build_file, the_dict_key=None
):
    """Handle all variable and command expansion and conditional evaluation.

  This function is the public entry point for all variable expansions and
  conditional evaluations.  The variables_in dictionary will not be modified
  by this function.
  """

    # Make a copy of the variables_in dict that can be modified during the
    # loading of automatics and the loading of the variables dict.
    variables = variables_in.copy()
    LoadAutomaticVariablesFromDict(variables, the_dict)

    if "variables" in the_dict:
        # Make sure all the local variables are added to the variables
        # list before we process them so that you can reference one
        # variable from another.  They will be fully expanded by recursion
        # in ExpandVariables.
        for key, value in the_dict["variables"].items():
            variables[key] = value

        # Handle the associated variables dict first, so that any variable
        # references within can be resolved prior to using them as variables.
        # Pass a copy of the variables dict to avoid having it be tainted.
        # Otherwise, it would have extra automatics added for everything that
        # should just be an ordinary variable in this scope.
        ProcessVariablesAndConditionsInDict(
            the_dict["variables"], phase, variables, build_file, "variables"
        )

    LoadVariablesFromVariablesDict(variables, the_dict, the_dict_key)

    for key, value in the_dict.items():
        # Skip "variables", which was already processed if present.
        if key != "variables" and type(value) is str:
            expanded = ExpandVariables(value, phase, variables, build_file)
            if type(expanded) not in (str, int):
                raise ValueError(
                    "Variable expansion in this context permits str and int "
                    + "only, found "
                    + expanded.__class__.__name__
                    + " for "
                    + key
                )
            the_dict[key] = expanded

    # Variable expansion may have resulted in changes to automatics.  Reload.
    # TODO(mark): Optimization: only reload if no changes were made.
    variables = variables_in.copy()
    LoadAutomaticVariablesFromDict(variables, the_dict)
    LoadVariablesFromVariablesDict(variables, the_dict, the_dict_key)

    # Process conditions in this dict.  This is done after variable expansion
    # so that conditions may take advantage of expanded variables.  For example,
    # if the_dict contains:
    #   {'type':       '<(library_type)',
    #    'conditions': [['_type=="static_library"', { ... }]]},
    # _type, as used in the condition, will only be set to the value of
    # library_type if variable expansion is performed before condition
    # processing.  However, condition processing should occur prior to recursion
    # so that variables (both automatic and "variables" dict type) may be
    # adjusted by conditions sections, merged into the_dict, and have the
    # intended impact on contained dicts.
    #
    # This arrangement means that a "conditions" section containing a "variables"
    # section will only have those variables effective in subdicts, not in
    # the_dict.  The workaround is to put a "conditions" section within a
    # "variables" section.  For example:
    #   {'conditions': [['os=="mac"', {'variables': {'define': 'IS_MAC'}}]],
    #    'defines':    ['<(define)'],
    #    'my_subdict': {'defines': ['<(define)']}},
    # will not result in "IS_MAC" being appended to the "defines" list in the
    # current scope but would result in it being appended to the "defines" list
    # within "my_subdict".  By comparison:
    #   {'variables': {'conditions': [['os=="mac"', {'define': 'IS_MAC'}]]},
    #    'defines':    ['<(define)'],
    #    'my_subdict': {'defines': ['<(define)']}},
    # will append "IS_MAC" to both "defines" lists.

    # Evaluate conditions sections, allowing variable expansions within them
    # as well as nested conditionals.  This will process a 'conditions' or
    # 'target_conditions' section, perform appropriate merging and recursive
    # conditional and variable processing, and then remove the conditions section
    # from the_dict if it is present.
    ProcessConditionsInDict(the_dict, phase, variables, build_file)

    # Conditional processing may have resulted in changes to automatics or the
    # variables dict.  Reload.
    variables = variables_in.copy()
    LoadAutomaticVariablesFromDict(variables, the_dict)
    LoadVariablesFromVariablesDict(variables, the_dict, the_dict_key)

    # Recurse into child dicts, or process child lists which may result in
    # further recursion into descendant dicts.
    for key, value in the_dict.items():
        # Skip "variables" and string values, which were already processed if
        # present.
        if key == "variables" or type(value) is str:
            continue
        if type(value) is dict:
            # Pass a copy of the variables dict so that subdicts can't influence
            # parents.
            ProcessVariablesAndConditionsInDict(
                value, phase, variables, build_file, key
            )
        elif type(value) is list:
            # The list itself can't influence the variables dict, and
            # ProcessVariablesAndConditionsInList will make copies of the variables
            # dict if it needs to pass it to something that can influence it.  No
            # copy is necessary here.
            ProcessVariablesAndConditionsInList(value, phase, variables, build_file)
        elif type(value) is not int:
            raise TypeError("Unknown type " + value.__class__.__name__ + " for " + key)


def ProcessVariablesAndConditionsInList(the_list, phase, variables, build_file):
    # Iterate using an index so that new values can be assigned into the_list.
    index = 0
    while index < len(the_list):
        item = the_list[index]
        if type(item) is dict:
            # Make a copy of the variables dict so that it won't influence anything
            # outside of its own scope.
            ProcessVariablesAndConditionsInDict(item, phase, variables, build_file)
        elif type(item) is list:
            ProcessVariablesAndConditionsInList(item, phase, variables, build_file)
        elif type(item) is str:
            expanded = ExpandVariables(item, phase, variables, build_file)
            if type(expanded) in (str, int):
                the_list[index] = expanded
            elif type(expanded) is list:
                the_list[index : index + 1] = expanded
                index += len(expanded)

                # index now identifies the next item to examine.  Continue right now
                # without falling into the index increment below.
                continue
            else:
                raise ValueError(
                    "Variable expansion in this context permits strings and "
                    + "lists only, found "
                    + expanded.__class__.__name__
                    + " at "
                    + index
                )
        elif type(item) is not int:
            raise TypeError(
                "Unknown type " + item.__class__.__name__ + " at index " + index
            )
        index = index + 1


def BuildTargetsDict(data):
    """Builds a dict mapping fully-qualified target names to their target dicts.

  |data| is a dict mapping loaded build files by pathname relative to the
  current directory.  Values in |data| are build file contents.  For each
  |data| value with a "targets" key, the value of the "targets" key is taken
  as a list containing target dicts.  Each target's fully-qualified name is
  constructed from the pathname of the build file (|data| key) and its
  "target_name" property.  These fully-qualified names are used as the keys
  in the returned dict.  These keys provide access to the target dicts,
  the dicts in the "targets" lists.
  """

    targets = {}
    for build_file in data["target_build_files"]:
        for target in data[build_file].get("targets", []):
            target_name = gyp.common.QualifiedTarget(
                build_file, target["target_name"], target["toolset"]
            )
            if target_name in targets:
                raise GypError("Duplicate target definitions for " + target_name)
            targets[target_name] = target

    return targets


def QualifyDependencies(targets):
    """Make dependency links fully-qualified relative to the current directory.

  |targets| is a dict mapping fully-qualified target names to their target
  dicts.  For each target in this dict, keys known to contain dependency
  links are examined, and any dependencies referenced will be rewritten
  so that they are fully-qualified and relative to the current directory.
  All rewritten dependencies are suitable for use as keys to |targets| or a
  similar dict.
  """

    all_dependency_sections = [
        dep + op for dep in dependency_sections for op in ("", "!", "/")
    ]

    for target, target_dict in targets.items():
        target_build_file = gyp.common.BuildFile(target)
        toolset = target_dict["toolset"]
        for dependency_key in all_dependency_sections:
            dependencies = target_dict.get(dependency_key, [])
            for index, dep in enumerate(dependencies):
                dep_file, dep_target, dep_toolset = gyp.common.ResolveTarget(
                    target_build_file, dep, toolset
                )
                if not multiple_toolsets:
                    # Ignore toolset specification in the dependency if it is specified.
                    dep_toolset = toolset
                dependency = gyp.common.QualifiedTarget(
                    dep_file, dep_target, dep_toolset
                )
                dependencies[index] = dependency

                # Make sure anything appearing in a list other than "dependencies" also
                # appears in the "dependencies" list.
                if (
                    dependency_key != "dependencies"
                    and dependency not in target_dict["dependencies"]
                ):
                    raise GypError(
                        "Found "
                        + dependency
                        + " in "
                        + dependency_key
                        + " of "
                        + target
                        + ", but not in dependencies"
                    )


def ExpandWildcardDependencies(targets, data):
    """Expands dependencies specified as build_file:*.

  For each target in |targets|, examines sections containing links to other
  targets.  If any such section contains a link of the form build_file:*, it
  is taken as a wildcard link, and is expanded to list each target in
  build_file.  The |data| dict provides access to build file dicts.

  Any target that does not wish to be included by wildcard can provide an
  optional "suppress_wildcard" key in its target dict.  When present and
  true, a wildcard dependency link will not include such targets.

  All dependency names, including the keys to |targets| and the values in each
  dependency list, must be qualified when this function is called.
  """

    for target, target_dict in targets.items():
        target_build_file = gyp.common.BuildFile(target)
        for dependency_key in dependency_sections:
            dependencies = target_dict.get(dependency_key, [])

            # Loop this way instead of "for dependency in" or "for index in range"
            # because the dependencies list will be modified within the loop body.
            index = 0
            while index < len(dependencies):
                (
                    dependency_build_file,
                    dependency_target,
                    dependency_toolset,
                ) = gyp.common.ParseQualifiedTarget(dependencies[index])
                if dependency_target != "*" and dependency_toolset != "*":
                    # Not a wildcard.  Keep it moving.
                    index = index + 1
                    continue

                if dependency_build_file == target_build_file:
                    # It's an error for a target to depend on all other targets in
                    # the same file, because a target cannot depend on itself.
                    raise GypError(
                        "Found wildcard in "
                        + dependency_key
                        + " of "
                        + target
                        + " referring to same build file"
                    )

                # Take the wildcard out and adjust the index so that the next
                # dependency in the list will be processed the next time through the
                # loop.
                del dependencies[index]
                index = index - 1

                # Loop through the targets in the other build file, adding them to
                # this target's list of dependencies in place of the removed
                # wildcard.
                dependency_target_dicts = data[dependency_build_file]["targets"]
                for dependency_target_dict in dependency_target_dicts:
                    if int(dependency_target_dict.get("suppress_wildcard", False)):
                        continue
                    dependency_target_name = dependency_target_dict["target_name"]
                    if (
                        dependency_target != "*"
                        and dependency_target != dependency_target_name
                    ):
                        continue
                    dependency_target_toolset = dependency_target_dict["toolset"]
                    if (
                        dependency_toolset != "*"
                        and dependency_toolset != dependency_target_toolset
                    ):
                        continue
                    dependency = gyp.common.QualifiedTarget(
                        dependency_build_file,
                        dependency_target_name,
                        dependency_target_toolset,
                    )
                    index = index + 1
                    dependencies.insert(index, dependency)

                index = index + 1


def Unify(items):
    """Removes duplicate elements from items, keeping the first element."""
    seen = {}
    return [seen.setdefault(e, e) for e in items if e not in seen]


def RemoveDuplicateDependencies(targets):
    """Makes sure every dependency appears only once in all targets's dependency
  lists."""
    for target_name, target_dict in targets.items():
        for dependency_key in dependency_sections:
            dependencies = target_dict.get(dependency_key, [])
            if dependencies:
                target_dict[dependency_key] = Unify(dependencies)


def Filter(items, item):
    """Removes item from items."""
    res = {}
    return [res.setdefault(e, e) for e in items if e != item]


def RemoveSelfDependencies(targets):
    """Remove self dependencies from targets that have the prune_self_dependency
  variable set."""
    for target_name, target_dict in targets.items():
        for dependency_key in dependency_sections:
            dependencies = target_dict.get(dependency_key, [])
            if dependencies:
                for t in dependencies:
                    if t == target_name:
                        if (
                            targets[t]
                            .get("variables", {})
                            .get("prune_self_dependency", 0)
                        ):
                            target_dict[dependency_key] = Filter(
                                dependencies, target_name
                            )


def RemoveLinkDependenciesFromNoneTargets(targets):
    """Remove dependencies having the 'link_dependency' attribute from the 'none'
  targets."""
    for target_name, target_dict in targets.items():
        for dependency_key in dependency_sections:
            dependencies = target_dict.get(dependency_key, [])
            if dependencies:
                for t in dependencies:
                    if target_dict.get("type", None) == "none":
                        if targets[t].get("variables", {}).get("link_dependency", 0):
                            target_dict[dependency_key] = Filter(
                                target_dict[dependency_key], t
                            )


class DependencyGraphNode:
    """

  Attributes:
    ref: A reference to an object that this DependencyGraphNode represents.
    dependencies: List of DependencyGraphNodes on which this one depends.
    dependents: List of DependencyGraphNodes that depend on this one.
  """

    class CircularException(GypError):
        pass

    def __init__(self, ref):
        self.ref = ref
        self.dependencies = []
        self.dependents = []

    def __repr__(self):
        return "<DependencyGraphNode: %r>" % self.ref

    def FlattenToList(self):
        # flat_list is the sorted list of dependencies - actually, the list items
        # are the "ref" attributes of DependencyGraphNodes.  Every target will
        # appear in flat_list after all of its dependencies, and before all of its
        # dependents.
        flat_list = OrderedSet()

        def ExtractNodeRef(node):
            """Extracts the object that the node represents from the given node."""
            return node.ref

        # in_degree_zeros is the list of DependencyGraphNodes that have no
        # dependencies not in flat_list.  Initially, it is a copy of the children
        # of this node, because when the graph was built, nodes with no
        # dependencies were made implicit dependents of the root node.
        in_degree_zeros = sorted(self.dependents[:], key=ExtractNodeRef)

        while in_degree_zeros:
            # Nodes in in_degree_zeros have no dependencies not in flat_list, so they
            # can be appended to flat_list.  Take these nodes out of in_degree_zeros
            # as work progresses, so that the next node to process from the list can
            # always be accessed at a consistent position.
            node = in_degree_zeros.pop()
            flat_list.add(node.ref)

            # Look at dependents of the node just added to flat_list.  Some of them
            # may now belong in in_degree_zeros.
            for node_dependent in sorted(node.dependents, key=ExtractNodeRef):
                is_in_degree_zero = True
                # TODO: We want to check through the
                # node_dependent.dependencies list but if it's long and we
                # always start at the beginning, then we get O(n^2) behaviour.
                for node_dependent_dependency in sorted(
                    node_dependent.dependencies, key=ExtractNodeRef
                ):
                    if node_dependent_dependency.ref not in flat_list:
                        # The dependent one or more dependencies not in flat_list.
                        # There will be more chances to add it to flat_list
                        # when examining it again as a dependent of those other
                        # dependencies, provided that there are no cycles.
                        is_in_degree_zero = False
                        break

                if is_in_degree_zero:
                    # All of the dependent's dependencies are already in flat_list.  Add
                    # it to in_degree_zeros where it will be processed in a future
                    # iteration of the outer loop.
                    in_degree_zeros += [node_dependent]

        return list(flat_list)

    def FindCycles(self):
        """
    Returns a list of cycles in the graph, where each cycle is its own list.
    """
        results = []
        visited = set()

        def Visit(node, path):
            for child in node.dependents:
                if child in path:
                    results.append([child] + path[: path.index(child) + 1])
                elif child not in visited:
                    visited.add(child)
                    Visit(child, [child] + path)

        visited.add(self)
        Visit(self, [self])

        return results

    def DirectDependencies(self, dependencies=None):
        """Returns a list of just direct dependencies."""
        if dependencies is None:
            dependencies = []

        for dependency in self.dependencies:
            # Check for None, corresponding to the root node.
            if dependency.ref and dependency.ref not in dependencies:
                dependencies.append(dependency.ref)

        return dependencies

    def _AddImportedDependencies(self, targets, dependencies=None):
        """Given a list of direct dependencies, adds indirect dependencies that
    other dependencies have declared to export their settings.

    This method does not operate on self.  Rather, it operates on the list
    of dependencies in the |dependencies| argument.  For each dependency in
    that list, if any declares that it exports the settings of one of its
    own dependencies, those dependencies whose settings are "passed through"
    are added to the list.  As new items are added to the list, they too will
    be processed, so it is possible to import settings through multiple levels
    of dependencies.

    This method is not terribly useful on its own, it depends on being
    "primed" with a list of direct dependencies such as one provided by
    DirectDependencies.  DirectAndImportedDependencies is intended to be the
    public entry point.
    """

        if dependencies is None:
            dependencies = []

        index = 0
        while index < len(dependencies):
            dependency = dependencies[index]
            dependency_dict = targets[dependency]
            # Add any dependencies whose settings should be imported to the list
            # if not already present.  Newly-added items will be checked for
            # their own imports when the list iteration reaches them.
            # Rather than simply appending new items, insert them after the
            # dependency that exported them.  This is done to more closely match
            # the depth-first method used by DeepDependencies.
            add_index = 1
            for imported_dependency in dependency_dict.get(
                "export_dependent_settings", []
            ):
                if imported_dependency not in dependencies:
                    dependencies.insert(index + add_index, imported_dependency)
                    add_index = add_index + 1
            index = index + 1

        return dependencies

    def DirectAndImportedDependencies(self, targets, dependencies=None):
        """Returns a list of a target's direct dependencies and all indirect
    dependencies that a dependency has advertised settings should be exported
    through the dependency for.
    """

        dependencies = self.DirectDependencies(dependencies)
        return self._AddImportedDependencies(targets, dependencies)

    def DeepDependencies(self, dependencies=None):
        """Returns an OrderedSet of all of a target's dependencies, recursively."""
        if dependencies is None:
            # Using a list to get ordered output and a set to do fast "is it
            # already added" checks.
            dependencies = OrderedSet()

        for dependency in self.dependencies:
            # Check for None, corresponding to the root node.
            if dependency.ref is None:
                continue
            if dependency.ref not in dependencies:
                dependency.DeepDependencies(dependencies)
                dependencies.add(dependency.ref)

        return dependencies

    def _LinkDependenciesInternal(
        self, targets, include_shared_libraries, dependencies=None, initial=True
    ):
        """Returns an OrderedSet of dependency targets that are linked
    into this target.

    This function has a split personality, depending on the setting of
    |initial|.  Outside callers should always leave |initial| at its default
    setting.

    When adding a target to the list of dependencies, this function will
    recurse into itself with |initial| set to False, to collect dependencies
    that are linked into the linkable target for which the list is being built.

    If |include_shared_libraries| is False, the resulting dependencies will not
    include shared_library targets that are linked into this target.
    """
        if dependencies is None:
            # Using a list to get ordered output and a set to do fast "is it
            # already added" checks.
            dependencies = OrderedSet()

        # Check for None, corresponding to the root node.
        if self.ref is None:
            return dependencies

        # It's kind of sucky that |targets| has to be passed into this function,
        # but that's presently the easiest way to access the target dicts so that
        # this function can find target types.

        if "target_name" not in targets[self.ref]:
            raise GypError("Missing 'target_name' field in target.")

        if "type" not in targets[self.ref]:
            raise GypError(
                "Missing 'type' field in target %s" % targets[self.ref]["target_name"]
            )

        target_type = targets[self.ref]["type"]

        is_linkable = target_type in linkable_types

        if initial and not is_linkable:
            # If this is the first target being examined and it's not linkable,
            # return an empty list of link dependencies, because the link
            # dependencies are intended to apply to the target itself (initial is
            # True) and this target won't be linked.
            return dependencies

        # Don't traverse 'none' targets if explicitly excluded.
        if target_type == "none" and not targets[self.ref].get(
            "dependencies_traverse", True
        ):
            dependencies.add(self.ref)
            return dependencies

        # Executables, mac kernel extensions, windows drivers and loadable modules
        # are already fully and finally linked. Nothing else can be a link
        # dependency of them, there can only be dependencies in the sense that a
        # dependent target might run an executable or load the loadable_module.
        if not initial and target_type in (
            "executable",
            "loadable_module",
            "mac_kernel_extension",
            "windows_driver",
        ):
            return dependencies

        # Shared libraries are already fully linked.  They should only be included
        # in |dependencies| when adjusting static library dependencies (in order to
        # link against the shared_library's import lib), but should not be included
        # in |dependencies| when propagating link_settings.
        # The |include_shared_libraries| flag controls which of these two cases we
        # are handling.
        if (
            not initial
            and target_type == "shared_library"
            and not include_shared_libraries
        ):
            return dependencies

        # The target is linkable, add it to the list of link dependencies.
        if self.ref not in dependencies:
            dependencies.add(self.ref)
            if initial or not is_linkable:
                # If this is a subsequent target and it's linkable, don't look any
                # further for linkable dependencies, as they'll already be linked into
                # this target linkable.  Always look at dependencies of the initial
                # target, and always look at dependencies of non-linkables.
                for dependency in self.dependencies:
                    dependency._LinkDependenciesInternal(
                        targets, include_shared_libraries, dependencies, False
                    )

        return dependencies

    def DependenciesForLinkSettings(self, targets):
        """
    Returns a list of dependency targets whose link_settings should be merged
    into this target.
    """

        # TODO(sbaig) Currently, chrome depends on the bug that shared libraries'
        # link_settings are propagated.  So for now, we will allow it, unless the
        # 'allow_sharedlib_linksettings_propagation' flag is explicitly set to
        # False.  Once chrome is fixed, we can remove this flag.
        include_shared_libraries = targets[self.ref].get(
            "allow_sharedlib_linksettings_propagation", True
        )
        return self._LinkDependenciesInternal(targets, include_shared_libraries)

    def DependenciesToLinkAgainst(self, targets):
        """
    Returns a list of dependency targets that are linked into this target.
    """
        return self._LinkDependenciesInternal(targets, True)


def BuildDependencyList(targets):
    # Create a DependencyGraphNode for each target.  Put it into a dict for easy
    # access.
    dependency_nodes = {}
    for target, spec in targets.items():
        if target not in dependency_nodes:
            dependency_nodes[target] = DependencyGraphNode(target)

    # Set up the dependency links.  Targets that have no dependencies are treated
    # as dependent on root_node.
    root_node = DependencyGraphNode(None)
    for target, spec in targets.items():
        target_node = dependency_nodes[target]
        dependencies = spec.get("dependencies")
        if not dependencies:
            target_node.dependencies = [root_node]
            root_node.dependents.append(target_node)
        else:
            for dependency in dependencies:
                dependency_node = dependency_nodes.get(dependency)
                if not dependency_node:
                    raise GypError(
                        "Dependency '%s' not found while "
                        "trying to load target %s" % (dependency, target)
                    )
                target_node.dependencies.append(dependency_node)
                dependency_node.dependents.append(target_node)

    flat_list = root_node.FlattenToList()

    # If there's anything left unvisited, there must be a circular dependency
    # (cycle).
    if len(flat_list) != len(targets):
        if not root_node.dependents:
            # If all targets have dependencies, add the first target as a dependent
            # of root_node so that the cycle can be discovered from root_node.
            target = next(iter(targets))
            target_node = dependency_nodes[target]
            target_node.dependencies.append(root_node)
            root_node.dependents.append(target_node)

        cycles = []
        for cycle in root_node.FindCycles():
            paths = [node.ref for node in cycle]
            cycles.append("Cycle: %s" % " -> ".join(paths))
        raise DependencyGraphNode.CircularException(
            "Cycles in dependency graph detected:\n" + "\n".join(cycles)
        )

    return [dependency_nodes, flat_list]


def VerifyNoGYPFileCircularDependencies(targets):
    # Create a DependencyGraphNode for each gyp file containing a target.  Put
    # it into a dict for easy access.
    dependency_nodes = {}
    for target in targets:
        build_file = gyp.common.BuildFile(target)
        if build_file not in dependency_nodes:
            dependency_nodes[build_file] = DependencyGraphNode(build_file)

    # Set up the dependency links.
    for target, spec in targets.items():
        build_file = gyp.common.BuildFile(target)
        build_file_node = dependency_nodes[build_file]
        target_dependencies = spec.get("dependencies", [])
        for dependency in target_dependencies:
            try:
                dependency_build_file = gyp.common.BuildFile(dependency)
            except GypError as e:
                gyp.common.ExceptionAppend(
                    e, "while computing dependencies of .gyp file %s" % build_file
                )
                raise

            if dependency_build_file == build_file:
                # A .gyp file is allowed to refer back to itself.
                continue
            dependency_node = dependency_nodes.get(dependency_build_file)
            if not dependency_node:
                raise GypError("Dependency '%s' not found" % dependency_build_file)
            if dependency_node not in build_file_node.dependencies:
                build_file_node.dependencies.append(dependency_node)
                dependency_node.dependents.append(build_file_node)

    # Files that have no dependencies are treated as dependent on root_node.
    root_node = DependencyGraphNode(None)
    for build_file_node in dependency_nodes.values():
        if len(build_file_node.dependencies) == 0:
            build_file_node.dependencies.append(root_node)
            root_node.dependents.append(build_file_node)

    flat_list = root_node.FlattenToList()

    # If there's anything left unvisited, there must be a circular dependency
    # (cycle).
    if len(flat_list) != len(dependency_nodes):
        if not root_node.dependents:
            # If all files have dependencies, add the first file as a dependent
            # of root_node so that the cycle can be discovered from root_node.
            file_node = next(iter(dependency_nodes.values()))
            file_node.dependencies.append(root_node)
            root_node.dependents.append(file_node)
        cycles = []
        for cycle in root_node.FindCycles():
            paths = [node.ref for node in cycle]
            cycles.append("Cycle: %s" % " -> ".join(paths))
        raise DependencyGraphNode.CircularException(
            "Cycles in .gyp file dependency graph detected:\n" + "\n".join(cycles)
        )


def DoDependentSettings(key, flat_list, targets, dependency_nodes):
    # key should be one of all_dependent_settings, direct_dependent_settings,
    # or link_settings.

    for target in flat_list:
        target_dict = targets[target]
        build_file = gyp.common.BuildFile(target)

        if key == "all_dependent_settings":
            dependencies = dependency_nodes[target].DeepDependencies()
        elif key == "direct_dependent_settings":
            dependencies = dependency_nodes[target].DirectAndImportedDependencies(
                targets
            )
        elif key == "link_settings":
            dependencies = dependency_nodes[target].DependenciesForLinkSettings(targets)
        else:
            raise GypError(
                "DoDependentSettings doesn't know how to determine "
                "dependencies for " + key
            )

        for dependency in dependencies:
            dependency_dict = targets[dependency]
            if key not in dependency_dict:
                continue
            dependency_build_file = gyp.common.BuildFile(dependency)
            MergeDicts(
                target_dict, dependency_dict[key], build_file, dependency_build_file
            )


def AdjustStaticLibraryDependencies(
    flat_list, targets, dependency_nodes, sort_dependencies
):
    # Recompute target "dependencies" properties.  For each static library
    # target, remove "dependencies" entries referring to other static libraries,
    # unless the dependency has the "hard_dependency" attribute set.  For each
    # linkable target, add a "dependencies" entry referring to all of the
    # target's computed list of link dependencies (including static libraries
    # if no such entry is already present.
    for target in flat_list:
        target_dict = targets[target]
        target_type = target_dict["type"]

        if target_type == "static_library":
            if "dependencies" not in target_dict:
                continue

            target_dict["dependencies_original"] = target_dict.get("dependencies", [])[
                :
            ]

            # A static library should not depend on another static library unless
            # the dependency relationship is "hard," which should only be done when
            # a dependent relies on some side effect other than just the build
            # product, like a rule or action output. Further, if a target has a
            # non-hard dependency, but that dependency exports a hard dependency,
            # the non-hard dependency can safely be removed, but the exported hard
            # dependency must be added to the target to keep the same dependency
            # ordering.
            dependencies = dependency_nodes[target].DirectAndImportedDependencies(
                targets
            )
            index = 0
            while index < len(dependencies):
                dependency = dependencies[index]
                dependency_dict = targets[dependency]

                # Remove every non-hard static library dependency and remove every
                # non-static library dependency that isn't a direct dependency.
                if (
                    dependency_dict["type"] == "static_library"
                    and not dependency_dict.get("hard_dependency", False)
                ) or (
                    dependency_dict["type"] != "static_library"
                    and dependency not in target_dict["dependencies"]
                ):
                    # Take the dependency out of the list, and don't increment index
                    # because the next dependency to analyze will shift into the index
                    # formerly occupied by the one being removed.
                    del dependencies[index]
                else:
                    index = index + 1

            # Update the dependencies. If the dependencies list is empty, it's not
            # needed, so unhook it.
            if len(dependencies) > 0:
                target_dict["dependencies"] = dependencies
            else:
                del target_dict["dependencies"]

        elif target_type in linkable_types:
            # Get a list of dependency targets that should be linked into this
            # target.  Add them to the dependencies list if they're not already
            # present.

            link_dependencies = dependency_nodes[target].DependenciesToLinkAgainst(
                targets
            )
            for dependency in link_dependencies:
                if dependency == target:
                    continue
                if "dependencies" not in target_dict:
                    target_dict["dependencies"] = []
                if dependency not in target_dict["dependencies"]:
                    target_dict["dependencies"].append(dependency)
            # Sort the dependencies list in the order from dependents to dependencies.
            # e.g. If A and B depend on C and C depends on D, sort them in A, B, C, D.
            # Note: flat_list is already sorted in the order from dependencies to
            # dependents.
            if sort_dependencies and "dependencies" in target_dict:
                target_dict["dependencies"] = [
                    dep
                    for dep in reversed(flat_list)
                    if dep in target_dict["dependencies"]
                ]


# Initialize this here to speed up MakePathRelative.
exception_re = re.compile(r"""["']?[-/$<>^]""")


def MakePathRelative(to_file, fro_file, item):
    # If item is a relative path, it's relative to the build file dict that it's
    # coming from.  Fix it up to make it relative to the build file dict that
    # it's going into.
    # Exception: any |item| that begins with these special characters is
    # returned without modification.
    #   /   Used when a path is already absolute (shortcut optimization;
    #       such paths would be returned as absolute anyway)
    #   $   Used for build environment variables
    #   -   Used for some build environment flags (such as -lapr-1 in a
    #       "libraries" section)
    #   <   Used for our own variable and command expansions (see ExpandVariables)
    #   >   Used for our own variable and command expansions (see ExpandVariables)
    #   ^   Used for our own variable and command expansions (see ExpandVariables)
    #
    #   "/' Used when a value is quoted.  If these are present, then we
    #       check the second character instead.
    #
    if to_file == fro_file or exception_re.match(item):
        return item
    else:
        # TODO(dglazkov) The backslash/forward-slash replacement at the end is a
        # temporary measure. This should really be addressed by keeping all paths
        # in POSIX until actual project generation.
        ret = os.path.normpath(
            os.path.join(
                gyp.common.RelativePath(
                    os.path.dirname(fro_file), os.path.dirname(to_file)
                ),
                item,
            )
        ).replace("\\", "/")
        if item.endswith("/"):
            ret += "/"
        return ret


def MergeLists(to, fro, to_file, fro_file, is_paths=False, append=True):
    # Python documentation recommends objects which do not support hash
    # set this value to None. Python library objects follow this rule.
    def is_hashable(val):
        return val.__hash__

    # If x is hashable, returns whether x is in s. Else returns whether x is in items.
    def is_in_set_or_list(x, s, items):
        if is_hashable(x):
            return x in s
        return x in items

    prepend_index = 0

    # Make membership testing of hashables in |to| (in particular, strings)
    # faster.
    hashable_to_set = {x for x in to if is_hashable(x)}
    for item in fro:
        singleton = False
        if type(item) in (str, int):
            # The cheap and easy case.
            if is_paths:
                to_item = MakePathRelative(to_file, fro_file, item)
            else:
                to_item = item

            if not (type(item) is str and item.startswith("-")):
                # Any string that doesn't begin with a "-" is a singleton - it can
                # only appear once in a list, to be enforced by the list merge append
                # or prepend.
                singleton = True
        elif type(item) is dict:
            # Make a copy of the dictionary, continuing to look for paths to fix.
            # The other intelligent aspects of merge processing won't apply because
            # item is being merged into an empty dict.
            to_item = {}
            MergeDicts(to_item, item, to_file, fro_file)
        elif type(item) is list:
            # Recurse, making a copy of the list.  If the list contains any
            # descendant dicts, path fixing will occur.  Note that here, custom
            # values for is_paths and append are dropped; those are only to be
            # applied to |to| and |fro|, not sublists of |fro|.  append shouldn't
            # matter anyway because the new |to_item| list is empty.
            to_item = []
            MergeLists(to_item, item, to_file, fro_file)
        else:
            raise TypeError(
                "Attempt to merge list item of unsupported type "
                + item.__class__.__name__
            )

        if append:
            # If appending a singleton that's already in the list, don't append.
            # This ensures that the earliest occurrence of the item will stay put.
            if not singleton or not is_in_set_or_list(to_item, hashable_to_set, to):
                to.append(to_item)
                if is_hashable(to_item):
                    hashable_to_set.add(to_item)
        else:
            # If prepending a singleton that's already in the list, remove the
            # existing instance and proceed with the prepend.  This ensures that the
            # item appears at the earliest possible position in the list.
            while singleton and to_item in to:
                to.remove(to_item)

            # Don't just insert everything at index 0.  That would prepend the new
            # items to the list in reverse order, which would be an unwelcome
            # surprise.
            to.insert(prepend_index, to_item)
            if is_hashable(to_item):
                hashable_to_set.add(to_item)
            prepend_index = prepend_index + 1


def MergeDicts(to, fro, to_file, fro_file):
    # I wanted to name the parameter "from" but it's a Python keyword...
    for k, v in fro.items():
        # It would be nice to do "if not k in to: to[k] = v" but that wouldn't give
        # copy semantics.  Something else may want to merge from the |fro| dict
        # later, and having the same dict ref pointed to twice in the tree isn't
        # what anyone wants considering that the dicts may subsequently be
        # modified.
        if k in to:
            bad_merge = False
            if type(v) in (str, int):
                if type(to[k]) not in (str, int):
                    bad_merge = True
            elif not isinstance(v, type(to[k])):
                bad_merge = True

            if bad_merge:
                raise TypeError(
                    "Attempt to merge dict value of type "
                    + v.__class__.__name__
                    + " into incompatible type "
                    + to[k].__class__.__name__
                    + " for key "
                    + k
                )
        if type(v) in (str, int):
            # Overwrite the existing value, if any.  Cheap and easy.
            is_path = IsPathSection(k)
            if is_path:
                to[k] = MakePathRelative(to_file, fro_file, v)
            else:
                to[k] = v
        elif type(v) is dict:
            # Recurse, guaranteeing copies will be made of objects that require it.
            if k not in to:
                to[k] = {}
            MergeDicts(to[k], v, to_file, fro_file)
        elif type(v) is list:
            # Lists in dicts can be merged with different policies, depending on
            # how the key in the "from" dict (k, the from-key) is written.
            #
            # If the from-key has          ...the to-list will have this action
            # this character appended:...     applied when receiving the from-list:
            #                           =  replace
            #                           +  prepend
            #                           ?  set, only if to-list does not yet exist
            #                      (none)  append
            #
            # This logic is list-specific, but since it relies on the associated
            # dict key, it's checked in this dict-oriented function.
            ext = k[-1]
            append = True
            if ext == "=":
                list_base = k[:-1]
                lists_incompatible = [list_base, list_base + "?"]
                to[list_base] = []
            elif ext == "+":
                list_base = k[:-1]
                lists_incompatible = [list_base + "=", list_base + "?"]
                append = False
            elif ext == "?":
                list_base = k[:-1]
                lists_incompatible = [list_base, list_base + "=", list_base + "+"]
            else:
                list_base = k
                lists_incompatible = [list_base + "=", list_base + "?"]

            # Some combinations of merge policies appearing together are meaningless.
            # It's stupid to replace and append simultaneously, for example.  Append
            # and prepend are the only policies that can coexist.
            for list_incompatible in lists_incompatible:
                if list_incompatible in fro:
                    raise GypError(
                        "Incompatible list policies " + k + " and " + list_incompatible
                    )

            if list_base in to:
                if ext == "?":
                    # If the key ends in "?", the list will only be merged if it doesn't
                    # already exist.
                    continue
                elif type(to[list_base]) is not list:
                    # This may not have been checked above if merging in a list with an
                    # extension character.
                    raise TypeError(
                        "Attempt to merge dict value of type "
                        + v.__class__.__name__
                        + " into incompatible type "
                        + to[list_base].__class__.__name__
                        + " for key "
                        + list_base
                        + "("
                        + k
                        + ")"
                    )
            else:
                to[list_base] = []

            # Call MergeLists, which will make copies of objects that require it.
            # MergeLists can recurse back into MergeDicts, although this will be
            # to make copies of dicts (with paths fixed), there will be no
            # subsequent dict "merging" once entering a list because lists are
            # always replaced, appended to, or prepended to.
            is_paths = IsPathSection(list_base)
            MergeLists(to[list_base], v, to_file, fro_file, is_paths, append)
        else:
            raise TypeError(
                "Attempt to merge dict value of unsupported type "
                + v.__class__.__name__
                + " for key "
                + k
            )


def MergeConfigWithInheritance(
    new_configuration_dict, build_file, target_dict, configuration, visited
):
    # Skip if previously visited.
    if configuration in visited:
        return

    # Look at this configuration.
    configuration_dict = target_dict["configurations"][configuration]

    # Merge in parents.
    for parent in configuration_dict.get("inherit_from", []):
        MergeConfigWithInheritance(
            new_configuration_dict,
            build_file,
            target_dict,
            parent,
            visited + [configuration],
        )

    # Merge it into the new config.
    MergeDicts(new_configuration_dict, configuration_dict, build_file, build_file)

    # Drop abstract.
    if "abstract" in new_configuration_dict:
        del new_configuration_dict["abstract"]


def SetUpConfigurations(target, target_dict):
    # key_suffixes is a list of key suffixes that might appear on key names.
    # These suffixes are handled in conditional evaluations (for =, +, and ?)
    # and rules/exclude processing (for ! and /).  Keys with these suffixes
    # should be treated the same as keys without.
    key_suffixes = ["=", "+", "?", "!", "/"]

    build_file = gyp.common.BuildFile(target)

    # Provide a single configuration by default if none exists.
    # TODO(mark): Signal an error if default_configurations exists but
    # configurations does not.
    if "configurations" not in target_dict:
        target_dict["configurations"] = {"Default": {}}
    if "default_configuration" not in target_dict:
        concrete = [
            i
            for (i, config) in target_dict["configurations"].items()
            if not config.get("abstract")
        ]
        target_dict["default_configuration"] = sorted(concrete)[0]

    merged_configurations = {}
    configs = target_dict["configurations"]
    for (configuration, old_configuration_dict) in configs.items():
        # Skip abstract configurations (saves work only).
        if old_configuration_dict.get("abstract"):
            continue
        # Configurations inherit (most) settings from the enclosing target scope.
        # Get the inheritance relationship right by making a copy of the target
        # dict.
        new_configuration_dict = {}
        for (key, target_val) in target_dict.items():
            key_ext = key[-1:]
            if key_ext in key_suffixes:
                key_base = key[:-1]
            else:
                key_base = key
            if key_base not in non_configuration_keys:
                new_configuration_dict[key] = gyp.simple_copy.deepcopy(target_val)

        # Merge in configuration (with all its parents first).
        MergeConfigWithInheritance(
            new_configuration_dict, build_file, target_dict, configuration, []
        )

        merged_configurations[configuration] = new_configuration_dict

    # Put the new configurations back into the target dict as a configuration.
    for configuration in merged_configurations.keys():
        target_dict["configurations"][configuration] = merged_configurations[
            configuration
        ]

    # Now drop all the abstract ones.
    configs = target_dict["configurations"]
    target_dict["configurations"] = {
        k: v for k, v in configs.items() if not v.get("abstract")
    }

    # Now that all of the target's configurations have been built, go through
    # the target dict's keys and remove everything that's been moved into a
    # "configurations" section.
    delete_keys = []
    for key in target_dict:
        key_ext = key[-1:]
        if key_ext in key_suffixes:
            key_base = key[:-1]
        else:
            key_base = key
        if key_base not in non_configuration_keys:
            delete_keys.append(key)
    for key in delete_keys:
        del target_dict[key]

    # Check the configurations to see if they contain invalid keys.
    for configuration in target_dict["configurations"].keys():
        configuration_dict = target_dict["configurations"][configuration]
        for key in configuration_dict.keys():
            if key in invalid_configuration_keys:
                raise GypError(
                    "%s not allowed in the %s configuration, found in "
                    "target %s" % (key, configuration, target)
                )


def ProcessListFiltersInDict(name, the_dict):
    """Process regular expression and exclusion-based filters on lists.

  An exclusion list is in a dict key named with a trailing "!", like
  "sources!".  Every item in such a list is removed from the associated
  main list, which in this example, would be "sources".  Removed items are
  placed into a "sources_excluded" list in the dict.

  Regular expression (regex) filters are contained in dict keys named with a
  trailing "/", such as "sources/" to operate on the "sources" list.  Regex
  filters in a dict take the form:
    'sources/': [ ['exclude', '_(linux|mac|win)\\.cc$'],
                  ['include', '_mac\\.cc$'] ],
  The first filter says to exclude all files ending in _linux.cc, _mac.cc, and
  _win.cc.  The second filter then includes all files ending in _mac.cc that
  are now or were once in the "sources" list.  Items matching an "exclude"
  filter are subject to the same processing as would occur if they were listed
  by name in an exclusion list (ending in "!").  Items matching an "include"
  filter are brought back into the main list if previously excluded by an
  exclusion list or exclusion regex filter.  Subsequent matching "exclude"
  patterns can still cause items to be excluded after matching an "include".
  """

    # Look through the dictionary for any lists whose keys end in "!" or "/".
    # These are lists that will be treated as exclude lists and regular
    # expression-based exclude/include lists.  Collect the lists that are
    # needed first, looking for the lists that they operate on, and assemble
    # then into |lists|.  This is done in a separate loop up front, because
    # the _included and _excluded keys need to be added to the_dict, and that
    # can't be done while iterating through it.

    lists = []
    del_lists = []
    for key, value in the_dict.items():
        operation = key[-1]
        if operation != "!" and operation != "/":
            continue

        if type(value) is not list:
            raise ValueError(
                name + " key " + key + " must be list, not " + value.__class__.__name__
            )

        list_key = key[:-1]
        if list_key not in the_dict:
            # This happens when there's a list like "sources!" but no corresponding
            # "sources" list.  Since there's nothing for it to operate on, queue up
            # the "sources!" list for deletion now.
            del_lists.append(key)
            continue

        if type(the_dict[list_key]) is not list:
            value = the_dict[list_key]
            raise ValueError(
                name
                + " key "
                + list_key
                + " must be list, not "
                + value.__class__.__name__
                + " when applying "
                + {"!": "exclusion", "/": "regex"}[operation]
            )

        if list_key not in lists:
            lists.append(list_key)

    # Delete the lists that are known to be unneeded at this point.
    for del_list in del_lists:
        del the_dict[del_list]

    for list_key in lists:
        the_list = the_dict[list_key]

        # Initialize the list_actions list, which is parallel to the_list.  Each
        # item in list_actions identifies whether the corresponding item in
        # the_list should be excluded, unconditionally preserved (included), or
        # whether no exclusion or inclusion has been applied.  Items for which
        # no exclusion or inclusion has been applied (yet) have value -1, items
        # excluded have value 0, and items included have value 1.  Includes and
        # excludes override previous actions.  All items in list_actions are
        # initialized to -1 because no excludes or includes have been processed
        # yet.
        list_actions = list((-1,) * len(the_list))

        exclude_key = list_key + "!"
        if exclude_key in the_dict:
            for exclude_item in the_dict[exclude_key]:
                for index, list_item in enumerate(the_list):
                    if exclude_item == list_item:
                        # This item matches the exclude_item, so set its action to 0
                        # (exclude).
                        list_actions[index] = 0

            # The "whatever!" list is no longer needed, dump it.
            del the_dict[exclude_key]

        regex_key = list_key + "/"
        if regex_key in the_dict:
            for regex_item in the_dict[regex_key]:
                [action, pattern] = regex_item
                pattern_re = re.compile(pattern)

                if action == "exclude":
                    # This item matches an exclude regex, set its value to 0 (exclude).
                    action_value = 0
                elif action == "include":
                    # This item matches an include regex, set its value to 1 (include).
                    action_value = 1
                else:
                    # This is an action that doesn't make any sense.
                    raise ValueError(
                        "Unrecognized action "
                        + action
                        + " in "
                        + name
                        + " key "
                        + regex_key
                    )

                for index, list_item in enumerate(the_list):
                    if list_actions[index] == action_value:
                        # Even if the regex matches, nothing will change so continue
                        # (regex searches are expensive).
                        continue
                    if pattern_re.search(list_item):
                        # Regular expression match.
                        list_actions[index] = action_value

            # The "whatever/" list is no longer needed, dump it.
            del the_dict[regex_key]

        # Add excluded items to the excluded list.
        #
        # Note that exclude_key ("sources!") is different from excluded_key
        # ("sources_excluded").  The exclude_key list is input and it was already
        # processed and deleted; the excluded_key list is output and it's about
        # to be created.
        excluded_key = list_key + "_excluded"
        if excluded_key in the_dict:
            raise GypError(
                name + " key " + excluded_key + " must not be present prior "
                " to applying exclusion/regex filters for " + list_key
            )

        excluded_list = []

        # Go backwards through the list_actions list so that as items are deleted,
        # the indices of items that haven't been seen yet don't shift.  That means
        # that things need to be prepended to excluded_list to maintain them in the
        # same order that they existed in the_list.
        for index in range(len(list_actions) - 1, -1, -1):
            if list_actions[index] == 0:
                # Dump anything with action 0 (exclude).  Keep anything with action 1
                # (include) or -1 (no include or exclude seen for the item).
                excluded_list.insert(0, the_list[index])
                del the_list[index]

        # If anything was excluded, put the excluded list into the_dict at
        # excluded_key.
        if len(excluded_list) > 0:
            the_dict[excluded_key] = excluded_list

    # Now recurse into subdicts and lists that may contain dicts.
    for key, value in the_dict.items():
        if type(value) is dict:
            ProcessListFiltersInDict(key, value)
        elif type(value) is list:
            ProcessListFiltersInList(key, value)


def ProcessListFiltersInList(name, the_list):
    for item in the_list:
        if type(item) is dict:
            ProcessListFiltersInDict(name, item)
        elif type(item) is list:
            ProcessListFiltersInList(name, item)


def ValidateTargetType(target, target_dict):
    """Ensures the 'type' field on the target is one of the known types.

  Arguments:
    target: string, name of target.
    target_dict: dict, target spec.

  Raises an exception on error.
  """
    VALID_TARGET_TYPES = (
        "executable",
        "loadable_module",
        "static_library",
        "shared_library",
        "mac_kernel_extension",
        "none",
        "windows_driver",
    )
    target_type = target_dict.get("type", None)
    if target_type not in VALID_TARGET_TYPES:
        raise GypError(
            "Target %s has an invalid target type '%s'.  "
            "Must be one of %s." % (target, target_type, "/".join(VALID_TARGET_TYPES))
        )
    if (
        target_dict.get("standalone_static_library", 0)
        and not target_type == "static_library"
    ):
        raise GypError(
            "Target %s has type %s but standalone_static_library flag is"
            " only valid for static_library type." % (target, target_type)
        )


def ValidateRulesInTarget(target, target_dict, extra_sources_for_rules):
    """Ensures that the rules sections in target_dict are valid and consistent,
  and determines which sources they apply to.

  Arguments:
    target: string, name of target.
    target_dict: dict, target spec containing "rules" and "sources" lists.
    extra_sources_for_rules: a list of keys to scan for rule matches in
        addition to 'sources'.
  """

    # Dicts to map between values found in rules' 'rule_name' and 'extension'
    # keys and the rule dicts themselves.
    rule_names = {}
    rule_extensions = {}

    rules = target_dict.get("rules", [])
    for rule in rules:
        # Make sure that there's no conflict among rule names and extensions.
        rule_name = rule["rule_name"]
        if rule_name in rule_names:
            raise GypError(
                f"rule {rule_name} exists in duplicate, target {target}"
            )
        rule_names[rule_name] = rule

        rule_extension = rule["extension"]
        if rule_extension.startswith("."):
            rule_extension = rule_extension[1:]
        if rule_extension in rule_extensions:
            raise GypError(
                (
                    "extension %s associated with multiple rules, "
                    + "target %s rules %s and %s"
                )
                % (
                    rule_extension,
                    target,
                    rule_extensions[rule_extension]["rule_name"],
                    rule_name,
                )
            )
        rule_extensions[rule_extension] = rule

        # Make sure rule_sources isn't already there.  It's going to be
        # created below if needed.
        if "rule_sources" in rule:
            raise GypError(
                "rule_sources must not exist in input, target %s rule %s"
                % (target, rule_name)
            )

        rule_sources = []
        source_keys = ["sources"]
        source_keys.extend(extra_sources_for_rules)
        for source_key in source_keys:
            for source in target_dict.get(source_key, []):
                (source_root, source_extension) = os.path.splitext(source)
                if source_extension.startswith("."):
                    source_extension = source_extension[1:]
                if source_extension == rule_extension:
                    rule_sources.append(source)

        if len(rule_sources) > 0:
            rule["rule_sources"] = rule_sources


def ValidateRunAsInTarget(target, target_dict, build_file):
    target_name = target_dict.get("target_name")
    run_as = target_dict.get("run_as")
    if not run_as:
        return
    if type(run_as) is not dict:
        raise GypError(
            "The 'run_as' in target %s from file %s should be a "
            "dictionary." % (target_name, build_file)
        )
    action = run_as.get("action")
    if not action:
        raise GypError(
            "The 'run_as' in target %s from file %s must have an "
            "'action' section." % (target_name, build_file)
        )
    if type(action) is not list:
        raise GypError(
            "The 'action' for 'run_as' in target %s from file %s "
            "must be a list." % (target_name, build_file)
        )
    working_directory = run_as.get("working_directory")
    if working_directory and type(working_directory) is not str:
        raise GypError(
            "The 'working_directory' for 'run_as' in target %s "
            "in file %s should be a string." % (target_name, build_file)
        )
    environment = run_as.get("environment")
    if environment and type(environment) is not dict:
        raise GypError(
            "The 'environment' for 'run_as' in target %s "
            "in file %s should be a dictionary." % (target_name, build_file)
        )


def ValidateActionsInTarget(target, target_dict, build_file):
    """Validates the inputs to the actions in a target."""
    target_name = target_dict.get("target_name")
    actions = target_dict.get("actions", [])
    for action in actions:
        action_name = action.get("action_name")
        if not action_name:
            raise GypError(
                "Anonymous action in target %s.  "
                "An action must have an 'action_name' field." % target_name
            )
        inputs = action.get("inputs", None)
        if inputs is None:
            raise GypError("Action in target %s has no inputs." % target_name)
        action_command = action.get("action")
        if action_command and not action_command[0]:
            raise GypError("Empty action as command in target %s." % target_name)


def TurnIntIntoStrInDict(the_dict):
    """Given dict the_dict, recursively converts all integers into strings.
  """
    # Use items instead of iteritems because there's no need to try to look at
    # reinserted keys and their associated values.
    for k, v in the_dict.items():
        if type(v) is int:
            v = str(v)
            the_dict[k] = v
        elif type(v) is dict:
            TurnIntIntoStrInDict(v)
        elif type(v) is list:
            TurnIntIntoStrInList(v)

        if type(k) is int:
            del the_dict[k]
            the_dict[str(k)] = v


def TurnIntIntoStrInList(the_list):
    """Given list the_list, recursively converts all integers into strings.
  """
    for index, item in enumerate(the_list):
        if type(item) is int:
            the_list[index] = str(item)
        elif type(item) is dict:
            TurnIntIntoStrInDict(item)
        elif type(item) is list:
            TurnIntIntoStrInList(item)


def PruneUnwantedTargets(targets, flat_list, dependency_nodes, root_targets, data):
    """Return only the targets that are deep dependencies of |root_targets|."""
    qualified_root_targets = []
    for target in root_targets:
        target = target.strip()
        qualified_targets = gyp.common.FindQualifiedTargets(target, flat_list)
        if not qualified_targets:
            raise GypError("Could not find target %s" % target)
        qualified_root_targets.extend(qualified_targets)

    wanted_targets = {}
    for target in qualified_root_targets:
        wanted_targets[target] = targets[target]
        for dependency in dependency_nodes[target].DeepDependencies():
            wanted_targets[dependency] = targets[dependency]

    wanted_flat_list = [t for t in flat_list if t in wanted_targets]

    # Prune unwanted targets from each build_file's data dict.
    for build_file in data["target_build_files"]:
        if "targets" not in data[build_file]:
            continue
        new_targets = []
        for target in data[build_file]["targets"]:
            qualified_name = gyp.common.QualifiedTarget(
                build_file, target["target_name"], target["toolset"]
            )
            if qualified_name in wanted_targets:
                new_targets.append(target)
        data[build_file]["targets"] = new_targets

    return wanted_targets, wanted_flat_list


def VerifyNoCollidingTargets(targets):
    """Verify that no two targets in the same directory share the same name.

  Arguments:
    targets: A list of targets in the form 'path/to/file.gyp:target_name'.
  """
    # Keep a dict going from 'subdirectory:target_name' to 'foo.gyp'.
    used = {}
    for target in targets:
        # Separate out 'path/to/file.gyp, 'target_name' from
        # 'path/to/file.gyp:target_name'.
        path, name = target.rsplit(":", 1)
        # Separate out 'path/to', 'file.gyp' from 'path/to/file.gyp'.
        subdir, gyp = os.path.split(path)
        # Use '.' for the current directory '', so that the error messages make
        # more sense.
        if not subdir:
            subdir = "."
        # Prepare a key like 'path/to:target_name'.
        key = subdir + ":" + name
        if key in used:
            # Complain if this target is already used.
            raise GypError(
                'Duplicate target name "%s" in directory "%s" used both '
                'in "%s" and "%s".' % (name, subdir, gyp, used[key])
            )
        used[key] = gyp


def SetGeneratorGlobals(generator_input_info):
    # Set up path_sections and non_configuration_keys with the default data plus
    # the generator-specific data.
    global path_sections
    path_sections = set(base_path_sections)
    path_sections.update(generator_input_info["path_sections"])

    global non_configuration_keys
    non_configuration_keys = base_non_configuration_keys[:]
    non_configuration_keys.extend(generator_input_info["non_configuration_keys"])

    global multiple_toolsets
    multiple_toolsets = generator_input_info["generator_supports_multiple_toolsets"]

    global generator_filelist_paths
    generator_filelist_paths = generator_input_info["generator_filelist_paths"]


def Load(
    build_files,
    variables,
    includes,
    depth,
    generator_input_info,
    check,
    circular_check,
    parallel,
    root_targets,
):
    SetGeneratorGlobals(generator_input_info)
    # A generator can have other lists (in addition to sources) be processed
    # for rules.
    extra_sources_for_rules = generator_input_info["extra_sources_for_rules"]

    # Load build files.  This loads every target-containing build file into
    # the |data| dictionary such that the keys to |data| are build file names,
    # and the values are the entire build file contents after "early" or "pre"
    # processing has been done and includes have been resolved.
    # NOTE: data contains both "target" files (.gyp) and "includes" (.gypi), as
    # well as meta-data (e.g. 'included_files' key). 'target_build_files' keeps
    # track of the keys corresponding to "target" files.
    data = {"target_build_files": set()}
    # Normalize paths everywhere.  This is important because paths will be
    # used as keys to the data dict and for references between input files.
    build_files = set(map(os.path.normpath, build_files))
    if parallel:
        LoadTargetBuildFilesParallel(
            build_files, data, variables, includes, depth, check, generator_input_info
        )
    else:
        aux_data = {}
        for build_file in build_files:
            try:
                LoadTargetBuildFile(
                    build_file, data, aux_data, variables, includes, depth, check, True
                )
            except Exception as e:
                gyp.common.ExceptionAppend(e, "while trying to load %s" % build_file)
                raise

    # Build a dict to access each target's subdict by qualified name.
    targets = BuildTargetsDict(data)

    # Fully qualify all dependency links.
    QualifyDependencies(targets)

    # Remove self-dependencies from targets that have 'prune_self_dependencies'
    # set to 1.
    RemoveSelfDependencies(targets)

    # Expand dependencies specified as build_file:*.
    ExpandWildcardDependencies(targets, data)

    # Remove all dependencies marked as 'link_dependency' from the targets of
    # type 'none'.
    RemoveLinkDependenciesFromNoneTargets(targets)

    # Apply exclude (!) and regex (/) list filters only for dependency_sections.
    for target_name, target_dict in targets.items():
        tmp_dict = {}
        for key_base in dependency_sections:
            for op in ("", "!", "/"):
                key = key_base + op
                if key in target_dict:
                    tmp_dict[key] = target_dict[key]
                    del target_dict[key]
        ProcessListFiltersInDict(target_name, tmp_dict)
        # Write the results back to |target_dict|.
        for key in tmp_dict:
            target_dict[key] = tmp_dict[key]

    # Make sure every dependency appears at most once.
    RemoveDuplicateDependencies(targets)

    if circular_check:
        # Make sure that any targets in a.gyp don't contain dependencies in other
        # .gyp files that further depend on a.gyp.
        VerifyNoGYPFileCircularDependencies(targets)

    [dependency_nodes, flat_list] = BuildDependencyList(targets)

    if root_targets:
        # Remove, from |targets| and |flat_list|, the targets that are not deep
        # dependencies of the targets specified in |root_targets|.
        targets, flat_list = PruneUnwantedTargets(
            targets, flat_list, dependency_nodes, root_targets, data
        )

    # Check that no two targets in the same directory have the same name.
    VerifyNoCollidingTargets(flat_list)

    # Handle dependent settings of various types.
    for settings_type in [
        "all_dependent_settings",
        "direct_dependent_settings",
        "link_settings",
    ]:
        DoDependentSettings(settings_type, flat_list, targets, dependency_nodes)

        # Take out the dependent settings now that they've been published to all
        # of the targets that require them.
        for target in flat_list:
            if settings_type in targets[target]:
                del targets[target][settings_type]

    # Make sure static libraries don't declare dependencies on other static
    # libraries, but that linkables depend on all unlinked static libraries
    # that they need so that their link steps will be correct.
    gii = generator_input_info
    if gii["generator_wants_static_library_dependencies_adjusted"]:
        AdjustStaticLibraryDependencies(
            flat_list,
            targets,
            dependency_nodes,
            gii["generator_wants_sorted_dependencies"],
        )

    # Apply "post"/"late"/"target" variable expansions and condition evaluations.
    for target in flat_list:
        target_dict = targets[target]
        build_file = gyp.common.BuildFile(target)
        ProcessVariablesAndConditionsInDict(
            target_dict, PHASE_LATE, variables, build_file
        )

    # Move everything that can go into a "configurations" section into one.
    for target in flat_list:
        target_dict = targets[target]
        SetUpConfigurations(target, target_dict)

    # Apply exclude (!) and regex (/) list filters.
    for target in flat_list:
        target_dict = targets[target]
        ProcessListFiltersInDict(target, target_dict)

    # Apply "latelate" variable expansions and condition evaluations.
    for target in flat_list:
        target_dict = targets[target]
        build_file = gyp.common.BuildFile(target)
        ProcessVariablesAndConditionsInDict(
            target_dict, PHASE_LATELATE, variables, build_file
        )

    # Make sure that the rules make sense, and build up rule_sources lists as
    # needed.  Not all generators will need to use the rule_sources lists, but
    # some may, and it seems best to build the list in a common spot.
    # Also validate actions and run_as elements in targets.
    for target in flat_list:
        target_dict = targets[target]
        build_file = gyp.common.BuildFile(target)
        ValidateTargetType(target, target_dict)
        ValidateRulesInTarget(target, target_dict, extra_sources_for_rules)
        ValidateRunAsInTarget(target, target_dict, build_file)
        ValidateActionsInTarget(target, target_dict, build_file)

    # Generators might not expect ints.  Turn them into strs.
    TurnIntIntoStrInDict(data)

    # TODO(mark): Return |data| for now because the generator needs a list of
    # build files that came in.  In the future, maybe it should just accept
    # a list, and not the whole data dict.
    return [flat_list, targets, data]
