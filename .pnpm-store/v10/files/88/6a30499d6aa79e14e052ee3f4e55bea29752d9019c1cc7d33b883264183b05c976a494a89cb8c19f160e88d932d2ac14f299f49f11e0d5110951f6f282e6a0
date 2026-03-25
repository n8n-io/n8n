"use strict";
var Element = require('./Element');
var defineElement = require('./defineElement');
var utils = require('./utils');
var CSSStyleDeclaration = require('./CSSStyleDeclaration');

var svgElements = exports.elements = {};
var svgNameToImpl = Object.create(null);

exports.createElement = function(doc, localName, prefix) {
  var impl = svgNameToImpl[localName] || SVGElement;
  return new impl(doc, localName, prefix);
};

function define(spec) {
  return defineElement(spec, SVGElement, svgElements, svgNameToImpl);
}

var SVGElement = define({
  superclass: Element,
  name: 'SVGElement',
  ctor: function SVGElement(doc, localName, prefix) {
    Element.call(this, doc, localName, utils.NAMESPACE.SVG, prefix);
  },
  props: {
    style: { get: function() {
      if (!this._style)
        this._style = new CSSStyleDeclaration(this);
      return this._style;
    }}
  }
});

define({
  name: 'SVGSVGElement',
  ctor: function SVGSVGElement(doc, localName, prefix) {
    SVGElement.call(this, doc, localName, prefix);
  },
  tag: 'svg',
  props: {
    createSVGRect: { value: function () {
      return exports.createElement(this.ownerDocument, 'rect', null);
    } }
  }
});

define({
  tags: [
    'a', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor', 'animateMotion', 'animateTransform',
    'circle', 'clipPath', 'color-profile', 'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
    'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight',
    'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
    'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence', 'filter',
    'font', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri', 'foreignObject', 'g',
    'glyph', 'glyphRef', 'hkern', 'image', 'line', 'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph',
    'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect', 'script', 'set', 'stop',  'style',
    'switch', 'symbol', 'text', 'textPath', 'title', 'tref', 'tspan', 'use', 'view', 'vkern'
  ]
});
