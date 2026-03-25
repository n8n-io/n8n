#!/bin/sh
#---------------------------------------------
#   xdg-open
#
#   Utility script to open a URL in the registered default application.
#
#   Refer to the usage() function below for usage.
#
#   Copyright 2009-2010, Fathi Boudra <fabo@freedesktop.org>
#   Copyright 2009-2016, Rex Dieter <rdieter@fedoraproject.org>
#   Copyright 2006, Kevin Krammer <kevin.krammer@gmx.at>
#   Copyright 2006, Jeremy White <jwhite@codeweavers.com>
#
#   LICENSE:
#
#   Permission is hereby granted, free of charge, to any person obtaining a
#   copy of this software and associated documentation files (the "Software"),
#   to deal in the Software without restriction, including without limitation
#   the rights to use, copy, modify, merge, publish, distribute, sublicense,
#   and/or sell copies of the Software, and to permit persons to whom the
#   Software is furnished to do so, subject to the following conditions:
#
#   The above copyright notice and this permission notice shall be included
#   in all copies or substantial portions of the Software.
#
#   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
#   OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
#   THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
#   OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
#   ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
#   OTHER DEALINGS IN THE SOFTWARE.
#
#---------------------------------------------

manualpage()
{
cat << '_MANUALPAGE'
Name

   xdg-open -- opens a file or URL in the user's preferred
   application

Synopsis

   xdg-open { file | URL }

   xdg-open { --help | --manual | --version }

Description

   xdg-open opens a file or URL in the user's preferred
   application. If a URL is provided the URL will be opened in the
   user's preferred web browser. If a file is provided the file
   will be opened in the preferred application for files of that
   type. xdg-open supports file, ftp, http and https URLs.

   xdg-open is for use inside a desktop session only. It is not
   recommended to use xdg-open as root.

   As xdg-open can not handle arguments that begin with a "-" it
   is recommended to pass filepaths in one of the following ways:
     * Pass absolute paths, i.e. by using realpath as a
       preprocessor.
     * Prefix known relative filepaths with a "./". For example
       using sed -E 's|^[^/]|./\0|'.
     * Pass a file URL.

Options

   --help
          Show command synopsis.

   --manual
          Show this manual page.

   --version
          Show the xdg-utils version information.

Exit Codes

   An exit code of 0 indicates success while a non-zero exit code
   indicates failure. The following failure codes can be returned:

   1
          Error in command line syntax.

   2
          One of the files passed on the command line did not
          exist.

   3
          A required tool could not be found.

   4
          The action failed.

   In case of success the process launched from the .desktop file
   will not be forked off and therefore may result in xdg-open
   running for a very long time. This behaviour intentionally
   differs from most desktop specific openers to allow terminal
   based applications to run using the same terminal xdg-open was
   called from.

Reporting Issues

   Please keep in mind xdg-open inherits most of the flaws of its
   configuration and the underlying opener.

   In case the command xdg-mime query default "$(xdg-mime query
   filetype path/to/troublesome_file)" names the program
   responsible for any unexpected behaviour you can fix that by
   setting a different handler. (If the program is broken let the
   developers know)

   Also see the security note on xdg-mime(1) for the default
   subcommand.

   If a flaw is reproducible using the desktop specific opener
   (and isn't a configuration issue): Please report to whoever is
   responsible for that first (reporting to xdg-utils is better
   than not reporting at all, but since the xdg-utils are
   maintained in very little spare time a fix will take much
   longer)

   In case an issue specific to xdg-open please report it to
   https://gitlab.freedesktop.org/xdg/xdg-utils/-/issues .

See Also

   xdg-mime(1), xdg-settings(1), MIME applications associations
   specification

Examples

xdg-open 'http://www.freedesktop.org/'

   Opens the freedesktop.org website in the user's default
   browser.

xdg-open /tmp/foobar.png

   Opens the PNG image file /tmp/foobar.png in the user's default
   image viewing application.
_MANUALPAGE
}

