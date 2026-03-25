#!/usr/bin/env python3
# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Utility functions to perform Xcode-style build steps.

These functions are executed via gyp-mac-tool when using the Makefile generator.
"""


import fcntl
import fnmatch
import glob
import json
import os
import plistlib
import re
import shutil
import struct
import subprocess
import sys
import tempfile


def main(args):
    executor = MacTool()
    exit_code = executor.Dispatch(args)
    if exit_code is not None:
        sys.exit(exit_code)


class MacTool:
    """This class performs all the Mac tooling steps. The methods can either be
  executed directly, or dispatched from an argument list."""

    def Dispatch(self, args):
        """Dispatches a string command to a method."""
        if len(args) < 1:
            raise Exception("Not enough arguments")

        method = "Exec%s" % self._CommandifyName(args[0])
        return getattr(self, method)(*args[1:])

    def _CommandifyName(self, name_string):
        """Transforms a tool name like copy-info-plist to CopyInfoPlist"""
        return name_string.title().replace("-", "")

    def ExecCopyBundleResource(self, source, dest, convert_to_binary):
        """Copies a resource file to the bundle/Resources directory, performing any
    necessary compilation on each resource."""
        convert_to_binary = convert_to_binary == "True"
        extension = os.path.splitext(source)[1].lower()
        if os.path.isdir(source):
            # Copy tree.
            # TODO(thakis): This copies file attributes like mtime, while the
            # single-file branch below doesn't. This should probably be changed to
            # be consistent with the single-file branch.
            if os.path.exists(dest):
                shutil.rmtree(dest)
            shutil.copytree(source, dest)
        elif extension == ".xib":
            return self._CopyXIBFile(source, dest)
        elif extension == ".storyboard":
            return self._CopyXIBFile(source, dest)
        elif extension == ".strings" and not convert_to_binary:
            self._CopyStringsFile(source, dest)
        else:
            if os.path.exists(dest):
                os.unlink(dest)
            shutil.copy(source, dest)

        if convert_to_binary and extension in (".plist", ".strings"):
            self._ConvertToBinary(dest)

    def _CopyXIBFile(self, source, dest):
        """Compiles a XIB file with ibtool into a binary plist in the bundle."""

        # ibtool sometimes crashes with relative paths. See crbug.com/314728.
        base = os.path.dirname(os.path.realpath(__file__))
        if os.path.relpath(source):
            source = os.path.join(base, source)
        if os.path.relpath(dest):
            dest = os.path.join(base, dest)

        args = ["xcrun", "ibtool", "--errors", "--warnings", "--notices"]

        if os.environ["XCODE_VERSION_ACTUAL"] > "0700":
            args.extend(["--auto-activate-custom-fonts"])
            if "IPHONEOS_DEPLOYMENT_TARGET" in os.environ:
                args.extend(
                    [
                        "--target-device",
                        "iphone",
                        "--target-device",
                        "ipad",
                        "--minimum-deployment-target",
                        os.environ["IPHONEOS_DEPLOYMENT_TARGET"],
                    ]
                )
            else:
                args.extend(
                    [
                        "--target-device",
                        "mac",
                        "--minimum-deployment-target",
                        os.environ["MACOSX_DEPLOYMENT_TARGET"],
                    ]
                )

        args.extend(
            ["--output-format", "human-readable-text", "--compile", dest, source]
        )

        ibtool_section_re = re.compile(r"/\*.*\*/")
        ibtool_re = re.compile(r".*note:.*is clipping its content")
        try:
            stdout = subprocess.check_output(args)
        except subprocess.CalledProcessError as e:
            print(e.output)
            raise
        current_section_header = None
        for line in stdout.splitlines():
            if ibtool_section_re.match(line):
                current_section_header = line
            elif not ibtool_re.match(line):
                if current_section_header:
                    print(current_section_header)
                    current_section_header = None
                print(line)
        return 0

    def _ConvertToBinary(self, dest):
        subprocess.check_call(
            ["xcrun", "plutil", "-convert", "binary1", "-o", dest, dest]
        )

    def _CopyStringsFile(self, source, dest):
        """Copies a .strings file using iconv to reconvert the input into UTF-16."""
        input_code = self._DetectInputEncoding(source) or "UTF-8"

        # Xcode's CpyCopyStringsFile / builtin-copyStrings seems to call
        # CFPropertyListCreateFromXMLData() behind the scenes; at least it prints
        #     CFPropertyListCreateFromXMLData(): Old-style plist parser: missing
        #     semicolon in dictionary.
        # on invalid files. Do the same kind of validation.
        import CoreFoundation

        with open(source, "rb") as in_file:
            s = in_file.read()
        d = CoreFoundation.CFDataCreate(None, s, len(s))
        _, error = CoreFoundation.CFPropertyListCreateFromXMLData(None, d, 0, None)
        if error:
            return

        with open(dest, "wb") as fp:
            fp.write(s.decode(input_code).encode("UTF-16"))

    def _DetectInputEncoding(self, file_name):
        """Reads the first few bytes from file_name and tries to guess the text
    encoding. Returns None as a guess if it can't detect it."""
        with open(file_name, "rb") as fp:
            try:
                header = fp.read(3)
            except Exception:
                return None
        if header.startswith(b"\xFE\xFF"):
            return "UTF-16"
        elif header.startswith(b"\xFF\xFE"):
            return "UTF-16"
        elif header.startswith(b"\xEF\xBB\xBF"):
            return "UTF-8"
        else:
            return None

    def ExecCopyInfoPlist(self, source, dest, convert_to_binary, *keys):
        """Copies the |source| Info.plist to the destination directory |dest|."""
        # Read the source Info.plist into memory.
        with open(source) as fd:
            lines = fd.read()

        # Insert synthesized key/value pairs (e.g. BuildMachineOSBuild).
        plist = plistlib.readPlistFromString(lines)
        if keys:
            plist.update(json.loads(keys[0]))
        lines = plistlib.writePlistToString(plist)

        # Go through all the environment variables and replace them as variables in
        # the file.
        IDENT_RE = re.compile(r"[_/\s]")
        for key in os.environ:
            if key.startswith("_"):
                continue
            evar = "${%s}" % key
            evalue = os.environ[key]
            lines = lines.replace(lines, evar, evalue)

            # Xcode supports various suffices on environment variables, which are
            # all undocumented. :rfc1034identifier is used in the standard project
            # template these days, and :identifier was used earlier. They are used to
            # convert non-url characters into things that look like valid urls --
            # except that the replacement character for :identifier, '_' isn't valid
            # in a URL either -- oops, hence :rfc1034identifier was born.
            evar = "${%s:identifier}" % key
            evalue = IDENT_RE.sub("_", os.environ[key])
            lines = lines.replace(lines, evar, evalue)

            evar = "${%s:rfc1034identifier}" % key
            evalue = IDENT_RE.sub("-", os.environ[key])
            lines = lines.replace(lines, evar, evalue)

        # Remove any keys with values that haven't been replaced.
        lines = lines.splitlines()
        for i in range(len(lines)):
            if lines[i].strip().startswith("<string>${"):
                lines[i] = None
                lines[i - 1] = None
        lines = "\n".join(line for line in lines if line is not None)

        # Write out the file with variables replaced.
        with open(dest, "w") as fd:
            fd.write(lines)

        # Now write out PkgInfo file now that the Info.plist file has been
        # "compiled".
        self._WritePkgInfo(dest)

        if convert_to_binary == "True":
            self._ConvertToBinary(dest)

    def _WritePkgInfo(self, info_plist):
        """This writes the PkgInfo file from the data stored in Info.plist."""
        plist = plistlib.readPlist(info_plist)
        if not plist:
            return

        # Only create PkgInfo for executable types.
        package_type = plist["CFBundlePackageType"]
        if package_type != "APPL":
            return

        # The format of PkgInfo is eight characters, representing the bundle type
        # and bundle signature, each four characters. If that is missing, four
        # '?' characters are used instead.
        signature_code = plist.get("CFBundleSignature", "????")
        if len(signature_code) != 4:  # Wrong length resets everything, too.
            signature_code = "?" * 4

        dest = os.path.join(os.path.dirname(info_plist), "PkgInfo")
        with open(dest, "w") as fp:
            fp.write(f"{package_type}{signature_code}")

    def ExecFlock(self, lockfile, *cmd_list):
        """Emulates the most basic behavior of Linux's flock(1)."""
        # Rely on exception handling to report errors.
        fd = os.open(lockfile, os.O_RDONLY | os.O_NOCTTY | os.O_CREAT, 0o666)
        fcntl.flock(fd, fcntl.LOCK_EX)
        return subprocess.call(cmd_list)

    def ExecFilterLibtool(self, *cmd_list):
        """Calls libtool and filters out '/path/to/libtool: file: foo.o has no
    symbols'."""
        libtool_re = re.compile(
            r"^.*libtool: (?:for architecture: \S* )?" r"file: .* has no symbols$"
        )
        libtool_re5 = re.compile(
            r"^.*libtool: warning for library: "
            + r".* the table of contents is empty "
            + r"\(no object file members in the library define global symbols\)$"
        )
        env = os.environ.copy()
        # Ref:
        # http://www.opensource.apple.com/source/cctools/cctools-809/misc/libtool.c
        # The problem with this flag is that it resets the file mtime on the file to
        # epoch=0, e.g. 1970-1-1 or 1969-12-31 depending on timezone.
        env["ZERO_AR_DATE"] = "1"
        libtoolout = subprocess.Popen(cmd_list, stderr=subprocess.PIPE, env=env)
        err = libtoolout.communicate()[1].decode("utf-8")
        for line in err.splitlines():
            if not libtool_re.match(line) and not libtool_re5.match(line):
                print(line, file=sys.stderr)
        # Unconditionally touch the output .a file on the command line if present
        # and the command succeeded. A bit hacky.
        if not libtoolout.returncode:
            for i in range(len(cmd_list) - 1):
                if cmd_list[i] == "-o" and cmd_list[i + 1].endswith(".a"):
                    os.utime(cmd_list[i + 1], None)
                    break
        return libtoolout.returncode

    def ExecPackageIosFramework(self, framework):
        # Find the name of the binary based on the part before the ".framework".
        binary = os.path.basename(framework).split(".")[0]
        module_path = os.path.join(framework, "Modules")
        if not os.path.exists(module_path):
            os.mkdir(module_path)
        module_template = (
            "framework module %s {\n"
            '  umbrella header "%s.h"\n'
            "\n"
            "  export *\n"
            "  module * { export * }\n"
            "}\n" % (binary, binary)
        )

        with open(os.path.join(module_path, "module.modulemap"), "w") as module_file:
            module_file.write(module_template)

    def ExecPackageFramework(self, framework, version):
        """Takes a path to Something.framework and the Current version of that and
    sets up all the symlinks."""
        # Find the name of the binary based on the part before the ".framework".
        binary = os.path.basename(framework).split(".")[0]

        CURRENT = "Current"
        RESOURCES = "Resources"
        VERSIONS = "Versions"

        if not os.path.exists(os.path.join(framework, VERSIONS, version, binary)):
            # Binary-less frameworks don't seem to contain symlinks (see e.g.
            # chromium's out/Debug/org.chromium.Chromium.manifest/ bundle).
            return

        # Move into the framework directory to set the symlinks correctly.
        pwd = os.getcwd()
        os.chdir(framework)

        # Set up the Current version.
        self._Relink(version, os.path.join(VERSIONS, CURRENT))

        # Set up the root symlinks.
        self._Relink(os.path.join(VERSIONS, CURRENT, binary), binary)
        self._Relink(os.path.join(VERSIONS, CURRENT, RESOURCES), RESOURCES)

        # Back to where we were before!
        os.chdir(pwd)

    def _Relink(self, dest, link):
        """Creates a symlink to |dest| named |link|. If |link| already exists,
    it is overwritten."""
        if os.path.lexists(link):
            os.remove(link)
        os.symlink(dest, link)

    def ExecCompileIosFrameworkHeaderMap(self, out, framework, *all_headers):
        framework_name = os.path.basename(framework).split(".")[0]
        all_headers = [os.path.abspath(header) for header in all_headers]
        filelist = {}
        for header in all_headers:
            filename = os.path.basename(header)
            filelist[filename] = header
            filelist[os.path.join(framework_name, filename)] = header
        WriteHmap(out, filelist)

    def ExecCopyIosFrameworkHeaders(self, framework, *copy_headers):
        header_path = os.path.join(framework, "Headers")
        if not os.path.exists(header_path):
            os.makedirs(header_path)
        for header in copy_headers:
            shutil.copy(header, os.path.join(header_path, os.path.basename(header)))

    def ExecCompileXcassets(self, keys, *inputs):
        """Compiles multiple .xcassets files into a single .car file.

    This invokes 'actool' to compile all the inputs .xcassets files. The
    |keys| arguments is a json-encoded dictionary of extra arguments to
    pass to 'actool' when the asset catalogs contains an application icon
    or a launch image.

    Note that 'actool' does not create the Assets.car file if the asset
    catalogs does not contains imageset.
    """
        command_line = [
            "xcrun",
            "actool",
            "--output-format",
            "human-readable-text",
            "--compress-pngs",
            "--notices",
            "--warnings",
            "--errors",
        ]
        is_iphone_target = "IPHONEOS_DEPLOYMENT_TARGET" in os.environ
        if is_iphone_target:
            platform = os.environ["CONFIGURATION"].split("-")[-1]
            if platform not in ("iphoneos", "iphonesimulator"):
                platform = "iphonesimulator"
            command_line.extend(
                [
                    "--platform",
                    platform,
                    "--target-device",
                    "iphone",
                    "--target-device",
                    "ipad",
                    "--minimum-deployment-target",
                    os.environ["IPHONEOS_DEPLOYMENT_TARGET"],
                    "--compile",
                    os.path.abspath(os.environ["CONTENTS_FOLDER_PATH"]),
                ]
            )
        else:
            command_line.extend(
                [
                    "--platform",
                    "macosx",
                    "--target-device",
                    "mac",
                    "--minimum-deployment-target",
                    os.environ["MACOSX_DEPLOYMENT_TARGET"],
                    "--compile",
                    os.path.abspath(os.environ["UNLOCALIZED_RESOURCES_FOLDER_PATH"]),
                ]
            )
        if keys:
            keys = json.loads(keys)
            for key, value in keys.items():
                arg_name = "--" + key
                if isinstance(value, bool):
                    if value:
                        command_line.append(arg_name)
                elif isinstance(value, list):
                    for v in value:
                        command_line.append(arg_name)
                        command_line.append(str(v))
                else:
                    command_line.append(arg_name)
                    command_line.append(str(value))
        # Note: actool crashes if inputs path are relative, so use os.path.abspath
        # to get absolute path name for inputs.
        command_line.extend(map(os.path.abspath, inputs))
        subprocess.check_call(command_line)

    def ExecMergeInfoPlist(self, output, *inputs):
        """Merge multiple .plist files into a single .plist file."""
        merged_plist = {}
        for path in inputs:
            plist = self._LoadPlistMaybeBinary(path)
            self._MergePlist(merged_plist, plist)
        plistlib.writePlist(merged_plist, output)

    def ExecCodeSignBundle(self, key, entitlements, provisioning, path, preserve):
        """Code sign a bundle.

    This function tries to code sign an iOS bundle, following the same
    algorithm as Xcode:
      1. pick the provisioning profile that best match the bundle identifier,
         and copy it into the bundle as embedded.mobileprovision,
      2. copy Entitlements.plist from user or SDK next to the bundle,
      3. code sign the bundle.
    """
        substitutions, overrides = self._InstallProvisioningProfile(
            provisioning, self._GetCFBundleIdentifier()
        )
        entitlements_path = self._InstallEntitlements(
            entitlements, substitutions, overrides
        )

        args = ["codesign", "--force", "--sign", key]
        if preserve == "True":
            args.extend(["--deep", "--preserve-metadata=identifier,entitlements"])
        else:
            args.extend(["--entitlements", entitlements_path])
        args.extend(["--timestamp=none", path])
        subprocess.check_call(args)

    def _InstallProvisioningProfile(self, profile, bundle_identifier):
        """Installs embedded.mobileprovision into the bundle.

    Args:
      profile: string, optional, short name of the .mobileprovision file
        to use, if empty or the file is missing, the best file installed
        will be used
      bundle_identifier: string, value of CFBundleIdentifier from Info.plist

    Returns:
      A tuple containing two dictionary: variables substitutions and values
      to overrides when generating the entitlements file.
    """
        source_path, provisioning_data, team_id = self._FindProvisioningProfile(
            profile, bundle_identifier
        )
        target_path = os.path.join(
            os.environ["BUILT_PRODUCTS_DIR"],
            os.environ["CONTENTS_FOLDER_PATH"],
            "embedded.mobileprovision",
        )
        shutil.copy2(source_path, target_path)
        substitutions = self._GetSubstitutions(bundle_identifier, team_id + ".")
        return substitutions, provisioning_data["Entitlements"]

    def _FindProvisioningProfile(self, profile, bundle_identifier):
        """Finds the .mobileprovision file to use for signing the bundle.

    Checks all the installed provisioning profiles (or if the user specified
    the PROVISIONING_PROFILE variable, only consult it) and select the most
    specific that correspond to the bundle identifier.

    Args:
      profile: string, optional, short name of the .mobileprovision file
        to use, if empty or the file is missing, the best file installed
        will be used
      bundle_identifier: string, value of CFBundleIdentifier from Info.plist

    Returns:
      A tuple of the path to the selected provisioning profile, the data of
      the embedded plist in the provisioning profile and the team identifier
      to use for code signing.

    Raises:
      SystemExit: if no .mobileprovision can be used to sign the bundle.
    """
        profiles_dir = os.path.join(
            os.environ["HOME"], "Library", "MobileDevice", "Provisioning Profiles"
        )
        if not os.path.isdir(profiles_dir):
            print(
                "cannot find mobile provisioning for %s" % (bundle_identifier),
                file=sys.stderr,
            )
            sys.exit(1)
        provisioning_profiles = None
        if profile:
            profile_path = os.path.join(profiles_dir, profile + ".mobileprovision")
            if os.path.exists(profile_path):
                provisioning_profiles = [profile_path]
        if not provisioning_profiles:
            provisioning_profiles = glob.glob(
                os.path.join(profiles_dir, "*.mobileprovision")
            )
        valid_provisioning_profiles = {}
        for profile_path in provisioning_profiles:
            profile_data = self._LoadProvisioningProfile(profile_path)
            app_id_pattern = profile_data.get("Entitlements", {}).get(
                "application-identifier", ""
            )
            for team_identifier in profile_data.get("TeamIdentifier", []):
                app_id = f"{team_identifier}.{bundle_identifier}"
                if fnmatch.fnmatch(app_id, app_id_pattern):
                    valid_provisioning_profiles[app_id_pattern] = (
                        profile_path,
                        profile_data,
                        team_identifier,
                    )
        if not valid_provisioning_profiles:
            print(
                "cannot find mobile provisioning for %s" % (bundle_identifier),
                file=sys.stderr,
            )
            sys.exit(1)
        # If the user has multiple provisioning profiles installed that can be
        # used for ${bundle_identifier}, pick the most specific one (ie. the
        # provisioning profile whose pattern is the longest).
        selected_key = max(valid_provisioning_profiles, key=lambda v: len(v))
        return valid_provisioning_profiles[selected_key]

    def _LoadProvisioningProfile(self, profile_path):
        """Extracts the plist embedded in a provisioning profile.

    Args:
      profile_path: string, path to the .mobileprovision file

    Returns:
      Content of the plist embedded in the provisioning profile as a dictionary.
    """
        with tempfile.NamedTemporaryFile() as temp:
            subprocess.check_call(
                ["security", "cms", "-D", "-i", profile_path, "-o", temp.name]
            )
            return self._LoadPlistMaybeBinary(temp.name)

    def _MergePlist(self, merged_plist, plist):
        """Merge |plist| into |merged_plist|."""
        for key, value in plist.items():
            if isinstance(value, dict):
                merged_value = merged_plist.get(key, {})
                if isinstance(merged_value, dict):
                    self._MergePlist(merged_value, value)
                    merged_plist[key] = merged_value
                else:
                    merged_plist[key] = value
            else:
                merged_plist[key] = value

    def _LoadPlistMaybeBinary(self, plist_path):
        """Loads into a memory a plist possibly encoded in binary format.

    This is a wrapper around plistlib.readPlist that tries to convert the
    plist to the XML format if it can't be parsed (assuming that it is in
    the binary format).

    Args:
      plist_path: string, path to a plist file, in XML or binary format

    Returns:
      Content of the plist as a dictionary.
    """
        try:
            # First, try to read the file using plistlib that only supports XML,
            # and if an exception is raised, convert a temporary copy to XML and
            # load that copy.
            return plistlib.readPlist(plist_path)
        except Exception:
            pass
        with tempfile.NamedTemporaryFile() as temp:
            shutil.copy2(plist_path, temp.name)
            subprocess.check_call(["plutil", "-convert", "xml1", temp.name])
            return plistlib.readPlist(temp.name)

    def _GetSubstitutions(self, bundle_identifier, app_identifier_prefix):
        """Constructs a dictionary of variable substitutions for Entitlements.plist.

    Args:
      bundle_identifier: string, value of CFBundleIdentifier from Info.plist
      app_identifier_prefix: string, value for AppIdentifierPrefix

    Returns:
      Dictionary of substitutions to apply when generating Entitlements.plist.
    """
        return {
            "CFBundleIdentifier": bundle_identifier,
            "AppIdentifierPrefix": app_identifier_prefix,
        }

    def _GetCFBundleIdentifier(self):
        """Extracts CFBundleIdentifier value from Info.plist in the bundle.

    Returns:
      Value of CFBundleIdentifier in the Info.plist located in the bundle.
    """
        info_plist_path = os.path.join(
            os.environ["TARGET_BUILD_DIR"], os.environ["INFOPLIST_PATH"]
        )
        info_plist_data = self._LoadPlistMaybeBinary(info_plist_path)
        return info_plist_data["CFBundleIdentifier"]

    def _InstallEntitlements(self, entitlements, substitutions, overrides):
        """Generates and install the ${BundleName}.xcent entitlements file.

    Expands variables "$(variable)" pattern in the source entitlements file,
    add extra entitlements defined in the .mobileprovision file and the copy
    the generated plist to "${BundlePath}.xcent".

    Args:
      entitlements: string, optional, path to the Entitlements.plist template
        to use, defaults to "${SDKROOT}/Entitlements.plist"
      substitutions: dictionary, variable substitutions
      overrides: dictionary, values to add to the entitlements

    Returns:
      Path to the generated entitlements file.
    """
        source_path = entitlements
        target_path = os.path.join(
            os.environ["BUILT_PRODUCTS_DIR"], os.environ["PRODUCT_NAME"] + ".xcent"
        )
        if not source_path:
            source_path = os.path.join(os.environ["SDKROOT"], "Entitlements.plist")
        shutil.copy2(source_path, target_path)
        data = self._LoadPlistMaybeBinary(target_path)
        data = self._ExpandVariables(data, substitutions)
        if overrides:
            for key in overrides:
                if key not in data:
                    data[key] = overrides[key]
        plistlib.writePlist(data, target_path)
        return target_path

    def _ExpandVariables(self, data, substitutions):
        """Expands variables "$(variable)" in data.

    Args:
      data: object, can be either string, list or dictionary
      substitutions: dictionary, variable substitutions to perform

    Returns:
      Copy of data where each references to "$(variable)" has been replaced
      by the corresponding value found in substitutions, or left intact if
      the key was not found.
    """
        if isinstance(data, str):
            for key, value in substitutions.items():
                data = data.replace("$(%s)" % key, value)
            return data
        if isinstance(data, list):
            return [self._ExpandVariables(v, substitutions) for v in data]
        if isinstance(data, dict):
            return {k: self._ExpandVariables(data[k], substitutions) for k in data}
        return data


