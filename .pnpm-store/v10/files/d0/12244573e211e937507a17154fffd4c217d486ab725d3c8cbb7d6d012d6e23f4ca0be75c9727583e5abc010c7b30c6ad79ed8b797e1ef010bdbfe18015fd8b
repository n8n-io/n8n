"use strict";
module.exports = Document;

var Node = require('./Node');
var NodeList = require('./NodeList');
var ContainerNode = require('./ContainerNode');
var Element = require('./Element');
var Text = require('./Text');
var Comment = require('./Comment');
var Event = require('./Event');
var DocumentFragment = require('./DocumentFragment');
var ProcessingInstruction = require('./ProcessingInstruction');
var DOMImplementation = require('./DOMImplementation');
var TreeWalker = require('./TreeWalker');
var NodeIterator = require('./NodeIterator');
var NodeFilter = require('./NodeFilter');
var URL = require('./URL');
var select = require('./select');
var events = require('./events');
var xml = require('./xmlnames');
var html = require('./htmlelts');
var svg = require('./svg');
var utils = require('./utils');
var MUTATE = require('./MutationConstants');
var NAMESPACE = utils.NAMESPACE;
var isApiWritable = require("./config").isApiWritable;

function Document(isHTML, address) {
  ContainerNode.call(this);
  this.nodeType = Node.DOCUMENT_NODE;
  this.isHTML = isHTML;
  this._address = address || 'about:blank';
  this.readyState = 'loading';
  this.implementation = new DOMImplementation(this);

  // DOMCore says that documents are always associated with themselves
  this.ownerDocument = null; // ... but W3C tests expect null
  this._contentType = isHTML ? 'text/html' : 'application/xml';

  // These will be initialized by our custom versions of
  // appendChild and insertBefore that override the inherited
  // Node methods.
  // XXX: override those methods!
  this.doctype = null;
  this.documentElement = null;

  // "Associated inert template document"
  this._templateDocCache = null;
  // List of active NodeIterators, see NodeIterator#_preremove()
  this._nodeIterators = null;

  // Documents are always rooted, by definition
  this._nid = 1;
  this._nextnid = 2; // For numbering children of the document
  this._nodes = [null, this];  // nid to node map

  // This maintains the mapping from element ids to element nodes.
  // We may need to update this mapping every time a node is rooted
  // or uprooted, and any time an attribute is added, removed or changed
  // on a rooted element.
  this.byId = Object.create(null);

  // This property holds a monotonically increasing value akin to
  // a timestamp used to record the last modification time of nodes
  // and their subtrees. See the lastModTime attribute and modify()
  // method of the Node class. And see FilteredElementList for an example
  // of the use of lastModTime
  this.modclock = 0;
}

// Map from lowercase event category names (used as arguments to
// createEvent()) to the property name in the impl object of the
// event constructor.
var supportedEvents = {
  event: 'Event',
  customevent: 'CustomEvent',
  uievent: 'UIEvent',
  mouseevent: 'MouseEvent'
};

// Certain arguments to document.createEvent() must be treated specially
var replacementEvent = {
  events: 'event',
  htmlevents: 'event',
  mouseevents: 'mouseevent',
  mutationevents: 'mutationevent',
  uievents: 'uievent'
};

var mirrorAttr = function(f, name, defaultValue) {
  return {
    get: function() {
      var o = f.call(this);
      if (o) { return o[name]; }
      return defaultValue;
    },
    set: function(value) {
      var o = f.call(this);
      if (o) { o[name] = value; }
    },
  };
};

