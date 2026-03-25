#!/usr/bin/env node

/*
  The MIT License (MIT)

  Copyright (c) 2007-2018 Einar Lielmanis, Liam Newman, and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

  Js-Beautify Command-line for node.js
  -------------------------------------

  Written by Daniel Stockman (daniel.stockman@gmail.com)

*/
/*jshint strict:false */

var debug = process.env.DEBUG_JSBEAUTIFY || process.env.JSBEAUTIFY_DEBUG ? function() {
    console.error.apply(console, arguments);
} : function() {};

var fs = require('fs'),
    cc = require('config-chain'),
    beautify = require('../index'),
    nopt = require('nopt'),
    glob = require('glob');

nopt.invalidHandler = function(key, val) {
    throw new Error(key + " was invalid with value \"" + val + "\"");
};

nopt.typeDefs.brace_style = {
    type: "brace_style",
    validate: function(data, key, val) {
        data[key] = val;
        // TODO: expand-strict is obsolete, now identical to expand.  Remove in future version
        // TODO: collapse-preserve-inline is obselete, now identical to collapse,preserve-inline = true. Remove in future version
        var validVals = ["collapse", "collapse-preserve-inline", "expand", "end-expand", "expand-strict", "none", "preserve-inline"];
        var valSplit = val.split(/[^a-zA-Z0-9_\-]+/); //Split will always return at least one parameter
        for (var i = 0; i < valSplit.length; i++) {
            if (validVals.indexOf(valSplit[i]) === -1) {
                return false;
            }
        }
        return true;
    }
};
nopt.typeDefs.glob = {
    type: "glob",
    validate: function(data, key, val) {
        if (typeof val === 'string' && glob.hasMagic(val)) {
            // Preserve value if it contains glob magic
            data[key] = val;
            return true;
        } else {
            // Otherwise validate it as regular path
            return nopt.typeDefs.path.validate(data, key, val);
        }
    }
};
var path = require('path'),
    editorconfig = require('editorconfig'),
    knownOpts = {
        // Beautifier
        "indent_size": Number,
        "indent_char": String,
        "eol": String,
        "indent_level": Number,
        "indent_with_tabs": Boolean,
        "preserve_newlines": Boolean,
        "max_preserve_newlines": Number,
        "space_in_paren": Boolean,
        "space_in_empty_paren": Boolean,
        "jslint_happy": Boolean,
        "space_after_anon_function": Boolean,
        "space_after_named_function": Boolean,
        "brace_style": "brace_style", //See above for validation
        "unindent_chained_methods": Boolean,
        "break_chained_methods": Boolean,
        "keep_array_indentation": Boolean,
        "unescape_strings": Boolean,
        "wrap_line_length": Number,
        "wrap_attributes": ["auto", "force", "force-aligned", "force-expand-multiline", "aligned-multiple", "preserve", "preserve-aligned"],
        "wrap_attributes_min_attrs": Number,
        "wrap_attributes_indent_size": Number,
        "e4x": Boolean,
        "end_with_newline": Boolean,
        "comma_first": Boolean,
        "operator_position": ["before-newline", "after-newline", "preserve-newline"],
        "indent_empty_lines": Boolean,
        "templating": [String, Array],
        // CSS-only
        "selector_separator_newline": Boolean,
        "newline_between_rules": Boolean,
        "space_around_combinator": Boolean,
        //deprecated - replaced with space_around_combinator, remove in future version
        "space_around_selector_separator": Boolean,
        // HTML-only
        "max_char": Number, // obsolete since 1.3.5
        "inline": [String, Array],
        "inline_custom_elements": [Boolean],
        "unformatted": [String, Array],
        "content_unformatted": [String, Array],
        "indent_inner_html": [Boolean],
        "indent_handlebars": [Boolean],
        "indent_scripts": ["keep", "separate", "normal"],
        "extra_liners": [String, Array],
        "unformatted_content_delimiter": String,
        // CLI
        "version": Boolean,
        "help": Boolean,
        "files": ["glob", Array],
        "outfile": path,
        "replace": Boolean,
        "quiet": Boolean,
        "type": ["js", "css", "html"],
        "config": path,
        "editorconfig": Boolean
    },
    // dasherizeShorthands provides { "indent-size": ["--indent_size"] }
    // translation, allowing more convenient dashes in CLI arguments
    shortHands = dasherizeShorthands({
        // Beautifier
        "s": ["--indent_size"],
        "c": ["--indent_char"],
        "e": ["--eol"],
        "l": ["--indent_level"],
        "t": ["--indent_with_tabs"],
        "p": ["--preserve_newlines"],
        "m": ["--max_preserve_newlines"],
        "P": ["--space_in_paren"],
        "Q": ["--space_in_empty_paren"],
        "j": ["--jslint_happy"],
        "a": ["--space_after_anon_function"],
        "b": ["--brace_style"],
        "u": ["--unindent_chained_methods"],
        "B": ["--break_chained_methods"],
        "k": ["--keep_array_indentation"],
        "x": ["--unescape_strings"],
        "w": ["--wrap_line_length"],
        "X": ["--e4x"],
        "n": ["--end_with_newline"],
        "C": ["--comma_first"],
        "O": ["--operator_position"],
        // CSS-only
        "L": ["--selector_separator_newline"],
        "N": ["--newline_between_rules"],
        // HTML-only
        "A": ["--wrap_attributes"],
        "M": ["--wrap_attributes_min_attrs"],
        "i": ["--wrap_attributes_indent_size"],
        "W": ["--max_char"], // obsolete since 1.3.5
        "d": ["--inline"],
        // no shorthand for "inline_custom_elements"
        "U": ["--unformatted"],
        "T": ["--content_unformatted"],
        "I": ["--indent_inner_html"],
        "H": ["--indent_handlebars"],
        "S": ["--indent_scripts"],
        "E": ["--extra_liners"],
        // non-dasherized hybrid shortcuts
        "good-stuff": [
            "--keep_array_indentation",
            "--keep_function_indentation",
            "--jslint_happy"
        ],
        "js": ["--type", "js"],
        "css": ["--type", "css"],
        "html": ["--type", "html"],
        // CLI
        "v": ["--version"],
        "h": ["--help"],
        "f": ["--files"],
        "file": ["--files"],
        "o": ["--outfile"],
        "r": ["--replace"],
        "q": ["--quiet"]
        // no shorthand for "config"
        // no shorthand for "editorconfig"
        // no shorthand for "indent_empty_lines"
        // not shorthad for "templating"
    });

