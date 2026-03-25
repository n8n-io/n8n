#!/usr/bin/env python3
#
# This script assumes ../curl/ is a git repo containing curl's source code
# and extracts the list of arguments curl accepts and writes the result as
# two JS objects (one for --long-options and one for -s (short) options)
# to ../src/util.ts.
#
# https://github.com/curl/curl/blob/master/src/tool_getparam.c#L72
#
# Each argument definition is composed of
# letter - a 1 or 2 character string which acts as both a unique identifier
# of this argument, as well as its short form if it's 1 character long.
# lname - the --long-name of this option
# desc - the type of the option, which specifies if the option consumes a
# second argument or not.
#   ARG_STRING, ARG_FILENAME - consume a second argument
#   ARG_BOOL, ARG_NONE - don't consume a second argument.
#   TRUE / FALSE - no longer used
# ARG_BOOL arguments get a --no-<lname> counterpart. ARG_NONE arguments do not.
#
# Options can have the same `letter` when an option was renamed but
# the old name was also kept for backwards compatibility.
# We add a "name" property with the newest name to these options.

import argparse
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

# Git repo of curl's source code to extract the args from
CURL_REPO = Path(__file__).parent.parent / "curl"

OLD_INPUT_FILE = CURL_REPO / "src" / "main.c"
NEW_INPUT_FILE = CURL_REPO / "src" / "tool_getparam.c"
FILE_MOVED_TAG = "curl-7_23_0"  # when the above change happened

# Originally there were only two arg "types": TRUE/FALSE which signified
# whether the option expected a value or was a boolean, respectively.
# Then in
# 5abfdc0140df0977b02506d16796f616158bfe88
# which was released as
NO_OPTIONS_TAG = "curl-7_19_0"
# all boolean (i.e. FALSE "type") options got an implicit --no-OPTION.
# Then TRUE/FALSE was changed to ARG_STRING/ARG_BOOL.
# Then it was realized that not all boolean options should have a
# --no-OPTION counterpart, so a new ARG_NONE type was added for those in
# 913c3c8f5476bd7bc4d8d00509396bd4b525b8fc

OPTS_START = "struct LongShort aliases[]= {"
OPTS_END = "};"

BOOL_TYPES = ["bool", "none"]
STR_TYPES = ["string", "filename"]
ALIAS_TYPES = BOOL_TYPES + STR_TYPES
RAW_ALIAS_TYPES = ALIAS_TYPES + ["true", "false"]

OUTPUT_FILE = Path(__file__).parent.parent / "src" / "curl" / "opts.ts"

JS_PARAMS_START = "BEGIN EXTRACTED OPTIONS"
JS_PARAMS_END = "END EXTRACTED OPTIONS"
JS_SHORT_PARAMS_START = "BEGIN EXTRACTED SHORT OPTIONS"
JS_SHORT_PARAMS_END = "END EXTRACTED SHORT OPTIONS"

PACKAGE_JSON = Path(__file__).parent.parent / "package.json"
CLI_FILE = Path(__file__).parent.parent / "src" / "cli.ts"
CLI_VERSION_LINE_START = "const VERSION = "

# These are options with the same `letter`, which are options that were
# renamed, along with their new name.
DUPES = {
    "krb4": "krb",
    "ftp-ssl": "ssl",
    "ftp-ssl-reqd": "ssl-reqd",
    "socks5-gssapi-service": "proxy-service-name",
    # These argument names have been deleted,
    # they should appear as deleted options.
    "http-request": "request",
    "ftp-ascii": "use-ascii",
    "ftpport": "ftp-port",
    "socks": "socks5",
}
for value in list(DUPES.values()):
    DUPES[value] = value


parser = argparse.ArgumentParser(
    prog="extract_curl_args",
    description="extract a list of curl's arguments from its source code into a JavaScript file",
)
parser.add_argument("repo_dir", nargs="?", default=CURL_REPO, type=Path)
parser.add_argument(
    "-w",
    "--write",
    action="store_true",
    help="write changes to " + str(OUTPUT_FILE) + " and " + str(CLI_FILE),
)
args = parser.parse_args()


