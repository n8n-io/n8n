#!/usr/bin/env node
import { foregroundChild } from 'foreground-child';
import { existsSync } from 'fs';
import { jack } from 'jackspeak';
import { loadPackageJson } from 'package-json-from-dist';
import { basename, join } from 'path';
import { globStream } from './index.js';
const { version } = loadPackageJson(import.meta.url, '../package.json');
const j = jack({
    usage: 'glob [options] [<pattern> [<pattern> ...]]',
})
    .description(`
    Glob v${version}

    Expand the positional glob expression arguments into any matching file
    system paths found.
  `)
    .opt({
    cmd: {
        short: 'c',
        hint: 'command',
        description: `Run the command provided, passing the glob expression
                    matches as arguments.`,
    },
})
    .opt({
    default: {
        short: 'p',
        hint: 'pattern',
        description: `If no positional arguments are provided, glob will use
                    this pattern`,
    },
})
    .flag({
    shell: {
        default: false,
        description: `Interpret the command as a shell command by passing it
                    to the shell, with all matched filesystem paths appended,
                    **even if this cannot be done safely**.

                    This is **not** unsafe (and usually unnecessary) when using
                    the known Unix shells sh, bash, zsh, and fish, as these can
                    all be executed in such a way as to pass positional
                    arguments safely.

                    **Note**: THIS IS UNSAFE IF THE FILE PATHS ARE UNTRUSTED,
                    because a path like \`'some/path/\\$\\(cmd)'\` will be
                    executed by the shell.

                    If you do have positional arguments that you wish to pass to
                    the command ahead of the glob pattern matches, use the
                    \`--cmd-arg\`/\`-g\` option instead.

                    The next major release of glob will fully remove the ability
                    to use this option unsafely.`,
    },
})
    .optList({
    'cmd-arg': {
        short: 'g',
        hint: 'arg',
        default: [],
        description: `Pass the provided values to the supplied command, ahead of
                    the glob matches.

                    For example, the command:

                        glob -c echo -g"hello" -g"world" *.txt

                    might output:

                        hello world a.txt b.txt

                    This is a safer (and future-proof) alternative than putting
                    positional arguments in the \`-c\`/\`--cmd\` option.`,
    },
})
    .flag({
    all: {
        short: 'A',
        description: `By default, the glob cli command will not expand any
                    arguments that are an exact match to a file on disk.

                    This prevents double-expanding, in case the shell expands
                    an argument whose filename is a glob expression.

                    For example, if 'app/*.ts' would match 'app/[id].ts', then
                    on Windows powershell or cmd.exe, 'glob app/*.ts' will
                    expand to 'app/[id].ts', as expected. However, in posix
                    shells such as bash or zsh, the shell will first expand
                    'app/*.ts' to a list of filenames. Then glob will look
                    for a file matching 'app/[id].ts' (ie, 'app/i.ts' or
                    'app/d.ts'), which is unexpected.

                    Setting '--all' prevents this behavior, causing glob
                    to treat ALL patterns as glob expressions to be expanded,
                    even if they are an exact match to a file on disk.

                    When setting this option, be sure to enquote arguments
                    so that the shell will not expand them prior to passing
                    them to the glob command process.
      `,
    },
    absolute: {
        short: 'a',
        description: 'Expand to absolute paths',
    },
    'dot-relative': {
        short: 'd',
        description: `Prepend './' on relative matches`,
    },
    mark: {
        short: 'm',
        description: `Append a / on any directories matched`,
    },
    posix: {
        short: 'x',
        description: `Always resolve to posix style paths, using '/' as the
                    directory separator, even on Windows. Drive letter
                    absolute matches on Windows will be expanded to their
                    full resolved UNC paths, eg instead of 'C:\\foo\\bar',
                    it will expand to '//?/C:/foo/bar'.
      `,
    },
    follow: {
        short: 'f',
        description: `Follow symlinked directories when expanding '**'`,
    },
    realpath: {
        short: 'R',
        description: `Call 'fs.realpath' on all of the results. In the case
                    of an entry that cannot be resolved, the entry is
                    omitted. This incurs a slight performance penalty, of
                    course, because of the added system calls.`,
    },
    stat: {
        short: 's',
        description: `Call 'fs.lstat' on all entries, whether required or not
                    to determine if it's a valid match.`,
    },
    'match-base': {
        short: 'b',
        description: `Perform a basename-only match if the pattern does not
                    contain any slash characters. That is, '*.js' would be
                    treated as equivalent to '**/*.js', matching js files
                    in all directories.
      `,
    },
    dot: {
        description: `Allow patterns to match files/directories that start
                    with '.', even if the pattern does not start with '.'
      `,
    },
    nobrace: {
        description: 'Do not expand {...} patterns',
    },
    nocase: {
        description: `Perform a case-insensitive match. This defaults to
                    'true' on macOS and Windows platforms, and false on
                    all others.

                    Note: 'nocase' should only be explicitly set when it is
                    known that the filesystem's case sensitivity differs
                    from the platform default. If set 'true' on
                    case-insensitive file systems, then the walk may return
                    more or less results than expected.
      `,
    },
    nodir: {
        description: `Do not match directories, only files.

                    Note: to *only* match directories, append a '/' at the
                    end of the pattern.
      `,
    },
    noext: {
        description: `Do not expand extglob patterns, such as '+(a|b)'`,
    },
    noglobstar: {
        description: `Do not expand '**' against multiple path portions.
                    Ie, treat it as a normal '*' instead.`,
    },
    'windows-path-no-escape': {
        description: `Use '\\' as a path separator *only*, and *never* as an
                    escape character. If set, all '\\' characters are
                    replaced with '/' in the pattern.`,
    },
})
    .num({
    'max-depth': {
        short: 'D',
        description: `Maximum depth to traverse from the current
                    working directory`,
    },
})
    .opt({
    cwd: {
        short: 'C',
        description: 'Current working directory to execute/match in',
        default: process.cwd(),
    },
    root: {
        short: 'r',
        description: `A string path resolved against the 'cwd', which is
                    used as the starting point for absolute patterns that
                    start with '/' (but not drive letters or UNC paths
                    on Windows).

                    Note that this *doesn't* necessarily limit the walk to
                    the 'root' directory, and doesn't affect the cwd
                    starting point for non-absolute patterns. A pattern
                    containing '..' will still be able to traverse out of
                    the root directory, if it is not an actual root directory
                    on the filesystem, and any non-absolute patterns will
                    still be matched in the 'cwd'.

                    To start absolute and non-absolute patterns in the same
                    path, you can use '--root=' to set it to the empty
                    string. However, be aware that on Windows systems, a
                    pattern like 'x:/*' or '//host/share/*' will *always*
                    start in the 'x:/' or '//host/share/' directory,
                    regardless of the --root setting.
      `,
    },
    platform: {
        description: `Defaults to the value of 'process.platform' if
                    available, or 'linux' if not. Setting --platform=win32
                    on non-Windows systems may cause strange behavior!`,
        validOptions: [
            'aix',
            'android',
            'darwin',
            'freebsd',
            'haiku',
            'linux',
            'openbsd',
            'sunos',
            'win32',
            'cygwin',
            'netbsd',
        ],
    },
})
    .optList({
    ignore: {
        short: 'i',
        description: `Glob patterns to ignore`,
    },
})
    .flag({
    debug: {
        short: 'v',
        description: `Output a huge amount of noisy debug information about
                    patterns as they are parsed and used to match files.`,
    },
    version: {
        short: 'V',
        description: `Output the version (${version})`,
    },
    help: {
        short: 'h',
        description: 'Show this usage information',
    },
});
try {
    const { positionals, values } = j.parse();
    const { cmd, shell, all, default: def, version: showVersion, help, absolute, cwd, dot, 'dot-relative': dotRelative, follow, ignore, 'match-base': matchBase, 'max-depth': maxDepth, mark, nobrace, nocase, nodir, noext, noglobstar, platform, realpath, root, stat, debug, posix, 'cmd-arg': cmdArg, } = values;
    if (showVersion) {
        console.log(version);
        process.exit(0);
    }
    if (help) {
        console.log(j.usage());
        process.exit(0);
    }
    //const { shell, help } = values
    if (positionals.length === 0 && !def)
        throw 'No patterns provided';
    if (positionals.length === 0 && def)
        positionals.push(def);
    const patterns = all ? positionals : positionals.filter(p => !existsSync(p));
    const matches = all ? [] : positionals.filter(p => existsSync(p)).map(p => join(p));
    const stream = globStream(patterns, {
        absolute,
        cwd,
        dot,
        dotRelative,
        follow,
        ignore,
        mark,
        matchBase,
        maxDepth,
        nobrace,
        nocase,
        nodir,
        noext,
        noglobstar,
        platform: platform,
        realpath,
        root,
        stat,
        debug,
        posix,
    });
    if (!cmd) {
        matches.forEach(m => console.log(m));
        stream.on('data', f => console.log(f));
    }
    else {
        cmdArg.push(...matches);
        stream.on('data', f => cmdArg.push(f));
        // Attempt to support commands that contain spaces and otherwise require
        // shell interpretation, but do NOT shell-interpret the arguments, to avoid
        // injections via filenames. This affordance can only be done on known Unix
        // shells, unfortunately.
        //
        // 'bash', ['-c', cmd + ' "$@"', 'bash', ...matches]
        // 'zsh', ['-c', cmd + ' "$@"', 'zsh', ...matches]
        // 'fish', ['-c', cmd + ' "$argv"', ...matches]
        const { SHELL = 'unknown' } = process.env;
        const shellBase = basename(SHELL);
        const knownShells = ['sh', 'ksh', 'zsh', 'bash', 'fish'];
        if ((shell || /[ "']/.test(cmd)) &&
            knownShells.includes(shellBase)) {
            const cmdWithArgs = `${cmd} "\$${shellBase === 'fish' ? 'argv' : '@'}"`;
            if (shellBase !== 'fish') {
                cmdArg.unshift(SHELL);
            }
            cmdArg.unshift('-c', cmdWithArgs);
            stream.on('end', () => foregroundChild(SHELL, cmdArg));
        }
        else {
            if (shell) {
                process.emitWarning('The --shell option is unsafe, and will be removed. To pass ' +
                    'positional arguments to the subprocess, use -g/--cmd-arg instead.', 'DeprecationWarning', 'GLOB_SHELL');
            }
            stream.on('end', () => foregroundChild(cmd, cmdArg, { shell }));
        }
    }
}
catch (e) {
    console.error(j.usage());
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
}
//# sourceMappingURL=bin.mjs.map