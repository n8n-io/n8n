# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

r"""Code to validate and convert settings of the Microsoft build tools.

This file contains code to validate and convert settings of the Microsoft
build tools.  The function ConvertToMSBuildSettings(), ValidateMSVSSettings(),
and ValidateMSBuildSettings() are the entry points.

This file was created by comparing the projects created by Visual Studio 2008
and Visual Studio 2010 for all available settings through the user interface.
The MSBuild schemas were also considered.  They are typically found in the
MSBuild install directory, e.g. c:\Program Files (x86)\MSBuild
"""

import re
import sys

# Dictionaries of settings validators. The key is the tool name, the value is
# a dictionary mapping setting names to validation functions.
_msvs_validators = {}
_msbuild_validators = {}


# A dictionary of settings converters. The key is the tool name, the value is
# a dictionary mapping setting names to conversion functions.
_msvs_to_msbuild_converters = {}


# Tool name mapping from MSVS to MSBuild.
_msbuild_name_of_tool = {}


class _Tool:
    """Represents a tool used by MSVS or MSBuild.

  Attributes:
      msvs_name: The name of the tool in MSVS.
      msbuild_name: The name of the tool in MSBuild.
  """

    def __init__(self, msvs_name, msbuild_name):
        self.msvs_name = msvs_name
        self.msbuild_name = msbuild_name


def _AddTool(tool):
    """Adds a tool to the four dictionaries used to process settings.

  This only defines the tool.  Each setting also needs to be added.

  Args:
    tool: The _Tool object to be added.
  """
    _msvs_validators[tool.msvs_name] = {}
    _msbuild_validators[tool.msbuild_name] = {}
    _msvs_to_msbuild_converters[tool.msvs_name] = {}
    _msbuild_name_of_tool[tool.msvs_name] = tool.msbuild_name


def _GetMSBuildToolSettings(msbuild_settings, tool):
    """Returns an MSBuild tool dictionary.  Creates it if needed."""
    return msbuild_settings.setdefault(tool.msbuild_name, {})


class _Type:
    """Type of settings (Base class)."""

    def ValidateMSVS(self, value):
        """Verifies that the value is legal for MSVS.

    Args:
      value: the value to check for this type.

    Raises:
      ValueError if value is not valid for MSVS.
    """

    def ValidateMSBuild(self, value):
        """Verifies that the value is legal for MSBuild.

    Args:
      value: the value to check for this type.

    Raises:
      ValueError if value is not valid for MSBuild.
    """

    def ConvertToMSBuild(self, value):
        """Returns the MSBuild equivalent of the MSVS value given.

    Args:
      value: the MSVS value to convert.

    Returns:
      the MSBuild equivalent.

    Raises:
      ValueError if value is not valid.
    """
        return value


class _String(_Type):
    """A setting that's just a string."""

    def ValidateMSVS(self, value):
        if not isinstance(value, str):
            raise ValueError("expected string; got %r" % value)

    def ValidateMSBuild(self, value):
        if not isinstance(value, str):
            raise ValueError("expected string; got %r" % value)

    def ConvertToMSBuild(self, value):
        # Convert the macros
        return ConvertVCMacrosToMSBuild(value)


class _StringList(_Type):
    """A settings that's a list of strings."""

    def ValidateMSVS(self, value):
        if not isinstance(value, (list, str)):
            raise ValueError("expected string list; got %r" % value)

    def ValidateMSBuild(self, value):
        if not isinstance(value, (list, str)):
            raise ValueError("expected string list; got %r" % value)

    def ConvertToMSBuild(self, value):
        # Convert the macros
        if isinstance(value, list):
            return [ConvertVCMacrosToMSBuild(i) for i in value]
        else:
            return ConvertVCMacrosToMSBuild(value)


class _Boolean(_Type):
    """Boolean settings, can have the values 'false' or 'true'."""

    def _Validate(self, value):
        if value != "true" and value != "false":
            raise ValueError("expected bool; got %r" % value)

    def ValidateMSVS(self, value):
        self._Validate(value)

    def ValidateMSBuild(self, value):
        self._Validate(value)

    def ConvertToMSBuild(self, value):
        self._Validate(value)
        return value


class _Integer(_Type):
    """Integer settings."""

    def __init__(self, msbuild_base=10):
        _Type.__init__(self)
        self._msbuild_base = msbuild_base

    def ValidateMSVS(self, value):
        # Try to convert, this will raise ValueError if invalid.
        self.ConvertToMSBuild(value)

    def ValidateMSBuild(self, value):
        # Try to convert, this will raise ValueError if invalid.
        int(value, self._msbuild_base)

    def ConvertToMSBuild(self, value):
        msbuild_format = (self._msbuild_base == 10) and "%d" or "0x%04x"
        return msbuild_format % int(value)


class _Enumeration(_Type):
    """Type of settings that is an enumeration.

  In MSVS, the values are indexes like '0', '1', and '2'.
  MSBuild uses text labels that are more representative, like 'Win32'.

  Constructor args:
    label_list: an array of MSBuild labels that correspond to the MSVS index.
        In the rare cases where MSVS has skipped an index value, None is
        used in the array to indicate the unused spot.
    new: an array of labels that are new to MSBuild.
  """

    def __init__(self, label_list, new=None):
        _Type.__init__(self)
        self._label_list = label_list
        self._msbuild_values = {value for value in label_list if value is not None}
        if new is not None:
            self._msbuild_values.update(new)

    def ValidateMSVS(self, value):
        # Try to convert.  It will raise an exception if not valid.
        self.ConvertToMSBuild(value)

    def ValidateMSBuild(self, value):
        if value not in self._msbuild_values:
            raise ValueError("unrecognized enumerated value %s" % value)

    def ConvertToMSBuild(self, value):
        index = int(value)
        if index < 0 or index >= len(self._label_list):
            raise ValueError(
                "index value (%d) not in expected range [0, %d)"
                % (index, len(self._label_list))
            )
        label = self._label_list[index]
        if label is None:
            raise ValueError("converted value for %s not specified." % value)
        return label


# Instantiate the various generic types.
_boolean = _Boolean()
_integer = _Integer()
# For now, we don't do any special validation on these types:
_string = _String()
_file_name = _String()
_folder_name = _String()
_file_list = _StringList()
_folder_list = _StringList()
_string_list = _StringList()
# Some boolean settings went from numerical values to boolean.  The
# mapping is 0: default, 1: false, 2: true.
_newly_boolean = _Enumeration(["", "false", "true"])


