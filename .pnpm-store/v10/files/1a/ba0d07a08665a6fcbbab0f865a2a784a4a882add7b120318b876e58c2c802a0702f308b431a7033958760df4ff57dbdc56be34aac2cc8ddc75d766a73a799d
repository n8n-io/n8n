# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import errno
import filecmp
import os.path
import re
import tempfile
import sys
import subprocess

from collections.abc import MutableSet


# A minimal memoizing decorator. It'll blow up if the args aren't immutable,
# among other "problems".
class memoize:
    def __init__(self, func):
        self.func = func
        self.cache = {}

    def __call__(self, *args):
        try:
            return self.cache[args]
        except KeyError:
            result = self.func(*args)
            self.cache[args] = result
            return result


class GypError(Exception):
    """Error class representing an error, which is to be presented
  to the user.  The main entry point will catch and display this.
  """

    pass


def ExceptionAppend(e, msg):
    """Append a message to the given exception's message."""
    if not e.args:
        e.args = (msg,)
    elif len(e.args) == 1:
        e.args = (str(e.args[0]) + " " + msg,)
    else:
        e.args = (str(e.args[0]) + " " + msg,) + e.args[1:]


def FindQualifiedTargets(target, qualified_list):
    """
  Given a list of qualified targets, return the qualified targets for the
  specified |target|.
  """
    return [t for t in qualified_list if ParseQualifiedTarget(t)[1] == target]


def ParseQualifiedTarget(target):
    # Splits a qualified target into a build file, target name and toolset.

    # NOTE: rsplit is used to disambiguate the Windows drive letter separator.
    target_split = target.rsplit(":", 1)
    if len(target_split) == 2:
        [build_file, target] = target_split
    else:
        build_file = None

    target_split = target.rsplit("#", 1)
    if len(target_split) == 2:
        [target, toolset] = target_split
    else:
        toolset = None

    return [build_file, target, toolset]


def ResolveTarget(build_file, target, toolset):
    # This function resolves a target into a canonical form:
    # - a fully defined build file, either absolute or relative to the current
    # directory
    # - a target name
    # - a toolset
    #
    # build_file is the file relative to which 'target' is defined.
    # target is the qualified target.
    # toolset is the default toolset for that target.
    [parsed_build_file, target, parsed_toolset] = ParseQualifiedTarget(target)

    if parsed_build_file:
        if build_file:
            # If a relative path, parsed_build_file is relative to the directory
            # containing build_file.  If build_file is not in the current directory,
            # parsed_build_file is not a usable path as-is.  Resolve it by
            # interpreting it as relative to build_file.  If parsed_build_file is
            # absolute, it is usable as a path regardless of the current directory,
            # and os.path.join will return it as-is.
            build_file = os.path.normpath(
                os.path.join(os.path.dirname(build_file), parsed_build_file)
            )
            # Further (to handle cases like ../cwd), make it relative to cwd)
            if not os.path.isabs(build_file):
                build_file = RelativePath(build_file, ".")
        else:
            build_file = parsed_build_file

    if parsed_toolset:
        toolset = parsed_toolset

    return [build_file, target, toolset]


def BuildFile(fully_qualified_target):
    # Extracts the build file from the fully qualified target.
    return ParseQualifiedTarget(fully_qualified_target)[0]


def GetEnvironFallback(var_list, default):
    """Look up a key in the environment, with fallback to secondary keys
  and finally falling back to a default value."""
    for var in var_list:
        if var in os.environ:
            return os.environ[var]
    return default


def QualifiedTarget(build_file, target, toolset):
    # "Qualified" means the file that a target was defined in and the target
    # name, separated by a colon, suffixed by a # and the toolset name:
    # /path/to/file.gyp:target_name#toolset
    fully_qualified = build_file + ":" + target
    if toolset:
        fully_qualified = fully_qualified + "#" + toolset
    return fully_qualified


