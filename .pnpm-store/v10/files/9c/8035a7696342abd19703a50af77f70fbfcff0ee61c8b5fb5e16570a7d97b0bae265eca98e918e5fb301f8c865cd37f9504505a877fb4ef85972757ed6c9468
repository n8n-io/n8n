#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var process = require('process');
var domino = require('../../');

/** Rebuild test/html5lib-tests.json based on the test specifications in
 * the html5lib-tests submodule.
 */

var NAMESPACE = {
  html: 'http://www.w3.org/1999/xhtml',
  xml: 'http://www.w3.org/XML/1998/namespace',
  xmlns: 'http://www.w3.org/2000/xmlns/',
  math: 'http://www.w3.org/1998/Math/MathML',
  svg: 'http://www.w3.org/2000/svg',
  xlink: 'http://www.w3.org/1999/xlink'
};
// menuitem is no longer EMPTY, see https://github.com/whatwg/html/pull/907
// This list comes from https://html.spec.whatwg.org/multipage/syntax.html#serialising-html-fragments
var EMPTY = {
  area: true,
  base: true,
  basefont: true,
  bgsound: true,
  br: true,
  col: true,
  embed: true,
  frame: true,
  hr: true,
  img: true,
  input: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true
};
var EXTRA_NL = {
  /* Removed in https://github.com/whatwg/html/issues/944
  pre: true,
  textarea: true,
  listing: true
  */
};
var NO_ESCAPE = {
  style: true, script: true, xmp:true, iframe:true, noembed:true,
  noframes:true, plaintext:true,
  noscript: true // <- assumes that scripting is enabled.
};

var localname = function(namestring) {
  return namestring.replace(/^(svg|math|xlink|xml|xmlns) /, '');
};
var namespace = function(namestring) {
  var m = /^(svg|math|xlink|xml|xmlns) /.exec(namestring);
  // Save some space by using 'undefined' to represent the html namespace.
  return m ? NAMESPACE[m[1]] : undefined/*NAMESPACE.html*/;
};

var ParseError = function ParseError(desc, filename, input) {
  Error.call(this);
  this.name = this.constructor.name;
  this.message = desc + ' ['+filename+']: ' + JSON.stringify(input);
};
ParseError.prototype = Object.create(Error.prototype);
ParseError.prototype.constructor = ParseError;


var list_tests = function() {
  var base = path.join(__dirname, '..', 'html5lib-tests', 'tree-construction');
  var testfiles = fs.readdirSync(base).filter(function(filename) {
    return /\.dat$/.test(filename);
  }).map(function(f) { return path.normalize(path.join(base, f)); });
  testfiles.sort();
  return testfiles;
};

