#!/usr/bin/env python3

# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Utility functions for Windows builds.

These functions are executed via gyp-win-tool when using the ninja generator.
"""


import os
import re
import shutil
import subprocess
import stat
import string
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# A regex matching an argument corresponding to the output filename passed to
# link.exe.
_LINK_EXE_OUT_ARG = re.compile("/OUT:(?P<out>.+)$", re.IGNORECASE)


def main(args):
    executor = WinTool()
    exit_code = executor.Dispatch(args)
    if exit_code is not None:
        sys.exit(exit_code)


class WinTool:
    """This class performs all the Windows tooling steps. The methods can either
  be executed directly, or dispatched from an argument list."""

    def _UseSeparateMspdbsrv(self, env, args):
        """Allows to use a unique instance of mspdbsrv.exe per linker instead of a
    shared one."""
        if len(args) < 1:
            raise Exception("Not enough arguments")

        if args[0] != "link.exe":
            return

        # Use the output filename passed to the linker to generate an endpoint name
        # for mspdbsrv.exe.
        endpoint_name = None
        for arg in args:
            m = _LINK_EXE_OUT_ARG.match(arg)
            if m:
                endpoint_name = re.sub(
                    r"\W+", "", "%s_%d" % (m.group("out"), os.getpid())
                )
                break

        if endpoint_name is None:
            return

        # Adds the appropriate environment variable. This will be read by link.exe
        # to know which instance of mspdbsrv.exe it should connect to (if it's
        # not set then the default endpoint is used).
        env["_MSPDBSRV_ENDPOINT_"] = endpoint_name

    def Dispatch(self, args):
        """Dispatches a string command to a method."""
        if len(args) < 1:
            raise Exception("Not enough arguments")

        method = "Exec%s" % self._CommandifyName(args[0])
        return getattr(self, method)(*args[1:])

    def _CommandifyName(self, name_string):
        """Transforms a tool name like recursive-mirror to RecursiveMirror."""
        return name_string.title().replace("-", "")

    def _GetEnv(self, arch):
        """Gets the saved environment from a file for a given architecture."""
        # The environment is saved as an "environment block" (see CreateProcess
        # and msvs_emulation for details). We convert to a dict here.
        # Drop last 2 NULs, one for list terminator, one for trailing vs. separator.
        pairs = open(arch).read()[:-2].split("\0")
        kvs = [item.split("=", 1) for item in pairs]
        return dict(kvs)

    def ExecStamp(self, path):
        """Simple stamp command."""
        open(path, "w").close()

    def ExecRecursiveMirror(self, source, dest):
        """Emulation of rm -rf out && cp -af in out."""
        if os.path.exists(dest):
            if os.path.isdir(dest):

                def _on_error(fn, path, excinfo):
                    # The operation failed, possibly because the file is set to
                    # read-only. If that's why, make it writable and try the op again.
                    if not os.access(path, os.W_OK):
                        os.chmod(path, stat.S_IWRITE)
                    fn(path)

                shutil.rmtree(dest, onerror=_on_error)
            else:
                if not os.access(dest, os.W_OK):
                    # Attempt to make the file writable before deleting it.
                    os.chmod(dest, stat.S_IWRITE)
                os.unlink(dest)

        if os.path.isdir(source):
            shutil.copytree(source, dest)
        else:
            shutil.copy2(source, dest)

    def ExecLinkWrapper(self, arch, use_separate_mspdbsrv, *args):
        """Filter diagnostic output from link that looks like:
    '   Creating library ui.dll.lib and object ui.dll.exp'
    This happens when there are exports from the dll or exe.
    """
        env = self._GetEnv(arch)
        if use_separate_mspdbsrv == "True":
            self._UseSeparateMspdbsrv(env, args)
        if sys.platform == "win32":
            args = list(args)  # *args is a tuple by default, which is read-only.
            args[0] = args[0].replace("/", "\\")
        # https://docs.python.org/2/library/subprocess.html:
        # "On Unix with shell=True [...] if args is a sequence, the first item
        # specifies the command string, and any additional items will be treated as
        # additional arguments to the shell itself.  That is to say, Popen does the
        # equivalent of:
        #   Popen(['/bin/sh', '-c', args[0], args[1], ...])"
        # For that reason, since going through the shell doesn't seem necessary on
        # non-Windows don't do that there.
        link = subprocess.Popen(
            args,
            shell=sys.platform == "win32",
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        out = link.communicate()[0].decode("utf-8")
        for line in out.splitlines():
            if (
                not line.startswith("   Creating library ")
                and not line.startswith("Generating code")
                and not line.startswith("Finished generating code")
            ):
                print(line)
        return link.returncode

    def ExecLinkWithManifests(
        self,
        arch,
        embed_manifest,
        out,
        ldcmd,
        resname,
        mt,
        rc,
        intermediate_manifest,
        *manifests
    ):
        """A wrapper for handling creating a manifest resource and then executing
    a link command."""
        # The 'normal' way to do manifests is to have link generate a manifest
        # based on gathering dependencies from the object files, then merge that
        # manifest with other manifests supplied as sources, convert the merged
        # manifest to a resource, and then *relink*, including the compiled
        # version of the manifest resource. This breaks incremental linking, and
        # is generally overly complicated. Instead, we merge all the manifests
        # provided (along with one that includes what would normally be in the
        # linker-generated one, see msvs_emulation.py), and include that into the
        # first and only link. We still tell link to generate a manifest, but we
        # only use that to assert that our simpler process did not miss anything.
        variables = {
            "python": sys.executable,
            "arch": arch,
            "out": out,
            "ldcmd": ldcmd,
            "resname": resname,
            "mt": mt,
            "rc": rc,
            "intermediate_manifest": intermediate_manifest,
            "manifests": " ".join(manifests),
        }
        add_to_ld = ""
        if manifests:
            subprocess.check_call(
                "%(python)s gyp-win-tool manifest-wrapper %(arch)s %(mt)s -nologo "
                "-manifest %(manifests)s -out:%(out)s.manifest" % variables
            )
            if embed_manifest == "True":
                subprocess.check_call(
                    "%(python)s gyp-win-tool manifest-to-rc %(arch)s %(out)s.manifest"
                    " %(out)s.manifest.rc %(resname)s" % variables
                )
                subprocess.check_call(
                    "%(python)s gyp-win-tool rc-wrapper %(arch)s %(rc)s "
                    "%(out)s.manifest.rc" % variables
                )
                add_to_ld = " %(out)s.manifest.res" % variables
        subprocess.check_call(ldcmd + add_to_ld)

        # Run mt.exe on the theoretically complete manifest we generated, merging
        # it with the one the linker generated to confirm that the linker
        # generated one does not add anything. This is strictly unnecessary for
        # correctness, it's only to verify that e.g. /MANIFESTDEPENDENCY was not
        # used in a #pragma comment.
        if manifests:
            # Merge the intermediate one with ours to .assert.manifest, then check
            # that .assert.manifest is identical to ours.
            subprocess.check_call(
                "%(python)s gyp-win-tool manifest-wrapper %(arch)s %(mt)s -nologo "
                "-manifest %(out)s.manifest %(intermediate_manifest)s "
                "-out:%(out)s.assert.manifest" % variables
            )
            assert_manifest = "%(out)s.assert.manifest" % variables
            our_manifest = "%(out)s.manifest" % variables
            # Load and normalize the manifests. mt.exe sometimes removes whitespace,
            # and sometimes doesn't unfortunately.
            with open(our_manifest) as our_f:
                with open(assert_manifest) as assert_f:
                    translator = str.maketrans('', '', string.whitespace)
                    our_data = our_f.read().translate(translator)
                    assert_data = assert_f.read().translate(translator)
            if our_data != assert_data:
                os.unlink(out)

                def dump(filename):
                    print(filename, file=sys.stderr)
                    print("-----", file=sys.stderr)
                    with open(filename) as f:
                        print(f.read(), file=sys.stderr)
                        print("-----", file=sys.stderr)

                dump(intermediate_manifest)
                dump(our_manifest)
                dump(assert_manifest)
                sys.stderr.write(
                    'Linker generated manifest "%s" added to final manifest "%s" '
                    '(result in "%s"). '
                    "Were /MANIFEST switches used in #pragma statements? "
                    % (intermediate_manifest, our_manifest, assert_manifest)
                )
                return 1

    def ExecManifestWrapper(self, arch, *args):
        """Run manifest tool with environment set. Strip out undesirable warning
    (some XML blocks are recognized by the OS loader, but not the manifest
    tool)."""
        env = self._GetEnv(arch)
        popen = subprocess.Popen(
            args, shell=True, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        out = popen.communicate()[0].decode("utf-8")
        for line in out.splitlines():
            if line and "manifest authoring warning 81010002" not in line:
                print(line)
        return popen.returncode

    def ExecManifestToRc(self, arch, *args):
        """Creates a resource file pointing a SxS assembly manifest.
    |args| is tuple containing path to resource file, path to manifest file
    and resource name which can be "1" (for executables) or "2" (for DLLs)."""
        manifest_path, resource_path, resource_name = args
        with open(resource_path, "w") as output:
            output.write(
                '#include <windows.h>\n%s RT_MANIFEST "%s"'
                % (resource_name, os.path.abspath(manifest_path).replace("\\", "/"))
            )

    def ExecMidlWrapper(self, arch, outdir, tlb, h, dlldata, iid, proxy, idl, *flags):
        """Filter noisy filenames output from MIDL compile step that isn't
    quietable via command line flags.
    """
        args = (
            ["midl", "/nologo"]
            + list(flags)
            + [
                "/out",
                outdir,
                "/tlb",
                tlb,
                "/h",
                h,
                "/dlldata",
                dlldata,
                "/iid",
                iid,
                "/proxy",
                proxy,
                idl,
            ]
        )
        env = self._GetEnv(arch)
        popen = subprocess.Popen(
            args, shell=True, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        out = popen.communicate()[0].decode("utf-8")
        # Filter junk out of stdout, and write filtered versions. Output we want
        # to filter is pairs of lines that look like this:
        # Processing C:\Program Files (x86)\Microsoft SDKs\...\include\objidl.idl
        # objidl.idl
        lines = out.splitlines()
        prefixes = ("Processing ", "64 bit Processing ")
        processing = {os.path.basename(x) for x in lines if x.startswith(prefixes)}
        for line in lines:
            if not line.startswith(prefixes) and line not in processing:
                print(line)
        return popen.returncode

    def ExecAsmWrapper(self, arch, *args):
        """Filter logo banner from invocations of asm.exe."""
        env = self._GetEnv(arch)
        popen = subprocess.Popen(
            args, shell=True, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        out = popen.communicate()[0].decode("utf-8")
        for line in out.splitlines():
            if (
                not line.startswith("Copyright (C) Microsoft Corporation")
                and not line.startswith("Microsoft (R) Macro Assembler")
                and not line.startswith(" Assembling: ")
                and line
            ):
                print(line)
        return popen.returncode

    def ExecRcWrapper(self, arch, *args):
        """Filter logo banner from invocations of rc.exe. Older versions of RC
    don't support the /nologo flag."""
        env = self._GetEnv(arch)
        popen = subprocess.Popen(
            args, shell=True, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        out = popen.communicate()[0].decode("utf-8")
        for line in out.splitlines():
            if (
                not line.startswith("Microsoft (R) Windows (R) Resource Compiler")
                and not line.startswith("Copyright (C) Microsoft Corporation")
                and line
            ):
                print(line)
        return popen.returncode

    def ExecActionWrapper(self, arch, rspfile, *dir):
        """Runs an action command line from a response file using the environment
    for |arch|. If |dir| is supplied, use that as the working directory."""
        env = self._GetEnv(arch)
        # TODO(scottmg): This is a temporary hack to get some specific variables
        # through to actions that are set after gyp-time. http://crbug.com/333738.
        for k, v in os.environ.items():
            if k not in env:
                env[k] = v
        args = open(rspfile).read()
        dir = dir[0] if dir else None
        return subprocess.call(args, shell=True, env=env, cwd=dir)

    def ExecClCompile(self, project_dir, selected_files):
        """Executed by msvs-ninja projects when the 'ClCompile' target is used to
    build selected C/C++ files."""
        project_dir = os.path.relpath(project_dir, BASE_DIR)
        selected_files = selected_files.split(";")
        ninja_targets = [
            os.path.join(project_dir, filename) + "^^" for filename in selected_files
        ]
        cmd = ["ninja.exe"]
        cmd.extend(ninja_targets)
        return subprocess.call(cmd, shell=True, cwd=BASE_DIR)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
