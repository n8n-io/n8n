# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""
This module helps emulate Visual Studio 2008 behavior on top of other
build systems, primarily ninja.
"""

import collections
import os
import re
import subprocess
import sys

from gyp.common import OrderedSet
import gyp.MSVSUtil
import gyp.MSVSVersion

windows_quoter_regex = re.compile(r'(\\*)"')


def QuoteForRspFile(arg, quote_cmd=True):
    """Quote a command line argument so that it appears as one argument when
    processed via cmd.exe and parsed by CommandLineToArgvW (as is typical for
    Windows programs)."""
    # See http://goo.gl/cuFbX and http://goo.gl/dhPnp including the comment
    # threads. This is actually the quoting rules for CommandLineToArgvW, not
    # for the shell, because the shell doesn't do anything in Windows. This
    # works more or less because most programs (including the compiler, etc.)
    # use that function to handle command line arguments.

    # Use a heuristic to try to find args that are paths, and normalize them
    if arg.find("/") > 0 or arg.count("/") > 1:
        arg = os.path.normpath(arg)

    # For a literal quote, CommandLineToArgvW requires 2n+1 backslashes
    # preceding it, and results in n backslashes + the quote. So we substitute
    # in 2* what we match, +1 more, plus the quote.
    if quote_cmd:
        arg = windows_quoter_regex.sub(lambda mo: 2 * mo.group(1) + '\\"', arg)

    # %'s also need to be doubled otherwise they're interpreted as batch
    # positional arguments. Also make sure to escape the % so that they're
    # passed literally through escaping so they can be singled to just the
    # original %. Otherwise, trying to pass the literal representation that
    # looks like an environment variable to the shell (e.g. %PATH%) would fail.
    arg = arg.replace("%", "%%")

    # These commands are used in rsp files, so no escaping for the shell (via ^)
    # is necessary.

    # As a workaround for programs that don't use CommandLineToArgvW, gyp
    # supports msvs_quote_cmd=0, which simply disables all quoting.
    if quote_cmd:
        # Finally, wrap the whole thing in quotes so that the above quote rule
        # applies and whitespace isn't a word break.
        return f'"{arg}"'

    return arg


def EncodeRspFileList(args, quote_cmd):
    """Process a list of arguments using QuoteCmdExeArgument."""
    # Note that the first argument is assumed to be the command. Don't add
    # quotes around it because then built-ins like 'echo', etc. won't work.
    # Take care to normpath only the path in the case of 'call ../x.bat' because
    # otherwise the whole thing is incorrectly interpreted as a path and not
    # normalized correctly.
    if not args:
        return ""
    if args[0].startswith("call "):
        call, program = args[0].split(" ", 1)
        program = call + " " + os.path.normpath(program)
    else:
        program = os.path.normpath(args[0])
    return (program + " "
            + " ".join(QuoteForRspFile(arg, quote_cmd) for arg in args[1:]))


def _GenericRetrieve(root, default, path):
    """Given a list of dictionary keys |path| and a tree of dicts |root|, find
    value at path, or return |default| if any of the path doesn't exist."""
    if not root:
        return default
    if not path:
        return root
    return _GenericRetrieve(root.get(path[0]), default, path[1:])


def _AddPrefix(element, prefix):
    """Add |prefix| to |element| or each subelement if element is iterable."""
    if element is None:
        return element
    # Note, not Iterable because we don't want to handle strings like that.
    if isinstance(element, list) or isinstance(element, tuple):
        return [prefix + e for e in element]
    else:
        return prefix + element


def _DoRemapping(element, map):
    """If |element| then remap it through |map|. If |element| is iterable then
    each item will be remapped. Any elements not found will be removed."""
    if map is not None and element is not None:
        if not callable(map):
            map = map.get  # Assume it's a dict, otherwise a callable to do the remap.
        if isinstance(element, list) or isinstance(element, tuple):
            element = filter(None, [map(elem) for elem in element])
        else:
            element = map(element)
    return element


def _AppendOrReturn(append, element):
    """If |append| is None, simply return |element|. If |append| is not None,
    then add |element| to it, adding each item in |element| if it's a list or
    tuple."""
    if append is not None and element is not None:
        if isinstance(element, list) or isinstance(element, tuple):
            append.extend(element)
        else:
            append.append(element)
    else:
        return element


def _FindDirectXInstallation():
    """Try to find an installation location for the DirectX SDK. Check for the
    standard environment variable, and if that doesn't exist, try to find
    via the registry. May return None if not found in either location."""
    # Return previously calculated value, if there is one
    if hasattr(_FindDirectXInstallation, "dxsdk_dir"):
        return _FindDirectXInstallation.dxsdk_dir

    dxsdk_dir = os.environ.get("DXSDK_DIR")
    if not dxsdk_dir:
        # Setup params to pass to and attempt to launch reg.exe.
        cmd = ["reg.exe", "query", r"HKLM\Software\Microsoft\DirectX", "/s"]
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout = p.communicate()[0].decode("utf-8")
        for line in stdout.splitlines():
            if "InstallPath" in line:
                dxsdk_dir = line.split("    ")[3] + "\\"

    # Cache return value
    _FindDirectXInstallation.dxsdk_dir = dxsdk_dir
    return dxsdk_dir


def GetGlobalVSMacroEnv(vs_version):
    """Get a dict of variables mapping internal VS macro names to their gyp
    equivalents. Returns all variables that are independent of the target."""
    env = {}
    # '$(VSInstallDir)' and '$(VCInstallDir)' are available when and only when
    # Visual Studio is actually installed.
    if vs_version.Path():
        env["$(VSInstallDir)"] = vs_version.Path()
        env["$(VCInstallDir)"] = os.path.join(vs_version.Path(), "VC") + "\\"
    # Chromium uses DXSDK_DIR in include/lib paths, but it may or may not be
    # set. This happens when the SDK is sync'd via src-internal, rather than
    # by typical end-user installation of the SDK. If it's not set, we don't
    # want to leave the unexpanded variable in the path, so simply strip it.
    dxsdk_dir = _FindDirectXInstallation()
    env["$(DXSDK_DIR)"] = dxsdk_dir if dxsdk_dir else ""
    # Try to find an installation location for the Windows DDK by checking
    # the WDK_DIR environment variable, may be None.
    env["$(WDK_DIR)"] = os.environ.get("WDK_DIR", "")
    return env


