# Copyright (c) 2013 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# Notes:
#
# This is all roughly based on the Makefile system used by the Linux
# kernel, but is a non-recursive make -- we put the entire dependency
# graph in front of make and let it figure it out.
#
# The code below generates a separate .mk file for each target, but
# all are sourced by the top-level Makefile.  This means that all
# variables in .mk-files clobber one another.  Be careful to use :=
# where appropriate for immediate evaluation, and similarly to watch
# that you're not relying on a variable value to last between different
# .mk files.
#
# TODOs:
#
# Global settings and utility functions are currently stuffed in the
# toplevel Makefile.  It may make sense to generate some .mk files on
# the side to keep the files readable.


import os
import re
import subprocess
import gyp
import gyp.common
import gyp.xcode_emulation
from gyp.common import GetEnvironFallback

import hashlib

generator_default_variables = {
    "EXECUTABLE_PREFIX": "",
    "EXECUTABLE_SUFFIX": "",
    "STATIC_LIB_PREFIX": "lib",
    "SHARED_LIB_PREFIX": "lib",
    "STATIC_LIB_SUFFIX": ".a",
    "INTERMEDIATE_DIR": "$(obj).$(TOOLSET)/$(TARGET)/geni",
    "SHARED_INTERMEDIATE_DIR": "$(obj)/gen",
    "PRODUCT_DIR": "$(builddir)",
    "RULE_INPUT_ROOT": "%(INPUT_ROOT)s",  # This gets expanded by Python.
    "RULE_INPUT_DIRNAME": "%(INPUT_DIRNAME)s",  # This gets expanded by Python.
    "RULE_INPUT_PATH": "$(abspath $<)",
    "RULE_INPUT_EXT": "$(suffix $<)",
    "RULE_INPUT_NAME": "$(notdir $<)",
    "CONFIGURATION_NAME": "$(BUILDTYPE)",
}

# Make supports multiple toolsets
generator_supports_multiple_toolsets = True

# Request sorted dependencies in the order from dependents to dependencies.
generator_wants_sorted_dependencies = False

# Placates pylint.
generator_additional_non_configuration_keys = []
generator_additional_path_sections = []
generator_extra_sources_for_rules = []
generator_filelist_paths = None


def CalculateVariables(default_variables, params):
    """Calculate additional variables for use in the build (called by gyp)."""
    flavor = gyp.common.GetFlavor(params)
    if flavor == "mac":
        default_variables.setdefault("OS", "mac")
        default_variables.setdefault("SHARED_LIB_SUFFIX", ".dylib")
        default_variables.setdefault(
            "SHARED_LIB_DIR", generator_default_variables["PRODUCT_DIR"]
        )
        default_variables.setdefault(
            "LIB_DIR", generator_default_variables["PRODUCT_DIR"]
        )

        # Copy additional generator configuration data from Xcode, which is shared
        # by the Mac Make generator.
        import gyp.generator.xcode as xcode_generator

        global generator_additional_non_configuration_keys
        generator_additional_non_configuration_keys = getattr(
            xcode_generator, "generator_additional_non_configuration_keys", []
        )
        global generator_additional_path_sections
        generator_additional_path_sections = getattr(
            xcode_generator, "generator_additional_path_sections", []
        )
        global generator_extra_sources_for_rules
        generator_extra_sources_for_rules = getattr(
            xcode_generator, "generator_extra_sources_for_rules", []
        )
        COMPILABLE_EXTENSIONS.update({".m": "objc", ".mm": "objcxx"})
    else:
        operating_system = flavor
        if flavor == "android":
            operating_system = "linux"  # Keep this legacy behavior for now.
        default_variables.setdefault("OS", operating_system)
        if flavor == "aix":
            default_variables.setdefault("SHARED_LIB_SUFFIX", ".a")
        else:
            default_variables.setdefault("SHARED_LIB_SUFFIX", ".so")
        default_variables.setdefault("SHARED_LIB_DIR", "$(builddir)/lib.$(TOOLSET)")
        default_variables.setdefault("LIB_DIR", "$(obj).$(TOOLSET)")


def CalculateGeneratorInputInfo(params):
    """Calculate the generator specific info that gets fed to input (called by
    gyp)."""
    generator_flags = params.get("generator_flags", {})
    android_ndk_version = generator_flags.get("android_ndk_version", None)
    # Android NDK requires a strict link order.
    if android_ndk_version:
        global generator_wants_sorted_dependencies
        generator_wants_sorted_dependencies = True

    output_dir = params["options"].generator_output or params["options"].toplevel_dir
    builddir_name = generator_flags.get("output_dir", "out")
    qualified_out_dir = os.path.normpath(
        os.path.join(output_dir, builddir_name, "gypfiles")
    )

    global generator_filelist_paths
    generator_filelist_paths = {
        "toplevel": params["options"].toplevel_dir,
        "qualified_out_dir": qualified_out_dir,
    }


# The .d checking code below uses these functions:
# wildcard, sort, foreach, shell, wordlist
# wildcard can handle spaces, the rest can't.
# Since I could find no way to make foreach work with spaces in filenames
# correctly, the .d files have spaces replaced with another character. The .d
# file for
#     Chromium\ Framework.framework/foo
# is for example
#     out/Release/.deps/out/Release/Chromium?Framework.framework/foo
# This is the replacement character.
SPACE_REPLACEMENT = "?"


LINK_COMMANDS_LINUX = """\
quiet_cmd_alink = AR($(TOOLSET)) $@
cmd_alink = rm -f $@ && $(AR.$(TOOLSET)) crs $@ $(filter %.o,$^)

quiet_cmd_alink_thin = AR($(TOOLSET)) $@
cmd_alink_thin = rm -f $@ && $(AR.$(TOOLSET)) crsT $@ $(filter %.o,$^)

# Due to circular dependencies between libraries :(, we wrap the
# special "figure out circular dependencies" flags around the entire
# input list during linking.
quiet_cmd_link = LINK($(TOOLSET)) $@
cmd_link = $(LINK.$(TOOLSET)) -o $@ $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -Wl,--start-group $(LD_INPUTS) $(LIBS) -Wl,--end-group

# We support two kinds of shared objects (.so):
# 1) shared_library, which is just bundling together many dependent libraries
# into a link line.
# 2) loadable_module, which is generating a module intended for dlopen().
#
# They differ only slightly:
# In the former case, we want to package all dependent code into the .so.
# In the latter case, we want to package just the API exposed by the
# outermost module.
# This means shared_library uses --whole-archive, while loadable_module doesn't.
# (Note that --whole-archive is incompatible with the --start-group used in
# normal linking.)

# Other shared-object link notes:
# - Set SONAME to the library filename so our binaries don't reference
# the local, absolute paths used on the link command-line.
quiet_cmd_solink = SOLINK($(TOOLSET)) $@
cmd_solink = $(LINK.$(TOOLSET)) -o $@ -shared $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -Wl,-soname=$(@F) -Wl,--whole-archive $(LD_INPUTS) -Wl,--no-whole-archive $(LIBS)

quiet_cmd_solink_module = SOLINK_MODULE($(TOOLSET)) $@
cmd_solink_module = $(LINK.$(TOOLSET)) -o $@ -shared $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -Wl,-soname=$(@F) -Wl,--start-group $(filter-out FORCE_DO_CMD, $^) -Wl,--end-group $(LIBS)
"""  # noqa: E501

LINK_COMMANDS_MAC = """\
quiet_cmd_alink = LIBTOOL-STATIC $@
cmd_alink = rm -f $@ && ./gyp-mac-tool filter-libtool libtool $(GYP_LIBTOOLFLAGS) -static -o $@ $(filter %.o,$^)

quiet_cmd_link = LINK($(TOOLSET)) $@
cmd_link = $(LINK.$(TOOLSET)) $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o "$@" $(LD_INPUTS) $(LIBS)

quiet_cmd_solink = SOLINK($(TOOLSET)) $@
cmd_solink = $(LINK.$(TOOLSET)) -shared $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o "$@" $(LD_INPUTS) $(LIBS)

quiet_cmd_solink_module = SOLINK_MODULE($(TOOLSET)) $@
cmd_solink_module = $(LINK.$(TOOLSET)) -bundle $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o $@ $(filter-out FORCE_DO_CMD, $^) $(LIBS)
"""  # noqa: E501

LINK_COMMANDS_ANDROID = """\
quiet_cmd_alink = AR($(TOOLSET)) $@
cmd_alink = rm -f $@ && $(AR.$(TOOLSET)) crs $@ $(filter %.o,$^)

quiet_cmd_alink_thin = AR($(TOOLSET)) $@
cmd_alink_thin = rm -f $@ && $(AR.$(TOOLSET)) crsT $@ $(filter %.o,$^)

# Due to circular dependencies between libraries :(, we wrap the
# special "figure out circular dependencies" flags around the entire
# input list during linking.
quiet_cmd_link = LINK($(TOOLSET)) $@
quiet_cmd_link_host = LINK($(TOOLSET)) $@
cmd_link = $(LINK.$(TOOLSET)) $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o $@ -Wl,--start-group $(LD_INPUTS) -Wl,--end-group $(LIBS)
cmd_link_host = $(LINK.$(TOOLSET)) $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o $@ -Wl,--start-group $(LD_INPUTS) -Wl,--end-group $(LIBS)

# Other shared-object link notes:
# - Set SONAME to the library filename so our binaries don't reference
# the local, absolute paths used on the link command-line.
quiet_cmd_solink = SOLINK($(TOOLSET)) $@
cmd_solink = $(LINK.$(TOOLSET)) -shared $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -Wl,-soname=$(@F) -o $@ -Wl,--whole-archive $(LD_INPUTS) -Wl,--no-whole-archive $(LIBS)

quiet_cmd_solink_module = SOLINK_MODULE($(TOOLSET)) $@
cmd_solink_module = $(LINK.$(TOOLSET)) -shared $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -Wl,-soname=$(@F) -o $@ -Wl,--start-group $(filter-out FORCE_DO_CMD, $^) -Wl,--end-group $(LIBS)
quiet_cmd_solink_module_host = SOLINK_MODULE($(TOOLSET)) $@
cmd_solink_module_host = $(LINK.$(TOOLSET)) -shared $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -Wl,-soname=$(@F) -o $@ $(filter-out FORCE_DO_CMD, $^) $(LIBS)
"""  # noqa: E501


LINK_COMMANDS_AIX = """\
quiet_cmd_alink = AR($(TOOLSET)) $@
cmd_alink = rm -f $@ && $(AR.$(TOOLSET)) -X32_64 crs $@ $(filter %.o,$^)

quiet_cmd_alink_thin = AR($(TOOLSET)) $@
cmd_alink_thin = rm -f $@ && $(AR.$(TOOLSET)) -X32_64 crs $@ $(filter %.o,$^)

quiet_cmd_link = LINK($(TOOLSET)) $@
cmd_link = $(LINK.$(TOOLSET)) $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o $@ $(LD_INPUTS) $(LIBS)

quiet_cmd_solink = SOLINK($(TOOLSET)) $@
cmd_solink = $(LINK.$(TOOLSET)) -shared $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o $@ $(LD_INPUTS) $(LIBS)

quiet_cmd_solink_module = SOLINK_MODULE($(TOOLSET)) $@
cmd_solink_module = $(LINK.$(TOOLSET)) -shared $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o $@ $(filter-out FORCE_DO_CMD, $^) $(LIBS)
"""  # noqa: E501


LINK_COMMANDS_OS390 = """\
quiet_cmd_alink = AR($(TOOLSET)) $@
cmd_alink = rm -f $@ && $(AR.$(TOOLSET)) crs $@ $(filter %.o,$^)

quiet_cmd_alink_thin = AR($(TOOLSET)) $@
cmd_alink_thin = rm -f $@ && $(AR.$(TOOLSET)) crsT $@ $(filter %.o,$^)

quiet_cmd_link = LINK($(TOOLSET)) $@
cmd_link = $(LINK.$(TOOLSET)) $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o $@ $(LD_INPUTS) $(LIBS)

quiet_cmd_solink = SOLINK($(TOOLSET)) $@
cmd_solink = $(LINK.$(TOOLSET)) $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o $@ $(LD_INPUTS) $(LIBS) -Wl,DLL

quiet_cmd_solink_module = SOLINK_MODULE($(TOOLSET)) $@
cmd_solink_module = $(LINK.$(TOOLSET)) $(GYP_LDFLAGS) $(LDFLAGS.$(TOOLSET)) -o $@ $(filter-out FORCE_DO_CMD, $^) $(LIBS) -Wl,DLL
"""  # noqa: E501


