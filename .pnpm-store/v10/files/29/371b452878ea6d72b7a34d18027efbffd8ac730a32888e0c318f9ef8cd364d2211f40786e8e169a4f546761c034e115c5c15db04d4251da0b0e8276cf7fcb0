/*!
 * js-sdsl v4.3.0
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
    /* global Reflect, Promise */

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
    function __values(o) {
      var s = typeof Symbol === "function" && Symbol.iterator,
        m = s && o[s],
        i = 0;
      if (m) return m.call(o);
      if (o && typeof o.length === "number") return {
        next: function () {
          if (o && i >= o.length) o = void 0;
          return {
            value: o && o[i++],
            done: !o
          };
        }
      };
      throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }
    function __read(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o),
        r,
        ar = [],
        e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = {
          error: error
        };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    }
    function __spreadArray(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    }

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

    var Stack = /** @class */function (_super) {
      __extends(Stack, _super);
      function Stack(container) {
        if (container === void 0) {
          container = [];
        }
        var _this = _super.call(this) || this;
        /**
         * @internal
         */
        _this._stack = [];
        var self = _this;
        container.forEach(function (el) {
          self.push(el);
        });
        return _this;
      }
      Stack.prototype.clear = function () {
        this._length = 0;
        this._stack = [];
      };
      /**
       * @description Insert element to stack's end.
       * @description The element you want to push to the back.
       * @returns The container length after erasing.
       */
      Stack.prototype.push = function (element) {
        this._stack.push(element);
        this._length += 1;
        return this._length;
      };
      /**
       * @description Removes the end element.
       * @returns The element you popped.
       */
      Stack.prototype.pop = function () {
        if (this._length === 0) return;
        this._length -= 1;
        return this._stack.pop();
      };
      /**
       * @description Accesses the end element.
       * @returns The last element.
       */
      Stack.prototype.top = function () {
        return this._stack[this._length - 1];
      };
      return Stack;
    }(Base);

    var Queue = /** @class */function (_super) {
      __extends(Queue, _super);
      function Queue(container) {
        if (container === void 0) {
          container = [];
        }
        var _this = _super.call(this) || this;
        /**
         * @internal
         */
        _this._first = 0;
        /**
         * @internal
         */
        _this._queue = [];
        var self = _this;
        container.forEach(function (el) {
          self.push(el);
        });
        return _this;
      }
      Queue.prototype.clear = function () {
        this._queue = [];
        this._length = this._first = 0;
      };
      /**
       * @description Inserts element to queue's end.
       * @param element - The element you want to push to the front.
       * @returns The container length after pushing.
       */
      Queue.prototype.push = function (element) {
        var capacity = this._queue.length;
        if (this._first / capacity > 0.5 /* QUEUE_CONSTANT.ALLOCATE_SIGMA */ && this._first + this._length >= capacity && capacity > 4096 /* QUEUE_CONSTANT.MIN_ALLOCATE_SIZE */) {
          var length_1 = this._length;
          for (var i = 0; i < length_1; ++i) {
            this._queue[i] = this._queue[this._first + i];
          }
          this._first = 0;
          this._queue[this._length] = element;
        } else this._queue[this._first + this._length] = element;
        return ++this._length;
      };
      /**
       * @description Removes the first element.
       * @returns The element you popped.
       */
      Queue.prototype.pop = function () {
        if (this._length === 0) return;
        var el = this._queue[this._first++];
        this._length -= 1;
        return el;
      };
      /**
       * @description Access the first element.
       * @returns The first element.
       */
      Queue.prototype.front = function () {
        if (this._length === 0) return;
        return this._queue[this._first];
      };
      return Queue;
    }(Base);

    var PriorityQueue = /** @class */function (_super) {
      __extends(PriorityQueue, _super);
      /**
       * @description PriorityQueue's constructor.
       * @param container - Initialize container, must have a forEach function.
       * @param cmp - Compare function.
       * @param copy - When the container is an array, you can choose to directly operate on the original object of
       *               the array or perform a shallow copy. The default is shallow copy.
       * @example
       * new PriorityQueue();
       * new PriorityQueue([1, 2, 3]);
       * new PriorityQueue([1, 2, 3], (x, y) => x - y);
       * new PriorityQueue([1, 2, 3], (x, y) => x - y, false);
       */
      function PriorityQueue(container, cmp, copy) {
        if (container === void 0) {
          container = [];
        }
        if (cmp === void 0) {
          cmp = function (x, y) {
            if (x > y) return -1;
            if (x < y) return 1;
            return 0;
          };
        }
        if (copy === void 0) {
          copy = true;
        }
        var _this = _super.call(this) || this;
        _this._cmp = cmp;
        if (Array.isArray(container)) {
          _this._priorityQueue = copy ? __spreadArray([], __read(container), false) : container;
        } else {
          _this._priorityQueue = [];
          var self_1 = _this;
          container.forEach(function (el) {
            self_1._priorityQueue.push(el);
          });
        }
        _this._length = _this._priorityQueue.length;
        var halfLength = _this._length >> 1;
        for (var parent_1 = _this._length - 1 >> 1; parent_1 >= 0; --parent_1) {
          _this._pushDown(parent_1, halfLength);
        }
        return _this;
      }
      /**
       * @internal
       */
      PriorityQueue.prototype._pushUp = function (pos) {
        var item = this._priorityQueue[pos];
        while (pos > 0) {
          var parent_2 = pos - 1 >> 1;
          var parentItem = this._priorityQueue[parent_2];
          if (this._cmp(parentItem, item) <= 0) break;
          this._priorityQueue[pos] = parentItem;
          pos = parent_2;
        }
        this._priorityQueue[pos] = item;
      };
      /**
       * @internal
       */
      PriorityQueue.prototype._pushDown = function (pos, halfLength) {
        var item = this._priorityQueue[pos];
        while (pos < halfLength) {
          var left = pos << 1 | 1;
          var right = left + 1;
          var minItem = this._priorityQueue[left];
          if (right < this._length && this._cmp(minItem, this._priorityQueue[right]) > 0) {
            left = right;
            minItem = this._priorityQueue[right];
          }
          if (this._cmp(minItem, item) >= 0) break;
          this._priorityQueue[pos] = minItem;
          pos = left;
        }
        this._priorityQueue[pos] = item;
      };
      PriorityQueue.prototype.clear = function () {
        this._length = 0;
        this._priorityQueue.length = 0;
      };
      /**
       * @description Push element into a container in order.
       * @param item - The element you want to push.
       * @returns The size of heap after pushing.
       * @example
       * queue.push(1);
       */
      PriorityQueue.prototype.push = function (item) {
        this._priorityQueue.push(item);
        this._pushUp(this._length);
        this._length += 1;
      };
      /**
       * @description Removes the top element.
       * @returns The element you popped.
       * @example
       * queue.pop();
       */
      PriorityQueue.prototype.pop = function () {
        if (this._length === 0) return;
        var value = this._priorityQueue[0];
        var last = this._priorityQueue.pop();
        this._length -= 1;
        if (this._length) {
          this._priorityQueue[0] = last;
          this._pushDown(0, this._length >> 1);
        }
        return value;
      };
      /**
       * @description Accesses the top element.
       * @example
       * const top = queue.top();
       */
      PriorityQueue.prototype.top = function () {
        return this._priorityQueue[0];
      };
      /**
       * @description Check if element is in heap.
       * @param item - The item want to find.
       * @returns Whether element is in heap.
       * @example
       * const que = new PriorityQueue([], (x, y) => x.id - y.id);
       * const obj = { id: 1 };
       * que.push(obj);
       * console.log(que.find(obj));  // true
       */
      PriorityQueue.prototype.find = function (item) {
        return this._priorityQueue.indexOf(item) >= 0;
      };
      /**
       * @description Remove specified item from heap.
       * @param item - The item want to remove.
       * @returns Whether remove success.
       * @example
       * const que = new PriorityQueue([], (x, y) => x.id - y.id);
       * const obj = { id: 1 };
       * que.push(obj);
       * que.remove(obj);
       */
      PriorityQueue.prototype.remove = function (item) {
        var index = this._priorityQueue.indexOf(item);
        if (index < 0) return false;
        if (index === 0) {
          this.pop();
        } else if (index === this._length - 1) {
          this._priorityQueue.pop();
          this._length -= 1;
        } else {
          this._priorityQueue.splice(index, 1, this._priorityQueue.pop());
          this._length -= 1;
          this._pushUp(index);
          this._pushDown(index, this._length >> 1);
        }
        return true;
      };
      /**
       * @description Update item and it's pos in the heap.
       * @param item - The item want to update.
       * @returns Whether update success.
       * @example
       * const que = new PriorityQueue([], (x, y) => x.id - y.id);
       * const obj = { id: 1 };
       * que.push(obj);
       * obj.id = 2;
       * que.updateItem(obj);
       */
      PriorityQueue.prototype.updateItem = function (item) {
        var index = this._priorityQueue.indexOf(item);
        if (index < 0) return false;
        this._pushUp(index);
        this._pushDown(index, this._length >> 1);
        return true;
      };
      /**
       * @returns Return a copy array of heap.
       * @example
       * const arr = queue.toArray();
       */
      PriorityQueue.prototype.toArray = function () {
        return __spreadArray([], __read(this._priorityQueue), false);
      };
      return PriorityQueue;
    }(Base);

    var SequentialContainer = /** @class */function (_super) {
      __extends(SequentialContainer, _super);
      function SequentialContainer() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return SequentialContainer;
    }(Container);

    /**
     * @description Throw an iterator access error.
     * @internal
     */
    function throwIteratorAccessError() {
      throw new RangeError('Iterator access denied!');
    }

    var RandomIterator = /** @class */function (_super) {
      __extends(RandomIterator, _super);
      /**
       * @internal
       */
      function RandomIterator(index, iteratorType) {
        var _this = _super.call(this, iteratorType) || this;
        _this._node = index;
        if (_this.iteratorType === 0 /* IteratorType.NORMAL */) {
          _this.pre = function () {
            if (this._node === 0) {
              throwIteratorAccessError();
            }
            this._node -= 1;
            return this;
          };
          _this.next = function () {
            if (this._node === this.container.size()) {
              throwIteratorAccessError();
            }
            this._node += 1;
            return this;
          };
        } else {
          _this.pre = function () {
            if (this._node === this.container.size() - 1) {
              throwIteratorAccessError();
            }
            this._node += 1;
            return this;
          };
          _this.next = function () {
            if (this._node === -1) {
              throwIteratorAccessError();
            }
            this._node -= 1;
            return this;
          };
        }
        return _this;
      }
      Object.defineProperty(RandomIterator.prototype, "pointer", {
        get: function () {
          return this.container.getElementByPos(this._node);
        },
        set: function (newValue) {
          this.container.setElementByPos(this._node, newValue);
        },
        enumerable: false,
        configurable: true
      });
      return RandomIterator;
    }(ContainerIterator);

    var VectorIterator = /** @class */function (_super) {
      __extends(VectorIterator, _super);
      function VectorIterator(node, container, iteratorType) {
        var _this = _super.call(this, node, iteratorType) || this;
        _this.container = container;
        return _this;
      }
      VectorIterator.prototype.copy = function () {
        return new VectorIterator(this._node, this.container, this.iteratorType);
      };
      return VectorIterator;
    }(RandomIterator);
    var Vector = /** @class */function (_super) {
      __extends(Vector, _super);
      /**
       * @param container - Initialize container, must have a forEach function.
       * @param copy - When the container is an array, you can choose to directly operate on the original object of
       *               the array or perform a shallow copy. The default is shallow copy.
       */
      function Vector(container, copy) {
        if (container === void 0) {
          container = [];
        }
        if (copy === void 0) {
          copy = true;
        }
        var _this = _super.call(this) || this;
        if (Array.isArray(container)) {
          _this._vector = copy ? __spreadArray([], __read(container), false) : container;
          _this._length = container.length;
        } else {
          _this._vector = [];
          var self_1 = _this;
          container.forEach(function (el) {
            self_1.pushBack(el);
          });
        }
        return _this;
      }
      Vector.prototype.clear = function () {
        this._length = 0;
        this._vector.length = 0;
      };
      Vector.prototype.begin = function () {
        return new VectorIterator(0, this);
      };
      Vector.prototype.end = function () {
        return new VectorIterator(this._length, this);
      };
      Vector.prototype.rBegin = function () {
        return new VectorIterator(this._length - 1, this, 1 /* IteratorType.REVERSE */);
      };

      Vector.prototype.rEnd = function () {
        return new VectorIterator(-1, this, 1 /* IteratorType.REVERSE */);
      };

      Vector.prototype.front = function () {
        return this._vector[0];
      };
      Vector.prototype.back = function () {
        return this._vector[this._length - 1];
      };
      Vector.prototype.getElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        return this._vector[pos];
      };
      Vector.prototype.eraseElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        this._vector.splice(pos, 1);
        this._length -= 1;
        return this._length;
      };
      Vector.prototype.eraseElementByValue = function (value) {
        var index = 0;
        for (var i = 0; i < this._length; ++i) {
          if (this._vector[i] !== value) {
            this._vector[index++] = this._vector[i];
          }
        }
        this._length = this._vector.length = index;
        return this._length;
      };
      Vector.prototype.eraseElementByIterator = function (iter) {
        var _node = iter._node;
        iter = iter.next();
        this.eraseElementByPos(_node);
        return iter;
      };
      Vector.prototype.pushBack = function (element) {
        this._vector.push(element);
        this._length += 1;
        return this._length;
      };
      Vector.prototype.popBack = function () {
        if (this._length === 0) return;
        this._length -= 1;
        return this._vector.pop();
      };
      Vector.prototype.setElementByPos = function (pos, element) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        this._vector[pos] = element;
      };
      Vector.prototype.insert = function (pos, element, num) {
        var _a;
        if (num === void 0) {
          num = 1;
        }
        if (pos < 0 || pos > this._length) {
          throw new RangeError();
        }
        (_a = this._vector).splice.apply(_a, __spreadArray([pos, 0], __read(new Array(num).fill(element)), false));
        this._length += num;
        return this._length;
      };
      Vector.prototype.find = function (element) {
        for (var i = 0; i < this._length; ++i) {
          if (this._vector[i] === element) {
            return new VectorIterator(i, this);
          }
        }
        return this.end();
      };
      Vector.prototype.reverse = function () {
        this._vector.reverse();
      };
      Vector.prototype.unique = function () {
        var index = 1;
        for (var i = 1; i < this._length; ++i) {
          if (this._vector[i] !== this._vector[i - 1]) {
            this._vector[index++] = this._vector[i];
          }
        }
        this._length = this._vector.length = index;
        return this._length;
      };
      Vector.prototype.sort = function (cmp) {
        this._vector.sort(cmp);
      };
      Vector.prototype.forEach = function (callback) {
        for (var i = 0; i < this._length; ++i) {
          callback(this._vector[i], i, this);
        }
      };
      Vector.prototype[Symbol.iterator] = function () {
        return function () {
          return __generator(this, function (_a) {
            switch (_a.label) {
              case 0:
                return [5 /*yield**/, __values(this._vector)];
              case 1:
                _a.sent();
                return [2 /*return*/];
            }
          });
        }.bind(this)();
      };
      return Vector;
    }(SequentialContainer);

    var LinkListIterator = /** @class */function (_super) {
      __extends(LinkListIterator, _super);
      /**
       * @internal
       */
      function LinkListIterator(_node, _header, container, iteratorType) {
        var _this = _super.call(this, iteratorType) || this;
        _this._node = _node;
        _this._header = _header;
        _this.container = container;
        if (_this.iteratorType === 0 /* IteratorType.NORMAL */) {
          _this.pre = function () {
            if (this._node._pre === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._pre;
            return this;
          };
          _this.next = function () {
            if (this._node === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._next;
            return this;
          };
        } else {
          _this.pre = function () {
            if (this._node._next === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._next;
            return this;
          };
          _this.next = function () {
            if (this._node === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._pre;
            return this;
          };
        }
        return _this;
      }
      Object.defineProperty(LinkListIterator.prototype, "pointer", {
        get: function () {
          if (this._node === this._header) {
            throwIteratorAccessError();
          }
          return this._node._value;
        },
        set: function (newValue) {
          if (this._node === this._header) {
            throwIteratorAccessError();
          }
          this._node._value = newValue;
        },
        enumerable: false,
        configurable: true
      });
      LinkListIterator.prototype.copy = function () {
        return new LinkListIterator(this._node, this._header, this.container, this.iteratorType);
      };
      return LinkListIterator;
    }(ContainerIterator);
    var LinkList = /** @class */function (_super) {
      __extends(LinkList, _super);
      function LinkList(container) {
        if (container === void 0) {
          container = [];
        }
        var _this = _super.call(this) || this;
        _this._header = {};
        _this._head = _this._tail = _this._header._pre = _this._header._next = _this._header;
        var self = _this;
        container.forEach(function (el) {
          self.pushBack(el);
        });
        return _this;
      }
      /**
       * @internal
       */
      LinkList.prototype._eraseNode = function (node) {
        var _pre = node._pre,
          _next = node._next;
        _pre._next = _next;
        _next._pre = _pre;
        if (node === this._head) {
          this._head = _next;
        }
        if (node === this._tail) {
          this._tail = _pre;
        }
        this._length -= 1;
      };
      /**
       * @internal
       */
      LinkList.prototype._insertNode = function (value, pre) {
        var next = pre._next;
        var node = {
          _value: value,
          _pre: pre,
          _next: next
        };
        pre._next = node;
        next._pre = node;
        if (pre === this._header) {
          this._head = node;
        }
        if (next === this._header) {
          this._tail = node;
        }
        this._length += 1;
      };
      LinkList.prototype.clear = function () {
        this._length = 0;
        this._head = this._tail = this._header._pre = this._header._next = this._header;
      };
      LinkList.prototype.begin = function () {
        return new LinkListIterator(this._head, this._header, this);
      };
      LinkList.prototype.end = function () {
        return new LinkListIterator(this._header, this._header, this);
      };
      LinkList.prototype.rBegin = function () {
        return new LinkListIterator(this._tail, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      LinkList.prototype.rEnd = function () {
        return new LinkListIterator(this._header, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      LinkList.prototype.front = function () {
        return this._head._value;
      };
      LinkList.prototype.back = function () {
        return this._tail._value;
      };
      LinkList.prototype.getElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var curNode = this._head;
        while (pos--) {
          curNode = curNode._next;
        }
        return curNode._value;
      };
      LinkList.prototype.eraseElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var curNode = this._head;
        while (pos--) {
          curNode = curNode._next;
        }
        this._eraseNode(curNode);
        return this._length;
      };
      LinkList.prototype.eraseElementByValue = function (_value) {
        var curNode = this._head;
        while (curNode !== this._header) {
          if (curNode._value === _value) {
            this._eraseNode(curNode);
          }
          curNode = curNode._next;
        }
        return this._length;
      };
      LinkList.prototype.eraseElementByIterator = function (iter) {
        var node = iter._node;
        if (node === this._header) {
          throwIteratorAccessError();
        }
        iter = iter.next();
        this._eraseNode(node);
        return iter;
      };
      LinkList.prototype.pushBack = function (element) {
        this._insertNode(element, this._tail);
        return this._length;
      };
      LinkList.prototype.popBack = function () {
        if (this._length === 0) return;
        var value = this._tail._value;
        this._eraseNode(this._tail);
        return value;
      };
      /**
       * @description Push an element to the front.
       * @param element - The element you want to push.
       * @returns The size of queue after pushing.
       */
      LinkList.prototype.pushFront = function (element) {
        this._insertNode(element, this._header);
        return this._length;
      };
      /**
       * @description Removes the first element.
       * @returns The element you popped.
       */
      LinkList.prototype.popFront = function () {
        if (this._length === 0) return;
        var value = this._head._value;
        this._eraseNode(this._head);
        return value;
      };
      LinkList.prototype.setElementByPos = function (pos, element) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var curNode = this._head;
        while (pos--) {
          curNode = curNode._next;
        }
        curNode._value = element;
      };
      LinkList.prototype.insert = function (pos, element, num) {
        if (num === void 0) {
          num = 1;
        }
        if (pos < 0 || pos > this._length) {
          throw new RangeError();
        }
        if (num <= 0) return this._length;
        if (pos === 0) {
          while (num--) this.pushFront(element);
        } else if (pos === this._length) {
          while (num--) this.pushBack(element);
        } else {
          var curNode = this._head;
          for (var i = 1; i < pos; ++i) {
            curNode = curNode._next;
          }
          var next = curNode._next;
          this._length += num;
          while (num--) {
            curNode._next = {
              _value: element,
              _pre: curNode
            };
            curNode._next._pre = curNode;
            curNode = curNode._next;
          }
          curNode._next = next;
          next._pre = curNode;
        }
        return this._length;
      };
      LinkList.prototype.find = function (element) {
        var curNode = this._head;
        while (curNode !== this._header) {
          if (curNode._value === element) {
            return new LinkListIterator(curNode, this._header, this);
          }
          curNode = curNode._next;
        }
        return this.end();
      };
      LinkList.prototype.reverse = function () {
        if (this._length <= 1) return;
        var pHead = this._head;
        var pTail = this._tail;
        var cnt = 0;
        while (cnt << 1 < this._length) {
          var tmp = pHead._value;
          pHead._value = pTail._value;
          pTail._value = tmp;
          pHead = pHead._next;
          pTail = pTail._pre;
          cnt += 1;
        }
      };
      LinkList.prototype.unique = function () {
        if (this._length <= 1) {
          return this._length;
        }
        var curNode = this._head;
        while (curNode !== this._header) {
          var tmpNode = curNode;
          while (tmpNode._next !== this._header && tmpNode._value === tmpNode._next._value) {
            tmpNode = tmpNode._next;
            this._length -= 1;
          }
          curNode._next = tmpNode._next;
          curNode._next._pre = curNode;
          curNode = curNode._next;
        }
        return this._length;
      };
      LinkList.prototype.sort = function (cmp) {
        if (this._length <= 1) return;
        var arr = [];
        this.forEach(function (el) {
          arr.push(el);
        });
        arr.sort(cmp);
        var curNode = this._head;
        arr.forEach(function (element) {
          curNode._value = element;
          curNode = curNode._next;
        });
      };
      /**
       * @description Merges two sorted lists.
       * @param list - The other list you want to merge (must be sorted).
       * @returns The size of list after merging.
       * @example
       * const linkA = new LinkList([1, 3, 5]);
       * const linkB = new LinkList([2, 4, 6]);
       * linkA.merge(linkB);  // [1, 2, 3, 4, 5];
       */
      LinkList.prototype.merge = function (list) {
        var self = this;
        if (this._length === 0) {
          list.forEach(function (el) {
            self.pushBack(el);
          });
        } else {
          var curNode_1 = this._head;
          list.forEach(function (el) {
            while (curNode_1 !== self._header && curNode_1._value <= el) {
              curNode_1 = curNode_1._next;
            }
            self._insertNode(el, curNode_1._pre);
          });
        }
        return this._length;
      };
      LinkList.prototype.forEach = function (callback) {
        var curNode = this._head;
        var index = 0;
        while (curNode !== this._header) {
          callback(curNode._value, index++, this);
          curNode = curNode._next;
        }
      };
      LinkList.prototype[Symbol.iterator] = function () {
        return function () {
          var curNode;
          return __generator(this, function (_a) {
            switch (_a.label) {
              case 0:
                if (this._length === 0) return [2 /*return*/];
                curNode = this._head;
                _a.label = 1;
              case 1:
                if (!(curNode !== this._header)) return [3 /*break*/, 3];
                return [4 /*yield*/, curNode._value];
              case 2:
                _a.sent();
                curNode = curNode._next;
                return [3 /*break*/, 1];
              case 3:
                return [2 /*return*/];
            }
          });
        }.bind(this)();
      };
      return LinkList;
    }(SequentialContainer);

    var DequeIterator = /** @class */function (_super) {
      __extends(DequeIterator, _super);
      function DequeIterator(node, container, iteratorType) {
        var _this = _super.call(this, node, iteratorType) || this;
        _this.container = container;
        return _this;
      }
      DequeIterator.prototype.copy = function () {
        return new DequeIterator(this._node, this.container, this.iteratorType);
      };
      return DequeIterator;
    }(RandomIterator);
    var Deque = /** @class */function (_super) {
      __extends(Deque, _super);
      function Deque(container, _bucketSize) {
        if (container === void 0) {
          container = [];
        }
        if (_bucketSize === void 0) {
          _bucketSize = 1 << 12;
        }
        var _this = _super.call(this) || this;
        /**
         * @internal
         */
        _this._first = 0;
        /**
         * @internal
         */
        _this._curFirst = 0;
        /**
         * @internal
         */
        _this._last = 0;
        /**
         * @internal
         */
        _this._curLast = 0;
        /**
         * @internal
         */
        _this._bucketNum = 0;
        /**
         * @internal
         */
        _this._map = [];
        var _length = function () {
          if (typeof container.length === "number") return container.length;
          if (typeof container.size === "number") return container.size;
          if (typeof container.size === "function") return container.size();
          throw new TypeError("Cannot get the length or size of the container");
        }();
        _this._bucketSize = _bucketSize;
        _this._bucketNum = Math.max(Math.ceil(_length / _this._bucketSize), 1);
        for (var i = 0; i < _this._bucketNum; ++i) {
          _this._map.push(new Array(_this._bucketSize));
        }
        var needBucketNum = Math.ceil(_length / _this._bucketSize);
        _this._first = _this._last = (_this._bucketNum >> 1) - (needBucketNum >> 1);
        _this._curFirst = _this._curLast = _this._bucketSize - _length % _this._bucketSize >> 1;
        var self = _this;
        container.forEach(function (element) {
          self.pushBack(element);
        });
        return _this;
      }
      /**
       * @description Growth the Deque.
       * @internal
       */
      Deque.prototype._reAllocate = function () {
        var newMap = [];
        var addBucketNum = Math.max(this._bucketNum >> 1, 1);
        for (var i = 0; i < addBucketNum; ++i) {
          newMap[i] = new Array(this._bucketSize);
        }
        for (var i = this._first; i < this._bucketNum; ++i) {
          newMap[newMap.length] = this._map[i];
        }
        for (var i = 0; i < this._last; ++i) {
          newMap[newMap.length] = this._map[i];
        }
        newMap[newMap.length] = __spreadArray([], __read(this._map[this._last]), false);
        this._first = addBucketNum;
        this._last = newMap.length - 1;
        for (var i = 0; i < addBucketNum; ++i) {
          newMap[newMap.length] = new Array(this._bucketSize);
        }
        this._map = newMap;
        this._bucketNum = newMap.length;
      };
      /**
       * @description Get the bucket position of the element and the pointer position by index.
       * @param pos - The element's index.
       * @internal
       */
      Deque.prototype._getElementIndex = function (pos) {
        var offset = this._curFirst + pos + 1;
        var offsetRemainder = offset % this._bucketSize;
        var curNodePointerIndex = offsetRemainder - 1;
        var curNodeBucketIndex = this._first + (offset - offsetRemainder) / this._bucketSize;
        if (offsetRemainder === 0) curNodeBucketIndex -= 1;
        curNodeBucketIndex %= this._bucketNum;
        if (curNodePointerIndex < 0) curNodePointerIndex += this._bucketSize;
        return {
          curNodeBucketIndex: curNodeBucketIndex,
          curNodePointerIndex: curNodePointerIndex
        };
      };
      Deque.prototype.clear = function () {
        this._map = [new Array(this._bucketSize)];
        this._bucketNum = 1;
        this._first = this._last = this._length = 0;
        this._curFirst = this._curLast = this._bucketSize >> 1;
      };
      Deque.prototype.begin = function () {
        return new DequeIterator(0, this);
      };
      Deque.prototype.end = function () {
        return new DequeIterator(this._length, this);
      };
      Deque.prototype.rBegin = function () {
        return new DequeIterator(this._length - 1, this, 1 /* IteratorType.REVERSE */);
      };

      Deque.prototype.rEnd = function () {
        return new DequeIterator(-1, this, 1 /* IteratorType.REVERSE */);
      };

      Deque.prototype.front = function () {
        if (this._length === 0) return;
        return this._map[this._first][this._curFirst];
      };
      Deque.prototype.back = function () {
        if (this._length === 0) return;
        return this._map[this._last][this._curLast];
      };
      Deque.prototype.pushBack = function (element) {
        if (this._length) {
          if (this._curLast < this._bucketSize - 1) {
            this._curLast += 1;
          } else if (this._last < this._bucketNum - 1) {
            this._last += 1;
            this._curLast = 0;
          } else {
            this._last = 0;
            this._curLast = 0;
          }
          if (this._last === this._first && this._curLast === this._curFirst) this._reAllocate();
        }
        this._length += 1;
        this._map[this._last][this._curLast] = element;
        return this._length;
      };
      Deque.prototype.popBack = function () {
        if (this._length === 0) return;
        var value = this._map[this._last][this._curLast];
        if (this._length !== 1) {
          if (this._curLast > 0) {
            this._curLast -= 1;
          } else if (this._last > 0) {
            this._last -= 1;
            this._curLast = this._bucketSize - 1;
          } else {
            this._last = this._bucketNum - 1;
            this._curLast = this._bucketSize - 1;
          }
        }
        this._length -= 1;
        return value;
      };
      /**
       * @description Push the element to the front.
       * @param element - The element you want to push.
       * @returns The size of queue after pushing.
       */
      Deque.prototype.pushFront = function (element) {
        if (this._length) {
          if (this._curFirst > 0) {
            this._curFirst -= 1;
          } else if (this._first > 0) {
            this._first -= 1;
            this._curFirst = this._bucketSize - 1;
          } else {
            this._first = this._bucketNum - 1;
            this._curFirst = this._bucketSize - 1;
          }
          if (this._first === this._last && this._curFirst === this._curLast) this._reAllocate();
        }
        this._length += 1;
        this._map[this._first][this._curFirst] = element;
        return this._length;
      };
      /**
       * @description Remove the _first element.
       * @returns The element you popped.
       */
      Deque.prototype.popFront = function () {
        if (this._length === 0) return;
        var value = this._map[this._first][this._curFirst];
        if (this._length !== 1) {
          if (this._curFirst < this._bucketSize - 1) {
            this._curFirst += 1;
          } else if (this._first < this._bucketNum - 1) {
            this._first += 1;
            this._curFirst = 0;
          } else {
            this._first = 0;
            this._curFirst = 0;
          }
        }
        this._length -= 1;
        return value;
      };
      Deque.prototype.getElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var _a = this._getElementIndex(pos),
          curNodeBucketIndex = _a.curNodeBucketIndex,
          curNodePointerIndex = _a.curNodePointerIndex;
        return this._map[curNodeBucketIndex][curNodePointerIndex];
      };
      Deque.prototype.setElementByPos = function (pos, element) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var _a = this._getElementIndex(pos),
          curNodeBucketIndex = _a.curNodeBucketIndex,
          curNodePointerIndex = _a.curNodePointerIndex;
        this._map[curNodeBucketIndex][curNodePointerIndex] = element;
      };
      Deque.prototype.insert = function (pos, element, num) {
        if (num === void 0) {
          num = 1;
        }
        if (pos < 0 || pos > this._length) {
          throw new RangeError();
        }
        if (pos === 0) {
          while (num--) this.pushFront(element);
        } else if (pos === this._length) {
          while (num--) this.pushBack(element);
        } else {
          var arr = [];
          for (var i = pos; i < this._length; ++i) {
            arr.push(this.getElementByPos(i));
          }
          this.cut(pos - 1);
          for (var i = 0; i < num; ++i) this.pushBack(element);
          for (var i = 0; i < arr.length; ++i) this.pushBack(arr[i]);
        }
        return this._length;
      };
      /**
       * @description Remove all elements after the specified position (excluding the specified position).
       * @param pos - The previous position of the first removed element.
       * @returns The size of the container after cutting.
       * @example
       * deque.cut(1); // Then deque's size will be 2. deque -> [0, 1]
       */
      Deque.prototype.cut = function (pos) {
        if (pos < 0) {
          this.clear();
          return 0;
        }
        var _a = this._getElementIndex(pos),
          curNodeBucketIndex = _a.curNodeBucketIndex,
          curNodePointerIndex = _a.curNodePointerIndex;
        this._last = curNodeBucketIndex;
        this._curLast = curNodePointerIndex;
        this._length = pos + 1;
        return this._length;
      };
      Deque.prototype.eraseElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        if (pos === 0) this.popFront();else if (pos === this._length - 1) this.popBack();else {
          var arr = [];
          for (var i = pos + 1; i < this._length; ++i) {
            arr.push(this.getElementByPos(i));
          }
          this.cut(pos);
          this.popBack();
          var self_1 = this;
          arr.forEach(function (el) {
            self_1.pushBack(el);
          });
        }
        return this._length;
      };
      Deque.prototype.eraseElementByValue = function (value) {
        if (this._length === 0) return 0;
        var arr = [];
        for (var i = 0; i < this._length; ++i) {
          var element = this.getElementByPos(i);
          if (element !== value) arr.push(element);
        }
        var _length = arr.length;
        for (var i = 0; i < _length; ++i) this.setElementByPos(i, arr[i]);
        return this.cut(_length - 1);
      };
      Deque.prototype.eraseElementByIterator = function (iter) {
        var _node = iter._node;
        this.eraseElementByPos(_node);
        iter = iter.next();
        return iter;
      };
      Deque.prototype.find = function (element) {
        for (var i = 0; i < this._length; ++i) {
          if (this.getElementByPos(i) === element) {
            return new DequeIterator(i, this);
          }
        }
        return this.end();
      };
      Deque.prototype.reverse = function () {
        var l = 0;
        var r = this._length - 1;
        while (l < r) {
          var tmp = this.getElementByPos(l);
          this.setElementByPos(l, this.getElementByPos(r));
          this.setElementByPos(r, tmp);
          l += 1;
          r -= 1;
        }
      };
      Deque.prototype.unique = function () {
        if (this._length <= 1) {
          return this._length;
        }
        var index = 1;
        var pre = this.getElementByPos(0);
        for (var i = 1; i < this._length; ++i) {
          var cur = this.getElementByPos(i);
          if (cur !== pre) {
            pre = cur;
            this.setElementByPos(index++, cur);
          }
        }
        while (this._length > index) this.popBack();
        return this._length;
      };
      Deque.prototype.sort = function (cmp) {
        var arr = [];
        for (var i = 0; i < this._length; ++i) {
          arr.push(this.getElementByPos(i));
        }
        arr.sort(cmp);
        for (var i = 0; i < this._length; ++i) this.setElementByPos(i, arr[i]);
      };
      /**
       * @description Remove as much useless space as possible.
       */
      Deque.prototype.shrinkToFit = function () {
        if (this._length === 0) return;
        var arr = [];
        this.forEach(function (el) {
          arr.push(el);
        });
        this._bucketNum = Math.max(Math.ceil(this._length / this._bucketSize), 1);
        this._length = this._first = this._last = this._curFirst = this._curLast = 0;
        this._map = [];
        for (var i = 0; i < this._bucketNum; ++i) {
          this._map.push(new Array(this._bucketSize));
        }
        for (var i = 0; i < arr.length; ++i) this.pushBack(arr[i]);
      };
      Deque.prototype.forEach = function (callback) {
        for (var i = 0; i < this._length; ++i) {
          callback(this.getElementByPos(i), i, this);
        }
      };
      Deque.prototype[Symbol.iterator] = function () {
        return function () {
          var i;
          return __generator(this, function (_a) {
            switch (_a.label) {
              case 0:
                i = 0;
                _a.label = 1;
              case 1:
                if (!(i < this._length)) return [3 /*break*/, 4];
                return [4 /*yield*/, this.getElementByPos(i)];
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
        }.bind(this)();
      };
      return Deque;
    }(SequentialContainer);

    var TreeNode = /** @class */function () {
      function TreeNode(key, value) {
        this._color = 1 /* TreeNodeColor.RED */;
        this._key = undefined;
        this._value = undefined;
        this._left = undefined;
        this._right = undefined;
        this._parent = undefined;
        this._key = key;
        this._value = value;
      }
      /**
       * @description Get the pre node.
       * @returns TreeNode about the pre node.
       */
      TreeNode.prototype._pre = function () {
        var preNode = this;
        if (preNode._color === 1 /* TreeNodeColor.RED */ && preNode._parent._parent === preNode) {
          preNode = preNode._right;
        } else if (preNode._left) {
          preNode = preNode._left;
          while (preNode._right) {
            preNode = preNode._right;
          }
        } else {
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
        if (enableIndex) {
          _this._TreeNodeClass = TreeNodeEnableIndex;
          _this._set = function (key, value, hint) {
            var curNode = this._preSet(key, value, hint);
            if (curNode) {
              var p = curNode._parent;
              while (p !== this._header) {
                p._subTreeSize += 1;
                p = p._parent;
              }
              var nodeList = this._insertNodeSelfBalance(curNode);
              if (nodeList) {
                var _a = nodeList,
                  parentNode = _a.parentNode,
                  grandParent = _a.grandParent,
                  curNode_1 = _a.curNode;
                parentNode._recount();
                grandParent._recount();
                curNode_1._recount();
              }
            }
            return this._length;
          };
          _this._eraseNode = function (curNode) {
            var p = this._preEraseNode(curNode);
            while (p !== this._header) {
              p._subTreeSize -= 1;
              p = p._parent;
            }
          };
        } else {
          _this._TreeNodeClass = TreeNode;
          _this._set = function (key, value, hint) {
            var curNode = this._preSet(key, value, hint);
            if (curNode) this._insertNodeSelfBalance(curNode);
            return this._length;
          };
          _this._eraseNode = _this._preEraseNode;
        }
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
      TreeContainer.prototype._preEraseNode = function (curNode) {
        var _a, _b;
        if (this._length === 1) {
          this.clear();
          return this._header;
        }
        var swapNode = curNode;
        while (swapNode._left || swapNode._right) {
          if (swapNode._right) {
            swapNode = swapNode._right;
            while (swapNode._left) swapNode = swapNode._left;
          } else {
            swapNode = swapNode._left;
          }
          _a = __read([swapNode._key, curNode._key], 2), curNode._key = _a[0], swapNode._key = _a[1];
          _b = __read([swapNode._value, curNode._value], 2), curNode._value = _b[0], swapNode._value = _b[1];
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
        return _parent;
      };
      /**
       * @internal
       */
      TreeContainer.prototype._inOrderTraversal = function (curNode, callback) {
        if (curNode === undefined) return false;
        var ifReturn = this._inOrderTraversal(curNode._left, callback);
        if (ifReturn) return true;
        if (callback(curNode)) return true;
        return this._inOrderTraversal(curNode._right, callback);
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
              if (curNode._left) curNode._left._parent = parentNode;
              if (curNode._right) curNode._right._parent = grandParent;
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
              return {
                parentNode: parentNode,
                grandParent: grandParent,
                curNode: curNode
              };
            } else {
              parentNode._color = 0 /* TreeNodeColor.BLACK */;
              if (grandParent === this._root) {
                this._root = grandParent._rotateRight();
              } else grandParent._rotateRight();
              grandParent._color = 1 /* TreeNodeColor.RED */;
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
              if (curNode._left) curNode._left._parent = grandParent;
              if (curNode._right) curNode._right._parent = parentNode;
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
              return {
                parentNode: parentNode,
                grandParent: grandParent,
                curNode: curNode
              };
            } else {
              parentNode._color = 0 /* TreeNodeColor.BLACK */;
              if (grandParent === this._root) {
                this._root = grandParent._rotateLeft();
              } else grandParent._rotateLeft();
              grandParent._color = 1 /* TreeNodeColor.RED */;
            }
          }

          return;
        }
      };
      /**
       * @internal
       */
      TreeContainer.prototype._preSet = function (key, value, hint) {
        if (this._root === undefined) {
          this._length += 1;
          this._root = new this._TreeNodeClass(key, value);
          this._root._color = 0 /* TreeNodeColor.BLACK */;
          this._root._parent = this._header;
          this._header._parent = this._root;
          this._header._left = this._root;
          this._header._right = this._root;
          return;
        }
        var curNode;
        var minNode = this._header._left;
        var compareToMin = this._cmp(minNode._key, key);
        if (compareToMin === 0) {
          minNode._value = value;
          return;
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
            return;
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
                  return;
                } else /* istanbul ignore else */if (iterCmpRes > 0) {
                    var preNode = iterNode._pre();
                    var preCmpRes = this._cmp(preNode._key, key);
                    if (preCmpRes === 0) {
                      preNode._value = value;
                      return;
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
                  return;
                }
              }
            }
          }
        }
        this._length += 1;
        return curNode;
      };
      /**
       * @internal
       */
      TreeContainer.prototype._findElementNode = function (curNode, key) {
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
        if (node === this._header._left) {
          if (this._cmp(node._next()._key, key) > 0) {
            node._key = key;
            return true;
          }
          return false;
        }
        if (node === this._header._right) {
          if (this._cmp(node._pre()._key, key) < 0) {
            node._key = key;
            return true;
          }
          return false;
        }
        var preKey = node._pre()._key;
        if (this._cmp(preKey, key) >= 0) return false;
        var nextKey = node._next()._key;
        if (this._cmp(nextKey, key) <= 0) return false;
        node._key = key;
        return true;
      };
      TreeContainer.prototype.eraseElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var index = 0;
        var self = this;
        this._inOrderTraversal(this._root, function (curNode) {
          if (pos === index) {
            self._eraseNode(curNode);
            return true;
          }
          index += 1;
          return false;
        });
        return this._length;
      };
      /**
       * @description Remove the element of the specified key.
       * @param key - The key you want to remove.
       * @returns Whether erase successfully.
       */
      TreeContainer.prototype.eraseElementByKey = function (key) {
        if (this._length === 0) return false;
        var curNode = this._findElementNode(this._root, key);
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
      TreeContainer.prototype.forEach = function (callback) {
        var e_1, _a;
        var index = 0;
        try {
          for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
            var element = _c.value;
            callback(element, index++, this);
          }
        } catch (e_1_1) {
          e_1 = {
            error: e_1_1
          };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
      };
      TreeContainer.prototype.getElementByPos = function (pos) {
        var e_2, _a;
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var res;
        var index = 0;
        try {
          for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
            var element = _c.value;
            if (index === pos) {
              res = element;
              break;
            }
            index += 1;
          }
        } catch (e_2_1) {
          e_2 = {
            error: e_2_1
          };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          } finally {
            if (e_2) throw e_2.error;
          }
        }
        return res;
      };
      /**
       * @description Get the height of the tree.
       * @returns Number about the height of the RB-tree.
       */
      TreeContainer.prototype.getHeight = function () {
        if (this._length === 0) return 0;
        var traversal = function (curNode) {
          if (!curNode) return 0;
          return Math.max(traversal(curNode._left), traversal(curNode._right)) + 1;
        };
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
      return TreeIterator;
    }(ContainerIterator);

    var OrderedSetIterator = /** @class */function (_super) {
      __extends(OrderedSetIterator, _super);
      function OrderedSetIterator(node, header, container, iteratorType) {
        var _this = _super.call(this, node, header, iteratorType) || this;
        _this.container = container;
        return _this;
      }
      Object.defineProperty(OrderedSetIterator.prototype, "pointer", {
        get: function () {
          if (this._node === this._header) {
            throwIteratorAccessError();
          }
          return this._node._key;
        },
        enumerable: false,
        configurable: true
      });
      OrderedSetIterator.prototype.copy = function () {
        return new OrderedSetIterator(this._node, this._header, this.container, this.iteratorType);
      };
      return OrderedSetIterator;
    }(TreeIterator);
    var OrderedSet = /** @class */function (_super) {
      __extends(OrderedSet, _super);
      /**
       * @param container - The initialization container.
       * @param cmp - The compare function.
       * @param enableIndex - Whether to enable iterator indexing function.
       * @example
       * new OrderedSet();
       * new OrderedSet([0, 1, 2]);
       * new OrderedSet([0, 1, 2], (x, y) => x - y);
       * new OrderedSet([0, 1, 2], (x, y) => x - y, true);
       */
      function OrderedSet(container, cmp, enableIndex) {
        if (container === void 0) {
          container = [];
        }
        var _this = _super.call(this, cmp, enableIndex) || this;
        var self = _this;
        container.forEach(function (el) {
          self.insert(el);
        });
        return _this;
      }
      /**
       * @internal
       */
      OrderedSet.prototype._iterationFunc = function (curNode) {
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              if (curNode === undefined) return [2 /*return*/];
              return [5 /*yield**/, __values(this._iterationFunc(curNode._left))];
            case 1:
              _a.sent();
              return [4 /*yield*/, curNode._key];
            case 2:
              _a.sent();
              return [5 /*yield**/, __values(this._iterationFunc(curNode._right))];
            case 3:
              _a.sent();
              return [2 /*return*/];
          }
        });
      };

      OrderedSet.prototype.begin = function () {
        return new OrderedSetIterator(this._header._left || this._header, this._header, this);
      };
      OrderedSet.prototype.end = function () {
        return new OrderedSetIterator(this._header, this._header, this);
      };
      OrderedSet.prototype.rBegin = function () {
        return new OrderedSetIterator(this._header._right || this._header, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      OrderedSet.prototype.rEnd = function () {
        return new OrderedSetIterator(this._header, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      OrderedSet.prototype.front = function () {
        return this._header._left ? this._header._left._key : undefined;
      };
      OrderedSet.prototype.back = function () {
        return this._header._right ? this._header._right._key : undefined;
      };
      /**
       * @description Insert element to set.
       * @param key - The key want to insert.
       * @param hint - You can give an iterator hint to improve insertion efficiency.
       * @return The size of container after setting.
       * @example
       * const st = new OrderedSet([2, 4, 5]);
       * const iter = st.begin();
       * st.insert(1);
       * st.insert(3, iter);  // give a hint will be faster.
       */
      OrderedSet.prototype.insert = function (key, hint) {
        return this._set(key, undefined, hint);
      };
      OrderedSet.prototype.find = function (element) {
        var resNode = this._findElementNode(this._root, element);
        return new OrderedSetIterator(resNode, this._header, this);
      };
      OrderedSet.prototype.lowerBound = function (key) {
        var resNode = this._lowerBound(this._root, key);
        return new OrderedSetIterator(resNode, this._header, this);
      };
      OrderedSet.prototype.upperBound = function (key) {
        var resNode = this._upperBound(this._root, key);
        return new OrderedSetIterator(resNode, this._header, this);
      };
      OrderedSet.prototype.reverseLowerBound = function (key) {
        var resNode = this._reverseLowerBound(this._root, key);
        return new OrderedSetIterator(resNode, this._header, this);
      };
      OrderedSet.prototype.reverseUpperBound = function (key) {
        var resNode = this._reverseUpperBound(this._root, key);
        return new OrderedSetIterator(resNode, this._header, this);
      };
      OrderedSet.prototype.union = function (other) {
        var self = this;
        other.forEach(function (el) {
          self.insert(el);
        });
        return this._length;
      };
      OrderedSet.prototype[Symbol.iterator] = function () {
        return this._iterationFunc(this._root);
      };
      return OrderedSet;
    }(TreeContainer);

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
            get: function (_, props) {
              if (props === '0') return self._node._key;else if (props === '1') return self._node._value;
            },
            set: function (_, props, newValue) {
              if (props !== '1') {
                throw new TypeError('props must be 1');
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
      /**
       * @internal
       */
      OrderedMap.prototype._iterationFunc = function (curNode) {
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              if (curNode === undefined) return [2 /*return*/];
              return [5 /*yield**/, __values(this._iterationFunc(curNode._left))];
            case 1:
              _a.sent();
              return [4 /*yield*/, [curNode._key, curNode._value]];
            case 2:
              _a.sent();
              return [5 /*yield**/, __values(this._iterationFunc(curNode._right))];
            case 3:
              _a.sent();
              return [2 /*return*/];
          }
        });
      };

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
      OrderedMap.prototype.find = function (key) {
        var curNode = this._findElementNode(this._root, key);
        return new OrderedMapIterator(curNode, this._header, this);
      };
      /**
       * @description Get the value of the element of the specified key.
       * @param key - The specified key you want to get.
       * @example
       * const val = container.getElementByKey(1);
       */
      OrderedMap.prototype.getElementByKey = function (key) {
        var curNode = this._findElementNode(this._root, key);
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
        return this._iterationFunc(this._root);
      };
      return OrderedMap;
    }(TreeContainer);

    /**
     * @description Determine whether the type of key is `object`.
     * @param key - The key want to check.
     * @returns Whether the type of key is `object`.
     * @internal
     */
    function checkObject(key) {
      var t = typeof key;
      return t === 'object' && key !== null || t === 'function';
    }

    var HashContainerIterator = /** @class */function (_super) {
      __extends(HashContainerIterator, _super);
      /**
       * @internal
       */
      function HashContainerIterator(node, header, iteratorType) {
        var _this = _super.call(this, iteratorType) || this;
        _this._node = node;
        _this._header = header;
        if (_this.iteratorType === 0 /* IteratorType.NORMAL */) {
          _this.pre = function () {
            if (this._node._pre === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._pre;
            return this;
          };
          _this.next = function () {
            if (this._node === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._next;
            return this;
          };
        } else {
          _this.pre = function () {
            if (this._node._next === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._next;
            return this;
          };
          _this.next = function () {
            if (this._node === this._header) {
              throwIteratorAccessError();
            }
            this._node = this._node._pre;
            return this;
          };
        }
        return _this;
      }
      return HashContainerIterator;
    }(ContainerIterator);
    var HashContainer = /** @class */function (_super) {
      __extends(HashContainer, _super);
      /**
       * @internal
       */
      function HashContainer() {
        var _this = _super.call(this) || this;
        /**
         * @internal
         */
        _this._objMap = [];
        /**
         * @internal
         */
        _this._originMap = {};
        /**
         * @description Unique symbol used to tag object.
         */
        _this.HASH_TAG = Symbol('@@HASH_TAG');
        Object.setPrototypeOf(_this._originMap, null);
        _this._header = {};
        _this._header._pre = _this._header._next = _this._head = _this._tail = _this._header;
        return _this;
      }
      /**
       * @internal
       */
      HashContainer.prototype._eraseNode = function (node) {
        var _pre = node._pre,
          _next = node._next;
        _pre._next = _next;
        _next._pre = _pre;
        if (node === this._head) {
          this._head = _next;
        }
        if (node === this._tail) {
          this._tail = _pre;
        }
        this._length -= 1;
      };
      /**
       * @internal
       */
      HashContainer.prototype._set = function (key, value, isObject) {
        if (isObject === undefined) isObject = checkObject(key);
        var newTail;
        if (isObject) {
          var index = key[this.HASH_TAG];
          if (index !== undefined) {
            this._objMap[index]._value = value;
            return this._length;
          }
          Object.defineProperty(key, this.HASH_TAG, {
            value: this._objMap.length,
            configurable: true
          });
          newTail = {
            _key: key,
            _value: value,
            _pre: this._tail,
            _next: this._header
          };
          this._objMap.push(newTail);
        } else {
          var node = this._originMap[key];
          if (node) {
            node._value = value;
            return this._length;
          }
          newTail = {
            _key: key,
            _value: value,
            _pre: this._tail,
            _next: this._header
          };
          this._originMap[key] = newTail;
        }
        if (this._length === 0) {
          this._head = newTail;
          this._header._next = newTail;
        } else {
          this._tail._next = newTail;
        }
        this._tail = newTail;
        this._header._pre = newTail;
        return ++this._length;
      };
      /**
       * @internal
       */
      HashContainer.prototype._findElementNode = function (key, isObject) {
        if (isObject === undefined) isObject = checkObject(key);
        if (isObject) {
          var index = key[this.HASH_TAG];
          if (index === undefined) return this._header;
          return this._objMap[index];
        } else {
          return this._originMap[key] || this._header;
        }
      };
      HashContainer.prototype.clear = function () {
        var HASH_TAG = this.HASH_TAG;
        this._objMap.forEach(function (el) {
          delete el._key[HASH_TAG];
        });
        this._objMap = [];
        this._originMap = {};
        Object.setPrototypeOf(this._originMap, null);
        this._length = 0;
        this._head = this._tail = this._header._pre = this._header._next = this._header;
      };
      /**
       * @description Remove the element of the specified key.
       * @param key - The key you want to remove.
       * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
       *                   If a `undefined` value is passed in, the type will be automatically judged.
       * @returns Whether erase successfully.
       */
      HashContainer.prototype.eraseElementByKey = function (key, isObject) {
        var node;
        if (isObject === undefined) isObject = checkObject(key);
        if (isObject) {
          var index = key[this.HASH_TAG];
          if (index === undefined) return false;
          delete key[this.HASH_TAG];
          node = this._objMap[index];
          delete this._objMap[index];
        } else {
          node = this._originMap[key];
          if (node === undefined) return false;
          delete this._originMap[key];
        }
        this._eraseNode(node);
        return true;
      };
      HashContainer.prototype.eraseElementByIterator = function (iter) {
        var node = iter._node;
        if (node === this._header) {
          throwIteratorAccessError();
        }
        this._eraseNode(node);
        return iter.next();
      };
      HashContainer.prototype.eraseElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var node = this._head;
        while (pos--) {
          node = node._next;
        }
        this._eraseNode(node);
        return this._length;
      };
      return HashContainer;
    }(Container);

    var HashSetIterator = /** @class */function (_super) {
      __extends(HashSetIterator, _super);
      function HashSetIterator(node, header, container, iteratorType) {
        var _this = _super.call(this, node, header, iteratorType) || this;
        _this.container = container;
        return _this;
      }
      Object.defineProperty(HashSetIterator.prototype, "pointer", {
        get: function () {
          if (this._node === this._header) {
            throwIteratorAccessError();
          }
          return this._node._key;
        },
        enumerable: false,
        configurable: true
      });
      HashSetIterator.prototype.copy = function () {
        return new HashSetIterator(this._node, this._header, this.container, this.iteratorType);
      };
      return HashSetIterator;
    }(HashContainerIterator);
    var HashSet = /** @class */function (_super) {
      __extends(HashSet, _super);
      function HashSet(container) {
        if (container === void 0) {
          container = [];
        }
        var _this = _super.call(this) || this;
        var self = _this;
        container.forEach(function (el) {
          self.insert(el);
        });
        return _this;
      }
      HashSet.prototype.begin = function () {
        return new HashSetIterator(this._head, this._header, this);
      };
      HashSet.prototype.end = function () {
        return new HashSetIterator(this._header, this._header, this);
      };
      HashSet.prototype.rBegin = function () {
        return new HashSetIterator(this._tail, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      HashSet.prototype.rEnd = function () {
        return new HashSetIterator(this._header, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      HashSet.prototype.front = function () {
        return this._head._key;
      };
      HashSet.prototype.back = function () {
        return this._tail._key;
      };
      /**
       * @description Insert element to set.
       * @param key - The key want to insert.
       * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
       *                   If a `undefined` value is passed in, the type will be automatically judged.
       * @returns The size of container after inserting.
       */
      HashSet.prototype.insert = function (key, isObject) {
        return this._set(key, undefined, isObject);
      };
      HashSet.prototype.getElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var node = this._head;
        while (pos--) {
          node = node._next;
        }
        return node._key;
      };
      /**
       * @description Check key if exist in container.
       * @param key - The element you want to search.
       * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
       *                   If a `undefined` value is passed in, the type will be automatically judged.
       * @returns An iterator pointing to the element if found, or super end if not found.
       */
      HashSet.prototype.find = function (key, isObject) {
        var node = this._findElementNode(key, isObject);
        return new HashSetIterator(node, this._header, this);
      };
      HashSet.prototype.forEach = function (callback) {
        var index = 0;
        var node = this._head;
        while (node !== this._header) {
          callback(node._key, index++, this);
          node = node._next;
        }
      };
      HashSet.prototype[Symbol.iterator] = function () {
        return function () {
          var node;
          return __generator(this, function (_a) {
            switch (_a.label) {
              case 0:
                node = this._head;
                _a.label = 1;
              case 1:
                if (!(node !== this._header)) return [3 /*break*/, 3];
                return [4 /*yield*/, node._key];
              case 2:
                _a.sent();
                node = node._next;
                return [3 /*break*/, 1];
              case 3:
                return [2 /*return*/];
            }
          });
        }.bind(this)();
      };
      return HashSet;
    }(HashContainer);

    var HashMapIterator = /** @class */function (_super) {
      __extends(HashMapIterator, _super);
      function HashMapIterator(node, header, container, iteratorType) {
        var _this = _super.call(this, node, header, iteratorType) || this;
        _this.container = container;
        return _this;
      }
      Object.defineProperty(HashMapIterator.prototype, "pointer", {
        get: function () {
          if (this._node === this._header) {
            throwIteratorAccessError();
          }
          var self = this;
          return new Proxy([], {
            get: function (_, props) {
              if (props === '0') return self._node._key;else if (props === '1') return self._node._value;
            },
            set: function (_, props, newValue) {
              if (props !== '1') {
                throw new TypeError('props must be 1');
              }
              self._node._value = newValue;
              return true;
            }
          });
        },
        enumerable: false,
        configurable: true
      });
      HashMapIterator.prototype.copy = function () {
        return new HashMapIterator(this._node, this._header, this.container, this.iteratorType);
      };
      return HashMapIterator;
    }(HashContainerIterator);
    var HashMap = /** @class */function (_super) {
      __extends(HashMap, _super);
      function HashMap(container) {
        if (container === void 0) {
          container = [];
        }
        var _this = _super.call(this) || this;
        var self = _this;
        container.forEach(function (el) {
          self.setElement(el[0], el[1]);
        });
        return _this;
      }
      HashMap.prototype.begin = function () {
        return new HashMapIterator(this._head, this._header, this);
      };
      HashMap.prototype.end = function () {
        return new HashMapIterator(this._header, this._header, this);
      };
      HashMap.prototype.rBegin = function () {
        return new HashMapIterator(this._tail, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      HashMap.prototype.rEnd = function () {
        return new HashMapIterator(this._header, this._header, this, 1 /* IteratorType.REVERSE */);
      };

      HashMap.prototype.front = function () {
        if (this._length === 0) return;
        return [this._head._key, this._head._value];
      };
      HashMap.prototype.back = function () {
        if (this._length === 0) return;
        return [this._tail._key, this._tail._value];
      };
      /**
       * @description Insert a key-value pair or set value by the given key.
       * @param key - The key want to insert.
       * @param value - The value want to set.
       * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
       *                   If a `undefined` value is passed in, the type will be automatically judged.
       * @returns The size of container after setting.
       */
      HashMap.prototype.setElement = function (key, value, isObject) {
        return this._set(key, value, isObject);
      };
      /**
       * @description Get the value of the element of the specified key.
       * @param key - The key want to search.
       * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
       *                   If a `undefined` value is passed in, the type will be automatically judged.
       * @example
       * const val = container.getElementByKey(1);
       */
      HashMap.prototype.getElementByKey = function (key, isObject) {
        if (isObject === undefined) isObject = checkObject(key);
        if (isObject) {
          var index = key[this.HASH_TAG];
          return index !== undefined ? this._objMap[index]._value : undefined;
        }
        var node = this._originMap[key];
        return node ? node._value : undefined;
      };
      HashMap.prototype.getElementByPos = function (pos) {
        if (pos < 0 || pos > this._length - 1) {
          throw new RangeError();
        }
        var node = this._head;
        while (pos--) {
          node = node._next;
        }
        return [node._key, node._value];
      };
      /**
       * @description Check key if exist in container.
       * @param key - The element you want to search.
       * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
       *                   If a `undefined` value is passed in, the type will be automatically judged.
       * @returns An iterator pointing to the element if found, or super end if not found.
       */
      HashMap.prototype.find = function (key, isObject) {
        var node = this._findElementNode(key, isObject);
        return new HashMapIterator(node, this._header, this);
      };
      HashMap.prototype.forEach = function (callback) {
        var index = 0;
        var node = this._head;
        while (node !== this._header) {
          callback([node._key, node._value], index++, this);
          node = node._next;
        }
      };
      HashMap.prototype[Symbol.iterator] = function () {
        return function () {
          var node;
          return __generator(this, function (_a) {
            switch (_a.label) {
              case 0:
                node = this._head;
                _a.label = 1;
              case 1:
                if (!(node !== this._header)) return [3 /*break*/, 3];
                return [4 /*yield*/, [node._key, node._value]];
              case 2:
                _a.sent();
                node = node._next;
                return [3 /*break*/, 1];
              case 3:
                return [2 /*return*/];
            }
          });
        }.bind(this)();
      };
      return HashMap;
    }(HashContainer);

    exports.Deque = Deque;
    exports.HashMap = HashMap;
    exports.HashSet = HashSet;
    exports.LinkList = LinkList;
    exports.OrderedMap = OrderedMap;
    exports.OrderedSet = OrderedSet;
    exports.PriorityQueue = PriorityQueue;
    exports.Queue = Queue;
    exports.Stack = Stack;
    exports.Vector = Vector;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
