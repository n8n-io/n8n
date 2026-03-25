# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.


import ntpath
import os
import posixpath
import re
import subprocess
import sys

from collections import OrderedDict

import gyp.common
import gyp.easy_xml as easy_xml
import gyp.generator.ninja as ninja_generator
import gyp.MSVSNew as MSVSNew
import gyp.MSVSProject as MSVSProject
import gyp.MSVSSettings as MSVSSettings
import gyp.MSVSToolFile as MSVSToolFile
import gyp.MSVSUserFile as MSVSUserFile
import gyp.MSVSUtil as MSVSUtil
import gyp.MSVSVersion as MSVSVersion
from gyp.common import GypError
from gyp.common import OrderedSet


# Regular expression for validating Visual Studio GUIDs.  If the GUID
# contains lowercase hex letters, MSVS will be fine. However,
# IncrediBuild BuildConsole will parse the solution file, but then
# silently skip building the target causing hard to track down errors.
# Note that this only happens with the BuildConsole, and does not occur
# if IncrediBuild is executed from inside Visual Studio.  This regex
# validates that the string looks like a GUID with all uppercase hex
# letters.
VALID_MSVS_GUID_CHARS = re.compile(r"^[A-F0-9\-]+$")

generator_supports_multiple_toolsets = gyp.common.CrossCompileRequested()

generator_default_variables = {
    "DRIVER_PREFIX": "",
    "DRIVER_SUFFIX": ".sys",
    "EXECUTABLE_PREFIX": "",
    "EXECUTABLE_SUFFIX": ".exe",
    "STATIC_LIB_PREFIX": "",
    "SHARED_LIB_PREFIX": "",
    "STATIC_LIB_SUFFIX": ".lib",
    "SHARED_LIB_SUFFIX": ".dll",
    "INTERMEDIATE_DIR": "$(IntDir)",
    "SHARED_INTERMEDIATE_DIR": "$(OutDir)/obj/global_intermediate",
    "OS": "win",
    "PRODUCT_DIR": "$(OutDir)",
    "LIB_DIR": "$(OutDir)lib",
    "RULE_INPUT_ROOT": "$(InputName)",
    "RULE_INPUT_DIRNAME": "$(InputDir)",
    "RULE_INPUT_EXT": "$(InputExt)",
    "RULE_INPUT_NAME": "$(InputFileName)",
    "RULE_INPUT_PATH": "$(InputPath)",
    "CONFIGURATION_NAME": "$(ConfigurationName)",
}


# The msvs specific sections that hold paths
generator_additional_path_sections = [
    "msvs_cygwin_dirs",
    "msvs_props",
]


generator_additional_non_configuration_keys = [
    "msvs_cygwin_dirs",
    "msvs_cygwin_shell",
    "msvs_large_pdb",
    "msvs_shard",
    "msvs_external_builder",
    "msvs_external_builder_out_dir",
    "msvs_external_builder_build_cmd",
    "msvs_external_builder_clean_cmd",
    "msvs_external_builder_clcompile_cmd",
    "msvs_enable_winrt",
    "msvs_requires_importlibrary",
    "msvs_enable_winphone",
    "msvs_application_type_revision",
    "msvs_target_platform_version",
    "msvs_target_platform_minversion",
]

generator_filelist_paths = None

# List of precompiled header related keys.
precomp_keys = [
    "msvs_precompiled_header",
    "msvs_precompiled_source",
]


cached_username = None


cached_domain = None


# TODO(gspencer): Switch the os.environ calls to be
# win32api.GetDomainName() and win32api.GetUserName() once the
# python version in depot_tools has been updated to work on Vista
# 64-bit.
def _GetDomainAndUserName():
    if sys.platform not in ("win32", "cygwin"):
        return ("DOMAIN", "USERNAME")
    global cached_username
    global cached_domain
    if not cached_domain or not cached_username:
        domain = os.environ.get("USERDOMAIN")
        username = os.environ.get("USERNAME")
        if not domain or not username:
            call = subprocess.Popen(
                ["net", "config", "Workstation"], stdout=subprocess.PIPE
            )
            config = call.communicate()[0].decode("utf-8")
            username_re = re.compile(r"^User name\s+(\S+)", re.MULTILINE)
            username_match = username_re.search(config)
            if username_match:
                username = username_match.group(1)
            domain_re = re.compile(r"^Logon domain\s+(\S+)", re.MULTILINE)
            domain_match = domain_re.search(config)
            if domain_match:
                domain = domain_match.group(1)
        cached_domain = domain
        cached_username = username
    return (cached_domain, cached_username)


fixpath_prefix = None


def _NormalizedSource(source):
    """Normalize the path.

  But not if that gets rid of a variable, as this may expand to something
  larger than one directory.

  Arguments:
      source: The path to be normalize.d

  Returns:
      The normalized path.
  """
    normalized = os.path.normpath(source)
    if source.count("$") == normalized.count("$"):
        source = normalized
    return source


def _FixPath(path, separator="\\"):
    """Convert paths to a form that will make sense in a vcproj file.

  Arguments:
    path: The path to convert, may contain / etc.
  Returns:
    The path with all slashes made into backslashes.
  """
    if (
        fixpath_prefix
        and path
        and not os.path.isabs(path)
        and not path[0] == "$"
        and not _IsWindowsAbsPath(path)
    ):
        path = os.path.join(fixpath_prefix, path)
    if separator == "\\":
        path = path.replace("/", "\\")
    path = _NormalizedSource(path)
    if separator == "/":
        path = path.replace("\\", "/")
    if path and path[-1] == separator:
        path = path[:-1]
    return path


def _IsWindowsAbsPath(path):
    """
  On Cygwin systems Python needs a little help determining if a path
  is an absolute Windows path or not, so that
  it does not treat those as relative, which results in bad paths like:
  '..\\C:\\<some path>\\some_source_code_file.cc'
  """
    return path.startswith("c:") or path.startswith("C:")


def _FixPaths(paths, separator="\\"):
    """Fix each of the paths of the list."""
    return [_FixPath(i, separator) for i in paths]


def _ConvertSourcesToFilterHierarchy(
    sources, prefix=None, excluded=None, list_excluded=True, msvs_version=None
):
    """Converts a list split source file paths into a vcproj folder hierarchy.

  Arguments:
    sources: A list of source file paths split.
    prefix: A list of source file path layers meant to apply to each of sources.
    excluded: A set of excluded files.
    msvs_version: A MSVSVersion object.

  Returns:
    A hierarchy of filenames and MSVSProject.Filter objects that matches the
    layout of the source tree.
    For example:
    _ConvertSourcesToFilterHierarchy([['a', 'bob1.c'], ['b', 'bob2.c']],
                                     prefix=['joe'])
    -->
    [MSVSProject.Filter('a', contents=['joe\\a\\bob1.c']),
     MSVSProject.Filter('b', contents=['joe\\b\\bob2.c'])]
  """
    if not prefix:
        prefix = []
    result = []
    excluded_result = []
    folders = OrderedDict()
    # Gather files into the final result, excluded, or folders.
    for s in sources:
        if len(s) == 1:
            filename = _NormalizedSource("\\".join(prefix + s))
            if filename in excluded:
                excluded_result.append(filename)
            else:
                result.append(filename)
        elif msvs_version and not msvs_version.UsesVcxproj():
            # For MSVS 2008 and earlier, we need to process all files before walking
            # the sub folders.
            if not folders.get(s[0]):
                folders[s[0]] = []
            folders[s[0]].append(s[1:])
        else:
            contents = _ConvertSourcesToFilterHierarchy(
                [s[1:]],
                prefix + [s[0]],
                excluded=excluded,
                list_excluded=list_excluded,
                msvs_version=msvs_version,
            )
            contents = MSVSProject.Filter(s[0], contents=contents)
            result.append(contents)
    # Add a folder for excluded files.
    if excluded_result and list_excluded:
        excluded_folder = MSVSProject.Filter(
            "_excluded_files", contents=excluded_result
        )
        result.append(excluded_folder)

    if msvs_version and msvs_version.UsesVcxproj():
        return result

    # Populate all the folders.
    for f in folders:
        contents = _ConvertSourcesToFilterHierarchy(
            folders[f],
            prefix=prefix + [f],
            excluded=excluded,
            list_excluded=list_excluded,
            msvs_version=msvs_version,
        )
        contents = MSVSProject.Filter(f, contents=contents)
        result.append(contents)
    return result


def _ToolAppend(tools, tool_name, setting, value, only_if_unset=False):
    if not value:
        return
    _ToolSetOrAppend(tools, tool_name, setting, value, only_if_unset)


def _ToolSetOrAppend(tools, tool_name, setting, value, only_if_unset=False):
    # TODO(bradnelson): ugly hack, fix this more generally!!!
    if "Directories" in setting or "Dependencies" in setting:
        if type(value) == str:
            value = value.replace("/", "\\")
        else:
            value = [i.replace("/", "\\") for i in value]
    if not tools.get(tool_name):
        tools[tool_name] = dict()
    tool = tools[tool_name]
    if "CompileAsWinRT" == setting:
        return
    if tool.get(setting):
        if only_if_unset:
            return
        if type(tool[setting]) == list and type(value) == list:
            tool[setting] += value
        else:
            raise TypeError(
                'Appending "%s" to a non-list setting "%s" for tool "%s" is '
                "not allowed, previous value: %s"
                % (value, setting, tool_name, str(tool[setting]))
            )
    else:
        tool[setting] = value


def _ConfigTargetVersion(config_data):
    return config_data.get("msvs_target_version", "Windows7")


def _ConfigPlatform(config_data):
    return config_data.get("msvs_configuration_platform", "Win32")


def _ConfigBaseName(config_name, platform_name):
    if config_name.endswith("_" + platform_name):
        return config_name[0 : -len(platform_name) - 1]
    else:
        return config_name


def _ConfigFullName(config_name, config_data):
    platform_name = _ConfigPlatform(config_data)
    return f"{_ConfigBaseName(config_name, platform_name)}|{platform_name}"


def _ConfigWindowsTargetPlatformVersion(config_data, version):
    target_ver = config_data.get("msvs_windows_target_platform_version")
    if target_ver and re.match(r"^\d+", target_ver):
        return target_ver
    config_ver = config_data.get("msvs_windows_sdk_version")
    vers = [config_ver] if config_ver else version.compatible_sdks
    for ver in vers:
        for key in [
            r"HKLM\Software\Microsoft\Microsoft SDKs\Windows\%s",
            r"HKLM\Software\Wow6432Node\Microsoft\Microsoft SDKs\Windows\%s",
        ]:
            sdk_dir = MSVSVersion._RegistryGetValue(key % ver, "InstallationFolder")
            if not sdk_dir:
                continue
            version = MSVSVersion._RegistryGetValue(key % ver, "ProductVersion") or ""
            # Find a matching entry in sdk_dir\include.
            expected_sdk_dir = r"%s\include" % sdk_dir
            names = sorted(
                (
                    x
                    for x in (
                        os.listdir(expected_sdk_dir)
                        if os.path.isdir(expected_sdk_dir)
                        else []
                    )
                    if x.startswith(version)
                ),
                reverse=True,
            )
            if names:
                return names[0]
            else:
                print(
                    "Warning: No include files found for detected "
                    "Windows SDK version %s" % (version),
                    file=sys.stdout,
                )


def _BuildCommandLineForRuleRaw(
    spec, cmd, cygwin_shell, has_input_path, quote_cmd, do_setup_env
):

    if [x for x in cmd if "$(InputDir)" in x]:
        input_dir_preamble = (
            "set INPUTDIR=$(InputDir)\n"
            "if NOT DEFINED INPUTDIR set INPUTDIR=.\\\n"
            "set INPUTDIR=%INPUTDIR:~0,-1%\n"
        )
    else:
        input_dir_preamble = ""

    if cygwin_shell:
        # Find path to cygwin.
        cygwin_dir = _FixPath(spec.get("msvs_cygwin_dirs", ["."])[0])
        # Prepare command.
        direct_cmd = cmd
        direct_cmd = [
            i.replace("$(IntDir)", '`cygpath -m "${INTDIR}"`') for i in direct_cmd
        ]
        direct_cmd = [
            i.replace("$(OutDir)", '`cygpath -m "${OUTDIR}"`') for i in direct_cmd
        ]
        direct_cmd = [
            i.replace("$(InputDir)", '`cygpath -m "${INPUTDIR}"`') for i in direct_cmd
        ]
        if has_input_path:
            direct_cmd = [
                i.replace("$(InputPath)", '`cygpath -m "${INPUTPATH}"`')
                for i in direct_cmd
            ]
        direct_cmd = ['\\"%s\\"' % i.replace('"', '\\\\\\"') for i in direct_cmd]
        # direct_cmd = gyp.common.EncodePOSIXShellList(direct_cmd)
        direct_cmd = " ".join(direct_cmd)
        # TODO(quote):  regularize quoting path names throughout the module
        cmd = ""
        if do_setup_env:
            cmd += 'call "$(ProjectDir)%(cygwin_dir)s\\setup_env.bat" && '
        cmd += "set CYGWIN=nontsec&& "
        if direct_cmd.find("NUMBER_OF_PROCESSORS") >= 0:
            cmd += "set /a NUMBER_OF_PROCESSORS_PLUS_1=%%NUMBER_OF_PROCESSORS%%+1&& "
        if direct_cmd.find("INTDIR") >= 0:
            cmd += "set INTDIR=$(IntDir)&& "
        if direct_cmd.find("OUTDIR") >= 0:
            cmd += "set OUTDIR=$(OutDir)&& "
        if has_input_path and direct_cmd.find("INPUTPATH") >= 0:
            cmd += "set INPUTPATH=$(InputPath) && "
        cmd += 'bash -c "%(cmd)s"'
        cmd = cmd % {"cygwin_dir": cygwin_dir, "cmd": direct_cmd}
        return input_dir_preamble + cmd
    else:
        # Convert cat --> type to mimic unix.
        if cmd[0] == "cat":
            command = ["type"]
        else:
            command = [cmd[0].replace("/", "\\")]
        # Add call before command to ensure that commands can be tied together one
        # after the other without aborting in Incredibuild, since IB makes a bat
        # file out of the raw command string, and some commands (like python) are
        # actually batch files themselves.
        command.insert(0, "call")
        # Fix the paths
        # TODO(quote): This is a really ugly heuristic, and will miss path fixing
        #              for arguments like "--arg=path" or "/opt:path".
        # If the argument starts with a slash or dash, it's probably a command line
        # switch
        # Return the path with forward slashes because the command using it might
        # not support backslashes.
        arguments = [i if (i[:1] in "/-") else _FixPath(i, "/") for i in cmd[1:]]
        arguments = [i.replace("$(InputDir)", "%INPUTDIR%") for i in arguments]
        arguments = [MSVSSettings.FixVCMacroSlashes(i) for i in arguments]
        if quote_cmd:
            # Support a mode for using cmd directly.
            # Convert any paths to native form (first element is used directly).
            # TODO(quote):  regularize quoting path names throughout the module
            arguments = ['"%s"' % i for i in arguments]
        # Collapse into a single command.
        return input_dir_preamble + " ".join(command + arguments)


def _BuildCommandLineForRule(spec, rule, has_input_path, do_setup_env):
    # Currently this weird argument munging is used to duplicate the way a
    # python script would need to be run as part of the chrome tree.
    # Eventually we should add some sort of rule_default option to set this
    # per project. For now the behavior chrome needs is the default.
    mcs = rule.get("msvs_cygwin_shell")
    if mcs is None:
        mcs = int(spec.get("msvs_cygwin_shell", 1))
    elif isinstance(mcs, str):
        mcs = int(mcs)
    quote_cmd = int(rule.get("msvs_quote_cmd", 1))
    return _BuildCommandLineForRuleRaw(
        spec, rule["action"], mcs, has_input_path, quote_cmd, do_setup_env=do_setup_env
    )


def _AddActionStep(actions_dict, inputs, outputs, description, command):
    """Merge action into an existing list of actions.

  Care must be taken so that actions which have overlapping inputs either don't
  get assigned to the same input, or get collapsed into one.

  Arguments:
    actions_dict: dictionary keyed on input name, which maps to a list of
      dicts describing the actions attached to that input file.
    inputs: list of inputs
    outputs: list of outputs
    description: description of the action
    command: command line to execute
  """
    # Require there to be at least one input (call sites will ensure this).
    assert inputs

    action = {
        "inputs": inputs,
        "outputs": outputs,
        "description": description,
        "command": command,
    }

    # Pick where to stick this action.
    # While less than optimal in terms of build time, attach them to the first
    # input for now.
    chosen_input = inputs[0]

    # Add it there.
    if chosen_input not in actions_dict:
        actions_dict[chosen_input] = []
    actions_dict[chosen_input].append(action)


