const binding = require('node-gyp-build')(__dirname);
const {Query, Parser, NodeMethods, Tree, TreeCursor, LookaheadIterator} = binding;

const util = require('util');

/*
 * Tree
 */

const {rootNode, rootNodeWithOffset, edit} = Tree.prototype;

Object.defineProperty(Tree.prototype, 'rootNode', {
  get() {
    /*
      Due to a race condition arising from Jest's worker pool, "this"
      has no knowledge of the native extension if the extension has not
      yet loaded when multiple Jest tests are being run simultaneously.
      If the extension has correctly loaded, "this" should be an instance 
      of the class whose prototype we are acting on (in this case, Tree).
      Furthermore, the race condition sometimes results in the function in 
      question being undefined even when the context is correct, so we also 
      perform a null function check.
    */
    if (this instanceof Tree && rootNode) {
      return unmarshalNode(rootNode.call(this), this);
    }
  },
  // Jest worker pool may attempt to override property due to race condition,
  // we don't want to error on this
  configurable: true
});

Tree.prototype.rootNodeWithOffset = function(offset_bytes, offset_extent) {
  return unmarshalNode(rootNodeWithOffset.call(this, offset_bytes, offset_extent.row, offset_extent.column), this);
}

Tree.prototype.edit = function(arg) {
  if (this instanceof Tree && edit) {
    edit.call(
      this,
      arg.startPosition.row, arg.startPosition.column,
      arg.oldEndPosition.row, arg.oldEndPosition.column,
      arg.newEndPosition.row, arg.newEndPosition.column,
      arg.startIndex,
      arg.oldEndIndex,
      arg.newEndIndex
    );
  }
};

Tree.prototype.walk = function() {
  return this.rootNode.walk()
};

/*
 * Node
 */

class SyntaxNode {
  constructor(tree) {
    this.tree = tree;
  }

  [util.inspect.custom]() {
    return this.constructor.name + ' {\n' +
      '  type: ' + this.type + ',\n' +
      '  startPosition: ' + pointToString(this.startPosition) + ',\n' +
      '  endPosition: ' + pointToString(this.endPosition) + ',\n' +
      '  childCount: ' + this.childCount + ',\n' +
      '}'
  }

  get id() {
    marshalNode(this);
    return NodeMethods.id(this.tree);
  }

  get typeId() {
    marshalNode(this);
    return NodeMethods.typeId(this.tree);
  }

  get grammarId() {
    marshalNode(this);
    return NodeMethods.grammarId(this.tree);
  }

  get type() {
    marshalNode(this);
    return NodeMethods.type(this.tree);
  }

  get grammarType() {
    marshalNode(this);
    return NodeMethods.grammarType(this.tree);
  }

  get isExtra() {
    marshalNode(this);
    return NodeMethods.isExtra(this.tree);
  }

  get isNamed() {
    marshalNode(this);
    return NodeMethods.isNamed(this.tree);
  }

  get isMissing() {
    marshalNode(this);
    return NodeMethods.isMissing(this.tree);
  }

  get hasChanges() {
    marshalNode(this);
    return NodeMethods.hasChanges(this.tree);
  }

  get hasError() {
    marshalNode(this);
    return NodeMethods.hasError(this.tree);
  }

  get isError() {
    marshalNode(this);
    return NodeMethods.isError(this.tree);
  }

  get text() {
    return this.tree.getText(this);
  }

  get startPosition() {
    marshalNode(this);
    NodeMethods.startPosition(this.tree);
    return unmarshalPoint();
  }

  get endPosition() {
    marshalNode(this);
    NodeMethods.endPosition(this.tree);
    return unmarshalPoint();
  }

  get startIndex() {
    marshalNode(this);
    return NodeMethods.startIndex(this.tree);
  }

  get endIndex() {
    marshalNode(this);
    return NodeMethods.endIndex(this.tree);
  }

  get parent() {
    marshalNode(this);
    return unmarshalNode(NodeMethods.parent(this.tree), this.tree);
  }

  get children() {
    marshalNode(this);
    return unmarshalNodes(NodeMethods.children(this.tree), this.tree);
  }

  get namedChildren() {
    marshalNode(this);
    return unmarshalNodes(NodeMethods.namedChildren(this.tree), this.tree);
  }

  get childCount() {
    marshalNode(this);
    return NodeMethods.childCount(this.tree);
  }

  get namedChildCount() {
    marshalNode(this);
    return NodeMethods.namedChildCount(this.tree);
  }