@memoize
def RelativePath(path, relative_to, follow_path_symlink=True):
    # Assuming both |path| and |relative_to| are relative to the current
    # directory, returns a relative path that identifies path relative to
    # relative_to.
    # If |follow_symlink_path| is true (default) and |path| is a symlink, then
    # this method returns a path to the real file represented by |path|. If it is
    # false, this method returns a path to the symlink. If |path| is not a
    # symlink, this option has no effect.

    # Convert to normalized (and therefore absolute paths).
    if follow_path_symlink:
        path = os.path.realpath(path)
    else:
        path = os.path.abspath(path)
    relative_to = os.path.realpath(relative_to)

    # On Windows, we can't create a relative path to a different drive, so just
    # use the absolute path.
    if sys.platform == "win32":
        if (
            os.path.splitdrive(path)[0].lower()
            != os.path.splitdrive(relative_to)[0].lower()
        ):
            return path

    # Split the paths into components.
    path_split = path.split(os.path.sep)
    relative_to_split = relative_to.split(os.path.sep)

    # Determine how much of the prefix the two paths share.
    prefix_len = len(os.path.commonprefix([path_split, relative_to_split]))

    # Put enough ".." components to back up out of relative_to to the common
    # prefix, and then append the part of path_split after the common prefix.
    relative_split = [os.path.pardir] * (
        len(relative_to_split) - prefix_len
    ) + path_split[prefix_len:]

    if len(relative_split) == 0:
        # The paths were the same.
        return ""

    # Turn it back into a string and we're done.
    return os.path.join(*relative_split)


@memoize
def InvertRelativePath(path, toplevel_dir=None):
    """Given a path like foo/bar that is relative to toplevel_dir, return
  the inverse relative path back to the toplevel_dir.

  E.g. os.path.normpath(os.path.join(path, InvertRelativePath(path)))
  should always produce the empty string, unless the path contains symlinks.
  """
    if not path:
        return path
    toplevel_dir = "." if toplevel_dir is None else toplevel_dir
    return RelativePath(toplevel_dir, os.path.join(toplevel_dir, path))


def FixIfRelativePath(path, relative_to):
    # Like RelativePath but returns |path| unchanged if it is absolute.
    if os.path.isabs(path):
        return path
    return RelativePath(path, relative_to)


def UnrelativePath(path, relative_to):
    # Assuming that |relative_to| is relative to the current directory, and |path|
    # is a path relative to the dirname of |relative_to|, returns a path that
    # identifies |path| relative to the current directory.
    rel_dir = os.path.dirname(relative_to)
    return os.path.normpath(os.path.join(rel_dir, path))


# re objects used by EncodePOSIXShellArgument.  See IEEE 1003.1 XCU.2.2 at
# http://www.opengroup.org/onlinepubs/009695399/utilities/xcu_chap02.html#tag_02_02
# and the documentation for various shells.

# _quote is a pattern that should match any argument that needs to be quoted
# with double-quotes by EncodePOSIXShellArgument.  It matches the following
# characters appearing anywhere in an argument:
#   \t, \n, space  parameter separators
#   #              comments
#   $              expansions (quoted to always expand within one argument)
#   %              called out by IEEE 1003.1 XCU.2.2
#   &              job control
#   '              quoting
#   (, )           subshell execution
#   *, ?, [        pathname expansion
#   ;              command delimiter
#   <, >, |        redirection
#   =              assignment
#   {, }           brace expansion (bash)
#   ~              tilde expansion
# It also matches the empty string, because "" (or '') is the only way to
# represent an empty string literal argument to a POSIX shell.
#
# This does not match the characters in _escape, because those need to be
# backslash-escaped regardless of whether they appear in a double-quoted
# string.
_quote = re.compile("[\t\n #$%&'()*;<=>?[{|}~]|^$")

