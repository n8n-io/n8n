# Copyright (c) 2013 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Handle version information related to Visual Stuio."""

import errno
import os
import re
import subprocess
import sys
import glob


def JoinPath(*args):
    return os.path.normpath(os.path.join(*args))


class VisualStudioVersion:
    """Information regarding a version of Visual Studio."""

    def __init__(
        self,
        short_name,
        description,
        solution_version,
        project_version,
        flat_sln,
        uses_vcxproj,
        path,
        sdk_based,
        default_toolset=None,
        compatible_sdks=None,
    ):
        self.short_name = short_name
        self.description = description
        self.solution_version = solution_version
        self.project_version = project_version
        self.flat_sln = flat_sln
        self.uses_vcxproj = uses_vcxproj
        self.path = path
        self.sdk_based = sdk_based
        self.default_toolset = default_toolset
        compatible_sdks = compatible_sdks or []
        compatible_sdks.sort(key=lambda v: float(v.replace("v", "")), reverse=True)
        self.compatible_sdks = compatible_sdks

    def ShortName(self):
        return self.short_name

    def Description(self):
        """Get the full description of the version."""
        return self.description

    def SolutionVersion(self):
        """Get the version number of the sln files."""
        return self.solution_version

    def ProjectVersion(self):
        """Get the version number of the vcproj or vcxproj files."""
        return self.project_version

    def FlatSolution(self):
        return self.flat_sln

    def UsesVcxproj(self):
        """Returns true if this version uses a vcxproj file."""
        return self.uses_vcxproj

    def ProjectExtension(self):
        """Returns the file extension for the project."""
        return self.uses_vcxproj and ".vcxproj" or ".vcproj"

    def Path(self):
        """Returns the path to Visual Studio installation."""
        return self.path

    def ToolPath(self, tool):
        """Returns the path to a given compiler tool. """
        return os.path.normpath(os.path.join(self.path, "VC/bin", tool))

    def DefaultToolset(self):
        """Returns the msbuild toolset version that will be used in the absence
    of a user override."""
        return self.default_toolset

    def _SetupScriptInternal(self, target_arch):
        """Returns a command (with arguments) to be used to set up the
    environment."""
        assert target_arch in ("x86", "x64"), "target_arch not supported"
        # If WindowsSDKDir is set and SetEnv.Cmd exists then we are using the
        # depot_tools build tools and should run SetEnv.Cmd to set up the
        # environment. The check for WindowsSDKDir alone is not sufficient because
        # this is set by running vcvarsall.bat.
        sdk_dir = os.environ.get("WindowsSDKDir", "")
        setup_path = JoinPath(sdk_dir, "Bin", "SetEnv.Cmd")
        if self.sdk_based and sdk_dir and os.path.exists(setup_path):
            return [setup_path, "/" + target_arch]

        is_host_arch_x64 = (
            os.environ.get("PROCESSOR_ARCHITECTURE") == "AMD64"
            or os.environ.get("PROCESSOR_ARCHITEW6432") == "AMD64"
        )

        # For VS2017 (and newer) it's fairly easy
        if self.short_name >= "2017":
            script_path = JoinPath(
                self.path, "VC", "Auxiliary", "Build", "vcvarsall.bat"
            )

            # Always use a native executable, cross-compiling if necessary.
            host_arch = "amd64" if is_host_arch_x64 else "x86"
            msvc_target_arch = "amd64" if target_arch == "x64" else "x86"
            arg = host_arch
            if host_arch != msvc_target_arch:
                arg += "_" + msvc_target_arch

            return [script_path, arg]

        # We try to find the best version of the env setup batch.
        vcvarsall = JoinPath(self.path, "VC", "vcvarsall.bat")
        if target_arch == "x86":
            if (
                self.short_name >= "2013"
                and self.short_name[-1] != "e"
                and is_host_arch_x64
            ):
                # VS2013 and later, non-Express have a x64-x86 cross that we want
                # to prefer.
                return [vcvarsall, "amd64_x86"]
            else:
                # Otherwise, the standard x86 compiler. We don't use VC/vcvarsall.bat
                # for x86 because vcvarsall calls vcvars32, which it can only find if
                # VS??COMNTOOLS is set, which isn't guaranteed.
                return [JoinPath(self.path, "Common7", "Tools", "vsvars32.bat")]
        elif target_arch == "x64":
            arg = "x86_amd64"
            # Use the 64-on-64 compiler if we're not using an express edition and
            # we're running on a 64bit OS.
            if self.short_name[-1] != "e" and is_host_arch_x64:
                arg = "amd64"
            return [vcvarsall, arg]

    def SetupScript(self, target_arch):
        script_data = self._SetupScriptInternal(target_arch)
        script_path = script_data[0]
        if not os.path.exists(script_path):
            raise Exception(
                "%s is missing - make sure VC++ tools are installed." % script_path
            )
        return script_data


