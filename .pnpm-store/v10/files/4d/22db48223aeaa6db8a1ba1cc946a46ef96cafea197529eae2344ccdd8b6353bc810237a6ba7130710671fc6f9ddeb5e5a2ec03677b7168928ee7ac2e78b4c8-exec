#!/usr/bin/env python3
# Copyright (c) 2011 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""These functions are executed via gyp-flock-tool when using the Makefile
generator.  Used on systems that don't have a built-in flock."""

import fcntl
import os
import struct
import subprocess
import sys


def main(args):
    executor = FlockTool()
    executor.Dispatch(args)


class FlockTool:
    """This class emulates the 'flock' command."""

    def Dispatch(self, args):
        """Dispatches a string command to a method."""
        if len(args) < 1:
            raise Exception("Not enough arguments")

        method = "Exec%s" % self._CommandifyName(args[0])
        getattr(self, method)(*args[1:])

    def _CommandifyName(self, name_string):
        """Transforms a tool name like copy-info-plist to CopyInfoPlist"""
        return name_string.title().replace("-", "")

    def ExecFlock(self, lockfile, *cmd_list):
        """Emulates the most basic behavior of Linux's flock(1)."""
        # Rely on exception handling to report errors.
        # Note that the stock python on SunOS has a bug
        # where fcntl.flock(fd, LOCK_EX) always fails
        # with EBADF, that's why we use this F_SETLK
        # hack instead.
        fd = os.open(lockfile, os.O_WRONLY | os.O_NOCTTY | os.O_CREAT, 0o666)
        if sys.platform.startswith("aix"):
            # Python on AIX is compiled with LARGEFILE support, which changes the
            # struct size.
            op = struct.pack("hhIllqq", fcntl.F_WRLCK, 0, 0, 0, 0, 0, 0)
        else:
            op = struct.pack("hhllhhl", fcntl.F_WRLCK, 0, 0, 0, 0, 0, 0)
        fcntl.fcntl(fd, fcntl.F_SETLK, op)
        return subprocess.call(cmd_list)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
