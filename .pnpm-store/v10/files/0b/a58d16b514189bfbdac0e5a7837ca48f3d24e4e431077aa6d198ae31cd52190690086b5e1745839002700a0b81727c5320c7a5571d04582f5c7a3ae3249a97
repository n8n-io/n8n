# Copyright (c) 2013 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""cmake output module

This module is under development and should be considered experimental.

This module produces cmake (2.8.8+) input as its output. One CMakeLists.txt is
created for each configuration.

This module's original purpose was to support editing in IDEs like KDevelop
which use CMake for project management. It is also possible to use CMake to
generate projects for other IDEs such as eclipse cdt and code::blocks. QtCreator
will convert the CMakeLists.txt to a code::blocks cbp for the editor to read,
but build using CMake. As a result QtCreator editor is unaware of compiler
defines. The generated CMakeLists.txt can also be used to build on Linux. There
is currently no support for building on platforms other than Linux.

The generated CMakeLists.txt should properly compile all projects. However,
there is a mismatch between gyp and cmake with regard to linking. All attempts
are made to work around this, but CMake sometimes sees -Wl,--start-group as a
library and incorrectly repeats it. As a result the output of this generator
should not be relied on for building.

When using with kdevelop, use version 4.4+. Previous versions of kdevelop will
not be able to find the header file directories described in the generated
CMakeLists.txt file.
"""


import multiprocessing
import os
import signal
import subprocess
import gyp.common
import gyp.xcode_emulation

_maketrans = str.maketrans

generator_default_variables = {
    "EXECUTABLE_PREFIX": "",
    "EXECUTABLE_SUFFIX": "",
    "STATIC_LIB_PREFIX": "lib",
    "STATIC_LIB_SUFFIX": ".a",
    "SHARED_LIB_PREFIX": "lib",
    "SHARED_LIB_SUFFIX": ".so",
    "SHARED_LIB_DIR": "${builddir}/lib.${TOOLSET}",
    "LIB_DIR": "${obj}.${TOOLSET}",
    "INTERMEDIATE_DIR": "${obj}.${TOOLSET}/${TARGET}/geni",
    "SHARED_INTERMEDIATE_DIR": "${obj}/gen",
    "PRODUCT_DIR": "${builddir}",
    "RULE_INPUT_PATH": "${RULE_INPUT_PATH}",
    "RULE_INPUT_DIRNAME": "${RULE_INPUT_DIRNAME}",
    "RULE_INPUT_NAME": "${RULE_INPUT_NAME}",
    "RULE_INPUT_ROOT": "${RULE_INPUT_ROOT}",
    "RULE_INPUT_EXT": "${RULE_INPUT_EXT}",
    "CONFIGURATION_NAME": "${configuration}",
}

FULL_PATH_VARS = ("${CMAKE_CURRENT_LIST_DIR}", "${builddir}", "${obj}")

generator_supports_multiple_toolsets = True
generator_wants_static_library_dependencies_adjusted = True

COMPILABLE_EXTENSIONS = {
    ".c": "cc",
    ".cc": "cxx",
    ".cpp": "cxx",
    ".cxx": "cxx",
    ".s": "s",  # cc
    ".S": "s",  # cc
}


def RemovePrefix(a, prefix):
    """Returns 'a' without 'prefix' if it starts with 'prefix'."""
    return a[len(prefix) :] if a.startswith(prefix) else a


def CalculateVariables(default_variables, params):
    """Calculate additional variables for use in the build (called by gyp)."""
    default_variables.setdefault("OS", gyp.common.GetFlavor(params))


def Compilable(filename):
    """Return true if the file is compilable (should be in OBJS)."""
    return any(filename.endswith(e) for e in COMPILABLE_EXTENSIONS)


def Linkable(filename):
    """Return true if the file is linkable (should be on the link line)."""
    return filename.endswith(".o")


def NormjoinPathForceCMakeSource(base_path, rel_path):
    """Resolves rel_path against base_path and returns the result.

  If rel_path is an absolute path it is returned unchanged.
  Otherwise it is resolved against base_path and normalized.
  If the result is a relative path, it is forced to be relative to the
  CMakeLists.txt.
  """
    if os.path.isabs(rel_path):
        return rel_path
    if any([rel_path.startswith(var) for var in FULL_PATH_VARS]):
        return rel_path
    # TODO: do we need to check base_path for absolute variables as well?
    return os.path.join(
        "${CMAKE_CURRENT_LIST_DIR}", os.path.normpath(os.path.join(base_path, rel_path))
    )


def NormjoinPath(base_path, rel_path):
    """Resolves rel_path against base_path and returns the result.
  TODO: what is this really used for?
  If rel_path begins with '$' it is returned unchanged.
  Otherwise it is resolved against base_path if relative, then normalized.
  """
    if rel_path.startswith("$") and not rel_path.startswith("${configuration}"):
        return rel_path
    return os.path.normpath(os.path.join(base_path, rel_path))


def CMakeStringEscape(a):
    """Escapes the string 'a' for use inside a CMake string.

  This means escaping
  '\' otherwise it may be seen as modifying the next character
  '"' otherwise it will end the string
  ';' otherwise the string becomes a list

  The following do not need to be escaped
  '#' when the lexer is in string state, this does not start a comment

  The following are yet unknown
  '$' generator variables (like ${obj}) must not be escaped,
      but text $ should be escaped
      what is wanted is to know which $ come from generator variables
  """
    return a.replace("\\", "\\\\").replace(";", "\\;").replace('"', '\\"')


def SetFileProperty(output, source_name, property_name, values, sep):
    """Given a set of source file, sets the given property on them."""
    output.write("set_source_files_properties(")
    output.write(source_name)
    output.write(" PROPERTIES ")
    output.write(property_name)
    output.write(' "')
    for value in values:
        output.write(CMakeStringEscape(value))
        output.write(sep)
    output.write('")\n')


def SetFilesProperty(output, variable, property_name, values, sep):
    """Given a set of source files, sets the given property on them."""
    output.write("set_source_files_properties(")
    WriteVariable(output, variable)
    output.write(" PROPERTIES ")
    output.write(property_name)
    output.write(' "')
    for value in values:
        output.write(CMakeStringEscape(value))
        output.write(sep)
    output.write('")\n')


def SetTargetProperty(output, target_name, property_name, values, sep=""):
    """Given a target, sets the given property."""
    output.write("set_target_properties(")
    output.write(target_name)
    output.write(" PROPERTIES ")
    output.write(property_name)
    output.write(' "')
    for value in values:
        output.write(CMakeStringEscape(value))
        output.write(sep)
    output.write('")\n')


def SetVariable(output, variable_name, value):
    """Sets a CMake variable."""
    output.write("set(")
    output.write(variable_name)
    output.write(' "')
    output.write(CMakeStringEscape(value))
    output.write('")\n')


def SetVariableList(output, variable_name, values):
    """Sets a CMake variable to a list."""
    if not values:
        return SetVariable(output, variable_name, "")
    if len(values) == 1:
        return SetVariable(output, variable_name, values[0])
    output.write("list(APPEND ")
    output.write(variable_name)
    output.write('\n  "')
    output.write('"\n  "'.join([CMakeStringEscape(value) for value in values]))
    output.write('")\n')


def UnsetVariable(output, variable_name):
    """Unsets a CMake variable."""
    output.write("unset(")
    output.write(variable_name)
    output.write(")\n")


def WriteVariable(output, variable_name, prepend=None):
    if prepend:
        output.write(prepend)
    output.write("${")
    output.write(variable_name)
    output.write("}")


class CMakeTargetType:
    def __init__(self, command, modifier, property_modifier):
        self.command = command
        self.modifier = modifier
        self.property_modifier = property_modifier


cmake_target_type_from_gyp_target_type = {
    "executable": CMakeTargetType("add_executable", None, "RUNTIME"),
    "static_library": CMakeTargetType("add_library", "STATIC", "ARCHIVE"),
    "shared_library": CMakeTargetType("add_library", "SHARED", "LIBRARY"),
    "loadable_module": CMakeTargetType("add_library", "MODULE", "LIBRARY"),
    "none": CMakeTargetType("add_custom_target", "SOURCES", None),
}


def StringToCMakeTargetName(a):
    """Converts the given string 'a' to a valid CMake target name.

  All invalid characters are replaced by '_'.
  Invalid for cmake: ' ', '/', '(', ')', '"'
  Invalid for make: ':'
  Invalid for unknown reasons but cause failures: '.'
  """
    return a.translate(_maketrans(' /():."', "_______"))


def WriteActions(target_name, actions, extra_sources, extra_deps, path_to_gyp, output):
    """Write CMake for the 'actions' in the target.

  Args:
    target_name: the name of the CMake target being generated.
    actions: the Gyp 'actions' dict for this target.
    extra_sources: [(<cmake_src>, <src>)] to append with generated source files.
    extra_deps: [<cmake_taget>] to append with generated targets.
    path_to_gyp: relative path from CMakeLists.txt being generated to
        the Gyp file in which the target being generated is defined.
  """
    for action in actions:
        action_name = StringToCMakeTargetName(action["action_name"])
        action_target_name = f"{target_name}__{action_name}"

        inputs = action["inputs"]
        inputs_name = action_target_name + "__input"
        SetVariableList(
            output,
            inputs_name,
            [NormjoinPathForceCMakeSource(path_to_gyp, dep) for dep in inputs],
        )

        outputs = action["outputs"]
        cmake_outputs = [
            NormjoinPathForceCMakeSource(path_to_gyp, out) for out in outputs
        ]
        outputs_name = action_target_name + "__output"
        SetVariableList(output, outputs_name, cmake_outputs)

        # Build up a list of outputs.
        # Collect the output dirs we'll need.
        dirs = {dir for dir in (os.path.dirname(o) for o in outputs) if dir}

        if int(action.get("process_outputs_as_sources", False)):
            extra_sources.extend(zip(cmake_outputs, outputs))

        # add_custom_command
        output.write("add_custom_command(OUTPUT ")
        WriteVariable(output, outputs_name)
        output.write("\n")

        if len(dirs) > 0:
            for directory in dirs:
                output.write("  COMMAND ${CMAKE_COMMAND} -E make_directory ")
                output.write(directory)
                output.write("\n")

        output.write("  COMMAND ")
        output.write(gyp.common.EncodePOSIXShellList(action["action"]))
        output.write("\n")

        output.write("  DEPENDS ")
        WriteVariable(output, inputs_name)
        output.write("\n")

        output.write("  WORKING_DIRECTORY ${CMAKE_CURRENT_LIST_DIR}/")
        output.write(path_to_gyp)
        output.write("\n")

        output.write("  COMMENT ")
        if "message" in action:
            output.write(action["message"])
        else:
            output.write(action_target_name)
        output.write("\n")

        output.write("  VERBATIM\n")
        output.write(")\n")

        # add_custom_target
        output.write("add_custom_target(")
        output.write(action_target_name)
        output.write("\n  DEPENDS ")
        WriteVariable(output, outputs_name)
        output.write("\n  SOURCES ")
        WriteVariable(output, inputs_name)
        output.write("\n)\n")

        extra_deps.append(action_target_name)


def NormjoinRulePathForceCMakeSource(base_path, rel_path, rule_source):
    if rel_path.startswith(("${RULE_INPUT_PATH}", "${RULE_INPUT_DIRNAME}")):
        if any([rule_source.startswith(var) for var in FULL_PATH_VARS]):
            return rel_path
    return NormjoinPathForceCMakeSource(base_path, rel_path)


def WriteRules(target_name, rules, extra_sources, extra_deps, path_to_gyp, output):
    """Write CMake for the 'rules' in the target.

  Args:
    target_name: the name of the CMake target being generated.
    actions: the Gyp 'actions' dict for this target.
    extra_sources: [(<cmake_src>, <src>)] to append with generated source files.
    extra_deps: [<cmake_taget>] to append with generated targets.
    path_to_gyp: relative path from CMakeLists.txt being generated to
        the Gyp file in which the target being generated is defined.
  """
    for rule in rules:
        rule_name = StringToCMakeTargetName(target_name + "__" + rule["rule_name"])

        inputs = rule.get("inputs", [])
        inputs_name = rule_name + "__input"
        SetVariableList(
            output,
            inputs_name,
            [NormjoinPathForceCMakeSource(path_to_gyp, dep) for dep in inputs],
        )
        outputs = rule["outputs"]
        var_outputs = []

        for count, rule_source in enumerate(rule.get("rule_sources", [])):
            action_name = rule_name + "_" + str(count)

            rule_source_dirname, rule_source_basename = os.path.split(rule_source)
            rule_source_root, rule_source_ext = os.path.splitext(rule_source_basename)

            SetVariable(output, "RULE_INPUT_PATH", rule_source)
            SetVariable(output, "RULE_INPUT_DIRNAME", rule_source_dirname)
            SetVariable(output, "RULE_INPUT_NAME", rule_source_basename)
            SetVariable(output, "RULE_INPUT_ROOT", rule_source_root)
            SetVariable(output, "RULE_INPUT_EXT", rule_source_ext)

            # Build up a list of outputs.
            # Collect the output dirs we'll need.
            dirs = {dir for dir in (os.path.dirname(o) for o in outputs) if dir}

            # Create variables for the output, as 'local' variable will be unset.
            these_outputs = []
            for output_index, out in enumerate(outputs):
                output_name = action_name + "_" + str(output_index)
                SetVariable(
                    output,
                    output_name,
                    NormjoinRulePathForceCMakeSource(path_to_gyp, out, rule_source),
                )
                if int(rule.get("process_outputs_as_sources", False)):
                    extra_sources.append(("${" + output_name + "}", out))
                these_outputs.append("${" + output_name + "}")
                var_outputs.append("${" + output_name + "}")

            # add_custom_command
            output.write("add_custom_command(OUTPUT\n")
            for out in these_outputs:
                output.write("  ")
                output.write(out)
                output.write("\n")

            for directory in dirs:
                output.write("  COMMAND ${CMAKE_COMMAND} -E make_directory ")
                output.write(directory)
                output.write("\n")

            output.write("  COMMAND ")
            output.write(gyp.common.EncodePOSIXShellList(rule["action"]))
            output.write("\n")

            output.write("  DEPENDS ")
            WriteVariable(output, inputs_name)
            output.write(" ")
            output.write(NormjoinPath(path_to_gyp, rule_source))
            output.write("\n")

            # CMAKE_CURRENT_LIST_DIR is where the CMakeLists.txt lives.
            # The cwd is the current build directory.
            output.write("  WORKING_DIRECTORY ${CMAKE_CURRENT_LIST_DIR}/")
            output.write(path_to_gyp)
            output.write("\n")

            output.write("  COMMENT ")
            if "message" in rule:
                output.write(rule["message"])
            else:
                output.write(action_name)
            output.write("\n")

            output.write("  VERBATIM\n")
            output.write(")\n")

            UnsetVariable(output, "RULE_INPUT_PATH")
            UnsetVariable(output, "RULE_INPUT_DIRNAME")
            UnsetVariable(output, "RULE_INPUT_NAME")
            UnsetVariable(output, "RULE_INPUT_ROOT")
            UnsetVariable(output, "RULE_INPUT_EXT")

        # add_custom_target
        output.write("add_custom_target(")
        output.write(rule_name)
        output.write(" DEPENDS\n")
        for out in var_outputs:
            output.write("  ")
            output.write(out)
            output.write("\n")
        output.write("SOURCES ")
        WriteVariable(output, inputs_name)
        output.write("\n")
        for rule_source in rule.get("rule_sources", []):
            output.write("  ")
            output.write(NormjoinPath(path_to_gyp, rule_source))
            output.write("\n")
        output.write(")\n")

        extra_deps.append(rule_name)


def WriteCopies(target_name, copies, extra_deps, path_to_gyp, output):
    """Write CMake for the 'copies' in the target.

  Args:
    target_name: the name of the CMake target being generated.
    actions: the Gyp 'actions' dict for this target.
    extra_deps: [<cmake_taget>] to append with generated targets.
    path_to_gyp: relative path from CMakeLists.txt being generated to
        the Gyp file in which the target being generated is defined.
  """
    copy_name = target_name + "__copies"

    # CMake gets upset with custom targets with OUTPUT which specify no output.
    have_copies = any(copy["files"] for copy in copies)
    if not have_copies:
        output.write("add_custom_target(")
        output.write(copy_name)
        output.write(")\n")
        extra_deps.append(copy_name)
        return

    class Copy:
        def __init__(self, ext, command):
            self.cmake_inputs = []
            self.cmake_outputs = []
            self.gyp_inputs = []
            self.gyp_outputs = []
            self.ext = ext
            self.inputs_name = None
            self.outputs_name = None
            self.command = command

    file_copy = Copy("", "copy")
    dir_copy = Copy("_dirs", "copy_directory")

    for copy in copies:
        files = copy["files"]
        destination = copy["destination"]
        for src in files:
            path = os.path.normpath(src)
            basename = os.path.split(path)[1]
            dst = os.path.join(destination, basename)

            copy = file_copy if os.path.basename(src) else dir_copy

            copy.cmake_inputs.append(NormjoinPathForceCMakeSource(path_to_gyp, src))
            copy.cmake_outputs.append(NormjoinPathForceCMakeSource(path_to_gyp, dst))
            copy.gyp_inputs.append(src)
            copy.gyp_outputs.append(dst)

    for copy in (file_copy, dir_copy):
        if copy.cmake_inputs:
            copy.inputs_name = copy_name + "__input" + copy.ext
            SetVariableList(output, copy.inputs_name, copy.cmake_inputs)

            copy.outputs_name = copy_name + "__output" + copy.ext
            SetVariableList(output, copy.outputs_name, copy.cmake_outputs)

    # add_custom_command
    output.write("add_custom_command(\n")

    output.write("OUTPUT")
    for copy in (file_copy, dir_copy):
        if copy.outputs_name:
            WriteVariable(output, copy.outputs_name, " ")
    output.write("\n")

    for copy in (file_copy, dir_copy):
        for src, dst in zip(copy.gyp_inputs, copy.gyp_outputs):
            # 'cmake -E copy src dst' will create the 'dst' directory if needed.
            output.write("COMMAND ${CMAKE_COMMAND} -E %s " % copy.command)
            output.write(src)
            output.write(" ")
            output.write(dst)
            output.write("\n")

    output.write("DEPENDS")
    for copy in (file_copy, dir_copy):
        if copy.inputs_name:
            WriteVariable(output, copy.inputs_name, " ")
    output.write("\n")

    output.write("WORKING_DIRECTORY ${CMAKE_CURRENT_LIST_DIR}/")
    output.write(path_to_gyp)
    output.write("\n")

    output.write("COMMENT Copying for ")
    output.write(target_name)
    output.write("\n")

    output.write("VERBATIM\n")
    output.write(")\n")

    # add_custom_target
    output.write("add_custom_target(")
    output.write(copy_name)
    output.write("\n  DEPENDS")
    for copy in (file_copy, dir_copy):
        if copy.outputs_name:
            WriteVariable(output, copy.outputs_name, " ")
    output.write("\n  SOURCES")
    if file_copy.inputs_name:
        WriteVariable(output, file_copy.inputs_name, " ")
    output.write("\n)\n")

    extra_deps.append(copy_name)


def CreateCMakeTargetBaseName(qualified_target):
    """This is the name we would like the target to have."""
    _, gyp_target_name, gyp_target_toolset = gyp.common.ParseQualifiedTarget(
        qualified_target
    )
    cmake_target_base_name = gyp_target_name
    if gyp_target_toolset and gyp_target_toolset != "target":
        cmake_target_base_name += "_" + gyp_target_toolset
    return StringToCMakeTargetName(cmake_target_base_name)


def CreateCMakeTargetFullName(qualified_target):
    """An unambiguous name for the target."""
    gyp_file, gyp_target_name, gyp_target_toolset = gyp.common.ParseQualifiedTarget(
        qualified_target
    )
    cmake_target_full_name = gyp_file + ":" + gyp_target_name
    if gyp_target_toolset and gyp_target_toolset != "target":
        cmake_target_full_name += "_" + gyp_target_toolset
    return StringToCMakeTargetName(cmake_target_full_name)


class CMakeNamer:
    """Converts Gyp target names into CMake target names.

  CMake requires that target names be globally unique. One way to ensure
  this is to fully qualify the names of the targets. Unfortunately, this
  ends up with all targets looking like "chrome_chrome_gyp_chrome" instead
  of just "chrome". If this generator were only interested in building, it
  would be possible to fully qualify all target names, then create
  unqualified target names which depend on all qualified targets which
  should have had that name. This is more or less what the 'make' generator
  does with aliases. However, one goal of this generator is to create CMake
  files for use with IDEs, and fully qualified names are not as user
  friendly.

  Since target name collision is rare, we do the above only when required.

  Toolset variants are always qualified from the base, as this is required for
  building. However, it also makes sense for an IDE, as it is possible for
  defines to be different.
  """

    def __init__(self, target_list):
        self.cmake_target_base_names_conficting = set()

        cmake_target_base_names_seen = set()
        for qualified_target in target_list:
            cmake_target_base_name = CreateCMakeTargetBaseName(qualified_target)

            if cmake_target_base_name not in cmake_target_base_names_seen:
                cmake_target_base_names_seen.add(cmake_target_base_name)
            else:
                self.cmake_target_base_names_conficting.add(cmake_target_base_name)

    def CreateCMakeTargetName(self, qualified_target):
        base_name = CreateCMakeTargetBaseName(qualified_target)
        if base_name in self.cmake_target_base_names_conficting:
            return CreateCMakeTargetFullName(qualified_target)
        return base_name


def WriteTarget(
    namer,
    qualified_target,
    target_dicts,
    build_dir,
    config_to_use,
    options,
    generator_flags,
    all_qualified_targets,
    flavor,
    output,
):
    # The make generator does this always.
    # TODO: It would be nice to be able to tell CMake all dependencies.
    circular_libs = generator_flags.get("circular", True)

    if not generator_flags.get("standalone", False):
        output.write("\n#")
        output.write(qualified_target)
        output.write("\n")

    gyp_file, _, _ = gyp.common.ParseQualifiedTarget(qualified_target)
    rel_gyp_file = gyp.common.RelativePath(gyp_file, options.toplevel_dir)
    rel_gyp_dir = os.path.dirname(rel_gyp_file)

    # Relative path from build dir to top dir.
    build_to_top = gyp.common.InvertRelativePath(build_dir, options.toplevel_dir)
    # Relative path from build dir to gyp dir.
    build_to_gyp = os.path.join(build_to_top, rel_gyp_dir)

    path_from_cmakelists_to_gyp = build_to_gyp

    spec = target_dicts.get(qualified_target, {})
    config = spec.get("configurations", {}).get(config_to_use, {})

    xcode_settings = None
    if flavor == "mac":
        xcode_settings = gyp.xcode_emulation.XcodeSettings(spec)

    target_name = spec.get("target_name", "<missing target name>")
    target_type = spec.get("type", "<missing target type>")
    target_toolset = spec.get("toolset")

    cmake_target_type = cmake_target_type_from_gyp_target_type.get(target_type)
    if cmake_target_type is None:
        print(
            "Target %s has unknown target type %s, skipping."
            % (target_name, target_type)
        )
        return

    SetVariable(output, "TARGET", target_name)
    SetVariable(output, "TOOLSET", target_toolset)

    cmake_target_name = namer.CreateCMakeTargetName(qualified_target)

    extra_sources = []
    extra_deps = []

    # Actions must come first, since they can generate more OBJs for use below.
    if "actions" in spec:
        WriteActions(
            cmake_target_name,
            spec["actions"],
            extra_sources,
            extra_deps,
            path_from_cmakelists_to_gyp,
            output,
        )

    # Rules must be early like actions.
    if "rules" in spec:
        WriteRules(
            cmake_target_name,
            spec["rules"],
            extra_sources,
            extra_deps,
            path_from_cmakelists_to_gyp,
            output,
        )

    # Copies
    if "copies" in spec:
        WriteCopies(
            cmake_target_name,
            spec["copies"],
            extra_deps,
            path_from_cmakelists_to_gyp,
            output,
        )

    # Target and sources
    srcs = spec.get("sources", [])

    # Gyp separates the sheep from the goats based on file extensions.
    # A full separation is done here because of flag handing (see below).
    s_sources = []
    c_sources = []
    cxx_sources = []
    linkable_sources = []
    other_sources = []
    for src in srcs:
        _, ext = os.path.splitext(src)
        src_type = COMPILABLE_EXTENSIONS.get(ext, None)
        src_norm_path = NormjoinPath(path_from_cmakelists_to_gyp, src)

        if src_type == "s":
            s_sources.append(src_norm_path)
        elif src_type == "cc":
            c_sources.append(src_norm_path)
        elif src_type == "cxx":
            cxx_sources.append(src_norm_path)
        elif Linkable(ext):
            linkable_sources.append(src_norm_path)
        else:
            other_sources.append(src_norm_path)

    for extra_source in extra_sources:
        src, real_source = extra_source
        _, ext = os.path.splitext(real_source)
        src_type = COMPILABLE_EXTENSIONS.get(ext, None)

        if src_type == "s":
            s_sources.append(src)
        elif src_type == "cc":
            c_sources.append(src)
        elif src_type == "cxx":
            cxx_sources.append(src)
        elif Linkable(ext):
            linkable_sources.append(src)
        else:
            other_sources.append(src)

    s_sources_name = None
    if s_sources:
        s_sources_name = cmake_target_name + "__asm_srcs"
        SetVariableList(output, s_sources_name, s_sources)

    c_sources_name = None
    if c_sources:
        c_sources_name = cmake_target_name + "__c_srcs"
        SetVariableList(output, c_sources_name, c_sources)

    cxx_sources_name = None
    if cxx_sources:
        cxx_sources_name = cmake_target_name + "__cxx_srcs"
        SetVariableList(output, cxx_sources_name, cxx_sources)

    linkable_sources_name = None
    if linkable_sources:
        linkable_sources_name = cmake_target_name + "__linkable_srcs"
        SetVariableList(output, linkable_sources_name, linkable_sources)

    other_sources_name = None
    if other_sources:
        other_sources_name = cmake_target_name + "__other_srcs"
        SetVariableList(output, other_sources_name, other_sources)

    # CMake gets upset when executable targets provide no sources.
    # http://www.cmake.org/pipermail/cmake/2010-July/038461.html
    dummy_sources_name = None
    has_sources = (
        s_sources_name
        or c_sources_name
        or cxx_sources_name
        or linkable_sources_name
        or other_sources_name
    )
    if target_type == "executable" and not has_sources:
        dummy_sources_name = cmake_target_name + "__dummy_srcs"
        SetVariable(
            output, dummy_sources_name, "${obj}.${TOOLSET}/${TARGET}/genc/dummy.c"
        )
        output.write('if(NOT EXISTS "')
        WriteVariable(output, dummy_sources_name)
        output.write('")\n')
        output.write('  file(WRITE "')
        WriteVariable(output, dummy_sources_name)
        output.write('" "")\n')
        output.write("endif()\n")

    # CMake is opposed to setting linker directories and considers the practice
    # of setting linker directories dangerous. Instead, it favors the use of
    # find_library and passing absolute paths to target_link_libraries.
    # However, CMake does provide the command link_directories, which adds
    # link directories to targets defined after it is called.
    # As a result, link_directories must come before the target definition.
    # CMake unfortunately has no means of removing entries from LINK_DIRECTORIES.
    library_dirs = config.get("library_dirs")
    if library_dirs is not None:
        output.write("link_directories(")
        for library_dir in library_dirs:
            output.write(" ")
            output.write(NormjoinPath(path_from_cmakelists_to_gyp, library_dir))
            output.write("\n")
        output.write(")\n")

    output.write(cmake_target_type.command)
    output.write("(")
    output.write(cmake_target_name)

    if cmake_target_type.modifier is not None:
        output.write(" ")
        output.write(cmake_target_type.modifier)

    if s_sources_name:
        WriteVariable(output, s_sources_name, " ")
    if c_sources_name:
        WriteVariable(output, c_sources_name, " ")
    if cxx_sources_name:
        WriteVariable(output, cxx_sources_name, " ")
    if linkable_sources_name:
        WriteVariable(output, linkable_sources_name, " ")
    if other_sources_name:
        WriteVariable(output, other_sources_name, " ")
    if dummy_sources_name:
        WriteVariable(output, dummy_sources_name, " ")

    output.write(")\n")

    # Let CMake know if the 'all' target should depend on this target.
    exclude_from_all = (
        "TRUE" if qualified_target not in all_qualified_targets else "FALSE"
    )
    SetTargetProperty(output, cmake_target_name, "EXCLUDE_FROM_ALL", exclude_from_all)
    for extra_target_name in extra_deps:
        SetTargetProperty(
            output, extra_target_name, "EXCLUDE_FROM_ALL", exclude_from_all
        )

    # Output name and location.
    if target_type != "none":
        # Link as 'C' if there are no other files
        if not c_sources and not cxx_sources:
            SetTargetProperty(output, cmake_target_name, "LINKER_LANGUAGE", ["C"])

        # Mark uncompiled sources as uncompiled.
        if other_sources_name:
            output.write("set_source_files_properties(")
            WriteVariable(output, other_sources_name, "")
            output.write(' PROPERTIES HEADER_FILE_ONLY "TRUE")\n')

        # Mark object sources as linkable.
        if linkable_sources_name:
            output.write("set_source_files_properties(")
            WriteVariable(output, other_sources_name, "")
            output.write(' PROPERTIES EXTERNAL_OBJECT "TRUE")\n')

        # Output directory
        target_output_directory = spec.get("product_dir")
        if target_output_directory is None:
            if target_type in ("executable", "loadable_module"):
                target_output_directory = generator_default_variables["PRODUCT_DIR"]
            elif target_type == "shared_library":
                target_output_directory = "${builddir}/lib.${TOOLSET}"
            elif spec.get("standalone_static_library", False):
                target_output_directory = generator_default_variables["PRODUCT_DIR"]
            else:
                base_path = gyp.common.RelativePath(
                    os.path.dirname(gyp_file), options.toplevel_dir
                )
                target_output_directory = "${obj}.${TOOLSET}"
                target_output_directory = os.path.join(
                    target_output_directory, base_path
                )

        cmake_target_output_directory = NormjoinPathForceCMakeSource(
            path_from_cmakelists_to_gyp, target_output_directory
        )
        SetTargetProperty(
            output,
            cmake_target_name,
            cmake_target_type.property_modifier + "_OUTPUT_DIRECTORY",
            cmake_target_output_directory,
        )

        # Output name
        default_product_prefix = ""
        default_product_name = target_name
        default_product_ext = ""
        if target_type == "static_library":
            static_library_prefix = generator_default_variables["STATIC_LIB_PREFIX"]
            default_product_name = RemovePrefix(
                default_product_name, static_library_prefix
            )
            default_product_prefix = static_library_prefix
            default_product_ext = generator_default_variables["STATIC_LIB_SUFFIX"]

        elif target_type in ("loadable_module", "shared_library"):
            shared_library_prefix = generator_default_variables["SHARED_LIB_PREFIX"]
            default_product_name = RemovePrefix(
                default_product_name, shared_library_prefix
            )
            default_product_prefix = shared_library_prefix
            default_product_ext = generator_default_variables["SHARED_LIB_SUFFIX"]

        elif target_type != "executable":
            print(
                "ERROR: What output file should be generated?",
                "type",
                target_type,
                "target",
                target_name,
            )

        product_prefix = spec.get("product_prefix", default_product_prefix)
        product_name = spec.get("product_name", default_product_name)
        product_ext = spec.get("product_extension")
        if product_ext:
            product_ext = "." + product_ext
        else:
            product_ext = default_product_ext

        SetTargetProperty(output, cmake_target_name, "PREFIX", product_prefix)
        SetTargetProperty(
            output,
            cmake_target_name,
            cmake_target_type.property_modifier + "_OUTPUT_NAME",
            product_name,
        )
        SetTargetProperty(output, cmake_target_name, "SUFFIX", product_ext)

        # Make the output of this target referenceable as a source.
        cmake_target_output_basename = product_prefix + product_name + product_ext
        cmake_target_output = os.path.join(
            cmake_target_output_directory, cmake_target_output_basename
        )
        SetFileProperty(output, cmake_target_output, "GENERATED", ["TRUE"], "")

        # Includes
        includes = config.get("include_dirs")
        if includes:
            # This (target include directories) is what requires CMake 2.8.8
            includes_name = cmake_target_name + "__include_dirs"
            SetVariableList(
                output,
                includes_name,
                [
                    NormjoinPathForceCMakeSource(path_from_cmakelists_to_gyp, include)
                    for include in includes
                ],
            )
            output.write("set_property(TARGET ")
            output.write(cmake_target_name)
            output.write(" APPEND PROPERTY INCLUDE_DIRECTORIES ")
            WriteVariable(output, includes_name, "")
            output.write(")\n")

        # Defines
        defines = config.get("defines")
        if defines is not None:
            SetTargetProperty(
                output, cmake_target_name, "COMPILE_DEFINITIONS", defines, ";"
            )

        # Compile Flags - http://www.cmake.org/Bug/view.php?id=6493
        # CMake currently does not have target C and CXX flags.
        # So, instead of doing...

        # cflags_c = config.get('cflags_c')
        # if cflags_c is not None:
        #   SetTargetProperty(output, cmake_target_name,
        #                       'C_COMPILE_FLAGS', cflags_c, ' ')

        # cflags_cc = config.get('cflags_cc')
        # if cflags_cc is not None:
        #   SetTargetProperty(output, cmake_target_name,
        #                       'CXX_COMPILE_FLAGS', cflags_cc, ' ')

        # Instead we must...
        cflags = config.get("cflags", [])
        cflags_c = config.get("cflags_c", [])
        cflags_cxx = config.get("cflags_cc", [])
        if xcode_settings:
            cflags = xcode_settings.GetCflags(config_to_use)
            cflags_c = xcode_settings.GetCflagsC(config_to_use)
            cflags_cxx = xcode_settings.GetCflagsCC(config_to_use)
            # cflags_objc = xcode_settings.GetCflagsObjC(config_to_use)
            # cflags_objcc = xcode_settings.GetCflagsObjCC(config_to_use)

        if (not cflags_c or not c_sources) and (not cflags_cxx or not cxx_sources):
            SetTargetProperty(output, cmake_target_name, "COMPILE_FLAGS", cflags, " ")

        elif c_sources and not (s_sources or cxx_sources):
            flags = []
            flags.extend(cflags)
            flags.extend(cflags_c)
            SetTargetProperty(output, cmake_target_name, "COMPILE_FLAGS", flags, " ")

        elif cxx_sources and not (s_sources or c_sources):
            flags = []
            flags.extend(cflags)
            flags.extend(cflags_cxx)
            SetTargetProperty(output, cmake_target_name, "COMPILE_FLAGS", flags, " ")

        else:
            # TODO: This is broken, one cannot generally set properties on files,
            # as other targets may require different properties on the same files.
            if s_sources and cflags:
                SetFilesProperty(output, s_sources_name, "COMPILE_FLAGS", cflags, " ")

            if c_sources and (cflags or cflags_c):
                flags = []
                flags.extend(cflags)
                flags.extend(cflags_c)
                SetFilesProperty(output, c_sources_name, "COMPILE_FLAGS", flags, " ")

            if cxx_sources and (cflags or cflags_cxx):
                flags = []
                flags.extend(cflags)
                flags.extend(cflags_cxx)
                SetFilesProperty(output, cxx_sources_name, "COMPILE_FLAGS", flags, " ")

        # Linker flags
        ldflags = config.get("ldflags")
        if ldflags is not None:
            SetTargetProperty(output, cmake_target_name, "LINK_FLAGS", ldflags, " ")

        # XCode settings
        xcode_settings = config.get("xcode_settings", {})
        for xcode_setting, xcode_value in xcode_settings.items():
            SetTargetProperty(
                output,
                cmake_target_name,
                "XCODE_ATTRIBUTE_%s" % xcode_setting,
                xcode_value,
                "" if isinstance(xcode_value, str) else " ",
            )

    # Note on Dependencies and Libraries:
    # CMake wants to handle link order, resolving the link line up front.
    # Gyp does not retain or enforce specifying enough information to do so.
    # So do as other gyp generators and use --start-group and --end-group.
    # Give CMake as little information as possible so that it doesn't mess it up.

    # Dependencies
    rawDeps = spec.get("dependencies", [])

    static_deps = []
    shared_deps = []
    other_deps = []
    for rawDep in rawDeps:
        dep_cmake_name = namer.CreateCMakeTargetName(rawDep)
        dep_spec = target_dicts.get(rawDep, {})
        dep_target_type = dep_spec.get("type", None)

        if dep_target_type == "static_library":
            static_deps.append(dep_cmake_name)
        elif dep_target_type == "shared_library":
            shared_deps.append(dep_cmake_name)
        else:
            other_deps.append(dep_cmake_name)

    # ensure all external dependencies are complete before internal dependencies
    # extra_deps currently only depend on their own deps, so otherwise run early
    if static_deps or shared_deps or other_deps:
        for extra_dep in extra_deps:
            output.write("add_dependencies(")
            output.write(extra_dep)
            output.write("\n")
            for deps in (static_deps, shared_deps, other_deps):
                for dep in gyp.common.uniquer(deps):
                    output.write("  ")
                    output.write(dep)
                    output.write("\n")
            output.write(")\n")

    linkable = target_type in ("executable", "loadable_module", "shared_library")
    other_deps.extend(extra_deps)
    if other_deps or (not linkable and (static_deps or shared_deps)):
        output.write("add_dependencies(")
        output.write(cmake_target_name)
        output.write("\n")
        for dep in gyp.common.uniquer(other_deps):
            output.write("  ")
            output.write(dep)
            output.write("\n")
        if not linkable:
            for deps in (static_deps, shared_deps):
                for lib_dep in gyp.common.uniquer(deps):
                    output.write("  ")
                    output.write(lib_dep)
                    output.write("\n")
        output.write(")\n")

    # Libraries
    if linkable:
        external_libs = [lib for lib in spec.get("libraries", []) if len(lib) > 0]
        if external_libs or static_deps or shared_deps:
            output.write("target_link_libraries(")
            output.write(cmake_target_name)
            output.write("\n")
            if static_deps:
                write_group = circular_libs and len(static_deps) > 1 and flavor != "mac"
                if write_group:
                    output.write("-Wl,--start-group\n")
                for dep in gyp.common.uniquer(static_deps):
                    output.write("  ")
                    output.write(dep)
                    output.write("\n")
                if write_group:
                    output.write("-Wl,--end-group\n")
            if shared_deps:
                for dep in gyp.common.uniquer(shared_deps):
                    output.write("  ")
                    output.write(dep)
                    output.write("\n")
            if external_libs:
                for lib in gyp.common.uniquer(external_libs):
                    output.write('  "')
                    output.write(RemovePrefix(lib, "$(SDKROOT)"))
                    output.write('"\n')

            output.write(")\n")

    UnsetVariable(output, "TOOLSET")
    UnsetVariable(output, "TARGET")


def GenerateOutputForConfig(target_list, target_dicts, data, params, config_to_use):
    options = params["options"]
    generator_flags = params["generator_flags"]
    flavor = gyp.common.GetFlavor(params)

    # generator_dir: relative path from pwd to where make puts build files.
    # Makes migrating from make to cmake easier, cmake doesn't put anything here.
    # Each Gyp configuration creates a different CMakeLists.txt file
    # to avoid incompatibilities between Gyp and CMake configurations.
    generator_dir = os.path.relpath(options.generator_output or ".")

    # output_dir: relative path from generator_dir to the build directory.
    output_dir = generator_flags.get("output_dir", "out")

    # build_dir: relative path from source root to our output files.
    # e.g. "out/Debug"
    build_dir = os.path.normpath(os.path.join(generator_dir, output_dir, config_to_use))

    toplevel_build = os.path.join(options.toplevel_dir, build_dir)

    output_file = os.path.join(toplevel_build, "CMakeLists.txt")
    gyp.common.EnsureDirExists(output_file)

    output = open(output_file, "w")
    output.write("cmake_minimum_required(VERSION 2.8.8 FATAL_ERROR)\n")
    output.write("cmake_policy(VERSION 2.8.8)\n")

    gyp_file, project_target, _ = gyp.common.ParseQualifiedTarget(target_list[-1])
    output.write("project(")
    output.write(project_target)
    output.write(")\n")

    SetVariable(output, "configuration", config_to_use)

    ar = None
    cc = None
    cxx = None

    make_global_settings = data[gyp_file].get("make_global_settings", [])
    build_to_top = gyp.common.InvertRelativePath(build_dir, options.toplevel_dir)
    for key, value in make_global_settings:
        if key == "AR":
            ar = os.path.join(build_to_top, value)
        if key == "CC":
            cc = os.path.join(build_to_top, value)
        if key == "CXX":
            cxx = os.path.join(build_to_top, value)

    ar = gyp.common.GetEnvironFallback(["AR_target", "AR"], ar)
    cc = gyp.common.GetEnvironFallback(["CC_target", "CC"], cc)
    cxx = gyp.common.GetEnvironFallback(["CXX_target", "CXX"], cxx)

    if ar:
        SetVariable(output, "CMAKE_AR", ar)
    if cc:
        SetVariable(output, "CMAKE_C_COMPILER", cc)
    if cxx:
        SetVariable(output, "CMAKE_CXX_COMPILER", cxx)

    # The following appears to be as-yet undocumented.
    # http://public.kitware.com/Bug/view.php?id=8392
    output.write("enable_language(ASM)\n")
    # ASM-ATT does not support .S files.
    # output.write('enable_language(ASM-ATT)\n')

    if cc:
        SetVariable(output, "CMAKE_ASM_COMPILER", cc)

    SetVariable(output, "builddir", "${CMAKE_CURRENT_BINARY_DIR}")
    SetVariable(output, "obj", "${builddir}/obj")
    output.write("\n")

    # TODO: Undocumented/unsupported (the CMake Java generator depends on it).
    # CMake by default names the object resulting from foo.c to be foo.c.o.
    # Gyp traditionally names the object resulting from foo.c foo.o.
    # This should be irrelevant, but some targets extract .o files from .a
    # and depend on the name of the extracted .o files.
    output.write("set(CMAKE_C_OUTPUT_EXTENSION_REPLACE 1)\n")
    output.write("set(CMAKE_CXX_OUTPUT_EXTENSION_REPLACE 1)\n")
    output.write("\n")

    # Force ninja to use rsp files. Otherwise link and ar lines can get too long,
    # resulting in 'Argument list too long' errors.
    # However, rsp files don't work correctly on Mac.
    if flavor != "mac":
        output.write("set(CMAKE_NINJA_FORCE_RESPONSE_FILE 1)\n")
    output.write("\n")

    namer = CMakeNamer(target_list)

    # The list of targets upon which the 'all' target should depend.
    # CMake has it's own implicit 'all' target, one is not created explicitly.
    all_qualified_targets = set()
    for build_file in params["build_files"]:
        for qualified_target in gyp.common.AllTargets(
            target_list, target_dicts, os.path.normpath(build_file)
        ):
            all_qualified_targets.add(qualified_target)

    for qualified_target in target_list:
        if flavor == "mac":
            gyp_file, _, _ = gyp.common.ParseQualifiedTarget(qualified_target)
            spec = target_dicts[qualified_target]
            gyp.xcode_emulation.MergeGlobalXcodeSettingsToSpec(data[gyp_file], spec)

        WriteTarget(
            namer,
            qualified_target,
            target_dicts,
            build_dir,
            config_to_use,
            options,
            generator_flags,
            all_qualified_targets,
            flavor,
            output,
        )

    output.close()


def PerformBuild(data, configurations, params):
    options = params["options"]
    generator_flags = params["generator_flags"]

    # generator_dir: relative path from pwd to where make puts build files.
    # Makes migrating from make to cmake easier, cmake doesn't put anything here.
    generator_dir = os.path.relpath(options.generator_output or ".")

    # output_dir: relative path from generator_dir to the build directory.
    output_dir = generator_flags.get("output_dir", "out")

    for config_name in configurations:
        # build_dir: relative path from source root to our output files.
        # e.g. "out/Debug"
        build_dir = os.path.normpath(
            os.path.join(generator_dir, output_dir, config_name)
        )
        arguments = ["cmake", "-G", "Ninja"]
        print(f"Generating [{config_name}]: {arguments}")
        subprocess.check_call(arguments, cwd=build_dir)

        arguments = ["ninja", "-C", build_dir]
        print(f"Building [{config_name}]: {arguments}")
        subprocess.check_call(arguments)


def CallGenerateOutputForConfig(arglist):
    # Ignore the interrupt signal so that the parent process catches it and
    # kills all multiprocessing children.
    signal.signal(signal.SIGINT, signal.SIG_IGN)

    target_list, target_dicts, data, params, config_name = arglist
    GenerateOutputForConfig(target_list, target_dicts, data, params, config_name)


def GenerateOutput(target_list, target_dicts, data, params):
    user_config = params.get("generator_flags", {}).get("config", None)
    if user_config:
        GenerateOutputForConfig(target_list, target_dicts, data, params, user_config)
    else:
        config_names = target_dicts[target_list[0]]["configurations"]
        if params["parallel"]:
            try:
                pool = multiprocessing.Pool(len(config_names))
                arglists = []
                for config_name in config_names:
                    arglists.append(
                        (target_list, target_dicts, data, params, config_name)
                    )
                    pool.map(CallGenerateOutputForConfig, arglists)
            except KeyboardInterrupt as e:
                pool.terminate()
                raise e
        else:
            for config_name in config_names:
                GenerateOutputForConfig(
                    target_list, target_dicts, data, params, config_name
                )