function verifyExists(fullPath) {
    return fs.existsSync(fullPath) ? fullPath : null;
}

function findRecursive(dir, fileName) {
    var fullPath = path.join(dir, fileName);
    var nextDir = path.dirname(dir);
    var result = verifyExists(fullPath);

    if (!result && (nextDir !== dir)) {
        result = findRecursive(nextDir, fileName);
    }

    return result;
}

function getUserHome() {
    var user_home = '';
    try {
        user_home = process.env.USERPROFILE || process.env.HOME || '';
    } catch (ex) {}
    return user_home;
}

function set_file_editorconfig_opts(file, config) {
    try {
        var eConfigs = editorconfig.parseSync(file);

        if (eConfigs.indent_style === "tab") {
            config.indent_with_tabs = true;
        } else if (eConfigs.indent_style === "space") {
            config.indent_with_tabs = false;
        }

        if (eConfigs.indent_size) {
            config.indent_size = eConfigs.indent_size;
        }

        if (eConfigs.max_line_length) {
            if (eConfigs.max_line_length === "off") {
                config.wrap_line_length = 0;
            } else {
                config.wrap_line_length = parseInt(eConfigs.max_line_length, 10);
            }
        }

        if (eConfigs.insert_final_newline === true) {
            config.end_with_newline = true;
        } else if (eConfigs.insert_final_newline === false) {
            config.end_with_newline = false;
        }

        if (eConfigs.end_of_line) {
            if (eConfigs.end_of_line === 'cr') {
                config.eol = '\r';
            } else if (eConfigs.end_of_line === 'lf') {
                config.eol = '\n';
            } else if (eConfigs.end_of_line === 'crlf') {
                config.eol = '\r\n';
            }
        }
    } catch (e) {
        debug(e);
    }
}