def ExtractSharedMSVSSystemIncludes(configs, generator_flags):
    """Finds msvs_system_include_dirs that are common to all targets, removes
    them from all targets, and returns an OrderedSet containing them."""
    all_system_includes = OrderedSet(configs[0].get("msvs_system_include_dirs", []))
    for config in configs[1:]:
        system_includes = config.get("msvs_system_include_dirs", [])
        all_system_includes = all_system_includes & OrderedSet(system_includes)
    if not all_system_includes:
        return None
    # Expand macros in all_system_includes.
    env = GetGlobalVSMacroEnv(GetVSVersion(generator_flags))
    expanded_system_includes = OrderedSet(
        [ExpandMacros(include, env) for include in all_system_includes]
    )
    if any(["$" in include for include in expanded_system_includes]):
        # Some path relies on target-specific variables, bail.
        return None

    # Remove system includes shared by all targets from the targets.
    for config in configs:
        includes = config.get("msvs_system_include_dirs", [])
        if includes:  # Don't insert a msvs_system_include_dirs key if not needed.
            # This must check the unexpanded includes list:
            new_includes = [i for i in includes if i not in all_system_includes]
            config["msvs_system_include_dirs"] = new_includes
    return expanded_system_includes


class MsvsSettings:
    """A class that understands the gyp 'msvs_...' values (especially the
    msvs_settings field). They largely correpond to the VS2008 IDE DOM. This
    class helps map those settings to command line options."""

    def __init__(self, spec, generator_flags):
        self.spec = spec
        self.vs_version = GetVSVersion(generator_flags)

        supported_fields = [
            ("msvs_configuration_attributes", dict),
            ("msvs_settings", dict),
            ("msvs_system_include_dirs", list),
            ("msvs_disabled_warnings", list),
            ("msvs_precompiled_header", str),
            ("msvs_precompiled_source", str),
            ("msvs_configuration_platform", str),
            ("msvs_target_platform", str),
        ]
        configs = spec["configurations"]
        for field, default in supported_fields:
            setattr(self, field, {})
            for configname, config in configs.items():
                getattr(self, field)[configname] = config.get(field, default())

        self.msvs_cygwin_dirs = spec.get("msvs_cygwin_dirs", ["."])

        unsupported_fields = [
            "msvs_prebuild",
            "msvs_postbuild",
        ]
        unsupported = []
        for field in unsupported_fields:
            for config in configs.values():
                if field in config:
                    unsupported += [
                        "{} not supported (target {}).".format(
                            field, spec["target_name"]
                        )
                    ]
        if unsupported:
            raise Exception("\n".join(unsupported))

    def GetExtension(self):
        """Returns the extension for the target, with no leading dot.

        Uses 'product_extension' if specified, otherwise uses MSVS defaults based on
        the target type.
        """
        ext = self.spec.get("product_extension", None)
        if ext:
            return ext
        return gyp.MSVSUtil.TARGET_TYPE_EXT.get(self.spec["type"], "")

    def GetVSMacroEnv(self, base_to_build=None, config=None):
        """Get a dict of variables mapping internal VS macro names to their gyp
        equivalents."""
        target_arch = self.GetArch(config)
        if target_arch == "x86":
            target_platform = "Win32"
        else:
            target_platform = target_arch
        target_name = self.spec.get("product_prefix", "") + self.spec.get(
            "product_name", self.spec["target_name"]
        )
        target_dir = base_to_build + "\\" if base_to_build else ""
        target_ext = "." + self.GetExtension()
        target_file_name = target_name + target_ext

        replacements = {
            "$(InputName)": "${root}",
            "$(InputPath)": "${source}",
            "$(IntDir)": "$!INTERMEDIATE_DIR",
            "$(OutDir)\\": target_dir,
            "$(PlatformName)": target_platform,
            "$(ProjectDir)\\": "",
            "$(ProjectName)": self.spec["target_name"],
            "$(TargetDir)\\": target_dir,
            "$(TargetExt)": target_ext,
            "$(TargetFileName)": target_file_name,
            "$(TargetName)": target_name,
            "$(TargetPath)": os.path.join(target_dir, target_file_name),
        }
        replacements.update(GetGlobalVSMacroEnv(self.vs_version))
        return replacements

    def ConvertVSMacros(self, s, base_to_build=None, config=None):
        """Convert from VS macro names to something equivalent."""
        env = self.GetVSMacroEnv(base_to_build, config=config)
        return ExpandMacros(s, env)

    def AdjustLibraries(self, libraries):
        """Strip -l from library if it's specified with that."""
        libs = [lib[2:] if lib.startswith("-l") else lib for lib in libraries]
        return [
            lib + ".lib"
            if not lib.lower().endswith(".lib") and not lib.lower().endswith(".obj")
            else lib
            for lib in libs
        ]

    def _GetAndMunge(self, field, path, default, prefix, append, map):
        """Retrieve a value from |field| at |path| or return |default|. If
        |append| is specified, and the item is found, it will be appended to that
        object instead of returned. If |map| is specified, results will be
        remapped through |map| before being returned or appended."""
        result = _GenericRetrieve(field, default, path)
        result = _DoRemapping(result, map)
        result = _AddPrefix(result, prefix)
        return _AppendOrReturn(append, result)

    class _GetWrapper:
        def __init__(self, parent, field, base_path, append=None):
            self.parent = parent
            self.field = field
            self.base_path = [base_path]
            self.append = append

        def __call__(self, name, map=None, prefix="", default=None):
            return self.parent._GetAndMunge(
                self.field,
                self.base_path + [name],
                default=default,
                prefix=prefix,
                append=self.append,
                map=map,
            )

    def GetArch(self, config):
        """Get architecture based on msvs_configuration_platform and
        msvs_target_platform. Returns either 'x86' or 'x64'."""
        configuration_platform = self.msvs_configuration_platform.get(config, "")
        platform = self.msvs_target_platform.get(config, "")
        if not platform:  # If no specific override, use the configuration's.
            platform = configuration_platform
        # Map from platform to architecture.
        return {"Win32": "x86", "x64": "x64", "ARM64": "arm64"}.get(platform, "x86")

    def _TargetConfig(self, config):
        """Returns the target-specific configuration."""
        # There's two levels of architecture/platform specification in VS. The
        # first level is globally for the configuration (this is what we consider
        # "the" config at the gyp level, which will be something like 'Debug' or
        # 'Release'), VS2015 and later only use this level
        if int(self.vs_version.short_name) >= 2015:
            return config
        # and a second target-specific configuration, which is an
        # override for the global one. |config| is remapped here to take into
        # account the local target-specific overrides to the global configuration.
        arch = self.GetArch(config)
        if arch == "x64" and not config.endswith("_x64"):
            config += "_x64"
        if arch == "x86" and config.endswith("_x64"):
            config = config.rsplit("_", 1)[0]
        return config

    def _Setting(self, path, config, default=None, prefix="", append=None, map=None):
        """_GetAndMunge for msvs_settings."""
        return self._GetAndMunge(
            self.msvs_settings[config], path, default, prefix, append, map
        )

    def _ConfigAttrib(
        self, path, config, default=None, prefix="", append=None, map=None
    ):
        """_GetAndMunge for msvs_configuration_attributes."""
        return self._GetAndMunge(
            self.msvs_configuration_attributes[config],
            path,
            default,
            prefix,
            append,
            map,
        )

    def AdjustIncludeDirs(self, include_dirs, config):
        """Updates include_dirs to expand VS specific paths, and adds the system
        include dirs used for platform SDK and similar."""
        config = self._TargetConfig(config)
        includes = include_dirs + self.msvs_system_include_dirs[config]
        includes.extend(
            self._Setting(
                ("VCCLCompilerTool", "AdditionalIncludeDirectories"), config, default=[]
            )
        )
        return [self.ConvertVSMacros(p, config=config) for p in includes]

    def AdjustMidlIncludeDirs(self, midl_include_dirs, config):
        """Updates midl_include_dirs to expand VS specific paths, and adds the
        system include dirs used for platform SDK and similar."""
        config = self._TargetConfig(config)
        includes = midl_include_dirs + self.msvs_system_include_dirs[config]
        includes.extend(
            self._Setting(
                ("VCMIDLTool", "AdditionalIncludeDirectories"), config, default=[]
            )
        )
        return [self.ConvertVSMacros(p, config=config) for p in includes]

    def GetComputedDefines(self, config):
        """Returns the set of defines that are injected to the defines list based
        on other VS settings."""
        config = self._TargetConfig(config)
        defines = []
        if self._ConfigAttrib(["CharacterSet"], config) == "1":
            defines.extend(("_UNICODE", "UNICODE"))
        if self._ConfigAttrib(["CharacterSet"], config) == "2":
            defines.append("_MBCS")
        defines.extend(
            self._Setting(
                ("VCCLCompilerTool", "PreprocessorDefinitions"), config, default=[]
            )
        )
        return defines

    def GetCompilerPdbName(self, config, expand_special):
        """Get the pdb file name that should be used for compiler invocations, or
        None if there's no explicit name specified."""
        config = self._TargetConfig(config)
        pdbname = self._Setting(("VCCLCompilerTool", "ProgramDataBaseFileName"), config)
        if pdbname:
            pdbname = expand_special(self.ConvertVSMacros(pdbname))
        return pdbname

    def GetMapFileName(self, config, expand_special):
        """Gets the explicitly overridden map file name for a target or returns None
        if it's not set."""
        config = self._TargetConfig(config)
        map_file = self._Setting(("VCLinkerTool", "MapFileName"), config)
        if map_file:
            map_file = expand_special(self.ConvertVSMacros(map_file, config=config))
        return map_file

    def GetOutputName(self, config, expand_special):
        """Gets the explicitly overridden output name for a target or returns None
        if it's not overridden."""
        config = self._TargetConfig(config)
        type = self.spec["type"]
        root = "VCLibrarianTool" if type == "static_library" else "VCLinkerTool"
        # TODO(scottmg): Handle OutputDirectory without OutputFile.
        output_file = self._Setting((root, "OutputFile"), config)
        if output_file:
            output_file = expand_special(
                self.ConvertVSMacros(output_file, config=config)
            )
        return output_file

    def GetPDBName(self, config, expand_special, default):
        """Gets the explicitly overridden pdb name for a target or returns
        default if it's not overridden, or if no pdb will be generated."""
        config = self._TargetConfig(config)
        output_file = self._Setting(("VCLinkerTool", "ProgramDatabaseFile"), config)
        generate_debug_info = self._Setting(
            ("VCLinkerTool", "GenerateDebugInformation"), config
        )
        if generate_debug_info == "true":
            if output_file:
                return expand_special(self.ConvertVSMacros(output_file, config=config))
            else:
                return default
        else:
            return None

    def GetNoImportLibrary(self, config):
        """If NoImportLibrary: true, ninja will not expect the output to include
        an import library."""
        config = self._TargetConfig(config)
        noimplib = self._Setting(("NoImportLibrary",), config)
        return noimplib == "true"

    def GetAsmflags(self, config):
        """Returns the flags that need to be added to ml invocations."""
        config = self._TargetConfig(config)
        asmflags = []
        safeseh = self._Setting(("MASM", "UseSafeExceptionHandlers"), config)
        if safeseh == "true":
            asmflags.append("/safeseh")
        return asmflags

    def GetCflags(self, config):
        """Returns the flags that need to be added to .c and .cc compilations."""
        config = self._TargetConfig(config)
        cflags = []
        cflags.extend(["/wd" + w for w in self.msvs_disabled_warnings[config]])
        cl = self._GetWrapper(
            self, self.msvs_settings[config], "VCCLCompilerTool", append=cflags
        )
        cl(
            "Optimization",
            map={"0": "d", "1": "1", "2": "2", "3": "x"},
            prefix="/O",
            default="2",
        )
        cl("InlineFunctionExpansion", prefix="/Ob")
        cl("DisableSpecificWarnings", prefix="/wd")
        cl("StringPooling", map={"true": "/GF"})
        cl("EnableFiberSafeOptimizations", map={"true": "/GT"})
        cl("OmitFramePointers", map={"false": "-", "true": ""}, prefix="/Oy")
        cl("EnableIntrinsicFunctions", map={"false": "-", "true": ""}, prefix="/Oi")
        cl("FavorSizeOrSpeed", map={"1": "t", "2": "s"}, prefix="/O")
        cl(
            "FloatingPointModel",
            map={"0": "precise", "1": "strict", "2": "fast"},
            prefix="/fp:",
            default="0",
        )
        cl("CompileAsManaged", map={"false": "", "true": "/clr"})
        cl("WholeProgramOptimization", map={"true": "/GL"})
        cl("WarningLevel", prefix="/W")
        cl("WarnAsError", map={"true": "/WX"})
        cl(
            "CallingConvention",
            map={"0": "d", "1": "r", "2": "z", "3": "v"},
            prefix="/G",
        )
        cl("DebugInformationFormat", map={"1": "7", "3": "i", "4": "I"}, prefix="/Z")
        cl("RuntimeTypeInfo", map={"true": "/GR", "false": "/GR-"})
        cl("EnableFunctionLevelLinking", map={"true": "/Gy", "false": "/Gy-"})
        cl("MinimalRebuild", map={"true": "/Gm"})
        cl("BufferSecurityCheck", map={"true": "/GS", "false": "/GS-"})
        cl("BasicRuntimeChecks", map={"1": "s", "2": "u", "3": "1"}, prefix="/RTC")
        cl(
            "RuntimeLibrary",
            map={"0": "T", "1": "Td", "2": "D", "3": "Dd"},
            prefix="/M",
        )
        cl("ExceptionHandling", map={"1": "sc", "2": "a"}, prefix="/EH")
        cl("DefaultCharIsUnsigned", map={"true": "/J"})
        cl(
            "TreatWChar_tAsBuiltInType",
            map={"false": "-", "true": ""},
            prefix="/Zc:wchar_t",
        )
        cl("EnablePREfast", map={"true": "/analyze"})
        cl("AdditionalOptions", prefix="")
        cl(
            "EnableEnhancedInstructionSet",
            map={"1": "SSE", "2": "SSE2", "3": "AVX", "4": "IA32", "5": "AVX2"},
            prefix="/arch:",
        )
        cflags.extend(
            [
                "/FI" + f
                for f in self._Setting(
                    ("VCCLCompilerTool", "ForcedIncludeFiles"), config, default=[]
                )
            ]
        )
        if float(self.vs_version.project_version) >= 12.0:
            # New flag introduced in VS2013 (project version 12.0) Forces writes to
            # the program database (PDB) to be serialized through MSPDBSRV.EXE.
            # https://msdn.microsoft.com/en-us/library/dn502518.aspx
            cflags.append("/FS")
        # ninja handles parallelism by itself, don't have the compiler do it too.
        cflags = [x for x in cflags if not x.startswith("/MP")]
        return cflags

    def _GetPchFlags(self, config, extension):
        """Get the flags to be added to the cflags for precompiled header support."""
        config = self._TargetConfig(config)
        # The PCH is only built once by a particular source file. Usage of PCH must
        # only be for the same language (i.e. C vs. C++), so only include the pch
        # flags when the language matches.
        if self.msvs_precompiled_header[config]:
            source_ext = os.path.splitext(self.msvs_precompiled_source[config])[1]
            if _LanguageMatchesForPch(source_ext, extension):
                pch = self.msvs_precompiled_header[config]
                pchbase = os.path.split(pch)[1]
                return ["/Yu" + pch, "/FI" + pch, "/Fp${pchprefix}." + pchbase + ".pch"]
        return []

    def GetCflagsC(self, config):
        """Returns the flags that need to be added to .c compilations."""
        config = self._TargetConfig(config)
        return self._GetPchFlags(config, ".c")

    def GetCflagsCC(self, config):
        """Returns the flags that need to be added to .cc compilations."""
        config = self._TargetConfig(config)
        return ["/TP"] + self._GetPchFlags(config, ".cc")

    def _GetAdditionalLibraryDirectories(self, root, config, gyp_to_build_path):
        """Get and normalize the list of paths in AdditionalLibraryDirectories
        setting."""
        config = self._TargetConfig(config)
        libpaths = self._Setting(
            (root, "AdditionalLibraryDirectories"), config, default=[]
        )
        libpaths = [
            os.path.normpath(gyp_to_build_path(self.ConvertVSMacros(p, config=config)))
            for p in libpaths
        ]
        return ['/LIBPATH:"' + p + '"' for p in libpaths]

    def GetLibFlags(self, config, gyp_to_build_path):
        """Returns the flags that need to be added to lib commands."""
        config = self._TargetConfig(config)
        libflags = []
        lib = self._GetWrapper(
            self, self.msvs_settings[config], "VCLibrarianTool", append=libflags
        )
        libflags.extend(
            self._GetAdditionalLibraryDirectories(
                "VCLibrarianTool", config, gyp_to_build_path
            )
        )
        lib("LinkTimeCodeGeneration", map={"true": "/LTCG"})
        lib(
            "TargetMachine",
            map={"1": "X86", "17": "X64", "3": "ARM"},
            prefix="/MACHINE:",
        )
        lib("AdditionalOptions")
        return libflags

    def GetDefFile(self, gyp_to_build_path):
        """Returns the .def file from sources, if any.  Otherwise returns None."""
        spec = self.spec
        if spec["type"] in ("shared_library", "loadable_module", "executable"):
            def_files = [
                s for s in spec.get("sources", []) if s.lower().endswith(".def")
            ]
            if len(def_files) == 1:
                return gyp_to_build_path(def_files[0])
            elif len(def_files) > 1:
                raise Exception("Multiple .def files")
        return None

    def _GetDefFileAsLdflags(self, ldflags, gyp_to_build_path):
        """.def files get implicitly converted to a ModuleDefinitionFile for the
        linker in the VS generator. Emulate that behaviour here."""
        def_file = self.GetDefFile(gyp_to_build_path)
        if def_file:
            ldflags.append('/DEF:"%s"' % def_file)

    def GetPGDName(self, config, expand_special):
        """Gets the explicitly overridden pgd name for a target or returns None
        if it's not overridden."""
        config = self._TargetConfig(config)
        output_file = self._Setting(("VCLinkerTool", "ProfileGuidedDatabase"), config)
        if output_file:
            output_file = expand_special(
                self.ConvertVSMacros(output_file, config=config)
            )
        return output_file

    def GetLdflags(
        self,
        config,
        gyp_to_build_path,
        expand_special,
        manifest_base_name,
        output_name,
        is_executable,
        build_dir,
    ):
        """Returns the flags that need to be added to link commands, and the
        manifest files."""
        config = self._TargetConfig(config)
        ldflags = []
        ld = self._GetWrapper(
            self, self.msvs_settings[config], "VCLinkerTool", append=ldflags
        )
        self._GetDefFileAsLdflags(ldflags, gyp_to_build_path)
        ld("GenerateDebugInformation", map={"true": "/DEBUG"})
        # TODO: These 'map' values come from machineTypeOption enum,
        # and does not have an official value for ARM64 in VS2017 (yet).
        # It needs to verify the ARM64 value when machineTypeOption is updated.
        ld(
            "TargetMachine",
            map={"1": "X86", "17": "X64", "3": "ARM", "18": "ARM64"},
            prefix="/MACHINE:",
        )
        ldflags.extend(
            self._GetAdditionalLibraryDirectories(
                "VCLinkerTool", config, gyp_to_build_path
            )
        )
        ld("DelayLoadDLLs", prefix="/DELAYLOAD:")
        ld("TreatLinkerWarningAsErrors", prefix="/WX", map={"true": "", "false": ":NO"})
        out = self.GetOutputName(config, expand_special)
        if out:
            ldflags.append("/OUT:" + out)
        pdb = self.GetPDBName(config, expand_special, output_name + ".pdb")
        if pdb:
            ldflags.append("/PDB:" + pdb)
        pgd = self.GetPGDName(config, expand_special)
        if pgd:
            ldflags.append("/PGD:" + pgd)
        map_file = self.GetMapFileName(config, expand_special)
        ld("GenerateMapFile", map={"true": "/MAP:" + map_file if map_file else "/MAP"})
        ld("MapExports", map={"true": "/MAPINFO:EXPORTS"})
        ld("AdditionalOptions", prefix="")

        minimum_required_version = self._Setting(
            ("VCLinkerTool", "MinimumRequiredVersion"), config, default=""
        )
        if minimum_required_version:
            minimum_required_version = "," + minimum_required_version
        ld(
            "SubSystem",
            map={
                "1": "CONSOLE%s" % minimum_required_version,
                "2": "WINDOWS%s" % minimum_required_version,
            },
            prefix="/SUBSYSTEM:",
        )

        stack_reserve_size = self._Setting(
            ("VCLinkerTool", "StackReserveSize"), config, default=""
        )
        if stack_reserve_size:
            stack_commit_size = self._Setting(
                ("VCLinkerTool", "StackCommitSize"), config, default=""
            )
            if stack_commit_size:
                stack_commit_size = "," + stack_commit_size
            ldflags.append(f"/STACK:{stack_reserve_size}{stack_commit_size}")

        ld("TerminalServerAware", map={"1": ":NO", "2": ""}, prefix="/TSAWARE")
        ld("LinkIncremental", map={"1": ":NO", "2": ""}, prefix="/INCREMENTAL")
        ld("BaseAddress", prefix="/BASE:")
        ld("FixedBaseAddress", map={"1": ":NO", "2": ""}, prefix="/FIXED")
        ld("RandomizedBaseAddress", map={"1": ":NO", "2": ""}, prefix="/DYNAMICBASE")
        ld("DataExecutionPrevention", map={"1": ":NO", "2": ""}, prefix="/NXCOMPAT")
        ld("OptimizeReferences", map={"1": "NOREF", "2": "REF"}, prefix="/OPT:")
        ld("ForceSymbolReferences", prefix="/INCLUDE:")
        ld("EnableCOMDATFolding", map={"1": "NOICF", "2": "ICF"}, prefix="/OPT:")
        ld(
            "LinkTimeCodeGeneration",
            map={"1": "", "2": ":PGINSTRUMENT", "3": ":PGOPTIMIZE", "4": ":PGUPDATE"},
            prefix="/LTCG",
        )
        ld("IgnoreDefaultLibraryNames", prefix="/NODEFAULTLIB:")
        ld("ResourceOnlyDLL", map={"true": "/NOENTRY"})
        ld("EntryPointSymbol", prefix="/ENTRY:")
        ld("Profile", map={"true": "/PROFILE"})
        ld("LargeAddressAware", map={"1": ":NO", "2": ""}, prefix="/LARGEADDRESSAWARE")
        # TODO(scottmg): This should sort of be somewhere else (not really a flag).
        ld("AdditionalDependencies", prefix="")

        if self.GetArch(config) == "x86":
            safeseh_default = "true"
        else:
            safeseh_default = None
        ld(
            "ImageHasSafeExceptionHandlers",
            map={"false": ":NO", "true": ""},
            prefix="/SAFESEH",
            default=safeseh_default,
        )

        # If the base address is not specifically controlled, DYNAMICBASE should
        # be on by default.
        if not any("DYNAMICBASE" in flag or flag == "/FIXED" for flag in ldflags):
            ldflags.append("/DYNAMICBASE")

        # If the NXCOMPAT flag has not been specified, default to on. Despite the
        # documentation that says this only defaults to on when the subsystem is
        # Vista or greater (which applies to the linker), the IDE defaults it on
        # unless it's explicitly off.
        if not any("NXCOMPAT" in flag for flag in ldflags):
            ldflags.append("/NXCOMPAT")

        have_def_file = any(flag.startswith("/DEF:") for flag in ldflags)
        (
            manifest_flags,
            intermediate_manifest,
            manifest_files,
        ) = self._GetLdManifestFlags(
            config,
            manifest_base_name,
            gyp_to_build_path,
            is_executable and not have_def_file,
            build_dir,
        )
        ldflags.extend(manifest_flags)
        return ldflags, intermediate_manifest, manifest_files

    def _GetLdManifestFlags(
        self, config, name, gyp_to_build_path, allow_isolation, build_dir
    ):
        """Returns a 3-tuple:
        - the set of flags that need to be added to the link to generate
          a default manifest
        - the intermediate manifest that the linker will generate that should be
          used to assert it doesn't add anything to the merged one.
        - the list of all the manifest files to be merged by the manifest tool and
          included into the link."""
        generate_manifest = self._Setting(
            ("VCLinkerTool", "GenerateManifest"), config, default="true"
        )
        if generate_manifest != "true":
            # This means not only that the linker should not generate the intermediate
            # manifest but also that the manifest tool should do nothing even when
            # additional manifests are specified.
            return ["/MANIFEST:NO"], [], []

        output_name = name + ".intermediate.manifest"
        flags = [
            "/MANIFEST",
            "/ManifestFile:" + output_name,
        ]

        # Instead of using the MANIFESTUAC flags, we generate a .manifest to
        # include into the list of manifests. This allows us to avoid the need to
        # do two passes during linking. The /MANIFEST flag and /ManifestFile are
        # still used, and the intermediate manifest is used to assert that the
        # final manifest we get from merging all the additional manifest files
        # (plus the one we generate here) isn't modified by merging the
        # intermediate into it.

        # Always NO, because we generate a manifest file that has what we want.
        flags.append("/MANIFESTUAC:NO")

        config = self._TargetConfig(config)
        enable_uac = self._Setting(
            ("VCLinkerTool", "EnableUAC"), config, default="true"
        )
        manifest_files = []
        generated_manifest_outer = (
            "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
            "<assembly xmlns='urn:schemas-microsoft-com:asm.v1' manifestVersion='1.0'>"
            "%s</assembly>"
        )
        if enable_uac == "true":
            execution_level = self._Setting(
                ("VCLinkerTool", "UACExecutionLevel"), config, default="0"
            )
            execution_level_map = {
                "0": "asInvoker",
                "1": "highestAvailable",
                "2": "requireAdministrator",
            }

            ui_access = self._Setting(
                ("VCLinkerTool", "UACUIAccess"), config, default="false"
            )

            inner = """
<trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
  <security>
    <requestedPrivileges>
      <requestedExecutionLevel level='{}' uiAccess='{}' />
    </requestedPrivileges>
  </security>
</trustInfo>""".format(
                execution_level_map[execution_level],
                ui_access,
            )
        else:
            inner = ""

        generated_manifest_contents = generated_manifest_outer % inner
        generated_name = name + ".generated.manifest"
        # Need to join with the build_dir here as we're writing it during
        # generation time, but we return the un-joined version because the build
        # will occur in that directory. We only write the file if the contents
        # have changed so that simply regenerating the project files doesn't
        # cause a relink.
        build_dir_generated_name = os.path.join(build_dir, generated_name)
        gyp.common.EnsureDirExists(build_dir_generated_name)
        f = gyp.common.WriteOnDiff(build_dir_generated_name)
        f.write(generated_manifest_contents)
        f.close()
        manifest_files = [generated_name]

        if allow_isolation:
            flags.append("/ALLOWISOLATION")

        manifest_files += self._GetAdditionalManifestFiles(config, gyp_to_build_path)
        return flags, output_name, manifest_files

    def _GetAdditionalManifestFiles(self, config, gyp_to_build_path):
        """Gets additional manifest files that are added to the default one
        generated by the linker."""
        files = self._Setting(
            ("VCManifestTool", "AdditionalManifestFiles"), config, default=[]
        )
        if isinstance(files, str):
            files = files.split(";")
        return [
            os.path.normpath(gyp_to_build_path(self.ConvertVSMacros(f, config=config)))
            for f in files
        ]

    def IsUseLibraryDependencyInputs(self, config):
        """Returns whether the target should be linked via Use Library Dependency
        Inputs (using component .objs of a given .lib)."""
        config = self._TargetConfig(config)
        uldi = self._Setting(("VCLinkerTool", "UseLibraryDependencyInputs"), config)
        return uldi == "true"

    def IsEmbedManifest(self, config):
        """Returns whether manifest should be linked into binary."""
        config = self._TargetConfig(config)
        embed = self._Setting(
            ("VCManifestTool", "EmbedManifest"), config, default="true"
        )
        return embed == "true"

    def IsLinkIncremental(self, config):
        """Returns whether the target should be linked incrementally."""
        config = self._TargetConfig(config)
        link_inc = self._Setting(("VCLinkerTool", "LinkIncremental"), config)
        return link_inc != "1"

    def GetRcflags(self, config, gyp_to_ninja_path):
        """Returns the flags that need to be added to invocations of the resource
        compiler."""
        config = self._TargetConfig(config)
        rcflags = []
        rc = self._GetWrapper(
            self, self.msvs_settings[config], "VCResourceCompilerTool", append=rcflags
        )
        rc("AdditionalIncludeDirectories", map=gyp_to_ninja_path, prefix="/I")
        rcflags.append("/I" + gyp_to_ninja_path("."))
        rc("PreprocessorDefinitions", prefix="/d")
        # /l arg must be in hex without leading '0x'
        rc("Culture", prefix="/l", map=lambda x: hex(int(x))[2:])
        return rcflags

    def BuildCygwinBashCommandLine(self, args, path_to_base):
        """Build a command line that runs args via cygwin bash. We assume that all
        incoming paths are in Windows normpath'd form, so they need to be
        converted to posix style for the part of the command line that's passed to
        bash. We also have to do some Visual Studio macro emulation here because
        various rules use magic VS names for things. Also note that rules that
        contain ninja variables cannot be fixed here (for example ${source}), so
        the outer generator needs to make sure that the paths that are written out
        are in posix style, if the command line will be used here."""
        cygwin_dir = os.path.normpath(
            os.path.join(path_to_base, self.msvs_cygwin_dirs[0])
        )
        cd = ("cd %s" % path_to_base).replace("\\", "/")
        args = [a.replace("\\", "/").replace('"', '\\"') for a in args]
        args = ["'%s'" % a.replace("'", "'\\''") for a in args]
        bash_cmd = " ".join(args)
        cmd = (
            'call "%s\\setup_env.bat" && set CYGWIN=nontsec && ' % cygwin_dir
            + f'bash -c "{cd} ; {bash_cmd}"'
        )
        return cmd

    RuleShellFlags = collections.namedtuple("RuleShellFlags", ["cygwin", "quote"])

    def GetRuleShellFlags(self, rule):
        """Return RuleShellFlags about how the given rule should be run. This
        includes whether it should run under cygwin (msvs_cygwin_shell), and
        whether the commands should be quoted (msvs_quote_cmd)."""
        # If the variable is unset, or set to 1 we use cygwin
        cygwin = int(rule.get("msvs_cygwin_shell",
                              self.spec.get("msvs_cygwin_shell", 1))) != 0
        # Default to quoting. There's only a few special instances where the
        # target command uses non-standard command line parsing and handle quotes
        # and quote escaping differently.
        quote_cmd = int(rule.get("msvs_quote_cmd", 1))
        assert quote_cmd != 0 or cygwin != 1, \
               "msvs_quote_cmd=0 only applicable for msvs_cygwin_shell=0"
        return MsvsSettings.RuleShellFlags(cygwin, quote_cmd)

    def _HasExplicitRuleForExtension(self, spec, extension):
        """Determine if there's an explicit rule for a particular extension."""
        for rule in spec.get("rules", []):
            if rule["extension"] == extension:
                return True
        return False

    def _HasExplicitIdlActions(self, spec):
        """Determine if an action should not run midl for .idl files."""
        return any(
            [action.get("explicit_idl_action", 0) for action in spec.get("actions", [])]
        )

    def HasExplicitIdlRulesOrActions(self, spec):
        """Determine if there's an explicit rule or action for idl files. When
        there isn't we need to generate implicit rules to build MIDL .idl files."""
        return self._HasExplicitRuleForExtension(
            spec, "idl"
        ) or self._HasExplicitIdlActions(spec)

    def HasExplicitAsmRules(self, spec):
        """Determine if there's an explicit rule for asm files. When there isn't we
        need to generate implicit rules to assemble .asm files."""
        return self._HasExplicitRuleForExtension(spec, "asm")

    def GetIdlBuildData(self, source, config):
        """Determine the implicit outputs for an idl file. Returns output
        directory, outputs, and variables and flags that are required."""
        config = self._TargetConfig(config)
        midl_get = self._GetWrapper(self, self.msvs_settings[config], "VCMIDLTool")

        def midl(name, default=None):
            return self.ConvertVSMacros(midl_get(name, default=default), config=config)

        tlb = midl("TypeLibraryName", default="${root}.tlb")
        header = midl("HeaderFileName", default="${root}.h")
        dlldata = midl("DLLDataFileName", default="dlldata.c")
        iid = midl("InterfaceIdentifierFileName", default="${root}_i.c")
        proxy = midl("ProxyFileName", default="${root}_p.c")
        # Note that .tlb is not included in the outputs as it is not always
        # generated depending on the content of the input idl file.
        outdir = midl("OutputDirectory", default="")
        output = [header, dlldata, iid, proxy]
        variables = [
            ("tlb", tlb),
            ("h", header),
            ("dlldata", dlldata),
            ("iid", iid),
            ("proxy", proxy),
        ]
        # TODO(scottmg): Are there configuration settings to set these flags?
        target_platform = self.GetArch(config)
        if target_platform == "x86":
            target_platform = "win32"
        flags = ["/char", "signed", "/env", target_platform, "/Oicf"]
        return outdir, output, variables, flags