def _Same(tool, name, setting_type):
    """Defines a setting that has the same name in MSVS and MSBuild.

  Args:
    tool: a dictionary that gives the names of the tool for MSVS and MSBuild.
    name: the name of the setting.
    setting_type: the type of this setting.
  """
    _Renamed(tool, name, name, setting_type)


def _Renamed(tool, msvs_name, msbuild_name, setting_type):
    """Defines a setting for which the name has changed.

  Args:
    tool: a dictionary that gives the names of the tool for MSVS and MSBuild.
    msvs_name: the name of the MSVS setting.
    msbuild_name: the name of the MSBuild setting.
    setting_type: the type of this setting.
  """

    def _Translate(value, msbuild_settings):
        msbuild_tool_settings = _GetMSBuildToolSettings(msbuild_settings, tool)
        msbuild_tool_settings[msbuild_name] = setting_type.ConvertToMSBuild(value)

    _msvs_validators[tool.msvs_name][msvs_name] = setting_type.ValidateMSVS
    _msbuild_validators[tool.msbuild_name][msbuild_name] = setting_type.ValidateMSBuild
    _msvs_to_msbuild_converters[tool.msvs_name][msvs_name] = _Translate


def _Moved(tool, settings_name, msbuild_tool_name, setting_type):
    _MovedAndRenamed(
        tool, settings_name, msbuild_tool_name, settings_name, setting_type
    )


def _MovedAndRenamed(
    tool, msvs_settings_name, msbuild_tool_name, msbuild_settings_name, setting_type
):
    """Defines a setting that may have moved to a new section.

  Args:
    tool: a dictionary that gives the names of the tool for MSVS and MSBuild.
    msvs_settings_name: the MSVS name of the setting.
    msbuild_tool_name: the name of the MSBuild tool to place the setting under.
    msbuild_settings_name: the MSBuild name of the setting.
    setting_type: the type of this setting.
  """

    def _Translate(value, msbuild_settings):
        tool_settings = msbuild_settings.setdefault(msbuild_tool_name, {})
        tool_settings[msbuild_settings_name] = setting_type.ConvertToMSBuild(value)

    _msvs_validators[tool.msvs_name][msvs_settings_name] = setting_type.ValidateMSVS
    validator = setting_type.ValidateMSBuild
    _msbuild_validators[msbuild_tool_name][msbuild_settings_name] = validator
    _msvs_to_msbuild_converters[tool.msvs_name][msvs_settings_name] = _Translate


def _MSVSOnly(tool, name, setting_type):
    """Defines a setting that is only found in MSVS.

  Args:
    tool: a dictionary that gives the names of the tool for MSVS and MSBuild.
    name: the name of the setting.
    setting_type: the type of this setting.
  """

    def _Translate(unused_value, unused_msbuild_settings):
        # Since this is for MSVS only settings, no translation will happen.
        pass

    _msvs_validators[tool.msvs_name][name] = setting_type.ValidateMSVS
    _msvs_to_msbuild_converters[tool.msvs_name][name] = _Translate


def _MSBuildOnly(tool, name, setting_type):
    """Defines a setting that is only found in MSBuild.

  Args:
    tool: a dictionary that gives the names of the tool for MSVS and MSBuild.
    name: the name of the setting.
    setting_type: the type of this setting.
  """

    def _Translate(value, msbuild_settings):
        # Let msbuild-only properties get translated as-is from msvs_settings.
        tool_settings = msbuild_settings.setdefault(tool.msbuild_name, {})
        tool_settings[name] = value

    _msbuild_validators[tool.msbuild_name][name] = setting_type.ValidateMSBuild
    _msvs_to_msbuild_converters[tool.msvs_name][name] = _Translate


def _ConvertedToAdditionalOption(tool, msvs_name, flag):
    """Defines a setting that's handled via a command line option in MSBuild.

  Args:
    tool: a dictionary that gives the names of the tool for MSVS and MSBuild.
    msvs_name: the name of the MSVS setting that if 'true' becomes a flag
    flag: the flag to insert at the end of the AdditionalOptions
  """

    def _Translate(value, msbuild_settings):
        if value == "true":
            tool_settings = _GetMSBuildToolSettings(msbuild_settings, tool)
            if "AdditionalOptions" in tool_settings:
                new_flags = "{} {}".format(tool_settings["AdditionalOptions"], flag)
            else:
                new_flags = flag
            tool_settings["AdditionalOptions"] = new_flags

    _msvs_validators[tool.msvs_name][msvs_name] = _boolean.ValidateMSVS
    _msvs_to_msbuild_converters[tool.msvs_name][msvs_name] = _Translate


def _CustomGeneratePreprocessedFile(tool, msvs_name):
    def _Translate(value, msbuild_settings):
        tool_settings = _GetMSBuildToolSettings(msbuild_settings, tool)
        if value == "0":
            tool_settings["PreprocessToFile"] = "false"
            tool_settings["PreprocessSuppressLineNumbers"] = "false"
        elif value == "1":  # /P
            tool_settings["PreprocessToFile"] = "true"
            tool_settings["PreprocessSuppressLineNumbers"] = "false"
        elif value == "2":  # /EP /P
            tool_settings["PreprocessToFile"] = "true"
            tool_settings["PreprocessSuppressLineNumbers"] = "true"
        else:
            raise ValueError("value must be one of [0, 1, 2]; got %s" % value)

    # Create a bogus validator that looks for '0', '1', or '2'
    msvs_validator = _Enumeration(["a", "b", "c"]).ValidateMSVS
    _msvs_validators[tool.msvs_name][msvs_name] = msvs_validator
    msbuild_validator = _boolean.ValidateMSBuild
    msbuild_tool_validators = _msbuild_validators[tool.msbuild_name]
    msbuild_tool_validators["PreprocessToFile"] = msbuild_validator
    msbuild_tool_validators["PreprocessSuppressLineNumbers"] = msbuild_validator
    _msvs_to_msbuild_converters[tool.msvs_name][msvs_name] = _Translate


fix_vc_macro_slashes_regex_list = ("IntDir", "OutDir")
fix_vc_macro_slashes_regex = re.compile(
    r"(\$\((?:%s)\))(?:[\\/]+)" % "|".join(fix_vc_macro_slashes_regex_list)
)

# Regular expression to detect keys that were generated by exclusion lists
_EXCLUDED_SUFFIX_RE = re.compile("^(.*)_excluded$")


