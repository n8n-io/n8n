"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = MJMLParser;
var _flow2 = _interopRequireDefault(require("lodash/fp/flow"));
var _map2 = _interopRequireDefault(require("lodash/fp/map"));
var _filter2 = _interopRequireDefault(require("lodash/fp/filter"));
var _find2 = _interopRequireDefault(require("lodash/find"));
var _findLastIndex2 = _interopRequireDefault(require("lodash/findLastIndex"));
var _isObject2 = _interopRequireDefault(require("lodash/isObject"));
var _htmlparser = require("htmlparser2");
var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
var _cleanNode = _interopRequireDefault(require("./helpers/cleanNode"));
var _convertBooleansOnAttrs = _interopRequireDefault(require("./helpers/convertBooleansOnAttrs"));
var _setEmptyAttributes = _interopRequireDefault(require("./helpers/setEmptyAttributes"));
const isNode = require('detect-node');
const indexesForNewLine = xml => {
  const regex = /\n/gi;
  const indexes = [0];
  while (regex.exec(xml)) {
    indexes.push(regex.lastIndex);
  }
  return indexes;
};
const isSelfClosing = (indexes, parser) => indexes.startIndex === parser.startIndex && indexes.endIndex === parser.endIndex;
function MJMLParser(xml, options = {}, includedIn = []) {
  const {
    addEmptyAttributes = true,
    components = {},
    convertBooleans = true,
    keepComments = true,
    filePath = '.',
    actualPath = '.',
    ignoreIncludes = false,
    preprocessors = []
  } = options;
  const endingTags = (0, _flow2.default)((0, _filter2.default)(component => component.endingTag), (0, _map2.default)(component => component.getTagName()))({
    ...components
  });
  let cwd = process.cwd();
  if (isNode && filePath) {
    try {
      const isDir = _fs.default.lstatSync(filePath).isDirectory();
      cwd = isDir ? filePath : _path.default.dirname(filePath);
    } catch (e) {
      throw new Error('Specified filePath does not exist');
    }
  }
  let mjml = null;
  let cur = null;
  let inInclude = !!includedIn.length;
  let inEndingTag = 0;
  const cssIncludes = [];
  const currentEndingTagIndexes = {
    startIndex: 0,
    endIndex: 0
  };
  const findTag = (tagName, tree) => (0, _find2.default)(tree.children, {
    tagName
  });
  const lineIndexes = indexesForNewLine(xml);
  const handleCssHtmlInclude = (file, attrs, line) => {
    const partialPath = _path.default.resolve(cwd, file);
    let content;
    try {
      content = _fs.default.readFileSync(partialPath, 'utf8');
    } catch (e) {
      const newNode = {
        line,
        file,
        absoluteFilePath: _path.default.resolve(cwd, actualPath),
        parent: cur,
        tagName: 'mj-raw',
        content: `<!-- mj-include fails to read file : ${file} at ${partialPath} -->`,
        children: [],
        errors: [{
          type: 'include',
          params: {
            file,
            partialPath
          }
        }]
      };
      cur.children.push(newNode);
      return;
    }
    if (attrs.type === 'html') {
      const newNode = {
        line,
        file,
        absoluteFilePath: _path.default.resolve(cwd, actualPath),
        parent: cur,
        tagName: 'mj-raw',
        content
      };
      cur.children.push(newNode);
      return;
    }
    const attributes = attrs['css-inline'] === 'inline' ? {
      inline: 'inline'
    } : {};
    const newNode = {
      line,
      file,
      absoluteFilePath: _path.default.resolve(cwd, actualPath),
      tagName: 'mj-style',
      content,
      children: [],
      attributes
    };
    cssIncludes.push(newNode);
  };
  const handleInclude = (file, line) => {
    const partialPath = _path.default.resolve(cwd, file);
    const curBeforeInclude = cur;
    if ((0, _find2.default)(cur.includedIn, {
      file: partialPath
    })) throw new Error(`Circular inclusion detected on file : ${partialPath}`);
    let content;
    try {
      content = _fs.default.readFileSync(partialPath, 'utf8');
    } catch (e) {
      const newNode = {
        line,
        file,
        absoluteFilePath: _path.default.resolve(cwd, actualPath),
        parent: cur,
        tagName: 'mj-raw',
        content: `<!-- mj-include fails to read file : ${file} at ${partialPath} -->`,
        children: [],
        errors: [{
          type: 'include',
          params: {
            file,
            partialPath
          }
        }]
      };
      cur.children.push(newNode);
      return;
    }
    content = content.indexOf('<mjml>') === -1 ? `<mjml><mj-body>${content}</mj-body></mjml>` : content;
    const partialMjml = MJMLParser(content, {
      ...options,
      filePath: partialPath,
      actualPath: partialPath
    }, [...cur.includedIn, {
      file: cur.absoluteFilePath,
      line
    }]);
    const bindToTree = (children, tree = cur) => children.map(c => ({
      ...c,
      parent: tree
    }));
    if (partialMjml.tagName !== 'mjml') {
      return;
    }
    const body = findTag('mj-body', partialMjml);
    const head = findTag('mj-head', partialMjml);
    if (body) {
      const boundChildren = bindToTree(body.children);
      cur.children = [...cur.children, ...boundChildren];
    }
    if (head) {
      let curHead = findTag('mj-head', mjml);
      if (!curHead) {
        mjml.children.push({
          file: actualPath,
          absoluteFilePath: _path.default.resolve(cwd, actualPath),
          parent: mjml,
          tagName: 'mj-head',
          children: [],
          includedIn: []
        });
        curHead = findTag('mj-head', mjml);
      }
      const boundChildren = bindToTree(head.children, curHead);
      curHead.children = [...curHead.children, ...boundChildren];
    }

    // must restore cur to the cur before include started
    cur = curBeforeInclude;
  };
  const parser = new _htmlparser.Parser({
    onopentag: (name, attrs) => {
      const isAnEndingTag = endingTags.indexOf(name) !== -1;
      if (inEndingTag > 0) {
        if (isAnEndingTag) inEndingTag += 1;
        return;
      }
      if (isAnEndingTag) {
        inEndingTag += 1;
        if (inEndingTag === 1) {
          // we're entering endingTag
          currentEndingTagIndexes.startIndex = parser.startIndex;
          currentEndingTagIndexes.endIndex = parser.endIndex;
        }
      }
      const line = (0, _findLastIndex2.default)(lineIndexes, i => i <= parser.startIndex) + 1;
      if (name === 'mj-include') {
        if (ignoreIncludes || !isNode) return;
        if (attrs.type === 'css' || attrs.type === 'html') {
          handleCssHtmlInclude(decodeURIComponent(attrs.path), attrs, line);
          return;
        }
        inInclude = true;
        handleInclude(decodeURIComponent(attrs.path), line);
        return;
      }
      if (convertBooleans) {
        // "true" and "false" will be converted to bools
        attrs = (0, _convertBooleansOnAttrs.default)(attrs);
      }
      const newNode = {
        file: actualPath,
        absoluteFilePath: isNode ? _path.default.resolve(cwd, actualPath) : actualPath,
        line,
        includedIn,
        parent: cur,
        tagName: name,
        attributes: attrs,
        children: []
      };
      if (cur) {
        cur.children.push(newNode);
      } else {
        mjml = newNode;
      }
      cur = newNode;
    },
    onclosetag: name => {
      if (endingTags.indexOf(name) !== -1) {
        inEndingTag -= 1;
        if (!inEndingTag) {
          // we're getting out of endingTag
          // if self-closing tag we don't get the content
          if (!isSelfClosing(currentEndingTagIndexes, parser)) {
            const partialVal = xml.substring(currentEndingTagIndexes.endIndex + 1, parser.endIndex).trim();
            const val = partialVal.substring(0, partialVal.lastIndexOf(`</${name}`));
            if (val) cur.content = val.trim();
          }
        }
      }
      if (inEndingTag > 0) return;
      if (inInclude) {
        inInclude = false;
      }

      // for includes, setting cur is handled in handleInclude because when there is
      // only mj-head in include it doesn't create any elements, so setting back to parent is wrong
      if (name !== 'mj-include') cur = cur && cur.parent || null;
    },
    ontext: text => {
      if (inEndingTag > 0) return;
      if (text && text.trim() && cur) {
        cur.content = `${cur && cur.content || ''}${text.trim()}`.trim();
      }
    },
    oncomment: data => {
      if (inEndingTag > 0) return;
      if (cur && keepComments) {
        cur.children.push({
          line: (0, _findLastIndex2.default)(lineIndexes, i => i <= parser.startIndex) + 1,
          tagName: 'mj-raw',
          content: `<!-- ${data.trim()} -->`,
          includedIn
        });
      }
    }
  }, {
    recognizeCDATA: true,
    decodeEntities: false,
    recognizeSelfClosing: true,
    lowerCaseAttributeNames: false
  });

  // Apply preprocessors to raw xml
  xml = (0, _flow2.default)(preprocessors)(xml);
  parser.write(xml);
  parser.end();
  if (!(0, _isObject2.default)(mjml)) {
    throw new Error('Parsing failed. Check your mjml.');
  }
  (0, _cleanNode.default)(mjml);

  // Assign "attributes" property if not set
  if (addEmptyAttributes) {
    (0, _setEmptyAttributes.default)(mjml);
  }
  if (cssIncludes.length) {
    const head = (0, _find2.default)(mjml.children, {
      tagName: 'mj-head'
    });
    if (head) {
      if (head.children) {
        head.children = [...head.children, ...cssIncludes];
      } else {
        head.children = cssIncludes;
      }
    } else {
      mjml.children.push({
        file: filePath,
        line: 0,
        tagName: 'mj-head',
        children: cssIncludes
      });
    }
  }
  return mjml;
}
module.exports = exports.default;