/** @spec https://dom.spec.whatwg.org/#validate-and-extract */
function validateAndExtract(namespace, qualifiedName) {
  var prefix, localName, pos;
  if (namespace==='') { namespace = null; }
  // See https://github.com/whatwg/dom/issues/671
  // and https://github.com/whatwg/dom/issues/319
  if (!xml.isValidQName(qualifiedName)) {
    utils.InvalidCharacterError();
  }
  prefix = null;
  localName = qualifiedName;

  pos = qualifiedName.indexOf(':');
  if (pos >= 0) {
    prefix = qualifiedName.substring(0, pos);
    localName = qualifiedName.substring(pos+1);
  }
  if (prefix !== null && namespace === null) {
    utils.NamespaceError();
  }
  if (prefix === 'xml' && namespace !== NAMESPACE.XML) {
    utils.NamespaceError();
  }
  if ((prefix === 'xmlns' || qualifiedName === 'xmlns') &&
      namespace !== NAMESPACE.XMLNS) {
    utils.NamespaceError();
  }
  if (namespace === NAMESPACE.XMLNS && !(prefix==='xmlns' || qualifiedName==='xmlns')) {
    utils.NamespaceError();
  }
  return { namespace: namespace, prefix: prefix, localName: localName };
}

Document.prototype = Object.create(ContainerNode.prototype, {
  // This method allows dom.js to communicate with a renderer
  // that displays the document in some way
  // XXX: I should probably move this to the window object
  _setMutationHandler: { value: function(handler) {
    this.mutationHandler = handler;
  }},

  // This method allows dom.js to receive event notifications
  // from the renderer.
  // XXX: I should probably move this to the window object
  _dispatchRendererEvent: { value: function(targetNid, type, details) {
    var target = this._nodes[targetNid];
    if (!target) return;
    target._dispatchEvent(new Event(type, details), true);
  }},

  nodeName: { value: '#document'},
  nodeValue: {
    get: function() {
      return null;
    },
    set: function() {}
  },

  // XXX: DOMCore may remove documentURI, so it is NYI for now
  documentURI: { get: function() { return this._address; }, set: utils.nyi },
  compatMode: { get: function() {
    // The _quirks property is set by the HTML parser
    return this._quirks ? 'BackCompat' : 'CSS1Compat';
  }},

  createTextNode: { value: function(data) {
    return new Text(this, String(data));
  }},
  createComment: { value: function(data) {
    return new Comment(this, data);
  }},
  createDocumentFragment: { value: function() {
    return new DocumentFragment(this);
  }},
  createProcessingInstruction: { value: function(target, data) {
    if (!xml.isValidName(target) || data.indexOf('?>') !== -1)
      utils.InvalidCharacterError();
    return new ProcessingInstruction(this, target, data);
  }},

  createAttribute: { value: function(localName) {
    localName = String(localName);
    if (!xml.isValidName(localName)) utils.InvalidCharacterError();
    if (this.isHTML) {
      localName = utils.toASCIILowerCase(localName);
    }
    return new Element._Attr(null, localName, null, null, '');
  }},
  createAttributeNS: { value: function(namespace, qualifiedName) {
    // Convert parameter types according to WebIDL
    namespace =
      (namespace === null || namespace === undefined || namespace === '') ? null :
      String(namespace);
    qualifiedName = String(qualifiedName);
    var ve = validateAndExtract(namespace, qualifiedName);
    return new Element._Attr(null, ve.localName, ve.prefix, ve.namespace, '');
  }},

  createElement: { value: function(localName) {
    localName = String(localName);
    if (!xml.isValidName(localName)) utils.InvalidCharacterError();
    // Per spec, namespace should be HTML namespace if "context object is
    // an HTML document or context object's content type is
    // "application/xhtml+xml", and null otherwise.
    if (this.isHTML) {
      if (/[A-Z]/.test(localName))
        localName = utils.toASCIILowerCase(localName);
      return html.createElement(this, localName, null);
    } else if (this.contentType === 'application/xhtml+xml') {
      return html.createElement(this, localName, null);
    } else {
      return new Element(this, localName, null, null);
    }
  }, writable: isApiWritable },

  createElementNS: { value: function(namespace, qualifiedName) {
    // Convert parameter types according to WebIDL
    namespace =
      (namespace === null || namespace === undefined || namespace === '') ? null :
      String(namespace);
    qualifiedName = String(qualifiedName);
    var ve = validateAndExtract(namespace, qualifiedName);
    return this._createElementNS(ve.localName, ve.namespace, ve.prefix);
  }, writable: isApiWritable },

  // This is used directly by HTML parser, which allows it to create
  // elements with localNames containing ':' and non-default namespaces
  _createElementNS: { value: function(localName, namespace, prefix) {
    if (namespace === NAMESPACE.HTML) {
      return html.createElement(this, localName, prefix);
    }
    else if (namespace === NAMESPACE.SVG) {
      return svg.createElement(this, localName, prefix);
    }

    return new Element(this, localName, namespace, prefix);
  }},

  createEvent: { value: function createEvent(interfaceName) {
    interfaceName = interfaceName.toLowerCase();
    var name = replacementEvent[interfaceName] || interfaceName;
    var constructor = events[supportedEvents[name]];

    if (constructor) {
      var e = new constructor();
      e._initialized = false;
      return e;
    }
    else {
      utils.NotSupportedError();
    }
  }},

  // See: http://www.w3.org/TR/dom/#dom-document-createtreewalker
  createTreeWalker: {value: function (root, whatToShow, filter) {
    if (!root) { throw new TypeError("root argument is required"); }
    if (!(root instanceof Node)) { throw new TypeError("root not a node"); }
    whatToShow = whatToShow === undefined ? NodeFilter.SHOW_ALL : (+whatToShow);
    filter = filter === undefined ? null : filter;

    return new TreeWalker(root, whatToShow, filter);
  }},

  // See: http://www.w3.org/TR/dom/#dom-document-createnodeiterator
  createNodeIterator: {value: function (root, whatToShow, filter) {
    if (!root) { throw new TypeError("root argument is required"); }
    if (!(root instanceof Node)) { throw new TypeError("root not a node"); }
    whatToShow = whatToShow === undefined ? NodeFilter.SHOW_ALL : (+whatToShow);
    filter = filter === undefined ? null : filter;

    return new NodeIterator(root, whatToShow, filter);
  }},

  _attachNodeIterator: { value: function(ni) {
    // XXX ideally this should be a weak reference from Document to NodeIterator
    if (!this._nodeIterators) { this._nodeIterators = []; }
    this._nodeIterators.push(ni);
  }},

  _detachNodeIterator: { value: function(ni) {
    // ni should always be in list of node iterators
    var idx = this._nodeIterators.indexOf(ni);
    this._nodeIterators.splice(idx, 1);
  }},

  _preremoveNodeIterators: { value: function(toBeRemoved) {
    if (this._nodeIterators) {
      this._nodeIterators.forEach(function(ni) { ni._preremove(toBeRemoved); });
    }
  }},

  // Maintain the documentElement and
  // doctype properties of the document.  Each of the following
  // methods chains to the Node implementation of the method
  // to do the actual inserting, removal or replacement.

  _updateDocTypeElement: { value: function _updateDocTypeElement() {
    this.doctype = this.documentElement = null;
    for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling) {
      if (kid.nodeType === Node.DOCUMENT_TYPE_NODE)
        this.doctype = kid;
      else if (kid.nodeType === Node.ELEMENT_NODE)
        this.documentElement = kid;
    }
  }},

  insertBefore: { value: function insertBefore(child, refChild) {
    Node.prototype.insertBefore.call(this, child, refChild);
    this._updateDocTypeElement();
    return child;
  }},

  replaceChild: { value: function replaceChild(node, child) {
    Node.prototype.replaceChild.call(this, node, child);
    this._updateDocTypeElement();
    return child;
  }},

  removeChild: { value: function removeChild(child) {
    Node.prototype.removeChild.call(this, child);
    this._updateDocTypeElement();
    return child;
  }},

  getElementById: { value: function(id) {
    var n = this.byId[id];
    if (!n) return null;
    if (n instanceof MultiId) { // there was more than one element with this id
      return n.getFirst();
    }
    return n;
  }},

  _hasMultipleElementsWithId: { value: function(id) {
    // Used internally by querySelectorAll optimization
    return (this.byId[id] instanceof MultiId);
  }},

  // Just copy this method from the Element prototype
  getElementsByName: { value: Element.prototype.getElementsByName },
  getElementsByTagName: { value: Element.prototype.getElementsByTagName },
  getElementsByTagNameNS: { value: Element.prototype.getElementsByTagNameNS },
  getElementsByClassName: { value: Element.prototype.getElementsByClassName },

  adoptNode: { value: function adoptNode(node) {
    if (node.nodeType === Node.DOCUMENT_NODE) utils.NotSupportedError();
    if (node.nodeType === Node.ATTRIBUTE_NODE) { return node; }

    if (node.parentNode) node.parentNode.removeChild(node);

    if (node.ownerDocument !== this)
      recursivelySetOwner(node, this);

    return node;
  }},

  importNode: { value: function importNode(node, deep) {
    return this.adoptNode(node.cloneNode(deep));
  }, writable: isApiWritable },

  // The following attributes and methods are from the HTML spec
  origin: { get: function origin() { return null; } },
  characterSet: { get: function characterSet() { return "UTF-8"; } },
  contentType: { get: function contentType() { return this._contentType; } },
  URL: { get: function URL() { return this._address; } },
  domain: { get: utils.nyi, set: utils.nyi },
  referrer: { get: utils.nyi },
  cookie: { get: utils.nyi, set: utils.nyi },
  lastModified: { get: utils.nyi },
  location: {
	get: function() {
	  return this.defaultView ? this.defaultView.location : null; // gh #75
	},
	set: utils.nyi
  },
  _titleElement: {
    get: function() {
      // The title element of a document is the first title element in the
      // document in tree order, if there is one, or null otherwise.
      return this.getElementsByTagName('title').item(0) || null;
    }
  },
  title: {
    get: function() {
      var elt = this._titleElement;
      // The child text content of the title element, or '' if null.
      var value = elt ? elt.textContent : '';
      // Strip and collapse whitespace in value
      return value.replace(/[ \t\n\r\f]+/g, ' ').replace(/(^ )|( $)/g, '');
    },
    set: function(value) {
      var elt = this._titleElement;
      var head = this.head;
      if (!elt && !head) { return; /* according to spec */ }
      if (!elt) {
        elt = this.createElement('title');
        head.appendChild(elt);
      }
      elt.textContent = value;
    }
  },
  dir: mirrorAttr(function() {
    var htmlElement = this.documentElement;
    if (htmlElement && htmlElement.tagName === 'HTML') { return htmlElement; }
  }, 'dir', ''),
  fgColor: mirrorAttr(function() { return this.body; }, 'text', ''),
  linkColor: mirrorAttr(function() { return this.body; }, 'link', ''),
  vlinkColor: mirrorAttr(function() { return this.body; }, 'vLink', ''),
  alinkColor: mirrorAttr(function() { return this.body; }, 'aLink', ''),
  bgColor: mirrorAttr(function() { return this.body; }, 'bgColor', ''),

  // Historical aliases of Document#characterSet
  charset: { get: function() { return this.characterSet; } },
  inputEncoding: { get: function() { return this.characterSet; } },

  scrollingElement: {
    get: function() {
      return this._quirks ? this.body : this.documentElement;
    }
  },

  // Return the first <body> child of the document element.
  // XXX For now, setting this attribute is not implemented.
  body: {
    get: function() {
      return namedHTMLChild(this.documentElement, 'body');
    },
    set: utils.nyi
  },
  // Return the first <head> child of the document element.
  head: { get: function() {
    return namedHTMLChild(this.documentElement, 'head');
  }},
  images: { get: utils.nyi },
  embeds: { get: utils.nyi },
  plugins: { get: utils.nyi },
  links: { get: utils.nyi },
  forms: { get: utils.nyi },
  scripts: { get: utils.nyi },
  applets: { get: function() { return []; } },
  activeElement: { get: function() { return null; } },
  innerHTML: {
    get: function() { return this.serialize(); },
    set: utils.nyi
  },
  outerHTML: {
    get: function() { return this.serialize(); },
    set: utils.nyi
  },

  write: { value: function(args) {
    if (!this.isHTML) utils.InvalidStateError();

    // XXX: still have to implement the ignore part
    if (!this._parser /* && this._ignore_destructive_writes > 0 */ )
      return;

    if (!this._parser) {
      // XXX call document.open, etc.
    }

    var s = arguments.join('');

    // If the Document object's reload override flag is set, then
    // append the string consisting of the concatenation of all the
    // arguments to the method to the Document's reload override
    // buffer.
    // XXX: don't know what this is about.  Still have to do it

    // If there is no pending parsing-blocking script, have the
    // tokenizer process the characters that were inserted, one at a
    // time, processing resulting tokens as they are emitted, and
    // stopping when the tokenizer reaches the insertion point or when
    // the processing of the tokenizer is aborted by the tree
    // construction stage (this can happen if a script end tag token is
    // emitted by the tokenizer).

    // XXX: still have to do the above. Sounds as if we don't
    // always call parse() here.  If we're blocked, then we just
    // insert the text into the stream but don't parse it reentrantly...

    // Invoke the parser reentrantly
    this._parser.parse(s);
  }},

  writeln: { value: function writeln(args) {
    this.write(Array.prototype.join.call(arguments, '') + '\n');
  }},

  open: { value: function() {
    this.documentElement = null;
  }},

  close: { value: function() {
    this.readyState = 'interactive';
    this._dispatchEvent(new Event('readystatechange'), true);
    this._dispatchEvent(new Event('DOMContentLoaded'), true);
    this.readyState = 'complete';
    this._dispatchEvent(new Event('readystatechange'), true);
    if (this.defaultView) {
      this.defaultView._dispatchEvent(new Event('load'), true);
    }
  }},

  // Utility methods
  clone: { value: function clone() {
    var d = new Document(this.isHTML, this._address);
    d._quirks = this._quirks;
    d._contentType = this._contentType;
    return d;
  }},

  // We need to adopt the nodes if we do a deep clone
  cloneNode: { value: function cloneNode(deep) {
    var clone = Node.prototype.cloneNode.call(this, false);
    if (deep) {
      for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling) {
        clone._appendChild(clone.importNode(kid, true));
      }
    }
    clone._updateDocTypeElement();
    return clone;
  }},

  isEqual: { value: function isEqual(n) {
    // Any two documents are shallowly equal.
    // Node.isEqualNode will also test the children
    return true;
  }},

  // Implementation-specific function.  Called when a text, comment,
  // or pi value changes.
  mutateValue: { value: function(node) {
    if (this.mutationHandler) {
      this.mutationHandler({
        type: MUTATE.VALUE,
        target: node,
        data: node.data
      });
    }
  }},

  // Invoked when an attribute's value changes. Attr holds the new
  // value.  oldval is the old value.  Attribute mutations can also
  // involve changes to the prefix (and therefore the qualified name)
  mutateAttr: { value: function(attr, oldval) {
    // Manage id->element mapping for getElementsById()
    // XXX: this special case id handling should not go here,
    // but in the attribute declaration for the id attribute
    /*
    if (attr.localName === 'id' && attr.namespaceURI === null) {
      if (oldval) delId(oldval, attr.ownerElement);
      addId(attr.value, attr.ownerElement);
    }
    */
    if (this.mutationHandler) {
      this.mutationHandler({
        type: MUTATE.ATTR,
        target: attr.ownerElement,
        attr: attr
      });
    }
  }},

  // Used by removeAttribute and removeAttributeNS for attributes.
  mutateRemoveAttr: { value: function(attr) {
/*
* This is now handled in Attributes.js
    // Manage id to element mapping
    if (attr.localName === 'id' && attr.namespaceURI === null) {
      this.delId(attr.value, attr.ownerElement);
    }
*/
    if (this.mutationHandler) {
      this.mutationHandler({
        type: MUTATE.REMOVE_ATTR,
        target: attr.ownerElement,
        attr: attr
      });
    }
  }},

  // Called by Node.removeChild, etc. to remove a rooted element from
  // the tree. Only needs to generate a single mutation event when a
  // node is removed, but must recursively mark all descendants as not
  // rooted.
  mutateRemove: { value: function(node) {
    // Send a single mutation event
    if (this.mutationHandler) {
      this.mutationHandler({
        type: MUTATE.REMOVE,
        target: node.parentNode,
        node: node
      });
    }

    // Mark this and all descendants as not rooted
    recursivelyUproot(node);
  }},

  // Called when a new element becomes rooted.  It must recursively
  // generate mutation events for each of the children, and mark them all
  // as rooted.
  mutateInsert: { value: function(node) {
    // Mark node and its descendants as rooted
    recursivelyRoot(node);

    // Send a single mutation event
    if (this.mutationHandler) {
      this.mutationHandler({
        type: MUTATE.INSERT,
        target: node.parentNode,
        node: node
      });
    }
  }},

  // Called when a rooted element is moved within the document
  mutateMove: { value: function(node) {
    if (this.mutationHandler) {
      this.mutationHandler({
        type: MUTATE.MOVE,
        target: node
      });
    }
  }},


  // Add a mapping from  id to n for n.ownerDocument
  addId: { value: function addId(id, n) {
    var val = this.byId[id];
    if (!val) {
      this.byId[id] = n;
    }
    else {
      // TODO: Add a way to opt-out console warnings
      //console.warn('Duplicate element id ' + id);
      if (!(val instanceof MultiId)) {
        val = new MultiId(val);
        this.byId[id] = val;
      }
      val.add(n);
    }
  }},

  // Delete the mapping from id to n for n.ownerDocument
  delId: { value: function delId(id, n) {
    var val = this.byId[id];
    utils.assert(val);

    if (val instanceof MultiId) {
      val.del(n);
      if (val.length === 1) { // convert back to a single node
        this.byId[id] = val.downgrade();
      }
    }
    else {
      this.byId[id] = undefined;
    }
  }},

  _resolve: { value: function(href) {
    //XXX: Cache the URL
    return new URL(this._documentBaseURL).resolve(href);
  }},

  _documentBaseURL: { get: function() {
    // XXX: This is not implemented correctly yet
    var url = this._address;
    if (url === 'about:blank') url = '/';

    var base = this.querySelector('base[href]');
    if (base) {
      return new URL(url).resolve(base.getAttribute('href'));
    }
    return url;

    // The document base URL of a Document object is the
    // absolute URL obtained by running these substeps:

    //     Let fallback base url be the document's address.

    //     If fallback base url is about:blank, and the
    //     Document's browsing context has a creator browsing
    //     context, then let fallback base url be the document
    //     base URL of the creator Document instead.

    //     If the Document is an iframe srcdoc document, then
    //     let fallback base url be the document base URL of
    //     the Document's browsing context's browsing context
    //     container's Document instead.

    //     If there is no base element that has an href
    //     attribute, then the document base URL is fallback
    //     base url; abort these steps. Otherwise, let url be
    //     the value of the href attribute of the first such
    //     element.

    //     Resolve url relative to fallback base url (thus,
    //     the base href attribute isn't affected by xml:base
    //     attributes).

    //     The document base URL is the result of the previous
    //     step if it was successful; otherwise it is fallback
    //     base url.
  }},

  _templateDoc: { get: function() {
    if (!this._templateDocCache) {
      // "associated inert template document"
      var newDoc = new Document(this.isHTML, this._address);
      this._templateDocCache = newDoc._templateDocCache = newDoc;
    }
    return this._templateDocCache;
  }},

  querySelector: { value: function(selector) {
    return select(selector, this)[0];
  }},

  querySelectorAll: { value: function(selector) {
    var nodes = select(selector, this);
    return nodes.item ? nodes : new NodeList(nodes);
  }}

});