# _escape is a pattern that should match any character that needs to be
# escaped with a backslash, whether or not the argument matched the _quote
# pattern.  _escape is used with re.sub to backslash anything in _escape's
# first match group, hence the (parentheses) in the regular expression.
#
# _escape matches the following characters appearing anywhere in an argument:
#   "  to prevent POSIX shells from interpreting this character for quoting
#   \  to prevent POSIX shells from interpreting this character for escaping
#   `  to prevent POSIX shells from interpreting this character for command
#      substitution
# Missing from this list is $, because the desired behavior of
# EncodePOSIXShellArgument is to permit parameter (variable) expansion.
#
# Also missing from this list is !, which bash will interpret as the history
# expansion character when history is enabled.  bash does not enable history
# by default in non-interactive shells, so this is not thought to be a problem.
# ! was omitted from this list because bash interprets "\!" as a literal string
# including the backslash character (avoiding history expansion but retaining
# the backslash), which would not be correct for argument encoding.  Handling
# this case properly would also be problematic because bash allows the history
# character to be changed with the histchars shell variable.  Fortunately,
# as history is not enabled in non-interactive shells and
# EncodePOSIXShellArgument is only expected to encode for non-interactive
# shells, there is no room for error here by ignoring !.
_escape = re.compile(r'(["\\`])')


def EncodePOSIXShellArgument(argument):
    """Encodes |argument| suitably for consumption by POSIX shells.

  argument may be quoted and escaped as necessary to ensure that POSIX shells
  treat the returned value as a literal representing the argument passed to
  this function.  Parameter (variable) expansions beginning with $ are allowed
  to remain intact without escaping the $, to allow the argument to contain
  references to variables to be expanded by the shell.
  """

    if not isinstance(argument, str):
        argument = str(argument)

    if _quote.search(argument):
        quote = '"'
    else:
        quote = ""

    encoded = quote + re.sub(_escape, r"\\\1", argument) + quote

    return encoded


def EncodePOSIXShellList(list):
    """Encodes |list| suitably for consumption by POSIX shells.

  Returns EncodePOSIXShellArgument for each item in list, and joins them
  together using the space character as an argument separator.
  """

    encoded_arguments = []
    for argument in list:
        encoded_arguments.append(EncodePOSIXShellArgument(argument))
    return " ".join(encoded_arguments)


def DeepDependencyTargets(target_dicts, roots):
    """Returns the recursive list of target dependencies."""
    dependencies = set()
    pending = set(roots)
    while pending:
        # Pluck out one.
        r = pending.pop()
        # Skip if visited already.
        if r in dependencies:
            continue
        # Add it.
        dependencies.add(r)
        # Add its children.
        spec = target_dicts[r]
        pending.update(set(spec.get("dependencies", [])))
        pending.update(set(spec.get("dependencies_original", [])))
    return list(dependencies - set(roots))


def BuildFileTargets(target_list, build_file):
    """From a target_list, returns the subset from the specified build_file.
  """
    return [p for p in target_list if BuildFile(p) == build_file]


def AllTargets(target_list, target_dicts, build_file):
    """Returns all targets (direct and dependencies) for the specified build_file.
  """
    bftargets = BuildFileTargets(target_list, build_file)
    deptargets = DeepDependencyTargets(target_dicts, bftargets)
    return bftargets + deptargets


