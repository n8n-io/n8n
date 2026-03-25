(function (factory) {
  function interopModuleDefault() {
    var module = factory();
    return module.default || module;
  }

  if (typeof exports === "object" && typeof module === "object") {
    module.exports = interopModuleDefault();
  } else if (typeof define === "function" && define.amd) {
    define(interopModuleDefault);
  } else {
    var root =
      typeof globalThis !== "undefined"
        ? globalThis
        : typeof global !== "undefined"
          ? global
          : typeof self !== "undefined"
            ? self
            : this || {};
    root.doc = interopModuleDefault();
  }
})(function () {
  "use strict";
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/document/public.js
  var public_exports = {};
  __export(public_exports, {
    builders: () => builders,
    printer: () => printer,
    utils: () => utils
  });

  // src/document/constants.js
  var DOC_TYPE_STRING = "string";
  var DOC_TYPE_ARRAY = "array";
  var DOC_TYPE_CURSOR = "cursor";
  var DOC_TYPE_INDENT = "indent";
  var DOC_TYPE_ALIGN = "align";
  var DOC_TYPE_TRIM = "trim";
  var DOC_TYPE_GROUP = "group";
  var DOC_TYPE_FILL = "fill";
  var DOC_TYPE_IF_BREAK = "if-break";
  var DOC_TYPE_INDENT_IF_BREAK = "indent-if-break";
  var DOC_TYPE_LINE_SUFFIX = "line-suffix";
  var DOC_TYPE_LINE_SUFFIX_BOUNDARY = "line-suffix-boundary";
  var DOC_TYPE_LINE = "line";
  var DOC_TYPE_LABEL = "label";
  var DOC_TYPE_BREAK_PARENT = "break-parent";
  var VALID_OBJECT_DOC_TYPES = /* @__PURE__ */ new Set([
    DOC_TYPE_CURSOR,
    DOC_TYPE_INDENT,
    DOC_TYPE_ALIGN,
    DOC_TYPE_TRIM,
    DOC_TYPE_GROUP,
    DOC_TYPE_FILL,
    DOC_TYPE_IF_BREAK,
    DOC_TYPE_INDENT_IF_BREAK,
    DOC_TYPE_LINE_SUFFIX,
    DOC_TYPE_LINE_SUFFIX_BOUNDARY,
    DOC_TYPE_LINE,
    DOC_TYPE_LABEL,
    DOC_TYPE_BREAK_PARENT
  ]);

  // scripts/build/shims/at.js
  var at = (isOptionalObject, object, index) => {
    if (isOptionalObject && (object === void 0 || object === null)) {
      return;
    }
    if (Array.isArray(object) || typeof object === "string") {
      return object[index < 0 ? object.length + index : index];
    }
    return object.at(index);
  };
  var at_default = at;

  // node_modules/trim-newlines/index.js
  function trimNewlinesEnd(string) {
    let end = string.length;
    while (end > 0 && (string[end - 1] === "\r" || string[end - 1] === "\n")) {
      end--;
    }
    return end < string.length ? string.slice(0, end) : string;
  }

  // src/document/utils/get-doc-type.js
  function getDocType(doc) {
    if (typeof doc === "string") {
      return DOC_TYPE_STRING;
    }
    if (Array.isArray(doc)) {
      return DOC_TYPE_ARRAY;
    }
    if (!doc) {
      return;
    }
    const { type } = doc;
    if (VALID_OBJECT_DOC_TYPES.has(type)) {
      return type;
    }
  }
  var get_doc_type_default = getDocType;

  // src/document/invalid-doc-error.js
  var disjunctionListFormat = (list) => new Intl.ListFormat("en-US", { type: "disjunction" }).format(list);
  function getDocErrorMessage(doc) {
    const type = doc === null ? "null" : typeof doc;
    if (type !== "string" && type !== "object") {
      return `Unexpected doc '${type}', 
Expected it to be 'string' or 'object'.`;
    }
    if (get_doc_type_default(doc)) {
      throw new Error("doc is valid.");
    }
    const objectType = Object.prototype.toString.call(doc);
    if (objectType !== "[object Object]") {
      return `Unexpected doc '${objectType}'.`;
    }
    const EXPECTED_TYPE_VALUES = disjunctionListFormat(
      [...VALID_OBJECT_DOC_TYPES].map((type2) => `'${type2}'`)
    );
    return `Unexpected doc.type '${doc.type}'.
Expected it to be ${EXPECTED_TYPE_VALUES}.`;
  }
  var InvalidDocError = class extends Error {
    name = "InvalidDocError";
    constructor(doc) {
      super(getDocErrorMessage(doc));
      this.doc = doc;
    }
  };
  var invalid_doc_error_default = InvalidDocError;

  // src/document/utils/traverse-doc.js
  var traverseDocOnExitStackMarker = {};
  function traverseDoc(doc, onEnter, onExit, shouldTraverseConditionalGroups) {
    const docsStack = [doc];
    while (docsStack.length > 0) {
      const doc2 = docsStack.pop();
      if (doc2 === traverseDocOnExitStackMarker) {
        onExit(docsStack.pop());
        continue;
      }
      if (onExit) {
        docsStack.push(doc2, traverseDocOnExitStackMarker);
      }
      const docType = get_doc_type_default(doc2);
      if (!docType) {
        throw new invalid_doc_error_default(doc2);
      }
      if ((onEnter == null ? void 0 : onEnter(doc2)) === false) {
        continue;
      }
      switch (docType) {
        case DOC_TYPE_ARRAY:
        case DOC_TYPE_FILL: {
          const parts = docType === DOC_TYPE_ARRAY ? doc2 : doc2.parts;
          for (let ic = parts.length, i = ic - 1; i >= 0; --i) {
            docsStack.push(parts[i]);
          }
          break;
        }
        case DOC_TYPE_IF_BREAK:
          docsStack.push(doc2.flatContents, doc2.breakContents);
          break;
        case DOC_TYPE_GROUP:
          if (shouldTraverseConditionalGroups && doc2.expandedStates) {
            for (let ic = doc2.expandedStates.length, i = ic - 1; i >= 0; --i) {
              docsStack.push(doc2.expandedStates[i]);
            }
          } else {
            docsStack.push(doc2.contents);
          }
          break;
        case DOC_TYPE_ALIGN:
        case DOC_TYPE_INDENT:
        case DOC_TYPE_INDENT_IF_BREAK:
        case DOC_TYPE_LABEL:
        case DOC_TYPE_LINE_SUFFIX:
          docsStack.push(doc2.contents);
          break;
        case DOC_TYPE_STRING:
        case DOC_TYPE_CURSOR:
        case DOC_TYPE_TRIM:
        case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
        case DOC_TYPE_LINE:
        case DOC_TYPE_BREAK_PARENT:
          break;
        default:
          throw new invalid_doc_error_default(doc2);
      }
    }
  }
  var traverse_doc_default = traverseDoc;

  // src/document/utils.js
  function mapDoc(doc, cb) {
    if (typeof doc === "string") {
      return cb(doc);
    }
    const mapped = /* @__PURE__ */ new Map();
    return rec(doc);
    function rec(doc2) {
      if (mapped.has(doc2)) {
        return mapped.get(doc2);
      }
      const result = process2(doc2);
      mapped.set(doc2, result);
      return result;
    }
    function process2(doc2) {
      switch (get_doc_type_default(doc2)) {
        case DOC_TYPE_ARRAY:
          return cb(doc2.map(rec));
        case DOC_TYPE_FILL:
          return cb({ ...doc2, parts: doc2.parts.map(rec) });
        case DOC_TYPE_IF_BREAK:
          return cb({
            ...doc2,
            breakContents: rec(doc2.breakContents),
            flatContents: rec(doc2.flatContents)
          });
        case DOC_TYPE_GROUP: {
          let { expandedStates, contents } = doc2;
          if (expandedStates) {
            expandedStates = expandedStates.map(rec);
            contents = expandedStates[0];
          } else {
            contents = rec(contents);
          }
          return cb({ ...doc2, contents, expandedStates });
        }
        case DOC_TYPE_ALIGN:
        case DOC_TYPE_INDENT:
        case DOC_TYPE_INDENT_IF_BREAK:
        case DOC_TYPE_LABEL:
        case DOC_TYPE_LINE_SUFFIX:
          return cb({ ...doc2, contents: rec(doc2.contents) });
        case DOC_TYPE_STRING:
        case DOC_TYPE_CURSOR:
        case DOC_TYPE_TRIM:
        case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
        case DOC_TYPE_LINE:
        case DOC_TYPE_BREAK_PARENT:
          return cb(doc2);
        default:
          throw new invalid_doc_error_default(doc2);
      }
    }
  }
  function findInDoc(doc, fn, defaultValue) {
    let result = defaultValue;
    let shouldSkipFurtherProcessing = false;
    function findInDocOnEnterFn(doc2) {
      if (shouldSkipFurtherProcessing) {
        return false;
      }
      const maybeResult = fn(doc2);
      if (maybeResult !== void 0) {
        shouldSkipFurtherProcessing = true;
        result = maybeResult;
      }
    }
    traverse_doc_default(doc, findInDocOnEnterFn);
    return result;
  }
  function willBreakFn(doc) {
    if (doc.type === DOC_TYPE_GROUP && doc.break) {
      return true;
    }
    if (doc.type === DOC_TYPE_LINE && doc.hard) {
      return true;
    }
    if (doc.type === DOC_TYPE_BREAK_PARENT) {
      return true;
    }
  }
  function willBreak(doc) {
    return findInDoc(doc, willBreakFn, false);
  }
  function breakParentGroup(groupStack) {
    if (groupStack.length > 0) {
      const parentGroup = at_default(
        /* isOptionalObject */
        false,
        groupStack,
        -1
      );
      if (!parentGroup.expandedStates && !parentGroup.break) {
        parentGroup.break = "propagated";
      }
    }
    return null;
  }
  function propagateBreaks(doc) {
    const alreadyVisitedSet = /* @__PURE__ */ new Set();
    const groupStack = [];
    function propagateBreaksOnEnterFn(doc2) {
      if (doc2.type === DOC_TYPE_BREAK_PARENT) {
        breakParentGroup(groupStack);
      }
      if (doc2.type === DOC_TYPE_GROUP) {
        groupStack.push(doc2);
        if (alreadyVisitedSet.has(doc2)) {
          return false;
        }
        alreadyVisitedSet.add(doc2);
      }
    }
    function propagateBreaksOnExitFn(doc2) {
      if (doc2.type === DOC_TYPE_GROUP) {
        const group2 = groupStack.pop();
        if (group2.break) {
          breakParentGroup(groupStack);
        }
      }
    }
    traverse_doc_default(
      doc,
      propagateBreaksOnEnterFn,
      propagateBreaksOnExitFn,
      /* shouldTraverseConditionalGroups */
      true
    );
  }
  function removeLinesFn(doc) {
    if (doc.type === DOC_TYPE_LINE && !doc.hard) {
      return doc.soft ? "" : " ";
    }
    if (doc.type === DOC_TYPE_IF_BREAK) {
      return doc.flatContents;
    }
    return doc;
  }
  function removeLines(doc) {
    return mapDoc(doc, removeLinesFn);
  }
  function stripTrailingHardlineFromParts(parts) {
    parts = [...parts];
    while (parts.length >= 2 && at_default(
      /* isOptionalObject */
      false,
      parts,
      -2
    ).type === DOC_TYPE_LINE && at_default(
      /* isOptionalObject */
      false,
      parts,
      -1
    ).type === DOC_TYPE_BREAK_PARENT) {
      parts.length -= 2;
    }
    if (parts.length > 0) {
      const lastPart = stripTrailingHardlineFromDoc(at_default(
        /* isOptionalObject */
        false,
        parts,
        -1
      ));
      parts[parts.length - 1] = lastPart;
    }
    return parts;
  }
  function stripTrailingHardlineFromDoc(doc) {
    switch (get_doc_type_default(doc)) {
      case DOC_TYPE_INDENT:
      case DOC_TYPE_INDENT_IF_BREAK:
      case DOC_TYPE_GROUP:
      case DOC_TYPE_LINE_SUFFIX:
      case DOC_TYPE_LABEL: {
        const contents = stripTrailingHardlineFromDoc(doc.contents);
        return { ...doc, contents };
      }
      case DOC_TYPE_IF_BREAK:
        return {
          ...doc,
          breakContents: stripTrailingHardlineFromDoc(doc.breakContents),
          flatContents: stripTrailingHardlineFromDoc(doc.flatContents)
        };
      case DOC_TYPE_FILL:
        return { ...doc, parts: stripTrailingHardlineFromParts(doc.parts) };
      case DOC_TYPE_ARRAY:
        return stripTrailingHardlineFromParts(doc);
      case DOC_TYPE_STRING:
        return trimNewlinesEnd(doc);
      case DOC_TYPE_ALIGN:
      case DOC_TYPE_CURSOR:
      case DOC_TYPE_TRIM:
      case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
      case DOC_TYPE_LINE:
      case DOC_TYPE_BREAK_PARENT:
        break;
      default:
        throw new invalid_doc_error_default(doc);
    }
    return doc;
  }
  function stripTrailingHardline(doc) {
    return stripTrailingHardlineFromDoc(cleanDoc(doc));
  }
  function cleanDocFn(doc) {
    switch (get_doc_type_default(doc)) {
      case DOC_TYPE_FILL:
        if (doc.parts.every((part) => part === "")) {
          return "";
        }
        break;
      case DOC_TYPE_GROUP:
        if (!doc.contents && !doc.id && !doc.break && !doc.expandedStates) {
          return "";
        }
        if (doc.contents.type === DOC_TYPE_GROUP && doc.contents.id === doc.id && doc.contents.break === doc.break && doc.contents.expandedStates === doc.expandedStates) {
          return doc.contents;
        }
        break;
      case DOC_TYPE_ALIGN:
      case DOC_TYPE_INDENT:
      case DOC_TYPE_INDENT_IF_BREAK:
      case DOC_TYPE_LINE_SUFFIX:
        if (!doc.contents) {
          return "";
        }
        break;
      case DOC_TYPE_IF_BREAK:
        if (!doc.flatContents && !doc.breakContents) {
          return "";
        }
        break;
      case DOC_TYPE_ARRAY: {
        const parts = [];
        for (const part of doc) {
          if (!part) {
            continue;
          }
          const [currentPart, ...restParts] = Array.isArray(part) ? part : [part];
          if (typeof currentPart === "string" && typeof at_default(
            /* isOptionalObject */
            false,
            parts,
            -1
          ) === "string") {
            parts[parts.length - 1] += currentPart;
          } else {
            parts.push(currentPart);
          }
          parts.push(...restParts);
        }
        if (parts.length === 0) {
          return "";
        }
        if (parts.length === 1) {
          return parts[0];
        }
        return parts;
      }
      case DOC_TYPE_STRING:
      case DOC_TYPE_CURSOR:
      case DOC_TYPE_TRIM:
      case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
      case DOC_TYPE_LINE:
      case DOC_TYPE_LABEL:
      case DOC_TYPE_BREAK_PARENT:
        break;
      default:
        throw new invalid_doc_error_default(doc);
    }
    return doc;
  }
  function cleanDoc(doc) {
    return mapDoc(doc, (currentDoc) => cleanDocFn(currentDoc));
  }
  function replaceEndOfLine(doc, replacement = literalline) {
    return mapDoc(
      doc,
      (currentDoc) => typeof currentDoc === "string" ? join(replacement, currentDoc.split("\n")) : currentDoc
    );
  }
  function canBreakFn(doc) {
    if (doc.type === DOC_TYPE_LINE) {
      return true;
    }
  }
  function canBreak(doc) {
    return findInDoc(doc, canBreakFn, false);
  }

  // src/document/utils/assert-doc.js
  var noop = () => {
  };
  var assertDoc = true ? noop : function(doc) {
    traverse_doc_default(doc, (doc2) => {
      if (checked.has(doc2)) {
        return false;
      }
      if (typeof doc2 !== "string") {
        checked.add(doc2);
      }
    });
  };
  var assertDocArray = true ? noop : function(docs, optional = false) {
    if (optional && !docs) {
      return;
    }
    if (!Array.isArray(docs)) {
      throw new TypeError("Unexpected doc array.");
    }
    for (const doc of docs) {
      assertDoc(doc);
    }
  };
  var assertDocFillParts = true ? noop : (
    /**
     * @param {Doc[]} parts
     */
    function(parts) {
      assertDocArray(parts);
      if (parts.length > 1 && isEmptyDoc(at_default(
        /* isOptionalObject */
        false,
        parts,
        -1
      ))) {
        parts = parts.slice(0, -1);
      }
      for (const [i, doc] of parts.entries()) {
        if (i % 2 === 1 && !isValidSeparator(doc)) {
          const type = get_doc_type_default(doc);
          throw new Error(
            `Unexpected non-line-break doc at ${i}. Doc type is ${type}.`
          );
        }
      }
    }
  );

  // src/document/builders.js
  function indent(contents) {
    assertDoc(contents);
    return { type: DOC_TYPE_INDENT, contents };
  }
  function align(widthOrString, contents) {
    assertDoc(contents);
    return { type: DOC_TYPE_ALIGN, contents, n: widthOrString };
  }
  function group(contents, opts = {}) {
    assertDoc(contents);
    assertDocArray(
      opts.expandedStates,
      /* optional */
      true
    );
    return {
      type: DOC_TYPE_GROUP,
      id: opts.id,
      contents,
      break: Boolean(opts.shouldBreak),
      expandedStates: opts.expandedStates
    };
  }
  function dedentToRoot(contents) {
    return align(Number.NEGATIVE_INFINITY, contents);
  }
  function markAsRoot(contents) {
    return align({ type: "root" }, contents);
  }
  function dedent(contents) {
    return align(-1, contents);
  }
  function conditionalGroup(states, opts) {
    return group(states[0], { ...opts, expandedStates: states });
  }
  function fill(parts) {
    assertDocFillParts(parts);
    return { type: DOC_TYPE_FILL, parts };
  }
  function ifBreak(breakContents, flatContents = "", opts = {}) {
    assertDoc(breakContents);
    if (flatContents !== "") {
      assertDoc(flatContents);
    }
    return {
      type: DOC_TYPE_IF_BREAK,
      breakContents,
      flatContents,
      groupId: opts.groupId
    };
  }
  function indentIfBreak(contents, opts) {
    assertDoc(contents);
    return {
      type: DOC_TYPE_INDENT_IF_BREAK,
      contents,
      groupId: opts.groupId,
      negate: opts.negate
    };
  }
  function lineSuffix(contents) {
    assertDoc(contents);
    return { type: DOC_TYPE_LINE_SUFFIX, contents };
  }
  var lineSuffixBoundary = { type: DOC_TYPE_LINE_SUFFIX_BOUNDARY };
  var breakParent = { type: DOC_TYPE_BREAK_PARENT };
  var trim = { type: DOC_TYPE_TRIM };
  var hardlineWithoutBreakParent = { type: DOC_TYPE_LINE, hard: true };
  var literallineWithoutBreakParent = {
    type: DOC_TYPE_LINE,
    hard: true,
    literal: true
  };
  var line = { type: DOC_TYPE_LINE };
  var softline = { type: DOC_TYPE_LINE, soft: true };
  var hardline = [hardlineWithoutBreakParent, breakParent];
  var literalline = [literallineWithoutBreakParent, breakParent];
  var cursor = { type: DOC_TYPE_CURSOR };
  function join(separator, docs) {
    assertDoc(separator);
    assertDocArray(docs);
    const parts = [];
    for (let i = 0; i < docs.length; i++) {
      if (i !== 0) {
        parts.push(separator);
      }
      parts.push(docs[i]);
    }
    return parts;
  }
  function addAlignmentToDoc(doc, size, tabWidth) {
    assertDoc(doc);
    let aligned = doc;
    if (size > 0) {
      for (let i = 0; i < Math.floor(size / tabWidth); ++i) {
        aligned = indent(aligned);
      }
      aligned = align(size % tabWidth, aligned);
      aligned = align(Number.NEGATIVE_INFINITY, aligned);
    }
    return aligned;
  }
  function label(label2, contents) {
    assertDoc(contents);
    return label2 ? { type: DOC_TYPE_LABEL, label: label2, contents } : contents;
  }

  // scripts/build/shims/string-replace-all.js
  var stringReplaceAll = (isOptionalObject, original, pattern, replacement) => {
    if (isOptionalObject && (original === void 0 || original === null)) {
      return;
    }
    if (original.replaceAll) {
      return original.replaceAll(pattern, replacement);
    }
    if (pattern.global) {
      return original.replace(pattern, replacement);
    }
    return original.split(pattern).join(replacement);
  };
  var string_replace_all_default = stringReplaceAll;

  // src/common/end-of-line.js
  function convertEndOfLineToChars(value) {
    switch (value) {
      case "cr":
        return "\r";
      case "crlf":
        return "\r\n";
      default:
        return "\n";
    }
  }

  // node_modules/emoji-regex/index.mjs
  var emoji_regex_default = () => {
    return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE])))?))?|\uDC6F(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE89\uDE8F-\uDEC2\uDEC6\uDECE-\uDEDC\uDEDF-\uDEE9]|\uDD3C(?:\u200D[\u2640\u2642]\uFE0F?|\uD83C[\uDFFB-\uDFFF])?|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
  };

  // node_modules/get-east-asian-width/lookup.js
  function isFullWidth(x) {
    return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
  }
  function isWide(x) {
    return x >= 4352 && x <= 4447 || x === 8986 || x === 8987 || x === 9001 || x === 9002 || x >= 9193 && x <= 9196 || x === 9200 || x === 9203 || x === 9725 || x === 9726 || x === 9748 || x === 9749 || x >= 9776 && x <= 9783 || x >= 9800 && x <= 9811 || x === 9855 || x >= 9866 && x <= 9871 || x === 9875 || x === 9889 || x === 9898 || x === 9899 || x === 9917 || x === 9918 || x === 9924 || x === 9925 || x === 9934 || x === 9940 || x === 9962 || x === 9970 || x === 9971 || x === 9973 || x === 9978 || x === 9981 || x === 9989 || x === 9994 || x === 9995 || x === 10024 || x === 10060 || x === 10062 || x >= 10067 && x <= 10069 || x === 10071 || x >= 10133 && x <= 10135 || x === 10160 || x === 10175 || x === 11035 || x === 11036 || x === 11088 || x === 11093 || x >= 11904 && x <= 11929 || x >= 11931 && x <= 12019 || x >= 12032 && x <= 12245 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12353 && x <= 12438 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12773 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 42124 || x >= 42128 && x <= 42182 || x >= 43360 && x <= 43388 || x >= 44032 && x <= 55203 || x >= 63744 && x <= 64255 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 94176 && x <= 94180 || x === 94192 || x === 94193 || x >= 94208 && x <= 100343 || x >= 100352 && x <= 101589 || x >= 101631 && x <= 101640 || x >= 110576 && x <= 110579 || x >= 110581 && x <= 110587 || x === 110589 || x === 110590 || x >= 110592 && x <= 110882 || x === 110898 || x >= 110928 && x <= 110930 || x === 110933 || x >= 110948 && x <= 110951 || x >= 110960 && x <= 111355 || x >= 119552 && x <= 119638 || x >= 119648 && x <= 119670 || x === 126980 || x === 127183 || x === 127374 || x >= 127377 && x <= 127386 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x === 127568 || x === 127569 || x >= 127584 && x <= 127589 || x >= 127744 && x <= 127776 || x >= 127789 && x <= 127797 || x >= 127799 && x <= 127868 || x >= 127870 && x <= 127891 || x >= 127904 && x <= 127946 || x >= 127951 && x <= 127955 || x >= 127968 && x <= 127984 || x === 127988 || x >= 127992 && x <= 128062 || x === 128064 || x >= 128066 && x <= 128252 || x >= 128255 && x <= 128317 || x >= 128331 && x <= 128334 || x >= 128336 && x <= 128359 || x === 128378 || x === 128405 || x === 128406 || x === 128420 || x >= 128507 && x <= 128591 || x >= 128640 && x <= 128709 || x === 128716 || x >= 128720 && x <= 128722 || x >= 128725 && x <= 128727 || x >= 128732 && x <= 128735 || x === 128747 || x === 128748 || x >= 128756 && x <= 128764 || x >= 128992 && x <= 129003 || x === 129008 || x >= 129292 && x <= 129338 || x >= 129340 && x <= 129349 || x >= 129351 && x <= 129535 || x >= 129648 && x <= 129660 || x >= 129664 && x <= 129673 || x >= 129679 && x <= 129734 || x >= 129742 && x <= 129756 || x >= 129759 && x <= 129769 || x >= 129776 && x <= 129784 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
  }

  // node_modules/get-east-asian-width/index.js
  var _isNarrowWidth = (codePoint) => !(isFullWidth(codePoint) || isWide(codePoint));

  // src/utils/get-string-width.js
  var notAsciiRegex = /[^\x20-\x7F]/u;
  function getStringWidth(text) {
    if (!text) {
      return 0;
    }
    if (!notAsciiRegex.test(text)) {
      return text.length;
    }
    text = text.replace(emoji_regex_default(), "  ");
    let width = 0;
    for (const character of text) {
      const codePoint = character.codePointAt(0);
      if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) {
        continue;
      }
      if (codePoint >= 768 && codePoint <= 879) {
        continue;
      }
      width += _isNarrowWidth(codePoint) ? 1 : 2;
    }
    return width;
  }
  var get_string_width_default = getStringWidth;

  // src/document/printer.js
  var MODE_BREAK = Symbol("MODE_BREAK");
  var MODE_FLAT = Symbol("MODE_FLAT");
  var CURSOR_PLACEHOLDER = Symbol("cursor");
  var DOC_FILL_PRINTED_LENGTH = Symbol("DOC_FILL_PRINTED_LENGTH");
  function rootIndent() {
    return { value: "", length: 0, queue: [] };
  }
  function makeIndent(ind, options) {
    return generateInd(ind, { type: "indent" }, options);
  }
  function makeAlign(indent2, widthOrDoc, options) {
    if (widthOrDoc === Number.NEGATIVE_INFINITY) {
      return indent2.root || rootIndent();
    }
    if (widthOrDoc < 0) {
      return generateInd(indent2, { type: "dedent" }, options);
    }
    if (!widthOrDoc) {
      return indent2;
    }
    if (widthOrDoc.type === "root") {
      return { ...indent2, root: indent2 };
    }
    const alignType = typeof widthOrDoc === "string" ? "stringAlign" : "numberAlign";
    return generateInd(indent2, { type: alignType, n: widthOrDoc }, options);
  }
  function generateInd(ind, newPart, options) {
    const queue = newPart.type === "dedent" ? ind.queue.slice(0, -1) : [...ind.queue, newPart];
    let value = "";
    let length = 0;
    let lastTabs = 0;
    let lastSpaces = 0;
    for (const part of queue) {
      switch (part.type) {
        case "indent":
          flush();
          if (options.useTabs) {
            addTabs(1);
          } else {
            addSpaces(options.tabWidth);
          }
          break;
        case "stringAlign":
          flush();
          value += part.n;
          length += part.n.length;
          break;
        case "numberAlign":
          lastTabs += 1;
          lastSpaces += part.n;
          break;
        default:
          throw new Error(`Unexpected type '${part.type}'`);
      }
    }
    flushSpaces();
    return { ...ind, value, length, queue };
    function addTabs(count) {
      value += "	".repeat(count);
      length += options.tabWidth * count;
    }
    function addSpaces(count) {
      value += " ".repeat(count);
      length += count;
    }
    function flush() {
      if (options.useTabs) {
        flushTabs();
      } else {
        flushSpaces();
      }
    }
    function flushTabs() {
      if (lastTabs > 0) {
        addTabs(lastTabs);
      }
      resetLast();
    }
    function flushSpaces() {
      if (lastSpaces > 0) {
        addSpaces(lastSpaces);
      }
      resetLast();
    }
    function resetLast() {
      lastTabs = 0;
      lastSpaces = 0;
    }
  }
  function trim2(out) {
    let trimCount = 0;
    let cursorCount = 0;
    let outIndex = out.length;
    outer: while (outIndex--) {
      const last = out[outIndex];
      if (last === CURSOR_PLACEHOLDER) {
        cursorCount++;
        continue;
      }
      if (false) {
        throw new Error(`Unexpected value in trim: '${typeof last}'`);
      }
      for (let charIndex = last.length - 1; charIndex >= 0; charIndex--) {
        const char = last[charIndex];
        if (char === " " || char === "	") {
          trimCount++;
        } else {
          out[outIndex] = last.slice(0, charIndex + 1);
          break outer;
        }
      }
    }
    if (trimCount > 0 || cursorCount > 0) {
      out.length = outIndex + 1;
      while (cursorCount-- > 0) {
        out.push(CURSOR_PLACEHOLDER);
      }
    }
    return trimCount;
  }
  function fits(next, restCommands, width, hasLineSuffix, groupModeMap, mustBeFlat) {
    if (width === Number.POSITIVE_INFINITY) {
      return true;
    }
    let restIdx = restCommands.length;
    const cmds = [next];
    const out = [];
    while (width >= 0) {
      if (cmds.length === 0) {
        if (restIdx === 0) {
          return true;
        }
        cmds.push(restCommands[--restIdx]);
        continue;
      }
      const { mode, doc } = cmds.pop();
      const docType = get_doc_type_default(doc);
      switch (docType) {
        case DOC_TYPE_STRING:
          out.push(doc);
          width -= get_string_width_default(doc);
          break;
        case DOC_TYPE_ARRAY:
        case DOC_TYPE_FILL: {
          const parts = docType === DOC_TYPE_ARRAY ? doc : doc.parts;
          const end = doc[DOC_FILL_PRINTED_LENGTH] ?? 0;
          for (let i = parts.length - 1; i >= end; i--) {
            cmds.push({ mode, doc: parts[i] });
          }
          break;
        }
        case DOC_TYPE_INDENT:
        case DOC_TYPE_ALIGN:
        case DOC_TYPE_INDENT_IF_BREAK:
        case DOC_TYPE_LABEL:
          cmds.push({ mode, doc: doc.contents });
          break;
        case DOC_TYPE_TRIM:
          width += trim2(out);
          break;
        case DOC_TYPE_GROUP: {
          if (mustBeFlat && doc.break) {
            return false;
          }
          const groupMode = doc.break ? MODE_BREAK : mode;
          const contents = doc.expandedStates && groupMode === MODE_BREAK ? at_default(
            /* isOptionalObject */
            false,
            doc.expandedStates,
            -1
          ) : doc.contents;
          cmds.push({ mode: groupMode, doc: contents });
          break;
        }
        case DOC_TYPE_IF_BREAK: {
          const groupMode = doc.groupId ? groupModeMap[doc.groupId] || MODE_FLAT : mode;
          const contents = groupMode === MODE_BREAK ? doc.breakContents : doc.flatContents;
          if (contents) {
            cmds.push({ mode, doc: contents });
          }
          break;
        }
        case DOC_TYPE_LINE:
          if (mode === MODE_BREAK || doc.hard) {
            return true;
          }
          if (!doc.soft) {
            out.push(" ");
            width--;
          }
          break;
        case DOC_TYPE_LINE_SUFFIX:
          hasLineSuffix = true;
          break;
        case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
          if (hasLineSuffix) {
            return false;
          }
          break;
      }
    }
    return false;
  }
  function printDocToString(doc, options) {
    const groupModeMap = {};
    const width = options.printWidth;
    const newLine = convertEndOfLineToChars(options.endOfLine);
    let pos = 0;
    const cmds = [{ ind: rootIndent(), mode: MODE_BREAK, doc }];
    const out = [];
    let shouldRemeasure = false;
    const lineSuffix2 = [];
    let printedCursorCount = 0;
    propagateBreaks(doc);
    while (cmds.length > 0) {
      const { ind, mode, doc: doc2 } = cmds.pop();
      switch (get_doc_type_default(doc2)) {
        case DOC_TYPE_STRING: {
          const formatted = newLine !== "\n" ? string_replace_all_default(
            /* isOptionalObject */
            false,
            doc2,
            "\n",
            newLine
          ) : doc2;
          out.push(formatted);
          if (cmds.length > 0) {
            pos += get_string_width_default(formatted);
          }
          break;
        }
        case DOC_TYPE_ARRAY:
          for (let i = doc2.length - 1; i >= 0; i--) {
            cmds.push({ ind, mode, doc: doc2[i] });
          }
          break;
        case DOC_TYPE_CURSOR:
          if (printedCursorCount >= 2) {
            throw new Error("There are too many 'cursor' in doc.");
          }
          out.push(CURSOR_PLACEHOLDER);
          printedCursorCount++;
          break;
        case DOC_TYPE_INDENT:
          cmds.push({ ind: makeIndent(ind, options), mode, doc: doc2.contents });
          break;
        case DOC_TYPE_ALIGN:
          cmds.push({
            ind: makeAlign(ind, doc2.n, options),
            mode,
            doc: doc2.contents
          });
          break;
        case DOC_TYPE_TRIM:
          pos -= trim2(out);
          break;
        case DOC_TYPE_GROUP:
          switch (mode) {
            case MODE_FLAT:
              if (!shouldRemeasure) {
                cmds.push({
                  ind,
                  mode: doc2.break ? MODE_BREAK : MODE_FLAT,
                  doc: doc2.contents
                });
                break;
              }
            // fallthrough
            case MODE_BREAK: {
              shouldRemeasure = false;
              const next = { ind, mode: MODE_FLAT, doc: doc2.contents };
              const rem = width - pos;
              const hasLineSuffix = lineSuffix2.length > 0;
              if (!doc2.break && fits(next, cmds, rem, hasLineSuffix, groupModeMap)) {
                cmds.push(next);
              } else {
                if (doc2.expandedStates) {
                  const mostExpanded = at_default(
                    /* isOptionalObject */
                    false,
                    doc2.expandedStates,
                    -1
                  );
                  if (doc2.break) {
                    cmds.push({ ind, mode: MODE_BREAK, doc: mostExpanded });
                    break;
                  } else {
                    for (let i = 1; i < doc2.expandedStates.length + 1; i++) {
                      if (i >= doc2.expandedStates.length) {
                        cmds.push({ ind, mode: MODE_BREAK, doc: mostExpanded });
                        break;
                      } else {
                        const state = doc2.expandedStates[i];
                        const cmd = { ind, mode: MODE_FLAT, doc: state };
                        if (fits(cmd, cmds, rem, hasLineSuffix, groupModeMap)) {
                          cmds.push(cmd);
                          break;
                        }
                      }
                    }
                  }
                } else {
                  cmds.push({ ind, mode: MODE_BREAK, doc: doc2.contents });
                }
              }
              break;
            }
          }
          if (doc2.id) {
            groupModeMap[doc2.id] = at_default(
              /* isOptionalObject */
              false,
              cmds,
              -1
            ).mode;
          }
          break;
        // Fills each line with as much code as possible before moving to a new
        // line with the same indentation.
        //
        // Expects doc.parts to be an array of alternating content and
        // whitespace. The whitespace contains the linebreaks.
        //
        // For example:
        //   ["I", line, "love", line, "monkeys"]
        // or
        //   [{ type: group, ... }, softline, { type: group, ... }]
        //
        // It uses this parts structure to handle three main layout cases:
        // * The first two content items fit on the same line without
        //   breaking
        //   -> output the first content item and the whitespace "flat".
        // * Only the first content item fits on the line without breaking
        //   -> output the first content item "flat" and the whitespace with
        //   "break".
        // * Neither content item fits on the line without breaking
        //   -> output the first content item and the whitespace with "break".
        case DOC_TYPE_FILL: {
          const rem = width - pos;
          const offset = doc2[DOC_FILL_PRINTED_LENGTH] ?? 0;
          const { parts } = doc2;
          const length = parts.length - offset;
          if (length === 0) {
            break;
          }
          const content = parts[offset + 0];
          const whitespace = parts[offset + 1];
          const contentFlatCmd = { ind, mode: MODE_FLAT, doc: content };
          const contentBreakCmd = { ind, mode: MODE_BREAK, doc: content };
          const contentFits = fits(
            contentFlatCmd,
            [],
            rem,
            lineSuffix2.length > 0,
            groupModeMap,
            true
          );
          if (length === 1) {
            if (contentFits) {
              cmds.push(contentFlatCmd);
            } else {
              cmds.push(contentBreakCmd);
            }
            break;
          }
          const whitespaceFlatCmd = { ind, mode: MODE_FLAT, doc: whitespace };
          const whitespaceBreakCmd = { ind, mode: MODE_BREAK, doc: whitespace };
          if (length === 2) {
            if (contentFits) {
              cmds.push(whitespaceFlatCmd, contentFlatCmd);
            } else {
              cmds.push(whitespaceBreakCmd, contentBreakCmd);
            }
            break;
          }
          const secondContent = parts[offset + 2];
          const remainingCmd = {
            ind,
            mode,
            doc: { ...doc2, [DOC_FILL_PRINTED_LENGTH]: offset + 2 }
          };
          const firstAndSecondContentFlatCmd = {
            ind,
            mode: MODE_FLAT,
            doc: [content, whitespace, secondContent]
          };
          const firstAndSecondContentFits = fits(
            firstAndSecondContentFlatCmd,
            [],
            rem,
            lineSuffix2.length > 0,
            groupModeMap,
            true
          );
          if (firstAndSecondContentFits) {
            cmds.push(remainingCmd, whitespaceFlatCmd, contentFlatCmd);
          } else if (contentFits) {
            cmds.push(remainingCmd, whitespaceBreakCmd, contentFlatCmd);
          } else {
            cmds.push(remainingCmd, whitespaceBreakCmd, contentBreakCmd);
          }
          break;
        }
        case DOC_TYPE_IF_BREAK:
        case DOC_TYPE_INDENT_IF_BREAK: {
          const groupMode = doc2.groupId ? groupModeMap[doc2.groupId] : mode;
          if (groupMode === MODE_BREAK) {
            const breakContents = doc2.type === DOC_TYPE_IF_BREAK ? doc2.breakContents : doc2.negate ? doc2.contents : indent(doc2.contents);
            if (breakContents) {
              cmds.push({ ind, mode, doc: breakContents });
            }
          }
          if (groupMode === MODE_FLAT) {
            const flatContents = doc2.type === DOC_TYPE_IF_BREAK ? doc2.flatContents : doc2.negate ? indent(doc2.contents) : doc2.contents;
            if (flatContents) {
              cmds.push({ ind, mode, doc: flatContents });
            }
          }
          break;
        }
        case DOC_TYPE_LINE_SUFFIX:
          lineSuffix2.push({ ind, mode, doc: doc2.contents });
          break;
        case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
          if (lineSuffix2.length > 0) {
            cmds.push({ ind, mode, doc: hardlineWithoutBreakParent });
          }
          break;
        case DOC_TYPE_LINE:
          switch (mode) {
            case MODE_FLAT:
              if (!doc2.hard) {
                if (!doc2.soft) {
                  out.push(" ");
                  pos += 1;
                }
                break;
              } else {
                shouldRemeasure = true;
              }
            // fallthrough
            case MODE_BREAK:
              if (lineSuffix2.length > 0) {
                cmds.push({ ind, mode, doc: doc2 }, ...lineSuffix2.reverse());
                lineSuffix2.length = 0;
                break;
              }
              if (doc2.literal) {
                if (ind.root) {
                  out.push(newLine, ind.root.value);
                  pos = ind.root.length;
                } else {
                  out.push(newLine);
                  pos = 0;
                }
              } else {
                pos -= trim2(out);
                out.push(newLine + ind.value);
                pos = ind.length;
              }
              break;
          }
          break;
        case DOC_TYPE_LABEL:
          cmds.push({ ind, mode, doc: doc2.contents });
          break;
        case DOC_TYPE_BREAK_PARENT:
          break;
        default:
          throw new invalid_doc_error_default(doc2);
      }
      if (cmds.length === 0 && lineSuffix2.length > 0) {
        cmds.push(...lineSuffix2.reverse());
        lineSuffix2.length = 0;
      }
    }
    const cursorPlaceholderIndex = out.indexOf(CURSOR_PLACEHOLDER);
    if (cursorPlaceholderIndex !== -1) {
      const otherCursorPlaceholderIndex = out.indexOf(
        CURSOR_PLACEHOLDER,
        cursorPlaceholderIndex + 1
      );
      if (otherCursorPlaceholderIndex === -1) {
        return {
          formatted: out.filter((char) => char !== CURSOR_PLACEHOLDER).join("")
        };
      }
      const beforeCursor = out.slice(0, cursorPlaceholderIndex).join("");
      const aroundCursor = out.slice(cursorPlaceholderIndex + 1, otherCursorPlaceholderIndex).join("");
      const afterCursor = out.slice(otherCursorPlaceholderIndex + 1).join("");
      return {
        formatted: beforeCursor + aroundCursor + afterCursor,
        cursorNodeStart: beforeCursor.length,
        cursorNodeText: aroundCursor
      };
    }
    return { formatted: out.join("") };
  }

  // src/document/public.js
  var builders = {
    join,
    line,
    softline,
    hardline,
    literalline,
    group,
    conditionalGroup,
    fill,
    lineSuffix,
    lineSuffixBoundary,
    cursor,
    breakParent,
    ifBreak,
    trim,
    indent,
    indentIfBreak,
    align,
    addAlignmentToDoc,
    markAsRoot,
    dedentToRoot,
    dedent,
    hardlineWithoutBreakParent,
    literallineWithoutBreakParent,
    label,
    // TODO: Remove this in v4
    concat: (parts) => parts
  };
  var printer = { printDocToString };
  var utils = {
    willBreak,
    traverseDoc: traverse_doc_default,
    findInDoc,
    mapDoc,
    removeLines,
    stripTrailingHardline,
    replaceEndOfLine,
    canBreak
  };
  return __toCommonJS(public_exports);
});