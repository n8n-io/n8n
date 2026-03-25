/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_COLLECTION_PROP = 'expressions';
var DEFAULT_SINGLE_PROP = 'expression';

/**
 * NodePath class encapsulates a traversing node,
 * its parent node, property name in the parent node, and
 * an index (in case if a node is part of a collection).
 * It also provides set of methods for AST manipulation.
 */

var NodePath = function () {
  /**
   * NodePath constructor.
   *
   * @param Object node - an AST node
   * @param NodePath parentPath - a nullable parent path
   * @param string property - property name of the node in the parent
   * @param number index - index of the node in a collection.
   */
  function NodePath(node) {
    var parentPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var property = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var index = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    _classCallCheck(this, NodePath);

    this.node = node;
    this.parentPath = parentPath;
    this.parent = parentPath ? parentPath.node : null;
    this.property = property;
    this.index = index;
  }

  _createClass(NodePath, [{
    key: '_enforceProp',
    value: function _enforceProp(property) {
      if (!this.node.hasOwnProperty(property)) {
        throw new Error('Node of type ' + this.node.type + ' doesn\'t have "' + property + '" collection.');
      }
    }

    /**
     * Sets a node into a children collection or the single child.
     * By default child nodes are supposed to be under `expressions` property.
     * An explicit property can be passed.
     *
     * @param Object node - a node to set into a collection or as single child
     * @param number index - index at which to set
     * @param string property - name of the collection or single property
     */

  }, {
    key: 'setChild',
    value: function setChild(node) {
      var index = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var property = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;


      var childPath = void 0;
      if (index != null) {
        if (!property) {
          property = DEFAULT_COLLECTION_PROP;
        }
        this._enforceProp(property);
        this.node[property][index] = node;
        childPath = NodePath.getForNode(node, this, property, index);
      } else {
        if (!property) {
          property = DEFAULT_SINGLE_PROP;
        }
        this._enforceProp(property);
        this.node[property] = node;
        childPath = NodePath.getForNode(node, this, property, null);
      }
      return childPath;
    }

    /**
     * Appends a node to a children collection.
     * By default child nodes are supposed to be under `expressions` property.
     * An explicit property can be passed.
     *
     * @param Object node - a node to set into a collection or as single child
     * @param string property - name of the collection or single property
     */

  }, {
    key: 'appendChild',
    value: function appendChild(node) {
      var property = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;


      if (!property) {
        property = DEFAULT_COLLECTION_PROP;
      }
      this._enforceProp(property);
      var end = this.node[property].length;
      return this.setChild(node, end, property);
    }

    /**
     * Inserts a node into a collection.
     * By default child nodes are supposed to be under `expressions` property.
     * An explicit property can be passed.
     *
     * @param Object node - a node to insert into a collection
     * @param number index - index at which to insert
     * @param string property - name of the collection property
     */

  }, {
    key: 'insertChildAt',
    value: function insertChildAt(node, index) {
      var property = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : DEFAULT_COLLECTION_PROP;

      this._enforceProp(property);

      this.node[property].splice(index, 0, node);

      // If we inserted a node before the traversing index,
      // we should increase the later.
      if (index <= NodePath.getTraversingIndex()) {
        NodePath.updateTraversingIndex(+1);
      }

      this._rebuildIndex(this.node, property);
    }

    /**
     * Removes a node.
     */

  }, {
    key: 'remove',
    value: function remove() {
      if (this.isRemoved()) {
        return;
      }
      NodePath.registry.delete(this.node);

      this.node = null;

      if (!this.parent) {
        return;
      }

      // A node is in a collection.
      if (this.index !== null) {
        this.parent[this.property].splice(this.index, 1);

        // If we remove a node before the traversing index,
        // we should increase the later.
        if (this.index <= NodePath.getTraversingIndex()) {
          NodePath.updateTraversingIndex(-1);
        }

        // Rebuild index.
        this._rebuildIndex(this.parent, this.property);

        this.index = null;
        this.property = null;

        return;
      }

      // A simple node.
      delete this.parent[this.property];
      this.property = null;
    }

    /**
     * Rebuilds child nodes index (used on remove/insert).
     */

  }, {
    key: '_rebuildIndex',
    value: function _rebuildIndex(parent, property) {
      var parentPath = NodePath.getForNode(parent);

      for (var i = 0; i < parent[property].length; i++) {
        var path = NodePath.getForNode(parent[property][i], parentPath, property, i);
        path.index = i;
      }
    }

    /**
     * Whether the path was removed.
     */

  }, {
    key: 'isRemoved',
    value: function isRemoved() {
      return this.node === null;
    }

    /**
     * Replaces a node with the passed one.
     */

  }, {
    key: 'replace',
    value: function replace(newNode) {
      NodePath.registry.delete(this.node);

      this.node = newNode;

      if (!this.parent) {
        return null;
      }

      // A node is in a collection.
      if (this.index !== null) {
        this.parent[this.property][this.index] = newNode;
      }

      // A simple node.
      else {
          this.parent[this.property] = newNode;
        }

      // Rebuild the node path for the new node.
      return NodePath.getForNode(newNode, this.parentPath, this.property, this.index);
    }

    /**
     * Updates a node inline.
     */

  }, {
    key: 'update',
    value: function update(nodeProps) {
      Object.assign(this.node, nodeProps);
    }

    /**
     * Returns parent.
     */

  }, {
    key: 'getParent',
    value: function getParent() {
      return this.parentPath;
    }

    /**
     * Returns nth child.
     */

  }, {
    key: 'getChild',
    value: function getChild() {
      var n = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      if (this.node.expressions) {
        return NodePath.getForNode(this.node.expressions[n], this, DEFAULT_COLLECTION_PROP, n);
      } else if (this.node.expression && n == 0) {
        return NodePath.getForNode(this.node.expression, this, DEFAULT_SINGLE_PROP);
      }
      return null;
    }

    /**
     * Whether a path node is syntactically equal to the passed one.
     *
     * NOTE: we don't rely on `source` property from the `loc` data
     * (which would be the fastest comparison), since it might be unsync
     * after several modifications. We use here simple `JSON.stringify`
     * excluding the `loc` data.
     *
     * @param NodePath other - path to compare to.
     * @return boolean
     */

  }, {
    key: 'hasEqualSource',
    value: function hasEqualSource(path) {
      return JSON.stringify(this.node, jsonSkipLoc) === JSON.stringify(path.node, jsonSkipLoc);
    }

    /**
     * JSON-encodes a node skipping location.
     */

  }, {
    key: 'jsonEncode',
    value: function jsonEncode() {
      var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          format = _ref.format,
          useLoc = _ref.useLoc;

      return JSON.stringify(this.node, useLoc ? null : jsonSkipLoc, format);
    }

    /**
     * Returns previous sibling.
     */

  }, {
    key: 'getPreviousSibling',
    value: function getPreviousSibling() {
      if (!this.parent || this.index == null) {
        return null;
      }
      return NodePath.getForNode(this.parent[this.property][this.index - 1], NodePath.getForNode(this.parent), this.property, this.index - 1);
    }

    /**
     * Returns next sibling.
     */

  }, {
    key: 'getNextSibling',
    value: function getNextSibling() {
      if (!this.parent || this.index == null) {
        return null;
      }
      return NodePath.getForNode(this.parent[this.property][this.index + 1], NodePath.getForNode(this.parent), this.property, this.index + 1);
    }

    /**
     * Returns a NodePath instance for a node.
     *
     * The same NodePath can be reused in several places, e.g.
     * a parent node passed for all its children.
     */

  }], [{
    key: 'getForNode',
    value: function getForNode(node) {
      var parentPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var prop = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var index = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : -1;

      if (!node) {
        return null;
      }

      if (!NodePath.registry.has(node)) {
        NodePath.registry.set(node, new NodePath(node, parentPath, prop, index == -1 ? null : index));
      }

      var path = NodePath.registry.get(node);

      if (parentPath !== null) {
        path.parentPath = parentPath;
        path.parent = path.parentPath.node;
      }

      if (prop !== null) {
        path.property = prop;
      }

      if (index >= 0) {
        path.index = index;
      }

      return path;
    }

    /**
     * Initializes the NodePath registry. The registry is a map from
     * a node to its NodePath instance.
     */

  }, {
    key: 'initRegistry',
    value: function initRegistry() {
      if (!NodePath.registry) {
        NodePath.registry = new Map();
      }
      NodePath.registry.clear();
    }

    /**
     * Updates index of a currently traversing collection.
     */

  }, {
    key: 'updateTraversingIndex',
    value: function updateTraversingIndex(dx) {
      return NodePath.traversingIndexStack[NodePath.traversingIndexStack.length - 1] += dx;
    }

    /**
     * Returns current traversing index.
     */

  }, {
    key: 'getTraversingIndex',
    value: function getTraversingIndex() {
      return NodePath.traversingIndexStack[NodePath.traversingIndexStack.length - 1];
    }
  }]);

  return NodePath;
}();

NodePath.initRegistry();

/**
 * Index of a currently traversing collection is stored on top of the
 * `NodePath.traversingIndexStack`. Remove/insert methods can adjust
 * this index.
 */
NodePath.traversingIndexStack = [];

// Helper function used to skip `loc` in JSON operations.
function jsonSkipLoc(prop, value) {
  if (prop === 'loc') {
    return undefined;
  }
  return value;
}

module.exports = NodePath;