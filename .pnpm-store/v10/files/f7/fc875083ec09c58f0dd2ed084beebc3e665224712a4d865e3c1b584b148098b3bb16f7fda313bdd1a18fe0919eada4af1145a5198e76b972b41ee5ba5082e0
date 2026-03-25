# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Xcode project file generator.

This module is both an Xcode project file generator and a documentation of the
Xcode project file format.  Knowledge of the project file format was gained
based on extensive experience with Xcode, and by making changes to projects in
Xcode.app and observing the resultant changes in the associated project files.

XCODE PROJECT FILES

The generator targets the file format as written by Xcode 3.2 (specifically,
3.2.6), but past experience has taught that the format has not changed
significantly in the past several years, and future versions of Xcode are able
to read older project files.

Xcode project files are "bundled": the project "file" from an end-user's
perspective is actually a directory with an ".xcodeproj" extension.  The
project file from this module's perspective is actually a file inside this
directory, always named "project.pbxproj".  This file contains a complete
description of the project and is all that is needed to use the xcodeproj.
Other files contained in the xcodeproj directory are simply used to store
per-user settings, such as the state of various UI elements in the Xcode
application.

The project.pbxproj file is a property list, stored in a format almost
identical to the NeXTstep property list format.  The file is able to carry
Unicode data, and is encoded in UTF-8.  The root element in the property list
is a dictionary that contains several properties of minimal interest, and two
properties of immense interest.  The most important property is a dictionary
named "objects".  The entire structure of the project is represented by the
children of this property.  The objects dictionary is keyed by unique 96-bit
values represented by 24 uppercase hexadecimal characters.  Each value in the
objects dictionary is itself a dictionary, describing an individual object.

Each object in the dictionary is a member of a class, which is identified by
the "isa" property of each object.  A variety of classes are represented in a
project file.  Objects can refer to other objects by ID, using the 24-character
hexadecimal object key.  A project's objects form a tree, with a root object
of class PBXProject at the root.  As an example, the PBXProject object serves
as parent to an XCConfigurationList object defining the build configurations
used in the project, a PBXGroup object serving as a container for all files
referenced in the project, and a list of target objects, each of which defines
a target in the project.  There are several different types of target object,
such as PBXNativeTarget and PBXAggregateTarget.  In this module, this
relationship is expressed by having each target type derive from an abstract
base named XCTarget.

The project.pbxproj file's root dictionary also contains a property, sibling to
the "objects" dictionary, named "rootObject".  The value of rootObject is a
24-character object key referring to the root PBXProject object in the
objects dictionary.

In Xcode, every file used as input to a target or produced as a final product
of a target must appear somewhere in the hierarchy rooted at the PBXGroup
object referenced by the PBXProject's mainGroup property.  A PBXGroup is
generally represented as a folder in the Xcode application.  PBXGroups can
contain other PBXGroups as well as PBXFileReferences, which are pointers to
actual files.

Each XCTarget contains a list of build phases, represented in this module by
the abstract base XCBuildPhase.  Examples of concrete XCBuildPhase derivations
are PBXSourcesBuildPhase and PBXFrameworksBuildPhase, which correspond to the
"Compile Sources" and "Link Binary With Libraries" phases displayed in the
Xcode application.  Files used as input to these phases (for example, source
files in the former case and libraries and frameworks in the latter) are
represented by PBXBuildFile objects, referenced by elements of "files" lists
in XCTarget objects.  Each PBXBuildFile object refers to a PBXBuildFile
object as a "weak" reference: it does not "own" the PBXBuildFile, which is
owned by the root object's mainGroup or a descendant group.  In most cases, the
layer of indirection between an XCBuildPhase and a PBXFileReference via a
PBXBuildFile appears extraneous, but there's actually one reason for this:
file-specific compiler flags are added to the PBXBuildFile object so as to
allow a single file to be a member of multiple targets while having distinct
compiler flags for each.  These flags can be modified in the Xcode applciation
in the "Build" tab of a File Info window.

When a project is open in the Xcode application, Xcode will rewrite it.  As
such, this module is careful to adhere to the formatting used by Xcode, to
avoid insignificant changes appearing in the file when it is used in the
Xcode application.  This will keep version control repositories happy, and
makes it possible to compare a project file used in Xcode to one generated by
this module to determine if any significant changes were made in the
application.

Xcode has its own way of assigning 24-character identifiers to each object,
which is not duplicated here.  Because the identifier only is only generated
once, when an object is created, and is then left unchanged, there is no need
to attempt to duplicate Xcode's behavior in this area.  The generator is free
to select any identifier, even at random, to refer to the objects it creates,
and Xcode will retain those identifiers and use them when subsequently
rewriting the project file.  However, the generator would choose new random
identifiers each time the project files are generated, leading to difficulties
comparing "used" project files to "pristine" ones produced by this module,
and causing the appearance of changes as every object identifier is changed
when updated projects are checked in to a version control repository.  To
mitigate this problem, this module chooses identifiers in a more deterministic
way, by hashing a description of each object as well as its parent and ancestor
objects.  This strategy should result in minimal "shift" in IDs as successive
generations of project files are produced.

THIS MODULE

This module introduces several classes, all derived from the XCObject class.
Nearly all of the "brains" are built into the XCObject class, which understands
how to create and modify objects, maintain the proper tree structure, compute
identifiers, and print objects.  For the most part, classes derived from
XCObject need only provide a _schema class object, a dictionary that
expresses what properties objects of the class may contain.

Given this structure, it's possible to build a minimal project file by creating
objects of the appropriate types and making the proper connections:

  config_list = XCConfigurationList()
  group = PBXGroup()
  project = PBXProject({'buildConfigurationList': config_list,
                        'mainGroup': group})

With the project object set up, it can be added to an XCProjectFile object.
XCProjectFile is a pseudo-class in the sense that it is a concrete XCObject
subclass that does not actually correspond to a class type found in a project
file.  Rather, it is used to represent the project file's root dictionary.
Printing an XCProjectFile will print the entire project file, including the
full "objects" dictionary.

  project_file = XCProjectFile({'rootObject': project})
  project_file.ComputeIDs()
  project_file.Print()