def WriteOnDiff(filename):
    """Write to a file only if the new contents differ.

  Arguments:
    filename: name of the file to potentially write to.
  Returns:
    A file like object which will write to temporary file and only overwrite
    the target if it differs (on close).
  """

    class Writer:
        """Wrapper around file which only covers the target if it differs."""

        def __init__(self):
            # On Cygwin remove the "dir" argument
            # `C:` prefixed paths are treated as relative,
            # consequently ending up with current dir "/cygdrive/c/..."
            # being prefixed to those, which was
            # obviously a non-existent path,
            # for example: "/cygdrive/c/<some folder>/C:\<my win style abs path>".
            # For more details see:
            # https://docs.python.org/2/library/tempfile.html#tempfile.mkstemp
            base_temp_dir = "" if IsCygwin() else os.path.dirname(filename)
            # Pick temporary file.
            tmp_fd, self.tmp_path = tempfile.mkstemp(
                suffix=".tmp",
                prefix=os.path.split(filename)[1] + ".gyp.",
                dir=base_temp_dir,
            )
            try:
                self.tmp_file = os.fdopen(tmp_fd, "wb")
            except Exception:
                # Don't leave turds behind.
                os.unlink(self.tmp_path)
                raise

        def __getattr__(self, attrname):
            # Delegate everything else to self.tmp_file
            return getattr(self.tmp_file, attrname)

        def close(self):
            try:
                # Close tmp file.
                self.tmp_file.close()
                # Determine if different.
                same = False
                try:
                    same = filecmp.cmp(self.tmp_path, filename, False)
                except OSError as e:
                    if e.errno != errno.ENOENT:
                        raise

                if same:
                    # The new file is identical to the old one, just get rid of the new
                    # one.
                    os.unlink(self.tmp_path)
                else:
                    # The new file is different from the old one,
                    # or there is no old one.
                    # Rename the new file to the permanent name.
                    #
                    # tempfile.mkstemp uses an overly restrictive mode, resulting in a
                    # file that can only be read by the owner, regardless of the umask.
                    # There's no reason to not respect the umask here,
                    # which means that an extra hoop is required
                    # to fetch it and reset the new file's mode.
                    #
                    # No way to get the umask without setting a new one?  Set a safe one
                    # and then set it back to the old value.
                    umask = os.umask(0o77)
                    os.umask(umask)
                    os.chmod(self.tmp_path, 0o666 & ~umask)
                    if sys.platform == "win32" and os.path.exists(filename):
                        # NOTE: on windows (but not cygwin) rename will not replace an
                        # existing file, so it must be preceded with a remove.
                        # Sadly there is no way to make the switch atomic.
                        os.remove(filename)
                    os.rename(self.tmp_path, filename)
            except Exception:
                # Don't leave turds behind.
                os.unlink(self.tmp_path)
                raise

        def write(self, s):
            self.tmp_file.write(s.encode("utf-8"))

    return Writer()


def EnsureDirExists(path):
    """Make sure the directory for |path| exists."""
    try:
        os.makedirs(os.path.dirname(path))
    except OSError:
        pass


def GetFlavor(params):
    """Returns |params.flavor| if it's set, the system's default flavor else."""
    flavors = {
        "cygwin": "win",
        "win32": "win",
        "darwin": "mac",
    }

    if "flavor" in params:
        return params["flavor"]
    if sys.platform in flavors:
        return flavors[sys.platform]
    if sys.platform.startswith("sunos"):
        return "solaris"
    if sys.platform.startswith(("dragonfly", "freebsd")):
        return "freebsd"
    if sys.platform.startswith("openbsd"):
        return "openbsd"
    if sys.platform.startswith("netbsd"):
        return "netbsd"
    if sys.platform.startswith("aix"):
        return "aix"
    if sys.platform.startswith(("os390", "zos")):
        return "zos"

    return "linux"


def CopyTool(flavor, out_path, generator_flags={}):
    """Finds (flock|mac|win)_tool.gyp in the gyp directory and copies it
  to |out_path|."""
    # aix and solaris just need flock emulation. mac and win use more complicated
    # support scripts.
    prefix = {"aix": "flock", "solaris": "flock", "mac": "mac", "win": "win"}.get(
        flavor, None
    )
    if not prefix:
        return

    # Slurp input file.
    source_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "%s_tool.py" % prefix
    )
    with open(source_path) as source_file:
        source = source_file.readlines()

    # Set custom header flags.
    header = "# Generated by gyp. Do not edit.\n"
    mac_toolchain_dir = generator_flags.get("mac_toolchain_dir", None)
    if flavor == "mac" and mac_toolchain_dir:
        header += "import os;\nos.environ['DEVELOPER_DIR']='%s'\n" % mac_toolchain_dir

    # Add header and write it out.
    tool_path = os.path.join(out_path, "gyp-%s-tool" % prefix)
    with open(tool_path, "w") as tool_file:
        tool_file.write("".join([source[0], header] + source[1:]))

    # Make file executable.
    os.chmod(tool_path, 0o755)


# From Alex Martelli,
# http://aspn.activestate.com/ASPN/Cookbook/Python/Recipe/52560
# ASPN: Python Cookbook: Remove duplicates from a sequence
# First comment, dated 2001/10/13.
# (Also in the printed Python Cookbook.)