def is_git_repo(git_dir=args.repo_dir):
    result = subprocess.run(
        ["git", "rev-parse", "--is-inside-work-tree"],
        cwd=git_dir,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and result.stdout.strip() == "true"


if not OUTPUT_FILE.is_file():
    sys.exit(
        f"{OUTPUT_FILE} doesn't exist. You should run this script from curlconverter/"
    )
if not args.repo_dir.is_dir():
    sys.exit(
        f"{args.repo_dir} needs to be a git repo with curl's source code. "
        "You can clone it with\n\n"
        "git clone https://github.com/curl/curl ../curl"
        # or modify the args.repo_dir variable above
    )
if not is_git_repo(args.repo_dir):
    sys.exit(f"{args.repo_dir} is not a git repo")


def git_pull(git_dir=args.repo_dir):
    return subprocess.run(
        ["git", "pull"],
        cwd=git_dir,
        check=True,
        capture_output=True,
        text=True,
    ).stdout


git_pull()


def git_branch(git_dir=args.repo_dir):
    branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=git_dir,
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return branch.strip()


def parse_aliases(lines):
    aliases = {}
    for line in lines:
        if OPTS_START in line:
            break
    for line in lines:
        line = line.strip()
        if line.endswith(OPTS_END):
            break
        if not line.strip().startswith("{"):
            continue

        # main.c has comments on the same line
        letter, lname, desc = line.split("/*")[0].strip().strip("{},").split(",")

        letter = letter.strip().strip('"')
        lname = lname.strip().strip('"')
        type_ = desc.strip().removeprefix("ARG_").lower()
        # The only difference is that ARG_FILENAMEs raise a warning if you pass a value
        # that starts with '-'
        if type_ == "filename":
            type_ = "string"
        # TODO: for most options, if you specify them more than once, only the last
        # one is taken. For others, (such as --url) each value is appended to a list
        # and all are processed. This would require parsing the C code in the switch
        # statement that processes the options.

        if 1 > len(letter) > 2:
            raise ValueError(f"letter form of --{lname} must be 1 or 2 characters long")
        if type_ not in RAW_ALIAS_TYPES:
            raise ValueError(f"unknown desc for --{lname}: {desc!r}")

        alias = {"letter": letter, "lname": lname, "type": type_}
        if lname in aliases and aliases[lname] != alias:
            print(
                f"{lname!r} repeated with different values:\n"
                + f"{aliases[lname]}\n"
                + f"{alias}",
                file=sys.stderr,
            )
        aliases[lname] = alias

    return list(aliases.values())


def fill_out_aliases(aliases, add_no_options=True, assumptions=set()):
    # If both --option and --other-option have "oO" (for example) as their `letter`,
    # add a "name" property with the main option's `lname`
    letter_count = Counter(a["letter"] for a in aliases)

    # "ARB_BOOL"-type OPTIONs have a --no-OPTION counterpart
    no_aliases = []

    for idx, alias in enumerate(aliases):
        if alias["type"] == "true":
            alias["type"] = "string"
        if alias["type"] == "false":
            alias["type"] = "bool" if add_no_options else "none"

        if alias["type"] in BOOL_TYPES:
            without_no = alias["lname"].removeprefix("no-").removeprefix("disable-")
            if alias["lname"] != without_no:
                assumption = f"Assuming --{alias['lname']} is {without_no!r}"
                if assumption not in assumptions:
                    assumptions.add(assumption)
                    print(assumption, file=sys.stderr)
                alias["name"] = without_no

        alias["name"] = alias["lname"]
        if letter_count[alias["letter"]] > 1:
            # Raise KeyError if special case hasn't been added yet
            candidate = DUPES[alias["lname"]]
            if alias["lname"] != candidate:
                alias["name"] = candidate

        if alias["type"] == "bool":
            no_alias = {
                **alias,
                "name": alias.get("name", alias["lname"]),
                "lname": "no-" + alias["lname"],
                # --no-OPTION options cannot be shortened
                "expand": False,
            }
            no_aliases.append((idx, no_alias))
        elif alias["type"] == "none":
            # The none/bool distinction is irrelevant after the step above
            alias["type"] = "bool"

    for i, (insert_idx, no_alias) in enumerate(no_aliases):
        # +1 so that --no-OPTION appears after --OPTION
        aliases.insert(insert_idx + i + 1, no_alias)

    return aliases


def split(aliases):
    long_args = {}
    short_args = {}
    for alias in aliases:
        if alias["lname"] in long_args:
            raise ValueError(f"duplicate lname: {alias['lname']!r}")
        long_args[alias["lname"]] = {
            k: v for k, v in alias.items() if k not in ["letter", "lname"]
        }
        if len(alias["letter"]) == 1:
            alias_name = alias.get("name", alias["lname"])
            if alias["letter"] == "N":  # -N is short for --no-buffer
                alias_name = "no-" + alias_name
            if (
                alias["letter"] in short_args
                and short_args[alias["letter"]] != alias_name
            ):
                raise ValueError(
                    f"duplicate short arg {alias['letter']!r}: {short_args[alias['letter']]!r} {alias_name!r}"
                )
            short_args[alias["letter"]] = alias_name
    return long_args, short_args


def format_as_js(d, indent="  ", indent_level=0):
    for top_key, opt in d.items():

        def quote(key):
            return json.dumps(key, ensure_ascii=False)

        def val_to_js(val):
            if isinstance(val, str):
                return quote(val)
            if isinstance(val, bool):
                return str(val).lower()
            raise TypeError(f"can't convert values of type {type(val)} to JS")

        if isinstance(opt, dict):
            vals = [
                f"{k if k.isalpha() else quote(k)}: {val_to_js(v)}"
                for k, v in opt.items()
            ]
            yield f"{indent * (indent_level + 1)}{quote(top_key)}: {{ {', '.join(vals)} }},"
        elif isinstance(opt, str):
            yield f"{indent * (indent_level + 1)}{quote(top_key)}: {val_to_js(opt)},"


def parse_tag(tag):
    if not tag.startswith("curl-") or tag.startswith("curl_"):
        return None
    version = tag.removeprefix("curl-").removeprefix("curl_")
    version, *extra = version.split("-", 1)
    extra = extra[0] if extra else ""
    major, minor, *patch = version.split("_", 2)
    if len(patch) > 1:
        raise ValueError(f"unknown patch version {patch} from tag {tag}")
    patch = patch[0] if patch else "0"
    if not patch.isdigit():
        if extra:
            raise ValueError(f"two extras? {tag}")
        extra = patch
        patch = "0"
    if extra:  # filter pre-releases
        return None
    return int(major), int(minor), int(patch)


def curl_tags(git_dir=args.repo_dir):
    tags = (
        subprocess.run(
            ["git", "tag"],
            cwd=git_dir,
            check=True,
            capture_output=True,
            text=True,
        )
        .stdout.strip()
        .splitlines()
    )
    for tag in tags:
        if parse_tag(tag):
            yield tag


def file_at_commit(filename, commit_hash, git_dir=args.repo_dir):
    contents = subprocess.run(
        ["git", "cat-file", "-p", f"{commit_hash}:{filename}"],
        cwd=git_dir,
        capture_output=True,
        check=True,
    ).stdout
    try:
        contents = contents.decode("utf-8")
    except UnicodeDecodeError:
        contents = contents.decode("latin1")
    return iter(contents.splitlines())


if __name__ == "__main__":
    # TODO: check that repo is up to date
    if not is_git_repo(args.repo_dir):
        sys.exit(f"{args.repo_dir} is not a git repo")

    tags = sorted(curl_tags(args.repo_dir), key=parse_tag)

    aliases = {}
    short_aliases = {}
    filename = "src/main.c"
    add_no_options = False
    for tag in tags:
        if tag == FILE_MOVED_TAG:
            filename = "src/tool_getparam.c"
        if tag == NO_OPTIONS_TAG:
            add_no_options = True
        f = file_at_commit(filename, tag)
        aliases[tag] = {}
        short_aliases[tag] = {}
        for alias in fill_out_aliases(parse_aliases(f), add_no_options):
            alias["expand"] = alias.get("expand", True)
            alias_name = alias.get("name", alias["lname"])
            alias_name = DUPES.get(alias_name, alias_name)
            # alias['name'] = alias_name
            if alias["lname"] in aliases[tag] and aliases[tag][alias["lname"]] != alias:
                raise ValueError("duplicate alias: --" + alias["lname"])
            # We don't want to report when curl changed the internal ID of some option
            if len(alias["letter"]) == 1:
                short_aliases[tag][alias["letter"]] = (alias_name, alias["type"])
            del alias["letter"]
            lname = alias["lname"]
            del alias["lname"]
            # TODO: figure out what to do about how shortenings change over time
            del alias["expand"]
            aliases[tag][lname] = alias
            # TODO: report how shortened --long options change

    for cur_tag, next_tag in zip(aliases.keys(), list(aliases.keys())[1:]):
        cur_aliases = short_aliases[cur_tag]
        next_aliases = short_aliases[next_tag]
        latest_aliases = short_aliases[list(aliases.keys())[-1]]

        # We don't care about when options got added
        # new_aliases = next_aliases.keys() - cur_aliases.keys()
        removed_aliases = cur_aliases.keys() - next_aliases.keys()
        changed_aliases = []
        for common_alias in cur_aliases.keys() & next_aliases.keys():
            if cur_aliases[common_alias] != next_aliases[common_alias]:
                changed_aliases.append(common_alias)

        if removed_aliases or changed_aliases:
            header = f"{cur_tag} -> {next_tag}"
            print(header)
            print("=" * len(header))
            for removed_alias in removed_aliases:
                print(f"- -{removed_alias} {cur_aliases[removed_alias]}")
                currently = latest_aliases.get(removed_alias)
                if currently:
                    # Could've been removed and added back multiple times, so what
                    # it is on master is not necessarily how it was added back next.
                    print("     added back later and is currently " + str(currently))
                print()
            for changed_alias in changed_aliases:
                print(f"- -{changed_alias} {cur_aliases[changed_alias]}")
                print(f"+ -{changed_alias} {next_aliases[changed_alias]}")
                currently = latest_aliases.get(changed_alias, "(no longer exists)")
                if currently != next_aliases[changed_alias]:
                    print("     later became " + str(currently))
                print()

    print("-" * 80)
    print()

    for cur_tag, next_tag in zip(aliases.keys(), list(aliases.keys())[1:]):
        cur_aliases = aliases[cur_tag]
        next_aliases = aliases[next_tag]

        new_aliases = next_aliases.keys() - cur_aliases.keys()
        removed_aliases = cur_aliases.keys() - next_aliases.keys()
        changed_aliases = []
        for common_alias in cur_aliases.keys() & next_aliases.keys():
            if cur_aliases[common_alias] != next_aliases[common_alias]:
                changed_aliases.append(common_alias)

        # We don't care when aliases were added, only when/if they are removed,
        # but we need to be able to see if an alias was added because it's actually
        # replacing a previous alias.
        # Only reporting added aliases when there are removed or changed aliases
        # is probably good enough for that purpose.
        if removed_aliases or changed_aliases:  # or new_aliases:
            header = f"{cur_tag} -> {next_tag}"
            print(header)
            print("=" * len(header))
            for new_alias in new_aliases:
                print(f"+ --{new_alias}: {next_aliases[new_alias]}")
                print()
            for removed_alias in removed_aliases:
                print(f"- --{removed_alias}: {cur_aliases[removed_alias]}")
                print()
            for changed_alias in changed_aliases:
                print(f"- --{changed_alias}: {cur_aliases[changed_alias]}")
                print(f"+ --{changed_alias}: {next_aliases[changed_alias]}")
                print()

    current_aliases = fill_out_aliases(
        parse_aliases(file_at_commit(filename, tags[-1])), add_no_options
    )
    long_args, short_args = split(current_aliases)

    js_params_lines = list(format_as_js(long_args))
    js_short_params_lines = list(format_as_js(short_args))

    new_lines = []
    with open(OUTPUT_FILE) as f:

        def add_between(f, new_lines, adding_lines, start, end):
            for line in f:
                new_lines.append(line)
                if start in line:
                    break
            else:
                raise ValueError(f"{'// ' + start!r} not in {OUTPUT_FILE}")

            new_lines += [l + "\n" for l in adding_lines]
            for line in f:
                if end in line:
                    new_lines.append(line)
                    break
            else:
                raise ValueError(f"{'// ' + end!r} not in {OUTPUT_FILE}")

        add_between(f, new_lines, js_params_lines, JS_PARAMS_START, JS_PARAMS_END)
        add_between(
            f,
            new_lines,
            js_short_params_lines,
            JS_SHORT_PARAMS_START,
            JS_SHORT_PARAMS_END,
        )
        for line in f:
            new_lines.append(line)

    new_cli_lines = []
    curl_version = tags[-1].removeprefix("curl-").replace("_", ".")
    with open(PACKAGE_JSON) as f:
        package_version = json.load(f)["version"]
    cli_version = f"{package_version} (curl {curl_version})"
    cli_version_line = CLI_VERSION_LINE_START + f'"{cli_version}";\n'
    with open(CLI_FILE) as f:
        for line in f:
            if line.strip().startswith(CLI_VERSION_LINE_START):
                break
            new_cli_lines.append(line)
        else:
            raise ValueError(
                f"no line in {CLI_FILE} starts with {CLI_VERSION_LINE_START!r}"
            )

        new_cli_lines.append(cli_version_line)

        for line in f:
            new_cli_lines.append(line)

    if args.write:
        with open(OUTPUT_FILE, "w", newline="\n") as f:
            f.write("".join(new_lines))
        with open(CLI_FILE, "w", newline="\n") as f:
            f.write("".join(new_cli_lines))