  get firstChild() {
    marshalNode(this);
    return unmarshalNode(NodeMethods.firstChild(this.tree), this.tree);
  }

  get firstNamedChild() {
    marshalNode(this);
    return unmarshalNode(NodeMethods.firstNamedChild(this.tree), this.tree);
  }

  get lastChild() {
    marshalNode(this);
    return unmarshalNode(NodeMethods.lastChild(this.tree), this.tree);
  }

  get lastNamedChild() {
    marshalNode(this);
    return unmarshalNode(NodeMethods.lastNamedChild(this.tree), this.tree);
  }

  get nextSibling() {
    marshalNode(this);
    return unmarshalNode(NodeMethods.nextSibling(this.tree), this.tree);
  }

  get nextNamedSibling() {
    marshalNode(this);
    return unmarshalNode(NodeMethods.nextNamedSibling(this.tree), this.tree);
  }

  get previousSibling() {
    marshalNode(this);
    return unmarshalNode(NodeMethods.previousSibling(this.tree), this.tree);
  }

  get previousNamedSibling() {
    marshalNode(this);
    return unmarshalNode(NodeMethods.previousNamedSibling(this.tree), this.tree);
  }

  get parseState() {
    marshalNode(this);
    return NodeMethods.parseState(this.tree);
  }

  get nextParseState() {
    marshalNode(this);
    return NodeMethods.nextParseState(this.tree);
  }

  get descendantCount() {
    marshalNode(this);
    return NodeMethods.descendantCount(this.tree);
  }

  toString() {
    marshalNode(this);
    return NodeMethods.toString(this.tree);
  }

  child(index) {
    marshalNode(this);
    return unmarshalNode(NodeMethods.child(this.tree, index), this.tree);
  }

  namedChild(index) {
    marshalNode(this);
    return unmarshalNode(NodeMethods.namedChild(this.tree, index), this.tree);
  }

  childForFieldName(fieldName) {
    marshalNode(this);
    return unmarshalNode(NodeMethods.childForFieldName(this.tree, fieldName), this.tree);
  }

  childForFieldId(fieldId) {
    marshalNode(this);
    return unmarshalNode(NodeMethods.childForFieldId(this.tree, fieldId), this.tree);
  }

  fieldNameForChild(childIndex) {
    marshalNode(this);
    return NodeMethods.fieldNameForChild(this.tree, childIndex);
  }

  childrenForFieldName(fieldName) {
    marshalNode(this);
    return unmarshalNodes(NodeMethods.childrenForFieldName(this.tree, fieldName), this.tree);
  }

  childrenForFieldId(fieldId) {
    marshalNode(this);
    return unmarshalNodes(NodeMethods.childrenForFieldId(this.tree, fieldId), this.tree);
  }

  firstChildForIndex(index) {
    marshalNode(this);
    return unmarshalNode(NodeMethods.firstChildForIndex(this.tree, index), this.tree);
  }

  firstNamedChildForIndex(index) {
    marshalNode(this);
    return unmarshalNode(NodeMethods.firstNamedChildForIndex(this.tree, index), this.tree);
  }

  namedDescendantForIndex(start, end) {
    marshalNode(this);
    if (end == null) end = start;
    return unmarshalNode(NodeMethods.namedDescendantForIndex(this.tree, start, end), this.tree);
  }

  descendantForIndex(start, end) {
    marshalNode(this);
    if (end == null) end = start;
    return unmarshalNode(NodeMethods.descendantForIndex(this.tree, start, end), this.tree);
  }

  descendantsOfType(types, start, end) {
    marshalNode(this);
    if (typeof types === 'string') types = [types]
    return unmarshalNodes(NodeMethods.descendantsOfType(this.tree, types, start, end), this.tree);
  }

  namedDescendantForPosition(start, end) {
    marshalNode(this);
    if (end == null) end = start;
    return unmarshalNode(NodeMethods.namedDescendantForPosition(this.tree, start, end), this.tree);
  }

  descendantForPosition(start, end) {
    marshalNode(this);
    if (end == null) end = start;
    return unmarshalNode(NodeMethods.descendantForPosition(this.tree, start, end), this.tree);
  }

  closest(types) {
    marshalNode(this);
    if (typeof types === 'string') types = [types]
    return unmarshalNode(NodeMethods.closest(this.tree, types), this.tree);
  }

  walk () {
    marshalNode(this);
    const cursor = NodeMethods.walk(this.tree);
    cursor.tree = this.tree;
    unmarshalNode(cursor.currentNode, this.tree);
    return cursor;
  }
}

