'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.saveInlineSnapshots = saveInlineSnapshots;
var path = _interopRequireWildcard(require('path'));
var _util = require('util');
var fs = _interopRequireWildcard(require('graceful-fs'));
var _semver = _interopRequireDefault(require('semver'));
var _utils = require('./utils');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var jestWriteFile =
  globalThis[Symbol.for('jest-native-write-file')] || fs.writeFileSync;
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var jestReadFile =
  globalThis[Symbol.for('jest-native-read-file')] || fs.readFileSync;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// prettier-ignore
const generate = // @ts-expect-error requireOutside Babel transform
require(require.resolve('@babel/generator', {
  [(globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol).for('jest-resolve-outside-vm-option')]: true
})).default;
const {
  isAwaitExpression,
  templateElement,
  templateLiteral,
  traverse,
  traverseFast
} = require(require.resolve('@babel/types', { // @ts-expect-error requireOutside Babel transform
  [(globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol).for(
    'jest-resolve-outside-vm-option'
  )]: true
}));
// @ts-expect-error requireOutside Babel transform
const {parseSync} = require(require.resolve('@babel/core', {
  [(globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol).for(
    'jest-resolve-outside-vm-option'
  )]: true
}));
function saveInlineSnapshots(snapshots, rootDir, prettierPath) {
  let prettier = null;
  if (prettierPath) {
    try {
      // @ts-expect-error requireOutside Babel transform
      prettier = require(require.resolve(prettierPath, {
        [(globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol).for(
          'jest-resolve-outside-vm-option'
        )]: true
      }));
      if (_semver.default.gte(prettier.version, '3.0.0')) {
        throw new Error(
          'Jest: Inline Snapshots are not supported when using Prettier 3.0.0 or above.\nSee https://jestjs.io/docs/configuration/#prettierpath-string for alternatives.'
        );
      }
    } catch (error) {
      if (!_util.types.isNativeError(error)) {
        throw error;
      }
      if (error.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }
  const snapshotsByFile = groupSnapshotsByFile(snapshots);
  for (const sourceFilePath of Object.keys(snapshotsByFile)) {
    saveSnapshotsForFile(
      snapshotsByFile[sourceFilePath],
      sourceFilePath,
      rootDir,
      prettier && _semver.default.gte(prettier.version, '1.5.0')
        ? prettier
        : undefined
    );
  }
}
const saveSnapshotsForFile = (snapshots, sourceFilePath, rootDir, prettier) => {
  const sourceFile = jestReadFile(sourceFilePath, 'utf8');

  // TypeScript projects may not have a babel config; make sure they can be parsed anyway.
  const presets = [require.resolve('babel-preset-current-node-syntax')];
  const plugins = [];
  if (/\.([cm]?ts|tsx)$/.test(sourceFilePath)) {
    plugins.push([
      require.resolve('@babel/plugin-syntax-typescript'),
      {
        isTSX: sourceFilePath.endsWith('x')
      },
      // unique name to make sure Babel does not complain about a possible duplicate plugin.
      'TypeScript syntax plugin added by Jest snapshot'
    ]);
  }

  // Record the matcher names seen during traversal and pass them down one
  // by one to formatting parser.
  const snapshotMatcherNames = [];
  let ast = null;
  try {
    ast = parseSync(sourceFile, {
      filename: sourceFilePath,
      plugins,
      presets,
      root: rootDir
    });
  } catch (error) {
    // attempt to recover from missing jsx plugin
    if (error.message.includes('@babel/plugin-syntax-jsx')) {
      try {
        const jsxSyntaxPlugin = [
          require.resolve('@babel/plugin-syntax-jsx'),
          {},
          // unique name to make sure Babel does not complain about a possible duplicate plugin.
          'JSX syntax plugin added by Jest snapshot'
        ];
        ast = parseSync(sourceFile, {
          filename: sourceFilePath,
          plugins: [...plugins, jsxSyntaxPlugin],
          presets,
          root: rootDir
        });
      } catch {
        throw error;
      }
    } else {
      throw error;
    }
  }
  if (!ast) {
    throw new Error(`jest-snapshot: Failed to parse ${sourceFilePath}`);
  }
  traverseAst(snapshots, ast, snapshotMatcherNames);

  // substitute in the snapshots in reverse order, so slice calculations aren't thrown off.
  const sourceFileWithSnapshots = snapshots.reduceRight(
    (sourceSoFar, nextSnapshot) => {
      const {node} = nextSnapshot;
      if (
        !node ||
        typeof node.start !== 'number' ||
        typeof node.end !== 'number'
      ) {
        throw new Error('Jest: no snapshot insert location found');
      }

      // A hack to prevent unexpected line breaks in the generated code
      node.loc.end.line = node.loc.start.line;
      return (
        sourceSoFar.slice(0, node.start) +
        generate(node, {
          retainLines: true
        }).code.trim() +
        sourceSoFar.slice(node.end)
      );
    },
    sourceFile
  );
  const newSourceFile = prettier
    ? runPrettier(
        prettier,
        sourceFilePath,
        sourceFileWithSnapshots,
        snapshotMatcherNames
      )
    : sourceFileWithSnapshots;
  if (newSourceFile !== sourceFile) {
    jestWriteFile(sourceFilePath, newSourceFile);
  }
};
const groupSnapshotsBy = createKey => snapshots =>
  snapshots.reduce((object, inlineSnapshot) => {
    const key = createKey(inlineSnapshot);
    return {
      ...object,
      [key]: (object[key] || []).concat(inlineSnapshot)
    };
  }, {});
const groupSnapshotsByFrame = groupSnapshotsBy(({frame: {line, column}}) =>
  typeof line === 'number' && typeof column === 'number'
    ? `${line}:${column - 1}`
    : ''
);
const groupSnapshotsByFile = groupSnapshotsBy(({frame: {file}}) => file);
const indent = (snapshot, numIndents, indentation) => {
  const lines = snapshot.split('\n');
  // Prevent re-indentation of inline snapshots.
  if (
    lines.length >= 2 &&
    lines[1].startsWith(indentation.repeat(numIndents + 1))
  ) {
    return snapshot;
  }
  return lines
    .map((line, index) => {
      if (index === 0) {
        // First line is either a 1-line snapshot or a blank line.
        return line;
      } else if (index !== lines.length - 1) {
        // Do not indent empty lines.
        if (line === '') {
          return line;
        }

        // Not last line, indent one level deeper than expect call.
        return indentation.repeat(numIndents + 1) + line;
      } else {
        // The last line should be placed on the same level as the expect call.
        return indentation.repeat(numIndents) + line;
      }
    })
    .join('\n');
};
const traverseAst = (snapshots, ast, snapshotMatcherNames) => {
  const groupedSnapshots = groupSnapshotsByFrame(snapshots);
  const remainingSnapshots = new Set(snapshots.map(({snapshot}) => snapshot));
  traverseFast(ast, node => {
    if (node.type !== 'CallExpression') return;
    const {arguments: args, callee} = node;
    if (
      callee.type !== 'MemberExpression' ||
      callee.property.type !== 'Identifier' ||
      callee.property.loc == null
    ) {
      return;
    }
    const {line, column} = callee.property.loc.start;
    const snapshotsForFrame = groupedSnapshots[`${line}:${column}`];
    if (!snapshotsForFrame) {
      return;
    }
    if (snapshotsForFrame.length > 1) {
      throw new Error(
        'Jest: Multiple inline snapshots for the same call are not supported.'
      );
    }
    const inlineSnapshot = snapshotsForFrame[0];
    inlineSnapshot.node = node;
    snapshotMatcherNames.push(callee.property.name);
    const snapshotIndex = args.findIndex(
      ({type}) => type === 'TemplateLiteral' || type === 'StringLiteral'
    );
    const {snapshot} = inlineSnapshot;
    remainingSnapshots.delete(snapshot);
    const replacementNode = templateLiteral(
      [
        templateElement({
          raw: (0, _utils.escapeBacktickString)(snapshot)
        })
      ],
      []
    );
    if (snapshotIndex > -1) {
      args[snapshotIndex] = replacementNode;
    } else {
      args.push(replacementNode);
    }
  });
  if (remainingSnapshots.size) {
    throw new Error("Jest: Couldn't locate all inline snapshots.");
  }
};
const runPrettier = (
  prettier,
  sourceFilePath,
  sourceFileWithSnapshots,
  snapshotMatcherNames
) => {
  // Resolve project configuration.
  // For older versions of Prettier, do not load configuration.
  const config = prettier.resolveConfig
    ? prettier.resolveConfig.sync(sourceFilePath, {
        editorconfig: true
      })
    : null;

  // Prioritize parser found in the project config.
  // If not found detect the parser for the test file.
  // For older versions of Prettier, fallback to a simple parser detection.
  // @ts-expect-error - `inferredParser` is `string`
  const inferredParser =
    (config && typeof config.parser === 'string' && config.parser) ||
    (prettier.getFileInfo
      ? prettier.getFileInfo.sync(sourceFilePath).inferredParser
      : simpleDetectParser(sourceFilePath));
  if (!inferredParser) {
    throw new Error(
      `Could not infer Prettier parser for file ${sourceFilePath}`
    );
  }

  // Snapshots have now been inserted. Run prettier to make sure that the code is
  // formatted, except snapshot indentation. Snapshots cannot be formatted until
  // after the initial format because we don't know where the call expression
  // will be placed (specifically its indentation), so we have to do two
  // prettier.format calls back-to-back.
  return prettier.format(
    prettier.format(sourceFileWithSnapshots, {
      ...config,
      filepath: sourceFilePath
    }),
    {
      ...config,
      filepath: sourceFilePath,
      parser: createFormattingParser(snapshotMatcherNames, inferredParser)
    }
  );
};

// This parser formats snapshots to the correct indentation.
const createFormattingParser =
  (snapshotMatcherNames, inferredParser) => (text, parsers, options) => {
    // Workaround for https://github.com/prettier/prettier/issues/3150
    options.parser = inferredParser;
    const ast = parsers[inferredParser](text, options);
    traverse(ast, (node, ancestors) => {
      if (node.type !== 'CallExpression') return;
      const {arguments: args, callee} = node;
      if (
        callee.type !== 'MemberExpression' ||
        callee.property.type !== 'Identifier' ||
        !snapshotMatcherNames.includes(callee.property.name) ||
        !callee.loc ||
        callee.computed
      ) {
        return;
      }
      let snapshotIndex;
      let snapshot;
      for (let i = 0; i < args.length; i++) {
        const node = args[i];
        if (node.type === 'TemplateLiteral') {
          snapshotIndex = i;
          snapshot = node.quasis[0].value.raw;
        }
      }
      if (snapshot === undefined) {
        return;
      }
      const parent = ancestors[ancestors.length - 1].node;
      const startColumn =
        isAwaitExpression(parent) && parent.loc
          ? parent.loc.start.column
          : callee.loc.start.column;
      const useSpaces = !options.useTabs;
      snapshot = indent(
        snapshot,
        Math.ceil(
          useSpaces
            ? startColumn / (options.tabWidth ?? 1)
            : // Each tab is 2 characters.
              startColumn / 2
        ),
        useSpaces ? ' '.repeat(options.tabWidth ?? 1) : '\t'
      );
      const replacementNode = templateLiteral(
        [
          templateElement({
            raw: snapshot
          })
        ],
        []
      );
      args[snapshotIndex] = replacementNode;
    });
    return ast;
  };
const simpleDetectParser = filePath => {
  const extname = path.extname(filePath);
  if (/\.tsx?$/.test(extname)) {
    return 'typescript';
  }
  return 'babel';
};
