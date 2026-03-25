/*!
 * @js-sdsl/ordered-map v4.4.2
 * https://github.com/js-sdsl/js-sdsl
 * (c) 2021-present ZLY201 <zilongyao1366@gmail.com>
 * MIT license
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.sdsl = {}));
})(this, (function (exports) { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol */

    var extendStatics = function (d, b) {
      extendStatics = Object.setPrototypeOf || {
        __proto__: []
      } instanceof Array && function (d, b) {
        d.__proto__ = b;
      } || function (d, b) {
        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      };
      return extendStatics(d, b);
    };
    function __extends(d, b) {
      if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }
    function __generator(thisArg, body) {
      var _ = {
          label: 0,
          sent: function () {
            if (t[0] & 1) throw t[1];
            return t[1];
          },
          trys: [],
          ops: []
        },
        f,
        y,
        t,
        g;
      return g = {
        next: verb(0),
        "throw": verb(1),
        "return": verb(2)
      }, typeof Symbol === "function" && (g[Symbol.iterator] = function () {
        return this;
      }), g;
      function verb(n) {
        return function (v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return {
                value: op[1],
                done: false
              };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
          value: op[0] ? op[1] : void 0,
          done: true
        };
      }
    }
    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
      var e = new Error(message);
      return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    var TreeNode = /** @class */function () {
      function TreeNode(key, value, color) {
        if (color === void 0) {
          color = 1 /* TreeNodeColor.RED */;
        }
        this._left = undefined;
        this._right = undefined;
        this._parent = undefined;
        this._key = key;
        this._value = value;
        this._color = color;
      }
      /**
       * @description Get the pre node.
       * @returns TreeNode about the pre node.
       */
      TreeNode.prototype._pre = function () {
        var preNode = this;
        var isRootOrHeader = preNode._parent._parent === preNode;
        if (isRootOrHeader && preNode._color === 1 /* TreeNodeColor.RED */) {
          preNode = preNode._right;
        } else if (preNode._left) {
          preNode = preNode._left;
          while (preNode._right) {
            preNode = preNode._right;
          }
        } else {
          // Must be root and left is null
          if (isRootOrHeader) {
            return preNode._parent;
          }
          var pre = preNode._parent;
          while (pre._left === preNode) {
            preNode = pre;
            pre = preNode._parent;
          }
          preNode = pre;
        }
        return preNode;
      };
      /**
       * @description Get the next node.
       * @returns TreeNode about the next node.
       */
      TreeNode.prototype._next = function () {
        var nextNode = this;
        if (nextNode._right) {
          nextNode = nextNode._right;
          while (nextNode._left) {
            nextNode = nextNode._left;
          }
          return nextNode;
        } else {
          var pre = nextNode._parent;
          while (pre._right === nextNode) {
            nextNode = pre;
            pre = nextNode._parent;
          }
          if (nextNode._right !== pre) {
            return pre;
          } else return nextNode;
        }
      };
      /**
       * @description Rotate left.
       * @returns TreeNode about moved to original position after rotation.
       */
      TreeNode.prototype._rotateLeft = function () {
        var PP = this._parent;
        var V = this._right;
        var R = V._left;
        if (PP._parent === this) PP._parent = V;else if (PP._left === this) PP._left = V;else PP._right = V;
        V._parent = PP;
        V._left = this;
        this._parent = V;
        this._right = R;
        if (R) R._parent = this;
        return V;
      };
      /**
       * @description Rotate right.
       * @returns TreeNode about moved to original position after rotation.
       */
      TreeNode.prototype._rotateRight = function () {
        var PP = this._parent;
        var F = this._left;
        var K = F._right;
        if (PP._parent === this) PP._parent = F;else if (PP._left === this) PP._left = F;else PP._right = F;
        F._parent = PP;
        F._right = this;
        this._parent = F;
        this._left = K;
        if (K) K._parent = this;
        return F;
      };
      return TreeNode;
    }();
    var TreeNodeEnableIndex = /** @class */function (_super) {
      __extends(TreeNodeEnableIndex, _super);
      function TreeNodeEnableIndex() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._subTreeSize = 1;
        return _this;
      }
      /**
       * @description Rotate left and do recount.
       * @returns TreeNode about moved to original position after rotation.
       */
      TreeNodeEnableIndex.prototype._rotateLeft = function () {
        var parent = _super.prototype._rotateLeft.call(this);
        this._recount();
        parent._recount();
        return parent;
      };
      /**
       * @description Rotate right and do recount.
       * @returns TreeNode about moved to original position after rotation.
       */
      TreeNodeEnableIndex.prototype._rotateRight = function () {
        var parent = _super.prototype._rotateRight.call(this);
        this._recount();
        parent._recount();
        return parent;
      };
      TreeNodeEnableIndex.prototype._recount = function () {
        this._subTreeSize = 1;
        if (this._left) {
          this._subTreeSize += this._left._subTreeSize;
        }
        if (this._right) {
          this._subTreeSize += this._right._subTreeSize;
        }
      };
      return TreeNodeEnableIndex;
    }(TreeNode);

    var ContainerIterator = /** @class */function () {
      /**
       * @internal
       */
      function ContainerIterator(iteratorType) {
        if (iteratorType === void 0) {
          iteratorType = 0 /* IteratorType.NORMAL */;
        }
        this.iteratorType = iteratorType;
      }
      /**
       * @param iter - The other iterator you want to compare.
       * @returns Whether this equals to obj.
       * @example
       * container.find(1).equals(container.end());
       */
      ContainerIterator.prototype.equals = function (iter) {
        return this._node === iter._node;
      };
      return ContainerIterator;
    }();
    var Base = /** @class */function () {
      function Base() {
        /**
         * @description Container's size.
         * @internal
         */
        this._length = 0;
      }
      Object.defineProperty(Base.prototype, "length", {
        /**
         * @returns The size of the container.
         * @example
         * const container = new Vector([1, 2]);
         * console.log(container.length); // 2
         */
        get: function () {
          return this._length;
        },
        enumerable: false,
        configurable: true
      });
      /**
       * @returns The size of the container.
       * @example
       * const container = new Vector([1, 2]);
       * console.log(container.size()); // 2
       */
      Base.prototype.size = function () {
        return this._length;
      };
      /**
       * @returns Whether the container is empty.
       * @example
       * container.clear();
       * console.log(container.empty());  // true
       */
      Base.prototype.empty = function () {
        return this._length === 0;
      };
      return Base;
    }();
    var Container = /** @class */function (_super) {
      __extends(Container, _super);
      function Container() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return Container;
    }(Base);

    /**
     * @description Throw an iterator access error.
     * @internal
     */
    function throwIteratorAccessError() {
      throw new RangeError('Iterator access denied!');
    }

    var TreeContainer = /** @class */function (_super) {
      __extends(TreeContainer, _super);
      /**
       * @internal
       */
      function TreeContainer(cmp, enableIndex) {
        if (cmp === void 0) {
          cmp = function (x, y) {
            if (x < y) return -1;
            if (x > y) return 1;
            return 0;
          };
        }
        if (enableIndex === void 0) {
          enableIndex = false;
        }
        var _this = _super.call(this) || this;
        /**
         * @internal
         */
        _this._root = undefined;
        _this._cmp = cmp;
        _this.enableIndex = enableIndex;
        _this._TreeNodeClass = enableIndex ? TreeNodeEnableIndex : TreeNode;
        _this._header = new _this._TreeNodeClass();
        return _this;
      }
      /**
       * @internal
       */
      TreeContainer.prototype._lowerBound = function (curNode, key) {
        var resNode = this._header;
        while (curNode) {
          var cmpResult = this._cmp(curNode._key, key);
          if (cmpResult < 0) {
            curNode = curNode._right;
          } else if (cmpResult > 0) {
            resNode = curNode;
            curNode = curNode._left;
          } else return curNode;
        }
        return resNode;
      };
      /**
       * @internal
       */
      TreeContainer.prototype._upperBound = function (curNode, key) {
        var resNode = this._header;
        while (curNode) {
          var cmpResult = this._cmp(curNode._key, key);
          if (cmpResult <= 0) {
            curNode = curNode._right;
          } else {
            resNode = curNode;
            curNode = curNode._left;
          }
        }
        return resNode;
      };
      /**
       * @internal
       */
      TreeContainer.prototype._reverseLowerBound = function (curNode, key) {
        var resNode = this._header;
        while (curNode) {
          var cmpResult = this._cmp(curNode._key, key);
          if (cmpResult < 0) {
            resNode = curNode;
            curNode = curNode._right;
          } else if (cmpResult > 0) {
            curNode = curNode._left;
          } else return curNode;
        }
        return resNode;
      };
      /**
       * @internal
       */
      TreeContainer.prototype._reverseUpperBound = function (curNode, key) {
        var resNode = this._header;
        while (curNode) {
          var cmpResult = this._cmp(curNode._key, key);
          if (cmpResult < 0) {
            resNode = curNode;
            curNode = curNode._right;
          } else {
            curNode = curNode._left;
          }
        }
        return resNode;
      };
      /**
       * @internal
       */
      TreeContainer.prototype._eraseNodeSelfBalance = function (curNode) {
        while (true) {
          var parentNode = curNode._parent;
          if (parentNode === this._header) return;
          if (curNode._color === 1 /* TreeNodeColor.RED */) {
            curNode._color = 0 /* TreeNodeColor.BLACK */;
            return;
          }
          if (curNode === parentNode._left) {
            var brother = parentNode._right;
            if (brother._color === 1 /* TreeNodeColor.RED */) {
              brother._color = 0 /* TreeNodeColor.BLACK */;
              parentNode._color = 1 /* TreeNodeColor.RED */;
              if (parentNode === this._root) {
                this._root = parentNode._rotateLeft();
              } else parentNode._rotateLeft();
            } else {
              if (brother._right && brother._right._color === 1 /* TreeNodeColor.RED */) {
                brother._color = parentNode._color;
                parentNode._color = 0 /* TreeNodeColor.BLACK */;
                brother._right._color = 0 /* TreeNodeColor.BLACK */;
                if (parentNode === this._root) {
                  this._root = parentNode._rotateLeft();
                } else parentNode._rotateLeft();
                return;
              } else if (brother._left && brother._left._color === 1 /* TreeNodeColor.RED */) {
                brother._color = 1 /* TreeNodeColor.RED */;
                brother._left._color = 0 /* TreeNodeColor.BLACK */;
                brother._rotateRight();
              } else {
                brother._color = 1 /* TreeNodeColor.RED */;
                curNode = parentNode;
              }
            }
          } else {
            var brother = parentNode._left;
            if (brother._color === 1 /* TreeNodeColor.RED */) {
              brother._color = 0 /* TreeNodeColor.BLACK */;
              parentNode._color = 1 /* TreeNodeColor.RED */;
              if (parentNode === this._root) {
                this._root = parentNode._rotateRight();
              } else parentNode._rotateRight();
            } else {
              if (brother._left && brother._left._color === 1 /* TreeNodeColor.RED */) {
                brother._color = parentNode._color;
                parentNode._color = 0 /* TreeNodeColor.BLACK */;
                brother._left._color = 0 /* TreeNodeColor.BLACK */;
                if (parentNode === this._root) {
                  this._root = parentNode._rotateRight();
                } else parentNode._rotateRight();
                return;
              } else if (brother._right && brother._right._color === 1 /* TreeNodeColor.RED */) {
                brother._color = 1 /* TreeNodeColor.RED */;
                brother._right._color = 0 /* TreeNodeColor.BLACK */;
                brother._rotateLeft();
              } else {
                brother._color = 1 /* TreeNodeColor.RED */;
                curNode = parentNode;
              }
            }
          }
        }
      };
      /**
       * @internal
       */
      TreeContainer.prototype._eraseNode = function (curNode) {
        if (this._length === 1) {
          this.clear();
          return;
        }
        var swapNode = curNode;
        while (swapNode._left || swapNode._right) {
          if (swapNode._right) {
            swapNode = swapNode._right;
            while (swapNode._left) swapNode = swapNode._left;
          } else {
            swapNode = swapNode._left;
          }
          var key = curNode._key;
          curNode._key = swapNode._key;
          swapNode._key = key;
          var value = curNode._value;
          curNode._value = swapNode._value;
          swapNode._value = value;
          curNode = swapNode;
        }
        if (this._header._left === swapNode) {
          this._header._left = swapNode._parent;
        } else if (this._header._right === swapNode) {
          this._header._right = swapNode._parent;
        }
        this._eraseNodeSelfBalance(swapNode);
        var _parent = swapNode._parent;
        if (swapNode === _parent._left) {
          _parent._left = undefined;
        } else _parent._right = undefined;
        this._length -= 1;
        this._root._color = 0 /* TreeNodeColor.BLACK */;
        if (this.enableIndex) {
          while (_parent !== this._header) {
            _parent._subTreeSize -= 1;
            _parent = _parent._parent;
          }
        }
      };
      /**
       * @internal
       */
      TreeContainer.prototype._inOrderTraversal = function (param) {
        var pos = typeof param === 'number' ? param : undefined;
        var callback = typeof param === 'function' ? param : undefined;
        var nodeList = typeof param === 'undefined' ? [] : undefined;
        var index = 0;
        var curNode = this._root;
        var stack = [];
        while (stack.length || curNode) {
          if (curNode) {
            stack.push(curNode);
            curNode = curNode._left;
          } else {
            curNode = stack.pop();
            if (index === pos) return curNode;
            nodeList && nodeList.push(curNode);
            callback && callback(curNode, index, this);
            index += 1;
            curNode = curNode._right;
          }
        }
        return nodeList;
      };
      /**
       * @internal
       */
      TreeContainer.prototype._insertNodeSelfBalance = function (curNode) {
        while (true) {
          var parentNode = curNode._parent;
          if (parentNode._color === 0 /* TreeNodeColor.BLACK */) return;
          var grandParent = parentNode._parent;
          if (parentNode === grandParent._left) {
            var uncle = grandParent._right;
            if (uncle && uncle._color === 1 /* TreeNodeColor.RED */) {
              uncle._color = parentNode._color = 0 /* TreeNodeColor.BLACK */;
              if (grandParent === this._root) return;
              grandParent._color = 1 /* TreeNodeColor.RED */;
              curNode = grandParent;
              continue;
            } else if (curNode === parentNode._right) {
              curNode._color = 0 /* TreeNodeColor.BLACK */;
              if (curNode._left) {
                curNode._left._parent = parentNode;
              }
              if (curNode._right) {
                curNode._right._parent = grandParent;
              }
              parentNode._right = curNode._left;
              grandParent._left = curNode._right;
              curNode._left = parentNode;
              curNode._right = grandParent;
              if (grandParent === this._root) {
                this._root = curNode;
                this._header._parent = curNode;
              } else {
                var GP = grandParent._parent;
                if (GP._left === grandParent) {
                  GP._left = curNode;
                } else GP._right = curNode;
              }
              curNode._parent = grandParent._parent;
              parentNode._parent = curNode;
              grandParent._parent = curNode;
              grandParent._color = 1 /* TreeNodeColor.RED */;
            } else {
              parentNode._color = 0 /* TreeNodeColor.BLACK */;
              if (grandParent === this._root) {
                this._root = grandParent._rotateRight();
              } else grandParent._rotateRight();
              grandParent._color = 1 /* TreeNodeColor.RED */;
              return;
            }
          } else {
            var uncle = grandParent._left;
            if (uncle && uncle._color === 1 /* TreeNodeColor.RED */) {
              uncle._color = parentNode._color = 0 /* TreeNodeColor.BLACK */;
              if (grandParent === this._root) return;
              grandParent._color = 1 /* TreeNodeColor.RED */;
              curNode = grandParent;
              continue;
            } else if (curNode === parentNode._left) {
              curNode._color = 0 /* TreeNodeColor.BLACK */;
              if (curNode._left) {
                curNode._left._parent = grandParent;
              }
              if (curNode._right) {
                curNode._right._parent = parentNode;
              }
              grandParent._right = curNode._left;
              parentNode._left = curNode._right;
              curNode._left = grandParent;
              curNode._right = parentNode;
              if (grandParent === this._root) {
                this._root = curNode;
                this._header._parent = curNode;
              } else {
                var GP = grandParent._parent;
                if (GP._left === grandParent) {
                  GP._left = curNode;
                } else GP._right = curNode;
              }
              curNode._parent = grandParent._parent;
              parentNode._parent = curNode;
              grandParent._parent = curNode;
              grandParent._color = 1 /* TreeNodeColor.RED */;
            } else {
              parentNode._color = 0 /* TreeNodeColor.BLACK */;
              if (grandParent === this._root) {
                this._root = grandParent._rotateLeft();
              } else grandParent._rotateLeft();
              grandParent._color = 1 /* TreeNodeColor.RED */;
              return;
            }
          }
          if (this.enableIndex) {
            parentNode._recount();
            grandParent._recount();
            curNode._recount();
          }
          return;
        }
      };
      /**
       * @internal
       */
      TreeContainer.prototype._set = function (key, value, hint) {
        if (this._root === undefined) {
          this._length += 1;
          this._root = new this._TreeNodeClass(key, value, 0 /* TreeNodeColor.BLACK */);
          this._root._parent = this._header;
          this._header._parent = this._header._left = this._header._right = this._root;
          return this._length;
        }
        var curNode;
        var minNode = this._header._left;
        var compareToMin = this._cmp(minNode._key, key);
        if (compareToMin === 0) {
          minNode._value = value;
          return this._length;
        } else if (compareToMin > 0) {
          minNode._left = new this._TreeNodeClass(key, value);
          minNode._left._parent = minNode;
          curNode = minNode._left;
          this._header._left = curNode;
        } else {
          var maxNode = this._header._right;
          var compareToMax = this._cmp(maxNode._key, key);
          if (compareToMax === 0) {
            maxNode._value = value;
            return this._length;
          } else if (compareToMax < 0) {
            maxNode._right = new this._TreeNodeClass(key, value);
            maxNode._right._parent = maxNode;
            curNode = maxNode._right;
            this._header._right = curNode;
          } else {
            if (hint !== undefined) {
              var iterNode = hint._node;
              if (iterNode !== this._header) {
                var iterCmpRes = this._cmp(iterNode._key, key);
                if (iterCmpRes === 0) {
                  iterNode._value = value;
                  return this._length;
                } else /* istanbul ignore else */if (iterCmpRes > 0) {
                    var preNode = iterNode._pre();
                    var preCmpRes = this._cmp(preNode._key, key);
                    if (preCmpRes === 0) {
                      preNode._value = value;
                      return this._length;
                    } else if (preCmpRes < 0) {
                      curNode = new this._TreeNodeClass(key, value);
                      if (preNode._right === undefined) {
                        preNode._right = curNode;
                        curNode._parent = preNode;
                      } else {
                        iterNode._left = curNode;
                        curNode._parent = iterNode;
                      }
                    }
                  }
              }
            }
            if (curNode === undefined) {
              curNode = this._root;
              while (true) {
                var cmpResult = this._cmp(curNode._key, key);
                if (cmpResult > 0) {
                  if (curNode._left === undefined) {
                    curNode._left = new this._TreeNodeClass(key, value);
                    curNode._left._parent = curNode;
                    curNode = curNode._left;
                    break;
                  }
                  curNode = curNode._left;
                } else if (cmpResult < 0) {
                  if (curNode._right === undefined) {
                    curNode._right = new this._TreeNodeClass(key, value);
                    curNode._right._parent = curNode;
                    curNode = curNode._right;
                    break;
                  }
                  curNode = curNode._right;
                } else {
                  curNode._value = value;
                  return this._length;
                }
              }
            }
          }
        }
        if (this.enableIndex) {
          var parent_1 = curNode._parent;
          while (parent_1 !== this._header) {
            parent_1._subTreeSize += 1;
            parent_1 = parent_1._parent;
          }
        }
        this._insertNodeSelfBalance(curNode);
        this._length += 1;
        return this._length;
      };
      /**
       * @internal
       */
      TreeContainer.prototype._getTreeNodeByKey = function (curNode, key) {
        while (curNode) {
          var cmpResult = this._cmp(curNode._key, key);
          if (cmpResult < 0) {
            curNode = curNode._right;
          } else if (cmpResult > 0) {
            curNode = curNode._left;
          } else return curNode;
        }
        return curNode || this._header;
      };
      TreeContainer.prototype.clear = function () {
        this._length = 0;
        this._root = undefined;
        this._header._parent = undefined;
        this._header._left = this._header._right = undefined;
      };
      /**
       * @description Update node's key by iterator.
       * @param iter - The iterator you want to change.
       * @param key - The key you want to update.
       * @returns Whether the modification is successful.
       * @example
       * const st = new orderedSet([1, 2, 5]);
       * const iter = st.find(2);
       * st.updateKeyByIterator(iter, 3); // then st will become [1, 3, 5]
       */
      TreeContainer.prototype.updateKeyByIterator = function (iter, key) {
        var node = iter._node;
        if (node === this._header) {
          throwIteratorAccessError();
        }
        if (this._length === 1) {
          node._key = key;
          return true;
        }
        var nextKey = node._next()._key;
        if (node === this._header._left) {
          if (this._cmp(nextKey, key) > 0) {
            node._key = key;
            return true;
          }
          return false;
        }
        var preKey = node._pre()._key;
        if (node === this._header._right) {
          if (this._cmp(preKey, key) < 0) {
            node._key = key;
            return true;
          }
          return false;
        }
        if (this._cmp(preKey, key) >= 0 || this._cmp(nextKey, key) <= 0) return false;
        node._key = key;
        return true;
      };
      TreeContainer.prototype.eraseElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var node = this._inOrderTraversal(pos);
        this._eraseNode(node);
        return this._length;
      };
      /**
       * @description Remove the element of the specified key.
       * @param key - The key you want to remove.
       * @returns Whether erase successfully.
       */
      TreeContainer.prototype.eraseElementByKey = function (key) {
        if (this._length === 0) return false;
        var curNode = this._getTreeNodeByKey(this._root, key);
        if (curNode === this._header) return false;
        this._eraseNode(curNode);
        return true;
      };
      TreeContainer.prototype.eraseElementByIterator = function (iter) {
        var node = iter._node;
        if (node === this._header) {
          throwIteratorAccessError();
        }
        var hasNoRight = node._right === undefined;
        var isNormal = iter.iteratorType === 0 /* IteratorType.NORMAL */;
        // For the normal iterator, the `next` node will be swapped to `this` node when has right.
        if (isNormal) {
          // So we should move it to next when it's right is null.
          if (hasNoRight) iter.next();
        } else {
          // For the reverse iterator, only when it doesn't have right and has left the `next` node will be swapped.
          // So when it has right, or it is a leaf node we should move it to `next`.
          if (!hasNoRight || node._left === undefined) iter.next();
        }
        this._eraseNode(node);
        return iter;
      };
      /**
       * @description Get the height of the tree.
       * @returns Number about the height of the RB-tree.
       */
      TreeContainer.prototype.getHeight = function () {
        if (this._length === 0) return 0;
        function traversal(curNode) {
          if (!curNode) return 0;
          return Math.max(traversal(curNode._left), traversal(curNode._right)) + 1;
        }
        return traversal(this._root);
      };
      return TreeContainer;
    }(Container);

    var TreeIterator = /** @class */function (_super) {
      __extends(TreeIterator, _super);
      /**
       * @internal
       */
      function TreeIterator(node, header, iteratorType) {
        var _this = _super.call(this, iteratorType) || this;
        _this._node = node;
        _this._header = header;
        if (_this.iteratorType === 0 /* IteratorType.NORMAL */) {
          _this.pre = function () {
            if (this._node === this._header._left) {
              throwIteratorAccessError();
            }
            this._node = this._node._pre();
            return this;
          };
          _this.next = function () {
            if (this._node === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._next();
            return this;
          };
        } else {
          _this.pre = function () {
            if (this._node === this._header._right) {
              throwIteratorAccessError();
            }
            this._node = this._node._next();
            return this;
          };
          _this.next = function () {
            if (this._node === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._pre();
            return this;
          };
        }
        return _this;
      }
      Object.defineProperty(TreeIterator.prototype, "index", {
        /**
         * @description Get the sequential index of the iterator in the tree container.<br/>
         *              <strong>Note:</strong>
         *              This function only takes effect when the specified tree container `enableIndex = true`.
         * @returns The index subscript of the node in the tree.
         * @example
         * const st = new OrderedSet([1, 2, 3], true);
         * console.log(st.begin().next().index);  // 1
         */
        get: function () {
          var _node = this._node;
          var root = this._header._parent;
          if (_node === this._header) {
            if (root) {
              return root._subTreeSize - 1;
            }
            return 0;
          }
          var index = 0;
          if (_node._left) {
            index += _node._left._subTreeSize;
          }
          while (_node !== root) {
            var _parent = _node._parent;
            if (_node === _parent._right) {
              index += 1;
              if (_parent._left) {
                index += _parent._left._subTreeSize;
              }
            }
            _node = _parent;
          }
          return index;
        },
        enumerable: false,
        configurable: true
      });
      TreeIterator.prototype.isAccessible = function () {
        return this._node !== this._header;
      };
      return TreeIterator;
    }(ContainerIterator);

    var OrderedMapIterator = /** @class */function (_super) {
      __extends(OrderedMapIterator, _super);
      function OrderedMapIterator(node, header, container, iteratorType) {
        var _this = _super.call(this, node, header, iteratorType) || this;
        _this.container = container;
        return _this;
      }
      Object.defineProperty(OrderedMapIterator.prototype, "pointer", {
        get: function () {
          if (this._node === this._header) {
            throwIteratorAccessError();
          }
          var self = this;
          return new Proxy([], {
            get: function (target, prop) {
              if (prop === '0') return self._node._key;else if (prop === '1') return self._node._value;
              target[0] = self._node._key;
              target[1] = self._node._value;
              return target[prop];
            },
            set: function (_, prop, newValue) {
              if (prop !== '1') {
                throw new TypeError('prop must be 1');
              }
              self._node._value = newValue;
              return true;
            }
          });
        },
        enumerable: false,
        configurable: true
      });
      OrderedMapIterator.prototype.copy = function () {
        return new OrderedMapIterator(this._node, this._header, this.container, this.iteratorType);
      };
      return OrderedMapIterator;
    }(TreeIterator);
    var OrderedMap = /** @class */function (_super) {
      __extends(OrderedMap, _super);
      /**
       * @param container - The initialization container.
       * @param cmp - The compare function.
       * @param enableIndex - Whether to enable iterator indexing function.
       * @example
       * new OrderedMap();
       * new OrderedMap([[0, 1], [2, 1]]);
       * new OrderedMap([[0, 1], [2, 1]], (x, y) => x - y);
       * new OrderedMap([[0, 1], [2, 1]], (x, y) => x - y, true);
       */
      function OrderedMap(container, cmp, enableIndex) {
        if (container === void 0) {
          container = [];
        }
        var _this = _super.call(this, cmp, enableIndex) || this;
        var self = _this;
        container.forEach(function (el) {
          self.setElement(el[0], el[1]);
        });
        return _this;
      }
      OrderedMap.prototype.begin = function () {
        return new OrderedMapIterator(this._header._left || this._header, this._header, this);
      };
      OrderedMap.prototype.end = function () {
        return new OrderedMapIterator(this._header, this._header, this);
      };
      OrderedMap.prototype.rBegin = function () {
        return new OrderedMapIterator(this._header._right || this._header, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      OrderedMap.prototype.rEnd = function () {
        return new OrderedMapIterator(this._header, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      OrderedMap.prototype.front = function () {
        if (this._length === 0) return;
        var minNode = this._header._left;
        return [minNode._key, minNode._value];
      };
      OrderedMap.prototype.back = function () {
        if (this._length === 0) return;
        var maxNode = this._header._right;
        return [maxNode._key, maxNode._value];
      };
      OrderedMap.prototype.lowerBound = function (key) {
        var resNode = this._lowerBound(this._root, key);
        return new OrderedMapIterator(resNode, this._header, this);
      };
      OrderedMap.prototype.upperBound = function (key) {
        var resNode = this._upperBound(this._root, key);
        return new OrderedMapIterator(resNode, this._header, this);
      };
      OrderedMap.prototype.reverseLowerBound = function (key) {
        var resNode = this._reverseLowerBound(this._root, key);
        return new OrderedMapIterator(resNode, this._header, this);
      };
      OrderedMap.prototype.reverseUpperBound = function (key) {
        var resNode = this._reverseUpperBound(this._root, key);
        return new OrderedMapIterator(resNode, this._header, this);
      };
      OrderedMap.prototype.forEach = function (callback) {
        this._inOrderTraversal(function (node, index, map) {
          callback([node._key, node._value], index, map);
        });
      };
      /**
       * @description Insert a key-value pair or set value by the given key.
       * @param key - The key want to insert.
       * @param value - The value want to set.
       * @param hint - You can give an iterator hint to improve insertion efficiency.
       * @return The size of container after setting.
       * @example
       * const mp = new OrderedMap([[2, 0], [4, 0], [5, 0]]);
       * const iter = mp.begin();
       * mp.setElement(1, 0);
       * mp.setElement(3, 0, iter);  // give a hint will be faster.
       */
      OrderedMap.prototype.setElement = function (key, value, hint) {
        return this._set(key, value, hint);
      };
      OrderedMap.prototype.getElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var node = this._inOrderTraversal(pos);
        return [node._key, node._value];
      };
      OrderedMap.prototype.find = function (key) {
        var curNode = this._getTreeNodeByKey(this._root, key);
        return new OrderedMapIterator(curNode, this._header, this);
      };
      /**
       * @description Get the value of the element of the specified key.
       * @param key - The specified key you want to get.
       * @example
       * const val = container.getElementByKey(1);
       */
      OrderedMap.prototype.getElementByKey = function (key) {
        var curNode = this._getTreeNodeByKey(this._root, key);
        return curNode._value;
      };
      OrderedMap.prototype.union = function (other) {
        var self = this;
        other.forEach(function (el) {
          self.setElement(el[0], el[1]);
        });
        return this._length;
      };
      OrderedMap.prototype[Symbol.iterator] = function () {
        var length, nodeList, i, node;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              length = this._length;
              nodeList = this._inOrderTraversal();
              i = 0;
              _a.label = 1;
            case 1:
              if (!(i < length)) return [3 /*break*/, 4];
              node = nodeList[i];
              return [4 /*yield*/, [node._key, node._value]];
            case 2:
              _a.sent();
              _a.label = 3;
            case 3:
              ++i;
              return [3 /*break*/, 1];
            case 4:
              return [2 /*return*/];
          }
        });
      };

      return OrderedMap;
    }(TreeContainer);

    exports.OrderedMap = OrderedMap;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