def NextGreaterPowerOf2(x):
    return 2 ** (x).bit_length()


def WriteHmap(output_name, filelist):
    """Generates a header map based on |filelist|.

  Per Mark Mentovai:
    A header map is structured essentially as a hash table, keyed by names used
    in #includes, and providing pathnames to the actual files.

  The implementation below and the comment above comes from inspecting:
    http://www.opensource.apple.com/source/distcc/distcc-2503/distcc_dist/include_server/headermap.py?txt
  while also looking at the implementation in clang in:
    https://llvm.org/svn/llvm-project/cfe/trunk/lib/Lex/HeaderMap.cpp
  """
    magic = 1751998832
    version = 1
    _reserved = 0
    count = len(filelist)
    capacity = NextGreaterPowerOf2(count)
    strings_offset = 24 + (12 * capacity)
    max_value_length = max(len(value) for value in filelist.values())

    out = open(output_name, "wb")
    out.write(
        struct.pack(
            "<LHHLLLL",
            magic,
            version,
            _reserved,
            strings_offset,
            count,
            capacity,
            max_value_length,
        )
    )

    # Create empty hashmap buckets.
    buckets = [None] * capacity
    for file, path in filelist.items():
        key = 0
        for c in file:
            key += ord(c.lower()) * 13

        # Fill next empty bucket.
        while buckets[key & capacity - 1] is not None:
            key = key + 1
        buckets[key & capacity - 1] = (file, path)

    next_offset = 1
    for bucket in buckets:
        if bucket is None:
            out.write(struct.pack("<LLL", 0, 0, 0))
        else:
            (file, path) = bucket
            key_offset = next_offset
            prefix_offset = key_offset + len(file) + 1
            suffix_offset = prefix_offset + len(os.path.dirname(path) + os.sep) + 1
            next_offset = suffix_offset + len(os.path.basename(path)) + 1
            out.write(struct.pack("<LLL", key_offset, prefix_offset, suffix_offset))

    # Pad byte since next offset starts at 1.
    out.write(struct.pack("<x"))

    for bucket in buckets:
        if bucket is not None:
            (file, path) = bucket
            out.write(struct.pack("<%ds" % len(file), file))
            out.write(struct.pack("<s", "\0"))
            base = os.path.dirname(path) + os.sep
            out.write(struct.pack("<%ds" % len(base), base))
            out.write(struct.pack("<s", "\0"))
            path = os.path.basename(path)
            out.write(struct.pack("<%ds" % len(path), path))
            out.write(struct.pack("<s", "\0"))


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
