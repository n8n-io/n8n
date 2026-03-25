"use strict";
/* jshint eqnull: true */
/**
 * Zest (https://github.com/chjj/zest)
 * A css selector engine.
 * Copyright (c) 2011-2012, Christopher Jeffrey. (MIT Licensed)
 * Domino version based on Zest v0.1.3 with bugfixes applied.
 */

/**
 * Helpers
 */

var window = Object.create(null, {
  location: { get: function() {
    throw new Error('window.location is not supported.');
  } }
});

var compareDocumentPosition = function(a, b) {
      return a.compareDocumentPosition(b);
};

var order = function(a, b) {
  /* jshint bitwise: false */
  return compareDocumentPosition(a, b) & 2 ? 1 : -1;
};

var next = function(el) {
  while ((el = el.nextSibling)
         && el.nodeType !== 1);
  return el;
};

var prev = function(el) {
  while ((el = el.previousSibling)
         && el.nodeType !== 1);
  return el;
};

var child = function(el) {
  /*jshint -W084 */
  if (el = el.firstChild) {
    while (el.nodeType !== 1
           && (el = el.nextSibling));
  }
  return el;
};

var lastChild = function(el) {
  /*jshint -W084 */
  if (el = el.lastChild) {
    while (el.nodeType !== 1
           && (el = el.previousSibling));
  }
  return el;
};

var parentIsElement = function(n) {
  if (!n.parentNode) { return false; }
  var nodeType = n.parentNode.nodeType;
  // The root `html` element can be a first- or last-child, too.
  return nodeType === 1 || nodeType === 9;
};

var unquote = function(str) {
  if (!str) return str;
  var ch = str[0];
  if (ch === '"' || ch === '\'') {
    if (str[str.length-1] === ch) {
      str = str.slice(1, -1);
    } else {
      // bad string.
      str = str.slice(1);
    }
    return str.replace(rules.str_escape, function(s) {
      var m = /^\\(?:([0-9A-Fa-f]+)|([\r\n\f]+))/.exec(s);
      if (!m) { return s.slice(1); }
      if (m[2]) { return ''; /* escaped newlines are ignored in strings. */ }
      var cp = parseInt(m[1], 16);
      return String.fromCodePoint ? String.fromCodePoint(cp) :
        // Not all JavaScript implementations have String.fromCodePoint yet.
        String.fromCharCode(cp);
    });
  } else if (rules.ident.test(str)) {
    return decodeid(str);
  } else {
    // NUMBER, PERCENTAGE, DIMENSION, etc
    return str;
  }
};

var decodeid = function(str) {
  return str.replace(rules.escape, function(s) {
    var m = /^\\([0-9A-Fa-f]+)/.exec(s);
    if (!m) { return s[1]; }
    var cp = parseInt(m[1], 16);
    return String.fromCodePoint ? String.fromCodePoint(cp) :
      // Not all JavaScript implementations have String.fromCodePoint yet.
      String.fromCharCode(cp);
  });
};

var indexOf = (function() {
  if (Array.prototype.indexOf) {
    return Array.prototype.indexOf;
  }
  return function(obj, item) {
    var i = this.length;
    while (i--) {
      if (this[i] === item) return i;
    }
    return -1;
  };
})();

var makeInside = function(start, end) {
  var regex = rules.inside.source
    .replace(/</g, start)
    .replace(/>/g, end);

  return new RegExp(regex);
};

var replace = function(regex, name, val) {
  regex = regex.source;
  regex = regex.replace(name, val.source || val);
  return new RegExp(regex);
};