Xcode project files are always encoded in UTF-8.  This module will accept
strings of either the str class or the unicode class.  Strings of class str
are assumed to already be encoded in UTF-8.  Obviously, if you're just using
ASCII, you won't encounter difficulties because ASCII is a UTF-8 subset.
Strings of class unicode are handled properly and encoded in UTF-8 when
a project file is output.
"""

import gyp.common
from functools import cmp_to_key
import hashlib
from operator import attrgetter
import posixpath
import re
import struct
import sys


def cmp(x, y):
    return (x > y) - (x < y)


# See XCObject._EncodeString.  This pattern is used to determine when a string
# can be printed unquoted.  Strings that match this pattern may be printed
# unquoted.  Strings that do not match must be quoted and may be further
# transformed to be properly encoded.  Note that this expression matches the
# characters listed with "+", for 1 or more occurrences: if a string is empty,
# it must not match this pattern, because it needs to be encoded as "".
_unquoted = re.compile("^[A-Za-z0-9$./_]+$")

# Strings that match this pattern are quoted regardless of what _unquoted says.
# Oddly, Xcode will quote any string with a run of three or more underscores.
_quoted = re.compile("___")

# This pattern should match any character that needs to be escaped by
# XCObject._EncodeString.  See that function.
_escaped = re.compile('[\\\\"]|[\x00-\x1f]')


# Used by SourceTreeAndPathFromPath
_path_leading_variable = re.compile(r"^\$\((.*?)\)(/(.*))?$")


def SourceTreeAndPathFromPath(input_path):
    """Given input_path, returns a tuple with sourceTree and path values.

  Examples:
    input_path     (source_tree, output_path)
    '$(VAR)/path'  ('VAR', 'path')
    '$(VAR)'       ('VAR', None)
    'path'         (None, 'path')
  """

    source_group_match = _path_leading_variable.match(input_path)
    if source_group_match:
        source_tree = source_group_match.group(1)
        output_path = source_group_match.group(3)  # This may be None.
    else:
        source_tree = None
        output_path = input_path

    return (source_tree, output_path)


def ConvertVariablesToShellSyntax(input_string):
    return re.sub(r"\$\((.*?)\)", "${\\1}", input_string)


class XCObject:
    """The abstract base of all class types used in Xcode project files.

  Class variables:
    _schema: A dictionary defining the properties of this class.  The keys to
             _schema are string property keys as used in project files.  Values
             are a list of four or five elements:
             [ is_list, property_type, is_strong, is_required, default ]
             is_list: True if the property described is a list, as opposed
                      to a single element.
             property_type: The type to use as the value of the property,
                            or if is_list is True, the type to use for each
                            element of the value's list.  property_type must
                            be an XCObject subclass, or one of the built-in
                            types str, int, or dict.
             is_strong: If property_type is an XCObject subclass, is_strong
                        is True to assert that this class "owns," or serves
                        as parent, to the property value (or, if is_list is
                        True, values).  is_strong must be False if
                        property_type is not an XCObject subclass.
             is_required: True if the property is required for the class.
                          Note that is_required being True does not preclude
                          an empty string ("", in the case of property_type
                          str) or list ([], in the case of is_list True) from
                          being set for the property.
             default: Optional.  If is_required is True, default may be set
                      to provide a default value for objects that do not supply
                      their own value.  If is_required is True and default
                      is not provided, users of the class must supply their own
                      value for the property.
             Note that although the values of the array are expressed in
             boolean terms, subclasses provide values as integers to conserve
             horizontal space.
    _should_print_single_line: False in XCObject.  Subclasses whose objects
                               should be written to the project file in the
                               alternate single-line format, such as
                               PBXFileReference and PBXBuildFile, should
                               set this to True.
    _encode_transforms: Used by _EncodeString to encode unprintable characters.
                        The index into this list is the ordinal of the
                        character to transform; each value is a string
                        used to represent the character in the output.  XCObject
                        provides an _encode_transforms list suitable for most
                        XCObject subclasses.
    _alternate_encode_transforms: Provided for subclasses that wish to use
                                  the alternate encoding rules.  Xcode seems
                                  to use these rules when printing objects in
                                  single-line format.  Subclasses that desire
                                  this behavior should set _encode_transforms
                                  to _alternate_encode_transforms.
    _hashables: A list of XCObject subclasses that can be hashed by ComputeIDs
                to construct this object's ID.  Most classes that need custom
                hashing behavior should do it by overriding Hashables,
                but in some cases an object's parent may wish to push a
                hashable value into its child, and it can do so by appending
                to _hashables.
  Attributes:
    id: The object's identifier, a 24-character uppercase hexadecimal string.
        Usually, objects being created should not set id until the entire
        project file structure is built.  At that point, UpdateIDs() should
        be called on the root object to assign deterministic values for id to
        each object in the tree.
    parent: The object's parent.  This is set by a parent XCObject when a child
            object is added to it.
    _properties: The object's property dictionary.  An object's properties are
                 described by its class' _schema variable.
  """

    _schema = {}
    _should_print_single_line = False

    # See _EncodeString.
    _encode_transforms = []
    i = 0
    while i < ord(" "):
        _encode_transforms.append("\\U%04x" % i)
        i = i + 1
    _encode_transforms[7] = "\\a"
    _encode_transforms[8] = "\\b"
    _encode_transforms[9] = "\\t"
    _encode_transforms[10] = "\\n"
    _encode_transforms[11] = "\\v"
    _encode_transforms[12] = "\\f"
    _encode_transforms[13] = "\\n"

    _alternate_encode_transforms = list(_encode_transforms)
    _alternate_encode_transforms[9] = chr(9)
    _alternate_encode_transforms[10] = chr(10)
    _alternate_encode_transforms[11] = chr(11)

    def __init__(self, properties=None, id=None, parent=None):
        self.id = id
        self.parent = parent
        self._properties = {}
        self._hashables = []
        self._SetDefaultsFromSchema()
        self.UpdateProperties(properties)

    def __repr__(self):
        try:
            name = self.Name()
        except NotImplementedError:
            return f"<{self.__class__.__name__} at 0x{id(self):x}>"
        return f"<{self.__class__.__name__} {name!r} at 0x{id(self):x}>"

    def Copy(self):
        """Make a copy of this object.

    The new object will have its own copy of lists and dicts.  Any XCObject
    objects owned by this object (marked "strong") will be copied in the
    new object, even those found in lists.  If this object has any weak
    references to other XCObjects, the same references are added to the new
    object without making a copy.
    """

        that = self.__class__(id=self.id, parent=self.parent)
        for key, value in self._properties.items():
            is_strong = self._schema[key][2]

            if isinstance(value, XCObject):
                if is_strong:
                    new_value = value.Copy()
                    new_value.parent = that
                    that._properties[key] = new_value
                else:
                    that._properties[key] = value
            elif isinstance(value, (str, int)):
                that._properties[key] = value
            elif isinstance(value, list):
                if is_strong:
                    # If is_strong is True, each element is an XCObject, so it's safe to
                    # call Copy.
                    that._properties[key] = []
                    for item in value:
                        new_item = item.Copy()
                        new_item.parent = that
                        that._properties[key].append(new_item)
                else:
                    that._properties[key] = value[:]
            elif isinstance(value, dict):
                # dicts are never strong.
                if is_strong:
                    raise TypeError(
                        "Strong dict for key " + key + " in " + self.__class__.__name__
                    )
                else:
                    that._properties[key] = value.copy()
            else:
                raise TypeError(
                    "Unexpected type "
                    + value.__class__.__name__
                    + " for key "
                    + key
                    + " in "
                    + self.__class__.__name__
                )

        return that

    def Name(self):
        """Return the name corresponding to an object.

    Not all objects necessarily need to be nameable, and not all that do have
    a "name" property.  Override as needed.
    """

        # If the schema indicates that "name" is required, try to access the
        # property even if it doesn't exist.  This will result in a KeyError
        # being raised for the property that should be present, which seems more
        # appropriate than NotImplementedError in this case.
        if "name" in self._properties or (
            "name" in self._schema and self._schema["name"][3]
        ):
            return self._properties["name"]

        raise NotImplementedError(self.__class__.__name__ + " must implement Name")

    def Comment(self):
        """Return a comment string for the object.

    Most objects just use their name as the comment, but PBXProject uses
    different values.

    The returned comment is not escaped and does not have any comment marker
    strings applied to it.
    """

        return self.Name()

    def Hashables(self):
        hashables = [self.__class__.__name__]

        name = self.Name()
        if name is not None:
            hashables.append(name)

        hashables.extend(self._hashables)

        return hashables

    def HashablesForChild(self):
        return None

    def ComputeIDs(self, recursive=True, overwrite=True, seed_hash=None):
        """Set "id" properties deterministically.

    An object's "id" property is set based on a hash of its class type and
    name, as well as the class type and name of all ancestor objects.  As
    such, it is only advisable to call ComputeIDs once an entire project file
    tree is built.

    If recursive is True, recurse into all descendant objects and update their
    hashes.

    If overwrite is True, any existing value set in the "id" property will be
    replaced.
    """

        def _HashUpdate(hash, data):
            """Update hash with data's length and contents.

      If the hash were updated only with the value of data, it would be
      possible for clowns to induce collisions by manipulating the names of
      their objects.  By adding the length, it's exceedingly less likely that
      ID collisions will be encountered, intentionally or not.
      """

            hash.update(struct.pack(">i", len(data)))
            if isinstance(data, str):
                data = data.encode("utf-8")
            hash.update(data)

        if seed_hash is None:
            seed_hash = hashlib.sha1()

        hash = seed_hash.copy()

        hashables = self.Hashables()
        assert len(hashables) > 0
        for hashable in hashables:
            _HashUpdate(hash, hashable)

        if recursive:
            hashables_for_child = self.HashablesForChild()
            if hashables_for_child is None:
                child_hash = hash
            else:
                assert len(hashables_for_child) > 0
                child_hash = seed_hash.copy()
                for hashable in hashables_for_child:
                    _HashUpdate(child_hash, hashable)

            for child in self.Children():
                child.ComputeIDs(recursive, overwrite, child_hash)

        if overwrite or self.id is None:
            # Xcode IDs are only 96 bits (24 hex characters), but a SHA-1 digest is
            # is 160 bits.  Instead of throwing out 64 bits of the digest, xor them
            # into the portion that gets used.
            assert hash.digest_size % 4 == 0
            digest_int_count = hash.digest_size // 4
            digest_ints = struct.unpack(">" + "I" * digest_int_count, hash.digest())
            id_ints = [0, 0, 0]
            for index in range(0, digest_int_count):
                id_ints[index % 3] ^= digest_ints[index]
            self.id = "%08X%08X%08X" % tuple(id_ints)

    def EnsureNoIDCollisions(self):
        """Verifies that no two objects have the same ID.  Checks all descendants.
    """

        ids = {}
        descendants = self.Descendants()
        for descendant in descendants:
            if descendant.id in ids:
                other = ids[descendant.id]
                raise KeyError(
                    'Duplicate ID %s, objects "%s" and "%s" in "%s"'
                    % (
                        descendant.id,
                        str(descendant._properties),
                        str(other._properties),
                        self._properties["rootObject"].Name(),
                    )
                )
            ids[descendant.id] = descendant

    def Children(self):
        """Returns a list of all of this object's owned (strong) children."""

        children = []
        for property, attributes in self._schema.items():
            (is_list, property_type, is_strong) = attributes[0:3]
            if is_strong and property in self._properties:
                if not is_list:
                    children.append(self._properties[property])
                else:
                    children.extend(self._properties[property])
        return children

    def Descendants(self):
        """Returns a list of all of this object's descendants, including this
    object.
    """

        children = self.Children()
        descendants = [self]
        for child in children:
            descendants.extend(child.Descendants())
        return descendants

    def PBXProjectAncestor(self):
        # The base case for recursion is defined at PBXProject.PBXProjectAncestor.
        if self.parent:
            return self.parent.PBXProjectAncestor()
        return None

    def _EncodeComment(self, comment):
        """Encodes a comment to be placed in the project file output, mimicking
    Xcode behavior.
    """

        # This mimics Xcode behavior by wrapping the comment in "/*" and "*/".  If
        # the string already contains a "*/", it is turned into "(*)/".  This keeps
        # the file writer from outputting something that would be treated as the
        # end of a comment in the middle of something intended to be entirely a
        # comment.

        return "/* " + comment.replace("*/", "(*)/") + " */"

    def _EncodeTransform(self, match):
        # This function works closely with _EncodeString.  It will only be called
        # by re.sub with match.group(0) containing a character matched by the
        # the _escaped expression.
        char = match.group(0)

        # Backslashes (\) and quotation marks (") are always replaced with a
        # backslash-escaped version of the same.  Everything else gets its
        # replacement from the class' _encode_transforms array.
        if char == "\\":
            return "\\\\"
        if char == '"':
            return '\\"'
        return self._encode_transforms[ord(char)]

    def _EncodeString(self, value):
        """Encodes a string to be placed in the project file output, mimicking
    Xcode behavior.
    """

        # Use quotation marks when any character outside of the range A-Z, a-z, 0-9,
        # $ (dollar sign), . (period), and _ (underscore) is present.  Also use
        # quotation marks to represent empty strings.
        #
        # Escape " (double-quote) and \ (backslash) by preceding them with a
        # backslash.
        #
        # Some characters below the printable ASCII range are encoded specially:
        #     7 ^G BEL is encoded as "\a"
        #     8 ^H BS  is encoded as "\b"
        #    11 ^K VT  is encoded as "\v"
        #    12 ^L NP  is encoded as "\f"
        #   127 ^? DEL is passed through as-is without escaping
        #  - In PBXFileReference and PBXBuildFile objects:
        #     9 ^I HT  is passed through as-is without escaping
        #    10 ^J NL  is passed through as-is without escaping
        #    13 ^M CR  is passed through as-is without escaping
        #  - In other objects:
        #     9 ^I HT  is encoded as "\t"
        #    10 ^J NL  is encoded as "\n"
        #    13 ^M CR  is encoded as "\n" rendering it indistinguishable from
        #              10 ^J NL
        # All other characters within the ASCII control character range (0 through
        # 31 inclusive) are encoded as "\U001f" referring to the Unicode code point
        # in hexadecimal.  For example, character 14 (^N SO) is encoded as "\U000e".
        # Characters above the ASCII range are passed through to the output encoded
        # as UTF-8 without any escaping.  These mappings are contained in the
        # class' _encode_transforms list.

        if _unquoted.search(value) and not _quoted.search(value):
            return value

        return '"' + _escaped.sub(self._EncodeTransform, value) + '"'

    def _XCPrint(self, file, tabs, line):
        file.write("\t" * tabs + line)

    def _XCPrintableValue(self, tabs, value, flatten_list=False):
        """Returns a representation of value that may be printed in a project file,
    mimicking Xcode's behavior.

    _XCPrintableValue can handle str and int values, XCObjects (which are
    made printable by returning their id property), and list and dict objects
    composed of any of the above types.  When printing a list or dict, and
    _should_print_single_line is False, the tabs parameter is used to determine
    how much to indent the lines corresponding to the items in the list or
    dict.

    If flatten_list is True, single-element lists will be transformed into
    strings.
    """

        printable = ""
        comment = None

        if self._should_print_single_line:
            sep = " "
            element_tabs = ""
            end_tabs = ""
        else:
            sep = "\n"
            element_tabs = "\t" * (tabs + 1)
            end_tabs = "\t" * tabs

        if isinstance(value, XCObject):
            printable += value.id
            comment = value.Comment()
        elif isinstance(value, str):
            printable += self._EncodeString(value)
        elif isinstance(value, str):
            printable += self._EncodeString(value.encode("utf-8"))
        elif isinstance(value, int):
            printable += str(value)
        elif isinstance(value, list):
            if flatten_list and len(value) <= 1:
                if len(value) == 0:
                    printable += self._EncodeString("")
                else:
                    printable += self._EncodeString(value[0])
            else:
                printable = "(" + sep
                for item in value:
                    printable += (
                        element_tabs
                        + self._XCPrintableValue(tabs + 1, item, flatten_list)
                        + ","
                        + sep
                    )
                printable += end_tabs + ")"
        elif isinstance(value, dict):
            printable = "{" + sep
            for item_key, item_value in sorted(value.items()):
                printable += (
                    element_tabs
                    + self._XCPrintableValue(tabs + 1, item_key, flatten_list)
                    + " = "
                    + self._XCPrintableValue(tabs + 1, item_value, flatten_list)
                    + ";"
                    + sep
                )
            printable += end_tabs + "}"
        else:
            raise TypeError("Can't make " + value.__class__.__name__ + " printable")

        if comment:
            printable += " " + self._EncodeComment(comment)

        return printable

    def _XCKVPrint(self, file, tabs, key, value):
        """Prints a key and value, members of an XCObject's _properties dictionary,
    to file.

    tabs is an int identifying the indentation level.  If the class'
    _should_print_single_line variable is True, tabs is ignored and the
    key-value pair will be followed by a space insead of a newline.
    """

        if self._should_print_single_line:
            printable = ""
            after_kv = " "
        else:
            printable = "\t" * tabs
            after_kv = "\n"

        # Xcode usually prints remoteGlobalIDString values in PBXContainerItemProxy
        # objects without comments.  Sometimes it prints them with comments, but
        # the majority of the time, it doesn't.  To avoid unnecessary changes to
        # the project file after Xcode opens it, don't write comments for
        # remoteGlobalIDString.  This is a sucky hack and it would certainly be
        # cleaner to extend the schema to indicate whether or not a comment should
        # be printed, but since this is the only case where the problem occurs and
        # Xcode itself can't seem to make up its mind, the hack will suffice.
        #
        # Also see PBXContainerItemProxy._schema['remoteGlobalIDString'].
        if key == "remoteGlobalIDString" and isinstance(self, PBXContainerItemProxy):
            value_to_print = value.id
        else:
            value_to_print = value

        # PBXBuildFile's settings property is represented in the output as a dict,
        # but a hack here has it represented as a string. Arrange to strip off the
        # quotes so that it shows up in the output as expected.
        if key == "settings" and isinstance(self, PBXBuildFile):
            strip_value_quotes = True
        else:
            strip_value_quotes = False

        # In another one-off, let's set flatten_list on buildSettings properties
        # of XCBuildConfiguration objects, because that's how Xcode treats them.
        if key == "buildSettings" and isinstance(self, XCBuildConfiguration):
            flatten_list = True
        else:
            flatten_list = False

        try:
            printable_key = self._XCPrintableValue(tabs, key, flatten_list)
            printable_value = self._XCPrintableValue(tabs, value_to_print, flatten_list)
            if (
                strip_value_quotes
                and len(printable_value) > 1
                and printable_value[0] == '"'
                and printable_value[-1] == '"'
            ):
                printable_value = printable_value[1:-1]
            printable += printable_key + " = " + printable_value + ";" + after_kv
        except TypeError as e:
            gyp.common.ExceptionAppend(e, 'while printing key "%s"' % key)
            raise

        self._XCPrint(file, 0, printable)

    def Print(self, file=sys.stdout):
        """Prints a reprentation of this object to file, adhering to Xcode output
    formatting.
    """

        self.VerifyHasRequiredProperties()

        if self._should_print_single_line:
            # When printing an object in a single line, Xcode doesn't put any space
            # between the beginning of a dictionary (or presumably a list) and the
            # first contained item, so you wind up with snippets like
            #   ...CDEF = {isa = PBXFileReference; fileRef = 0123...
            # If it were me, I would have put a space in there after the opening
            # curly, but I guess this is just another one of those inconsistencies
            # between how Xcode prints PBXFileReference and PBXBuildFile objects as
            # compared to other objects.  Mimic Xcode's behavior here by using an
            # empty string for sep.
            sep = ""
            end_tabs = 0
        else:
            sep = "\n"
            end_tabs = 2

        # Start the object.  For example, '\t\tPBXProject = {\n'.
        self._XCPrint(file, 2, self._XCPrintableValue(2, self) + " = {" + sep)

        # "isa" isn't in the _properties dictionary, it's an intrinsic property
        # of the class which the object belongs to.  Xcode always outputs "isa"
        # as the first element of an object dictionary.
        self._XCKVPrint(file, 3, "isa", self.__class__.__name__)

        # The remaining elements of an object dictionary are sorted alphabetically.
        for property, value in sorted(self._properties.items()):
            self._XCKVPrint(file, 3, property, value)

        # End the object.
        self._XCPrint(file, end_tabs, "};\n")

    def UpdateProperties(self, properties, do_copy=False):
        """Merge the supplied properties into the _properties dictionary.

    The input properties must adhere to the class schema or a KeyError or
    TypeError exception will be raised.  If adding an object of an XCObject
    subclass and the schema indicates a strong relationship, the object's
    parent will be set to this object.

    If do_copy is True, then lists, dicts, strong-owned XCObjects, and
    strong-owned XCObjects in lists will be copied instead of having their
    references added.
    """

        if properties is None:
            return

        for property, value in properties.items():
            # Make sure the property is in the schema.
            if property not in self._schema:
                raise KeyError(property + " not in " + self.__class__.__name__)

            # Make sure the property conforms to the schema.
            (is_list, property_type, is_strong) = self._schema[property][0:3]
            if is_list:
                if value.__class__ != list:
                    raise TypeError(
                        property
                        + " of "
                        + self.__class__.__name__
                        + " must be list, not "
                        + value.__class__.__name__
                    )
                for item in value:
                    if not isinstance(item, property_type) and not (
                        isinstance(item, str) and property_type == str
                    ):
                        # Accept unicode where str is specified.  str is treated as
                        # UTF-8-encoded.
                        raise TypeError(
                            "item of "
                            + property
                            + " of "
                            + self.__class__.__name__
                            + " must be "
                            + property_type.__name__
                            + ", not "
                            + item.__class__.__name__
                        )
            elif not isinstance(value, property_type) and not (
                isinstance(value, str) and property_type == str
            ):
                # Accept unicode where str is specified.  str is treated as
                # UTF-8-encoded.
                raise TypeError(
                    property
                    + " of "
                    + self.__class__.__name__
                    + " must be "
                    + property_type.__name__
                    + ", not "
                    + value.__class__.__name__
                )

            # Checks passed, perform the assignment.
            if do_copy:
                if isinstance(value, XCObject):
                    if is_strong:
                        self._properties[property] = value.Copy()
                    else:
                        self._properties[property] = value
                elif isinstance(value, (str, int)):
                    self._properties[property] = value
                elif isinstance(value, list):
                    if is_strong:
                        # If is_strong is True, each element is an XCObject,
                        # so it's safe to call Copy.
                        self._properties[property] = []
                        for item in value:
                            self._properties[property].append(item.Copy())
                    else:
                        self._properties[property] = value[:]
                elif isinstance(value, dict):
                    self._properties[property] = value.copy()
                else:
                    raise TypeError(
                        "Don't know how to copy a "
                        + value.__class__.__name__
                        + " object for "
                        + property
                        + " in "
                        + self.__class__.__name__
                    )
            else:
                self._properties[property] = value

            # Set up the child's back-reference to this object.  Don't use |value|
            # any more because it may not be right if do_copy is true.
            if is_strong:
                if not is_list:
                    self._properties[property].parent = self
                else:
                    for item in self._properties[property]:
                        item.parent = self

    def HasProperty(self, key):
        return key in self._properties

    def GetProperty(self, key):
        return self._properties[key]

    def SetProperty(self, key, value):
        self.UpdateProperties({key: value})

    def DelProperty(self, key):
        if key in self._properties:
            del self._properties[key]

    def AppendProperty(self, key, value):
        # TODO(mark): Support ExtendProperty too (and make this call that)?

        # Schema validation.
        if key not in self._schema:
            raise KeyError(key + " not in " + self.__class__.__name__)

        (is_list, property_type, is_strong) = self._schema[key][0:3]
        if not is_list:
            raise TypeError(key + " of " + self.__class__.__name__ + " must be list")
        if not isinstance(value, property_type):
            raise TypeError(
                "item of "
                + key
                + " of "
                + self.__class__.__name__
                + " must be "
                + property_type.__name__
                + ", not "
                + value.__class__.__name__
            )

        # If the property doesn't exist yet, create a new empty list to receive the
        # item.
        self._properties[key] = self._properties.get(key, [])

        # Set up the ownership link.
        if is_strong:
            value.parent = self

        # Store the item.
        self._properties[key].append(value)

    def VerifyHasRequiredProperties(self):
        """Ensure that all properties identified as required by the schema are
    set.
    """

        # TODO(mark): A stronger verification mechanism is needed.  Some
        # subclasses need to perform validation beyond what the schema can enforce.
        for property, attributes in self._schema.items():
            (is_list, property_type, is_strong, is_required) = attributes[0:4]
            if is_required and property not in self._properties:
                raise KeyError(self.__class__.__name__ + " requires " + property)

    def _SetDefaultsFromSchema(self):
        """Assign object default values according to the schema.  This will not
    overwrite properties that have already been set."""

        defaults = {}
        for property, attributes in self._schema.items():
            (is_list, property_type, is_strong, is_required) = attributes[0:4]
            if (
                is_required
                and len(attributes) >= 5
                and property not in self._properties
            ):
                default = attributes[4]

                defaults[property] = default

        if len(defaults) > 0:
            # Use do_copy=True so that each new object gets its own copy of strong
            # objects, lists, and dicts.
            self.UpdateProperties(defaults, do_copy=True)


