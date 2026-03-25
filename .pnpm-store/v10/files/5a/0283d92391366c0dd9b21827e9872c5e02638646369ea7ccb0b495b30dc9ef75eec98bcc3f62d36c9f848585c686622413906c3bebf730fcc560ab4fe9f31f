/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

var NodePath = require('./node-path');

/**
 * Does an actual AST traversal, using visitor pattern,
 * and calling set of callbacks.
 *
 * Based on https://github.com/olov/ast-traverse
 *
 * Expects AST in Mozilla Parser API: nodes which are supposed to be
 * handled should have `type` property.
 *
 * @param Object root - a root node to start traversal from.
 *
 * @param Object options - an object with set of callbacks:
 *
 *   - `pre(node, parent, prop, index)` - a hook called on node enter
 *   - `post`(node, parent, prop, index) - a hook called on node exit
 *   - `skipProperty(prop)` - a predicated whether a property should be skipped
 */
function astTraverse(root) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var pre = options.pre;
  var post = options.post;
  var skipProperty = options.skipProperty;

  function visit(node, parent, prop, idx) {
    if (!node || typeof node.type !== 'string') {
      return;
    }

    var res = undefined;
    if (pre) {
      res = pre(node, parent, prop, idx);
    }

    if (res !== false) {

      // A node can be replaced during traversal, so we have to
      // recalculate it from the parent, to avoid traversing "dead" nodes.
      if (parent && parent[prop]) {
        if (!isNaN(idx)) {
          node = parent[prop][idx];
        } else {
          node = parent[prop];
        }
      }

      for (var _prop in node) {
        if (node.hasOwnProperty(_prop)) {
          if (skipProperty ? skipProperty(_prop, node) : _prop[0] === '$') {
            continue;
          }

          var child = node[_prop];

          // Collection node.
          //
          // NOTE: a node (or several nodes) can be removed or inserted
          // during traversal.
          //
          // Current traversing index is stored on top of the
          // `NodePath.traversingIndexStack`. The stack is used to support
          // recursive nature of the traversal.
          //
          // In this case `NodePath.traversingIndex` (which we use here) is
          // updated in the NodePath remove/insert methods.
          //
          if (Array.isArray(child)) {
            var index = 0;
            NodePath.traversingIndexStack.push(index);
            while (index < child.length) {
              visit(child[index], node, _prop, index);
              index = NodePath.updateTraversingIndex(+1);
            }
            NodePath.traversingIndexStack.pop();
          }

          // Simple node.
          else {
              visit(child, node, _prop);
            }
        }
      }
    }

    if (post) {
      post(node, parent, prop, idx);
    }
  }

  visit(root, null);
}

module.exports = {
  /**
   * Traverses an AST.
   *
   * @param Object ast - an AST node
   *
   * @param Object | Array<Object> handlers:
   *
   *   an object (or an array of objects)
   *
   *   Each such object contains a handler function per node.
   *   In case of an array of handlers, they are applied in order.
   *   A handler may return a transformed node (or a different type).
   *
   *   The per-node function may instead be an object with functions pre and post.
   *   pre is called before visiting the node, post after.
   *   If a handler is a function, it is treated as the pre function, with an empty post.
   *
   * @param Object options:
   *
   *   a config object, specifying traversal options:
   *
   *   `asNodes`: boolean - whether handlers should receives raw AST nodes
   *   (false by default), instead of a `NodePath` wrapper. Note, by default
   *   `NodePath` wrapper provides a set of convenient method to manipulate
   *   a traversing AST, and also has access to all parents list. A raw
   *   nodes traversal should be used in rare cases, when no `NodePath`
   *   features are needed.
   *
   * Special hooks:
   *
   *   - `shouldRun(ast)` - a predicate determining whether the handler
   *                        should be applied.
   *
   * NOTE: Multiple handlers are used as an optimization of applying all of
   * them in one AST traversal pass.
   */
  traverse: function traverse(ast, handlers) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : { asNodes: false };


    if (!Array.isArray(handlers)) {
      handlers = [handlers];
    }

    // Filter out handlers by result of `shouldRun`, if the method is present.
    handlers = handlers.filter(function (handler) {
      if (typeof handler.shouldRun !== 'function') {
        return true;
      }
      return handler.shouldRun(ast);
    });

    NodePath.initRegistry();

    // Allow handlers to initializer themselves.
    handlers.forEach(function (handler) {
      if (typeof handler.init === 'function') {
        handler.init(ast);
      }
    });

    function getPathFor(node, parent, prop, index) {
      var parentPath = NodePath.getForNode(parent);
      var nodePath = NodePath.getForNode(node, parentPath, prop, index);

      return nodePath;
    }

    // Handle actual nodes.
    astTraverse(ast, {
      /**
       * Handler on node enter.
       */
      pre: function pre(node, parent, prop, index) {
        var nodePath = void 0;
        if (!options.asNodes) {
          nodePath = getPathFor(node, parent, prop, index);
        }

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = handlers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var handler = _step.value;

            // "Catch-all" `*` handler.
            if (typeof handler['*'] === 'function') {
              if (nodePath) {
                // A path/node can be removed by some previous handler.
                if (!nodePath.isRemoved()) {
                  var handlerResult = handler['*'](nodePath);
                  // Explicitly stop traversal.
                  if (handlerResult === false) {
                    return false;
                  }
                }
              } else {
                handler['*'](node, parent, prop, index);
              }
            }

            // Per-node handler.
            var handlerFuncPre = void 0;
            if (typeof handler[node.type] === 'function') {
              handlerFuncPre = handler[node.type];
            } else if (typeof handler[node.type] === 'object' && typeof handler[node.type].pre === 'function') {
              handlerFuncPre = handler[node.type].pre;
            }

            if (handlerFuncPre) {
              if (nodePath) {
                // A path/node can be removed by some previous handler.
                if (!nodePath.isRemoved()) {
                  var _handlerResult = handlerFuncPre.call(handler, nodePath);
                  // Explicitly stop traversal.
                  if (_handlerResult === false) {
                    return false;
                  }
                }
              } else {
                handlerFuncPre.call(handler, node, parent, prop, index);
              }
            }
          } // Loop over handlers
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      },
      // pre func

      /**
       * Handler on node exit.
       */
      post: function post(node, parent, prop, index) {
        if (!node) {
          return;
        }

        var nodePath = void 0;
        if (!options.asNodes) {
          nodePath = getPathFor(node, parent, prop, index);
        }

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = handlers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var handler = _step2.value;

            // Per-node handler.
            var handlerFuncPost = void 0;
            if (typeof handler[node.type] === 'object' && typeof handler[node.type].post === 'function') {
              handlerFuncPost = handler[node.type].post;
            }

            if (handlerFuncPost) {
              if (nodePath) {
                // A path/node can be removed by some previous handler.
                if (!nodePath.isRemoved()) {
                  var handlerResult = handlerFuncPost.call(handler, nodePath);
                  // Explicitly stop traversal.
                  if (handlerResult === false) {
                    return false;
                  }
                }
              } else {
                handlerFuncPost.call(handler, node, parent, prop, index);
              }
            }
          } // Loop over handlers
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      },
      // post func

      /**
       * Skip locations by default.
       */
      skipProperty: function skipProperty(prop) {
        return prop === 'loc';
      }
    });
  }
};