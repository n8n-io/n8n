#!/usr/bin/env node
// @ts-check

'use strict';

const fs = require('fs');
const url = require('url');

const yaml = require('yaml');
const fetch = require('node-fetch');
const converter = require('./index.js');

// @ts-ignore
let argv = require('yargs')
    .boolean('anchors')
    .describe('anchors','allow use of YAML anchors/aliases')
    .boolean('components')
    .alias('c', 'components')
    .describe('components', 'output information to unresolve a definition')
    .boolean('debug')
    .alias('d', 'debug')
    .describe('debug', 'enable debug mode, adds specification-extensions')
    .string('encoding')
    .alias('e', 'encoding')
    .default('encoding', 'utf8')
    .describe('encoding', 'encoding for input/output files')
    .boolean('fatal')
    .alias('f','fatal')
    .describe('fatal','make resolution errors fatal')
    .help('help')
    .alias('h', 'help')
    .string('indent')
    .alias('i','indent')
    .describe('indent','JSON indent to use, defaults to 4 spaces')
    .string('outfile')
    .alias('o', 'outfile')
    .describe('outfile', 'the output file to write to')
    .boolean('patch')
    .alias('p', 'patch')
    .describe('patch', 'fix up small errors in the source definition')
    .choices('refSiblings',['remove','preserve','allOf'])
    .describe('refSiblings','mode to handle $ref\'s with sibling properties')
    .boolean('resolve')
    .alias('r', 'resolve')
    .describe('resolve', 'resolve external references')
    .boolean('resolveInternal')
    .describe('resolveInternal', 'resolve internal references also')
    .string('targetVersion')
    .alias('t','targetVersion')
    .describe('targetVersion','override default target version of 3.0.0')
    .string('url')
    .describe('url', 'url of original spec, creates x-origin entry')
    .alias('u', 'url')
    .count('verbose')
    .alias('v', 'verbose')
    .describe('verbose', 'increase verbosity')
    .boolean('warnOnly')
    .alias('w','warnOnly')
    .describe('warnOnly','Do not throw on non-patchable errors, add warning extensions')
    .string('warnProperty')
    .describe('warnProperty','Property name to use for warning extensions')
    .default('warnProperty','x-s2o-warning')
    .boolean('yaml')
    .alias('y', 'yaml')
    .describe('yaml', 'write YAML, default JSON (overridden by --outfile filepath extension)')
    .string('rbname')
    .alias('b', 'rbname')
    .default('rbname', '')
    .describe('rbname', 'Extension to use to preserve body parameter names in converted operations ("" == disabled)')
    .require(1)
    .strict()
    .version()
    .argv;

function processResult(err, options) {
    if (err) {
        delete err.options;
        console.warn(err);
        return process.exitCode = 1;
    }
    if (options.yaml && options.outfile && options.outfile.indexOf('.json') > 0) {
        options.yaml = false;
    }
    if (!options.yaml && options.outfile && options.outfile.indexOf('.yaml') > 0) {
        options.yaml = true;
    }

    let s;
    try {
        if (options.yaml) {
            s = yaml.stringify(options.openapi); // removed noRefs here
        }
        else {
            s = JSON.stringify(options.openapi, null, options.indent||4);
        }
    }
    catch (ex) {
        console.warn('The result cannot be represented safely in the chosen output format');
        s = '{}';
    }

    if (argv.outfile) {
        fs.writeFileSync(options.outfile, s, options.encoding || 'utf8');
    }
    else {
        console.log(s);
    }

    if (argv.components) {
        console.warn(JSON.stringify(options.externals, null, options.indent||4));
    }
}

argv.source = argv._[0];
argv.text = true;
argv.fetch = fetch;
let u = url.parse(argv.source);
if (u.protocol && u.protocol.startsWith('http')) {
    converter.convertUrl(argv.source, argv, processResult);
}
else {
    argv.origin = argv.url;
    converter.convertFile(argv.source, argv, processResult);
}