// var cli = require('js-beautify/cli'); cli.interpret();
var interpret = exports.interpret = function(argv, slice) {
    var parsed;
    try {
        parsed = nopt(knownOpts, shortHands, argv, slice);
    } catch (ex) {
        usage(ex);
        // console.error(ex);
        // console.error('Run `' + getScriptName() + ' -h` for help.');
        process.exit(1);
    }


    if (parsed.version) {
        console.log(require('../../package.json').version);
        process.exit(0);
    } else if (parsed.help) {
        usage();
        process.exit(0);
    }

    var cfg;
    var configRecursive = findRecursive(process.cwd(), '.jsbeautifyrc');
    var configHome = verifyExists(path.join(getUserHome() || "", ".jsbeautifyrc"));
    var configDefault = __dirname + '/../config/defaults.json';

    try {
        cfg = cc(
            parsed,
            cleanOptions(cc.env('jsbeautify_'), knownOpts),
            parsed.config,
            configRecursive,
            configHome,
            configDefault
        ).snapshot;
    } catch (ex) {
        debug(cfg);
        // usage(ex);
        console.error(ex);
        console.error('Error while loading beautifier configuration.');
        console.error('Configuration file chain included:');
        if (parsed.config) {
            console.error(parsed.config);
        }
        if (configRecursive) {
            console.error(configRecursive);
        }
        if (configHome) {
            console.error(configHome);
        }
        console.error(configDefault);
        console.error('Run `' + getScriptName() + ' -h` for help.');
        process.exit(1);
    }

    try {
        // Verify arguments
        checkType(cfg);
        checkFiles(cfg);
        debug(cfg);

        // Process files synchronously to avoid EMFILE error
        cfg.files.forEach(processInputSync, {
            cfg: cfg
        });
    } catch (ex) {
        debug(cfg);
        // usage(ex);
        console.error(ex);
        console.error('Run `' + getScriptName() + ' -h` for help.');
        process.exit(1);
    }
};

// interpret args immediately when called as executable
if (require.main === module) {
    interpret();
}

function usage(err) {
    var scriptName = getScriptName();
    var msg = [
        scriptName + '@' + require('../../package.json').version,
        '',
        'CLI Options:',
        '  -f, --file       Input file(s) (Pass \'-\' for stdin)',
        '  -r, --replace    Write output in-place, replacing input',
        '  -o, --outfile    Write output to file (default stdout)',
        '  --config         Path to config file',
        '  --type           [js|css|html] ["js"]',
        '  -q, --quiet      Suppress logging to stdout',
        '  -h, --help       Show this help',
        '  -v, --version    Show the version',
        '',
        'Beautifier Options:',
        '  -s, --indent-size                 Indentation size [4]',
        '  -c, --indent-char                 Indentation character [" "]',
        '  -t, --indent-with-tabs            Indent with tabs, overrides -s and -c',
        '  -e, --eol                         Character(s) to use as line terminators.',
        '                                    [first newline in file, otherwise "\\n]',
        '  -n, --end-with-newline            End output with newline',
        '  --indent-empty-lines              Keep indentation on empty lines',
        '  --templating                      List of templating languages (auto,none,django,erb,handlebars,php,smarty) ["auto"] auto = none in JavaScript, all in html',
        '  --editorconfig                    Use EditorConfig to set up the options'
    ];

    switch (scriptName.split('-').shift()) {
        case "js":
            msg.push('  -l, --indent-level                Initial indentation level [0]');
            msg.push('  -p, --preserve-newlines           Preserve line-breaks (--no-preserve-newlines disables)');
            msg.push('  -m, --max-preserve-newlines       Number of line-breaks to be preserved in one chunk [10]');
            msg.push('  -P, --space-in-paren              Add padding spaces within paren, ie. f( a, b )');
            msg.push('  -E, --space-in-empty-paren        Add a single space inside empty paren, ie. f( )');
            msg.push('  -j, --jslint-happy                Enable jslint-stricter mode');
            msg.push('  -a, --space-after-anon-function   Add a space before an anonymous function\'s parens, ie. function ()');
            msg.push('  --space_after_named_function      Add a space before a named function\'s parens, ie. function example ()');
            msg.push('  -b, --brace-style                 [collapse|expand|end-expand|none][,preserve-inline] [collapse,preserve-inline]');
            msg.push('  -u, --unindent-chained-methods    Don\'t indent chained method calls');
            msg.push('  -B, --break-chained-methods       Break chained method calls across subsequent lines');
            msg.push('  -k, --keep-array-indentation      Preserve array indentation');
            msg.push('  -x, --unescape-strings            Decode printable characters encoded in xNN notation');
            msg.push('  -w, --wrap-line-length            Wrap lines that exceed N characters [0]');
            msg.push('  -X, --e4x                         Pass E4X xml literals through untouched');
            msg.push('  --good-stuff                      Warm the cockles of Crockford\'s heart');
            msg.push('  -C, --comma-first                 Put commas at the beginning of new line instead of end');
            msg.push('  -O, --operator-position           Set operator position (before-newline|after-newline|preserve-newline) [before-newline]');
            break;
        case "html":
            msg.push('  -b, --brace-style                 [collapse|expand|end-expand] ["collapse"]');
            msg.push('  -I, --indent-inner-html           Indent body and head sections. Default is false.');
            msg.push('  -H, --indent-handlebars           Indent handlebars. Default is false.');
            msg.push('  -S, --indent-scripts              [keep|separate|normal] ["normal"]');
            msg.push('  -w, --wrap-line-length            Wrap lines that exceed N characters [0]');
            msg.push('  -A, --wrap-attributes             Wrap html tag attributes to new lines [auto|force|force-aligned|force-expand-multiline|aligned-multiple|preserve|preserve-aligned] ["auto"]');
            msg.push('  -M, --wrap-attributes-min-attrs   Minimum number of html tag attributes for force wrap attribute options [2]');
            msg.push('  -i, --wrap-attributes-indent-size Indent wrapped tags to after N characters [indent-level]');
            msg.push('  -p, --preserve-newlines           Preserve line-breaks (--no-preserve-newlines disables)');
            msg.push('  -m, --max-preserve-newlines       Number of line-breaks to be preserved in one chunk [10]');
            msg.push('  -U, --unformatted                 List of tags (defaults to inline) that should not be reformatted');
            msg.push('  -T, --content_unformatted         List of tags (defaults to pre) whose content should not be reformatted');
            msg.push('  -E, --extra_liners                List of tags (defaults to [head,body,/html] that should have an extra newline');
            msg.push('  --unformatted_content_delimiter    Keep text content together between this string [""]');
            break;
        case "css":
            msg.push('  -b, --brace-style                       [collapse|expand] ["collapse"]');
            msg.push('  -L, --selector-separator-newline        Add a newline between multiple selectors.');
            msg.push('  -N, --newline-between-rules             Add a newline between CSS rules.');
    }

    if (err) {
        msg.push(err);
        msg.push('');
        console.error(msg.join('\n'));
    } else {
        console.log(msg.join('\n'));
    }
}