def _AddCustomBuildToolForMSVS(
    p, spec, primary_input, inputs, outputs, description, cmd
):
    """Add a custom build tool to execute something.

  Arguments:
    p: the target project
    spec: the target project dict
    primary_input: input file to attach the build tool to
    inputs: list of inputs
    outputs: list of outputs
    description: description of the action
    cmd: command line to execute
  """
    inputs = _FixPaths(inputs)
    outputs = _FixPaths(outputs)
    tool = MSVSProject.Tool(
        "VCCustomBuildTool",
        {
            "Description": description,
            "AdditionalDependencies": ";".join(inputs),
            "Outputs": ";".join(outputs),
            "CommandLine": cmd,
        },
    )
    # Add to the properties of primary input for each config.
    for config_name, c_data in spec["configurations"].items():
        p.AddFileConfig(
            _FixPath(primary_input), _ConfigFullName(config_name, c_data), tools=[tool]
        )


def _AddAccumulatedActionsToMSVS(p, spec, actions_dict):
    """Add actions accumulated into an actions_dict, merging as needed.

  Arguments:
    p: the target project
    spec: the target project dict
    actions_dict: dictionary keyed on input name, which maps to a list of
        dicts describing the actions attached to that input file.
  """
    for primary_input in actions_dict:
        inputs = OrderedSet()
        outputs = OrderedSet()
        descriptions = []
        commands = []
        for action in actions_dict[primary_input]:
            inputs.update(OrderedSet(action["inputs"]))
            outputs.update(OrderedSet(action["outputs"]))
            descriptions.append(action["description"])
            commands.append(action["command"])
        # Add the custom build step for one input file.
        description = ", and also ".join(descriptions)
        command = "\r\n".join(commands)
        _AddCustomBuildToolForMSVS(
            p,
            spec,
            primary_input=primary_input,
            inputs=inputs,
            outputs=outputs,
            description=description,
            cmd=command,
        )


def _RuleExpandPath(path, input_file):
    """Given the input file to which a rule applied, string substitute a path.

  Arguments:
    path: a path to string expand
    input_file: the file to which the rule applied.
  Returns:
    The string substituted path.
  """
    path = path.replace(
        "$(InputName)", os.path.splitext(os.path.split(input_file)[1])[0]
    )
    path = path.replace("$(InputDir)", os.path.dirname(input_file))
    path = path.replace(
        "$(InputExt)", os.path.splitext(os.path.split(input_file)[1])[1]
    )
    path = path.replace("$(InputFileName)", os.path.split(input_file)[1])
    path = path.replace("$(InputPath)", input_file)
    return path


def _FindRuleTriggerFiles(rule, sources):
    """Find the list of files which a particular rule applies to.

  Arguments:
    rule: the rule in question
    sources: the set of all known source files for this project
  Returns:
    The list of sources that trigger a particular rule.
  """
    return rule.get("rule_sources", [])


def _RuleInputsAndOutputs(rule, trigger_file):
    """Find the inputs and outputs generated by a rule.

  Arguments:
    rule: the rule in question.
    trigger_file: the main trigger for this rule.
  Returns:
    The pair of (inputs, outputs) involved in this rule.
  """
    raw_inputs = _FixPaths(rule.get("inputs", []))
    raw_outputs = _FixPaths(rule.get("outputs", []))
    inputs = OrderedSet()
    outputs = OrderedSet()
    inputs.add(trigger_file)
    for i in raw_inputs:
        inputs.add(_RuleExpandPath(i, trigger_file))
    for o in raw_outputs:
        outputs.add(_RuleExpandPath(o, trigger_file))
    return (inputs, outputs)


def _GenerateNativeRulesForMSVS(p, rules, output_dir, spec, options):
    """Generate a native rules file.

  Arguments:
    p: the target project
    rules: the set of rules to include
    output_dir: the directory in which the project/gyp resides
    spec: the project dict
    options: global generator options
  """
    rules_filename = "{}{}.rules".format(spec["target_name"], options.suffix)
    rules_file = MSVSToolFile.Writer(
        os.path.join(output_dir, rules_filename), spec["target_name"]
    )
    # Add each rule.
    for r in rules:
        rule_name = r["rule_name"]
        rule_ext = r["extension"]
        inputs = _FixPaths(r.get("inputs", []))
        outputs = _FixPaths(r.get("outputs", []))
        # Skip a rule with no action and no inputs.
        if "action" not in r and not r.get("rule_sources", []):
            continue
        cmd = _BuildCommandLineForRule(spec, r, has_input_path=True, do_setup_env=True)
        rules_file.AddCustomBuildRule(
            name=rule_name,
            description=r.get("message", rule_name),
            extensions=[rule_ext],
            additional_dependencies=inputs,
            outputs=outputs,
            cmd=cmd,
        )
    # Write out rules file.
    rules_file.WriteIfChanged()

    # Add rules file to project.
    p.AddToolFile(rules_filename)


def _Cygwinify(path):
    path = path.replace("$(OutDir)", "$(OutDirCygwin)")
    path = path.replace("$(IntDir)", "$(IntDirCygwin)")
    return path


def _GenerateExternalRules(rules, output_dir, spec, sources, options, actions_to_add):
    """Generate an external makefile to do a set of rules.

  Arguments:
    rules: the list of rules to include
    output_dir: path containing project and gyp files
    spec: project specification data
    sources: set of sources known
    options: global generator options
    actions_to_add: The list of actions we will add to.
  """
    filename = "{}_rules{}.mk".format(spec["target_name"], options.suffix)
    mk_file = gyp.common.WriteOnDiff(os.path.join(output_dir, filename))
    # Find cygwin style versions of some paths.
    mk_file.write('OutDirCygwin:=$(shell cygpath -u "$(OutDir)")\n')
    mk_file.write('IntDirCygwin:=$(shell cygpath -u "$(IntDir)")\n')
    # Gather stuff needed to emit all: target.
    all_inputs = OrderedSet()
    all_outputs = OrderedSet()
    all_output_dirs = OrderedSet()
    first_outputs = []
    for rule in rules:
        trigger_files = _FindRuleTriggerFiles(rule, sources)
        for tf in trigger_files:
            inputs, outputs = _RuleInputsAndOutputs(rule, tf)
            all_inputs.update(OrderedSet(inputs))
            all_outputs.update(OrderedSet(outputs))
            # Only use one target from each rule as the dependency for
            # 'all' so we don't try to build each rule multiple times.
            first_outputs.append(list(outputs)[0])
            # Get the unique output directories for this rule.
            output_dirs = [os.path.split(i)[0] for i in outputs]
            for od in output_dirs:
                all_output_dirs.add(od)
    first_outputs_cyg = [_Cygwinify(i) for i in first_outputs]
    # Write out all: target, including mkdir for each output directory.
    mk_file.write("all: %s\n" % " ".join(first_outputs_cyg))
    for od in all_output_dirs:
        if od:
            mk_file.write('\tmkdir -p `cygpath -u "%s"`\n' % od)
    mk_file.write("\n")
    # Define how each output is generated.
    for rule in rules:
        trigger_files = _FindRuleTriggerFiles(rule, sources)
        for tf in trigger_files:
            # Get all the inputs and outputs for this rule for this trigger file.
            inputs, outputs = _RuleInputsAndOutputs(rule, tf)
            inputs = [_Cygwinify(i) for i in inputs]
            outputs = [_Cygwinify(i) for i in outputs]
            # Prepare the command line for this rule.
            cmd = [_RuleExpandPath(c, tf) for c in rule["action"]]
            cmd = ['"%s"' % i for i in cmd]
            cmd = " ".join(cmd)
            # Add it to the makefile.
            mk_file.write("{}: {}\n".format(" ".join(outputs), " ".join(inputs)))
            mk_file.write("\t%s\n\n" % cmd)
    # Close up the file.
    mk_file.close()

    # Add makefile to list of sources.
    sources.add(filename)
    # Add a build action to call makefile.
    cmd = [
        "make",
        "OutDir=$(OutDir)",
        "IntDir=$(IntDir)",
        "-j",
        "${NUMBER_OF_PROCESSORS_PLUS_1}",
        "-f",
        filename,
    ]
    cmd = _BuildCommandLineForRuleRaw(spec, cmd, True, False, True, True)
    # Insert makefile as 0'th input, so it gets the action attached there,
    # as this is easier to understand from in the IDE.
    all_inputs = list(all_inputs)
    all_inputs.insert(0, filename)
    _AddActionStep(
        actions_to_add,
        inputs=_FixPaths(all_inputs),
        outputs=_FixPaths(all_outputs),
        description="Running external rules for %s" % spec["target_name"],
        command=cmd,
    )


def _EscapeEnvironmentVariableExpansion(s):
    """Escapes % characters.

  Escapes any % characters so that Windows-style environment variable
  expansions will leave them alone.
  See http://connect.microsoft.com/VisualStudio/feedback/details/106127/cl-d-name-text-containing-percentage-characters-doesnt-compile
  to understand why we have to do this.

  Args:
      s: The string to be escaped.

  Returns:
      The escaped string.
  """  # noqa: E731,E123,E501
    s = s.replace("%", "%%")
    return s


quote_replacer_regex = re.compile(r'(\\*)"')


def _EscapeCommandLineArgumentForMSVS(s):
    """Escapes a Windows command-line argument.

  So that the Win32 CommandLineToArgv function will turn the escaped result back
  into the original string.
  See http://msdn.microsoft.com/en-us/library/17w5ykft.aspx
  ("Parsing C++ Command-Line Arguments") to understand why we have to do
  this.

  Args:
      s: the string to be escaped.
  Returns:
      the escaped string.
  """

    def _Replace(match):
        # For a literal quote, CommandLineToArgv requires an odd number of
        # backslashes preceding it, and it produces half as many literal backslashes
        # (rounded down). So we need to produce 2n+1 backslashes.
        return 2 * match.group(1) + '\\"'

    # Escape all quotes so that they are interpreted literally.
    s = quote_replacer_regex.sub(_Replace, s)
    # Now add unescaped quotes so that any whitespace is interpreted literally.
    s = '"' + s + '"'
    return s


delimiters_replacer_regex = re.compile(r"(\\*)([,;]+)")


def _EscapeVCProjCommandLineArgListItem(s):
    """Escapes command line arguments for MSVS.

  The VCProj format stores string lists in a single string using commas and
  semi-colons as separators, which must be quoted if they are to be
  interpreted literally. However, command-line arguments may already have
  quotes, and the VCProj parser is ignorant of the backslash escaping
  convention used by CommandLineToArgv, so the command-line quotes and the
  VCProj quotes may not be the same quotes. So to store a general
  command-line argument in a VCProj list, we need to parse the existing
  quoting according to VCProj's convention and quote any delimiters that are
  not already quoted by that convention. The quotes that we add will also be
  seen by CommandLineToArgv, so if backslashes precede them then we also have
  to escape those backslashes according to the CommandLineToArgv
  convention.

  Args:
      s: the string to be escaped.
  Returns:
      the escaped string.
  """

    def _Replace(match):
        # For a non-literal quote, CommandLineToArgv requires an even number of
        # backslashes preceding it, and it produces half as many literal
        # backslashes. So we need to produce 2n backslashes.
        return 2 * match.group(1) + '"' + match.group(2) + '"'

    segments = s.split('"')
    # The unquoted segments are at the even-numbered indices.
    for i in range(0, len(segments), 2):
        segments[i] = delimiters_replacer_regex.sub(_Replace, segments[i])
    # Concatenate back into a single string
    s = '"'.join(segments)
    if len(segments) % 2 == 0:
        # String ends while still quoted according to VCProj's convention. This
        # means the delimiter and the next list item that follow this one in the
        # .vcproj file will be misinterpreted as part of this item. There is nothing
        # we can do about this. Adding an extra quote would correct the problem in
        # the VCProj but cause the same problem on the final command-line. Moving
        # the item to the end of the list does works, but that's only possible if
        # there's only one such item. Let's just warn the user.
        print(
            "Warning: MSVS may misinterpret the odd number of " + "quotes in " + s,
            file=sys.stderr,
        )
    return s


def _EscapeCppDefineForMSVS(s):
    """Escapes a CPP define so that it will reach the compiler unaltered."""
    s = _EscapeEnvironmentVariableExpansion(s)
    s = _EscapeCommandLineArgumentForMSVS(s)
    s = _EscapeVCProjCommandLineArgListItem(s)
    # cl.exe replaces literal # characters with = in preprocessor definitions for
    # some reason. Octal-encode to work around that.
    s = s.replace("#", "\\%03o" % ord("#"))
    return s


quote_replacer_regex2 = re.compile(r'(\\+)"')


def _EscapeCommandLineArgumentForMSBuild(s):
    """Escapes a Windows command-line argument for use by MSBuild."""

    def _Replace(match):
        return (len(match.group(1)) / 2 * 4) * "\\" + '\\"'

    # Escape all quotes so that they are interpreted literally.
    s = quote_replacer_regex2.sub(_Replace, s)
    return s


def _EscapeMSBuildSpecialCharacters(s):
    escape_dictionary = {
        "%": "%25",
        "$": "%24",
        "@": "%40",
        "'": "%27",
        ";": "%3B",
        "?": "%3F",
        "*": "%2A",
    }
    result = "".join([escape_dictionary.get(c, c) for c in s])
    return result


def _EscapeCppDefineForMSBuild(s):
    """Escapes a CPP define so that it will reach the compiler unaltered."""
    s = _EscapeEnvironmentVariableExpansion(s)
    s = _EscapeCommandLineArgumentForMSBuild(s)
    s = _EscapeMSBuildSpecialCharacters(s)
    # cl.exe replaces literal # characters with = in preprocessor definitions for
    # some reason. Octal-encode to work around that.
    s = s.replace("#", "\\%03o" % ord("#"))
    return s


def _GenerateRulesForMSVS(
    p, output_dir, options, spec, sources, excluded_sources, actions_to_add
):
    """Generate all the rules for a particular project.

  Arguments:
    p: the project
    output_dir: directory to emit rules to
    options: global options passed to the generator
    spec: the specification for this project
    sources: the set of all known source files in this project
    excluded_sources: the set of sources excluded from normal processing
    actions_to_add: deferred list of actions to add in
  """
    rules = spec.get("rules", [])
    rules_native = [r for r in rules if not int(r.get("msvs_external_rule", 0))]
    rules_external = [r for r in rules if int(r.get("msvs_external_rule", 0))]

    # Handle rules that use a native rules file.
    if rules_native:
        _GenerateNativeRulesForMSVS(p, rules_native, output_dir, spec, options)

    # Handle external rules (non-native rules).
    if rules_external:
        _GenerateExternalRules(
            rules_external, output_dir, spec, sources, options, actions_to_add
        )
    _AdjustSourcesForRules(rules, sources, excluded_sources, False)


def _AdjustSourcesForRules(rules, sources, excluded_sources, is_msbuild):
    # Add outputs generated by each rule (if applicable).
    for rule in rules:
        # Add in the outputs from this rule.
        trigger_files = _FindRuleTriggerFiles(rule, sources)
        for trigger_file in trigger_files:
            # Remove trigger_file from excluded_sources to let the rule be triggered
            # (e.g. rule trigger ax_enums.idl is added to excluded_sources
            # because it's also in an action's inputs in the same project)
            excluded_sources.discard(_FixPath(trigger_file))
            # Done if not processing outputs as sources.
            if int(rule.get("process_outputs_as_sources", False)):
                inputs, outputs = _RuleInputsAndOutputs(rule, trigger_file)
                inputs = OrderedSet(_FixPaths(inputs))
                outputs = OrderedSet(_FixPaths(outputs))
                inputs.remove(_FixPath(trigger_file))
                sources.update(inputs)
                if not is_msbuild:
                    excluded_sources.update(inputs)
                sources.update(outputs)


def _FilterActionsFromExcluded(excluded_sources, actions_to_add):
    """Take inputs with actions attached out of the list of exclusions.

  Arguments:
    excluded_sources: list of source files not to be built.
    actions_to_add: dict of actions keyed on source file they're attached to.
  Returns:
    excluded_sources with files that have actions attached removed.
  """
    must_keep = OrderedSet(_FixPaths(actions_to_add.keys()))
    return [s for s in excluded_sources if s not in must_keep]


def _GetDefaultConfiguration(spec):
    return spec["configurations"][spec["default_configuration"]]


def _GetGuidOfProject(proj_path, spec):
    """Get the guid for the project.

  Arguments:
    proj_path: Path of the vcproj or vcxproj file to generate.
    spec: The target dictionary containing the properties of the target.
  Returns:
    the guid.
  Raises:
    ValueError: if the specified GUID is invalid.
  """
    # Pluck out the default configuration.
    default_config = _GetDefaultConfiguration(spec)
    # Decide the guid of the project.
    guid = default_config.get("msvs_guid")
    if guid:
        if VALID_MSVS_GUID_CHARS.match(guid) is None:
            raise ValueError(
                'Invalid MSVS guid: "%s".  Must match regex: "%s".'
                % (guid, VALID_MSVS_GUID_CHARS.pattern)
            )
        guid = "{%s}" % guid
    guid = guid or MSVSNew.MakeGuid(proj_path)
    return guid


