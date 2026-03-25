'use strict';

var { program } = require('commander');
var pkg = require('../package');

var cli = {};

module.exports = cli;

cli.getProgram = function() {
  program.name = pkg.name;

  program.version(pkg.version)
    .usage('[options] input.html output.html');

  Object.keys(cli.options).forEach(function(key) {
    program.option('--' + key + ' [value]', cli.options[key].def);
  });

  program.parse(process.argv);

  return program;
};

cli.options = {
  'css': {
    pMap: 'css',
    map: 'cssFile',
    def: 'Add an extra CSS file by name' },
  'options-file': {
    pMap: 'optionsFile',
    def: 'Load options from a JSON file' },
  'extra-css': {
    pMap: 'extraCss',
    def: 'Add extra CSS' },
  'insert-preserved-extra-css': {
    pMap: 'insertPreservedExtraCss',
    def: 'insert preserved @font-face and @media into document?',
    coercion: JSON.parse },
  'apply-style-tags': {
    pMap: 'applyStyleTags',
    def: 'inline from style tags?',
    coercion: JSON.parse },
  'remove-style-tags': {
    pMap: 'removeStyleTags',
    def: 'remove style tags?',
    coercion: JSON.parse },
  'preserve-important': {
    pMap: 'preserveImportant',
    def: 'preserve important?',
    coercion: JSON.parse },
  'preserve-media-queries': {
    pMap: 'preserveMediaQueries',
    def: 'preserve media queries?',
    coercion: JSON.parse },
  'preserve-font-faces': {
    pMap: 'preserveFontFaces',
    def: 'preserve font faces?',
    coercion: JSON.parse },
  'preserve-key-frames': {
    pMap: 'preserveKeyFrames',
    def: 'preserve key frames?',
    coercion: JSON.parse },
  'preserve-pseudos': {
    pMap: 'preservePseudos',
    def: 'preserve pseudo selectors?',
    coercion: JSON.parse },
  'apply-width-attributes': {
    pMap: 'applyWidthAttributes',
    def: 'apply width attributes to relevent elements?',
    coercion: JSON.parse },
  'apply-height-attributes': {
    pMap: 'applyHeightAttributes',
    def: 'apply height attributes to relevent elements?',
    coercion: JSON.parse },
  'apply-attributes-table-elements': {
    pMap: 'applyAttributesTableElements',
    def: 'apply attributes with and equivalent CSS value to table elements?',
    coercion: JSON.parse },
  'xml-mode': {
    pMap: 'xmlMode',
    def: 'generate output with tags closed?  input must be valid XML',
    coercion: JSON.parse },
  'resolve-css-variables': {
    pMap: 'resolveCSSVariables',
    def: 'resolve CSS variables',
    coercion: JSON.parse },
  'web-resources-inline-attribute': {
    pMap: 'webResourcesInlineAttribute',
    map: 'inlineAttribute',
    def: 'see docs for web-resource-inliner inlineAttribute',
    coercion: JSON.parse },
  'web-resources-images': {
    pMap: 'webResourcesImages',
    map: 'images',
    def: 'see docs for web-resource-inliner images',
    coercion: JSON.parse },
  'web-resources-links': {
    pMap: 'webResourcesLinks',
    map: 'links',
    def: 'see docs for web-resource-inliner links',
    coercion: JSON.parse },
  'web-resources-scripts': {
    pMap: 'webResourcesScripts',
    map: 'scripts',
    def: 'see docs for web-resource-inliner scripts',
    coercion: JSON.parse },
  'web-resources-relative-to': {
    pMap: 'webResourcesRelativeTo',
    map: 'relativeTo',
    def: 'see docs for web-resource-inliner relativeTo' },
  'web-resources-rebase-relative-to': {
    pMap: 'webResourcesRebaseRelativeTo',
    map: 'rebaseRelativeTo',
    def: 'see docs for web-resource-inliner rebaseRelativeTo' },
  'web-resources-strict': {
    pMap: 'webResourcesStrict',
    map: 'strict',
    def: 'see docs for web-resource-inliner strict',
    coercion: JSON.parse }
};

cli.argsToOptions = function(program) {
  var result = { webResources: {} };
  Object.keys(cli.options).forEach(function(key) {
    var option = cli.options[key];
    var value = program[option.pMap];
    if (value !== undefined) {
      if (option.coercion) {
        value = option.coercion(value);
      }

      if (option.pMap.match(/webResources/)) {
        result.webResources[option.map] = value;
      } else {
        result[option.map || option.pMap] = value;
      }
    }
  });

  return result;
};