def _ValidateExclusionSetting(setting, settings, error_msg, stderr=sys.stderr):
    """Verify that 'setting' is valid if it is generated from an exclusion list.

  If the setting appears to be generated from an exclusion list, the root name
  is checked.

  Args:
      setting:   A string that is the setting name to validate
      settings:  A dictionary where the keys are valid settings
      error_msg: The message to emit in the event of error
      stderr:    The stream receiving the error messages.
  """
    # This may be unrecognized because it's an exclusion list. If the
    # setting name has the _excluded suffix, then check the root name.
    unrecognized = True
    m = re.match(_EXCLUDED_SUFFIX_RE, setting)
    if m:
        root_setting = m.group(1)
        unrecognized = root_setting not in settings

    if unrecognized:
        # We don't know this setting. Give a warning.
        print(error_msg, file=stderr)


def FixVCMacroSlashes(s):
    """Replace macros which have excessive following slashes.

  These macros are known to have a built-in trailing slash. Furthermore, many
  scripts hiccup on processing paths with extra slashes in the middle.

  This list is probably not exhaustive.  Add as needed.
  """
    if "$" in s:
        s = fix_vc_macro_slashes_regex.sub(r"\1", s)
    return s


def ConvertVCMacrosToMSBuild(s):
    """Convert the MSVS macros found in the string to the MSBuild equivalent.

  This list is probably not exhaustive.  Add as needed.
  """
    if "$" in s:
        replace_map = {
            "$(ConfigurationName)": "$(Configuration)",
            "$(InputDir)": "%(RelativeDir)",
            "$(InputExt)": "%(Extension)",
            "$(InputFileName)": "%(Filename)%(Extension)",
            "$(InputName)": "%(Filename)",
            "$(InputPath)": "%(Identity)",
            "$(ParentName)": "$(ProjectFileName)",
            "$(PlatformName)": "$(Platform)",
            "$(SafeInputName)": "%(Filename)",
        }
        for old, new in replace_map.items():
            s = s.replace(old, new)
        s = FixVCMacroSlashes(s)
    return s


def ConvertToMSBuildSettings(msvs_settings, stderr=sys.stderr):
    """Converts MSVS settings (VS2008 and earlier) to MSBuild settings (VS2010+).

  Args:
      msvs_settings: A dictionary.  The key is the tool name.  The values are
          themselves dictionaries of settings and their values.
      stderr: The stream receiving the error messages.

  Returns:
      A dictionary of MSBuild settings.  The key is either the MSBuild tool name
      or the empty string (for the global settings).  The values are themselves
      dictionaries of settings and their values.
  """
    msbuild_settings = {}
    for msvs_tool_name, msvs_tool_settings in msvs_settings.items():
        if msvs_tool_name in _msvs_to_msbuild_converters:
            msvs_tool = _msvs_to_msbuild_converters[msvs_tool_name]
            for msvs_setting, msvs_value in msvs_tool_settings.items():
                if msvs_setting in msvs_tool:
                    # Invoke the translation function.
                    try:
                        msvs_tool[msvs_setting](msvs_value, msbuild_settings)
                    except ValueError as e:
                        print(
                            "Warning: while converting %s/%s to MSBuild, "
                            "%s" % (msvs_tool_name, msvs_setting, e),
                            file=stderr,
                        )
                else:
                    _ValidateExclusionSetting(
                        msvs_setting,
                        msvs_tool,
                        (
                            "Warning: unrecognized setting %s/%s "
                            "while converting to MSBuild."
                            % (msvs_tool_name, msvs_setting)
                        ),
                        stderr,
                    )
        else:
            print(
                "Warning: unrecognized tool %s while converting to "
                "MSBuild." % msvs_tool_name,
                file=stderr,
            )
    return msbuild_settings


def ValidateMSVSSettings(settings, stderr=sys.stderr):
    """Validates that the names of the settings are valid for MSVS.

  Args:
      settings: A dictionary.  The key is the tool name.  The values are
          themselves dictionaries of settings and their values.
      stderr: The stream receiving the error messages.
  """
    _ValidateSettings(_msvs_validators, settings, stderr)


def ValidateMSBuildSettings(settings, stderr=sys.stderr):
    """Validates that the names of the settings are valid for MSBuild.

  Args:
      settings: A dictionary.  The key is the tool name.  The values are
          themselves dictionaries of settings and their values.
      stderr: The stream receiving the error messages.
  """
    _ValidateSettings(_msbuild_validators, settings, stderr)


def _ValidateSettings(validators, settings, stderr):
    """Validates that the settings are valid for MSBuild or MSVS.

  We currently only validate the names of the settings, not their values.

  Args:
      validators: A dictionary of tools and their validators.
      settings: A dictionary.  The key is the tool name.  The values are
          themselves dictionaries of settings and their values.
      stderr: The stream receiving the error messages.
  """
    for tool_name in settings:
        if tool_name in validators:
            tool_validators = validators[tool_name]
            for setting, value in settings[tool_name].items():
                if setting in tool_validators:
                    try:
                        tool_validators[setting](value)
                    except ValueError as e:
                        print(
                            f"Warning: for {tool_name}/{setting}, {e}",
                            file=stderr,
                        )
                else:
                    _ValidateExclusionSetting(
                        setting,
                        tool_validators,
                        (f"Warning: unrecognized setting {tool_name}/{setting}"),
                        stderr,
                    )

        else:
            print("Warning: unrecognized tool %s" % (tool_name), file=stderr)


# MSVS and MBuild names of the tools.
_compile = _Tool("VCCLCompilerTool", "ClCompile")
_link = _Tool("VCLinkerTool", "Link")
_midl = _Tool("VCMIDLTool", "Midl")
_rc = _Tool("VCResourceCompilerTool", "ResourceCompile")
_lib = _Tool("VCLibrarianTool", "Lib")
_manifest = _Tool("VCManifestTool", "Manifest")
_masm = _Tool("MASM", "MASM")
_armasm = _Tool("ARMASM", "ARMASM")


_AddTool(_compile)
_AddTool(_link)
_AddTool(_midl)
_AddTool(_rc)
_AddTool(_lib)
_AddTool(_manifest)
_AddTool(_masm)
_AddTool(_armasm)
# Add sections only found in the MSBuild settings.
_msbuild_validators[""] = {}
_msbuild_validators["ProjectReference"] = {}
_msbuild_validators["ManifestResourceCompile"] = {}

# Descriptions of the compiler options, i.e. VCCLCompilerTool in MSVS and
# ClCompile in MSBuild.
# See "c:\Program Files (x86)\MSBuild\Microsoft.Cpp\v4.0\1033\cl.xml" for
# the schema of the MSBuild ClCompile settings.

