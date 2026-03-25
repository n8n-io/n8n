"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _omit2 = _interopRequireDefault(require("lodash/omit"));
var _get2 = _interopRequireDefault(require("lodash/get"));
var _map2 = _interopRequireDefault(require("lodash/map"));
var _isEmpty2 = _interopRequireDefault(require("lodash/isEmpty"));
var _isArray2 = _interopRequireDefault(require("lodash/isArray"));
var _pickBy2 = _interopRequireDefault(require("lodash/fp/pickBy"));
var _negate2 = _interopRequireDefault(require("lodash/fp/negate"));
var _isNil2 = _interopRequireDefault(require("lodash/fp/isNil"));
var _pick2 = _interopRequireDefault(require("lodash/fp/pick"));
var _flow2 = _interopRequireDefault(require("lodash/fp/flow"));
var _path = _interopRequireDefault(require("path"));
var _yargs = _interopRequireDefault(require("yargs"));
var _jsBeautify = require("js-beautify");
var _htmlMinifier = require("html-minifier");
var _mjmlCore = _interopRequireWildcard(require("mjml-core"));
var _mjmlMigrate = _interopRequireDefault(require("mjml-migrate"));
var _mjmlValidator = _interopRequireWildcard(require("mjml-validator"));
var _mjmlParserXml = _interopRequireDefault(require("mjml-parser-xml"));
var _package = require("mjml-core/package.json");
var _readFile = _interopRequireWildcard(require("./commands/readFile"));
var _watchFiles = _interopRequireDefault(require("./commands/watchFiles"));
var _readStream = _interopRequireDefault(require("./commands/readStream"));
var _outputToFile = _interopRequireWildcard(require("./commands/outputToFile"));
var _outputToConsole = _interopRequireDefault(require("./commands/outputToConsole"));
var _package2 = require("../package.json");
var _defaultOptions = _interopRequireDefault(require("./helpers/defaultOptions"));
const beautifyConfig = {
  indent_size: 2,
  wrap_attributes_indent_size: 2,
  max_preserve_newline: 0,
  preserve_newlines: false,
  end_with_newline: true
};
const minifyConfig = {
  collapseWhitespace: true,
  minifyCSS: false,
  caseSensitive: true,
  removeEmptyAttributes: true
};
var _default = async () => {
  let EXIT_CODE = 0;
  let KEEP_OPEN = false;
  const error = msg => {
    console.error('\nCommand line error:'); // eslint-disable-line no-console
    console.error(msg); // eslint-disable-line no-console

    process.exit(1);
  };
  const pickArgs = args => (0, _flow2.default)((0, _pick2.default)(args), (0, _pickBy2.default)(e => (0, _negate2.default)(_isNil2.default)(e) && !((0, _isArray2.default)(e) && (0, _isEmpty2.default)(e))));
  const {
    argv
  } = _yargs.default.version(false) // cf. https://github.com/yargs/yargs/issues/961
  .options({
    r: {
      alias: 'read',
      describe: 'Compile MJML File(s)',
      type: 'array'
    },
    m: {
      alias: 'migrate',
      describe: 'Migrate MJML3 File(s) (deprecated)',
      type: 'array'
    },
    v: {
      alias: 'validate',
      describe: 'Run validator on File(s)',
      type: 'array'
    },
    w: {
      alias: 'watch',
      type: 'array',
      describe: 'Watch and compile MJML File(s) when modified'
    },
    i: {
      alias: 'stdin',
      describe: 'Compiles MJML from input stream'
    },
    s: {
      alias: 'stdout',
      describe: 'Output HTML to stdout'
    },
    o: {
      alias: 'output',
      type: 'string',
      describe: 'Filename/Directory to output compiled files'
    },
    c: {
      alias: 'config',
      type: 'object',
      describe: 'Option to pass to mjml-core'
    },
    version: {
      alias: 'V'
    },
    noStdoutFileComment: {
      type: 'boolean',
      describe: 'Add no file comment to stdout'
    }
  }).help().version(`mjml-core: ${_package.version}\nmjml-cli: ${_package2.version}`);
  let juiceOptions;
  let minifyOptions;
  let juicePreserveTags;
  let fonts;
  try {
    juiceOptions = argv.c && argv.c.juiceOptions && JSON.parse(argv.c.juiceOptions);
  } catch (e) {
    error(`Failed to decode JSON for config.juiceOptions argument`);
  }
  try {
    minifyOptions = argv.c && argv.c.minifyOptions && JSON.parse(argv.c.minifyOptions);
  } catch (e) {
    error(`Failed to decode JSON for config.minifyOptions argument`);
  }
  try {
    juicePreserveTags = argv.c && argv.c.juicePreserveTags && JSON.parse(argv.c.juicePreserveTags);
  } catch (e) {
    error(`Failed to decode JSON for config.juicePreserveTags argument`);
  }
  try {
    fonts = argv.c && argv.c.fonts && JSON.parse(argv.c.fonts);
  } catch (e) {
    error(`Failed to decode JSON for config.fonts argument`);
  }
  const filePath = argv.c && argv.c.filePath;
  const config = Object.assign(_defaultOptions.default, argv.c, fonts && {
    fonts
  }, minifyOptions && {
    minifyOptions
  }, juiceOptions && {
    juiceOptions
  }, juicePreserveTags && {
    juicePreserveTags
  }, argv.c && argv.c.keepComments === 'false' && {
    keepComments: false
  });
  const inputArgs = pickArgs(['r', 'w', 'i', '_', 'm', 'v'])(argv);
  const outputArgs = pickArgs(['o', 's'])(argv)

  // implies (until yargs pr is accepted)
  ;
  [[Object.keys(inputArgs).length === 0, 'No input argument received'], [Object.keys(inputArgs).length > 1, 'Too many input arguments received'], [Object.keys(outputArgs).length > 1, 'Too many output arguments received'], [argv.w && argv.w.length > 1 && !argv.o, 'Need an output option when watching files'], [argv.w && argv.w.length > 1 && argv.o && !(0, _outputToFile.isDirectory)(argv.o) && argv.o !== '', 'Need an output option when watching files']].forEach(v => v[0] ? error(v[1]) : null);
  const inputOpt = Object.keys(inputArgs)[0];
  const outputOpt = Object.keys(outputArgs)[0] || 's';
  const inputFiles = (0, _isArray2.default)(inputArgs[inputOpt]) ? inputArgs[inputOpt] : [inputArgs[inputOpt]];
  const inputs = [];
  switch (inputOpt) {
    case 'r':
    case 'v':
    case 'm':
    case '_':
      {
        (0, _readFile.flatMapPaths)(inputFiles).forEach(file => {
          inputs.push((0, _readFile.default)(file));
        });
        if (!inputs.length) {
          error('No input files found');
          return;
        }
        break;
      }
    case 'w':
      (0, _watchFiles.default)(inputFiles, {
        ...argv,
        config,
        minifyConfig,
        beautifyConfig
      });
      KEEP_OPEN = true;
      break;
    case 'i':
      inputs.push(await (0, _readStream.default)());
      break;
    default:
      error('Command line error: Incorrect input options');
  }
  const convertedStream = [];
  const failedStream = [];
  inputs.forEach(i => {
    try {
      let compiled;
      switch (inputOpt) {
        case 'm':
          compiled = {
            html: (0, _mjmlMigrate.default)(i.mjml, {
              beautify: true
            })
          };
          break;
        case 'v':
          // eslint-disable-next-line no-case-declarations
          const mjmlJson = (0, _mjmlParserXml.default)(i.mjml, {
            components: _mjmlCore.components,
            filePath: filePath || i.file,
            actualPath: i.file
          });
          compiled = {
            errors: (0, _mjmlValidator.default)(mjmlJson, {
              dependencies: _mjmlValidator.dependencies,
              components: _mjmlCore.components,
              initializeType: _mjmlCore.initializeType
            })
          };
          break;
        default:
          {
            const beautify = config.beautify && config.beautify !== 'false';
            const minify = config.minify && config.minify !== 'false';
            compiled = (0, _mjmlCore.default)(i.mjml, {
              ...(0, _omit2.default)(config, ['minify', 'beautify']),
              filePath: filePath || i.file,
              actualPath: i.file
            });
            if (beautify) {
              compiled.html = (0, _jsBeautify.html)(compiled.html, beautifyConfig);
            }
            if (minify) {
              compiled.html = (0, _htmlMinifier.minify)(compiled.html, {
                ...minifyConfig,
                ...config.minifyOptions
              });
            }
          }
      }
      convertedStream.push({
        ...i,
        compiled
      });
    } catch (e) {
      EXIT_CODE = 2;
      failedStream.push({
        file: i.file,
        error: e
      });
    }
  });
  convertedStream.forEach(s => {
    if ((0, _get2.default)(s, 'compiled.errors.length')) {
      console.error((0, _map2.default)(s.compiled.errors, 'formattedMessage').join('\n')); // eslint-disable-line no-console
    }
  });
  failedStream.forEach(({
    error,
    file
  }) => {
    console.error(`${file ? `File: ${file}\n` : null}${error}`); // eslint-disable-line no-console

    if (config.stack) {
      console.error(error.stack); // eslint-disable-line no-console
    }
  });
  if (inputOpt === 'v') {
    const isInvalid = failedStream.length || convertedStream.some(s => !!(0, _get2.default)(s, 'compiled.errors.length'));
    if (isInvalid) {
      error('Validation failed');
      return;
    }
    process.exitCode = 0;
    return;
  }
  if (!KEEP_OPEN && convertedStream.length === 0) {
    error('Input file(s) failed to render');
  }
  switch (outputOpt) {
    case 'o':
      {
        if (inputs.length > 1 && !(0, _outputToFile.isDirectory)(argv.o) && argv.o !== '') {
          error(`Multiple input files, but output option should be either an existing directory or an empty string: ${argv.o} given`);
        }
        const fullOutputPath = _path.default.parse(_path.default.resolve(process.cwd(), argv.o));
        if (inputs.length === 1 && !(0, _outputToFile.isDirectory)(fullOutputPath.dir)) {
          error(`Output directory doesn’t exist for path : ${argv.o}`);
        }
        Promise.all(convertedStream.map((0, _outputToFile.default)(argv.o))).then(() => {
          if (!KEEP_OPEN) {
            process.exitCode = EXIT_CODE;
          }
        }).catch(({
          outputName,
          err
        }) => {
          if (!KEEP_OPEN) {
            error(`Error writing file - ${outputName} : ${err}`);
          }
        });
        break;
      }
    case 's':
      {
        const addFileHeaderComment = !argv.noStdoutFileComment;
        Promise.all(convertedStream.map(converted => (0, _outputToConsole.default)(converted, addFileHeaderComment))).then(() => process.exitCode = EXIT_CODE) // eslint-disable-line no-return-assign
        .catch(() => process.exitCode = 1); // eslint-disable-line no-return-assign
        break;
      }
    default:
      error('Command line error: No output option available');
  }
};
exports.default = _default;
module.exports = exports.default;