class XCHierarchicalElement(XCObject):
    """Abstract base for PBXGroup and PBXFileReference.  Not represented in a
  project file."""

    # TODO(mark): Do name and path belong here?  Probably so.
    # If path is set and name is not, name may have a default value.  Name will
    # be set to the basename of path, if the basename of path is different from
    # the full value of path.  If path is already just a leaf name, name will
    # not be set.
    _schema = XCObject._schema.copy()
    _schema.update(
        {
            "comments": [0, str, 0, 0],
            "fileEncoding": [0, str, 0, 0],
            "includeInIndex": [0, int, 0, 0],
            "indentWidth": [0, int, 0, 0],
            "lineEnding": [0, int, 0, 0],
            "sourceTree": [0, str, 0, 1, "<group>"],
            "tabWidth": [0, int, 0, 0],
            "usesTabs": [0, int, 0, 0],
            "wrapsLines": [0, int, 0, 0],
        }
    )

    def __init__(self, properties=None, id=None, parent=None):
        # super
        XCObject.__init__(self, properties, id, parent)
        if "path" in self._properties and "name" not in self._properties:
            path = self._properties["path"]
            name = posixpath.basename(path)
            if name != "" and path != name:
                self.SetProperty("name", name)

        if "path" in self._properties and (
            "sourceTree" not in self._properties
            or self._properties["sourceTree"] == "<group>"
        ):
            # If the pathname begins with an Xcode variable like "$(SDKROOT)/", take
            # the variable out and make the path be relative to that variable by
            # assigning the variable name as the sourceTree.
            (source_tree, path) = SourceTreeAndPathFromPath(self._properties["path"])
            if source_tree is not None:
                self._properties["sourceTree"] = source_tree
            if path is not None:
                self._properties["path"] = path
            if (
                source_tree is not None
                and path is None
                and "name" not in self._properties
            ):
                # The path was of the form "$(SDKROOT)" with no path following it.
                # This object is now relative to that variable, so it has no path
                # attribute of its own.  It does, however, keep a name.
                del self._properties["path"]
                self._properties["name"] = source_tree

    def Name(self):
        if "name" in self._properties:
            return self._properties["name"]
        elif "path" in self._properties:
            return self._properties["path"]
        else:
            # This happens in the case of the root PBXGroup.
            return None

    def Hashables(self):
        """Custom hashables for XCHierarchicalElements.

    XCHierarchicalElements are special.  Generally, their hashes shouldn't
    change if the paths don't change.  The normal XCObject implementation of
    Hashables adds a hashable for each object, which means that if
    the hierarchical structure changes (possibly due to changes caused when
    TakeOverOnlyChild runs and encounters slight changes in the hierarchy),
    the hashes will change.  For example, if a project file initially contains
    a/b/f1 and a/b becomes collapsed into a/b, f1 will have a single parent
    a/b.  If someone later adds a/f2 to the project file, a/b can no longer be
    collapsed, and f1 winds up with parent b and grandparent a.  That would
    be sufficient to change f1's hash.

    To counteract this problem, hashables for all XCHierarchicalElements except
    for the main group (which has neither a name nor a path) are taken to be
    just the set of path components.  Because hashables are inherited from
    parents, this provides assurance that a/b/f1 has the same set of hashables
    whether its parent is b or a/b.

    The main group is a special case.  As it is permitted to have no name or
    path, it is permitted to use the standard XCObject hash mechanism.  This
    is not considered a problem because there can be only one main group.
    """

        if self == self.PBXProjectAncestor()._properties["mainGroup"]:
            # super
            return XCObject.Hashables(self)

        hashables = []

        # Put the name in first, ensuring that if TakeOverOnlyChild collapses
        # children into a top-level group like "Source", the name always goes
        # into the list of hashables without interfering with path components.
        if "name" in self._properties:
            # Make it less likely for people to manipulate hashes by following the
            # pattern of always pushing an object type value onto the list first.
            hashables.append(self.__class__.__name__ + ".name")
            hashables.append(self._properties["name"])

        # NOTE: This still has the problem that if an absolute path is encountered,
        # including paths with a sourceTree, they'll still inherit their parents'
        # hashables, even though the paths aren't relative to their parents.  This
        # is not expected to be much of a problem in practice.
        path = self.PathFromSourceTreeAndPath()
        if path is not None:
            components = path.split(posixpath.sep)
            for component in components:
                hashables.append(self.__class__.__name__ + ".path")
                hashables.append(component)

        hashables.extend(self._hashables)

        return hashables

    def Compare(self, other):
        # Allow comparison of these types.  PBXGroup has the highest sort rank;
        # PBXVariantGroup is treated as equal to PBXFileReference.
        valid_class_types = {
            PBXFileReference: "file",
            PBXGroup: "group",
            PBXVariantGroup: "file",
        }
        self_type = valid_class_types[self.__class__]
        other_type = valid_class_types[other.__class__]

        if self_type == other_type:
            # If the two objects are of the same sort rank, compare their names.
            return cmp(self.Name(), other.Name())

        # Otherwise, sort groups before everything else.
        if self_type == "group":
            return -1
        return 1

    def CompareRootGroup(self, other):
        # This function should be used only to compare direct children of the
        # containing PBXProject's mainGroup.  These groups should appear in the
        # listed order.
        # TODO(mark): "Build" is used by gyp.generator.xcode, perhaps the
        # generator should have a way of influencing this list rather than having
        # to hardcode for the generator here.
        order = [
            "Source",
            "Intermediates",
            "Projects",
            "Frameworks",
            "Products",
            "Build",
        ]

        # If the groups aren't in the listed order, do a name comparison.
        # Otherwise, groups in the listed order should come before those that
        # aren't.
        self_name = self.Name()
        other_name = other.Name()
        self_in = isinstance(self, PBXGroup) and self_name in order
        other_in = isinstance(self, PBXGroup) and other_name in order
        if not self_in and not other_in:
            return self.Compare(other)
        if self_name in order and other_name not in order:
            return -1
        if other_name in order and self_name not in order:
            return 1

        # If both groups are in the listed order, go by the defined order.
        self_index = order.index(self_name)
        other_index = order.index(other_name)
        if self_index < other_index:
            return -1
        if self_index > other_index:
            return 1
        return 0

    def PathFromSourceTreeAndPath(self):
        # Turn the object's sourceTree and path properties into a single flat
        # string of a form comparable to the path parameter.  If there's a
        # sourceTree property other than "<group>", wrap it in $(...) for the
        # comparison.
        components = []
        if self._properties["sourceTree"] != "<group>":
            components.append("$(" + self._properties["sourceTree"] + ")")
        if "path" in self._properties:
            components.append(self._properties["path"])

        if len(components) > 0:
            return posixpath.join(*components)

        return None

    def FullPath(self):
        # Returns a full path to self relative to the project file, or relative
        # to some other source tree.  Start with self, and walk up the chain of
        # parents prepending their paths, if any, until no more parents are
        # available (project-relative path) or until a path relative to some
        # source tree is found.
        xche = self
        path = None
        while isinstance(xche, XCHierarchicalElement) and (
            path is None or (not path.startswith("/") and not path.startswith("$"))
        ):
            this_path = xche.PathFromSourceTreeAndPath()
            if this_path is not None and path is not None:
                path = posixpath.join(this_path, path)
            elif this_path is not None:
                path = this_path
            xche = xche.parent

        return path