/*
 * Parser
 */

const {parse, setLanguage} = Parser.prototype;
const languageSymbol = Symbol('parser.language');

Parser.prototype.setLanguage = function(language) {
  if (this instanceof Parser && setLanguage) {
    setLanguage.call(this, language);
  }
  this[languageSymbol] = language;
  if (!language.nodeSubclasses) {
    initializeLanguageNodeClasses(language)
  }
  return this;
};

Parser.prototype.getLanguage = function(_language) {
  return this[languageSymbol] || null;
};

Parser.prototype.parse = function(input, oldTree, {bufferSize, includedRanges}={}) {
  let getText, treeInput = input
  if (typeof input === 'string') {
    const inputString = input;
    input = (offset, _position) => inputString.slice(offset)
    getText = getTextFromString
  } else {
    getText = getTextFromFunction
  }
  const tree = this instanceof Parser && parse
    ? parse.call(
      this,
      input,
      oldTree,
      bufferSize,
      includedRanges,
    )
    : undefined;

  if (tree) {
    tree.input = treeInput
    tree.getText = getText
    tree.language = this.getLanguage()
  }
  return tree
};

/*
 * TreeCursor
 */

const {startPosition, endPosition, currentNode} = TreeCursor.prototype;

Object.defineProperties(TreeCursor.prototype, {
  currentNode: {
    get() {
      if (this instanceof TreeCursor && currentNode) {
        return unmarshalNode(currentNode.call(this), this.tree);
      }
    },
    configurable: true
  },
  startPosition: {
    get() {
      if (this instanceof TreeCursor && startPosition) {
        startPosition.call(this);
        return unmarshalPoint();
      }
    },
    configurable: true
  },
  endPosition: {
    get() {
      if (this instanceof TreeCursor && endPosition) {
        endPosition.call(this);
        return unmarshalPoint();
      }
    },
    configurable: true
  },
  nodeText: {
    get() {
      return this.tree.getText(this)
    },
    configurable: true
  }
});

/*
 * Query
 */

const {_matches, _captures} = Query.prototype;

const PREDICATE_STEP_TYPE = {
  DONE: 0,
  CAPTURE: 1,
  STRING: 2,
}

const ZERO_POINT = { row: 0, column: 0 };