var eventHandlerTypes = [
  'abort', 'canplay', 'canplaythrough', 'change', 'click', 'contextmenu',
  'cuechange', 'dblclick', 'drag', 'dragend', 'dragenter', 'dragleave',
  'dragover', 'dragstart', 'drop', 'durationchange', 'emptied', 'ended',
  'input', 'invalid', 'keydown', 'keypress', 'keyup', 'loadeddata',
  'loadedmetadata', 'loadstart', 'mousedown', 'mousemove', 'mouseout',
  'mouseover', 'mouseup', 'mousewheel', 'pause', 'play', 'playing',
  'progress', 'ratechange', 'readystatechange', 'reset', 'seeked',
  'seeking', 'select', 'show', 'stalled', 'submit', 'suspend',
  'timeupdate', 'volumechange', 'waiting',

  'blur', 'error', 'focus', 'load', 'scroll'
];

// Add event handler idl attribute getters and setters to Document
eventHandlerTypes.forEach(function(type) {
  // Define the event handler registration IDL attribute for this type
  Object.defineProperty(Document.prototype, 'on' + type, {
    get: function() {
      return this._getEventHandler(type);
    },
    set: function(v) {
      this._setEventHandler(type, v);
    }
  });
});

function namedHTMLChild(parent, name) {
  if (parent && parent.isHTML) {
    for (var kid = parent.firstChild; kid !== null; kid = kid.nextSibling) {
      if (kid.nodeType === Node.ELEMENT_NODE &&
        kid.localName === name &&
        kid.namespaceURI === NAMESPACE.HTML) {
        return kid;
      }
    }
  }
  return null;
}

