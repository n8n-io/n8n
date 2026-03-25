#!/usr/bin/env python3

# Copyright (c) 2011 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Using the JSON dumped by the dump-dependency-json generator,
generate input suitable for graphviz to render a dependency graph of
targets."""


import collections
import json
import sys


def ParseTarget(target):
    target, _, suffix = target.partition("#")
    filename, _, target = target.partition(":")
    return filename, target, suffix


def LoadEdges(filename, targets):
    """Load the edges map from the dump file, and filter it to only
  show targets in |targets| and their depedendents."""

    file = open("dump.json")
    edges = json.load(file)
    file.close()

    # Copy out only the edges we're interested in from the full edge list.
    target_edges = {}
    to_visit = targets[:]
    while to_visit:
        src = to_visit.pop()
        if src in target_edges:
            continue
        target_edges[src] = edges[src]
        to_visit.extend(edges[src])

    return target_edges


def WriteGraph(edges):
    """Print a graphviz graph to stdout.
  |edges| is a map of target to a list of other targets it depends on."""

    # Bucket targets by file.
    files = collections.defaultdict(list)
    for src, dst in edges.items():
        build_file, target_name, toolset = ParseTarget(src)
        files[build_file].append(src)

    print("digraph D {")
    print("  fontsize=8")  # Used by subgraphs.
    print("  node [fontsize=8]")

    # Output nodes by file.  We must first write out each node within
    # its file grouping before writing out any edges that may refer
    # to those nodes.
    for filename, targets in files.items():
        if len(targets) == 1:
            # If there's only one node for this file, simplify
            # the display by making it a box without an internal node.
            target = targets[0]
            build_file, target_name, toolset = ParseTarget(target)
            print(
                f'  "{target}" [shape=box, label="{filename}\\n{target_name}"]'
            )
        else:
            # Group multiple nodes together in a subgraph.
            print('  subgraph "cluster_%s" {' % filename)
            print('    label = "%s"' % filename)
            for target in targets:
                build_file, target_name, toolset = ParseTarget(target)
                print(f'    "{target}" [label="{target_name}"]')
            print("  }")

    # Now that we've placed all the nodes within subgraphs, output all
    # the edges between nodes.
    for src, dsts in edges.items():
        for dst in dsts:
            print(f'  "{src}" -> "{dst}"')

    print("}")


def main():
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        print(file=sys.stderr)
        print("usage: %s target1 target2..." % (sys.argv[0]), file=sys.stderr)
        return 1

    edges = LoadEdges("dump.json", sys.argv[1:])

    WriteGraph(edges)
    return 0


if __name__ == "__main__":
    sys.exit(main())