def _GetMsbuildToolsetOfProject(proj_path, spec, version):
    """Get the platform toolset for the project.

  Arguments:
    proj_path: Path of the vcproj or vcxproj file to generate.
    spec: The target dictionary containing the properties of the target.
    version: The MSVSVersion object.
  Returns:
    the platform toolset string or None.
  """
    # Pluck out the default configuration.
    default_config = _GetDefaultConfiguration(spec)
    toolset = default_config.get("msbuild_toolset")
    if not toolset and version.DefaultToolset():
        toolset = version.DefaultToolset()
    if spec["type"] == "windows_driver":
        toolset = "WindowsKernelModeDriver10.0"
    return toolset


def _GenerateProject(project, options, version, generator_flags, spec):
    """Generates a vcproj file.

  Arguments:
    project: the MSVSProject object.
    options: global generator options.
    version: the MSVSVersion object.
    generator_flags: dict of generator-specific flags.
  Returns:
    A list of source files that cannot be found on disk.
  """
    default_config = _GetDefaultConfiguration(project.spec)

    # Skip emitting anything if told to with msvs_existing_vcproj option.
    if default_config.get("msvs_existing_vcproj"):
        return []

    if version.UsesVcxproj():
        return _GenerateMSBuildProject(project, options, version, generator_flags, spec)
    else:
        return _GenerateMSVSProject(project, options, version, generator_flags)


def _GenerateMSVSProject(project, options, version, generator_flags):
    """Generates a .vcproj file.  It may create .rules and .user files too.

  Arguments:
    project: The project object we will generate the file for.
    options: Global options passed to the generator.
    version: The VisualStudioVersion object.
    generator_flags: dict of generator-specific flags.
  """
    spec = project.spec
    gyp.common.EnsureDirExists(project.path)

    platforms = _GetUniquePlatforms(spec)
    p = MSVSProject.Writer(
        project.path, version, spec["target_name"], project.guid, platforms
    )

    # Get directory project file is in.
    project_dir = os.path.split(project.path)[0]
    gyp_path = _NormalizedSource(project.build_file)
    relative_path_of_gyp_file = gyp.common.RelativePath(gyp_path, project_dir)

    config_type = _GetMSVSConfigurationType(spec, project.build_file)
    for config_name, config in spec["configurations"].items():
        _AddConfigurationToMSVSProject(p, spec, config_type, config_name, config)

    # Prepare list of sources and excluded sources.
    gyp_file = os.path.split(project.build_file)[1]
    sources, excluded_sources = _PrepareListOfSources(spec, generator_flags, gyp_file)

    # Add rules.
    actions_to_add = {}
    _GenerateRulesForMSVS(
        p, project_dir, options, spec, sources, excluded_sources, actions_to_add
    )
    list_excluded = generator_flags.get("msvs_list_excluded_files", True)
    sources, excluded_sources, excluded_idl = _AdjustSourcesAndConvertToFilterHierarchy(
        spec, options, project_dir, sources, excluded_sources, list_excluded, version
    )

    # Add in files.
    missing_sources = _VerifySourcesExist(sources, project_dir)
    p.AddFiles(sources)

    _AddToolFilesToMSVS(p, spec)
    _HandlePreCompiledHeaders(p, sources, spec)
    _AddActions(actions_to_add, spec, relative_path_of_gyp_file)
    _AddCopies(actions_to_add, spec)
    _WriteMSVSUserFile(project.path, version, spec)

    # NOTE: this stanza must appear after all actions have been decided.
    # Don't excluded sources with actions attached, or they won't run.
    excluded_sources = _FilterActionsFromExcluded(excluded_sources, actions_to_add)
    _ExcludeFilesFromBeingBuilt(p, spec, excluded_sources, excluded_idl, list_excluded)
    _AddAccumulatedActionsToMSVS(p, spec, actions_to_add)

    # Write it out.
    p.WriteIfChanged()

    return missing_sources


def _GetUniquePlatforms(spec):
    """Returns the list of unique platforms for this spec, e.g ['win32', ...].

  Arguments:
    spec: The target dictionary containing the properties of the target.
  Returns:
    The MSVSUserFile object created.
  """
    # Gather list of unique platforms.
    platforms = OrderedSet()
    for configuration in spec["configurations"]:
        platforms.add(_ConfigPlatform(spec["configurations"][configuration]))
    platforms = list(platforms)
    return platforms


def _CreateMSVSUserFile(proj_path, version, spec):
    """Generates a .user file for the user running this Gyp program.

  Arguments:
    proj_path: The path of the project file being created.  The .user file
               shares the same path (with an appropriate suffix).
    version: The VisualStudioVersion object.
    spec: The target dictionary containing the properties of the target.
  Returns:
    The MSVSUserFile object created.
  """
    (domain, username) = _GetDomainAndUserName()
    vcuser_filename = ".".join([proj_path, domain, username, "user"])
    user_file = MSVSUserFile.Writer(vcuser_filename, version, spec["target_name"])
    return user_file


def _GetMSVSConfigurationType(spec, build_file):
    """Returns the configuration type for this project.

  It's a number defined by Microsoft.  May raise an exception.

  Args:
      spec: The target dictionary containing the properties of the target.
      build_file: The path of the gyp file.
  Returns:
      An integer, the configuration type.
  """
    try:
        config_type = {
            "executable": "1",  # .exe
            "shared_library": "2",  # .dll
            "loadable_module": "2",  # .dll
            "static_library": "4",  # .lib
            "windows_driver": "5",  # .sys
            "none": "10",  # Utility type
        }[spec["type"]]
    except KeyError:
        if spec.get("type"):
            raise GypError(
                "Target type %s is not a valid target type for "
                "target %s in %s." % (spec["type"], spec["target_name"], build_file)
            )
        else:
            raise GypError(
                "Missing type field for target %s in %s."
                % (spec["target_name"], build_file)
            )
    return config_type


def _AddConfigurationToMSVSProject(p, spec, config_type, config_name, config):
    """Adds a configuration to the MSVS project.

  Many settings in a vcproj file are specific to a configuration.  This
  function the main part of the vcproj file that's configuration specific.

  Arguments:
    p: The target project being generated.
    spec: The target dictionary containing the properties of the target.
    config_type: The configuration type, a number as defined by Microsoft.
    config_name: The name of the configuration.
    config: The dictionary that defines the special processing to be done
            for this configuration.
  """
    # Get the information for this configuration
    include_dirs, midl_include_dirs, resource_include_dirs = _GetIncludeDirs(config)
    libraries = _GetLibraries(spec)
    library_dirs = _GetLibraryDirs(config)
    out_file, vc_tool, _ = _GetOutputFilePathAndTool(spec, msbuild=False)
    defines = _GetDefines(config)
    defines = [_EscapeCppDefineForMSVS(d) for d in defines]
    disabled_warnings = _GetDisabledWarnings(config)
    prebuild = config.get("msvs_prebuild")
    postbuild = config.get("msvs_postbuild")
    def_file = _GetModuleDefinition(spec)
    precompiled_header = config.get("msvs_precompiled_header")

    # Prepare the list of tools as a dictionary.
    tools = dict()
    # Add in user specified msvs_settings.
    msvs_settings = config.get("msvs_settings", {})
    MSVSSettings.ValidateMSVSSettings(msvs_settings)

    # Prevent default library inheritance from the environment.
    _ToolAppend(tools, "VCLinkerTool", "AdditionalDependencies", ["$(NOINHERIT)"])

    for tool in msvs_settings:
        settings = config["msvs_settings"][tool]
        for setting in settings:
            _ToolAppend(tools, tool, setting, settings[setting])
    # Add the information to the appropriate tool
    _ToolAppend(tools, "VCCLCompilerTool", "AdditionalIncludeDirectories", include_dirs)
    _ToolAppend(tools, "VCMIDLTool", "AdditionalIncludeDirectories", midl_include_dirs)
    _ToolAppend(
        tools,
        "VCResourceCompilerTool",
        "AdditionalIncludeDirectories",
        resource_include_dirs,
    )
    # Add in libraries.
    _ToolAppend(tools, "VCLinkerTool", "AdditionalDependencies", libraries)
    _ToolAppend(tools, "VCLinkerTool", "AdditionalLibraryDirectories", library_dirs)
    if out_file:
        _ToolAppend(tools, vc_tool, "OutputFile", out_file, only_if_unset=True)
    # Add defines.
    _ToolAppend(tools, "VCCLCompilerTool", "PreprocessorDefinitions", defines)
    _ToolAppend(tools, "VCResourceCompilerTool", "PreprocessorDefinitions", defines)
    # Change program database directory to prevent collisions.
    _ToolAppend(
        tools,
        "VCCLCompilerTool",
        "ProgramDataBaseFileName",
        "$(IntDir)$(ProjectName)\\vc80.pdb",
        only_if_unset=True,
    )
    # Add disabled warnings.
    _ToolAppend(tools, "VCCLCompilerTool", "DisableSpecificWarnings", disabled_warnings)
    # Add Pre-build.
    _ToolAppend(tools, "VCPreBuildEventTool", "CommandLine", prebuild)
    # Add Post-build.
    _ToolAppend(tools, "VCPostBuildEventTool", "CommandLine", postbuild)
    # Turn on precompiled headers if appropriate.
    if precompiled_header:
        precompiled_header = os.path.split(precompiled_header)[1]
        _ToolAppend(tools, "VCCLCompilerTool", "UsePrecompiledHeader", "2")
        _ToolAppend(
            tools, "VCCLCompilerTool", "PrecompiledHeaderThrough", precompiled_header
        )
        _ToolAppend(tools, "VCCLCompilerTool", "ForcedIncludeFiles", precompiled_header)
    # Loadable modules don't generate import libraries;
    # tell dependent projects to not expect one.
    if spec["type"] == "loadable_module":
        _ToolAppend(tools, "VCLinkerTool", "IgnoreImportLibrary", "true")
    # Set the module definition file if any.
    if def_file:
        _ToolAppend(tools, "VCLinkerTool", "ModuleDefinitionFile", def_file)

    _AddConfigurationToMSVS(p, spec, tools, config, config_type, config_name)


def _GetIncludeDirs(config):
    """Returns the list of directories to be used for #include directives.

  Arguments:
    config: The dictionary that defines the special processing to be done
            for this configuration.
  Returns:
    The list of directory paths.
  """
    # TODO(bradnelson): include_dirs should really be flexible enough not to
    #                   require this sort of thing.
    include_dirs = config.get("include_dirs", []) + config.get(
        "msvs_system_include_dirs", []
    )
    midl_include_dirs = config.get("midl_include_dirs", []) + config.get(
        "msvs_system_include_dirs", []
    )
    resource_include_dirs = config.get("resource_include_dirs", include_dirs)
    include_dirs = _FixPaths(include_dirs)
    midl_include_dirs = _FixPaths(midl_include_dirs)
    resource_include_dirs = _FixPaths(resource_include_dirs)
    return include_dirs, midl_include_dirs, resource_include_dirs


def _GetLibraryDirs(config):
    """Returns the list of directories to be used for library search paths.

  Arguments:
    config: The dictionary that defines the special processing to be done
            for this configuration.
  Returns:
    The list of directory paths.
  """

    library_dirs = config.get("library_dirs", [])
    library_dirs = _FixPaths(library_dirs)
    return library_dirs


def _GetLibraries(spec):
    """Returns the list of libraries for this configuration.

  Arguments:
    spec: The target dictionary containing the properties of the target.
  Returns:
    The list of directory paths.
  """
    libraries = spec.get("libraries", [])
    # Strip out -l, as it is not used on windows (but is needed so we can pass
    # in libraries that are assumed to be in the default library path).
    # Also remove duplicate entries, leaving only the last duplicate, while
    # preserving order.
    found = OrderedSet()
    unique_libraries_list = []
    for entry in reversed(libraries):
        library = re.sub(r"^\-l", "", entry)
        if not os.path.splitext(library)[1]:
            library += ".lib"
        if library not in found:
            found.add(library)
            unique_libraries_list.append(library)
    unique_libraries_list.reverse()
    return unique_libraries_list


def _GetOutputFilePathAndTool(spec, msbuild):
    """Returns the path and tool to use for this target.

  Figures out the path of the file this spec will create and the name of
  the VC tool that will create it.

  Arguments:
    spec: The target dictionary containing the properties of the target.
  Returns:
    A triple of (file path, name of the vc tool, name of the msbuild tool)
  """
    # Select a name for the output file.
    out_file = ""
    vc_tool = ""
    msbuild_tool = ""
    output_file_map = {
        "executable": ("VCLinkerTool", "Link", "$(OutDir)", ".exe"),
        "shared_library": ("VCLinkerTool", "Link", "$(OutDir)", ".dll"),
        "loadable_module": ("VCLinkerTool", "Link", "$(OutDir)", ".dll"),
        "windows_driver": ("VCLinkerTool", "Link", "$(OutDir)", ".sys"),
        "static_library": ("VCLibrarianTool", "Lib", "$(OutDir)lib\\", ".lib"),
    }
    output_file_props = output_file_map.get(spec["type"])
    if output_file_props and int(spec.get("msvs_auto_output_file", 1)):
        vc_tool, msbuild_tool, out_dir, suffix = output_file_props
        if spec.get("standalone_static_library", 0):
            out_dir = "$(OutDir)"
        out_dir = spec.get("product_dir", out_dir)
        product_extension = spec.get("product_extension")
        if product_extension:
            suffix = "." + product_extension
        elif msbuild:
            suffix = "$(TargetExt)"
        prefix = spec.get("product_prefix", "")
        product_name = spec.get("product_name", "$(ProjectName)")
        out_file = ntpath.join(out_dir, prefix + product_name + suffix)
    return out_file, vc_tool, msbuild_tool


def _GetOutputTargetExt(spec):
    """Returns the extension for this target, including the dot

  If product_extension is specified, set target_extension to this to avoid
  MSB8012, returns None otherwise. Ignores any target_extension settings in
  the input files.

  Arguments:
    spec: The target dictionary containing the properties of the target.
  Returns:
    A string with the extension, or None
  """
    target_extension = spec.get("product_extension")
    if target_extension:
        return "." + target_extension
    return None


def _GetDefines(config):
    """Returns the list of preprocessor definitions for this configuration.

  Arguments:
    config: The dictionary that defines the special processing to be done
            for this configuration.
  Returns:
    The list of preprocessor definitions.
  """
    defines = []
    for d in config.get("defines", []):
        if type(d) == list:
            fd = "=".join([str(dpart) for dpart in d])
        else:
            fd = str(d)
        defines.append(fd)
    return defines


def _GetDisabledWarnings(config):
    return [str(i) for i in config.get("msvs_disabled_warnings", [])]


def _GetModuleDefinition(spec):
    def_file = ""
    if spec["type"] in [
        "shared_library",
        "loadable_module",
        "executable",
        "windows_driver",
    ]:
        def_files = [s for s in spec.get("sources", []) if s.endswith(".def")]
        if len(def_files) == 1:
            def_file = _FixPath(def_files[0])
        elif def_files:
            raise ValueError(
                "Multiple module definition files in one target, target %s lists "
                "multiple .def files: %s" % (spec["target_name"], " ".join(def_files))
            )
    return def_file


def _ConvertToolsToExpectedForm(tools):
    """Convert tools to a form expected by Visual Studio.

  Arguments:
    tools: A dictionary of settings; the tool name is the key.
  Returns:
    A list of Tool objects.
  """
    tool_list = []
    for tool, settings in tools.items():
        # Collapse settings with lists.
        settings_fixed = {}
        for setting, value in settings.items():
            if type(value) == list:
                if (
                    tool == "VCLinkerTool" and setting == "AdditionalDependencies"
                ) or setting == "AdditionalOptions":
                    settings_fixed[setting] = " ".join(value)
                else:
                    settings_fixed[setting] = ";".join(value)
            else:
                settings_fixed[setting] = value
        # Add in this tool.
        tool_list.append(MSVSProject.Tool(tool, settings_fixed))
    return tool_list


def _AddConfigurationToMSVS(p, spec, tools, config, config_type, config_name):
    """Add to the project file the configuration specified by config.

  Arguments:
    p: The target project being generated.
    spec: the target project dict.
    tools: A dictionary of settings; the tool name is the key.
    config: The dictionary that defines the special processing to be done
            for this configuration.
    config_type: The configuration type, a number as defined by Microsoft.
    config_name: The name of the configuration.
  """
    attributes = _GetMSVSAttributes(spec, config, config_type)
    # Add in this configuration.
    tool_list = _ConvertToolsToExpectedForm(tools)
    p.AddConfig(_ConfigFullName(config_name, config), attrs=attributes, tools=tool_list)