# Options that have the same name in MSVS and MSBuild
_Same(_compile, "AdditionalIncludeDirectories", _folder_list)  # /I
_Same(_compile, "AdditionalOptions", _string_list)
_Same(_compile, "AdditionalUsingDirectories", _folder_list)  # /AI
_Same(_compile, "AssemblerListingLocation", _file_name)  # /Fa
_Same(_compile, "BrowseInformationFile", _file_name)
_Same(_compile, "BufferSecurityCheck", _boolean)  # /GS
_Same(_compile, "DisableLanguageExtensions", _boolean)  # /Za
_Same(_compile, "DisableSpecificWarnings", _string_list)  # /wd
_Same(_compile, "EnableFiberSafeOptimizations", _boolean)  # /GT
_Same(_compile, "EnablePREfast", _boolean)  # /analyze Visible='false'
_Same(_compile, "ExpandAttributedSource", _boolean)  # /Fx
_Same(_compile, "FloatingPointExceptions", _boolean)  # /fp:except
_Same(_compile, "ForceConformanceInForLoopScope", _boolean)  # /Zc:forScope
_Same(_compile, "ForcedIncludeFiles", _file_list)  # /FI
_Same(_compile, "ForcedUsingFiles", _file_list)  # /FU
_Same(_compile, "GenerateXMLDocumentationFiles", _boolean)  # /doc
_Same(_compile, "IgnoreStandardIncludePath", _boolean)  # /X
_Same(_compile, "MinimalRebuild", _boolean)  # /Gm
_Same(_compile, "OmitDefaultLibName", _boolean)  # /Zl
_Same(_compile, "OmitFramePointers", _boolean)  # /Oy
_Same(_compile, "PreprocessorDefinitions", _string_list)  # /D
_Same(_compile, "ProgramDataBaseFileName", _file_name)  # /Fd
_Same(_compile, "RuntimeTypeInfo", _boolean)  # /GR
_Same(_compile, "ShowIncludes", _boolean)  # /showIncludes
_Same(_compile, "SmallerTypeCheck", _boolean)  # /RTCc
_Same(_compile, "StringPooling", _boolean)  # /GF
_Same(_compile, "SuppressStartupBanner", _boolean)  # /nologo
_Same(_compile, "TreatWChar_tAsBuiltInType", _boolean)  # /Zc:wchar_t
_Same(_compile, "UndefineAllPreprocessorDefinitions", _boolean)  # /u
_Same(_compile, "UndefinePreprocessorDefinitions", _string_list)  # /U
_Same(_compile, "UseFullPaths", _boolean)  # /FC
_Same(_compile, "WholeProgramOptimization", _boolean)  # /GL
_Same(_compile, "XMLDocumentationFileName", _file_name)
_Same(_compile, "CompileAsWinRT", _boolean)  # /ZW

_Same(
    _compile,
    "AssemblerOutput",
    _Enumeration(
        [
            "NoListing",
            "AssemblyCode",  # /FA
            "All",  # /FAcs
            "AssemblyAndMachineCode",  # /FAc
            "AssemblyAndSourceCode",
        ]
    ),
)  # /FAs
_Same(
    _compile,
    "BasicRuntimeChecks",
    _Enumeration(
        [
            "Default",
            "StackFrameRuntimeCheck",  # /RTCs
            "UninitializedLocalUsageCheck",  # /RTCu
            "EnableFastChecks",
        ]
    ),
)  # /RTC1
_Same(
    _compile, "BrowseInformation", _Enumeration(["false", "true", "true"])  # /FR
)  # /Fr
_Same(
    _compile,
    "CallingConvention",
    _Enumeration(["Cdecl", "FastCall", "StdCall", "VectorCall"]),  # /Gd  # /Gr  # /Gz
)  # /Gv
_Same(
    _compile,
    "CompileAs",
    _Enumeration(["Default", "CompileAsC", "CompileAsCpp"]),  # /TC
)  # /TP
_Same(
    _compile,
    "DebugInformationFormat",
    _Enumeration(
        [
            "",  # Disabled
            "OldStyle",  # /Z7
            None,
            "ProgramDatabase",  # /Zi
            "EditAndContinue",
        ]
    ),
)  # /ZI
_Same(
    _compile,
    "EnableEnhancedInstructionSet",
    _Enumeration(
        [
            "NotSet",
            "StreamingSIMDExtensions",  # /arch:SSE
            "StreamingSIMDExtensions2",  # /arch:SSE2
            "AdvancedVectorExtensions",  # /arch:AVX (vs2012+)
            "NoExtensions",  # /arch:IA32 (vs2012+)
            # This one only exists in the new msbuild format.
            "AdvancedVectorExtensions2",  # /arch:AVX2 (vs2013r2+)
        ]
    ),
)
_Same(
    _compile,
    "ErrorReporting",
    _Enumeration(
        [
            "None",  # /errorReport:none
            "Prompt",  # /errorReport:prompt
            "Queue",
        ],  # /errorReport:queue
        new=["Send"],
    ),
)  # /errorReport:send"
_Same(
    _compile,
    "ExceptionHandling",
    _Enumeration(["false", "Sync", "Async"], new=["SyncCThrow"]),  # /EHsc  # /EHa
)  # /EHs
_Same(
    _compile, "FavorSizeOrSpeed", _Enumeration(["Neither", "Speed", "Size"])  # /Ot
)  # /Os
_Same(
    _compile,
    "FloatingPointModel",
    _Enumeration(["Precise", "Strict", "Fast"]),  # /fp:precise  # /fp:strict
)  # /fp:fast
_Same(
    _compile,
    "InlineFunctionExpansion",
    _Enumeration(
        ["Default", "OnlyExplicitInline", "AnySuitable"],  # /Ob1  # /Ob2
        new=["Disabled"],
    ),
)  # /Ob0
_Same(
    _compile,
    "Optimization",
    _Enumeration(["Disabled", "MinSpace", "MaxSpeed", "Full"]),  # /Od  # /O1  # /O2
)  # /Ox
_Same(
    _compile,
    "RuntimeLibrary",
    _Enumeration(
        [
            "MultiThreaded",  # /MT
            "MultiThreadedDebug",  # /MTd
            "MultiThreadedDLL",  # /MD
            "MultiThreadedDebugDLL",
        ]
    ),
)  # /MDd
_Same(
    _compile,
    "StructMemberAlignment",
    _Enumeration(
        [
            "Default",
            "1Byte",  # /Zp1
            "2Bytes",  # /Zp2
            "4Bytes",  # /Zp4
            "8Bytes",  # /Zp8
            "16Bytes",
        ]
    ),
)  # /Zp16
_Same(
    _compile,
    "WarningLevel",
    _Enumeration(
        [
            "TurnOffAllWarnings",  # /W0
            "Level1",  # /W1
            "Level2",  # /W2
            "Level3",  # /W3
            "Level4",
        ],  # /W4
        new=["EnableAllWarnings"],
    ),
)  # /Wall