usage()
{
cat << '_USAGE'
   xdg-open -- opens a file or URL in the user's preferred
   application

Synopsis

   xdg-open { file | URL }

   xdg-open { --help | --manual | --version }

_USAGE
}

#@xdg-utils-common@
#----------------------------------------------------------------------------
#   Common utility functions included in all XDG wrapper scripts
#----------------------------------------------------------------------------

#shellcheck shell=sh

DEBUG()
{
  [ -z "${XDG_UTILS_DEBUG_LEVEL}" ] && return 0;
  [ "${XDG_UTILS_DEBUG_LEVEL}" -lt "$1" ] && return 0;
  shift
  echo "$@" >&2
}

# This handles backslashes but not quote marks.
first_word()
{
    # shellcheck disable=SC2162 # No -r is intended here
    read first rest
    echo "$first"
}

#-------------------------------------------------------------
# map a binary to a .desktop file
binary_to_desktop_file()
{
    search="${XDG_DATA_HOME:-$HOME/.local/share}:${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"
    binary="$(command -v "$1")"
    binary="$(xdg_realpath "$binary")"
    base="$(basename "$binary")"
    IFS=:
    for dir in $search; do
        unset IFS
        [ "$dir" ] || continue
        [ -d "$dir/applications" ] || [ -d "$dir/applnk" ] || continue
        for file in "$dir"/applications/*.desktop "$dir"/applications/*/*.desktop "$dir"/applnk/*.desktop "$dir"/applnk/*/*.desktop; do
            [ -r "$file" ] || continue
            # Check to make sure it's worth the processing.
            grep -q "^Exec.*$base" "$file" || continue
            # Make sure it's a visible desktop file (e.g. not "preferred-web-browser.desktop").
            grep -Eq "^(NoDisplay|Hidden)=true" "$file" && continue
            command="$(grep -E "^Exec(\[[^]=]*])?=" "$file" | cut -d= -f 2- | first_word)"
            command="$(command -v "$command")"
            if [ x"$(xdg_realpath "$command")" = x"$binary" ]; then
                # Fix any double slashes that got added path composition
                echo "$file" | tr -s /
                return
            fi
        done
    done
}

#-------------------------------------------------------------
# map a .desktop file to a binary
desktop_file_to_binary()
{
    search="${XDG_DATA_HOME:-$HOME/.local/share}:${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"
    desktop="$(basename "$1")"
    IFS=:
    for dir in $search; do
        unset IFS
        [ "$dir" ] && [ -d "$dir/applications" ] || [ -d "$dir/applnk" ] || continue
        # Check if desktop file contains -
        if [ "${desktop#*-}" != "$desktop" ]; then
            vendor=${desktop%-*}
            app=${desktop#*-}
            if [ -r "$dir/applications/$vendor/$app" ]; then
                file_path="$dir/applications/$vendor/$app"
            elif [ -r "$dir/applnk/$vendor/$app" ]; then
                file_path="$dir/applnk/$vendor/$app"
            fi
        fi
        if test -z "$file_path" ; then
            for indir in "$dir"/applications/ "$dir"/applications/*/ "$dir"/applnk/ "$dir"/applnk/*/; do
                file="$indir/$desktop"
                if [ -r "$file" ]; then
                    file_path=$file
                    break
                fi
            done
        fi
        if [ -r "$file_path" ]; then
            # Remove any arguments (%F, %f, %U, %u, etc.).
            command="$(grep -E "^Exec(\[[^]=]*])?=" "$file_path" | cut -d= -f 2- | first_word)"
            command="$(command -v "$command")"
            xdg_realpath "$command"
            return
        fi
    done
}

#-------------------------------------------------------------
# Exit script on successfully completing the desired operation