// main iterator, {cfg} passed as thisArg of forEach call

function processInputSync(filepath) {
    var data = null,
        config = this.cfg,
        outfile = config.outfile,
        input;

    // -o passed with no value overwrites
    if (outfile === true || config.replace) {
        outfile = filepath;
    }

    var fileType = getOutputType(outfile, filepath, config.type);

    if (config.editorconfig) {
        var editorconfig_filepath = filepath;

        if (editorconfig_filepath === '-') {
            if (outfile) {
                editorconfig_filepath = outfile;
            } else {
                editorconfig_filepath = 'stdin.' + fileType;
            }
        }

        debug("EditorConfig is enabled for ", editorconfig_filepath);
        config = cc(config).snapshot;
        set_file_editorconfig_opts(editorconfig_filepath, config);
        debug(config);
    }

    if (filepath === '-') {
        input = process.stdin;

        input.setEncoding('utf8');

        input.on('error', function() {
            throw 'Must pipe input or define at least one file.';
        });

        input.on('data', function(chunk) {
            data = data || '';
            data += chunk;
        });

        input.on('end', function() {
            if (data === null) {
                throw 'Must pipe input or define at least one file.';
            }
            makePretty(fileType, data, config, outfile, writePretty); // Where things get beautified
        });

        input.resume();

    } else {
        data = fs.readFileSync(filepath, 'utf8');
        makePretty(fileType, data, config, outfile, writePretty);
    }
}

function makePretty(fileType, code, config, outfile, callback) {
    try {
        var pretty = beautify[fileType](code, config);

        callback(null, pretty, outfile, config);
    } catch (ex) {
        callback(ex);
    }
}

function writePretty(err, pretty, outfile, config) {
    debug('writing ' + outfile);
    if (err) {
        console.error(err);
        process.exit(1);
    }

    if (outfile) {
        fs.mkdirSync(path.dirname(outfile), { recursive: true });

        if (isFileDifferent(outfile, pretty)) {
            try {
                fs.writeFileSync(outfile, pretty, 'utf8');
                logToStdout('beautified ' + path.relative(process.cwd(), outfile), config);
            } catch (ex) {
                onOutputError(ex);
            }
        } else {
            logToStdout('beautified ' + path.relative(process.cwd(), outfile) + ' - unchanged', config);
        }
    } else {
        process.stdout.write(pretty);
    }
}

function isFileDifferent(filePath, expected) {
    try {
        return fs.readFileSync(filePath, 'utf8') !== expected;
    } catch (ex) {
        // failing to read is the same as different
        return true;
    }
}

// workaround the fact that nopt.clean doesn't return the object passed in :P

