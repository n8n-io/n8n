var VueFlowNodeResizer = function(exports, vue, core) {
  "use strict";
  var xhtml = "http://www.w3.org/1999/xhtml";
  const namespaces = {
    svg: "http://www.w3.org/2000/svg",
    xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };
  function namespace(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces.hasOwnProperty(prefix) ? { space: namespaces[prefix], local: name } : name;
  }
  function creatorInherit(name) {
    return function() {
      var document2 = this.ownerDocument, uri = this.namespaceURI;
      return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
    };
  }
  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }
  function creator(name) {
    var fullname = namespace(name);
    return (fullname.local ? creatorFixed : creatorInherit)(fullname);
  }
  function none() {
  }
  function selector(selector2) {
    return selector2 == null ? none : function() {
      return this.querySelector(selector2);
    };
  }
  function selection_select(select2) {
    if (typeof select2 !== "function") select2 = selector(select2);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select2.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }
  function array(x) {
    return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
  }
  function empty() {
    return [];
  }
  function selectorAll(selector2) {
    return selector2 == null ? empty : function() {
      return this.querySelectorAll(selector2);
    };
  }
  function arrayAll(select2) {
    return function() {
      return array(select2.apply(this, arguments));
    };
  }
  function selection_selectAll(select2) {
    if (typeof select2 === "function") select2 = arrayAll(select2);
    else select2 = selectorAll(select2);
    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select2.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }
    return new Selection(subgroups, parents);
  }
  function matcher(selector2) {
    return function() {
      return this.matches(selector2);
    };
  }
  function childMatcher(selector2) {
    return function(node) {
      return node.matches(selector2);
    };
  }
  var find = Array.prototype.find;
  function childFind(match) {
    return function() {
      return find.call(this.children, match);
    };
  }
  function childFirst() {
    return this.firstElementChild;
  }
  function selection_selectChild(match) {
    return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
  }
  var filter = Array.prototype.filter;
  function children() {
    return Array.from(this.children);
  }
  function childrenFilter(match) {
    return function() {
      return filter.call(this.children, match);
    };
  }
  function selection_selectChildren(match) {
    return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
  }
  function selection_filter(match) {
    if (typeof match !== "function") match = matcher(match);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }
  function sparse(update) {
    return new Array(update.length);
  }
  function selection_enter() {
    return new Selection(this._enter || this._groups.map(sparse), this._parents);
  }
  function EnterNode(parent, datum2) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum2;
  }
  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) {
      return this._parent.insertBefore(child, this._next);
    },
    insertBefore: function(child, next) {
      return this._parent.insertBefore(child, next);
    },
    querySelector: function(selector2) {
      return this._parent.querySelector(selector2);
    },
    querySelectorAll: function(selector2) {
      return this._parent.querySelectorAll(selector2);
    }
  };
  function constant$1(x) {
    return function() {
      return x;
    };
  }
  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0, node, groupLength = group.length, dataLength = data.length;
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }
  function bindKey(parent, group, enter, update, exit, data, key) {
    var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
        if (nodeByKeyValue.has(keyValue)) {
          exit[i] = node;
        } else {
          nodeByKeyValue.set(keyValue, node);
        }
      }
    }
    for (i = 0; i < dataLength; ++i) {
      keyValue = key.call(parent, data[i], i, data) + "";
      if (node = nodeByKeyValue.get(keyValue)) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue.delete(keyValue);
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
        exit[i] = node;
      }
    }
  }
  function datum(node) {
    return node.__data__;
  }
  function selection_data(value, key) {
    if (!arguments.length) return Array.from(this, datum);
    var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
    if (typeof value !== "function") value = constant$1(value);
    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength) ;
          previous._next = next || null;
        }
      }
    }
    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }
  function arraylike(data) {
    return typeof data === "object" && "length" in data ? data : Array.from(data);
  }
  function selection_exit() {
    return new Selection(this._exit || this._groups.map(sparse), this._parents);
  }
  function selection_join(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    if (typeof onenter === "function") {
      enter = onenter(enter);
      if (enter) enter = enter.selection();
    } else {
      enter = enter.append(onenter + "");
    }
    if (onupdate != null) {
      update = onupdate(update);
      if (update) update = update.selection();
    }
    if (onexit == null) exit.remove();
    else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }
  function selection_merge(context) {
    var selection = context.selection ? context.selection() : context;
    for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Selection(merges, this._parents);
  }
  function selection_order() {
    for (var groups = this._groups, j = -1, m = groups.length; ++j < m; ) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  }
  function selection_sort(compare) {
    if (!compare) compare = ascending;
    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }
    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }
    return new Selection(sortgroups, this._parents).order();
  }
  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }
  function selection_call() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }
  function selection_nodes() {
    return Array.from(this);
  }
  function selection_node() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }
    return null;
  }
  function selection_size() {
    let size = 0;
    for (const node of this) ++size;
    return size;
  }
  function selection_empty() {
    return !this.node();
  }
  function selection_each(callback) {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }
    return this;
  }
  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }
  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }
  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }
  function attrFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }
  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }
  function selection_attr(name, value) {
    var fullname = namespace(name);
    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
    }
    return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
  }
  function defaultView(node) {
    return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
  }
  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }
  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }
  function styleFunction(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }
  function selection_style(name, value, priority) {
    return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
  }
  function styleValue(node, name) {
    return node.style.getPropertyValue(name) || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
  }
  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }
  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }
  function propertyFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }
  function selection_property(name, value) {
    return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
  }
  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }
  function classList(node) {
    return node.classList || new ClassList(node);
  }
  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }
  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };
  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }
  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }
  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }
  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }
  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }
  function selection_classed(name, value) {
    var names = classArray(name + "");
    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }
    return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
  }
  function textRemove() {
    this.textContent = "";
  }
  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }
  function selection_text(value) {
    return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
  }
  function htmlRemove() {
    this.innerHTML = "";
  }
  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }
  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }
  function selection_html(value) {
    return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
  }
  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }
  function selection_raise() {
    return this.each(raise);
  }
  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }
  function selection_lower() {
    return this.each(lower);
  }
  function selection_append(name) {
    var create = typeof name === "function" ? name : creator(name);
    return this.select(function() {
      return this.appendChild(create.apply(this, arguments));
    });
  }
  function constantNull() {
    return null;
  }
  function selection_insert(name, before) {
    var create = typeof name === "function" ? name : creator(name), select2 = before == null ? constantNull : typeof before === "function" ? before : selector(before);
    return this.select(function() {
      return this.insertBefore(create.apply(this, arguments), select2.apply(this, arguments) || null);
    });
  }
  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }
  function selection_remove() {
    return this.each(remove);
  }
  function selection_cloneShallow() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function selection_cloneDeep() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function selection_clone(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }
  function selection_datum(value) {
    return arguments.length ? this.property("__data__", value) : this.node().__data__;
  }
  function contextListener(listener) {
    return function(event) {
      listener.call(this, event, this.__data__);
    };
  }
  function parseTypenames$1(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return { type: t, name };
    });
  }
  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }
  function onAdd(typename, value, options) {
    return function() {
      var on = this.__on, o, listener = contextListener(value);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
          this.addEventListener(o.type, o.listener = listener, o.options = options);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, options);
      o = { type: typename.type, name: typename.name, value, listener, options };
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }
  function selection_on(typename, value, options) {
    var typenames = parseTypenames$1(typename + ""), i, n = typenames.length, t;
    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }
    on = value ? onAdd : onRemove;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
    return this;
  }
  function dispatchEvent(node, type, params) {
    var window = defaultView(node), event = window.CustomEvent;
    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }
    node.dispatchEvent(event);
  }
  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }
  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }
  function selection_dispatch(type, params) {
    return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
  }
  function* selection_iterator() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) yield node;
      }
    }
  }
  var root = [null];
  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }
  function selection_selection() {
    return this;
  }
  Selection.prototype = {
    constructor: Selection,
    select: selection_select,
    selectAll: selection_selectAll,
    selectChild: selection_selectChild,
    selectChildren: selection_selectChildren,
    filter: selection_filter,
    data: selection_data,
    enter: selection_enter,
    exit: selection_exit,
    join: selection_join,
    merge: selection_merge,
    selection: selection_selection,
    order: selection_order,
    sort: selection_sort,
    call: selection_call,
    nodes: selection_nodes,
    node: selection_node,
    size: selection_size,
    empty: selection_empty,
    each: selection_each,
    attr: selection_attr,
    style: selection_style,
    property: selection_property,
    classed: selection_classed,
    text: selection_text,
    html: selection_html,
    raise: selection_raise,
    lower: selection_lower,
    append: selection_append,
    insert: selection_insert,
    remove: selection_remove,
    clone: selection_clone,
    datum: selection_datum,
    on: selection_on,
    dispatch: selection_dispatch,
    [Symbol.iterator]: selection_iterator
  };
  function select(selector2) {
    return typeof selector2 === "string" ? new Selection([[document.querySelector(selector2)]], [document.documentElement]) : new Selection([[selector2]], root);
  }
  function sourceEvent(event) {
    let sourceEvent2;
    while (sourceEvent2 = event.sourceEvent) event = sourceEvent2;
    return event;
  }
  function pointer(event, node) {
    event = sourceEvent(event);
    if (node === void 0) node = event.currentTarget;
    if (node) {
      var svg = node.ownerSVGElement || node;
      if (svg.createSVGPoint) {
        var point = svg.createSVGPoint();
        point.x = event.clientX, point.y = event.clientY;
        point = point.matrixTransform(node.getScreenCTM().inverse());
        return [point.x, point.y];
      }
      if (node.getBoundingClientRect) {
        var rect = node.getBoundingClientRect();
        return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
      }
    }
    return [event.pageX, event.pageY];
  }
  var noop = { value: () => {
  } };
  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }
  function Dispatch(_) {
    this._ = _;
  }
  function parseTypenames(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return { type: t, name };
    });
  }
  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _ = this._, T = parseTypenames(typename + "", _), t, i = -1, n = T.length;
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        return;
      }
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
      }
      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };
  function get(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }
  function set(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({ name, value: callback });
    return type;
  }
  const nonpassive = { passive: false };
  const nonpassivecapture = { capture: true, passive: false };
  function nopropagation(event) {
    event.stopImmediatePropagation();
  }
  function noevent(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function nodrag(view) {
    var root2 = view.document.documentElement, selection = select(view).on("dragstart.drag", noevent, nonpassivecapture);
    if ("onselectstart" in root2) {
      selection.on("selectstart.drag", noevent, nonpassivecapture);
    } else {
      root2.__noselect = root2.style.MozUserSelect;
      root2.style.MozUserSelect = "none";
    }
  }
  function yesdrag(view, noclick) {
    var root2 = view.document.documentElement, selection = select(view).on("dragstart.drag", null);
    if (noclick) {
      selection.on("click.drag", noevent, nonpassivecapture);
      setTimeout(function() {
        selection.on("click.drag", null);
      }, 0);
    }
    if ("onselectstart" in root2) {
      selection.on("selectstart.drag", null);
    } else {
      root2.style.MozUserSelect = root2.__noselect;
      delete root2.__noselect;
    }
  }
  const constant = (x) => () => x;
  function DragEvent(type, {
    sourceEvent: sourceEvent2,
    subject,
    target,
    identifier,
    active,
    x,
    y,
    dx,
    dy,
    dispatch: dispatch2
  }) {
    Object.defineProperties(this, {
      type: { value: type, enumerable: true, configurable: true },
      sourceEvent: { value: sourceEvent2, enumerable: true, configurable: true },
      subject: { value: subject, enumerable: true, configurable: true },
      target: { value: target, enumerable: true, configurable: true },
      identifier: { value: identifier, enumerable: true, configurable: true },
      active: { value: active, enumerable: true, configurable: true },
      x: { value: x, enumerable: true, configurable: true },
      y: { value: y, enumerable: true, configurable: true },
      dx: { value: dx, enumerable: true, configurable: true },
      dy: { value: dy, enumerable: true, configurable: true },
      _: { value: dispatch2 }
    });
  }
  DragEvent.prototype.on = function() {
    var value = this._.on.apply(this._, arguments);
    return value === this._ ? this : value;
  };
  function defaultFilter(event) {
    return !event.ctrlKey && !event.button;
  }
  function defaultContainer() {
    return this.parentNode;
  }
  function defaultSubject(event, d) {
    return d == null ? { x: event.x, y: event.y } : d;
  }
  function defaultTouchable() {
    return navigator.maxTouchPoints || "ontouchstart" in this;
  }
  function drag() {
    var filter2 = defaultFilter, container = defaultContainer, subject = defaultSubject, touchable = defaultTouchable, gestures = {}, listeners = dispatch("start", "drag", "end"), active = 0, mousedownx, mousedowny, mousemoving, touchending, clickDistance2 = 0;
    function drag2(selection) {
      selection.on("mousedown.drag", mousedowned).filter(touchable).on("touchstart.drag", touchstarted).on("touchmove.drag", touchmoved, nonpassive).on("touchend.drag touchcancel.drag", touchended).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }
    function mousedowned(event, d) {
      if (touchending || !filter2.call(this, event, d)) return;
      var gesture = beforestart(this, container.call(this, event, d), event, d, "mouse");
      if (!gesture) return;
      select(event.view).on("mousemove.drag", mousemoved, nonpassivecapture).on("mouseup.drag", mouseupped, nonpassivecapture);
      nodrag(event.view);
      nopropagation(event);
      mousemoving = false;
      mousedownx = event.clientX;
      mousedowny = event.clientY;
      gesture("start", event);
    }
    function mousemoved(event) {
      noevent(event);
      if (!mousemoving) {
        var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
        mousemoving = dx * dx + dy * dy > clickDistance2;
      }
      gestures.mouse("drag", event);
    }
    function mouseupped(event) {
      select(event.view).on("mousemove.drag mouseup.drag", null);
      yesdrag(event.view, mousemoving);
      noevent(event);
      gestures.mouse("end", event);
    }
    function touchstarted(event, d) {
      if (!filter2.call(this, event, d)) return;
      var touches = event.changedTouches, c = container.call(this, event, d), n = touches.length, i, gesture;
      for (i = 0; i < n; ++i) {
        if (gesture = beforestart(this, c, event, d, touches[i].identifier, touches[i])) {
          nopropagation(event);
          gesture("start", event, touches[i]);
        }
      }
    }
    function touchmoved(event) {
      var touches = event.changedTouches, n = touches.length, i, gesture;
      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          noevent(event);
          gesture("drag", event, touches[i]);
        }
      }
    }
    function touchended(event) {
      var touches = event.changedTouches, n = touches.length, i, gesture;
      if (touchending) clearTimeout(touchending);
      touchending = setTimeout(function() {
        touchending = null;
      }, 500);
      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          nopropagation(event);
          gesture("end", event, touches[i]);
        }
      }
    }
    function beforestart(that, container2, event, d, identifier, touch) {
      var dispatch2 = listeners.copy(), p = pointer(touch || event, container2), dx, dy, s;
      if ((s = subject.call(that, new DragEvent("beforestart", {
        sourceEvent: event,
        target: drag2,
        identifier,
        active,
        x: p[0],
        y: p[1],
        dx: 0,
        dy: 0,
        dispatch: dispatch2
      }), d)) == null) return;
      dx = s.x - p[0] || 0;
      dy = s.y - p[1] || 0;
      return function gesture(type, event2, touch2) {
        var p0 = p, n;
        switch (type) {
          case "start":
            gestures[identifier] = gesture, n = active++;
            break;
          case "end":
            delete gestures[identifier], --active;
          case "drag":
            p = pointer(touch2 || event2, container2), n = active;
            break;
        }
        dispatch2.call(
          type,
          that,
          new DragEvent(type, {
            sourceEvent: event2,
            subject: s,
            target: drag2,
            identifier,
            active: n,
            x: p[0] + dx,
            y: p[1] + dy,
            dx: p[0] - p0[0],
            dy: p[1] - p0[1],
            dispatch: dispatch2
          }),
          d
        );
      };
    }
    drag2.filter = function(_) {
      return arguments.length ? (filter2 = typeof _ === "function" ? _ : constant(!!_), drag2) : filter2;
    };
    drag2.container = function(_) {
      return arguments.length ? (container = typeof _ === "function" ? _ : constant(_), drag2) : container;
    };
    drag2.subject = function(_) {
      return arguments.length ? (subject = typeof _ === "function" ? _ : constant(_), drag2) : subject;
    };
    drag2.touchable = function(_) {
      return arguments.length ? (touchable = typeof _ === "function" ? _ : constant(!!_), drag2) : touchable;
    };
    drag2.on = function() {
      var value = listeners.on.apply(listeners, arguments);
      return value === listeners ? drag2 : value;
    };
    drag2.clickDistance = function(_) {
      return arguments.length ? (clickDistance2 = (_ = +_) * _, drag2) : Math.sqrt(clickDistance2);
    };
    return drag2;
  }
  var ResizeControlVariant = /* @__PURE__ */ ((ResizeControlVariant2) => {
    ResizeControlVariant2["Line"] = "line";
    ResizeControlVariant2["Handle"] = "handle";
    return ResizeControlVariant2;
  })(ResizeControlVariant || {});
  function getDirection({ width, prevWidth, height, prevHeight, invertX, invertY }) {
    const deltaWidth = width - prevWidth;
    const deltaHeight = height - prevHeight;
    const direction = [deltaWidth > 0 ? 1 : deltaWidth < 0 ? -1 : 0, deltaHeight > 0 ? 1 : deltaHeight < 0 ? -1 : 0];
    if (deltaWidth && invertX) {
      direction[0] = direction[0] * -1;
    }
    if (deltaHeight && invertY) {
      direction[1] = direction[1] * -1;
    }
    return direction;
  }
  const DefaultPositions = {
    [ResizeControlVariant.Line]: "right",
    [ResizeControlVariant.Handle]: "bottom-right"
  };
  const StylingProperty = {
    [ResizeControlVariant.Line]: "borderColor",
    [ResizeControlVariant.Handle]: "backgroundColor"
  };
  const __default__$1 = {
    name: "ResizeControl",
    compatConfig: { MODE: 3 }
  };
  const _sfc_main$1 = /* @__PURE__ */ vue.defineComponent({
    ...__default__$1,
    props: {
      nodeId: {},
      color: {},
      minWidth: { default: 10 },
      minHeight: { default: 10 },
      maxWidth: { default: Number.MAX_VALUE },
      maxHeight: { default: Number.MAX_VALUE },
      position: {},
      variant: { default: "handle" },
      shouldResize: {},
      keepAspectRatio: { type: [Boolean, Number], default: false },
      autoScale: { type: Boolean, default: true },
      handleClassName: {},
      handleStyle: {},
      lineClassName: {},
      lineStyle: {},
      isVisible: { type: Boolean }
    },
    emits: ["resizeStart", "resize", "resizeEnd"],
    setup(__props, { emit: emits }) {
      const props = __props;
      const initPrevValues = { width: 0, height: 0, x: 0, y: 0 };
      const initStartValues = {
        ...initPrevValues,
        pointerX: 0,
        pointerY: 0,
        aspectRatio: 1
      };
      const { findNode, emits: triggerEmits, viewport, noDragClassName } = core.useVueFlow();
      const getPointerPosition = core.useGetPointerPosition();
      const resizeControlRef = vue.ref();
      let startValues = initStartValues;
      let prevValues = initPrevValues;
      const controlPosition = vue.toRef(() => props.position ?? DefaultPositions[props.variant]);
      const positionClassNames = vue.computed(() => controlPosition.value.split("-"));
      const controlStyle = vue.toRef(() => props.color ? { [StylingProperty[props.variant]]: props.color } : {});
      vue.watchEffect((onCleanup) => {
        if (!resizeControlRef.value || !props.nodeId) {
          return;
        }
        const selection = select(resizeControlRef.value);
        const enableX = controlPosition.value.includes("right") || controlPosition.value.includes("left");
        const enableY = controlPosition.value.includes("bottom") || controlPosition.value.includes("top");
        const invertX = controlPosition.value.includes("left");
        const invertY = controlPosition.value.includes("top");
        const dragHandler = drag().on("start", (event) => {
          const node = findNode(props.nodeId);
          const { xSnapped, ySnapped } = getPointerPosition(event);
          prevValues = {
            width: (node == null ? void 0 : node.dimensions.width) ?? 0,
            height: (node == null ? void 0 : node.dimensions.height) ?? 0,
            x: (node == null ? void 0 : node.position.x) ?? 0,
            y: (node == null ? void 0 : node.position.y) ?? 0
          };
          startValues = {
            ...prevValues,
            pointerX: xSnapped,
            pointerY: ySnapped,
            aspectRatio: prevValues.width / prevValues.height
          };
          emits("resizeStart", { event, params: prevValues });
        }).on("drag", (event) => {
          var _a;
          const { xSnapped, ySnapped } = getPointerPosition(event);
          const node = findNode(props.nodeId);
          if (node) {
            const changes = [];
            const {
              pointerX: startX,
              pointerY: startY,
              width: startWidth,
              height: startHeight,
              x: startNodeX,
              y: startNodeY,
              aspectRatio: startAspectRatio
            } = startValues;
            const { x: prevX, y: prevY, width: prevWidth, height: prevHeight } = prevValues;
            const distX = Math.floor(enableX ? xSnapped - startX : 0);
            const distY = Math.floor(enableY ? ySnapped - startY : 0);
            let width = core.clamp(startWidth + (invertX ? -distX : distX), props.minWidth, props.maxWidth);
            let height = core.clamp(startHeight + (invertY ? -distY : distY), props.minHeight, props.maxHeight);
            if (props.keepAspectRatio) {
              const nextAspectRatio = width / height;
              let aspectRatio = startAspectRatio;
              if (typeof props.keepAspectRatio === "number" && nextAspectRatio !== props.keepAspectRatio) {
                aspectRatio = props.keepAspectRatio;
              }
              const isDiagonal = enableX && enableY;
              const isHorizontal = enableX && !enableY;
              const isVertical = enableY && !enableX;
              width = nextAspectRatio <= aspectRatio && isDiagonal || isVertical ? height * aspectRatio : width;
              height = nextAspectRatio > aspectRatio && isDiagonal || isHorizontal ? width / aspectRatio : height;
              if (width >= props.maxWidth) {
                width = props.maxWidth;
                height = props.maxWidth / aspectRatio;
              } else if (width <= props.minWidth) {
                width = props.minWidth;
                height = props.minWidth / aspectRatio;
              }
              if (height >= props.maxHeight) {
                height = props.maxHeight;
                width = props.maxHeight * aspectRatio;
              } else if (height <= props.minHeight) {
                height = props.minHeight;
                width = props.minHeight * aspectRatio;
              }
            }
            const isWidthChange = width !== prevWidth;
            const isHeightChange = height !== prevHeight;
            if (invertX || invertY) {
              const x = invertX ? startNodeX - (width - startWidth) : startNodeX;
              const y = invertY ? startNodeY - (height - startHeight) : startNodeY;
              const isXPosChange = x !== prevX && isWidthChange;
              const isYPosChange = y !== prevY && isHeightChange;
              if (isXPosChange || isYPosChange) {
                const positionChange = {
                  id: node.id,
                  type: "position",
                  from: node.position,
                  position: {
                    x: isXPosChange ? x : prevX,
                    y: isYPosChange ? y : prevY
                  }
                };
                changes.push(positionChange);
                prevValues.x = positionChange.position.x;
                prevValues.y = positionChange.position.y;
              }
            }
            if (props.nodeId && (isWidthChange || isHeightChange)) {
              const dimensionChange = {
                id: props.nodeId,
                type: "dimensions",
                updateStyle: true,
                resizing: true,
                dimensions: {
                  width,
                  height
                }
              };
              changes.push(dimensionChange);
              prevValues.width = width;
              prevValues.height = height;
            }
            if (changes.length === 0) {
              return;
            }
            const direction = getDirection({
              width: prevValues.width,
              prevWidth,
              height: prevValues.height,
              prevHeight,
              invertX,
              invertY
            });
            const nextValues = { ...prevValues, direction };
            const callResize = (_a = props.shouldResize) == null ? void 0 : _a.call(props, event, nextValues);
            if (callResize === false) {
              return;
            }
            emits("resize", { event, params: nextValues });
            triggerEmits.nodesChange(changes);
          }
        }).on("end", (event) => {
          if (props.nodeId) {
            const dimensionChange = {
              id: props.nodeId,
              type: "dimensions",
              resizing: false
            };
            emits("resizeEnd", { event, params: prevValues });
            triggerEmits.nodesChange([dimensionChange]);
          }
        });
        selection.call(dragHandler);
        onCleanup(() => {
          selection.on(".drag", null);
        });
      });
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("div", {
          ref_key: "resizeControlRef",
          ref: resizeControlRef,
          class: vue.normalizeClass(["vue-flow__resize-control", [...positionClassNames.value, _ctx.variant, vue.unref(noDragClassName)]]),
          style: vue.normalizeStyle({
            ...controlStyle.value,
            scale: _ctx.variant === vue.unref(ResizeControlVariant).Handle ? `${Math.max(1 / vue.unref(viewport).zoom, 1)}` : void 0
          })
        }, [
          vue.renderSlot(_ctx.$slots, "default")
        ], 6);
      };
    }
  });
  const __default__ = {
    name: "NodeResizer",
    compatConfig: { MODE: 3 },
    inheritAttrs: false
  };
  const _sfc_main = /* @__PURE__ */ vue.defineComponent({
    ...__default__,
    props: {
      nodeId: {},
      color: {},
      handleClassName: {},
      handleStyle: {},
      lineClassName: {},
      lineStyle: {},
      isVisible: { type: Boolean, default: true },
      minWidth: {},
      minHeight: {},
      maxWidth: {},
      maxHeight: {},
      shouldResize: {},
      keepAspectRatio: { type: [Boolean, Number] },
      autoScale: { type: Boolean, default: true }
    },
    emits: ["resizeStart", "resize", "resizeEnd"],
    setup(__props, { emit: emits }) {
      const props = __props;
      const { findNode, emits: triggerEmits } = core.useVueFlow();
      const handleControls = ["top-left", "top-right", "bottom-left", "bottom-right"];
      const lineControls = ["top", "right", "bottom", "left"];
      const contextNodeId = vue.inject(core.NodeIdInjection, null);
      const nodeId = vue.toRef(() => typeof props.nodeId === "string" ? props.nodeId : contextNodeId);
      const node = vue.computed(() => findNode(nodeId.value));
      vue.watch(
        [
          () => props.minWidth,
          () => props.minHeight,
          () => props.maxWidth,
          () => props.maxHeight,
          () => {
            var _a;
            return !!((_a = node.value) == null ? void 0 : _a.dimensions.width) && !!node.value.dimensions.height;
          }
        ],
        ([minWidth, minHeight, maxWidth, maxHeight, isInitialized]) => {
          const n = node.value;
          if (n && isInitialized) {
            const dimensionChange = {
              id: n.id,
              type: "dimensions",
              updateStyle: true,
              dimensions: {
                width: n.dimensions.width,
                height: n.dimensions.height
              }
            };
            if (minWidth && n.dimensions.width < minWidth) {
              dimensionChange.dimensions.width = minWidth;
            }
            if (minHeight && n.dimensions.height < minHeight) {
              dimensionChange.dimensions.height = minHeight;
            }
            if (maxWidth && n.dimensions.width > maxWidth) {
              dimensionChange.dimensions.width = maxWidth;
            }
            if (maxHeight && n.dimensions.height > maxHeight) {
              dimensionChange.dimensions.height = maxHeight;
            }
            if (dimensionChange.dimensions.width !== n.dimensions.width || dimensionChange.dimensions.height !== n.dimensions.height) {
              triggerEmits.nodesChange([dimensionChange]);
            }
          }
        },
        { flush: "post", immediate: true }
      );
      return (_ctx, _cache) => {
        return _ctx.isVisible ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
          (vue.openBlock(), vue.createElementBlock(vue.Fragment, null, vue.renderList(lineControls, (c) => {
            return vue.createVNode(_sfc_main$1, {
              key: c,
              class: vue.normalizeClass(_ctx.lineClassName),
              style: vue.normalizeStyle(_ctx.lineStyle),
              "node-id": nodeId.value,
              position: c,
              variant: vue.unref(ResizeControlVariant).Line,
              color: _ctx.color,
              "min-width": _ctx.minWidth,
              "min-height": _ctx.minHeight,
              "max-width": _ctx.maxWidth,
              "max-height": _ctx.maxHeight,
              "should-resize": _ctx.shouldResize,
              "keep-aspect-ratio": _ctx.keepAspectRatio,
              "auto-scale": _ctx.autoScale,
              onResizeStart: _cache[0] || (_cache[0] = ($event) => emits("resizeStart", $event)),
              onResize: _cache[1] || (_cache[1] = ($event) => emits("resize", $event)),
              onResizeEnd: _cache[2] || (_cache[2] = ($event) => emits("resizeEnd", $event))
            }, null, 8, ["class", "style", "node-id", "position", "variant", "color", "min-width", "min-height", "max-width", "max-height", "should-resize", "keep-aspect-ratio", "auto-scale"]);
          }), 64)),
          (vue.openBlock(), vue.createElementBlock(vue.Fragment, null, vue.renderList(handleControls, (c) => {
            return vue.createVNode(_sfc_main$1, {
              key: c,
              class: vue.normalizeClass(_ctx.handleClassName),
              style: vue.normalizeStyle(_ctx.handleStyle),
              "node-id": nodeId.value,
              position: c,
              color: _ctx.color,
              "min-width": _ctx.minWidth,
              "min-height": _ctx.minHeight,
              "max-width": _ctx.maxWidth,
              "max-height": _ctx.maxHeight,
              "should-resize": _ctx.shouldResize,
              "keep-aspect-ratio": _ctx.keepAspectRatio,
              "auto-scale": _ctx.autoScale,
              onResizeStart: _cache[3] || (_cache[3] = ($event) => emits("resizeStart", $event)),
              onResize: _cache[4] || (_cache[4] = ($event) => emits("resize", $event)),
              onResizeEnd: _cache[5] || (_cache[5] = ($event) => emits("resizeEnd", $event))
            }, null, 8, ["class", "style", "node-id", "position", "color", "min-width", "min-height", "max-width", "max-height", "should-resize", "keep-aspect-ratio", "auto-scale"]);
          }), 64))
        ], 64)) : vue.createCommentVNode("", true);
      };
    }
  });
  exports.NodeResizeControl = _sfc_main$1;
  exports.NodeResizer = _sfc_main;
  exports.ResizeControlVariant = ResizeControlVariant;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({}, Vue, VueFlowCore);