class PBXGroup(XCHierarchicalElement):
    """
  Attributes:
    _children_by_path: Maps pathnames of children of this PBXGroup to the
      actual child XCHierarchicalElement objects.
    _variant_children_by_name_and_path: Maps (name, path) tuples of
      PBXVariantGroup children to the actual child PBXVariantGroup objects.
  """

    _schema = XCHierarchicalElement._schema.copy()
    _schema.update(
        {
            "children": [1, XCHierarchicalElement, 1, 1, []],
            "name": [0, str, 0, 0],
            "path": [0, str, 0, 0],
        }
    )

    def __init__(self, properties=None, id=None, parent=None):
        # super
        XCHierarchicalElement.__init__(self, properties, id, parent)
        self._children_by_path = {}
        self._variant_children_by_name_and_path = {}
        for child in self._properties.get("children", []):
            self._AddChildToDicts(child)

    def Hashables(self):
        # super
        hashables = XCHierarchicalElement.Hashables(self)

        # It is not sufficient to just rely on name and parent to build a unique
        # hashable : a node could have two child PBXGroup sharing a common name.
        # To add entropy the hashable is enhanced with the names of all its
        # children.
        for child in self._properties.get("children", []):
            child_name = child.Name()
            if child_name is not None:
                hashables.append(child_name)

        return hashables

    def HashablesForChild(self):
        # To avoid a circular reference the hashables used to compute a child id do
        # not include the child names.
        return XCHierarchicalElement.Hashables(self)

    def _AddChildToDicts(self, child):
        # Sets up this PBXGroup object's dicts to reference the child properly.
        child_path = child.PathFromSourceTreeAndPath()
        if child_path:
            if child_path in self._children_by_path:
                raise ValueError("Found multiple children with path " + child_path)
            self._children_by_path[child_path] = child

        if isinstance(child, PBXVariantGroup):
            child_name = child._properties.get("name", None)
            key = (child_name, child_path)
            if key in self._variant_children_by_name_and_path:
                raise ValueError(
                    "Found multiple PBXVariantGroup children with "
                    + "name "
                    + str(child_name)
                    + " and path "
                    + str(child_path)
                )
            self._variant_children_by_name_and_path[key] = child

    def AppendChild(self, child):
        # Callers should use this instead of calling
        # AppendProperty('children', child) directly because this function
        # maintains the group's dicts.
        self.AppendProperty("children", child)
        self._AddChildToDicts(child)

    def GetChildByName(self, name):
        # This is not currently optimized with a dict as GetChildByPath is because
        # it has few callers.  Most callers probably want GetChildByPath.  This
        # function is only useful to get children that have names but no paths,
        # which is rare.  The children of the main group ("Source", "Products",
        # etc.) is pretty much the only case where this likely to come up.
        #
        # TODO(mark): Maybe this should raise an error if more than one child is
        # present with the same name.
        if "children" not in self._properties:
            return None

        for child in self._properties["children"]:
            if child.Name() == name:
                return child

        return None

    def GetChildByPath(self, path):
        if not path:
            return None

        if path in self._children_by_path:
            return self._children_by_path[path]

        return None

    def GetChildByRemoteObject(self, remote_object):
        # This method is a little bit esoteric.  Given a remote_object, which
        # should be a PBXFileReference in another project file, this method will
        # return this group's PBXReferenceProxy object serving as a local proxy
        # for the remote PBXFileReference.
        #
        # This function might benefit from a dict optimization as GetChildByPath
        # for some workloads, but profiling shows that it's not currently a
        # problem.
        if "children" not in self._properties:
            return None

        for child in self._properties["children"]:
            if not isinstance(child, PBXReferenceProxy):
                continue

            container_proxy = child._properties["remoteRef"]
            if container_proxy._properties["remoteGlobalIDString"] == remote_object:
                return child

        return None

    def AddOrGetFileByPath(self, path, hierarchical):
        """Returns an existing or new file reference corresponding to path.

    If hierarchical is True, this method will create or use the necessary
    hierarchical group structure corresponding to path.  Otherwise, it will
    look in and create an item in the current group only.

    If an existing matching reference is found, it is returned, otherwise, a
    new one will be created, added to the correct group, and returned.

    If path identifies a directory by virtue of carrying a trailing slash,
    this method returns a PBXFileReference of "folder" type.  If path
    identifies a variant, by virtue of it identifying a file inside a directory
    with an ".lproj" extension, this method returns a PBXVariantGroup
    containing the variant named by path, and possibly other variants.  For
    all other paths, a "normal" PBXFileReference will be returned.
    """

        # Adding or getting a directory?  Directories end with a trailing slash.
        is_dir = False
        if path.endswith("/"):
            is_dir = True
        path = posixpath.normpath(path)
        if is_dir:
            path = path + "/"

        # Adding or getting a variant?  Variants are files inside directories
        # with an ".lproj" extension.  Xcode uses variants for localization.  For
        # a variant path/to/Language.lproj/MainMenu.nib, put a variant group named
        # MainMenu.nib inside path/to, and give it a variant named Language.  In
        # this example, grandparent would be set to path/to and parent_root would
        # be set to Language.
        variant_name = None
        parent = posixpath.dirname(path)
        grandparent = posixpath.dirname(parent)
        parent_basename = posixpath.basename(parent)
        (parent_root, parent_ext) = posixpath.splitext(parent_basename)
        if parent_ext == ".lproj":
            variant_name = parent_root
        if grandparent == "":
            grandparent = None

        # Putting a directory inside a variant group is not currently supported.
        assert not is_dir or variant_name is None

        path_split = path.split(posixpath.sep)
        if (
            len(path_split) == 1
            or ((is_dir or variant_name is not None) and len(path_split) == 2)
            or not hierarchical
        ):
            # The PBXFileReference or PBXVariantGroup will be added to or gotten from
            # this PBXGroup, no recursion necessary.
            if variant_name is None:
                # Add or get a PBXFileReference.
                file_ref = self.GetChildByPath(path)
                if file_ref is not None:
                    assert file_ref.__class__ == PBXFileReference
                else:
                    file_ref = PBXFileReference({"path": path})
                    self.AppendChild(file_ref)
            else:
                # Add or get a PBXVariantGroup.  The variant group name is the same
                # as the basename (MainMenu.nib in the example above).  grandparent
                # specifies the path to the variant group itself, and path_split[-2:]
                # is the path of the specific variant relative to its group.
                variant_group_name = posixpath.basename(path)
                variant_group_ref = self.AddOrGetVariantGroupByNameAndPath(
                    variant_group_name, grandparent
                )
                variant_path = posixpath.sep.join(path_split[-2:])
                variant_ref = variant_group_ref.GetChildByPath(variant_path)
                if variant_ref is not None:
                    assert variant_ref.__class__ == PBXFileReference
                else:
                    variant_ref = PBXFileReference(
                        {"name": variant_name, "path": variant_path}
                    )
                    variant_group_ref.AppendChild(variant_ref)
                # The caller is interested in the variant group, not the specific
                # variant file.
                file_ref = variant_group_ref
            return file_ref
        else:
            # Hierarchical recursion.  Add or get a PBXGroup corresponding to the
            # outermost path component, and then recurse into it, chopping off that
            # path component.
            next_dir = path_split[0]
            group_ref = self.GetChildByPath(next_dir)
            if group_ref is not None:
                assert group_ref.__class__ == PBXGroup
            else:
                group_ref = PBXGroup({"path": next_dir})
                self.AppendChild(group_ref)
            return group_ref.AddOrGetFileByPath(
                posixpath.sep.join(path_split[1:]), hierarchical
            )

    def AddOrGetVariantGroupByNameAndPath(self, name, path):
        """Returns an existing or new PBXVariantGroup for name and path.

    If a PBXVariantGroup identified by the name and path arguments is already
    present as a child of this object, it is returned.  Otherwise, a new
    PBXVariantGroup with the correct properties is created, added as a child,
    and returned.

    This method will generally be called by AddOrGetFileByPath, which knows
    when to create a variant group based on the structure of the pathnames
    passed to it.
    """

        key = (name, path)
        if key in self._variant_children_by_name_and_path:
            variant_group_ref = self._variant_children_by_name_and_path[key]
            assert variant_group_ref.__class__ == PBXVariantGroup
            return variant_group_ref

        variant_group_properties = {"name": name}
        if path is not None:
            variant_group_properties["path"] = path
        variant_group_ref = PBXVariantGroup(variant_group_properties)
        self.AppendChild(variant_group_ref)

        return variant_group_ref

    def TakeOverOnlyChild(self, recurse=False):
        """If this PBXGroup has only one child and it's also a PBXGroup, take
    it over by making all of its children this object's children.

    This function will continue to take over only children when those children
    are groups.  If there are three PBXGroups representing a, b, and c, with
    c inside b and b inside a, and a and b have no other children, this will
    result in a taking over both b and c, forming a PBXGroup for a/b/c.

    If recurse is True, this function will recurse into children and ask them
    to collapse themselves by taking over only children as well.  Assuming
    an example hierarchy with files at a/b/c/d1, a/b/c/d2, and a/b/c/d3/e/f
    (d1, d2, and f are files, the rest are groups), recursion will result in
    a group for a/b/c containing a group for d3/e.
    """

        # At this stage, check that child class types are PBXGroup exactly,
        # instead of using isinstance.  The only subclass of PBXGroup,
        # PBXVariantGroup, should not participate in reparenting in the same way:
        # reparenting by merging different object types would be wrong.
        while (
            len(self._properties["children"]) == 1
            and self._properties["children"][0].__class__ == PBXGroup
        ):
            # Loop to take over the innermost only-child group possible.

            child = self._properties["children"][0]

            # Assume the child's properties, including its children.  Save a copy
            # of this object's old properties, because they'll still be needed.
            # This object retains its existing id and parent attributes.
            old_properties = self._properties
            self._properties = child._properties
            self._children_by_path = child._children_by_path

            if (
                "sourceTree" not in self._properties
                or self._properties["sourceTree"] == "<group>"
            ):
                # The child was relative to its parent.  Fix up the path.  Note that
                # children with a sourceTree other than "<group>" are not relative to
                # their parents, so no path fix-up is needed in that case.
                if "path" in old_properties:
                    if "path" in self._properties:
                        # Both the original parent and child have paths set.
                        self._properties["path"] = posixpath.join(
                            old_properties["path"], self._properties["path"]
                        )
                    else:
                        # Only the original parent has a path, use it.
                        self._properties["path"] = old_properties["path"]
                if "sourceTree" in old_properties:
                    # The original parent had a sourceTree set, use it.
                    self._properties["sourceTree"] = old_properties["sourceTree"]

            # If the original parent had a name set, keep using it.  If the original
            # parent didn't have a name but the child did, let the child's name
            # live on.  If the name attribute seems unnecessary now, get rid of it.
            if "name" in old_properties and old_properties["name"] not in (
                None,
                self.Name(),
            ):
                self._properties["name"] = old_properties["name"]
            if (
                "name" in self._properties
                and "path" in self._properties
                and self._properties["name"] == self._properties["path"]
            ):
                del self._properties["name"]

            # Notify all children of their new parent.
            for child in self._properties["children"]:
                child.parent = self

        # If asked to recurse, recurse.
        if recurse:
            for child in self._properties["children"]:
                if child.__class__ == PBXGroup:
                    child.TakeOverOnlyChild(recurse)

    def SortGroup(self):
        self._properties["children"] = sorted(
            self._properties["children"], key=cmp_to_key(lambda x, y: x.Compare(y))
        )

        # Recurse.
        for child in self._properties["children"]:
            if isinstance(child, PBXGroup):
                child.SortGroup()


class XCFileLikeElement(XCHierarchicalElement):
    # Abstract base for objects that can be used as the fileRef property of
    # PBXBuildFile.

    def PathHashables(self):
        # A PBXBuildFile that refers to this object will call this method to
        # obtain additional hashables specific to this XCFileLikeElement.  Don't
        # just use this object's hashables, they're not specific and unique enough
        # on their own (without access to the parent hashables.)  Instead, provide
        # hashables that identify this object by path by getting its hashables as
        # well as the hashables of ancestor XCHierarchicalElement objects.

        hashables = []
        xche = self
        while isinstance(xche, XCHierarchicalElement):
            xche_hashables = xche.Hashables()
            for index, xche_hashable in enumerate(xche_hashables):
                hashables.insert(index, xche_hashable)
            xche = xche.parent
        return hashables


class XCContainerPortal(XCObject):
    # Abstract base for objects that can be used as the containerPortal property
    # of PBXContainerItemProxy.
    pass


class XCRemoteObject(XCObject):
    # Abstract base for objects that can be used as the remoteGlobalIDString
    # property of PBXContainerItemProxy.
    pass


class PBXFileReference(XCFileLikeElement, XCContainerPortal, XCRemoteObject):
    _schema = XCFileLikeElement._schema.copy()
    _schema.update(
        {
            "explicitFileType": [0, str, 0, 0],
            "lastKnownFileType": [0, str, 0, 0],
            "name": [0, str, 0, 0],
            "path": [0, str, 0, 1],
        }
    )

    # Weird output rules for PBXFileReference.
    _should_print_single_line = True
    # super
    _encode_transforms = XCFileLikeElement._alternate_encode_transforms

    def __init__(self, properties=None, id=None, parent=None):
        # super
        XCFileLikeElement.__init__(self, properties, id, parent)
        if "path" in self._properties and self._properties["path"].endswith("/"):
            self._properties["path"] = self._properties["path"][:-1]
            is_dir = True
        else:
            is_dir = False

        if (
            "path" in self._properties
            and "lastKnownFileType" not in self._properties
            and "explicitFileType" not in self._properties
        ):
            # TODO(mark): This is the replacement for a replacement for a quick hack.
            # It is no longer incredibly sucky, but this list needs to be extended.
            extension_map = {
                "a": "archive.ar",
                "app": "wrapper.application",
                "bdic": "file",
                "bundle": "wrapper.cfbundle",
                "c": "sourcecode.c.c",
                "cc": "sourcecode.cpp.cpp",
                "cpp": "sourcecode.cpp.cpp",
                "css": "text.css",
                "cxx": "sourcecode.cpp.cpp",
                "dart": "sourcecode",
                "dylib": "compiled.mach-o.dylib",
                "framework": "wrapper.framework",
                "gyp": "sourcecode",
                "gypi": "sourcecode",
                "h": "sourcecode.c.h",
                "hxx": "sourcecode.cpp.h",
                "icns": "image.icns",
                "java": "sourcecode.java",
                "js": "sourcecode.javascript",
                "kext": "wrapper.kext",
                "m": "sourcecode.c.objc",
                "mm": "sourcecode.cpp.objcpp",
                "nib": "wrapper.nib",
                "o": "compiled.mach-o.objfile",
                "pdf": "image.pdf",
                "pl": "text.script.perl",
                "plist": "text.plist.xml",
                "pm": "text.script.perl",
                "png": "image.png",
                "py": "text.script.python",
                "r": "sourcecode.rez",
                "rez": "sourcecode.rez",
                "s": "sourcecode.asm",
                "storyboard": "file.storyboard",
                "strings": "text.plist.strings",
                "swift": "sourcecode.swift",
                "ttf": "file",
                "xcassets": "folder.assetcatalog",
                "xcconfig": "text.xcconfig",
                "xcdatamodel": "wrapper.xcdatamodel",
                "xcdatamodeld": "wrapper.xcdatamodeld",
                "xib": "file.xib",
                "y": "sourcecode.yacc",
            }

            prop_map = {
                "dart": "explicitFileType",
                "gyp": "explicitFileType",
                "gypi": "explicitFileType",
            }

            if is_dir:
                file_type = "folder"
                prop_name = "lastKnownFileType"
            else:
                basename = posixpath.basename(self._properties["path"])
                (root, ext) = posixpath.splitext(basename)
                # Check the map using a lowercase extension.
                # TODO(mark): Maybe it should try with the original case first and fall
                # back to lowercase, in case there are any instances where case
                # matters.  There currently aren't.
                if ext != "":
                    ext = ext[1:].lower()

                # TODO(mark): "text" is the default value, but "file" is appropriate
                # for unrecognized files not containing text.  Xcode seems to choose
                # based on content.
                file_type = extension_map.get(ext, "text")
                prop_name = prop_map.get(ext, "lastKnownFileType")

            self._properties[prop_name] = file_type


class PBXVariantGroup(PBXGroup, XCFileLikeElement):
    """PBXVariantGroup is used by Xcode to represent localizations."""

    # No additions to the schema relative to PBXGroup.
    pass


# PBXReferenceProxy is also an XCFileLikeElement subclass.  It is defined below
# because it uses PBXContainerItemProxy, defined below.