Query.prototype._init = function() {
  /*
   * Initialize predicate functions
   * format: [type1, value1, type2, value2, ...]
   */
  const predicateDescriptions = this._getPredicates();
  const patternCount = predicateDescriptions.length;

  const setProperties = new Array(patternCount);
  const assertedProperties = new Array(patternCount);
  const refutedProperties = new Array(patternCount);
  const predicates = new Array(patternCount);

  const FIRST  = 0
  const SECOND = 2
  const THIRD  = 4

  for (let i = 0; i < predicateDescriptions.length; i++) {
    predicates[i] = [];

    for (let j = 0; j < predicateDescriptions[i].length; j++) {

      const steps = predicateDescriptions[i][j];
      const stepsLength = steps.length / 2;

      if (steps[FIRST] !== PREDICATE_STEP_TYPE.STRING) {
        throw new Error('Predicates must begin with a literal value');
      }

      const operator = steps[FIRST + 1];

      let isPositive = true;
      let matchAll = true;
      let captureName;
      switch (operator) {
        case 'any-not-eq?':
        case 'not-eq?':
          isPositive = false;
        case 'any-eq?':
        case 'eq?':
          if (stepsLength !== 3) throw new Error(
            `Wrong number of arguments to \`#eq?\` predicate. Expected 2, got ${stepsLength - 1}`
          );
          if (steps[SECOND] !== PREDICATE_STEP_TYPE.CAPTURE) throw new Error(
            `First argument of \`#eq?\` predicate must be a capture. Got "${steps[SECOND + 1]}"`
          );
          matchAll = !operator.startsWith('any-');
          if (steps[THIRD] === PREDICATE_STEP_TYPE.CAPTURE) {
            const captureName1 = steps[SECOND + 1];
            const captureName2 = steps[THIRD + 1];
            predicates[i].push(function (captures) {
              let nodes_1 = [];
              let nodes_2 = [];
              for (const c of captures) {
                if (c.name === captureName1) nodes_1.push(c.node);
                if (c.name === captureName2) nodes_2.push(c.node);
              }
              let compare = (n1, n2, positive) => {
                return positive ?
                  n1.text === n2.text :
                  n1.text !== n2.text;
              };
              return matchAll
                ? nodes_1.every(n1 => nodes_2.some(n2 => compare(n1, n2, isPositive)))
                : nodes_1.some(n1 => nodes_2.some(n2 => compare(n1, n2, isPositive)));
            });
          } else {
            captureName = steps[SECOND + 1];
            const stringValue = steps[THIRD + 1];
            let matches = (n) => n.text === stringValue;
            let doesNotMatch = (n) => n.text !== stringValue;
            predicates[i].push(function (captures) {
              let nodes = [];
              for (const c of captures) {
                if (c.name === captureName) nodes.push(c.node);
              }
              let test = isPositive ? matches : doesNotMatch;
              return matchAll
                ? nodes.every(test)
                : nodes.some(test);
            });
          }
          break;

        case 'any-not-match?':
        case 'not-match?':
          isPositive = false;
        case 'any-match?':
        case 'match?':
          if (stepsLength !== 3) throw new Error(
            `Wrong number of arguments to \`#match?\` predicate. Expected 2, got ${stepsLength - 1}.`
          );
          if (steps[SECOND] !== PREDICATE_STEP_TYPE.CAPTURE) throw new Error(
            `First argument of \`#match?\` predicate must be a capture. Got "${steps[SECOND + 1]}".`
          );
          if (steps[THIRD] !== PREDICATE_STEP_TYPE.STRING) throw new Error(
            `Second argument of \`#match?\` predicate must be a string. Got @${steps[THIRD + 1]}.`
          );
          captureName = steps[SECOND + 1];
          const regex = new RegExp(steps[THIRD + 1]);
          matchAll = !operator.startsWith('any-');
          predicates[i].push(function (captures) {
            const nodes = [];
            for (const c of captures) {
              if (c.name === captureName) nodes.push(c.node.text);
            }
            let test = (text, positive) => {
              return positive ?
                regex.test(text) :
                !regex.test(text);
            };
            if (nodes.length === 0) return !isPositive;
            return matchAll
              ? nodes.every(text => test(text, isPositive))
              : nodes.some(text => test(text, isPositive))
            });
          break;

        case 'set!':
          if (stepsLength < 2 || stepsLength > 3) throw new Error(
            `Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${stepsLength - 1}.`
          );
          if (steps.some((s, i) => (i % 2 !== 1) && s !== PREDICATE_STEP_TYPE.STRING)) throw new Error(
            `Arguments to \`#set!\` predicate must be a strings.".`
          );
          if (!setProperties[i]) setProperties[i] = {};
          setProperties[i][steps[SECOND + 1]] = steps[THIRD] ? steps[THIRD + 1] : null;
          break;

        case 'is?':
        case 'is-not?':
          if (stepsLength < 2 || stepsLength > 3) throw new Error(
            `Wrong number of arguments to \`#${operator}\` predicate. Expected 1 or 2. Got ${stepsLength - 1}.`
          );
          if (steps.some((s, i) => (i % 2 !== 1) && s !== PREDICATE_STEP_TYPE.STRING)) throw new Error(
            `Arguments to \`#${operator}\` predicate must be a strings.".`
          );
          const properties = operator === 'is?' ? assertedProperties : refutedProperties;
          if (!properties[i]) properties[i] = {};
          properties[i][steps[SECOND + 1]] = steps[THIRD] ? steps[THIRD + 1] : null;
          break;

        case 'not-any-of?':
          isPositive = false;
        case 'any-of?':
          if (stepsLength < 2) throw new Error(
            `Wrong number of arguments to \`#${operator}\` predicate. Expected at least 1. Got ${stepsLength - 1}.`
          );
          if (steps[SECOND] !== PREDICATE_STEP_TYPE.CAPTURE) throw new Error(
            `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
          );
          stringValues = [];
          for (let k = THIRD; k < 2 * stepsLength; k += 2) {
            if (steps[k] !== PREDICATE_STEP_TYPE.STRING) throw new Error(
              `Arguments to \`#${operator}\` predicate must be a strings.".`
            );
            stringValues.push(steps[k + 1]);
          }
          captureName = steps[SECOND + 1];
          predicates[i].push(function (captures) {
            const nodes = [];
            for (const c of captures) {
              if (c.name === captureName) nodes.push(c.node.text);
            }
            if (nodes.length === 0) return !isPositive;
            return nodes.every(text => stringValues.includes(text)) === isPositive;
          });
          break;

        default:
          throw new Error(`Unknown query predicate \`#${steps[FIRST + 1]}\``);
      }
    }
  }

  this.predicates = Object.freeze(predicates);
  this.setProperties = Object.freeze(setProperties);
  this.assertedProperties = Object.freeze(assertedProperties);
  this.refutedProperties = Object.freeze(refutedProperties);
}