# shellcheck disable=SC2120 # It is okay to call this without arguments
exit_success()
{
    if [ $# -gt 0 ]; then
        echo "$*"
        echo
    fi

    exit 0
}


#-----------------------------------------
# Exit script on malformed arguments, not enough arguments
# or missing required option.
# prints usage information

exit_failure_syntax()
{
    if [ $# -gt 0 ]; then
        echo "xdg-open: $*" >&2
        echo "Try 'xdg-open --help' for more information." >&2
    else
        usage
        echo "Use 'man xdg-open' or 'xdg-open --manual' for additional info."
    fi

    exit 1
}

#-------------------------------------------------------------
# Exit script on missing file specified on command line

exit_failure_file_missing()
{
    if [ $# -gt 0 ]; then
        echo "xdg-open: $*" >&2
    fi

    exit 2
}

#-------------------------------------------------------------
# Exit script on failure to locate necessary tool applications

exit_failure_operation_impossible()
{
    if [ $# -gt 0 ]; then
        echo "xdg-open: $*" >&2
    fi

    exit 3
}

#-------------------------------------------------------------
# Exit script on failure returned by a tool application

exit_failure_operation_failed()
{
    if [ $# -gt 0 ]; then
        echo "xdg-open: $*" >&2
    fi

    exit 4
}

#------------------------------------------------------------
# Exit script on insufficient permission to read a specified file

exit_failure_file_permission_read()
{
    if [ $# -gt 0 ]; then
        echo "xdg-open: $*" >&2
    fi

    exit 5
}

#------------------------------------------------------------
# Exit script on insufficient permission to write a specified file

exit_failure_file_permission_write()
{
    if [ $# -gt 0 ]; then
        echo "xdg-open: $*" >&2
    fi

    exit 6
}

check_input_file()
{
    if [ ! -e "$1" ]; then
        exit_failure_file_missing "file '$1' does not exist"
    fi
    if [ ! -r "$1" ]; then
        exit_failure_file_permission_read "no permission to read file '$1'"
    fi
}

check_vendor_prefix()
{
    file_label="$2"
    [ -n "$file_label" ] || file_label="filename"
    file="$(basename "$1")"
    case "$file" in
       [[:alpha:]]*-*)
         return
         ;;
    esac

    echo "xdg-open: $file_label '$file' does not have a proper vendor prefix" >&2
    echo 'A vendor prefix consists of alpha characters ([a-zA-Z]) and is terminated' >&2
    echo 'with a dash ("-"). An example '"$file_label"' is '"'example-$file'" >&2
    echo "Use --novendor to override or 'xdg-open --manual' for additional info." >&2
    exit 1
}

check_output_file()
{
    # if the file exists, check if it is writeable
    # if it does not exists, check if we are allowed to write on the directory
    if [ -e "$1" ]; then
        if [ ! -w "$1" ]; then
            exit_failure_file_permission_write "no permission to write to file '$1'"
        fi
    else
        DIR="$(dirname "$1")"
        if [ ! -w "$DIR" ] || [ ! -x "$DIR" ]; then
            exit_failure_file_permission_write "no permission to create file '$1'"
        fi
    fi
}

#----------------------------------------
# Checks for shared commands, e.g. --help

check_common_commands()
{
    while [ $# -gt 0 ] ; do
        parm="$1"
        shift

        case "$parm" in
            --help)
            usage
            echo "Use 'man xdg-open' or 'xdg-open --manual' for additional info."
            exit_success
            ;;

            --manual)
            manualpage
            exit_success
            ;;

            --version)
            echo "xdg-open 1.2.1"
            exit_success
            ;;

            --)
	        [ -z "$XDG_UTILS_ENABLE_DOUBLE_HYPEN" ] || break
	        ;;
        esac
    done
}

check_common_commands "$@"

[ -z "${XDG_UTILS_DEBUG_LEVEL}" ] && unset XDG_UTILS_DEBUG_LEVEL;
# shellcheck disable=SC2034
if [ "${XDG_UTILS_DEBUG_LEVEL-0}" -lt 1 ]; then
    # Be silent
    xdg_redirect_output=" > /dev/null 2> /dev/null"
else
    # All output to stderr
    xdg_redirect_output=" >&2"
fi

#--------------------------------------
# Checks for known desktop environments
# set variable DE to the desktop environments name, lowercase

detectDE()
{
    # see https://bugs.freedesktop.org/show_bug.cgi?id=34164
    unset GREP_OPTIONS

    if [ -n "${XDG_CURRENT_DESKTOP}" ]; then
      case "${XDG_CURRENT_DESKTOP}" in
         # only recently added to menu-spec, pre-spec X- still in use
         Cinnamon|X-Cinnamon)
           DE=cinnamon;
           ;;
         ENLIGHTENMENT)
           DE=enlightenment;
           ;;
         # GNOME, GNOME-Classic:GNOME, or GNOME-Flashback:GNOME
         GNOME*)
           DE=gnome;
           ;;
         KDE)
           DE=kde;
           ;;
         DEEPIN|Deepin|deepin)
           DE=deepin;
           ;;
         LXDE)
           DE=lxde;
           ;;
         LXQt)
           DE=lxqt;
           ;;
         MATE)
           DE=mate;
           ;;
         XFCE)
           DE=xfce
           ;;
         X-Generic)
           DE=generic
           ;;
      esac
    fi

    # shellcheck disable=SC2153
    if [ -z "$DE" ]; then
      # classic fallbacks
      if [ -n "$KDE_FULL_SESSION" ]; then DE=kde;
      elif [ -n "$GNOME_DESKTOP_SESSION_ID" ]; then DE=gnome;
      elif [ -n "$MATE_DESKTOP_SESSION_ID" ]; then DE=mate;
      elif dbus-send --print-reply --dest=org.freedesktop.DBus /org/freedesktop/DBus org.freedesktop.DBus.GetNameOwner string:org.gnome.SessionManager > /dev/null 2>&1 ; then DE=gnome;
      elif xprop -root _DT_SAVE_MODE 2> /dev/null | grep ' = \"xfce4\"$' >/dev/null 2>&1; then DE=xfce;
      elif xprop -root 2> /dev/null | grep -i '^xfce_desktop_window' >/dev/null 2>&1; then DE=xfce
      elif echo "$DESKTOP" | grep -q '^Enlightenment'; then DE=enlightenment;
      elif [ -n "$LXQT_SESSION_CONFIG" ]; then DE=lxqt;
      fi
    fi

    if [ -z "$DE" ]; then
      # fallback to checking $DESKTOP_SESSION
      case "$DESKTOP_SESSION" in
         gnome)
           DE=gnome;
           ;;
         LXDE|Lubuntu)
           DE=lxde;
           ;;
         MATE)
           DE=mate;
           ;;
         xfce|xfce4|'Xfce Session')
           DE=xfce;
           ;;
      esac
    fi

    if [ -z "$DE" ]; then
      # fallback to uname output for other platforms
      case "$(uname 2>/dev/null)" in
        CYGWIN*)
          DE=cygwin;
          ;;
        Darwin)
          DE=darwin;
          ;;
        Linux)
          grep -q microsoft /proc/version > /dev/null 2>&1 && \
          command -v explorer.exe > /dev/null 2>&1 && \
          DE=wsl;
          ;;
      esac
    fi

    if [ x"$DE" = x"gnome" ]; then
      # gnome-default-applications-properties is only available in GNOME 2.x
      # but not in GNOME 3.x
      command -v gnome-default-applications-properties > /dev/null || DE="gnome3"
    fi

    if [ -f "$XDG_RUNTIME_DIR/flatpak-info" ]; then
      DE="flatpak"
    fi
}

