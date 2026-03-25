'use strict';

var parseCst = require('./parse-cst.js');
var Document = require('./Document-9b4560a1.js');
require('./PlainValue-ec8e588e.js');
require('./resolveSeq-d03cb037.js');
require('./Schema-88e323a7.js');
require('./warnings-1000a372.js');

function testEvents(src, options) {
  const opt = Object.assign({
    keepCstNodes: true,
    keepNodeTypes: true,
    version: '1.2'
  }, options);
  const docs = parseCst.parse(src).map(cstDoc => new Document.Document(opt).parse(cstDoc));
  const errDoc = docs.find(doc => doc.errors.length > 0);
  const error = errDoc ? errDoc.errors[0].message : null;
  const events = ['+STR'];

  try {
    for (let i = 0; i < docs.length; ++i) {
      const doc = docs[i];
      let root = doc.contents;
      if (Array.isArray(root)) root = root[0];
      const [rootStart, rootEnd] = doc.range || [0, 0];
      let e = doc.errors[0] && doc.errors[0].source;
      if (e && e.type === 'SEQ_ITEM') e = e.node;
      if (e && (e.type === 'DOCUMENT' || e.range.start < rootStart)) throw new Error();
      let docStart = '+DOC';
      const pre = src.slice(0, rootStart);
      const explicitDoc = /---\s*$/.test(pre);
      if (explicitDoc) docStart += ' ---';else if (!doc.contents) continue;
      events.push(docStart);
      addEvents(events, doc, e, root);
      if (doc.contents && doc.contents.length > 1) throw new Error();
      let docEnd = '-DOC';

      if (rootEnd) {
        const post = src.slice(rootEnd);
        if (/^\.\.\./.test(post)) docEnd += ' ...';
      }

      events.push(docEnd);
    }
  } catch (e) {
    return {
      events,
      error: error || e
    };
  }

  events.push('-STR');
  return {
    events,
    error
  };
}

function addEvents(events, doc, e, node) {
  if (!node) {
    events.push('=VAL :');
    return;
  }

  if (e && node.cstNode === e) throw new Error();
  let props = '';
  let anchor = doc.anchors.getName(node);

  if (anchor) {
    if (/\d$/.test(anchor)) {
      const alt = anchor.replace(/\d$/, '');
      if (doc.anchors.getNode(alt)) anchor = alt;
    }

    props = ` &${anchor}`;
  }

  if (node.cstNode && node.cstNode.tag) {
    const {
      handle,
      suffix
    } = node.cstNode.tag;
    props += handle === '!' && !suffix ? ' <!>' : ` <${node.tag}>`;
  }

  let scalar = null;

  switch (node.type) {
    case 'ALIAS':
      {
        let alias = doc.anchors.getName(node.source);

        if (/\d$/.test(alias)) {
          const alt = alias.replace(/\d$/, '');
          if (doc.anchors.getNode(alt)) alias = alt;
        }

        events.push(`=ALI${props} *${alias}`);
      }
      break;

    case 'BLOCK_FOLDED':
      scalar = '>';
      break;

    case 'BLOCK_LITERAL':
      scalar = '|';
      break;

    case 'PLAIN':
      scalar = ':';
      break;

    case 'QUOTE_DOUBLE':
      scalar = '"';
      break;

    case 'QUOTE_SINGLE':
      scalar = "'";
      break;

    case 'PAIR':
      events.push(`+MAP${props}`);
      addEvents(events, doc, e, node.key);
      addEvents(events, doc, e, node.value);
      events.push('-MAP');
      break;

    case 'FLOW_SEQ':
    case 'SEQ':
      events.push(`+SEQ${props}`);
      node.items.forEach(item => {
        addEvents(events, doc, e, item);
      });
      events.push('-SEQ');
      break;

    case 'FLOW_MAP':
    case 'MAP':
      events.push(`+MAP${props}`);
      node.items.forEach(({
        key,
        value
      }) => {
        addEvents(events, doc, e, key);
        addEvents(events, doc, e, value);
      });
      events.push('-MAP');
      break;

    default:
      throw new Error(`Unexpected node type ${node.type}`);
  }

  if (scalar) {
    const value = node.cstNode.strValue.replace(/\\/g, '\\\\').replace(/\0/g, '\\0').replace(/\x07/g, '\\a').replace(/\x08/g, '\\b').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\v/g, '\\v').replace(/\f/g, '\\f').replace(/\r/g, '\\r').replace(/\x1b/g, '\\e');
    events.push(`=VAL${props} ${scalar}${value}`);
  }
}

exports.testEvents = testEvents;