Query.prototype.matches = function(
  node,
  {
    startPosition = ZERO_POINT,
    endPosition = ZERO_POINT,
    startIndex = 0,
    endIndex = 0,
    matchLimit = 0xFFFFFFFF,
    maxStartDepth = 0xFFFFFFFF
  } = {}
) {
  marshalNode(node);
  const [returnedMatches, returnedNodes] = _matches.call(this, node.tree,
    startPosition.row, startPosition.column,
    endPosition.row, endPosition.column,
    startIndex, endIndex, matchLimit, maxStartDepth
  );
  const nodes = unmarshalNodes(returnedNodes, node.tree);
  const results = [];

  let i = 0
  let nodeIndex = 0;
  while (i < returnedMatches.length) {
    const patternIndex = returnedMatches[i++];
    const captures = [];

    while (i < returnedMatches.length && typeof returnedMatches[i] === 'string') {
      const captureName = returnedMatches[i++];
      captures.push({
        name: captureName,
        node: nodes[nodeIndex++],
      })
    }

    if (this.predicates[patternIndex].every(p => p(captures))) {
      const result = {pattern: patternIndex, captures};
      const setProperties = this.setProperties[patternIndex];
      const assertedProperties = this.assertedProperties[patternIndex];
      const refutedProperties = this.refutedProperties[patternIndex];
      if (setProperties) result.setProperties = setProperties;
      if (assertedProperties) result.assertedProperties = assertedProperties;
      if (refutedProperties) result.refutedProperties = refutedProperties;
      results.push(result);
    }
  }

  return results;
}

Query.prototype.captures = function(
  node,
  {
    startPosition = ZERO_POINT,
    endPosition = ZERO_POINT,
    startIndex = 0,
    endIndex = 0,
    matchLimit = 0xFFFFFFFF,
    maxStartDepth = 0xFFFFFFFF
  } = {}
) {
  marshalNode(node);
  const [returnedMatches, returnedNodes] = _captures.call(this, node.tree,
    startPosition.row, startPosition.column,
    endPosition.row, endPosition.column,
    startIndex, endIndex, matchLimit, maxStartDepth
  );
  const nodes = unmarshalNodes(returnedNodes, node.tree);
  const results = [];

  let i = 0
  let nodeIndex = 0;
  while (i < returnedMatches.length) {
    const patternIndex = returnedMatches[i++];
    const captureIndex = returnedMatches[i++];
    const captures = [];

    while (i < returnedMatches.length && typeof returnedMatches[i] === 'string') {
      const captureName = returnedMatches[i++];
      captures.push({
        name: captureName,
        node: nodes[nodeIndex++],
      })
    }

    if (this.predicates[patternIndex].every(p => p(captures))) {
      const result = captures[captureIndex];
      const setProperties = this.setProperties[patternIndex];
      const assertedProperties = this.assertedProperties[patternIndex];
      const refutedProperties = this.refutedProperties[patternIndex];
      if (setProperties) result.setProperties = setProperties;
      if (assertedProperties) result.assertedProperties = assertedProperties;
      if (refutedProperties) result.refutedProperties = refutedProperties;
      results.push(result);
    }
  }

  return results;
}

/*
 * LookaheadIterator
 */

LookaheadIterator.prototype[Symbol.iterator] = function() {
  const self = this;
  return {
    next() {
      if (self._next()) {
        return {done: false, value: self.currentType};
      }

      return {done: true, value: ''};
    },
  };
}

/*
 * Other functions
 */

function getTextFromString (node) {
  return this.input.substring(node.startIndex, node.endIndex);
}

function getTextFromFunction ({startIndex, endIndex}) {
  const {input} = this
  let result = '';
  const goalLength = endIndex - startIndex;
  while (result.length < goalLength) {
    const text = input(startIndex + result.length);
    result += text;
  }
  return result.slice(0, goalLength);
}

const {pointTransferArray} = binding;

const NODE_FIELD_COUNT = 6;
const ERROR_TYPE_ID = 0xFFFF

function getID(buffer, offset) {
  const low  = BigInt(buffer[offset]);
  const high = BigInt(buffer[offset + 1]);
  return (high << 32n) + low;
}

