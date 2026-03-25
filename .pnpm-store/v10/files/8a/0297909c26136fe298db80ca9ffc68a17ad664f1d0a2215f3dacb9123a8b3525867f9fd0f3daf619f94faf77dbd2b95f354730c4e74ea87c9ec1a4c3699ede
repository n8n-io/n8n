'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.includes = undefined;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var includes = exports.includes = /<mj-include\s+path=['"](.*[\.mjml]?)['"]\s*(\/>|>\s*<\/mj-include>)/g;

var getBodyContent = function getBodyContent(input) {
  return (/<mj-container[^>]*>([\s\S]*?)<\/mj-container>/.exec(input) || [])[1];
};
var getHeadContent = function getHeadContent(input) {
  return (/<mj-head[^>]*>([\s\S]*?)<\/mj-head>/.exec(input) || [])[1];
};
var ensureMJMLFile = function ensureMJMLFile(file) {
  return file.trim().match(/.mjml/) && file || file + '.mjml';
};
var parseDocument = function parseDocument(input) {
  var internals = { content: getBodyContent(input), head: getHeadContent(input) };

  // Neither mj-container or mj-head inside the document
  // So we assume that entire file is a just plain MJML content
  if (!internals.content && !internals.head) {
    internals.content = input;
  }

  return internals;
};

var replaceContent = function replaceContent(currentDir, headStack, _, fileName) {
  var filePath = _path2.default.normalize(_path2.default.join(currentDir, ensureMJMLFile(fileName)));
  var partial = void 0;

  try {
    partial = _fs2.default.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '<mj-raw><!-- mj-include: file not found ' + filePath + ' --></mj-raw>';
  }

  var _parseDocument = parseDocument(partial),
      content = _parseDocument.content,
      head = _parseDocument.head; // eslint-disable-line prefer-const

  if (!content && !head) {
    throw new Error('Error while reading file: ' + filePath + ', file has no content ?');
  }

  if (head) {
    var headLength = headStack.length;
    head = head.replace(includes, replaceContent.bind(undefined, _path2.default.resolve(_path2.default.dirname(filePath)), headStack));
    // head.replace can add new element to the array
    // we have to keep the initial position where we want to insert
    // current mj-head in order to keep definition order
    headStack.splice(headLength - 1, 0, head);
  }

  if (content) {
    content = content.replace(includes, replaceContent.bind(undefined, _path2.default.resolve(_path2.default.dirname(filePath)), headStack));
  }

  return content || '';
};

exports.default = function (baseMjml, _ref) {
  var filePath = _ref.filePath;

  var headStack = [];
  var mjml = baseMjml;
  var fileDir = filePath ? _path2.default.dirname(filePath) : process.cwd();
  mjml = mjml.replace(includes, replaceContent.bind(undefined, _path2.default.resolve(fileDir), headStack));

  if (headStack.length > 0) {
    if (mjml.indexOf('<mj-head>') == -1) {
      mjml = mjml.replace('<mjml>', '<mjml>\n  <mj-head>\n  </mj-head>\n');
    }

    mjml = mjml.replace('</mj-head>', headStack.join('\n') + '\n</mj-head>');
  }

  return mjml;
};