# Header of toplevel Makefile.
# This should go into the build tree, but it's easier to keep it here for now.
SHARED_HEADER = (
    """\
# We borrow heavily from the kernel build setup, though we are simpler since
# we don't have Kconfig tweaking settings on us.

# The implicit make rules have it looking for RCS files, among other things.
# We instead explicitly write all the rules we care about.
# It's even quicker (saves ~200ms) to pass -r on the command line.
MAKEFLAGS=-r

# The source directory tree.
srcdir := %(srcdir)s
abs_srcdir := $(abspath $(srcdir))

# The name of the builddir.
builddir_name ?= %(builddir)s

# The V=1 flag on command line makes us verbosely print command lines.
ifdef V
  quiet=
else
  quiet=quiet_
endif

# Specify BUILDTYPE=Release on the command line for a release build.
BUILDTYPE ?= %(default_configuration)s

# Directory all our build output goes into.
# Note that this must be two directories beneath src/ for unit tests to pass,
# as they reach into the src/ directory for data with relative paths.
builddir ?= $(builddir_name)/$(BUILDTYPE)
abs_builddir := $(abspath $(builddir))
depsdir := $(builddir)/.deps

# Object output directory.
obj := $(builddir)/obj
abs_obj := $(abspath $(obj))

# We build up a list of every single one of the targets so we can slurp in the
# generated dependency rule Makefiles in one pass.
all_deps :=

%(make_global_settings)s

CC.target ?= %(CC.target)s
CFLAGS.target ?= $(CPPFLAGS) $(CFLAGS)
CXX.target ?= %(CXX.target)s
CXXFLAGS.target ?= $(CPPFLAGS) $(CXXFLAGS)
LINK.target ?= %(LINK.target)s
LDFLAGS.target ?= $(LDFLAGS)
AR.target ?= $(AR)

# C++ apps need to be linked with g++.
LINK ?= $(CXX.target)

# TODO(evan): move all cross-compilation logic to gyp-time so we don't need
# to replicate this environment fallback in make as well.
CC.host ?= %(CC.host)s
CFLAGS.host ?= $(CPPFLAGS_host) $(CFLAGS_host)
CXX.host ?= %(CXX.host)s
CXXFLAGS.host ?= $(CPPFLAGS_host) $(CXXFLAGS_host)
LINK.host ?= %(LINK.host)s
LDFLAGS.host ?= $(LDFLAGS_host)
AR.host ?= %(AR.host)s

# Define a dir function that can handle spaces.
# http://www.gnu.org/software/make/manual/make.html#Syntax-of-Functions
# "leading spaces cannot appear in the text of the first argument as written.
# These characters can be put into the argument value by variable substitution."
empty :=
space := $(empty) $(empty)

# http://stackoverflow.com/questions/1189781/using-make-dir-or-notdir-on-a-path-with-spaces
replace_spaces = $(subst $(space),"""
    + SPACE_REPLACEMENT
    + """,$1)
unreplace_spaces = $(subst """
    + SPACE_REPLACEMENT
    + """,$(space),$1)
dirx = $(call unreplace_spaces,$(dir $(call replace_spaces,$1)))

# Flags to make gcc output dependency info.  Note that you need to be
# careful here to use the flags that ccache and distcc can understand.
# We write to a dep file on the side first and then rename at the end
# so we can't end up with a broken dep file.
depfile = $(depsdir)/$(call replace_spaces,$@).d
DEPFLAGS = %(makedep_args)s -MF $(depfile).raw

# We have to fixup the deps output in a few ways.
# (1) the file output should mention the proper .o file.
# ccache or distcc lose the path to the target, so we convert a rule of
# the form:
#   foobar.o: DEP1 DEP2
# into
#   path/to/foobar.o: DEP1 DEP2
# (2) we want missing files not to cause us to fail to build.
# We want to rewrite
#   foobar.o: DEP1 DEP2 \\
#               DEP3
# to
#   DEP1:
#   DEP2:
#   DEP3:
# so if the files are missing, they're just considered phony rules.
# We have to do some pretty insane escaping to get those backslashes
# and dollar signs past make, the shell, and sed at the same time.
# Doesn't work with spaces, but that's fine: .d files have spaces in
# their names replaced with other characters."""
    r"""
define fixup_dep
# The depfile may not exist if the input file didn't have any #includes.
touch $(depfile).raw
# Fixup path as in (1).
sed -e "s|^$(notdir $@)|$@|" $(depfile).raw >> $(depfile)
# Add extra rules as in (2).
# We remove slashes and replace spaces with new lines;
# remove blank lines;
# delete the first line and append a colon to the remaining lines.
sed -e 's|\\||' -e 'y| |\n|' $(depfile).raw |\
  grep -v '^$$'                             |\
  sed -e 1d -e 's|$$|:|'                     \
    >> $(depfile)
rm $(depfile).raw
endef
"""
    """
# Command definitions:
# - cmd_foo is the actual command to run;
# - quiet_cmd_foo is the brief-output summary of the command.

quiet_cmd_cc = CC($(TOOLSET)) $@
cmd_cc = $(CC.$(TOOLSET)) -o $@ $< $(GYP_CFLAGS) $(DEPFLAGS) $(CFLAGS.$(TOOLSET)) -c

quiet_cmd_cxx = CXX($(TOOLSET)) $@
cmd_cxx = $(CXX.$(TOOLSET)) -o $@ $< $(GYP_CXXFLAGS) $(DEPFLAGS) $(CXXFLAGS.$(TOOLSET)) -c
%(extra_commands)s
quiet_cmd_touch = TOUCH $@
cmd_touch = touch $@

quiet_cmd_copy = COPY $@
# send stderr to /dev/null to ignore messages when linking directories.
cmd_copy = ln -f "$<" "$@" 2>/dev/null || (rm -rf "$@" && cp %(copy_archive_args)s "$<" "$@")

%(link_commands)s
"""  # noqa: E501
    r"""
# Define an escape_quotes function to escape single quotes.
# This allows us to handle quotes properly as long as we always use
# use single quotes and escape_quotes.
escape_quotes = $(subst ','\'',$(1))
# This comment is here just to include a ' to unconfuse syntax highlighting.
# Define an escape_vars function to escape '$' variable syntax.
# This allows us to read/write command lines with shell variables (e.g.
# $LD_LIBRARY_PATH), without triggering make substitution.
escape_vars = $(subst $$,$$$$,$(1))
# Helper that expands to a shell command to echo a string exactly as it is in
# make. This uses printf instead of echo because printf's behaviour with respect
# to escape sequences is more portable than echo's across different shells
# (e.g., dash, bash).
exact_echo = printf '%%s\n' '$(call escape_quotes,$(1))'
"""
    """
# Helper to compare the command we're about to run against the command
# we logged the last time we ran the command.  Produces an empty
# string (false) when the commands match.
# Tricky point: Make has no string-equality test function.
# The kernel uses the following, but it seems like it would have false
# positives, where one string reordered its arguments.
#   arg_check = $(strip $(filter-out $(cmd_$(1)), $(cmd_$@)) \\
#                       $(filter-out $(cmd_$@), $(cmd_$(1))))
# We instead substitute each for the empty string into the other, and
# say they're equal if both substitutions produce the empty string.
# .d files contain """
    + SPACE_REPLACEMENT
    + """ instead of spaces, take that into account.
command_changed = $(or $(subst $(cmd_$(1)),,$(cmd_$(call replace_spaces,$@))),\\
                       $(subst $(cmd_$(call replace_spaces,$@)),,$(cmd_$(1))))

# Helper that is non-empty when a prerequisite changes.
# Normally make does this implicitly, but we force rules to always run
# so we can check their command lines.
#   $? -- new prerequisites
#   $| -- order-only dependencies
prereq_changed = $(filter-out FORCE_DO_CMD,$(filter-out $|,$?))

# Helper that executes all postbuilds until one fails.
define do_postbuilds
  @E=0;\\
  for p in $(POSTBUILDS); do\\
    eval $$p;\\
    E=$$?;\\
    if [ $$E -ne 0 ]; then\\
      break;\\
    fi;\\
  done;\\
  if [ $$E -ne 0 ]; then\\
    rm -rf "$@";\\
    exit $$E;\\
  fi
endef

# do_cmd: run a command via the above cmd_foo names, if necessary.
# Should always run for a given target to handle command-line changes.
# Second argument, if non-zero, makes it do asm/C/C++ dependency munging.
# Third argument, if non-zero, makes it do POSTBUILDS processing.
# Note: We intentionally do NOT call dirx for depfile, since it contains """
    + SPACE_REPLACEMENT
    + """ for
# spaces already and dirx strips the """
    + SPACE_REPLACEMENT
    + """ characters.
define do_cmd
$(if $(or $(command_changed),$(prereq_changed)),
  @$(call exact_echo,  $($(quiet)cmd_$(1)))
  @mkdir -p "$(call dirx,$@)" "$(dir $(depfile))"
  $(if $(findstring flock,$(word %(flock_index)d,$(cmd_$1))),
    @$(cmd_$(1))
    @echo "  $(quiet_cmd_$(1)): Finished",
    @$(cmd_$(1))
  )
  @$(call exact_echo,$(call escape_vars,cmd_$(call replace_spaces,$@) := $(cmd_$(1)))) > $(depfile)
  @$(if $(2),$(fixup_dep))
  $(if $(and $(3), $(POSTBUILDS)),
    $(call do_postbuilds)
  )
)
endef

# Declare the "%(default_target)s" target first so it is the default,
# even though we don't have the deps yet.
.PHONY: %(default_target)s
%(default_target)s:

# make looks for ways to re-generate included makefiles, but in our case, we
# don't have a direct way. Explicitly telling make that it has nothing to do
# for them makes it go faster.
%%.d: ;

# Use FORCE_DO_CMD to force a target to run.  Should be coupled with
# do_cmd.
.PHONY: FORCE_DO_CMD
FORCE_DO_CMD:

"""  # noqa: E501
)

SHARED_HEADER_MAC_COMMANDS = """
quiet_cmd_objc = CXX($(TOOLSET)) $@
cmd_objc = $(CC.$(TOOLSET)) $(GYP_OBJCFLAGS) $(DEPFLAGS) -c -o $@ $<

quiet_cmd_objcxx = CXX($(TOOLSET)) $@
cmd_objcxx = $(CXX.$(TOOLSET)) $(GYP_OBJCXXFLAGS) $(DEPFLAGS) -c -o $@ $<

# Commands for precompiled header files.
quiet_cmd_pch_c = CXX($(TOOLSET)) $@
cmd_pch_c = $(CC.$(TOOLSET)) $(GYP_PCH_CFLAGS) $(DEPFLAGS) $(CXXFLAGS.$(TOOLSET)) -c -o $@ $<
quiet_cmd_pch_cc = CXX($(TOOLSET)) $@
cmd_pch_cc = $(CC.$(TOOLSET)) $(GYP_PCH_CXXFLAGS) $(DEPFLAGS) $(CXXFLAGS.$(TOOLSET)) -c -o $@ $<
quiet_cmd_pch_m = CXX($(TOOLSET)) $@
cmd_pch_m = $(CC.$(TOOLSET)) $(GYP_PCH_OBJCFLAGS) $(DEPFLAGS) -c -o $@ $<
quiet_cmd_pch_mm = CXX($(TOOLSET)) $@
cmd_pch_mm = $(CC.$(TOOLSET)) $(GYP_PCH_OBJCXXFLAGS) $(DEPFLAGS) -c -o $@ $<

# gyp-mac-tool is written next to the root Makefile by gyp.
# Use $(4) for the command, since $(2) and $(3) are used as flag by do_cmd
# already.
quiet_cmd_mac_tool = MACTOOL $(4) $<
cmd_mac_tool = ./gyp-mac-tool $(4) $< "$@"

quiet_cmd_mac_package_framework = PACKAGE FRAMEWORK $@
cmd_mac_package_framework = ./gyp-mac-tool package-framework "$@" $(4)

quiet_cmd_infoplist = INFOPLIST $@
cmd_infoplist = $(CC.$(TOOLSET)) -E -P -Wno-trigraphs -x c $(INFOPLIST_DEFINES) "$<" -o "$@"
"""  # noqa: E501


