#!/usr/bin/env node

// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const readfiles = require('node-readfiles');
const should = require('should/as-function');
const yaml = require('yaml');

const validator = require('oas-validator');
const common = require('oas-kit-common');
const clone = require('reftools/lib/clone.js').circularClone;
const reref = require('reftools/lib/reref.js').reref;

const swagger2openapi = require('./index.js');

let globalExpectFailure = false;

const baseName = path.basename(process.argv[1]);

const yargs = require('yargs');
let argv = yargs
    .usage(baseName+' [options] {path-to-docs}...')
    .boolean('anchors')
    .describe('anchors','allow use of YAML anchors/aliases')
    .string('encoding')
    .alias('e', 'encoding')
    .default('encoding', 'utf8')
    .describe('encoding', 'encoding for input/output files')
    .string('fail')
    .describe('fail', 'path to docs expected to fail')
    .alias('f', 'fail')
    .string('jsonschema')
    .alias('j', 'jsonschema')
    .describe('jsonschema', 'path to alternative JSON schema')
    .boolean('laxurls')
    .alias('l', 'laxurls')
    .describe('laxurls', 'lax checking of empty urls')
    .boolean('laxDefaults')
    .describe('laxDefaults', 'lax checking of default types')
    .boolean('mediatype')
    .alias('m','mediatype')
    .describe('mediatype','check media-types against RFC pattern')
    .boolean('lint')
    .describe('lint','lint the definition')
    .boolean('nopatch')
    .alias('n', 'nopatch')
    .describe('nopatch', 'do not patch minor errors in the source definition')
    .string('output')
    .alias('o', 'output')
    .describe('output', 'output conversion result')
    .boolean('quiet')
    .alias('q', 'quiet')
    .describe('quiet', 'do not show test passes on console, for CI')
    .boolean('resolve')
    .alias('r', 'resolve')
    .describe('resolve', 'resolve external references')
    .boolean('stop')
    .alias('s', 'stop')
    .describe('stop', 'stop on first error')
    .string('validateSchema')
    .describe('validateSchema','Run schema validation step: first, last* or never')
    .count('verbose')
    .alias('v', 'verbose')
    .describe('verbose', 'increase verbosity')
    .boolean('warnOnly')
    .describe('warnOnly','Do not throw on non-patchable errors')
    .boolean('whatwg')
    .default('whatwg',true)
    .alias('w', 'whatwg')
    .describe('whatwg', 'enable WHATWG URL parsing')
    .boolean('yaml')
    .default('yaml', true)
    .alias('y', 'yaml')
    .describe('yaml', 'skip YAML-safe test')
    .help('h')
    .alias('h', 'help')
    .strict()
    .demand(1)
    .version()
    .argv;

let pass = 0;
let fail = 0;
let failures = [];
let warnings = [];

let options = argv;
options.patch = !argv.nopatch;
options.fatal = true;
if (options.verbose) Error.stackTraceLimit = Infinity;

function finalise(err, options) {
    if (!argv.quiet || err) {
        console.warn(common.colour.normal + options.file);
    }
    if (err) {
        console.warn(common.colour.red + options.context.pop() + '\n' + err.message);
        if (err.name.indexOf('ERR_INVALID_URL')>=0) {
            // nop
        }
        else if (err.message.indexOf('schema validation')>=0) {
            if (options.validateSchema !== 'first') {
                warnings.push('Schema fallback '+options.file);
            }
        }
        else if (err.stack && err.name !== 'AssertionError') {
            console.warn(err.stack);
            warnings.push(err.name+' '+options.file);
        }
        if (options.lintRule && options.lintRule.description !== err.message) {
            console.warn(options.lintRule.description);
        }
        options.valid = (!!options.expectFailure || options.allowFailure);
    }
    if (options.warnings) {
        for (let warning of options.warnings) {
            warnings.push(options.file + ' ' + warning.message + (warning.pointer ? ' @ '+warning.pointer : ''));
        }
    }

    let src = options.original;
    let result = options.valid;

    if (!argv.quiet) {
        let colour = ((options.expectFailure ? !result : result) ? common.colour.green : common.colour.red);
        if (src && src.info) {
            console.warn(colour + '  %s %s', src.info.title, src.info.version);
            if (src["x-testcase"]) console.warn(' ',src["x-testcase"]);
            console.warn('  %s', src.swagger ? (src.host ? src.host : 'relative') : (src.servers && src.servers.length ? src.servers[0].url : 'relative'),common.colour.normal);
        }
    }
    if (result) {
        pass++;
        if ((options.file.indexOf('swagger.yaml') >= 0) && argv.output) {
            let outFile = options.file.replace('swagger.yaml', argv.output);
            let resultStr = yaml.stringify(options.openapi);
            fs.writeFileSync(outFile, resultStr, argv.encoding);
        }
    }
    else {
        fail++;
        if (options.file != 'unknown') failures.push(options.file);
        if (argv.stop) process.exit(1);
    }
}