function root(n) {
  n._nid = n.ownerDocument._nextnid++;
  n.ownerDocument._nodes[n._nid] = n;
  // Manage id to element mapping
  if (n.nodeType === Node.ELEMENT_NODE) {
    var id = n.getAttribute('id');
    if (id) n.ownerDocument.addId(id, n);

    // Script elements need to know when they're inserted
    // into the document
    if (n._roothook) n._roothook();
  }
}

function uproot(n) {
  // Manage id to element mapping
  if (n.nodeType === Node.ELEMENT_NODE) {
    var id = n.getAttribute('id');
    if (id) n.ownerDocument.delId(id, n);
  }
  n.ownerDocument._nodes[n._nid] = undefined;
  n._nid = undefined;
}

function recursivelyRoot(node) {
  root(node);
  // XXX:
  // accessing childNodes on a leaf node creates a new array the
  // first time, so be careful to write this loop so that it
  // doesn't do that. node is polymorphic, so maybe this is hard to
  // optimize?  Try switching on nodeType?
/*
  if (node.hasChildNodes()) {
    var kids = node.childNodes;
    for(var i = 0, n = kids.length;  i < n; i++)
      recursivelyRoot(kids[i]);
  }
*/
  if (node.nodeType === Node.ELEMENT_NODE) {
    for (var kid = node.firstChild; kid !== null; kid = kid.nextSibling)
      recursivelyRoot(kid);
  }
}

