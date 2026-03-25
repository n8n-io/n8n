#!/usr/bin/env python3

# Copyright (c) 2012 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Pretty-prints the contents of a GYP file."""


import sys
import re


# Regex to remove comments when we're counting braces.
COMMENT_RE = re.compile(r"\s*#.*")

# Regex to remove quoted strings when we're counting braces.
# It takes into account quoted quotes, and makes sure that the quotes match.
# NOTE: It does not handle quotes that span more than one line, or
# cases where an escaped quote is preceded by an escaped backslash.
QUOTE_RE_STR = r'(?P<q>[\'"])(.*?)(?<![^\\][\\])(?P=q)'
QUOTE_RE = re.compile(QUOTE_RE_STR)


def comment_replace(matchobj):
    return matchobj.group(1) + matchobj.group(2) + "#" * len(matchobj.group(3))


def mask_comments(input):
    """Mask the quoted strings so we skip braces inside quoted strings."""
    search_re = re.compile(r"(.*?)(#)(.*)")
    return [search_re.sub(comment_replace, line) for line in input]


def quote_replace(matchobj):
    return "{}{}{}{}".format(
        matchobj.group(1),
        matchobj.group(2),
        "x" * len(matchobj.group(3)),
        matchobj.group(2),
    )


def mask_quotes(input):
    """Mask the quoted strings so we skip braces inside quoted strings."""
    search_re = re.compile(r"(.*?)" + QUOTE_RE_STR)
    return [search_re.sub(quote_replace, line) for line in input]


def do_split(input, masked_input, search_re):
    output = []
    mask_output = []
    for (line, masked_line) in zip(input, masked_input):
        m = search_re.match(masked_line)
        while m:
            split = len(m.group(1))
            line = line[:split] + r"\n" + line[split:]
            masked_line = masked_line[:split] + r"\n" + masked_line[split:]
            m = search_re.match(masked_line)
        output.extend(line.split(r"\n"))
        mask_output.extend(masked_line.split(r"\n"))
    return (output, mask_output)


def split_double_braces(input):
    """Masks out the quotes and comments, and then splits appropriate
  lines (lines that matche the double_*_brace re's above) before
  indenting them below.

  These are used to split lines which have multiple braces on them, so
  that the indentation looks prettier when all laid out (e.g. closing
  braces make a nice diagonal line).
  """
    double_open_brace_re = re.compile(r"(.*?[\[\{\(,])(\s*)([\[\{\(])")
    double_close_brace_re = re.compile(r"(.*?[\]\}\)],?)(\s*)([\]\}\)])")

    masked_input = mask_quotes(input)
    masked_input = mask_comments(masked_input)

    (output, mask_output) = do_split(input, masked_input, double_open_brace_re)
    (output, mask_output) = do_split(output, mask_output, double_close_brace_re)

    return output


def count_braces(line):
    """keeps track of the number of braces on a given line and returns the result.

  It starts at zero and subtracts for closed braces, and adds for open braces.
  """
    open_braces = ["[", "(", "{"]
    close_braces = ["]", ")", "}"]
    closing_prefix_re = re.compile(r"(.*?[^\s\]\}\)]+.*?)([\]\}\)],?)\s*$")
    cnt = 0
    stripline = COMMENT_RE.sub(r"", line)
    stripline = QUOTE_RE.sub(r"''", stripline)
    for char in stripline:
        for brace in open_braces:
            if char == brace:
                cnt += 1
        for brace in close_braces:
            if char == brace:
                cnt -= 1

    after = False
    if cnt > 0:
        after = True

    # This catches the special case of a closing brace having something
    # other than just whitespace ahead of it -- we don't want to
    # unindent that until after this line is printed so it stays with
    # the previous indentation level.
    if cnt < 0 and closing_prefix_re.match(stripline):
        after = True
    return (cnt, after)


def prettyprint_input(lines):
    """Does the main work of indenting the input based on the brace counts."""
    indent = 0
    basic_offset = 2
    for line in lines:
        if COMMENT_RE.match(line):
            print(line)
        else:
            line = line.strip("\r\n\t ")  # Otherwise doesn't strip \r on Unix.
            if len(line) > 0:
                (brace_diff, after) = count_braces(line)
                if brace_diff != 0:
                    if after:
                        print(" " * (basic_offset * indent) + line)
                        indent += brace_diff
                    else:
                        indent += brace_diff
                        print(" " * (basic_offset * indent) + line)
                else:
                    print(" " * (basic_offset * indent) + line)
            else:
                print("")


def main():
    if len(sys.argv) > 1:
        data = open(sys.argv[1]).read().splitlines()
    else:
        data = sys.stdin.read().splitlines()
    # Split up the double braces.
    lines = split_double_braces(data)

    # Indent and print the output.
    prettyprint_input(lines)
    return 0


if __name__ == "__main__":
    sys.exit(main())