# Options found in MSVS that have been renamed in MSBuild.
_Renamed(
    _compile, "EnableFunctionLevelLinking", "FunctionLevelLinking", _boolean
)  # /Gy
_Renamed(_compile, "EnableIntrinsicFunctions", "IntrinsicFunctions", _boolean)  # /Oi
_Renamed(_compile, "KeepComments", "PreprocessKeepComments", _boolean)  # /C
_Renamed(_compile, "ObjectFile", "ObjectFileName", _file_name)  # /Fo
_Renamed(_compile, "OpenMP", "OpenMPSupport", _boolean)  # /openmp
_Renamed(
    _compile, "PrecompiledHeaderThrough", "PrecompiledHeaderFile", _file_name
)  # Used with /Yc and /Yu
_Renamed(
    _compile, "PrecompiledHeaderFile", "PrecompiledHeaderOutputFile", _file_name
)  # /Fp
_Renamed(
    _compile,
    "UsePrecompiledHeader",
    "PrecompiledHeader",
    _Enumeration(
        ["NotUsing", "Create", "Use"]  # VS recognized '' for this value too.  # /Yc
    ),
)  # /Yu
_Renamed(_compile, "WarnAsError", "TreatWarningAsError", _boolean)  # /WX

_ConvertedToAdditionalOption(_compile, "DefaultCharIsUnsigned", "/J")

# MSVS options not found in MSBuild.
_MSVSOnly(_compile, "Detect64BitPortabilityProblems", _boolean)
_MSVSOnly(_compile, "UseUnicodeResponseFiles", _boolean)

# MSBuild options not found in MSVS.
_MSBuildOnly(_compile, "BuildingInIDE", _boolean)
_MSBuildOnly(
    _compile, "CompileAsManaged", _Enumeration([], new=["false", "true"])
)  # /clr
_MSBuildOnly(_compile, "CreateHotpatchableImage", _boolean)  # /hotpatch
_MSBuildOnly(_compile, "MultiProcessorCompilation", _boolean)  # /MP
_MSBuildOnly(_compile, "PreprocessOutputPath", _string)  # /Fi
_MSBuildOnly(_compile, "ProcessorNumber", _integer)  # the number of processors
_MSBuildOnly(_compile, "TrackerLogDirectory", _folder_name)
_MSBuildOnly(_compile, "TreatSpecificWarningsAsErrors", _string_list)  # /we
_MSBuildOnly(_compile, "UseUnicodeForAssemblerListing", _boolean)  # /FAu

# Defines a setting that needs very customized processing
_CustomGeneratePreprocessedFile(_compile, "GeneratePreprocessedFile")


# Directives for converting MSVS VCLinkerTool to MSBuild Link.
# See "c:\Program Files (x86)\MSBuild\Microsoft.Cpp\v4.0\1033\link.xml" for
# the schema of the MSBuild Link settings.

# Options that have the same name in MSVS and MSBuild
_Same(_link, "AdditionalDependencies", _file_list)
_Same(_link, "AdditionalLibraryDirectories", _folder_list)  # /LIBPATH
#  /MANIFESTDEPENDENCY:
_Same(_link, "AdditionalManifestDependencies", _file_list)
_Same(_link, "AdditionalOptions", _string_list)
_Same(_link, "AddModuleNamesToAssembly", _file_list)  # /ASSEMBLYMODULE
_Same(_link, "AllowIsolation", _boolean)  # /ALLOWISOLATION
_Same(_link, "AssemblyLinkResource", _file_list)  # /ASSEMBLYLINKRESOURCE
_Same(_link, "BaseAddress", _string)  # /BASE
_Same(_link, "CLRUnmanagedCodeCheck", _boolean)  # /CLRUNMANAGEDCODECHECK
_Same(_link, "DelayLoadDLLs", _file_list)  # /DELAYLOAD
_Same(_link, "DelaySign", _boolean)  # /DELAYSIGN
_Same(_link, "EmbedManagedResourceFile", _file_list)  # /ASSEMBLYRESOURCE
_Same(_link, "EnableUAC", _boolean)  # /MANIFESTUAC
_Same(_link, "EntryPointSymbol", _string)  # /ENTRY
_Same(_link, "ForceSymbolReferences", _file_list)  # /INCLUDE
_Same(_link, "FunctionOrder", _file_name)  # /ORDER
_Same(_link, "GenerateDebugInformation", _boolean)  # /DEBUG
_Same(_link, "GenerateMapFile", _boolean)  # /MAP
_Same(_link, "HeapCommitSize", _string)
_Same(_link, "HeapReserveSize", _string)  # /HEAP
_Same(_link, "IgnoreAllDefaultLibraries", _boolean)  # /NODEFAULTLIB
_Same(_link, "IgnoreEmbeddedIDL", _boolean)  # /IGNOREIDL
_Same(_link, "ImportLibrary", _file_name)  # /IMPLIB
_Same(_link, "KeyContainer", _file_name)  # /KEYCONTAINER
_Same(_link, "KeyFile", _file_name)  # /KEYFILE
_Same(_link, "ManifestFile", _file_name)  # /ManifestFile
_Same(_link, "MapExports", _boolean)  # /MAPINFO:EXPORTS
_Same(_link, "MapFileName", _file_name)
_Same(_link, "MergedIDLBaseFileName", _file_name)  # /IDLOUT
_Same(_link, "MergeSections", _string)  # /MERGE
_Same(_link, "MidlCommandFile", _file_name)  # /MIDL
_Same(_link, "ModuleDefinitionFile", _file_name)  # /DEF
_Same(_link, "OutputFile", _file_name)  # /OUT
_Same(_link, "PerUserRedirection", _boolean)
_Same(_link, "Profile", _boolean)  # /PROFILE
_Same(_link, "ProfileGuidedDatabase", _file_name)  # /PGD
_Same(_link, "ProgramDatabaseFile", _file_name)  # /PDB
_Same(_link, "RegisterOutput", _boolean)
_Same(_link, "SetChecksum", _boolean)  # /RELEASE
_Same(_link, "StackCommitSize", _string)
_Same(_link, "StackReserveSize", _string)  # /STACK
_Same(_link, "StripPrivateSymbols", _file_name)  # /PDBSTRIPPED
_Same(_link, "SupportUnloadOfDelayLoadedDLL", _boolean)  # /DELAY:UNLOAD
_Same(_link, "SuppressStartupBanner", _boolean)  # /NOLOGO
_Same(_link, "SwapRunFromCD", _boolean)  # /SWAPRUN:CD
_Same(_link, "TurnOffAssemblyGeneration", _boolean)  # /NOASSEMBLY
_Same(_link, "TypeLibraryFile", _file_name)  # /TLBOUT
_Same(_link, "TypeLibraryResourceID", _integer)  # /TLBID
_Same(_link, "UACUIAccess", _boolean)  # /uiAccess='true'
_Same(_link, "Version", _string)  # /VERSION