class XCBuildConfiguration(XCObject):
    _schema = XCObject._schema.copy()
    _schema.update(
        {
            "baseConfigurationReference": [0, PBXFileReference, 0, 0],
            "buildSettings": [0, dict, 0, 1, {}],
            "name": [0, str, 0, 1],
        }
    )

    def HasBuildSetting(self, key):
        return key in self._properties["buildSettings"]

    def GetBuildSetting(self, key):
        return self._properties["buildSettings"][key]

    def SetBuildSetting(self, key, value):
        # TODO(mark): If a list, copy?
        self._properties["buildSettings"][key] = value

    def AppendBuildSetting(self, key, value):
        if key not in self._properties["buildSettings"]:
            self._properties["buildSettings"][key] = []
        self._properties["buildSettings"][key].append(value)

    def DelBuildSetting(self, key):
        if key in self._properties["buildSettings"]:
            del self._properties["buildSettings"][key]

    def SetBaseConfiguration(self, value):
        self._properties["baseConfigurationReference"] = value


class XCConfigurationList(XCObject):
    # _configs is the default list of configurations.
    _configs = [
        XCBuildConfiguration({"name": "Debug"}),
        XCBuildConfiguration({"name": "Release"}),
    ]

    _schema = XCObject._schema.copy()
    _schema.update(
        {
            "buildConfigurations": [1, XCBuildConfiguration, 1, 1, _configs],
            "defaultConfigurationIsVisible": [0, int, 0, 1, 1],
            "defaultConfigurationName": [0, str, 0, 1, "Release"],
        }
    )

    def Name(self):
        return (
            "Build configuration list for "
            + self.parent.__class__.__name__
            + ' "'
            + self.parent.Name()
            + '"'
        )

    def ConfigurationNamed(self, name):
        """Convenience accessor to obtain an XCBuildConfiguration by name."""
        for configuration in self._properties["buildConfigurations"]:
            if configuration._properties["name"] == name:
                return configuration

        raise KeyError(name)

    def DefaultConfiguration(self):
        """Convenience accessor to obtain the default XCBuildConfiguration."""
        return self.ConfigurationNamed(self._properties["defaultConfigurationName"])

    def HasBuildSetting(self, key):
        """Determines the state of a build setting in all XCBuildConfiguration
    child objects.

    If all child objects have key in their build settings, and the value is the
    same in all child objects, returns 1.

    If no child objects have the key in their build settings, returns 0.

    If some, but not all, child objects have the key in their build settings,
    or if any children have different values for the key, returns -1.
    """

        has = None
        value = None
        for configuration in self._properties["buildConfigurations"]:
            configuration_has = configuration.HasBuildSetting(key)
            if has is None:
                has = configuration_has
            elif has != configuration_has:
                return -1

            if configuration_has:
                configuration_value = configuration.GetBuildSetting(key)
                if value is None:
                    value = configuration_value
                elif value != configuration_value:
                    return -1

        if not has:
            return 0

        return 1

    def GetBuildSetting(self, key):
        """Gets the build setting for key.

    All child XCConfiguration objects must have the same value set for the
    setting, or a ValueError will be raised.
    """

        # TODO(mark): This is wrong for build settings that are lists.  The list
        # contents should be compared (and a list copy returned?)

        value = None
        for configuration in self._properties["buildConfigurations"]:
            configuration_value = configuration.GetBuildSetting(key)
            if value is None:
                value = configuration_value
            else:
                if value != configuration_value:
                    raise ValueError("Variant values for " + key)

        return value

    def SetBuildSetting(self, key, value):
        """Sets the build setting for key to value in all child
    XCBuildConfiguration objects.
    """

        for configuration in self._properties["buildConfigurations"]:
            configuration.SetBuildSetting(key, value)

    def AppendBuildSetting(self, key, value):
        """Appends value to the build setting for key, which is treated as a list,
    in all child XCBuildConfiguration objects.
    """

        for configuration in self._properties["buildConfigurations"]:
            configuration.AppendBuildSetting(key, value)

    def DelBuildSetting(self, key):
        """Deletes the build setting key from all child XCBuildConfiguration
    objects.
    """

        for configuration in self._properties["buildConfigurations"]:
            configuration.DelBuildSetting(key)

    def SetBaseConfiguration(self, value):
        """Sets the build configuration in all child XCBuildConfiguration objects.
    """

        for configuration in self._properties["buildConfigurations"]:
            configuration.SetBaseConfiguration(value)


class PBXBuildFile(XCObject):
    _schema = XCObject._schema.copy()
    _schema.update(
        {
            "fileRef": [0, XCFileLikeElement, 0, 1],
            "settings": [0, str, 0, 0],  # hack, it's a dict
        }
    )

    # Weird output rules for PBXBuildFile.
    _should_print_single_line = True
    _encode_transforms = XCObject._alternate_encode_transforms

    def Name(self):
        # Example: "main.cc in Sources"
        return self._properties["fileRef"].Name() + " in " + self.parent.Name()

    def Hashables(self):
        # super
        hashables = XCObject.Hashables(self)

        # It is not sufficient to just rely on Name() to get the
        # XCFileLikeElement's name, because that is not a complete pathname.
        # PathHashables returns hashables unique enough that no two
        # PBXBuildFiles should wind up with the same set of hashables, unless
        # someone adds the same file multiple times to the same target.  That
        # would be considered invalid anyway.
        hashables.extend(self._properties["fileRef"].PathHashables())

        return hashables


class XCBuildPhase(XCObject):
    """Abstract base for build phase classes.  Not represented in a project
  file.

  Attributes:
    _files_by_path: A dict mapping each path of a child in the files list by
      path (keys) to the corresponding PBXBuildFile children (values).
    _files_by_xcfilelikeelement: A dict mapping each XCFileLikeElement (keys)
      to the corresponding PBXBuildFile children (values).
  """

    # TODO(mark): Some build phase types, like PBXShellScriptBuildPhase, don't
    # actually have a "files" list.  XCBuildPhase should not have "files" but
    # another abstract subclass of it should provide this, and concrete build
    # phase types that do have "files" lists should be derived from that new
    # abstract subclass.  XCBuildPhase should only provide buildActionMask and
    # runOnlyForDeploymentPostprocessing, and not files or the various
    # file-related methods and attributes.

    _schema = XCObject._schema.copy()
    _schema.update(
        {
            "buildActionMask": [0, int, 0, 1, 0x7FFFFFFF],
            "files": [1, PBXBuildFile, 1, 1, []],
            "runOnlyForDeploymentPostprocessing": [0, int, 0, 1, 0],
        }
    )

    def __init__(self, properties=None, id=None, parent=None):
        # super
        XCObject.__init__(self, properties, id, parent)

        self._files_by_path = {}
        self._files_by_xcfilelikeelement = {}
        for pbxbuildfile in self._properties.get("files", []):
            self._AddBuildFileToDicts(pbxbuildfile)

    def FileGroup(self, path):
        # Subclasses must override this by returning a two-element tuple.  The
        # first item in the tuple should be the PBXGroup to which "path" should be
        # added, either as a child or deeper descendant.  The second item should
        # be a boolean indicating whether files should be added into hierarchical
        # groups or one single flat group.
        raise NotImplementedError(self.__class__.__name__ + " must implement FileGroup")

    def _AddPathToDict(self, pbxbuildfile, path):
        """Adds path to the dict tracking paths belonging to this build phase.

    If the path is already a member of this build phase, raises an exception.
    """

        if path in self._files_by_path:
            raise ValueError("Found multiple build files with path " + path)
        self._files_by_path[path] = pbxbuildfile

    def _AddBuildFileToDicts(self, pbxbuildfile, path=None):
        """Maintains the _files_by_path and _files_by_xcfilelikeelement dicts.

    If path is specified, then it is the path that is being added to the
    phase, and pbxbuildfile must contain either a PBXFileReference directly
    referencing that path, or it must contain a PBXVariantGroup that itself
    contains a PBXFileReference referencing the path.

    If path is not specified, either the PBXFileReference's path or the paths
    of all children of the PBXVariantGroup are taken as being added to the
    phase.

    If the path is already present in the phase, raises an exception.

    If the PBXFileReference or PBXVariantGroup referenced by pbxbuildfile
    are already present in the phase, referenced by a different PBXBuildFile
    object, raises an exception.  This does not raise an exception when
    a PBXFileReference or PBXVariantGroup reappear and are referenced by the
    same PBXBuildFile that has already introduced them, because in the case
    of PBXVariantGroup objects, they may correspond to multiple paths that are
    not all added simultaneously.  When this situation occurs, the path needs
    to be added to _files_by_path, but nothing needs to change in
    _files_by_xcfilelikeelement, and the caller should have avoided adding
    the PBXBuildFile if it is already present in the list of children.
    """

        xcfilelikeelement = pbxbuildfile._properties["fileRef"]

        paths = []
        if path is not None:
            # It's best when the caller provides the path.
            if isinstance(xcfilelikeelement, PBXVariantGroup):
                paths.append(path)
        else:
            # If the caller didn't provide a path, there can be either multiple
            # paths (PBXVariantGroup) or one.
            if isinstance(xcfilelikeelement, PBXVariantGroup):
                for variant in xcfilelikeelement._properties["children"]:
                    paths.append(variant.FullPath())
            else:
                paths.append(xcfilelikeelement.FullPath())

        # Add the paths first, because if something's going to raise, the
        # messages provided by _AddPathToDict are more useful owing to its
        # having access to a real pathname and not just an object's Name().
        for a_path in paths:
            self._AddPathToDict(pbxbuildfile, a_path)

        # If another PBXBuildFile references this XCFileLikeElement, there's a
        # problem.
        if (
            xcfilelikeelement in self._files_by_xcfilelikeelement
            and self._files_by_xcfilelikeelement[xcfilelikeelement] != pbxbuildfile
        ):
            raise ValueError(
                "Found multiple build files for " + xcfilelikeelement.Name()
            )
        self._files_by_xcfilelikeelement[xcfilelikeelement] = pbxbuildfile

    def AppendBuildFile(self, pbxbuildfile, path=None):
        # Callers should use this instead of calling
        # AppendProperty('files', pbxbuildfile) directly because this function
        # maintains the object's dicts.  Better yet, callers can just call AddFile
        # with a pathname and not worry about building their own PBXBuildFile
        # objects.
        self.AppendProperty("files", pbxbuildfile)
        self._AddBuildFileToDicts(pbxbuildfile, path)

    def AddFile(self, path, settings=None):
        (file_group, hierarchical) = self.FileGroup(path)
        file_ref = file_group.AddOrGetFileByPath(path, hierarchical)

        if file_ref in self._files_by_xcfilelikeelement and isinstance(
            file_ref, PBXVariantGroup
        ):
            # There's already a PBXBuildFile in this phase corresponding to the
            # PBXVariantGroup.  path just provides a new variant that belongs to
            # the group.  Add the path to the dict.
            pbxbuildfile = self._files_by_xcfilelikeelement[file_ref]
            self._AddBuildFileToDicts(pbxbuildfile, path)
        else:
            # Add a new PBXBuildFile to get file_ref into the phase.
            if settings is None:
                pbxbuildfile = PBXBuildFile({"fileRef": file_ref})
            else:
                pbxbuildfile = PBXBuildFile({"fileRef": file_ref, "settings": settings})
            self.AppendBuildFile(pbxbuildfile, path)


class PBXHeadersBuildPhase(XCBuildPhase):
    # No additions to the schema relative to XCBuildPhase.

    def Name(self):
        return "Headers"

    def FileGroup(self, path):
        return self.PBXProjectAncestor().RootGroupForPath(path)


class PBXResourcesBuildPhase(XCBuildPhase):
    # No additions to the schema relative to XCBuildPhase.

    def Name(self):
        return "Resources"

    def FileGroup(self, path):
        return self.PBXProjectAncestor().RootGroupForPath(path)


class PBXSourcesBuildPhase(XCBuildPhase):
    # No additions to the schema relative to XCBuildPhase.

    def Name(self):
        return "Sources"

    def FileGroup(self, path):
        return self.PBXProjectAncestor().RootGroupForPath(path)


class PBXFrameworksBuildPhase(XCBuildPhase):
    # No additions to the schema relative to XCBuildPhase.

    def Name(self):
        return "Frameworks"

    def FileGroup(self, path):
        (root, ext) = posixpath.splitext(path)
        if ext != "":
            ext = ext[1:].lower()
        if ext == "o":
            # .o files are added to Xcode Frameworks phases, but conceptually aren't
            # frameworks, they're more like sources or intermediates. Redirect them
            # to show up in one of those other groups.
            return self.PBXProjectAncestor().RootGroupForPath(path)
        else:
            return (self.PBXProjectAncestor().FrameworksGroup(), False)


class PBXShellScriptBuildPhase(XCBuildPhase):
    _schema = XCBuildPhase._schema.copy()
    _schema.update(
        {
            "inputPaths": [1, str, 0, 1, []],
            "name": [0, str, 0, 0],
            "outputPaths": [1, str, 0, 1, []],
            "shellPath": [0, str, 0, 1, "/bin/sh"],
            "shellScript": [0, str, 0, 1],
            "showEnvVarsInLog": [0, int, 0, 0],
        }
    )

    def Name(self):
        if "name" in self._properties:
            return self._properties["name"]

        return "ShellScript"