def WriteRootHeaderSuffixRules(writer):
    extensions = sorted(COMPILABLE_EXTENSIONS.keys(), key=str.lower)

    writer.write("# Suffix rules, putting all outputs into $(obj).\n")
    for ext in extensions:
        writer.write("$(obj).$(TOOLSET)/%%.o: $(srcdir)/%%%s FORCE_DO_CMD\n" % ext)
        writer.write("\t@$(call do_cmd,%s,1)\n" % COMPILABLE_EXTENSIONS[ext])

    writer.write("\n# Try building from generated source, too.\n")
    for ext in extensions:
        writer.write(
            "$(obj).$(TOOLSET)/%%.o: $(obj).$(TOOLSET)/%%%s FORCE_DO_CMD\n" % ext
        )
        writer.write("\t@$(call do_cmd,%s,1)\n" % COMPILABLE_EXTENSIONS[ext])
    writer.write("\n")
    for ext in extensions:
        writer.write("$(obj).$(TOOLSET)/%%.o: $(obj)/%%%s FORCE_DO_CMD\n" % ext)
        writer.write("\t@$(call do_cmd,%s,1)\n" % COMPILABLE_EXTENSIONS[ext])
    writer.write("\n")


SHARED_HEADER_SUFFIX_RULES_COMMENT1 = """\
# Suffix rules, putting all outputs into $(obj).
"""


SHARED_HEADER_SUFFIX_RULES_COMMENT2 = """\
# Try building from generated source, too.
"""


SHARED_FOOTER = """\
# "all" is a concatenation of the "all" targets from all the included
# sub-makefiles. This is just here to clarify.
all:

# Add in dependency-tracking rules.  $(all_deps) is the list of every single
# target in our tree. Only consider the ones with .d (dependency) info:
d_files := $(wildcard $(foreach f,$(all_deps),$(depsdir)/$(f).d))
ifneq ($(d_files),)
  include $(d_files)
endif
"""

header = """\
# This file is generated by gyp; do not edit.

"""

# Maps every compilable file extension to the do_cmd that compiles it.
COMPILABLE_EXTENSIONS = {
    ".c": "cc",
    ".cc": "cxx",
    ".cpp": "cxx",
    ".cxx": "cxx",
    ".s": "cc",
    ".S": "cc",
}


def Compilable(filename):
    """Return true if the file is compilable (should be in OBJS)."""
    for res in (filename.endswith(e) for e in COMPILABLE_EXTENSIONS):
        if res:
            return True
    return False


def Linkable(filename):
    """Return true if the file is linkable (should be on the link line)."""
    return filename.endswith(".o")


def Target(filename):
    """Translate a compilable filename to its .o target."""
    return os.path.splitext(filename)[0] + ".o"


def EscapeShellArgument(s):
    """Quotes an argument so that it will be interpreted literally by a POSIX
    shell. Taken from
    http://stackoverflow.com/questions/35817/whats-the-best-way-to-escape-ossystem-calls-in-python
    """
    return "'" + s.replace("'", "'\\''") + "'"


def EscapeMakeVariableExpansion(s):
    """Make has its own variable expansion syntax using $. We must escape it for
    string to be interpreted literally."""
    return s.replace("$", "$$")


def EscapeCppDefine(s):
    """Escapes a CPP define so that it will reach the compiler unaltered."""
    s = EscapeShellArgument(s)
    s = EscapeMakeVariableExpansion(s)
    # '#' characters must be escaped even embedded in a string, else Make will
    # treat it as the start of a comment.
    return s.replace("#", r"\#")


def QuoteIfNecessary(string):
    """TODO: Should this ideally be replaced with one or more of the above
    functions?"""
    if '"' in string:
        string = '"' + string.replace('"', '\\"') + '"'
    return string


def StringToMakefileVariable(string):
    """Convert a string to a value that is acceptable as a make variable name."""
    return re.sub("[^a-zA-Z0-9_]", "_", string)


srcdir_prefix = ""


def Sourceify(path):
    """Convert a path to its source directory form."""
    if "$(" in path:
        return path
    if os.path.isabs(path):
        return path
    return srcdir_prefix + path


def QuoteSpaces(s, quote=r"\ "):
    return s.replace(" ", quote)


def SourceifyAndQuoteSpaces(path):
    """Convert a path to its source directory form and quote spaces."""
    return QuoteSpaces(Sourceify(path))


# Map from qualified target to path to output.
target_outputs = {}
# Map from qualified target to any linkable output.  A subset
# of target_outputs.  E.g. when mybinary depends on liba, we want to
# include liba in the linker line; when otherbinary depends on
# mybinary, we just want to build mybinary first.
target_link_deps = {}