_Same(_link, "EnableCOMDATFolding", _newly_boolean)  # /OPT:ICF
_Same(_link, "FixedBaseAddress", _newly_boolean)  # /FIXED
_Same(_link, "LargeAddressAware", _newly_boolean)  # /LARGEADDRESSAWARE
_Same(_link, "OptimizeReferences", _newly_boolean)  # /OPT:REF
_Same(_link, "RandomizedBaseAddress", _newly_boolean)  # /DYNAMICBASE
_Same(_link, "TerminalServerAware", _newly_boolean)  # /TSAWARE

_subsystem_enumeration = _Enumeration(
    [
        "NotSet",
        "Console",  # /SUBSYSTEM:CONSOLE
        "Windows",  # /SUBSYSTEM:WINDOWS
        "Native",  # /SUBSYSTEM:NATIVE
        "EFI Application",  # /SUBSYSTEM:EFI_APPLICATION
        "EFI Boot Service Driver",  # /SUBSYSTEM:EFI_BOOT_SERVICE_DRIVER
        "EFI ROM",  # /SUBSYSTEM:EFI_ROM
        "EFI Runtime",  # /SUBSYSTEM:EFI_RUNTIME_DRIVER
        "WindowsCE",
    ],  # /SUBSYSTEM:WINDOWSCE
    new=["POSIX"],
)  # /SUBSYSTEM:POSIX

_target_machine_enumeration = _Enumeration(
    [
        "NotSet",
        "MachineX86",  # /MACHINE:X86
        None,
        "MachineARM",  # /MACHINE:ARM
        "MachineEBC",  # /MACHINE:EBC
        "MachineIA64",  # /MACHINE:IA64
        None,
        "MachineMIPS",  # /MACHINE:MIPS
        "MachineMIPS16",  # /MACHINE:MIPS16
        "MachineMIPSFPU",  # /MACHINE:MIPSFPU
        "MachineMIPSFPU16",  # /MACHINE:MIPSFPU16
        None,
        None,
        None,
        "MachineSH4",  # /MACHINE:SH4
        None,
        "MachineTHUMB",  # /MACHINE:THUMB
        "MachineX64",
    ]
)  # /MACHINE:X64

_Same(
    _link, "AssemblyDebug", _Enumeration(["", "true", "false"])  # /ASSEMBLYDEBUG
)  # /ASSEMBLYDEBUG:DISABLE
_Same(
    _link,
    "CLRImageType",
    _Enumeration(
        [
            "Default",
            "ForceIJWImage",  # /CLRIMAGETYPE:IJW
            "ForcePureILImage",  # /Switch="CLRIMAGETYPE:PURE
            "ForceSafeILImage",
        ]
    ),
)  # /Switch="CLRIMAGETYPE:SAFE
_Same(
    _link,
    "CLRThreadAttribute",
    _Enumeration(
        [
            "DefaultThreadingAttribute",  # /CLRTHREADATTRIBUTE:NONE
            "MTAThreadingAttribute",  # /CLRTHREADATTRIBUTE:MTA
            "STAThreadingAttribute",
        ]
    ),
)  # /CLRTHREADATTRIBUTE:STA
_Same(
    _link,
    "DataExecutionPrevention",
    _Enumeration(["", "false", "true"]),  # /NXCOMPAT:NO
)  # /NXCOMPAT
_Same(
    _link,
    "Driver",
    _Enumeration(["NotSet", "Driver", "UpOnly", "WDM"]),  # /Driver  # /DRIVER:UPONLY
)  # /DRIVER:WDM
_Same(
    _link,
    "LinkTimeCodeGeneration",
    _Enumeration(
        [
            "Default",
            "UseLinkTimeCodeGeneration",  # /LTCG
            "PGInstrument",  # /LTCG:PGInstrument
            "PGOptimization",  # /LTCG:PGOptimize
            "PGUpdate",
        ]
    ),
)  # /LTCG:PGUpdate
_Same(
    _link,
    "ShowProgress",
    _Enumeration(
        ["NotSet", "LinkVerbose", "LinkVerboseLib"],  # /VERBOSE  # /VERBOSE:Lib
        new=[
            "LinkVerboseICF",  # /VERBOSE:ICF
            "LinkVerboseREF",  # /VERBOSE:REF
            "LinkVerboseSAFESEH",  # /VERBOSE:SAFESEH
            "LinkVerboseCLR",
        ],
    ),
)  # /VERBOSE:CLR
_Same(_link, "SubSystem", _subsystem_enumeration)
_Same(_link, "TargetMachine", _target_machine_enumeration)
_Same(
    _link,
    "UACExecutionLevel",
    _Enumeration(
        [
            "AsInvoker",  # /level='asInvoker'
            "HighestAvailable",  # /level='highestAvailable'
            "RequireAdministrator",
        ]
    ),
)  # /level='requireAdministrator'
_Same(_link, "MinimumRequiredVersion", _string)
_Same(_link, "TreatLinkerWarningAsErrors", _boolean)  # /WX


# Options found in MSVS that have been renamed in MSBuild.
_Renamed(
    _link,
    "ErrorReporting",
    "LinkErrorReporting",
    _Enumeration(
        [
            "NoErrorReport",  # /ERRORREPORT:NONE
            "PromptImmediately",  # /ERRORREPORT:PROMPT
            "QueueForNextLogin",
        ],  # /ERRORREPORT:QUEUE
        new=["SendErrorReport"],
    ),
)  # /ERRORREPORT:SEND
_Renamed(
    _link, "IgnoreDefaultLibraryNames", "IgnoreSpecificDefaultLibraries", _file_list
)  # /NODEFAULTLIB
_Renamed(_link, "ResourceOnlyDLL", "NoEntryPoint", _boolean)  # /NOENTRY
_Renamed(_link, "SwapRunFromNet", "SwapRunFromNET", _boolean)  # /SWAPRUN:NET

_Moved(_link, "GenerateManifest", "", _boolean)
_Moved(_link, "IgnoreImportLibrary", "", _boolean)
_Moved(_link, "LinkIncremental", "", _newly_boolean)
_Moved(_link, "LinkLibraryDependencies", "ProjectReference", _boolean)
_Moved(_link, "UseLibraryDependencyInputs", "ProjectReference", _boolean)

