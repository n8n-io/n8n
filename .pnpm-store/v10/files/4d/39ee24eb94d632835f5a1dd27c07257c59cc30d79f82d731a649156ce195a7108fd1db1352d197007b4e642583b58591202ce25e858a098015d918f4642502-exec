#!/usr/bin/env python3
# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""gyptest.py -- test runner for GYP tests."""


import argparse
import os
import platform
import subprocess
import sys
import time


def is_test_name(f):
    return f.startswith("gyptest") and f.endswith(".py")


def find_all_gyptest_files(directory):
    result = []
    for root, dirs, files in os.walk(directory):
        result.extend([os.path.join(root, f) for f in files if is_test_name(f)])
    result.sort()
    return result


def main(argv=None):
    if argv is None:
        argv = sys.argv

    parser = argparse.ArgumentParser()
    parser.add_argument("-a", "--all", action="store_true", help="run all tests")
    parser.add_argument("-C", "--chdir", action="store", help="change to directory")
    parser.add_argument(
        "-f",
        "--format",
        action="store",
        default="",
        help="run tests with the specified formats",
    )
    parser.add_argument(
        "-G",
        "--gyp_option",
        action="append",
        default=[],
        help="Add -G options to the gyp command line",
    )
    parser.add_argument(
        "-l", "--list", action="store_true", help="list available tests and exit"
    )
    parser.add_argument(
        "-n",
        "--no-exec",
        action="store_true",
        help="no execute, just print the command line",
    )
    parser.add_argument(
        "--path", action="append", default=[], help="additional $PATH directory"
    )
    parser.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="quiet, don't print anything unless there are failures",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="print configuration info and test results.",
    )
    parser.add_argument("tests", nargs="*")
    args = parser.parse_args(argv[1:])

    if args.chdir:
        os.chdir(args.chdir)

    if args.path:
        extra_path = [os.path.abspath(p) for p in args.path]
        extra_path = os.pathsep.join(extra_path)
        os.environ["PATH"] = extra_path + os.pathsep + os.environ["PATH"]

    if not args.tests:
        if not args.all:
            sys.stderr.write("Specify -a to get all tests.\n")
            return 1
        args.tests = ["test"]

    tests = []
    for arg in args.tests:
        if os.path.isdir(arg):
            tests.extend(find_all_gyptest_files(os.path.normpath(arg)))
        else:
            if not is_test_name(os.path.basename(arg)):
                print(arg, "is not a valid gyp test name.", file=sys.stderr)
                sys.exit(1)
            tests.append(arg)

    if args.list:
        for test in tests:
            print(test)
        sys.exit(0)

    os.environ["PYTHONPATH"] = os.path.abspath("test/lib")

    if args.verbose:
        print_configuration_info()

    if args.gyp_option and not args.quiet:
        print("Extra Gyp options: %s\n" % args.gyp_option)

    if args.format:
        format_list = args.format.split(",")
    else:
        format_list = {
            "aix5": ["make"],
            "freebsd7": ["make"],
            "freebsd8": ["make"],
            "openbsd5": ["make"],
            "cygwin": ["msvs"],
            "win32": ["msvs", "ninja"],
            "linux": ["make", "ninja"],
            "linux2": ["make", "ninja"],
            "linux3": ["make", "ninja"],
            # TODO: Re-enable xcode-ninja.
            # https://bugs.chromium.org/p/gyp/issues/detail?id=530
            # 'darwin':   ['make', 'ninja', 'xcode', 'xcode-ninja'],
            "darwin": ["make", "ninja", "xcode"],
        }[sys.platform]

    gyp_options = []
    for option in args.gyp_option:
        gyp_options += ["-G", option]

    runner = Runner(format_list, tests, gyp_options, args.verbose)
    runner.run()

    if not args.quiet:
        runner.print_results()

    return 1 if runner.failures else 0


def print_configuration_info():
    print("Test configuration:")
    if sys.platform == "darwin":
        sys.path.append(os.path.abspath("test/lib"))
        import TestMac

        print(f"  Mac {platform.mac_ver()[0]} {platform.mac_ver()[2]}")
        print(f"  Xcode {TestMac.Xcode.Version()}")
    elif sys.platform == "win32":
        sys.path.append(os.path.abspath("pylib"))
        import gyp.MSVSVersion

        print("  Win %s %s\n" % platform.win32_ver()[0:2])
        print("  MSVS %s" % gyp.MSVSVersion.SelectVisualStudioVersion().Description())
    elif sys.platform in ("linux", "linux2"):
        print("  Linux %s" % " ".join(platform.linux_distribution()))
    print(f"  Python {platform.python_version()}")
    print(f"  PYTHONPATH={os.environ['PYTHONPATH']}")
    print()


class Runner:
    def __init__(self, formats, tests, gyp_options, verbose):
        self.formats = formats
        self.tests = tests
        self.verbose = verbose
        self.gyp_options = gyp_options
        self.failures = []
        self.num_tests = len(formats) * len(tests)
        num_digits = len(str(self.num_tests))
        self.fmt_str = "[%%%dd/%%%dd] (%%s) %%s" % (num_digits, num_digits)
        self.isatty = sys.stdout.isatty() and not self.verbose
        self.env = os.environ.copy()
        self.hpos = 0

    def run(self):
        run_start = time.time()

        i = 1
        for fmt in self.formats:
            for test in self.tests:
                self.run_test(test, fmt, i)
                i += 1

        if self.isatty:
            self.erase_current_line()

        self.took = time.time() - run_start

    def run_test(self, test, fmt, i):
        if self.isatty:
            self.erase_current_line()

        msg = self.fmt_str % (i, self.num_tests, fmt, test)
        self.print_(msg)

        start = time.time()
        cmd = [sys.executable, test] + self.gyp_options
        self.env["TESTGYP_FORMAT"] = fmt
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=self.env
        )
        proc.wait()
        took = time.time() - start

        stdout = proc.stdout.read().decode("utf8")
        if proc.returncode == 2:
            res = "skipped"
        elif proc.returncode:
            res = "failed"
            self.failures.append(f"({test}) {fmt}")
        else:
            res = "passed"
        res_msg = f" {res} {took:.3f}s"
        self.print_(res_msg)

        if stdout and not stdout.endswith(("PASSED\n", "NO RESULT\n")):
            print()
            print("\n".join(f"    {line}" for line in stdout.splitlines()))
        elif not self.isatty:
            print()

    def print_(self, msg):
        print(msg, end="")
        index = msg.rfind("\n")
        if index == -1:
            self.hpos += len(msg)
        else:
            self.hpos = len(msg) - index
        sys.stdout.flush()

    def erase_current_line(self):
        print("\b" * self.hpos + " " * self.hpos + "\b" * self.hpos, end="")
        sys.stdout.flush()
        self.hpos = 0

    def print_results(self):
        num_failures = len(self.failures)
        if num_failures:
            print()
            if num_failures == 1:
                print("Failed the following test:")
            else:
                print("Failed the following %d tests:" % num_failures)
            print("\t" + "\n\t".join(sorted(self.failures)))
            print()
        print(
            "Ran %d tests in %.3fs, %d failed."
            % (self.num_tests, self.took, num_failures)
        )
        print()


if __name__ == "__main__":
    sys.exit(main())