def _GetMSVSAttributes(spec, config, config_type):
    # Prepare configuration attributes.
    prepared_attrs = {}
    source_attrs = config.get("msvs_configuration_attributes", {})
    for a in source_attrs:
        prepared_attrs[a] = source_attrs[a]
    # Add props files.
    vsprops_dirs = config.get("msvs_props", [])
    vsprops_dirs = _FixPaths(vsprops_dirs)
    if vsprops_dirs:
        prepared_attrs["InheritedPropertySheets"] = ";".join(vsprops_dirs)
    # Set configuration type.
    prepared_attrs["ConfigurationType"] = config_type
    output_dir = prepared_attrs.get(
        "OutputDirectory", "$(SolutionDir)$(ConfigurationName)"
    )
    prepared_attrs["OutputDirectory"] = _FixPath(output_dir) + "\\"
    if "IntermediateDirectory" not in prepared_attrs:
        intermediate = "$(ConfigurationName)\\obj\\$(ProjectName)"
        prepared_attrs["IntermediateDirectory"] = _FixPath(intermediate) + "\\"
    else:
        intermediate = _FixPath(prepared_attrs["IntermediateDirectory"]) + "\\"
        intermediate = MSVSSettings.FixVCMacroSlashes(intermediate)
        prepared_attrs["IntermediateDirectory"] = intermediate
    return prepared_attrs


def _AddNormalizedSources(sources_set, sources_array):
    sources_set.update(_NormalizedSource(s) for s in sources_array)


def _PrepareListOfSources(spec, generator_flags, gyp_file):
    """Prepare list of sources and excluded sources.

  Besides the sources specified directly in the spec, adds the gyp file so
  that a change to it will cause a re-compile. Also adds appropriate sources
  for actions and copies. Assumes later stage will un-exclude files which
  have custom build steps attached.

  Arguments:
    spec: The target dictionary containing the properties of the target.
    gyp_file: The name of the gyp file.
  Returns:
    A pair of (list of sources, list of excluded sources).
    The sources will be relative to the gyp file.
  """
    sources = OrderedSet()
    _AddNormalizedSources(sources, spec.get("sources", []))
    excluded_sources = OrderedSet()
    # Add in the gyp file.
    if not generator_flags.get("standalone"):
        sources.add(gyp_file)

    # Add in 'action' inputs and outputs.
    for a in spec.get("actions", []):
        inputs = a["inputs"]
        inputs = [_NormalizedSource(i) for i in inputs]
        # Add all inputs to sources and excluded sources.
        inputs = OrderedSet(inputs)
        sources.update(inputs)
        if not spec.get("msvs_external_builder"):
            excluded_sources.update(inputs)
        if int(a.get("process_outputs_as_sources", False)):
            _AddNormalizedSources(sources, a.get("outputs", []))
    # Add in 'copies' inputs and outputs.
    for cpy in spec.get("copies", []):
        _AddNormalizedSources(sources, cpy.get("files", []))
    return (sources, excluded_sources)


def _AdjustSourcesAndConvertToFilterHierarchy(
    spec, options, gyp_dir, sources, excluded_sources, list_excluded, version
):
    """Adjusts the list of sources and excluded sources.

  Also converts the sets to lists.

  Arguments:
    spec: The target dictionary containing the properties of the target.
    options: Global generator options.
    gyp_dir: The path to the gyp file being processed.
    sources: A set of sources to be included for this project.
    excluded_sources: A set of sources to be excluded for this project.
    version: A MSVSVersion object.
  Returns:
    A trio of (list of sources, list of excluded sources,
               path of excluded IDL file)
  """
    # Exclude excluded sources coming into the generator.
    excluded_sources.update(OrderedSet(spec.get("sources_excluded", [])))
    # Add excluded sources into sources for good measure.
    sources.update(excluded_sources)
    # Convert to proper windows form.
    # NOTE: sources goes from being a set to a list here.
    # NOTE: excluded_sources goes from being a set to a list here.
    sources = _FixPaths(sources)
    # Convert to proper windows form.
    excluded_sources = _FixPaths(excluded_sources)

    excluded_idl = _IdlFilesHandledNonNatively(spec, sources)

    precompiled_related = _GetPrecompileRelatedFiles(spec)
    # Find the excluded ones, minus the precompiled header related ones.
    fully_excluded = [i for i in excluded_sources if i not in precompiled_related]

    # Convert to folders and the right slashes.
    sources = [i.split("\\") for i in sources]
    sources = _ConvertSourcesToFilterHierarchy(
        sources,
        excluded=fully_excluded,
        list_excluded=list_excluded,
        msvs_version=version,
    )

    # Prune filters with a single child to flatten ugly directory structures
    # such as ../../src/modules/module1 etc.
    if version.UsesVcxproj():
        while (
            all([isinstance(s, MSVSProject.Filter) for s in sources])
            and len({s.name for s in sources}) == 1
        ):
            assert all([len(s.contents) == 1 for s in sources])
            sources = [s.contents[0] for s in sources]
    else:
        while len(sources) == 1 and isinstance(sources[0], MSVSProject.Filter):
            sources = sources[0].contents

    return sources, excluded_sources, excluded_idl


def _IdlFilesHandledNonNatively(spec, sources):
    # If any non-native rules use 'idl' as an extension exclude idl files.
    # Gather a list here to use later.
    using_idl = False
    for rule in spec.get("rules", []):
        if rule["extension"] == "idl" and int(rule.get("msvs_external_rule", 0)):
            using_idl = True
            break
    if using_idl:
        excluded_idl = [i for i in sources if i.endswith(".idl")]
    else:
        excluded_idl = []
    return excluded_idl


def _GetPrecompileRelatedFiles(spec):
    # Gather a list of precompiled header related sources.
    precompiled_related = []
    for _, config in spec["configurations"].items():
        for k in precomp_keys:
            f = config.get(k)
            if f:
                precompiled_related.append(_FixPath(f))
    return precompiled_related


def _ExcludeFilesFromBeingBuilt(p, spec, excluded_sources, excluded_idl, list_excluded):
    exclusions = _GetExcludedFilesFromBuild(spec, excluded_sources, excluded_idl)
    for file_name, excluded_configs in exclusions.items():
        if not list_excluded and len(excluded_configs) == len(spec["configurations"]):
            # If we're not listing excluded files, then they won't appear in the
            # project, so don't try to configure them to be excluded.
            pass
        else:
            for config_name, config in excluded_configs:
                p.AddFileConfig(
                    file_name,
                    _ConfigFullName(config_name, config),
                    {"ExcludedFromBuild": "true"},
                )


def _GetExcludedFilesFromBuild(spec, excluded_sources, excluded_idl):
    exclusions = {}
    # Exclude excluded sources from being built.
    for f in excluded_sources:
        excluded_configs = []
        for config_name, config in spec["configurations"].items():
            precomped = [_FixPath(config.get(i, "")) for i in precomp_keys]
            # Don't do this for ones that are precompiled header related.
            if f not in precomped:
                excluded_configs.append((config_name, config))
        exclusions[f] = excluded_configs
    # If any non-native rules use 'idl' as an extension exclude idl files.
    # Exclude them now.
    for f in excluded_idl:
        excluded_configs = []
        for config_name, config in spec["configurations"].items():
            excluded_configs.append((config_name, config))
        exclusions[f] = excluded_configs
    return exclusions


def _AddToolFilesToMSVS(p, spec):
    # Add in tool files (rules).
    tool_files = OrderedSet()
    for _, config in spec["configurations"].items():
        for f in config.get("msvs_tool_files", []):
            tool_files.add(f)
    for f in tool_files:
        p.AddToolFile(f)


def _HandlePreCompiledHeaders(p, sources, spec):
    # Pre-compiled header source stubs need a different compiler flag
    # (generate precompiled header) and any source file not of the same
    # kind (i.e. C vs. C++) as the precompiled header source stub needs
    # to have use of precompiled headers disabled.
    extensions_excluded_from_precompile = []
    for config_name, config in spec["configurations"].items():
        source = config.get("msvs_precompiled_source")
        if source:
            source = _FixPath(source)
            # UsePrecompiledHeader=1 for if using precompiled headers.
            tool = MSVSProject.Tool("VCCLCompilerTool", {"UsePrecompiledHeader": "1"})
            p.AddFileConfig(
                source, _ConfigFullName(config_name, config), {}, tools=[tool]
            )
            basename, extension = os.path.splitext(source)
            if extension == ".c":
                extensions_excluded_from_precompile = [".cc", ".cpp", ".cxx"]
            else:
                extensions_excluded_from_precompile = [".c"]

    def DisableForSourceTree(source_tree):
        for source in source_tree:
            if isinstance(source, MSVSProject.Filter):
                DisableForSourceTree(source.contents)
            else:
                basename, extension = os.path.splitext(source)
                if extension in extensions_excluded_from_precompile:
                    for config_name, config in spec["configurations"].items():
                        tool = MSVSProject.Tool(
                            "VCCLCompilerTool",
                            {
                                "UsePrecompiledHeader": "0",
                                "ForcedIncludeFiles": "$(NOINHERIT)",
                            },
                        )
                        p.AddFileConfig(
                            _FixPath(source),
                            _ConfigFullName(config_name, config),
                            {},
                            tools=[tool],
                        )

    # Do nothing if there was no precompiled source.
    if extensions_excluded_from_precompile:
        DisableForSourceTree(sources)


def _AddActions(actions_to_add, spec, relative_path_of_gyp_file):
    # Add actions.
    actions = spec.get("actions", [])
    # Don't setup_env every time. When all the actions are run together in one
    # batch file in VS, the PATH will grow too long.
    # Membership in this set means that the cygwin environment has been set up,
    # and does not need to be set up again.
    have_setup_env = set()
    for a in actions:
        # Attach actions to the gyp file if nothing else is there.
        inputs = a.get("inputs") or [relative_path_of_gyp_file]
        attached_to = inputs[0]
        need_setup_env = attached_to not in have_setup_env
        cmd = _BuildCommandLineForRule(
            spec, a, has_input_path=False, do_setup_env=need_setup_env
        )
        have_setup_env.add(attached_to)
        # Add the action.
        _AddActionStep(
            actions_to_add,
            inputs=inputs,
            outputs=a.get("outputs", []),
            description=a.get("message", a["action_name"]),
            command=cmd,
        )


def _WriteMSVSUserFile(project_path, version, spec):
    # Add run_as and test targets.
    if "run_as" in spec:
        run_as = spec["run_as"]
        action = run_as.get("action", [])
        environment = run_as.get("environment", [])
        working_directory = run_as.get("working_directory", ".")
    elif int(spec.get("test", 0)):
        action = ["$(TargetPath)", "--gtest_print_time"]
        environment = []
        working_directory = "."
    else:
        return  # Nothing to add
    # Write out the user file.
    user_file = _CreateMSVSUserFile(project_path, version, spec)
    for config_name, c_data in spec["configurations"].items():
        user_file.AddDebugSettings(
            _ConfigFullName(config_name, c_data), action, environment, working_directory
        )
    user_file.WriteIfChanged()


def _AddCopies(actions_to_add, spec):
    copies = _GetCopies(spec)
    for inputs, outputs, cmd, description in copies:
        _AddActionStep(
            actions_to_add,
            inputs=inputs,
            outputs=outputs,
            description=description,
            command=cmd,
        )


def _GetCopies(spec):
    copies = []
    # Add copies.
    for cpy in spec.get("copies", []):
        for src in cpy.get("files", []):
            dst = os.path.join(cpy["destination"], os.path.basename(src))
            # _AddCustomBuildToolForMSVS() will call _FixPath() on the inputs and
            # outputs, so do the same for our generated command line.
            if src.endswith("/"):
                src_bare = src[:-1]
                base_dir = posixpath.split(src_bare)[0]
                outer_dir = posixpath.split(src_bare)[1]
                fixed_dst = _FixPath(dst)
                full_dst = f'"{fixed_dst}\\{outer_dir}\\"'
                cmd = 'mkdir {} 2>nul & cd "{}" && xcopy /e /f /y "{}" {}'.format(
                    full_dst,
                    _FixPath(base_dir),
                    outer_dir,
                    full_dst,
                )
                copies.append(
                    (
                        [src],
                        ["dummy_copies", dst],
                        cmd,
                        f"Copying {src} to {fixed_dst}",
                    )
                )
            else:
                fix_dst = _FixPath(cpy["destination"])
                cmd = 'mkdir "{}" 2>nul & set ERRORLEVEL=0 & copy /Y "{}" "{}"'.format(
                    fix_dst,
                    _FixPath(src),
                    _FixPath(dst),
                )
                copies.append(([src], [dst], cmd, f"Copying {src} to {fix_dst}"))
    return copies


def _GetPathDict(root, path):
    # |path| will eventually be empty (in the recursive calls) if it was initially
    # relative; otherwise it will eventually end up as '\', 'D:\', etc.
    if not path or path.endswith(os.sep):
        return root
    parent, folder = os.path.split(path)
    parent_dict = _GetPathDict(root, parent)
    if folder not in parent_dict:
        parent_dict[folder] = dict()
    return parent_dict[folder]


def _DictsToFolders(base_path, bucket, flat):
    # Convert to folders recursively.
    children = []
    for folder, contents in bucket.items():
        if type(contents) == dict:
            folder_children = _DictsToFolders(
                os.path.join(base_path, folder), contents, flat
            )
            if flat:
                children += folder_children
            else:
                folder_children = MSVSNew.MSVSFolder(
                    os.path.join(base_path, folder),
                    name="(" + folder + ")",
                    entries=folder_children,
                )
                children.append(folder_children)
        else:
            children.append(contents)
    return children


def _CollapseSingles(parent, node):
    # Recursively explorer the tree of dicts looking for projects which are
    # the sole item in a folder which has the same name as the project. Bring
    # such projects up one level.
    if type(node) == dict and len(node) == 1 and next(iter(node)) == parent + ".vcproj":
        return node[next(iter(node))]
    if type(node) != dict:
        return node
    for child in node:
        node[child] = _CollapseSingles(child, node[child])
    return node


def _GatherSolutionFolders(sln_projects, project_objects, flat):
    root = {}
    # Convert into a tree of dicts on path.
    for p in sln_projects:
        gyp_file, target = gyp.common.ParseQualifiedTarget(p)[0:2]
        if p.endswith("#host"):
            target += "_host"
        gyp_dir = os.path.dirname(gyp_file)
        path_dict = _GetPathDict(root, gyp_dir)
        path_dict[target + ".vcproj"] = project_objects[p]
    # Walk down from the top until we hit a folder that has more than one entry.
    # In practice, this strips the top-level "src/" dir from the hierarchy in
    # the solution.
    while len(root) == 1 and type(root[next(iter(root))]) == dict:
        root = root[next(iter(root))]
    # Collapse singles.
    root = _CollapseSingles("", root)
    # Merge buckets until everything is a root entry.
    return _DictsToFolders("", root, flat)


def _GetPathOfProject(qualified_target, spec, options, msvs_version):
    default_config = _GetDefaultConfiguration(spec)
    proj_filename = default_config.get("msvs_existing_vcproj")
    if not proj_filename:
        proj_filename = spec["target_name"]
        if spec["toolset"] == "host":
            proj_filename += "_host"
        proj_filename = proj_filename + options.suffix + msvs_version.ProjectExtension()

    build_file = gyp.common.BuildFile(qualified_target)
    proj_path = os.path.join(os.path.dirname(build_file), proj_filename)
    fix_prefix = None
    if options.generator_output:
        project_dir_path = os.path.dirname(os.path.abspath(proj_path))
        proj_path = os.path.join(options.generator_output, proj_path)
        fix_prefix = gyp.common.RelativePath(
            project_dir_path, os.path.dirname(proj_path)
        )
    return proj_path, fix_prefix


def _GetPlatformOverridesOfProject(spec):
    # Prepare a dict indicating which project configurations are used for which
    # solution configurations for this target.
    config_platform_overrides = {}
    for config_name, c in spec["configurations"].items():
        config_fullname = _ConfigFullName(config_name, c)
        platform = c.get("msvs_target_platform", _ConfigPlatform(c))
        fixed_config_fullname = "{}|{}".format(
            _ConfigBaseName(config_name, _ConfigPlatform(c)),
            platform,
        )
        if spec["toolset"] == "host" and generator_supports_multiple_toolsets:
            fixed_config_fullname = f"{config_name}|x64"
        config_platform_overrides[config_fullname] = fixed_config_fullname
    return config_platform_overrides


def _CreateProjectObjects(target_list, target_dicts, options, msvs_version):
    """Create a MSVSProject object for the targets found in target list.

  Arguments:
    target_list: the list of targets to generate project objects for.
    target_dicts: the dictionary of specifications.
    options: global generator options.
    msvs_version: the MSVSVersion object.
  Returns:
    A set of created projects, keyed by target.
  """
    global fixpath_prefix
    # Generate each project.
    projects = {}
    for qualified_target in target_list:
        spec = target_dicts[qualified_target]
        proj_path, fixpath_prefix = _GetPathOfProject(
            qualified_target, spec, options, msvs_version
        )
        guid = _GetGuidOfProject(proj_path, spec)
        overrides = _GetPlatformOverridesOfProject(spec)
        build_file = gyp.common.BuildFile(qualified_target)
        # Create object for this project.
        target_name = spec["target_name"]
        if spec["toolset"] == "host":
            target_name += "_host"
        obj = MSVSNew.MSVSProject(
            proj_path,
            name=target_name,
            guid=guid,
            spec=spec,
            build_file=build_file,
            config_platform_overrides=overrides,
            fixpath_prefix=fixpath_prefix,
        )
        # Set project toolset if any (MS build only)
        if msvs_version.UsesVcxproj():
            obj.set_msbuild_toolset(
                _GetMsbuildToolsetOfProject(proj_path, spec, msvs_version)
            )
        projects[qualified_target] = obj
    # Set all the dependencies, but not if we are using an external builder like
    # ninja
    for project in projects.values():
        if not project.spec.get("msvs_external_builder"):
            deps = project.spec.get("dependencies", [])
            deps = [projects[d] for d in deps]
            project.set_dependencies(deps)
    return projects