#----------------------------------------------------------------------------
# kfmclient exec/openURL can give bogus exit value in KDE <= 3.5.4
# It also always returns 1 in KDE 3.4 and earlier
# Simply return 0 in such case

kfmclient_fix_exit_code()
{
    version="$(LC_ALL=C.UTF-8 kde-config --version 2>/dev/null | grep '^KDE')"
    major="$(echo "$version" | sed 's/KDE.*: \([0-9]\).*/\1/')"
    minor="$(echo "$version" | sed 's/KDE.*: [0-9]*\.\([0-9]\).*/\1/')"
    release="$(echo "$version" | sed 's/KDE.*: [0-9]*\.[0-9]*\.\([0-9]\).*/\1/')"
    test "$major" -gt 3 && return "$1"
    test "$minor" -gt 5 && return "$1"
    test "$release" -gt 4 && return "$1"
    return 0
}

#----------------------------------------------------------------------------
# Returns true if there is a graphical display attached.

has_display()
{
    if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; then
        return 0
    else
        return 1
    fi
}

#----------------------------------------------------------------------------
# Prefixes a path with a "./" if it starts with a "-".
# This is useful for programs to not confuse paths with options.

unoption_path()
{
	case "$1" in
		-*)
			printf "./%s" "$1" ;;
		*)
			printf "%s" "$1" ;;
	esac
}