def _LanguageMatchesForPch(source_ext, pch_source_ext):
    c_exts = (".c",)
    cc_exts = (".cc", ".cxx", ".cpp")
    return (source_ext in c_exts and pch_source_ext in c_exts) or (
        source_ext in cc_exts and pch_source_ext in cc_exts
    )


class PrecompiledHeader:
    """Helper to generate dependencies and build rules to handle generation of
    precompiled headers. Interface matches the GCH handler in xcode_emulation.py.
    """

    def __init__(
        self, settings, config, gyp_to_build_path, gyp_to_unique_output, obj_ext
    ):
        self.settings = settings
        self.config = config
        pch_source = self.settings.msvs_precompiled_source[self.config]
        self.pch_source = gyp_to_build_path(pch_source)
        filename, _ = os.path.splitext(pch_source)
        self.output_obj = gyp_to_unique_output(filename + obj_ext).lower()

    def _PchHeader(self):
        """Get the header that will appear in an #include line for all source
        files."""
        return self.settings.msvs_precompiled_header[self.config]

    def GetObjDependencies(self, sources, objs, arch):
        """Given a list of sources files and the corresponding object files,
        returns a list of the pch files that should be depended upon. The
        additional wrapping in the return value is for interface compatibility
        with make.py on Mac, and xcode_emulation.py."""
        assert arch is None
        if not self._PchHeader():
            return []
        pch_ext = os.path.splitext(self.pch_source)[1]
        for source in sources:
            if _LanguageMatchesForPch(os.path.splitext(source)[1], pch_ext):
                return [(None, None, self.output_obj)]
        return []

    def GetPchBuildCommands(self, arch):
        """Not used on Windows as there are no additional build steps required
        (instead, existing steps are modified in GetFlagsModifications below)."""
        return []

    def GetFlagsModifications(
        self, input, output, implicit, command, cflags_c, cflags_cc, expand_special
    ):
        """Get the modified cflags and implicit dependencies that should be used
        for the pch compilation step."""
        if input == self.pch_source:
            pch_output = ["/Yc" + self._PchHeader()]
            if command == "cxx":
                return (
                    [("cflags_cc", map(expand_special, cflags_cc + pch_output))],
                    self.output_obj,
                    [],
                )
            elif command == "cc":
                return (
                    [("cflags_c", map(expand_special, cflags_c + pch_output))],
                    self.output_obj,
                    [],
                )
        return [], output, implicit