def _RegistryQueryBase(sysdir, key, value):
    """Use reg.exe to read a particular key.

  While ideally we might use the win32 module, we would like gyp to be
  python neutral, so for instance cygwin python lacks this module.

  Arguments:
    sysdir: The system subdirectory to attempt to launch reg.exe from.
    key: The registry key to read from.
    value: The particular value to read.
  Return:
    stdout from reg.exe, or None for failure.
  """
    # Skip if not on Windows or Python Win32 setup issue
    if sys.platform not in ("win32", "cygwin"):
        return None
    # Setup params to pass to and attempt to launch reg.exe
    cmd = [os.path.join(os.environ.get("WINDIR", ""), sysdir, "reg.exe"), "query", key]
    if value:
        cmd.extend(["/v", value])
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    # Obtain the stdout from reg.exe, reading to the end so p.returncode is valid
    # Note that the error text may be in [1] in some cases
    text = p.communicate()[0].decode("utf-8")
    # Check return code from reg.exe; officially 0==success and 1==error
    if p.returncode:
        return None
    return text


def _RegistryQuery(key, value=None):
    r"""Use reg.exe to read a particular key through _RegistryQueryBase.

  First tries to launch from %WinDir%\Sysnative to avoid WoW64 redirection. If
  that fails, it falls back to System32.  Sysnative is available on Vista and
  up and available on Windows Server 2003 and XP through KB patch 942589. Note
  that Sysnative will always fail if using 64-bit python due to it being a
  virtual directory and System32 will work correctly in the first place.

  KB 942589 - http://support.microsoft.com/kb/942589/en-us.

  Arguments:
    key: The registry key.
    value: The particular registry value to read (optional).
  Return:
    stdout from reg.exe, or None for failure.
  """
    text = None
    try:
        text = _RegistryQueryBase("Sysnative", key, value)
    except OSError as e:
        if e.errno == errno.ENOENT:
            text = _RegistryQueryBase("System32", key, value)
        else:
            raise
    return text


def _RegistryGetValueUsingWinReg(key, value):
    """Use the _winreg module to obtain the value of a registry key.

  Args:
    key: The registry key.
    value: The particular registry value to read.
  Return:
    contents of the registry key's value, or None on failure.  Throws
    ImportError if winreg is unavailable.
  """
    from winreg import HKEY_LOCAL_MACHINE, OpenKey, QueryValueEx
    try:
        root, subkey = key.split("\\", 1)
        assert root == "HKLM"  # Only need HKLM for now.
        with OpenKey(HKEY_LOCAL_MACHINE, subkey) as hkey:
            return QueryValueEx(hkey, value)[0]
    except OSError:
        return None


def _RegistryGetValue(key, value):
    """Use _winreg or reg.exe to obtain the value of a registry key.

  Using _winreg is preferable because it solves an issue on some corporate
  environments where access to reg.exe is locked down. However, we still need
  to fallback to reg.exe for the case where the _winreg module is not available
  (for example in cygwin python).

  Args:
    key: The registry key.
    value: The particular registry value to read.
  Return:
    contents of the registry key's value, or None on failure.
  """
    try:
        return _RegistryGetValueUsingWinReg(key, value)
    except ImportError:
        pass

    # Fallback to reg.exe if we fail to import _winreg.
    text = _RegistryQuery(key, value)
    if not text:
        return None
    # Extract value.
    match = re.search(r"REG_\w+\s+([^\r]+)\r\n", text)
    if not match:
        return None
    return match.group(1)