#----------------------------------------------------------------------------
# Performs a symlink and relative path resolving for a single argument.
# This will always fail if the given file does not exist!

xdg_realpath()
{
	# allow caching and external configuration
	if [ -z "$XDG_UTILS_REALPATH_BACKEND" ] ; then
		if command -v realpath >/dev/null 2>/dev/null ; then
			lines="$(realpath -- / 2>&1)"
			if [ $? = 0 ] && [ "$lines" = "/" ] ; then
				XDG_UTILS_REALPATH_BACKEND="realpath"
			else
				# The realpath took the -- literally, probably the busybox implementation
				XDG_UTILS_REALPATH_BACKEND="busybox-realpath"
			fi
			unset lines
		elif command -v readlink >/dev/null 2>/dev/null ; then
			XDG_UTILS_REALPATH_BACKEND="readlink"
		else
			exit_failure_operation_failed "No usable realpath backend found. Have a realpath binary or a readlink -f that canonicalizes paths."
		fi
	fi
	# Always fail if the file doesn't exist (busybox realpath does that for example)
	[ -e "$1" ] || return 1
	case "$XDG_UTILS_REALPATH_BACKEND" in
		realpath)
			realpath -- "$1"
			;;
		busybox-realpath)
			# busybox style realpath implementations have options too
			realpath "$(unoption_path "$1")"
			;;
		readlink)
			readlink -f "$(unoption_path "$1")"
			;;
		*)
			exit_failure_operation_impossible "Realpath backend '$XDG_UTILS_REALPATH_BACKEND' not recognized."
			;;
	esac
}

# This handles backslashes but not quote marks.
last_word()
{
    # Backslash handling is intended, not using `first` too
    # shellcheck disable=SC2162,SC2034
    read first rest
    echo "$rest"
}

# Get the value of a key in a desktop file's Desktop Entry group.
# Example: Use get_key foo.desktop Exec
# to get the values of the Exec= key for the Desktop Entry group.
get_key()
{
    local file="${1}"
    local key="${2}"
    local desktop_entry=""

    IFS_="${IFS}"
    IFS=""
    # No backslash handling here, first_word and last_word do that
    while read -r line
    do
        case "$line" in
            "[Desktop Entry]")
                desktop_entry="y"
            ;;
            # Reset match flag for other groups
            "["*)
                desktop_entry=""
            ;;
            "${key}="*)
                # Only match Desktop Entry group
                if [ -n "${desktop_entry}" ]
                then
                    echo "${line}" | cut -d= -f 2-
                fi
        esac
    done < "${file}"
    IFS="${IFS_}"
}

has_url_scheme()
{
	echo "$1" | LC_ALL=C grep -Eq '^[[:alpha:]][[:alpha:][:digit:]+\.\-]*:'
}

# Returns true if argument is a file:// URL or path
is_file_url_or_path()
{
    if echo "$1" | grep -q '^file://' || ! has_url_scheme "$1" ; then
        return 0
    else
        return 1
    fi
}

get_hostname() {
    if [ -z "$HOSTNAME" ]; then
        if command -v hostname > /dev/null; then
            HOSTNAME=$(hostname)
        else
            HOSTNAME=$(uname -n)
        fi
    fi
}

