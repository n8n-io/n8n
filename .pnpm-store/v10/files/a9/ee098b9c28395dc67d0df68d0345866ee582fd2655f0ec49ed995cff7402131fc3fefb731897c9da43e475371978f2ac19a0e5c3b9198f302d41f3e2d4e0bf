# Copyright (c) 2014 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Xcode-ninja wrapper project file generator.

This updates the data structures passed to the Xcode gyp generator to build
with ninja instead. The Xcode project itself is transformed into a list of
executable targets, each with a build step to build with ninja, and a target
with every source and resource file.  This appears to sidestep some of the
major performance headaches experienced using complex projects and large number
of targets within Xcode.
"""

import errno
import gyp.generator.ninja
import os
import re
import xml.sax.saxutils


def _WriteWorkspace(main_gyp, sources_gyp, params):
    """ Create a workspace to wrap main and sources gyp paths. """
    (build_file_root, build_file_ext) = os.path.splitext(main_gyp)
    workspace_path = build_file_root + ".xcworkspace"
    options = params["options"]
    if options.generator_output:
        workspace_path = os.path.join(options.generator_output, workspace_path)
    try:
        os.makedirs(workspace_path)
    except OSError as e:
        if e.errno != errno.EEXIST:
            raise
    output_string = (
        '<?xml version="1.0" encoding="UTF-8"?>\n' + '<Workspace version = "1.0">\n'
    )
    for gyp_name in [main_gyp, sources_gyp]:
        name = os.path.splitext(os.path.basename(gyp_name))[0] + ".xcodeproj"
        name = xml.sax.saxutils.quoteattr("group:" + name)
        output_string += "  <FileRef location = %s></FileRef>\n" % name
    output_string += "</Workspace>\n"

    workspace_file = os.path.join(workspace_path, "contents.xcworkspacedata")

    try:
        with open(workspace_file) as input_file:
            input_string = input_file.read()
            if input_string == output_string:
                return
    except OSError:
        # Ignore errors if the file doesn't exist.
        pass

    with open(workspace_file, "w") as output_file:
        output_file.write(output_string)


def _TargetFromSpec(old_spec, params):
    """ Create fake target for xcode-ninja wrapper. """
    # Determine ninja top level build dir (e.g. /path/to/out).
    ninja_toplevel = None
    jobs = 0
    if params:
        options = params["options"]
        ninja_toplevel = os.path.join(
            options.toplevel_dir, gyp.generator.ninja.ComputeOutputDir(params)
        )
        jobs = params.get("generator_flags", {}).get("xcode_ninja_jobs", 0)

    target_name = old_spec.get("target_name")
    product_name = old_spec.get("product_name", target_name)
    product_extension = old_spec.get("product_extension")

    ninja_target = {}
    ninja_target["target_name"] = target_name
    ninja_target["product_name"] = product_name
    if product_extension:
        ninja_target["product_extension"] = product_extension
    ninja_target["toolset"] = old_spec.get("toolset")
    ninja_target["default_configuration"] = old_spec.get("default_configuration")
    ninja_target["configurations"] = {}

    # Tell Xcode to look in |ninja_toplevel| for build products.
    new_xcode_settings = {}
    if ninja_toplevel:
        new_xcode_settings["CONFIGURATION_BUILD_DIR"] = (
            "%s/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)" % ninja_toplevel
        )

    if "configurations" in old_spec:
        for config in old_spec["configurations"]:
            old_xcode_settings = old_spec["configurations"][config].get(
                "xcode_settings", {}
            )
            if "IPHONEOS_DEPLOYMENT_TARGET" in old_xcode_settings:
                new_xcode_settings["CODE_SIGNING_REQUIRED"] = "NO"
                new_xcode_settings["IPHONEOS_DEPLOYMENT_TARGET"] = old_xcode_settings[
                    "IPHONEOS_DEPLOYMENT_TARGET"
                ]
            for key in ["BUNDLE_LOADER", "TEST_HOST"]:
                if key in old_xcode_settings:
                    new_xcode_settings[key] = old_xcode_settings[key]

            ninja_target["configurations"][config] = {}
            ninja_target["configurations"][config][
                "xcode_settings"
            ] = new_xcode_settings

    ninja_target["mac_bundle"] = old_spec.get("mac_bundle", 0)
    ninja_target["mac_xctest_bundle"] = old_spec.get("mac_xctest_bundle", 0)
    ninja_target["ios_app_extension"] = old_spec.get("ios_app_extension", 0)
    ninja_target["ios_watchkit_extension"] = old_spec.get("ios_watchkit_extension", 0)
    ninja_target["ios_watchkit_app"] = old_spec.get("ios_watchkit_app", 0)
    ninja_target["type"] = old_spec["type"]
    if ninja_toplevel:
        ninja_target["actions"] = [
            {
                "action_name": "Compile and copy %s via ninja" % target_name,
                "inputs": [],
                "outputs": [],
                "action": [
                    "env",
                    "PATH=%s" % os.environ["PATH"],
                    "ninja",
                    "-C",
                    new_xcode_settings["CONFIGURATION_BUILD_DIR"],
                    target_name,
                ],
                "message": "Compile and copy %s via ninja" % target_name,
            },
        ]
        if jobs > 0:
            ninja_target["actions"][0]["action"].extend(("-j", jobs))
    return ninja_target


def IsValidTargetForWrapper(target_extras, executable_target_pattern, spec):
    """Limit targets for Xcode wrapper.

  Xcode sometimes performs poorly with too many targets, so only include
  proper executable targets, with filters to customize.
  Arguments:
    target_extras: Regular expression to always add, matching any target.
    executable_target_pattern: Regular expression limiting executable targets.
    spec: Specifications for target.
  """
    target_name = spec.get("target_name")
    # Always include targets matching target_extras.
    if target_extras is not None and re.search(target_extras, target_name):
        return True

    # Otherwise just show executable targets and xc_tests.
    if int(spec.get("mac_xctest_bundle", 0)) != 0 or (
        spec.get("type", "") == "executable"
        and spec.get("product_extension", "") != "bundle"
    ):

        # If there is a filter and the target does not match, exclude the target.
        if executable_target_pattern is not None:
            if not re.search(executable_target_pattern, target_name):
                return False
        return True
    return False


def CreateWrapper(target_list, target_dicts, data, params):
    """Initialize targets for the ninja wrapper.

  This sets up the necessary variables in the targets to generate Xcode projects
  that use ninja as an external builder.
  Arguments:
    target_list: List of target pairs: 'base/base.gyp:base'.
    target_dicts: Dict of target properties keyed on target pair.
    data: Dict of flattened build files keyed on gyp path.
    params: Dict of global options for gyp.
  """
    orig_gyp = params["build_files"][0]
    for gyp_name, gyp_dict in data.items():
        if gyp_name == orig_gyp:
            depth = gyp_dict["_DEPTH"]

    # Check for custom main gyp name, otherwise use the default CHROMIUM_GYP_FILE
    # and prepend .ninja before the .gyp extension.
    generator_flags = params.get("generator_flags", {})
    main_gyp = generator_flags.get("xcode_ninja_main_gyp", None)
    if main_gyp is None:
        (build_file_root, build_file_ext) = os.path.splitext(orig_gyp)
        main_gyp = build_file_root + ".ninja" + build_file_ext

    # Create new |target_list|, |target_dicts| and |data| data structures.
    new_target_list = []
    new_target_dicts = {}
    new_data = {}

    # Set base keys needed for |data|.
    new_data[main_gyp] = {}
    new_data[main_gyp]["included_files"] = []
    new_data[main_gyp]["targets"] = []
    new_data[main_gyp]["xcode_settings"] = data[orig_gyp].get("xcode_settings", {})

    # Normally the xcode-ninja generator includes only valid executable targets.
    # If |xcode_ninja_executable_target_pattern| is set, that list is reduced to
    # executable targets that match the pattern. (Default all)
    executable_target_pattern = generator_flags.get(
        "xcode_ninja_executable_target_pattern", None
    )

    # For including other non-executable targets, add the matching target name
    # to the |xcode_ninja_target_pattern| regular expression. (Default none)
    target_extras = generator_flags.get("xcode_ninja_target_pattern", None)

    for old_qualified_target in target_list:
        spec = target_dicts[old_qualified_target]
        if IsValidTargetForWrapper(target_extras, executable_target_pattern, spec):
            # Add to new_target_list.
            target_name = spec.get("target_name")
            new_target_name = f"{main_gyp}:{target_name}#target"
            new_target_list.append(new_target_name)

            # Add to new_target_dicts.
            new_target_dicts[new_target_name] = _TargetFromSpec(spec, params)

            # Add to new_data.
            for old_target in data[old_qualified_target.split(":")[0]]["targets"]:
                if old_target["target_name"] == target_name:
                    new_data_target = {}
                    new_data_target["target_name"] = old_target["target_name"]
                    new_data_target["toolset"] = old_target["toolset"]
                    new_data[main_gyp]["targets"].append(new_data_target)

    # Create sources target.
    sources_target_name = "sources_for_indexing"
    sources_target = _TargetFromSpec(
        {
            "target_name": sources_target_name,
            "toolset": "target",
            "default_configuration": "Default",
            "mac_bundle": "0",
            "type": "executable",
        },
        None,
    )

    # Tell Xcode to look everywhere for headers.
    sources_target["configurations"] = {"Default": {"include_dirs": [depth]}}

    # Put excluded files into the sources target so they can be opened in Xcode.
    skip_excluded_files = not generator_flags.get(
        "xcode_ninja_list_excluded_files", True
    )

    sources = []
    for target, target_dict in target_dicts.items():
        base = os.path.dirname(target)
        files = target_dict.get("sources", []) + target_dict.get(
            "mac_bundle_resources", []
        )

        if not skip_excluded_files:
            files.extend(
                target_dict.get("sources_excluded", [])
                + target_dict.get("mac_bundle_resources_excluded", [])
            )

        for action in target_dict.get("actions", []):
            files.extend(action.get("inputs", []))

            if not skip_excluded_files:
                files.extend(action.get("inputs_excluded", []))

        # Remove files starting with $. These are mostly intermediate files for the
        # build system.
        files = [file for file in files if not file.startswith("$")]

        # Make sources relative to root build file.
        relative_path = os.path.dirname(main_gyp)
        sources += [
            os.path.relpath(os.path.join(base, file), relative_path) for file in files
        ]

    sources_target["sources"] = sorted(set(sources))

    # Put sources_to_index in it's own gyp.
    sources_gyp = os.path.join(os.path.dirname(main_gyp), sources_target_name + ".gyp")
    fully_qualified_target_name = f"{sources_gyp}:{sources_target_name}#target"

    # Add to new_target_list, new_target_dicts and new_data.
    new_target_list.append(fully_qualified_target_name)
    new_target_dicts[fully_qualified_target_name] = sources_target
    new_data_target = {}
    new_data_target["target_name"] = sources_target["target_name"]
    new_data_target["_DEPTH"] = depth
    new_data_target["toolset"] = "target"
    new_data[sources_gyp] = {}
    new_data[sources_gyp]["targets"] = []
    new_data[sources_gyp]["included_files"] = []
    new_data[sources_gyp]["xcode_settings"] = data[orig_gyp].get("xcode_settings", {})
    new_data[sources_gyp]["targets"].append(new_data_target)

    # Write workspace to file.
    _WriteWorkspace(main_gyp, sources_gyp, params)
    return (new_target_list, new_target_dicts, new_data)