function cleanOptions(data, types) {
    nopt.clean(data, types);
    return data;
}

// error handler for output stream that swallows errors silently,
// allowing the loop to continue over unwritable files.

function onOutputError(err) {
    if (err.code === 'EACCES') {
        console.error(err.path + " is not writable. Skipping!");
    } else {
        console.error(err);
        process.exit(0);
    }
}

// turn "--foo_bar" into "foo-bar"

function dasherizeFlag(str) {
    return str.replace(/^\-+/, '').replace(/_/g, '-');
}

// translate weird python underscored keys into dashed argv,
// avoiding single character aliases.

function dasherizeShorthands(hash) {
    // operate in-place
    Object.keys(hash).forEach(function(key) {
        // each key value is an array
        var val = hash[key][0];
        // only dasherize one-character shorthands
        if (key.length === 1 && val.indexOf('_') > -1) {
            hash[dasherizeFlag(val)] = val;
        }
    });

    return hash;
}

function getOutputType(outfile, filepath, configType) {
    if (outfile && /\.(js|css|html)$/.test(outfile)) {
        return outfile.split('.').pop();
    } else if (filepath !== '-' && /\.(js|css|html)$/.test(filepath)) {
        return filepath.split('.').pop();
    } else if (configType) {
        return configType;
    } else {
        throw 'Could not determine appropriate beautifier from file paths: ' + filepath;
    }
}

function getScriptName() {
    return path.basename(process.argv[1]);
}

function checkType(parsed) {
    var scriptType = getScriptName().split('-').shift();
    if (!/^(js|css|html)$/.test(scriptType)) {
        scriptType = null;
    }

    debug("executable type:", scriptType);

    var parsedType = parsed.type;
    debug("parsed type:", parsedType);

    if (!parsedType) {
        debug("type defaulted:", scriptType);
        parsed.type = scriptType;
    }
}

function checkFiles(parsed) {
    var argv = parsed.argv;
    var isTTY = true;
    var file_params = parsed.files || [];
    var hadGlob = false;

    try {
        isTTY = process.stdin.isTTY;
    } catch (ex) {
        debug("error querying for isTTY:", ex);
    }

    debug('isTTY: ' + isTTY);

    // assume any remaining args are files
    file_params = file_params.concat(argv.remain);

    parsed.files = [];
    // assume any remaining args are files
    file_params.forEach(function(f) {
        // strip stdin path eagerly added by nopt in '-f -' case
        if (f === '-') {
            return;
        }

        var foundFiles = [];
        var isGlob = glob.hasMagic(f);

        // Input was a glob
        if (isGlob) {
            hadGlob = true;
            foundFiles = glob(f, {
                sync: true,
                absolute: true,
                ignore: ['**/node_modules/**', '**/.git/**']
            });
        } else {
            // Input was not a glob, add it to an array so we are able to handle it in the same loop below
            try {
                testFilePath(f);
            } catch (err) {
                // if file is not found, and the resolved path indicates stdin marker
                if (path.parse(f).base === '-') {
                    f = '-';
                } else {
                    throw err;
                }
            }
            foundFiles = [f];
        }

        if (foundFiles && foundFiles.length) {
            // Add files to the parsed.files if it didn't exist in the array yet
            foundFiles.forEach(function(file) {
                var filePath = path.resolve(file);
                if (file === '-') { // case of stdin
                    parsed.files.push(file);
                } else if (parsed.files.indexOf(filePath) === -1) {
                    parsed.files.push(filePath);
                }
            });
        }
    });

    if ('string' === typeof parsed.outfile && isTTY && !parsed.files.length) {
        testFilePath(parsed.outfile);
        // use outfile as input when no other files passed in args
        parsed.files.push(parsed.outfile);
        // operation is now an implicit overwrite
        parsed.replace = true;
    }

    if (hadGlob || parsed.files.length > 1) {
        parsed.replace = true;
    }

    if (!parsed.files.length && !hadGlob) {
        // read stdin by default
        parsed.files.push('-');
    }

    debug('files.length ' + parsed.files.length);

    if (parsed.files.indexOf('-') > -1 && isTTY && !hadGlob) {
        throw 'Must pipe input or define at least one file.';
    }

    return parsed;
}

function testFilePath(filepath) {
    try {
        if (filepath !== "-") {
            fs.statSync(filepath);
        }
    } catch (err) {
        throw 'Unable to open path "' + filepath + '"';
    }
}

function logToStdout(str, config) {
    if (typeof config.quiet === "undefined" || !config.quiet) {
        console.log(str);
    }
}