class PBXCopyFilesBuildPhase(XCBuildPhase):
    _schema = XCBuildPhase._schema.copy()
    _schema.update(
        {
            "dstPath": [0, str, 0, 1],
            "dstSubfolderSpec": [0, int, 0, 1],
            "name": [0, str, 0, 0],
        }
    )

    # path_tree_re matches "$(DIR)/path", "$(DIR)/$(DIR2)/path" or just "$(DIR)".
    # Match group 1 is "DIR", group 3 is "path" or "$(DIR2") or "$(DIR2)/path"
    # or None. If group 3 is "path", group 4 will be None otherwise group 4 is
    # "DIR2" and group 6 is "path".
    path_tree_re = re.compile(r"^\$\((.*?)\)(/(\$\((.*?)\)(/(.*)|)|(.*)|)|)$")

    # path_tree_{first,second}_to_subfolder map names of Xcode variables to the
    # associated dstSubfolderSpec property value used in a PBXCopyFilesBuildPhase
    # object.
    path_tree_first_to_subfolder = {
        # Types that can be chosen via the Xcode UI.
        "BUILT_PRODUCTS_DIR": 16,  # Products Directory
        "BUILT_FRAMEWORKS_DIR": 10,  # Not an official Xcode macro.
        # Existed before support for the
        # names below was added. Maps to
        # "Frameworks".
    }

    path_tree_second_to_subfolder = {
        "WRAPPER_NAME": 1,  # Wrapper
        # Although Xcode's friendly name is "Executables", the destination
        # is demonstrably the value of the build setting
        # EXECUTABLE_FOLDER_PATH not EXECUTABLES_FOLDER_PATH.
        "EXECUTABLE_FOLDER_PATH": 6,  # Executables.
        "UNLOCALIZED_RESOURCES_FOLDER_PATH": 7,  # Resources
        "JAVA_FOLDER_PATH": 15,  # Java Resources
        "FRAMEWORKS_FOLDER_PATH": 10,  # Frameworks
        "SHARED_FRAMEWORKS_FOLDER_PATH": 11,  # Shared Frameworks
        "SHARED_SUPPORT_FOLDER_PATH": 12,  # Shared Support
        "PLUGINS_FOLDER_PATH": 13,  # PlugIns
        # For XPC Services, Xcode sets both dstPath and dstSubfolderSpec.
        # Note that it re-uses the BUILT_PRODUCTS_DIR value for
        # dstSubfolderSpec. dstPath is set below.
        "XPCSERVICES_FOLDER_PATH": 16,  # XPC Services.
    }

    def Name(self):
        if "name" in self._properties:
            return self._properties["name"]

        return "CopyFiles"

    def FileGroup(self, path):
        return self.PBXProjectAncestor().RootGroupForPath(path)

    def SetDestination(self, path):
        """Set the dstSubfolderSpec and dstPath properties from path.

    path may be specified in the same notation used for XCHierarchicalElements,
    specifically, "$(DIR)/path".
    """

        path_tree_match = self.path_tree_re.search(path)
        if path_tree_match:
            path_tree = path_tree_match.group(1)
            if path_tree in self.path_tree_first_to_subfolder:
                subfolder = self.path_tree_first_to_subfolder[path_tree]
                relative_path = path_tree_match.group(3)
                if relative_path is None:
                    relative_path = ""

                if subfolder == 16 and path_tree_match.group(4) is not None:
                    # BUILT_PRODUCTS_DIR (16) is the first element in a path whose
                    # second element is possibly one of the variable names in
                    # path_tree_second_to_subfolder. Xcode sets the values of all these
                    # variables to relative paths so .gyp files must prefix them with
                    # BUILT_PRODUCTS_DIR, e.g.
                    # $(BUILT_PRODUCTS_DIR)/$(PLUGINS_FOLDER_PATH). Then
                    # xcode_emulation.py can export these variables with the same values
                    # as Xcode yet make & ninja files can determine the absolute path
                    # to the target. Xcode uses the dstSubfolderSpec value set here
                    # to determine the full path.
                    #
                    # An alternative of xcode_emulation.py setting the values to
                    # absolute paths when exporting these variables has been
                    # ruled out because then the values would be different
                    # depending on the build tool.
                    #
                    # Another alternative is to invent new names for the variables used
                    # to match to the subfolder indices in the second table. .gyp files
                    # then will not need to prepend $(BUILT_PRODUCTS_DIR) because
                    # xcode_emulation.py can set the values of those variables to
                    # the absolute paths when exporting. This is possibly the thinking
                    # behind BUILT_FRAMEWORKS_DIR which is used in exactly this manner.
                    #
                    # Requiring prepending BUILT_PRODUCTS_DIR has been chosen because
                    # this same way could be used to specify destinations in .gyp files
                    # that pre-date this addition to GYP. However they would only work
                    # with the Xcode generator.
                    # The previous version of xcode_emulation.py
                    # does not export these variables. Such files will get the benefit
                    # of the Xcode UI showing the proper destination name simply by
                    # regenerating the projects with this version of GYP.
                    path_tree = path_tree_match.group(4)
                    relative_path = path_tree_match.group(6)
                    separator = "/"

                    if path_tree in self.path_tree_second_to_subfolder:
                        subfolder = self.path_tree_second_to_subfolder[path_tree]
                        if relative_path is None:
                            relative_path = ""
                            separator = ""
                        if path_tree == "XPCSERVICES_FOLDER_PATH":
                            relative_path = (
                                "$(CONTENTS_FOLDER_PATH)/XPCServices"
                                + separator
                                + relative_path
                            )
                    else:
                        # subfolder = 16 from above
                        # The second element of the path is an unrecognized variable.
                        # Include it and any remaining elements in relative_path.
                        relative_path = path_tree_match.group(3)

            else:
                # The path starts with an unrecognized Xcode variable
                # name like $(SRCROOT).  Xcode will still handle this
                # as an "absolute path" that starts with the variable.
                subfolder = 0
                relative_path = path
        elif path.startswith("/"):
            # Special case.  Absolute paths are in dstSubfolderSpec 0.
            subfolder = 0
            relative_path = path[1:]
        else:
            raise ValueError(
                f"Can't use path {path} in a {self.__class__.__name__}"
            )

        self._properties["dstPath"] = relative_path
        self._properties["dstSubfolderSpec"] = subfolder


class PBXBuildRule(XCObject):
    _schema = XCObject._schema.copy()
    _schema.update(
        {
            "compilerSpec": [0, str, 0, 1],
            "filePatterns": [0, str, 0, 0],
            "fileType": [0, str, 0, 1],
            "isEditable": [0, int, 0, 1, 1],
            "outputFiles": [1, str, 0, 1, []],
            "script": [0, str, 0, 0],
        }
    )

    def Name(self):
        # Not very inspired, but it's what Xcode uses.
        return self.__class__.__name__

    def Hashables(self):
        # super
        hashables = XCObject.Hashables(self)

        # Use the hashables of the weak objects that this object refers to.
        hashables.append(self._properties["fileType"])
        if "filePatterns" in self._properties:
            hashables.append(self._properties["filePatterns"])
        return hashables


class PBXContainerItemProxy(XCObject):
    # When referencing an item in this project file, containerPortal is the
    # PBXProject root object of this project file.  When referencing an item in
    # another project file, containerPortal is a PBXFileReference identifying
    # the other project file.
    #
    # When serving as a proxy to an XCTarget (in this project file or another),
    # proxyType is 1.  When serving as a proxy to a PBXFileReference (in another
    # project file), proxyType is 2.  Type 2 is used for references to the
    # producs of the other project file's targets.
    #
    # Xcode is weird about remoteGlobalIDString.  Usually, it's printed without
    # a comment, indicating that it's tracked internally simply as a string, but
    # sometimes it's printed with a comment (usually when the object is initially
    # created), indicating that it's tracked as a project file object at least
    # sometimes.  This module always tracks it as an object, but contains a hack
    # to prevent it from printing the comment in the project file output.  See
    # _XCKVPrint.
    _schema = XCObject._schema.copy()
    _schema.update(
        {
            "containerPortal": [0, XCContainerPortal, 0, 1],
            "proxyType": [0, int, 0, 1],
            "remoteGlobalIDString": [0, XCRemoteObject, 0, 1],
            "remoteInfo": [0, str, 0, 1],
        }
    )

    def __repr__(self):
        props = self._properties
        name = "{}.gyp:{}".format(props["containerPortal"].Name(), props["remoteInfo"])
        return f"<{self.__class__.__name__} {name!r} at 0x{id(self):x}>"

    def Name(self):
        # Admittedly not the best name, but it's what Xcode uses.
        return self.__class__.__name__

    def Hashables(self):
        # super
        hashables = XCObject.Hashables(self)

        # Use the hashables of the weak objects that this object refers to.
        hashables.extend(self._properties["containerPortal"].Hashables())
        hashables.extend(self._properties["remoteGlobalIDString"].Hashables())
        return hashables


class PBXTargetDependency(XCObject):
    # The "target" property accepts an XCTarget object, and obviously not
    # NoneType.  But XCTarget is defined below, so it can't be put into the
    # schema yet.  The definition of PBXTargetDependency can't be moved below
    # XCTarget because XCTarget's own schema references PBXTargetDependency.
    # Python doesn't deal well with this circular relationship, and doesn't have
    # a real way to do forward declarations.  To work around, the type of
    # the "target" property is reset below, after XCTarget is defined.
    #
    # At least one of "name" and "target" is required.
    _schema = XCObject._schema.copy()
    _schema.update(
        {
            "name": [0, str, 0, 0],
            "target": [0, None.__class__, 0, 0],
            "targetProxy": [0, PBXContainerItemProxy, 1, 1],
        }
    )

    def __repr__(self):
        name = self._properties.get("name") or self._properties["target"].Name()
        return f"<{self.__class__.__name__} {name!r} at 0x{id(self):x}>"

    def Name(self):
        # Admittedly not the best name, but it's what Xcode uses.
        return self.__class__.__name__

    def Hashables(self):
        # super
        hashables = XCObject.Hashables(self)

        # Use the hashables of the weak objects that this object refers to.
        hashables.extend(self._properties["targetProxy"].Hashables())
        return hashables


class PBXReferenceProxy(XCFileLikeElement):
    _schema = XCFileLikeElement._schema.copy()
    _schema.update(
        {
            "fileType": [0, str, 0, 1],
            "path": [0, str, 0, 1],
            "remoteRef": [0, PBXContainerItemProxy, 1, 1],
        }
    )


class XCTarget(XCRemoteObject):
    # An XCTarget is really just an XCObject, the XCRemoteObject thing is just
    # to allow PBXProject to be used in the remoteGlobalIDString property of
    # PBXContainerItemProxy.
    #
    # Setting a "name" property at instantiation may also affect "productName",
    # which may in turn affect the "PRODUCT_NAME" build setting in children of
    # "buildConfigurationList".  See __init__ below.
    _schema = XCRemoteObject._schema.copy()
    _schema.update(
        {
            "buildConfigurationList": [
                0,
                XCConfigurationList,
                1,
                1,
                XCConfigurationList(),
            ],
            "buildPhases": [1, XCBuildPhase, 1, 1, []],
            "dependencies": [1, PBXTargetDependency, 1, 1, []],
            "name": [0, str, 0, 1],
            "productName": [0, str, 0, 1],
        }
    )

    def __init__(
        self,
        properties=None,
        id=None,
        parent=None,
        force_outdir=None,
        force_prefix=None,
        force_extension=None,
    ):
        # super
        XCRemoteObject.__init__(self, properties, id, parent)

        # Set up additional defaults not expressed in the schema.  If a "name"
        # property was supplied, set "productName" if it is not present.  Also set
        # the "PRODUCT_NAME" build setting in each configuration, but only if
        # the setting is not present in any build configuration.
        if "name" in self._properties:
            if "productName" not in self._properties:
                self.SetProperty("productName", self._properties["name"])

        if "productName" in self._properties:
            if "buildConfigurationList" in self._properties:
                configs = self._properties["buildConfigurationList"]
                if configs.HasBuildSetting("PRODUCT_NAME") == 0:
                    configs.SetBuildSetting(
                        "PRODUCT_NAME", self._properties["productName"]
                    )

    def AddDependency(self, other):
        pbxproject = self.PBXProjectAncestor()
        other_pbxproject = other.PBXProjectAncestor()
        if pbxproject == other_pbxproject:
            # Add a dependency to another target in the same project file.
            container = PBXContainerItemProxy(
                {
                    "containerPortal": pbxproject,
                    "proxyType": 1,
                    "remoteGlobalIDString": other,
                    "remoteInfo": other.Name(),
                }
            )
            dependency = PBXTargetDependency(
                {"target": other, "targetProxy": container}
            )
            self.AppendProperty("dependencies", dependency)
        else:
            # Add a dependency to a target in a different project file.
            other_project_ref = pbxproject.AddOrGetProjectReference(other_pbxproject)[1]
            container = PBXContainerItemProxy(
                {
                    "containerPortal": other_project_ref,
                    "proxyType": 1,
                    "remoteGlobalIDString": other,
                    "remoteInfo": other.Name(),
                }
            )
            dependency = PBXTargetDependency(
                {"name": other.Name(), "targetProxy": container}
            )
            self.AppendProperty("dependencies", dependency)

    # Proxy all of these through to the build configuration list.

    def ConfigurationNamed(self, name):
        return self._properties["buildConfigurationList"].ConfigurationNamed(name)

    def DefaultConfiguration(self):
        return self._properties["buildConfigurationList"].DefaultConfiguration()

    def HasBuildSetting(self, key):
        return self._properties["buildConfigurationList"].HasBuildSetting(key)

    def GetBuildSetting(self, key):
        return self._properties["buildConfigurationList"].GetBuildSetting(key)

    def SetBuildSetting(self, key, value):
        return self._properties["buildConfigurationList"].SetBuildSetting(key, value)

    def AppendBuildSetting(self, key, value):
        return self._properties["buildConfigurationList"].AppendBuildSetting(key, value)

    def DelBuildSetting(self, key):
        return self._properties["buildConfigurationList"].DelBuildSetting(key)


# Redefine the type of the "target" property.  See PBXTargetDependency._schema
# above.
PBXTargetDependency._schema["target"][1] = XCTarget