function unmarshalNode(value, tree, offset = 0, cache = null) {
  /* case 1: node from the tree cache */
  if (typeof value === 'object') {
    const node = value;
    return node;
  }

  /* case 2: node being transferred */
  const nodeTypeId = value;
  const NodeClass = nodeTypeId === ERROR_TYPE_ID
    ? SyntaxNode
    : tree.language.nodeSubclasses[nodeTypeId];

  const {nodeTransferArray} = binding;
  const id = getID(nodeTransferArray, offset)
  if (id === 0n) {
    return null
  }

  let cachedResult;
  if (cache && (cachedResult = cache.get(id)))
    return cachedResult;

  const result = new NodeClass(tree);
  for (let i = 0; i < NODE_FIELD_COUNT; i++) {
    result[i] = nodeTransferArray[offset + i];
  }

  if (cache)
    cache.set(id, result);
  else
    tree._cacheNode(result);

  return result;
}

function unmarshalNodes(nodes, tree) {
  const cache = new Map();

  let offset = 0;
  for (let i = 0, {length} = nodes; i < length; i++) {
    const node = unmarshalNode(nodes[i], tree, offset, cache);
    if (node !== nodes[i]) {
      nodes[i] = node;
      offset += NODE_FIELD_COUNT
    }
  }

  tree._cacheNodes(Array.from(cache.values()));

  return nodes;
}

function marshalNode(node) {
  if (!(node.tree instanceof Tree)){
    throw new TypeError("SyntaxNode must belong to a Tree")
  }
  const {nodeTransferArray} = binding;
  for (let i = 0; i < NODE_FIELD_COUNT; i++) {
    nodeTransferArray[i] = node[i];
  }
}

function unmarshalPoint() {
  return {row: pointTransferArray[0], column: pointTransferArray[1]};
}

function pointToString(point) {
  return `{row: ${point.row}, column: ${point.column}}`;
}

function initializeLanguageNodeClasses(language) {
  const nodeTypeNamesById = binding.getNodeTypeNamesById(language);
  const nodeFieldNamesById = binding.getNodeFieldNamesById(language);
  const nodeTypeInfo = language.nodeTypeInfo || [];

  const nodeSubclasses = [];
  for (let id = 0, n = nodeTypeNamesById.length; id < n; id++) {
    nodeSubclasses[id] = SyntaxNode;

    const typeName = nodeTypeNamesById[id];
    if (!typeName) continue;

    const typeInfo = nodeTypeInfo.find(info => info.named && info.type === typeName);
    if (!typeInfo) continue;

    const fieldNames = [];
    let classBody = '\n';
    if (typeInfo.fields) {
      for (const fieldName in typeInfo.fields) {
        const fieldId = nodeFieldNamesById.indexOf(fieldName);
        if (fieldId === -1) continue;
        if (typeInfo.fields[fieldName].multiple) {
          const getterName = camelCase(fieldName) + 'Nodes';
          fieldNames.push(getterName);
          classBody += `
            get ${getterName}() {
              marshalNode(this);
              return unmarshalNodes(NodeMethods.childNodesForFieldId(this.tree, ${fieldId}), this.tree);
            }
          `.replace(/\s+/g, ' ') + '\n';
        } else {
          const getterName = camelCase(fieldName, false) + 'Node';
          fieldNames.push(getterName);
          classBody += `
            get ${getterName}() {
              marshalNode(this);
              return unmarshalNode(NodeMethods.childNodeForFieldId(this.tree, ${fieldId}), this.tree);
            }
          `.replace(/\s+/g, ' ') + '\n';
        }
      }
    }

    const className = camelCase(typeName, true) + 'Node';
    const nodeSubclass = eval(`class ${className} extends SyntaxNode {${classBody}}; ${className}`);
    nodeSubclass.prototype.type = typeName;
    nodeSubclass.prototype.fields = Object.freeze(fieldNames.sort())
    nodeSubclasses[id] = nodeSubclass;
  }

  language.nodeSubclasses = nodeSubclasses
}

function camelCase(name, upperCase) {
  name = name.replace(/_(\w)/g, (_match, letter) => letter.toUpperCase());
  if (upperCase) name = name[0].toUpperCase() + name.slice(1);
  return name;
}

module.exports = Parser;
module.exports.Query = Query;
module.exports.Tree = Tree;
module.exports.SyntaxNode = SyntaxNode;
module.exports.TreeCursor = TreeCursor;
module.exports.LookaheadIterator = LookaheadIterator;
