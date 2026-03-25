'use strict';
var parse5 = require('parse5');
var htmlparser2Adapter = require('parse5-htmlparser2-tree-adapter');

exports.parse = function (content, options, isDocument) {
  var opts = {
    scriptingEnabled:
      typeof options.scriptingEnabled === 'boolean'
        ? options.scriptingEnabled
        : true,
    treeAdapter: htmlparser2Adapter,
    sourceCodeLocationInfo: options.sourceCodeLocationInfo,
  };

  var context = options.context;

  return isDocument
    ? parse5.parse(content, opts)
    : parse5.parseFragment(context, content, opts);
};

exports.render = function (dom) {
  // `dom-serializer` passes over the special "root" node and renders the
  // node's children in its place. To mimic this behavior with `parse5`, an
  // equivalent operation must be applied to the input array.
  var nodes = 'length' in dom ? dom : [dom];
  for (var index = 0; index < nodes.length; index += 1) {
    if (nodes[index].type === 'root') {
      nodes.splice.apply(nodes, [index, 1].concat(nodes[index].children));
    }
  }

  return parse5.serialize(
    { children: nodes },
    { treeAdapter: htmlparser2Adapter }
  );
};