vs_version = None


def GetVSVersion(generator_flags):
    global vs_version
    if not vs_version:
        vs_version = gyp.MSVSVersion.SelectVisualStudioVersion(
            generator_flags.get("msvs_version", "auto"), allow_fallback=False
        )
    return vs_version


def _GetVsvarsSetupArgs(generator_flags, arch):
    vs = GetVSVersion(generator_flags)
    return vs.SetupScript()


def ExpandMacros(string, expansions):
    """Expand $(Variable) per expansions dict. See MsvsSettings.GetVSMacroEnv
    for the canonical way to retrieve a suitable dict."""
    if "$" in string:
        for old, new in expansions.items():
            assert "$(" not in new, new
            string = string.replace(old, new)
    return string


def _ExtractImportantEnvironment(output_of_set):
    """Extracts environment variables required for the toolchain to run from
    a textual dump output by the cmd.exe 'set' command."""
    envvars_to_save = (
        "goma_.*",  # TODO(scottmg): This is ugly, but needed for goma.
        "include",
        "lib",
        "libpath",
        "path",
        "pathext",
        "systemroot",
        "temp",
        "tmp",
    )
    env = {}
    # This occasionally happens and leads to misleading SYSTEMROOT error messages
    # if not caught here.
    if output_of_set.count("=") == 0:
        raise Exception("Invalid output_of_set. Value is:\n%s" % output_of_set)
    for line in output_of_set.splitlines():
        for envvar in envvars_to_save:
            if re.match(envvar + "=", line.lower()):
                var, setting = line.split("=", 1)
                if envvar == "path":
                    # Our own rules (for running gyp-win-tool) and other actions in
                    # Chromium rely on python being in the path. Add the path to this
                    # python here so that if it's not in the path when ninja is run
                    # later, python will still be found.
                    setting = os.path.dirname(sys.executable) + os.pathsep + setting
                env[var.upper()] = setting
                break
    for required in ("SYSTEMROOT", "TEMP", "TMP"):
        if required not in env:
            raise Exception(
                'Environment variable "%s" '
                "required to be set to valid path" % required
            )
    return env


