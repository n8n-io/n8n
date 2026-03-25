# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""GYP backend that generates Eclipse CDT settings files.

This backend DOES NOT generate Eclipse CDT projects. Instead, it generates XML
files that can be imported into an Eclipse CDT project. The XML file contains a
list of include paths and symbols (i.e. defines).

Because a full .cproject definition is not created by this generator, it's not
possible to properly define the include dirs and symbols for each file
individually.  Instead, one set of includes/symbols is generated for the entire
project.  This works fairly well (and is a vast improvement in general), but may
still result in a few indexer issues here and there.

This generator has no automated tests, so expect it to be broken.
"""

from xml.sax.saxutils import escape
import os.path
import subprocess
import gyp
import gyp.common
import gyp.msvs_emulation
import shlex
import xml.etree.cElementTree as ET

generator_wants_static_library_dependencies_adjusted = False

generator_default_variables = {}

for dirname in ["INTERMEDIATE_DIR", "PRODUCT_DIR", "LIB_DIR", "SHARED_LIB_DIR"]:
    # Some gyp steps fail if these are empty(!), so we convert them to variables
    generator_default_variables[dirname] = "$" + dirname

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

# Include dirs will occasionally use the SHARED_INTERMEDIATE_DIR variable as
# part of the path when dealing with generated headers.  This value will be
# replaced dynamically for each configuration.
generator_default_variables["SHARED_INTERMEDIATE_DIR"] = "$SHARED_INTERMEDIATE_DIR"


def CalculateVariables(default_variables, params):
    generator_flags = params.get("generator_flags", {})
    for key, val in generator_flags.items():
        default_variables.setdefault(key, val)
    flavor = gyp.common.GetFlavor(params)
    default_variables.setdefault("OS", flavor)
    if flavor == "win":
        gyp.msvs_emulation.CalculateCommonVariables(default_variables, params)


def CalculateGeneratorInputInfo(params):
    """Calculate the generator specific info that gets fed to input (called by
  gyp)."""
    generator_flags = params.get("generator_flags", {})
    if generator_flags.get("adjust_static_libraries", False):
        global generator_wants_static_library_dependencies_adjusted
        generator_wants_static_library_dependencies_adjusted = True


def GetAllIncludeDirectories(
    target_list,
    target_dicts,
    shared_intermediate_dirs,
    config_name,
    params,
    compiler_path,
):
    """Calculate the set of include directories to be used.

  Returns:
    A list including all the include_dir's specified for every target followed
    by any include directories that were added as cflag compiler options.
  """

    gyp_includes_set = set()
    compiler_includes_list = []

    # Find compiler's default include dirs.
    if compiler_path:
        command = shlex.split(compiler_path)
        command.extend(["-E", "-xc++", "-v", "-"])
        proc = subprocess.Popen(
            args=command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        output = proc.communicate()[1].decode("utf-8")
        # Extract the list of include dirs from the output, which has this format:
        #   ...
        #   #include "..." search starts here:
        #   #include <...> search starts here:
        #    /usr/include/c++/4.6
        #    /usr/local/include
        #   End of search list.
        #   ...
        in_include_list = False
        for line in output.splitlines():
            if line.startswith("#include"):
                in_include_list = True
                continue
            if line.startswith("End of search list."):
                break
            if in_include_list:
                include_dir = line.strip()
                if include_dir not in compiler_includes_list:
                    compiler_includes_list.append(include_dir)

    flavor = gyp.common.GetFlavor(params)
    if flavor == "win":
        generator_flags = params.get("generator_flags", {})
    for target_name in target_list:
        target = target_dicts[target_name]
        if config_name in target["configurations"]:
            config = target["configurations"][config_name]

            # Look for any include dirs that were explicitly added via cflags. This
            # may be done in gyp files to force certain includes to come at the end.
            # TODO(jgreenwald): Change the gyp files to not abuse cflags for this, and
            # remove this.
            if flavor == "win":
                msvs_settings = gyp.msvs_emulation.MsvsSettings(target, generator_flags)
                cflags = msvs_settings.GetCflags(config_name)
            else:
                cflags = config["cflags"]
            for cflag in cflags:
                if cflag.startswith("-I"):
                    include_dir = cflag[2:]
                    if include_dir not in compiler_includes_list:
                        compiler_includes_list.append(include_dir)

            # Find standard gyp include dirs.
            if "include_dirs" in config:
                include_dirs = config["include_dirs"]
                for shared_intermediate_dir in shared_intermediate_dirs:
                    for include_dir in include_dirs:
                        include_dir = include_dir.replace(
                            "$SHARED_INTERMEDIATE_DIR", shared_intermediate_dir
                        )
                        if not os.path.isabs(include_dir):
                            base_dir = os.path.dirname(target_name)

                            include_dir = base_dir + "/" + include_dir
                            include_dir = os.path.abspath(include_dir)

                        gyp_includes_set.add(include_dir)

    # Generate a list that has all the include dirs.
    all_includes_list = list(gyp_includes_set)
    all_includes_list.sort()
    for compiler_include in compiler_includes_list:
        if compiler_include not in gyp_includes_set:
            all_includes_list.append(compiler_include)

    # All done.
    return all_includes_list


def GetCompilerPath(target_list, data, options):
    """Determine a command that can be used to invoke the compiler.

  Returns:
    If this is a gyp project that has explicit make settings, try to determine
    the compiler from that.  Otherwise, see if a compiler was specified via the
    CC_target environment variable.
  """
    # First, see if the compiler is configured in make's settings.
    build_file, _, _ = gyp.common.ParseQualifiedTarget(target_list[0])
    make_global_settings_dict = data[build_file].get("make_global_settings", {})
    for key, value in make_global_settings_dict:
        if key in ["CC", "CXX"]:
            return os.path.join(options.toplevel_dir, value)

    # Check to see if the compiler was specified as an environment variable.
    for key in ["CC_target", "CC", "CXX"]:
        compiler = os.environ.get(key)
        if compiler:
            return compiler

    return "gcc"


def GetAllDefines(target_list, target_dicts, data, config_name, params, compiler_path):
    """Calculate the defines for a project.

  Returns:
    A dict that includes explicit defines declared in gyp files along with all
    of the default defines that the compiler uses.
  """

    # Get defines declared in the gyp files.
    all_defines = {}
    flavor = gyp.common.GetFlavor(params)
    if flavor == "win":
        generator_flags = params.get("generator_flags", {})
    for target_name in target_list:
        target = target_dicts[target_name]

        if flavor == "win":
            msvs_settings = gyp.msvs_emulation.MsvsSettings(target, generator_flags)
            extra_defines = msvs_settings.GetComputedDefines(config_name)
        else:
            extra_defines = []
        if config_name in target["configurations"]:
            config = target["configurations"][config_name]
            target_defines = config["defines"]
        else:
            target_defines = []
        for define in target_defines + extra_defines:
            split_define = define.split("=", 1)
            if len(split_define) == 1:
                split_define.append("1")
            if split_define[0].strip() in all_defines:
                # Already defined
                continue
            all_defines[split_define[0].strip()] = split_define[1].strip()
    # Get default compiler defines (if possible).
    if flavor == "win":
        return all_defines  # Default defines already processed in the loop above.
    if compiler_path:
        command = shlex.split(compiler_path)
        command.extend(["-E", "-dM", "-"])
        cpp_proc = subprocess.Popen(
            args=command, cwd=".", stdin=subprocess.PIPE, stdout=subprocess.PIPE
        )
        cpp_output = cpp_proc.communicate()[0].decode("utf-8")
        cpp_lines = cpp_output.split("\n")
        for cpp_line in cpp_lines:
            if not cpp_line.strip():
                continue
            cpp_line_parts = cpp_line.split(" ", 2)
            key = cpp_line_parts[1]
            if len(cpp_line_parts) >= 3:
                val = cpp_line_parts[2]
            else:
                val = "1"
            all_defines[key] = val

    return all_defines


def WriteIncludePaths(out, eclipse_langs, include_dirs):
    """Write the includes section of a CDT settings export file."""

    out.write(
        '  <section name="org.eclipse.cdt.internal.ui.wizards.'
        'settingswizards.IncludePaths">\n'
    )
    out.write('    <language name="holder for library settings"></language>\n')
    for lang in eclipse_langs:
        out.write('    <language name="%s">\n' % lang)
        for include_dir in include_dirs:
            out.write(
                '      <includepath workspace_path="false">%s</includepath>\n'
                % include_dir
            )
        out.write("    </language>\n")
    out.write("  </section>\n")


def WriteMacros(out, eclipse_langs, defines):
    """Write the macros section of a CDT settings export file."""

    out.write(
        '  <section name="org.eclipse.cdt.internal.ui.wizards.'
        'settingswizards.Macros">\n'
    )
    out.write('    <language name="holder for library settings"></language>\n')
    for lang in eclipse_langs:
        out.write('    <language name="%s">\n' % lang)
        for key in sorted(defines):
            out.write(
                "      <macro><name>%s</name><value>%s</value></macro>\n"
                % (escape(key), escape(defines[key]))
            )
        out.write("    </language>\n")
    out.write("  </section>\n")


def GenerateOutputForConfig(target_list, target_dicts, data, params, config_name):
    options = params["options"]
    generator_flags = params.get("generator_flags", {})

    # build_dir: relative path from source root to our output files.
    # e.g. "out/Debug"
    build_dir = os.path.join(generator_flags.get("output_dir", "out"), config_name)

    toplevel_build = os.path.join(options.toplevel_dir, build_dir)
    # Ninja uses out/Debug/gen while make uses out/Debug/obj/gen as the
    # SHARED_INTERMEDIATE_DIR. Include both possible locations.
    shared_intermediate_dirs = [
        os.path.join(toplevel_build, "obj", "gen"),
        os.path.join(toplevel_build, "gen"),
    ]

    GenerateCdtSettingsFile(
        target_list,
        target_dicts,
        data,
        params,
        config_name,
        os.path.join(toplevel_build, "eclipse-cdt-settings.xml"),
        options,
        shared_intermediate_dirs,
    )
    GenerateClasspathFile(
        target_list,
        target_dicts,
        options.toplevel_dir,
        toplevel_build,
        os.path.join(toplevel_build, "eclipse-classpath.xml"),
    )


def GenerateCdtSettingsFile(
    target_list,
    target_dicts,
    data,
    params,
    config_name,
    out_name,
    options,
    shared_intermediate_dirs,
):
    gyp.common.EnsureDirExists(out_name)
    with open(out_name, "w") as out:
        out.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        out.write("<cdtprojectproperties>\n")

        eclipse_langs = [
            "C++ Source File",
            "C Source File",
            "Assembly Source File",
            "GNU C++",
            "GNU C",
            "Assembly",
        ]
        compiler_path = GetCompilerPath(target_list, data, options)
        include_dirs = GetAllIncludeDirectories(
            target_list,
            target_dicts,
            shared_intermediate_dirs,
            config_name,
            params,
            compiler_path,
        )
        WriteIncludePaths(out, eclipse_langs, include_dirs)
        defines = GetAllDefines(
            target_list, target_dicts, data, config_name, params, compiler_path
        )
        WriteMacros(out, eclipse_langs, defines)

        out.write("</cdtprojectproperties>\n")


def GenerateClasspathFile(
    target_list, target_dicts, toplevel_dir, toplevel_build, out_name
):
    """Generates a classpath file suitable for symbol navigation and code
  completion of Java code (such as in Android projects) by finding all
  .java and .jar files used as action inputs."""
    gyp.common.EnsureDirExists(out_name)
    result = ET.Element("classpath")

    def AddElements(kind, paths):
        # First, we need to normalize the paths so they are all relative to the
        # toplevel dir.
        rel_paths = set()
        for path in paths:
            if os.path.isabs(path):
                rel_paths.add(os.path.relpath(path, toplevel_dir))
            else:
                rel_paths.add(path)

        for path in sorted(rel_paths):
            entry_element = ET.SubElement(result, "classpathentry")
            entry_element.set("kind", kind)
            entry_element.set("path", path)

    AddElements("lib", GetJavaJars(target_list, target_dicts, toplevel_dir))
    AddElements("src", GetJavaSourceDirs(target_list, target_dicts, toplevel_dir))
    # Include the standard JRE container and a dummy out folder
    AddElements("con", ["org.eclipse.jdt.launching.JRE_CONTAINER"])
    # Include a dummy out folder so that Eclipse doesn't use the default /bin
    # folder in the root of the project.
    AddElements("output", [os.path.join(toplevel_build, ".eclipse-java-build")])

    ET.ElementTree(result).write(out_name)


def GetJavaJars(target_list, target_dicts, toplevel_dir):
    """Generates a sequence of all .jars used as inputs."""
    for target_name in target_list:
        target = target_dicts[target_name]
        for action in target.get("actions", []):
            for input_ in action["inputs"]:
                if os.path.splitext(input_)[1] == ".jar" and not input_.startswith("$"):
                    if os.path.isabs(input_):
                        yield input_
                    else:
                        yield os.path.join(os.path.dirname(target_name), input_)


def GetJavaSourceDirs(target_list, target_dicts, toplevel_dir):
    """Generates a sequence of all likely java package root directories."""
    for target_name in target_list:
        target = target_dicts[target_name]
        for action in target.get("actions", []):
            for input_ in action["inputs"]:
                if os.path.splitext(input_)[1] == ".java" and not input_.startswith(
                    "$"
                ):
                    dir_ = os.path.dirname(
                        os.path.join(os.path.dirname(target_name), input_)
                    )
                    # If there is a parent 'src' or 'java' folder, navigate up to it -
                    # these are canonical package root names in Chromium.  This will
                    # break if 'src' or 'java' exists in the package structure. This
                    # could be further improved by inspecting the java file for the
                    # package name if this proves to be too fragile in practice.
                    parent_search = dir_
                    while os.path.basename(parent_search) not in ["src", "java"]:
                        parent_search, _ = os.path.split(parent_search)
                        if not parent_search or parent_search == toplevel_dir:
                            # Didn't find a known root, just return the original path
                            yield dir_
                            break
                    else:
                        yield parent_search


def GenerateOutput(target_list, target_dicts, data, params):
    """Generate an XML settings file that can be imported into a CDT project."""

    if params["options"].generator_output:
        raise NotImplementedError("--generator_output not implemented for eclipse")

    user_config = params.get("generator_flags", {}).get("config", None)
    if user_config:
        GenerateOutputForConfig(target_list, target_dicts, data, params, user_config)
    else:
        config_names = target_dicts[target_list[0]]["configurations"]
        for config_name in config_names:
            GenerateOutputForConfig(
                target_list, target_dicts, data, params, config_name
            )
