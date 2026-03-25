# Copyright (c) 2011 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""gypsh output module

gypsh is a GYP shell.  It's not really a generator per se.  All it does is
fire up an interactive Python session with a few local variables set to the
variables passed to the generator.  Like gypd, it's intended as a debugging
aid, to facilitate the exploration of .gyp structures after being processed
by the input module.

The expected usage is "gyp -f gypsh -D OS=desired_os".
"""


import code
import sys


# All of this stuff about generator variables was lovingly ripped from gypd.py.
# That module has a much better description of what's going on and why.
_generator_identity_variables = [
    "EXECUTABLE_PREFIX",
    "EXECUTABLE_SUFFIX",
    "INTERMEDIATE_DIR",
    "PRODUCT_DIR",
    "RULE_INPUT_ROOT",
    "RULE_INPUT_DIRNAME",
    "RULE_INPUT_EXT",
    "RULE_INPUT_NAME",
    "RULE_INPUT_PATH",
    "SHARED_INTERMEDIATE_DIR",
]

generator_default_variables = {}

for v in _generator_identity_variables:
    generator_default_variables[v] = "<(%s)" % v


def GenerateOutput(target_list, target_dicts, data, params):
    locals = {
        "target_list": target_list,
        "target_dicts": target_dicts,
        "data": data,
    }

    # Use a banner that looks like the stock Python one and like what
    # code.interact uses by default, but tack on something to indicate what
    # locals are available, and identify gypsh.
    banner = "Python {} on {}\nlocals.keys() = {}\ngypsh".format(
        sys.version,
        sys.platform,
        repr(sorted(locals.keys())),
    )

    code.interact(banner, local=locals)