# MSVS options not found in MSBuild.
_MSVSOnly(_link, "OptimizeForWindows98", _newly_boolean)
_MSVSOnly(_link, "UseUnicodeResponseFiles", _boolean)

# MSBuild options not found in MSVS.
_MSBuildOnly(_link, "BuildingInIDE", _boolean)
_MSBuildOnly(_link, "ImageHasSafeExceptionHandlers", _boolean)  # /SAFESEH
_MSBuildOnly(_link, "LinkDLL", _boolean)  # /DLL Visible='false'
_MSBuildOnly(_link, "LinkStatus", _boolean)  # /LTCG:STATUS
_MSBuildOnly(_link, "PreventDllBinding", _boolean)  # /ALLOWBIND
_MSBuildOnly(_link, "SupportNobindOfDelayLoadedDLL", _boolean)  # /DELAY:NOBIND
_MSBuildOnly(_link, "TrackerLogDirectory", _folder_name)
_MSBuildOnly(_link, "MSDOSStubFileName", _file_name)  # /STUB Visible='false'
_MSBuildOnly(_link, "SectionAlignment", _integer)  # /ALIGN
_MSBuildOnly(_link, "SpecifySectionAttributes", _string)  # /SECTION
_MSBuildOnly(
    _link,
    "ForceFileOutput",
    _Enumeration(
        [],
        new=[
            "Enabled",  # /FORCE
            # /FORCE:MULTIPLE
            "MultiplyDefinedSymbolOnly",
            "UndefinedSymbolOnly",
        ],
    ),
)  # /FORCE:UNRESOLVED
_MSBuildOnly(
    _link,
    "CreateHotPatchableImage",
    _Enumeration(
        [],
        new=[
            "Enabled",  # /FUNCTIONPADMIN
            "X86Image",  # /FUNCTIONPADMIN:5
            "X64Image",  # /FUNCTIONPADMIN:6
            "ItaniumImage",
        ],
    ),
)  # /FUNCTIONPADMIN:16
_MSBuildOnly(
    _link,
    "CLRSupportLastError",
    _Enumeration(
        [],
        new=[
            "Enabled",  # /CLRSupportLastError
            "Disabled",  # /CLRSupportLastError:NO
            # /CLRSupportLastError:SYSTEMDLL
            "SystemDlls",
        ],
    ),
)


# Directives for converting VCResourceCompilerTool to ResourceCompile.
# See "c:\Program Files (x86)\MSBuild\Microsoft.Cpp\v4.0\1033\rc.xml" for
# the schema of the MSBuild ResourceCompile settings.

_Same(_rc, "AdditionalOptions", _string_list)
_Same(_rc, "AdditionalIncludeDirectories", _folder_list)  # /I
_Same(_rc, "Culture", _Integer(msbuild_base=16))
_Same(_rc, "IgnoreStandardIncludePath", _boolean)  # /X
_Same(_rc, "PreprocessorDefinitions", _string_list)  # /D
_Same(_rc, "ResourceOutputFileName", _string)  # /fo
_Same(_rc, "ShowProgress", _boolean)  # /v
# There is no UI in VisualStudio 2008 to set the following properties.
# However they are found in CL and other tools.  Include them here for
# completeness, as they are very likely to have the same usage pattern.
_Same(_rc, "SuppressStartupBanner", _boolean)  # /nologo
_Same(_rc, "UndefinePreprocessorDefinitions", _string_list)  # /u

# MSBuild options not found in MSVS.
_MSBuildOnly(_rc, "NullTerminateStrings", _boolean)  # /n
_MSBuildOnly(_rc, "TrackerLogDirectory", _folder_name)


# Directives for converting VCMIDLTool to Midl.
# See "c:\Program Files (x86)\MSBuild\Microsoft.Cpp\v4.0\1033\midl.xml" for
# the schema of the MSBuild Midl settings.

_Same(_midl, "AdditionalIncludeDirectories", _folder_list)  # /I
_Same(_midl, "AdditionalOptions", _string_list)
_Same(_midl, "CPreprocessOptions", _string)  # /cpp_opt
_Same(_midl, "ErrorCheckAllocations", _boolean)  # /error allocation
_Same(_midl, "ErrorCheckBounds", _boolean)  # /error bounds_check
_Same(_midl, "ErrorCheckEnumRange", _boolean)  # /error enum
_Same(_midl, "ErrorCheckRefPointers", _boolean)  # /error ref
_Same(_midl, "ErrorCheckStubData", _boolean)  # /error stub_data
_Same(_midl, "GenerateStublessProxies", _boolean)  # /Oicf
_Same(_midl, "GenerateTypeLibrary", _boolean)
_Same(_midl, "HeaderFileName", _file_name)  # /h
_Same(_midl, "IgnoreStandardIncludePath", _boolean)  # /no_def_idir
_Same(_midl, "InterfaceIdentifierFileName", _file_name)  # /iid
_Same(_midl, "MkTypLibCompatible", _boolean)  # /mktyplib203
_Same(_midl, "OutputDirectory", _string)  # /out
_Same(_midl, "PreprocessorDefinitions", _string_list)  # /D
_Same(_midl, "ProxyFileName", _file_name)  # /proxy
_Same(_midl, "RedirectOutputAndErrors", _file_name)  # /o
_Same(_midl, "SuppressStartupBanner", _boolean)  # /nologo
_Same(_midl, "TypeLibraryName", _file_name)  # /tlb
_Same(_midl, "UndefinePreprocessorDefinitions", _string_list)  # /U
_Same(_midl, "WarnAsError", _boolean)  # /WX

_Same(
    _midl,
    "DefaultCharType",
    _Enumeration(["Unsigned", "Signed", "Ascii"]),  # /char unsigned  # /char signed
)  # /char ascii7
_Same(
    _midl,
    "TargetEnvironment",
    _Enumeration(
        [
            "NotSet",
            "Win32",  # /env win32
            "Itanium",  # /env ia64
            "X64",  # /env x64
            "ARM64",  # /env arm64
        ]
    ),
)
_Same(
    _midl,
    "EnableErrorChecks",
    _Enumeration(["EnableCustom", "None", "All"]),  # /error none
)  # /error all
_Same(
    _midl,
    "StructMemberAlignment",
    _Enumeration(["NotSet", "1", "2", "4", "8"]),  # Zp1  # Zp2  # Zp4
)  # Zp8
_Same(
    _midl,
    "WarningLevel",
    _Enumeration(["0", "1", "2", "3", "4"]),  # /W0  # /W1  # /W2  # /W3
)  # /W4