def _FormatAsEnvironmentBlock(envvar_dict):
    """Format as an 'environment block' directly suitable for CreateProcess.
    Briefly this is a list of key=value\0, terminated by an additional \0. See
    CreateProcess documentation for more details."""
    block = ""
    nul = "\0"
    for key, value in envvar_dict.items():
        block += key + "=" + value + nul
    block += nul
    return block


def _ExtractCLPath(output_of_where):
    """Gets the path to cl.exe based on the output of calling the environment
    setup batch file, followed by the equivalent of `where`."""
    # Take the first line, as that's the first found in the PATH.
    for line in output_of_where.strip().splitlines():
        if line.startswith("LOC:"):
            return line[len("LOC:") :].strip()


def GenerateEnvironmentFiles(
    toplevel_build_dir, generator_flags, system_includes, open_out
):
    """It's not sufficient to have the absolute path to the compiler, linker,
    etc. on Windows, as those tools rely on .dlls being in the PATH. We also
    need to support both x86 and x64 compilers within the same build (to support
    msvs_target_platform hackery). Different architectures require a different
    compiler binary, and different supporting environment variables (INCLUDE,
    LIB, LIBPATH). So, we extract the environment here, wrap all invocations
    of compiler tools (cl, link, lib, rc, midl, etc.) via win_tool.py which
    sets up the environment, and then we do not prefix the compiler with
    an absolute path, instead preferring something like "cl.exe" in the rule
    which will then run whichever the environment setup has put in the path.
    When the following procedure to generate environment files does not
    meet your requirement (e.g. for custom toolchains), you can pass
    "-G ninja_use_custom_environment_files" to the gyp to suppress file
    generation and use custom environment files prepared by yourself."""
    archs = ("x86", "x64")
    if generator_flags.get("ninja_use_custom_environment_files", 0):
        cl_paths = {}
        for arch in archs:
            cl_paths[arch] = "cl.exe"
        return cl_paths
    vs = GetVSVersion(generator_flags)
    cl_paths = {}
    for arch in archs:
        # Extract environment variables for subprocesses.
        args = vs.SetupScript(arch)
        args.extend(("&&", "set"))
        popen = subprocess.Popen(
            args, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        variables = popen.communicate()[0].decode("utf-8")
        if popen.returncode != 0:
            raise Exception('"%s" failed with error %d' % (args, popen.returncode))
        env = _ExtractImportantEnvironment(variables)

        # Inject system includes from gyp files into INCLUDE.
        if system_includes:
            system_includes = system_includes | OrderedSet(
                env.get("INCLUDE", "").split(";")
            )
            env["INCLUDE"] = ";".join(system_includes)

        env_block = _FormatAsEnvironmentBlock(env)
        f = open_out(os.path.join(toplevel_build_dir, "environment." + arch), "w")
        f.write(env_block)
        f.close()

        # Find cl.exe location for this architecture.
        args = vs.SetupScript(arch)
        args.extend(
            ("&&", "for", "%i", "in", "(cl.exe)", "do", "@echo", "LOC:%~$PATH:i")
        )
        popen = subprocess.Popen(args, shell=True, stdout=subprocess.PIPE)
        output = popen.communicate()[0].decode("utf-8")
        cl_paths[arch] = _ExtractCLPath(output)
    return cl_paths


def VerifyMissingSources(sources, build_dir, generator_flags, gyp_to_ninja):
    """Emulate behavior of msvs_error_on_missing_sources present in the msvs
    generator: Check that all regular source files, i.e. not created at run time,
    exist on disk. Missing files cause needless recompilation when building via
    VS, and we want this check to match for people/bots that build using ninja,
    so they're not surprised when the VS build fails."""
    if int(generator_flags.get("msvs_error_on_missing_sources", 0)):
        no_specials = filter(lambda x: "$" not in x, sources)
        relative = [os.path.join(build_dir, gyp_to_ninja(s)) for s in no_specials]
        missing = [x for x in relative if not os.path.exists(x)]
        if missing:
            # They'll look like out\Release\..\..\stuff\things.cc, so normalize the
            # path for a slightly less crazy looking output.
            cleaned_up = [os.path.normpath(x) for x in missing]
            raise Exception("Missing input files:\n%s" % "\n".join(cleaned_up))


# Sets some values in default_variables, which are required for many
# generators, run on Windows.
def CalculateCommonVariables(default_variables, params):
    generator_flags = params.get("generator_flags", {})

    # Set a variable so conditions can be based on msvs_version.
    msvs_version = gyp.msvs_emulation.GetVSVersion(generator_flags)
    default_variables["MSVS_VERSION"] = msvs_version.ShortName()

    # To determine processor word size on Windows, in addition to checking
    # PROCESSOR_ARCHITECTURE (which reflects the word size of the current
    # process), it is also necessary to check PROCESSOR_ARCHITEW6432 (which
    # contains the actual word size of the system when running thru WOW64).
    if "64" in os.environ.get("PROCESSOR_ARCHITECTURE", "") or "64" in os.environ.get(
        "PROCESSOR_ARCHITEW6432", ""
    ):
        default_variables["MSVS_OS_BITS"] = 64
    else:
        default_variables["MSVS_OS_BITS"] = 32