class MakefileWriter:
    """MakefileWriter packages up the writing of one target-specific foobar.mk.

    Its only real entry point is Write(), and is mostly used for namespacing.
    """

    def __init__(self, generator_flags, flavor):
        self.generator_flags = generator_flags
        self.flavor = flavor

        self.suffix_rules_srcdir = {}
        self.suffix_rules_objdir1 = {}
        self.suffix_rules_objdir2 = {}

        # Generate suffix rules for all compilable extensions.
        for ext in COMPILABLE_EXTENSIONS.keys():
            # Suffix rules for source folder.
            self.suffix_rules_srcdir.update(
                {
                    ext: (
                        """\
$(obj).$(TOOLSET)/$(TARGET)/%%.o: $(srcdir)/%%%s FORCE_DO_CMD
\t@$(call do_cmd,%s,1)
"""
                        % (ext, COMPILABLE_EXTENSIONS[ext])
                    )
                }
            )

            # Suffix rules for generated source files.
            self.suffix_rules_objdir1.update(
                {
                    ext: (
                        """\
$(obj).$(TOOLSET)/$(TARGET)/%%.o: $(obj).$(TOOLSET)/%%%s FORCE_DO_CMD
\t@$(call do_cmd,%s,1)
"""
                        % (ext, COMPILABLE_EXTENSIONS[ext])
                    )
                }
            )
            self.suffix_rules_objdir2.update(
                {
                    ext: (
                        """\
$(obj).$(TOOLSET)/$(TARGET)/%%.o: $(obj)/%%%s FORCE_DO_CMD
\t@$(call do_cmd,%s,1)
"""
                        % (ext, COMPILABLE_EXTENSIONS[ext])
                    )
                }
            )

    def Write(
        self, qualified_target, base_path, output_filename, spec, configs, part_of_all
    ):
        """The main entry point: writes a .mk file for a single target.

        Arguments:
          qualified_target: target we're generating
          base_path: path relative to source root we're building in, used to resolve
                     target-relative paths
          output_filename: output .mk file name to write
          spec, configs: gyp info
          part_of_all: flag indicating this target is part of 'all'
        """
        gyp.common.EnsureDirExists(output_filename)

        self.fp = open(output_filename, "w")

        self.fp.write(header)

        self.qualified_target = qualified_target
        self.path = base_path
        self.target = spec["target_name"]
        self.type = spec["type"]
        self.toolset = spec["toolset"]

        self.is_mac_bundle = gyp.xcode_emulation.IsMacBundle(self.flavor, spec)
        if self.flavor == "mac":
            self.xcode_settings = gyp.xcode_emulation.XcodeSettings(spec)
        else:
            self.xcode_settings = None

        deps, link_deps = self.ComputeDeps(spec)

        # Some of the generation below can add extra output, sources, or
        # link dependencies.  All of the out params of the functions that
        # follow use names like extra_foo.
        extra_outputs = []
        extra_sources = []
        extra_link_deps = []
        extra_mac_bundle_resources = []
        mac_bundle_deps = []

        if self.is_mac_bundle:
            self.output = self.ComputeMacBundleOutput(spec)
            self.output_binary = self.ComputeMacBundleBinaryOutput(spec)
        else:
            self.output = self.output_binary = self.ComputeOutput(spec)

        self.is_standalone_static_library = bool(
            spec.get("standalone_static_library", 0)
        )
        self._INSTALLABLE_TARGETS = ("executable", "loadable_module", "shared_library")
        if self.is_standalone_static_library or self.type in self._INSTALLABLE_TARGETS:
            self.alias = os.path.basename(self.output)
            install_path = self._InstallableTargetInstallPath()
        else:
            self.alias = self.output
            install_path = self.output

        self.WriteLn("TOOLSET := " + self.toolset)
        self.WriteLn("TARGET := " + self.target)

        # Actions must come first, since they can generate more OBJs for use below.
        if "actions" in spec:
            self.WriteActions(
                spec["actions"],
                extra_sources,
                extra_outputs,
                extra_mac_bundle_resources,
                part_of_all,
            )

        # Rules must be early like actions.
        if "rules" in spec:
            self.WriteRules(
                spec["rules"],
                extra_sources,
                extra_outputs,
                extra_mac_bundle_resources,
                part_of_all,
            )

        if "copies" in spec:
            self.WriteCopies(spec["copies"], extra_outputs, part_of_all)

        # Bundle resources.
        if self.is_mac_bundle:
            all_mac_bundle_resources = (
                spec.get("mac_bundle_resources", []) + extra_mac_bundle_resources
            )
            self.WriteMacBundleResources(all_mac_bundle_resources, mac_bundle_deps)
            self.WriteMacInfoPlist(mac_bundle_deps)

        # Sources.
        all_sources = spec.get("sources", []) + extra_sources
        if all_sources:
            self.WriteSources(
                configs,
                deps,
                all_sources,
                extra_outputs,
                extra_link_deps,
                part_of_all,
                gyp.xcode_emulation.MacPrefixHeader(
                    self.xcode_settings,
                    lambda p: Sourceify(self.Absolutify(p)),
                    self.Pchify,
                ),
            )
            sources = [x for x in all_sources if Compilable(x)]
            if sources:
                self.WriteLn(SHARED_HEADER_SUFFIX_RULES_COMMENT1)
                extensions = {os.path.splitext(s)[1] for s in sources}
                for ext in extensions:
                    if ext in self.suffix_rules_srcdir:
                        self.WriteLn(self.suffix_rules_srcdir[ext])
                self.WriteLn(SHARED_HEADER_SUFFIX_RULES_COMMENT2)
                for ext in extensions:
                    if ext in self.suffix_rules_objdir1:
                        self.WriteLn(self.suffix_rules_objdir1[ext])
                for ext in extensions:
                    if ext in self.suffix_rules_objdir2:
                        self.WriteLn(self.suffix_rules_objdir2[ext])
                self.WriteLn("# End of this set of suffix rules")

                # Add dependency from bundle to bundle binary.
                if self.is_mac_bundle:
                    mac_bundle_deps.append(self.output_binary)

        self.WriteTarget(
            spec,
            configs,
            deps,
            extra_link_deps + link_deps,
            mac_bundle_deps,
            extra_outputs,
            part_of_all,
        )

        # Update global list of target outputs, used in dependency tracking.
        target_outputs[qualified_target] = install_path

        # Update global list of link dependencies.
        if self.type in ("static_library", "shared_library"):
            target_link_deps[qualified_target] = self.output_binary

        # Currently any versions have the same effect, but in future the behavior
        # could be different.
        if self.generator_flags.get("android_ndk_version", None):
            self.WriteAndroidNdkModuleRule(self.target, all_sources, link_deps)

        self.fp.close()

    def WriteSubMake(self, output_filename, makefile_path, targets, build_dir):
        """Write a "sub-project" Makefile.

        This is a small, wrapper Makefile that calls the top-level Makefile to build
        the targets from a single gyp file (i.e. a sub-project).

        Arguments:
          output_filename: sub-project Makefile name to write
          makefile_path: path to the top-level Makefile
          targets: list of "all" targets for this sub-project
          build_dir: build output directory, relative to the sub-project
        """
        gyp.common.EnsureDirExists(output_filename)
        self.fp = open(output_filename, "w")
        self.fp.write(header)
        # For consistency with other builders, put sub-project build output in the
        # sub-project dir (see test/subdirectory/gyptest-subdir-all.py).
        self.WriteLn(
            "export builddir_name ?= %s"
            % os.path.join(os.path.dirname(output_filename), build_dir)
        )
        self.WriteLn(".PHONY: all")
        self.WriteLn("all:")
        if makefile_path:
            makefile_path = " -C " + makefile_path
        self.WriteLn("\t$(MAKE){} {}".format(makefile_path, " ".join(targets)))
        self.fp.close()

    def WriteActions(
        self,
        actions,
        extra_sources,
        extra_outputs,
        extra_mac_bundle_resources,
        part_of_all,
    ):
        """Write Makefile code for any 'actions' from the gyp input.

        extra_sources: a list that will be filled in with newly generated source
                       files, if any
        extra_outputs: a list that will be filled in with any outputs of these
                       actions (used to make other pieces dependent on these
                       actions)
        part_of_all: flag indicating this target is part of 'all'
        """
        env = self.GetSortedXcodeEnv()
        for action in actions:
            name = StringToMakefileVariable(
                "{}_{}".format(self.qualified_target, action["action_name"])
            )
            self.WriteLn('### Rules for action "%s":' % action["action_name"])
            inputs = action["inputs"]
            outputs = action["outputs"]

            # Build up a list of outputs.
            # Collect the output dirs we'll need.
            dirs = set()
            for out in outputs:
                dir = os.path.split(out)[0]
                if dir:
                    dirs.add(dir)
            if int(action.get("process_outputs_as_sources", False)):
                extra_sources += outputs
            if int(action.get("process_outputs_as_mac_bundle_resources", False)):
                extra_mac_bundle_resources += outputs

            # Write the actual command.
            action_commands = action["action"]
            if self.flavor == "mac":
                action_commands = [
                    gyp.xcode_emulation.ExpandEnvVars(command, env)
                    for command in action_commands
                ]
            command = gyp.common.EncodePOSIXShellList(action_commands)
            if "message" in action:
                self.WriteLn(
                    "quiet_cmd_{} = ACTION {} $@".format(name, action["message"])
                )
            else:
                self.WriteLn(f"quiet_cmd_{name} = ACTION {name} $@")
            if len(dirs) > 0:
                command = "mkdir -p %s" % " ".join(dirs) + "; " + command

            cd_action = "cd %s; " % Sourceify(self.path or ".")

            # command and cd_action get written to a toplevel variable called
            # cmd_foo. Toplevel variables can't handle things that change per
            # makefile like $(TARGET), so hardcode the target.
            command = command.replace("$(TARGET)", self.target)
            cd_action = cd_action.replace("$(TARGET)", self.target)

            # Set LD_LIBRARY_PATH in case the action runs an executable from this
            # build which links to shared libs from this build.
            # actions run on the host, so they should in theory only use host
            # libraries, but until everything is made cross-compile safe, also use
            # target libraries.
            # TODO(piman): when everything is cross-compile safe, remove lib.target
            self.WriteLn(
                "cmd_%s = LD_LIBRARY_PATH=$(builddir)/lib.host:"
                "$(builddir)/lib.target:$$LD_LIBRARY_PATH; "
                "export LD_LIBRARY_PATH; "
                "%s%s" % (name, cd_action, command)
            )
            self.WriteLn()
            outputs = [self.Absolutify(o) for o in outputs]
            # The makefile rules are all relative to the top dir, but the gyp actions
            # are defined relative to their containing dir.  This replaces the obj
            # variable for the action rule with an absolute version so that the output
            # goes in the right place.
            # Only write the 'obj' and 'builddir' rules for the "primary" output (:1);
            # it's superfluous for the "extra outputs", and this avoids accidentally
            # writing duplicate dummy rules for those outputs.
            # Same for environment.
            self.WriteLn("%s: obj := $(abs_obj)" % QuoteSpaces(outputs[0]))
            self.WriteLn("%s: builddir := $(abs_builddir)" % QuoteSpaces(outputs[0]))
            self.WriteSortedXcodeEnv(outputs[0], self.GetSortedXcodeEnv())

            for input in inputs:
                assert " " not in input, (
                    "Spaces in action input filenames not supported (%s)" % input
                )
            for output in outputs:
                assert " " not in output, (
                    "Spaces in action output filenames not supported (%s)" % output
                )

            # See the comment in WriteCopies about expanding env vars.
            outputs = [gyp.xcode_emulation.ExpandEnvVars(o, env) for o in outputs]
            inputs = [gyp.xcode_emulation.ExpandEnvVars(i, env) for i in inputs]

            self.WriteDoCmd(
                outputs,
                [Sourceify(self.Absolutify(i)) for i in inputs],
                part_of_all=part_of_all,
                command=name,
            )

            # Stuff the outputs in a variable so we can refer to them later.
            outputs_variable = "action_%s_outputs" % name
            self.WriteLn("{} := {}".format(outputs_variable, " ".join(outputs)))
            extra_outputs.append("$(%s)" % outputs_variable)
            self.WriteLn()

        self.WriteLn()

    def WriteRules(
        self,
        rules,
        extra_sources,
        extra_outputs,
        extra_mac_bundle_resources,
        part_of_all,
    ):
        """Write Makefile code for any 'rules' from the gyp input.

        extra_sources: a list that will be filled in with newly generated source
                       files, if any
        extra_outputs: a list that will be filled in with any outputs of these
                       rules (used to make other pieces dependent on these rules)
        part_of_all: flag indicating this target is part of 'all'
        """
        env = self.GetSortedXcodeEnv()
        for rule in rules:
            name = StringToMakefileVariable(
                "{}_{}".format(self.qualified_target, rule["rule_name"])
            )
            count = 0
            self.WriteLn("### Generated for rule %s:" % name)

            all_outputs = []

            for rule_source in rule.get("rule_sources", []):
                dirs = set()
                (rule_source_dirname, rule_source_basename) = os.path.split(rule_source)
                (rule_source_root, rule_source_ext) = os.path.splitext(
                    rule_source_basename
                )

                outputs = [
                    self.ExpandInputRoot(out, rule_source_root, rule_source_dirname)
                    for out in rule["outputs"]
                ]

                for out in outputs:
                    dir = os.path.dirname(out)
                    if dir:
                        dirs.add(dir)
                if int(rule.get("process_outputs_as_sources", False)):
                    extra_sources += outputs
                if int(rule.get("process_outputs_as_mac_bundle_resources", False)):
                    extra_mac_bundle_resources += outputs
                inputs = [
                    Sourceify(self.Absolutify(i))
                    for i in [rule_source] + rule.get("inputs", [])
                ]
                actions = ["$(call do_cmd,%s_%d)" % (name, count)]

                if name == "resources_grit":
                    # HACK: This is ugly.  Grit intentionally doesn't touch the
                    # timestamp of its output file when the file doesn't change,
                    # which is fine in hash-based dependency systems like scons
                    # and forge, but not kosher in the make world.  After some
                    # discussion, hacking around it here seems like the least
                    # amount of pain.
                    actions += ["@touch --no-create $@"]

                # See the comment in WriteCopies about expanding env vars.
                outputs = [gyp.xcode_emulation.ExpandEnvVars(o, env) for o in outputs]
                inputs = [gyp.xcode_emulation.ExpandEnvVars(i, env) for i in inputs]

                outputs = [self.Absolutify(o) for o in outputs]
                all_outputs += outputs
                # Only write the 'obj' and 'builddir' rules for the "primary" output
                # (:1); it's superfluous for the "extra outputs", and this avoids
                # accidentally writing duplicate dummy rules for those outputs.
                self.WriteLn("%s: obj := $(abs_obj)" % outputs[0])
                self.WriteLn("%s: builddir := $(abs_builddir)" % outputs[0])
                self.WriteMakeRule(
                    outputs, inputs, actions, command="%s_%d" % (name, count)
                )
                # Spaces in rule filenames are not supported, but rule variables have
                # spaces in them (e.g. RULE_INPUT_PATH expands to '$(abspath $<)').
                # The spaces within the variables are valid, so remove the variables
                # before checking.
                variables_with_spaces = re.compile(r"\$\([^ ]* \$<\)")
                for output in outputs:
                    output = re.sub(variables_with_spaces, "", output)
                    assert " " not in output, (
                        "Spaces in rule filenames not yet supported (%s)" % output
                    )
                self.WriteLn("all_deps += %s" % " ".join(outputs))

                action = [
                    self.ExpandInputRoot(ac, rule_source_root, rule_source_dirname)
                    for ac in rule["action"]
                ]
                mkdirs = ""
                if len(dirs) > 0:
                    mkdirs = "mkdir -p %s; " % " ".join(dirs)
                cd_action = "cd %s; " % Sourceify(self.path or ".")

                # action, cd_action, and mkdirs get written to a toplevel variable
                # called cmd_foo. Toplevel variables can't handle things that change
                # per makefile like $(TARGET), so hardcode the target.
                if self.flavor == "mac":
                    action = [
                        gyp.xcode_emulation.ExpandEnvVars(command, env)
                        for command in action
                    ]
                action = gyp.common.EncodePOSIXShellList(action)
                action = action.replace("$(TARGET)", self.target)
                cd_action = cd_action.replace("$(TARGET)", self.target)
                mkdirs = mkdirs.replace("$(TARGET)", self.target)

                # Set LD_LIBRARY_PATH in case the rule runs an executable from this
                # build which links to shared libs from this build.
                # rules run on the host, so they should in theory only use host
                # libraries, but until everything is made cross-compile safe, also use
                # target libraries.
                # TODO(piman): when everything is cross-compile safe, remove lib.target
                self.WriteLn(
                    "cmd_%(name)s_%(count)d = LD_LIBRARY_PATH="
                    "$(builddir)/lib.host:$(builddir)/lib.target:$$LD_LIBRARY_PATH; "
                    "export LD_LIBRARY_PATH; "
                    "%(cd_action)s%(mkdirs)s%(action)s"
                    % {
                        "action": action,
                        "cd_action": cd_action,
                        "count": count,
                        "mkdirs": mkdirs,
                        "name": name,
                    }
                )
                self.WriteLn(
                    "quiet_cmd_%(name)s_%(count)d = RULE %(name)s_%(count)d $@"
                    % {"count": count, "name": name}
                )
                self.WriteLn()
                count += 1

            outputs_variable = "rule_%s_outputs" % name
            self.WriteList(all_outputs, outputs_variable)
            extra_outputs.append("$(%s)" % outputs_variable)

            self.WriteLn("### Finished generating for rule: %s" % name)
            self.WriteLn()
        self.WriteLn("### Finished generating for all rules")
        self.WriteLn("")

    def WriteCopies(self, copies, extra_outputs, part_of_all):
        """Write Makefile code for any 'copies' from the gyp input.

        extra_outputs: a list that will be filled in with any outputs of this action
                       (used to make other pieces dependent on this action)
        part_of_all: flag indicating this target is part of 'all'
        """
        self.WriteLn("### Generated for copy rule.")

        variable = StringToMakefileVariable(self.qualified_target + "_copies")
        outputs = []
        for copy in copies:
            for path in copy["files"]:
                # Absolutify() may call normpath, and will strip trailing slashes.
                path = Sourceify(self.Absolutify(path))
                filename = os.path.split(path)[1]
                output = Sourceify(
                    self.Absolutify(os.path.join(copy["destination"], filename))
                )

                # If the output path has variables in it, which happens in practice for
                # 'copies', writing the environment as target-local doesn't work,
                # because the variables are already needed for the target name.
                # Copying the environment variables into global make variables doesn't
                # work either, because then the .d files will potentially contain spaces
                # after variable expansion, and .d file handling cannot handle spaces.
                # As a workaround, manually expand variables at gyp time. Since 'copies'
                # can't run scripts, there's no need to write the env then.
                # WriteDoCmd() will escape spaces for .d files.
                env = self.GetSortedXcodeEnv()
                output = gyp.xcode_emulation.ExpandEnvVars(output, env)
                path = gyp.xcode_emulation.ExpandEnvVars(path, env)
                self.WriteDoCmd([output], [path], "copy", part_of_all)
                outputs.append(output)
        self.WriteLn(
            "{} = {}".format(variable, " ".join(QuoteSpaces(o) for o in outputs))
        )
        extra_outputs.append("$(%s)" % variable)
        self.WriteLn()

    def WriteMacBundleResources(self, resources, bundle_deps):
        """Writes Makefile code for 'mac_bundle_resources'."""
        self.WriteLn("### Generated for mac_bundle_resources")

        for output, res in gyp.xcode_emulation.GetMacBundleResources(
            generator_default_variables["PRODUCT_DIR"],
            self.xcode_settings,
            [Sourceify(self.Absolutify(r)) for r in resources],
        ):
            _, ext = os.path.splitext(output)
            if ext != ".xcassets":
                # Make does not supports '.xcassets' emulation.
                self.WriteDoCmd(
                    [output], [res], "mac_tool,,,copy-bundle-resource", part_of_all=True
                )
                bundle_deps.append(output)

    def WriteMacInfoPlist(self, bundle_deps):
        """Write Makefile code for bundle Info.plist files."""
        info_plist, out, defines, extra_env = gyp.xcode_emulation.GetMacInfoPlist(
            generator_default_variables["PRODUCT_DIR"],
            self.xcode_settings,
            lambda p: Sourceify(self.Absolutify(p)),
        )
        if not info_plist:
            return
        if defines:
            # Create an intermediate file to store preprocessed results.
            intermediate_plist = "$(obj).$(TOOLSET)/$(TARGET)/" + os.path.basename(
                info_plist
            )
            self.WriteList(
                defines,
                intermediate_plist + ": INFOPLIST_DEFINES",
                "-D",
                quoter=EscapeCppDefine,
            )
            self.WriteMakeRule(
                [intermediate_plist],
                [info_plist],
                [
                    "$(call do_cmd,infoplist)",
                    # "Convert" the plist so that any weird whitespace changes from the
                    # preprocessor do not affect the XML parser in mac_tool.
                    "@plutil -convert xml1 $@ $@",
                ],
            )
            info_plist = intermediate_plist
        # plists can contain envvars and substitute them into the file.
        self.WriteSortedXcodeEnv(
            out, self.GetSortedXcodeEnv(additional_settings=extra_env)
        )
        self.WriteDoCmd(
            [out], [info_plist], "mac_tool,,,copy-info-plist", part_of_all=True
        )
        bundle_deps.append(out)

    def WriteSources(
        self,
        configs,
        deps,
        sources,
        extra_outputs,
        extra_link_deps,
        part_of_all,
        precompiled_header,
    ):
        """Write Makefile code for any 'sources' from the gyp input.
        These are source files necessary to build the current target.

        configs, deps, sources: input from gyp.
        extra_outputs: a list of extra outputs this action should be dependent on;
                       used to serialize action/rules before compilation
        extra_link_deps: a list that will be filled in with any outputs of
                         compilation (to be used in link lines)
        part_of_all: flag indicating this target is part of 'all'
        """

        # Write configuration-specific variables for CFLAGS, etc.
        for configname in sorted(configs.keys()):
            config = configs[configname]
            self.WriteList(
                config.get("defines"),
                "DEFS_%s" % configname,
                prefix="-D",
                quoter=EscapeCppDefine,
            )

            if self.flavor == "mac":
                cflags = self.xcode_settings.GetCflags(
                    configname, arch=config.get("xcode_configuration_platform")
                )
                cflags_c = self.xcode_settings.GetCflagsC(configname)
                cflags_cc = self.xcode_settings.GetCflagsCC(configname)
                cflags_objc = self.xcode_settings.GetCflagsObjC(configname)
                cflags_objcc = self.xcode_settings.GetCflagsObjCC(configname)
            else:
                cflags = config.get("cflags")
                cflags_c = config.get("cflags_c")
                cflags_cc = config.get("cflags_cc")

            self.WriteLn("# Flags passed to all source files.")
            self.WriteList(cflags, "CFLAGS_%s" % configname)
            self.WriteLn("# Flags passed to only C files.")
            self.WriteList(cflags_c, "CFLAGS_C_%s" % configname)
            self.WriteLn("# Flags passed to only C++ files.")
            self.WriteList(cflags_cc, "CFLAGS_CC_%s" % configname)
            if self.flavor == "mac":
                self.WriteLn("# Flags passed to only ObjC files.")
                self.WriteList(cflags_objc, "CFLAGS_OBJC_%s" % configname)
                self.WriteLn("# Flags passed to only ObjC++ files.")
                self.WriteList(cflags_objcc, "CFLAGS_OBJCC_%s" % configname)
            includes = config.get("include_dirs")
            if includes:
                includes = [Sourceify(self.Absolutify(i)) for i in includes]
            self.WriteList(includes, "INCS_%s" % configname, prefix="-I")

        compilable = list(filter(Compilable, sources))
        objs = [self.Objectify(self.Absolutify(Target(c))) for c in compilable]
        self.WriteList(objs, "OBJS")

        for obj in objs:
            assert " " not in obj, "Spaces in object filenames not supported (%s)" % obj
        self.WriteLn(
            "# Add to the list of files we specially track " "dependencies for."
        )
        self.WriteLn("all_deps += $(OBJS)")
        self.WriteLn()

        # Make sure our dependencies are built first.
        if deps:
            self.WriteMakeRule(
                ["$(OBJS)"],
                deps,
                comment="Make sure our dependencies are built " "before any of us.",
                order_only=True,
            )

        # Make sure the actions and rules run first.
        # If they generate any extra headers etc., the per-.o file dep tracking
        # will catch the proper rebuilds, so order only is still ok here.
        if extra_outputs:
            self.WriteMakeRule(
                ["$(OBJS)"],
                extra_outputs,
                comment="Make sure our actions/rules run " "before any of us.",
                order_only=True,
            )

        pchdeps = precompiled_header.GetObjDependencies(compilable, objs)
        if pchdeps:
            self.WriteLn("# Dependencies from obj files to their precompiled headers")
            for source, obj, gch in pchdeps:
                self.WriteLn(f"{obj}: {gch}")
            self.WriteLn("# End precompiled header dependencies")

        if objs:
            extra_link_deps.append("$(OBJS)")
            self.WriteLn(
                """\
# CFLAGS et al overrides must be target-local.
# See "Target-specific Variable Values" in the GNU Make manual."""
            )
            self.WriteLn("$(OBJS): TOOLSET := $(TOOLSET)")
            self.WriteLn(
                "$(OBJS): GYP_CFLAGS := "
                "$(DEFS_$(BUILDTYPE)) "
                "$(INCS_$(BUILDTYPE)) "
                "%s " % precompiled_header.GetInclude("c") + "$(CFLAGS_$(BUILDTYPE)) "
                "$(CFLAGS_C_$(BUILDTYPE))"
            )
            self.WriteLn(
                "$(OBJS): GYP_CXXFLAGS := "
                "$(DEFS_$(BUILDTYPE)) "
                "$(INCS_$(BUILDTYPE)) "
                "%s " % precompiled_header.GetInclude("cc") + "$(CFLAGS_$(BUILDTYPE)) "
                "$(CFLAGS_CC_$(BUILDTYPE))"
            )
            if self.flavor == "mac":
                self.WriteLn(
                    "$(OBJS): GYP_OBJCFLAGS := "
                    "$(DEFS_$(BUILDTYPE)) "
                    "$(INCS_$(BUILDTYPE)) "
                    "%s " % precompiled_header.GetInclude("m")
                    + "$(CFLAGS_$(BUILDTYPE)) "
                    "$(CFLAGS_C_$(BUILDTYPE)) "
                    "$(CFLAGS_OBJC_$(BUILDTYPE))"
                )
                self.WriteLn(
                    "$(OBJS): GYP_OBJCXXFLAGS := "
                    "$(DEFS_$(BUILDTYPE)) "
                    "$(INCS_$(BUILDTYPE)) "
                    "%s " % precompiled_header.GetInclude("mm")
                    + "$(CFLAGS_$(BUILDTYPE)) "
                    "$(CFLAGS_CC_$(BUILDTYPE)) "
                    "$(CFLAGS_OBJCC_$(BUILDTYPE))"
                )

        self.WritePchTargets(precompiled_header.GetPchBuildCommands())

        # If there are any object files in our input file list, link them into our
        # output.
        extra_link_deps += [source for source in sources if Linkable(source)]

        self.WriteLn()

    def WritePchTargets(self, pch_commands):
        """Writes make rules to compile prefix headers."""
        if not pch_commands:
            return

        for gch, lang_flag, lang, input in pch_commands:
            extra_flags = {
                "c": "$(CFLAGS_C_$(BUILDTYPE))",
                "cc": "$(CFLAGS_CC_$(BUILDTYPE))",
                "m": "$(CFLAGS_C_$(BUILDTYPE)) $(CFLAGS_OBJC_$(BUILDTYPE))",
                "mm": "$(CFLAGS_CC_$(BUILDTYPE)) $(CFLAGS_OBJCC_$(BUILDTYPE))",
            }[lang]
            var_name = {
                "c": "GYP_PCH_CFLAGS",
                "cc": "GYP_PCH_CXXFLAGS",
                "m": "GYP_PCH_OBJCFLAGS",
                "mm": "GYP_PCH_OBJCXXFLAGS",
            }[lang]
            self.WriteLn(
                f"{gch}: {var_name} := {lang_flag} " + "$(DEFS_$(BUILDTYPE)) "
                "$(INCS_$(BUILDTYPE)) "
                "$(CFLAGS_$(BUILDTYPE)) " + extra_flags
            )

            self.WriteLn(f"{gch}: {input} FORCE_DO_CMD")
            self.WriteLn("\t@$(call do_cmd,pch_%s,1)" % lang)
            self.WriteLn("")
            assert " " not in gch, "Spaces in gch filenames not supported (%s)" % gch
            self.WriteLn("all_deps += %s" % gch)
            self.WriteLn("")

    def ComputeOutputBasename(self, spec):
        """Return the 'output basename' of a gyp spec.

        E.g., the loadable module 'foobar' in directory 'baz' will produce
          'libfoobar.so'
        """
        assert not self.is_mac_bundle

        if self.flavor == "mac" and self.type in (
            "static_library",
            "executable",
            "shared_library",
            "loadable_module",
        ):
            return self.xcode_settings.GetExecutablePath()

        target = spec["target_name"]
        target_prefix = ""
        target_ext = ""
        if self.type == "static_library":
            if target[:3] == "lib":
                target = target[3:]
            target_prefix = "lib"
            target_ext = ".a"
        elif self.type in ("loadable_module", "shared_library"):
            if target[:3] == "lib":
                target = target[3:]
            target_prefix = "lib"
            if self.flavor == "aix":
                target_ext = ".a"
            else:
                target_ext = ".so"
        elif self.type == "none":
            target = "%s.stamp" % target
        elif self.type != "executable":
            print(
                "ERROR: What output file should be generated?",
                "type",
                self.type,
                "target",
                target,
            )

        target_prefix = spec.get("product_prefix", target_prefix)
        target = spec.get("product_name", target)
        product_ext = spec.get("product_extension")
        if product_ext:
            target_ext = "." + product_ext

        return target_prefix + target + target_ext

    def _InstallImmediately(self):
        return (
            self.toolset == "target"
            and self.flavor == "mac"
            and self.type
            in ("static_library", "executable", "shared_library", "loadable_module")
        )

    def ComputeOutput(self, spec):
        """Return the 'output' (full output path) of a gyp spec.

        E.g., the loadable module 'foobar' in directory 'baz' will produce
          '$(obj)/baz/libfoobar.so'
        """
        assert not self.is_mac_bundle

        path = os.path.join("$(obj)." + self.toolset, self.path)
        if self.type == "executable" or self._InstallImmediately():
            path = "$(builddir)"
        path = spec.get("product_dir", path)
        return os.path.join(path, self.ComputeOutputBasename(spec))

    def ComputeMacBundleOutput(self, spec):
        """Return the 'output' (full output path) to a bundle output directory."""
        assert self.is_mac_bundle
        path = generator_default_variables["PRODUCT_DIR"]
        return os.path.join(path, self.xcode_settings.GetWrapperName())

    def ComputeMacBundleBinaryOutput(self, spec):
        """Return the 'output' (full output path) to the binary in a bundle."""
        path = generator_default_variables["PRODUCT_DIR"]
        return os.path.join(path, self.xcode_settings.GetExecutablePath())

    def ComputeDeps(self, spec):
        """Compute the dependencies of a gyp spec.

        Returns a tuple (deps, link_deps), where each is a list of
        filenames that will need to be put in front of make for either
        building (deps) or linking (link_deps).
        """
        deps = []
        link_deps = []
        if "dependencies" in spec:
            deps.extend(
                [
                    target_outputs[dep]
                    for dep in spec["dependencies"]
                    if target_outputs[dep]
                ]
            )
            for dep in spec["dependencies"]:
                if dep in target_link_deps:
                    link_deps.append(target_link_deps[dep])
            deps.extend(link_deps)
            # TODO: It seems we need to transitively link in libraries (e.g. -lfoo)?
            # This hack makes it work:
            # link_deps.extend(spec.get('libraries', []))
        return (gyp.common.uniquer(deps), gyp.common.uniquer(link_deps))

    def WriteDependencyOnExtraOutputs(self, target, extra_outputs):
        self.WriteMakeRule(
            [self.output_binary],
            extra_outputs,
            comment="Build our special outputs first.",
            order_only=True,
        )

    def WriteTarget(
        self, spec, configs, deps, link_deps, bundle_deps, extra_outputs, part_of_all
    ):
        """Write Makefile code to produce the final target of the gyp spec.

        spec, configs: input from gyp.
        deps, link_deps: dependency lists; see ComputeDeps()
        extra_outputs: any extra outputs that our target should depend on
        part_of_all: flag indicating this target is part of 'all'
        """

        self.WriteLn("### Rules for final target.")

        if extra_outputs:
            self.WriteDependencyOnExtraOutputs(self.output_binary, extra_outputs)
            self.WriteMakeRule(
                extra_outputs,
                deps,
                comment=("Preserve order dependency of " "special output on deps."),
                order_only=True,
            )

        target_postbuilds = {}
        if self.type != "none":
            for configname in sorted(configs.keys()):
                config = configs[configname]
                if self.flavor == "mac":
                    ldflags = self.xcode_settings.GetLdflags(
                        configname,
                        generator_default_variables["PRODUCT_DIR"],
                        lambda p: Sourceify(self.Absolutify(p)),
                        arch=config.get("xcode_configuration_platform"),
                    )

                    # TARGET_POSTBUILDS_$(BUILDTYPE) is added to postbuilds later on.
                    gyp_to_build = gyp.common.InvertRelativePath(self.path)
                    target_postbuild = self.xcode_settings.AddImplicitPostbuilds(
                        configname,
                        QuoteSpaces(
                            os.path.normpath(os.path.join(gyp_to_build, self.output))
                        ),
                        QuoteSpaces(
                            os.path.normpath(
                                os.path.join(gyp_to_build, self.output_binary)
                            )
                        ),
                    )
                    if target_postbuild:
                        target_postbuilds[configname] = target_postbuild
                else:
                    ldflags = config.get("ldflags", [])
                    # Compute an rpath for this output if needed.
                    if any(dep.endswith(".so") or ".so." in dep for dep in deps):
                        # We want to get the literal string "$ORIGIN"
                        # into the link command, so we need lots of escaping.
                        ldflags.append(r"-Wl,-rpath=\$$ORIGIN/")
                        ldflags.append(r"-Wl,-rpath-link=\$(builddir)/")
                library_dirs = config.get("library_dirs", [])
                ldflags += [("-L%s" % library_dir) for library_dir in library_dirs]
                self.WriteList(ldflags, "LDFLAGS_%s" % configname)
                if self.flavor == "mac":
                    self.WriteList(
                        self.xcode_settings.GetLibtoolflags(configname),
                        "LIBTOOLFLAGS_%s" % configname,
                    )
            libraries = spec.get("libraries")
            if libraries:
                # Remove duplicate entries
                libraries = gyp.common.uniquer(libraries)
                if self.flavor == "mac":
                    libraries = self.xcode_settings.AdjustLibraries(libraries)
            self.WriteList(libraries, "LIBS")
            self.WriteLn(
                "%s: GYP_LDFLAGS := $(LDFLAGS_$(BUILDTYPE))"
                % QuoteSpaces(self.output_binary)
            )
            self.WriteLn("%s: LIBS := $(LIBS)" % QuoteSpaces(self.output_binary))

            if self.flavor == "mac":
                self.WriteLn(
                    "%s: GYP_LIBTOOLFLAGS := $(LIBTOOLFLAGS_$(BUILDTYPE))"
                    % QuoteSpaces(self.output_binary)
                )

        # Postbuild actions. Like actions, but implicitly depend on the target's
        # output.
        postbuilds = []
        if self.flavor == "mac":
            if target_postbuilds:
                postbuilds.append("$(TARGET_POSTBUILDS_$(BUILDTYPE))")
            postbuilds.extend(gyp.xcode_emulation.GetSpecPostbuildCommands(spec))

        if postbuilds:
            # Envvars may be referenced by TARGET_POSTBUILDS_$(BUILDTYPE),
            # so we must output its definition first, since we declare variables
            # using ":=".
            self.WriteSortedXcodeEnv(self.output, self.GetSortedXcodePostbuildEnv())

            for configname in target_postbuilds:
                self.WriteLn(
                    "%s: TARGET_POSTBUILDS_%s := %s"
                    % (
                        QuoteSpaces(self.output),
                        configname,
                        gyp.common.EncodePOSIXShellList(target_postbuilds[configname]),
                    )
                )

            # Postbuilds expect to be run in the gyp file's directory, so insert an
            # implicit postbuild to cd to there.
            postbuilds.insert(0, gyp.common.EncodePOSIXShellList(["cd", self.path]))
            for i, postbuild in enumerate(postbuilds):
                if not postbuild.startswith("$"):
                    postbuilds[i] = EscapeShellArgument(postbuild)
            self.WriteLn("%s: builddir := $(abs_builddir)" % QuoteSpaces(self.output))
            self.WriteLn(
                "%s: POSTBUILDS := %s"
                % (QuoteSpaces(self.output), " ".join(postbuilds))
            )

        # A bundle directory depends on its dependencies such as bundle resources
        # and bundle binary. When all dependencies have been built, the bundle
        # needs to be packaged.
        if self.is_mac_bundle:
            # If the framework doesn't contain a binary, then nothing depends
            # on the actions -- make the framework depend on them directly too.
            self.WriteDependencyOnExtraOutputs(self.output, extra_outputs)

            # Bundle dependencies. Note that the code below adds actions to this
            # target, so if you move these two lines, move the lines below as well.
            self.WriteList([QuoteSpaces(dep) for dep in bundle_deps], "BUNDLE_DEPS")
            self.WriteLn("%s: $(BUNDLE_DEPS)" % QuoteSpaces(self.output))

            # After the framework is built, package it. Needs to happen before
            # postbuilds, since postbuilds depend on this.
            if self.type in ("shared_library", "loadable_module"):
                self.WriteLn(
                    "\t@$(call do_cmd,mac_package_framework,,,%s)"
                    % self.xcode_settings.GetFrameworkVersion()
                )

            # Bundle postbuilds can depend on the whole bundle, so run them after
            # the bundle is packaged, not already after the bundle binary is done.
            if postbuilds:
                self.WriteLn("\t@$(call do_postbuilds)")
            postbuilds = []  # Don't write postbuilds for target's output.

            # Needed by test/mac/gyptest-rebuild.py.
            self.WriteLn("\t@true  # No-op, used by tests")

            # Since this target depends on binary and resources which are in
            # nested subfolders, the framework directory will be older than
            # its dependencies usually. To prevent this rule from executing
            # on every build (expensive, especially with postbuilds), expliclity
            # update the time on the framework directory.
            self.WriteLn("\t@touch -c %s" % QuoteSpaces(self.output))

        if postbuilds:
            assert not self.is_mac_bundle, (
                "Postbuilds for bundles should be done "
                "on the bundle, not the binary (target '%s')" % self.target
            )
            assert "product_dir" not in spec, (
                "Postbuilds do not work with " "custom product_dir"
            )

        if self.type == "executable":
            self.WriteLn(
                "%s: LD_INPUTS := %s"
                % (
                    QuoteSpaces(self.output_binary),
                    " ".join(QuoteSpaces(dep) for dep in link_deps),
                )
            )
            if self.toolset == "host" and self.flavor == "android":
                self.WriteDoCmd(
                    [self.output_binary],
                    link_deps,
                    "link_host",
                    part_of_all,
                    postbuilds=postbuilds,
                )
            else:
                self.WriteDoCmd(
                    [self.output_binary],
                    link_deps,
                    "link",
                    part_of_all,
                    postbuilds=postbuilds,
                )

        elif self.type == "static_library":
            for link_dep in link_deps:
                assert " " not in link_dep, (
                    "Spaces in alink input filenames not supported (%s)" % link_dep
                )
            if (
                self.flavor not in ("mac", "openbsd", "netbsd", "win")
                and not self.is_standalone_static_library
            ):
                self.WriteDoCmd(
                    [self.output_binary],
                    link_deps,
                    "alink_thin",
                    part_of_all,
                    postbuilds=postbuilds,
                )
            else:
                self.WriteDoCmd(
                    [self.output_binary],
                    link_deps,
                    "alink",
                    part_of_all,
                    postbuilds=postbuilds,
                )
        elif self.type == "shared_library":
            self.WriteLn(
                "%s: LD_INPUTS := %s"
                % (
                    QuoteSpaces(self.output_binary),
                    " ".join(QuoteSpaces(dep) for dep in link_deps),
                )
            )
            self.WriteDoCmd(
                [self.output_binary],
                link_deps,
                "solink",
                part_of_all,
                postbuilds=postbuilds,
            )
        elif self.type == "loadable_module":
            for link_dep in link_deps:
                assert " " not in link_dep, (
                    "Spaces in module input filenames not supported (%s)" % link_dep
                )
            if self.toolset == "host" and self.flavor == "android":
                self.WriteDoCmd(
                    [self.output_binary],
                    link_deps,
                    "solink_module_host",
                    part_of_all,
                    postbuilds=postbuilds,
                )
            else:
                self.WriteDoCmd(
                    [self.output_binary],
                    link_deps,
                    "solink_module",
                    part_of_all,
                    postbuilds=postbuilds,
                )
        elif self.type == "none":
            # Write a stamp line.
            self.WriteDoCmd(
                [self.output_binary], deps, "touch", part_of_all, postbuilds=postbuilds
            )
        else:
            print("WARNING: no output for", self.type, self.target)

        # Add an alias for each target (if there are any outputs).
        # Installable target aliases are created below.
        if (self.output and self.output != self.target) and (
            self.type not in self._INSTALLABLE_TARGETS
        ):
            self.WriteMakeRule(
                [self.target], [self.output], comment="Add target alias", phony=True
            )
            if part_of_all:
                self.WriteMakeRule(
                    ["all"],
                    [self.target],
                    comment='Add target alias to "all" target.',
                    phony=True,
                )

        # Add special-case rules for our installable targets.
        # 1) They need to install to the build dir or "product" dir.
        # 2) They get shortcuts for building (e.g. "make chrome").
        # 3) They are part of "make all".
        if self.type in self._INSTALLABLE_TARGETS or self.is_standalone_static_library:
            if self.type == "shared_library":
                file_desc = "shared library"
            elif self.type == "static_library":
                file_desc = "static library"
            else:
                file_desc = "executable"
            install_path = self._InstallableTargetInstallPath()
            installable_deps = [self.output]
            if (
                self.flavor == "mac"
                and "product_dir" not in spec
                and self.toolset == "target"
            ):
                # On mac, products are created in install_path immediately.
                assert install_path == self.output, "{} != {}".format(
                    install_path,
                    self.output,
                )

            # Point the target alias to the final binary output.
            self.WriteMakeRule(
                [self.target], [install_path], comment="Add target alias", phony=True
            )
            if install_path != self.output:
                assert not self.is_mac_bundle  # See comment a few lines above.
                self.WriteDoCmd(
                    [install_path],
                    [self.output],
                    "copy",
                    comment="Copy this to the %s output path." % file_desc,
                    part_of_all=part_of_all,
                )
                installable_deps.append(install_path)
            if self.output != self.alias and self.alias != self.target:
                self.WriteMakeRule(
                    [self.alias],
                    installable_deps,
                    comment="Short alias for building this %s." % file_desc,
                    phony=True,
                )
            if part_of_all:
                self.WriteMakeRule(
                    ["all"],
                    [install_path],
                    comment='Add %s to "all" target.' % file_desc,
                    phony=True,
                )

    def WriteList(self, value_list, variable=None, prefix="", quoter=QuoteIfNecessary):
        """Write a variable definition that is a list of values.

        E.g. WriteList(['a','b'], 'foo', prefix='blah') writes out
             foo = blaha blahb
        but in a pretty-printed style.
        """
        values = ""
        if value_list:
            value_list = [quoter(prefix + value) for value in value_list]
            values = " \\\n\t" + " \\\n\t".join(value_list)
        self.fp.write(f"{variable} :={values}\n\n")

    def WriteDoCmd(
        self, outputs, inputs, command, part_of_all, comment=None, postbuilds=False
    ):
        """Write a Makefile rule that uses do_cmd.

        This makes the outputs dependent on the command line that was run,
        as well as support the V= make command line flag.
        """
        suffix = ""
        if postbuilds:
            assert "," not in command
            suffix = ",,1"  # Tell do_cmd to honor $POSTBUILDS
        self.WriteMakeRule(
            outputs,
            inputs,
            actions=[f"$(call do_cmd,{command}{suffix})"],
            comment=comment,
            command=command,
            force=True,
        )
        # Add our outputs to the list of targets we read depfiles from.
        # all_deps is only used for deps file reading, and for deps files we replace
        # spaces with ? because escaping doesn't work with make's $(sort) and
        # other functions.
        outputs = [QuoteSpaces(o, SPACE_REPLACEMENT) for o in outputs]
        self.WriteLn("all_deps += %s" % " ".join(outputs))

    def WriteMakeRule(
        self,
        outputs,
        inputs,
        actions=None,
        comment=None,
        order_only=False,
        force=False,
        phony=False,
        command=None,
    ):
        """Write a Makefile rule, with some extra tricks.

        outputs: a list of outputs for the rule (note: this is not directly
                 supported by make; see comments below)
        inputs: a list of inputs for the rule
        actions: a list of shell commands to run for the rule
        comment: a comment to put in the Makefile above the rule (also useful
                 for making this Python script's code self-documenting)
        order_only: if true, makes the dependency order-only
        force: if true, include FORCE_DO_CMD as an order-only dep
        phony: if true, the rule does not actually generate the named output, the
               output is just a name to run the rule
        command: (optional) command name to generate unambiguous labels
        """
        outputs = [QuoteSpaces(o) for o in outputs]
        inputs = [QuoteSpaces(i) for i in inputs]

        if comment:
            self.WriteLn("# " + comment)
        if phony:
            self.WriteLn(".PHONY: " + " ".join(outputs))
        if actions:
            self.WriteLn("%s: TOOLSET := $(TOOLSET)" % outputs[0])
        force_append = " FORCE_DO_CMD" if force else ""

        if order_only:
            # Order only rule: Just write a simple rule.
            # TODO(evanm): just make order_only a list of deps instead of this hack.
            self.WriteLn(
                "{}: | {}{}".format(" ".join(outputs), " ".join(inputs), force_append)
            )
        elif len(outputs) == 1:
            # Regular rule, one output: Just write a simple rule.
            self.WriteLn("{}: {}{}".format(outputs[0], " ".join(inputs), force_append))
        else:
            # Regular rule, more than one output: Multiple outputs are tricky in
            # make. We will write three rules:
            # - All outputs depend on an intermediate file.
            # - Make .INTERMEDIATE depend on the intermediate.
            # - The intermediate file depends on the inputs and executes the
            #   actual command.
            # - The intermediate recipe will 'touch' the intermediate file.
            # - The multi-output rule will have an do-nothing recipe.

            # Hash the target name to avoid generating overlong filenames.
            cmddigest = hashlib.sha1(
                (command or self.target).encode("utf-8")
            ).hexdigest()
            intermediate = "%s.intermediate" % cmddigest
            self.WriteLn("{}: {}".format(" ".join(outputs), intermediate))
            self.WriteLn("\t%s" % "@:")
            self.WriteLn("{}: {}".format(".INTERMEDIATE", intermediate))
            self.WriteLn(
                "{}: {}{}".format(intermediate, " ".join(inputs), force_append)
            )
            actions.insert(0, "$(call do_cmd,touch)")

        if actions:
            for action in actions:
                self.WriteLn("\t%s" % action)
        self.WriteLn()

    def WriteAndroidNdkModuleRule(self, module_name, all_sources, link_deps):
        """Write a set of LOCAL_XXX definitions for Android NDK.

        These variable definitions will be used by Android NDK but do nothing for
        non-Android applications.

        Arguments:
          module_name: Android NDK module name, which must be unique among all
              module names.
          all_sources: A list of source files (will be filtered by Compilable).
          link_deps: A list of link dependencies, which must be sorted in
              the order from dependencies to dependents.
        """
        if self.type not in ("executable", "shared_library", "static_library"):
            return

        self.WriteLn("# Variable definitions for Android applications")
        self.WriteLn("include $(CLEAR_VARS)")
        self.WriteLn("LOCAL_MODULE := " + module_name)
        self.WriteLn(
            "LOCAL_CFLAGS := $(CFLAGS_$(BUILDTYPE)) "
            "$(DEFS_$(BUILDTYPE)) "
            # LOCAL_CFLAGS is applied to both of C and C++.  There is
            # no way to specify $(CFLAGS_C_$(BUILDTYPE)) only for C
            # sources.
            "$(CFLAGS_C_$(BUILDTYPE)) "
            # $(INCS_$(BUILDTYPE)) includes the prefix '-I' while
            # LOCAL_C_INCLUDES does not expect it.  So put it in
            # LOCAL_CFLAGS.
            "$(INCS_$(BUILDTYPE))"
        )
        # LOCAL_CXXFLAGS is obsolete and LOCAL_CPPFLAGS is preferred.
        self.WriteLn("LOCAL_CPPFLAGS := $(CFLAGS_CC_$(BUILDTYPE))")
        self.WriteLn("LOCAL_C_INCLUDES :=")
        self.WriteLn("LOCAL_LDLIBS := $(LDFLAGS_$(BUILDTYPE)) $(LIBS)")

        # Detect the C++ extension.
        cpp_ext = {".cc": 0, ".cpp": 0, ".cxx": 0}
        default_cpp_ext = ".cpp"
        for filename in all_sources:
            ext = os.path.splitext(filename)[1]
            if ext in cpp_ext:
                cpp_ext[ext] += 1
                if cpp_ext[ext] > cpp_ext[default_cpp_ext]:
                    default_cpp_ext = ext
        self.WriteLn("LOCAL_CPP_EXTENSION := " + default_cpp_ext)

        self.WriteList(
            list(map(self.Absolutify, filter(Compilable, all_sources))),
            "LOCAL_SRC_FILES",
        )

        # Filter out those which do not match prefix and suffix and produce
        # the resulting list without prefix and suffix.
        def DepsToModules(deps, prefix, suffix):
            modules = []
            for filepath in deps:
                filename = os.path.basename(filepath)
                if filename.startswith(prefix) and filename.endswith(suffix):
                    modules.append(filename[len(prefix) : -len(suffix)])
            return modules

        # Retrieve the default value of 'SHARED_LIB_SUFFIX'
        params = {"flavor": "linux"}
        default_variables = {}
        CalculateVariables(default_variables, params)

        self.WriteList(
            DepsToModules(
                link_deps,
                generator_default_variables["SHARED_LIB_PREFIX"],
                default_variables["SHARED_LIB_SUFFIX"],
            ),
            "LOCAL_SHARED_LIBRARIES",
        )
        self.WriteList(
            DepsToModules(
                link_deps,
                generator_default_variables["STATIC_LIB_PREFIX"],
                generator_default_variables["STATIC_LIB_SUFFIX"],
            ),
            "LOCAL_STATIC_LIBRARIES",
        )

        if self.type == "executable":
            self.WriteLn("include $(BUILD_EXECUTABLE)")
        elif self.type == "shared_library":
            self.WriteLn("include $(BUILD_SHARED_LIBRARY)")
        elif self.type == "static_library":
            self.WriteLn("include $(BUILD_STATIC_LIBRARY)")
        self.WriteLn()

    def WriteLn(self, text=""):
        self.fp.write(text + "\n")

    def GetSortedXcodeEnv(self, additional_settings=None):
        return gyp.xcode_emulation.GetSortedXcodeEnv(
            self.xcode_settings,
            "$(abs_builddir)",
            os.path.join("$(abs_srcdir)", self.path),
            "$(BUILDTYPE)",
            additional_settings,
        )

    def GetSortedXcodePostbuildEnv(self):
        # CHROMIUM_STRIP_SAVE_FILE is a chromium-specific hack.
        # TODO(thakis): It would be nice to have some general mechanism instead.
        strip_save_file = self.xcode_settings.GetPerTargetSetting(
            "CHROMIUM_STRIP_SAVE_FILE", ""
        )
        # Even if strip_save_file is empty, explicitly write it. Else a postbuild
        # might pick up an export from an earlier target.
        return self.GetSortedXcodeEnv(
            additional_settings={"CHROMIUM_STRIP_SAVE_FILE": strip_save_file}
        )

    def WriteSortedXcodeEnv(self, target, env):
        for k, v in env:
            # For
            #  foo := a\ b
            # the escaped space does the right thing. For
            #  export foo := a\ b
            # it does not -- the backslash is written to the env as literal character.
            # So don't escape spaces in |env[k]|.
            self.WriteLn(f"{QuoteSpaces(target)}: export {k} := {v}")

    def Objectify(self, path):
        """Convert a path to its output directory form."""
        if "$(" in path:
            path = path.replace("$(obj)/", "$(obj).%s/$(TARGET)/" % self.toolset)
        if "$(obj)" not in path:
            path = f"$(obj).{self.toolset}/$(TARGET)/{path}"
        return path

    def Pchify(self, path, lang):
        """Convert a prefix header path to its output directory form."""
        path = self.Absolutify(path)
        if "$(" in path:
            path = path.replace(
                "$(obj)/", f"$(obj).{self.toolset}/$(TARGET)/pch-{lang}"
            )
            return path
        return f"$(obj).{self.toolset}/$(TARGET)/pch-{lang}/{path}"

    def Absolutify(self, path):
        """Convert a subdirectory-relative path into a base-relative path.
        Skips over paths that contain variables."""
        if "$(" in path:
            # Don't call normpath in this case, as it might collapse the
            # path too aggressively if it features '..'. However it's still
            # important to strip trailing slashes.
            return path.rstrip("/")
        return os.path.normpath(os.path.join(self.path, path))

    def ExpandInputRoot(self, template, expansion, dirname):
        if "%(INPUT_ROOT)s" not in template and "%(INPUT_DIRNAME)s" not in template:
            return template
        path = template % {
            "INPUT_ROOT": expansion,
            "INPUT_DIRNAME": dirname,
        }
        return path

    def _InstallableTargetInstallPath(self):
        """Returns the location of the final output for an installable target."""
        # Functionality removed for all platforms to match Xcode and hoist
        # shared libraries into PRODUCT_DIR for users:
        # Xcode puts shared_library results into PRODUCT_DIR, and some gyp files
        # rely on this. Emulate this behavior for mac.
        # if self.type == "shared_library" and (
        #     self.flavor != "mac" or self.toolset != "target"
        # ):
        #    # Install all shared libs into a common directory (per toolset) for
        #    # convenient access with LD_LIBRARY_PATH.
        #    return "$(builddir)/lib.%s/%s" % (self.toolset, self.alias)
        return "$(builddir)/" + self.alias


