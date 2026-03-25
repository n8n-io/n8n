
/**
 * yaml2json cli program
 */
 
var YAML = require('../lib/Yaml.js');

var ArgumentParser = require('argparse').ArgumentParser;
var cli = new ArgumentParser({
    prog:           "yaml2json", 
    version:        require('../package.json').version,
    addHelp:        true
});

cli.addArgument(
    ['-p', '--pretty'],
    {
        help:   'Output pretty (indented) JSON.',
        action: 'storeTrue'
    }
);

cli.addArgument(
    ['-i', '--indentation'],
    {
        action: 'store',
        type:   'int', 
        help:   'Number of space characters used to indent code (use with --pretty, default: 2).',
    }
);

cli.addArgument(
    ['-s', '--save'],
    {
        help:   'Save output inside JSON file(s) with the same name.',
        action: 'storeTrue'
    }
);

cli.addArgument(
    ['-r', '--recursive'],
    {
        help:   'If the input is a directory, also find YAML files in sub-directories recursively.',
        action: 'storeTrue'
    }
);

cli.addArgument(
    ['-w', '--watch'],
    {
        help:   'Watch for changes.',
        action: 'storeTrue'
    }
);

cli.addArgument(['input'], {
    help:   'YAML file or directory containing YAML files or - to read YAML from stdin.'
});

try {
    var options = cli.parseArgs();
    var path = require('path');
    var fs   = require('fs');
    var glob = require('glob');
    
    var rootPath = process.cwd();
    var parsePath = function(input) {
        if (input == '-') return '-';
        var output;
        if (!(input != null)) {
            return rootPath;
        }
        output = path.normalize(input);
        if (output.length === 0) {
            return rootPath;
        }
        if (output.charAt(0) !== '/') {
            output = path.normalize(rootPath + '/./' + output);
        }
        if (output.length > 1 && output.charAt(output.length - 1) === '/') {
            return output.substr(0, output.length - 1);
        }
        return output;
    };

    // Find files
    var findFiles = function(input) {
        if (input != '-' && input != null) {
            var isDirectory = fs.statSync(input).isDirectory();
            var files = [];

            if (!isDirectory) {
                files.push(input);
            }
            else {
                if (options.recursive) {
                    files = files.concat(glob.sync(input+'/**/*.yml'));
                    files = files.concat(glob.sync(input+'/**/*.yaml'));
                }
                else {
                    files = files.concat(glob.sync(input+'/*.yml'));
                    files = files.concat(glob.sync(input+'/*.yaml'));
                }
            }
        
            return files;
        }
        return null;
    };

    // Convert to JSON
    var convertToJSON = function(input, pretty, save, spaces, str) {
        var json;
        if (spaces == null) spaces = 2;
        if (str != null) {
            if (pretty) {
                json = JSON.stringify(YAML.parse(str), null, spaces);
            }
            else {
                json = JSON.stringify(YAML.parse(str));
            }
        } else {
            if (pretty) {
                json = JSON.stringify(YAML.parseFile(input), null, spaces);
            }
            else {
                json = JSON.stringify(YAML.parseFile(input));
            }
        }
    
        if (!save || input == null) {
            // Ouput result
            process.stdout.write(json+"\n");
        }
        else {
            var output;
            if (input.substring(input.length-4) == '.yml') {
                output = input.substr(0, input.length-4) + '.json';
            }
            else if (input.substring(input.length-5) == '.yaml') {
                output = input.substr(0, input.length-5) + '.json';
            }
            else {
                output = input + '.json';
            }
        
            // Write file
            var file = fs.openSync(output, 'w+');
            fs.writeSync(file, json);
            fs.closeSync(file);
            process.stdout.write("saved "+output+"\n");
        }
    };

    var input = parsePath(options.input);
    var mtimes = [];

    var runCommand = function() {
        try {
            var files = findFiles(input);
            if (files != null) {
                var len = files.length;

                for (var i = 0; i < len; i++) {
                    var file = files[i];
                    var stat = fs.statSync(file);
                    var time = stat.mtime.getTime();
                    if (!stat.isDirectory()) {
                        if (!mtimes[file] || mtimes[file] < time) {
                            mtimes[file] = time;
                            convertToJSON(file, options.pretty, options.save, options.indentation);
                        }
                    }
                }
            } else {
                // Read from STDIN
                var stdin = process.openStdin();
                var data = "";
                stdin.on('data', function(chunk) {
                    data += chunk;
                });
                stdin.on('end', function() {
                    convertToJSON(null, options.pretty, options.save, options.indentation, data);
                });
            }
        } catch (e) {
            process.stderr.write((e.message ? e.message : e)+"\n");
        }
    };

    if (!options.watch) {
        runCommand();
    } else {
        runCommand();
        setInterval(runCommand, 1000);
    } 
} catch (e) {
    process.stderr.write((e.message ? e.message : e)+"\n");
}
