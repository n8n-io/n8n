#!/usr/bin/env python3

# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Prints the information in a sln file in a diffable way.

   It first outputs each projects in alphabetical order with their
   dependencies.

   Then it outputs a possible build order.
"""


import os
import re
import sys
import pretty_vcproj

__author__ = "nsylvain (Nicolas Sylvain)"


def BuildProject(project, built, projects, deps):
    # if all dependencies are done, we can build it, otherwise we try to build the
    # dependency.
    # This is not infinite-recursion proof.
    for dep in deps[project]:
        if dep not in built:
            BuildProject(dep, built, projects, deps)
    print(project)
    built.append(project)


def ParseSolution(solution_file):
    # All projects, their clsid and paths.
    projects = dict()

    # A list of dependencies associated with a project.
    dependencies = dict()

    # Regular expressions that matches the SLN format.
    # The first line of a project definition.
    begin_project = re.compile(
        r'^Project\("{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942'
        r'}"\) = "(.*)", "(.*)", "(.*)"$'
    )
    # The last line of a project definition.
    end_project = re.compile("^EndProject$")
    # The first line of a dependency list.
    begin_dep = re.compile(r"ProjectSection\(ProjectDependencies\) = postProject$")
    # The last line of a dependency list.
    end_dep = re.compile("EndProjectSection$")
    # A line describing a dependency.
    dep_line = re.compile(" *({.*}) = ({.*})$")

    in_deps = False
    solution = open(solution_file)
    for line in solution:
        results = begin_project.search(line)
        if results:
            # Hack to remove icu because the diff is too different.
            if results.group(1).find("icu") != -1:
                continue
            # We remove "_gyp" from the names because it helps to diff them.
            current_project = results.group(1).replace("_gyp", "")
            projects[current_project] = [
                results.group(2).replace("_gyp", ""),
                results.group(3),
                results.group(2),
            ]
            dependencies[current_project] = []
            continue

        results = end_project.search(line)
        if results:
            current_project = None
            continue

        results = begin_dep.search(line)
        if results:
            in_deps = True
            continue

        results = end_dep.search(line)
        if results:
            in_deps = False
            continue

        results = dep_line.search(line)
        if results and in_deps and current_project:
            dependencies[current_project].append(results.group(1))
            continue

    # Change all dependencies clsid to name instead.
    for project in dependencies:
        # For each dependencies in this project
        new_dep_array = []
        for dep in dependencies[project]:
            # Look for the project name matching this cldis
            for project_info in projects:
                if projects[project_info][1] == dep:
                    new_dep_array.append(project_info)
        dependencies[project] = sorted(new_dep_array)

    return (projects, dependencies)


def PrintDependencies(projects, deps):
    print("---------------------------------------")
    print("Dependencies for all projects")
    print("---------------------------------------")
    print("--                                   --")

    for (project, dep_list) in sorted(deps.items()):
        print("Project : %s" % project)
        print("Path : %s" % projects[project][0])
        if dep_list:
            for dep in dep_list:
                print("  - %s" % dep)
        print("")

    print("--                                   --")


def PrintBuildOrder(projects, deps):
    print("---------------------------------------")
    print("Build order                            ")
    print("---------------------------------------")
    print("--                                   --")

    built = []
    for (project, _) in sorted(deps.items()):
        if project not in built:
            BuildProject(project, built, projects, deps)

    print("--                                   --")


def PrintVCProj(projects):

    for project in projects:
        print("-------------------------------------")
        print("-------------------------------------")
        print(project)
        print(project)
        print(project)
        print("-------------------------------------")
        print("-------------------------------------")

        project_path = os.path.abspath(
            os.path.join(os.path.dirname(sys.argv[1]), projects[project][2])
        )

        pretty = pretty_vcproj
        argv = [
            "",
            project_path,
            "$(SolutionDir)=%s\\" % os.path.dirname(sys.argv[1]),
        ]
        argv.extend(sys.argv[3:])
        pretty.main(argv)


def main():
    # check if we have exactly 1 parameter.
    if len(sys.argv) < 2:
        print('Usage: %s "c:\\path\\to\\project.sln"' % sys.argv[0])
        return 1

    (projects, deps) = ParseSolution(sys.argv[1])
    PrintDependencies(projects, deps)
    PrintBuildOrder(projects, deps)

    if "--recursive" in sys.argv:
        PrintVCProj(projects)
    return 0


if __name__ == "__main__":
    sys.exit(main())