_Renamed(_midl, "DLLDataFileName", "DllDataFileName", _file_name)  # /dlldata
_Renamed(_midl, "ValidateParameters", "ValidateAllParameters", _boolean)  # /robust

# MSBuild options not found in MSVS.
_MSBuildOnly(_midl, "ApplicationConfigurationMode", _boolean)  # /app_config
_MSBuildOnly(_midl, "ClientStubFile", _file_name)  # /cstub
_MSBuildOnly(
    _midl, "GenerateClientFiles", _Enumeration([], new=["Stub", "None"])  # /client stub
)  # /client none
_MSBuildOnly(
    _midl, "GenerateServerFiles", _Enumeration([], new=["Stub", "None"])  # /client stub
)  # /client none
_MSBuildOnly(_midl, "LocaleID", _integer)  # /lcid DECIMAL
_MSBuildOnly(_midl, "ServerStubFile", _file_name)  # /sstub
_MSBuildOnly(_midl, "SuppressCompilerWarnings", _boolean)  # /no_warn
_MSBuildOnly(_midl, "TrackerLogDirectory", _folder_name)
_MSBuildOnly(
    _midl, "TypeLibFormat", _Enumeration([], new=["NewFormat", "OldFormat"])  # /newtlb
)  # /oldtlb


# Directives for converting VCLibrarianTool to Lib.
# See "c:\Program Files (x86)\MSBuild\Microsoft.Cpp\v4.0\1033\lib.xml" for
# the schema of the MSBuild Lib settings.

_Same(_lib, "AdditionalDependencies", _file_list)
_Same(_lib, "AdditionalLibraryDirectories", _folder_list)  # /LIBPATH
_Same(_lib, "AdditionalOptions", _string_list)
_Same(_lib, "ExportNamedFunctions", _string_list)  # /EXPORT
_Same(_lib, "ForceSymbolReferences", _string)  # /INCLUDE
_Same(_lib, "IgnoreAllDefaultLibraries", _boolean)  # /NODEFAULTLIB
_Same(_lib, "IgnoreSpecificDefaultLibraries", _file_list)  # /NODEFAULTLIB
_Same(_lib, "ModuleDefinitionFile", _file_name)  # /DEF
_Same(_lib, "OutputFile", _file_name)  # /OUT
_Same(_lib, "SuppressStartupBanner", _boolean)  # /NOLOGO
_Same(_lib, "UseUnicodeResponseFiles", _boolean)
_Same(_lib, "LinkTimeCodeGeneration", _boolean)  # /LTCG
_Same(_lib, "TargetMachine", _target_machine_enumeration)

# TODO(jeanluc) _link defines the same value that gets moved to
# ProjectReference.  We may want to validate that they are consistent.
_Moved(_lib, "LinkLibraryDependencies", "ProjectReference", _boolean)

_MSBuildOnly(_lib, "DisplayLibrary", _string)  # /LIST Visible='false'
_MSBuildOnly(
    _lib,
    "ErrorReporting",
    _Enumeration(
        [],
        new=[
            "PromptImmediately",  # /ERRORREPORT:PROMPT
            "QueueForNextLogin",  # /ERRORREPORT:QUEUE
            "SendErrorReport",  # /ERRORREPORT:SEND
            "NoErrorReport",
        ],
    ),
)  # /ERRORREPORT:NONE
_MSBuildOnly(_lib, "MinimumRequiredVersion", _string)
_MSBuildOnly(_lib, "Name", _file_name)  # /NAME
_MSBuildOnly(_lib, "RemoveObjects", _file_list)  # /REMOVE
_MSBuildOnly(_lib, "SubSystem", _subsystem_enumeration)
_MSBuildOnly(_lib, "TrackerLogDirectory", _folder_name)
_MSBuildOnly(_lib, "TreatLibWarningAsErrors", _boolean)  # /WX
_MSBuildOnly(_lib, "Verbose", _boolean)


# Directives for converting VCManifestTool to Mt.
# See "c:\Program Files (x86)\MSBuild\Microsoft.Cpp\v4.0\1033\mt.xml" for
# the schema of the MSBuild Lib settings.

# Options that have the same name in MSVS and MSBuild
_Same(_manifest, "AdditionalManifestFiles", _file_list)  # /manifest
_Same(_manifest, "AdditionalOptions", _string_list)
_Same(_manifest, "AssemblyIdentity", _string)  # /identity:
_Same(_manifest, "ComponentFileName", _file_name)  # /dll
_Same(_manifest, "GenerateCatalogFiles", _boolean)  # /makecdfs
_Same(_manifest, "InputResourceManifests", _string)  # /inputresource
_Same(_manifest, "OutputManifestFile", _file_name)  # /out
_Same(_manifest, "RegistrarScriptFile", _file_name)  # /rgs
_Same(_manifest, "ReplacementsFile", _file_name)  # /replacements
_Same(_manifest, "SuppressStartupBanner", _boolean)  # /nologo
_Same(_manifest, "TypeLibraryFile", _file_name)  # /tlb:
_Same(_manifest, "UpdateFileHashes", _boolean)  # /hashupdate
_Same(_manifest, "UpdateFileHashesSearchPath", _file_name)
_Same(_manifest, "VerboseOutput", _boolean)  # /verbose

# Options that have moved location.
_MovedAndRenamed(
    _manifest,
    "ManifestResourceFile",
    "ManifestResourceCompile",
    "ResourceOutputFileName",
    _file_name,
)
_Moved(_manifest, "EmbedManifest", "", _boolean)

# MSVS options not found in MSBuild.
_MSVSOnly(_manifest, "DependencyInformationFile", _file_name)
_MSVSOnly(_manifest, "UseFAT32Workaround", _boolean)
_MSVSOnly(_manifest, "UseUnicodeResponseFiles", _boolean)

# MSBuild options not found in MSVS.
_MSBuildOnly(_manifest, "EnableDPIAwareness", _boolean)
_MSBuildOnly(_manifest, "GenerateCategoryTags", _boolean)  # /category
_MSBuildOnly(
    _manifest, "ManifestFromManagedAssembly", _file_name
)  # /managedassemblyname
_MSBuildOnly(_manifest, "OutputResourceManifests", _string)  # /outputresource
_MSBuildOnly(_manifest, "SuppressDependencyElement", _boolean)  # /nodependency
_MSBuildOnly(_manifest, "TrackerLogDirectory", _folder_name)


# Directives for MASM.
# See "$(VCTargetsPath)\BuildCustomizations\masm.xml" for the schema of the
# MSBuild MASM settings.

# Options that have the same name in MSVS and MSBuild.
_Same(_masm, "UseSafeExceptionHandlers", _boolean)  # /safeseh