function handleResult(err, options) {
    let result = false;
    if (err) {
        options = err.options || { file: 'unknown', src: { info: { version: '', title: '' } } }; // src is just enough to provide dummy outputs
        options.context = [];
        options.warnings = [];
        options.expectFailure = globalExpectFailure;
        finalise(err,options);
    }
    else {
        result = options.openapi;
    }
    let resultStr = yaml.stringify(result);

    if (typeof result !== 'boolean') try {
        if (!options.yaml) {
            try {
                resultStr = yaml.stringify(result); // should be representable safely in yaml
                //let resultStr2 = yaml.stringify(result); // FIXME dropped 'noRefs:true' here
                should(resultStr).not.be.exactly('{}','Result should not be empty');
                //should(resultStr).equal(resultStr2,'Result should have no object identity ref_s');
            }
            catch (ex) {
                if (options.debug) {
                    fs.writeFileSync('./debug.yaml',resultStr,'utf8');
                    console.warn('Result dumped to debug.yaml fixed.yaml');
                    let fix = reref(result);
                    fs.writeFileSync('./fixed.yaml',yaml.stringify(fix),'utf8');
                }
                should.fail(false,true,'Result cannot be represented safely in YAML');
            }
        }

        validator.validate(result, options)
        .then(function(options){
            finalise(null,options);
        })
        .catch(function(ex){
            finalise(ex,options);
        });
    }
    catch (ex) {
        console.warn(common.colour.normal + options.file);
        console.warn(common.colour.red + (options.context.length ? options.context.pop() : 'No context')+ '\n' + ex.message);
        if (ex.stack && ex.name !== 'AssertionError') {
            console.warn(ex.stack);
        }
        options.valid = !options.expectFailure;
        finalise(ex, options);
    }
}

async function check(file, force, expectFailure) {
    let result = false;
    options.context = [];
    options.expectFailure = expectFailure;
    options.file = file;
    let components = file.split(path.sep);
    let name = components[components.length - 1];
    let src;

    if ((name.indexOf('.yaml') >= 0) || (name.indexOf('.yml') >= 0) || (name.indexOf('.json') >= 0) || force) {

        let srcStr;
        if (!file.startsWith('http')) {
            srcStr = fs.readFileSync(path.resolve(file), options.encoding);
            try {
                src = JSON.parse(srcStr);
            }
            catch (ex) {
                try {
                    src = yaml.parse(srcStr, { schema: 'core', prettyErrors: true });
                }
                catch (ex) {
                    let warning = 'Could not parse file ' + file + '\n' + ex.message;
                    console.warn(common.colour.red + warning);
                    if (ex.stack && ex.message.indexOf('stack')>=0) {
                        console.warn(ex.stack);
                    }
                    warnings.push(warning);
                }
            }

            if (!src || ((!src.swagger && !src.openapi))) {
                return true;
            }
        }

        options.original = src;
        options.source = file;
        options.text = srcStr;
        options.expectFailure = false;
        options.allowFailure = false;

        if ((options.source.indexOf('!')>=0) && (options.source.indexOf('swagger.')>=0)) {
            expectFailure = true;
            options.expectFailure = true;
            options.allowFailure = true;
        }
        if ((options.source.indexOf('!')>=0) && (options.source.indexOf('openapi.')>=0)) {
            expectFailure = true;
            options.expectFailure = false; // because some things are corrected
            options.allowFailure = true;
        }

        if (file.startsWith('http')) {
            swagger2openapi.convertUrl(file, clone(options))
            .then(function(options){
                handleResult(null,options);
            })
            .catch(function(ex){
                console.warn(common.colour.red+ex,common.colour.normal);
                if (expectFailure) {
                    warnings.push('Converter failed ' + options.source);
                }
                else {
                    failures.push('Converter failed ' + options.source);
                    fail++;
                }
                result = false;
            });
        }
        else {
            swagger2openapi.convertObj(src, clone(options))
            .then(function(options){
                handleResult(null,options);
            })
            .catch(function(ex){
                console.warn(common.colour.red+ex,common.colour.normal);
                console.warn(ex.stack);
                if (expectFailure) {
                    warnings.push('Converter failed ' + options.source);
                }
                else {
                    failures.push('Converter failed ' + options.source);
                    fail++;
                }
                result = false;
            });
        }
    }
    else {
        result = true;
    }
    return result;
}

async function processPathSpec(pathspec, expectFailure) {
    globalExpectFailure = expectFailure;
    if (pathspec.startsWith('@')) {
        pathspec = pathspec.substr(1, pathspec.length - 1);
        let list = fs.readFileSync(pathspec, 'utf8').split('\r').join('').split('\n');
        for (let file of list) {
            await check(file, false, expectFailure);
        }
    }
    else if (pathspec.startsWith('http')) {
        await check(pathspec, true, expectFailure);
    }
    else if (fs.statSync(path.resolve(pathspec)).isFile()) {
        await check(pathspec, true, expectFailure);
    }
    else {
        readfiles(pathspec, { readContents: false, filenameFormat: readfiles.FULL_PATH }, function (err) {
            if (err) console.warn(yaml.stringify(err));
        })
        .then(async function(files) {
            files = files.sort();
            for (let file of files) {
                await check(file, false, expectFailure);
            }
        })
        .catch(err => {
            handleResult(err,options);
        });
    }
}

async function main() {
  process.exitCode = 1;
  console.warn('Gathering...');
  for (let pathspec of argv._) {
    await processPathSpec(pathspec, false);
  }
  if (argv.fail) {
    if (!Array.isArray(argv.fail)) argv.fail = [argv.fail];
    for (let pathspec of argv.fail) {
      await processPathSpec(pathspec, true);
    }
  }
}

main();

process.on('unhandledRejection', r => console.warn('UPR',r));

process.on('exit', function () {
    if (warnings.length) {
        warnings.sort();
        console.warn(common.colour.normal + '\nWarnings:' + common.colour.yellow);
        for (let w in warnings) {
            console.warn(warnings[w]);
        }
    }
    if (failures.length) {
        failures.sort();
        console.warn(common.colour.normal + '\nFailures:' + common.colour.red);
        for (let f in failures) {
            console.warn(failures[f]);
        }
    }
    console.warn(common.colour.normal);
    console.warn('Tests: %s passing, %s failing, %s warnings', pass, fail, warnings.length);
    process.exitCode = ((fail === 0 || options.fail) && (pass > 0)) ? 0 : 1;
});
