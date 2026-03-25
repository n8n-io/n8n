# Copyright (c) 2016 Ben Noordhuis <info@bnoordhuis.nl>. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import gyp.common
import gyp.xcode_emulation
import json
import os

generator_additional_non_configuration_keys = []
generator_additional_path_sections = []
generator_extra_sources_for_rules = []
generator_filelist_paths = None
generator_supports_multiple_toolsets = True
generator_wants_sorted_dependencies = False

# Lifted from make.py.  The actual values don't matter much.
generator_default_variables = {
    "CONFIGURATION_NAME": "$(BUILDTYPE)",
    "EXECUTABLE_PREFIX": "",
    "EXECUTABLE_SUFFIX": "",
    "INTERMEDIATE_DIR": "$(obj).$(TOOLSET)/$(TARGET)/geni",
    "PRODUCT_DIR": "$(builddir)",
    "RULE_INPUT_DIRNAME": "%(INPUT_DIRNAME)s",
    "RULE_INPUT_EXT": "$(suffix $<)",
    "RULE_INPUT_NAME": "$(notdir $<)",
    "RULE_INPUT_PATH": "$(abspath $<)",
    "RULE_INPUT_ROOT": "%(INPUT_ROOT)s",
    "SHARED_INTERMEDIATE_DIR": "$(obj)/gen",
    "SHARED_LIB_PREFIX": "lib",
    "STATIC_LIB_PREFIX": "lib",
    "STATIC_LIB_SUFFIX": ".a",
}


def IsMac(params):
    return "mac" == gyp.common.GetFlavor(params)


def CalculateVariables(default_variables, params):
    default_variables.setdefault("OS", gyp.common.GetFlavor(params))


def AddCommandsForTarget(cwd, target, params, per_config_commands):
    output_dir = params["generator_flags"].get("output_dir", "out")
    for configuration_name, configuration in target["configurations"].items():
        if IsMac(params):
            xcode_settings = gyp.xcode_emulation.XcodeSettings(target)
            cflags = xcode_settings.GetCflags(configuration_name)
            cflags_c = xcode_settings.GetCflagsC(configuration_name)
            cflags_cc = xcode_settings.GetCflagsCC(configuration_name)
        else:
            cflags = configuration.get("cflags", [])
            cflags_c = configuration.get("cflags_c", [])
            cflags_cc = configuration.get("cflags_cc", [])

        cflags_c = cflags + cflags_c
        cflags_cc = cflags + cflags_cc

        defines = configuration.get("defines", [])
        defines = ["-D" + s for s in defines]

        # TODO(bnoordhuis) Handle generated source files.
        extensions = (".c", ".cc", ".cpp", ".cxx")
        sources = [s for s in target.get("sources", []) if s.endswith(extensions)]

        def resolve(filename):
            return os.path.abspath(os.path.join(cwd, filename))

        # TODO(bnoordhuis) Handle generated header files.
        include_dirs = configuration.get("include_dirs", [])
        include_dirs = [s for s in include_dirs if not s.startswith("$(obj)")]
        includes = ["-I" + resolve(s) for s in include_dirs]

        defines = gyp.common.EncodePOSIXShellList(defines)
        includes = gyp.common.EncodePOSIXShellList(includes)
        cflags_c = gyp.common.EncodePOSIXShellList(cflags_c)
        cflags_cc = gyp.common.EncodePOSIXShellList(cflags_cc)

        commands = per_config_commands.setdefault(configuration_name, [])
        for source in sources:
            file = resolve(source)
            isc = source.endswith(".c")
            cc = "cc" if isc else "c++"
            cflags = cflags_c if isc else cflags_cc
            command = " ".join(
                (
                    cc,
                    defines,
                    includes,
                    cflags,
                    "-c",
                    gyp.common.EncodePOSIXShellArgument(file),
                )
            )
            commands.append(dict(command=command, directory=output_dir, file=file))


def GenerateOutput(target_list, target_dicts, data, params):
    per_config_commands = {}
    for qualified_target, target in target_dicts.items():
        build_file, target_name, toolset = gyp.common.ParseQualifiedTarget(
            qualified_target
        )
        if IsMac(params):
            settings = data[build_file]
            gyp.xcode_emulation.MergeGlobalXcodeSettingsToSpec(settings, target)
        cwd = os.path.dirname(build_file)
        AddCommandsForTarget(cwd, target, params, per_config_commands)

    output_dir = params["generator_flags"].get("output_dir", "out")
    for configuration_name, commands in per_config_commands.items():
        filename = os.path.join(output_dir, configuration_name, "compile_commands.json")
        gyp.common.EnsureDirExists(filename)
        fp = open(filename, "w")
        json.dump(commands, fp=fp, indent=0, check_circular=False)


def PerformBuild(data, configurations, params):
    pass