def _CreateVersion(name, path, sdk_based=False):
    """Sets up MSVS project generation.

  Setup is based off the GYP_MSVS_VERSION environment variable or whatever is
  autodetected if GYP_MSVS_VERSION is not explicitly specified. If a version is
  passed in that doesn't match a value in versions python will throw a error.
  """
    if path:
        path = os.path.normpath(path)
    versions = {
        "2022": VisualStudioVersion(
            "2022",
            "Visual Studio 2022",
            solution_version="12.00",
            project_version="17.0",
            flat_sln=False,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
            default_toolset="v143",
            compatible_sdks=["v8.1", "v10.0"],
        ),
        "2019": VisualStudioVersion(
            "2019",
            "Visual Studio 2019",
            solution_version="12.00",
            project_version="16.0",
            flat_sln=False,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
            default_toolset="v142",
            compatible_sdks=["v8.1", "v10.0"],
        ),
        "2017": VisualStudioVersion(
            "2017",
            "Visual Studio 2017",
            solution_version="12.00",
            project_version="15.0",
            flat_sln=False,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
            default_toolset="v141",
            compatible_sdks=["v8.1", "v10.0"],
        ),
        "2015": VisualStudioVersion(
            "2015",
            "Visual Studio 2015",
            solution_version="12.00",
            project_version="14.0",
            flat_sln=False,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
            default_toolset="v140",
        ),
        "2013": VisualStudioVersion(
            "2013",
            "Visual Studio 2013",
            solution_version="13.00",
            project_version="12.0",
            flat_sln=False,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
            default_toolset="v120",
        ),
        "2013e": VisualStudioVersion(
            "2013e",
            "Visual Studio 2013",
            solution_version="13.00",
            project_version="12.0",
            flat_sln=True,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
            default_toolset="v120",
        ),
        "2012": VisualStudioVersion(
            "2012",
            "Visual Studio 2012",
            solution_version="12.00",
            project_version="4.0",
            flat_sln=False,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
            default_toolset="v110",
        ),
        "2012e": VisualStudioVersion(
            "2012e",
            "Visual Studio 2012",
            solution_version="12.00",
            project_version="4.0",
            flat_sln=True,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
            default_toolset="v110",
        ),
        "2010": VisualStudioVersion(
            "2010",
            "Visual Studio 2010",
            solution_version="11.00",
            project_version="4.0",
            flat_sln=False,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
        ),
        "2010e": VisualStudioVersion(
            "2010e",
            "Visual C++ Express 2010",
            solution_version="11.00",
            project_version="4.0",
            flat_sln=True,
            uses_vcxproj=True,
            path=path,
            sdk_based=sdk_based,
        ),
        "2008": VisualStudioVersion(
            "2008",
            "Visual Studio 2008",
            solution_version="10.00",
            project_version="9.00",
            flat_sln=False,
            uses_vcxproj=False,
            path=path,
            sdk_based=sdk_based,
        ),
        "2008e": VisualStudioVersion(
            "2008e",
            "Visual Studio 2008",
            solution_version="10.00",
            project_version="9.00",
            flat_sln=True,
            uses_vcxproj=False,
            path=path,
            sdk_based=sdk_based,
        ),
        "2005": VisualStudioVersion(
            "2005",
            "Visual Studio 2005",
            solution_version="9.00",
            project_version="8.00",
            flat_sln=False,
            uses_vcxproj=False,
            path=path,
            sdk_based=sdk_based,
        ),
        "2005e": VisualStudioVersion(
            "2005e",
            "Visual Studio 2005",
            solution_version="9.00",
            project_version="8.00",
            flat_sln=True,
            uses_vcxproj=False,
            path=path,
            sdk_based=sdk_based,
        ),
    }
    return versions[str(name)]


def _ConvertToCygpath(path):
    """Convert to cygwin path if we are using cygwin."""
    if sys.platform == "cygwin":
        p = subprocess.Popen(["cygpath", path], stdout=subprocess.PIPE)
        path = p.communicate()[0].decode("utf-8").strip()
    return path


