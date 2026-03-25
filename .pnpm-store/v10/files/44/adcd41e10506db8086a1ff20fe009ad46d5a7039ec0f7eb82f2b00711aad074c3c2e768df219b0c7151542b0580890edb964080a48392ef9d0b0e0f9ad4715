"use strict";
/* exported NodeTraversal */
var NodeTraversal = module.exports = {
  nextSkippingChildren: nextSkippingChildren,
  nextAncestorSibling: nextAncestorSibling,
  next: next,
  previous: previous,
  deepLastChild: deepLastChild
};

/**
 * @based on WebKit's NodeTraversal::nextSkippingChildren
 * https://trac.webkit.org/browser/trunk/Source/WebCore/dom/NodeTraversal.h?rev=179143#L109
 */
function nextSkippingChildren(node, stayWithin) {
  if (node === stayWithin) {
    return null;
  }
  if (node.nextSibling !== null) {
    return node.nextSibling;
  }
  return nextAncestorSibling(node, stayWithin);
}

/**
 * @based on WebKit's NodeTraversal::nextAncestorSibling
 * https://trac.webkit.org/browser/trunk/Source/WebCore/dom/NodeTraversal.cpp?rev=179143#L93
 */
function nextAncestorSibling(node, stayWithin) {
  for (node = node.parentNode; node !== null; node = node.parentNode) {
    if (node === stayWithin) {
      return null;
    }
    if (node.nextSibling !== null) {
      return node.nextSibling;
    }
  }
  return null;
}

/**
 * @based on WebKit's NodeTraversal::next
 * https://trac.webkit.org/browser/trunk/Source/WebCore/dom/NodeTraversal.h?rev=179143#L99
 */
function next(node, stayWithin) {
  var n;
  n = node.firstChild;
  if (n !== null) {
    return n;
  }
  if (node === stayWithin) {
    return null;
  }
  n = node.nextSibling;
  if (n !== null) {
    return n;
  }
  return nextAncestorSibling(node, stayWithin);
}

/**
 * @based on WebKit's NodeTraversal::deepLastChild
 * https://trac.webkit.org/browser/trunk/Source/WebCore/dom/NodeTraversal.cpp?rev=179143#L116
 */
function deepLastChild(node) {
  while (node.lastChild) {
    node = node.lastChild;
  }
  return node;
}

/**
 * @based on WebKit's NodeTraversal::previous
 * https://trac.webkit.org/browser/trunk/Source/WebCore/dom/NodeTraversal.h?rev=179143#L121
 */
function previous(node, stayWithin) {
  var p;
  p = node.previousSibling;
  if (p !== null) {
    return deepLastChild(p);
  }
  p = node.parentNode;
  if (p === stayWithin) {
    return null;
  }
  return p;
}