def _InitNinjaFlavor(params, target_list, target_dicts):
    """Initialize targets for the ninja flavor.

  This sets up the necessary variables in the targets to generate msvs projects
  that use ninja as an external builder. The variables in the spec are only set
  if they have not been set. This allows individual specs to override the
  default values initialized here.
  Arguments:
    params: Params provided to the generator.
    target_list: List of target pairs: 'base/base.gyp:base'.
    target_dicts: Dict of target properties keyed on target pair.
  """
    for qualified_target in target_list:
        spec = target_dicts[qualified_target]
        if spec.get("msvs_external_builder"):
            # The spec explicitly defined an external builder, so don't change it.
            continue

        path_to_ninja = spec.get("msvs_path_to_ninja", "ninja.exe")

        spec["msvs_external_builder"] = "ninja"
        if not spec.get("msvs_external_builder_out_dir"):
            gyp_file, _, _ = gyp.common.ParseQualifiedTarget(qualified_target)
            gyp_dir = os.path.dirname(gyp_file)
            configuration = "$(Configuration)"
            if params.get("target_arch") == "x64":
                configuration += "_x64"
            if params.get("target_arch") == "arm64":
                configuration += "_arm64"
            spec["msvs_external_builder_out_dir"] = os.path.join(
                gyp.common.RelativePath(params["options"].toplevel_dir, gyp_dir),
                ninja_generator.ComputeOutputDir(params),
                configuration,
            )
        if not spec.get("msvs_external_builder_build_cmd"):
            spec["msvs_external_builder_build_cmd"] = [
                path_to_ninja,
                "-C",
                "$(OutDir)",
                "$(ProjectName)",
            ]
        if not spec.get("msvs_external_builder_clean_cmd"):
            spec["msvs_external_builder_clean_cmd"] = [
                path_to_ninja,
                "-C",
                "$(OutDir)",
                "-tclean",
                "$(ProjectName)",
            ]


def CalculateVariables(default_variables, params):
    """Generated variables that require params to be known."""

    generator_flags = params.get("generator_flags", {})

    # Select project file format version (if unset, default to auto detecting).
    msvs_version = MSVSVersion.SelectVisualStudioVersion(
        generator_flags.get("msvs_version", "auto")
    )
    # Stash msvs_version for later (so we don't have to probe the system twice).
    params["msvs_version"] = msvs_version

    # Set a variable so conditions can be based on msvs_version.
    default_variables["MSVS_VERSION"] = msvs_version.ShortName()

    # To determine processor word size on Windows, in addition to checking
    # PROCESSOR_ARCHITECTURE (which reflects the word size of the current
    # process), it is also necessary to check PROCESSOR_ARCITEW6432 (which
    # contains the actual word size of the system when running thru WOW64).
    if (
        os.environ.get("PROCESSOR_ARCHITECTURE", "").find("64") >= 0
        or os.environ.get("PROCESSOR_ARCHITEW6432", "").find("64") >= 0
    ):
        default_variables["MSVS_OS_BITS"] = 64
    else:
        default_variables["MSVS_OS_BITS"] = 32

    if gyp.common.GetFlavor(params) == "ninja":
        default_variables["SHARED_INTERMEDIATE_DIR"] = "$(OutDir)gen"


def PerformBuild(data, configurations, params):
    options = params["options"]
    msvs_version = params["msvs_version"]
    devenv = os.path.join(msvs_version.path, "Common7", "IDE", "devenv.com")

    for build_file, build_file_dict in data.items():
        (build_file_root, build_file_ext) = os.path.splitext(build_file)
        if build_file_ext != ".gyp":
            continue
        sln_path = build_file_root + options.suffix + ".sln"
        if options.generator_output:
            sln_path = os.path.join(options.generator_output, sln_path)

    for config in configurations:
        arguments = [devenv, sln_path, "/Build", config]
        print(f"Building [{config}]: {arguments}")
        subprocess.check_call(arguments)


def CalculateGeneratorInputInfo(params):
    if params.get("flavor") == "ninja":
        toplevel = params["options"].toplevel_dir
        qualified_out_dir = os.path.normpath(
            os.path.join(
                toplevel,
                ninja_generator.ComputeOutputDir(params),
                "gypfiles-msvs-ninja",
            )
        )

        global generator_filelist_paths
        generator_filelist_paths = {
            "toplevel": toplevel,
            "qualified_out_dir": qualified_out_dir,
        }


def GenerateOutput(target_list, target_dicts, data, params):
    """Generate .sln and .vcproj files.

  This is the entry point for this generator.
  Arguments:
    target_list: List of target pairs: 'base/base.gyp:base'.
    target_dicts: Dict of target properties keyed on target pair.
    data: Dictionary containing per .gyp data.
  """
    global fixpath_prefix

    options = params["options"]

    # Get the project file format version back out of where we stashed it in
    # GeneratorCalculatedVariables.
    msvs_version = params["msvs_version"]

    generator_flags = params.get("generator_flags", {})

    # Optionally shard targets marked with 'msvs_shard': SHARD_COUNT.
    (target_list, target_dicts) = MSVSUtil.ShardTargets(target_list, target_dicts)

    # Optionally use the large PDB workaround for targets marked with
    # 'msvs_large_pdb': 1.
    (target_list, target_dicts) = MSVSUtil.InsertLargePdbShims(
        target_list, target_dicts, generator_default_variables
    )

    # Optionally configure each spec to use ninja as the external builder.
    if params.get("flavor") == "ninja":
        _InitNinjaFlavor(params, target_list, target_dicts)

    # Prepare the set of configurations.
    configs = set()
    for qualified_target in target_list:
        spec = target_dicts[qualified_target]
        for config_name, config in spec["configurations"].items():
            config_name = _ConfigFullName(config_name, config)
            configs.add(config_name)
            if config_name == "Release|arm64":
                configs.add("Release|x64")
    configs = list(configs)

    # Figure out all the projects that will be generated and their guids
    project_objects = _CreateProjectObjects(
        target_list, target_dicts, options, msvs_version
    )

    # Generate each project.
    missing_sources = []
    for project in project_objects.values():
        fixpath_prefix = project.fixpath_prefix
        missing_sources.extend(
            _GenerateProject(project, options, msvs_version, generator_flags, spec)
        )
    fixpath_prefix = None

    for build_file in data:
        # Validate build_file extension
        target_only_configs = configs
        if generator_supports_multiple_toolsets:
            target_only_configs = [i for i in configs if i.endswith("arm64")]
        if not build_file.endswith(".gyp"):
            continue
        sln_path = os.path.splitext(build_file)[0] + options.suffix + ".sln"
        if options.generator_output:
            sln_path = os.path.join(options.generator_output, sln_path)
        # Get projects in the solution, and their dependents.
        sln_projects = gyp.common.BuildFileTargets(target_list, build_file)
        sln_projects += gyp.common.DeepDependencyTargets(target_dicts, sln_projects)
        # Create folder hierarchy.
        root_entries = _GatherSolutionFolders(
            sln_projects, project_objects, flat=msvs_version.FlatSolution()
        )
        # Create solution.
        sln = MSVSNew.MSVSSolution(
            sln_path,
            entries=root_entries,
            variants=target_only_configs,
            websiteProperties=False,
            version=msvs_version,
        )
        sln.Write()

    if missing_sources:
        error_message = "Missing input files:\n" + "\n".join(set(missing_sources))
        if generator_flags.get("msvs_error_on_missing_sources", False):
            raise GypError(error_message)
        else:
            print("Warning: " + error_message, file=sys.stdout)


def _GenerateMSBuildFiltersFile(
    filters_path,
    source_files,
    rule_dependencies,
    extension_to_rule_name,
    platforms,
    toolset,
):
    """Generate the filters file.

  This file is used by Visual Studio to organize the presentation of source
  files into folders.

  Arguments:
      filters_path: The path of the file to be created.
      source_files: The hierarchical structure of all the sources.
      extension_to_rule_name: A dictionary mapping file extensions to rules.
  """
    filter_group = []
    source_group = []
    _AppendFiltersForMSBuild(
        "",
        source_files,
        rule_dependencies,
        extension_to_rule_name,
        platforms,
        toolset,
        filter_group,
        source_group,
    )
    if filter_group:
        content = [
            "Project",
            {
                "ToolsVersion": "4.0",
                "xmlns": "http://schemas.microsoft.com/developer/msbuild/2003",
            },
            ["ItemGroup"] + filter_group,
            ["ItemGroup"] + source_group,
        ]
        easy_xml.WriteXmlIfChanged(content, filters_path, pretty=True, win32=True)
    elif os.path.exists(filters_path):
        # We don't need this filter anymore.  Delete the old filter file.
        os.unlink(filters_path)


def _AppendFiltersForMSBuild(
    parent_filter_name,
    sources,
    rule_dependencies,
    extension_to_rule_name,
    platforms,
    toolset,
    filter_group,
    source_group,
):
    """Creates the list of filters and sources to be added in the filter file.

  Args:
      parent_filter_name: The name of the filter under which the sources are
          found.
      sources: The hierarchy of filters and sources to process.
      extension_to_rule_name: A dictionary mapping file extensions to rules.
      filter_group: The list to which filter entries will be appended.
      source_group: The list to which source entries will be appended.
  """
    for source in sources:
        if isinstance(source, MSVSProject.Filter):
            # We have a sub-filter.  Create the name of that sub-filter.
            if not parent_filter_name:
                filter_name = source.name
            else:
                filter_name = f"{parent_filter_name}\\{source.name}"
            # Add the filter to the group.
            filter_group.append(
                [
                    "Filter",
                    {"Include": filter_name},
                    ["UniqueIdentifier", MSVSNew.MakeGuid(source.name)],
                ]
            )
            # Recurse and add its dependents.
            _AppendFiltersForMSBuild(
                filter_name,
                source.contents,
                rule_dependencies,
                extension_to_rule_name,
                platforms,
                toolset,
                filter_group,
                source_group,
            )
        else:
            # It's a source.  Create a source entry.
            _, element = _MapFileToMsBuildSourceType(
                source, rule_dependencies, extension_to_rule_name, platforms, toolset
            )
            source_entry = [element, {"Include": source}]
            # Specify the filter it is part of, if any.
            if parent_filter_name:
                source_entry.append(["Filter", parent_filter_name])
            source_group.append(source_entry)


def _MapFileToMsBuildSourceType(
    source, rule_dependencies, extension_to_rule_name, platforms, toolset
):
    """Returns the group and element type of the source file.

  Arguments:
      source: The source file name.
      extension_to_rule_name: A dictionary mapping file extensions to rules.

  Returns:
      A pair of (group this file should be part of, the label of element)
  """
    _, ext = os.path.splitext(source)
    ext = ext.lower()
    if ext in extension_to_rule_name:
        group = "rule"
        element = extension_to_rule_name[ext]
    elif ext in [".cc", ".cpp", ".c", ".cxx", ".mm"]:
        group = "compile"
        element = "ClCompile"
    elif ext in [".h", ".hxx"]:
        group = "include"
        element = "ClInclude"
    elif ext == ".rc":
        group = "resource"
        element = "ResourceCompile"
    elif ext in [".s", ".asm"]:
        group = "masm"
        element = "MASM"
        if "arm64" in platforms and toolset == "target":
            element = "MARMASM"
    elif ext == ".idl":
        group = "midl"
        element = "Midl"
    elif source in rule_dependencies:
        group = "rule_dependency"
        element = "CustomBuild"
    else:
        group = "none"
        element = "None"
    return (group, element)


def _GenerateRulesForMSBuild(
    output_dir,
    options,
    spec,
    sources,
    excluded_sources,
    props_files_of_rules,
    targets_files_of_rules,
    actions_to_add,
    rule_dependencies,
    extension_to_rule_name,
):
    # MSBuild rules are implemented using three files: an XML file, a .targets
    # file and a .props file.
    # For more details see:
    # https://devblogs.microsoft.com/cppblog/quick-help-on-vs2010-custom-build-rule/
    rules = spec.get("rules", [])
    rules_native = [r for r in rules if not int(r.get("msvs_external_rule", 0))]
    rules_external = [r for r in rules if int(r.get("msvs_external_rule", 0))]

    msbuild_rules = []
    for rule in rules_native:
        # Skip a rule with no action and no inputs.
        if "action" not in rule and not rule.get("rule_sources", []):
            continue
        msbuild_rule = MSBuildRule(rule, spec)
        msbuild_rules.append(msbuild_rule)
        rule_dependencies.update(msbuild_rule.additional_dependencies.split(";"))
        extension_to_rule_name[msbuild_rule.extension] = msbuild_rule.rule_name
    if msbuild_rules:
        base = spec["target_name"] + options.suffix
        props_name = base + ".props"
        targets_name = base + ".targets"
        xml_name = base + ".xml"

        props_files_of_rules.add(props_name)
        targets_files_of_rules.add(targets_name)

        props_path = os.path.join(output_dir, props_name)
        targets_path = os.path.join(output_dir, targets_name)
        xml_path = os.path.join(output_dir, xml_name)

        _GenerateMSBuildRulePropsFile(props_path, msbuild_rules)
        _GenerateMSBuildRuleTargetsFile(targets_path, msbuild_rules)
        _GenerateMSBuildRuleXmlFile(xml_path, msbuild_rules)

    if rules_external:
        _GenerateExternalRules(
            rules_external, output_dir, spec, sources, options, actions_to_add
        )
    _AdjustSourcesForRules(rules, sources, excluded_sources, True)


class MSBuildRule:
    """Used to store information used to generate an MSBuild rule.

  Attributes:
    rule_name: The rule name, sanitized to use in XML.
    target_name: The name of the target.
    after_targets: The name of the AfterTargets element.
    before_targets: The name of the BeforeTargets element.
    depends_on: The name of the DependsOn element.
    compute_output: The name of the ComputeOutput element.
    dirs_to_make: The name of the DirsToMake element.
    inputs: The name of the _inputs element.
    tlog: The name of the _tlog element.
    extension: The extension this rule applies to.
    description: The message displayed when this rule is invoked.
    additional_dependencies: A string listing additional dependencies.
    outputs: The outputs of this rule.
    command: The command used to run the rule.
  """

    def __init__(self, rule, spec):
        self.display_name = rule["rule_name"]
        # Assure that the rule name is only characters and numbers
        self.rule_name = re.sub(r"\W", "_", self.display_name)
        # Create the various element names, following the example set by the
        # Visual Studio 2008 to 2010 conversion.  I don't know if VS2010
        # is sensitive to the exact names.
        self.target_name = "_" + self.rule_name
        self.after_targets = self.rule_name + "AfterTargets"
        self.before_targets = self.rule_name + "BeforeTargets"
        self.depends_on = self.rule_name + "DependsOn"
        self.compute_output = "Compute%sOutput" % self.rule_name
        self.dirs_to_make = self.rule_name + "DirsToMake"
        self.inputs = self.rule_name + "_inputs"
        self.tlog = self.rule_name + "_tlog"
        self.extension = rule["extension"]
        if not self.extension.startswith("."):
            self.extension = "." + self.extension

        self.description = MSVSSettings.ConvertVCMacrosToMSBuild(
            rule.get("message", self.rule_name)
        )
        old_additional_dependencies = _FixPaths(rule.get("inputs", []))
        self.additional_dependencies = ";".join(
            [
                MSVSSettings.ConvertVCMacrosToMSBuild(i)
                for i in old_additional_dependencies
            ]
        )
        old_outputs = _FixPaths(rule.get("outputs", []))
        self.outputs = ";".join(
            [MSVSSettings.ConvertVCMacrosToMSBuild(i) for i in old_outputs]
        )
        old_command = _BuildCommandLineForRule(
            spec, rule, has_input_path=True, do_setup_env=True
        )
        self.command = MSVSSettings.ConvertVCMacrosToMSBuild(old_command)


