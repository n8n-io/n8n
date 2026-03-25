#!/usr/bin/env python3

# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Make the format of a vcproj really pretty.

   This script normalize and sort an xml. It also fetches all the properties
   inside linked vsprops and include them explicitly in the vcproj.

   It outputs the resulting xml to stdout.
"""


import os
import sys

from xml.dom.minidom import parse
from xml.dom.minidom import Node

__author__ = "nsylvain (Nicolas Sylvain)"
ARGUMENTS = None
REPLACEMENTS = dict()


def cmp(x, y):
    return (x > y) - (x < y)


class CmpTuple:
    """Compare function between 2 tuple."""

    def __call__(self, x, y):
        return cmp(x[0], y[0])


class CmpNode:
    """Compare function between 2 xml nodes."""

    def __call__(self, x, y):
        def get_string(node):
            node_string = "node"
            node_string += node.nodeName
            if node.nodeValue:
                node_string += node.nodeValue

            if node.attributes:
                # We first sort by name, if present.
                node_string += node.getAttribute("Name")

                all_nodes = []
                for (name, value) in node.attributes.items():
                    all_nodes.append((name, value))

                all_nodes.sort(CmpTuple())
                for (name, value) in all_nodes:
                    node_string += name
                    node_string += value

            return node_string

        return cmp(get_string(x), get_string(y))


def PrettyPrintNode(node, indent=0):
    if node.nodeType == Node.TEXT_NODE:
        if node.data.strip():
            print("{}{}".format(" " * indent, node.data.strip()))
        return

    if node.childNodes:
        node.normalize()
    # Get the number of attributes
    attr_count = 0
    if node.attributes:
        attr_count = node.attributes.length

    # Print the main tag
    if attr_count == 0:
        print("{}<{}>".format(" " * indent, node.nodeName))
    else:
        print("{}<{}".format(" " * indent, node.nodeName))

        all_attributes = []
        for (name, value) in node.attributes.items():
            all_attributes.append((name, value))
            all_attributes.sort(CmpTuple())
        for (name, value) in all_attributes:
            print('{}  {}="{}"'.format(" " * indent, name, value))
        print("%s>" % (" " * indent))
    if node.nodeValue:
        print("{}  {}".format(" " * indent, node.nodeValue))

    for sub_node in node.childNodes:
        PrettyPrintNode(sub_node, indent=indent + 2)
    print("{}</{}>".format(" " * indent, node.nodeName))


def FlattenFilter(node):
    """Returns a list of all the node and sub nodes."""
    node_list = []

    if node.attributes and node.getAttribute("Name") == "_excluded_files":
        # We don't add the "_excluded_files" filter.
        return []

    for current in node.childNodes:
        if current.nodeName == "Filter":
            node_list.extend(FlattenFilter(current))
        else:
            node_list.append(current)

    return node_list


def FixFilenames(filenames, current_directory):
    new_list = []
    for filename in filenames:
        if filename:
            for key in REPLACEMENTS:
                filename = filename.replace(key, REPLACEMENTS[key])
            os.chdir(current_directory)
            filename = filename.strip("\"' ")
            if filename.startswith("$"):
                new_list.append(filename)
            else:
                new_list.append(os.path.abspath(filename))
    return new_list


def AbsoluteNode(node):
    """Makes all the properties we know about in this node absolute."""
    if node.attributes:
        for (name, value) in node.attributes.items():
            if name in [
                "InheritedPropertySheets",
                "RelativePath",
                "AdditionalIncludeDirectories",
                "IntermediateDirectory",
                "OutputDirectory",
                "AdditionalLibraryDirectories",
            ]:
                # We want to fix up these paths
                path_list = value.split(";")
                new_list = FixFilenames(path_list, os.path.dirname(ARGUMENTS[1]))
                node.setAttribute(name, ";".join(new_list))
            if not value:
                node.removeAttribute(name)


def CleanupVcproj(node):
    """For each sub node, we call recursively this function."""
    for sub_node in node.childNodes:
        AbsoluteNode(sub_node)
        CleanupVcproj(sub_node)

    # Normalize the node, and remove all extraneous whitespaces.
    for sub_node in node.childNodes:
        if sub_node.nodeType == Node.TEXT_NODE:
            sub_node.data = sub_node.data.replace("\r", "")
            sub_node.data = sub_node.data.replace("\n", "")
            sub_node.data = sub_node.data.rstrip()

    # Fix all the semicolon separated attributes to be sorted, and we also
    # remove the dups.
    if node.attributes:
        for (name, value) in node.attributes.items():
            sorted_list = sorted(value.split(";"))
            unique_list = []
            for i in sorted_list:
                if not unique_list.count(i):
                    unique_list.append(i)
            node.setAttribute(name, ";".join(unique_list))
            if not value:
                node.removeAttribute(name)

    if node.childNodes:
        node.normalize()

    # For each node, take a copy, and remove it from the list.
    node_array = []
    while node.childNodes and node.childNodes[0]:
        # Take a copy of the node and remove it from the list.
        current = node.childNodes[0]
        node.removeChild(current)

        # If the child is a filter, we want to append all its children
        # to this same list.
        if current.nodeName == "Filter":
            node_array.extend(FlattenFilter(current))
        else:
            node_array.append(current)

    # Sort the list.
    node_array.sort(CmpNode())

    # Insert the nodes in the correct order.
    for new_node in node_array:
        # But don't append empty tool node.
        if new_node.nodeName == "Tool":
            if new_node.attributes and new_node.attributes.length == 1:
                # This one was empty.
                continue
        if new_node.nodeName == "UserMacro":
            continue
        node.appendChild(new_node)


def GetConfiguationNodes(vcproj):
    # TODO(nsylvain): Find a better way to navigate the xml.
    nodes = []
    for node in vcproj.childNodes:
        if node.nodeName == "Configurations":
            for sub_node in node.childNodes:
                if sub_node.nodeName == "Configuration":
                    nodes.append(sub_node)

    return nodes


def GetChildrenVsprops(filename):
    dom = parse(filename)
    if dom.documentElement.attributes:
        vsprops = dom.documentElement.getAttribute("InheritedPropertySheets")
        return FixFilenames(vsprops.split(";"), os.path.dirname(filename))
    return []


def SeekToNode(node1, child2):
    # A text node does not have properties.
    if child2.nodeType == Node.TEXT_NODE:
        return None

    # Get the name of the current node.
    current_name = child2.getAttribute("Name")
    if not current_name:
        # There is no name. We don't know how to merge.
        return None

    # Look through all the nodes to find a match.
    for sub_node in node1.childNodes:
        if sub_node.nodeName == child2.nodeName:
            name = sub_node.getAttribute("Name")
            if name == current_name:
                return sub_node

    # No match. We give up.
    return None


def MergeAttributes(node1, node2):
    # No attributes to merge?
    if not node2.attributes:
        return

    for (name, value2) in node2.attributes.items():
        # Don't merge the 'Name' attribute.
        if name == "Name":
            continue
        value1 = node1.getAttribute(name)
        if value1:
            # The attribute exist in the main node. If it's equal, we leave it
            # untouched, otherwise we concatenate it.
            if value1 != value2:
                node1.setAttribute(name, ";".join([value1, value2]))
        else:
            # The attribute does not exist in the main node. We append this one.
            node1.setAttribute(name, value2)

        # If the attribute was a property sheet attributes, we remove it, since
        # they are useless.
        if name == "InheritedPropertySheets":
            node1.removeAttribute(name)


def MergeProperties(node1, node2):
    MergeAttributes(node1, node2)
    for child2 in node2.childNodes:
        child1 = SeekToNode(node1, child2)
        if child1:
            MergeProperties(child1, child2)
        else:
            node1.appendChild(child2.cloneNode(True))


def main(argv):
    """Main function of this vcproj prettifier."""
    global ARGUMENTS
    ARGUMENTS = argv

    # check if we have exactly 1 parameter.
    if len(argv) < 2:
        print(
            'Usage: %s "c:\\path\\to\\vcproj.vcproj" [key1=value1] '
            "[key2=value2]" % argv[0]
        )
        return 1

    # Parse the keys
    for i in range(2, len(argv)):
        (key, value) = argv[i].split("=")
        REPLACEMENTS[key] = value

    # Open the vcproj and parse the xml.
    dom = parse(argv[1])

    # First thing we need to do is find the Configuration Node and merge them
    # with the vsprops they include.
    for configuration_node in GetConfiguationNodes(dom.documentElement):
        # Get the property sheets associated with this configuration.
        vsprops = configuration_node.getAttribute("InheritedPropertySheets")

        # Fix the filenames to be absolute.
        vsprops_list = FixFilenames(
            vsprops.strip().split(";"), os.path.dirname(argv[1])
        )

        # Extend the list of vsprops with all vsprops contained in the current
        # vsprops.
        for current_vsprops in vsprops_list:
            vsprops_list.extend(GetChildrenVsprops(current_vsprops))

        # Now that we have all the vsprops, we need to merge them.
        for current_vsprops in vsprops_list:
            MergeProperties(configuration_node, parse(current_vsprops).documentElement)

    # Now that everything is merged, we need to cleanup the xml.
    CleanupVcproj(dom.documentElement)

    # Finally, we use the prett xml function to print the vcproj back to the
    # user.
    # print dom.toprettyxml(newl="\n")
    PrettyPrintNode(dom.documentElement)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