# If argument is a file URL, convert it to a (percent-decoded) path.
# If not, leave it as it is.
file_url_to_path()
{
    local file="$1"
    get_hostname
    if echo "$file" | grep -q '^file://'; then
        file=${file#file://localhost}
        file=${file#file://"$HOSTNAME"}
        file=${file#file://}
        if ! echo "$file" | grep -q '^/'; then
            echo "$file"
            return
        fi
        file=${file%%#*}
        file=${file%%\?*}
        local printf=printf
        if [ -x /usr/bin/printf ]; then
            printf=/usr/bin/printf
        fi
        file=$($printf "$(echo "$file" | sed -e 's@%\([a-f0-9A-F]\{2\}\)@\\x\1@g')")
    fi
    echo "$file"
}

open_cygwin()
{
    cygstart "$1"

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_darwin()
{
    open "$1"

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_kde()
{
    if [ -n "${KDE_SESSION_VERSION}" ]; then
      case "${KDE_SESSION_VERSION}" in
        4)
          kde-open "$1"
        ;;
        5)
          "kde-open${KDE_SESSION_VERSION}" "$1"
        ;;
        6)
          kde-open "$1"
        ;;
      esac
    else
        kfmclient exec "$1"
        kfmclient_fix_exit_code $?
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_deepin()
{
    if dde-open -version >/dev/null 2>&1; then
        dde-open "$1"
    else
        open_generic "$1"
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_gnome3()
{
    if gio help open 2>/dev/null 1>&2; then
        gio open "$1"
    elif gvfs-open --help 2>/dev/null 1>&2; then
        gvfs-open "$1"
    else
        open_generic "$1"
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_gnome()
{
    if gio help open 2>/dev/null 1>&2; then
        gio open "$1"
    elif gvfs-open --help 2>/dev/null 1>&2; then
        gvfs-open "$1"
    elif gnome-open --help 2>/dev/null 1>&2; then
        gnome-open "$1"
    else
        open_generic "$1"
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_mate()
{
    if gio help open 2>/dev/null 1>&2; then
        gio open "$1"
    elif gvfs-open --help 2>/dev/null 1>&2; then
        gvfs-open "$1"
    elif mate-open --help 2>/dev/null 1>&2; then
        mate-open "$1"
    else
        open_generic "$1"
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_xfce()
{
    if exo-open --help 2>/dev/null 1>&2; then
        exo-open "$1"
    elif gio help open 2>/dev/null 1>&2; then
        gio open "$1"
    elif gvfs-open --help 2>/dev/null 1>&2; then
        gvfs-open "$1"
    else
        open_generic "$1"
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_enlightenment()
{
    if enlightenment_open --help 2>/dev/null 1>&2; then
        enlightenment_open "$1"
    else
        open_generic "$1"
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_flatpak()
{
    if is_file_url_or_path "$1"; then
        local file
        file="$(file_url_to_path "$1")"

        check_input_file "$file"

        gdbus call --session \
            --dest org.freedesktop.portal.Desktop \
            --object-path /org/freedesktop/portal/desktop \
            --method org.freedesktop.portal.OpenURI.OpenFile \
            --timeout 5 \
            "" "3" {} 3< "$file"
    else
        # $1 contains an URI

        gdbus call --session \
            --dest org.freedesktop.portal.Desktop \
            --object-path /org/freedesktop/portal/desktop \
            --method org.freedesktop.portal.OpenURI.OpenURI \
            --timeout 5 \
            "" "$1" {}
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

#-----------------------------------------
# Recursively search .desktop file

#(application, directory, target file, target_url)
search_desktop_file()
{
    local default="$1"
    local dir="$2"
    local target="$3"
    local target_uri="$4"

    local file=""
    # look for both vendor-app.desktop, vendor/app.desktop
    if [ -r "$dir/$default" ]; then
      file="$dir/$default"
    elif [ -r "$dir/$(echo "$default" | sed -e 's|-|/|')" ]; then
      file="$dir/$(echo "$default" | sed -e 's|-|/|')"
    fi

    if [ -r "$file" ] ; then
        command="$(get_key "${file}" "Exec" | first_word)"
        if command -v "$command" >/dev/null; then
            icon="$(get_key "${file}" "Icon")"
            # FIXME: Actually LC_MESSAGES should be used as described in
            # http://standards.freedesktop.org/desktop-entry-spec/latest/ar01s04.html
            localised_name="$(get_key "${file}" "Name")"
            #shellcheck disable=SC2046 # Splitting is intentional here
            set -- $(get_key "${file}" "Exec" | last_word)
            # We need to replace any occurrence of "%f", "%F" and
            # the like by the target file. We examine each
            # argument and append the modified argument to the
            # end then shift.
            local args=$#
            local replaced=0
            while [ $args -gt 0 ]; do
                case $1 in
                    %[c])
                        replaced=1
                        arg="${localised_name}"
                        shift
                        set -- "$@" "$arg"
                        ;;
                    %[fF])
	                    # if there is only a target_url return,
	                    # this application can't handle it.
	                    [ -n "$target" ] || return
                        replaced=1
                        arg="$target"
                        shift
                        set -- "$@" "$arg"
                        ;;
                    %[uU])
                        replaced=1
                        # When an URI is requested use it,
                        # otherwise fall back to the filepath.
                        arg="${target_uri:-$target}"
                        shift
                        set -- "$@" "$arg"
                        ;;
                    %[i])
                        replaced=1
                        shift
                        set -- "$@" "--icon" "$icon"
                        ;;
                    *)
                        arg="$1"
                        shift
                        set -- "$@" "$arg"
                        ;;
                esac
                args=$(( args - 1 ))
            done
            [ $replaced -eq 1 ] || set -- "$@" "${target:-$target_uri}"
            env "$command" "$@"
            exit_success
        fi
    fi

    for d in "$dir/"*/; do
        [ -d "$d" ] && search_desktop_file "$default" "$d" "$target" "$target_uri"
    done
}

# (file (or empty), mimetype, optional url)
open_generic_xdg_mime()
{
    filetype="$2"
    default="$(xdg-mime query default "$filetype")"
    if [ -n "$default" ] ; then
        xdg_user_dir="$XDG_DATA_HOME"
        [ -n "$xdg_user_dir" ] || xdg_user_dir="$HOME/.local/share"

        xdg_system_dirs="$XDG_DATA_DIRS"
        [ -n "$xdg_system_dirs" ] || xdg_system_dirs=/usr/local/share/:/usr/share/

        search_dirs="$xdg_user_dir:$xdg_system_dirs"
        DEBUG 3 "$search_dirs"
        old_ifs="$IFS"
        IFS=:
        for x in $search_dirs ; do
            IFS="$old_ifs"
            search_desktop_file "$default" "$x/applications/" "$1" "$3"
        done
    fi
}

open_generic_xdg_x_scheme_handler()
{
    scheme="$(echo "$1" | LC_ALL=C sed -n 's/\(^[[:alpha:]][[:alnum:]+\.-]*\):.*$/\1/p')"
    if [ -n "$scheme" ]; then
        filetype="x-scheme-handler/$scheme"
        open_generic_xdg_mime "" "$filetype" "$1"
    fi
}

has_single_argument()
{
  test $# = 1
}

open_envvar()
{
    local oldifs="$IFS"
    local browser

    IFS=":"
    for browser in $BROWSER; do
        IFS="$oldifs"

        if [ -z "$browser" ]; then
            continue
        fi

        if echo "$browser" | grep -q %s; then
            # Avoid argument injection.
            # See https://bugs.freedesktop.org/show_bug.cgi?id=103807
            # URIs don't have IFS characters spaces anyway.
            # shellcheck disable=SC2086,SC2091,SC2059
            # All the scary things here are intentional
            has_single_argument $1 && $(printf "$browser" "$1")
        else
            $browser "$1"
        fi

        if [ $? -eq 0 ]; then
            exit_success
        fi
    done
}

open_wsl()
{
    local win_path
    if is_file_url_or_path "$1" ; then
        win_path="$(file_url_to_path "$1")"
        win_path="$(wslpath -aw "$win_path")"
        [ $? -eq 0 ] || exit_failure_operation_failed
        explorer.exe "${win_path}"
    else
        rundll32.exe url.dll,FileProtocolHandler "$1" 
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_generic()
{
    if is_file_url_or_path "$1"; then
        local file
        file="$(file_url_to_path "$1")"

        check_input_file "$file"

        if has_display; then
            filetype="$(xdg-mime query filetype "$file" | sed "s/;.*//")"
            # passing a path a url is okay too,
            # see desktop file specification for '%u'
            open_generic_xdg_mime "$file" "$filetype" "$1"
        fi

        if command -v run-mailcap >/dev/null; then
            run-mailcap --action=view "$file"
            if [ $? -eq 0 ]; then
                exit_success
            fi
        fi

        if has_display && mimeopen -v 2>/dev/null 1>&2; then
            mimeopen -L -n "$file"
            if [ $? -eq 0 ]; then
                exit_success
            fi
        fi
    fi

    if has_display; then
        open_generic_xdg_x_scheme_handler "$1"
    fi

    if [ -n "$BROWSER" ]; then
        open_envvar "$1"
    fi

    # if BROWSER variable is not set, check some well known browsers instead
    if [ x"$BROWSER" = x"" ]; then
        BROWSER=www-browser:links2:elinks:links:lynx:w3m
        if has_display; then
            BROWSER=x-www-browser:firefox:iceweasel:seamonkey:mozilla:epiphany:konqueror:chromium:chromium-browser:google-chrome:$BROWSER
        fi
    fi

    open_envvar "$1"

    exit_failure_operation_impossible "no method available for opening '$1'"
}

open_lxde()
{

    # pcmanfm only knows how to handle file:// urls and filepaths, it seems.
    if pcmanfm --help >/dev/null 2>&1 && is_file_url_or_path "$1"; then
        local file
        file="$(file_url_to_path "$1")"

        # handle relative paths
        if ! echo "$file" | grep -q ^/; then
            file="$(pwd)/$file"
        fi

        pcmanfm "$file"
    else
        open_generic "$1"
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

open_lxqt()
{
    if qtxdg-mat open --help 2>/dev/null 1>&2; then
        qtxdg-mat open "$1"
    else
        exit_failure_operation_impossible "no method available for opening '$1'"
    fi

    if [ $? -eq 0 ]; then
        exit_success
    else
        exit_failure_operation_failed
    fi
}

[ x"$1" != x"" ] || exit_failure_syntax

url=
while [ $# -gt 0 ] ; do
    parm="$1"
    shift

    case "$parm" in
      -*)
        exit_failure_syntax "unexpected option '$parm'"
        ;;

      *)
        if [ -n "$url" ] ; then
            exit_failure_syntax "unexpected argument '$parm'"
        fi
        url="$parm"
        ;;
    esac
done

if [ -z "${url}" ] ; then
    exit_failure_syntax "file or URL argument missing"
fi

detectDE

if [ x"$DE" = x"" ]; then
    DE=generic
fi

DEBUG 2 "Selected DE $DE"

# sanitize BROWSER (avoid calling ourselves in particular)
case "${BROWSER}" in
    *:"xdg-open"|"xdg-open":*)
        BROWSER="$(echo "$BROWSER" | sed -e 's|:xdg-open||g' -e 's|xdg-open:||g')"
        ;;
    "xdg-open")
        BROWSER=
        ;;
esac

case "$DE" in
    kde)
    open_kde "$url"
    ;;

    deepin)
    open_deepin "$url"
    ;;

    gnome3|cinnamon)
    open_gnome3 "$url"
    ;;

    gnome)
    open_gnome "$url"
    ;;

    mate)
    open_mate "$url"
    ;;

    xfce)
    open_xfce "$url"
    ;;

    lxde)
    open_lxde "$url"
    ;;

    lxqt)
    open_lxqt "$url"
    ;;

    enlightenment)
    open_enlightenment "$url"
    ;;

    cygwin)
    open_cygwin "$url"
    ;;

    darwin)
    open_darwin "$url"
    ;;

    flatpak)
    open_flatpak "$url"
    ;;

    wsl)
    open_wsl "$url"
    ;;

    generic)
    open_generic "$url"
    ;;

    *)
    exit_failure_operation_impossible "no method available for opening '$url'"
    ;;
esac
