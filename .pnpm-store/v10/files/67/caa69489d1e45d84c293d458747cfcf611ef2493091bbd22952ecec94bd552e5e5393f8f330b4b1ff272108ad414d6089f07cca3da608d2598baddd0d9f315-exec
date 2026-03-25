#!/usr/bin/env python3

# Copyright (c) 2009 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os
import sys
import subprocess


def IsCygwin():
    # Function copied from pylib/gyp/common.py
    try:
        out = subprocess.Popen(
            "uname", stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        stdout, _ = out.communicate()
        return "CYGWIN" in stdout.decode("utf-8")
    except Exception:
        return False


def UnixifyPath(path):
    try:
        if not IsCygwin():
            return path
        out = subprocess.Popen(
            ["cygpath", "-u", path], stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        stdout, _ = out.communicate()
        return stdout.decode("utf-8")
    except Exception:
        return path


# Make sure we're using the version of pylib in this repo, not one installed
# elsewhere on the system. Also convert to Unix style path on Cygwin systems,
# else the 'gyp' library will not be found
path = UnixifyPath(sys.argv[0])
sys.path.insert(0, os.path.join(os.path.dirname(path), "pylib"))
import gyp  # noqa: E402

if __name__ == "__main__":
    sys.exit(gyp.script_main())