def _GenerateMSBuildRulePropsFile(props_path, msbuild_rules):
    """Generate the .props file."""
    content = [
        "Project",
        {"xmlns": "http://schemas.microsoft.com/developer/msbuild/2003"},
    ]
    for rule in msbuild_rules:
        content.extend(
            [
                [
                    "PropertyGroup",
                    {
                        "Condition": "'$(%s)' == '' and '$(%s)' == '' and "
                        "'$(ConfigurationType)' != 'Makefile'"
                        % (rule.before_targets, rule.after_targets)
                    },
                    [rule.before_targets, "Midl"],
                    [rule.after_targets, "CustomBuild"],
                ],
                [
                    "PropertyGroup",
                    [
                        rule.depends_on,
                        {"Condition": "'$(ConfigurationType)' != 'Makefile'"},
                        "_SelectedFiles;$(%s)" % rule.depends_on,
                    ],
                ],
                [
                    "ItemDefinitionGroup",
                    [
                        rule.rule_name,
                        ["CommandLineTemplate", rule.command],
                        ["Outputs", rule.outputs],
                        ["ExecutionDescription", rule.description],
                        ["AdditionalDependencies", rule.additional_dependencies],
                    ],
                ],
            ]
        )
    easy_xml.WriteXmlIfChanged(content, props_path, pretty=True, win32=True)


def _GenerateMSBuildRuleTargetsFile(targets_path, msbuild_rules):
    """Generate the .targets file."""
    content = [
        "Project",
        {"xmlns": "http://schemas.microsoft.com/developer/msbuild/2003"},
    ]
    item_group = [
        "ItemGroup",
        [
            "PropertyPageSchema",
            {"Include": "$(MSBuildThisFileDirectory)$(MSBuildThisFileName).xml"},
        ],
    ]
    for rule in msbuild_rules:
        item_group.append(
            [
                "AvailableItemName",
                {"Include": rule.rule_name},
                ["Targets", rule.target_name],
            ]
        )
    content.append(item_group)

    for rule in msbuild_rules:
        content.append(
            [
                "UsingTask",
                {
                    "TaskName": rule.rule_name,
                    "TaskFactory": "XamlTaskFactory",
                    "AssemblyName": "Microsoft.Build.Tasks.v4.0",
                },
                ["Task", "$(MSBuildThisFileDirectory)$(MSBuildThisFileName).xml"],
            ]
        )
    for rule in msbuild_rules:
        rule_name = rule.rule_name
        target_outputs = "%%(%s.Outputs)" % rule_name
        target_inputs = (
            "%%(%s.Identity);%%(%s.AdditionalDependencies);" "$(MSBuildProjectFile)"
        ) % (rule_name, rule_name)
        rule_inputs = "%%(%s.Identity)" % rule_name
        extension_condition = (
            "'%(Extension)'=='.obj' or "
            "'%(Extension)'=='.res' or "
            "'%(Extension)'=='.rsc' or "
            "'%(Extension)'=='.lib'"
        )
        remove_section = [
            "ItemGroup",
            {"Condition": "'@(SelectedFiles)' != ''"},
            [
                rule_name,
                {
                    "Remove": "@(%s)" % rule_name,
                    "Condition": "'%(Identity)' != '@(SelectedFiles)'",
                },
            ],
        ]
        inputs_section = [
            "ItemGroup",
            [rule.inputs, {"Include": "%%(%s.AdditionalDependencies)" % rule_name}],
        ]
        logging_section = [
            "ItemGroup",
            [
                rule.tlog,
                {
                    "Include": "%%(%s.Outputs)" % rule_name,
                    "Condition": (
                        "'%%(%s.Outputs)' != '' and "
                        "'%%(%s.ExcludedFromBuild)' != 'true'" % (rule_name, rule_name)
                    ),
                },
                ["Source", "@(%s, '|')" % rule_name],
                ["Inputs", "@(%s -> '%%(Fullpath)', ';')" % rule.inputs],
            ],
        ]
        message_section = [
            "Message",
            {"Importance": "High", "Text": "%%(%s.ExecutionDescription)" % rule_name},
        ]
        write_tlog_section = [
            "WriteLinesToFile",
            {
                "Condition": "'@(%s)' != '' and '%%(%s.ExcludedFromBuild)' != "
                "'true'" % (rule.tlog, rule.tlog),
                "File": "$(IntDir)$(ProjectName).write.1.tlog",
                "Lines": "^%%(%s.Source);@(%s->'%%(Fullpath)')"
                % (rule.tlog, rule.tlog),
            },
        ]
        read_tlog_section = [
            "WriteLinesToFile",
            {
                "Condition": "'@(%s)' != '' and '%%(%s.ExcludedFromBuild)' != "
                "'true'" % (rule.tlog, rule.tlog),
                "File": "$(IntDir)$(ProjectName).read.1.tlog",
                "Lines": f"^%({rule.tlog}.Source);%({rule.tlog}.Inputs)",
            },
        ]
        command_and_input_section = [
            rule_name,
            {
                "Condition": "'@(%s)' != '' and '%%(%s.ExcludedFromBuild)' != "
                "'true'" % (rule_name, rule_name),
                "EchoOff": "true",
                "StandardOutputImportance": "High",
                "StandardErrorImportance": "High",
                "CommandLineTemplate": "%%(%s.CommandLineTemplate)" % rule_name,
                "AdditionalOptions": "%%(%s.AdditionalOptions)" % rule_name,
                "Inputs": rule_inputs,
            },
        ]
        content.extend(
            [
                [
                    "Target",
                    {
                        "Name": rule.target_name,
                        "BeforeTargets": "$(%s)" % rule.before_targets,
                        "AfterTargets": "$(%s)" % rule.after_targets,
                        "Condition": "'@(%s)' != ''" % rule_name,
                        "DependsOnTargets": "$(%s);%s"
                        % (rule.depends_on, rule.compute_output),
                        "Outputs": target_outputs,
                        "Inputs": target_inputs,
                    },
                    remove_section,
                    inputs_section,
                    logging_section,
                    message_section,
                    write_tlog_section,
                    read_tlog_section,
                    command_and_input_section,
                ],
                [
                    "PropertyGroup",
                    [
                        "ComputeLinkInputsTargets",
                        "$(ComputeLinkInputsTargets);",
                        "%s;" % rule.compute_output,
                    ],
                    [
                        "ComputeLibInputsTargets",
                        "$(ComputeLibInputsTargets);",
                        "%s;" % rule.compute_output,
                    ],
                ],
                [
                    "Target",
                    {
                        "Name": rule.compute_output,
                        "Condition": "'@(%s)' != ''" % rule_name,
                    },
                    [
                        "ItemGroup",
                        [
                            rule.dirs_to_make,
                            {
                                "Condition": "'@(%s)' != '' and "
                                "'%%(%s.ExcludedFromBuild)' != 'true'"
                                % (rule_name, rule_name),
                                "Include": "%%(%s.Outputs)" % rule_name,
                            },
                        ],
                        [
                            "Link",
                            {
                                "Include": "%%(%s.Identity)" % rule.dirs_to_make,
                                "Condition": extension_condition,
                            },
                        ],
                        [
                            "Lib",
                            {
                                "Include": "%%(%s.Identity)" % rule.dirs_to_make,
                                "Condition": extension_condition,
                            },
                        ],
                        [
                            "ImpLib",
                            {
                                "Include": "%%(%s.Identity)" % rule.dirs_to_make,
                                "Condition": extension_condition,
                            },
                        ],
                    ],
                    [
                        "MakeDir",
                        {
                            "Directories": (
                                "@(%s->'%%(RootDir)%%(Directory)')" % rule.dirs_to_make
                            )
                        },
                    ],
                ],
            ]
        )
    easy_xml.WriteXmlIfChanged(content, targets_path, pretty=True, win32=True)


def _GenerateMSBuildRuleXmlFile(xml_path, msbuild_rules):
    # Generate the .xml file
    content = [
        "ProjectSchemaDefinitions",
        {
            "xmlns": (
                "clr-namespace:Microsoft.Build.Framework.XamlTypes;"
                "assembly=Microsoft.Build.Framework"
            ),
            "xmlns:x": "http://schemas.microsoft.com/winfx/2006/xaml",
            "xmlns:sys": "clr-namespace:System;assembly=mscorlib",
            "xmlns:transformCallback": "Microsoft.Cpp.Dev10.ConvertPropertyCallback",
        },
    ]
    for rule in msbuild_rules:
        content.extend(
            [
                [
                    "Rule",
                    {
                        "Name": rule.rule_name,
                        "PageTemplate": "tool",
                        "DisplayName": rule.display_name,
                        "Order": "200",
                    },
                    [
                        "Rule.DataSource",
                        [
                            "DataSource",
                            {"Persistence": "ProjectFile", "ItemType": rule.rule_name},
                        ],
                    ],
                    [
                        "Rule.Categories",
                        [
                            "Category",
                            {"Name": "General"},
                            ["Category.DisplayName", ["sys:String", "General"]],
                        ],
                        [
                            "Category",
                            {"Name": "Command Line", "Subtype": "CommandLine"},
                            ["Category.DisplayName", ["sys:String", "Command Line"]],
                        ],
                    ],
                    [
                        "StringListProperty",
                        {
                            "Name": "Inputs",
                            "Category": "Command Line",
                            "IsRequired": "true",
                            "Switch": " ",
                        },
                        [
                            "StringListProperty.DataSource",
                            [
                                "DataSource",
                                {
                                    "Persistence": "ProjectFile",
                                    "ItemType": rule.rule_name,
                                    "SourceType": "Item",
                                },
                            ],
                        ],
                    ],
                    [
                        "StringProperty",
                        {
                            "Name": "CommandLineTemplate",
                            "DisplayName": "Command Line",
                            "Visible": "False",
                            "IncludeInCommandLine": "False",
                        },
                    ],
                    [
                        "DynamicEnumProperty",
                        {
                            "Name": rule.before_targets,
                            "Category": "General",
                            "EnumProvider": "Targets",
                            "IncludeInCommandLine": "False",
                        },
                        [
                            "DynamicEnumProperty.DisplayName",
                            ["sys:String", "Execute Before"],
                        ],
                        [
                            "DynamicEnumProperty.Description",
                            [
                                "sys:String",
                                "Specifies the targets for the build customization"
                                " to run before.",
                            ],
                        ],
                        [
                            "DynamicEnumProperty.ProviderSettings",
                            [
                                "NameValuePair",
                                {
                                    "Name": "Exclude",
                                    "Value": "^%s|^Compute" % rule.before_targets,
                                },
                            ],
                        ],
                        [
                            "DynamicEnumProperty.DataSource",
                            [
                                "DataSource",
                                {
                                    "Persistence": "ProjectFile",
                                    "HasConfigurationCondition": "true",
                                },
                            ],
                        ],
                    ],
                    [
                        "DynamicEnumProperty",
                        {
                            "Name": rule.after_targets,
                            "Category": "General",
                            "EnumProvider": "Targets",
                            "IncludeInCommandLine": "False",
                        },
                        [
                            "DynamicEnumProperty.DisplayName",
                            ["sys:String", "Execute After"],
                        ],
                        [
                            "DynamicEnumProperty.Description",
                            [
                                "sys:String",
                                (
                                    "Specifies the targets for the build customization"
                                    " to run after."
                                ),
                            ],
                        ],
                        [
                            "DynamicEnumProperty.ProviderSettings",
                            [
                                "NameValuePair",
                                {
                                    "Name": "Exclude",
                                    "Value": "^%s|^Compute" % rule.after_targets,
                                },
                            ],
                        ],
                        [
                            "DynamicEnumProperty.DataSource",
                            [
                                "DataSource",
                                {
                                    "Persistence": "ProjectFile",
                                    "ItemType": "",
                                    "HasConfigurationCondition": "true",
                                },
                            ],
                        ],
                    ],
                    [
                        "StringListProperty",
                        {
                            "Name": "Outputs",
                            "DisplayName": "Outputs",
                            "Visible": "False",
                            "IncludeInCommandLine": "False",
                        },
                    ],
                    [
                        "StringProperty",
                        {
                            "Name": "ExecutionDescription",
                            "DisplayName": "Execution Description",
                            "Visible": "False",
                            "IncludeInCommandLine": "False",
                        },
                    ],
                    [
                        "StringListProperty",
                        {
                            "Name": "AdditionalDependencies",
                            "DisplayName": "Additional Dependencies",
                            "IncludeInCommandLine": "False",
                            "Visible": "false",
                        },
                    ],
                    [
                        "StringProperty",
                        {
                            "Subtype": "AdditionalOptions",
                            "Name": "AdditionalOptions",
                            "Category": "Command Line",
                        },
                        [
                            "StringProperty.DisplayName",
                            ["sys:String", "Additional Options"],
                        ],
                        [
                            "StringProperty.Description",
                            ["sys:String", "Additional Options"],
                        ],
                    ],
                ],
                [
                    "ItemType",
                    {"Name": rule.rule_name, "DisplayName": rule.display_name},
                ],
                [
                    "FileExtension",
                    {"Name": "*" + rule.extension, "ContentType": rule.rule_name},
                ],
                [
                    "ContentType",
                    {
                        "Name": rule.rule_name,
                        "DisplayName": "",
                        "ItemType": rule.rule_name,
                    },
                ],
            ]
        )
    easy_xml.WriteXmlIfChanged(content, xml_path, pretty=True, win32=True)


def _GetConfigurationAndPlatform(name, settings, spec):
    configuration = name.rsplit("_", 1)[0]
    platform = settings.get("msvs_configuration_platform", "Win32")
    if spec["toolset"] == "host" and platform == "arm64":
        platform = "x64"  # Host-only tools are always built for x64
    return (configuration, platform)


def _GetConfigurationCondition(name, settings, spec):
    return r"'$(Configuration)|$(Platform)'=='%s|%s'" % _GetConfigurationAndPlatform(
        name, settings, spec
    )


def _GetMSBuildProjectConfigurations(configurations, spec):
    group = ["ItemGroup", {"Label": "ProjectConfigurations"}]
    for (name, settings) in sorted(configurations.items()):
        configuration, platform = _GetConfigurationAndPlatform(name, settings, spec)
        designation = f"{configuration}|{platform}"
        group.append(
            [
                "ProjectConfiguration",
                {"Include": designation},
                ["Configuration", configuration],
                ["Platform", platform],
            ]
        )
    return [group]


def _GetMSBuildGlobalProperties(spec, version, guid, gyp_file_name):
    namespace = os.path.splitext(gyp_file_name)[0]
    properties = [
        [
            "PropertyGroup",
            {"Label": "Globals"},
            ["ProjectGuid", guid],
            ["Keyword", "Win32Proj"],
            ["RootNamespace", namespace],
            ["IgnoreWarnCompileDuplicatedFilename", "true"],
        ]
    ]

    if (
        os.environ.get("PROCESSOR_ARCHITECTURE") == "AMD64"
        or os.environ.get("PROCESSOR_ARCHITEW6432") == "AMD64"
    ):
        properties[0].append(["PreferredToolArchitecture", "x64"])

    if spec.get("msvs_target_platform_version"):
        target_platform_version = spec.get("msvs_target_platform_version")
        properties[0].append(["WindowsTargetPlatformVersion", target_platform_version])
        if spec.get("msvs_target_platform_minversion"):
            target_platform_minversion = spec.get("msvs_target_platform_minversion")
            properties[0].append(
                ["WindowsTargetPlatformMinVersion", target_platform_minversion]
            )
        else:
            properties[0].append(
                ["WindowsTargetPlatformMinVersion", target_platform_version]
            )

    if spec.get("msvs_enable_winrt"):
        properties[0].append(["DefaultLanguage", "en-US"])
        properties[0].append(["AppContainerApplication", "true"])
        if spec.get("msvs_application_type_revision"):
            app_type_revision = spec.get("msvs_application_type_revision")
            properties[0].append(["ApplicationTypeRevision", app_type_revision])
        else:
            properties[0].append(["ApplicationTypeRevision", "8.1"])
        if spec.get("msvs_enable_winphone"):
            properties[0].append(["ApplicationType", "Windows Phone"])
        else:
            properties[0].append(["ApplicationType", "Windows Store"])

    platform_name = None
    msvs_windows_sdk_version = None
    for configuration in spec["configurations"].values():
        platform_name = platform_name or _ConfigPlatform(configuration)
        msvs_windows_sdk_version = (
            msvs_windows_sdk_version
            or _ConfigWindowsTargetPlatformVersion(configuration, version)
        )
        if platform_name and msvs_windows_sdk_version:
            break
    if msvs_windows_sdk_version:
        properties[0].append(
            ["WindowsTargetPlatformVersion", str(msvs_windows_sdk_version)]
        )
    elif version.compatible_sdks:
        raise GypError(
            "%s requires any SDK of %s version, but none were found"
            % (version.description, version.compatible_sdks)
        )

    if platform_name == "ARM":
        properties[0].append(["WindowsSDKDesktopARMSupport", "true"])

    return properties


def _GetMSBuildConfigurationDetails(spec, build_file):
    properties = {}
    for name, settings in spec["configurations"].items():
        msbuild_attributes = _GetMSBuildAttributes(spec, settings, build_file)
        condition = _GetConfigurationCondition(name, settings, spec)
        character_set = msbuild_attributes.get("CharacterSet")
        config_type = msbuild_attributes.get("ConfigurationType")
        _AddConditionalProperty(properties, condition, "ConfigurationType", config_type)
        if config_type == "Driver":
            _AddConditionalProperty(properties, condition, "DriverType", "WDM")
            _AddConditionalProperty(
                properties, condition, "TargetVersion", _ConfigTargetVersion(settings)
            )
        if character_set:
            if "msvs_enable_winrt" not in spec:
                _AddConditionalProperty(
                    properties, condition, "CharacterSet", character_set
                )
    return _GetMSBuildPropertyGroup(spec, "Configuration", properties)


