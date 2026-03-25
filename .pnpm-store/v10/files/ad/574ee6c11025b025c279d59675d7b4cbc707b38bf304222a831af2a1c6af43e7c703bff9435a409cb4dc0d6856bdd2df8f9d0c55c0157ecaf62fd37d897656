import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  __require
} from "./chunk-DRM3MJ7Y.js";

// ../node_modules/@storybook/docs-mdx/dist/chunk-H6DQNFQR.js
var __create = Object.create, __defProp = Object.defineProperty, __getOwnPropDesc = Object.getOwnPropertyDescriptor, __getOwnPropNames = Object.getOwnPropertyNames, __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty, __require2 = ((x) => typeof __require < "u" ? __require : typeof Proxy < "u" ? new Proxy(x, {
  get: (a, b) => (typeof __require < "u" ? __require : a)[b]
}) : x)(function(x) {
  if (typeof __require < "u")
    return __require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
}), __commonJS = (cb, mod) => function() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, __export = (target, all2) => {
  for (var name2 in all2)
    __defProp(target, name2, { get: all2[name2], enumerable: !0 });
}, __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
}, __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
  mod
)), require_inline_style_parser = __commonJS({
  "node_modules/inline-style-parser/index.js"(exports, module) {
    var COMMENT_REGEX = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, NEWLINE_REGEX = /\n/g, WHITESPACE_REGEX = /^\s*/, PROPERTY_REGEX = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/, COLON_REGEX = /^:\s*/, VALUE_REGEX = /^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/, SEMICOLON_REGEX = /^[;\s]*/, TRIM_REGEX = /^\s+|\s+$/g, NEWLINE = `
`, FORWARD_SLASH = "/", ASTERISK = "*", EMPTY_STRING = "", TYPE_COMMENT = "comment", TYPE_DECLARATION = "declaration";
    module.exports = function(style, options) {
      if (typeof style != "string")
        throw new TypeError("First argument must be a string");
      if (!style)
        return [];
      options = options || {};
      var lineno = 1, column = 1;
      function updatePosition(str) {
        var lines = str.match(NEWLINE_REGEX);
        lines && (lineno += lines.length);
        var i = str.lastIndexOf(NEWLINE);
        column = ~i ? str.length - i : column + str.length;
      }
      function position2() {
        var start2 = { line: lineno, column };
        return function(node) {
          return node.position = new Position(start2), whitespace2(), node;
        };
      }
      function Position(start2) {
        this.start = start2, this.end = { line: lineno, column }, this.source = options.source;
      }
      Position.prototype.content = style;
      var errorsList = [];
      function error(msg) {
        var err = new Error(
          options.source + ":" + lineno + ":" + column + ": " + msg
        );
        if (err.reason = msg, err.filename = options.source, err.line = lineno, err.column = column, err.source = style, options.silent)
          errorsList.push(err);
        else
          throw err;
      }
      function match(re2) {
        var m = re2.exec(style);
        if (m) {
          var str = m[0];
          return updatePosition(str), style = style.slice(str.length), m;
        }
      }
      function whitespace2() {
        match(WHITESPACE_REGEX);
      }
      function comments(rules) {
        var c;
        for (rules = rules || []; c = comment2(); )
          c !== !1 && rules.push(c);
        return rules;
      }
      function comment2() {
        var pos = position2();
        if (!(FORWARD_SLASH != style.charAt(0) || ASTERISK != style.charAt(1))) {
          for (var i = 2; EMPTY_STRING != style.charAt(i) && (ASTERISK != style.charAt(i) || FORWARD_SLASH != style.charAt(i + 1)); )
            ++i;
          if (i += 2, EMPTY_STRING === style.charAt(i - 1))
            return error("End of comment missing");
          var str = style.slice(2, i - 2);
          return column += 2, updatePosition(str), style = style.slice(i), column += 2, pos({
            type: TYPE_COMMENT,
            comment: str
          });
        }
      }
      function declaration() {
        var pos = position2(), prop = match(PROPERTY_REGEX);
        if (prop) {
          if (comment2(), !match(COLON_REGEX))
            return error("property missing ':'");
          var val = match(VALUE_REGEX), ret = pos({
            type: TYPE_DECLARATION,
            property: trim(prop[0].replace(COMMENT_REGEX, EMPTY_STRING)),
            value: val ? trim(val[0].replace(COMMENT_REGEX, EMPTY_STRING)) : EMPTY_STRING
          });
          return match(SEMICOLON_REGEX), ret;
        }
      }
      function declarations() {
        var decls = [];
        comments(decls);
        for (var decl; decl = declaration(); )
          decl !== !1 && (decls.push(decl), comments(decls));
        return decls;
      }
      return whitespace2(), declarations();
    };
    function trim(str) {
      return str ? str.replace(TRIM_REGEX, EMPTY_STRING) : EMPTY_STRING;
    }
  }
}), require_style_to_object = __commonJS({
  "node_modules/style-to-object/index.js"(exports, module) {
    var parse = require_inline_style_parser();
    function StyleToObject2(style, iterator) {
      var output = null;
      if (!style || typeof style != "string")
        return output;
      for (var declaration, declarations = parse(style), hasIterator = typeof iterator == "function", property, value, i = 0, len = declarations.length; i < len; i++)
        declaration = declarations[i], property = declaration.property, value = declaration.value, hasIterator ? iterator(property, value, declaration) : value && (output || (output = {}), output[property] = value);
      return output;
    }
    module.exports = StyleToObject2, module.exports.default = StyleToObject2;
  }
});
var Schema = class {
  /**
   * @constructor
   * @param {Properties} property
   * @param {Normal} normal
   * @param {string} [space]
   */
  constructor(property, normal, space) {
    this.property = property, this.normal = normal, space && (this.space = space);
  }
};
Schema.prototype.property = {};
Schema.prototype.normal = {};
Schema.prototype.space = null;
function merge(definitions, space) {
  let property = {}, normal = {}, index = -1;
  for (; ++index < definitions.length; )
    Object.assign(property, definitions[index].property), Object.assign(normal, definitions[index].normal);
  return new Schema(property, normal, space);
}
function normalize(value) {
  return value.toLowerCase();
}
var Info = class {
  /**
   * @constructor
   * @param {string} property
   * @param {string} attribute
   */
  constructor(property, attribute) {
    this.property = property, this.attribute = attribute;
  }
};
Info.prototype.space = null;
Info.prototype.boolean = !1;
Info.prototype.booleanish = !1;
Info.prototype.overloadedBoolean = !1;
Info.prototype.number = !1;
Info.prototype.commaSeparated = !1;
Info.prototype.spaceSeparated = !1;
Info.prototype.commaOrSpaceSeparated = !1;
Info.prototype.mustUseProperty = !1;
Info.prototype.defined = !1;
var types_exports = {};
__export(types_exports, {
  boolean: () => boolean,
  booleanish: () => booleanish,
  commaOrSpaceSeparated: () => commaOrSpaceSeparated,
  commaSeparated: () => commaSeparated,
  number: () => number,
  overloadedBoolean: () => overloadedBoolean,
  spaceSeparated: () => spaceSeparated
});
var powers = 0, boolean = increment(), booleanish = increment(), overloadedBoolean = increment(), number = increment(), spaceSeparated = increment(), commaSeparated = increment(), commaOrSpaceSeparated = increment();
function increment() {
  return 2 ** ++powers;
}
var checks = Object.keys(types_exports), DefinedInfo = class extends Info {
  /**
   * @constructor
   * @param {string} property
   * @param {string} attribute
   * @param {number|null} [mask]
   * @param {string} [space]
   */
  constructor(property, attribute, mask, space) {
    let index = -1;
    if (super(property, attribute), mark(this, "space", space), typeof mask == "number")
      for (; ++index < checks.length; ) {
        let check = checks[index];
        mark(this, checks[index], (mask & types_exports[check]) === types_exports[check]);
      }
  }
};
DefinedInfo.prototype.defined = !0;
function mark(values, key, value) {
  value && (values[key] = value);
}
var own = {}.hasOwnProperty;
function create(definition) {
  let property = {}, normal = {}, prop;
  for (prop in definition.properties)
    if (own.call(definition.properties, prop)) {
      let value = definition.properties[prop], info = new DefinedInfo(
        prop,
        definition.transform(definition.attributes || {}, prop),
        value,
        definition.space
      );
      definition.mustUseProperty && definition.mustUseProperty.includes(prop) && (info.mustUseProperty = !0), property[prop] = info, normal[normalize(prop)] = prop, normal[normalize(info.attribute)] = prop;
    }
  return new Schema(property, normal, definition.space);
}
var xlink = create({
  space: "xlink",
  transform(_, prop) {
    return "xlink:" + prop.slice(5).toLowerCase();
  },
  properties: {
    xLinkActuate: null,
    xLinkArcRole: null,
    xLinkHref: null,
    xLinkRole: null,
    xLinkShow: null,
    xLinkTitle: null,
    xLinkType: null
  }
}), xml = create({
  space: "xml",
  transform(_, prop) {
    return "xml:" + prop.slice(3).toLowerCase();
  },
  properties: { xmlLang: null, xmlBase: null, xmlSpace: null }
});
function caseSensitiveTransform(attributes, attribute) {
  return attribute in attributes ? attributes[attribute] : attribute;
}
function caseInsensitiveTransform(attributes, property) {
  return caseSensitiveTransform(attributes, property.toLowerCase());
}
var xmlns = create({
  space: "xmlns",
  attributes: { xmlnsxlink: "xmlns:xlink" },
  transform: caseInsensitiveTransform,
  properties: { xmlns: null, xmlnsXLink: null }
}), aria = create({
  transform(_, prop) {
    return prop === "role" ? prop : "aria-" + prop.slice(4).toLowerCase();
  },
  properties: {
    ariaActiveDescendant: null,
    ariaAtomic: booleanish,
    ariaAutoComplete: null,
    ariaBusy: booleanish,
    ariaChecked: booleanish,
    ariaColCount: number,
    ariaColIndex: number,
    ariaColSpan: number,
    ariaControls: spaceSeparated,
    ariaCurrent: null,
    ariaDescribedBy: spaceSeparated,
    ariaDetails: null,
    ariaDisabled: booleanish,
    ariaDropEffect: spaceSeparated,
    ariaErrorMessage: null,
    ariaExpanded: booleanish,
    ariaFlowTo: spaceSeparated,
    ariaGrabbed: booleanish,
    ariaHasPopup: null,
    ariaHidden: booleanish,
    ariaInvalid: null,
    ariaKeyShortcuts: null,
    ariaLabel: null,
    ariaLabelledBy: spaceSeparated,
    ariaLevel: number,
    ariaLive: null,
    ariaModal: booleanish,
    ariaMultiLine: booleanish,
    ariaMultiSelectable: booleanish,
    ariaOrientation: null,
    ariaOwns: spaceSeparated,
    ariaPlaceholder: null,
    ariaPosInSet: number,
    ariaPressed: booleanish,
    ariaReadOnly: booleanish,
    ariaRelevant: null,
    ariaRequired: booleanish,
    ariaRoleDescription: spaceSeparated,
    ariaRowCount: number,
    ariaRowIndex: number,
    ariaRowSpan: number,
    ariaSelected: booleanish,
    ariaSetSize: number,
    ariaSort: null,
    ariaValueMax: number,
    ariaValueMin: number,
    ariaValueNow: number,
    ariaValueText: null,
    role: null
  }
}), html = create({
  space: "html",
  attributes: {
    acceptcharset: "accept-charset",
    classname: "class",
    htmlfor: "for",
    httpequiv: "http-equiv"
  },
  transform: caseInsensitiveTransform,
  mustUseProperty: ["checked", "multiple", "muted", "selected"],
  properties: {
    // Standard Properties.
    abbr: null,
    accept: commaSeparated,
    acceptCharset: spaceSeparated,
    accessKey: spaceSeparated,
    action: null,
    allow: null,
    allowFullScreen: boolean,
    allowPaymentRequest: boolean,
    allowUserMedia: boolean,
    alt: null,
    as: null,
    async: boolean,
    autoCapitalize: null,
    autoComplete: spaceSeparated,
    autoFocus: boolean,
    autoPlay: boolean,
    blocking: spaceSeparated,
    capture: boolean,
    charSet: null,
    checked: boolean,
    cite: null,
    className: spaceSeparated,
    cols: number,
    colSpan: null,
    content: null,
    contentEditable: booleanish,
    controls: boolean,
    controlsList: spaceSeparated,
    coords: number | commaSeparated,
    crossOrigin: null,
    data: null,
    dateTime: null,
    decoding: null,
    default: boolean,
    defer: boolean,
    dir: null,
    dirName: null,
    disabled: boolean,
    download: overloadedBoolean,
    draggable: booleanish,
    encType: null,
    enterKeyHint: null,
    fetchPriority: null,
    form: null,
    formAction: null,
    formEncType: null,
    formMethod: null,
    formNoValidate: boolean,
    formTarget: null,
    headers: spaceSeparated,
    height: number,
    hidden: boolean,
    high: number,
    href: null,
    hrefLang: null,
    htmlFor: spaceSeparated,
    httpEquiv: spaceSeparated,
    id: null,
    imageSizes: null,
    imageSrcSet: null,
    inert: boolean,
    inputMode: null,
    integrity: null,
    is: null,
    isMap: boolean,
    itemId: null,
    itemProp: spaceSeparated,
    itemRef: spaceSeparated,
    itemScope: boolean,
    itemType: spaceSeparated,
    kind: null,
    label: null,
    lang: null,
    language: null,
    list: null,
    loading: null,
    loop: boolean,
    low: number,
    manifest: null,
    max: null,
    maxLength: number,
    media: null,
    method: null,
    min: null,
    minLength: number,
    multiple: boolean,
    muted: boolean,
    name: null,
    nonce: null,
    noModule: boolean,
    noValidate: boolean,
    onAbort: null,
    onAfterPrint: null,
    onAuxClick: null,
    onBeforeMatch: null,
    onBeforePrint: null,
    onBeforeToggle: null,
    onBeforeUnload: null,
    onBlur: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onContextLost: null,
    onContextMenu: null,
    onContextRestored: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFormData: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLanguageChange: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadEnd: null,
    onLoadStart: null,
    onMessage: null,
    onMessageError: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRejectionHandled: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onScrollEnd: null,
    onSecurityPolicyViolation: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onSlotChange: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnhandledRejection: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onWheel: null,
    open: boolean,
    optimum: number,
    pattern: null,
    ping: spaceSeparated,
    placeholder: null,
    playsInline: boolean,
    popover: null,
    popoverTarget: null,
    popoverTargetAction: null,
    poster: null,
    preload: null,
    readOnly: boolean,
    referrerPolicy: null,
    rel: spaceSeparated,
    required: boolean,
    reversed: boolean,
    rows: number,
    rowSpan: number,
    sandbox: spaceSeparated,
    scope: null,
    scoped: boolean,
    seamless: boolean,
    selected: boolean,
    shadowRootDelegatesFocus: boolean,
    shadowRootMode: null,
    shape: null,
    size: number,
    sizes: null,
    slot: null,
    span: number,
    spellCheck: booleanish,
    src: null,
    srcDoc: null,
    srcLang: null,
    srcSet: null,
    start: number,
    step: null,
    style: null,
    tabIndex: number,
    target: null,
    title: null,
    translate: null,
    type: null,
    typeMustMatch: boolean,
    useMap: null,
    value: booleanish,
    width: number,
    wrap: null,
    // Legacy.
    // See: https://html.spec.whatwg.org/#other-elements,-attributes-and-apis
    align: null,
    // Several. Use CSS `text-align` instead,
    aLink: null,
    // `<body>`. Use CSS `a:active {color}` instead
    archive: spaceSeparated,
    // `<object>`. List of URIs to archives
    axis: null,
    // `<td>` and `<th>`. Use `scope` on `<th>`
    background: null,
    // `<body>`. Use CSS `background-image` instead
    bgColor: null,
    // `<body>` and table elements. Use CSS `background-color` instead
    border: number,
    // `<table>`. Use CSS `border-width` instead,
    borderColor: null,
    // `<table>`. Use CSS `border-color` instead,
    bottomMargin: number,
    // `<body>`
    cellPadding: null,
    // `<table>`
    cellSpacing: null,
    // `<table>`
    char: null,
    // Several table elements. When `align=char`, sets the character to align on
    charOff: null,
    // Several table elements. When `char`, offsets the alignment
    classId: null,
    // `<object>`
    clear: null,
    // `<br>`. Use CSS `clear` instead
    code: null,
    // `<object>`
    codeBase: null,
    // `<object>`
    codeType: null,
    // `<object>`
    color: null,
    // `<font>` and `<hr>`. Use CSS instead
    compact: boolean,
    // Lists. Use CSS to reduce space between items instead
    declare: boolean,
    // `<object>`
    event: null,
    // `<script>`
    face: null,
    // `<font>`. Use CSS instead
    frame: null,
    // `<table>`
    frameBorder: null,
    // `<iframe>`. Use CSS `border` instead
    hSpace: number,
    // `<img>` and `<object>`
    leftMargin: number,
    // `<body>`
    link: null,
    // `<body>`. Use CSS `a:link {color: *}` instead
    longDesc: null,
    // `<frame>`, `<iframe>`, and `<img>`. Use an `<a>`
    lowSrc: null,
    // `<img>`. Use a `<picture>`
    marginHeight: number,
    // `<body>`
    marginWidth: number,
    // `<body>`
    noResize: boolean,
    // `<frame>`
    noHref: boolean,
    // `<area>`. Use no href instead of an explicit `nohref`
    noShade: boolean,
    // `<hr>`. Use background-color and height instead of borders
    noWrap: boolean,
    // `<td>` and `<th>`
    object: null,
    // `<applet>`
    profile: null,
    // `<head>`
    prompt: null,
    // `<isindex>`
    rev: null,
    // `<link>`
    rightMargin: number,
    // `<body>`
    rules: null,
    // `<table>`
    scheme: null,
    // `<meta>`
    scrolling: booleanish,
    // `<frame>`. Use overflow in the child context
    standby: null,
    // `<object>`
    summary: null,
    // `<table>`
    text: null,
    // `<body>`. Use CSS `color` instead
    topMargin: number,
    // `<body>`
    valueType: null,
    // `<param>`
    version: null,
    // `<html>`. Use a doctype.
    vAlign: null,
    // Several. Use CSS `vertical-align` instead
    vLink: null,
    // `<body>`. Use CSS `a:visited {color}` instead
    vSpace: number,
    // `<img>` and `<object>`
    // Non-standard Properties.
    allowTransparency: null,
    autoCorrect: null,
    autoSave: null,
    disablePictureInPicture: boolean,
    disableRemotePlayback: boolean,
    prefix: null,
    property: null,
    results: number,
    security: null,
    unselectable: null
  }
}), svg = create({
  space: "svg",
  attributes: {
    accentHeight: "accent-height",
    alignmentBaseline: "alignment-baseline",
    arabicForm: "arabic-form",
    baselineShift: "baseline-shift",
    capHeight: "cap-height",
    className: "class",
    clipPath: "clip-path",
    clipRule: "clip-rule",
    colorInterpolation: "color-interpolation",
    colorInterpolationFilters: "color-interpolation-filters",
    colorProfile: "color-profile",
    colorRendering: "color-rendering",
    crossOrigin: "crossorigin",
    dataType: "datatype",
    dominantBaseline: "dominant-baseline",
    enableBackground: "enable-background",
    fillOpacity: "fill-opacity",
    fillRule: "fill-rule",
    floodColor: "flood-color",
    floodOpacity: "flood-opacity",
    fontFamily: "font-family",
    fontSize: "font-size",
    fontSizeAdjust: "font-size-adjust",
    fontStretch: "font-stretch",
    fontStyle: "font-style",
    fontVariant: "font-variant",
    fontWeight: "font-weight",
    glyphName: "glyph-name",
    glyphOrientationHorizontal: "glyph-orientation-horizontal",
    glyphOrientationVertical: "glyph-orientation-vertical",
    hrefLang: "hreflang",
    horizAdvX: "horiz-adv-x",
    horizOriginX: "horiz-origin-x",
    horizOriginY: "horiz-origin-y",
    imageRendering: "image-rendering",
    letterSpacing: "letter-spacing",
    lightingColor: "lighting-color",
    markerEnd: "marker-end",
    markerMid: "marker-mid",
    markerStart: "marker-start",
    navDown: "nav-down",
    navDownLeft: "nav-down-left",
    navDownRight: "nav-down-right",
    navLeft: "nav-left",
    navNext: "nav-next",
    navPrev: "nav-prev",
    navRight: "nav-right",
    navUp: "nav-up",
    navUpLeft: "nav-up-left",
    navUpRight: "nav-up-right",
    onAbort: "onabort",
    onActivate: "onactivate",
    onAfterPrint: "onafterprint",
    onBeforePrint: "onbeforeprint",
    onBegin: "onbegin",
    onCancel: "oncancel",
    onCanPlay: "oncanplay",
    onCanPlayThrough: "oncanplaythrough",
    onChange: "onchange",
    onClick: "onclick",
    onClose: "onclose",
    onCopy: "oncopy",
    onCueChange: "oncuechange",
    onCut: "oncut",
    onDblClick: "ondblclick",
    onDrag: "ondrag",
    onDragEnd: "ondragend",
    onDragEnter: "ondragenter",
    onDragExit: "ondragexit",
    onDragLeave: "ondragleave",
    onDragOver: "ondragover",
    onDragStart: "ondragstart",
    onDrop: "ondrop",
    onDurationChange: "ondurationchange",
    onEmptied: "onemptied",
    onEnd: "onend",
    onEnded: "onended",
    onError: "onerror",
    onFocus: "onfocus",
    onFocusIn: "onfocusin",
    onFocusOut: "onfocusout",
    onHashChange: "onhashchange",
    onInput: "oninput",
    onInvalid: "oninvalid",
    onKeyDown: "onkeydown",
    onKeyPress: "onkeypress",
    onKeyUp: "onkeyup",
    onLoad: "onload",
    onLoadedData: "onloadeddata",
    onLoadedMetadata: "onloadedmetadata",
    onLoadStart: "onloadstart",
    onMessage: "onmessage",
    onMouseDown: "onmousedown",
    onMouseEnter: "onmouseenter",
    onMouseLeave: "onmouseleave",
    onMouseMove: "onmousemove",
    onMouseOut: "onmouseout",
    onMouseOver: "onmouseover",
    onMouseUp: "onmouseup",
    onMouseWheel: "onmousewheel",
    onOffline: "onoffline",
    onOnline: "ononline",
    onPageHide: "onpagehide",
    onPageShow: "onpageshow",
    onPaste: "onpaste",
    onPause: "onpause",
    onPlay: "onplay",
    onPlaying: "onplaying",
    onPopState: "onpopstate",
    onProgress: "onprogress",
    onRateChange: "onratechange",
    onRepeat: "onrepeat",
    onReset: "onreset",
    onResize: "onresize",
    onScroll: "onscroll",
    onSeeked: "onseeked",
    onSeeking: "onseeking",
    onSelect: "onselect",
    onShow: "onshow",
    onStalled: "onstalled",
    onStorage: "onstorage",
    onSubmit: "onsubmit",
    onSuspend: "onsuspend",
    onTimeUpdate: "ontimeupdate",
    onToggle: "ontoggle",
    onUnload: "onunload",
    onVolumeChange: "onvolumechange",
    onWaiting: "onwaiting",
    onZoom: "onzoom",
    overlinePosition: "overline-position",
    overlineThickness: "overline-thickness",
    paintOrder: "paint-order",
    panose1: "panose-1",
    pointerEvents: "pointer-events",
    referrerPolicy: "referrerpolicy",
    renderingIntent: "rendering-intent",
    shapeRendering: "shape-rendering",
    stopColor: "stop-color",
    stopOpacity: "stop-opacity",
    strikethroughPosition: "strikethrough-position",
    strikethroughThickness: "strikethrough-thickness",
    strokeDashArray: "stroke-dasharray",
    strokeDashOffset: "stroke-dashoffset",
    strokeLineCap: "stroke-linecap",
    strokeLineJoin: "stroke-linejoin",
    strokeMiterLimit: "stroke-miterlimit",
    strokeOpacity: "stroke-opacity",
    strokeWidth: "stroke-width",
    tabIndex: "tabindex",
    textAnchor: "text-anchor",
    textDecoration: "text-decoration",
    textRendering: "text-rendering",
    transformOrigin: "transform-origin",
    typeOf: "typeof",
    underlinePosition: "underline-position",
    underlineThickness: "underline-thickness",
    unicodeBidi: "unicode-bidi",
    unicodeRange: "unicode-range",
    unitsPerEm: "units-per-em",
    vAlphabetic: "v-alphabetic",
    vHanging: "v-hanging",
    vIdeographic: "v-ideographic",
    vMathematical: "v-mathematical",
    vectorEffect: "vector-effect",
    vertAdvY: "vert-adv-y",
    vertOriginX: "vert-origin-x",
    vertOriginY: "vert-origin-y",
    wordSpacing: "word-spacing",
    writingMode: "writing-mode",
    xHeight: "x-height",
    // These were camelcased in Tiny. Now lowercased in SVG 2
    playbackOrder: "playbackorder",
    timelineBegin: "timelinebegin"
  },
  transform: caseSensitiveTransform,
  properties: {
    about: commaOrSpaceSeparated,
    accentHeight: number,
    accumulate: null,
    additive: null,
    alignmentBaseline: null,
    alphabetic: number,
    amplitude: number,
    arabicForm: null,
    ascent: number,
    attributeName: null,
    attributeType: null,
    azimuth: number,
    bandwidth: null,
    baselineShift: null,
    baseFrequency: null,
    baseProfile: null,
    bbox: null,
    begin: null,
    bias: number,
    by: null,
    calcMode: null,
    capHeight: number,
    className: spaceSeparated,
    clip: null,
    clipPath: null,
    clipPathUnits: null,
    clipRule: null,
    color: null,
    colorInterpolation: null,
    colorInterpolationFilters: null,
    colorProfile: null,
    colorRendering: null,
    content: null,
    contentScriptType: null,
    contentStyleType: null,
    crossOrigin: null,
    cursor: null,
    cx: null,
    cy: null,
    d: null,
    dataType: null,
    defaultAction: null,
    descent: number,
    diffuseConstant: number,
    direction: null,
    display: null,
    dur: null,
    divisor: number,
    dominantBaseline: null,
    download: boolean,
    dx: null,
    dy: null,
    edgeMode: null,
    editable: null,
    elevation: number,
    enableBackground: null,
    end: null,
    event: null,
    exponent: number,
    externalResourcesRequired: null,
    fill: null,
    fillOpacity: number,
    fillRule: null,
    filter: null,
    filterRes: null,
    filterUnits: null,
    floodColor: null,
    floodOpacity: null,
    focusable: null,
    focusHighlight: null,
    fontFamily: null,
    fontSize: null,
    fontSizeAdjust: null,
    fontStretch: null,
    fontStyle: null,
    fontVariant: null,
    fontWeight: null,
    format: null,
    fr: null,
    from: null,
    fx: null,
    fy: null,
    g1: commaSeparated,
    g2: commaSeparated,
    glyphName: commaSeparated,
    glyphOrientationHorizontal: null,
    glyphOrientationVertical: null,
    glyphRef: null,
    gradientTransform: null,
    gradientUnits: null,
    handler: null,
    hanging: number,
    hatchContentUnits: null,
    hatchUnits: null,
    height: null,
    href: null,
    hrefLang: null,
    horizAdvX: number,
    horizOriginX: number,
    horizOriginY: number,
    id: null,
    ideographic: number,
    imageRendering: null,
    initialVisibility: null,
    in: null,
    in2: null,
    intercept: number,
    k: number,
    k1: number,
    k2: number,
    k3: number,
    k4: number,
    kernelMatrix: commaOrSpaceSeparated,
    kernelUnitLength: null,
    keyPoints: null,
    // SEMI_COLON_SEPARATED
    keySplines: null,
    // SEMI_COLON_SEPARATED
    keyTimes: null,
    // SEMI_COLON_SEPARATED
    kerning: null,
    lang: null,
    lengthAdjust: null,
    letterSpacing: null,
    lightingColor: null,
    limitingConeAngle: number,
    local: null,
    markerEnd: null,
    markerMid: null,
    markerStart: null,
    markerHeight: null,
    markerUnits: null,
    markerWidth: null,
    mask: null,
    maskContentUnits: null,
    maskUnits: null,
    mathematical: null,
    max: null,
    media: null,
    mediaCharacterEncoding: null,
    mediaContentEncodings: null,
    mediaSize: number,
    mediaTime: null,
    method: null,
    min: null,
    mode: null,
    name: null,
    navDown: null,
    navDownLeft: null,
    navDownRight: null,
    navLeft: null,
    navNext: null,
    navPrev: null,
    navRight: null,
    navUp: null,
    navUpLeft: null,
    navUpRight: null,
    numOctaves: null,
    observer: null,
    offset: null,
    onAbort: null,
    onActivate: null,
    onAfterPrint: null,
    onBeforePrint: null,
    onBegin: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnd: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFocusIn: null,
    onFocusOut: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadStart: null,
    onMessage: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onMouseWheel: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRepeat: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onShow: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onZoom: null,
    opacity: null,
    operator: null,
    order: null,
    orient: null,
    orientation: null,
    origin: null,
    overflow: null,
    overlay: null,
    overlinePosition: number,
    overlineThickness: number,
    paintOrder: null,
    panose1: null,
    path: null,
    pathLength: number,
    patternContentUnits: null,
    patternTransform: null,
    patternUnits: null,
    phase: null,
    ping: spaceSeparated,
    pitch: null,
    playbackOrder: null,
    pointerEvents: null,
    points: null,
    pointsAtX: number,
    pointsAtY: number,
    pointsAtZ: number,
    preserveAlpha: null,
    preserveAspectRatio: null,
    primitiveUnits: null,
    propagate: null,
    property: commaOrSpaceSeparated,
    r: null,
    radius: null,
    referrerPolicy: null,
    refX: null,
    refY: null,
    rel: commaOrSpaceSeparated,
    rev: commaOrSpaceSeparated,
    renderingIntent: null,
    repeatCount: null,
    repeatDur: null,
    requiredExtensions: commaOrSpaceSeparated,
    requiredFeatures: commaOrSpaceSeparated,
    requiredFonts: commaOrSpaceSeparated,
    requiredFormats: commaOrSpaceSeparated,
    resource: null,
    restart: null,
    result: null,
    rotate: null,
    rx: null,
    ry: null,
    scale: null,
    seed: null,
    shapeRendering: null,
    side: null,
    slope: null,
    snapshotTime: null,
    specularConstant: number,
    specularExponent: number,
    spreadMethod: null,
    spacing: null,
    startOffset: null,
    stdDeviation: null,
    stemh: null,
    stemv: null,
    stitchTiles: null,
    stopColor: null,
    stopOpacity: null,
    strikethroughPosition: number,
    strikethroughThickness: number,
    string: null,
    stroke: null,
    strokeDashArray: commaOrSpaceSeparated,
    strokeDashOffset: null,
    strokeLineCap: null,
    strokeLineJoin: null,
    strokeMiterLimit: number,
    strokeOpacity: number,
    strokeWidth: null,
    style: null,
    surfaceScale: number,
    syncBehavior: null,
    syncBehaviorDefault: null,
    syncMaster: null,
    syncTolerance: null,
    syncToleranceDefault: null,
    systemLanguage: commaOrSpaceSeparated,
    tabIndex: number,
    tableValues: null,
    target: null,
    targetX: number,
    targetY: number,
    textAnchor: null,
    textDecoration: null,
    textRendering: null,
    textLength: null,
    timelineBegin: null,
    title: null,
    transformBehavior: null,
    type: null,
    typeOf: commaOrSpaceSeparated,
    to: null,
    transform: null,
    transformOrigin: null,
    u1: null,
    u2: null,
    underlinePosition: number,
    underlineThickness: number,
    unicode: null,
    unicodeBidi: null,
    unicodeRange: null,
    unitsPerEm: number,
    values: null,
    vAlphabetic: number,
    vMathematical: number,
    vectorEffect: null,
    vHanging: number,
    vIdeographic: number,
    version: null,
    vertAdvY: number,
    vertOriginX: number,
    vertOriginY: number,
    viewBox: null,
    viewTarget: null,
    visibility: null,
    width: null,
    widths: null,
    wordSpacing: null,
    writingMode: null,
    x: null,
    x1: null,
    x2: null,
    xChannelSelector: null,
    xHeight: number,
    y: null,
    y1: null,
    y2: null,
    yChannelSelector: null,
    z: null,
    zoomAndPan: null
  }
}), valid = /^data[-\w.:]+$/i, dash = /-[a-z]/g, cap = /[A-Z]/g;
function find(schema, value) {
  let normal = normalize(value), prop = value, Type = Info;
  if (normal in schema.normal)
    return schema.property[schema.normal[normal]];
  if (normal.length > 4 && normal.slice(0, 4) === "data" && valid.test(value)) {
    if (value.charAt(4) === "-") {
      let rest = value.slice(5).replace(dash, camelcase);
      prop = "data" + rest.charAt(0).toUpperCase() + rest.slice(1);
    } else {
      let rest = value.slice(4);
      if (!dash.test(rest)) {
        let dashes = rest.replace(cap, kebab);
        dashes.charAt(0) !== "-" && (dashes = "-" + dashes), value = "data" + dashes;
      }
    }
    Type = DefinedInfo;
  }
  return new Type(prop, value);
}
function kebab($0) {
  return "-" + $0.toLowerCase();
}
function camelcase($0) {
  return $0.charAt(1).toUpperCase();
}
var hastToReact = {
  classId: "classID",
  dataType: "datatype",
  itemId: "itemID",
  strokeDashArray: "strokeDasharray",
  strokeDashOffset: "strokeDashoffset",
  strokeLineCap: "strokeLinecap",
  strokeLineJoin: "strokeLinejoin",
  strokeMiterLimit: "strokeMiterlimit",
  typeOf: "typeof",
  xLinkActuate: "xlinkActuate",
  xLinkArcRole: "xlinkArcrole",
  xLinkHref: "xlinkHref",
  xLinkRole: "xlinkRole",
  xLinkShow: "xlinkShow",
  xLinkTitle: "xlinkTitle",
  xLinkType: "xlinkType",
  xmlnsXLink: "xmlnsXlink"
}, html2 = merge([xml, xlink, xmlns, aria, html], "html"), svg2 = merge([xml, xlink, xmlns, aria, svg], "svg"), pointEnd = point("end"), pointStart = point("start");
function point(type) {
  return point2;
  function point2(node) {
    let point3 = node && node.position && node.position[type] || {};
    if (typeof point3.line == "number" && point3.line > 0 && typeof point3.column == "number" && point3.column > 0)
      return {
        line: point3.line,
        column: point3.column,
        offset: typeof point3.offset == "number" && point3.offset > -1 ? point3.offset : void 0
      };
  }
}
function position(node) {
  let start2 = pointStart(node), end = pointEnd(node);
  if (start2 && end)
    return { start: start2, end };
}
var own2 = {}.hasOwnProperty;
function zwitch(key, options) {
  let settings = options || {};
  function one(value, ...parameters) {
    let fn = one.invalid, handlers2 = one.handlers;
    if (value && own2.call(value, key)) {
      let id = String(value[key]);
      fn = own2.call(handlers2, id) ? handlers2[id] : one.unknown;
    }
    if (fn)
      return fn.call(this, value, ...parameters);
  }
  return one.handlers = settings.handlers || {}, one.invalid = settings.invalid, one.unknown = settings.unknown, one;
}
function comment(node, state) {
  let result = { type: "Block", value: node.value };
  state.inherit(node, result), state.comments.push(result);
  let expression = {
    type: "JSXEmptyExpression",
    // @ts-expect-error: `comments` is custom.
    comments: [Object.assign({}, result, { leading: !1, trailing: !0 })]
  };
  state.patch(node, expression);
  let container = { type: "JSXExpressionContainer", expression };
  return state.patch(node, container), container;
}
function stringify(values, options) {
  let settings = options || {};
  return (values[values.length - 1] === "" ? [...values, ""] : values).join(
    (settings.padRight ? " " : "") + "," + (settings.padLeft === !1 ? "" : " ")
  ).trim();
}
var startRe = /[$_\p{ID_Start}]/u, contRe = /[$_\u{200C}\u{200D}\p{ID_Continue}]/u, contReJsx = /[-$_\u{200C}\u{200D}\p{ID_Continue}]/u, nameRe = /^[$_\p{ID_Start}][$_\u{200C}\u{200D}\p{ID_Continue}]*$/u, nameReJsx = /^[$_\p{ID_Start}][-$_\u{200C}\u{200D}\p{ID_Continue}]*$/u, emptyOptions = {};
function start(code) {
  return code ? startRe.test(String.fromCodePoint(code)) : !1;
}
function cont(code, options) {
  let re2 = (options || emptyOptions).jsx ? contReJsx : contRe;
  return code ? re2.test(String.fromCodePoint(code)) : !1;
}
function name(name2, options) {
  return ((options || emptyOptions).jsx ? nameReJsx : nameRe).test(name2);
}
function stringify2(values) {
  return values.join(" ").trim();
}
var import_index = __toESM(require_style_to_object(), 1), style_to_object_default = import_index.default, own3 = {}.hasOwnProperty, cap2 = /[A-Z]/g, dashSomething = /-([a-z])/g, tableCellElement = /* @__PURE__ */ new Set(["td", "th"]);
function element(node, state) {
  let parentSchema = state.schema, schema = parentSchema, props = node.properties || {};
  parentSchema.space === "html" && node.tagName.toLowerCase() === "svg" && (schema = svg2, state.schema = schema);
  let children = state.all(node), attributes = [], prop, alignValue, styleProperties;
  for (prop in props)
    if (own3.call(props, prop)) {
      let value = props[prop], info = find(schema, prop), attributeValue;
      if (value == null || value === !1 || typeof value == "number" && Number.isNaN(value) || !value && info.boolean)
        continue;
      if (prop = state.elementAttributeNameCase === "react" && info.space ? hastToReact[info.property] || info.property : info.attribute, Array.isArray(value) && (value = info.commaSeparated ? stringify(value) : stringify2(value)), prop === "style") {
        let styleObject = typeof value == "object" ? value : parseStyle(String(value), node.tagName);
        state.stylePropertyNameCase === "css" && (styleObject = transformStylesToCssCasing(styleObject));
        let cssProperties = [], cssProp;
        for (cssProp in styleObject)
          own3.call(styleObject, cssProp) && cssProperties.push({
            type: "Property",
            method: !1,
            shorthand: !1,
            computed: !1,
            key: name(cssProp) ? { type: "Identifier", name: cssProp } : { type: "Literal", value: cssProp },
            value: { type: "Literal", value: String(styleObject[cssProp]) },
            kind: "init"
          });
        styleProperties = cssProperties, attributeValue = {
          type: "JSXExpressionContainer",
          expression: { type: "ObjectExpression", properties: cssProperties }
        };
      } else if (value === !0)
        attributeValue = null;
      else if (state.tableCellAlignToStyle && tableCellElement.has(node.tagName) && prop === "align") {
        alignValue = String(value);
        continue;
      } else
        attributeValue = { type: "Literal", value: String(value) };
      name(prop, { jsx: !0 }) ? attributes.push({
        type: "JSXAttribute",
        name: { type: "JSXIdentifier", name: prop },
        value: attributeValue
      }) : attributes.push({
        type: "JSXSpreadAttribute",
        argument: {
          type: "ObjectExpression",
          properties: [
            {
              type: "Property",
              method: !1,
              shorthand: !1,
              computed: !1,
              key: { type: "Literal", value: String(prop) },
              // @ts-expect-error No need to worry about `style` (which has a
              // `JSXExpressionContainer` value) because that’s a valid identifier.
              value: attributeValue || { type: "Literal", value: !0 },
              kind: "init"
            }
          ]
        }
      });
    }
  if (alignValue !== void 0) {
    styleProperties || (styleProperties = [], attributes.push({
      type: "JSXAttribute",
      name: { type: "JSXIdentifier", name: "style" },
      value: {
        type: "JSXExpressionContainer",
        expression: { type: "ObjectExpression", properties: styleProperties }
      }
    }));
    let cssProp = state.stylePropertyNameCase === "css" ? transformStyleToCssCasing("textAlign") : "textAlign";
    styleProperties.push({
      type: "Property",
      method: !1,
      shorthand: !1,
      computed: !1,
      key: name(cssProp) ? { type: "Identifier", name: cssProp } : { type: "Literal", value: cssProp },
      value: { type: "Literal", value: alignValue },
      kind: "init"
    });
  }
  state.schema = parentSchema;
  let result = {
    type: "JSXElement",
    openingElement: {
      type: "JSXOpeningElement",
      attributes,
      name: state.createJsxElementName(node.tagName),
      selfClosing: children.length === 0
    },
    closingElement: children.length > 0 ? {
      type: "JSXClosingElement",
      name: state.createJsxElementName(node.tagName)
    } : null,
    children
  };
  return state.inherit(node, result), result;
}
function parseStyle(value, tagName) {
  let result = {};
  try {
    style_to_object_default(value, iterator);
  } catch (error) {
    let cause = (
      /** @type {Error} */
      error
    );
    throw new Error(
      "Could not parse `style` attribute on `" + tagName + "`",
      { cause }
    );
  }
  return result;
  function iterator(name2, value2) {
    let key = name2;
    key.slice(0, 2) !== "--" && (key.slice(0, 4) === "-ms-" && (key = "ms-" + key.slice(4)), key = key.replace(dashSomething, toCamel)), result[key] = value2;
  }
}
function transformStylesToCssCasing(domCasing) {
  let cssCasing = {}, from;
  for (from in domCasing)
    own3.call(domCasing, from) && (cssCasing[transformStyleToCssCasing(from)] = domCasing[from]);
  return cssCasing;
}
function transformStyleToCssCasing(from) {
  let to = from.replace(cap2, toDash);
  return to.slice(0, 3) === "ms-" && (to = "-" + to), to;
}
function toCamel(_, $1) {
  return $1.toUpperCase();
}
function toDash($0) {
  return "-" + $0.toLowerCase();
}
var own4 = {}.hasOwnProperty, emptyComments = [];
function attachComments(tree, comments) {
  let list = comments ? [...comments].sort(compare) : emptyComments;
  list.length > 0 && walk(tree, { comments: list, index: 0 });
}
function walk(node, state) {
  if (state.index === state.comments.length)
    return;
  let children = [], comments = [], key;
  for (key in node)
    if (own4.call(node, key)) {
      let value = node[key];
      if (value && typeof value == "object" && key !== "comments")
        if (Array.isArray(value)) {
          let index2 = -1;
          for (; ++index2 < value.length; )
            value[index2] && typeof value[index2].type == "string" && children.push(value[index2]);
        } else typeof value.type == "string" && children.push(value);
    }
  children.sort(compare), comments.push(...slice(state, node, !1, { leading: !0, trailing: !1 }));
  let index = -1;
  for (; ++index < children.length; )
    walk(children[index], state);
  comments.push(
    ...slice(state, node, !0, {
      leading: !1,
      trailing: children.length > 0
    })
  ), comments.length > 0 && (node.comments = comments);
}
function slice(state, node, compareEnd, fields) {
  let result = [];
  for (; state.comments[state.index] && compare(state.comments[state.index], node, compareEnd) < 1; )
    result.push(Object.assign({}, state.comments[state.index++], fields));
  return result;
}
function compare(left, right, compareEnd) {
  let field = compareEnd ? "end" : "start";
  return left.range && right.range ? left.range[0] - right.range[compareEnd ? 1 : 0] : left.loc && left.loc.start && right.loc && right.loc[field] ? left.loc.start.line - right.loc[field].line || left.loc.start.column - right.loc[field].column : "start" in left && field in right ? left.start - right[field] : Number.NaN;
}
function mdxExpression(node, state) {
  let estree = node.data && node.data.estree, comments = estree && estree.comments || [], expression;
  estree && (state.comments.push(...comments), attachComments(estree, estree.comments), expression = estree.body[0] && estree.body[0].type === "ExpressionStatement" && estree.body[0].expression || void 0), expression || (expression = { type: "JSXEmptyExpression" }, state.patch(node, expression));
  let result = { type: "JSXExpressionContainer", expression };
  return state.inherit(node, result), result;
}
function mdxJsxElement(node, state) {
  let parentSchema = state.schema, schema = parentSchema, attrs = node.attributes || [], index = -1;
  node.name && parentSchema.space === "html" && node.name.toLowerCase() === "svg" && (schema = svg2, state.schema = schema);
  let children = state.all(node), attributes = [];
  for (; ++index < attrs.length; ) {
    let attr = attrs[index], value = attr.value, attributeValue;
    if (attr.type === "mdxJsxAttribute") {
      if (value == null)
        attributeValue = null;
      else if (typeof value == "object") {
        let estree = value.data && value.data.estree, comments = estree && estree.comments || [], expression;
        estree && (state.comments.push(...comments), attachComments(estree, estree.comments), expression = estree.body[0] && estree.body[0].type === "ExpressionStatement" && estree.body[0].expression || void 0), attributeValue = {
          type: "JSXExpressionContainer",
          expression: expression || { type: "JSXEmptyExpression" }
        }, state.inherit(value, attributeValue);
      } else
        attributeValue = { type: "Literal", value: String(value) };
      let attribute = {
        type: "JSXAttribute",
        name: state.createJsxAttributeName(attr.name),
        value: attributeValue
      };
      state.inherit(attr, attribute), attributes.push(attribute);
    } else {
      let estree = attr.data && attr.data.estree, comments = estree && estree.comments || [], argumentValue;
      estree && (state.comments.push(...comments), attachComments(estree, estree.comments), argumentValue = estree.body[0] && estree.body[0].type === "ExpressionStatement" && estree.body[0].expression && estree.body[0].expression.type === "ObjectExpression" && estree.body[0].expression.properties && estree.body[0].expression.properties[0] && estree.body[0].expression.properties[0].type === "SpreadElement" && estree.body[0].expression.properties[0].argument || void 0);
      let attribute = {
        type: "JSXSpreadAttribute",
        argument: argumentValue || { type: "ObjectExpression", properties: [] }
      };
      state.inherit(attr, attribute), attributes.push(attribute);
    }
  }
  state.schema = parentSchema;
  let result = node.name ? {
    type: "JSXElement",
    openingElement: {
      type: "JSXOpeningElement",
      attributes,
      name: state.createJsxElementName(node.name),
      selfClosing: children.length === 0
    },
    closingElement: children.length > 0 ? {
      type: "JSXClosingElement",
      name: state.createJsxElementName(node.name)
    } : null,
    children
  } : {
    type: "JSXFragment",
    openingFragment: { type: "JSXOpeningFragment" },
    closingFragment: { type: "JSXClosingFragment" },
    children
  };
  return state.inherit(node, result), result;
}
function mdxjsEsm(node, state) {
  let estree = node.data && node.data.estree, comments = estree && estree.comments || [];
  estree && (state.comments.push(...comments), attachComments(estree, comments), state.esm.push(...estree.body));
}
var re = /[ \t\n\f\r]/g;
function whitespace(thing) {
  return typeof thing == "object" ? thing.type === "text" ? empty(thing.value) : !1 : empty(thing);
}
function empty(value) {
  return value.replace(re, "") === "";
}
function root(node, state) {
  let children = state.all(node), cleanChildren = [], index = -1, queue;
  for (; ++index < children.length; ) {
    let child = children[index];
    child.type === "JSXExpressionContainer" && child.expression.type === "Literal" && whitespace(String(child.expression.value)) ? queue && queue.push(child) : (queue && cleanChildren.push(...queue), cleanChildren.push(child), queue = []);
  }
  let result = {
    type: "JSXFragment",
    openingFragment: { type: "JSXOpeningFragment" },
    closingFragment: { type: "JSXClosingFragment" },
    children: cleanChildren
  };
  return state.inherit(node, result), result;
}
function text(node, state) {
  let value = String(node.value || "");
  if (value) {
    let result = { type: "Literal", value };
    state.inherit(node, result);
    let container = { type: "JSXExpressionContainer", expression: result };
    return state.patch(node, container), container;
  }
}
var handlers = {
  comment,
  doctype: ignore,
  element,
  mdxFlowExpression: mdxExpression,
  mdxJsxFlowElement: mdxJsxElement,
  mdxJsxTextElement: mdxJsxElement,
  mdxTextExpression: mdxExpression,
  mdxjsEsm,
  root,
  text
};
function ignore() {
}
var own5 = {}.hasOwnProperty, tableElements = /* @__PURE__ */ new Set(["table", "tbody", "thead", "tfoot", "tr"]);
function createState(options) {
  let one = zwitch("type", {
    invalid,
    unknown,
    handlers: { ...handlers, ...options.handlers }
  });
  return {
    // Current space.
    elementAttributeNameCase: options.elementAttributeNameCase || "react",
    schema: options.space === "svg" ? svg2 : html2,
    stylePropertyNameCase: options.stylePropertyNameCase || "dom",
    tableCellAlignToStyle: options.tableCellAlignToStyle !== !1,
    // Results.
    comments: [],
    esm: [],
    // Useful functions.
    all,
    createJsxAttributeName,
    createJsxElementName,
    handle,
    inherit,
    patch
  };
  function handle(node) {
    return one(node, this);
  }
}
function invalid(value) {
  throw new Error("Cannot handle value `" + value + "`, expected node");
}
function unknown(node) {
  throw "type" in node, new Error("Cannot handle unknown node `" + node.type + "`");
}
function all(parent) {
  let children = parent.children || [], index = -1, results = [], ignoreLineBreak = this.schema.space === "html" && parent.type === "element" && tableElements.has(parent.tagName.toLowerCase());
  for (; ++index < children.length; ) {
    let child = children[index];
    if (ignoreLineBreak && child.type === "text" && child.value === `
`)
      continue;
    let result = this.handle(child);
    Array.isArray(result) ? results.push(...result) : result && results.push(result);
  }
  return results;
}
function inherit(from, to) {
  let left = (
    /** @type {Record<string, unknown> | undefined} */
    from.data
  ), right, key;
  if (patch(from, to), left) {
    for (key in left)
      own5.call(left, key) && key !== "estree" && (right || (right = {}), right[key] = left[key]);
    right && (to.data = right);
  }
}
function patch(from, to) {
  let p = position(from);
  p && p.start.offset !== void 0 && p.end.offset !== void 0 && (to.start = p.start.offset, to.end = p.end.offset, to.loc = {
    start: { line: p.start.line, column: p.start.column - 1 },
    end: { line: p.end.line, column: p.end.column - 1 }
  }, to.range = [p.start.offset, p.end.offset]);
}
function createJsxAttributeName(name2) {
  let node = createJsxNameFromString(name2);
  if (node.type === "JSXMemberExpression")
    throw new Error("Member expressions in attribute names are not supported");
  return node;
}
function createJsxElementName(name2) {
  return createJsxNameFromString(name2);
}
function createJsxNameFromString(name2) {
  if (name2.includes(".")) {
    let names = name2.split("."), part = names.shift();
    let node = { type: "JSXIdentifier", name: part };
    for (; part = names.shift(); )
      node = {
        type: "JSXMemberExpression",
        object: node,
        property: { type: "JSXIdentifier", name: part }
      };
    return node;
  }
  if (name2.includes(":")) {
    let parts = name2.split(":");
    return {
      type: "JSXNamespacedName",
      namespace: { type: "JSXIdentifier", name: parts[0] },
      name: { type: "JSXIdentifier", name: parts[1] }
    };
  }
  return { type: "JSXIdentifier", name: name2 };
}
function toEstree(tree, options) {
  let state = createState(options || {}), result = state.handle(tree), body = state.esm;
  if (result) {
    result.type !== "JSXFragment" && result.type !== "JSXElement" && (result = {
      type: "JSXFragment",
      openingFragment: { type: "JSXOpeningFragment" },
      closingFragment: { type: "JSXClosingFragment" },
      children: [result]
    }, state.patch(tree, result));
    let statement = { type: "ExpressionStatement", expression: result };
    state.patch(tree, statement), body.push(statement);
  }
  let program = {
    type: "Program",
    body,
    sourceType: "module",
    comments: state.comments
  };
  return state.patch(tree, program), program;
}

export {
  __require2 as __require,
  __commonJS,
  __export,
  __toESM,
  pointEnd,
  pointStart,
  position,
  start,
  cont,
  name,
  toEstree
};
