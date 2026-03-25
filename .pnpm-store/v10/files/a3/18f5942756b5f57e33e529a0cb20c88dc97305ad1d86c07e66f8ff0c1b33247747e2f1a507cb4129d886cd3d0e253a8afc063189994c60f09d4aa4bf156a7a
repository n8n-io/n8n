# Copyright (c) 2011 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import sys
import re
import os
import locale
from functools import reduce


def XmlToString(content, encoding="utf-8", pretty=False):
    """ Writes the XML content to disk, touching the file only if it has changed.

  Visual Studio files have a lot of pre-defined structures.  This function makes
  it easy to represent these structures as Python data structures, instead of
  having to create a lot of function calls.

  Each XML element of the content is represented as a list composed of:
  1. The name of the element, a string,
  2. The attributes of the element, a dictionary (optional), and
  3+. The content of the element, if any.  Strings are simple text nodes and
      lists are child elements.

  Example 1:
      <test/>
  becomes
      ['test']

  Example 2:
      <myelement a='value1' b='value2'>
         <childtype>This is</childtype>
         <childtype>it!</childtype>
      </myelement>

  becomes
      ['myelement', {'a':'value1', 'b':'value2'},
         ['childtype', 'This is'],
         ['childtype', 'it!'],
      ]

  Args:
    content:  The structured content to be converted.
    encoding: The encoding to report on the first XML line.
    pretty: True if we want pretty printing with indents and new lines.

  Returns:
    The XML content as a string.
  """
    # We create a huge list of all the elements of the file.
    xml_parts = ['<?xml version="1.0" encoding="%s"?>' % encoding]
    if pretty:
        xml_parts.append("\n")
    _ConstructContentList(xml_parts, content, pretty)

    # Convert it to a string
    return "".join(xml_parts)


def _ConstructContentList(xml_parts, specification, pretty, level=0):
    """ Appends the XML parts corresponding to the specification.

  Args:
    xml_parts: A list of XML parts to be appended to.
    specification:  The specification of the element.  See EasyXml docs.
    pretty: True if we want pretty printing with indents and new lines.
    level: Indentation level.
  """
    # The first item in a specification is the name of the element.
    if pretty:
        indentation = "  " * level
        new_line = "\n"
    else:
        indentation = ""
        new_line = ""
    name = specification[0]
    if not isinstance(name, str):
        raise Exception(
            "The first item of an EasyXml specification should be "
            "a string.  Specification was " + str(specification)
        )
    xml_parts.append(indentation + "<" + name)

    # Optionally in second position is a dictionary of the attributes.
    rest = specification[1:]
    if rest and isinstance(rest[0], dict):
        for at, val in sorted(rest[0].items()):
            xml_parts.append(f' {at}="{_XmlEscape(val, attr=True)}"')
        rest = rest[1:]
    if rest:
        xml_parts.append(">")
        all_strings = reduce(lambda x, y: x and isinstance(y, str), rest, True)
        multi_line = not all_strings
        if multi_line and new_line:
            xml_parts.append(new_line)
        for child_spec in rest:
            # If it's a string, append a text node.
            # Otherwise recurse over that child definition
            if isinstance(child_spec, str):
                xml_parts.append(_XmlEscape(child_spec))
            else:
                _ConstructContentList(xml_parts, child_spec, pretty, level + 1)
        if multi_line and indentation:
            xml_parts.append(indentation)
        xml_parts.append(f"</{name}>{new_line}")
    else:
        xml_parts.append("/>%s" % new_line)


def WriteXmlIfChanged(content, path, encoding="utf-8", pretty=False,
                      win32=(sys.platform == "win32")):
    """ Writes the XML content to disk, touching the file only if it has changed.

  Args:
    content:  The structured content to be written.
    path: Location of the file.
    encoding: The encoding to report on the first line of the XML file.
    pretty: True if we want pretty printing with indents and new lines.
  """
    xml_string = XmlToString(content, encoding, pretty)
    if win32 and os.linesep != "\r\n":
        xml_string = xml_string.replace("\n", "\r\n")

    default_encoding = locale.getdefaultlocale()[1]
    if default_encoding and default_encoding.upper() != encoding.upper():
        xml_string = xml_string.encode(encoding)

    # Get the old content
    try:
        with open(path) as file:
            existing = file.read()
    except OSError:
        existing = None

    # It has changed, write it
    if existing != xml_string:
        with open(path, "wb") as file:
            file.write(xml_string)


_xml_escape_map = {
    '"': "&quot;",
    "'": "&apos;",
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\n": "&#xA;",
    "\r": "&#xD;",
}


_xml_escape_re = re.compile("(%s)" % "|".join(map(re.escape, _xml_escape_map.keys())))


def _XmlEscape(value, attr=False):
    """ Escape a string for inclusion in XML."""

    def replace(match):
        m = match.string[match.start() : match.end()]
        # don't replace single quotes in attrs
        if attr and m == "'":
            return m
        return _xml_escape_map[m]

    return _xml_escape_re.sub(replace, value)
