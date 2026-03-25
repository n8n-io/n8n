# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Visual Studio user preferences file writer."""

import os
import re
import socket  # for gethostname

import gyp.easy_xml as easy_xml


# ------------------------------------------------------------------------------


def _FindCommandInPath(command):
    """If there are no slashes in the command given, this function
     searches the PATH env to find the given command, and converts it
     to an absolute path.  We have to do this because MSVS is looking
     for an actual file to launch a debugger on, not just a command
     line.  Note that this happens at GYP time, so anything needing to
     be built needs to have a full path."""
    if "/" in command or "\\" in command:
        # If the command already has path elements (either relative or
        # absolute), then assume it is constructed properly.
        return command
    else:
        # Search through the path list and find an existing file that
        # we can access.
        paths = os.environ.get("PATH", "").split(os.pathsep)
        for path in paths:
            item = os.path.join(path, command)
            if os.path.isfile(item) and os.access(item, os.X_OK):
                return item
    return command


def _QuoteWin32CommandLineArgs(args):
    new_args = []
    for arg in args:
        # Replace all double-quotes with double-double-quotes to escape
        # them for cmd shell, and then quote the whole thing if there
        # are any.
        if arg.find('"') != -1:
            arg = '""'.join(arg.split('"'))
            arg = '"%s"' % arg

        # Otherwise, if there are any spaces, quote the whole arg.
        elif re.search(r"[ \t\n]", arg):
            arg = '"%s"' % arg
        new_args.append(arg)
    return new_args


class Writer:
    """Visual Studio XML user user file writer."""

    def __init__(self, user_file_path, version, name):
        """Initializes the user file.

    Args:
      user_file_path: Path to the user file.
      version: Version info.
      name: Name of the user file.
    """
        self.user_file_path = user_file_path
        self.version = version
        self.name = name
        self.configurations = {}

    def AddConfig(self, name):
        """Adds a configuration to the project.

    Args:
      name: Configuration name.
    """
        self.configurations[name] = ["Configuration", {"Name": name}]

    def AddDebugSettings(
        self, config_name, command, environment={}, working_directory=""
    ):
        """Adds a DebugSettings node to the user file for a particular config.

    Args:
      command: command line to run.  First element in the list is the
        executable.  All elements of the command will be quoted if
        necessary.
      working_directory: other files which may trigger the rule. (optional)
    """
        command = _QuoteWin32CommandLineArgs(command)

        abs_command = _FindCommandInPath(command[0])

        if environment and isinstance(environment, dict):
            env_list = [f'{key}="{val}"' for (key, val) in environment.items()]
            environment = " ".join(env_list)
        else:
            environment = ""

        n_cmd = [
            "DebugSettings",
            {
                "Command": abs_command,
                "WorkingDirectory": working_directory,
                "CommandArguments": " ".join(command[1:]),
                "RemoteMachine": socket.gethostname(),
                "Environment": environment,
                "EnvironmentMerge": "true",
                # Currently these are all "dummy" values that we're just setting
                # in the default manner that MSVS does it.  We could use some of
                # these to add additional capabilities, I suppose, but they might
                # not have parity with other platforms then.
                "Attach": "false",
                "DebuggerType": "3",  # 'auto' debugger
                "Remote": "1",
                "RemoteCommand": "",
                "HttpUrl": "",
                "PDBPath": "",
                "SQLDebugging": "",
                "DebuggerFlavor": "0",
                "MPIRunCommand": "",
                "MPIRunArguments": "",
                "MPIRunWorkingDirectory": "",
                "ApplicationCommand": "",
                "ApplicationArguments": "",
                "ShimCommand": "",
                "MPIAcceptMode": "",
                "MPIAcceptFilter": "",
            },
        ]

        # Find the config, and add it if it doesn't exist.
        if config_name not in self.configurations:
            self.AddConfig(config_name)

        # Add the DebugSettings onto the appropriate config.
        self.configurations[config_name].append(n_cmd)

    def WriteIfChanged(self):
        """Writes the user file."""
        configs = ["Configurations"]
        for config, spec in sorted(self.configurations.items()):
            configs.append(spec)

        content = [
            "VisualStudioUserFile",
            {"Version": self.version.ProjectVersion(), "Name": self.name},
            configs,
        ]
        easy_xml.WriteXmlIfChanged(
            content, self.user_file_path, encoding="Windows-1252"
        )