class PBXNativeTarget(XCTarget):
    # buildPhases is overridden in the schema to be able to set defaults.
    #
    # NOTE: Contrary to most objects, it is advisable to set parent when
    # constructing PBXNativeTarget.  A parent of an XCTarget must be a PBXProject
    # object.  A parent reference is required for a PBXNativeTarget during
    # construction to be able to set up the target defaults for productReference,
    # because a PBXBuildFile object must be created for the target and it must
    # be added to the PBXProject's mainGroup hierarchy.
    _schema = XCTarget._schema.copy()
    _schema.update(
        {
            "buildPhases": [
                1,
                XCBuildPhase,
                1,
                1,
                [PBXSourcesBuildPhase(), PBXFrameworksBuildPhase()],
            ],
            "buildRules": [1, PBXBuildRule, 1, 1, []],
            "productReference": [0, PBXFileReference, 0, 1],
            "productType": [0, str, 0, 1],
        }
    )

    # Mapping from Xcode product-types to settings.  The settings are:
    #  filetype : used for explicitFileType in the project file
    #  prefix : the prefix for the file name
    #  suffix : the suffix for the file name
    _product_filetypes = {
        "com.apple.product-type.application": ["wrapper.application", "", ".app"],
        "com.apple.product-type.application.watchapp": [
            "wrapper.application",
            "",
            ".app",
        ],
        "com.apple.product-type.watchkit-extension": [
            "wrapper.app-extension",
            "",
            ".appex",
        ],
        "com.apple.product-type.app-extension": ["wrapper.app-extension", "", ".appex"],
        "com.apple.product-type.bundle": ["wrapper.cfbundle", "", ".bundle"],
        "com.apple.product-type.framework": ["wrapper.framework", "", ".framework"],
        "com.apple.product-type.library.dynamic": [
            "compiled.mach-o.dylib",
            "lib",
            ".dylib",
        ],
        "com.apple.product-type.library.static": ["archive.ar", "lib", ".a"],
        "com.apple.product-type.tool": ["compiled.mach-o.executable", "", ""],
        "com.apple.product-type.bundle.unit-test": ["wrapper.cfbundle", "", ".xctest"],
        "com.apple.product-type.bundle.ui-testing": ["wrapper.cfbundle", "", ".xctest"],
        "com.googlecode.gyp.xcode.bundle": ["compiled.mach-o.dylib", "", ".so"],
        "com.apple.product-type.kernel-extension": ["wrapper.kext", "", ".kext"],
    }

    def __init__(
        self,
        properties=None,
        id=None,
        parent=None,
        force_outdir=None,
        force_prefix=None,
        force_extension=None,
    ):
        # super
        XCTarget.__init__(self, properties, id, parent)

        if (
            "productName" in self._properties
            and "productType" in self._properties
            and "productReference" not in self._properties
            and self._properties["productType"] in self._product_filetypes
        ):
            products_group = None
            pbxproject = self.PBXProjectAncestor()
            if pbxproject is not None:
                products_group = pbxproject.ProductsGroup()

            if products_group is not None:
                (filetype, prefix, suffix) = self._product_filetypes[
                    self._properties["productType"]
                ]
                # Xcode does not have a distinct type for loadable modules that are
                # pure BSD targets (not in a bundle wrapper). GYP allows such modules
                # to be specified by setting a target type to loadable_module without
                # having mac_bundle set. These are mapped to the pseudo-product type
                # com.googlecode.gyp.xcode.bundle.
                #
                # By picking up this special type and converting it to a dynamic
                # library (com.apple.product-type.library.dynamic) with fix-ups,
                # single-file loadable modules can be produced.
                #
                # MACH_O_TYPE is changed to mh_bundle to produce the proper file type
                # (as opposed to mh_dylib). In order for linking to succeed,
                # DYLIB_CURRENT_VERSION and DYLIB_COMPATIBILITY_VERSION must be
                # cleared. They are meaningless for type mh_bundle.
                #
                # Finally, the .so extension is forcibly applied over the default
                # (.dylib), unless another forced extension is already selected.
                # .dylib is plainly wrong, and .bundle is used by loadable_modules in
                # bundle wrappers (com.apple.product-type.bundle). .so seems an odd
                # choice because it's used as the extension on many other systems that
                # don't distinguish between linkable shared libraries and non-linkable
                # loadable modules, but there's precedent: Python loadable modules on
                # Mac OS X use an .so extension.
                if self._properties["productType"] == "com.googlecode.gyp.xcode.bundle":
                    self._properties[
                        "productType"
                    ] = "com.apple.product-type.library.dynamic"
                    self.SetBuildSetting("MACH_O_TYPE", "mh_bundle")
                    self.SetBuildSetting("DYLIB_CURRENT_VERSION", "")
                    self.SetBuildSetting("DYLIB_COMPATIBILITY_VERSION", "")
                    if force_extension is None:
                        force_extension = suffix[1:]

                if (
                    self._properties["productType"]
                    == "com.apple.product-type-bundle.unit.test"
                    or self._properties["productType"]
                    == "com.apple.product-type-bundle.ui-testing"
                ):
                    if force_extension is None:
                        force_extension = suffix[1:]

                if force_extension is not None:
                    # If it's a wrapper (bundle), set WRAPPER_EXTENSION.
                    # Extension override.
                    suffix = "." + force_extension
                    if filetype.startswith("wrapper."):
                        self.SetBuildSetting("WRAPPER_EXTENSION", force_extension)
                    else:
                        self.SetBuildSetting("EXECUTABLE_EXTENSION", force_extension)

                    if filetype.startswith("compiled.mach-o.executable"):
                        product_name = self._properties["productName"]
                        product_name += suffix
                        suffix = ""
                        self.SetProperty("productName", product_name)
                        self.SetBuildSetting("PRODUCT_NAME", product_name)

                # Xcode handles most prefixes based on the target type, however there
                # are exceptions.  If a "BSD Dynamic Library" target is added in the
                # Xcode UI, Xcode sets EXECUTABLE_PREFIX.  This check duplicates that
                # behavior.
                if force_prefix is not None:
                    prefix = force_prefix
                if filetype.startswith("wrapper."):
                    self.SetBuildSetting("WRAPPER_PREFIX", prefix)
                else:
                    self.SetBuildSetting("EXECUTABLE_PREFIX", prefix)

                if force_outdir is not None:
                    self.SetBuildSetting("TARGET_BUILD_DIR", force_outdir)

                # TODO(tvl): Remove the below hack.
                #    http://code.google.com/p/gyp/issues/detail?id=122

                # Some targets include the prefix in the target_name.  These targets
                # really should just add a product_name setting that doesn't include
                # the prefix.  For example:
                #  target_name = 'libevent', product_name = 'event'
                # This check cleans up for them.
                product_name = self._properties["productName"]
                prefix_len = len(prefix)
                if prefix_len and (product_name[:prefix_len] == prefix):
                    product_name = product_name[prefix_len:]
                    self.SetProperty("productName", product_name)
                    self.SetBuildSetting("PRODUCT_NAME", product_name)

                ref_props = {
                    "explicitFileType": filetype,
                    "includeInIndex": 0,
                    "path": prefix + product_name + suffix,
                    "sourceTree": "BUILT_PRODUCTS_DIR",
                }
                file_ref = PBXFileReference(ref_props)
                products_group.AppendChild(file_ref)
                self.SetProperty("productReference", file_ref)

    def GetBuildPhaseByType(self, type):
        if "buildPhases" not in self._properties:
            return None

        the_phase = None
        for phase in self._properties["buildPhases"]:
            if isinstance(phase, type):
                # Some phases may be present in multiples in a well-formed project file,
                # but phases like PBXSourcesBuildPhase may only be present singly, and
                # this function is intended as an aid to GetBuildPhaseByType.  Loop
                # over the entire list of phases and assert if more than one of the
                # desired type is found.
                assert the_phase is None
                the_phase = phase

        return the_phase

    def HeadersPhase(self):
        headers_phase = self.GetBuildPhaseByType(PBXHeadersBuildPhase)
        if headers_phase is None:
            headers_phase = PBXHeadersBuildPhase()

            # The headers phase should come before the resources, sources, and
            # frameworks phases, if any.
            insert_at = len(self._properties["buildPhases"])
            for index, phase in enumerate(self._properties["buildPhases"]):
                if (
                    isinstance(phase, PBXResourcesBuildPhase)
                    or isinstance(phase, PBXSourcesBuildPhase)
                    or isinstance(phase, PBXFrameworksBuildPhase)
                ):
                    insert_at = index
                    break

            self._properties["buildPhases"].insert(insert_at, headers_phase)
            headers_phase.parent = self

        return headers_phase

    def ResourcesPhase(self):
        resources_phase = self.GetBuildPhaseByType(PBXResourcesBuildPhase)
        if resources_phase is None:
            resources_phase = PBXResourcesBuildPhase()

            # The resources phase should come before the sources and frameworks
            # phases, if any.
            insert_at = len(self._properties["buildPhases"])
            for index, phase in enumerate(self._properties["buildPhases"]):
                if isinstance(phase, PBXSourcesBuildPhase) or isinstance(
                    phase, PBXFrameworksBuildPhase
                ):
                    insert_at = index
                    break

            self._properties["buildPhases"].insert(insert_at, resources_phase)
            resources_phase.parent = self

        return resources_phase

    def SourcesPhase(self):
        sources_phase = self.GetBuildPhaseByType(PBXSourcesBuildPhase)
        if sources_phase is None:
            sources_phase = PBXSourcesBuildPhase()
            self.AppendProperty("buildPhases", sources_phase)

        return sources_phase

    def FrameworksPhase(self):
        frameworks_phase = self.GetBuildPhaseByType(PBXFrameworksBuildPhase)
        if frameworks_phase is None:
            frameworks_phase = PBXFrameworksBuildPhase()
            self.AppendProperty("buildPhases", frameworks_phase)

        return frameworks_phase

    def AddDependency(self, other):
        # super
        XCTarget.AddDependency(self, other)

        static_library_type = "com.apple.product-type.library.static"
        shared_library_type = "com.apple.product-type.library.dynamic"
        framework_type = "com.apple.product-type.framework"
        if (
            isinstance(other, PBXNativeTarget)
            and "productType" in self._properties
            and self._properties["productType"] != static_library_type
            and "productType" in other._properties
            and (
                other._properties["productType"] == static_library_type
                or (
                    (
                        other._properties["productType"] == shared_library_type
                        or other._properties["productType"] == framework_type
                    )
                    and (
                        (not other.HasBuildSetting("MACH_O_TYPE"))
                        or other.GetBuildSetting("MACH_O_TYPE") != "mh_bundle"
                    )
                )
            )
        ):

            file_ref = other.GetProperty("productReference")

            pbxproject = self.PBXProjectAncestor()
            other_pbxproject = other.PBXProjectAncestor()
            if pbxproject != other_pbxproject:
                other_project_product_group = pbxproject.AddOrGetProjectReference(
                    other_pbxproject
                )[0]
                file_ref = other_project_product_group.GetChildByRemoteObject(file_ref)

            self.FrameworksPhase().AppendProperty(
                "files", PBXBuildFile({"fileRef": file_ref})
            )


class PBXAggregateTarget(XCTarget):
    pass