var parse_test_file = function(filename) {
  var basename = path.basename(filename, '.dat');
  var cases = fs.readFileSync(filename, 'utf8').replace(/\n$/,'')
      .split(/\n\n(?=#data\n)/g);
  return cases.map(function(c) {
    return twiddle_test(basename, parse_one_test(basename, c));
  });
};

var parse_one_test = function(filename, testcase) {
    var m = /^#data\n(?:([^]*?)\n)?(?:#script-(on|off)\n)?#errors\n((?:[^\n]*\n)*?)(?:#document-fragment\n([^\n]*)\n)?(?:#script-(on|off)\n)?#document\n([^]*?)$/.exec(testcase+'\n');
  if (!m) {
    throw new ParseError("Can't parse test case", filename, testcase);
  }
  // According to the README, there should always be at least two newlines
  // between #data and #errors, but some test cases have only one.
  // `data` will be null in that case.
  var fragment = m[4] ? { name: localname(m[4]), ns:namespace(m[4]) } :
      undefined;
  return {
    //file: filename,
    data: m[1] || '',
    errors: m[3].split(/\n/g).slice(0,-1),
    fragment: fragment,
    script: m[2] || m[5],
    document: serialize_doc(filename, fragment, m[6])
  };
};

// Parse the node tree spec, emitting a serialized output string as well
// as a JSON representation of the tree.
var serialize_doc = function(filename, fragment, doc) {
  var result = "", stack = [], can_add_attr = false, props = {tags:{}};
  var root = { children: [] }, parent, obj;
  if (fragment) { root.tag = fragment.name; root.ns = fragment.ns; }
  var clear_add_attr = function() {
    if (can_add_attr) {
      result += '>';
      can_add_attr = false;
    }
  };
  var pop_stack = function() {
    clear_add_attr();
    var old = stack.pop();
    if (old.content !== true) {
      if (old.ns===namespace('html') && EMPTY[old.tag]) {
        if (old.children.length > 0) {
          throw new ParseError("Empty elements ("+old.tag+") can't have children",
                               filename, doc);
        }
      } else {
        result += '</' + old.tag + '>';
      }
    }
    // save some space in the JSON output by omitting empty lists
    if (old.children.length===0) { old.children = undefined; }
    if (old.attrs && old.attrs.length===0) { old.attrs = undefined; }
    return old;
  };
  var stack_top = function() {
    if (stack.length === 0) { return root; }
    return stack[stack.length-1];
  };
  var escape = function(s) {
    return s.replace(/[&<>\u00A0]/g, function(c) {
      switch(c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '\u00A0': return '&nbsp;';
      }
    });
  };
  var escapeAttr = function(s) {
    return s.replace(/[&"\u00A0]/g, function(c) {
      switch(c) {
      case '&': return '&amp;';
      case '"': return '&quot;';
      case '\u00A0': return '&nbsp;';
      }
    });
  };

  while (doc.length > 0) {
    var m = /^\| ((?:  )*)(?:<([^!?>][^>]*)>|([^="\n][^=\n]*)="([^"]*)"|"((?:[^"]|"(?!\n))*)"|<!-- ((?:[^](?!-->))*) -->|<!DOCTYPE ([^>]*)>|<\?([^>]+)>|(content))\n/.exec(doc);
    if (!m) {
      throw new ParseError('Bad document line', filename, doc);
    }
    doc = doc.slice(m[0].length);
    var indent = m[1].length / 2;
    while (indent < stack.length) {
      pop_stack();
    }
    if (indent !== stack.length) {
      throw new ParseError('Indentation error', filename, doc);
    }
    var tagname = m[2], attrname = m[3], attrvalue = m[4];
    var text = m[5], comment = m[6], doctype = m[7], processing = m[8];
    var template_content = m[9];
    if (attrname !== undefined) {
      if (!can_add_attr)
        throw new ParseError('Late attribute', filename, m);
      obj = {
        name:localname(attrname),
        ns:namespace(attrname),
        value:attrvalue
      };
      if (attrvalue !== escapeAttr(attrvalue)) {
        obj.escaped = props.escaped = true;
      }
      var serializedName;
      if (obj.ns === namespace('html')) {
        serializedName = obj.name;
      } else if (obj.ns === NAMESPACE.xml) {
        serializedName = 'xml:' + obj.name;
      } else if (obj.ns == NAMESPACE.xmlns) {
        if (obj.name === 'xmlns') {
          serializedName = 'xmlns';
        } else {
          serializedName = 'xmlns:' + obj.name;
        }
      } else if (obj.ns === NAMESPACE.xlink) {
        serializedName = 'xlink:' + obj.name;
      } else {
        throw new Error("don't know what qualified name to use");
      }
      result += ' ' + serializedName + '="' + escapeAttr(obj.value) + '"';
      stack_top().attrs.push(obj);
      if (/[<"]/.test(serializedName)) {
        props.attrWithFunnyChar = true;
      }
      continue;
    }
    clear_add_attr();
    if (tagname !== undefined) {
      result += '<' + localname(tagname);
      can_add_attr = true;
      props.tags[tagname] = true;
      if (/</.test(tagname)) {
        props.tagWithLt = true;
      }
      parent = stack_top();
      stack.push({
        tag: localname(tagname),
        ns: namespace(tagname),
        attrs: [],
        children: []
      });
      parent.children.push(stack_top());
      continue;
    }
    if (text !== undefined) {
      obj = { text: text };
      if (stack_top().ns === namespace('html') &&
          NO_ESCAPE[stack_top().tag]) {
        obj.no_escape = props.no_escape = true;
      }
      if (stack_top().ns === namespace('html') &&
          EXTRA_NL[stack_top().tag] &&
          stack_top().children.length === 0 &&
          /^\n/.test(text)) {
        result += '\n';
        obj.extraNL = props.extraNL = true;
      }
      if (text !== escape(text) && !obj.no_escape) {
        obj.escaped = props.escaped = true;
      }
      result += obj.no_escape ? text : escape(text);
      stack_top().children.push(obj);
      continue;
    }
    if (comment !== undefined) {
      result += '<!--' + comment + '-->';
      props.comment = true;
      stack_top().children.push({ comment: comment });
      continue;
    }
    if (doctype !== undefined) {
      // HTML serialization spec says just include the name, not the
      // public or system identifiers.
      result += '<!DOCTYPE ' + doctype.replace(/ .*$/, '') + '>';
      props.doctype = true;
      stack_top().children.push({ doctype: doctype });
      continue;
    }
    if (processing !== undefined) {
      result += '<?' + processing + '>';
      props.processing = true;
      stack_top().children.push({ processing: processing });
      continue;
    }
    if (template_content !== undefined) {
      parent = stack_top();
      stack.push({content:true, children:[]});
      parent.children.push(stack_top());
      can_add_attr = false;
      props.template = true;
      continue;
    }
    throw new ParseError("Unknown line type", filename, m);
  }
  while (stack.length > 0) {
    pop_stack();
  }
  return {
    props: props,
    tree: root.children,
    html: result
  };
};

var twiddle_test = function(filename, tc) {
  // Adjust the expected HTML serialization for some tests so that
  // output attribute order always matches input attributes order.
  var expected = tc.document.html;

  // Tweak the order of attributes:
  if (/^isindex$/.test(filename) &&
      /<isindex name="A" action="B" prompt="C" foo="D"/.test(tc.data) &&
      /<isindex action="B" foo="D" name="A" prompt="C"/.test(expected)) {
      expected = expected.replace(/<(isindex) (action="B") (foo="D") (name="A") (prompt="C")/,
                                '<$1 $4 $2 $5 $3');
  }
  if (/^tests(9|10)$/.test(filename) &&
      /<(g|mi) xml:lang=en xlink:href=foo/.test(tc.data) &&
      /<(g|mi) xlink:href="foo" xml:lang="en"/.test(expected)) {
    expected = expected.replace(/<(g|mi) (xlink[^> ]+) (xml[^> ]+)/g,
                                '<$1 $3 $2');
  }
  if (filename==='tests19' &&
      /<html c=d>.*<html a=b>/.test(tc.data) &&
      /<html a="b" c="d">/.test(expected)) {
    expected = expected.replace(/a="b" c="d"/, 'c="d" a="b"');
  }
  if (filename==='tests19' &&
      /http-equiv="content-type" content="[^\"]+"/.test(tc.data) &&
      /content="[^\"]+" http-equiv="content-type"/.test(expected)) {
    expected = expected.replace(/(content=[^> ]+) (http-equiv=[^> ]+)/g, '$2 $1');
  }
  if (filename==='tests23' &&
      /size=4 id=a/.test(tc.data) &&
      /id="a" size="4"/.test(expected)) {
    expected = expected.replace(/(id=[^> ]+) (size=[^> ]+)/g, '$2 $1');
  }
  if (filename==='tests26' &&
      /<code code="" x<="">/.test(expected)) {
    expected = expected.replace(/(code=[^> ]+) (x<=[^> ]+)/g, '$2 $1');
  }
  if (filename==='webkit01' &&
      /<rdar: 6869687="" problem="">/.test(expected)) {
    expected = expected.replace(/(6869687=[^> ]+) (problem=[^> ]+)/g, '$2 $1');
  }
  tc.document.html = expected;
  // Will this pass if parsed as a <body> fragment in no-quirks mode?
  // This property is used by some third-party consumers of the parsed
  // tests.
  var dd = domino.createDocument();
  dd.body.innerHTML = tc.data;
  tc.document.noQuirksBodyHtml = dd.body.innerHTML;

  return tc;
};

var result = list_tests().reduce(function(result, filename){
  result[path.basename(filename)] = parse_test_file(filename);
  return result;
}, {});
//console.log(JSON.stringify(result, null, 2));
if (process.argv[2]) {
  fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2), 'utf8');
  console.warn('Wrote', process.argv[2]);
} else {
  console.log(JSON.stringify(result, null, 2));
}