def WriteAutoRegenerationRule(params, root_makefile, makefile_name, build_files):
    """Write the target to regenerate the Makefile."""
    options = params["options"]
    build_files_args = [
        gyp.common.RelativePath(filename, options.toplevel_dir)
        for filename in params["build_files_arg"]
    ]

    gyp_binary = gyp.common.FixIfRelativePath(
        params["gyp_binary"], options.toplevel_dir
    )
    if not gyp_binary.startswith(os.sep):
        gyp_binary = os.path.join(".", gyp_binary)

    root_makefile.write(
        "quiet_cmd_regen_makefile = ACTION Regenerating $@\n"
        "cmd_regen_makefile = cd $(srcdir); %(cmd)s\n"
        "%(makefile_name)s: %(deps)s\n"
        "\t$(call do_cmd,regen_makefile)\n\n"
        % {
            "makefile_name": makefile_name,
            "deps": " ".join(SourceifyAndQuoteSpaces(bf) for bf in build_files),
            "cmd": gyp.common.EncodePOSIXShellList(
                [gyp_binary, "-fmake"] + gyp.RegenerateFlags(options) + build_files_args
            ),
        }
    )


def PerformBuild(data, configurations, params):
    options = params["options"]
    for config in configurations:
        arguments = ["make"]
        if options.toplevel_dir and options.toplevel_dir != ".":
            arguments += "-C", options.toplevel_dir
        arguments.append("BUILDTYPE=" + config)
        print(f"Building [{config}]: {arguments}")
        subprocess.check_call(arguments)