def _GetMSBuildLocalProperties(msbuild_toolset):
    # Currently the only local property we support is PlatformToolset
    properties = {}
    if msbuild_toolset:
        properties = [
            [
                "PropertyGroup",
                {"Label": "Locals"},
                ["PlatformToolset", msbuild_toolset],
            ]
        ]
    return properties


def _GetMSBuildPropertySheets(configurations, spec):
    user_props = r"$(UserRootDir)\Microsoft.Cpp.$(Platform).user.props"
    additional_props = {}
    props_specified = False
    for name, settings in sorted(configurations.items()):
        configuration = _GetConfigurationCondition(name, settings, spec)
        if "msbuild_props" in settings:
            additional_props[configuration] = _FixPaths(settings["msbuild_props"])
            props_specified = True
        else:
            additional_props[configuration] = ""

    if not props_specified:
        return [
            [
                "ImportGroup",
                {"Label": "PropertySheets"},
                [
                    "Import",
                    {
                        "Project": user_props,
                        "Condition": "exists('%s')" % user_props,
                        "Label": "LocalAppDataPlatform",
                    },
                ],
            ]
        ]
    else:
        sheets = []
        for condition, props in additional_props.items():
            import_group = [
                "ImportGroup",
                {"Label": "PropertySheets", "Condition": condition},
                [
                    "Import",
                    {
                        "Project": user_props,
                        "Condition": "exists('%s')" % user_props,
                        "Label": "LocalAppDataPlatform",
                    },
                ],
            ]
            for props_file in props:
                import_group.append(["Import", {"Project": props_file}])
            sheets.append(import_group)
        return sheets


def _ConvertMSVSBuildAttributes(spec, config, build_file):
    config_type = _GetMSVSConfigurationType(spec, build_file)
    msvs_attributes = _GetMSVSAttributes(spec, config, config_type)
    msbuild_attributes = {}
    for a in msvs_attributes:
        if a in ["IntermediateDirectory", "OutputDirectory"]:
            directory = MSVSSettings.ConvertVCMacrosToMSBuild(msvs_attributes[a])
            if not directory.endswith("\\"):
                directory += "\\"
            msbuild_attributes[a] = directory
        elif a == "CharacterSet":
            msbuild_attributes[a] = _ConvertMSVSCharacterSet(msvs_attributes[a])
        elif a == "ConfigurationType":
            msbuild_attributes[a] = _ConvertMSVSConfigurationType(msvs_attributes[a])
        else:
            print("Warning: Do not know how to convert MSVS attribute " + a)
    return msbuild_attributes


def _ConvertMSVSCharacterSet(char_set):
    if char_set.isdigit():
        char_set = {"0": "MultiByte", "1": "Unicode", "2": "MultiByte"}[char_set]
    return char_set


def _ConvertMSVSConfigurationType(config_type):
    if config_type.isdigit():
        config_type = {
            "1": "Application",
            "2": "DynamicLibrary",
            "4": "StaticLibrary",
            "5": "Driver",
            "10": "Utility",
        }[config_type]
    return config_type


def _GetMSBuildAttributes(spec, config, build_file):
    if "msbuild_configuration_attributes" not in config:
        msbuild_attributes = _ConvertMSVSBuildAttributes(spec, config, build_file)

    else:
        config_type = _GetMSVSConfigurationType(spec, build_file)
        config_type = _ConvertMSVSConfigurationType(config_type)
        msbuild_attributes = config.get("msbuild_configuration_attributes", {})
        msbuild_attributes.setdefault("ConfigurationType", config_type)
        output_dir = msbuild_attributes.get(
            "OutputDirectory", "$(SolutionDir)$(Configuration)"
        )
        msbuild_attributes["OutputDirectory"] = _FixPath(output_dir) + "\\"
        if "IntermediateDirectory" not in msbuild_attributes:
            intermediate = _FixPath("$(Configuration)") + "\\"
            msbuild_attributes["IntermediateDirectory"] = intermediate
        if "CharacterSet" in msbuild_attributes:
            msbuild_attributes["CharacterSet"] = _ConvertMSVSCharacterSet(
                msbuild_attributes["CharacterSet"]
            )
    if "TargetName" not in msbuild_attributes:
        prefix = spec.get("product_prefix", "")
        product_name = spec.get("product_name", "$(ProjectName)")
        target_name = prefix + product_name
        msbuild_attributes["TargetName"] = target_name
    if "TargetExt" not in msbuild_attributes and "product_extension" in spec:
        ext = spec.get("product_extension")
        msbuild_attributes["TargetExt"] = "." + ext

    if spec.get("msvs_external_builder"):
        external_out_dir = spec.get("msvs_external_builder_out_dir", ".")
        msbuild_attributes["OutputDirectory"] = _FixPath(external_out_dir) + "\\"

    # Make sure that 'TargetPath' matches 'Lib.OutputFile' or 'Link.OutputFile'
    # (depending on the tool used) to avoid MSB8012 warning.
    msbuild_tool_map = {
        "executable": "Link",
        "shared_library": "Link",
        "loadable_module": "Link",
        "windows_driver": "Link",
        "static_library": "Lib",
    }
    msbuild_tool = msbuild_tool_map.get(spec["type"])
    if msbuild_tool:
        msbuild_settings = config["finalized_msbuild_settings"]
        out_file = msbuild_settings[msbuild_tool].get("OutputFile")
        if out_file:
            msbuild_attributes["TargetPath"] = _FixPath(out_file)
        target_ext = msbuild_settings[msbuild_tool].get("TargetExt")
        if target_ext:
            msbuild_attributes["TargetExt"] = target_ext

    return msbuild_attributes


def _GetMSBuildConfigurationGlobalProperties(spec, configurations, build_file):
    # TODO(jeanluc) We could optimize out the following and do it only if
    # there are actions.
    # TODO(jeanluc) Handle the equivalent of setting 'CYGWIN=nontsec'.
    new_paths = []
    cygwin_dirs = spec.get("msvs_cygwin_dirs", ["."])[0]
    if cygwin_dirs:
        cyg_path = "$(MSBuildProjectDirectory)\\%s\\bin\\" % _FixPath(cygwin_dirs)
        new_paths.append(cyg_path)
        # TODO(jeanluc) Change the convention to have both a cygwin_dir and a
        # python_dir.
        python_path = cyg_path.replace("cygwin\\bin", "python_26")
        new_paths.append(python_path)
        if new_paths:
            new_paths = "$(ExecutablePath);" + ";".join(new_paths)

    properties = {}
    for (name, configuration) in sorted(configurations.items()):
        condition = _GetConfigurationCondition(name, configuration, spec)
        attributes = _GetMSBuildAttributes(spec, configuration, build_file)
        msbuild_settings = configuration["finalized_msbuild_settings"]
        _AddConditionalProperty(
            properties, condition, "IntDir", attributes["IntermediateDirectory"]
        )
        _AddConditionalProperty(
            properties, condition, "OutDir", attributes["OutputDirectory"]
        )
        _AddConditionalProperty(
            properties, condition, "TargetName", attributes["TargetName"]
        )
        if "TargetExt" in attributes:
            _AddConditionalProperty(
                properties, condition, "TargetExt", attributes["TargetExt"]
            )

        if attributes.get("TargetPath"):
            _AddConditionalProperty(
                properties, condition, "TargetPath", attributes["TargetPath"]
            )
        if attributes.get("TargetExt"):
            _AddConditionalProperty(
                properties, condition, "TargetExt", attributes["TargetExt"]
            )

        if new_paths:
            _AddConditionalProperty(properties, condition, "ExecutablePath", new_paths)
        tool_settings = msbuild_settings.get("", {})
        for name, value in sorted(tool_settings.items()):
            formatted_value = _GetValueFormattedForMSBuild("", name, value)
            _AddConditionalProperty(properties, condition, name, formatted_value)
    return _GetMSBuildPropertyGroup(spec, None, properties)


def _AddConditionalProperty(properties, condition, name, value):
    """Adds a property / conditional value pair to a dictionary.

  Arguments:
    properties: The dictionary to be modified.  The key is the name of the
        property.  The value is itself a dictionary; its key is the value and
        the value a list of condition for which this value is true.
    condition: The condition under which the named property has the value.
    name: The name of the property.
    value: The value of the property.
  """
    if name not in properties:
        properties[name] = {}
    values = properties[name]
    if value not in values:
        values[value] = []
    conditions = values[value]
    conditions.append(condition)


# Regex for msvs variable references ( i.e. $(FOO) ).
MSVS_VARIABLE_REFERENCE = re.compile(r"\$\(([a-zA-Z_][a-zA-Z0-9_]*)\)")


def _GetMSBuildPropertyGroup(spec, label, properties):
    """Returns a PropertyGroup definition for the specified properties.

  Arguments:
    spec: The target project dict.
    label: An optional label for the PropertyGroup.
    properties: The dictionary to be converted.  The key is the name of the
        property.  The value is itself a dictionary; its key is the value and
        the value a list of condition for which this value is true.
  """
    group = ["PropertyGroup"]
    if label:
        group.append({"Label": label})
    num_configurations = len(spec["configurations"])

    def GetEdges(node):
        # Use a definition of edges such that user_of_variable -> used_varible.
        # This happens to be easier in this case, since a variable's
        # definition contains all variables it references in a single string.
        edges = set()
        for value in sorted(properties[node].keys()):
            # Add to edges all $(...) references to variables.
            #
            # Variable references that refer to names not in properties are excluded
            # These can exist for instance to refer built in definitions like
            # $(SolutionDir).
            #
            # Self references are ignored. Self reference is used in a few places to
            # append to the default value. I.e. PATH=$(PATH);other_path
            edges.update(
                {
                    v
                    for v in MSVS_VARIABLE_REFERENCE.findall(value)
                    if v in properties and v != node
                }
            )
        return edges

    properties_ordered = gyp.common.TopologicallySorted(properties.keys(), GetEdges)
    # Walk properties in the reverse of a topological sort on
    # user_of_variable -> used_variable as this ensures variables are
    # defined before they are used.
    # NOTE: reverse(topsort(DAG)) = topsort(reverse_edges(DAG))
    for name in reversed(properties_ordered):
        values = properties[name]
        for value, conditions in sorted(values.items()):
            if len(conditions) == num_configurations:
                # If the value is the same all configurations,
                # just add one unconditional entry.
                group.append([name, value])
            else:
                for condition in conditions:
                    group.append([name, {"Condition": condition}, value])
    return [group]


def _GetMSBuildToolSettingsSections(spec, configurations):
    groups = []
    for (name, configuration) in sorted(configurations.items()):
        msbuild_settings = configuration["finalized_msbuild_settings"]
        group = [
            "ItemDefinitionGroup",
            {"Condition": _GetConfigurationCondition(name, configuration, spec)},
        ]
        for tool_name, tool_settings in sorted(msbuild_settings.items()):
            # Skip the tool named '' which is a holder of global settings handled
            # by _GetMSBuildConfigurationGlobalProperties.
            if tool_name:
                if tool_settings:
                    tool = [tool_name]
                    for name, value in sorted(tool_settings.items()):
                        formatted_value = _GetValueFormattedForMSBuild(
                            tool_name, name, value
                        )
                        tool.append([name, formatted_value])
                    group.append(tool)
        groups.append(group)
    return groups


def _FinalizeMSBuildSettings(spec, configuration):
    if "msbuild_settings" in configuration:
        converted = False
        msbuild_settings = configuration["msbuild_settings"]
        MSVSSettings.ValidateMSBuildSettings(msbuild_settings)
    else:
        converted = True
        msvs_settings = configuration.get("msvs_settings", {})
        msbuild_settings = MSVSSettings.ConvertToMSBuildSettings(msvs_settings)
    include_dirs, midl_include_dirs, resource_include_dirs = _GetIncludeDirs(
        configuration
    )
    libraries = _GetLibraries(spec)
    library_dirs = _GetLibraryDirs(configuration)
    out_file, _, msbuild_tool = _GetOutputFilePathAndTool(spec, msbuild=True)
    target_ext = _GetOutputTargetExt(spec)
    defines = _GetDefines(configuration)
    if converted:
        # Visual Studio 2010 has TR1
        defines = [d for d in defines if d != "_HAS_TR1=0"]
        # Warn of ignored settings
        ignored_settings = ["msvs_tool_files"]
        for ignored_setting in ignored_settings:
            value = configuration.get(ignored_setting)
            if value:
                print(
                    "Warning: The automatic conversion to MSBuild does not handle "
                    "%s.  Ignoring setting of %s" % (ignored_setting, str(value))
                )

    defines = [_EscapeCppDefineForMSBuild(d) for d in defines]
    disabled_warnings = _GetDisabledWarnings(configuration)
    prebuild = configuration.get("msvs_prebuild")
    postbuild = configuration.get("msvs_postbuild")
    def_file = _GetModuleDefinition(spec)
    precompiled_header = configuration.get("msvs_precompiled_header")

    # Add the information to the appropriate tool
    # TODO(jeanluc) We could optimize and generate these settings only if
    # the corresponding files are found, e.g. don't generate ResourceCompile
    # if you don't have any resources.
    _ToolAppend(
        msbuild_settings, "ClCompile", "AdditionalIncludeDirectories", include_dirs
    )
    _ToolAppend(
        msbuild_settings, "Midl", "AdditionalIncludeDirectories", midl_include_dirs
    )
    _ToolAppend(
        msbuild_settings,
        "ResourceCompile",
        "AdditionalIncludeDirectories",
        resource_include_dirs,
    )
    # Add in libraries, note that even for empty libraries, we want this
    # set, to prevent inheriting default libraries from the environment.
    _ToolSetOrAppend(msbuild_settings, "Link", "AdditionalDependencies", libraries)
    _ToolAppend(msbuild_settings, "Link", "AdditionalLibraryDirectories", library_dirs)
    if out_file:
        _ToolAppend(
            msbuild_settings, msbuild_tool, "OutputFile", out_file, only_if_unset=True
        )
    if target_ext:
        _ToolAppend(
            msbuild_settings, msbuild_tool, "TargetExt", target_ext, only_if_unset=True
        )
    # Add defines.
    _ToolAppend(msbuild_settings, "ClCompile", "PreprocessorDefinitions", defines)
    _ToolAppend(msbuild_settings, "ResourceCompile", "PreprocessorDefinitions", defines)
    # Add disabled warnings.
    _ToolAppend(
        msbuild_settings, "ClCompile", "DisableSpecificWarnings", disabled_warnings
    )
    # Turn on precompiled headers if appropriate.
    if precompiled_header:
        precompiled_header = os.path.split(precompiled_header)[1]
        _ToolAppend(msbuild_settings, "ClCompile", "PrecompiledHeader", "Use")
        _ToolAppend(
            msbuild_settings, "ClCompile", "PrecompiledHeaderFile", precompiled_header
        )
        _ToolAppend(
            msbuild_settings, "ClCompile", "ForcedIncludeFiles", [precompiled_header]
        )
    else:
        _ToolAppend(msbuild_settings, "ClCompile", "PrecompiledHeader", "NotUsing")
    # Turn off WinRT compilation
    _ToolAppend(msbuild_settings, "ClCompile", "CompileAsWinRT", "false")
    # Turn on import libraries if appropriate
    if spec.get("msvs_requires_importlibrary"):
        _ToolAppend(msbuild_settings, "", "IgnoreImportLibrary", "false")
    # Loadable modules don't generate import libraries;
    # tell dependent projects to not expect one.
    if spec["type"] == "loadable_module":
        _ToolAppend(msbuild_settings, "", "IgnoreImportLibrary", "true")
    # Set the module definition file if any.
    if def_file:
        _ToolAppend(msbuild_settings, "Link", "ModuleDefinitionFile", def_file)
    configuration["finalized_msbuild_settings"] = msbuild_settings
    if prebuild:
        _ToolAppend(msbuild_settings, "PreBuildEvent", "Command", prebuild)
    if postbuild:
        _ToolAppend(msbuild_settings, "PostBuildEvent", "Command", postbuild)


def _GetValueFormattedForMSBuild(tool_name, name, value):
    if type(value) == list:
        # For some settings, VS2010 does not automatically extends the settings
        # TODO(jeanluc) Is this what we want?
        if name in [
            "AdditionalIncludeDirectories",
            "AdditionalLibraryDirectories",
            "AdditionalOptions",
            "DelayLoadDLLs",
            "DisableSpecificWarnings",
            "PreprocessorDefinitions",
        ]:
            value.append("%%(%s)" % name)
        # For most tools, entries in a list should be separated with ';' but some
        # settings use a space.  Check for those first.
        exceptions = {
            "ClCompile": ["AdditionalOptions"],
            "Link": ["AdditionalOptions"],
            "Lib": ["AdditionalOptions"],
        }
        if tool_name in exceptions and name in exceptions[tool_name]:
            char = " "
        else:
            char = ";"
        formatted_value = char.join(
            [MSVSSettings.ConvertVCMacrosToMSBuild(i) for i in value]
        )
    else:
        formatted_value = MSVSSettings.ConvertVCMacrosToMSBuild(value)
    return formatted_value