var truncateUrl = function(url, num) {
  return url
    .replace(/^(?:\w+:\/\/|\/+)/, '')
    .replace(/(?:\/+|\/*#.*?)$/, '')
    .split('/', num)
    .join('/');
};

/**
 * Handle `nth` Selectors
 */

var parseNth = function(param_, test) {
  var param = param_.replace(/\s+/g, '')
    , cap;

  if (param === 'even') {
    param = '2n+0';
  } else if (param === 'odd') {
    param = '2n+1';
  } else if (param.indexOf('n') === -1) {
    param = '0n' + param;
  }

  cap = /^([+-])?(\d+)?n([+-])?(\d+)?$/.exec(param);

  return {
    group: cap[1] === '-'
      ? -(cap[2] || 1)
      : +(cap[2] || 1),
    offset: cap[4]
      ? (cap[3] === '-' ? -cap[4] : +cap[4])
      : 0
  };
};

var nth = function(param_, test, last) {
  var param = parseNth(param_)
    , group = param.group
    , offset = param.offset
    , find = !last ? child : lastChild
    , advance = !last ? next : prev;

  return function(el) {
    if (!parentIsElement(el)) return;

    var rel = find(el.parentNode)
      , pos = 0;

    while (rel) {
      if (test(rel, el)) pos++;
      if (rel === el) {
        pos -= offset;
        return group && pos
          ? (pos % group) === 0 && (pos < 0 === group < 0)
          : !pos;
      }
      rel = advance(rel);
    }
  };
};

/**
 * Simple Selectors
 */

var selectors = {
  '*': (function() {
    if (false/*function() {
      var el = document.createElement('div');
      el.appendChild(document.createComment(''));
      return !!el.getElementsByTagName('*')[0];
    }()*/) {
      return function(el) {
        if (el.nodeType === 1) return true;
      };
    }
    return function() {
      return true;
    };
  })(),
  'type': function(type) {
    type = type.toLowerCase();
    return function(el) {
      return el.nodeName.toLowerCase() === type;
    };
  },
  'attr': function(key, op, val, i) {
    op = operators[op];
    return function(el) {
      var attr;
      switch (key) {
        case 'for':
          attr = el.htmlFor;
          break;
        case 'class':
          // className is '' when non-existent
          // getAttribute('class') is null
          attr = el.className;
          if (attr === '' && el.getAttribute('class') == null) {
            attr = null;
          }
          break;
        case 'href':
        case 'src':
          attr = el.getAttribute(key, 2);
          break;
        case 'title':
          // getAttribute('title') can be '' when non-existent sometimes?
          attr = el.getAttribute('title') || null;
          break;
        // careful with attributes with special getter functions
        case 'id':
        case 'lang':
        case 'dir':
        case 'accessKey':
        case 'hidden':
        case 'tabIndex':
        case 'style':
          if (el.getAttribute) {
            attr = el.getAttribute(key);
            break;
          }
        /* falls through */
        default:
          if (el.hasAttribute && !el.hasAttribute(key)) {
            break;
          }
          attr = el[key] != null
            ? el[key]
            : el.getAttribute && el.getAttribute(key);
          break;
      }
      if (attr == null) return;
      attr = attr + '';
      if (i) {
        attr = attr.toLowerCase();
        val = val.toLowerCase();
      }
      return op(attr, val);
    };
  },
  ':first-child': function(el) {
    return !prev(el) && parentIsElement(el);
  },
  ':last-child': function(el) {
    return !next(el) && parentIsElement(el);
  },
  ':only-child': function(el) {
    return !prev(el) && !next(el) && parentIsElement(el);
  },
  ':nth-child': function(param, last) {
    return nth(param, function() {
      return true;
    }, last);
  },
  ':nth-last-child': function(param) {
    return selectors[':nth-child'](param, true);
  },
  ':root': function(el) {
    return el.ownerDocument.documentElement === el;
  },
  ':empty': function(el) {
    return !el.firstChild;
  },
  ':not': function(sel) {
    var test = compileGroup(sel);
    return function(el) {
      return !test(el);
    };
  },
  ':first-of-type': function(el) {
    if (!parentIsElement(el)) return;
    var type = el.nodeName;
    /*jshint -W084 */
    while (el = prev(el)) {
      if (el.nodeName === type) return;
    }
    return true;
  },
  ':last-of-type': function(el) {
    if (!parentIsElement(el)) return;
    var type = el.nodeName;
    /*jshint -W084 */
    while (el = next(el)) {
      if (el.nodeName === type) return;
    }
    return true;
  },
  ':only-of-type': function(el) {
    return selectors[':first-of-type'](el)
        && selectors[':last-of-type'](el);
  },
  ':nth-of-type': function(param, last) {
    return nth(param, function(rel, el) {
      return rel.nodeName === el.nodeName;
    }, last);
  },
  ':nth-last-of-type': function(param) {
    return selectors[':nth-of-type'](param, true);
  },
  ':checked': function(el) {
    return !!(el.checked || el.selected);
  },
  ':indeterminate': function(el) {
    return !selectors[':checked'](el);
  },
  ':enabled': function(el) {
    return !el.disabled && el.type !== 'hidden';
  },
  ':disabled': function(el) {
    return !!el.disabled;
  },
  ':target': function(el) {
    return el.id === window.location.hash.substring(1);
  },
  ':focus': function(el) {
    return el === el.ownerDocument.activeElement;
  },
  ':is': function(sel) {
    return compileGroup(sel);
  },
  // :matches is an older name for :is; see
  // https://github.com/w3c/csswg-drafts/issues/3258
  ':matches': function(sel) {
    return selectors[':is'](sel);
  },
  ':nth-match': function(param, last) {
    var args = param.split(/\s*,\s*/)
      , arg = args.shift()
      , test = compileGroup(args.join(','));

    return nth(arg, test, last);
  },
  ':nth-last-match': function(param) {
    return selectors[':nth-match'](param, true);
  },
  ':links-here': function(el) {
    return el + '' === window.location + '';
  },
  ':lang': function(param) {
    return function(el) {
      while (el) {
        if (el.lang) return el.lang.indexOf(param) === 0;
        el = el.parentNode;
      }
    };
  },
  ':dir': function(param) {
    return function(el) {
      while (el) {
        if (el.dir) return el.dir === param;
        el = el.parentNode;
      }
    };
  },
  ':scope': function(el, con) {
    var context = con || el.ownerDocument;
    if (context.nodeType === 9) {
      return el === context.documentElement;
    }
    return el === context;
  },
  ':any-link': function(el) {
    return typeof el.href === 'string';
  },
  ':local-link': function(el) {
    if (el.nodeName) {
      return el.href && el.host === window.location.host;
    }
    var param = +el + 1;
    return function(el) {
      if (!el.href) return;

      var url = window.location + ''
        , href = el + '';

      return truncateUrl(url, param) === truncateUrl(href, param);
    };
  },
  ':default': function(el) {
    return !!el.defaultSelected;
  },
  ':valid': function(el) {
    return el.willValidate || (el.validity && el.validity.valid);
  },
  ':invalid': function(el) {
    return !selectors[':valid'](el);
  },
  ':in-range': function(el) {
    return el.value > el.min && el.value <= el.max;
  },
  ':out-of-range': function(el) {
    return !selectors[':in-range'](el);
  },
  ':required': function(el) {
    return !!el.required;
  },
  ':optional': function(el) {
    return !el.required;
  },
  ':read-only': function(el) {
    if (el.readOnly) return true;

    var attr = el.getAttribute('contenteditable')
      , prop = el.contentEditable
      , name = el.nodeName.toLowerCase();

    name = name !== 'input' && name !== 'textarea';

    return (name || el.disabled) && attr == null && prop !== 'true';
  },
  ':read-write': function(el) {
    return !selectors[':read-only'](el);
  },
  ':hover': function() {
    throw new Error(':hover is not supported.');
  },
  ':active': function() {
    throw new Error(':active is not supported.');
  },
  ':link': function() {
    throw new Error(':link is not supported.');
  },
  ':visited': function() {
    throw new Error(':visited is not supported.');
  },
  ':column': function() {
    throw new Error(':column is not supported.');
  },
  ':nth-column': function() {
    throw new Error(':nth-column is not supported.');
  },
  ':nth-last-column': function() {
    throw new Error(':nth-last-column is not supported.');
  },
  ':current': function() {
    throw new Error(':current is not supported.');
  },
  ':past': function() {
    throw new Error(':past is not supported.');
  },
  ':future': function() {
    throw new Error(':future is not supported.');
  },
  // Non-standard, for compatibility purposes.
  ':contains': function(param) {
    return function(el) {
      var text = el.innerText || el.textContent || el.value || '';
      return text.indexOf(param) !== -1;
    };
  },
  ':has': function(param) {
    return function(el) {
      return find(param, el).length > 0;
    };
  }
  // Potentially add more pseudo selectors for
  // compatibility with sizzle and most other
  // selector engines (?).
};

/**
 * Attribute Operators
 */

var operators = {
  '-': function() {
    return true;
  },
  '=': function(attr, val) {
    return attr === val;
  },
  '*=': function(attr, val) {
    return attr.indexOf(val) !== -1;
  },
  '~=': function(attr, val) {
    var i
      , s
      , f
      , l;

    for (s = 0; true; s = i + 1) {
      i = attr.indexOf(val, s);
      if (i === -1) return false;
      f = attr[i - 1];
      l = attr[i + val.length];
      if ((!f || f === ' ') && (!l || l === ' ')) return true;
    }
  },
  '|=': function(attr, val) {
    var i = attr.indexOf(val)
      , l;

    if (i !== 0) return;
    l = attr[i + val.length];

    return l === '-' || !l;
  },
  '^=': function(attr, val) {
    return attr.indexOf(val) === 0;
  },
  '$=': function(attr, val) {
    var i = attr.lastIndexOf(val);
    return i !== -1 && i + val.length === attr.length;
  },
  // non-standard
  '!=': function(attr, val) {
    return attr !== val;
  }
};

/**
 * Combinator Logic
 */

var combinators = {
  ' ': function(test) {
    return function(el) {
      /*jshint -W084 */
      while (el = el.parentNode) {
        if (test(el)) return el;
      }
    };
  },
  '>': function(test) {
    return function(el) {
      /*jshint -W084 */
      if (el = el.parentNode) {
        return test(el) && el;
      }
    };
  },
  '+': function(test) {
    return function(el) {
      /*jshint -W084 */
      if (el = prev(el)) {
        return test(el) && el;
      }
    };
  },
  '~': function(test) {
    return function(el) {
      /*jshint -W084 */
      while (el = prev(el)) {
        if (test(el)) return el;
      }
    };
  },
  'noop': function(test) {
    return function(el) {
      return test(el) && el;
    };
  },
  'ref': function(test, name) {
    var node;

    function ref(el) {
      var doc = el.ownerDocument
        , nodes = doc.getElementsByTagName('*')
        , i = nodes.length;

      while (i--) {
        node = nodes[i];
        if (ref.test(el)) {
          node = null;
          return true;
        }
      }

      node = null;
    }

    ref.combinator = function(el) {
      if (!node || !node.getAttribute) return;

      var attr = node.getAttribute(name) || '';
      if (attr[0] === '#') attr = attr.substring(1);

      if (attr === el.id && test(node)) {
        return node;
      }
    };

    return ref;
  }
};

/**
 * Grammar
 */

var rules = {
  escape: /\\(?:[^0-9A-Fa-f\r\n]|[0-9A-Fa-f]{1,6}[\r\n\t ]?)/g,
  str_escape: /(escape)|\\(\n|\r\n?|\f)/g,
  nonascii: /[\u00A0-\uFFFF]/,
  cssid: /(?:(?!-?[0-9])(?:escape|nonascii|[-_a-zA-Z0-9])+)/,
  qname: /^ *(cssid|\*)/,
  simple: /^(?:([.#]cssid)|pseudo|attr)/,
  ref: /^ *\/(cssid)\/ */,
  combinator: /^(?: +([^ \w*.#\\]) +|( )+|([^ \w*.#\\]))(?! *$)/,
  attr: /^\[(cssid)(?:([^\w]?=)(inside))?\]/,
  pseudo: /^(:cssid)(?:\((inside)\))?/,
  inside: /(?:"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|<[^"'>]*>|\\["'>]|[^"'>])*/,
  ident: /^(cssid)$/
};

rules.cssid = replace(rules.cssid, 'nonascii', rules.nonascii);
rules.cssid = replace(rules.cssid, 'escape', rules.escape);
rules.qname = replace(rules.qname, 'cssid', rules.cssid);
rules.simple = replace(rules.simple, 'cssid', rules.cssid);
rules.ref = replace(rules.ref, 'cssid', rules.cssid);
rules.attr = replace(rules.attr, 'cssid', rules.cssid);
rules.pseudo = replace(rules.pseudo, 'cssid', rules.cssid);
rules.inside = replace(rules.inside, '[^"\'>]*', rules.inside);
rules.attr = replace(rules.attr, 'inside', makeInside('\\[', '\\]'));
rules.pseudo = replace(rules.pseudo, 'inside', makeInside('\\(', '\\)'));
rules.simple = replace(rules.simple, 'pseudo', rules.pseudo);
rules.simple = replace(rules.simple, 'attr', rules.attr);
rules.ident = replace(rules.ident, 'cssid', rules.cssid);
rules.str_escape = replace(rules.str_escape, 'escape', rules.escape);

/**
 * Compiling
 */

var compile = function(sel_) {
  var sel = sel_.replace(/^\s+|\s+$/g, '')
    , test
    , filter = []
    , buff = []
    , subject
    , qname
    , cap
    , op
    , ref;

  /*jshint -W084 */
  while (sel) {
    if (cap = rules.qname.exec(sel)) {
      sel = sel.substring(cap[0].length);
      qname = decodeid(cap[1]);
      buff.push(tok(qname, true));
    } else if (cap = rules.simple.exec(sel)) {
      sel = sel.substring(cap[0].length);
      qname = '*';
      buff.push(tok(qname, true));
      buff.push(tok(cap));
    } else {
      throw new SyntaxError('Invalid selector.');
    }

    while (cap = rules.simple.exec(sel)) {
      sel = sel.substring(cap[0].length);
      buff.push(tok(cap));
    }

    if (sel[0] === '!') {
      sel = sel.substring(1);
      subject = makeSubject();
      subject.qname = qname;
      buff.push(subject.simple);
    }

    if (cap = rules.ref.exec(sel)) {
      sel = sel.substring(cap[0].length);
      ref = combinators.ref(makeSimple(buff), decodeid(cap[1]));
      filter.push(ref.combinator);
      buff = [];
      continue;
    }

    if (cap = rules.combinator.exec(sel)) {
      sel = sel.substring(cap[0].length);
      op = cap[1] || cap[2] || cap[3];
      if (op === ',') {
        filter.push(combinators.noop(makeSimple(buff)));
        break;
      }
    } else {
      op = 'noop';
    }

    if (!combinators[op]) { throw new SyntaxError('Bad combinator.'); }
    filter.push(combinators[op](makeSimple(buff)));
    buff = [];
  }

  test = makeTest(filter);
  test.qname = qname;
  test.sel = sel;

  if (subject) {
    subject.lname = test.qname;

    subject.test = test;
    subject.qname = subject.qname;
    subject.sel = test.sel;
    test = subject;
  }

  if (ref) {
    ref.test = test;
    ref.qname = test.qname;
    ref.sel = test.sel;
    test = ref;
  }

  return test;
};

var tok = function(cap, qname) {
  // qname
  if (qname) {
    return cap === '*'
      ? selectors['*']
      : selectors.type(cap);
  }

  // class/id
  if (cap[1]) {
    return cap[1][0] === '.'
	  // XXX unescape here?  or in attr?
      ? selectors.attr('class', '~=', decodeid(cap[1].substring(1)), false)
      : selectors.attr('id', '=', decodeid(cap[1].substring(1)), false);
  }

  // pseudo-name
  // inside-pseudo
  if (cap[2]) {
    return cap[3]
      ? selectors[decodeid(cap[2])](unquote(cap[3]))
      : selectors[decodeid(cap[2])];
  }

  // attr name
  // attr op
  // attr value
  if (cap[4]) {
    var value = cap[6];
    var i = /["'\s]\s*I$/i.test(value);
    if (i) {
      value = value.replace(/\s*I$/i, '');
    }
    return selectors.attr(decodeid(cap[4]), cap[5] || '-', unquote(value), i);
  }

  throw new SyntaxError('Unknown Selector.');
};

var makeSimple = function(func) {
  var l = func.length
    , i;

  // Potentially make sure
  // `el` is truthy.
  if (l < 2) return func[0];

  return function(el) {
    if (!el) return;
    for (i = 0; i < l; i++) {
      if (!func[i](el)) return;
    }
    return true;
  };
};

var makeTest = function(func) {
  if (func.length < 2) {
    return function(el) {
      return !!func[0](el);
    };
  }
  return function(el) {
    var i = func.length;
    while (i--) {
      if (!(el = func[i](el))) return;
    }
    return true;
  };
};

var makeSubject = function() {
  var target;

  function subject(el) {
    var node = el.ownerDocument
      , scope = node.getElementsByTagName(subject.lname)
      , i = scope.length;

    while (i--) {
      if (subject.test(scope[i]) && target === el) {
        target = null;
        return true;
      }
    }

    target = null;
  }

  subject.simple = function(el) {
    target = el;
    return true;
  };

  return subject;
};

var compileGroup = function(sel) {
  var test = compile(sel)
    , tests = [ test ];

  while (test.sel) {
    test = compile(test.sel);
    tests.push(test);
  }

  if (tests.length < 2) return test;

  return function(el) {
    var l = tests.length
      , i = 0;

    for (; i < l; i++) {
      if (tests[i](el)) return true;
    }
  };
};

/**
 * Selection
 */

var find = function(sel, node) {
  var results = []
    , test = compile(sel)
    , scope = node.getElementsByTagName(test.qname)
    , i = 0
    , el;

  /*jshint -W084 */
  while (el = scope[i++]) {
    if (test(el)) results.push(el);
  }

  if (test.sel) {
    while (test.sel) {
      test = compile(test.sel);
      scope = node.getElementsByTagName(test.qname);
      i = 0;
      /*jshint -W084 */
      while (el = scope[i++]) {
        if (test(el) && indexOf.call(results, el) === -1) {
          results.push(el);
        }
      }
    }
    results.sort(order);
  }

  return results;
};

/**
 * Expose
 */

module.exports = exports = function(sel, context) {
  /* when context isn't a DocumentFragment and the selector is simple: */
  var id, r;
  if (context.nodeType !== 11 && sel.indexOf(' ') === -1) {
    if (sel[0] === '#' && context.rooted && /^#[A-Z_][-A-Z0-9_]*$/i.test(sel)) {
      if (context.doc._hasMultipleElementsWithId) {
        id = sel.substring(1);
        if (!context.doc._hasMultipleElementsWithId(id)) {
          r = context.doc.getElementById(id);
          return r ? [r] : [];
        }
      }
    }
    if (sel[0] === '.' && /^\.\w+$/.test(sel)) {
      return context.getElementsByClassName(sel.substring(1));
    }
    if (/^\w+$/.test(sel)) {
      return context.getElementsByTagName(sel);
    }
  }
  /* do things the hard/slow way */
  return find(sel, context);
};

exports.selectors = selectors;
exports.operators = operators;
exports.combinators = combinators;

exports.matches = function(el, sel) {
  var test = { sel: sel };
  do {
    test = compile(test.sel);
    if (test(el)) { return true; }
  } while (test.sel);
  return false;
};