def GenerateOutput(target_list, target_dicts, data, params):
    options = params["options"]
    flavor = gyp.common.GetFlavor(params)
    generator_flags = params.get("generator_flags", {})
    builddir_name = generator_flags.get("output_dir", "out")
    android_ndk_version = generator_flags.get("android_ndk_version", None)
    default_target = generator_flags.get("default_target", "all")

    def CalculateMakefilePath(build_file, base_name):
        """Determine where to write a Makefile for a given gyp file."""
        # Paths in gyp files are relative to the .gyp file, but we want
        # paths relative to the source root for the master makefile.  Grab
        # the path of the .gyp file as the base to relativize against.
        # E.g. "foo/bar" when we're constructing targets for "foo/bar/baz.gyp".
        base_path = gyp.common.RelativePath(os.path.dirname(build_file), options.depth)
        # We write the file in the base_path directory.
        output_file = os.path.join(options.depth, base_path, base_name)
        if options.generator_output:
            output_file = os.path.join(
                options.depth, options.generator_output, base_path, base_name
            )
        base_path = gyp.common.RelativePath(
            os.path.dirname(build_file), options.toplevel_dir
        )
        return base_path, output_file

    # TODO:  search for the first non-'Default' target.  This can go
    # away when we add verification that all targets have the
    # necessary configurations.
    default_configuration = None
    toolsets = {target_dicts[target]["toolset"] for target in target_list}
    for target in target_list:
        spec = target_dicts[target]
        if spec["default_configuration"] != "Default":
            default_configuration = spec["default_configuration"]
            break
    if not default_configuration:
        default_configuration = "Default"

    srcdir = "."
    makefile_name = "Makefile" + options.suffix
    makefile_path = os.path.join(options.toplevel_dir, makefile_name)
    if options.generator_output:
        global srcdir_prefix
        makefile_path = os.path.join(
            options.toplevel_dir, options.generator_output, makefile_name
        )
        srcdir = gyp.common.RelativePath(srcdir, options.generator_output)
        srcdir_prefix = "$(srcdir)/"

    flock_command = "flock"
    copy_archive_arguments = "-af"
    makedep_arguments = "-MMD"
    header_params = {
        "default_target": default_target,
        "builddir": builddir_name,
        "default_configuration": default_configuration,
        "flock": flock_command,
        "flock_index": 1,
        "link_commands": LINK_COMMANDS_LINUX,
        "extra_commands": "",
        "srcdir": srcdir,
        "copy_archive_args": copy_archive_arguments,
        "makedep_args": makedep_arguments,
        "CC.target": GetEnvironFallback(("CC_target", "CC"), "$(CC)"),
        "AR.target": GetEnvironFallback(("AR_target", "AR"), "$(AR)"),
        "CXX.target": GetEnvironFallback(("CXX_target", "CXX"), "$(CXX)"),
        "LINK.target": GetEnvironFallback(("LINK_target", "LINK"), "$(LINK)"),
        "CC.host": GetEnvironFallback(("CC_host", "CC"), "gcc"),
        "AR.host": GetEnvironFallback(("AR_host", "AR"), "ar"),
        "CXX.host": GetEnvironFallback(("CXX_host", "CXX"), "g++"),
        "LINK.host": GetEnvironFallback(("LINK_host", "LINK"), "$(CXX.host)"),
    }
    if flavor == "mac":
        flock_command = "./gyp-mac-tool flock"
        header_params.update(
            {
                "flock": flock_command,
                "flock_index": 2,
                "link_commands": LINK_COMMANDS_MAC,
                "extra_commands": SHARED_HEADER_MAC_COMMANDS,
            }
        )
    elif flavor == "android":
        header_params.update({"link_commands": LINK_COMMANDS_ANDROID})
    elif flavor == "zos":
        copy_archive_arguments = "-fPR"
        makedep_arguments = "-qmakedep=gcc"
        header_params.update(
            {
                "copy_archive_args": copy_archive_arguments,
                "makedep_args": makedep_arguments,
                "link_commands": LINK_COMMANDS_OS390,
                "CC.target": GetEnvironFallback(("CC_target", "CC"), "njsc"),
                "CXX.target": GetEnvironFallback(("CXX_target", "CXX"), "njsc++"),
                "CC.host": GetEnvironFallback(("CC_host", "CC"), "njsc"),
                "CXX.host": GetEnvironFallback(("CXX_host", "CXX"), "njsc++"),
            }
        )
    elif flavor == "solaris":
        copy_archive_arguments = "-pPRf@"
        header_params.update(
            {
                "copy_archive_args": copy_archive_arguments,
                "flock": "./gyp-flock-tool flock",
                "flock_index": 2,
            }
        )
    elif flavor == "freebsd":
        # Note: OpenBSD has sysutils/flock. lockf seems to be FreeBSD specific.
        header_params.update({"flock": "lockf"})
    elif flavor == "openbsd":
        copy_archive_arguments = "-pPRf"
        header_params.update({"copy_archive_args": copy_archive_arguments})
    elif flavor == "aix":
        copy_archive_arguments = "-pPRf"
        header_params.update(
            {
                "copy_archive_args": copy_archive_arguments,
                "link_commands": LINK_COMMANDS_AIX,
                "flock": "./gyp-flock-tool flock",
                "flock_index": 2,
            }
        )

    build_file, _, _ = gyp.common.ParseQualifiedTarget(target_list[0])
    make_global_settings_array = data[build_file].get("make_global_settings", [])
    wrappers = {}
    for key, value in make_global_settings_array:
        if key.endswith("_wrapper"):
            wrappers[key[: -len("_wrapper")]] = "$(abspath %s)" % value
    make_global_settings = ""
    for key, value in make_global_settings_array:
        if re.match(".*_wrapper", key):
            continue
        if value[0] != "$":
            value = "$(abspath %s)" % value
        wrapper = wrappers.get(key)
        if wrapper:
            value = f"{wrapper} {value}"
            del wrappers[key]
        if key in ("CC", "CC.host", "CXX", "CXX.host"):
            make_global_settings += (
                "ifneq (,$(filter $(origin %s), undefined default))\n" % key
            )
            # Let gyp-time envvars win over global settings.
            env_key = key.replace(".", "_")  # CC.host -> CC_host
            if env_key in os.environ:
                value = os.environ[env_key]
            make_global_settings += f"  {key} = {value}\n"
            make_global_settings += "endif\n"
        else:
            make_global_settings += f"{key} ?= {value}\n"
    # TODO(ukai): define cmd when only wrapper is specified in
    # make_global_settings.

    header_params["make_global_settings"] = make_global_settings

    gyp.common.EnsureDirExists(makefile_path)
    root_makefile = open(makefile_path, "w")
    root_makefile.write(SHARED_HEADER % header_params)
    # Currently any versions have the same effect, but in future the behavior
    # could be different.
    if android_ndk_version:
        root_makefile.write(
            "# Define LOCAL_PATH for build of Android applications.\n"
            "LOCAL_PATH := $(call my-dir)\n"
            "\n"
        )
    for toolset in toolsets:
        root_makefile.write("TOOLSET := %s\n" % toolset)
        WriteRootHeaderSuffixRules(root_makefile)

    # Put build-time support tools next to the root Makefile.
    dest_path = os.path.dirname(makefile_path)
    gyp.common.CopyTool(flavor, dest_path)

    # Find the list of targets that derive from the gyp file(s) being built.
    needed_targets = set()
    for build_file in params["build_files"]:
        for target in gyp.common.AllTargets(target_list, target_dicts, build_file):
            needed_targets.add(target)

    build_files = set()
    include_list = set()
    for qualified_target in target_list:
        build_file, target, toolset = gyp.common.ParseQualifiedTarget(qualified_target)

        this_make_global_settings = data[build_file].get("make_global_settings", [])
        assert make_global_settings_array == this_make_global_settings, (
            "make_global_settings needs to be the same for all targets "
            f"{this_make_global_settings} vs. {make_global_settings}"
        )

        build_files.add(gyp.common.RelativePath(build_file, options.toplevel_dir))
        included_files = data[build_file]["included_files"]
        for included_file in included_files:
            # The included_files entries are relative to the dir of the build file
            # that included them, so we have to undo that and then make them relative
            # to the root dir.
            relative_include_file = gyp.common.RelativePath(
                gyp.common.UnrelativePath(included_file, build_file),
                options.toplevel_dir,
            )
            abs_include_file = os.path.abspath(relative_include_file)
            # If the include file is from the ~/.gyp dir, we should use absolute path
            # so that relocating the src dir doesn't break the path.
            if params["home_dot_gyp"] and abs_include_file.startswith(
                params["home_dot_gyp"]
            ):
                build_files.add(abs_include_file)
            else:
                build_files.add(relative_include_file)

        base_path, output_file = CalculateMakefilePath(
            build_file, target + "." + toolset + options.suffix + ".mk"
        )

        spec = target_dicts[qualified_target]
        configs = spec["configurations"]

        if flavor == "mac":
            gyp.xcode_emulation.MergeGlobalXcodeSettingsToSpec(data[build_file], spec)

        writer = MakefileWriter(generator_flags, flavor)
        writer.Write(
            qualified_target,
            base_path,
            output_file,
            spec,
            configs,
            part_of_all=qualified_target in needed_targets,
        )

        # Our root_makefile lives at the source root.  Compute the relative path
        # from there to the output_file for including.
        mkfile_rel_path = gyp.common.RelativePath(
            output_file, os.path.dirname(makefile_path)
        )
        include_list.add(mkfile_rel_path)

    # Write out per-gyp (sub-project) Makefiles.
    depth_rel_path = gyp.common.RelativePath(options.depth, os.getcwd())
    for build_file in build_files:
        # The paths in build_files were relativized above, so undo that before
        # testing against the non-relativized items in target_list and before
        # calculating the Makefile path.
        build_file = os.path.join(depth_rel_path, build_file)
        gyp_targets = [
            target_dicts[qualified_target]["target_name"]
            for qualified_target in target_list
            if qualified_target.startswith(build_file)
            and qualified_target in needed_targets
        ]
        # Only generate Makefiles for gyp files with targets.
        if not gyp_targets:
            continue
        base_path, output_file = CalculateMakefilePath(
            build_file, os.path.splitext(os.path.basename(build_file))[0] + ".Makefile"
        )
        makefile_rel_path = gyp.common.RelativePath(
            os.path.dirname(makefile_path), os.path.dirname(output_file)
        )
        writer.WriteSubMake(output_file, makefile_rel_path, gyp_targets, builddir_name)

    # Write out the sorted list of includes.
    root_makefile.write("\n")
    for include_file in sorted(include_list):
        # We wrap each .mk include in an if statement so users can tell make to
        # not load a file by setting NO_LOAD.  The below make code says, only
        # load the .mk file if the .mk filename doesn't start with a token in
        # NO_LOAD.
        root_makefile.write(
            "ifeq ($(strip $(foreach prefix,$(NO_LOAD),\\\n"
            "    $(findstring $(join ^,$(prefix)),\\\n"
            "                 $(join ^," + include_file + ")))),)\n"
        )
        root_makefile.write("  include " + include_file + "\n")
        root_makefile.write("endif\n")
    root_makefile.write("\n")

    if not generator_flags.get("standalone") and generator_flags.get(
        "auto_regeneration", True
    ):
        WriteAutoRegenerationRule(params, root_makefile, makefile_name, build_files)

    root_makefile.write(SHARED_FOOTER)

    root_makefile.close()