def uniquer(seq, idfun=lambda x: x):
    seen = {}
    result = []
    for item in seq:
        marker = idfun(item)
        if marker in seen:
            continue
        seen[marker] = 1
        result.append(item)
    return result


# Based on http://code.activestate.com/recipes/576694/.
class OrderedSet(MutableSet):
    def __init__(self, iterable=None):
        self.end = end = []
        end += [None, end, end]  # sentinel node for doubly linked list
        self.map = {}  # key --> [key, prev, next]
        if iterable is not None:
            self |= iterable

    def __len__(self):
        return len(self.map)

    def __contains__(self, key):
        return key in self.map

    def add(self, key):
        if key not in self.map:
            end = self.end
            curr = end[1]
            curr[2] = end[1] = self.map[key] = [key, curr, end]

    def discard(self, key):
        if key in self.map:
            key, prev_item, next_item = self.map.pop(key)
            prev_item[2] = next_item
            next_item[1] = prev_item

    def __iter__(self):
        end = self.end
        curr = end[2]
        while curr is not end:
            yield curr[0]
            curr = curr[2]

    def __reversed__(self):
        end = self.end
        curr = end[1]
        while curr is not end:
            yield curr[0]
            curr = curr[1]

    # The second argument is an addition that causes a pylint warning.
    def pop(self, last=True):  # pylint: disable=W0221
        if not self:
            raise KeyError("set is empty")
        key = self.end[1][0] if last else self.end[2][0]
        self.discard(key)
        return key

    def __repr__(self):
        if not self:
            return f"{self.__class__.__name__}()"
        return f"{self.__class__.__name__}({list(self)!r})"

    def __eq__(self, other):
        if isinstance(other, OrderedSet):
            return len(self) == len(other) and list(self) == list(other)
        return set(self) == set(other)

    # Extensions to the recipe.
    def update(self, iterable):
        for i in iterable:
            if i not in self:
                self.add(i)


class CycleError(Exception):
    """An exception raised when an unexpected cycle is detected."""

    def __init__(self, nodes):
        self.nodes = nodes

    def __str__(self):
        return "CycleError: cycle involving: " + str(self.nodes)


def TopologicallySorted(graph, get_edges):
    r"""Topologically sort based on a user provided edge definition.

  Args:
    graph: A list of node names.
    get_edges: A function mapping from node name to a hashable collection
               of node names which this node has outgoing edges to.
  Returns:
    A list containing all of the node in graph in topological order.
    It is assumed that calling get_edges once for each node and caching is
    cheaper than repeatedly calling get_edges.
  Raises:
    CycleError in the event of a cycle.
  Example:
    graph = {'a': '$(b) $(c)', 'b': 'hi', 'c': '$(b)'}
    def GetEdges(node):
      return re.findall(r'\$\(([^))]\)', graph[node])
    print TopologicallySorted(graph.keys(), GetEdges)
    ==>
    ['a', 'c', b']
  """
    get_edges = memoize(get_edges)
    visited = set()
    visiting = set()
    ordered_nodes = []

    def Visit(node):
        if node in visiting:
            raise CycleError(visiting)
        if node in visited:
            return
        visited.add(node)
        visiting.add(node)
        for neighbor in get_edges(node):
            Visit(neighbor)
        visiting.remove(node)
        ordered_nodes.insert(0, node)

    for node in sorted(graph):
        Visit(node)
    return ordered_nodes


def CrossCompileRequested():
    # TODO: figure out how to not build extra host objects in the
    # non-cross-compile case when this is enabled, and enable unconditionally.
    return (
        os.environ.get("GYP_CROSSCOMPILE")
        or os.environ.get("AR_host")
        or os.environ.get("CC_host")
        or os.environ.get("CXX_host")
        or os.environ.get("AR_target")
        or os.environ.get("CC_target")
        or os.environ.get("CXX_target")
    )


def IsCygwin():
    try:
        out = subprocess.Popen(
            "uname", stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        stdout = out.communicate()[0].decode("utf-8")
        return "CYGWIN" in str(stdout)
    except Exception:
        return False