def _DetectVisualStudioVersions(versions_to_check, force_express):
    """Collect the list of installed visual studio versions.

  Returns:
    A list of visual studio versions installed in descending order of
    usage preference.
    Base this on the registry and a quick check if devenv.exe exists.
    Possibilities are:
      2005(e) - Visual Studio 2005 (8)
      2008(e) - Visual Studio 2008 (9)
      2010(e) - Visual Studio 2010 (10)
      2012(e) - Visual Studio 2012 (11)
      2013(e) - Visual Studio 2013 (12)
      2015    - Visual Studio 2015 (14)
      2017    - Visual Studio 2017 (15)
      2019    - Visual Studio 2019 (16)
      2022    - Visual Studio 2022 (17)
    Where (e) is e for express editions of MSVS and blank otherwise.
  """
    version_to_year = {
        "8.0": "2005",
        "9.0": "2008",
        "10.0": "2010",
        "11.0": "2012",
        "12.0": "2013",
        "14.0": "2015",
        "15.0": "2017",
        "16.0": "2019",
        "17.0": "2022",
    }
    versions = []
    for version in versions_to_check:
        # Old method of searching for which VS version is installed
        # We don't use the 2010-encouraged-way because we also want to get the
        # path to the binaries, which it doesn't offer.
        keys = [
            r"HKLM\Software\Microsoft\VisualStudio\%s" % version,
            r"HKLM\Software\Wow6432Node\Microsoft\VisualStudio\%s" % version,
            r"HKLM\Software\Microsoft\VCExpress\%s" % version,
            r"HKLM\Software\Wow6432Node\Microsoft\VCExpress\%s" % version,
        ]
        for index in range(len(keys)):
            path = _RegistryGetValue(keys[index], "InstallDir")
            if not path:
                continue
            path = _ConvertToCygpath(path)
            # Check for full.
            full_path = os.path.join(path, "devenv.exe")
            express_path = os.path.join(path, "*express.exe")
            if not force_express and os.path.exists(full_path):
                # Add this one.
                versions.append(
                    _CreateVersion(
                        version_to_year[version], os.path.join(path, "..", "..")
                    )
                )
            # Check for express.
            elif glob.glob(express_path):
                # Add this one.
                versions.append(
                    _CreateVersion(
                        version_to_year[version] + "e", os.path.join(path, "..", "..")
                    )
                )

        # The old method above does not work when only SDK is installed.
        keys = [
            r"HKLM\Software\Microsoft\VisualStudio\SxS\VC7",
            r"HKLM\Software\Wow6432Node\Microsoft\VisualStudio\SxS\VC7",
            r"HKLM\Software\Microsoft\VisualStudio\SxS\VS7",
            r"HKLM\Software\Wow6432Node\Microsoft\VisualStudio\SxS\VS7",
        ]
        for index in range(len(keys)):
            path = _RegistryGetValue(keys[index], version)
            if not path:
                continue
            path = _ConvertToCygpath(path)
            if version == "15.0":
                if os.path.exists(path):
                    versions.append(_CreateVersion("2017", path))
            elif version != "14.0":  # There is no Express edition for 2015.
                versions.append(
                    _CreateVersion(
                        version_to_year[version] + "e",
                        os.path.join(path, ".."),
                        sdk_based=True,
                    )
                )

    return versions


def SelectVisualStudioVersion(version="auto", allow_fallback=True):
    """Select which version of Visual Studio projects to generate.

  Arguments:
    version: Hook to allow caller to force a particular version (vs auto).
  Returns:
    An object representing a visual studio project format version.
  """
    # In auto mode, check environment variable for override.
    if version == "auto":
        version = os.environ.get("GYP_MSVS_VERSION", "auto")
    version_map = {
        "auto": ("17.0", "16.0", "15.0", "14.0", "12.0", "10.0", "9.0", "8.0", "11.0"),
        "2005": ("8.0",),
        "2005e": ("8.0",),
        "2008": ("9.0",),
        "2008e": ("9.0",),
        "2010": ("10.0",),
        "2010e": ("10.0",),
        "2012": ("11.0",),
        "2012e": ("11.0",),
        "2013": ("12.0",),
        "2013e": ("12.0",),
        "2015": ("14.0",),
        "2017": ("15.0",),
        "2019": ("16.0",),
        "2022": ("17.0",),
    }
    override_path = os.environ.get("GYP_MSVS_OVERRIDE_PATH")
    if override_path:
        msvs_version = os.environ.get("GYP_MSVS_VERSION")
        if not msvs_version:
            raise ValueError(
                "GYP_MSVS_OVERRIDE_PATH requires GYP_MSVS_VERSION to be "
                "set to a particular version (e.g. 2010e)."
            )
        return _CreateVersion(msvs_version, override_path, sdk_based=True)
    version = str(version)
    versions = _DetectVisualStudioVersions(version_map[version], "e" in version)
    if not versions:
        if not allow_fallback:
            raise ValueError("Could not locate Visual Studio installation.")
        if version == "auto":
            # Default to 2005 if we couldn't find anything
            return _CreateVersion("2005", None)
        else:
            return _CreateVersion(version, None)
    return versions[0]
