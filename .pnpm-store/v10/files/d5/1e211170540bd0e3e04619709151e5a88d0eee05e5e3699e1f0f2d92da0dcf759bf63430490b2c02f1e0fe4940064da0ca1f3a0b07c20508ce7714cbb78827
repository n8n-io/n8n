# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""
This module contains classes that help to emulate xcodebuild behavior on top of
other build systems, such as make and ninja.
"""


import copy
import gyp.common
import os
import os.path
import re
import shlex
import subprocess
import sys
from gyp.common import GypError

# Populated lazily by XcodeVersion, for efficiency, and to fix an issue when
# "xcodebuild" is called too quickly (it has been found to return incorrect
# version number).
XCODE_VERSION_CACHE = None

# Populated lazily by GetXcodeArchsDefault, to an |XcodeArchsDefault| instance
# corresponding to the installed version of Xcode.
XCODE_ARCHS_DEFAULT_CACHE = None


def XcodeArchsVariableMapping(archs, archs_including_64_bit=None):
    """Constructs a dictionary with expansion for $(ARCHS_STANDARD) variable,
  and optionally for $(ARCHS_STANDARD_INCLUDING_64_BIT)."""
    mapping = {"$(ARCHS_STANDARD)": archs}
    if archs_including_64_bit:
        mapping["$(ARCHS_STANDARD_INCLUDING_64_BIT)"] = archs_including_64_bit
    return mapping


class XcodeArchsDefault:
    """A class to resolve ARCHS variable from xcode_settings, resolving Xcode
  macros and implementing filtering by VALID_ARCHS. The expansion of macros
  depends on the SDKROOT used ("macosx", "iphoneos", "iphonesimulator") and
  on the version of Xcode.
  """

    # Match variable like $(ARCHS_STANDARD).
    variable_pattern = re.compile(r"\$\([a-zA-Z_][a-zA-Z0-9_]*\)$")

    def __init__(self, default, mac, iphonesimulator, iphoneos):
        self._default = (default,)
        self._archs = {"mac": mac, "ios": iphoneos, "iossim": iphonesimulator}

    def _VariableMapping(self, sdkroot):
        """Returns the dictionary of variable mapping depending on the SDKROOT."""
        sdkroot = sdkroot.lower()
        if "iphoneos" in sdkroot:
            return self._archs["ios"]
        elif "iphonesimulator" in sdkroot:
            return self._archs["iossim"]
        else:
            return self._archs["mac"]

    def _ExpandArchs(self, archs, sdkroot):
        """Expands variables references in ARCHS, and remove duplicates."""
        variable_mapping = self._VariableMapping(sdkroot)
        expanded_archs = []
        for arch in archs:
            if self.variable_pattern.match(arch):
                variable = arch
                try:
                    variable_expansion = variable_mapping[variable]
                    for arch in variable_expansion:
                        if arch not in expanded_archs:
                            expanded_archs.append(arch)
                except KeyError:
                    print('Warning: Ignoring unsupported variable "%s".' % variable)
            elif arch not in expanded_archs:
                expanded_archs.append(arch)
        return expanded_archs

    def ActiveArchs(self, archs, valid_archs, sdkroot):
        """Expands variables references in ARCHS, and filter by VALID_ARCHS if it
    is defined (if not set, Xcode accept any value in ARCHS, otherwise, only
    values present in VALID_ARCHS are kept)."""
        expanded_archs = self._ExpandArchs(archs or self._default, sdkroot or "")
        if valid_archs:
            filtered_archs = []
            for arch in expanded_archs:
                if arch in valid_archs:
                    filtered_archs.append(arch)
            expanded_archs = filtered_archs
        return expanded_archs


def GetXcodeArchsDefault():
    """Returns the |XcodeArchsDefault| object to use to expand ARCHS for the
  installed version of Xcode. The default values used by Xcode for ARCHS
  and the expansion of the variables depends on the version of Xcode used.

  For all version anterior to Xcode 5.0 or posterior to Xcode 5.1 included
  uses $(ARCHS_STANDARD) if ARCHS is unset, while Xcode 5.0 to 5.0.2 uses
  $(ARCHS_STANDARD_INCLUDING_64_BIT). This variable was added to Xcode 5.0
  and deprecated with Xcode 5.1.

  For "macosx" SDKROOT, all version starting with Xcode 5.0 includes 64-bit
  architecture as part of $(ARCHS_STANDARD) and default to only building it.

  For "iphoneos" and "iphonesimulator" SDKROOT, 64-bit architectures are part
  of $(ARCHS_STANDARD_INCLUDING_64_BIT) from Xcode 5.0. From Xcode 5.1, they
  are also part of $(ARCHS_STANDARD).

  All these rules are coded in the construction of the |XcodeArchsDefault|
  object to use depending on the version of Xcode detected. The object is
  for performance reason."""
    global XCODE_ARCHS_DEFAULT_CACHE
    if XCODE_ARCHS_DEFAULT_CACHE:
        return XCODE_ARCHS_DEFAULT_CACHE
    xcode_version, _ = XcodeVersion()
    if xcode_version < "0500":
        XCODE_ARCHS_DEFAULT_CACHE = XcodeArchsDefault(
            "$(ARCHS_STANDARD)",
            XcodeArchsVariableMapping(["i386"]),
            XcodeArchsVariableMapping(["i386"]),
            XcodeArchsVariableMapping(["armv7"]),
        )
    elif xcode_version < "0510":
        XCODE_ARCHS_DEFAULT_CACHE = XcodeArchsDefault(
            "$(ARCHS_STANDARD_INCLUDING_64_BIT)",
            XcodeArchsVariableMapping(["x86_64"], ["x86_64"]),
            XcodeArchsVariableMapping(["i386"], ["i386", "x86_64"]),
            XcodeArchsVariableMapping(
                ["armv7", "armv7s"], ["armv7", "armv7s", "arm64"]
            ),
        )
    else:
        XCODE_ARCHS_DEFAULT_CACHE = XcodeArchsDefault(
            "$(ARCHS_STANDARD)",
            XcodeArchsVariableMapping(["x86_64"], ["x86_64"]),
            XcodeArchsVariableMapping(["i386", "x86_64"], ["i386", "x86_64"]),
            XcodeArchsVariableMapping(
                ["armv7", "armv7s", "arm64"], ["armv7", "armv7s", "arm64"]
            ),
        )
    return XCODE_ARCHS_DEFAULT_CACHE


class XcodeSettings:
    """A class that understands the gyp 'xcode_settings' object."""

    # Populated lazily by _SdkPath(). Shared by all XcodeSettings, so cached
    # at class-level for efficiency.
    _sdk_path_cache = {}
    _platform_path_cache = {}
    _sdk_root_cache = {}

    # Populated lazily by GetExtraPlistItems(). Shared by all XcodeSettings, so
    # cached at class-level for efficiency.
    _plist_cache = {}

    # Populated lazily by GetIOSPostbuilds.  Shared by all XcodeSettings, so
    # cached at class-level for efficiency.
    _codesigning_key_cache = {}

    def __init__(self, spec):
        self.spec = spec

        self.isIOS = False
        self.mac_toolchain_dir = None
        self.header_map_path = None

        # Per-target 'xcode_settings' are pushed down into configs earlier by gyp.
        # This means self.xcode_settings[config] always contains all settings
        # for that config -- the per-target settings as well. Settings that are
        # the same for all configs are implicitly per-target settings.
        self.xcode_settings = {}
        configs = spec["configurations"]
        for configname, config in configs.items():
            self.xcode_settings[configname] = config.get("xcode_settings", {})
            self._ConvertConditionalKeys(configname)
            if self.xcode_settings[configname].get("IPHONEOS_DEPLOYMENT_TARGET", None):
                self.isIOS = True

        # This is only non-None temporarily during the execution of some methods.
        self.configname = None

        # Used by _AdjustLibrary to match .a and .dylib entries in libraries.
        self.library_re = re.compile(r"^lib([^/]+)\.(a|dylib)$")

    def _ConvertConditionalKeys(self, configname):
        """Converts or warns on conditional keys.  Xcode supports conditional keys,
    such as CODE_SIGN_IDENTITY[sdk=iphoneos*].  This is a partial implementation
    with some keys converted while the rest force a warning."""
        settings = self.xcode_settings[configname]
        conditional_keys = [key for key in settings if key.endswith("]")]
        for key in conditional_keys:
            # If you need more, speak up at http://crbug.com/122592
            if key.endswith("[sdk=iphoneos*]"):
                if configname.endswith("iphoneos"):
                    new_key = key.split("[")[0]
                    settings[new_key] = settings[key]
            else:
                print(
                    "Warning: Conditional keys not implemented, ignoring:",
                    " ".join(conditional_keys),
                )
            del settings[key]

    def _Settings(self):
        assert self.configname
        return self.xcode_settings[self.configname]

    def _Test(self, test_key, cond_key, default):
        return self._Settings().get(test_key, default) == cond_key

    def _Appendf(self, lst, test_key, format_str, default=None):
        if test_key in self._Settings():
            lst.append(format_str % str(self._Settings()[test_key]))
        elif default:
            lst.append(format_str % str(default))

    def _WarnUnimplemented(self, test_key):
        if test_key in self._Settings():
            print('Warning: Ignoring not yet implemented key "%s".' % test_key)

    def IsBinaryOutputFormat(self, configname):
        default = "binary" if self.isIOS else "xml"
        format = self.xcode_settings[configname].get("INFOPLIST_OUTPUT_FORMAT", default)
        return format == "binary"

    def IsIosFramework(self):
        return self.spec["type"] == "shared_library" and self._IsBundle() and self.isIOS

    def _IsBundle(self):
        return (
            int(self.spec.get("mac_bundle", 0)) != 0
            or self._IsXCTest()
            or self._IsXCUiTest()
        )

    def _IsXCTest(self):
        return int(self.spec.get("mac_xctest_bundle", 0)) != 0

    def _IsXCUiTest(self):
        return int(self.spec.get("mac_xcuitest_bundle", 0)) != 0

    def _IsIosAppExtension(self):
        return int(self.spec.get("ios_app_extension", 0)) != 0

    def _IsIosWatchKitExtension(self):
        return int(self.spec.get("ios_watchkit_extension", 0)) != 0

    def _IsIosWatchApp(self):
        return int(self.spec.get("ios_watch_app", 0)) != 0

    def GetFrameworkVersion(self):
        """Returns the framework version of the current target. Only valid for
    bundles."""
        assert self._IsBundle()
        return self.GetPerTargetSetting("FRAMEWORK_VERSION", default="A")

    def GetWrapperExtension(self):
        """Returns the bundle extension (.app, .framework, .plugin, etc).  Only
    valid for bundles."""
        assert self._IsBundle()
        if self.spec["type"] in ("loadable_module", "shared_library"):
            default_wrapper_extension = {
                "loadable_module": "bundle",
                "shared_library": "framework",
            }[self.spec["type"]]
            wrapper_extension = self.GetPerTargetSetting(
                "WRAPPER_EXTENSION", default=default_wrapper_extension
            )
            return "." + self.spec.get("product_extension", wrapper_extension)
        elif self.spec["type"] == "executable":
            if self._IsIosAppExtension() or self._IsIosWatchKitExtension():
                return "." + self.spec.get("product_extension", "appex")
            else:
                return "." + self.spec.get("product_extension", "app")
        else:
            assert False, "Don't know extension for '{}', target '{}'".format(
                self.spec["type"],
                self.spec["target_name"],
            )

    def GetProductName(self):
        """Returns PRODUCT_NAME."""
        return self.spec.get("product_name", self.spec["target_name"])

    def GetFullProductName(self):
        """Returns FULL_PRODUCT_NAME."""
        if self._IsBundle():
            return self.GetWrapperName()
        else:
            return self._GetStandaloneBinaryPath()

    def GetWrapperName(self):
        """Returns the directory name of the bundle represented by this target.
    Only valid for bundles."""
        assert self._IsBundle()
        return self.GetProductName() + self.GetWrapperExtension()

    def GetBundleContentsFolderPath(self):
        """Returns the qualified path to the bundle's contents folder. E.g.
    Chromium.app/Contents or Foo.bundle/Versions/A. Only valid for bundles."""
        if self.isIOS:
            return self.GetWrapperName()
        assert self._IsBundle()
        if self.spec["type"] == "shared_library":
            return os.path.join(
                self.GetWrapperName(), "Versions", self.GetFrameworkVersion()
            )
        else:
            # loadable_modules have a 'Contents' folder like executables.
            return os.path.join(self.GetWrapperName(), "Contents")

    def GetBundleResourceFolder(self):
        """Returns the qualified path to the bundle's resource folder. E.g.
    Chromium.app/Contents/Resources. Only valid for bundles."""
        assert self._IsBundle()
        if self.isIOS:
            return self.GetBundleContentsFolderPath()
        return os.path.join(self.GetBundleContentsFolderPath(), "Resources")

    def GetBundleExecutableFolderPath(self):
        """Returns the qualified path to the bundle's executables folder. E.g.
    Chromium.app/Contents/MacOS. Only valid for bundles."""
        assert self._IsBundle()
        if self.spec["type"] in ("shared_library") or self.isIOS:
            return self.GetBundleContentsFolderPath()
        elif self.spec["type"] in ("executable", "loadable_module"):
            return os.path.join(self.GetBundleContentsFolderPath(), "MacOS")

    def GetBundleJavaFolderPath(self):
        """Returns the qualified path to the bundle's Java resource folder.
    E.g. Chromium.app/Contents/Resources/Java. Only valid for bundles."""
        assert self._IsBundle()
        return os.path.join(self.GetBundleResourceFolder(), "Java")

    def GetBundleFrameworksFolderPath(self):
        """Returns the qualified path to the bundle's frameworks folder. E.g,
    Chromium.app/Contents/Frameworks. Only valid for bundles."""
        assert self._IsBundle()
        return os.path.join(self.GetBundleContentsFolderPath(), "Frameworks")

    def GetBundleSharedFrameworksFolderPath(self):
        """Returns the qualified path to the bundle's frameworks folder. E.g,
    Chromium.app/Contents/SharedFrameworks. Only valid for bundles."""
        assert self._IsBundle()
        return os.path.join(self.GetBundleContentsFolderPath(), "SharedFrameworks")

    def GetBundleSharedSupportFolderPath(self):
        """Returns the qualified path to the bundle's shared support folder. E.g,
    Chromium.app/Contents/SharedSupport. Only valid for bundles."""
        assert self._IsBundle()
        if self.spec["type"] == "shared_library":
            return self.GetBundleResourceFolder()
        else:
            return os.path.join(self.GetBundleContentsFolderPath(), "SharedSupport")

    def GetBundlePlugInsFolderPath(self):
        """Returns the qualified path to the bundle's plugins folder. E.g,
    Chromium.app/Contents/PlugIns. Only valid for bundles."""
        assert self._IsBundle()
        return os.path.join(self.GetBundleContentsFolderPath(), "PlugIns")

    def GetBundleXPCServicesFolderPath(self):
        """Returns the qualified path to the bundle's XPC services folder. E.g,
    Chromium.app/Contents/XPCServices. Only valid for bundles."""
        assert self._IsBundle()
        return os.path.join(self.GetBundleContentsFolderPath(), "XPCServices")

    def GetBundlePlistPath(self):
        """Returns the qualified path to the bundle's plist file. E.g.
    Chromium.app/Contents/Info.plist. Only valid for bundles."""
        assert self._IsBundle()
        if (
            self.spec["type"] in ("executable", "loadable_module")
            or self.IsIosFramework()
        ):
            return os.path.join(self.GetBundleContentsFolderPath(), "Info.plist")
        else:
            return os.path.join(
                self.GetBundleContentsFolderPath(), "Resources", "Info.plist"
            )

    def GetProductType(self):
        """Returns the PRODUCT_TYPE of this target."""
        if self._IsIosAppExtension():
            assert self._IsBundle(), (
                "ios_app_extension flag requires mac_bundle "
                "(target %s)" % self.spec["target_name"]
            )
            return "com.apple.product-type.app-extension"
        if self._IsIosWatchKitExtension():
            assert self._IsBundle(), (
                "ios_watchkit_extension flag requires "
                "mac_bundle (target %s)" % self.spec["target_name"]
            )
            return "com.apple.product-type.watchkit-extension"
        if self._IsIosWatchApp():
            assert self._IsBundle(), (
                "ios_watch_app flag requires mac_bundle "
                "(target %s)" % self.spec["target_name"]
            )
            return "com.apple.product-type.application.watchapp"
        if self._IsXCUiTest():
            assert self._IsBundle(), (
                "mac_xcuitest_bundle flag requires mac_bundle "
                "(target %s)" % self.spec["target_name"]
            )
            return "com.apple.product-type.bundle.ui-testing"
        if self._IsBundle():
            return {
                "executable": "com.apple.product-type.application",
                "loadable_module": "com.apple.product-type.bundle",
                "shared_library": "com.apple.product-type.framework",
            }[self.spec["type"]]
        else:
            return {
                "executable": "com.apple.product-type.tool",
                "loadable_module": "com.apple.product-type.library.dynamic",
                "shared_library": "com.apple.product-type.library.dynamic",
                "static_library": "com.apple.product-type.library.static",
            }[self.spec["type"]]

    def GetMachOType(self):
        """Returns the MACH_O_TYPE of this target."""
        # Weird, but matches Xcode.
        if not self._IsBundle() and self.spec["type"] == "executable":
            return ""
        return {
            "executable": "mh_execute",
            "static_library": "staticlib",
            "shared_library": "mh_dylib",
            "loadable_module": "mh_bundle",
        }[self.spec["type"]]

    def _GetBundleBinaryPath(self):
        """Returns the name of the bundle binary of by this target.
    E.g. Chromium.app/Contents/MacOS/Chromium. Only valid for bundles."""
        assert self._IsBundle()
        return os.path.join(
            self.GetBundleExecutableFolderPath(), self.GetExecutableName()
        )

    def _GetStandaloneExecutableSuffix(self):
        if "product_extension" in self.spec:
            return "." + self.spec["product_extension"]
        return {
            "executable": "",
            "static_library": ".a",
            "shared_library": ".dylib",
            "loadable_module": ".so",
        }[self.spec["type"]]

    def _GetStandaloneExecutablePrefix(self):
        return self.spec.get(
            "product_prefix",
            {
                "executable": "",
                "static_library": "lib",
                "shared_library": "lib",
                # Non-bundled loadable_modules are called foo.so for some reason
                # (that is, .so and no prefix) with the xcode build -- match that.
                "loadable_module": "",
            }[self.spec["type"]],
        )

    def _GetStandaloneBinaryPath(self):
        """Returns the name of the non-bundle binary represented by this target.
    E.g. hello_world. Only valid for non-bundles."""
        assert not self._IsBundle()
        assert self.spec["type"] in (
            "executable",
            "shared_library",
            "static_library",
            "loadable_module",
        ), ("Unexpected type %s" % self.spec["type"])
        target = self.spec["target_name"]
        if self.spec["type"] == "static_library":
            if target[:3] == "lib":
                target = target[3:]
        elif self.spec["type"] in ("loadable_module", "shared_library"):
            if target[:3] == "lib":
                target = target[3:]

        target_prefix = self._GetStandaloneExecutablePrefix()
        target = self.spec.get("product_name", target)
        target_ext = self._GetStandaloneExecutableSuffix()
        return target_prefix + target + target_ext

    def GetExecutableName(self):
        """Returns the executable name of the bundle represented by this target.
    E.g. Chromium."""
        if self._IsBundle():
            return self.spec.get("product_name", self.spec["target_name"])
        else:
            return self._GetStandaloneBinaryPath()

    def GetExecutablePath(self):
        """Returns the qualified path to the primary executable of the bundle
    represented by this target. E.g. Chromium.app/Contents/MacOS/Chromium."""
        if self._IsBundle():
            return self._GetBundleBinaryPath()
        else:
            return self._GetStandaloneBinaryPath()

    def GetActiveArchs(self, configname):
        """Returns the architectures this target should be built for."""
        config_settings = self.xcode_settings[configname]
        xcode_archs_default = GetXcodeArchsDefault()
        return xcode_archs_default.ActiveArchs(
            config_settings.get("ARCHS"),
            config_settings.get("VALID_ARCHS"),
            config_settings.get("SDKROOT"),
        )

    def _GetSdkVersionInfoItem(self, sdk, infoitem):
        # xcodebuild requires Xcode and can't run on Command Line Tools-only
        # systems from 10.7 onward.
        # Since the CLT has no SDK paths anyway, returning None is the
        # most sensible route and should still do the right thing.
        try:
            return GetStdoutQuiet(["xcrun", "--sdk", sdk, infoitem])
        except GypError:
            pass

    def _SdkRoot(self, configname):
        if configname is None:
            configname = self.configname
        return self.GetPerConfigSetting("SDKROOT", configname, default="")

    def _XcodePlatformPath(self, configname=None):
        sdk_root = self._SdkRoot(configname)
        if sdk_root not in XcodeSettings._platform_path_cache:
            platform_path = self._GetSdkVersionInfoItem(
                sdk_root, "--show-sdk-platform-path"
            )
            XcodeSettings._platform_path_cache[sdk_root] = platform_path
        return XcodeSettings._platform_path_cache[sdk_root]

    def _SdkPath(self, configname=None):
        sdk_root = self._SdkRoot(configname)
        if sdk_root.startswith("/"):
            return sdk_root
        return self._XcodeSdkPath(sdk_root)

    def _XcodeSdkPath(self, sdk_root):
        if sdk_root not in XcodeSettings._sdk_path_cache:
            sdk_path = self._GetSdkVersionInfoItem(sdk_root, "--show-sdk-path")
            XcodeSettings._sdk_path_cache[sdk_root] = sdk_path
            if sdk_root:
                XcodeSettings._sdk_root_cache[sdk_path] = sdk_root
        return XcodeSettings._sdk_path_cache[sdk_root]

    def _AppendPlatformVersionMinFlags(self, lst):
        self._Appendf(lst, "MACOSX_DEPLOYMENT_TARGET", "-mmacosx-version-min=%s")
        if "IPHONEOS_DEPLOYMENT_TARGET" in self._Settings():
            # TODO: Implement this better?
            sdk_path_basename = os.path.basename(self._SdkPath())
            if sdk_path_basename.lower().startswith("iphonesimulator"):
                self._Appendf(
                    lst, "IPHONEOS_DEPLOYMENT_TARGET", "-mios-simulator-version-min=%s"
                )
            else:
                self._Appendf(
                    lst, "IPHONEOS_DEPLOYMENT_TARGET", "-miphoneos-version-min=%s"
                )

    def GetCflags(self, configname, arch=None):
        """Returns flags that need to be added to .c, .cc, .m, and .mm
    compilations."""
        # This functions (and the similar ones below) do not offer complete
        # emulation of all xcode_settings keys. They're implemented on demand.

        self.configname = configname
        cflags = []

        sdk_root = self._SdkPath()
        if "SDKROOT" in self._Settings() and sdk_root:
            cflags.append("-isysroot %s" % sdk_root)

        if self.header_map_path:
            cflags.append("-I%s" % self.header_map_path)

        if self._Test("CLANG_WARN_CONSTANT_CONVERSION", "YES", default="NO"):
            cflags.append("-Wconstant-conversion")

        if self._Test("GCC_CHAR_IS_UNSIGNED_CHAR", "YES", default="NO"):
            cflags.append("-funsigned-char")

        if self._Test("GCC_CW_ASM_SYNTAX", "YES", default="YES"):
            cflags.append("-fasm-blocks")

        if "GCC_DYNAMIC_NO_PIC" in self._Settings():
            if self._Settings()["GCC_DYNAMIC_NO_PIC"] == "YES":
                cflags.append("-mdynamic-no-pic")
        else:
            pass
            # TODO: In this case, it depends on the target. xcode passes
            # mdynamic-no-pic by default for executable and possibly static lib
            # according to mento

        if self._Test("GCC_ENABLE_PASCAL_STRINGS", "YES", default="YES"):
            cflags.append("-mpascal-strings")

        self._Appendf(cflags, "GCC_OPTIMIZATION_LEVEL", "-O%s", default="s")

        if self._Test("GCC_GENERATE_DEBUGGING_SYMBOLS", "YES", default="YES"):
            dbg_format = self._Settings().get("DEBUG_INFORMATION_FORMAT", "dwarf")
            if dbg_format == "dwarf":
                cflags.append("-gdwarf-2")
            elif dbg_format == "stabs":
                raise NotImplementedError("stabs debug format is not supported yet.")
            elif dbg_format == "dwarf-with-dsym":
                cflags.append("-gdwarf-2")
            else:
                raise NotImplementedError("Unknown debug format %s" % dbg_format)

        if self._Settings().get("GCC_STRICT_ALIASING") == "YES":
            cflags.append("-fstrict-aliasing")
        elif self._Settings().get("GCC_STRICT_ALIASING") == "NO":
            cflags.append("-fno-strict-aliasing")

        if self._Test("GCC_SYMBOLS_PRIVATE_EXTERN", "YES", default="NO"):
            cflags.append("-fvisibility=hidden")

        if self._Test("GCC_TREAT_WARNINGS_AS_ERRORS", "YES", default="NO"):
            cflags.append("-Werror")

        if self._Test("GCC_WARN_ABOUT_MISSING_NEWLINE", "YES", default="NO"):
            cflags.append("-Wnewline-eof")

        # In Xcode, this is only activated when GCC_COMPILER_VERSION is clang or
        # llvm-gcc. It also requires a fairly recent libtool, and
        # if the system clang isn't used, DYLD_LIBRARY_PATH needs to contain the
        # path to the libLTO.dylib that matches the used clang.
        if self._Test("LLVM_LTO", "YES", default="NO"):
            cflags.append("-flto")

        self._AppendPlatformVersionMinFlags(cflags)

        # TODO:
        if self._Test("COPY_PHASE_STRIP", "YES", default="NO"):
            self._WarnUnimplemented("COPY_PHASE_STRIP")
        self._WarnUnimplemented("GCC_DEBUGGING_SYMBOLS")
        self._WarnUnimplemented("GCC_ENABLE_OBJC_EXCEPTIONS")

        # TODO: This is exported correctly, but assigning to it is not supported.
        self._WarnUnimplemented("MACH_O_TYPE")
        self._WarnUnimplemented("PRODUCT_TYPE")

        # If GYP_CROSSCOMPILE (--cross-compiling), disable architecture-specific
        # additions and assume these will be provided as required via CC_host,
        # CXX_host, CC_target and CXX_target.
        if not gyp.common.CrossCompileRequested():
            if arch is not None:
                archs = [arch]
            else:
                assert self.configname
                archs = self.GetActiveArchs(self.configname)
            if len(archs) != 1:
                # TODO: Supporting fat binaries will be annoying.
                self._WarnUnimplemented("ARCHS")
                archs = ["i386"]
            cflags.append("-arch " + archs[0])

            if archs[0] in ("i386", "x86_64"):
                if self._Test("GCC_ENABLE_SSE3_EXTENSIONS", "YES", default="NO"):
                    cflags.append("-msse3")
                if self._Test(
                    "GCC_ENABLE_SUPPLEMENTAL_SSE3_INSTRUCTIONS", "YES", default="NO"
                ):
                    cflags.append("-mssse3")  # Note 3rd 's'.
                if self._Test("GCC_ENABLE_SSE41_EXTENSIONS", "YES", default="NO"):
                    cflags.append("-msse4.1")
                if self._Test("GCC_ENABLE_SSE42_EXTENSIONS", "YES", default="NO"):
                    cflags.append("-msse4.2")

        cflags += self._Settings().get("WARNING_CFLAGS", [])

        if self._IsXCTest():
            platform_root = self._XcodePlatformPath(configname)
            if platform_root:
                cflags.append("-F" + platform_root + "/Developer/Library/Frameworks/")

        if sdk_root:
            framework_root = sdk_root
        else:
            framework_root = ""
        config = self.spec["configurations"][self.configname]
        framework_dirs = config.get("mac_framework_dirs", [])
        for directory in framework_dirs:
            cflags.append("-F" + directory.replace("$(SDKROOT)", framework_root))

        self.configname = None
        return cflags

    def GetCflagsC(self, configname):
        """Returns flags that need to be added to .c, and .m compilations."""
        self.configname = configname
        cflags_c = []
        if self._Settings().get("GCC_C_LANGUAGE_STANDARD", "") == "ansi":
            cflags_c.append("-ansi")
        else:
            self._Appendf(cflags_c, "GCC_C_LANGUAGE_STANDARD", "-std=%s")
        cflags_c += self._Settings().get("OTHER_CFLAGS", [])
        self.configname = None
        return cflags_c

    def GetCflagsCC(self, configname):
        """Returns flags that need to be added to .cc, and .mm compilations."""
        self.configname = configname
        cflags_cc = []

        clang_cxx_language_standard = self._Settings().get(
            "CLANG_CXX_LANGUAGE_STANDARD"
        )
        # Note: Don't make c++0x to c++11 so that c++0x can be used with older
        # clangs that don't understand c++11 yet (like Xcode 4.2's).
        if clang_cxx_language_standard:
            cflags_cc.append("-std=%s" % clang_cxx_language_standard)

        self._Appendf(cflags_cc, "CLANG_CXX_LIBRARY", "-stdlib=%s")

        if self._Test("GCC_ENABLE_CPP_RTTI", "NO", default="YES"):
            cflags_cc.append("-fno-rtti")
        if self._Test("GCC_ENABLE_CPP_EXCEPTIONS", "NO", default="YES"):
            cflags_cc.append("-fno-exceptions")
        if self._Test("GCC_INLINES_ARE_PRIVATE_EXTERN", "YES", default="NO"):
            cflags_cc.append("-fvisibility-inlines-hidden")
        if self._Test("GCC_THREADSAFE_STATICS", "NO", default="YES"):
            cflags_cc.append("-fno-threadsafe-statics")
        # Note: This flag is a no-op for clang, it only has an effect for gcc.
        if self._Test("GCC_WARN_ABOUT_INVALID_OFFSETOF_MACRO", "NO", default="YES"):
            cflags_cc.append("-Wno-invalid-offsetof")

        other_ccflags = []

        for flag in self._Settings().get("OTHER_CPLUSPLUSFLAGS", ["$(inherited)"]):
            # TODO: More general variable expansion. Missing in many other places too.
            if flag in ("$inherited", "$(inherited)", "${inherited}"):
                flag = "$OTHER_CFLAGS"
            if flag in ("$OTHER_CFLAGS", "$(OTHER_CFLAGS)", "${OTHER_CFLAGS}"):
                other_ccflags += self._Settings().get("OTHER_CFLAGS", [])
            else:
                other_ccflags.append(flag)
        cflags_cc += other_ccflags

        self.configname = None
        return cflags_cc

    def _AddObjectiveCGarbageCollectionFlags(self, flags):
        gc_policy = self._Settings().get("GCC_ENABLE_OBJC_GC", "unsupported")
        if gc_policy == "supported":
            flags.append("-fobjc-gc")
        elif gc_policy == "required":
            flags.append("-fobjc-gc-only")

    def _AddObjectiveCARCFlags(self, flags):
        if self._Test("CLANG_ENABLE_OBJC_ARC", "YES", default="NO"):
            flags.append("-fobjc-arc")

    def _AddObjectiveCMissingPropertySynthesisFlags(self, flags):
        if self._Test(
            "CLANG_WARN_OBJC_MISSING_PROPERTY_SYNTHESIS", "YES", default="NO"
        ):
            flags.append("-Wobjc-missing-property-synthesis")

    def GetCflagsObjC(self, configname):
        """Returns flags that need to be added to .m compilations."""
        self.configname = configname
        cflags_objc = []
        self._AddObjectiveCGarbageCollectionFlags(cflags_objc)
        self._AddObjectiveCARCFlags(cflags_objc)
        self._AddObjectiveCMissingPropertySynthesisFlags(cflags_objc)
        self.configname = None
        return cflags_objc

    def GetCflagsObjCC(self, configname):
        """Returns flags that need to be added to .mm compilations."""
        self.configname = configname
        cflags_objcc = []
        self._AddObjectiveCGarbageCollectionFlags(cflags_objcc)
        self._AddObjectiveCARCFlags(cflags_objcc)
        self._AddObjectiveCMissingPropertySynthesisFlags(cflags_objcc)
        if self._Test("GCC_OBJC_CALL_CXX_CDTORS", "YES", default="NO"):
            cflags_objcc.append("-fobjc-call-cxx-cdtors")
        self.configname = None
        return cflags_objcc

    def GetInstallNameBase(self):
        """Return DYLIB_INSTALL_NAME_BASE for this target."""
        # Xcode sets this for shared_libraries, and for nonbundled loadable_modules.
        if self.spec["type"] != "shared_library" and (
            self.spec["type"] != "loadable_module" or self._IsBundle()
        ):
            return None
        install_base = self.GetPerTargetSetting(
            "DYLIB_INSTALL_NAME_BASE",
            default="/Library/Frameworks" if self._IsBundle() else "/usr/local/lib",
        )
        return install_base

    def _StandardizePath(self, path):
        """Do :standardizepath processing for path."""
        # I'm not quite sure what :standardizepath does. Just call normpath(),
        # but don't let @executable_path/../foo collapse to foo.
        if "/" in path:
            prefix, rest = "", path
            if path.startswith("@"):
                prefix, rest = path.split("/", 1)
            rest = os.path.normpath(rest)  # :standardizepath
            path = os.path.join(prefix, rest)
        return path

    def GetInstallName(self):
        """Return LD_DYLIB_INSTALL_NAME for this target."""
        # Xcode sets this for shared_libraries, and for nonbundled loadable_modules.
        if self.spec["type"] != "shared_library" and (
            self.spec["type"] != "loadable_module" or self._IsBundle()
        ):
            return None

        default_install_name = (
            "$(DYLIB_INSTALL_NAME_BASE:standardizepath)/$(EXECUTABLE_PATH)"
        )
        install_name = self.GetPerTargetSetting(
            "LD_DYLIB_INSTALL_NAME", default=default_install_name
        )

        # Hardcode support for the variables used in chromium for now, to
        # unblock people using the make build.
        if "$" in install_name:
            assert install_name in (
                "$(DYLIB_INSTALL_NAME_BASE:standardizepath)/"
                "$(WRAPPER_NAME)/$(PRODUCT_NAME)",
                default_install_name,
            ), (
                "Variables in LD_DYLIB_INSTALL_NAME are not generally supported "
                "yet in target '%s' (got '%s')"
                % (self.spec["target_name"], install_name)
            )

            install_name = install_name.replace(
                "$(DYLIB_INSTALL_NAME_BASE:standardizepath)",
                self._StandardizePath(self.GetInstallNameBase()),
            )
            if self._IsBundle():
                # These are only valid for bundles, hence the |if|.
                install_name = install_name.replace(
                    "$(WRAPPER_NAME)", self.GetWrapperName()
                )
                install_name = install_name.replace(
                    "$(PRODUCT_NAME)", self.GetProductName()
                )
            else:
                assert "$(WRAPPER_NAME)" not in install_name
                assert "$(PRODUCT_NAME)" not in install_name

            install_name = install_name.replace(
                "$(EXECUTABLE_PATH)", self.GetExecutablePath()
            )
        return install_name

    def _MapLinkerFlagFilename(self, ldflag, gyp_to_build_path):
        """Checks if ldflag contains a filename and if so remaps it from
    gyp-directory-relative to build-directory-relative."""
        # This list is expanded on demand.
        # They get matched as:
        #   -exported_symbols_list file
        #   -Wl,exported_symbols_list file
        #   -Wl,exported_symbols_list,file
        LINKER_FILE = r"(\S+)"
        WORD = r"\S+"
        linker_flags = [
            ["-exported_symbols_list", LINKER_FILE],  # Needed for NaCl.
            ["-unexported_symbols_list", LINKER_FILE],
            ["-reexported_symbols_list", LINKER_FILE],
            ["-sectcreate", WORD, WORD, LINKER_FILE],  # Needed for remoting.
        ]
        for flag_pattern in linker_flags:
            regex = re.compile("(?:-Wl,)?" + "[ ,]".join(flag_pattern))
            m = regex.match(ldflag)
            if m:
                ldflag = (
                    ldflag[: m.start(1)]
                    + gyp_to_build_path(m.group(1))
                    + ldflag[m.end(1) :]
                )
        # Required for ffmpeg (no idea why they don't use LIBRARY_SEARCH_PATHS,
        # TODO(thakis): Update ffmpeg.gyp):
        if ldflag.startswith("-L"):
            ldflag = "-L" + gyp_to_build_path(ldflag[len("-L") :])
        return ldflag

    def GetLdflags(self, configname, product_dir, gyp_to_build_path, arch=None):
        """Returns flags that need to be passed to the linker.

    Args:
        configname: The name of the configuration to get ld flags for.
        product_dir: The directory where products such static and dynamic
            libraries are placed. This is added to the library search path.
        gyp_to_build_path: A function that converts paths relative to the
            current gyp file to paths relative to the build directory.
    """
        self.configname = configname
        ldflags = []

        # The xcode build is relative to a gyp file's directory, and OTHER_LDFLAGS
        # can contain entries that depend on this. Explicitly absolutify these.
        for ldflag in self._Settings().get("OTHER_LDFLAGS", []):
            ldflags.append(self._MapLinkerFlagFilename(ldflag, gyp_to_build_path))

        if self._Test("DEAD_CODE_STRIPPING", "YES", default="NO"):
            ldflags.append("-Wl,-dead_strip")

        if self._Test("PREBINDING", "YES", default="NO"):
            ldflags.append("-Wl,-prebind")

        self._Appendf(
            ldflags, "DYLIB_COMPATIBILITY_VERSION", "-compatibility_version %s"
        )
        self._Appendf(ldflags, "DYLIB_CURRENT_VERSION", "-current_version %s")

        self._AppendPlatformVersionMinFlags(ldflags)

        if "SDKROOT" in self._Settings() and self._SdkPath():
            ldflags.append("-isysroot " + self._SdkPath())

        for library_path in self._Settings().get("LIBRARY_SEARCH_PATHS", []):
            ldflags.append("-L" + gyp_to_build_path(library_path))

        if "ORDER_FILE" in self._Settings():
            ldflags.append(
                "-Wl,-order_file "
                + "-Wl,"
                + gyp_to_build_path(self._Settings()["ORDER_FILE"])
            )

        if not gyp.common.CrossCompileRequested():
            if arch is not None:
                archs = [arch]
            else:
                assert self.configname
                archs = self.GetActiveArchs(self.configname)
            if len(archs) != 1:
                # TODO: Supporting fat binaries will be annoying.
                self._WarnUnimplemented("ARCHS")
                archs = ["i386"]
            ldflags.append("-arch " + archs[0])

        # Xcode adds the product directory by default.
        # Rewrite -L. to -L./ to work around http://www.openradar.me/25313838
        ldflags.append("-L" + (product_dir if product_dir != "." else "./"))

        install_name = self.GetInstallName()
        if install_name and self.spec["type"] != "loadable_module":
            ldflags.append("-install_name " + install_name.replace(" ", r"\ "))

        for rpath in self._Settings().get("LD_RUNPATH_SEARCH_PATHS", []):
            ldflags.append("-Wl,-rpath," + rpath)

        sdk_root = self._SdkPath()
        if not sdk_root:
            sdk_root = ""
        config = self.spec["configurations"][self.configname]
        framework_dirs = config.get("mac_framework_dirs", [])
        for directory in framework_dirs:
            ldflags.append("-F" + directory.replace("$(SDKROOT)", sdk_root))

        if self._IsXCTest():
            platform_root = self._XcodePlatformPath(configname)
            if sdk_root and platform_root:
                ldflags.append("-F" + platform_root + "/Developer/Library/Frameworks/")
                ldflags.append("-framework XCTest")

        is_extension = self._IsIosAppExtension() or self._IsIosWatchKitExtension()
        if sdk_root and is_extension:
            # Adds the link flags for extensions. These flags are common for all
            # extensions and provide loader and main function.
            # These flags reflect the compilation options used by xcode to compile
            # extensions.
            xcode_version, _ = XcodeVersion()
            if xcode_version < "0900":
                ldflags.append("-lpkstart")
                ldflags.append(
                    sdk_root
                    + "/System/Library/PrivateFrameworks/PlugInKit.framework/PlugInKit"
                )
            else:
                ldflags.append("-e _NSExtensionMain")
            ldflags.append("-fapplication-extension")

        self._Appendf(ldflags, "CLANG_CXX_LIBRARY", "-stdlib=%s")

        self.configname = None
        return ldflags

    def GetLibtoolflags(self, configname):
        """Returns flags that need to be passed to the static linker.

    Args:
        configname: The name of the configuration to get ld flags for.
    """
        self.configname = configname
        libtoolflags = []

        for libtoolflag in self._Settings().get("OTHER_LDFLAGS", []):
            libtoolflags.append(libtoolflag)
        # TODO(thakis): ARCHS?

        self.configname = None
        return libtoolflags

    def GetPerTargetSettings(self):
        """Gets a list of all the per-target settings. This will only fetch keys
    whose values are the same across all configurations."""
        first_pass = True
        result = {}
        for configname in sorted(self.xcode_settings.keys()):
            if first_pass:
                result = dict(self.xcode_settings[configname])
                first_pass = False
            else:
                for key, value in self.xcode_settings[configname].items():
                    if key not in result:
                        continue
                    elif result[key] != value:
                        del result[key]
        return result

    def GetPerConfigSetting(self, setting, configname, default=None):
        if configname in self.xcode_settings:
            return self.xcode_settings[configname].get(setting, default)
        else:
            return self.GetPerTargetSetting(setting, default)

    def GetPerTargetSetting(self, setting, default=None):
        """Tries to get xcode_settings.setting from spec. Assumes that the setting
       has the same value in all configurations and throws otherwise."""
        is_first_pass = True
        result = None
        for configname in sorted(self.xcode_settings.keys()):
            if is_first_pass:
                result = self.xcode_settings[configname].get(setting, None)
                is_first_pass = False
            else:
                assert result == self.xcode_settings[configname].get(setting, None), (
                    "Expected per-target setting for '%s', got per-config setting "
                    "(target %s)" % (setting, self.spec["target_name"])
                )
        if result is None:
            return default
        return result

    def _GetStripPostbuilds(self, configname, output_binary, quiet):
        """Returns a list of shell commands that contain the shell commands
    necessary to strip this target's binary. These should be run as postbuilds
    before the actual postbuilds run."""
        self.configname = configname

        result = []
        if self._Test("DEPLOYMENT_POSTPROCESSING", "YES", default="NO") and self._Test(
            "STRIP_INSTALLED_PRODUCT", "YES", default="NO"
        ):

            default_strip_style = "debugging"
            if (
                self.spec["type"] == "loadable_module" or self._IsIosAppExtension()
            ) and self._IsBundle():
                default_strip_style = "non-global"
            elif self.spec["type"] == "executable":
                default_strip_style = "all"

            strip_style = self._Settings().get("STRIP_STYLE", default_strip_style)
            strip_flags = {"all": "", "non-global": "-x", "debugging": "-S"}[
                strip_style
            ]

            explicit_strip_flags = self._Settings().get("STRIPFLAGS", "")
            if explicit_strip_flags:
                strip_flags += " " + _NormalizeEnvVarReferences(explicit_strip_flags)

            if not quiet:
                result.append("echo STRIP\\(%s\\)" % self.spec["target_name"])
            result.append(f"strip {strip_flags} {output_binary}")

        self.configname = None
        return result

    def _GetDebugInfoPostbuilds(self, configname, output, output_binary, quiet):
        """Returns a list of shell commands that contain the shell commands
    necessary to massage this target's debug information. These should be run
    as postbuilds before the actual postbuilds run."""
        self.configname = configname

        # For static libraries, no dSYMs are created.
        result = []
        if (
            self._Test("GCC_GENERATE_DEBUGGING_SYMBOLS", "YES", default="YES")
            and self._Test(
                "DEBUG_INFORMATION_FORMAT", "dwarf-with-dsym", default="dwarf"
            )
            and self.spec["type"] != "static_library"
        ):
            if not quiet:
                result.append("echo DSYMUTIL\\(%s\\)" % self.spec["target_name"])
            result.append("dsymutil {} -o {}".format(output_binary, output + ".dSYM"))

        self.configname = None
        return result

    def _GetTargetPostbuilds(self, configname, output, output_binary, quiet=False):
        """Returns a list of shell commands that contain the shell commands
    to run as postbuilds for this target, before the actual postbuilds."""
        # dSYMs need to build before stripping happens.
        return self._GetDebugInfoPostbuilds(
            configname, output, output_binary, quiet
        ) + self._GetStripPostbuilds(configname, output_binary, quiet)

    def _GetIOSPostbuilds(self, configname, output_binary):
        """Return a shell command to codesign the iOS output binary so it can
    be deployed to a device.  This should be run as the very last step of the
    build."""
        if not (
            self.isIOS
            and (self.spec["type"] == "executable" or self._IsXCTest())
            or self.IsIosFramework()
        ):
            return []

        postbuilds = []
        product_name = self.GetFullProductName()
        settings = self.xcode_settings[configname]

        # Xcode expects XCTests to be copied into the TEST_HOST dir.
        if self._IsXCTest():
            source = os.path.join("${BUILT_PRODUCTS_DIR}", product_name)
            test_host = os.path.dirname(settings.get("TEST_HOST"))
            xctest_destination = os.path.join(test_host, "PlugIns", product_name)
            postbuilds.extend([f"ditto {source} {xctest_destination}"])

        key = self._GetIOSCodeSignIdentityKey(settings)
        if not key:
            return postbuilds

        # Warn for any unimplemented signing xcode keys.
        unimpl = ["OTHER_CODE_SIGN_FLAGS"]
        unimpl = set(unimpl) & set(self.xcode_settings[configname].keys())
        if unimpl:
            print(
                "Warning: Some codesign keys not implemented, ignoring: %s"
                % ", ".join(sorted(unimpl))
            )

        if self._IsXCTest():
            # For device xctests, Xcode copies two extra frameworks into $TEST_HOST.
            test_host = os.path.dirname(settings.get("TEST_HOST"))
            frameworks_dir = os.path.join(test_host, "Frameworks")
            platform_root = self._XcodePlatformPath(configname)
            frameworks = [
                "Developer/Library/PrivateFrameworks/IDEBundleInjection.framework",
                "Developer/Library/Frameworks/XCTest.framework",
            ]
            for framework in frameworks:
                source = os.path.join(platform_root, framework)
                destination = os.path.join(frameworks_dir, os.path.basename(framework))
                postbuilds.extend([f"ditto {source} {destination}"])

                # Then re-sign everything with 'preserve=True'
                postbuilds.extend(
                    [
                        '%s code-sign-bundle "%s" "%s" "%s" "%s" %s'
                        % (
                            os.path.join("${TARGET_BUILD_DIR}", "gyp-mac-tool"),
                            key,
                            settings.get("CODE_SIGN_ENTITLEMENTS", ""),
                            settings.get("PROVISIONING_PROFILE", ""),
                            destination,
                            True,
                        )
                    ]
                )
            plugin_dir = os.path.join(test_host, "PlugIns")
            targets = [os.path.join(plugin_dir, product_name), test_host]
            for target in targets:
                postbuilds.extend(
                    [
                        '%s code-sign-bundle "%s" "%s" "%s" "%s" %s'
                        % (
                            os.path.join("${TARGET_BUILD_DIR}", "gyp-mac-tool"),
                            key,
                            settings.get("CODE_SIGN_ENTITLEMENTS", ""),
                            settings.get("PROVISIONING_PROFILE", ""),
                            target,
                            True,
                        )
                    ]
                )

        postbuilds.extend(
            [
                '%s code-sign-bundle "%s" "%s" "%s" "%s" %s'
                % (
                    os.path.join("${TARGET_BUILD_DIR}", "gyp-mac-tool"),
                    key,
                    settings.get("CODE_SIGN_ENTITLEMENTS", ""),
                    settings.get("PROVISIONING_PROFILE", ""),
                    os.path.join("${BUILT_PRODUCTS_DIR}", product_name),
                    False,
                )
            ]
        )
        return postbuilds

    def _GetIOSCodeSignIdentityKey(self, settings):
        identity = settings.get("CODE_SIGN_IDENTITY")
        if not identity:
            return None
        if identity not in XcodeSettings._codesigning_key_cache:
            output = subprocess.check_output(
                ["security", "find-identity", "-p", "codesigning", "-v"]
            )
            for line in output.splitlines():
                if identity in line:
                    fingerprint = line.split()[1]
                    cache = XcodeSettings._codesigning_key_cache
                    assert identity not in cache or fingerprint == cache[identity], (
                        "Multiple codesigning fingerprints for identity: %s" % identity
                    )
                    XcodeSettings._codesigning_key_cache[identity] = fingerprint
        return XcodeSettings._codesigning_key_cache.get(identity, "")

    def AddImplicitPostbuilds(
        self, configname, output, output_binary, postbuilds=[], quiet=False
    ):
        """Returns a list of shell commands that should run before and after
    |postbuilds|."""
        assert output_binary is not None
        pre = self._GetTargetPostbuilds(configname, output, output_binary, quiet)
        post = self._GetIOSPostbuilds(configname, output_binary)
        return pre + postbuilds + post

    def _AdjustLibrary(self, library, config_name=None):
        if library.endswith(".framework"):
            l_flag = "-framework " + os.path.splitext(os.path.basename(library))[0]
        else:
            m = self.library_re.match(library)
            if m:
                l_flag = "-l" + m.group(1)
            else:
                l_flag = library

        sdk_root = self._SdkPath(config_name)
        if not sdk_root:
            sdk_root = ""
        # Xcode 7 started shipping with ".tbd" (text based stubs) files instead of
        # ".dylib" without providing a real support for them. What it does, for
        # "/usr/lib" libraries, is do "-L/usr/lib -lname" which is dependent on the
        # library order and cause collision when building Chrome.
        #
        # Instead substitute ".tbd" to ".dylib" in the generated project when the
        # following conditions are both true:
        # - library is referenced in the gyp file as "$(SDKROOT)/**/*.dylib",
        # - the ".dylib" file does not exists but a ".tbd" file do.
        library = l_flag.replace("$(SDKROOT)", sdk_root)
        if l_flag.startswith("$(SDKROOT)"):
            basename, ext = os.path.splitext(library)
            if ext == ".dylib" and not os.path.exists(library):
                tbd_library = basename + ".tbd"
                if os.path.exists(tbd_library):
                    library = tbd_library
        return library

    def AdjustLibraries(self, libraries, config_name=None):
        """Transforms entries like 'Cocoa.framework' in libraries into entries like
    '-framework Cocoa', 'libcrypto.dylib' into '-lcrypto', etc.
    """
        libraries = [self._AdjustLibrary(library, config_name) for library in libraries]
        return libraries

    def _BuildMachineOSBuild(self):
        return GetStdout(["sw_vers", "-buildVersion"])

    def _XcodeIOSDeviceFamily(self, configname):
        family = self.xcode_settings[configname].get("TARGETED_DEVICE_FAMILY", "1")
        return [int(x) for x in family.split(",")]

    def GetExtraPlistItems(self, configname=None):
        """Returns a dictionary with extra items to insert into Info.plist."""
        if configname not in XcodeSettings._plist_cache:
            cache = {}
            cache["BuildMachineOSBuild"] = self._BuildMachineOSBuild()

            xcode_version, xcode_build = XcodeVersion()
            cache["DTXcode"] = xcode_version
            cache["DTXcodeBuild"] = xcode_build
            compiler = self.xcode_settings[configname].get("GCC_VERSION")
            if compiler is not None:
                cache["DTCompiler"] = compiler

            sdk_root = self._SdkRoot(configname)
            if not sdk_root:
                sdk_root = self._DefaultSdkRoot()
            sdk_version = self._GetSdkVersionInfoItem(sdk_root, "--show-sdk-version")
            cache["DTSDKName"] = sdk_root + (sdk_version or "")
            if xcode_version >= "0720":
                cache["DTSDKBuild"] = self._GetSdkVersionInfoItem(
                    sdk_root, "--show-sdk-build-version"
                )
            elif xcode_version >= "0430":
                cache["DTSDKBuild"] = sdk_version
            else:
                cache["DTSDKBuild"] = cache["BuildMachineOSBuild"]

            if self.isIOS:
                cache["MinimumOSVersion"] = self.xcode_settings[configname].get(
                    "IPHONEOS_DEPLOYMENT_TARGET"
                )
                cache["DTPlatformName"] = sdk_root
                cache["DTPlatformVersion"] = sdk_version

                if configname.endswith("iphoneos"):
                    cache["CFBundleSupportedPlatforms"] = ["iPhoneOS"]
                    cache["DTPlatformBuild"] = cache["DTSDKBuild"]
                else:
                    cache["CFBundleSupportedPlatforms"] = ["iPhoneSimulator"]
                    # This is weird, but Xcode sets DTPlatformBuild to an empty field
                    # for simulator builds.
                    cache["DTPlatformBuild"] = ""
            XcodeSettings._plist_cache[configname] = cache

        # Include extra plist items that are per-target, not per global
        # XcodeSettings.
        items = dict(XcodeSettings._plist_cache[configname])
        if self.isIOS:
            items["UIDeviceFamily"] = self._XcodeIOSDeviceFamily(configname)
        return items

    def _DefaultSdkRoot(self):
        """Returns the default SDKROOT to use.

    Prior to version 5.0.0, if SDKROOT was not explicitly set in the Xcode
    project, then the environment variable was empty. Starting with this
    version, Xcode uses the name of the newest SDK installed.
    """
        xcode_version, _ = XcodeVersion()
        if xcode_version < "0500":
            return ""
        default_sdk_path = self._XcodeSdkPath("")
        default_sdk_root = XcodeSettings._sdk_root_cache.get(default_sdk_path)
        if default_sdk_root:
            return default_sdk_root
        try:
            all_sdks = GetStdout(["xcodebuild", "-showsdks"])
        except GypError:
            # If xcodebuild fails, there will be no valid SDKs
            return ""
        for line in all_sdks.splitlines():
            items = line.split()
            if len(items) >= 3 and items[-2] == "-sdk":
                sdk_root = items[-1]
                sdk_path = self._XcodeSdkPath(sdk_root)
                if sdk_path == default_sdk_path:
                    return sdk_root
        return ""


class MacPrefixHeader:
    """A class that helps with emulating Xcode's GCC_PREFIX_HEADER feature.

  This feature consists of several pieces:
  * If GCC_PREFIX_HEADER is present, all compilations in that project get an
    additional |-include path_to_prefix_header| cflag.
  * If GCC_PRECOMPILE_PREFIX_HEADER is present too, then the prefix header is
    instead compiled, and all other compilations in the project get an
    additional |-include path_to_compiled_header| instead.
    + Compiled prefix headers have the extension gch. There is one gch file for
      every language used in the project (c, cc, m, mm), since gch files for
      different languages aren't compatible.
    + gch files themselves are built with the target's normal cflags, but they
      obviously don't get the |-include| flag. Instead, they need a -x flag that
      describes their language.
    + All o files in the target need to depend on the gch file, to make sure
      it's built before any o file is built.

  This class helps with some of these tasks, but it needs help from the build
  system for writing dependencies to the gch files, for writing build commands
  for the gch files, and for figuring out the location of the gch files.
  """

    def __init__(
        self, xcode_settings, gyp_path_to_build_path, gyp_path_to_build_output
    ):
        """If xcode_settings is None, all methods on this class are no-ops.

    Args:
        gyp_path_to_build_path: A function that takes a gyp-relative path,
            and returns a path relative to the build directory.
        gyp_path_to_build_output: A function that takes a gyp-relative path and
            a language code ('c', 'cc', 'm', or 'mm'), and that returns a path
            to where the output of precompiling that path for that language
            should be placed (without the trailing '.gch').
    """
        # This doesn't support per-configuration prefix headers. Good enough
        # for now.
        self.header = None
        self.compile_headers = False
        if xcode_settings:
            self.header = xcode_settings.GetPerTargetSetting("GCC_PREFIX_HEADER")
            self.compile_headers = (
                xcode_settings.GetPerTargetSetting(
                    "GCC_PRECOMPILE_PREFIX_HEADER", default="NO"
                )
                != "NO"
            )
        self.compiled_headers = {}
        if self.header:
            if self.compile_headers:
                for lang in ["c", "cc", "m", "mm"]:
                    self.compiled_headers[lang] = gyp_path_to_build_output(
                        self.header, lang
                    )
            self.header = gyp_path_to_build_path(self.header)

    def _CompiledHeader(self, lang, arch):
        assert self.compile_headers
        h = self.compiled_headers[lang]
        if arch:
            h += "." + arch
        return h

    def GetInclude(self, lang, arch=None):
        """Gets the cflags to include the prefix header for language |lang|."""
        if self.compile_headers and lang in self.compiled_headers:
            return "-include %s" % self._CompiledHeader(lang, arch)
        elif self.header:
            return "-include %s" % self.header
        else:
            return ""

    def _Gch(self, lang, arch):
        """Returns the actual file name of the prefix header for language |lang|."""
        assert self.compile_headers
        return self._CompiledHeader(lang, arch) + ".gch"

    def GetObjDependencies(self, sources, objs, arch=None):
        """Given a list of source files and the corresponding object files, returns
    a list of (source, object, gch) tuples, where |gch| is the build-directory
    relative path to the gch file each object file depends on.  |compilable[i]|
    has to be the source file belonging to |objs[i]|."""
        if not self.header or not self.compile_headers:
            return []

        result = []
        for source, obj in zip(sources, objs):
            ext = os.path.splitext(source)[1]
            lang = {
                ".c": "c",
                ".cpp": "cc",
                ".cc": "cc",
                ".cxx": "cc",
                ".m": "m",
                ".mm": "mm",
            }.get(ext, None)
            if lang:
                result.append((source, obj, self._Gch(lang, arch)))
        return result

    def GetPchBuildCommands(self, arch=None):
        """Returns [(path_to_gch, language_flag, language, header)].
    |path_to_gch| and |header| are relative to the build directory.
    """
        if not self.header or not self.compile_headers:
            return []
        return [
            (self._Gch("c", arch), "-x c-header", "c", self.header),
            (self._Gch("cc", arch), "-x c++-header", "cc", self.header),
            (self._Gch("m", arch), "-x objective-c-header", "m", self.header),
            (self._Gch("mm", arch), "-x objective-c++-header", "mm", self.header),
        ]


def XcodeVersion():
    """Returns a tuple of version and build version of installed Xcode."""
    # `xcodebuild -version` output looks like
    #    Xcode 4.6.3
    #    Build version 4H1503
    # or like
    #    Xcode 3.2.6
    #    Component versions: DevToolsCore-1809.0; DevToolsSupport-1806.0
    #    BuildVersion: 10M2518
    # Convert that to ('0463', '4H1503') or ('0326', '10M2518').
    global XCODE_VERSION_CACHE
    if XCODE_VERSION_CACHE:
        return XCODE_VERSION_CACHE
    version = ""
    build = ""
    try:
        version_list = GetStdoutQuiet(["xcodebuild", "-version"]).splitlines()
        # In some circumstances xcodebuild exits 0 but doesn't return
        # the right results; for example, a user on 10.7 or 10.8 with
        # a bogus path set via xcode-select
        # In that case this may be a CLT-only install so fall back to
        # checking that version.
        if len(version_list) < 2:
            raise GypError("xcodebuild returned unexpected results")
        version = version_list[0].split()[-1]  # Last word on first line
        build = version_list[-1].split()[-1]  # Last word on last line
    except GypError:  # Xcode not installed so look for XCode Command Line Tools
        version = CLTVersion()  # macOS Catalina returns 11.0.0.0.1.1567737322
        if not version:
            raise GypError("No Xcode or CLT version detected!")
    # Be careful to convert "4.2.3" to "0423" and "11.0.0" to "1100":
    version = version.split(".")[:3]  # Just major, minor, micro
    version[0] = version[0].zfill(2)  # Add a leading zero if major is one digit
    version = ("".join(version) + "00")[:4]  # Limit to exactly four characters
    XCODE_VERSION_CACHE = (version, build)
    return XCODE_VERSION_CACHE


# This function ported from the logic in Homebrew's CLT version check
def CLTVersion():
    """Returns the version of command-line tools from pkgutil."""
    # pkgutil output looks like
    #   package-id: com.apple.pkg.CLTools_Executables
    #   version: 5.0.1.0.1.1382131676
    #   volume: /
    #   location: /
    #   install-time: 1382544035
    #   groups: com.apple.FindSystemFiles.pkg-group
    #           com.apple.DevToolsBoth.pkg-group
    #           com.apple.DevToolsNonRelocatableShared.pkg-group
    STANDALONE_PKG_ID = "com.apple.pkg.DeveloperToolsCLILeo"
    FROM_XCODE_PKG_ID = "com.apple.pkg.DeveloperToolsCLI"
    MAVERICKS_PKG_ID = "com.apple.pkg.CLTools_Executables"

    regex = re.compile("version: (?P<version>.+)")
    for key in [MAVERICKS_PKG_ID, STANDALONE_PKG_ID, FROM_XCODE_PKG_ID]:
        try:
            output = GetStdout(["/usr/sbin/pkgutil", "--pkg-info", key])
            return re.search(regex, output).groupdict()["version"]
        except GypError:
            continue

    regex = re.compile(r'Command Line Tools for Xcode\s+(?P<version>\S+)')
    try:
        output = GetStdout(["/usr/sbin/softwareupdate", "--history"])
        return re.search(regex, output).groupdict()["version"]
    except GypError:
        return None


def GetStdoutQuiet(cmdlist):
    """Returns the content of standard output returned by invoking |cmdlist|.
  Ignores the stderr.
  Raises |GypError| if the command return with a non-zero return code."""
    job = subprocess.Popen(cmdlist, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out = job.communicate()[0].decode("utf-8")
    if job.returncode != 0:
        raise GypError("Error %d running %s" % (job.returncode, cmdlist[0]))
    return out.rstrip("\n")


def GetStdout(cmdlist):
    """Returns the content of standard output returned by invoking |cmdlist|.
  Raises |GypError| if the command return with a non-zero return code."""
    job = subprocess.Popen(cmdlist, stdout=subprocess.PIPE)
    out = job.communicate()[0].decode("utf-8")
    if job.returncode != 0:
        sys.stderr.write(out + "\n")
        raise GypError("Error %d running %s" % (job.returncode, cmdlist[0]))
    return out.rstrip("\n")


def MergeGlobalXcodeSettingsToSpec(global_dict, spec):
    """Merges the global xcode_settings dictionary into each configuration of the
  target represented by spec. For keys that are both in the global and the local
  xcode_settings dict, the local key gets precedence.
  """
    # The xcode generator special-cases global xcode_settings and does something
    # that amounts to merging in the global xcode_settings into each local
    # xcode_settings dict.
    global_xcode_settings = global_dict.get("xcode_settings", {})
    for config in spec["configurations"].values():
        if "xcode_settings" in config:
            new_settings = global_xcode_settings.copy()
            new_settings.update(config["xcode_settings"])
            config["xcode_settings"] = new_settings


def IsMacBundle(flavor, spec):
    """Returns if |spec| should be treated as a bundle.

  Bundles are directories with a certain subdirectory structure, instead of
  just a single file. Bundle rules do not produce a binary but also package
  resources into that directory."""
    is_mac_bundle = (
        int(spec.get("mac_xctest_bundle", 0)) != 0
        or int(spec.get("mac_xcuitest_bundle", 0)) != 0
        or (int(spec.get("mac_bundle", 0)) != 0 and flavor == "mac")
    )

    if is_mac_bundle:
        assert spec["type"] != "none", (
            'mac_bundle targets cannot have type none (target "%s")'
            % spec["target_name"]
        )
    return is_mac_bundle


def GetMacBundleResources(product_dir, xcode_settings, resources):
    """Yields (output, resource) pairs for every resource in |resources|.
  Only call this for mac bundle targets.

  Args:
      product_dir: Path to the directory containing the output bundle,
          relative to the build directory.
      xcode_settings: The XcodeSettings of the current target.
      resources: A list of bundle resources, relative to the build directory.
  """
    dest = os.path.join(product_dir, xcode_settings.GetBundleResourceFolder())
    for res in resources:
        output = dest

        # The make generator doesn't support it, so forbid it everywhere
        # to keep the generators more interchangeable.
        assert " " not in res, "Spaces in resource filenames not supported (%s)" % res

        # Split into (path,file).
        res_parts = os.path.split(res)

        # Now split the path into (prefix,maybe.lproj).
        lproj_parts = os.path.split(res_parts[0])
        # If the resource lives in a .lproj bundle, add that to the destination.
        if lproj_parts[1].endswith(".lproj"):
            output = os.path.join(output, lproj_parts[1])

        output = os.path.join(output, res_parts[1])
        # Compiled XIB files are referred to by .nib.
        if output.endswith(".xib"):
            output = os.path.splitext(output)[0] + ".nib"
        # Compiled storyboard files are referred to by .storyboardc.
        if output.endswith(".storyboard"):
            output = os.path.splitext(output)[0] + ".storyboardc"

        yield output, res


def GetMacInfoPlist(product_dir, xcode_settings, gyp_path_to_build_path):
    """Returns (info_plist, dest_plist, defines, extra_env), where:
  * |info_plist| is the source plist path, relative to the
    build directory,
  * |dest_plist| is the destination plist path, relative to the
    build directory,
  * |defines| is a list of preprocessor defines (empty if the plist
    shouldn't be preprocessed,
  * |extra_env| is a dict of env variables that should be exported when
    invoking |mac_tool copy-info-plist|.

  Only call this for mac bundle targets.

  Args:
      product_dir: Path to the directory containing the output bundle,
          relative to the build directory.
      xcode_settings: The XcodeSettings of the current target.
      gyp_to_build_path: A function that converts paths relative to the
          current gyp file to paths relative to the build directory.
  """
    info_plist = xcode_settings.GetPerTargetSetting("INFOPLIST_FILE")
    if not info_plist:
        return None, None, [], {}

    # The make generator doesn't support it, so forbid it everywhere
    # to keep the generators more interchangeable.
    assert " " not in info_plist, (
        "Spaces in Info.plist filenames not supported (%s)" % info_plist
    )

    info_plist = gyp_path_to_build_path(info_plist)

    # If explicitly set to preprocess the plist, invoke the C preprocessor and
    # specify any defines as -D flags.
    if (
        xcode_settings.GetPerTargetSetting("INFOPLIST_PREPROCESS", default="NO")
        == "YES"
    ):
        # Create an intermediate file based on the path.
        defines = shlex.split(
            xcode_settings.GetPerTargetSetting(
                "INFOPLIST_PREPROCESSOR_DEFINITIONS", default=""
            )
        )
    else:
        defines = []

    dest_plist = os.path.join(product_dir, xcode_settings.GetBundlePlistPath())
    extra_env = xcode_settings.GetPerTargetSettings()

    return info_plist, dest_plist, defines, extra_env


def _GetXcodeEnv(
    xcode_settings, built_products_dir, srcroot, configuration, additional_settings=None
):
    """Return the environment variables that Xcode would set. See
  http://developer.apple.com/library/mac/#documentation/DeveloperTools/Reference/XcodeBuildSettingRef/1-Build_Setting_Reference/build_setting_ref.html#//apple_ref/doc/uid/TP40003931-CH3-SW153
  for a full list.

  Args:
      xcode_settings: An XcodeSettings object. If this is None, this function
          returns an empty dict.
      built_products_dir: Absolute path to the built products dir.
      srcroot: Absolute path to the source root.
      configuration: The build configuration name.
      additional_settings: An optional dict with more values to add to the
          result.
  """

    if not xcode_settings:
        return {}

    # This function is considered a friend of XcodeSettings, so let it reach into
    # its implementation details.
    spec = xcode_settings.spec

    # These are filled in on an as-needed basis.
    env = {
        "BUILT_FRAMEWORKS_DIR": built_products_dir,
        "BUILT_PRODUCTS_DIR": built_products_dir,
        "CONFIGURATION": configuration,
        "PRODUCT_NAME": xcode_settings.GetProductName(),
        # For FULL_PRODUCT_NAME see:
        # /Developer/Platforms/MacOSX.platform/Developer/Library/Xcode/Specifications/MacOSX\ Product\ Types.xcspec  # noqa: E501
        "SRCROOT": srcroot,
        "SOURCE_ROOT": "${SRCROOT}",
        # This is not true for static libraries, but currently the env is only
        # written for bundles:
        "TARGET_BUILD_DIR": built_products_dir,
        "TEMP_DIR": "${TMPDIR}",
        "XCODE_VERSION_ACTUAL": XcodeVersion()[0],
    }
    if xcode_settings.GetPerConfigSetting("SDKROOT", configuration):
        env["SDKROOT"] = xcode_settings._SdkPath(configuration)
    else:
        env["SDKROOT"] = ""

    if xcode_settings.mac_toolchain_dir:
        env["DEVELOPER_DIR"] = xcode_settings.mac_toolchain_dir

    if spec["type"] in (
        "executable",
        "static_library",
        "shared_library",
        "loadable_module",
    ):
        env["EXECUTABLE_NAME"] = xcode_settings.GetExecutableName()
        env["EXECUTABLE_PATH"] = xcode_settings.GetExecutablePath()
        env["FULL_PRODUCT_NAME"] = xcode_settings.GetFullProductName()
        mach_o_type = xcode_settings.GetMachOType()
        if mach_o_type:
            env["MACH_O_TYPE"] = mach_o_type
        env["PRODUCT_TYPE"] = xcode_settings.GetProductType()
    if xcode_settings._IsBundle():
        # xcodeproj_file.py sets the same Xcode subfolder value for this as for
        # FRAMEWORKS_FOLDER_PATH so Xcode builds will actually use FFP's value.
        env["BUILT_FRAMEWORKS_DIR"] = os.path.join(
            built_products_dir + os.sep + xcode_settings.GetBundleFrameworksFolderPath()
        )
        env["CONTENTS_FOLDER_PATH"] = xcode_settings.GetBundleContentsFolderPath()
        env["EXECUTABLE_FOLDER_PATH"] = xcode_settings.GetBundleExecutableFolderPath()
        env[
            "UNLOCALIZED_RESOURCES_FOLDER_PATH"
        ] = xcode_settings.GetBundleResourceFolder()
        env["JAVA_FOLDER_PATH"] = xcode_settings.GetBundleJavaFolderPath()
        env["FRAMEWORKS_FOLDER_PATH"] = xcode_settings.GetBundleFrameworksFolderPath()
        env[
            "SHARED_FRAMEWORKS_FOLDER_PATH"
        ] = xcode_settings.GetBundleSharedFrameworksFolderPath()
        env[
            "SHARED_SUPPORT_FOLDER_PATH"
        ] = xcode_settings.GetBundleSharedSupportFolderPath()
        env["PLUGINS_FOLDER_PATH"] = xcode_settings.GetBundlePlugInsFolderPath()
        env["XPCSERVICES_FOLDER_PATH"] = xcode_settings.GetBundleXPCServicesFolderPath()
        env["INFOPLIST_PATH"] = xcode_settings.GetBundlePlistPath()
        env["WRAPPER_NAME"] = xcode_settings.GetWrapperName()

    install_name = xcode_settings.GetInstallName()
    if install_name:
        env["LD_DYLIB_INSTALL_NAME"] = install_name
    install_name_base = xcode_settings.GetInstallNameBase()
    if install_name_base:
        env["DYLIB_INSTALL_NAME_BASE"] = install_name_base
    xcode_version, _ = XcodeVersion()
    if xcode_version >= "0500" and not env.get("SDKROOT"):
        sdk_root = xcode_settings._SdkRoot(configuration)
        if not sdk_root:
            sdk_root = xcode_settings._XcodeSdkPath("")
        if sdk_root is None:
            sdk_root = ""
        env["SDKROOT"] = sdk_root

    if not additional_settings:
        additional_settings = {}
    else:
        # Flatten lists to strings.
        for k in additional_settings:
            if not isinstance(additional_settings[k], str):
                additional_settings[k] = " ".join(additional_settings[k])
    additional_settings.update(env)

    for k in additional_settings:
        additional_settings[k] = _NormalizeEnvVarReferences(additional_settings[k])

    return additional_settings


def _NormalizeEnvVarReferences(str):
    """Takes a string containing variable references in the form ${FOO}, $(FOO),
  or $FOO, and returns a string with all variable references in the form ${FOO}.
  """
    # $FOO -> ${FOO}
    str = re.sub(r"\$([a-zA-Z_][a-zA-Z0-9_]*)", r"${\1}", str)

    # $(FOO) -> ${FOO}
    matches = re.findall(r"(\$\(([a-zA-Z0-9\-_]+)\))", str)
    for match in matches:
        to_replace, variable = match
        assert "$(" not in match, "$($(FOO)) variables not supported: " + match
        str = str.replace(to_replace, "${" + variable + "}")

    return str


def ExpandEnvVars(string, expansions):
    """Expands ${VARIABLES}, $(VARIABLES), and $VARIABLES in string per the
  expansions list. If the variable expands to something that references
  another variable, this variable is expanded as well if it's in env --
  until no variables present in env are left."""
    for k, v in reversed(expansions):
        string = string.replace("${" + k + "}", v)
        string = string.replace("$(" + k + ")", v)
        string = string.replace("$" + k, v)
    return string


def _TopologicallySortedEnvVarKeys(env):
    """Takes a dict |env| whose values are strings that can refer to other keys,
  for example env['foo'] = '$(bar) and $(baz)'. Returns a list L of all keys of
  env such that key2 is after key1 in L if env[key2] refers to env[key1].

  Throws an Exception in case of dependency cycles.
  """
    # Since environment variables can refer to other variables, the evaluation
    # order is important. Below is the logic to compute the dependency graph
    # and sort it.
    regex = re.compile(r"\$\{([a-zA-Z0-9\-_]+)\}")

    def GetEdges(node):
        # Use a definition of edges such that user_of_variable -> used_varible.
        # This happens to be easier in this case, since a variable's
        # definition contains all variables it references in a single string.
        # We can then reverse the result of the topological sort at the end.
        # Since: reverse(topsort(DAG)) = topsort(reverse_edges(DAG))
        matches = {v for v in regex.findall(env[node]) if v in env}
        for dependee in matches:
            assert "${" not in dependee, "Nested variables not supported: " + dependee
        return matches

    try:
        # Topologically sort, and then reverse, because we used an edge definition
        # that's inverted from the expected result of this function (see comment
        # above).
        order = gyp.common.TopologicallySorted(env.keys(), GetEdges)
        order.reverse()
        return order
    except gyp.common.CycleError as e:
        raise GypError(
            "Xcode environment variables are cyclically dependent: " + str(e.nodes)
        )


def GetSortedXcodeEnv(
    xcode_settings, built_products_dir, srcroot, configuration, additional_settings=None
):
    env = _GetXcodeEnv(
        xcode_settings, built_products_dir, srcroot, configuration, additional_settings
    )
    return [(key, env[key]) for key in _TopologicallySortedEnvVarKeys(env)]


def GetSpecPostbuildCommands(spec, quiet=False):
    """Returns the list of postbuilds explicitly defined on |spec|, in a form
  executable by a shell."""
    postbuilds = []
    for postbuild in spec.get("postbuilds", []):
        if not quiet:
            postbuilds.append(
                "echo POSTBUILD\\(%s\\) %s"
                % (spec["target_name"], postbuild["postbuild_name"])
            )
        postbuilds.append(gyp.common.EncodePOSIXShellList(postbuild["action"]))
    return postbuilds


def _HasIOSTarget(targets):
    """Returns true if any target contains the iOS specific key
  IPHONEOS_DEPLOYMENT_TARGET."""
    for target_dict in targets.values():
        for config in target_dict["configurations"].values():
            if config.get("xcode_settings", {}).get("IPHONEOS_DEPLOYMENT_TARGET"):
                return True
    return False


def _AddIOSDeviceConfigurations(targets):
    """Clone all targets and append -iphoneos to the name. Configure these targets
  to build for iOS devices and use correct architectures for those builds."""
    for target_dict in targets.values():
        toolset = target_dict["toolset"]
        configs = target_dict["configurations"]
        for config_name, simulator_config_dict in dict(configs).items():
            iphoneos_config_dict = copy.deepcopy(simulator_config_dict)
            configs[config_name + "-iphoneos"] = iphoneos_config_dict
            configs[config_name + "-iphonesimulator"] = simulator_config_dict
            if toolset == "target":
                simulator_config_dict["xcode_settings"]["SDKROOT"] = "iphonesimulator"
                iphoneos_config_dict["xcode_settings"]["SDKROOT"] = "iphoneos"
    return targets


def CloneConfigurationForDeviceAndEmulator(target_dicts):
    """If |target_dicts| contains any iOS targets, automatically create -iphoneos
  targets for iOS device builds."""
    if _HasIOSTarget(target_dicts):
        return _AddIOSDeviceConfigurations(target_dicts)
    return target_dicts