def _VerifySourcesExist(sources, root_dir):
    """Verifies that all source files exist on disk.

  Checks that all regular source files, i.e. not created at run time,
  exist on disk.  Missing files cause needless recompilation but no otherwise
  visible errors.

  Arguments:
    sources: A recursive list of Filter/file names.
    root_dir: The root directory for the relative path names.
  Returns:
    A list of source files that cannot be found on disk.
  """
    missing_sources = []
    for source in sources:
        if isinstance(source, MSVSProject.Filter):
            missing_sources.extend(_VerifySourcesExist(source.contents, root_dir))
        else:
            if "$" not in source:
                full_path = os.path.join(root_dir, source)
                if not os.path.exists(full_path):
                    missing_sources.append(full_path)
    return missing_sources


def _GetMSBuildSources(
    spec,
    sources,
    exclusions,
    rule_dependencies,
    extension_to_rule_name,
    actions_spec,
    sources_handled_by_action,
    list_excluded,
):
    groups = [
        "none",
        "masm",
        "midl",
        "include",
        "compile",
        "resource",
        "rule",
        "rule_dependency",
    ]
    grouped_sources = {}
    for g in groups:
        grouped_sources[g] = []

    _AddSources2(
        spec,
        sources,
        exclusions,
        grouped_sources,
        rule_dependencies,
        extension_to_rule_name,
        sources_handled_by_action,
        list_excluded,
    )
    sources = []
    for g in groups:
        if grouped_sources[g]:
            sources.append(["ItemGroup"] + grouped_sources[g])
    if actions_spec:
        sources.append(["ItemGroup"] + actions_spec)
    return sources


def _AddSources2(
    spec,
    sources,
    exclusions,
    grouped_sources,
    rule_dependencies,
    extension_to_rule_name,
    sources_handled_by_action,
    list_excluded,
):
    extensions_excluded_from_precompile = []
    for source in sources:
        if isinstance(source, MSVSProject.Filter):
            _AddSources2(
                spec,
                source.contents,
                exclusions,
                grouped_sources,
                rule_dependencies,
                extension_to_rule_name,
                sources_handled_by_action,
                list_excluded,
            )
        else:
            if source not in sources_handled_by_action:
                detail = []
                excluded_configurations = exclusions.get(source, [])
                if len(excluded_configurations) == len(spec["configurations"]):
                    detail.append(["ExcludedFromBuild", "true"])
                else:
                    for config_name, configuration in sorted(excluded_configurations):
                        condition = _GetConfigurationCondition(
                            config_name, configuration
                        )
                        detail.append(
                            ["ExcludedFromBuild", {"Condition": condition}, "true"]
                        )
                # Add precompile if needed
                for config_name, configuration in spec["configurations"].items():
                    precompiled_source = configuration.get(
                        "msvs_precompiled_source", ""
                    )
                    if precompiled_source != "":
                        precompiled_source = _FixPath(precompiled_source)
                        if not extensions_excluded_from_precompile:
                            # If the precompiled header is generated by a C source,
                            # we must not try to use it for C++ sources,
                            # and vice versa.
                            basename, extension = os.path.splitext(precompiled_source)
                            if extension == ".c":
                                extensions_excluded_from_precompile = [
                                    ".cc",
                                    ".cpp",
                                    ".cxx",
                                ]
                            else:
                                extensions_excluded_from_precompile = [".c"]

                    if precompiled_source == source:
                        condition = _GetConfigurationCondition(
                            config_name, configuration, spec
                        )
                        detail.append(
                            ["PrecompiledHeader", {"Condition": condition}, "Create"]
                        )
                    else:
                        # Turn off precompiled header usage for source files of a
                        # different type than the file that generated the
                        # precompiled header.
                        for extension in extensions_excluded_from_precompile:
                            if source.endswith(extension):
                                detail.append(["PrecompiledHeader", ""])
                                detail.append(["ForcedIncludeFiles", ""])

                group, element = _MapFileToMsBuildSourceType(
                    source,
                    rule_dependencies,
                    extension_to_rule_name,
                    _GetUniquePlatforms(spec),
                    spec["toolset"],
                )
                if group == "compile" and not os.path.isabs(source):
                    # Add an <ObjectFileName> value to support duplicate source
                    # file basenames, except for absolute paths to avoid paths
                    # with more than 260 characters.
                    file_name = os.path.splitext(source)[0] + ".obj"
                    if file_name.startswith("..\\"):
                        file_name = re.sub(r"^(\.\.\\)+", "", file_name)
                    elif file_name.startswith("$("):
                        file_name = re.sub(r"^\$\([^)]+\)\\", "", file_name)
                    detail.append(["ObjectFileName", "$(IntDir)\\" + file_name])
                grouped_sources[group].append([element, {"Include": source}] + detail)


def _GetMSBuildProjectReferences(project):
    references = []
    if project.dependencies:
        group = ["ItemGroup"]
        added_dependency_set = set()
        for dependency in project.dependencies:
            dependency_spec = dependency.spec
            should_skip_dep = False
            if project.spec["toolset"] == "target":
                if dependency_spec["toolset"] == "host":
                    if dependency_spec["type"] == "static_library":
                        should_skip_dep = True
            if dependency.name.startswith("run_"):
                should_skip_dep = False
            if should_skip_dep:
                continue

            canonical_name = dependency.name.replace("_host", "")
            added_dependency_set.add(canonical_name)
            guid = dependency.guid
            project_dir = os.path.split(project.path)[0]
            relative_path = gyp.common.RelativePath(dependency.path, project_dir)
            project_ref = [
                "ProjectReference",
                {"Include": relative_path},
                ["Project", guid],
                ["ReferenceOutputAssembly", "false"],
            ]
            for config in dependency.spec.get("configurations", {}).values():
                if config.get("msvs_use_library_dependency_inputs", 0):
                    project_ref.append(["UseLibraryDependencyInputs", "true"])
                    break
                # If it's disabled in any config, turn it off in the reference.
                if config.get("msvs_2010_disable_uldi_when_referenced", 0):
                    project_ref.append(["UseLibraryDependencyInputs", "false"])
                    break
            group.append(project_ref)
        references.append(group)
    return references


def _GenerateMSBuildProject(project, options, version, generator_flags, spec):
    spec = project.spec
    configurations = spec["configurations"]
    toolset = spec["toolset"]
    project_dir, project_file_name = os.path.split(project.path)
    gyp.common.EnsureDirExists(project.path)
    # Prepare list of sources and excluded sources.

    gyp_file = os.path.split(project.build_file)[1]
    sources, excluded_sources = _PrepareListOfSources(spec, generator_flags, gyp_file)
    # Add rules.
    actions_to_add = {}
    props_files_of_rules = set()
    targets_files_of_rules = set()
    rule_dependencies = set()
    extension_to_rule_name = {}
    list_excluded = generator_flags.get("msvs_list_excluded_files", True)
    platforms = _GetUniquePlatforms(spec)

    # Don't generate rules if we are using an external builder like ninja.
    if not spec.get("msvs_external_builder"):
        _GenerateRulesForMSBuild(
            project_dir,
            options,
            spec,
            sources,
            excluded_sources,
            props_files_of_rules,
            targets_files_of_rules,
            actions_to_add,
            rule_dependencies,
            extension_to_rule_name,
        )
    else:
        rules = spec.get("rules", [])
        _AdjustSourcesForRules(rules, sources, excluded_sources, True)

    sources, excluded_sources, excluded_idl = _AdjustSourcesAndConvertToFilterHierarchy(
        spec, options, project_dir, sources, excluded_sources, list_excluded, version
    )

    # Don't add actions if we are using an external builder like ninja.
    if not spec.get("msvs_external_builder"):
        _AddActions(actions_to_add, spec, project.build_file)
        _AddCopies(actions_to_add, spec)

        # NOTE: this stanza must appear after all actions have been decided.
        # Don't excluded sources with actions attached, or they won't run.
        excluded_sources = _FilterActionsFromExcluded(excluded_sources, actions_to_add)

    exclusions = _GetExcludedFilesFromBuild(spec, excluded_sources, excluded_idl)
    actions_spec, sources_handled_by_action = _GenerateActionsForMSBuild(
        spec, actions_to_add
    )

    _GenerateMSBuildFiltersFile(
        project.path + ".filters",
        sources,
        rule_dependencies,
        extension_to_rule_name,
        platforms,
        toolset,
    )
    missing_sources = _VerifySourcesExist(sources, project_dir)

    for configuration in configurations.values():
        _FinalizeMSBuildSettings(spec, configuration)

    # Add attributes to root element

    import_default_section = [
        ["Import", {"Project": r"$(VCTargetsPath)\Microsoft.Cpp.Default.props"}]
    ]
    import_cpp_props_section = [
        ["Import", {"Project": r"$(VCTargetsPath)\Microsoft.Cpp.props"}]
    ]
    import_cpp_targets_section = [
        ["Import", {"Project": r"$(VCTargetsPath)\Microsoft.Cpp.targets"}]
    ]
    import_masm_props_section = [
        ["Import", {"Project": r"$(VCTargetsPath)\BuildCustomizations\masm.props"}]
    ]
    import_masm_targets_section = [
        ["Import", {"Project": r"$(VCTargetsPath)\BuildCustomizations\masm.targets"}]
    ]
    import_marmasm_props_section = [
        ["Import", {"Project": r"$(VCTargetsPath)\BuildCustomizations\marmasm.props"}]
    ]
    import_marmasm_targets_section = [
        ["Import", {"Project": r"$(VCTargetsPath)\BuildCustomizations\marmasm.targets"}]
    ]
    macro_section = [["PropertyGroup", {"Label": "UserMacros"}]]

    content = [
        "Project",
        {
            "xmlns": "http://schemas.microsoft.com/developer/msbuild/2003",
            "ToolsVersion": version.ProjectVersion(),
            "DefaultTargets": "Build",
        },
    ]

    content += _GetMSBuildProjectConfigurations(configurations, spec)
    content += _GetMSBuildGlobalProperties(
        spec, version, project.guid, project_file_name
    )
    content += import_default_section
    content += _GetMSBuildConfigurationDetails(spec, project.build_file)
    if spec.get("msvs_enable_winphone"):
        content += _GetMSBuildLocalProperties("v120_wp81")
    else:
        content += _GetMSBuildLocalProperties(project.msbuild_toolset)
    content += import_cpp_props_section
    content += import_masm_props_section
    if "arm64" in platforms and toolset == "target":
        content += import_marmasm_props_section
    content += _GetMSBuildExtensions(props_files_of_rules)
    content += _GetMSBuildPropertySheets(configurations, spec)
    content += macro_section
    content += _GetMSBuildConfigurationGlobalProperties(
        spec, configurations, project.build_file
    )
    content += _GetMSBuildToolSettingsSections(spec, configurations)
    content += _GetMSBuildSources(
        spec,
        sources,
        exclusions,
        rule_dependencies,
        extension_to_rule_name,
        actions_spec,
        sources_handled_by_action,
        list_excluded,
    )
    content += _GetMSBuildProjectReferences(project)
    content += import_cpp_targets_section
    content += import_masm_targets_section
    if "arm64" in platforms and toolset == "target":
        content += import_marmasm_targets_section
    content += _GetMSBuildExtensionTargets(targets_files_of_rules)

    if spec.get("msvs_external_builder"):
        content += _GetMSBuildExternalBuilderTargets(spec)

    # TODO(jeanluc) File a bug to get rid of runas.  We had in MSVS:
    # has_run_as = _WriteMSVSUserFile(project.path, version, spec)

    easy_xml.WriteXmlIfChanged(content, project.path, pretty=True, win32=True)

    return missing_sources


def _GetMSBuildExternalBuilderTargets(spec):
    """Return a list of MSBuild targets for external builders.

  The "Build" and "Clean" targets are always generated.  If the spec contains
  'msvs_external_builder_clcompile_cmd', then the "ClCompile" target will also
  be generated, to support building selected C/C++ files.

  Arguments:
    spec: The gyp target spec.
  Returns:
    List of MSBuild 'Target' specs.
  """
    build_cmd = _BuildCommandLineForRuleRaw(
        spec, spec["msvs_external_builder_build_cmd"], False, False, False, False
    )
    build_target = ["Target", {"Name": "Build"}]
    build_target.append(["Exec", {"Command": build_cmd}])

    clean_cmd = _BuildCommandLineForRuleRaw(
        spec, spec["msvs_external_builder_clean_cmd"], False, False, False, False
    )
    clean_target = ["Target", {"Name": "Clean"}]
    clean_target.append(["Exec", {"Command": clean_cmd}])

    targets = [build_target, clean_target]

    if spec.get("msvs_external_builder_clcompile_cmd"):
        clcompile_cmd = _BuildCommandLineForRuleRaw(
            spec,
            spec["msvs_external_builder_clcompile_cmd"],
            False,
            False,
            False,
            False,
        )
        clcompile_target = ["Target", {"Name": "ClCompile"}]
        clcompile_target.append(["Exec", {"Command": clcompile_cmd}])
        targets.append(clcompile_target)

    return targets


def _GetMSBuildExtensions(props_files_of_rules):
    extensions = ["ImportGroup", {"Label": "ExtensionSettings"}]
    for props_file in props_files_of_rules:
        extensions.append(["Import", {"Project": props_file}])
    return [extensions]


def _GetMSBuildExtensionTargets(targets_files_of_rules):
    targets_node = ["ImportGroup", {"Label": "ExtensionTargets"}]
    for targets_file in sorted(targets_files_of_rules):
        targets_node.append(["Import", {"Project": targets_file}])
    return [targets_node]


def _GenerateActionsForMSBuild(spec, actions_to_add):
    """Add actions accumulated into an actions_to_add, merging as needed.

  Arguments:
    spec: the target project dict
    actions_to_add: dictionary keyed on input name, which maps to a list of
        dicts describing the actions attached to that input file.

  Returns:
    A pair of (action specification, the sources handled by this action).
  """
    sources_handled_by_action = OrderedSet()
    actions_spec = []
    for primary_input, actions in actions_to_add.items():
        if generator_supports_multiple_toolsets:
            primary_input = primary_input.replace(".exe", "_host.exe")
        inputs = OrderedSet()
        outputs = OrderedSet()
        descriptions = []
        commands = []
        for action in actions:

            def fixup_host_exe(i):
                if "$(OutDir)" in i:
                    i = i.replace(".exe", "_host.exe")
                return i

            if generator_supports_multiple_toolsets:
                action["inputs"] = [fixup_host_exe(i) for i in action["inputs"]]
            inputs.update(OrderedSet(action["inputs"]))
            outputs.update(OrderedSet(action["outputs"]))
            descriptions.append(action["description"])
            cmd = action["command"]
            if generator_supports_multiple_toolsets:
                cmd = cmd.replace(".exe", "_host.exe")
            # For most actions, add 'call' so that actions that invoke batch files
            # return and continue executing.  msbuild_use_call provides a way to
            # disable this but I have not seen any adverse effect from doing that
            # for everything.
            if action.get("msbuild_use_call", True):
                cmd = "call " + cmd
            commands.append(cmd)
        # Add the custom build action for one input file.
        description = ", and also ".join(descriptions)

        # We can't join the commands simply with && because the command line will
        # get too long. See also _AddActions: cygwin's setup_env mustn't be called
        # for every invocation or the command that sets the PATH will grow too
        # long.
        command = "\r\n".join(
            [c + "\r\nif %errorlevel% neq 0 exit /b %errorlevel%" for c in commands]
        )
        _AddMSBuildAction(
            spec,
            primary_input,
            inputs,
            outputs,
            command,
            description,
            sources_handled_by_action,
            actions_spec,
        )
    return actions_spec, sources_handled_by_action


def _AddMSBuildAction(
    spec,
    primary_input,
    inputs,
    outputs,
    cmd,
    description,
    sources_handled_by_action,
    actions_spec,
):
    command = MSVSSettings.ConvertVCMacrosToMSBuild(cmd)
    primary_input = _FixPath(primary_input)
    inputs_array = _FixPaths(inputs)
    outputs_array = _FixPaths(outputs)
    additional_inputs = ";".join([i for i in inputs_array if i != primary_input])
    outputs = ";".join(outputs_array)
    sources_handled_by_action.add(primary_input)
    action_spec = ["CustomBuild", {"Include": primary_input}]
    action_spec.extend(
        # TODO(jeanluc) 'Document' for all or just if as_sources?
        [
            ["FileType", "Document"],
            ["Command", command],
            ["Message", description],
            ["Outputs", outputs],
        ]
    )
    if additional_inputs:
        action_spec.append(["AdditionalInputs", additional_inputs])
    actions_spec.append(action_spec)