class PBXProject(XCContainerPortal):
    # A PBXProject is really just an XCObject, the XCContainerPortal thing is
    # just to allow PBXProject to be used in the containerPortal property of
    # PBXContainerItemProxy.
    """

  Attributes:
    path: "sample.xcodeproj".  TODO(mark) Document me!
    _other_pbxprojects: A dictionary, keyed by other PBXProject objects.  Each
                        value is a reference to the dict in the
                        projectReferences list associated with the keyed
                        PBXProject.
  """

    _schema = XCContainerPortal._schema.copy()
    _schema.update(
        {
            "attributes": [0, dict, 0, 0],
            "buildConfigurationList": [
                0,
                XCConfigurationList,
                1,
                1,
                XCConfigurationList(),
            ],
            "compatibilityVersion": [0, str, 0, 1, "Xcode 3.2"],
            "hasScannedForEncodings": [0, int, 0, 1, 1],
            "mainGroup": [0, PBXGroup, 1, 1, PBXGroup()],
            "projectDirPath": [0, str, 0, 1, ""],
            "projectReferences": [1, dict, 0, 0],
            "projectRoot": [0, str, 0, 1, ""],
            "targets": [1, XCTarget, 1, 1, []],
        }
    )

    def __init__(self, properties=None, id=None, parent=None, path=None):
        self.path = path
        self._other_pbxprojects = {}
        # super
        return XCContainerPortal.__init__(self, properties, id, parent)

    def Name(self):
        name = self.path
        if name[-10:] == ".xcodeproj":
            name = name[:-10]
        return posixpath.basename(name)

    def Path(self):
        return self.path

    def Comment(self):
        return "Project object"

    def Children(self):
        # super
        children = XCContainerPortal.Children(self)

        # Add children that the schema doesn't know about.  Maybe there's a more
        # elegant way around this, but this is the only case where we need to own
        # objects in a dictionary (that is itself in a list), and three lines for
        # a one-off isn't that big a deal.
        if "projectReferences" in self._properties:
            for reference in self._properties["projectReferences"]:
                children.append(reference["ProductGroup"])

        return children

    def PBXProjectAncestor(self):
        return self

    def _GroupByName(self, name):
        if "mainGroup" not in self._properties:
            self.SetProperty("mainGroup", PBXGroup())

        main_group = self._properties["mainGroup"]
        group = main_group.GetChildByName(name)
        if group is None:
            group = PBXGroup({"name": name})
            main_group.AppendChild(group)

        return group

    # SourceGroup and ProductsGroup are created by default in Xcode's own
    # templates.
    def SourceGroup(self):
        return self._GroupByName("Source")

    def ProductsGroup(self):
        return self._GroupByName("Products")

    # IntermediatesGroup is used to collect source-like files that are generated
    # by rules or script phases and are placed in intermediate directories such
    # as DerivedSources.
    def IntermediatesGroup(self):
        return self._GroupByName("Intermediates")

    # FrameworksGroup and ProjectsGroup are top-level groups used to collect
    # frameworks and projects.
    def FrameworksGroup(self):
        return self._GroupByName("Frameworks")

    def ProjectsGroup(self):
        return self._GroupByName("Projects")

    def RootGroupForPath(self, path):
        """Returns a PBXGroup child of this object to which path should be added.

    This method is intended to choose between SourceGroup and
    IntermediatesGroup on the basis of whether path is present in a source
    directory or an intermediates directory.  For the purposes of this
    determination, any path located within a derived file directory such as
    PROJECT_DERIVED_FILE_DIR is treated as being in an intermediates
    directory.

    The returned value is a two-element tuple.  The first element is the
    PBXGroup, and the second element specifies whether that group should be
    organized hierarchically (True) or as a single flat list (False).
    """

        # TODO(mark): make this a class variable and bind to self on call?
        # Also, this list is nowhere near exhaustive.
        # INTERMEDIATE_DIR and SHARED_INTERMEDIATE_DIR are used by
        # gyp.generator.xcode.  There should probably be some way for that module
        # to push the names in, rather than having to hard-code them here.
        source_tree_groups = {
            "DERIVED_FILE_DIR": (self.IntermediatesGroup, True),
            "INTERMEDIATE_DIR": (self.IntermediatesGroup, True),
            "PROJECT_DERIVED_FILE_DIR": (self.IntermediatesGroup, True),
            "SHARED_INTERMEDIATE_DIR": (self.IntermediatesGroup, True),
        }

        (source_tree, path) = SourceTreeAndPathFromPath(path)
        if source_tree is not None and source_tree in source_tree_groups:
            (group_func, hierarchical) = source_tree_groups[source_tree]
            group = group_func()
            return (group, hierarchical)

        # TODO(mark): make additional choices based on file extension.

        return (self.SourceGroup(), True)

    def AddOrGetFileInRootGroup(self, path):
        """Returns a PBXFileReference corresponding to path in the correct group
    according to RootGroupForPath's heuristics.

    If an existing PBXFileReference for path exists, it will be returned.
    Otherwise, one will be created and returned.
    """

        (group, hierarchical) = self.RootGroupForPath(path)
        return group.AddOrGetFileByPath(path, hierarchical)

    def RootGroupsTakeOverOnlyChildren(self, recurse=False):
        """Calls TakeOverOnlyChild for all groups in the main group."""

        for group in self._properties["mainGroup"]._properties["children"]:
            if isinstance(group, PBXGroup):
                group.TakeOverOnlyChild(recurse)

    def SortGroups(self):
        # Sort the children of the mainGroup (like "Source" and "Products")
        # according to their defined order.
        self._properties["mainGroup"]._properties["children"] = sorted(
            self._properties["mainGroup"]._properties["children"],
            key=cmp_to_key(lambda x, y: x.CompareRootGroup(y)),
        )

        # Sort everything else by putting group before files, and going
        # alphabetically by name within sections of groups and files.  SortGroup
        # is recursive.
        for group in self._properties["mainGroup"]._properties["children"]:
            if not isinstance(group, PBXGroup):
                continue

            if group.Name() == "Products":
                # The Products group is a special case.  Instead of sorting
                # alphabetically, sort things in the order of the targets that
                # produce the products.  To do this, just build up a new list of
                # products based on the targets.
                products = []
                for target in self._properties["targets"]:
                    if not isinstance(target, PBXNativeTarget):
                        continue
                    product = target._properties["productReference"]
                    # Make sure that the product is already in the products group.
                    assert product in group._properties["children"]
                    products.append(product)

                # Make sure that this process doesn't miss anything that was already
                # in the products group.
                assert len(products) == len(group._properties["children"])
                group._properties["children"] = products
            else:
                group.SortGroup()

    def AddOrGetProjectReference(self, other_pbxproject):
        """Add a reference to another project file (via PBXProject object) to this
    one.

    Returns [ProductGroup, ProjectRef].  ProductGroup is a PBXGroup object in
    this project file that contains a PBXReferenceProxy object for each
    product of each PBXNativeTarget in the other project file.  ProjectRef is
    a PBXFileReference to the other project file.

    If this project file already references the other project file, the
    existing ProductGroup and ProjectRef are returned.  The ProductGroup will
    still be updated if necessary.
    """

        if "projectReferences" not in self._properties:
            self._properties["projectReferences"] = []

        product_group = None
        project_ref = None

        if other_pbxproject not in self._other_pbxprojects:
            # This project file isn't yet linked to the other one.  Establish the
            # link.
            product_group = PBXGroup({"name": "Products"})

            # ProductGroup is strong.
            product_group.parent = self

            # There's nothing unique about this PBXGroup, and if left alone, it will
            # wind up with the same set of hashables as all other PBXGroup objects
            # owned by the projectReferences list.  Add the hashables of the
            # remote PBXProject that it's related to.
            product_group._hashables.extend(other_pbxproject.Hashables())

            # The other project reports its path as relative to the same directory
            # that this project's path is relative to.  The other project's path
            # is not necessarily already relative to this project.  Figure out the
            # pathname that this project needs to use to refer to the other one.
            this_path = posixpath.dirname(self.Path())
            projectDirPath = self.GetProperty("projectDirPath")
            if projectDirPath:
                if posixpath.isabs(projectDirPath[0]):
                    this_path = projectDirPath
                else:
                    this_path = posixpath.join(this_path, projectDirPath)
            other_path = gyp.common.RelativePath(other_pbxproject.Path(), this_path)

            # ProjectRef is weak (it's owned by the mainGroup hierarchy).
            project_ref = PBXFileReference(
                {
                    "lastKnownFileType": "wrapper.pb-project",
                    "path": other_path,
                    "sourceTree": "SOURCE_ROOT",
                }
            )
            self.ProjectsGroup().AppendChild(project_ref)

            ref_dict = {"ProductGroup": product_group, "ProjectRef": project_ref}
            self._other_pbxprojects[other_pbxproject] = ref_dict
            self.AppendProperty("projectReferences", ref_dict)

            # Xcode seems to sort this list case-insensitively
            self._properties["projectReferences"] = sorted(
                self._properties["projectReferences"],
                key=lambda x: x["ProjectRef"].Name().lower
            )
        else:
            # The link already exists.  Pull out the relevnt data.
            project_ref_dict = self._other_pbxprojects[other_pbxproject]
            product_group = project_ref_dict["ProductGroup"]
            project_ref = project_ref_dict["ProjectRef"]

        self._SetUpProductReferences(other_pbxproject, product_group, project_ref)

        inherit_unique_symroot = self._AllSymrootsUnique(other_pbxproject, False)
        targets = other_pbxproject.GetProperty("targets")
        if all(self._AllSymrootsUnique(t, inherit_unique_symroot) for t in targets):
            dir_path = project_ref._properties["path"]
            product_group._hashables.extend(dir_path)

        return [product_group, project_ref]

    def _AllSymrootsUnique(self, target, inherit_unique_symroot):
        # Returns True if all configurations have a unique 'SYMROOT' attribute.
        # The value of inherit_unique_symroot decides, if a configuration is assumed
        # to inherit a unique 'SYMROOT' attribute from its parent, if it doesn't
        # define an explicit value for 'SYMROOT'.
        symroots = self._DefinedSymroots(target)
        for s in self._DefinedSymroots(target):
            if (
                s is not None
                and not self._IsUniqueSymrootForTarget(s)
                or s is None
                and not inherit_unique_symroot
            ):
                return False
        return True if symroots else inherit_unique_symroot

    def _DefinedSymroots(self, target):
        # Returns all values for the 'SYMROOT' attribute defined in all
        # configurations for this target. If any configuration doesn't define the
        # 'SYMROOT' attribute, None is added to the returned set. If all
        # configurations don't define the 'SYMROOT' attribute, an empty set is
        # returned.
        config_list = target.GetProperty("buildConfigurationList")
        symroots = set()
        for config in config_list.GetProperty("buildConfigurations"):
            setting = config.GetProperty("buildSettings")
            if "SYMROOT" in setting:
                symroots.add(setting["SYMROOT"])
            else:
                symroots.add(None)
        if len(symroots) == 1 and None in symroots:
            return set()
        return symroots

    def _IsUniqueSymrootForTarget(self, symroot):
        # This method returns True if all configurations in target contain a
        # 'SYMROOT' attribute that is unique for the given target. A value is
        # unique, if the Xcode macro '$SRCROOT' appears in it in any form.
        uniquifier = ["$SRCROOT", "$(SRCROOT)"]
        if any(x in symroot for x in uniquifier):
            return True
        return False

    def _SetUpProductReferences(self, other_pbxproject, product_group, project_ref):
        # TODO(mark): This only adds references to products in other_pbxproject
        # when they don't exist in this pbxproject.  Perhaps it should also
        # remove references from this pbxproject that are no longer present in
        # other_pbxproject.  Perhaps it should update various properties if they
        # change.
        for target in other_pbxproject._properties["targets"]:
            if not isinstance(target, PBXNativeTarget):
                continue

            other_fileref = target._properties["productReference"]
            if product_group.GetChildByRemoteObject(other_fileref) is None:
                # Xcode sets remoteInfo to the name of the target and not the name
                # of its product, despite this proxy being a reference to the product.
                container_item = PBXContainerItemProxy(
                    {
                        "containerPortal": project_ref,
                        "proxyType": 2,
                        "remoteGlobalIDString": other_fileref,
                        "remoteInfo": target.Name(),
                    }
                )
                # TODO(mark): Does sourceTree get copied straight over from the other
                # project?  Can the other project ever have lastKnownFileType here
                # instead of explicitFileType?  (Use it if so?)  Can path ever be
                # unset?  (I don't think so.)  Can other_fileref have name set, and
                # does it impact the PBXReferenceProxy if so?  These are the questions
                # that perhaps will be answered one day.
                reference_proxy = PBXReferenceProxy(
                    {
                        "fileType": other_fileref._properties["explicitFileType"],
                        "path": other_fileref._properties["path"],
                        "sourceTree": other_fileref._properties["sourceTree"],
                        "remoteRef": container_item,
                    }
                )

                product_group.AppendChild(reference_proxy)

    def SortRemoteProductReferences(self):
        # For each remote project file, sort the associated ProductGroup in the
        # same order that the targets are sorted in the remote project file.  This
        # is the sort order used by Xcode.

        def CompareProducts(x, y, remote_products):
            # x and y are PBXReferenceProxy objects.  Go through their associated
            # PBXContainerItem to get the remote PBXFileReference, which will be
            # present in the remote_products list.
            x_remote = x._properties["remoteRef"]._properties["remoteGlobalIDString"]
            y_remote = y._properties["remoteRef"]._properties["remoteGlobalIDString"]
            x_index = remote_products.index(x_remote)
            y_index = remote_products.index(y_remote)

            # Use the order of each remote PBXFileReference in remote_products to
            # determine the sort order.
            return cmp(x_index, y_index)

        for other_pbxproject, ref_dict in self._other_pbxprojects.items():
            # Build up a list of products in the remote project file, ordered the
            # same as the targets that produce them.
            remote_products = []
            for target in other_pbxproject._properties["targets"]:
                if not isinstance(target, PBXNativeTarget):
                    continue
                remote_products.append(target._properties["productReference"])

            # Sort the PBXReferenceProxy children according to the list of remote
            # products.
            product_group = ref_dict["ProductGroup"]
            product_group._properties["children"] = sorted(
                product_group._properties["children"],
                key=cmp_to_key(
                    lambda x, y, rp=remote_products: CompareProducts(x, y, rp)),
            )


class XCProjectFile(XCObject):
    _schema = XCObject._schema.copy()
    _schema.update(
        {
            "archiveVersion": [0, int, 0, 1, 1],
            "classes": [0, dict, 0, 1, {}],
            "objectVersion": [0, int, 0, 1, 46],
            "rootObject": [0, PBXProject, 1, 1],
        }
    )

    def ComputeIDs(self, recursive=True, overwrite=True, hash=None):
        # Although XCProjectFile is implemented here as an XCObject, it's not a
        # proper object in the Xcode sense, and it certainly doesn't have its own
        # ID.  Pass through an attempt to update IDs to the real root object.
        if recursive:
            self._properties["rootObject"].ComputeIDs(recursive, overwrite, hash)

    def Print(self, file=sys.stdout):
        self.VerifyHasRequiredProperties()

        # Add the special "objects" property, which will be caught and handled
        # separately during printing.  This structure allows a fairly standard
        # loop do the normal printing.
        self._properties["objects"] = {}
        self._XCPrint(file, 0, "// !$*UTF8*$!\n")
        if self._should_print_single_line:
            self._XCPrint(file, 0, "{ ")
        else:
            self._XCPrint(file, 0, "{\n")
        for property, value in sorted(
            self._properties.items()
        ):
            if property == "objects":
                self._PrintObjects(file)
            else:
                self._XCKVPrint(file, 1, property, value)
        self._XCPrint(file, 0, "}\n")
        del self._properties["objects"]

    def _PrintObjects(self, file):
        if self._should_print_single_line:
            self._XCPrint(file, 0, "objects = {")
        else:
            self._XCPrint(file, 1, "objects = {\n")

        objects_by_class = {}
        for object in self.Descendants():
            if object == self:
                continue
            class_name = object.__class__.__name__
            if class_name not in objects_by_class:
                objects_by_class[class_name] = []
            objects_by_class[class_name].append(object)

        for class_name in sorted(objects_by_class):
            self._XCPrint(file, 0, "\n")
            self._XCPrint(file, 0, "/* Begin " + class_name + " section */\n")
            for object in sorted(
                objects_by_class[class_name], key=attrgetter("id")
            ):
                object.Print(file)
            self._XCPrint(file, 0, "/* End " + class_name + " section */\n")

        if self._should_print_single_line:
            self._XCPrint(file, 0, "}; ")
        else:
            self._XCPrint(file, 1, "};\n")