function recursivelyUproot(node) {
  uproot(node);
  for (var kid = node.firstChild; kid !== null; kid = kid.nextSibling)
      recursivelyUproot(kid);
}

function recursivelySetOwner(node, owner) {
  node.ownerDocument = owner;
  node._lastModTime = undefined; // mod times are document-based
  if (Object.prototype.hasOwnProperty.call(node, '_tagName')) {
    node._tagName = undefined; // Element subclasses might need to change case
  }
  for (var kid = node.firstChild; kid !== null; kid = kid.nextSibling)
    recursivelySetOwner(kid, owner);
}

// A class for storing multiple nodes with the same ID
function MultiId(node) {
  this.nodes = Object.create(null);
  this.nodes[node._nid] = node;
  this.length = 1;
  this.firstNode = undefined;
}

// Add a node to the list, with O(1) time
MultiId.prototype.add = function(node) {
  if (!this.nodes[node._nid]) {
    this.nodes[node._nid] = node;
    this.length++;
    this.firstNode = undefined;
  }
};

// Remove a node from the list, with O(1) time
MultiId.prototype.del = function(node) {
  if (this.nodes[node._nid]) {
    delete this.nodes[node._nid];
    this.length--;
    this.firstNode = undefined;
  }
};

// Get the first node from the list, in the document order
// Takes O(N) time in the size of the list, with a cache that is invalidated
// when the list is modified.
MultiId.prototype.getFirst = function() {
  /* jshint bitwise: false */
  if (!this.firstNode) {
    var nid;
    for (nid in this.nodes) {
      if (this.firstNode === undefined ||
        this.firstNode.compareDocumentPosition(this.nodes[nid]) & Node.DOCUMENT_POSITION_PRECEDING) {
        this.firstNode = this.nodes[nid];
      }
    }
  }
  return this.firstNode;
};

// If there is only one node left, return it. Otherwise return "this".
MultiId.prototype.downgrade = function() {
  if (this.length === 1) {
    var nid;
    for (nid in this.nodes) {
      return this.nodes[nid];
    }
  }
  return this;
};
