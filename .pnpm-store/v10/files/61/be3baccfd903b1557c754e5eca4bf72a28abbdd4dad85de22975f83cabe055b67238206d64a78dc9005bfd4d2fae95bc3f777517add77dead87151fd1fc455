'use strict';

var state = require('@codemirror/state');
var styleMod = require('style-mod');
var w3cKeyname = require('w3c-keyname');
var elt = require('crelt');

let nav = typeof navigator != "undefined" ? navigator : { userAgent: "", vendor: "", platform: "" };
let doc = typeof document != "undefined" ? document : { documentElement: { style: {} } };
const ie_edge = /Edge\/(\d+)/.exec(nav.userAgent);
const ie_upto10 = /MSIE \d/.test(nav.userAgent);
const ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(nav.userAgent);
const ie = !!(ie_upto10 || ie_11up || ie_edge);
const gecko = !ie && /gecko\/(\d+)/i.test(nav.userAgent);
const chrome = !ie && /Chrome\/(\d+)/.exec(nav.userAgent);
const webkit = "webkitFontSmoothing" in doc.documentElement.style;
const safari = !ie && /Apple Computer/.test(nav.vendor);
const ios = safari && (/Mobile\/\w+/.test(nav.userAgent) || nav.maxTouchPoints > 2);
var browser = {
    mac: ios || /Mac/.test(nav.platform),
    windows: /Win/.test(nav.platform),
    linux: /Linux|X11/.test(nav.platform),
    ie,
    ie_version: ie_upto10 ? doc.documentMode || 6 : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0,
    gecko,
    gecko_version: gecko ? +(/Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    chrome: !!chrome,
    chrome_version: chrome ? +chrome[1] : 0,
    ios,
    android: /Android\b/.test(nav.userAgent),
    webkit,
    webkit_version: webkit ? +(/\bAppleWebKit\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    safari,
    safari_version: safari ? +(/\bVersion\/(\d+(\.\d+)?)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    tabSize: doc.documentElement.style.tabSize != null ? "tab-size" : "-moz-tab-size"
};

function combineAttrs(source, target) {
    for (let name in source) {
        if (name == "class" && target.class)
            target.class += " " + source.class;
        else if (name == "style" && target.style)
            target.style += ";" + source.style;
        else
            target[name] = source[name];
    }
    return target;
}
const noAttrs = Object.create(null);
function attrsEq(a, b, ignore) {
    if (a == b)
        return true;
    if (!a)
        a = noAttrs;
    if (!b)
        b = noAttrs;
    let keysA = Object.keys(a), keysB = Object.keys(b);
    if (keysA.length - (ignore && keysA.indexOf(ignore) > -1 ? 1 : 0) !=
        keysB.length - (ignore && keysB.indexOf(ignore) > -1 ? 1 : 0))
        return false;
    for (let key of keysA) {
        if (key != ignore && (keysB.indexOf(key) == -1 || a[key] !== b[key]))
            return false;
    }
    return true;
}
function setAttrs(dom, attrs) {
    for (let i = dom.attributes.length - 1; i >= 0; i--) {
        let name = dom.attributes[i].name;
        if (attrs[name] == null)
            dom.removeAttribute(name);
    }
    for (let name in attrs) {
        let value = attrs[name];
        if (name == "style")
            dom.style.cssText = value;
        else if (dom.getAttribute(name) != value)
            dom.setAttribute(name, value);
    }
}
function updateAttrs(dom, prev, attrs) {
    let changed = false;
    if (prev)
        for (let name in prev)
            if (!(attrs && name in attrs)) {
                changed = true;
                if (name == "style")
                    dom.style.cssText = "";
                else
                    dom.removeAttribute(name);
            }
    if (attrs)
        for (let name in attrs)
            if (!(prev && prev[name] == attrs[name])) {
                changed = true;
                if (name == "style")
                    dom.style.cssText = attrs[name];
                else
                    dom.setAttribute(name, attrs[name]);
            }
    return changed;
}
function getAttrs(dom) {
    let attrs = Object.create(null);
    for (let i = 0; i < dom.attributes.length; i++) {
        let attr = dom.attributes[i];
        attrs[attr.name] = attr.value;
    }
    return attrs;
}

/**
Widgets added to the content are described by subclasses of this
class. Using a description object like that makes it possible to
delay creating of the DOM structure for a widget until it is
needed, and to avoid redrawing widgets even if the decorations
that define them are recreated.
*/
class WidgetType {
    /**
    Compare this instance to another instance of the same type.
    (TypeScript can't express this, but only instances of the same
    specific class will be passed to this method.) This is used to
    avoid redrawing widgets when they are replaced by a new
    decoration of the same type. The default implementation just
    returns `false`, which will cause new instances of the widget to
    always be redrawn.
    */
    eq(widget) { return false; }
    /**
    Update a DOM element created by a widget of the same type (but
    different, non-`eq` content) to reflect this widget. May return
    true to indicate that it could update, false to indicate it
    couldn't (in which case the widget will be redrawn). The default
    implementation just returns false.
    */
    updateDOM(dom, view) { return false; }
    /**
    @internal
    */
    compare(other) {
        return this == other || this.constructor == other.constructor && this.eq(other);
    }
    /**
    The estimated height this widget will have, to be used when
    estimating the height of content that hasn't been drawn. May
    return -1 to indicate you don't know. The default implementation
    returns -1.
    */
    get estimatedHeight() { return -1; }
    /**
    For inline widgets that are displayed inline (as opposed to
    `inline-block`) and introduce line breaks (through `<br>` tags
    or textual newlines), this must indicate the amount of line
    breaks they introduce. Defaults to 0.
    */
    get lineBreaks() { return 0; }
    /**
    Can be used to configure which kinds of events inside the widget
    should be ignored by the editor. The default is to ignore all
    events.
    */
    ignoreEvent(event) { return true; }
    /**
    Override the way screen coordinates for positions at/in the
    widget are found. `pos` will be the offset into the widget, and
    `side` the side of the position that is being queried—less than
    zero for before, greater than zero for after, and zero for
    directly at that position.
    */
    coordsAt(dom, pos, side) { return null; }
    /**
    @internal
    */
    get isHidden() { return false; }
    /**
    @internal
    */
    get editable() { return false; }
    /**
    This is called when the an instance of the widget is removed
    from the editor view.
    */
    destroy(dom) { }
}
/**
The different types of blocks that can occur in an editor view.
*/
exports.BlockType = void 0;
(function (BlockType) {
    /**
    A line of text.
    */
    BlockType[BlockType["Text"] = 0] = "Text";
    /**
    A block widget associated with the position after it.
    */
    BlockType[BlockType["WidgetBefore"] = 1] = "WidgetBefore";
    /**
    A block widget associated with the position before it.
    */
    BlockType[BlockType["WidgetAfter"] = 2] = "WidgetAfter";
    /**
    A block widget [replacing](https://codemirror.net/6/docs/ref/#view.Decoration^replace) a range of content.
    */
    BlockType[BlockType["WidgetRange"] = 3] = "WidgetRange";
})(exports.BlockType || (exports.BlockType = {}));
/**
A decoration provides information on how to draw or style a piece
of content. You'll usually use it wrapped in a
[`Range`](https://codemirror.net/6/docs/ref/#state.Range), which adds a start and end position.
@nonabstract
*/
class Decoration extends state.RangeValue {
    constructor(
    /**
    @internal
    */
    startSide, 
    /**
    @internal
    */
    endSide, 
    /**
    @internal
    */
    widget, 
    /**
    The config object used to create this decoration. You can
    include additional properties in there to store metadata about
    your decoration.
    */
    spec) {
        super();
        this.startSide = startSide;
        this.endSide = endSide;
        this.widget = widget;
        this.spec = spec;
    }
    /**
    @internal
    */
    get heightRelevant() { return false; }
    /**
    Create a mark decoration, which influences the styling of the
    content in its range. Nested mark decorations will cause nested
    DOM elements to be created. Nesting order is determined by
    precedence of the [facet](https://codemirror.net/6/docs/ref/#view.EditorView^decorations), with
    the higher-precedence decorations creating the inner DOM nodes.
    Such elements are split on line boundaries and on the boundaries
    of lower-precedence decorations.
    */
    static mark(spec) {
        return new MarkDecoration(spec);
    }
    /**
    Create a widget decoration, which displays a DOM element at the
    given position.
    */
    static widget(spec) {
        let side = Math.max(-10000, Math.min(10000, spec.side || 0)), block = !!spec.block;
        side += (block && !spec.inlineOrder)
            ? (side > 0 ? 300000000 /* Side.BlockAfter */ : -400000000 /* Side.BlockBefore */)
            : (side > 0 ? 100000000 /* Side.InlineAfter */ : -100000000 /* Side.InlineBefore */);
        return new PointDecoration(spec, side, side, block, spec.widget || null, false);
    }
    /**
    Create a replace decoration which replaces the given range with
    a widget, or simply hides it.
    */
    static replace(spec) {
        let block = !!spec.block, startSide, endSide;
        if (spec.isBlockGap) {
            startSide = -500000000 /* Side.GapStart */;
            endSide = 400000000 /* Side.GapEnd */;
        }
        else {
            let { start, end } = getInclusive(spec, block);
            startSide = (start ? (block ? -300000000 /* Side.BlockIncStart */ : -1 /* Side.InlineIncStart */) : 500000000 /* Side.NonIncStart */) - 1;
            endSide = (end ? (block ? 200000000 /* Side.BlockIncEnd */ : 1 /* Side.InlineIncEnd */) : -600000000 /* Side.NonIncEnd */) + 1;
        }
        return new PointDecoration(spec, startSide, endSide, block, spec.widget || null, true);
    }
    /**
    Create a line decoration, which can add DOM attributes to the
    line starting at the given position.
    */
    static line(spec) {
        return new LineDecoration(spec);
    }
    /**
    Build a [`DecorationSet`](https://codemirror.net/6/docs/ref/#view.DecorationSet) from the given
    decorated range or ranges. If the ranges aren't already sorted,
    pass `true` for `sort` to make the library sort them for you.
    */
    static set(of, sort = false) {
        return state.RangeSet.of(of, sort);
    }
    /**
    @internal
    */
    hasHeight() { return this.widget ? this.widget.estimatedHeight > -1 : false; }
}
/**
The empty set of decorations.
*/
Decoration.none = state.RangeSet.empty;
class MarkDecoration extends Decoration {
    constructor(spec) {
        let { start, end } = getInclusive(spec);
        super(start ? -1 /* Side.InlineIncStart */ : 500000000 /* Side.NonIncStart */, end ? 1 /* Side.InlineIncEnd */ : -600000000 /* Side.NonIncEnd */, null, spec);
        this.tagName = spec.tagName || "span";
        this.attrs = spec.class && spec.attributes ? combineAttrs(spec.attributes, { class: spec.class })
            : spec.class ? { class: spec.class } : spec.attributes || noAttrs;
    }
    eq(other) {
        return this == other || other instanceof MarkDecoration && this.tagName == other.tagName && attrsEq(this.attrs, other.attrs);
    }
    range(from, to = from) {
        if (from >= to)
            throw new RangeError("Mark decorations may not be empty");
        return super.range(from, to);
    }
}
MarkDecoration.prototype.point = false;
class LineDecoration extends Decoration {
    constructor(spec) {
        super(-200000000 /* Side.Line */, -200000000 /* Side.Line */, null, spec);
    }
    eq(other) {
        return other instanceof LineDecoration &&
            this.spec.class == other.spec.class &&
            attrsEq(this.spec.attributes, other.spec.attributes);
    }
    range(from, to = from) {
        if (to != from)
            throw new RangeError("Line decoration ranges must be zero-length");
        return super.range(from, to);
    }
}
LineDecoration.prototype.mapMode = state.MapMode.TrackBefore;
LineDecoration.prototype.point = true;
class PointDecoration extends Decoration {
    constructor(spec, startSide, endSide, block, widget, isReplace) {
        super(startSide, endSide, widget, spec);
        this.block = block;
        this.isReplace = isReplace;
        this.mapMode = !block ? state.MapMode.TrackDel : startSide <= 0 ? state.MapMode.TrackBefore : state.MapMode.TrackAfter;
    }
    // Only relevant when this.block == true
    get type() {
        return this.startSide != this.endSide ? exports.BlockType.WidgetRange
            : this.startSide <= 0 ? exports.BlockType.WidgetBefore : exports.BlockType.WidgetAfter;
    }
    get heightRelevant() {
        return this.block || !!this.widget && (this.widget.estimatedHeight >= 5 || this.widget.lineBreaks > 0);
    }
    eq(other) {
        return other instanceof PointDecoration &&
            widgetsEq(this.widget, other.widget) &&
            this.block == other.block &&
            this.startSide == other.startSide && this.endSide == other.endSide;
    }
    range(from, to = from) {
        if (this.isReplace && (from > to || (from == to && this.startSide > 0 && this.endSide <= 0)))
            throw new RangeError("Invalid range for replacement decoration");
        if (!this.isReplace && to != from)
            throw new RangeError("Widget decorations can only have zero-length ranges");
        return super.range(from, to);
    }
}
PointDecoration.prototype.point = true;
function getInclusive(spec, block = false) {
    let { inclusiveStart: start, inclusiveEnd: end } = spec;
    if (start == null)
        start = spec.inclusive;
    if (end == null)
        end = spec.inclusive;
    return { start: start !== null && start !== void 0 ? start : block, end: end !== null && end !== void 0 ? end : block };
}
function widgetsEq(a, b) {
    return a == b || !!(a && b && a.compare(b));
}
function addRange(from, to, ranges, margin = 0) {
    let last = ranges.length - 1;
    if (last >= 0 && ranges[last] + margin >= from)
        ranges[last] = Math.max(ranges[last], to);
    else
        ranges.push(from, to);
}
/**
A block wrapper defines a DOM node that wraps lines or other block
wrappers at the top of the document. It affects any line or block
widget that starts inside its range, including blocks starting
directly at `from` but not including `to`.
*/
class BlockWrapper extends state.RangeValue {
    constructor(tagName, attributes) {
        super();
        this.tagName = tagName;
        this.attributes = attributes;
    }
    eq(other) {
        return other == this ||
            other instanceof BlockWrapper && this.tagName == other.tagName && attrsEq(this.attributes, other.attributes);
    }
    /**
    Create a block wrapper object with the given tag name and
    attributes.
    */
    static create(spec) {
        return new BlockWrapper(spec.tagName, spec.attributes || noAttrs);
    }
    /**
    Create a range set from the given block wrapper ranges.
    */
    static set(of, sort = false) {
        return state.RangeSet.of(of, sort);
    }
}
BlockWrapper.prototype.startSide = BlockWrapper.prototype.endSide = -1;

function getSelection(root) {
    let target;
    // Browsers differ on whether shadow roots have a getSelection
    // method. If it exists, use that, otherwise, call it on the
    // document.
    if (root.nodeType == 11) { // Shadow root
        target = root.getSelection ? root : root.ownerDocument;
    }
    else {
        target = root;
    }
    return target.getSelection();
}
function contains(dom, node) {
    return node ? dom == node || dom.contains(node.nodeType != 1 ? node.parentNode : node) : false;
}
function hasSelection(dom, selection) {
    if (!selection.anchorNode)
        return false;
    try {
        // Firefox will raise 'permission denied' errors when accessing
        // properties of `sel.anchorNode` when it's in a generated CSS
        // element.
        return contains(dom, selection.anchorNode);
    }
    catch (_) {
        return false;
    }
}
function clientRectsFor(dom) {
    if (dom.nodeType == 3)
        return textRange(dom, 0, dom.nodeValue.length).getClientRects();
    else if (dom.nodeType == 1)
        return dom.getClientRects();
    else
        return [];
}
// Scans forward and backward through DOM positions equivalent to the
// given one to see if the two are in the same place (i.e. after a
// text node vs at the end of that text node)
function isEquivalentPosition(node, off, targetNode, targetOff) {
    return targetNode ? (scanFor(node, off, targetNode, targetOff, -1) ||
        scanFor(node, off, targetNode, targetOff, 1)) : false;
}
function domIndex(node) {
    for (var index = 0;; index++) {
        node = node.previousSibling;
        if (!node)
            return index;
    }
}
function isBlockElement(node) {
    return node.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(node.nodeName);
}
function scanFor(node, off, targetNode, targetOff, dir) {
    for (;;) {
        if (node == targetNode && off == targetOff)
            return true;
        if (off == (dir < 0 ? 0 : maxOffset(node))) {
            if (node.nodeName == "DIV")
                return false;
            let parent = node.parentNode;
            if (!parent || parent.nodeType != 1)
                return false;
            off = domIndex(node) + (dir < 0 ? 0 : 1);
            node = parent;
        }
        else if (node.nodeType == 1) {
            node = node.childNodes[off + (dir < 0 ? -1 : 0)];
            if (node.nodeType == 1 && node.contentEditable == "false")
                return false;
            off = dir < 0 ? maxOffset(node) : 0;
        }
        else {
            return false;
        }
    }
}
function maxOffset(node) {
    return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
}
function flattenRect(rect, left) {
    let x = left ? rect.left : rect.right;
    return { left: x, right: x, top: rect.top, bottom: rect.bottom };
}
function windowRect(win) {
    let vp = win.visualViewport;
    if (vp)
        return {
            left: 0, right: vp.width,
            top: 0, bottom: vp.height
        };
    return { left: 0, right: win.innerWidth,
        top: 0, bottom: win.innerHeight };
}
function getScale(elt, rect) {
    let scaleX = rect.width / elt.offsetWidth;
    let scaleY = rect.height / elt.offsetHeight;
    if (scaleX > 0.995 && scaleX < 1.005 || !isFinite(scaleX) || Math.abs(rect.width - elt.offsetWidth) < 1)
        scaleX = 1;
    if (scaleY > 0.995 && scaleY < 1.005 || !isFinite(scaleY) || Math.abs(rect.height - elt.offsetHeight) < 1)
        scaleY = 1;
    return { scaleX, scaleY };
}
function scrollRectIntoView(dom, rect, side, x, y, xMargin, yMargin, ltr) {
    let doc = dom.ownerDocument, win = doc.defaultView || window;
    for (let cur = dom, stop = false; cur && !stop;) {
        if (cur.nodeType == 1) { // Element
            let bounding, top = cur == doc.body;
            let scaleX = 1, scaleY = 1;
            if (top) {
                bounding = windowRect(win);
            }
            else {
                if (/^(fixed|sticky)$/.test(getComputedStyle(cur).position))
                    stop = true;
                if (cur.scrollHeight <= cur.clientHeight && cur.scrollWidth <= cur.clientWidth) {
                    cur = cur.assignedSlot || cur.parentNode;
                    continue;
                }
                let rect = cur.getBoundingClientRect();
                ({ scaleX, scaleY } = getScale(cur, rect));
                // Make sure scrollbar width isn't included in the rectangle
                bounding = { left: rect.left, right: rect.left + cur.clientWidth * scaleX,
                    top: rect.top, bottom: rect.top + cur.clientHeight * scaleY };
            }
            let moveX = 0, moveY = 0;
            if (y == "nearest") {
                if (rect.top < bounding.top) {
                    moveY = rect.top - (bounding.top + yMargin);
                    if (side > 0 && rect.bottom > bounding.bottom + moveY)
                        moveY = rect.bottom - bounding.bottom + yMargin;
                }
                else if (rect.bottom > bounding.bottom) {
                    moveY = rect.bottom - bounding.bottom + yMargin;
                    if (side < 0 && (rect.top - moveY) < bounding.top)
                        moveY = rect.top - (bounding.top + yMargin);
                }
            }
            else {
                let rectHeight = rect.bottom - rect.top, boundingHeight = bounding.bottom - bounding.top;
                let targetTop = y == "center" && rectHeight <= boundingHeight ? rect.top + rectHeight / 2 - boundingHeight / 2 :
                    y == "start" || y == "center" && side < 0 ? rect.top - yMargin :
                        rect.bottom - boundingHeight + yMargin;
                moveY = targetTop - bounding.top;
            }
            if (x == "nearest") {
                if (rect.left < bounding.left) {
                    moveX = rect.left - (bounding.left + xMargin);
                    if (side > 0 && rect.right > bounding.right + moveX)
                        moveX = rect.right - bounding.right + xMargin;
                }
                else if (rect.right > bounding.right) {
                    moveX = rect.right - bounding.right + xMargin;
                    if (side < 0 && rect.left < bounding.left + moveX)
                        moveX = rect.left - (bounding.left + xMargin);
                }
            }
            else {
                let targetLeft = x == "center" ? rect.left + (rect.right - rect.left) / 2 - (bounding.right - bounding.left) / 2 :
                    (x == "start") == ltr ? rect.left - xMargin :
                        rect.right - (bounding.right - bounding.left) + xMargin;
                moveX = targetLeft - bounding.left;
            }
            if (moveX || moveY) {
                if (top) {
                    win.scrollBy(moveX, moveY);
                }
                else {
                    let movedX = 0, movedY = 0;
                    if (moveY) {
                        let start = cur.scrollTop;
                        cur.scrollTop += moveY / scaleY;
                        movedY = (cur.scrollTop - start) * scaleY;
                    }
                    if (moveX) {
                        let start = cur.scrollLeft;
                        cur.scrollLeft += moveX / scaleX;
                        movedX = (cur.scrollLeft - start) * scaleX;
                    }
                    rect = { left: rect.left - movedX, top: rect.top - movedY,
                        right: rect.right - movedX, bottom: rect.bottom - movedY };
                    if (movedX && Math.abs(movedX - moveX) < 1)
                        x = "nearest";
                    if (movedY && Math.abs(movedY - moveY) < 1)
                        y = "nearest";
                }
            }
            if (top)
                break;
            if (rect.top < bounding.top || rect.bottom > bounding.bottom ||
                rect.left < bounding.left || rect.right > bounding.right)
                rect = { left: Math.max(rect.left, bounding.left), right: Math.min(rect.right, bounding.right),
                    top: Math.max(rect.top, bounding.top), bottom: Math.min(rect.bottom, bounding.bottom) };
            cur = cur.assignedSlot || cur.parentNode;
        }
        else if (cur.nodeType == 11) { // A shadow root
            cur = cur.host;
        }
        else {
            break;
        }
    }
}
function scrollableParents(dom) {
    let doc = dom.ownerDocument, x, y;
    for (let cur = dom.parentNode; cur;) {
        if (cur == doc.body || (x && y)) {
            break;
        }
        else if (cur.nodeType == 1) {
            if (!y && cur.scrollHeight > cur.clientHeight)
                y = cur;
            if (!x && cur.scrollWidth > cur.clientWidth)
                x = cur;
            cur = cur.assignedSlot || cur.parentNode;
        }
        else if (cur.nodeType == 11) {
            cur = cur.host;
        }
        else {
            break;
        }
    }
    return { x, y };
}
class DOMSelectionState {
    constructor() {
        this.anchorNode = null;
        this.anchorOffset = 0;
        this.focusNode = null;
        this.focusOffset = 0;
    }
    eq(domSel) {
        return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset &&
            this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
    }
    setRange(range) {
        let { anchorNode, focusNode } = range;
        // Clip offsets to node size to avoid crashes when Safari reports bogus offsets (#1152)
        this.set(anchorNode, Math.min(range.anchorOffset, anchorNode ? maxOffset(anchorNode) : 0), focusNode, Math.min(range.focusOffset, focusNode ? maxOffset(focusNode) : 0));
    }
    set(anchorNode, anchorOffset, focusNode, focusOffset) {
        this.anchorNode = anchorNode;
        this.anchorOffset = anchorOffset;
        this.focusNode = focusNode;
        this.focusOffset = focusOffset;
    }
}
let preventScrollSupported = null;
// Safari 26 breaks preventScroll support
if (browser.safari && browser.safari_version >= 26)
    preventScrollSupported = false;
// Feature-detects support for .focus({preventScroll: true}), and uses
// a fallback kludge when not supported.
function focusPreventScroll(dom) {
    if (dom.setActive)
        return dom.setActive(); // in IE
    if (preventScrollSupported)
        return dom.focus(preventScrollSupported);
    let stack = [];
    for (let cur = dom; cur; cur = cur.parentNode) {
        stack.push(cur, cur.scrollTop, cur.scrollLeft);
        if (cur == cur.ownerDocument)
            break;
    }
    dom.focus(preventScrollSupported == null ? {
        get preventScroll() {
            preventScrollSupported = { preventScroll: true };
            return true;
        }
    } : undefined);
    if (!preventScrollSupported) {
        preventScrollSupported = false;
        for (let i = 0; i < stack.length;) {
            let elt = stack[i++], top = stack[i++], left = stack[i++];
            if (elt.scrollTop != top)
                elt.scrollTop = top;
            if (elt.scrollLeft != left)
                elt.scrollLeft = left;
        }
    }
}
let scratchRange;
function textRange(node, from, to = from) {
    let range = scratchRange || (scratchRange = document.createRange());
    range.setEnd(node, to);
    range.setStart(node, from);
    return range;
}
function dispatchKey(elt, name, code, mods) {
    let options = { key: name, code: name, keyCode: code, which: code, cancelable: true };
    if (mods)
        ({ altKey: options.altKey, ctrlKey: options.ctrlKey, shiftKey: options.shiftKey, metaKey: options.metaKey } = mods);
    let down = new KeyboardEvent("keydown", options);
    down.synthetic = true;
    elt.dispatchEvent(down);
    let up = new KeyboardEvent("keyup", options);
    up.synthetic = true;
    elt.dispatchEvent(up);
    return down.defaultPrevented || up.defaultPrevented;
}
function getRoot(node) {
    while (node) {
        if (node && (node.nodeType == 9 || node.nodeType == 11 && node.host))
            return node;
        node = node.assignedSlot || node.parentNode;
    }
    return null;
}
function atElementStart(doc, selection) {
    let node = selection.focusNode, offset = selection.focusOffset;
    if (!node || selection.anchorNode != node || selection.anchorOffset != offset)
        return false;
    // Safari can report bogus offsets (#1152)
    offset = Math.min(offset, maxOffset(node));
    for (;;) {
        if (offset) {
            if (node.nodeType != 1)
                return false;
            let prev = node.childNodes[offset - 1];
            if (prev.contentEditable == "false")
                offset--;
            else {
                node = prev;
                offset = maxOffset(node);
            }
        }
        else if (node == doc) {
            return true;
        }
        else {
            offset = domIndex(node);
            node = node.parentNode;
        }
    }
}
function isScrolledToBottom(elt) {
    return elt.scrollTop > Math.max(1, elt.scrollHeight - elt.clientHeight - 4);
}
function textNodeBefore(startNode, startOffset) {
    for (let node = startNode, offset = startOffset;;) {
        if (node.nodeType == 3 && offset > 0) {
            return { node: node, offset: offset };
        }
        else if (node.nodeType == 1 && offset > 0) {
            if (node.contentEditable == "false")
                return null;
            node = node.childNodes[offset - 1];
            offset = maxOffset(node);
        }
        else if (node.parentNode && !isBlockElement(node)) {
            offset = domIndex(node);
            node = node.parentNode;
        }
        else {
            return null;
        }
    }
}
function textNodeAfter(startNode, startOffset) {
    for (let node = startNode, offset = startOffset;;) {
        if (node.nodeType == 3 && offset < node.nodeValue.length) {
            return { node: node, offset: offset };
        }
        else if (node.nodeType == 1 && offset < node.childNodes.length) {
            if (node.contentEditable == "false")
                return null;
            node = node.childNodes[offset];
            offset = 0;
        }
        else if (node.parentNode && !isBlockElement(node)) {
            offset = domIndex(node) + 1;
            node = node.parentNode;
        }
        else {
            return null;
        }
    }
}
class DOMPos {
    constructor(node, offset, precise = true) {
        this.node = node;
        this.offset = offset;
        this.precise = precise;
    }
    static before(dom, precise) { return new DOMPos(dom.parentNode, domIndex(dom), precise); }
    static after(dom, precise) { return new DOMPos(dom.parentNode, domIndex(dom) + 1, precise); }
}

/**
Used to indicate [text direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection).
*/
exports.Direction = void 0;
(function (Direction) {
    // (These are chosen to match the base levels, in bidi algorithm
    // terms, of spans in that direction.)
    /**
    Left-to-right.
    */
    Direction[Direction["LTR"] = 0] = "LTR";
    /**
    Right-to-left.
    */
    Direction[Direction["RTL"] = 1] = "RTL";
})(exports.Direction || (exports.Direction = {}));
const LTR = exports.Direction.LTR, RTL = exports.Direction.RTL;
// Decode a string with each type encoded as log2(type)
function dec(str) {
    let result = [];
    for (let i = 0; i < str.length; i++)
        result.push(1 << +str[i]);
    return result;
}
// Character types for codepoints 0 to 0xf8
const LowTypes = dec("88888888888888888888888888888888888666888888787833333333337888888000000000000000000000000008888880000000000000000000000000088888888888888888888888888888888888887866668888088888663380888308888800000000000000000000000800000000000000000000000000000008");
// Character types for codepoints 0x600 to 0x6f9
const ArabicTypes = dec("4444448826627288999999999992222222222222222222222222222222222222222222222229999999999999999999994444444444644222822222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222999999949999999229989999223333333333");
const Brackets = Object.create(null), BracketStack = [];
// There's a lot more in
// https://www.unicode.org/Public/UCD/latest/ucd/BidiBrackets.txt,
// which are left out to keep code size down.
for (let p of ["()", "[]", "{}"]) {
    let l = p.charCodeAt(0), r = p.charCodeAt(1);
    Brackets[l] = r;
    Brackets[r] = -l;
}
function charType(ch) {
    return ch <= 0xf7 ? LowTypes[ch] :
        0x590 <= ch && ch <= 0x5f4 ? 2 /* T.R */ :
            0x600 <= ch && ch <= 0x6f9 ? ArabicTypes[ch - 0x600] :
                0x6ee <= ch && ch <= 0x8ac ? 4 /* T.AL */ :
                    0x2000 <= ch && ch <= 0x200c ? 256 /* T.NI */ :
                        0xfb50 <= ch && ch <= 0xfdff ? 4 /* T.AL */ : 1 /* T.L */;
}
const BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac\ufb50-\ufdff]/;
/**
Represents a contiguous range of text that has a single direction
(as in left-to-right or right-to-left).
*/
class BidiSpan {
    /**
    The direction of this span.
    */
    get dir() { return this.level % 2 ? RTL : LTR; }
    /**
    @internal
    */
    constructor(
    /**
    The start of the span (relative to the start of the line).
    */
    from, 
    /**
    The end of the span.
    */
    to, 
    /**
    The ["bidi
    level"](https://unicode.org/reports/tr9/#Basic_Display_Algorithm)
    of the span (in this context, 0 means
    left-to-right, 1 means right-to-left, 2 means left-to-right
    number inside right-to-left text).
    */
    level) {
        this.from = from;
        this.to = to;
        this.level = level;
    }
    /**
    @internal
    */
    side(end, dir) { return (this.dir == dir) == end ? this.to : this.from; }
    /**
    @internal
    */
    forward(forward, dir) { return forward == (this.dir == dir); }
    /**
    @internal
    */
    static find(order, index, level, assoc) {
        let maybe = -1;
        for (let i = 0; i < order.length; i++) {
            let span = order[i];
            if (span.from <= index && span.to >= index) {
                if (span.level == level)
                    return i;
                // When multiple spans match, if assoc != 0, take the one that
                // covers that side, otherwise take the one with the minimum
                // level.
                if (maybe < 0 || (assoc != 0 ? (assoc < 0 ? span.from < index : span.to > index) : order[maybe].level > span.level))
                    maybe = i;
            }
        }
        if (maybe < 0)
            throw new RangeError("Index out of range");
        return maybe;
    }
}
function isolatesEq(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        let iA = a[i], iB = b[i];
        if (iA.from != iB.from || iA.to != iB.to || iA.direction != iB.direction || !isolatesEq(iA.inner, iB.inner))
            return false;
    }
    return true;
}
// Reused array of character types
const types = [];
// Fill in the character types (in `types`) from `from` to `to` and
// apply W normalization rules.
function computeCharTypes(line, rFrom, rTo, isolates, outerType) {
    for (let iI = 0; iI <= isolates.length; iI++) {
        let from = iI ? isolates[iI - 1].to : rFrom, to = iI < isolates.length ? isolates[iI].from : rTo;
        let prevType = iI ? 256 /* T.NI */ : outerType;
        // W1. Examine each non-spacing mark (NSM) in the level run, and
        // change the type of the NSM to the type of the previous
        // character. If the NSM is at the start of the level run, it will
        // get the type of sor.
        // W2. Search backwards from each instance of a European number
        // until the first strong type (R, L, AL, or sor) is found. If an
        // AL is found, change the type of the European number to Arabic
        // number.
        // W3. Change all ALs to R.
        // (Left after this: L, R, EN, AN, ET, CS, NI)
        for (let i = from, prev = prevType, prevStrong = prevType; i < to; i++) {
            let type = charType(line.charCodeAt(i));
            if (type == 512 /* T.NSM */)
                type = prev;
            else if (type == 8 /* T.EN */ && prevStrong == 4 /* T.AL */)
                type = 16 /* T.AN */;
            types[i] = type == 4 /* T.AL */ ? 2 /* T.R */ : type;
            if (type & 7 /* T.Strong */)
                prevStrong = type;
            prev = type;
        }
        // W5. A sequence of European terminators adjacent to European
        // numbers changes to all European numbers.
        // W6. Otherwise, separators and terminators change to Other
        // Neutral.
        // W7. Search backwards from each instance of a European number
        // until the first strong type (R, L, or sor) is found. If an L is
        // found, then change the type of the European number to L.
        // (Left after this: L, R, EN+AN, NI)
        for (let i = from, prev = prevType, prevStrong = prevType; i < to; i++) {
            let type = types[i];
            if (type == 128 /* T.CS */) {
                if (i < to - 1 && prev == types[i + 1] && (prev & 24 /* T.Num */))
                    type = types[i] = prev;
                else
                    types[i] = 256 /* T.NI */;
            }
            else if (type == 64 /* T.ET */) {
                let end = i + 1;
                while (end < to && types[end] == 64 /* T.ET */)
                    end++;
                let replace = (i && prev == 8 /* T.EN */) || (end < rTo && types[end] == 8 /* T.EN */) ? (prevStrong == 1 /* T.L */ ? 1 /* T.L */ : 8 /* T.EN */) : 256 /* T.NI */;
                for (let j = i; j < end; j++)
                    types[j] = replace;
                i = end - 1;
            }
            else if (type == 8 /* T.EN */ && prevStrong == 1 /* T.L */) {
                types[i] = 1 /* T.L */;
            }
            prev = type;
            if (type & 7 /* T.Strong */)
                prevStrong = type;
        }
    }
}
// Process brackets throughout a run sequence.
function processBracketPairs(line, rFrom, rTo, isolates, outerType) {
    let oppositeType = outerType == 1 /* T.L */ ? 2 /* T.R */ : 1 /* T.L */;
    for (let iI = 0, sI = 0, context = 0; iI <= isolates.length; iI++) {
        let from = iI ? isolates[iI - 1].to : rFrom, to = iI < isolates.length ? isolates[iI].from : rTo;
        // N0. Process bracket pairs in an isolating run sequence
        // sequentially in the logical order of the text positions of the
        // opening paired brackets using the logic given below. Within this
        // scope, bidirectional types EN and AN are treated as R.
        for (let i = from, ch, br, type; i < to; i++) {
            // Keeps [startIndex, type, strongSeen] triples for each open
            // bracket on BracketStack.
            if (br = Brackets[ch = line.charCodeAt(i)]) {
                if (br < 0) { // Closing bracket
                    for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
                        if (BracketStack[sJ + 1] == -br) {
                            let flags = BracketStack[sJ + 2];
                            let type = (flags & 2 /* Bracketed.EmbedInside */) ? outerType :
                                !(flags & 4 /* Bracketed.OppositeInside */) ? 0 :
                                    (flags & 1 /* Bracketed.OppositeBefore */) ? oppositeType : outerType;
                            if (type)
                                types[i] = types[BracketStack[sJ]] = type;
                            sI = sJ;
                            break;
                        }
                    }
                }
                else if (BracketStack.length == 189 /* Bracketed.MaxDepth */) {
                    break;
                }
                else {
                    BracketStack[sI++] = i;
                    BracketStack[sI++] = ch;
                    BracketStack[sI++] = context;
                }
            }
            else if ((type = types[i]) == 2 /* T.R */ || type == 1 /* T.L */) {
                let embed = type == outerType;
                context = embed ? 0 : 1 /* Bracketed.OppositeBefore */;
                for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
                    let cur = BracketStack[sJ + 2];
                    if (cur & 2 /* Bracketed.EmbedInside */)
                        break;
                    if (embed) {
                        BracketStack[sJ + 2] |= 2 /* Bracketed.EmbedInside */;
                    }
                    else {
                        if (cur & 4 /* Bracketed.OppositeInside */)
                            break;
                        BracketStack[sJ + 2] |= 4 /* Bracketed.OppositeInside */;
                    }
                }
            }
        }
    }
}
function processNeutrals(rFrom, rTo, isolates, outerType) {
    for (let iI = 0, prev = outerType; iI <= isolates.length; iI++) {
        let from = iI ? isolates[iI - 1].to : rFrom, to = iI < isolates.length ? isolates[iI].from : rTo;
        // N1. A sequence of neutrals takes the direction of the
        // surrounding strong text if the text on both sides has the same
        // direction. European and Arabic numbers act as if they were R in
        // terms of their influence on neutrals. Start-of-level-run (sor)
        // and end-of-level-run (eor) are used at level run boundaries.
        // N2. Any remaining neutrals take the embedding direction.
        // (Left after this: L, R, EN+AN)
        for (let i = from; i < to;) {
            let type = types[i];
            if (type == 256 /* T.NI */) {
                let end = i + 1;
                for (;;) {
                    if (end == to) {
                        if (iI == isolates.length)
                            break;
                        end = isolates[iI++].to;
                        to = iI < isolates.length ? isolates[iI].from : rTo;
                    }
                    else if (types[end] == 256 /* T.NI */) {
                        end++;
                    }
                    else {
                        break;
                    }
                }
                let beforeL = prev == 1 /* T.L */;
                let afterL = (end < rTo ? types[end] : outerType) == 1 /* T.L */;
                let replace = beforeL == afterL ? (beforeL ? 1 /* T.L */ : 2 /* T.R */) : outerType;
                for (let j = end, jI = iI, fromJ = jI ? isolates[jI - 1].to : rFrom; j > i;) {
                    if (j == fromJ) {
                        j = isolates[--jI].from;
                        fromJ = jI ? isolates[jI - 1].to : rFrom;
                    }
                    types[--j] = replace;
                }
                i = end;
            }
            else {
                prev = type;
                i++;
            }
        }
    }
}
// Find the contiguous ranges of character types in a given range, and
// emit spans for them. Flip the order of the spans as appropriate
// based on the level, and call through to compute the spans for
// isolates at the proper point.
function emitSpans(line, from, to, level, baseLevel, isolates, order) {
    let ourType = level % 2 ? 2 /* T.R */ : 1 /* T.L */;
    if ((level % 2) == (baseLevel % 2)) { // Same dir as base direction, don't flip
        for (let iCh = from, iI = 0; iCh < to;) {
            // Scan a section of characters in direction ourType, unless
            // there's another type of char right after iCh, in which case
            // we scan a section of other characters (which, if ourType ==
            // T.L, may contain both T.R and T.AN chars).
            let sameDir = true, isNum = false;
            if (iI == isolates.length || iCh < isolates[iI].from) {
                let next = types[iCh];
                if (next != ourType) {
                    sameDir = false;
                    isNum = next == 16 /* T.AN */;
                }
            }
            // Holds an array of isolates to pass to a recursive call if we
            // must recurse (to distinguish T.AN inside an RTL section in
            // LTR text), null if we can emit directly
            let recurse = !sameDir && ourType == 1 /* T.L */ ? [] : null;
            let localLevel = sameDir ? level : level + 1;
            let iScan = iCh;
            run: for (;;) {
                if (iI < isolates.length && iScan == isolates[iI].from) {
                    if (isNum)
                        break run;
                    let iso = isolates[iI];
                    // Scan ahead to verify that there is another char in this dir after the isolate(s)
                    if (!sameDir)
                        for (let upto = iso.to, jI = iI + 1;;) {
                            if (upto == to)
                                break run;
                            if (jI < isolates.length && isolates[jI].from == upto)
                                upto = isolates[jI++].to;
                            else if (types[upto] == ourType)
                                break run;
                            else
                                break;
                        }
                    iI++;
                    if (recurse) {
                        recurse.push(iso);
                    }
                    else {
                        if (iso.from > iCh)
                            order.push(new BidiSpan(iCh, iso.from, localLevel));
                        let dirSwap = (iso.direction == LTR) != !(localLevel % 2);
                        computeSectionOrder(line, dirSwap ? level + 1 : level, baseLevel, iso.inner, iso.from, iso.to, order);
                        iCh = iso.to;
                    }
                    iScan = iso.to;
                }
                else if (iScan == to || (sameDir ? types[iScan] != ourType : types[iScan] == ourType)) {
                    break;
                }
                else {
                    iScan++;
                }
            }
            if (recurse)
                emitSpans(line, iCh, iScan, level + 1, baseLevel, recurse, order);
            else if (iCh < iScan)
                order.push(new BidiSpan(iCh, iScan, localLevel));
            iCh = iScan;
        }
    }
    else {
        // Iterate in reverse to flip the span order. Same code again, but
        // going from the back of the section to the front
        for (let iCh = to, iI = isolates.length; iCh > from;) {
            let sameDir = true, isNum = false;
            if (!iI || iCh > isolates[iI - 1].to) {
                let next = types[iCh - 1];
                if (next != ourType) {
                    sameDir = false;
                    isNum = next == 16 /* T.AN */;
                }
            }
            let recurse = !sameDir && ourType == 1 /* T.L */ ? [] : null;
            let localLevel = sameDir ? level : level + 1;
            let iScan = iCh;
            run: for (;;) {
                if (iI && iScan == isolates[iI - 1].to) {
                    if (isNum)
                        break run;
                    let iso = isolates[--iI];
                    // Scan ahead to verify that there is another char in this dir after the isolate(s)
                    if (!sameDir)
                        for (let upto = iso.from, jI = iI;;) {
                            if (upto == from)
                                break run;
                            if (jI && isolates[jI - 1].to == upto)
                                upto = isolates[--jI].from;
                            else if (types[upto - 1] == ourType)
                                break run;
                            else
                                break;
                        }
                    if (recurse) {
                        recurse.push(iso);
                    }
                    else {
                        if (iso.to < iCh)
                            order.push(new BidiSpan(iso.to, iCh, localLevel));
                        let dirSwap = (iso.direction == LTR) != !(localLevel % 2);
                        computeSectionOrder(line, dirSwap ? level + 1 : level, baseLevel, iso.inner, iso.from, iso.to, order);
                        iCh = iso.from;
                    }
                    iScan = iso.from;
                }
                else if (iScan == from || (sameDir ? types[iScan - 1] != ourType : types[iScan - 1] == ourType)) {
                    break;
                }
                else {
                    iScan--;
                }
            }
            if (recurse)
                emitSpans(line, iScan, iCh, level + 1, baseLevel, recurse, order);
            else if (iScan < iCh)
                order.push(new BidiSpan(iScan, iCh, localLevel));
            iCh = iScan;
        }
    }
}
function computeSectionOrder(line, level, baseLevel, isolates, from, to, order) {
    let outerType = (level % 2 ? 2 /* T.R */ : 1 /* T.L */);
    computeCharTypes(line, from, to, isolates, outerType);
    processBracketPairs(line, from, to, isolates, outerType);
    processNeutrals(from, to, isolates, outerType);
    emitSpans(line, from, to, level, baseLevel, isolates, order);
}
function computeOrder(line, direction, isolates) {
    if (!line)
        return [new BidiSpan(0, 0, direction == RTL ? 1 : 0)];
    if (direction == LTR && !isolates.length && !BidiRE.test(line))
        return trivialOrder(line.length);
    if (isolates.length)
        while (line.length > types.length)
            types[types.length] = 256 /* T.NI */; // Make sure types array has no gaps
    let order = [], level = direction == LTR ? 0 : 1;
    computeSectionOrder(line, level, level, isolates, 0, line.length, order);
    return order;
}
function trivialOrder(length) {
    return [new BidiSpan(0, length, 0)];
}
let movedOver = "";
// This implementation moves strictly visually, without concern for a
// traversal visiting every logical position in the string. It will
// still do so for simple input, but situations like multiple isolates
// with the same level next to each other, or text going against the
// main dir at the end of the line, will make some positions
// unreachable with this motion. Each visible cursor position will
// correspond to the lower-level bidi span that touches it.
//
// The alternative would be to solve an order globally for a given
// line, making sure that it includes every position, but that would
// require associating non-canonical (higher bidi span level)
// positions with a given visual position, which is likely to confuse
// people. (And would generally be a lot more complicated.)
function moveVisually(line, order, dir, start, forward) {
    var _a;
    let startIndex = start.head - line.from;
    let spanI = BidiSpan.find(order, startIndex, (_a = start.bidiLevel) !== null && _a !== void 0 ? _a : -1, start.assoc);
    let span = order[spanI], spanEnd = span.side(forward, dir);
    // End of span
    if (startIndex == spanEnd) {
        let nextI = spanI += forward ? 1 : -1;
        if (nextI < 0 || nextI >= order.length)
            return null;
        span = order[spanI = nextI];
        startIndex = span.side(!forward, dir);
        spanEnd = span.side(forward, dir);
    }
    let nextIndex = state.findClusterBreak(line.text, startIndex, span.forward(forward, dir));
    if (nextIndex < span.from || nextIndex > span.to)
        nextIndex = spanEnd;
    movedOver = line.text.slice(Math.min(startIndex, nextIndex), Math.max(startIndex, nextIndex));
    let nextSpan = spanI == (forward ? order.length - 1 : 0) ? null : order[spanI + (forward ? 1 : -1)];
    if (nextSpan && nextIndex == spanEnd && nextSpan.level + (forward ? 0 : 1) < span.level)
        return state.EditorSelection.cursor(nextSpan.side(!forward, dir) + line.from, nextSpan.forward(forward, dir) ? 1 : -1, nextSpan.level);
    return state.EditorSelection.cursor(nextIndex + line.from, span.forward(forward, dir) ? -1 : 1, span.level);
}
function autoDirection(text, from, to) {
    for (let i = from; i < to; i++) {
        let type = charType(text.charCodeAt(i));
        if (type == 1 /* T.L */)
            return LTR;
        if (type == 2 /* T.R */ || type == 4 /* T.AL */)
            return RTL;
    }
    return LTR;
}

const clickAddsSelectionRange = state.Facet.define();
const dragMovesSelection$1 = state.Facet.define();
const mouseSelectionStyle = state.Facet.define();
const exceptionSink = state.Facet.define();
const updateListener = state.Facet.define();
const inputHandler = state.Facet.define();
const focusChangeEffect = state.Facet.define();
const clipboardInputFilter = state.Facet.define();
const clipboardOutputFilter = state.Facet.define();
const perLineTextDirection = state.Facet.define({
    combine: values => values.some(x => x)
});
const nativeSelectionHidden = state.Facet.define({
    combine: values => values.some(x => x)
});
const scrollHandler = state.Facet.define();
class ScrollTarget {
    constructor(range, y = "nearest", x = "nearest", yMargin = 5, xMargin = 5, 
    // This data structure is abused to also store precise scroll
    // snapshots, instead of a `scrollIntoView` request. When this
    // flag is `true`, `range` points at a position in the reference
    // line, `yMargin` holds the difference between the top of that
    // line and the top of the editor, and `xMargin` holds the
    // editor's `scrollLeft`.
    isSnapshot = false) {
        this.range = range;
        this.y = y;
        this.x = x;
        this.yMargin = yMargin;
        this.xMargin = xMargin;
        this.isSnapshot = isSnapshot;
    }
    map(changes) {
        return changes.empty ? this :
            new ScrollTarget(this.range.map(changes), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
    }
    clip(state$1) {
        return this.range.to <= state$1.doc.length ? this :
            new ScrollTarget(state.EditorSelection.cursor(state$1.doc.length), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
    }
}
const scrollIntoView = state.StateEffect.define({ map: (t, ch) => t.map(ch) });
const setEditContextFormatting = state.StateEffect.define();
/**
Log or report an unhandled exception in client code. Should
probably only be used by extension code that allows client code to
provide functions, and calls those functions in a context where an
exception can't be propagated to calling code in a reasonable way
(for example when in an event handler).

Either calls a handler registered with
[`EditorView.exceptionSink`](https://codemirror.net/6/docs/ref/#view.EditorView^exceptionSink),
`window.onerror`, if defined, or `console.error` (in which case
it'll pass `context`, when given, as first argument).
*/
function logException(state, exception, context) {
    let handler = state.facet(exceptionSink);
    if (handler.length)
        handler[0](exception);
    else if (window.onerror && window.onerror(String(exception), context, undefined, undefined, exception)) ;
    else if (context)
        console.error(context + ":", exception);
    else
        console.error(exception);
}
const editable = state.Facet.define({ combine: values => values.length ? values[0] : true });
let nextPluginID = 0;
const viewPlugin = state.Facet.define({
    combine(plugins) {
        return plugins.filter((p, i) => {
            for (let j = 0; j < i; j++)
                if (plugins[j].plugin == p.plugin)
                    return false;
            return true;
        });
    }
});
/**
View plugins associate stateful values with a view. They can
influence the way the content is drawn, and are notified of things
that happen in the view. They optionally take an argument, in
which case you need to call [`of`](https://codemirror.net/6/docs/ref/#view.ViewPlugin.of) to create
an extension for the plugin. When the argument type is undefined,
you can use the plugin instance as an extension directly.
*/
class ViewPlugin {
    constructor(
    /**
    @internal
    */
    id, 
    /**
    @internal
    */
    create, 
    /**
    @internal
    */
    domEventHandlers, 
    /**
    @internal
    */
    domEventObservers, buildExtensions) {
        this.id = id;
        this.create = create;
        this.domEventHandlers = domEventHandlers;
        this.domEventObservers = domEventObservers;
        this.baseExtensions = buildExtensions(this);
        this.extension = this.baseExtensions.concat(viewPlugin.of({ plugin: this, arg: undefined }));
    }
    /**
    Create an extension for this plugin with the given argument.
    */
    of(arg) {
        return this.baseExtensions.concat(viewPlugin.of({ plugin: this, arg }));
    }
    /**
    Define a plugin from a constructor function that creates the
    plugin's value, given an editor view.
    */
    static define(create, spec) {
        const { eventHandlers, eventObservers, provide, decorations: deco } = spec || {};
        return new ViewPlugin(nextPluginID++, create, eventHandlers, eventObservers, plugin => {
            let ext = [];
            if (deco)
                ext.push(decorations.of(view => {
                    let pluginInst = view.plugin(plugin);
                    return pluginInst ? deco(pluginInst) : Decoration.none;
                }));
            if (provide)
                ext.push(provide(plugin));
            return ext;
        });
    }
    /**
    Create a plugin for a class whose constructor takes a single
    editor view as argument.
    */
    static fromClass(cls, spec) {
        return ViewPlugin.define((view, arg) => new cls(view, arg), spec);
    }
}
class PluginInstance {
    constructor(spec) {
        this.spec = spec;
        // When starting an update, all plugins have this field set to the
        // update object, indicating they need to be updated. When finished
        // updating, it is set to `null`. Retrieving a plugin that needs to
        // be updated with `view.plugin` forces an eager update.
        this.mustUpdate = null;
        // This is null when the plugin is initially created, but
        // initialized on the first update.
        this.value = null;
    }
    get plugin() { return this.spec && this.spec.plugin; }
    update(view) {
        if (!this.value) {
            if (this.spec) {
                try {
                    this.value = this.spec.plugin.create(view, this.spec.arg);
                }
                catch (e) {
                    logException(view.state, e, "CodeMirror plugin crashed");
                    this.deactivate();
                }
            }
        }
        else if (this.mustUpdate) {
            let update = this.mustUpdate;
            this.mustUpdate = null;
            if (this.value.update) {
                try {
                    this.value.update(update);
                }
                catch (e) {
                    logException(update.state, e, "CodeMirror plugin crashed");
                    if (this.value.destroy)
                        try {
                            this.value.destroy();
                        }
                        catch (_) { }
                    this.deactivate();
                }
            }
        }
        return this;
    }
    destroy(view) {
        var _a;
        if ((_a = this.value) === null || _a === void 0 ? void 0 : _a.destroy) {
            try {
                this.value.destroy();
            }
            catch (e) {
                logException(view.state, e, "CodeMirror plugin crashed");
            }
        }
    }
    deactivate() {
        this.spec = this.value = null;
    }
}
const editorAttributes = state.Facet.define();
const contentAttributes = state.Facet.define();
// Provide decorations
const decorations = state.Facet.define();
const blockWrappers = state.Facet.define();
const outerDecorations = state.Facet.define();
const atomicRanges = state.Facet.define();
const bidiIsolatedRanges = state.Facet.define();
function getIsolatedRanges(view, line) {
    let isolates = view.state.facet(bidiIsolatedRanges);
    if (!isolates.length)
        return isolates;
    let sets = isolates.map(i => i instanceof Function ? i(view) : i);
    let result = [];
    state.RangeSet.spans(sets, line.from, line.to, {
        point() { },
        span(fromDoc, toDoc, active, open) {
            let from = fromDoc - line.from, to = toDoc - line.from;
            let level = result;
            for (let i = active.length - 1; i >= 0; i--, open--) {
                let direction = active[i].spec.bidiIsolate, update;
                if (direction == null)
                    direction = autoDirection(line.text, from, to);
                if (open > 0 && level.length &&
                    (update = level[level.length - 1]).to == from && update.direction == direction) {
                    update.to = to;
                    level = update.inner;
                }
                else {
                    let add = { from, to, direction, inner: [] };
                    level.push(add);
                    level = add.inner;
                }
            }
        }
    });
    return result;
}
const scrollMargins = state.Facet.define();
function getScrollMargins(view) {
    let left = 0, right = 0, top = 0, bottom = 0;
    for (let source of view.state.facet(scrollMargins)) {
        let m = source(view);
        if (m) {
            if (m.left != null)
                left = Math.max(left, m.left);
            if (m.right != null)
                right = Math.max(right, m.right);
            if (m.top != null)
                top = Math.max(top, m.top);
            if (m.bottom != null)
                bottom = Math.max(bottom, m.bottom);
        }
    }
    return { left, right, top, bottom };
}
const styleModule = state.Facet.define();
class ChangedRange {
    constructor(fromA, toA, fromB, toB) {
        this.fromA = fromA;
        this.toA = toA;
        this.fromB = fromB;
        this.toB = toB;
    }
    join(other) {
        return new ChangedRange(Math.min(this.fromA, other.fromA), Math.max(this.toA, other.toA), Math.min(this.fromB, other.fromB), Math.max(this.toB, other.toB));
    }
    addToSet(set) {
        let i = set.length, me = this;
        for (; i > 0; i--) {
            let range = set[i - 1];
            if (range.fromA > me.toA)
                continue;
            if (range.toA < me.fromA)
                break;
            me = me.join(range);
            set.splice(i - 1, 1);
        }
        set.splice(i, 0, me);
        return set;
    }
    // Extend a set to cover all the content in `ranges`, which is a
    // flat array with each pair of numbers representing fromB/toB
    // positions. These pairs are generated in unchanged ranges, so the
    // offset between doc A and doc B is the same for their start and
    // end points.
    static extendWithRanges(diff, ranges) {
        if (ranges.length == 0)
            return diff;
        let result = [];
        for (let dI = 0, rI = 0, off = 0;;) {
            let nextD = dI < diff.length ? diff[dI].fromB : 1e9;
            let nextR = rI < ranges.length ? ranges[rI] : 1e9;
            let fromB = Math.min(nextD, nextR);
            if (fromB == 1e9)
                break;
            let fromA = fromB + off, toB = fromB, toA = fromA;
            for (;;) {
                if (rI < ranges.length && ranges[rI] <= toB) {
                    let end = ranges[rI + 1];
                    rI += 2;
                    toB = Math.max(toB, end);
                    for (let i = dI; i < diff.length && diff[i].fromB <= toB; i++)
                        off = diff[i].toA - diff[i].toB;
                    toA = Math.max(toA, end + off);
                }
                else if (dI < diff.length && diff[dI].fromB <= toB) {
                    let next = diff[dI++];
                    toB = Math.max(toB, next.toB);
                    toA = Math.max(toA, next.toA);
                    off = next.toA - next.toB;
                }
                else {
                    break;
                }
            }
            result.push(new ChangedRange(fromA, toA, fromB, toB));
        }
        return result;
    }
}
/**
View [plugins](https://codemirror.net/6/docs/ref/#view.ViewPlugin) are given instances of this
class, which describe what happened, whenever the view is updated.
*/
class ViewUpdate {
    constructor(
    /**
    The editor view that the update is associated with.
    */
    view, 
    /**
    The new editor state.
    */
    state$1, 
    /**
    The transactions involved in the update. May be empty.
    */
    transactions) {
        this.view = view;
        this.state = state$1;
        this.transactions = transactions;
        /**
        @internal
        */
        this.flags = 0;
        this.startState = view.state;
        this.changes = state.ChangeSet.empty(this.startState.doc.length);
        for (let tr of transactions)
            this.changes = this.changes.compose(tr.changes);
        let changedRanges = [];
        this.changes.iterChangedRanges((fromA, toA, fromB, toB) => changedRanges.push(new ChangedRange(fromA, toA, fromB, toB)));
        this.changedRanges = changedRanges;
    }
    /**
    @internal
    */
    static create(view, state, transactions) {
        return new ViewUpdate(view, state, transactions);
    }
    /**
    Tells you whether the [viewport](https://codemirror.net/6/docs/ref/#view.EditorView.viewport) or
    [visible ranges](https://codemirror.net/6/docs/ref/#view.EditorView.visibleRanges) changed in this
    update.
    */
    get viewportChanged() {
        return (this.flags & 4 /* UpdateFlag.Viewport */) > 0;
    }
    /**
    Returns true when
    [`viewportChanged`](https://codemirror.net/6/docs/ref/#view.ViewUpdate.viewportChanged) is true
    and the viewport change is not just the result of mapping it in
    response to document changes.
    */
    get viewportMoved() {
        return (this.flags & 8 /* UpdateFlag.ViewportMoved */) > 0;
    }
    /**
    Indicates whether the height of a block element in the editor
    changed in this update.
    */
    get heightChanged() {
        return (this.flags & 2 /* UpdateFlag.Height */) > 0;
    }
    /**
    Returns true when the document was modified or the size of the
    editor, or elements within the editor, changed.
    */
    get geometryChanged() {
        return this.docChanged || (this.flags & (16 /* UpdateFlag.Geometry */ | 2 /* UpdateFlag.Height */)) > 0;
    }
    /**
    True when this update indicates a focus change.
    */
    get focusChanged() {
        return (this.flags & 1 /* UpdateFlag.Focus */) > 0;
    }
    /**
    Whether the document changed in this update.
    */
    get docChanged() {
        return !this.changes.empty;
    }
    /**
    Whether the selection was explicitly set in this update.
    */
    get selectionSet() {
        return this.transactions.some(tr => tr.selection);
    }
    /**
    @internal
    */
    get empty() { return this.flags == 0 && this.transactions.length == 0; }
}

const noChildren = [];
class Tile {
    constructor(dom, length, flags = 0) {
        this.dom = dom;
        this.length = length;
        this.flags = flags;
        this.parent = null;
        dom.cmTile = this;
    }
    get breakAfter() { return (this.flags & 1 /* TileFlag.BreakAfter */); }
    get children() { return noChildren; }
    isWidget() { return false; }
    get isHidden() { return false; }
    isComposite() { return false; }
    isLine() { return false; }
    isText() { return false; }
    isBlock() { return false; }
    get domAttrs() { return null; }
    sync(track) {
        this.flags |= 2 /* TileFlag.Synced */;
        if (this.flags & 4 /* TileFlag.AttrsDirty */) {
            this.flags &= ~4 /* TileFlag.AttrsDirty */;
            let attrs = this.domAttrs;
            if (attrs)
                setAttrs(this.dom, attrs);
        }
    }
    toString() {
        return this.constructor.name + (this.children.length ? `(${this.children})` : "") + (this.breakAfter ? "#" : "");
    }
    destroy() { this.parent = null; }
    setDOM(dom) {
        this.dom = dom;
        dom.cmTile = this;
    }
    get posAtStart() {
        return this.parent ? this.parent.posBefore(this) : 0;
    }
    get posAtEnd() {
        return this.posAtStart + this.length;
    }
    posBefore(tile, start = this.posAtStart) {
        let pos = start;
        for (let child of this.children) {
            if (child == tile)
                return pos;
            pos += child.length + child.breakAfter;
        }
        throw new RangeError("Invalid child in posBefore");
    }
    posAfter(tile) {
        return this.posBefore(tile) + tile.length;
    }
    covers(side) { return true; }
    coordsIn(pos, side) { return null; }
    domPosFor(off, side) {
        let index = domIndex(this.dom);
        let after = this.length ? off > 0 : side > 0;
        return new DOMPos(this.parent.dom, index + (after ? 1 : 0), off == 0 || off == this.length);
    }
    markDirty(attrs) {
        this.flags &= ~2 /* TileFlag.Synced */;
        if (attrs)
            this.flags |= 4 /* TileFlag.AttrsDirty */;
        if (this.parent && (this.parent.flags & 2 /* TileFlag.Synced */))
            this.parent.markDirty(false);
    }
    get overrideDOMText() { return null; }
    get root() {
        for (let t = this; t; t = t.parent)
            if (t instanceof DocTile)
                return t;
        return null;
    }
    static get(dom) {
        return dom.cmTile;
    }
}
class CompositeTile extends Tile {
    constructor(dom) {
        super(dom, 0);
        this._children = [];
    }
    isComposite() { return true; }
    get children() { return this._children; }
    get lastChild() { return this.children.length ? this.children[this.children.length - 1] : null; }
    append(child) {
        this.children.push(child);
        child.parent = this;
    }
    sync(track) {
        if (this.flags & 2 /* TileFlag.Synced */)
            return;
        super.sync(track);
        let parent = this.dom, prev = null, next;
        let tracking = (track === null || track === void 0 ? void 0 : track.node) == parent ? track : null;
        let length = 0;
        for (let child of this.children) {
            child.sync(track);
            length += child.length + child.breakAfter;
            next = prev ? prev.nextSibling : parent.firstChild;
            if (tracking && next != child.dom)
                tracking.written = true;
            if (child.dom.parentNode == parent) {
                while (next && next != child.dom)
                    next = rm$1(next);
            }
            else {
                parent.insertBefore(child.dom, next);
            }
            prev = child.dom;
        }
        next = prev ? prev.nextSibling : parent.firstChild;
        if (tracking && next)
            tracking.written = true;
        while (next)
            next = rm$1(next);
        this.length = length;
    }
}
// Remove a DOM node and return its next sibling.
function rm$1(dom) {
    let next = dom.nextSibling;
    dom.parentNode.removeChild(dom);
    return next;
}
// The top-level tile. Its dom property equals view.contentDOM.
class DocTile extends CompositeTile {
    constructor(view, dom) {
        super(dom);
        this.view = view;
    }
    owns(tile) {
        for (; tile; tile = tile.parent)
            if (tile == this)
                return true;
        return false;
    }
    isBlock() { return true; }
    nearest(dom) {
        for (;;) {
            if (!dom)
                return null;
            let tile = Tile.get(dom);
            if (tile && this.owns(tile))
                return tile;
            dom = dom.parentNode;
        }
    }
    blockTiles(f) {
        for (let stack = [], cur = this, i = 0, pos = 0;;) {
            if (i == cur.children.length) {
                if (!stack.length)
                    return;
                cur = cur.parent;
                if (cur.breakAfter)
                    pos++;
                i = stack.pop();
            }
            else {
                let next = cur.children[i++];
                if (next instanceof BlockWrapperTile) {
                    stack.push(i);
                    cur = next;
                    i = 0;
                }
                else {
                    let end = pos + next.length;
                    let result = f(next, pos);
                    if (result !== undefined)
                        return result;
                    pos = end + next.breakAfter;
                }
            }
        }
    }
    // Find the block at the given position. If side < -1, make sure to
    // stay before block widgets at that position, if side > 1, after
    // such widgets (used for selection drawing, which needs to be able
    // to get coordinates for positions that aren't valid cursor positions).
    resolveBlock(pos, side) {
        let before, beforeOff = -1, after, afterOff = -1;
        this.blockTiles((tile, off) => {
            let end = off + tile.length;
            if (pos >= off && pos <= end) {
                if (tile.isWidget() && side >= -1 && side <= 1) {
                    if (tile.flags & 32 /* TileFlag.After */)
                        return true;
                    if (tile.flags & 16 /* TileFlag.Before */)
                        before = undefined;
                }
                if ((off < pos || pos == end && (side < -1 ? tile.length : tile.covers(1))) &&
                    (!before || !tile.isWidget() && before.isWidget())) {
                    before = tile;
                    beforeOff = pos - off;
                }
                if ((end > pos || pos == off && (side > 1 ? tile.length : tile.covers(-1))) &&
                    (!after || !tile.isWidget() && after.isWidget())) {
                    after = tile;
                    afterOff = pos - off;
                }
            }
        });
        if (!before && !after)
            throw new Error("No tile at position " + pos);
        return before && side < 0 || !after ? { tile: before, offset: beforeOff } : { tile: after, offset: afterOff };
    }
}
class BlockWrapperTile extends CompositeTile {
    constructor(dom, wrapper) {
        super(dom);
        this.wrapper = wrapper;
    }
    isBlock() { return true; }
    covers(side) {
        if (!this.children.length)
            return false;
        return side < 0 ? this.children[0].covers(-1) : this.lastChild.covers(1);
    }
    get domAttrs() { return this.wrapper.attributes; }
    static of(wrapper, dom) {
        let tile = new BlockWrapperTile(dom || document.createElement(wrapper.tagName), wrapper);
        if (!dom)
            tile.flags |= 4 /* TileFlag.AttrsDirty */;
        return tile;
    }
}
class LineTile extends CompositeTile {
    constructor(dom, attrs) {
        super(dom);
        this.attrs = attrs;
    }
    isLine() { return true; }
    static start(attrs, dom, keepAttrs) {
        let line = new LineTile(dom || document.createElement("div"), attrs);
        if (!dom || !keepAttrs)
            line.flags |= 4 /* TileFlag.AttrsDirty */;
        return line;
    }
    get domAttrs() { return this.attrs; }
    // Find the tile associated with a given position in this line.
    resolveInline(pos, side, forCoords) {
        let before = null, beforeOff = -1, after = null, afterOff = -1;
        function scan(tile, pos) {
            for (let i = 0, off = 0; i < tile.children.length && off <= pos; i++) {
                let child = tile.children[i], end = off + child.length;
                if (end >= pos) {
                    if (child.isComposite()) {
                        scan(child, pos - off);
                    }
                    else if ((!after || after.isHidden && (side > 0 || forCoords && onSameLine(after, child))) &&
                        (end > pos || (child.flags & 32 /* TileFlag.After */))) {
                        after = child;
                        afterOff = pos - off;
                    }
                    else if (off < pos || (child.flags & 16 /* TileFlag.Before */) && !child.isHidden) {
                        before = child;
                        beforeOff = pos - off;
                    }
                }
                off = end;
            }
        }
        scan(this, pos);
        let target = ((side < 0 ? before : after) || before || after);
        return target ? { tile: target, offset: target == before ? beforeOff : afterOff } : null;
    }
    coordsIn(pos, side) {
        let found = this.resolveInline(pos, side, true);
        if (!found)
            return fallbackRect(this);
        return found.tile.coordsIn(Math.max(0, found.offset), side);
    }
    domIn(pos, side) {
        let found = this.resolveInline(pos, side);
        if (found) {
            let { tile, offset } = found;
            if (this.dom.contains(tile.dom)) {
                if (tile.isText())
                    return new DOMPos(tile.dom, Math.min(tile.dom.nodeValue.length, offset));
                return tile.domPosFor(offset, tile.flags & 16 /* TileFlag.Before */ ? 1 : tile.flags & 32 /* TileFlag.After */ ? -1 : side);
            }
            let parent = found.tile.parent, saw = false;
            for (let ch of parent.children) {
                if (saw)
                    return new DOMPos(ch.dom, 0);
                if (ch == found.tile) {
                    saw = true;
                }
            }
        }
        return new DOMPos(this.dom, 0);
    }
}
function fallbackRect(tile) {
    let last = tile.dom.lastChild;
    if (!last)
        return tile.dom.getBoundingClientRect();
    let rects = clientRectsFor(last);
    return rects[rects.length - 1] || null;
}
function onSameLine(a, b) {
    let posA = a.coordsIn(0, 1), posB = b.coordsIn(0, 1);
    return posA && posB && posB.top < posA.bottom;
}
class MarkTile extends CompositeTile {
    constructor(dom, mark) {
        super(dom);
        this.mark = mark;
    }
    get domAttrs() { return this.mark.attrs; }
    static of(mark, dom) {
        let tile = new MarkTile(dom || document.createElement(mark.tagName), mark);
        if (!dom)
            tile.flags |= 4 /* TileFlag.AttrsDirty */;
        return tile;
    }
}
class TextTile extends Tile {
    constructor(dom, text) {
        super(dom, text.length);
        this.text = text;
    }
    sync(track) {
        if (this.flags & 2 /* TileFlag.Synced */)
            return;
        super.sync(track);
        if (this.dom.nodeValue != this.text) {
            if (track && track.node == this.dom)
                track.written = true;
            this.dom.nodeValue = this.text;
        }
    }
    isText() { return true; }
    toString() { return JSON.stringify(this.text); }
    coordsIn(pos, side) {
        let length = this.dom.nodeValue.length;
        if (pos > length)
            pos = length;
        let from = pos, to = pos, flatten = 0;
        if (pos == 0 && side < 0 || pos == length && side >= 0) {
            if (!(browser.chrome || browser.gecko)) { // These browsers reliably return valid rectangles for empty ranges
                if (pos) {
                    from--;
                    flatten = 1;
                } // FIXME this is wrong in RTL text
                else if (to < length) {
                    to++;
                    flatten = -1;
                }
            }
        }
        else {
            if (side < 0)
                from--;
            else if (to < length)
                to++;
        }
        let rects = textRange(this.dom, from, to).getClientRects();
        if (!rects.length)
            return null;
        let rect = rects[(flatten ? flatten < 0 : side >= 0) ? 0 : rects.length - 1];
        if (browser.safari && !flatten && rect.width == 0)
            rect = Array.prototype.find.call(rects, r => r.width) || rect;
        return flatten ? flattenRect(rect, flatten < 0) : rect || null;
    }
    static of(text, dom) {
        let tile = new TextTile(dom || document.createTextNode(text), text);
        if (!dom)
            tile.flags |= 2 /* TileFlag.Synced */;
        return tile;
    }
}
class WidgetTile extends Tile {
    constructor(dom, length, widget, flags) {
        super(dom, length, flags);
        this.widget = widget;
    }
    isWidget() { return true; }
    get isHidden() { return this.widget.isHidden; }
    covers(side) {
        if (this.flags & 48 /* TileFlag.PointWidget */)
            return false;
        return (this.flags & (side < 0 ? 64 /* TileFlag.IncStart */ : 128 /* TileFlag.IncEnd */)) > 0;
    }
    coordsIn(pos, side) { return this.coordsInWidget(pos, side, false); }
    coordsInWidget(pos, side, block) {
        let custom = this.widget.coordsAt(this.dom, pos, side);
        if (custom)
            return custom;
        if (block) {
            return flattenRect(this.dom.getBoundingClientRect(), this.length ? pos == 0 : side <= 0);
        }
        else {
            let rects = this.dom.getClientRects(), rect = null;
            if (!rects.length)
                return null;
            let fromBack = (this.flags & 16 /* TileFlag.Before */) ? true : (this.flags & 32 /* TileFlag.After */) ? false : pos > 0;
            for (let i = fromBack ? rects.length - 1 : 0;; i += (fromBack ? -1 : 1)) {
                rect = rects[i];
                if (pos > 0 ? i == 0 : i == rects.length - 1 || rect.top < rect.bottom)
                    break;
            }
            return flattenRect(rect, !fromBack);
        }
    }
    get overrideDOMText() {
        if (!this.length)
            return state.Text.empty;
        let { root } = this;
        if (!root)
            return state.Text.empty;
        let start = this.posAtStart;
        return root.view.state.doc.slice(start, start + this.length);
    }
    destroy() {
        super.destroy();
        this.widget.destroy(this.dom);
    }
    static of(widget, view, length, flags, dom) {
        if (!dom) {
            dom = widget.toDOM(view);
            if (!widget.editable)
                dom.contentEditable = "false";
        }
        return new WidgetTile(dom, length, widget, flags);
    }
}
// These are drawn around uneditable widgets to avoid a number of
// browser bugs that show up when the cursor is directly next to
// uneditable inline content.
class WidgetBufferTile extends Tile {
    constructor(flags) {
        let img = document.createElement("img");
        img.className = "cm-widgetBuffer";
        img.setAttribute("aria-hidden", "true");
        super(img, 0, flags);
    }
    get isHidden() { return true; }
    get overrideDOMText() { return state.Text.empty; }
    coordsIn(pos) { return this.dom.getBoundingClientRect(); }
}
// Represents a position in the tile tree.
class TilePointer {
    constructor(top) {
        this.index = 0;
        this.beforeBreak = false;
        this.parents = [];
        this.tile = top;
    }
    // Advance by the given distance. If side is -1, stop leaving or
    // entering tiles, or skipping zero-length tiles, once the distance
    // has been traversed. When side is 1, leave, enter, or skip
    // everything at the end position.
    advance(dist, side, walker) {
        let { tile, index, beforeBreak, parents } = this;
        while (dist || side > 0) {
            if (!tile.isComposite()) {
                if (index == tile.length) {
                    beforeBreak = !!tile.breakAfter;
                    ({ tile, index } = parents.pop());
                    index++;
                }
                else if (!dist) {
                    break;
                }
                else {
                    let take = Math.min(dist, tile.length - index);
                    if (walker)
                        walker.skip(tile, index, index + take);
                    dist -= take;
                    index += take;
                }
            }
            else if (beforeBreak) {
                if (!dist)
                    break;
                if (walker)
                    walker.break();
                dist--;
                beforeBreak = false;
            }
            else if (index == tile.children.length) {
                if (!dist && !parents.length)
                    break;
                if (walker)
                    walker.leave(tile);
                beforeBreak = !!tile.breakAfter;
                ({ tile, index } = parents.pop());
                index++;
            }
            else {
                let next = tile.children[index], brk = next.breakAfter;
                if ((side > 0 ? next.length <= dist : next.length < dist) &&
                    (!walker || walker.skip(next, 0, next.length) !== false || !next.isComposite)) {
                    beforeBreak = !!brk;
                    index++;
                    dist -= next.length;
                }
                else {
                    parents.push({ tile, index });
                    tile = next;
                    index = 0;
                    if (walker && next.isComposite())
                        walker.enter(next);
                }
            }
        }
        this.tile = tile;
        this.index = index;
        this.beforeBreak = beforeBreak;
        return this;
    }
    get root() { return (this.parents.length ? this.parents[0].tile : this.tile); }
}

// Used to track open block wrappers
class OpenWrapper {
    constructor(from, to, wrapper, rank) {
        this.from = from;
        this.to = to;
        this.wrapper = wrapper;
        this.rank = rank;
    }
}
// This class builds up a new document tile using input from either
// iteration over the old tree or iteration over the document +
// decorations. The add* methods emit elements into the tile
// structure. To avoid awkward synchronization issues, marks and block
// wrappers are treated as belonging to to their content, rather than
// opened/closed independently.
//
// All composite tiles that are touched by changes are rebuilt,
// reusing as much of the old tree (either whole nodes or just DOM
// elements) as possible. The new tree is built without the Synced
// flag, and then synced (during which DOM parent/child relations are
// fixed up, text nodes filled in, and attributes added) in a second
// phase.
class TileBuilder {
    constructor(cache, root, blockWrappers) {
        this.cache = cache;
        this.root = root;
        this.blockWrappers = blockWrappers;
        this.curLine = null;
        this.lastBlock = null;
        this.afterWidget = null;
        this.pos = 0;
        this.wrappers = [];
        this.wrapperPos = 0;
    }
    addText(text, marks, openStart, tile) {
        var _a;
        this.flushBuffer();
        let parent = this.ensureMarks(marks, openStart);
        let prev = parent.lastChild;
        if (prev && prev.isText() && !(prev.flags & 8 /* TileFlag.Composition */)) {
            this.cache.reused.set(prev, 2 /* Reused.DOM */);
            let tile = parent.children[parent.children.length - 1] = new TextTile(prev.dom, prev.text + text);
            tile.parent = parent;
        }
        else {
            parent.append(tile || TextTile.of(text, (_a = this.cache.find(TextTile)) === null || _a === void 0 ? void 0 : _a.dom));
        }
        this.pos += text.length;
        this.afterWidget = null;
    }
    addComposition(composition, context) {
        let line = this.curLine;
        if (line.dom != context.line.dom) {
            line.setDOM(this.cache.reused.has(context.line) ? freeNode(context.line.dom) : context.line.dom);
            this.cache.reused.set(context.line, 2 /* Reused.DOM */);
        }
        let head = line;
        for (let i = context.marks.length - 1; i >= 0; i--) {
            let mark = context.marks[i];
            let last = head.lastChild;
            if (last instanceof MarkTile && last.mark.eq(mark.mark)) {
                if (last.dom != mark.dom)
                    last.setDOM(freeNode(mark.dom));
                head = last;
            }
            else {
                if (this.cache.reused.get(mark)) {
                    let tile = Tile.get(mark.dom);
                    if (tile)
                        tile.setDOM(freeNode(mark.dom));
                }
                let nw = MarkTile.of(mark.mark, mark.dom);
                head.append(nw);
                head = nw;
            }
            this.cache.reused.set(mark, 2 /* Reused.DOM */);
        }
        let oldTile = Tile.get(composition.text);
        if (oldTile)
            this.cache.reused.set(oldTile, 2 /* Reused.DOM */);
        let text = new TextTile(composition.text, composition.text.nodeValue);
        text.flags |= 8 /* TileFlag.Composition */;
        head.append(text);
    }
    addInlineWidget(widget, marks, openStart) {
        // Adjacent same-side-facing non-replacing widgets don't need buffers between them
        let noSpace = this.afterWidget && (widget.flags & 48 /* TileFlag.PointWidget */) &&
            (this.afterWidget.flags & 48 /* TileFlag.PointWidget */) == (widget.flags & 48 /* TileFlag.PointWidget */);
        if (!noSpace)
            this.flushBuffer();
        let parent = this.ensureMarks(marks, openStart);
        if (!noSpace && !(widget.flags & 16 /* TileFlag.Before */))
            parent.append(this.getBuffer(1));
        parent.append(widget);
        this.pos += widget.length;
        this.afterWidget = widget;
    }
    addMark(tile, marks, openStart) {
        this.flushBuffer();
        let parent = this.ensureMarks(marks, openStart);
        parent.append(tile);
        this.pos += tile.length;
        this.afterWidget = null;
    }
    addBlockWidget(widget) {
        this.getBlockPos().append(widget);
        this.pos += widget.length;
        this.lastBlock = widget;
        this.endLine();
    }
    continueWidget(length) {
        let widget = this.afterWidget || this.lastBlock;
        widget.length += length;
        this.pos += length;
    }
    addLineStart(attrs, dom) {
        var _a;
        if (!attrs)
            attrs = lineBaseAttrs;
        let tile = LineTile.start(attrs, dom || ((_a = this.cache.find(LineTile)) === null || _a === void 0 ? void 0 : _a.dom), !!dom);
        this.getBlockPos().append(this.lastBlock = this.curLine = tile);
    }
    addLine(tile) {
        this.getBlockPos().append(tile);
        this.pos += tile.length;
        this.lastBlock = tile;
        this.endLine();
    }
    addBreak() {
        this.lastBlock.flags |= 1 /* TileFlag.BreakAfter */;
        this.endLine();
        this.pos++;
    }
    addLineStartIfNotCovered(attrs) {
        if (!this.blockPosCovered())
            this.addLineStart(attrs);
    }
    ensureLine(attrs) {
        if (!this.curLine)
            this.addLineStart(attrs);
    }
    ensureMarks(marks, openStart) {
        var _a;
        let parent = this.curLine;
        for (let i = marks.length - 1; i >= 0; i--) {
            let mark = marks[i], last;
            if (openStart > 0 && (last = parent.lastChild) && last instanceof MarkTile && last.mark.eq(mark)) {
                parent = last;
                openStart--;
            }
            else {
                let tile = MarkTile.of(mark, (_a = this.cache.find(MarkTile, m => m.mark.eq(mark))) === null || _a === void 0 ? void 0 : _a.dom);
                parent.append(tile);
                parent = tile;
                openStart = 0;
            }
        }
        return parent;
    }
    endLine() {
        if (this.curLine) {
            this.flushBuffer();
            let last = this.curLine.lastChild;
            if (!last || !hasContent(this.curLine, false) ||
                last.dom.nodeName != "BR" && last.isWidget() && !(browser.ios && hasContent(this.curLine, true)))
                this.curLine.append(this.cache.findWidget(BreakWidget, 0, 32 /* TileFlag.After */) ||
                    new WidgetTile(BreakWidget.toDOM(), 0, BreakWidget, 32 /* TileFlag.After */));
            this.curLine = this.afterWidget = null;
        }
    }
    updateBlockWrappers() {
        if (this.wrapperPos > this.pos + 10000 /* C.WrapperReset */) {
            this.blockWrappers.goto(this.pos);
            this.wrappers.length = 0;
        }
        for (let i = this.wrappers.length - 1; i >= 0; i--)
            if (this.wrappers[i].to < this.pos)
                this.wrappers.splice(i, 1);
        for (let cur = this.blockWrappers; cur.value && cur.from <= this.pos; cur.next())
            if (cur.to >= this.pos) {
                let wrap = new OpenWrapper(cur.from, cur.to, cur.value, cur.rank), i = this.wrappers.length;
                while (i > 0 && (this.wrappers[i - 1].rank - wrap.rank || this.wrappers[i - 1].to - wrap.to) < 0)
                    i--;
                this.wrappers.splice(i, 0, wrap);
            }
        this.wrapperPos = this.pos;
    }
    getBlockPos() {
        var _a;
        this.updateBlockWrappers();
        let parent = this.root;
        for (let wrap of this.wrappers) {
            let last = parent.lastChild;
            if (wrap.from < this.pos && last instanceof BlockWrapperTile && last.wrapper.eq(wrap.wrapper)) {
                parent = last;
            }
            else {
                let tile = BlockWrapperTile.of(wrap.wrapper, (_a = this.cache.find(BlockWrapperTile, t => t.wrapper.eq(wrap.wrapper))) === null || _a === void 0 ? void 0 : _a.dom);
                parent.append(tile);
                parent = tile;
            }
        }
        return parent;
    }
    blockPosCovered() {
        let last = this.lastBlock;
        return last != null && !last.breakAfter && (!last.isWidget() || (last.flags & (32 /* TileFlag.After */ | 128 /* TileFlag.IncEnd */)) > 0);
    }
    getBuffer(side) {
        let flags = 2 /* TileFlag.Synced */ | (side < 0 ? 16 /* TileFlag.Before */ : 32 /* TileFlag.After */);
        let found = this.cache.find(WidgetBufferTile, undefined, 1 /* Reused.Full */);
        if (found)
            found.flags = flags;
        return found || new WidgetBufferTile(flags);
    }
    flushBuffer() {
        if (this.afterWidget && !(this.afterWidget.flags & 32 /* TileFlag.After */)) {
            this.afterWidget.parent.append(this.getBuffer(-1));
            this.afterWidget = null;
        }
    }
}
// Helps getting efficient access to the document text.
class TextStream {
    constructor(doc) {
        this.skipCount = 0;
        this.text = "";
        this.textOff = 0;
        this.cursor = doc.iter();
    }
    skip(len) {
        // Advance the iterator past the replaced content
        if (this.textOff + len <= this.text.length) {
            this.textOff += len;
        }
        else {
            this.skipCount += len - (this.text.length - this.textOff);
            this.text = "";
            this.textOff = 0;
        }
    }
    next(maxLen) {
        if (this.textOff == this.text.length) {
            let { value, lineBreak, done } = this.cursor.next(this.skipCount);
            this.skipCount = 0;
            if (done)
                throw new Error("Ran out of text content when drawing inline views");
            this.text = value;
            let len = this.textOff = Math.min(maxLen, value.length);
            return lineBreak ? null : value.slice(0, len);
        }
        let end = Math.min(this.text.length, this.textOff + maxLen);
        let chars = this.text.slice(this.textOff, end);
        this.textOff = end;
        return chars;
    }
}
// Assign the tile classes bucket numbers for caching.
const buckets = [WidgetTile, LineTile, TextTile, MarkTile, WidgetBufferTile, BlockWrapperTile, DocTile];
for (let i = 0; i < buckets.length; i++)
    buckets[i].bucket = i;
// Leaf tiles and line tiles may be reused in their entirety. All
// others will get new tiles allocated, using the old DOM when
// possible.
class TileCache {
    constructor(view) {
        this.view = view;
        // Buckets are circular buffers, using `index` as the current
        // position.
        this.buckets = buckets.map(() => []);
        this.index = buckets.map(() => 0);
        this.reused = new Map;
    }
    // Put a tile in the cache.
    add(tile) {
        let i = tile.constructor.bucket, bucket = this.buckets[i];
        if (bucket.length < 6 /* C.Bucket */)
            bucket.push(tile);
        else
            bucket[this.index[i] = (this.index[i] + 1) % 6 /* C.Bucket */] = tile;
    }
    find(cls, test, type = 2 /* Reused.DOM */) {
        let i = cls.bucket;
        let bucket = this.buckets[i], off = this.index[i];
        for (let j = bucket.length - 1; j >= 0; j--) {
            // Look at the most recently added items first (last-in, first-out)
            let index = (j + off) % bucket.length, tile = bucket[index];
            if ((!test || test(tile)) && !this.reused.has(tile)) {
                bucket.splice(index, 1);
                if (index < off)
                    this.index[i]--;
                this.reused.set(tile, type);
                return tile;
            }
        }
        return null;
    }
    findWidget(widget, length, flags) {
        let widgets = this.buckets[0];
        if (widgets.length)
            for (let i = 0, pass = 0;; i++) {
                if (i == widgets.length) {
                    if (pass)
                        return null;
                    pass = 1;
                    i = 0;
                }
                let tile = widgets[i];
                if (!this.reused.has(tile) &&
                    (pass == 0 ? tile.widget.compare(widget)
                        : tile.widget.constructor == widget.constructor && widget.updateDOM(tile.dom, this.view))) {
                    widgets.splice(i, 1);
                    if (i < this.index[0])
                        this.index[0]--;
                    if (tile.length == length && (tile.flags & (496 /* TileFlag.Widget */ | 1 /* TileFlag.BreakAfter */)) == flags) {
                        this.reused.set(tile, 1 /* Reused.Full */);
                        return tile;
                    }
                    else {
                        this.reused.set(tile, 2 /* Reused.DOM */);
                        return new WidgetTile(tile.dom, length, widget, (tile.flags & ~(496 /* TileFlag.Widget */ | 1 /* TileFlag.BreakAfter */)) | flags);
                    }
                }
            }
    }
    reuse(tile) {
        this.reused.set(tile, 1 /* Reused.Full */);
        return tile;
    }
    maybeReuse(tile, type = 2 /* Reused.DOM */) {
        if (this.reused.has(tile))
            return undefined;
        this.reused.set(tile, type);
        return tile.dom;
    }
}
// This class organizes a pass over the document, guided by the array
// of replaced ranges. For ranges that haven't changed, it iterates
// the old tree and copies its content into the new document. For
// changed ranges, it runs a decoration iterator to guide generation
// of content.
class TileUpdate {
    constructor(view, old, blockWrappers, decorations, disallowBlockEffectsFor) {
        this.view = view;
        this.decorations = decorations;
        this.disallowBlockEffectsFor = disallowBlockEffectsFor;
        this.openWidget = false;
        this.openMarks = 0;
        this.cache = new TileCache(view);
        this.text = new TextStream(view.state.doc);
        this.builder = new TileBuilder(this.cache, new DocTile(view, view.contentDOM), state.RangeSet.iter(blockWrappers));
        this.cache.reused.set(old, 2 /* Reused.DOM */);
        this.old = new TilePointer(old);
        this.reuseWalker = {
            skip: (tile, from, to) => {
                this.cache.add(tile);
                if (tile.isComposite())
                    return false;
            },
            enter: tile => this.cache.add(tile),
            leave: () => { },
            break: () => { }
        };
    }
    run(changes, composition) {
        let compositionContext = composition && this.getCompositionContext(composition.text);
        for (let posA = 0, posB = 0, i = 0;;) {
            let next = i < changes.length ? changes[i++] : null;
            let skipA = next ? next.fromA : this.old.root.length;
            if (skipA > posA) {
                let len = skipA - posA;
                this.preserve(len, !i, !next);
                posA = skipA;
                posB += len;
            }
            if (!next)
                break;
            this.forward(next.fromA, next.toA);
            // Compositions need to be handled specially, forcing the
            // focused text node and its parent nodes to remain stable at
            // that point in the document.
            if (composition && next.fromA <= composition.range.fromA && next.toA >= composition.range.toA) {
                this.emit(posB, composition.range.fromB);
                this.builder.addComposition(composition, compositionContext);
                this.text.skip(composition.range.toB - composition.range.fromB);
                this.emit(composition.range.toB, next.toB);
            }
            else {
                this.emit(posB, next.toB);
            }
            posB = next.toB;
            posA = next.toA;
        }
        if (this.builder.curLine)
            this.builder.endLine();
        return this.builder.root;
    }
    preserve(length, incStart, incEnd) {
        let activeMarks = getMarks(this.old), openMarks = this.openMarks;
        this.old.advance(length, incEnd ? 1 : -1, {
            skip: (tile, from, to) => {
                if (tile.isWidget()) {
                    if (this.openWidget) {
                        this.builder.continueWidget(to - from);
                    }
                    else {
                        let widget = to > 0 || from < tile.length
                            ? WidgetTile.of(tile.widget, this.view, to - from, tile.flags & 496 /* TileFlag.Widget */, this.cache.maybeReuse(tile))
                            : this.cache.reuse(tile);
                        if (widget.flags & 256 /* TileFlag.Block */) {
                            widget.flags &= ~1 /* TileFlag.BreakAfter */;
                            this.builder.addBlockWidget(widget);
                        }
                        else {
                            this.builder.ensureLine(null);
                            this.builder.addInlineWidget(widget, activeMarks, openMarks);
                            openMarks = activeMarks.length;
                        }
                    }
                }
                else if (tile.isText()) {
                    this.builder.ensureLine(null);
                    if (!from && to == tile.length) {
                        this.builder.addText(tile.text, activeMarks, openMarks, this.cache.reuse(tile));
                    }
                    else {
                        this.cache.add(tile);
                        this.builder.addText(tile.text.slice(from, to), activeMarks, openMarks);
                    }
                    openMarks = activeMarks.length;
                }
                else if (tile.isLine()) {
                    tile.flags &= ~1 /* TileFlag.BreakAfter */;
                    this.cache.reused.set(tile, 1 /* Reused.Full */);
                    this.builder.addLine(tile);
                }
                else if (tile instanceof WidgetBufferTile) {
                    this.cache.add(tile);
                }
                else if (tile instanceof MarkTile) {
                    this.builder.ensureLine(null);
                    this.builder.addMark(tile, activeMarks, openMarks);
                    this.cache.reused.set(tile, 1 /* Reused.Full */);
                    openMarks = activeMarks.length;
                }
                else {
                    return false;
                }
                this.openWidget = false;
            },
            enter: (tile) => {
                if (tile.isLine()) {
                    this.builder.addLineStart(tile.attrs, this.cache.maybeReuse(tile));
                }
                else {
                    this.cache.add(tile);
                    if (tile instanceof MarkTile)
                        activeMarks.unshift(tile.mark);
                }
                this.openWidget = false;
            },
            leave: (tile) => {
                if (tile.isLine()) {
                    if (activeMarks.length)
                        activeMarks.length = openMarks = 0;
                }
                else if (tile instanceof MarkTile) {
                    activeMarks.shift();
                    openMarks = Math.min(openMarks, activeMarks.length);
                }
            },
            break: () => {
                this.builder.addBreak();
                this.openWidget = false;
            },
        });
        this.text.skip(length);
    }
    emit(from, to) {
        let pendingLineAttrs = null;
        let b = this.builder, markCount = 0;
        let openEnd = state.RangeSet.spans(this.decorations, from, to, {
            point: (from, to, deco, active, openStart, index) => {
                if (deco instanceof PointDecoration) {
                    if (this.disallowBlockEffectsFor[index]) {
                        if (deco.block)
                            throw new RangeError("Block decorations may not be specified via plugins");
                        if (to > this.view.state.doc.lineAt(from).to)
                            throw new RangeError("Decorations that replace line breaks may not be specified via plugins");
                    }
                    markCount = active.length;
                    if (openStart > active.length) {
                        b.continueWidget(to - from);
                    }
                    else {
                        let widget = deco.widget || (deco.block ? NullWidget.block : NullWidget.inline);
                        let flags = widgetFlags(deco);
                        let tile = this.cache.findWidget(widget, to - from, flags) || WidgetTile.of(widget, this.view, to - from, flags);
                        if (deco.block) {
                            if (deco.startSide > 0)
                                b.addLineStartIfNotCovered(pendingLineAttrs);
                            b.addBlockWidget(tile);
                        }
                        else {
                            b.ensureLine(pendingLineAttrs);
                            b.addInlineWidget(tile, active, openStart);
                        }
                    }
                    pendingLineAttrs = null;
                }
                else {
                    pendingLineAttrs = addLineDeco(pendingLineAttrs, deco);
                }
                if (to > from)
                    this.text.skip(to - from);
            },
            span: (from, to, active, openStart) => {
                for (let pos = from; pos < to;) {
                    let chars = this.text.next(Math.min(512 /* C.Chunk */, to - pos));
                    if (chars == null) { // Line break
                        b.addLineStartIfNotCovered(pendingLineAttrs);
                        b.addBreak();
                        pos++;
                    }
                    else {
                        b.ensureLine(pendingLineAttrs);
                        b.addText(chars, active, openStart);
                        pos += chars.length;
                    }
                    pendingLineAttrs = null;
                }
            }
        });
        b.addLineStartIfNotCovered(pendingLineAttrs);
        this.openWidget = openEnd > markCount;
        this.openMarks = openEnd;
    }
    forward(from, to) {
        if (to - from <= 10) {
            this.old.advance(to - from, 1, this.reuseWalker);
        }
        else {
            this.old.advance(5, -1, this.reuseWalker);
            this.old.advance(to - from - 10, -1);
            this.old.advance(5, 1, this.reuseWalker);
        }
    }
    getCompositionContext(text) {
        let marks = [], line = null;
        for (let parent = text.parentNode;; parent = parent.parentNode) {
            let tile = Tile.get(parent);
            if (parent == this.view.contentDOM)
                break;
            if (tile instanceof MarkTile)
                marks.push(tile);
            else if (tile === null || tile === void 0 ? void 0 : tile.isLine())
                line = tile;
            else if (parent.nodeName == "DIV" && !line && parent != this.view.contentDOM)
                line = new LineTile(parent, lineBaseAttrs);
            else
                marks.push(MarkTile.of(new MarkDecoration({ tagName: parent.nodeName.toLowerCase(), attributes: getAttrs(parent) }), parent));
        }
        return { line: line, marks };
    }
}
function hasContent(tile, requireText) {
    let scan = (tile) => {
        for (let ch of tile.children)
            if ((requireText ? ch.isText() : ch.length) || scan(ch))
                return true;
        return false;
    };
    return scan(tile);
}
function widgetFlags(deco) {
    let flags = deco.isReplace ? (deco.startSide < 0 ? 64 /* TileFlag.IncStart */ : 0) | (deco.endSide > 0 ? 128 /* TileFlag.IncEnd */ : 0)
        : (deco.startSide > 0 ? 32 /* TileFlag.After */ : 16 /* TileFlag.Before */);
    if (deco.block)
        flags |= 256 /* TileFlag.Block */;
    return flags;
}
const lineBaseAttrs = { class: "cm-line" };
function addLineDeco(value, deco) {
    let attrs = deco.spec.attributes, cls = deco.spec.class;
    if (!attrs && !cls)
        return value;
    if (!value)
        value = { class: "cm-line" };
    if (attrs)
        combineAttrs(attrs, value);
    if (cls)
        value.class += " " + cls;
    return value;
}
function getMarks(ptr) {
    let found = [];
    for (let i = ptr.parents.length; i > 1; i--) {
        let tile = i == ptr.parents.length ? ptr.tile : ptr.parents[i].tile;
        if (tile instanceof MarkTile)
            found.push(tile.mark);
    }
    return found;
}
function freeNode(node) {
    let tile = Tile.get(node);
    if (tile)
        tile.setDOM(node.cloneNode());
    return node;
}
class NullWidget extends WidgetType {
    constructor(tag) {
        super();
        this.tag = tag;
    }
    eq(other) { return other.tag == this.tag; }
    toDOM() { return document.createElement(this.tag); }
    updateDOM(elt) { return elt.nodeName.toLowerCase() == this.tag; }
    get isHidden() { return true; }
}
NullWidget.inline = new NullWidget("span");
NullWidget.block = new NullWidget("div");
const BreakWidget = new class extends WidgetType {
    toDOM() { return document.createElement("br"); }
    get isHidden() { return true; }
    get editable() { return true; }
};

class DocView {
    constructor(view) {
        this.view = view;
        this.decorations = [];
        this.blockWrappers = [];
        this.dynamicDecorationMap = [false];
        this.domChanged = null;
        this.hasComposition = null;
        this.editContextFormatting = Decoration.none;
        this.lastCompositionAfterCursor = false;
        // Track a minimum width for the editor. When measuring sizes in
        // measureVisibleLineHeights, this is updated to point at the width
        // of a given element and its extent in the document. When a change
        // happens in that range, these are reset. That way, once we've seen
        // a line/element of a given length, we keep the editor wide enough
        // to fit at least that element, until it is changed, at which point
        // we forget it again.
        this.minWidth = 0;
        this.minWidthFrom = 0;
        this.minWidthTo = 0;
        // Track whether the DOM selection was set in a lossy way, so that
        // we don't mess it up when reading it back it
        this.impreciseAnchor = null;
        this.impreciseHead = null;
        this.forceSelection = false;
        // Used by the resize observer to ignore resizes that we caused
        // ourselves
        this.lastUpdate = Date.now();
        this.updateDeco();
        this.tile = new DocTile(view, view.contentDOM);
        this.updateInner([new ChangedRange(0, 0, 0, view.state.doc.length)], null);
    }
    // Update the document view to a given state.
    update(update) {
        var _a;
        let changedRanges = update.changedRanges;
        if (this.minWidth > 0 && changedRanges.length) {
            if (!changedRanges.every(({ fromA, toA }) => toA < this.minWidthFrom || fromA > this.minWidthTo)) {
                this.minWidth = this.minWidthFrom = this.minWidthTo = 0;
            }
            else {
                this.minWidthFrom = update.changes.mapPos(this.minWidthFrom, 1);
                this.minWidthTo = update.changes.mapPos(this.minWidthTo, 1);
            }
        }
        this.updateEditContextFormatting(update);
        let readCompositionAt = -1;
        if (this.view.inputState.composing >= 0 && !this.view.observer.editContext) {
            if ((_a = this.domChanged) === null || _a === void 0 ? void 0 : _a.newSel)
                readCompositionAt = this.domChanged.newSel.head;
            else if (!touchesComposition(update.changes, this.hasComposition) && !update.selectionSet)
                readCompositionAt = update.state.selection.main.head;
        }
        let composition = readCompositionAt > -1 ? findCompositionRange(this.view, update.changes, readCompositionAt) : null;
        this.domChanged = null;
        if (this.hasComposition) {
            let { from, to } = this.hasComposition;
            changedRanges = new ChangedRange(from, to, update.changes.mapPos(from, -1), update.changes.mapPos(to, 1))
                .addToSet(changedRanges.slice());
        }
        this.hasComposition = composition ? { from: composition.range.fromB, to: composition.range.toB } : null;
        // When the DOM nodes around the selection are moved to another
        // parent, Chrome sometimes reports a different selection through
        // getSelection than the one that it actually shows to the user.
        // This forces a selection update when lines are joined to work
        // around that. Issue #54
        if ((browser.ie || browser.chrome) && !composition && update &&
            update.state.doc.lines != update.startState.doc.lines)
            this.forceSelection = true;
        let prevDeco = this.decorations, prevWrappers = this.blockWrappers;
        this.updateDeco();
        let decoDiff = findChangedDeco(prevDeco, this.decorations, update.changes);
        if (decoDiff.length)
            changedRanges = ChangedRange.extendWithRanges(changedRanges, decoDiff);
        let blockDiff = findChangedWrappers(prevWrappers, this.blockWrappers, update.changes);
        if (blockDiff.length)
            changedRanges = ChangedRange.extendWithRanges(changedRanges, blockDiff);
        if (composition && !changedRanges.some(r => r.fromA <= composition.range.fromA && r.toA >= composition.range.toA))
            changedRanges = composition.range.addToSet(changedRanges.slice());
        if ((this.tile.flags & 2 /* TileFlag.Synced */) && changedRanges.length == 0) {
            return false;
        }
        else {
            this.updateInner(changedRanges, composition);
            if (update.transactions.length)
                this.lastUpdate = Date.now();
            return true;
        }
    }
    // Used by update and the constructor do perform the actual DOM
    // update
    updateInner(changes, composition) {
        this.view.viewState.mustMeasureContent = true;
        let { observer } = this.view;
        observer.ignore(() => {
            if (composition || changes.length) {
                let oldTile = this.tile;
                let builder = new TileUpdate(this.view, oldTile, this.blockWrappers, this.decorations, this.dynamicDecorationMap);
                this.tile = builder.run(changes, composition);
                destroyDropped(oldTile, builder.cache.reused);
            }
            // Lock the height during redrawing, since Chrome sometimes
            // messes with the scroll position during DOM mutation (though
            // no relayout is triggered and I cannot imagine how it can
            // recompute the scroll position without a layout)
            this.tile.dom.style.height = this.view.viewState.contentHeight / this.view.scaleY + "px";
            this.tile.dom.style.flexBasis = this.minWidth ? this.minWidth + "px" : "";
            // Chrome will sometimes, when DOM mutations occur directly
            // around the selection, get confused and report a different
            // selection from the one it displays (issue #218). This tries
            // to detect that situation.
            let track = browser.chrome || browser.ios ? { node: observer.selectionRange.focusNode, written: false } : undefined;
            this.tile.sync(track);
            if (track && (track.written || observer.selectionRange.focusNode != track.node || !this.tile.dom.contains(track.node)))
                this.forceSelection = true;
            this.tile.dom.style.height = "";
        });
        let gaps = [];
        if (this.view.viewport.from || this.view.viewport.to < this.view.state.doc.length)
            for (let child of this.tile.children)
                if (child.isWidget() && child.widget instanceof BlockGapWidget)
                    gaps.push(child.dom);
        observer.updateGaps(gaps);
    }
    updateEditContextFormatting(update) {
        this.editContextFormatting = this.editContextFormatting.map(update.changes);
        for (let tr of update.transactions)
            for (let effect of tr.effects)
                if (effect.is(setEditContextFormatting)) {
                    this.editContextFormatting = effect.value;
                }
    }
    // Sync the DOM selection to this.state.selection
    updateSelection(mustRead = false, fromPointer = false) {
        if (mustRead || !this.view.observer.selectionRange.focusNode)
            this.view.observer.readSelectionRange();
        let { dom } = this.tile;
        let activeElt = this.view.root.activeElement, focused = activeElt == dom;
        let selectionNotFocus = !focused && !(this.view.state.facet(editable) || dom.tabIndex > -1) &&
            hasSelection(dom, this.view.observer.selectionRange) && !(activeElt && dom.contains(activeElt));
        if (!(focused || fromPointer || selectionNotFocus))
            return;
        let force = this.forceSelection;
        this.forceSelection = false;
        let main = this.view.state.selection.main, anchor, head;
        if (main.empty) {
            head = anchor = this.inlineDOMNearPos(main.anchor, main.assoc || 1);
        }
        else {
            head = this.inlineDOMNearPos(main.head, main.head == main.from ? 1 : -1);
            anchor = this.inlineDOMNearPos(main.anchor, main.anchor == main.from ? 1 : -1);
        }
        // Always reset on Firefox when next to an uneditable node to
        // avoid invisible cursor bugs (#111)
        if (browser.gecko && main.empty && !this.hasComposition && betweenUneditable(anchor)) {
            let dummy = document.createTextNode("");
            this.view.observer.ignore(() => anchor.node.insertBefore(dummy, anchor.node.childNodes[anchor.offset] || null));
            anchor = head = new DOMPos(dummy, 0);
            force = true;
        }
        let domSel = this.view.observer.selectionRange;
        // If the selection is already here, or in an equivalent position, don't touch it
        if (force || !domSel.focusNode || (!isEquivalentPosition(anchor.node, anchor.offset, domSel.anchorNode, domSel.anchorOffset) ||
            !isEquivalentPosition(head.node, head.offset, domSel.focusNode, domSel.focusOffset)) && !this.suppressWidgetCursorChange(domSel, main)) {
            this.view.observer.ignore(() => {
                // Chrome Android will hide the virtual keyboard when tapping
                // inside an uneditable node, and not bring it back when we
                // move the cursor to its proper position. This tries to
                // restore the keyboard by cycling focus.
                if (browser.android && browser.chrome && dom.contains(domSel.focusNode) &&
                    inUneditable(domSel.focusNode, dom)) {
                    dom.blur();
                    dom.focus({ preventScroll: true });
                }
                let rawSel = getSelection(this.view.root);
                if (!rawSel) ;
                else if (main.empty) {
                    // Work around https://bugzilla.mozilla.org/show_bug.cgi?id=1612076
                    if (browser.gecko) {
                        let nextTo = nextToUneditable(anchor.node, anchor.offset);
                        if (nextTo && nextTo != (1 /* NextTo.Before */ | 2 /* NextTo.After */)) {
                            let text = (nextTo == 1 /* NextTo.Before */ ? textNodeBefore : textNodeAfter)(anchor.node, anchor.offset);
                            if (text)
                                anchor = new DOMPos(text.node, text.offset);
                        }
                    }
                    rawSel.collapse(anchor.node, anchor.offset);
                    if (main.bidiLevel != null && rawSel.caretBidiLevel !== undefined)
                        rawSel.caretBidiLevel = main.bidiLevel;
                }
                else if (rawSel.extend) {
                    // Selection.extend can be used to create an 'inverted' selection
                    // (one where the focus is before the anchor), but not all
                    // browsers support it yet.
                    rawSel.collapse(anchor.node, anchor.offset);
                    // Safari will ignore the call above when the editor is
                    // hidden, and then raise an error on the call to extend
                    // (#940).
                    try {
                        rawSel.extend(head.node, head.offset);
                    }
                    catch (_) { }
                }
                else {
                    // Primitive (IE) way
                    let range = document.createRange();
                    if (main.anchor > main.head)
                        [anchor, head] = [head, anchor];
                    range.setEnd(head.node, head.offset);
                    range.setStart(anchor.node, anchor.offset);
                    rawSel.removeAllRanges();
                    rawSel.addRange(range);
                }
                if (selectionNotFocus && this.view.root.activeElement == dom) {
                    dom.blur();
                    if (activeElt)
                        activeElt.focus();
                }
            });
            this.view.observer.setSelectionRange(anchor, head);
        }
        this.impreciseAnchor = anchor.precise ? null : new DOMPos(domSel.anchorNode, domSel.anchorOffset);
        this.impreciseHead = head.precise ? null : new DOMPos(domSel.focusNode, domSel.focusOffset);
    }
    // If a zero-length widget is inserted next to the cursor during
    // composition, avoid moving it across it and disrupting the
    // composition.
    suppressWidgetCursorChange(sel, cursor) {
        return this.hasComposition && cursor.empty &&
            isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset) &&
            this.posFromDOM(sel.focusNode, sel.focusOffset) == cursor.head;
    }
    enforceCursorAssoc() {
        if (this.hasComposition)
            return;
        let { view } = this, cursor = view.state.selection.main;
        let sel = getSelection(view.root);
        let { anchorNode, anchorOffset } = view.observer.selectionRange;
        if (!sel || !cursor.empty || !cursor.assoc || !sel.modify)
            return;
        let line = this.lineAt(cursor.head, cursor.assoc);
        if (!line)
            return;
        let lineStart = line.posAtStart;
        if (cursor.head == lineStart || cursor.head == lineStart + line.length)
            return;
        let before = this.coordsAt(cursor.head, -1), after = this.coordsAt(cursor.head, 1);
        if (!before || !after || before.bottom > after.top)
            return;
        let dom = this.domAtPos(cursor.head + cursor.assoc, cursor.assoc);
        sel.collapse(dom.node, dom.offset);
        sel.modify("move", cursor.assoc < 0 ? "forward" : "backward", "lineboundary");
        // This can go wrong in corner cases like single-character lines,
        // so check and reset if necessary.
        view.observer.readSelectionRange();
        let newRange = view.observer.selectionRange;
        if (view.docView.posFromDOM(newRange.anchorNode, newRange.anchorOffset) != cursor.from)
            sel.collapse(anchorNode, anchorOffset);
    }
    posFromDOM(node, offset) {
        let tile = this.tile.nearest(node);
        if (!tile)
            return this.tile.dom.compareDocumentPosition(node) & 2 /* PRECEDING */ ? 0 : this.view.state.doc.length;
        let start = tile.posAtStart;
        if (tile.isComposite()) {
            let after;
            if (node == tile.dom) {
                after = tile.dom.childNodes[offset];
            }
            else {
                let bias = maxOffset(node) == 0 ? 0 : offset == 0 ? -1 : 1;
                for (;;) {
                    let parent = node.parentNode;
                    if (parent == tile.dom)
                        break;
                    if (bias == 0 && parent.firstChild != parent.lastChild) {
                        if (node == parent.firstChild)
                            bias = -1;
                        else
                            bias = 1;
                    }
                    node = parent;
                }
                if (bias < 0)
                    after = node;
                else
                    after = node.nextSibling;
            }
            if (after == tile.dom.firstChild)
                return start;
            while (after && !Tile.get(after))
                after = after.nextSibling;
            if (!after)
                return start + tile.length;
            for (let i = 0, pos = start;; i++) {
                let child = tile.children[i];
                if (child.dom == after)
                    return pos;
                pos += child.length + child.breakAfter;
            }
        }
        else if (tile.isText()) {
            return node == tile.dom ? start + offset : start + (offset ? tile.length : 0);
        }
        else {
            return start;
        }
    }
    domAtPos(pos, side) {
        let { tile, offset } = this.tile.resolveBlock(pos, side);
        if (tile.isWidget())
            return tile.domPosFor(pos, side);
        return tile.domIn(offset, side);
    }
    inlineDOMNearPos(pos, side) {
        let before, beforeOff = -1, beforeBad = false;
        let after, afterOff = -1, afterBad = false;
        this.tile.blockTiles((tile, off) => {
            if (tile.isWidget()) {
                if ((tile.flags & 32 /* TileFlag.After */) && off >= pos)
                    return true;
                if (tile.flags & 16 /* TileFlag.Before */)
                    beforeBad = true;
            }
            else {
                let end = off + tile.length;
                if (off <= pos) {
                    before = tile;
                    beforeOff = pos - off;
                    beforeBad = end < pos;
                }
                if (end >= pos && !after) {
                    after = tile;
                    afterOff = pos - off;
                    afterBad = off > pos;
                }
                if (off > pos && after)
                    return true;
            }
        });
        if (!before && !after)
            return this.domAtPos(pos, side);
        if (beforeBad && after)
            before = null;
        else if (afterBad && before)
            after = null;
        return before && side < 0 || !after ? before.domIn(beforeOff, side) : after.domIn(afterOff, side);
    }
    coordsAt(pos, side) {
        let { tile, offset } = this.tile.resolveBlock(pos, side);
        if (tile.isWidget()) {
            if (tile.widget instanceof BlockGapWidget)
                return null;
            return tile.coordsInWidget(offset, side, true);
        }
        return tile.coordsIn(offset, side);
    }
    lineAt(pos, side) {
        let { tile } = this.tile.resolveBlock(pos, side);
        return tile.isLine() ? tile : null;
    }
    coordsForChar(pos) {
        let { tile, offset } = this.tile.resolveBlock(pos, 1);
        if (!tile.isLine())
            return null;
        function scan(tile, offset) {
            if (tile.isComposite()) {
                for (let ch of tile.children) {
                    if (ch.length >= offset) {
                        let found = scan(ch, offset);
                        if (found)
                            return found;
                    }
                    offset -= ch.length;
                    if (offset < 0)
                        break;
                }
            }
            else if (tile.isText() && offset < tile.length) {
                let end = state.findClusterBreak(tile.text, offset);
                if (end == offset)
                    return null;
                let rects = textRange(tile.dom, offset, end).getClientRects();
                for (let i = 0; i < rects.length; i++) {
                    let rect = rects[i];
                    if (i == rects.length - 1 || rect.top < rect.bottom && rect.left < rect.right)
                        return rect;
                }
            }
            return null;
        }
        return scan(tile, offset);
    }
    measureVisibleLineHeights(viewport) {
        let result = [], { from, to } = viewport;
        let contentWidth = this.view.contentDOM.clientWidth;
        let isWider = contentWidth > Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1;
        let widest = -1, ltr = this.view.textDirection == exports.Direction.LTR;
        let spaceAbove = 0;
        let scan = (tile, pos, measureBounds) => {
            for (let i = 0; i < tile.children.length; i++) {
                if (pos > to)
                    break;
                let child = tile.children[i], end = pos + child.length;
                let childRect = child.dom.getBoundingClientRect(), { height } = childRect;
                if (measureBounds && !i)
                    spaceAbove += childRect.top - measureBounds.top;
                if (child instanceof BlockWrapperTile) {
                    if (end > from)
                        scan(child, pos, childRect);
                }
                else if (pos >= from) {
                    if (spaceAbove > 0)
                        result.push(-spaceAbove);
                    result.push(height + spaceAbove);
                    spaceAbove = 0;
                    if (isWider) {
                        let last = child.dom.lastChild;
                        let rects = last ? clientRectsFor(last) : [];
                        if (rects.length) {
                            let rect = rects[rects.length - 1];
                            let width = ltr ? rect.right - childRect.left : childRect.right - rect.left;
                            if (width > widest) {
                                widest = width;
                                this.minWidth = contentWidth;
                                this.minWidthFrom = pos;
                                this.minWidthTo = end;
                            }
                        }
                    }
                }
                if (measureBounds && i == tile.children.length - 1)
                    spaceAbove += measureBounds.bottom - childRect.bottom;
                pos = end + child.breakAfter;
            }
        };
        scan(this.tile, 0, null);
        return result;
    }
    textDirectionAt(pos) {
        let { tile } = this.tile.resolveBlock(pos, 1);
        return getComputedStyle(tile.dom).direction == "rtl" ? exports.Direction.RTL : exports.Direction.LTR;
    }
    measureTextSize() {
        let lineMeasure = this.tile.blockTiles(tile => {
            if (tile.isLine() && tile.children.length && tile.length <= 20) {
                let totalWidth = 0, textHeight;
                for (let child of tile.children) {
                    if (!child.isText() || /[^ -~]/.test(child.text))
                        return undefined;
                    let rects = clientRectsFor(child.dom);
                    if (rects.length != 1)
                        return undefined;
                    totalWidth += rects[0].width;
                    textHeight = rects[0].height;
                }
                if (totalWidth)
                    return {
                        lineHeight: tile.dom.getBoundingClientRect().height,
                        charWidth: totalWidth / tile.length,
                        textHeight
                    };
            }
        });
        if (lineMeasure)
            return lineMeasure;
        // If no workable line exists, force a layout of a measurable element
        let dummy = document.createElement("div"), lineHeight, charWidth, textHeight;
        dummy.className = "cm-line";
        dummy.style.width = "99999px";
        dummy.style.position = "absolute";
        dummy.textContent = "abc def ghi jkl mno pqr stu";
        this.view.observer.ignore(() => {
            this.tile.dom.appendChild(dummy);
            let rect = clientRectsFor(dummy.firstChild)[0];
            lineHeight = dummy.getBoundingClientRect().height;
            charWidth = rect && rect.width ? rect.width / 27 : 7;
            textHeight = rect && rect.height ? rect.height : lineHeight;
            dummy.remove();
        });
        return { lineHeight, charWidth, textHeight };
    }
    computeBlockGapDeco() {
        let deco = [], vs = this.view.viewState;
        for (let pos = 0, i = 0;; i++) {
            let next = i == vs.viewports.length ? null : vs.viewports[i];
            let end = next ? next.from - 1 : this.view.state.doc.length;
            if (end > pos) {
                let height = (vs.lineBlockAt(end).bottom - vs.lineBlockAt(pos).top) / this.view.scaleY;
                deco.push(Decoration.replace({
                    widget: new BlockGapWidget(height),
                    block: true,
                    inclusive: true,
                    isBlockGap: true,
                }).range(pos, end));
            }
            if (!next)
                break;
            pos = next.to + 1;
        }
        return Decoration.set(deco);
    }
    updateDeco() {
        let i = 1;
        let allDeco = this.view.state.facet(decorations).map(d => {
            let dynamic = this.dynamicDecorationMap[i++] = typeof d == "function";
            return dynamic ? d(this.view) : d;
        });
        let dynamicOuter = false, outerDeco = this.view.state.facet(outerDecorations).map((d, i) => {
            let dynamic = typeof d == "function";
            if (dynamic)
                dynamicOuter = true;
            return dynamic ? d(this.view) : d;
        });
        if (outerDeco.length) {
            this.dynamicDecorationMap[i++] = dynamicOuter;
            allDeco.push(state.RangeSet.join(outerDeco));
        }
        this.decorations = [
            this.editContextFormatting,
            ...allDeco,
            this.computeBlockGapDeco(),
            this.view.viewState.lineGapDeco
        ];
        while (i < this.decorations.length)
            this.dynamicDecorationMap[i++] = false;
        this.blockWrappers = this.view.state.facet(blockWrappers).map(v => typeof v == "function" ? v(this.view) : v);
    }
    scrollIntoView(target) {
        if (target.isSnapshot) {
            let ref = this.view.viewState.lineBlockAt(target.range.head);
            this.view.scrollDOM.scrollTop = ref.top - target.yMargin;
            this.view.scrollDOM.scrollLeft = target.xMargin;
            return;
        }
        for (let handler of this.view.state.facet(scrollHandler)) {
            try {
                if (handler(this.view, target.range, target))
                    return true;
            }
            catch (e) {
                logException(this.view.state, e, "scroll handler");
            }
        }
        let { range } = target;
        let rect = this.coordsAt(range.head, range.empty ? range.assoc : range.head > range.anchor ? -1 : 1), other;
        if (!rect)
            return;
        if (!range.empty && (other = this.coordsAt(range.anchor, range.anchor > range.head ? -1 : 1)))
            rect = { left: Math.min(rect.left, other.left), top: Math.min(rect.top, other.top),
                right: Math.max(rect.right, other.right), bottom: Math.max(rect.bottom, other.bottom) };
        let margins = getScrollMargins(this.view);
        let targetRect = {
            left: rect.left - margins.left, top: rect.top - margins.top,
            right: rect.right + margins.right, bottom: rect.bottom + margins.bottom
        };
        let { offsetWidth, offsetHeight } = this.view.scrollDOM;
        scrollRectIntoView(this.view.scrollDOM, targetRect, range.head < range.anchor ? -1 : 1, target.x, target.y, Math.max(Math.min(target.xMargin, offsetWidth), -offsetWidth), Math.max(Math.min(target.yMargin, offsetHeight), -offsetHeight), this.view.textDirection == exports.Direction.LTR);
    }
    lineHasWidget(pos) {
        let scan = (child) => child.isWidget() || child.children.some(scan);
        return scan(this.tile.resolveBlock(pos, 1).tile);
    }
    destroy() {
        destroyDropped(this.tile);
    }
}
function destroyDropped(tile, reused) {
    let r = reused === null || reused === void 0 ? void 0 : reused.get(tile);
    if (r != 1 /* Reused.Full */) {
        if (r == null)
            tile.destroy();
        for (let ch of tile.children)
            destroyDropped(ch, reused);
    }
}
function betweenUneditable(pos) {
    return pos.node.nodeType == 1 && pos.node.firstChild &&
        (pos.offset == 0 || pos.node.childNodes[pos.offset - 1].contentEditable == "false") &&
        (pos.offset == pos.node.childNodes.length || pos.node.childNodes[pos.offset].contentEditable == "false");
}
function findCompositionNode(view, headPos) {
    let sel = view.observer.selectionRange;
    if (!sel.focusNode)
        return null;
    let textBefore = textNodeBefore(sel.focusNode, sel.focusOffset);
    let textAfter = textNodeAfter(sel.focusNode, sel.focusOffset);
    let textNode = textBefore || textAfter;
    if (textAfter && textBefore && textAfter.node != textBefore.node) {
        let tileAfter = Tile.get(textAfter.node);
        if (!tileAfter || tileAfter.isText() && tileAfter.text != textAfter.node.nodeValue) {
            textNode = textAfter;
        }
        else if (view.docView.lastCompositionAfterCursor) {
            let tileBefore = Tile.get(textBefore.node);
            if (!(!tileBefore || tileBefore.isText() && tileBefore.text != textBefore.node.nodeValue))
                textNode = textAfter;
        }
    }
    view.docView.lastCompositionAfterCursor = textNode != textBefore;
    if (!textNode)
        return null;
    let from = headPos - textNode.offset;
    return { from, to: from + textNode.node.nodeValue.length, node: textNode.node };
}
function findCompositionRange(view, changes, headPos) {
    let found = findCompositionNode(view, headPos);
    if (!found)
        return null;
    let { node: textNode, from, to } = found, text = textNode.nodeValue;
    // Don't try to preserve multi-line compositions
    if (/[\n\r]/.test(text))
        return null;
    if (view.state.doc.sliceString(found.from, found.to) != text)
        return null;
    let inv = changes.invertedDesc;
    return { range: new ChangedRange(inv.mapPos(from), inv.mapPos(to), from, to), text: textNode };
}
function nextToUneditable(node, offset) {
    if (node.nodeType != 1)
        return 0;
    return (offset && node.childNodes[offset - 1].contentEditable == "false" ? 1 /* NextTo.Before */ : 0) |
        (offset < node.childNodes.length && node.childNodes[offset].contentEditable == "false" ? 2 /* NextTo.After */ : 0);
}
let DecorationComparator$1 = class DecorationComparator {
    constructor() {
        this.changes = [];
    }
    compareRange(from, to) { addRange(from, to, this.changes); }
    comparePoint(from, to) { addRange(from, to, this.changes); }
    boundChange(pos) { addRange(pos, pos, this.changes); }
};
function findChangedDeco(a, b, diff) {
    let comp = new DecorationComparator$1;
    state.RangeSet.compare(a, b, diff, comp);
    return comp.changes;
}
class WrapperComparator {
    constructor() {
        this.changes = [];
    }
    compareRange(from, to) { addRange(from, to, this.changes); }
    comparePoint() { }
    boundChange(pos) { addRange(pos, pos, this.changes); }
}
function findChangedWrappers(a, b, diff) {
    let comp = new WrapperComparator;
    state.RangeSet.compare(a, b, diff, comp);
    return comp.changes;
}
function inUneditable(node, inside) {
    for (let cur = node; cur && cur != inside; cur = cur.assignedSlot || cur.parentNode) {
        if (cur.nodeType == 1 && cur.contentEditable == 'false') {
            return true;
        }
    }
    return false;
}
function touchesComposition(changes, composition) {
    let touched = false;
    if (composition)
        changes.iterChangedRanges((from, to) => {
            if (from < composition.to && to > composition.from)
                touched = true;
        });
    return touched;
}
class BlockGapWidget extends WidgetType {
    constructor(height) {
        super();
        this.height = height;
    }
    toDOM() {
        let elt = document.createElement("div");
        elt.className = "cm-gap";
        this.updateDOM(elt);
        return elt;
    }
    eq(other) { return other.height == this.height; }
    updateDOM(elt) {
        elt.style.height = this.height + "px";
        return true;
    }
    get editable() { return true; }
    get estimatedHeight() { return this.height; }
    ignoreEvent() { return false; }
}

function groupAt(state$1, pos, bias = 1) {
    let categorize = state$1.charCategorizer(pos);
    let line = state$1.doc.lineAt(pos), linePos = pos - line.from;
    if (line.length == 0)
        return state.EditorSelection.cursor(pos);
    if (linePos == 0)
        bias = 1;
    else if (linePos == line.length)
        bias = -1;
    let from = linePos, to = linePos;
    if (bias < 0)
        from = state.findClusterBreak(line.text, linePos, false);
    else
        to = state.findClusterBreak(line.text, linePos);
    let cat = categorize(line.text.slice(from, to));
    while (from > 0) {
        let prev = state.findClusterBreak(line.text, from, false);
        if (categorize(line.text.slice(prev, from)) != cat)
            break;
        from = prev;
    }
    while (to < line.length) {
        let next = state.findClusterBreak(line.text, to);
        if (categorize(line.text.slice(to, next)) != cat)
            break;
        to = next;
    }
    return state.EditorSelection.range(from + line.from, to + line.from);
}
function posAtCoordsImprecise(view, contentRect, block, x, y) {
    let into = Math.round((x - contentRect.left) * view.defaultCharacterWidth);
    if (view.lineWrapping && block.height > view.defaultLineHeight * 1.5) {
        let textHeight = view.viewState.heightOracle.textHeight;
        let line = Math.floor((y - block.top - (view.defaultLineHeight - textHeight) * 0.5) / textHeight);
        into += line * view.viewState.heightOracle.lineLength;
    }
    let content = view.state.sliceDoc(block.from, block.to);
    return block.from + state.findColumn(content, into, view.state.tabSize);
}
function blockAt(view, pos, side) {
    let line = view.lineBlockAt(pos);
    if (Array.isArray(line.type)) {
        let best;
        for (let l of line.type) {
            if (l.from > pos)
                break;
            if (l.to < pos)
                continue;
            if (l.from < pos && l.to > pos)
                return l;
            if (!best || (l.type == exports.BlockType.Text && (best.type != l.type || (side < 0 ? l.from < pos : l.to > pos))))
                best = l;
        }
        return best || line;
    }
    return line;
}
function moveToLineBoundary(view, start, forward, includeWrap) {
    let line = blockAt(view, start.head, start.assoc || -1);
    let coords = !includeWrap || line.type != exports.BlockType.Text || !(view.lineWrapping || line.widgetLineBreaks) ? null
        : view.coordsAtPos(start.assoc < 0 && start.head > line.from ? start.head - 1 : start.head);
    if (coords) {
        let editorRect = view.dom.getBoundingClientRect();
        let direction = view.textDirectionAt(line.from);
        let pos = view.posAtCoords({ x: forward == (direction == exports.Direction.LTR) ? editorRect.right - 1 : editorRect.left + 1,
            y: (coords.top + coords.bottom) / 2 });
        if (pos != null)
            return state.EditorSelection.cursor(pos, forward ? -1 : 1);
    }
    return state.EditorSelection.cursor(forward ? line.to : line.from, forward ? -1 : 1);
}
function moveByChar(view, start, forward, by) {
    let line = view.state.doc.lineAt(start.head), spans = view.bidiSpans(line);
    let direction = view.textDirectionAt(line.from);
    for (let cur = start, check = null;;) {
        let next = moveVisually(line, spans, direction, cur, forward), char = movedOver;
        if (!next) {
            if (line.number == (forward ? view.state.doc.lines : 1))
                return cur;
            char = "\n";
            line = view.state.doc.line(line.number + (forward ? 1 : -1));
            spans = view.bidiSpans(line);
            next = view.visualLineSide(line, !forward);
        }
        if (!check) {
            if (!by)
                return next;
            check = by(char);
        }
        else if (!check(char)) {
            return cur;
        }
        cur = next;
    }
}
function byGroup(view, pos, start) {
    let categorize = view.state.charCategorizer(pos);
    let cat = categorize(start);
    return (next) => {
        let nextCat = categorize(next);
        if (cat == state.CharCategory.Space)
            cat = nextCat;
        return cat == nextCat;
    };
}
function moveVertically(view, start, forward, distance) {
    let startPos = start.head, dir = forward ? 1 : -1;
    if (startPos == (forward ? view.state.doc.length : 0))
        return state.EditorSelection.cursor(startPos, start.assoc);
    let goal = start.goalColumn, startY;
    let rect = view.contentDOM.getBoundingClientRect();
    let startCoords = view.coordsAtPos(startPos, start.assoc || -1), docTop = view.documentTop;
    if (startCoords) {
        if (goal == null)
            goal = startCoords.left - rect.left;
        startY = dir < 0 ? startCoords.top : startCoords.bottom;
    }
    else {
        let line = view.viewState.lineBlockAt(startPos);
        if (goal == null)
            goal = Math.min(rect.right - rect.left, view.defaultCharacterWidth * (startPos - line.from));
        startY = (dir < 0 ? line.top : line.bottom) + docTop;
    }
    let resolvedGoal = rect.left + goal;
    let dist = distance !== null && distance !== void 0 ? distance : (view.viewState.heightOracle.textHeight >> 1);
    for (let extra = 0;; extra += 10) {
        let curY = startY + (dist + extra) * dir;
        let pos = posAtCoords(view, { x: resolvedGoal, y: curY }, false, dir);
        return state.EditorSelection.cursor(pos.pos, pos.assoc, undefined, goal);
    }
}
function skipAtomicRanges(atoms, pos, bias) {
    for (;;) {
        let moved = 0;
        for (let set of atoms) {
            set.between(pos - 1, pos + 1, (from, to, value) => {
                if (pos > from && pos < to) {
                    let side = moved || bias || (pos - from < to - pos ? -1 : 1);
                    pos = side < 0 ? from : to;
                    moved = side;
                }
            });
        }
        if (!moved)
            return pos;
    }
}
function skipAtomsForSelection(atoms, sel) {
    let ranges = null;
    for (let i = 0; i < sel.ranges.length; i++) {
        let range = sel.ranges[i], updated = null;
        if (range.empty) {
            let pos = skipAtomicRanges(atoms, range.from, 0);
            if (pos != range.from)
                updated = state.EditorSelection.cursor(pos, -1);
        }
        else {
            let from = skipAtomicRanges(atoms, range.from, -1);
            let to = skipAtomicRanges(atoms, range.to, 1);
            if (from != range.from || to != range.to)
                updated = state.EditorSelection.range(range.from == range.anchor ? from : to, range.from == range.head ? from : to);
        }
        if (updated) {
            if (!ranges)
                ranges = sel.ranges.slice();
            ranges[i] = updated;
        }
    }
    return ranges ? state.EditorSelection.create(ranges, sel.mainIndex) : sel;
}
function skipAtoms(view, oldPos, pos) {
    let newPos = skipAtomicRanges(view.state.facet(atomicRanges).map(f => f(view)), pos.from, oldPos.head > pos.from ? -1 : 1);
    return newPos == pos.from ? pos : state.EditorSelection.cursor(newPos, newPos < pos.from ? 1 : -1);
}
class PosAssoc {
    constructor(pos, assoc) {
        this.pos = pos;
        this.assoc = assoc;
    }
}
function posAtCoords(view, coords, precise, scanY) {
    let content = view.contentDOM.getBoundingClientRect(), docTop = content.top + view.viewState.paddingTop;
    let { x, y } = coords, yOffset = y - docTop, block;
    // First find the block at the given Y position, if any. If scanY is
    // given (used for vertical cursor motion), try to skip widgets and
    // line padding.
    for (;;) {
        if (yOffset < 0)
            return new PosAssoc(0, 1);
        if (yOffset > view.viewState.docHeight)
            return new PosAssoc(view.state.doc.length, -1);
        block = view.elementAtHeight(yOffset);
        if (scanY == null)
            break;
        if (block.type == exports.BlockType.Text) {
            // Check whether we aren't landing the top/bottom padding of the line
            let rect = view.docView.coordsAt(scanY < 0 ? block.from : block.to, scanY);
            if (rect && (scanY < 0 ? rect.top <= yOffset + docTop : rect.bottom >= yOffset + docTop))
                break;
        }
        let halfLine = view.viewState.heightOracle.textHeight / 2;
        yOffset = scanY > 0 ? block.bottom + halfLine : block.top - halfLine;
    }
    // If outside the viewport, return null if precise==true, an
    // estimate otherwise.
    if (view.viewport.from >= block.to || view.viewport.to <= block.from) {
        if (precise)
            return null;
        if (block.type == exports.BlockType.Text) {
            let pos = posAtCoordsImprecise(view, content, block, x, y);
            return new PosAssoc(pos, pos == block.from ? 1 : -1);
        }
    }
    if (block.type != exports.BlockType.Text)
        return yOffset < (block.top + block.bottom) / 2 ? new PosAssoc(block.from, 1) : new PosAssoc(block.to, -1);
    // Here we know we're in a line, so run the logic for inline layout
    let line = view.docView.lineAt(block.from, 2);
    if (!line || line.length != block.length)
        line = view.docView.lineAt(block.from, -2);
    return posAtCoordsInline(view, line, block.from, x, y);
}
// Scan through the rectangles for the content of a tile, finding the
// one closest to the given coordinates, prefering closeness in Y over
// closeness in X.
//
// If this is a text tile, go character-by-character. For line or mark
// tiles, check each non-point-widget child, and descend text or mark
// tiles with a recursive call.
//
// For non-wrapped, purely left-to-right text, this could use a binary
// search. But because this seems to be fast enough, for how often it
// is called, there's not currently a specialized implementation for
// that.
function posAtCoordsInline(view, tile, offset, x, y) {
    let closest = -1, closestRect = null;
    let dxClosest = 1e9, dyClosest = 1e9;
    let rowTop = y, rowBot = y;
    let checkRects = (rects, index) => {
        for (let i = 0; i < rects.length; i++) {
            let rect = rects[i];
            if (rect.top == rect.bottom)
                continue;
            let dx = rect.left > x ? rect.left - x : rect.right < x ? x - rect.right : 0;
            let dy = rect.top > y ? rect.top - y : rect.bottom < y ? y - rect.bottom : 0;
            if (rect.top <= rowBot && rect.bottom >= rowTop) {
                // Rectangle is in the current row
                rowTop = Math.min(rect.top, rowTop);
                rowBot = Math.max(rect.bottom, rowBot);
                dy = 0;
            }
            if (closest < 0 || (dy - dyClosest || dx - dxClosest) < 0) {
                if (closest >= 0 && dyClosest && dxClosest < dx &&
                    closestRect.top <= rowBot - 2 && closestRect.bottom >= rowTop + 2) {
                    // Retroactively set dy to 0 if the current match is in this row.
                    dyClosest = 0;
                }
                else {
                    closest = index;
                    dxClosest = dx;
                    dyClosest = dy;
                    closestRect = rect;
                }
            }
        }
    };
    if (tile.isText()) {
        for (let i = 0; i < tile.length;) {
            let next = state.findClusterBreak(tile.text, i);
            checkRects(textRange(tile.dom, i, next).getClientRects(), i);
            if (!dxClosest && !dyClosest)
                break;
            i = next;
        }
        let after = (x > (closestRect.left + closestRect.right) / 2) == (dirAt(view, closest + offset) == exports.Direction.LTR);
        return after ? new PosAssoc(offset + state.findClusterBreak(tile.text, closest), -1) : new PosAssoc(offset + closest, 1);
    }
    else {
        if (!tile.length)
            return new PosAssoc(offset, 1);
        for (let i = 0; i < tile.children.length; i++) {
            let child = tile.children[i];
            if (child.flags & 48 /* TileFlag.PointWidget */)
                continue;
            let rects = (child.dom.nodeType == 1 ? child.dom : textRange(child.dom, 0, child.length)).getClientRects();
            checkRects(rects, i);
            if (!dxClosest && !dyClosest)
                break;
        }
        let inner = tile.children[closest], innerOff = tile.posBefore(inner, offset);
        if (inner.isComposite() || inner.isText())
            return posAtCoordsInline(view, inner, innerOff, Math.max(closestRect.left, Math.min(closestRect.right, x)), y);
        let after = (x > (closestRect.left + closestRect.right) / 2) == (dirAt(view, closest + offset) == exports.Direction.LTR);
        return after ? new PosAssoc(innerOff + inner.length, -1) : new PosAssoc(innerOff, 1);
    }
}
function dirAt(view, pos) {
    let line = view.state.doc.lineAt(pos), spans = view.bidiSpans(line);
    return spans[BidiSpan.find(view.bidiSpans(line), pos - line.from, -1, 1)].dir;
}

const LineBreakPlaceholder = "\uffff";
class DOMReader {
    constructor(points, view) {
        this.points = points;
        this.view = view;
        this.text = "";
        this.lineSeparator = view.state.facet(state.EditorState.lineSeparator);
    }
    append(text) {
        this.text += text;
    }
    lineBreak() {
        this.text += LineBreakPlaceholder;
    }
    readRange(start, end) {
        if (!start)
            return this;
        let parent = start.parentNode;
        for (let cur = start;;) {
            this.findPointBefore(parent, cur);
            let oldLen = this.text.length;
            this.readNode(cur);
            let tile = Tile.get(cur), next = cur.nextSibling;
            if (next == end) {
                if ((tile === null || tile === void 0 ? void 0 : tile.breakAfter) && !next && parent != this.view.contentDOM)
                    this.lineBreak();
                break;
            }
            let nextTile = Tile.get(next);
            if ((tile && nextTile ? tile.breakAfter :
                (tile ? tile.breakAfter : isBlockElement(cur)) ||
                    (isBlockElement(next) && (cur.nodeName != "BR" || (tile === null || tile === void 0 ? void 0 : tile.isWidget())) && this.text.length > oldLen)) &&
                !isEmptyToEnd(next, end))
                this.lineBreak();
            cur = next;
        }
        this.findPointBefore(parent, end);
        return this;
    }
    readTextNode(node) {
        let text = node.nodeValue;
        for (let point of this.points)
            if (point.node == node)
                point.pos = this.text.length + Math.min(point.offset, text.length);
        for (let off = 0, re = this.lineSeparator ? null : /\r\n?|\n/g;;) {
            let nextBreak = -1, breakSize = 1, m;
            if (this.lineSeparator) {
                nextBreak = text.indexOf(this.lineSeparator, off);
                breakSize = this.lineSeparator.length;
            }
            else if (m = re.exec(text)) {
                nextBreak = m.index;
                breakSize = m[0].length;
            }
            this.append(text.slice(off, nextBreak < 0 ? text.length : nextBreak));
            if (nextBreak < 0)
                break;
            this.lineBreak();
            if (breakSize > 1)
                for (let point of this.points)
                    if (point.node == node && point.pos > this.text.length)
                        point.pos -= breakSize - 1;
            off = nextBreak + breakSize;
        }
    }
    readNode(node) {
        let tile = Tile.get(node);
        let fromView = tile && tile.overrideDOMText;
        if (fromView != null) {
            this.findPointInside(node, fromView.length);
            for (let i = fromView.iter(); !i.next().done;) {
                if (i.lineBreak)
                    this.lineBreak();
                else
                    this.append(i.value);
            }
        }
        else if (node.nodeType == 3) {
            this.readTextNode(node);
        }
        else if (node.nodeName == "BR") {
            if (node.nextSibling)
                this.lineBreak();
        }
        else if (node.nodeType == 1) {
            this.readRange(node.firstChild, null);
        }
    }
    findPointBefore(node, next) {
        for (let point of this.points)
            if (point.node == node && node.childNodes[point.offset] == next)
                point.pos = this.text.length;
    }
    findPointInside(node, length) {
        for (let point of this.points)
            if (node.nodeType == 3 ? point.node == node : node.contains(point.node))
                point.pos = this.text.length + (isAtEnd(node, point.node, point.offset) ? length : 0);
    }
}
function isAtEnd(parent, node, offset) {
    for (;;) {
        if (!node || offset < maxOffset(node))
            return false;
        if (node == parent)
            return true;
        offset = domIndex(node) + 1;
        node = node.parentNode;
    }
}
function isEmptyToEnd(node, end) {
    let widgets;
    for (;; node = node.nextSibling) {
        if (node == end || !node)
            break;
        let view = Tile.get(node);
        if (!(view === null || view === void 0 ? void 0 : view.isWidget()))
            return false;
        if (view)
            (widgets || (widgets = [])).push(view);
    }
    if (widgets)
        for (let w of widgets) {
            let override = w.overrideDOMText;
            if (override === null || override === void 0 ? void 0 : override.length)
                return false;
        }
    return true;
}
class DOMPoint {
    constructor(node, offset) {
        this.node = node;
        this.offset = offset;
        this.pos = -1;
    }
}

class DOMChange {
    constructor(view, start, end, typeOver) {
        this.typeOver = typeOver;
        this.bounds = null;
        this.text = "";
        this.domChanged = start > -1;
        let { impreciseHead: iHead, impreciseAnchor: iAnchor } = view.docView;
        if (view.state.readOnly && start > -1) {
            // Ignore changes when the editor is read-only
            this.newSel = null;
        }
        else if (start > -1 && (this.bounds = domBoundsAround(view.docView.tile, start, end, 0))) {
            let selPoints = iHead || iAnchor ? [] : selectionPoints(view);
            let reader = new DOMReader(selPoints, view);
            reader.readRange(this.bounds.startDOM, this.bounds.endDOM);
            this.text = reader.text;
            this.newSel = selectionFromPoints(selPoints, this.bounds.from);
        }
        else {
            let domSel = view.observer.selectionRange;
            let head = iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset ||
                !contains(view.contentDOM, domSel.focusNode)
                ? view.state.selection.main.head
                : view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
            let anchor = iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset ||
                !contains(view.contentDOM, domSel.anchorNode)
                ? view.state.selection.main.anchor
                : view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
            // iOS will refuse to select the block gaps when doing
            // select-all.
            // Chrome will put the selection *inside* them, confusing
            // posFromDOM
            let vp = view.viewport;
            if ((browser.ios || browser.chrome) && view.state.selection.main.empty && head != anchor &&
                (vp.from > 0 || vp.to < view.state.doc.length)) {
                let from = Math.min(head, anchor), to = Math.max(head, anchor);
                let offFrom = vp.from - from, offTo = vp.to - to;
                if ((offFrom == 0 || offFrom == 1 || from == 0) && (offTo == 0 || offTo == -1 || to == view.state.doc.length)) {
                    head = 0;
                    anchor = view.state.doc.length;
                }
            }
            if (view.inputState.composing > -1 && view.state.selection.ranges.length > 1)
                this.newSel = view.state.selection.replaceRange(state.EditorSelection.range(anchor, head));
            else
                this.newSel = state.EditorSelection.single(anchor, head);
        }
    }
}
function domBoundsAround(tile, from, to, offset) {
    if (tile.isComposite()) {
        let fromI = -1, fromStart = -1, toI = -1, toEnd = -1;
        for (let i = 0, pos = offset, prevEnd = offset; i < tile.children.length; i++) {
            let child = tile.children[i], end = pos + child.length;
            if (pos < from && end > to)
                return domBoundsAround(child, from, to, pos);
            if (end >= from && fromI == -1) {
                fromI = i;
                fromStart = pos;
            }
            if (pos > to && child.dom.parentNode == tile.dom) {
                toI = i;
                toEnd = prevEnd;
                break;
            }
            prevEnd = end;
            pos = end + child.breakAfter;
        }
        return { from: fromStart, to: toEnd < 0 ? offset + tile.length : toEnd,
            startDOM: (fromI ? tile.children[fromI - 1].dom.nextSibling : null) || tile.dom.firstChild,
            endDOM: toI < tile.children.length && toI >= 0 ? tile.children[toI].dom : null };
    }
    else if (tile.isText()) {
        return { from: offset, to: offset + tile.length, startDOM: tile.dom, endDOM: tile.dom.nextSibling };
    }
    else {
        return null;
    }
}
function applyDOMChange(view, domChange) {
    let change;
    let { newSel } = domChange, sel = view.state.selection.main;
    let lastKey = view.inputState.lastKeyTime > Date.now() - 100 ? view.inputState.lastKeyCode : -1;
    if (domChange.bounds) {
        let { from, to } = domChange.bounds;
        let preferredPos = sel.from, preferredSide = null;
        // Prefer anchoring to end when Backspace is pressed (or, on
        // Android, when something was deleted)
        if (lastKey === 8 || browser.android && domChange.text.length < to - from) {
            preferredPos = sel.to;
            preferredSide = "end";
        }
        let diff = findDiff(view.state.doc.sliceString(from, to, LineBreakPlaceholder), domChange.text, preferredPos - from, preferredSide);
        if (diff) {
            // Chrome inserts two newlines when pressing shift-enter at the
            // end of a line. DomChange drops one of those.
            if (browser.chrome && lastKey == 13 &&
                diff.toB == diff.from + 2 && domChange.text.slice(diff.from, diff.toB) == LineBreakPlaceholder + LineBreakPlaceholder)
                diff.toB--;
            change = { from: from + diff.from, to: from + diff.toA,
                insert: state.Text.of(domChange.text.slice(diff.from, diff.toB).split(LineBreakPlaceholder)) };
        }
    }
    else if (newSel && (!view.hasFocus && view.state.facet(editable) || newSel.main.eq(sel))) {
        newSel = null;
    }
    if (!change && !newSel)
        return false;
    if (!change && domChange.typeOver && !sel.empty && newSel && newSel.main.empty) {
        // Heuristic to notice typing over a selected character
        change = { from: sel.from, to: sel.to, insert: view.state.doc.slice(sel.from, sel.to) };
    }
    else if ((browser.mac || browser.android) && change && change.from == change.to && change.from == sel.head - 1 &&
        /^\. ?$/.test(change.insert.toString()) && view.contentDOM.getAttribute("autocorrect") == "off") {
        // Detect insert-period-on-double-space Mac and Android behavior,
        // and transform it into a regular space insert.
        if (newSel && change.insert.length == 2)
            newSel = state.EditorSelection.single(newSel.main.anchor - 1, newSel.main.head - 1);
        change = { from: change.from, to: change.to, insert: state.Text.of([change.insert.toString().replace(".", " ")]) };
    }
    else if (change && change.from >= sel.from && change.to <= sel.to &&
        (change.from != sel.from || change.to != sel.to) &&
        (sel.to - sel.from) - (change.to - change.from) <= 4) {
        // If the change is inside the selection and covers most of it,
        // assume it is a selection replace (with identical characters at
        // the start/end not included in the diff)
        change = {
            from: sel.from, to: sel.to,
            insert: view.state.doc.slice(sel.from, change.from).append(change.insert).append(view.state.doc.slice(change.to, sel.to))
        };
    }
    else if (view.state.doc.lineAt(sel.from).to < sel.to && view.docView.lineHasWidget(sel.to) &&
        view.inputState.insertingTextAt > Date.now() - 50) {
        // For a cross-line insertion, Chrome and Safari will crudely take
        // the text of the line after the selection, flattening any
        // widgets, and move it into the joined line. This tries to detect
        // such a situation, and replaces the change with a selection
        // replace of the text provided by the beforeinput event.
        change = {
            from: sel.from, to: sel.to,
            insert: view.state.toText(view.inputState.insertingText)
        };
    }
    else if (browser.chrome && change && change.from == change.to && change.from == sel.head &&
        change.insert.toString() == "\n " && view.lineWrapping) {
        // In Chrome, if you insert a space at the start of a wrapped
        // line, it will actually insert a newline and a space, causing a
        // bogus new line to be created in CodeMirror (#968)
        if (newSel)
            newSel = state.EditorSelection.single(newSel.main.anchor - 1, newSel.main.head - 1);
        change = { from: sel.from, to: sel.to, insert: state.Text.of([" "]) };
    }
    if (change) {
        return applyDOMChangeInner(view, change, newSel, lastKey);
    }
    else if (newSel && !newSel.main.eq(sel)) {
        let scrollIntoView = false, userEvent = "select";
        if (view.inputState.lastSelectionTime > Date.now() - 50) {
            if (view.inputState.lastSelectionOrigin == "select")
                scrollIntoView = true;
            userEvent = view.inputState.lastSelectionOrigin;
            if (userEvent == "select.pointer")
                newSel = skipAtomsForSelection(view.state.facet(atomicRanges).map(f => f(view)), newSel);
        }
        view.dispatch({ selection: newSel, scrollIntoView, userEvent });
        return true;
    }
    else {
        return false;
    }
}
function applyDOMChangeInner(view, change, newSel, lastKey = -1) {
    if (browser.ios && view.inputState.flushIOSKey(change))
        return true;
    let sel = view.state.selection.main;
    // Android browsers don't fire reasonable key events for enter,
    // backspace, or delete. So this detects changes that look like
    // they're caused by those keys, and reinterprets them as key
    // events. (Some of these keys are also handled by beforeinput
    // events and the pendingAndroidKey mechanism, but that's not
    // reliable in all situations.)
    if (browser.android &&
        ((change.to == sel.to &&
            // GBoard will sometimes remove a space it just inserted
            // after a completion when you press enter
            (change.from == sel.from || change.from == sel.from - 1 && view.state.sliceDoc(change.from, sel.from) == " ") &&
            change.insert.length == 1 && change.insert.lines == 2 &&
            dispatchKey(view.contentDOM, "Enter", 13)) ||
            ((change.from == sel.from - 1 && change.to == sel.to && change.insert.length == 0 ||
                lastKey == 8 && change.insert.length < change.to - change.from && change.to > sel.head) &&
                dispatchKey(view.contentDOM, "Backspace", 8)) ||
            (change.from == sel.from && change.to == sel.to + 1 && change.insert.length == 0 &&
                dispatchKey(view.contentDOM, "Delete", 46))))
        return true;
    let text = change.insert.toString();
    if (view.inputState.composing >= 0)
        view.inputState.composing++;
    let defaultTr;
    let defaultInsert = () => defaultTr || (defaultTr = applyDefaultInsert(view, change, newSel));
    if (!view.state.facet(inputHandler).some(h => h(view, change.from, change.to, text, defaultInsert)))
        view.dispatch(defaultInsert());
    return true;
}
function applyDefaultInsert(view, change, newSel) {
    let tr, startState = view.state, sel = startState.selection.main, inAtomic = -1;
    if (change.from == change.to && change.from < sel.from || change.from > sel.to) {
        let side = change.from < sel.from ? -1 : 1, pos = side < 0 ? sel.from : sel.to;
        let moved = skipAtomicRanges(startState.facet(atomicRanges).map(f => f(view)), pos, side);
        if (change.from == moved)
            inAtomic = moved;
    }
    if (inAtomic > -1) {
        tr = {
            changes: change,
            selection: state.EditorSelection.cursor(change.from + change.insert.length, -1)
        };
    }
    else if (change.from >= sel.from && change.to <= sel.to && change.to - change.from >= (sel.to - sel.from) / 3 &&
        (!newSel || newSel.main.empty && newSel.main.from == change.from + change.insert.length) &&
        view.inputState.composing < 0) {
        let before = sel.from < change.from ? startState.sliceDoc(sel.from, change.from) : "";
        let after = sel.to > change.to ? startState.sliceDoc(change.to, sel.to) : "";
        tr = startState.replaceSelection(view.state.toText(before + change.insert.sliceString(0, undefined, view.state.lineBreak) + after));
    }
    else {
        let changes = startState.changes(change);
        let mainSel = newSel && newSel.main.to <= changes.newLength ? newSel.main : undefined;
        // Try to apply a composition change to all cursors
        if (startState.selection.ranges.length > 1 && (view.inputState.composing >= 0 || view.inputState.compositionPendingChange) &&
            change.to <= sel.to + 10 && change.to >= sel.to - 10) {
            let replaced = view.state.sliceDoc(change.from, change.to);
            let compositionRange, composition = newSel && findCompositionNode(view, newSel.main.head);
            if (composition) {
                let dLen = change.insert.length - (change.to - change.from);
                compositionRange = { from: composition.from, to: composition.to - dLen };
            }
            else {
                compositionRange = view.state.doc.lineAt(sel.head);
            }
            let offset = sel.to - change.to;
            tr = startState.changeByRange(range => {
                if (range.from == sel.from && range.to == sel.to)
                    return { changes, range: mainSel || range.map(changes) };
                let to = range.to - offset, from = to - replaced.length;
                if (view.state.sliceDoc(from, to) != replaced ||
                    // Unfortunately, there's no way to make multiple
                    // changes in the same node work without aborting
                    // composition, so cursors in the composition range are
                    // ignored.
                    to >= compositionRange.from && from <= compositionRange.to)
                    return { range };
                let rangeChanges = startState.changes({ from, to, insert: change.insert }), selOff = range.to - sel.to;
                return {
                    changes: rangeChanges,
                    range: !mainSel ? range.map(rangeChanges) :
                        state.EditorSelection.range(Math.max(0, mainSel.anchor + selOff), Math.max(0, mainSel.head + selOff))
                };
            });
        }
        else {
            tr = {
                changes,
                selection: mainSel && startState.selection.replaceRange(mainSel)
            };
        }
    }
    let userEvent = "input.type";
    if (view.composing ||
        view.inputState.compositionPendingChange && view.inputState.compositionEndedAt > Date.now() - 50) {
        view.inputState.compositionPendingChange = false;
        userEvent += ".compose";
        if (view.inputState.compositionFirstChange) {
            userEvent += ".start";
            view.inputState.compositionFirstChange = false;
        }
    }
    return startState.update(tr, { userEvent, scrollIntoView: true });
}
function findDiff(a, b, preferredPos, preferredSide) {
    let minLen = Math.min(a.length, b.length);
    let from = 0;
    while (from < minLen && a.charCodeAt(from) == b.charCodeAt(from))
        from++;
    if (from == minLen && a.length == b.length)
        return null;
    let toA = a.length, toB = b.length;
    while (toA > 0 && toB > 0 && a.charCodeAt(toA - 1) == b.charCodeAt(toB - 1)) {
        toA--;
        toB--;
    }
    if (preferredSide == "end") {
        let adjust = Math.max(0, from - Math.min(toA, toB));
        preferredPos -= toA + adjust - from;
    }
    if (toA < from && a.length < b.length) {
        let move = preferredPos <= from && preferredPos >= toA ? from - preferredPos : 0;
        from -= move;
        toB = from + (toB - toA);
        toA = from;
    }
    else if (toB < from) {
        let move = preferredPos <= from && preferredPos >= toB ? from - preferredPos : 0;
        from -= move;
        toA = from + (toA - toB);
        toB = from;
    }
    return { from, toA, toB };
}
function selectionPoints(view) {
    let result = [];
    if (view.root.activeElement != view.contentDOM)
        return result;
    let { anchorNode, anchorOffset, focusNode, focusOffset } = view.observer.selectionRange;
    if (anchorNode) {
        result.push(new DOMPoint(anchorNode, anchorOffset));
        if (focusNode != anchorNode || focusOffset != anchorOffset)
            result.push(new DOMPoint(focusNode, focusOffset));
    }
    return result;
}
function selectionFromPoints(points, base) {
    if (points.length == 0)
        return null;
    let anchor = points[0].pos, head = points.length == 2 ? points[1].pos : anchor;
    return anchor > -1 && head > -1 ? state.EditorSelection.single(anchor + base, head + base) : null;
}

class InputState {
    setSelectionOrigin(origin) {
        this.lastSelectionOrigin = origin;
        this.lastSelectionTime = Date.now();
    }
    constructor(view) {
        this.view = view;
        this.lastKeyCode = 0;
        this.lastKeyTime = 0;
        this.lastTouchTime = 0;
        this.lastFocusTime = 0;
        this.lastScrollTop = 0;
        this.lastScrollLeft = 0;
        // On iOS, some keys need to have their default behavior happen
        // (after which we retroactively handle them and reset the DOM) to
        // avoid messing up the virtual keyboard state.
        this.pendingIOSKey = undefined;
        /**
        When enabled (>-1), tab presses are not given to key handlers,
        leaving the browser's default behavior. If >0, the mode expires
        at that timestamp, and any other keypress clears it.
        Esc enables temporary tab focus mode for two seconds when not
        otherwise handled.
        */
        this.tabFocusMode = -1;
        this.lastSelectionOrigin = null;
        this.lastSelectionTime = 0;
        this.lastContextMenu = 0;
        this.scrollHandlers = [];
        this.handlers = Object.create(null);
        // -1 means not in a composition. Otherwise, this counts the number
        // of changes made during the composition. The count is used to
        // avoid treating the start state of the composition, before any
        // changes have been made, as part of the composition.
        this.composing = -1;
        // Tracks whether the next change should be marked as starting the
        // composition (null means no composition, true means next is the
        // first, false means first has already been marked for this
        // composition)
        this.compositionFirstChange = null;
        // End time of the previous composition
        this.compositionEndedAt = 0;
        // Used in a kludge to detect when an Enter keypress should be
        // considered part of the composition on Safari, which fires events
        // in the wrong order
        this.compositionPendingKey = false;
        // Used to categorize changes as part of a composition, even when
        // the mutation events fire shortly after the compositionend event
        this.compositionPendingChange = false;
        // Set by beforeinput, used in DOM change reader
        this.insertingText = "";
        this.insertingTextAt = 0;
        this.mouseSelection = null;
        // When a drag from the editor is active, this points at the range
        // being dragged.
        this.draggedContent = null;
        this.handleEvent = this.handleEvent.bind(this);
        this.notifiedFocused = view.hasFocus;
        // On Safari adding an input event handler somehow prevents an
        // issue where the composition vanishes when you press enter.
        if (browser.safari)
            view.contentDOM.addEventListener("input", () => null);
        if (browser.gecko)
            firefoxCopyCutHack(view.contentDOM.ownerDocument);
    }
    handleEvent(event) {
        if (!eventBelongsToEditor(this.view, event) || this.ignoreDuringComposition(event))
            return;
        if (event.type == "keydown" && this.keydown(event))
            return;
        if (this.view.updateState != 0 /* UpdateState.Idle */)
            Promise.resolve().then(() => this.runHandlers(event.type, event));
        else
            this.runHandlers(event.type, event);
    }
    runHandlers(type, event) {
        let handlers = this.handlers[type];
        if (handlers) {
            for (let observer of handlers.observers)
                observer(this.view, event);
            for (let handler of handlers.handlers) {
                if (event.defaultPrevented)
                    break;
                if (handler(this.view, event)) {
                    event.preventDefault();
                    break;
                }
            }
        }
    }
    ensureHandlers(plugins) {
        let handlers = computeHandlers(plugins), prev = this.handlers, dom = this.view.contentDOM;
        for (let type in handlers)
            if (type != "scroll") {
                let passive = !handlers[type].handlers.length;
                let exists = prev[type];
                if (exists && passive != !exists.handlers.length) {
                    dom.removeEventListener(type, this.handleEvent);
                    exists = null;
                }
                if (!exists)
                    dom.addEventListener(type, this.handleEvent, { passive });
            }
        for (let type in prev)
            if (type != "scroll" && !handlers[type])
                dom.removeEventListener(type, this.handleEvent);
        this.handlers = handlers;
    }
    keydown(event) {
        // Must always run, even if a custom handler handled the event
        this.lastKeyCode = event.keyCode;
        this.lastKeyTime = Date.now();
        if (event.keyCode == 9 && this.tabFocusMode > -1 && (!this.tabFocusMode || Date.now() <= this.tabFocusMode))
            return true;
        if (this.tabFocusMode > 0 && event.keyCode != 27 && modifierCodes.indexOf(event.keyCode) < 0)
            this.tabFocusMode = -1;
        // Chrome for Android usually doesn't fire proper key events, but
        // occasionally does, usually surrounded by a bunch of complicated
        // composition changes. When an enter or backspace key event is
        // seen, hold off on handling DOM events for a bit, and then
        // dispatch it.
        if (browser.android && browser.chrome && !event.synthetic &&
            (event.keyCode == 13 || event.keyCode == 8)) {
            this.view.observer.delayAndroidKey(event.key, event.keyCode);
            return true;
        }
        // Preventing the default behavior of Enter on iOS makes the
        // virtual keyboard get stuck in the wrong (lowercase)
        // state. So we let it go through, and then, in
        // applyDOMChange, notify key handlers of it and reset to
        // the state they produce.
        let pending;
        if (browser.ios && !event.synthetic && !event.altKey && !event.metaKey &&
            ((pending = PendingKeys.find(key => key.keyCode == event.keyCode)) && !event.ctrlKey ||
                EmacsyPendingKeys.indexOf(event.key) > -1 && event.ctrlKey && !event.shiftKey)) {
            this.pendingIOSKey = pending || event;
            setTimeout(() => this.flushIOSKey(), 250);
            return true;
        }
        if (event.keyCode != 229)
            this.view.observer.forceFlush();
        return false;
    }
    flushIOSKey(change) {
        let key = this.pendingIOSKey;
        if (!key)
            return false;
        // This looks like an autocorrection before Enter
        if (key.key == "Enter" && change && change.from < change.to && /^\S+$/.test(change.insert.toString()))
            return false;
        this.pendingIOSKey = undefined;
        return dispatchKey(this.view.contentDOM, key.key, key.keyCode, key instanceof KeyboardEvent ? key : undefined);
    }
    ignoreDuringComposition(event) {
        if (!/^key/.test(event.type) || event.synthetic)
            return false;
        if (this.composing > 0)
            return true;
        // See https://www.stum.de/2016/06/24/handling-ime-events-in-javascript/.
        // On some input method editors (IMEs), the Enter key is used to
        // confirm character selection. On Safari, when Enter is pressed,
        // compositionend and keydown events are sometimes emitted in the
        // wrong order. The key event should still be ignored, even when
        // it happens after the compositionend event.
        if (browser.safari && !browser.ios && this.compositionPendingKey && Date.now() - this.compositionEndedAt < 100) {
            this.compositionPendingKey = false;
            return true;
        }
        return false;
    }
    startMouseSelection(mouseSelection) {
        if (this.mouseSelection)
            this.mouseSelection.destroy();
        this.mouseSelection = mouseSelection;
    }
    update(update) {
        this.view.observer.update(update);
        if (this.mouseSelection)
            this.mouseSelection.update(update);
        if (this.draggedContent && update.docChanged)
            this.draggedContent = this.draggedContent.map(update.changes);
        if (update.transactions.length)
            this.lastKeyCode = this.lastSelectionTime = 0;
    }
    destroy() {
        if (this.mouseSelection)
            this.mouseSelection.destroy();
    }
}
function bindHandler(plugin, handler) {
    return (view, event) => {
        try {
            return handler.call(plugin, event, view);
        }
        catch (e) {
            logException(view.state, e);
        }
    };
}
function computeHandlers(plugins) {
    let result = Object.create(null);
    function record(type) {
        return result[type] || (result[type] = { observers: [], handlers: [] });
    }
    for (let plugin of plugins) {
        let spec = plugin.spec, handlers = spec && spec.plugin.domEventHandlers, observers = spec && spec.plugin.domEventObservers;
        if (handlers)
            for (let type in handlers) {
                let f = handlers[type];
                if (f)
                    record(type).handlers.push(bindHandler(plugin.value, f));
            }
        if (observers)
            for (let type in observers) {
                let f = observers[type];
                if (f)
                    record(type).observers.push(bindHandler(plugin.value, f));
            }
    }
    for (let type in handlers)
        record(type).handlers.push(handlers[type]);
    for (let type in observers)
        record(type).observers.push(observers[type]);
    return result;
}
const PendingKeys = [
    { key: "Backspace", keyCode: 8, inputType: "deleteContentBackward" },
    { key: "Enter", keyCode: 13, inputType: "insertParagraph" },
    { key: "Enter", keyCode: 13, inputType: "insertLineBreak" },
    { key: "Delete", keyCode: 46, inputType: "deleteContentForward" }
];
const EmacsyPendingKeys = "dthko";
// Key codes for modifier keys
const modifierCodes = [16, 17, 18, 20, 91, 92, 224, 225];
const dragScrollMargin = 6;
function dragScrollSpeed(dist) {
    return Math.max(0, dist) * 0.7 + 8;
}
function dist(a, b) {
    return Math.max(Math.abs(a.clientX - b.clientX), Math.abs(a.clientY - b.clientY));
}
class MouseSelection {
    constructor(view, startEvent, style, mustSelect) {
        this.view = view;
        this.startEvent = startEvent;
        this.style = style;
        this.mustSelect = mustSelect;
        this.scrollSpeed = { x: 0, y: 0 };
        this.scrolling = -1;
        this.lastEvent = startEvent;
        this.scrollParents = scrollableParents(view.contentDOM);
        this.atoms = view.state.facet(atomicRanges).map(f => f(view));
        let doc = view.contentDOM.ownerDocument;
        doc.addEventListener("mousemove", this.move = this.move.bind(this));
        doc.addEventListener("mouseup", this.up = this.up.bind(this));
        this.extend = startEvent.shiftKey;
        this.multiple = view.state.facet(state.EditorState.allowMultipleSelections) && addsSelectionRange(view, startEvent);
        this.dragging = isInPrimarySelection(view, startEvent) && getClickType(startEvent) == 1 ? null : false;
    }
    start(event) {
        // When clicking outside of the selection, immediately apply the
        // effect of starting the selection
        if (this.dragging === false)
            this.select(event);
    }
    move(event) {
        if (event.buttons == 0)
            return this.destroy();
        if (this.dragging || this.dragging == null && dist(this.startEvent, event) < 10)
            return;
        this.select(this.lastEvent = event);
        let sx = 0, sy = 0;
        let left = 0, top = 0, right = this.view.win.innerWidth, bottom = this.view.win.innerHeight;
        if (this.scrollParents.x)
            ({ left, right } = this.scrollParents.x.getBoundingClientRect());
        if (this.scrollParents.y)
            ({ top, bottom } = this.scrollParents.y.getBoundingClientRect());
        let margins = getScrollMargins(this.view);
        if (event.clientX - margins.left <= left + dragScrollMargin)
            sx = -dragScrollSpeed(left - event.clientX);
        else if (event.clientX + margins.right >= right - dragScrollMargin)
            sx = dragScrollSpeed(event.clientX - right);
        if (event.clientY - margins.top <= top + dragScrollMargin)
            sy = -dragScrollSpeed(top - event.clientY);
        else if (event.clientY + margins.bottom >= bottom - dragScrollMargin)
            sy = dragScrollSpeed(event.clientY - bottom);
        this.setScrollSpeed(sx, sy);
    }
    up(event) {
        if (this.dragging == null)
            this.select(this.lastEvent);
        if (!this.dragging)
            event.preventDefault();
        this.destroy();
    }
    destroy() {
        this.setScrollSpeed(0, 0);
        let doc = this.view.contentDOM.ownerDocument;
        doc.removeEventListener("mousemove", this.move);
        doc.removeEventListener("mouseup", this.up);
        this.view.inputState.mouseSelection = this.view.inputState.draggedContent = null;
    }
    setScrollSpeed(sx, sy) {
        this.scrollSpeed = { x: sx, y: sy };
        if (sx || sy) {
            if (this.scrolling < 0)
                this.scrolling = setInterval(() => this.scroll(), 50);
        }
        else if (this.scrolling > -1) {
            clearInterval(this.scrolling);
            this.scrolling = -1;
        }
    }
    scroll() {
        let { x, y } = this.scrollSpeed;
        if (x && this.scrollParents.x) {
            this.scrollParents.x.scrollLeft += x;
            x = 0;
        }
        if (y && this.scrollParents.y) {
            this.scrollParents.y.scrollTop += y;
            y = 0;
        }
        if (x || y)
            this.view.win.scrollBy(x, y);
        if (this.dragging === false)
            this.select(this.lastEvent);
    }
    select(event) {
        let { view } = this, selection = skipAtomsForSelection(this.atoms, this.style.get(event, this.extend, this.multiple));
        if (this.mustSelect || !selection.eq(view.state.selection, this.dragging === false))
            this.view.dispatch({
                selection,
                userEvent: "select.pointer"
            });
        this.mustSelect = false;
    }
    update(update) {
        if (update.transactions.some(tr => tr.isUserEvent("input.type")))
            this.destroy();
        else if (this.style.update(update))
            setTimeout(() => this.select(this.lastEvent), 20);
    }
}
function addsSelectionRange(view, event) {
    let facet = view.state.facet(clickAddsSelectionRange);
    return facet.length ? facet[0](event) : browser.mac ? event.metaKey : event.ctrlKey;
}
function dragMovesSelection(view, event) {
    let facet = view.state.facet(dragMovesSelection$1);
    return facet.length ? facet[0](event) : browser.mac ? !event.altKey : !event.ctrlKey;
}
function isInPrimarySelection(view, event) {
    let { main } = view.state.selection;
    if (main.empty)
        return false;
    // On boundary clicks, check whether the coordinates are inside the
    // selection's client rectangles
    let sel = getSelection(view.root);
    if (!sel || sel.rangeCount == 0)
        return true;
    let rects = sel.getRangeAt(0).getClientRects();
    for (let i = 0; i < rects.length; i++) {
        let rect = rects[i];
        if (rect.left <= event.clientX && rect.right >= event.clientX &&
            rect.top <= event.clientY && rect.bottom >= event.clientY)
            return true;
    }
    return false;
}
function eventBelongsToEditor(view, event) {
    if (!event.bubbles)
        return true;
    if (event.defaultPrevented)
        return false;
    for (let node = event.target, tile; node != view.contentDOM; node = node.parentNode)
        if (!node || node.nodeType == 11 ||
            ((tile = Tile.get(node)) && tile.isWidget() && !tile.isHidden && tile.widget.ignoreEvent(event)))
            return false;
    return true;
}
const handlers = Object.create(null);
const observers = Object.create(null);
// This is very crude, but unfortunately both these browsers _pretend_
// that they have a clipboard API—all the objects and methods are
// there, they just don't work, and they are hard to test.
const brokenClipboardAPI = (browser.ie && browser.ie_version < 15) ||
    (browser.ios && browser.webkit_version < 604);
function capturePaste(view) {
    let parent = view.dom.parentNode;
    if (!parent)
        return;
    let target = parent.appendChild(document.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.focus();
    setTimeout(() => {
        view.focus();
        target.remove();
        doPaste(view, target.value);
    }, 50);
}
function textFilter(state, facet, text) {
    for (let filter of state.facet(facet))
        text = filter(text, state);
    return text;
}
function doPaste(view, input) {
    input = textFilter(view.state, clipboardInputFilter, input);
    let { state: state$1 } = view, changes, i = 1, text = state$1.toText(input);
    let byLine = text.lines == state$1.selection.ranges.length;
    let linewise = lastLinewiseCopy != null && state$1.selection.ranges.every(r => r.empty) && lastLinewiseCopy == text.toString();
    if (linewise) {
        let lastLine = -1;
        changes = state$1.changeByRange(range => {
            let line = state$1.doc.lineAt(range.from);
            if (line.from == lastLine)
                return { range };
            lastLine = line.from;
            let insert = state$1.toText((byLine ? text.line(i++).text : input) + state$1.lineBreak);
            return { changes: { from: line.from, insert },
                range: state.EditorSelection.cursor(range.from + insert.length) };
        });
    }
    else if (byLine) {
        changes = state$1.changeByRange(range => {
            let line = text.line(i++);
            return { changes: { from: range.from, to: range.to, insert: line.text },
                range: state.EditorSelection.cursor(range.from + line.length) };
        });
    }
    else {
        changes = state$1.replaceSelection(text);
    }
    view.dispatch(changes, {
        userEvent: "input.paste",
        scrollIntoView: true
    });
}
observers.scroll = view => {
    view.inputState.lastScrollTop = view.scrollDOM.scrollTop;
    view.inputState.lastScrollLeft = view.scrollDOM.scrollLeft;
};
handlers.keydown = (view, event) => {
    view.inputState.setSelectionOrigin("select");
    if (event.keyCode == 27 && view.inputState.tabFocusMode != 0)
        view.inputState.tabFocusMode = Date.now() + 2000;
    return false;
};
observers.touchstart = (view, e) => {
    view.inputState.lastTouchTime = Date.now();
    view.inputState.setSelectionOrigin("select.pointer");
};
observers.touchmove = view => {
    view.inputState.setSelectionOrigin("select.pointer");
};
handlers.mousedown = (view, event) => {
    view.observer.flush();
    if (view.inputState.lastTouchTime > Date.now() - 2000)
        return false; // Ignore touch interaction
    let style = null;
    for (let makeStyle of view.state.facet(mouseSelectionStyle)) {
        style = makeStyle(view, event);
        if (style)
            break;
    }
    if (!style && event.button == 0)
        style = basicMouseSelection(view, event);
    if (style) {
        let mustFocus = !view.hasFocus;
        view.inputState.startMouseSelection(new MouseSelection(view, event, style, mustFocus));
        if (mustFocus)
            view.observer.ignore(() => {
                focusPreventScroll(view.contentDOM);
                let active = view.root.activeElement;
                if (active && !active.contains(view.contentDOM))
                    active.blur();
            });
        let mouseSel = view.inputState.mouseSelection;
        if (mouseSel) {
            mouseSel.start(event);
            return mouseSel.dragging === false;
        }
    }
    else {
        view.inputState.setSelectionOrigin("select.pointer");
    }
    return false;
};
function rangeForClick(view, pos, bias, type) {
    if (type == 1) { // Single click
        return state.EditorSelection.cursor(pos, bias);
    }
    else if (type == 2) { // Double click
        return groupAt(view.state, pos, bias);
    }
    else { // Triple click
        let visual = view.docView.lineAt(pos, bias), line = view.state.doc.lineAt(visual ? visual.posAtEnd : pos);
        let from = visual ? visual.posAtStart : line.from, to = visual ? visual.posAtEnd : line.to;
        if (to < view.state.doc.length && to == line.to)
            to++;
        return state.EditorSelection.range(from, to);
    }
}
const BadMouseDetail = browser.ie && browser.ie_version <= 11;
let lastMouseDown = null, lastMouseDownCount = 0, lastMouseDownTime = 0;
function getClickType(event) {
    if (!BadMouseDetail)
        return event.detail;
    let last = lastMouseDown, lastTime = lastMouseDownTime;
    lastMouseDown = event;
    lastMouseDownTime = Date.now();
    return lastMouseDownCount = !last || (lastTime > Date.now() - 400 && Math.abs(last.clientX - event.clientX) < 2 &&
        Math.abs(last.clientY - event.clientY) < 2) ? (lastMouseDownCount + 1) % 3 : 1;
}
function basicMouseSelection(view, event) {
    let start = view.posAndSideAtCoords({ x: event.clientX, y: event.clientY }, false), type = getClickType(event);
    let startSel = view.state.selection;
    return {
        update(update) {
            if (update.docChanged) {
                start.pos = update.changes.mapPos(start.pos);
                startSel = startSel.map(update.changes);
            }
        },
        get(event, extend, multiple) {
            let cur = view.posAndSideAtCoords({ x: event.clientX, y: event.clientY }, false), removed;
            let range = rangeForClick(view, cur.pos, cur.assoc, type);
            if (start.pos != cur.pos && !extend) {
                let startRange = rangeForClick(view, start.pos, start.assoc, type);
                let from = Math.min(startRange.from, range.from), to = Math.max(startRange.to, range.to);
                range = from < range.from ? state.EditorSelection.range(from, to) : state.EditorSelection.range(to, from);
            }
            if (extend)
                return startSel.replaceRange(startSel.main.extend(range.from, range.to));
            else if (multiple && type == 1 && startSel.ranges.length > 1 && (removed = removeRangeAround(startSel, cur.pos)))
                return removed;
            else if (multiple)
                return startSel.addRange(range);
            else
                return state.EditorSelection.create([range]);
        }
    };
}
function removeRangeAround(sel, pos) {
    for (let i = 0; i < sel.ranges.length; i++) {
        let { from, to } = sel.ranges[i];
        if (from <= pos && to >= pos)
            return state.EditorSelection.create(sel.ranges.slice(0, i).concat(sel.ranges.slice(i + 1)), sel.mainIndex == i ? 0 : sel.mainIndex - (sel.mainIndex > i ? 1 : 0));
    }
    return null;
}
handlers.dragstart = (view, event) => {
    let { selection: { main: range } } = view.state;
    if (event.target.draggable) {
        let tile = view.docView.tile.nearest(event.target);
        if (tile && tile.isWidget()) {
            let from = tile.posAtStart, to = from + tile.length;
            if (from >= range.to || to <= range.from)
                range = state.EditorSelection.range(from, to);
        }
    }
    let { inputState } = view;
    if (inputState.mouseSelection)
        inputState.mouseSelection.dragging = true;
    inputState.draggedContent = range;
    if (event.dataTransfer) {
        event.dataTransfer.setData("Text", textFilter(view.state, clipboardOutputFilter, view.state.sliceDoc(range.from, range.to)));
        event.dataTransfer.effectAllowed = "copyMove";
    }
    return false;
};
handlers.dragend = view => {
    view.inputState.draggedContent = null;
    return false;
};
function dropText(view, event, text, direct) {
    text = textFilter(view.state, clipboardInputFilter, text);
    if (!text)
        return;
    let dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
    let { draggedContent } = view.inputState;
    let del = direct && draggedContent && dragMovesSelection(view, event)
        ? { from: draggedContent.from, to: draggedContent.to } : null;
    let ins = { from: dropPos, insert: text };
    let changes = view.state.changes(del ? [del, ins] : ins);
    view.focus();
    view.dispatch({
        changes,
        selection: { anchor: changes.mapPos(dropPos, -1), head: changes.mapPos(dropPos, 1) },
        userEvent: del ? "move.drop" : "input.drop"
    });
    view.inputState.draggedContent = null;
}
handlers.drop = (view, event) => {
    if (!event.dataTransfer)
        return false;
    if (view.state.readOnly)
        return true;
    let files = event.dataTransfer.files;
    if (files && files.length) { // For a file drop, read the file's text.
        let text = Array(files.length), read = 0;
        let finishFile = () => {
            if (++read == files.length)
                dropText(view, event, text.filter(s => s != null).join(view.state.lineBreak), false);
        };
        for (let i = 0; i < files.length; i++) {
            let reader = new FileReader;
            reader.onerror = finishFile;
            reader.onload = () => {
                if (!/[\x00-\x08\x0e-\x1f]{2}/.test(reader.result))
                    text[i] = reader.result;
                finishFile();
            };
            reader.readAsText(files[i]);
        }
        return true;
    }
    else {
        let text = event.dataTransfer.getData("Text");
        if (text) {
            dropText(view, event, text, true);
            return true;
        }
    }
    return false;
};
handlers.paste = (view, event) => {
    if (view.state.readOnly)
        return true;
    view.observer.flush();
    let data = brokenClipboardAPI ? null : event.clipboardData;
    if (data) {
        doPaste(view, data.getData("text/plain") || data.getData("text/uri-list"));
        return true;
    }
    else {
        capturePaste(view);
        return false;
    }
};
function captureCopy(view, text) {
    // The extra wrapper is somehow necessary on IE/Edge to prevent the
    // content from being mangled when it is put onto the clipboard
    let parent = view.dom.parentNode;
    if (!parent)
        return;
    let target = parent.appendChild(document.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.value = text;
    target.focus();
    target.selectionEnd = text.length;
    target.selectionStart = 0;
    setTimeout(() => {
        target.remove();
        view.focus();
    }, 50);
}
function copiedRange(state) {
    let content = [], ranges = [], linewise = false;
    for (let range of state.selection.ranges)
        if (!range.empty) {
            content.push(state.sliceDoc(range.from, range.to));
            ranges.push(range);
        }
    if (!content.length) {
        // Nothing selected, do a line-wise copy
        let upto = -1;
        for (let { from } of state.selection.ranges) {
            let line = state.doc.lineAt(from);
            if (line.number > upto) {
                content.push(line.text);
                ranges.push({ from: line.from, to: Math.min(state.doc.length, line.to + 1) });
            }
            upto = line.number;
        }
        linewise = true;
    }
    return { text: textFilter(state, clipboardOutputFilter, content.join(state.lineBreak)), ranges, linewise };
}
let lastLinewiseCopy = null;
handlers.copy = handlers.cut = (view, event) => {
    let { text, ranges, linewise } = copiedRange(view.state);
    if (!text && !linewise)
        return false;
    lastLinewiseCopy = linewise ? text : null;
    if (event.type == "cut" && !view.state.readOnly)
        view.dispatch({
            changes: ranges,
            scrollIntoView: true,
            userEvent: "delete.cut"
        });
    let data = brokenClipboardAPI ? null : event.clipboardData;
    if (data) {
        data.clearData();
        data.setData("text/plain", text);
        return true;
    }
    else {
        captureCopy(view, text);
        return false;
    }
};
const isFocusChange = state.Annotation.define();
function focusChangeTransaction(state, focus) {
    let effects = [];
    for (let getEffect of state.facet(focusChangeEffect)) {
        let effect = getEffect(state, focus);
        if (effect)
            effects.push(effect);
    }
    return effects.length ? state.update({ effects, annotations: isFocusChange.of(true) }) : null;
}
function updateForFocusChange(view) {
    setTimeout(() => {
        let focus = view.hasFocus;
        if (focus != view.inputState.notifiedFocused) {
            let tr = focusChangeTransaction(view.state, focus);
            if (tr)
                view.dispatch(tr);
            else
                view.update([]);
        }
    }, 10);
}
observers.focus = view => {
    view.inputState.lastFocusTime = Date.now();
    // When focusing reset the scroll position, move it back to where it was
    if (!view.scrollDOM.scrollTop && (view.inputState.lastScrollTop || view.inputState.lastScrollLeft)) {
        view.scrollDOM.scrollTop = view.inputState.lastScrollTop;
        view.scrollDOM.scrollLeft = view.inputState.lastScrollLeft;
    }
    updateForFocusChange(view);
};
observers.blur = view => {
    view.observer.clearSelectionRange();
    updateForFocusChange(view);
};
observers.compositionstart = observers.compositionupdate = view => {
    if (view.observer.editContext)
        return; // Composition handled by edit context
    if (view.inputState.compositionFirstChange == null)
        view.inputState.compositionFirstChange = true;
    if (view.inputState.composing < 0) {
        // FIXME possibly set a timeout to clear it again on Android
        view.inputState.composing = 0;
    }
};
observers.compositionend = view => {
    if (view.observer.editContext)
        return; // Composition handled by edit context
    view.inputState.composing = -1;
    view.inputState.compositionEndedAt = Date.now();
    view.inputState.compositionPendingKey = true;
    view.inputState.compositionPendingChange = view.observer.pendingRecords().length > 0;
    view.inputState.compositionFirstChange = null;
    if (browser.chrome && browser.android) {
        // Delay flushing for a bit on Android because it'll often fire a
        // bunch of contradictory changes in a row at end of compositon
        view.observer.flushSoon();
    }
    else if (view.inputState.compositionPendingChange) {
        // If we found pending records, schedule a flush.
        Promise.resolve().then(() => view.observer.flush());
    }
    else {
        // Otherwise, make sure that, if no changes come in soon, the
        // composition view is cleared.
        setTimeout(() => {
            if (view.inputState.composing < 0 && view.docView.hasComposition)
                view.update([]);
        }, 50);
    }
};
observers.contextmenu = view => {
    view.inputState.lastContextMenu = Date.now();
};
handlers.beforeinput = (view, event) => {
    var _a, _b;
    if (event.inputType == "insertText" || event.inputType == "insertCompositionText") {
        view.inputState.insertingText = event.data;
        view.inputState.insertingTextAt = Date.now();
    }
    // In EditContext mode, we must handle insertReplacementText events
    // directly, to make spell checking corrections work
    if (event.inputType == "insertReplacementText" && view.observer.editContext) {
        let text = (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData("text/plain"), ranges = event.getTargetRanges();
        if (text && ranges.length) {
            let r = ranges[0];
            let from = view.posAtDOM(r.startContainer, r.startOffset), to = view.posAtDOM(r.endContainer, r.endOffset);
            applyDOMChangeInner(view, { from, to, insert: view.state.toText(text) }, null);
            return true;
        }
    }
    // Because Chrome Android doesn't fire useful key events, use
    // beforeinput to detect backspace (and possibly enter and delete,
    // but those usually don't even seem to fire beforeinput events at
    // the moment) and fake a key event for it.
    //
    // (preventDefault on beforeinput, though supported in the spec,
    // seems to do nothing at all on Chrome).
    let pending;
    if (browser.chrome && browser.android && (pending = PendingKeys.find(key => key.inputType == event.inputType))) {
        view.observer.delayAndroidKey(pending.key, pending.keyCode);
        if (pending.key == "Backspace" || pending.key == "Delete") {
            let startViewHeight = ((_b = window.visualViewport) === null || _b === void 0 ? void 0 : _b.height) || 0;
            setTimeout(() => {
                var _a;
                // Backspacing near uneditable nodes on Chrome Android sometimes
                // closes the virtual keyboard. This tries to crudely detect
                // that and refocus to get it back.
                if ((((_a = window.visualViewport) === null || _a === void 0 ? void 0 : _a.height) || 0) > startViewHeight + 10 && view.hasFocus) {
                    view.contentDOM.blur();
                    view.focus();
                }
            }, 100);
        }
    }
    if (browser.ios && event.inputType == "deleteContentForward") {
        // For some reason, DOM changes (and beforeinput) happen _before_
        // the key event for ctrl-d on iOS when using an external
        // keyboard.
        view.observer.flushSoon();
    }
    // Safari will occasionally forget to fire compositionend at the end of a dead-key composition
    if (browser.safari && event.inputType == "insertText" && view.inputState.composing >= 0) {
        setTimeout(() => observers.compositionend(view, event), 20);
    }
    return false;
};
const appliedFirefoxHack = new Set;
// In Firefox, when cut/copy handlers are added to the document, that
// somehow avoids a bug where those events aren't fired when the
// selection is empty. See https://github.com/codemirror/dev/issues/1082
// and https://bugzilla.mozilla.org/show_bug.cgi?id=995961
function firefoxCopyCutHack(doc) {
    if (!appliedFirefoxHack.has(doc)) {
        appliedFirefoxHack.add(doc);
        doc.addEventListener("copy", () => { });
        doc.addEventListener("cut", () => { });
    }
}

const wrappingWhiteSpace = ["pre-wrap", "normal", "pre-line", "break-spaces"];
// Used to track, during updateHeight, if any actual heights changed
let heightChangeFlag = false;
function clearHeightChangeFlag() { heightChangeFlag = false; }
class HeightOracle {
    constructor(lineWrapping) {
        this.lineWrapping = lineWrapping;
        this.doc = state.Text.empty;
        this.heightSamples = {};
        this.lineHeight = 14; // The height of an entire line (line-height)
        this.charWidth = 7;
        this.textHeight = 14; // The height of the actual font (font-size)
        this.lineLength = 30;
    }
    heightForGap(from, to) {
        let lines = this.doc.lineAt(to).number - this.doc.lineAt(from).number + 1;
        if (this.lineWrapping)
            lines += Math.max(0, Math.ceil(((to - from) - (lines * this.lineLength * 0.5)) / this.lineLength));
        return this.lineHeight * lines;
    }
    heightForLine(length) {
        if (!this.lineWrapping)
            return this.lineHeight;
        let lines = 1 + Math.max(0, Math.ceil((length - this.lineLength) / Math.max(1, this.lineLength - 5)));
        return lines * this.lineHeight;
    }
    setDoc(doc) { this.doc = doc; return this; }
    mustRefreshForWrapping(whiteSpace) {
        return (wrappingWhiteSpace.indexOf(whiteSpace) > -1) != this.lineWrapping;
    }
    mustRefreshForHeights(lineHeights) {
        let newHeight = false;
        for (let i = 0; i < lineHeights.length; i++) {
            let h = lineHeights[i];
            if (h < 0) {
                i++;
            }
            else if (!this.heightSamples[Math.floor(h * 10)]) { // Round to .1 pixels
                newHeight = true;
                this.heightSamples[Math.floor(h * 10)] = true;
            }
        }
        return newHeight;
    }
    refresh(whiteSpace, lineHeight, charWidth, textHeight, lineLength, knownHeights) {
        let lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
        let changed = Math.round(lineHeight) != Math.round(this.lineHeight) || this.lineWrapping != lineWrapping;
        this.lineWrapping = lineWrapping;
        this.lineHeight = lineHeight;
        this.charWidth = charWidth;
        this.textHeight = textHeight;
        this.lineLength = lineLength;
        if (changed) {
            this.heightSamples = {};
            for (let i = 0; i < knownHeights.length; i++) {
                let h = knownHeights[i];
                if (h < 0)
                    i++;
                else
                    this.heightSamples[Math.floor(h * 10)] = true;
            }
        }
        return changed;
    }
}
// This object is used by `updateHeight` to make DOM measurements
// arrive at the right nodes. The `heights` array is a sequence of
// block heights, starting from position `from`.
class MeasuredHeights {
    constructor(from, heights) {
        this.from = from;
        this.heights = heights;
        this.index = 0;
    }
    get more() { return this.index < this.heights.length; }
}
/**
Record used to represent information about a block-level element
in the editor view.
*/
class BlockInfo {
    /**
    @internal
    */
    constructor(
    /**
    The start of the element in the document.
    */
    from, 
    /**
    The length of the element.
    */
    length, 
    /**
    The top position of the element (relative to the top of the
    document).
    */
    top, 
    /**
    Its height.
    */
    height, 
    /**
    @internal Weird packed field that holds an array of children
    for composite blocks, a decoration for block widgets, and a
    number indicating the amount of widget-created line breaks for
    text blocks.
    */
    _content) {
        this.from = from;
        this.length = length;
        this.top = top;
        this.height = height;
        this._content = _content;
    }
    /**
    The type of element this is. When querying lines, this may be
    an array of all the blocks that make up the line.
    */
    get type() {
        return typeof this._content == "number" ? exports.BlockType.Text :
            Array.isArray(this._content) ? this._content : this._content.type;
    }
    /**
    The end of the element as a document position.
    */
    get to() { return this.from + this.length; }
    /**
    The bottom position of the element.
    */
    get bottom() { return this.top + this.height; }
    /**
    If this is a widget block, this will return the widget
    associated with it.
    */
    get widget() {
        return this._content instanceof PointDecoration ? this._content.widget : null;
    }
    /**
    If this is a textblock, this holds the number of line breaks
    that appear in widgets inside the block.
    */
    get widgetLineBreaks() {
        return typeof this._content == "number" ? this._content : 0;
    }
    /**
    @internal
    */
    join(other) {
        let content = (Array.isArray(this._content) ? this._content : [this])
            .concat(Array.isArray(other._content) ? other._content : [other]);
        return new BlockInfo(this.from, this.length + other.length, this.top, this.height + other.height, content);
    }
}
var QueryType;
(function (QueryType) {
    QueryType[QueryType["ByPos"] = 0] = "ByPos";
    QueryType[QueryType["ByHeight"] = 1] = "ByHeight";
    QueryType[QueryType["ByPosNoHeight"] = 2] = "ByPosNoHeight";
})(QueryType || (QueryType = {}));
const Epsilon = 1e-3;
class HeightMap {
    constructor(length, // The number of characters covered
    height, // Height of this part of the document
    flags = 2 /* Flag.Outdated */) {
        this.length = length;
        this.height = height;
        this.flags = flags;
    }
    get outdated() { return (this.flags & 2 /* Flag.Outdated */) > 0; }
    set outdated(value) { this.flags = (value ? 2 /* Flag.Outdated */ : 0) | (this.flags & ~2 /* Flag.Outdated */); }
    setHeight(height) {
        if (this.height != height) {
            if (Math.abs(this.height - height) > Epsilon)
                heightChangeFlag = true;
            this.height = height;
        }
    }
    // Base case is to replace a leaf node, which simply builds a tree
    // from the new nodes and returns that (HeightMapBranch and
    // HeightMapGap override this to actually use from/to)
    replace(_from, _to, nodes) {
        return HeightMap.of(nodes);
    }
    // Again, these are base cases, and are overridden for branch and gap nodes.
    decomposeLeft(_to, result) { result.push(this); }
    decomposeRight(_from, result) { result.push(this); }
    applyChanges(decorations, oldDoc, oracle, changes) {
        let me = this, doc = oracle.doc;
        for (let i = changes.length - 1; i >= 0; i--) {
            let { fromA, toA, fromB, toB } = changes[i];
            let start = me.lineAt(fromA, QueryType.ByPosNoHeight, oracle.setDoc(oldDoc), 0, 0);
            let end = start.to >= toA ? start : me.lineAt(toA, QueryType.ByPosNoHeight, oracle, 0, 0);
            toB += end.to - toA;
            toA = end.to;
            while (i > 0 && start.from <= changes[i - 1].toA) {
                fromA = changes[i - 1].fromA;
                fromB = changes[i - 1].fromB;
                i--;
                if (fromA < start.from)
                    start = me.lineAt(fromA, QueryType.ByPosNoHeight, oracle, 0, 0);
            }
            fromB += start.from - fromA;
            fromA = start.from;
            let nodes = NodeBuilder.build(oracle.setDoc(doc), decorations, fromB, toB);
            me = replace(me, me.replace(fromA, toA, nodes));
        }
        return me.updateHeight(oracle, 0);
    }
    static empty() { return new HeightMapText(0, 0, 0); }
    // nodes uses null values to indicate the position of line breaks.
    // There are never line breaks at the start or end of the array, or
    // two line breaks next to each other, and the array isn't allowed
    // to be empty (same restrictions as return value from the builder).
    static of(nodes) {
        if (nodes.length == 1)
            return nodes[0];
        let i = 0, j = nodes.length, before = 0, after = 0;
        for (;;) {
            if (i == j) {
                if (before > after * 2) {
                    let split = nodes[i - 1];
                    if (split.break)
                        nodes.splice(--i, 1, split.left, null, split.right);
                    else
                        nodes.splice(--i, 1, split.left, split.right);
                    j += 1 + split.break;
                    before -= split.size;
                }
                else if (after > before * 2) {
                    let split = nodes[j];
                    if (split.break)
                        nodes.splice(j, 1, split.left, null, split.right);
                    else
                        nodes.splice(j, 1, split.left, split.right);
                    j += 2 + split.break;
                    after -= split.size;
                }
                else {
                    break;
                }
            }
            else if (before < after) {
                let next = nodes[i++];
                if (next)
                    before += next.size;
            }
            else {
                let next = nodes[--j];
                if (next)
                    after += next.size;
            }
        }
        let brk = 0;
        if (nodes[i - 1] == null) {
            brk = 1;
            i--;
        }
        else if (nodes[i] == null) {
            brk = 1;
            j++;
        }
        return new HeightMapBranch(HeightMap.of(nodes.slice(0, i)), brk, HeightMap.of(nodes.slice(j)));
    }
}
function replace(old, val) {
    if (old == val)
        return old;
    if (old.constructor != val.constructor)
        heightChangeFlag = true;
    return val;
}
HeightMap.prototype.size = 1;
const SpaceDeco = Decoration.replace({});
class HeightMapBlock extends HeightMap {
    constructor(length, height, deco) {
        super(length, height);
        this.deco = deco;
        this.spaceAbove = 0;
    }
    mainBlock(top, offset) {
        return new BlockInfo(offset, this.length, top + this.spaceAbove, this.height - this.spaceAbove, this.deco || 0);
    }
    blockAt(height, _oracle, top, offset) {
        return this.spaceAbove && height < top + this.spaceAbove ? new BlockInfo(offset, 0, top, this.spaceAbove, SpaceDeco)
            : this.mainBlock(top, offset);
    }
    lineAt(_value, _type, oracle, top, offset) {
        let main = this.mainBlock(top, offset);
        return this.spaceAbove ? this.blockAt(0, oracle, top, offset).join(main) : main;
    }
    forEachLine(from, to, oracle, top, offset, f) {
        if (from <= offset + this.length && to >= offset)
            f(this.lineAt(0, QueryType.ByPos, oracle, top, offset));
    }
    setMeasuredHeight(measured) {
        let next = measured.heights[measured.index++];
        if (next < 0) {
            this.spaceAbove = -next;
            next = measured.heights[measured.index++];
        }
        else {
            this.spaceAbove = 0;
        }
        this.setHeight(next);
    }
    updateHeight(oracle, offset = 0, _force = false, measured) {
        if (measured && measured.from <= offset && measured.more)
            this.setMeasuredHeight(measured);
        this.outdated = false;
        return this;
    }
    toString() { return `block(${this.length})`; }
}
class HeightMapText extends HeightMapBlock {
    constructor(length, height, above) {
        super(length, height, null);
        this.collapsed = 0; // Amount of collapsed content in the line
        this.widgetHeight = 0; // Maximum inline widget height
        this.breaks = 0; // Number of widget-introduced line breaks on the line
        this.spaceAbove = above;
    }
    mainBlock(top, offset) {
        return new BlockInfo(offset, this.length, top + this.spaceAbove, this.height - this.spaceAbove, this.breaks);
    }
    replace(_from, _to, nodes) {
        let node = nodes[0];
        if (nodes.length == 1 && (node instanceof HeightMapText || node instanceof HeightMapGap && (node.flags & 4 /* Flag.SingleLine */)) &&
            Math.abs(this.length - node.length) < 10) {
            if (node instanceof HeightMapGap)
                node = new HeightMapText(node.length, this.height, this.spaceAbove);
            else
                node.height = this.height;
            if (!this.outdated)
                node.outdated = false;
            return node;
        }
        else {
            return HeightMap.of(nodes);
        }
    }
    updateHeight(oracle, offset = 0, force = false, measured) {
        if (measured && measured.from <= offset && measured.more) {
            this.setMeasuredHeight(measured);
        }
        else if (force || this.outdated) {
            this.spaceAbove = 0;
            this.setHeight(Math.max(this.widgetHeight, oracle.heightForLine(this.length - this.collapsed)) +
                this.breaks * oracle.lineHeight);
        }
        this.outdated = false;
        return this;
    }
    toString() {
        return `line(${this.length}${this.collapsed ? -this.collapsed : ""}${this.widgetHeight ? ":" + this.widgetHeight : ""})`;
    }
}
class HeightMapGap extends HeightMap {
    constructor(length) { super(length, 0); }
    heightMetrics(oracle, offset) {
        let firstLine = oracle.doc.lineAt(offset).number, lastLine = oracle.doc.lineAt(offset + this.length).number;
        let lines = lastLine - firstLine + 1;
        let perLine, perChar = 0;
        if (oracle.lineWrapping) {
            let totalPerLine = Math.min(this.height, oracle.lineHeight * lines);
            perLine = totalPerLine / lines;
            if (this.length > lines + 1)
                perChar = (this.height - totalPerLine) / (this.length - lines - 1);
        }
        else {
            perLine = this.height / lines;
        }
        return { firstLine, lastLine, perLine, perChar };
    }
    blockAt(height, oracle, top, offset) {
        let { firstLine, lastLine, perLine, perChar } = this.heightMetrics(oracle, offset);
        if (oracle.lineWrapping) {
            let guess = offset + (height < oracle.lineHeight ? 0
                : Math.round(Math.max(0, Math.min(1, (height - top) / this.height)) * this.length));
            let line = oracle.doc.lineAt(guess), lineHeight = perLine + line.length * perChar;
            let lineTop = Math.max(top, height - lineHeight / 2);
            return new BlockInfo(line.from, line.length, lineTop, lineHeight, 0);
        }
        else {
            let line = Math.max(0, Math.min(lastLine - firstLine, Math.floor((height - top) / perLine)));
            let { from, length } = oracle.doc.line(firstLine + line);
            return new BlockInfo(from, length, top + perLine * line, perLine, 0);
        }
    }
    lineAt(value, type, oracle, top, offset) {
        if (type == QueryType.ByHeight)
            return this.blockAt(value, oracle, top, offset);
        if (type == QueryType.ByPosNoHeight) {
            let { from, to } = oracle.doc.lineAt(value);
            return new BlockInfo(from, to - from, 0, 0, 0);
        }
        let { firstLine, perLine, perChar } = this.heightMetrics(oracle, offset);
        let line = oracle.doc.lineAt(value), lineHeight = perLine + line.length * perChar;
        let linesAbove = line.number - firstLine;
        let lineTop = top + perLine * linesAbove + perChar * (line.from - offset - linesAbove);
        return new BlockInfo(line.from, line.length, Math.max(top, Math.min(lineTop, top + this.height - lineHeight)), lineHeight, 0);
    }
    forEachLine(from, to, oracle, top, offset, f) {
        from = Math.max(from, offset);
        to = Math.min(to, offset + this.length);
        let { firstLine, perLine, perChar } = this.heightMetrics(oracle, offset);
        for (let pos = from, lineTop = top; pos <= to;) {
            let line = oracle.doc.lineAt(pos);
            if (pos == from) {
                let linesAbove = line.number - firstLine;
                lineTop += perLine * linesAbove + perChar * (from - offset - linesAbove);
            }
            let lineHeight = perLine + perChar * line.length;
            f(new BlockInfo(line.from, line.length, lineTop, lineHeight, 0));
            lineTop += lineHeight;
            pos = line.to + 1;
        }
    }
    replace(from, to, nodes) {
        let after = this.length - to;
        if (after > 0) {
            let last = nodes[nodes.length - 1];
            if (last instanceof HeightMapGap)
                nodes[nodes.length - 1] = new HeightMapGap(last.length + after);
            else
                nodes.push(null, new HeightMapGap(after - 1));
        }
        if (from > 0) {
            let first = nodes[0];
            if (first instanceof HeightMapGap)
                nodes[0] = new HeightMapGap(from + first.length);
            else
                nodes.unshift(new HeightMapGap(from - 1), null);
        }
        return HeightMap.of(nodes);
    }
    decomposeLeft(to, result) {
        result.push(new HeightMapGap(to - 1), null);
    }
    decomposeRight(from, result) {
        result.push(null, new HeightMapGap(this.length - from - 1));
    }
    updateHeight(oracle, offset = 0, force = false, measured) {
        let end = offset + this.length;
        if (measured && measured.from <= offset + this.length && measured.more) {
            // Fill in part of this gap with measured lines. We know there
            // can't be widgets or collapsed ranges in those lines, because
            // they would already have been added to the heightmap (gaps
            // only contain plain text).
            let nodes = [], pos = Math.max(offset, measured.from), singleHeight = -1;
            if (measured.from > offset)
                nodes.push(new HeightMapGap(measured.from - offset - 1).updateHeight(oracle, offset));
            while (pos <= end && measured.more) {
                let len = oracle.doc.lineAt(pos).length;
                if (nodes.length)
                    nodes.push(null);
                let height = measured.heights[measured.index++], above = 0;
                if (height < 0) {
                    above = -height;
                    height = measured.heights[measured.index++];
                }
                if (singleHeight == -1)
                    singleHeight = height;
                else if (Math.abs(height - singleHeight) >= Epsilon)
                    singleHeight = -2;
                let line = new HeightMapText(len, height, above);
                line.outdated = false;
                nodes.push(line);
                pos += len + 1;
            }
            if (pos <= end)
                nodes.push(null, new HeightMapGap(end - pos).updateHeight(oracle, pos));
            let result = HeightMap.of(nodes);
            if (singleHeight < 0 || Math.abs(result.height - this.height) >= Epsilon ||
                Math.abs(singleHeight - this.heightMetrics(oracle, offset).perLine) >= Epsilon)
                heightChangeFlag = true;
            return replace(this, result);
        }
        else if (force || this.outdated) {
            this.setHeight(oracle.heightForGap(offset, offset + this.length));
            this.outdated = false;
        }
        return this;
    }
    toString() { return `gap(${this.length})`; }
}
class HeightMapBranch extends HeightMap {
    constructor(left, brk, right) {
        super(left.length + brk + right.length, left.height + right.height, brk | (left.outdated || right.outdated ? 2 /* Flag.Outdated */ : 0));
        this.left = left;
        this.right = right;
        this.size = left.size + right.size;
    }
    get break() { return this.flags & 1 /* Flag.Break */; }
    blockAt(height, oracle, top, offset) {
        let mid = top + this.left.height;
        return height < mid ? this.left.blockAt(height, oracle, top, offset)
            : this.right.blockAt(height, oracle, mid, offset + this.left.length + this.break);
    }
    lineAt(value, type, oracle, top, offset) {
        let rightTop = top + this.left.height, rightOffset = offset + this.left.length + this.break;
        let left = type == QueryType.ByHeight ? value < rightTop : value < rightOffset;
        let base = left ? this.left.lineAt(value, type, oracle, top, offset)
            : this.right.lineAt(value, type, oracle, rightTop, rightOffset);
        if (this.break || (left ? base.to < rightOffset : base.from > rightOffset))
            return base;
        let subQuery = type == QueryType.ByPosNoHeight ? QueryType.ByPosNoHeight : QueryType.ByPos;
        if (left)
            return base.join(this.right.lineAt(rightOffset, subQuery, oracle, rightTop, rightOffset));
        else
            return this.left.lineAt(rightOffset, subQuery, oracle, top, offset).join(base);
    }
    forEachLine(from, to, oracle, top, offset, f) {
        let rightTop = top + this.left.height, rightOffset = offset + this.left.length + this.break;
        if (this.break) {
            if (from < rightOffset)
                this.left.forEachLine(from, to, oracle, top, offset, f);
            if (to >= rightOffset)
                this.right.forEachLine(from, to, oracle, rightTop, rightOffset, f);
        }
        else {
            let mid = this.lineAt(rightOffset, QueryType.ByPos, oracle, top, offset);
            if (from < mid.from)
                this.left.forEachLine(from, mid.from - 1, oracle, top, offset, f);
            if (mid.to >= from && mid.from <= to)
                f(mid);
            if (to > mid.to)
                this.right.forEachLine(mid.to + 1, to, oracle, rightTop, rightOffset, f);
        }
    }
    replace(from, to, nodes) {
        let rightStart = this.left.length + this.break;
        if (to < rightStart)
            return this.balanced(this.left.replace(from, to, nodes), this.right);
        if (from > this.left.length)
            return this.balanced(this.left, this.right.replace(from - rightStart, to - rightStart, nodes));
        let result = [];
        if (from > 0)
            this.decomposeLeft(from, result);
        let left = result.length;
        for (let node of nodes)
            result.push(node);
        if (from > 0)
            mergeGaps(result, left - 1);
        if (to < this.length) {
            let right = result.length;
            this.decomposeRight(to, result);
            mergeGaps(result, right);
        }
        return HeightMap.of(result);
    }
    decomposeLeft(to, result) {
        let left = this.left.length;
        if (to <= left)
            return this.left.decomposeLeft(to, result);
        result.push(this.left);
        if (this.break) {
            left++;
            if (to >= left)
                result.push(null);
        }
        if (to > left)
            this.right.decomposeLeft(to - left, result);
    }
    decomposeRight(from, result) {
        let left = this.left.length, right = left + this.break;
        if (from >= right)
            return this.right.decomposeRight(from - right, result);
        if (from < left)
            this.left.decomposeRight(from, result);
        if (this.break && from < right)
            result.push(null);
        result.push(this.right);
    }
    balanced(left, right) {
        if (left.size > 2 * right.size || right.size > 2 * left.size)
            return HeightMap.of(this.break ? [left, null, right] : [left, right]);
        this.left = replace(this.left, left);
        this.right = replace(this.right, right);
        this.setHeight(left.height + right.height);
        this.outdated = left.outdated || right.outdated;
        this.size = left.size + right.size;
        this.length = left.length + this.break + right.length;
        return this;
    }
    updateHeight(oracle, offset = 0, force = false, measured) {
        let { left, right } = this, rightStart = offset + left.length + this.break, rebalance = null;
        if (measured && measured.from <= offset + left.length && measured.more)
            rebalance = left = left.updateHeight(oracle, offset, force, measured);
        else
            left.updateHeight(oracle, offset, force);
        if (measured && measured.from <= rightStart + right.length && measured.more)
            rebalance = right = right.updateHeight(oracle, rightStart, force, measured);
        else
            right.updateHeight(oracle, rightStart, force);
        if (rebalance)
            return this.balanced(left, right);
        this.height = this.left.height + this.right.height;
        this.outdated = false;
        return this;
    }
    toString() { return this.left + (this.break ? " " : "-") + this.right; }
}
function mergeGaps(nodes, around) {
    let before, after;
    if (nodes[around] == null &&
        (before = nodes[around - 1]) instanceof HeightMapGap &&
        (after = nodes[around + 1]) instanceof HeightMapGap)
        nodes.splice(around - 1, 3, new HeightMapGap(before.length + 1 + after.length));
}
const relevantWidgetHeight = 5;
class NodeBuilder {
    constructor(pos, oracle) {
        this.pos = pos;
        this.oracle = oracle;
        this.nodes = [];
        this.lineStart = -1;
        this.lineEnd = -1;
        this.covering = null;
        this.writtenTo = pos;
    }
    get isCovered() {
        return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
    }
    span(_from, to) {
        if (this.lineStart > -1) {
            let end = Math.min(to, this.lineEnd), last = this.nodes[this.nodes.length - 1];
            if (last instanceof HeightMapText)
                last.length += end - this.pos;
            else if (end > this.pos || !this.isCovered)
                this.nodes.push(new HeightMapText(end - this.pos, -1, 0));
            this.writtenTo = end;
            if (to > end) {
                this.nodes.push(null);
                this.writtenTo++;
                this.lineStart = -1;
            }
        }
        this.pos = to;
    }
    point(from, to, deco) {
        if (from < to || deco.heightRelevant) {
            let height = deco.widget ? deco.widget.estimatedHeight : 0;
            let breaks = deco.widget ? deco.widget.lineBreaks : 0;
            if (height < 0)
                height = this.oracle.lineHeight;
            let len = to - from;
            if (deco.block) {
                this.addBlock(new HeightMapBlock(len, height, deco));
            }
            else if (len || breaks || height >= relevantWidgetHeight) {
                this.addLineDeco(height, breaks, len);
            }
        }
        else if (to > from) {
            this.span(from, to);
        }
        if (this.lineEnd > -1 && this.lineEnd < this.pos)
            this.lineEnd = this.oracle.doc.lineAt(this.pos).to;
    }
    enterLine() {
        if (this.lineStart > -1)
            return;
        let { from, to } = this.oracle.doc.lineAt(this.pos);
        this.lineStart = from;
        this.lineEnd = to;
        if (this.writtenTo < from) {
            if (this.writtenTo < from - 1 || this.nodes[this.nodes.length - 1] == null)
                this.nodes.push(this.blankContent(this.writtenTo, from - 1));
            this.nodes.push(null);
        }
        if (this.pos > from)
            this.nodes.push(new HeightMapText(this.pos - from, -1, 0));
        this.writtenTo = this.pos;
    }
    blankContent(from, to) {
        let gap = new HeightMapGap(to - from);
        if (this.oracle.doc.lineAt(from).to == to)
            gap.flags |= 4 /* Flag.SingleLine */;
        return gap;
    }
    ensureLine() {
        this.enterLine();
        let last = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
        if (last instanceof HeightMapText)
            return last;
        let line = new HeightMapText(0, -1, 0);
        this.nodes.push(line);
        return line;
    }
    addBlock(block) {
        this.enterLine();
        let deco = block.deco;
        if (deco && deco.startSide > 0 && !this.isCovered)
            this.ensureLine();
        this.nodes.push(block);
        this.writtenTo = this.pos = this.pos + block.length;
        if (deco && deco.endSide > 0)
            this.covering = block;
    }
    addLineDeco(height, breaks, length) {
        let line = this.ensureLine();
        line.length += length;
        line.collapsed += length;
        line.widgetHeight = Math.max(line.widgetHeight, height);
        line.breaks += breaks;
        this.writtenTo = this.pos = this.pos + length;
    }
    finish(from) {
        let last = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
        if (this.lineStart > -1 && !(last instanceof HeightMapText) && !this.isCovered)
            this.nodes.push(new HeightMapText(0, -1, 0));
        else if (this.writtenTo < this.pos || last == null)
            this.nodes.push(this.blankContent(this.writtenTo, this.pos));
        let pos = from;
        for (let node of this.nodes) {
            if (node instanceof HeightMapText)
                node.updateHeight(this.oracle, pos);
            pos += node ? node.length : 1;
        }
        return this.nodes;
    }
    // Always called with a region that on both sides either stretches
    // to a line break or the end of the document.
    // The returned array uses null to indicate line breaks, but never
    // starts or ends in a line break, or has multiple line breaks next
    // to each other.
    static build(oracle, decorations, from, to) {
        let builder = new NodeBuilder(from, oracle);
        state.RangeSet.spans(decorations, from, to, builder, 0);
        return builder.finish(from);
    }
}
function heightRelevantDecoChanges(a, b, diff) {
    let comp = new DecorationComparator;
    state.RangeSet.compare(a, b, diff, comp, 0);
    return comp.changes;
}
class DecorationComparator {
    constructor() {
        this.changes = [];
    }
    compareRange() { }
    comparePoint(from, to, a, b) {
        if (from < to || a && a.heightRelevant || b && b.heightRelevant)
            addRange(from, to, this.changes, 5);
    }
}

function visiblePixelRange(dom, paddingTop) {
    let rect = dom.getBoundingClientRect();
    let doc = dom.ownerDocument, win = doc.defaultView || window;
    let left = Math.max(0, rect.left), right = Math.min(win.innerWidth, rect.right);
    let top = Math.max(0, rect.top), bottom = Math.min(win.innerHeight, rect.bottom);
    for (let parent = dom.parentNode; parent && parent != doc.body;) {
        if (parent.nodeType == 1) {
            let elt = parent;
            let style = window.getComputedStyle(elt);
            if ((elt.scrollHeight > elt.clientHeight || elt.scrollWidth > elt.clientWidth) &&
                style.overflow != "visible") {
                let parentRect = elt.getBoundingClientRect();
                left = Math.max(left, parentRect.left);
                right = Math.min(right, parentRect.right);
                top = Math.max(top, parentRect.top);
                bottom = Math.min(parent == dom.parentNode ? win.innerHeight : bottom, parentRect.bottom);
            }
            parent = style.position == "absolute" || style.position == "fixed" ? elt.offsetParent : elt.parentNode;
        }
        else if (parent.nodeType == 11) { // Shadow root
            parent = parent.host;
        }
        else {
            break;
        }
    }
    return { left: left - rect.left, right: Math.max(left, right) - rect.left,
        top: top - (rect.top + paddingTop), bottom: Math.max(top, bottom) - (rect.top + paddingTop) };
}
function inWindow(elt) {
    let rect = elt.getBoundingClientRect(), win = elt.ownerDocument.defaultView || window;
    return rect.left < win.innerWidth && rect.right > 0 &&
        rect.top < win.innerHeight && rect.bottom > 0;
}
function fullPixelRange(dom, paddingTop) {
    let rect = dom.getBoundingClientRect();
    return { left: 0, right: rect.right - rect.left,
        top: paddingTop, bottom: rect.bottom - (rect.top + paddingTop) };
}
// Line gaps are placeholder widgets used to hide pieces of overlong
// lines within the viewport, as a kludge to keep the editor
// responsive when a ridiculously long line is loaded into it.
class LineGap {
    constructor(from, to, size, displaySize) {
        this.from = from;
        this.to = to;
        this.size = size;
        this.displaySize = displaySize;
    }
    static same(a, b) {
        if (a.length != b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            let gA = a[i], gB = b[i];
            if (gA.from != gB.from || gA.to != gB.to || gA.size != gB.size)
                return false;
        }
        return true;
    }
    draw(viewState, wrapping) {
        return Decoration.replace({
            widget: new LineGapWidget(this.displaySize * (wrapping ? viewState.scaleY : viewState.scaleX), wrapping)
        }).range(this.from, this.to);
    }
}
class LineGapWidget extends WidgetType {
    constructor(size, vertical) {
        super();
        this.size = size;
        this.vertical = vertical;
    }
    eq(other) { return other.size == this.size && other.vertical == this.vertical; }
    toDOM() {
        let elt = document.createElement("div");
        if (this.vertical) {
            elt.style.height = this.size + "px";
        }
        else {
            elt.style.width = this.size + "px";
            elt.style.height = "2px";
            elt.style.display = "inline-block";
        }
        return elt;
    }
    get estimatedHeight() { return this.vertical ? this.size : -1; }
}
class ViewState {
    constructor(state$1) {
        this.state = state$1;
        // These are contentDOM-local coordinates
        this.pixelViewport = { left: 0, right: window.innerWidth, top: 0, bottom: 0 };
        this.inView = true;
        this.paddingTop = 0; // Padding above the document, scaled
        this.paddingBottom = 0; // Padding below the document, scaled
        this.contentDOMWidth = 0; // contentDOM.getBoundingClientRect().width
        this.contentDOMHeight = 0; // contentDOM.getBoundingClientRect().height
        this.editorHeight = 0; // scrollDOM.clientHeight, unscaled
        this.editorWidth = 0; // scrollDOM.clientWidth, unscaled
        this.scrollTop = 0; // Last seen scrollDOM.scrollTop, scaled
        this.scrolledToBottom = false;
        // The CSS-transformation scale of the editor (transformed size /
        // concrete size)
        this.scaleX = 1;
        this.scaleY = 1;
        // The vertical position (document-relative) to which to anchor the
        // scroll position. -1 means anchor to the end of the document.
        this.scrollAnchorPos = 0;
        // The height at the anchor position. Set by the DOM update phase.
        // -1 means no height available.
        this.scrollAnchorHeight = -1;
        // See VP.MaxDOMHeight
        this.scaler = IdScaler;
        this.scrollTarget = null;
        // Briefly set to true when printing, to disable viewport limiting
        this.printing = false;
        // Flag set when editor content was redrawn, so that the next
        // measure stage knows it must read DOM layout
        this.mustMeasureContent = true;
        this.defaultTextDirection = exports.Direction.LTR;
        this.visibleRanges = [];
        // Cursor 'assoc' is only significant when the cursor is on a line
        // wrap point, where it must stick to the character that it is
        // associated with. Since browsers don't provide a reasonable
        // interface to set or query this, when a selection is set that
        // might cause this to be significant, this flag is set. The next
        // measure phase will check whether the cursor is on a line-wrapping
        // boundary and, if so, reset it to make sure it is positioned in
        // the right place.
        this.mustEnforceCursorAssoc = false;
        let guessWrapping = state$1.facet(contentAttributes).some(v => typeof v != "function" && v.class == "cm-lineWrapping");
        this.heightOracle = new HeightOracle(guessWrapping);
        this.stateDeco = state$1.facet(decorations).filter(d => typeof d != "function");
        this.heightMap = HeightMap.empty().applyChanges(this.stateDeco, state.Text.empty, this.heightOracle.setDoc(state$1.doc), [new ChangedRange(0, 0, 0, state$1.doc.length)]);
        for (let i = 0; i < 2; i++) {
            this.viewport = this.getViewport(0, null);
            if (!this.updateForViewport())
                break;
        }
        this.updateViewportLines();
        this.lineGaps = this.ensureLineGaps([]);
        this.lineGapDeco = Decoration.set(this.lineGaps.map(gap => gap.draw(this, false)));
        this.computeVisibleRanges();
    }
    updateForViewport() {
        let viewports = [this.viewport], { main } = this.state.selection;
        for (let i = 0; i <= 1; i++) {
            let pos = i ? main.head : main.anchor;
            if (!viewports.some(({ from, to }) => pos >= from && pos <= to)) {
                let { from, to } = this.lineBlockAt(pos);
                viewports.push(new Viewport(from, to));
            }
        }
        this.viewports = viewports.sort((a, b) => a.from - b.from);
        return this.updateScaler();
    }
    updateScaler() {
        let scaler = this.scaler;
        this.scaler = this.heightMap.height <= 7000000 /* VP.MaxDOMHeight */ ? IdScaler :
            new BigScaler(this.heightOracle, this.heightMap, this.viewports);
        return scaler.eq(this.scaler) ? 0 : 2 /* UpdateFlag.Height */;
    }
    updateViewportLines() {
        this.viewportLines = [];
        this.heightMap.forEachLine(this.viewport.from, this.viewport.to, this.heightOracle.setDoc(this.state.doc), 0, 0, block => {
            this.viewportLines.push(scaleBlock(block, this.scaler));
        });
    }
    update(update, scrollTarget = null) {
        this.state = update.state;
        let prevDeco = this.stateDeco;
        this.stateDeco = this.state.facet(decorations).filter(d => typeof d != "function");
        let contentChanges = update.changedRanges;
        let heightChanges = ChangedRange.extendWithRanges(contentChanges, heightRelevantDecoChanges(prevDeco, this.stateDeco, update ? update.changes : state.ChangeSet.empty(this.state.doc.length)));
        let prevHeight = this.heightMap.height;
        let scrollAnchor = this.scrolledToBottom ? null : this.scrollAnchorAt(this.scrollTop);
        clearHeightChangeFlag();
        this.heightMap = this.heightMap.applyChanges(this.stateDeco, update.startState.doc, this.heightOracle.setDoc(this.state.doc), heightChanges);
        if (this.heightMap.height != prevHeight || heightChangeFlag)
            update.flags |= 2 /* UpdateFlag.Height */;
        if (scrollAnchor) {
            this.scrollAnchorPos = update.changes.mapPos(scrollAnchor.from, -1);
            this.scrollAnchorHeight = scrollAnchor.top;
        }
        else {
            this.scrollAnchorPos = -1;
            this.scrollAnchorHeight = prevHeight;
        }
        let viewport = heightChanges.length ? this.mapViewport(this.viewport, update.changes) : this.viewport;
        if (scrollTarget && (scrollTarget.range.head < viewport.from || scrollTarget.range.head > viewport.to) ||
            !this.viewportIsAppropriate(viewport))
            viewport = this.getViewport(0, scrollTarget);
        let viewportChange = viewport.from != this.viewport.from || viewport.to != this.viewport.to;
        this.viewport = viewport;
        update.flags |= this.updateForViewport();
        if (viewportChange || !update.changes.empty || (update.flags & 2 /* UpdateFlag.Height */))
            this.updateViewportLines();
        if (this.lineGaps.length || this.viewport.to - this.viewport.from > (2000 /* LG.Margin */ << 1))
            this.updateLineGaps(this.ensureLineGaps(this.mapLineGaps(this.lineGaps, update.changes)));
        update.flags |= this.computeVisibleRanges(update.changes);
        if (scrollTarget)
            this.scrollTarget = scrollTarget;
        if (!this.mustEnforceCursorAssoc && update.selectionSet && update.view.lineWrapping &&
            update.state.selection.main.empty && update.state.selection.main.assoc &&
            !update.state.facet(nativeSelectionHidden))
            this.mustEnforceCursorAssoc = true;
    }
    measure(view) {
        let dom = view.contentDOM, style = window.getComputedStyle(dom);
        let oracle = this.heightOracle;
        let whiteSpace = style.whiteSpace;
        this.defaultTextDirection = style.direction == "rtl" ? exports.Direction.RTL : exports.Direction.LTR;
        let refresh = this.heightOracle.mustRefreshForWrapping(whiteSpace);
        let domRect = dom.getBoundingClientRect();
        let measureContent = refresh || this.mustMeasureContent || this.contentDOMHeight != domRect.height;
        this.contentDOMHeight = domRect.height;
        this.mustMeasureContent = false;
        let result = 0, bias = 0;
        if (domRect.width && domRect.height) {
            let { scaleX, scaleY } = getScale(dom, domRect);
            if (scaleX > .005 && Math.abs(this.scaleX - scaleX) > .005 ||
                scaleY > .005 && Math.abs(this.scaleY - scaleY) > .005) {
                this.scaleX = scaleX;
                this.scaleY = scaleY;
                result |= 16 /* UpdateFlag.Geometry */;
                refresh = measureContent = true;
            }
        }
        // Vertical padding
        let paddingTop = (parseInt(style.paddingTop) || 0) * this.scaleY;
        let paddingBottom = (parseInt(style.paddingBottom) || 0) * this.scaleY;
        if (this.paddingTop != paddingTop || this.paddingBottom != paddingBottom) {
            this.paddingTop = paddingTop;
            this.paddingBottom = paddingBottom;
            result |= 16 /* UpdateFlag.Geometry */ | 2 /* UpdateFlag.Height */;
        }
        if (this.editorWidth != view.scrollDOM.clientWidth) {
            if (oracle.lineWrapping)
                measureContent = true;
            this.editorWidth = view.scrollDOM.clientWidth;
            result |= 16 /* UpdateFlag.Geometry */;
        }
        let scrollTop = view.scrollDOM.scrollTop * this.scaleY;
        if (this.scrollTop != scrollTop) {
            this.scrollAnchorHeight = -1;
            this.scrollTop = scrollTop;
        }
        this.scrolledToBottom = isScrolledToBottom(view.scrollDOM);
        // Pixel viewport
        let pixelViewport = (this.printing ? fullPixelRange : visiblePixelRange)(dom, this.paddingTop);
        let dTop = pixelViewport.top - this.pixelViewport.top, dBottom = pixelViewport.bottom - this.pixelViewport.bottom;
        this.pixelViewport = pixelViewport;
        let inView = this.pixelViewport.bottom > this.pixelViewport.top && this.pixelViewport.right > this.pixelViewport.left;
        if (inView != this.inView) {
            this.inView = inView;
            if (inView)
                measureContent = true;
        }
        if (!this.inView && !this.scrollTarget && !inWindow(view.dom))
            return 0;
        let contentWidth = domRect.width;
        if (this.contentDOMWidth != contentWidth || this.editorHeight != view.scrollDOM.clientHeight) {
            this.contentDOMWidth = domRect.width;
            this.editorHeight = view.scrollDOM.clientHeight;
            result |= 16 /* UpdateFlag.Geometry */;
        }
        if (measureContent) {
            let lineHeights = view.docView.measureVisibleLineHeights(this.viewport);
            if (oracle.mustRefreshForHeights(lineHeights))
                refresh = true;
            if (refresh || oracle.lineWrapping && Math.abs(contentWidth - this.contentDOMWidth) > oracle.charWidth) {
                let { lineHeight, charWidth, textHeight } = view.docView.measureTextSize();
                refresh = lineHeight > 0 && oracle.refresh(whiteSpace, lineHeight, charWidth, textHeight, Math.max(5, contentWidth / charWidth), lineHeights);
                if (refresh) {
                    view.docView.minWidth = 0;
                    result |= 16 /* UpdateFlag.Geometry */;
                }
            }
            if (dTop > 0 && dBottom > 0)
                bias = Math.max(dTop, dBottom);
            else if (dTop < 0 && dBottom < 0)
                bias = Math.min(dTop, dBottom);
            clearHeightChangeFlag();
            for (let vp of this.viewports) {
                let heights = vp.from == this.viewport.from ? lineHeights : view.docView.measureVisibleLineHeights(vp);
                this.heightMap = (refresh ? HeightMap.empty().applyChanges(this.stateDeco, state.Text.empty, this.heightOracle, [new ChangedRange(0, 0, 0, view.state.doc.length)]) : this.heightMap).updateHeight(oracle, 0, refresh, new MeasuredHeights(vp.from, heights));
            }
            if (heightChangeFlag)
                result |= 2 /* UpdateFlag.Height */;
        }
        let viewportChange = !this.viewportIsAppropriate(this.viewport, bias) ||
            this.scrollTarget && (this.scrollTarget.range.head < this.viewport.from ||
                this.scrollTarget.range.head > this.viewport.to);
        if (viewportChange) {
            if (result & 2 /* UpdateFlag.Height */)
                result |= this.updateScaler();
            this.viewport = this.getViewport(bias, this.scrollTarget);
            result |= this.updateForViewport();
        }
        if ((result & 2 /* UpdateFlag.Height */) || viewportChange)
            this.updateViewportLines();
        if (this.lineGaps.length || this.viewport.to - this.viewport.from > (2000 /* LG.Margin */ << 1))
            this.updateLineGaps(this.ensureLineGaps(refresh ? [] : this.lineGaps, view));
        result |= this.computeVisibleRanges();
        if (this.mustEnforceCursorAssoc) {
            this.mustEnforceCursorAssoc = false;
            // This is done in the read stage, because moving the selection
            // to a line end is going to trigger a layout anyway, so it
            // can't be a pure write. It should be rare that it does any
            // writing.
            view.docView.enforceCursorAssoc();
        }
        return result;
    }
    get visibleTop() { return this.scaler.fromDOM(this.pixelViewport.top); }
    get visibleBottom() { return this.scaler.fromDOM(this.pixelViewport.bottom); }
    getViewport(bias, scrollTarget) {
        // This will divide VP.Margin between the top and the
        // bottom, depending on the bias (the change in viewport position
        // since the last update). It'll hold a number between 0 and 1
        let marginTop = 0.5 - Math.max(-0.5, Math.min(0.5, bias / 1000 /* VP.Margin */ / 2));
        let map = this.heightMap, oracle = this.heightOracle;
        let { visibleTop, visibleBottom } = this;
        let viewport = new Viewport(map.lineAt(visibleTop - marginTop * 1000 /* VP.Margin */, QueryType.ByHeight, oracle, 0, 0).from, map.lineAt(visibleBottom + (1 - marginTop) * 1000 /* VP.Margin */, QueryType.ByHeight, oracle, 0, 0).to);
        // If scrollTarget is given, make sure the viewport includes that position
        if (scrollTarget) {
            let { head } = scrollTarget.range;
            if (head < viewport.from || head > viewport.to) {
                let viewHeight = Math.min(this.editorHeight, this.pixelViewport.bottom - this.pixelViewport.top);
                let block = map.lineAt(head, QueryType.ByPos, oracle, 0, 0), topPos;
                if (scrollTarget.y == "center")
                    topPos = (block.top + block.bottom) / 2 - viewHeight / 2;
                else if (scrollTarget.y == "start" || scrollTarget.y == "nearest" && head < viewport.from)
                    topPos = block.top;
                else
                    topPos = block.bottom - viewHeight;
                viewport = new Viewport(map.lineAt(topPos - 1000 /* VP.Margin */ / 2, QueryType.ByHeight, oracle, 0, 0).from, map.lineAt(topPos + viewHeight + 1000 /* VP.Margin */ / 2, QueryType.ByHeight, oracle, 0, 0).to);
            }
        }
        return viewport;
    }
    mapViewport(viewport, changes) {
        let from = changes.mapPos(viewport.from, -1), to = changes.mapPos(viewport.to, 1);
        return new Viewport(this.heightMap.lineAt(from, QueryType.ByPos, this.heightOracle, 0, 0).from, this.heightMap.lineAt(to, QueryType.ByPos, this.heightOracle, 0, 0).to);
    }
    // Checks if a given viewport covers the visible part of the
    // document and not too much beyond that.
    viewportIsAppropriate({ from, to }, bias = 0) {
        if (!this.inView)
            return true;
        let { top } = this.heightMap.lineAt(from, QueryType.ByPos, this.heightOracle, 0, 0);
        let { bottom } = this.heightMap.lineAt(to, QueryType.ByPos, this.heightOracle, 0, 0);
        let { visibleTop, visibleBottom } = this;
        return (from == 0 || top <= visibleTop - Math.max(10 /* VP.MinCoverMargin */, Math.min(-bias, 250 /* VP.MaxCoverMargin */))) &&
            (to == this.state.doc.length ||
                bottom >= visibleBottom + Math.max(10 /* VP.MinCoverMargin */, Math.min(bias, 250 /* VP.MaxCoverMargin */))) &&
            (top > visibleTop - 2 * 1000 /* VP.Margin */ && bottom < visibleBottom + 2 * 1000 /* VP.Margin */);
    }
    mapLineGaps(gaps, changes) {
        if (!gaps.length || changes.empty)
            return gaps;
        let mapped = [];
        for (let gap of gaps)
            if (!changes.touchesRange(gap.from, gap.to))
                mapped.push(new LineGap(changes.mapPos(gap.from), changes.mapPos(gap.to), gap.size, gap.displaySize));
        return mapped;
    }
    // Computes positions in the viewport where the start or end of a
    // line should be hidden, trying to reuse existing line gaps when
    // appropriate to avoid unneccesary redraws.
    // Uses crude character-counting for the positioning and sizing,
    // since actual DOM coordinates aren't always available and
    // predictable. Relies on generous margins (see LG.Margin) to hide
    // the artifacts this might produce from the user.
    ensureLineGaps(current, mayMeasure) {
        let wrapping = this.heightOracle.lineWrapping;
        let margin = wrapping ? 10000 /* LG.MarginWrap */ : 2000 /* LG.Margin */, halfMargin = margin >> 1, doubleMargin = margin << 1;
        // The non-wrapping logic won't work at all in predominantly right-to-left text.
        if (this.defaultTextDirection != exports.Direction.LTR && !wrapping)
            return [];
        let gaps = [];
        let addGap = (from, to, line, structure) => {
            if (to - from < halfMargin)
                return;
            let sel = this.state.selection.main, avoid = [sel.from];
            if (!sel.empty)
                avoid.push(sel.to);
            for (let pos of avoid) {
                if (pos > from && pos < to) {
                    addGap(from, pos - 10 /* LG.SelectionMargin */, line, structure);
                    addGap(pos + 10 /* LG.SelectionMargin */, to, line, structure);
                    return;
                }
            }
            let gap = find(current, gap => gap.from >= line.from && gap.to <= line.to &&
                Math.abs(gap.from - from) < halfMargin && Math.abs(gap.to - to) < halfMargin &&
                !avoid.some(pos => gap.from < pos && gap.to > pos));
            if (!gap) {
                // When scrolling down, snap gap ends to line starts to avoid shifts in wrapping
                if (to < line.to && mayMeasure && wrapping &&
                    mayMeasure.visibleRanges.some(r => r.from <= to && r.to >= to)) {
                    let lineStart = mayMeasure.moveToLineBoundary(state.EditorSelection.cursor(to), false, true).head;
                    if (lineStart > from)
                        to = lineStart;
                }
                let size = this.gapSize(line, from, to, structure);
                let displaySize = wrapping || size < 2000000 /* VP.MaxHorizGap */ ? size : 2000000 /* VP.MaxHorizGap */;
                gap = new LineGap(from, to, size, displaySize);
            }
            gaps.push(gap);
        };
        let checkLine = (line) => {
            if (line.length < doubleMargin || line.type != exports.BlockType.Text)
                return;
            let structure = lineStructure(line.from, line.to, this.stateDeco);
            if (structure.total < doubleMargin)
                return;
            let target = this.scrollTarget ? this.scrollTarget.range.head : null;
            let viewFrom, viewTo;
            if (wrapping) {
                let marginHeight = (margin / this.heightOracle.lineLength) * this.heightOracle.lineHeight;
                let top, bot;
                if (target != null) {
                    let targetFrac = findFraction(structure, target);
                    let spaceFrac = ((this.visibleBottom - this.visibleTop) / 2 + marginHeight) / line.height;
                    top = targetFrac - spaceFrac;
                    bot = targetFrac + spaceFrac;
                }
                else {
                    top = (this.visibleTop - line.top - marginHeight) / line.height;
                    bot = (this.visibleBottom - line.top + marginHeight) / line.height;
                }
                viewFrom = findPosition(structure, top);
                viewTo = findPosition(structure, bot);
            }
            else {
                let totalWidth = structure.total * this.heightOracle.charWidth;
                let marginWidth = margin * this.heightOracle.charWidth;
                let horizOffset = 0;
                if (totalWidth > 2000000 /* VP.MaxHorizGap */)
                    for (let old of current) {
                        if (old.from >= line.from && old.from < line.to && old.size != old.displaySize &&
                            old.from * this.heightOracle.charWidth + horizOffset < this.pixelViewport.left)
                            horizOffset = old.size - old.displaySize;
                    }
                let pxLeft = this.pixelViewport.left + horizOffset, pxRight = this.pixelViewport.right + horizOffset;
                let left, right;
                if (target != null) {
                    let targetFrac = findFraction(structure, target);
                    let spaceFrac = ((pxRight - pxLeft) / 2 + marginWidth) / totalWidth;
                    left = targetFrac - spaceFrac;
                    right = targetFrac + spaceFrac;
                }
                else {
                    left = (pxLeft - marginWidth) / totalWidth;
                    right = (pxRight + marginWidth) / totalWidth;
                }
                viewFrom = findPosition(structure, left);
                viewTo = findPosition(structure, right);
            }
            if (viewFrom > line.from)
                addGap(line.from, viewFrom, line, structure);
            if (viewTo < line.to)
                addGap(viewTo, line.to, line, structure);
        };
        for (let line of this.viewportLines) {
            if (Array.isArray(line.type))
                line.type.forEach(checkLine);
            else
                checkLine(line);
        }
        return gaps;
    }
    gapSize(line, from, to, structure) {
        let fraction = findFraction(structure, to) - findFraction(structure, from);
        if (this.heightOracle.lineWrapping) {
            return line.height * fraction;
        }
        else {
            return structure.total * this.heightOracle.charWidth * fraction;
        }
    }
    updateLineGaps(gaps) {
        if (!LineGap.same(gaps, this.lineGaps)) {
            this.lineGaps = gaps;
            this.lineGapDeco = Decoration.set(gaps.map(gap => gap.draw(this, this.heightOracle.lineWrapping)));
        }
    }
    computeVisibleRanges(changes) {
        let deco = this.stateDeco;
        if (this.lineGaps.length)
            deco = deco.concat(this.lineGapDeco);
        let ranges = [];
        state.RangeSet.spans(deco, this.viewport.from, this.viewport.to, {
            span(from, to) { ranges.push({ from, to }); },
            point() { }
        }, 20);
        let changed = 0;
        if (ranges.length != this.visibleRanges.length) {
            changed = 8 /* UpdateFlag.ViewportMoved */ | 4 /* UpdateFlag.Viewport */;
        }
        else {
            for (let i = 0; i < ranges.length && !(changed & 8 /* UpdateFlag.ViewportMoved */); i++) {
                let old = this.visibleRanges[i], nw = ranges[i];
                if (old.from != nw.from || old.to != nw.to) {
                    changed |= 4 /* UpdateFlag.Viewport */;
                    if (!(changes && changes.mapPos(old.from, -1) == nw.from && changes.mapPos(old.to, 1) == nw.to))
                        changed |= 8 /* UpdateFlag.ViewportMoved */;
                }
            }
        }
        this.visibleRanges = ranges;
        return changed;
    }
    lineBlockAt(pos) {
        return (pos >= this.viewport.from && pos <= this.viewport.to &&
            this.viewportLines.find(b => b.from <= pos && b.to >= pos)) ||
            scaleBlock(this.heightMap.lineAt(pos, QueryType.ByPos, this.heightOracle, 0, 0), this.scaler);
    }
    lineBlockAtHeight(height) {
        return (height >= this.viewportLines[0].top && height <= this.viewportLines[this.viewportLines.length - 1].bottom &&
            this.viewportLines.find(l => l.top <= height && l.bottom >= height)) ||
            scaleBlock(this.heightMap.lineAt(this.scaler.fromDOM(height), QueryType.ByHeight, this.heightOracle, 0, 0), this.scaler);
    }
    scrollAnchorAt(scrollTop) {
        let block = this.lineBlockAtHeight(scrollTop + 8);
        return block.from >= this.viewport.from || this.viewportLines[0].top - scrollTop > 200 ? block : this.viewportLines[0];
    }
    elementAtHeight(height) {
        return scaleBlock(this.heightMap.blockAt(this.scaler.fromDOM(height), this.heightOracle, 0, 0), this.scaler);
    }
    get docHeight() {
        return this.scaler.toDOM(this.heightMap.height);
    }
    get contentHeight() {
        return this.docHeight + this.paddingTop + this.paddingBottom;
    }
}
class Viewport {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }
}
function lineStructure(from, to, stateDeco) {
    let ranges = [], pos = from, total = 0;
    state.RangeSet.spans(stateDeco, from, to, {
        span() { },
        point(from, to) {
            if (from > pos) {
                ranges.push({ from: pos, to: from });
                total += from - pos;
            }
            pos = to;
        }
    }, 20); // We're only interested in collapsed ranges of a significant size
    if (pos < to) {
        ranges.push({ from: pos, to });
        total += to - pos;
    }
    return { total, ranges };
}
function findPosition({ total, ranges }, ratio) {
    if (ratio <= 0)
        return ranges[0].from;
    if (ratio >= 1)
        return ranges[ranges.length - 1].to;
    let dist = Math.floor(total * ratio);
    for (let i = 0;; i++) {
        let { from, to } = ranges[i], size = to - from;
        if (dist <= size)
            return from + dist;
        dist -= size;
    }
}
function findFraction(structure, pos) {
    let counted = 0;
    for (let { from, to } of structure.ranges) {
        if (pos <= to) {
            counted += pos - from;
            break;
        }
        counted += to - from;
    }
    return counted / structure.total;
}
function find(array, f) {
    for (let val of array)
        if (f(val))
            return val;
    return undefined;
}
// Don't scale when the document height is within the range of what
// the DOM can handle.
const IdScaler = {
    toDOM(n) { return n; },
    fromDOM(n) { return n; },
    scale: 1,
    eq(other) { return other == this; }
};
// When the height is too big (> VP.MaxDOMHeight), scale down the
// regions outside the viewports so that the total height is
// VP.MaxDOMHeight.
class BigScaler {
    constructor(oracle, heightMap, viewports) {
        let vpHeight = 0, base = 0, domBase = 0;
        this.viewports = viewports.map(({ from, to }) => {
            let top = heightMap.lineAt(from, QueryType.ByPos, oracle, 0, 0).top;
            let bottom = heightMap.lineAt(to, QueryType.ByPos, oracle, 0, 0).bottom;
            vpHeight += bottom - top;
            return { from, to, top, bottom, domTop: 0, domBottom: 0 };
        });
        this.scale = (7000000 /* VP.MaxDOMHeight */ - vpHeight) / (heightMap.height - vpHeight);
        for (let obj of this.viewports) {
            obj.domTop = domBase + (obj.top - base) * this.scale;
            domBase = obj.domBottom = obj.domTop + (obj.bottom - obj.top);
            base = obj.bottom;
        }
    }
    toDOM(n) {
        for (let i = 0, base = 0, domBase = 0;; i++) {
            let vp = i < this.viewports.length ? this.viewports[i] : null;
            if (!vp || n < vp.top)
                return domBase + (n - base) * this.scale;
            if (n <= vp.bottom)
                return vp.domTop + (n - vp.top);
            base = vp.bottom;
            domBase = vp.domBottom;
        }
    }
    fromDOM(n) {
        for (let i = 0, base = 0, domBase = 0;; i++) {
            let vp = i < this.viewports.length ? this.viewports[i] : null;
            if (!vp || n < vp.domTop)
                return base + (n - domBase) / this.scale;
            if (n <= vp.domBottom)
                return vp.top + (n - vp.domTop);
            base = vp.bottom;
            domBase = vp.domBottom;
        }
    }
    eq(other) {
        if (!(other instanceof BigScaler))
            return false;
        return this.scale == other.scale && this.viewports.length == other.viewports.length &&
            this.viewports.every((vp, i) => vp.from == other.viewports[i].from && vp.to == other.viewports[i].to);
    }
}
function scaleBlock(block, scaler) {
    if (scaler.scale == 1)
        return block;
    let bTop = scaler.toDOM(block.top), bBottom = scaler.toDOM(block.bottom);
    return new BlockInfo(block.from, block.length, bTop, bBottom - bTop, Array.isArray(block._content) ? block._content.map(b => scaleBlock(b, scaler)) : block._content);
}

const theme = state.Facet.define({ combine: strs => strs.join(" ") });
const darkTheme = state.Facet.define({ combine: values => values.indexOf(true) > -1 });
const baseThemeID = styleMod.StyleModule.newName(), baseLightID = styleMod.StyleModule.newName(), baseDarkID = styleMod.StyleModule.newName();
const lightDarkIDs = { "&light": "." + baseLightID, "&dark": "." + baseDarkID };
function buildTheme(main, spec, scopes) {
    return new styleMod.StyleModule(spec, {
        finish(sel) {
            return /&/.test(sel) ? sel.replace(/&\w*/, m => {
                if (m == "&")
                    return main;
                if (!scopes || !scopes[m])
                    throw new RangeError(`Unsupported selector: ${m}`);
                return scopes[m];
            }) : main + " " + sel;
        }
    });
}
const baseTheme$1 = buildTheme("." + baseThemeID, {
    "&": {
        position: "relative !important",
        boxSizing: "border-box",
        "&.cm-focused": {
            // Provide a simple default outline to make sure a focused
            // editor is visually distinct. Can't leave the default behavior
            // because that will apply to the content element, which is
            // inside the scrollable container and doesn't include the
            // gutters. We also can't use an 'auto' outline, since those
            // are, for some reason, drawn behind the element content, which
            // will cause things like the active line background to cover
            // the outline (#297).
            outline: "1px dotted #212121"
        },
        display: "flex !important",
        flexDirection: "column"
    },
    ".cm-scroller": {
        display: "flex !important",
        alignItems: "flex-start !important",
        fontFamily: "monospace",
        lineHeight: 1.4,
        height: "100%",
        overflowX: "auto",
        position: "relative",
        zIndex: 0,
        overflowAnchor: "none",
    },
    ".cm-content": {
        margin: 0,
        flexGrow: 2,
        flexShrink: 0,
        display: "block",
        whiteSpace: "pre",
        wordWrap: "normal", // https://github.com/codemirror/dev/issues/456
        boxSizing: "border-box",
        minHeight: "100%",
        padding: "4px 0",
        outline: "none",
        "&[contenteditable=true]": {
            WebkitUserModify: "read-write-plaintext-only",
        }
    },
    ".cm-lineWrapping": {
        whiteSpace_fallback: "pre-wrap", // For IE
        whiteSpace: "break-spaces",
        wordBreak: "break-word", // For Safari, which doesn't support overflow-wrap: anywhere
        overflowWrap: "anywhere",
        flexShrink: 1
    },
    "&light .cm-content": { caretColor: "black" },
    "&dark .cm-content": { caretColor: "white" },
    ".cm-line": {
        display: "block",
        padding: "0 2px 0 6px"
    },
    ".cm-layer": {
        position: "absolute",
        left: 0,
        top: 0,
        contain: "size style",
        "& > *": {
            position: "absolute"
        }
    },
    "&light .cm-selectionBackground": {
        background: "#d9d9d9"
    },
    "&dark .cm-selectionBackground": {
        background: "#222"
    },
    "&light.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
        background: "#d7d4f0"
    },
    "&dark.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
        background: "#233"
    },
    ".cm-cursorLayer": {
        pointerEvents: "none"
    },
    "&.cm-focused > .cm-scroller > .cm-cursorLayer": {
        animation: "steps(1) cm-blink 1.2s infinite"
    },
    // Two animations defined so that we can switch between them to
    // restart the animation without forcing another style
    // recomputation.
    "@keyframes cm-blink": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
    "@keyframes cm-blink2": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
    ".cm-cursor, .cm-dropCursor": {
        borderLeft: "1.2px solid black",
        marginLeft: "-0.6px",
        pointerEvents: "none",
    },
    ".cm-cursor": {
        display: "none"
    },
    "&dark .cm-cursor": {
        borderLeftColor: "#ddd"
    },
    ".cm-dropCursor": {
        position: "absolute"
    },
    "&.cm-focused > .cm-scroller > .cm-cursorLayer .cm-cursor": {
        display: "block"
    },
    ".cm-iso": {
        unicodeBidi: "isolate"
    },
    ".cm-announced": {
        position: "fixed",
        top: "-10000px"
    },
    "@media print": {
        ".cm-announced": { display: "none" }
    },
    "&light .cm-activeLine": { backgroundColor: "#cceeff44" },
    "&dark .cm-activeLine": { backgroundColor: "#99eeff33" },
    "&light .cm-specialChar": { color: "red" },
    "&dark .cm-specialChar": { color: "#f78" },
    ".cm-gutters": {
        flexShrink: 0,
        display: "flex",
        height: "100%",
        boxSizing: "border-box",
        zIndex: 200,
    },
    ".cm-gutters-before": { insetInlineStart: 0 },
    ".cm-gutters-after": { insetInlineEnd: 0 },
    "&light .cm-gutters": {
        backgroundColor: "#f5f5f5",
        color: "#6c6c6c",
        border: "0px solid #ddd",
        "&.cm-gutters-before": { borderRightWidth: "1px" },
        "&.cm-gutters-after": { borderLeftWidth: "1px" },
    },
    "&dark .cm-gutters": {
        backgroundColor: "#333338",
        color: "#ccc"
    },
    ".cm-gutter": {
        display: "flex !important", // Necessary -- prevents margin collapsing
        flexDirection: "column",
        flexShrink: 0,
        boxSizing: "border-box",
        minHeight: "100%",
        overflow: "hidden"
    },
    ".cm-gutterElement": {
        boxSizing: "border-box"
    },
    ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 3px 0 5px",
        minWidth: "20px",
        textAlign: "right",
        whiteSpace: "nowrap"
    },
    "&light .cm-activeLineGutter": {
        backgroundColor: "#e2f2ff"
    },
    "&dark .cm-activeLineGutter": {
        backgroundColor: "#222227"
    },
    ".cm-panels": {
        boxSizing: "border-box",
        position: "sticky",
        left: 0,
        right: 0,
        zIndex: 300
    },
    "&light .cm-panels": {
        backgroundColor: "#f5f5f5",
        color: "black"
    },
    "&light .cm-panels-top": {
        borderBottom: "1px solid #ddd"
    },
    "&light .cm-panels-bottom": {
        borderTop: "1px solid #ddd"
    },
    "&dark .cm-panels": {
        backgroundColor: "#333338",
        color: "white"
    },
    ".cm-dialog": {
        padding: "2px 19px 4px 6px",
        position: "relative",
        "& label": { fontSize: "80%" },
    },
    ".cm-dialog-close": {
        position: "absolute",
        top: "3px",
        right: "4px",
        backgroundColor: "inherit",
        border: "none",
        font: "inherit",
        fontSize: "14px",
        padding: "0"
    },
    ".cm-tab": {
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "bottom"
    },
    ".cm-widgetBuffer": {
        verticalAlign: "text-top",
        height: "1em",
        width: 0,
        display: "inline"
    },
    ".cm-placeholder": {
        color: "#888",
        display: "inline-block",
        verticalAlign: "top",
        userSelect: "none"
    },
    ".cm-highlightSpace": {
        backgroundImage: "radial-gradient(circle at 50% 55%, #aaa 20%, transparent 5%)",
        backgroundPosition: "center",
    },
    ".cm-highlightTab": {
        backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20"><path stroke="%23888" stroke-width="1" fill="none" d="M1 10H196L190 5M190 15L196 10M197 4L197 16"/></svg>')`,
        backgroundSize: "auto 100%",
        backgroundPosition: "right 90%",
        backgroundRepeat: "no-repeat"
    },
    ".cm-trailingSpace": {
        backgroundColor: "#ff332255"
    },
    ".cm-button": {
        verticalAlign: "middle",
        color: "inherit",
        fontSize: "70%",
        padding: ".2em 1em",
        borderRadius: "1px"
    },
    "&light .cm-button": {
        backgroundImage: "linear-gradient(#eff1f5, #d9d9df)",
        border: "1px solid #888",
        "&:active": {
            backgroundImage: "linear-gradient(#b4b4b4, #d0d3d6)"
        }
    },
    "&dark .cm-button": {
        backgroundImage: "linear-gradient(#393939, #111)",
        border: "1px solid #888",
        "&:active": {
            backgroundImage: "linear-gradient(#111, #333)"
        }
    },
    ".cm-textfield": {
        verticalAlign: "middle",
        color: "inherit",
        fontSize: "70%",
        border: "1px solid silver",
        padding: ".2em .5em"
    },
    "&light .cm-textfield": {
        backgroundColor: "white"
    },
    "&dark .cm-textfield": {
        border: "1px solid #555",
        backgroundColor: "inherit"
    }
}, lightDarkIDs);

const observeOptions = {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    characterDataOldValue: true
};
// IE11 has very broken mutation observers, so we also listen to
// DOMCharacterDataModified there
const useCharData = browser.ie && browser.ie_version <= 11;
class DOMObserver {
    constructor(view) {
        this.view = view;
        this.active = false;
        this.editContext = null;
        // The known selection. Kept in our own object, as opposed to just
        // directly accessing the selection because:
        //  - Safari doesn't report the right selection in shadow DOM
        //  - Reading from the selection forces a DOM layout
        //  - This way, we can ignore selectionchange events if we have
        //    already seen the 'new' selection
        this.selectionRange = new DOMSelectionState;
        // Set when a selection change is detected, cleared on flush
        this.selectionChanged = false;
        this.delayedFlush = -1;
        this.resizeTimeout = -1;
        this.queue = [];
        this.delayedAndroidKey = null;
        this.flushingAndroidKey = -1;
        this.lastChange = 0;
        this.scrollTargets = [];
        this.intersection = null;
        this.resizeScroll = null;
        this.intersecting = false;
        this.gapIntersection = null;
        this.gaps = [];
        this.printQuery = null;
        // Timeout for scheduling check of the parents that need scroll handlers
        this.parentCheck = -1;
        this.dom = view.contentDOM;
        this.observer = new MutationObserver(mutations => {
            for (let mut of mutations)
                this.queue.push(mut);
            // IE11 will sometimes (on typing over a selection or
            // backspacing out a single character text node) call the
            // observer callback before actually updating the DOM.
            //
            // Unrelatedly, iOS Safari will, when ending a composition,
            // sometimes first clear it, deliver the mutations, and then
            // reinsert the finished text. CodeMirror's handling of the
            // deletion will prevent the reinsertion from happening,
            // breaking composition.
            if ((browser.ie && browser.ie_version <= 11 || browser.ios && view.composing) &&
                mutations.some(m => m.type == "childList" && m.removedNodes.length ||
                    m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length))
                this.flushSoon();
            else
                this.flush();
        });
        if (window.EditContext && browser.android && view.constructor.EDIT_CONTEXT !== false &&
            // Chrome <126 doesn't support inverted selections in edit context (#1392)
            !(browser.chrome && browser.chrome_version < 126)) {
            this.editContext = new EditContextManager(view);
            if (view.state.facet(editable))
                view.contentDOM.editContext = this.editContext.editContext;
        }
        if (useCharData)
            this.onCharData = (event) => {
                this.queue.push({ target: event.target,
                    type: "characterData",
                    oldValue: event.prevValue });
                this.flushSoon();
            };
        this.onSelectionChange = this.onSelectionChange.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onPrint = this.onPrint.bind(this);
        this.onScroll = this.onScroll.bind(this);
        if (window.matchMedia)
            this.printQuery = window.matchMedia("print");
        if (typeof ResizeObserver == "function") {
            this.resizeScroll = new ResizeObserver(() => {
                var _a;
                if (((_a = this.view.docView) === null || _a === void 0 ? void 0 : _a.lastUpdate) < Date.now() - 75)
                    this.onResize();
            });
            this.resizeScroll.observe(view.scrollDOM);
        }
        this.addWindowListeners(this.win = view.win);
        this.start();
        if (typeof IntersectionObserver == "function") {
            this.intersection = new IntersectionObserver(entries => {
                if (this.parentCheck < 0)
                    this.parentCheck = setTimeout(this.listenForScroll.bind(this), 1000);
                if (entries.length > 0 && (entries[entries.length - 1].intersectionRatio > 0) != this.intersecting) {
                    this.intersecting = !this.intersecting;
                    if (this.intersecting != this.view.inView)
                        this.onScrollChanged(document.createEvent("Event"));
                }
            }, { threshold: [0, .001] });
            this.intersection.observe(this.dom);
            this.gapIntersection = new IntersectionObserver(entries => {
                if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0)
                    this.onScrollChanged(document.createEvent("Event"));
            }, {});
        }
        this.listenForScroll();
        this.readSelectionRange();
    }
    onScrollChanged(e) {
        this.view.inputState.runHandlers("scroll", e);
        if (this.intersecting)
            this.view.measure();
    }
    onScroll(e) {
        if (this.intersecting)
            this.flush(false);
        if (this.editContext)
            this.view.requestMeasure(this.editContext.measureReq);
        this.onScrollChanged(e);
    }
    onResize() {
        if (this.resizeTimeout < 0)
            this.resizeTimeout = setTimeout(() => {
                this.resizeTimeout = -1;
                this.view.requestMeasure();
            }, 50);
    }
    onPrint(event) {
        if ((event.type == "change" || !event.type) && !event.matches)
            return;
        this.view.viewState.printing = true;
        this.view.measure();
        setTimeout(() => {
            this.view.viewState.printing = false;
            this.view.requestMeasure();
        }, 500);
    }
    updateGaps(gaps) {
        if (this.gapIntersection && (gaps.length != this.gaps.length || this.gaps.some((g, i) => g != gaps[i]))) {
            this.gapIntersection.disconnect();
            for (let gap of gaps)
                this.gapIntersection.observe(gap);
            this.gaps = gaps;
        }
    }
    onSelectionChange(event) {
        let wasChanged = this.selectionChanged;
        if (!this.readSelectionRange() || this.delayedAndroidKey)
            return;
        let { view } = this, sel = this.selectionRange;
        if (view.state.facet(editable) ? view.root.activeElement != this.dom : !hasSelection(this.dom, sel))
            return;
        let context = sel.anchorNode && view.docView.tile.nearest(sel.anchorNode);
        if (context && context.isWidget() && context.widget.ignoreEvent(event)) {
            if (!wasChanged)
                this.selectionChanged = false;
            return;
        }
        // Deletions on IE11 fire their events in the wrong order, giving
        // us a selection change event before the DOM changes are
        // reported.
        // Chrome Android has a similar issue when backspacing out a
        // selection (#645).
        if ((browser.ie && browser.ie_version <= 11 || browser.android && browser.chrome) && !view.state.selection.main.empty &&
            // (Selection.isCollapsed isn't reliable on IE)
            sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset))
            this.flushSoon();
        else
            this.flush(false);
    }
    readSelectionRange() {
        let { view } = this;
        // The Selection object is broken in shadow roots in Safari. See
        // https://github.com/codemirror/dev/issues/414
        let selection = getSelection(view.root);
        if (!selection)
            return false;
        let range = browser.safari && view.root.nodeType == 11 &&
            view.root.activeElement == this.dom &&
            safariSelectionRangeHack(this.view, selection) || selection;
        if (!range || this.selectionRange.eq(range))
            return false;
        let local = hasSelection(this.dom, range);
        // Detect the situation where the browser has, on focus, moved the
        // selection to the start of the content element. Reset it to the
        // position from the editor state.
        if (local && !this.selectionChanged &&
            view.inputState.lastFocusTime > Date.now() - 200 &&
            view.inputState.lastTouchTime < Date.now() - 300 &&
            atElementStart(this.dom, range)) {
            this.view.inputState.lastFocusTime = 0;
            view.docView.updateSelection();
            return false;
        }
        this.selectionRange.setRange(range);
        if (local)
            this.selectionChanged = true;
        return true;
    }
    setSelectionRange(anchor, head) {
        this.selectionRange.set(anchor.node, anchor.offset, head.node, head.offset);
        this.selectionChanged = false;
    }
    clearSelectionRange() {
        this.selectionRange.set(null, 0, null, 0);
    }
    listenForScroll() {
        this.parentCheck = -1;
        let i = 0, changed = null;
        for (let dom = this.dom; dom;) {
            if (dom.nodeType == 1) {
                if (!changed && i < this.scrollTargets.length && this.scrollTargets[i] == dom)
                    i++;
                else if (!changed)
                    changed = this.scrollTargets.slice(0, i);
                if (changed)
                    changed.push(dom);
                dom = dom.assignedSlot || dom.parentNode;
            }
            else if (dom.nodeType == 11) { // Shadow root
                dom = dom.host;
            }
            else {
                break;
            }
        }
        if (i < this.scrollTargets.length && !changed)
            changed = this.scrollTargets.slice(0, i);
        if (changed) {
            for (let dom of this.scrollTargets)
                dom.removeEventListener("scroll", this.onScroll);
            for (let dom of this.scrollTargets = changed)
                dom.addEventListener("scroll", this.onScroll);
        }
    }
    ignore(f) {
        if (!this.active)
            return f();
        try {
            this.stop();
            return f();
        }
        finally {
            this.start();
            this.clear();
        }
    }
    start() {
        if (this.active)
            return;
        this.observer.observe(this.dom, observeOptions);
        if (useCharData)
            this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
        this.active = true;
    }
    stop() {
        if (!this.active)
            return;
        this.active = false;
        this.observer.disconnect();
        if (useCharData)
            this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    }
    // Throw away any pending changes
    clear() {
        this.processRecords();
        this.queue.length = 0;
        this.selectionChanged = false;
    }
    // Chrome Android, especially in combination with GBoard, not only
    // doesn't reliably fire regular key events, but also often
    // surrounds the effect of enter or backspace with a bunch of
    // composition events that, when interrupted, cause text duplication
    // or other kinds of corruption. This hack makes the editor back off
    // from handling DOM changes for a moment when such a key is
    // detected (via beforeinput or keydown), and then tries to flush
    // them or, if that has no effect, dispatches the given key.
    delayAndroidKey(key, keyCode) {
        var _a;
        if (!this.delayedAndroidKey) {
            let flush = () => {
                let key = this.delayedAndroidKey;
                if (key) {
                    this.clearDelayedAndroidKey();
                    this.view.inputState.lastKeyCode = key.keyCode;
                    this.view.inputState.lastKeyTime = Date.now();
                    let flushed = this.flush();
                    if (!flushed && key.force)
                        dispatchKey(this.dom, key.key, key.keyCode);
                }
            };
            this.flushingAndroidKey = this.view.win.requestAnimationFrame(flush);
        }
        // Since backspace beforeinput is sometimes signalled spuriously,
        // Enter always takes precedence.
        if (!this.delayedAndroidKey || key == "Enter")
            this.delayedAndroidKey = {
                key, keyCode,
                // Only run the key handler when no changes are detected if
                // this isn't coming right after another change, in which case
                // it is probably part of a weird chain of updates, and should
                // be ignored if it returns the DOM to its previous state.
                force: this.lastChange < Date.now() - 50 || !!((_a = this.delayedAndroidKey) === null || _a === void 0 ? void 0 : _a.force)
            };
    }
    clearDelayedAndroidKey() {
        this.win.cancelAnimationFrame(this.flushingAndroidKey);
        this.delayedAndroidKey = null;
        this.flushingAndroidKey = -1;
    }
    flushSoon() {
        if (this.delayedFlush < 0)
            this.delayedFlush = this.view.win.requestAnimationFrame(() => { this.delayedFlush = -1; this.flush(); });
    }
    forceFlush() {
        if (this.delayedFlush >= 0) {
            this.view.win.cancelAnimationFrame(this.delayedFlush);
            this.delayedFlush = -1;
        }
        this.flush();
    }
    pendingRecords() {
        for (let mut of this.observer.takeRecords())
            this.queue.push(mut);
        return this.queue;
    }
    processRecords() {
        let records = this.pendingRecords();
        if (records.length)
            this.queue = [];
        let from = -1, to = -1, typeOver = false;
        for (let record of records) {
            let range = this.readMutation(record);
            if (!range)
                continue;
            if (range.typeOver)
                typeOver = true;
            if (from == -1) {
                ({ from, to } = range);
            }
            else {
                from = Math.min(range.from, from);
                to = Math.max(range.to, to);
            }
        }
        return { from, to, typeOver };
    }
    readChange() {
        let { from, to, typeOver } = this.processRecords();
        let newSel = this.selectionChanged && hasSelection(this.dom, this.selectionRange);
        if (from < 0 && !newSel)
            return null;
        if (from > -1)
            this.lastChange = Date.now();
        this.view.inputState.lastFocusTime = 0;
        this.selectionChanged = false;
        let change = new DOMChange(this.view, from, to, typeOver);
        this.view.docView.domChanged = { newSel: change.newSel ? change.newSel.main : null };
        return change;
    }
    // Apply pending changes, if any
    flush(readSelection = true) {
        // Completely hold off flushing when pending keys are set—the code
        // managing those will make sure processRecords is called and the
        // view is resynchronized after
        if (this.delayedFlush >= 0 || this.delayedAndroidKey)
            return false;
        if (readSelection)
            this.readSelectionRange();
        let domChange = this.readChange();
        if (!domChange) {
            this.view.requestMeasure();
            return false;
        }
        let startState = this.view.state;
        let handled = applyDOMChange(this.view, domChange);
        // The view wasn't updated but DOM/selection changes were seen. Reset the view.
        if (this.view.state == startState &&
            (domChange.domChanged || domChange.newSel && !domChange.newSel.main.eq(this.view.state.selection.main)))
            this.view.update([]);
        return handled;
    }
    readMutation(rec) {
        let tile = this.view.docView.tile.nearest(rec.target);
        if (!tile || tile.isWidget())
            return null;
        tile.markDirty(rec.type == "attributes");
        if (rec.type == "childList") {
            let childBefore = findChild(tile, rec.previousSibling || rec.target.previousSibling, -1);
            let childAfter = findChild(tile, rec.nextSibling || rec.target.nextSibling, 1);
            return { from: childBefore ? tile.posAfter(childBefore) : tile.posAtStart,
                to: childAfter ? tile.posBefore(childAfter) : tile.posAtEnd, typeOver: false };
        }
        else if (rec.type == "characterData") {
            return { from: tile.posAtStart, to: tile.posAtEnd, typeOver: rec.target.nodeValue == rec.oldValue };
        }
        else {
            return null;
        }
    }
    setWindow(win) {
        if (win != this.win) {
            this.removeWindowListeners(this.win);
            this.win = win;
            this.addWindowListeners(this.win);
        }
    }
    addWindowListeners(win) {
        win.addEventListener("resize", this.onResize);
        if (this.printQuery) {
            if (this.printQuery.addEventListener)
                this.printQuery.addEventListener("change", this.onPrint);
            else
                this.printQuery.addListener(this.onPrint);
        }
        else
            win.addEventListener("beforeprint", this.onPrint);
        win.addEventListener("scroll", this.onScroll);
        win.document.addEventListener("selectionchange", this.onSelectionChange);
    }
    removeWindowListeners(win) {
        win.removeEventListener("scroll", this.onScroll);
        win.removeEventListener("resize", this.onResize);
        if (this.printQuery) {
            if (this.printQuery.removeEventListener)
                this.printQuery.removeEventListener("change", this.onPrint);
            else
                this.printQuery.removeListener(this.onPrint);
        }
        else
            win.removeEventListener("beforeprint", this.onPrint);
        win.document.removeEventListener("selectionchange", this.onSelectionChange);
    }
    update(update) {
        if (this.editContext) {
            this.editContext.update(update);
            if (update.startState.facet(editable) != update.state.facet(editable))
                update.view.contentDOM.editContext = update.state.facet(editable) ? this.editContext.editContext : null;
        }
    }
    destroy() {
        var _a, _b, _c;
        this.stop();
        (_a = this.intersection) === null || _a === void 0 ? void 0 : _a.disconnect();
        (_b = this.gapIntersection) === null || _b === void 0 ? void 0 : _b.disconnect();
        (_c = this.resizeScroll) === null || _c === void 0 ? void 0 : _c.disconnect();
        for (let dom of this.scrollTargets)
            dom.removeEventListener("scroll", this.onScroll);
        this.removeWindowListeners(this.win);
        clearTimeout(this.parentCheck);
        clearTimeout(this.resizeTimeout);
        this.win.cancelAnimationFrame(this.delayedFlush);
        this.win.cancelAnimationFrame(this.flushingAndroidKey);
        if (this.editContext) {
            this.view.contentDOM.editContext = null;
            this.editContext.destroy();
        }
    }
}
function findChild(tile, dom, dir) {
    while (dom) {
        let curTile = Tile.get(dom);
        if (curTile && curTile.parent == tile)
            return curTile;
        let parent = dom.parentNode;
        dom = parent != tile.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
    }
    return null;
}
function buildSelectionRangeFromRange(view, range) {
    let anchorNode = range.startContainer, anchorOffset = range.startOffset;
    let focusNode = range.endContainer, focusOffset = range.endOffset;
    let curAnchor = view.docView.domAtPos(view.state.selection.main.anchor, 1);
    // Since such a range doesn't distinguish between anchor and head,
    // use a heuristic that flips it around if its end matches the
    // current anchor.
    if (isEquivalentPosition(curAnchor.node, curAnchor.offset, focusNode, focusOffset))
        [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
    return { anchorNode, anchorOffset, focusNode, focusOffset };
}
// Used to work around a Safari Selection/shadow DOM bug (#414)
function safariSelectionRangeHack(view, selection) {
    if (selection.getComposedRanges) {
        let range = selection.getComposedRanges(view.root)[0];
        if (range)
            return buildSelectionRangeFromRange(view, range);
    }
    let found = null;
    // Because Safari (at least in 2018-2021) doesn't provide regular
    // access to the selection inside a shadowroot, we have to perform a
    // ridiculous hack to get at it—using `execCommand` to trigger a
    // `beforeInput` event so that we can read the target range from the
    // event.
    function read(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        found = event.getTargetRanges()[0];
    }
    view.contentDOM.addEventListener("beforeinput", read, true);
    view.dom.ownerDocument.execCommand("indent");
    view.contentDOM.removeEventListener("beforeinput", read, true);
    return found ? buildSelectionRangeFromRange(view, found) : null;
}
class EditContextManager {
    constructor(view) {
        // The document window for which the text in the context is
        // maintained. For large documents, this may be smaller than the
        // editor document. This window always includes the selection head.
        this.from = 0;
        this.to = 0;
        // When applying a transaction, this is used to compare the change
        // made to the context content to the change in the transaction in
        // order to make the minimal changes to the context (since touching
        // that sometimes breaks series of multiple edits made for a single
        // user action on some Android keyboards)
        this.pendingContextChange = null;
        this.handlers = Object.create(null);
        // Kludge to work around the fact that EditContext does not respond
        // well to having its content updated during a composition (see #1472)
        this.composing = null;
        this.resetRange(view.state);
        let context = this.editContext = new window.EditContext({
            text: view.state.doc.sliceString(this.from, this.to),
            selectionStart: this.toContextPos(Math.max(this.from, Math.min(this.to, view.state.selection.main.anchor))),
            selectionEnd: this.toContextPos(view.state.selection.main.head)
        });
        this.handlers.textupdate = e => {
            let main = view.state.selection.main, { anchor, head } = main;
            let from = this.toEditorPos(e.updateRangeStart), to = this.toEditorPos(e.updateRangeEnd);
            if (view.inputState.composing >= 0 && !this.composing)
                this.composing = { contextBase: e.updateRangeStart, editorBase: from, drifted: false };
            let deletes = to - from > e.text.length;
            // If the window doesn't include the anchor, assume changes
            // adjacent to a side go up to the anchor.
            if (from == this.from && anchor < this.from)
                from = anchor;
            else if (to == this.to && anchor > this.to)
                to = anchor;
            let diff = findDiff(view.state.sliceDoc(from, to), e.text, (deletes ? main.from : main.to) - from, deletes ? "end" : null);
            // Edit contexts sometimes fire empty changes
            if (!diff) {
                let newSel = state.EditorSelection.single(this.toEditorPos(e.selectionStart), this.toEditorPos(e.selectionEnd));
                if (!newSel.main.eq(main))
                    view.dispatch({ selection: newSel, userEvent: "select" });
                return;
            }
            let change = { from: diff.from + from, to: diff.toA + from,
                insert: state.Text.of(e.text.slice(diff.from, diff.toB).split("\n")) };
            if ((browser.mac || browser.android) && change.from == head - 1 &&
                /^\. ?$/.test(e.text) && view.contentDOM.getAttribute("autocorrect") == "off")
                change = { from, to, insert: state.Text.of([e.text.replace(".", " ")]) };
            this.pendingContextChange = change;
            if (!view.state.readOnly) {
                let newLen = this.to - this.from + (change.to - change.from + change.insert.length);
                applyDOMChangeInner(view, change, state.EditorSelection.single(this.toEditorPos(e.selectionStart, newLen), this.toEditorPos(e.selectionEnd, newLen)));
            }
            // If the transaction didn't flush our change, revert it so
            // that the context is in sync with the editor state again.
            if (this.pendingContextChange) {
                this.revertPending(view.state);
                this.setSelection(view.state);
            }
            // Work around missed compositionend events. See https://discuss.codemirror.net/t/a/9514
            if (change.from < change.to && !change.insert.length && view.inputState.composing >= 0 &&
                !/[\\p{Alphabetic}\\p{Number}_]/.test(context.text.slice(Math.max(0, e.updateRangeStart - 1), Math.min(context.text.length, e.updateRangeStart + 1))))
                this.handlers.compositionend(e);
        };
        this.handlers.characterboundsupdate = e => {
            let rects = [], prev = null;
            for (let i = this.toEditorPos(e.rangeStart), end = this.toEditorPos(e.rangeEnd); i < end; i++) {
                let rect = view.coordsForChar(i);
                prev = (rect && new DOMRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top))
                    || prev || new DOMRect;
                rects.push(prev);
            }
            context.updateCharacterBounds(e.rangeStart, rects);
        };
        this.handlers.textformatupdate = e => {
            let deco = [];
            for (let format of e.getTextFormats()) {
                let lineStyle = format.underlineStyle, thickness = format.underlineThickness;
                if (!/none/i.test(lineStyle) && !/none/i.test(thickness)) {
                    let from = this.toEditorPos(format.rangeStart), to = this.toEditorPos(format.rangeEnd);
                    if (from < to) {
                        // These values changed from capitalized custom strings to lower-case CSS keywords in 2025
                        let style = `text-decoration: underline ${/^[a-z]/.test(lineStyle) ? lineStyle + " " : lineStyle == "Dashed" ? "dashed " : lineStyle == "Squiggle" ? "wavy " : ""}${/thin/i.test(thickness) ? 1 : 2}px`;
                        deco.push(Decoration.mark({ attributes: { style } }).range(from, to));
                    }
                }
            }
            view.dispatch({ effects: setEditContextFormatting.of(Decoration.set(deco)) });
        };
        this.handlers.compositionstart = () => {
            if (view.inputState.composing < 0) {
                view.inputState.composing = 0;
                view.inputState.compositionFirstChange = true;
            }
        };
        this.handlers.compositionend = () => {
            view.inputState.composing = -1;
            view.inputState.compositionFirstChange = null;
            if (this.composing) {
                let { drifted } = this.composing;
                this.composing = null;
                if (drifted)
                    this.reset(view.state);
            }
        };
        for (let event in this.handlers)
            context.addEventListener(event, this.handlers[event]);
        this.measureReq = { read: view => {
                this.editContext.updateControlBounds(view.contentDOM.getBoundingClientRect());
                let sel = getSelection(view.root);
                if (sel && sel.rangeCount)
                    this.editContext.updateSelectionBounds(sel.getRangeAt(0).getBoundingClientRect());
            } };
    }
    applyEdits(update) {
        let off = 0, abort = false, pending = this.pendingContextChange;
        update.changes.iterChanges((fromA, toA, _fromB, _toB, insert) => {
            if (abort)
                return;
            let dLen = insert.length - (toA - fromA);
            if (pending && toA >= pending.to) {
                if (pending.from == fromA && pending.to == toA && pending.insert.eq(insert)) {
                    pending = this.pendingContextChange = null; // Match
                    off += dLen;
                    this.to += dLen;
                    return;
                }
                else { // Mismatch, revert
                    pending = null;
                    this.revertPending(update.state);
                }
            }
            fromA += off;
            toA += off;
            if (toA <= this.from) { // Before the window
                this.from += dLen;
                this.to += dLen;
            }
            else if (fromA < this.to) { // Overlaps with window
                if (fromA < this.from || toA > this.to || (this.to - this.from) + insert.length > 30000 /* CxVp.MaxSize */) {
                    abort = true;
                    return;
                }
                this.editContext.updateText(this.toContextPos(fromA), this.toContextPos(toA), insert.toString());
                this.to += dLen;
            }
            off += dLen;
        });
        if (pending && !abort)
            this.revertPending(update.state);
        return !abort;
    }
    update(update) {
        let reverted = this.pendingContextChange, startSel = update.startState.selection.main;
        if (this.composing &&
            (this.composing.drifted ||
                (!update.changes.touchesRange(startSel.from, startSel.to) &&
                    update.transactions.some(tr => !tr.isUserEvent("input.type") && tr.changes.touchesRange(this.from, this.to))))) {
            this.composing.drifted = true;
            this.composing.editorBase = update.changes.mapPos(this.composing.editorBase);
        }
        else if (!this.applyEdits(update) || !this.rangeIsValid(update.state)) {
            this.pendingContextChange = null;
            this.reset(update.state);
        }
        else if (update.docChanged || update.selectionSet || reverted) {
            this.setSelection(update.state);
        }
        if (update.geometryChanged || update.docChanged || update.selectionSet)
            update.view.requestMeasure(this.measureReq);
    }
    resetRange(state) {
        let { head } = state.selection.main;
        this.from = Math.max(0, head - 10000 /* CxVp.Margin */);
        this.to = Math.min(state.doc.length, head + 10000 /* CxVp.Margin */);
    }
    reset(state) {
        this.resetRange(state);
        this.editContext.updateText(0, this.editContext.text.length, state.doc.sliceString(this.from, this.to));
        this.setSelection(state);
    }
    revertPending(state) {
        let pending = this.pendingContextChange;
        this.pendingContextChange = null;
        this.editContext.updateText(this.toContextPos(pending.from), this.toContextPos(pending.from + pending.insert.length), state.doc.sliceString(pending.from, pending.to));
    }
    setSelection(state) {
        let { main } = state.selection;
        let start = this.toContextPos(Math.max(this.from, Math.min(this.to, main.anchor)));
        let end = this.toContextPos(main.head);
        if (this.editContext.selectionStart != start || this.editContext.selectionEnd != end)
            this.editContext.updateSelection(start, end);
    }
    rangeIsValid(state) {
        let { head } = state.selection.main;
        return !(this.from > 0 && head - this.from < 500 /* CxVp.MinMargin */ ||
            this.to < state.doc.length && this.to - head < 500 /* CxVp.MinMargin */ ||
            this.to - this.from > 10000 /* CxVp.Margin */ * 3);
    }
    toEditorPos(contextPos, clipLen = this.to - this.from) {
        contextPos = Math.min(contextPos, clipLen);
        let c = this.composing;
        return c && c.drifted ? c.editorBase + (contextPos - c.contextBase) : contextPos + this.from;
    }
    toContextPos(editorPos) {
        let c = this.composing;
        return c && c.drifted ? c.contextBase + (editorPos - c.editorBase) : editorPos - this.from;
    }
    destroy() {
        for (let event in this.handlers)
            this.editContext.removeEventListener(event, this.handlers[event]);
    }
}

// The editor's update state machine looks something like this:
//
//     Idle → Updating ⇆ Idle (unchecked) → Measuring → Idle
//                                         ↑      ↓
//                                         Updating (measure)
//
// The difference between 'Idle' and 'Idle (unchecked)' lies in
// whether a layout check has been scheduled. A regular update through
// the `update` method updates the DOM in a write-only fashion, and
// relies on a check (scheduled with `requestAnimationFrame`) to make
// sure everything is where it should be and the viewport covers the
// visible code. That check continues to measure and then optionally
// update until it reaches a coherent state.
/**
An editor view represents the editor's user interface. It holds
the editable DOM surface, and possibly other elements such as the
line number gutter. It handles events and dispatches state
transactions for editing actions.
*/
class EditorView {
    /**
    The current editor state.
    */
    get state() { return this.viewState.state; }
    /**
    To be able to display large documents without consuming too much
    memory or overloading the browser, CodeMirror only draws the
    code that is visible (plus a margin around it) to the DOM. This
    property tells you the extent of the current drawn viewport, in
    document positions.
    */
    get viewport() { return this.viewState.viewport; }
    /**
    When there are, for example, large collapsed ranges in the
    viewport, its size can be a lot bigger than the actual visible
    content. Thus, if you are doing something like styling the
    content in the viewport, it is preferable to only do so for
    these ranges, which are the subset of the viewport that is
    actually drawn.
    */
    get visibleRanges() { return this.viewState.visibleRanges; }
    /**
    Returns false when the editor is entirely scrolled out of view
    or otherwise hidden.
    */
    get inView() { return this.viewState.inView; }
    /**
    Indicates whether the user is currently composing text via
    [IME](https://en.wikipedia.org/wiki/Input_method), and at least
    one change has been made in the current composition.
    */
    get composing() { return !!this.inputState && this.inputState.composing > 0; }
    /**
    Indicates whether the user is currently in composing state. Note
    that on some platforms, like Android, this will be the case a
    lot, since just putting the cursor on a word starts a
    composition there.
    */
    get compositionStarted() { return !!this.inputState && this.inputState.composing >= 0; }
    /**
    The document or shadow root that the view lives in.
    */
    get root() { return this._root; }
    /**
    @internal
    */
    get win() { return this.dom.ownerDocument.defaultView || window; }
    /**
    Construct a new view. You'll want to either provide a `parent`
    option, or put `view.dom` into your document after creating a
    view, so that the user can see the editor.
    */
    constructor(config = {}) {
        var _a;
        this.plugins = [];
        this.pluginMap = new Map;
        this.editorAttrs = {};
        this.contentAttrs = {};
        this.bidiCache = [];
        this.destroyed = false;
        /**
        @internal
        */
        this.updateState = 2 /* UpdateState.Updating */;
        /**
        @internal
        */
        this.measureScheduled = -1;
        /**
        @internal
        */
        this.measureRequests = [];
        this.contentDOM = document.createElement("div");
        this.scrollDOM = document.createElement("div");
        this.scrollDOM.tabIndex = -1;
        this.scrollDOM.className = "cm-scroller";
        this.scrollDOM.appendChild(this.contentDOM);
        this.announceDOM = document.createElement("div");
        this.announceDOM.className = "cm-announced";
        this.announceDOM.setAttribute("aria-live", "polite");
        this.dom = document.createElement("div");
        this.dom.appendChild(this.announceDOM);
        this.dom.appendChild(this.scrollDOM);
        if (config.parent)
            config.parent.appendChild(this.dom);
        let { dispatch } = config;
        this.dispatchTransactions = config.dispatchTransactions ||
            (dispatch && ((trs) => trs.forEach(tr => dispatch(tr, this)))) ||
            ((trs) => this.update(trs));
        this.dispatch = this.dispatch.bind(this);
        this._root = (config.root || getRoot(config.parent) || document);
        this.viewState = new ViewState(config.state || state.EditorState.create(config));
        if (config.scrollTo && config.scrollTo.is(scrollIntoView))
            this.viewState.scrollTarget = config.scrollTo.value.clip(this.viewState.state);
        this.plugins = this.state.facet(viewPlugin).map(spec => new PluginInstance(spec));
        for (let plugin of this.plugins)
            plugin.update(this);
        this.observer = new DOMObserver(this);
        this.inputState = new InputState(this);
        this.inputState.ensureHandlers(this.plugins);
        this.docView = new DocView(this);
        this.mountStyles();
        this.updateAttrs();
        this.updateState = 0 /* UpdateState.Idle */;
        this.requestMeasure();
        if ((_a = document.fonts) === null || _a === void 0 ? void 0 : _a.ready)
            document.fonts.ready.then(() => this.requestMeasure());
    }
    dispatch(...input) {
        let trs = input.length == 1 && input[0] instanceof state.Transaction ? input
            : input.length == 1 && Array.isArray(input[0]) ? input[0]
                : [this.state.update(...input)];
        this.dispatchTransactions(trs, this);
    }
    /**
    Update the view for the given array of transactions. This will
    update the visible document and selection to match the state
    produced by the transactions, and notify view plugins of the
    change. You should usually call
    [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead, which uses this
    as a primitive.
    */
    update(transactions) {
        if (this.updateState != 0 /* UpdateState.Idle */)
            throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
        let redrawn = false, attrsChanged = false, update;
        let state$1 = this.state;
        for (let tr of transactions) {
            if (tr.startState != state$1)
                throw new RangeError("Trying to update state with a transaction that doesn't start from the previous state.");
            state$1 = tr.state;
        }
        if (this.destroyed) {
            this.viewState.state = state$1;
            return;
        }
        let focus = this.hasFocus, focusFlag = 0, dispatchFocus = null;
        if (transactions.some(tr => tr.annotation(isFocusChange))) {
            this.inputState.notifiedFocused = focus;
            // If a focus-change transaction is being dispatched, set this update flag.
            focusFlag = 1 /* UpdateFlag.Focus */;
        }
        else if (focus != this.inputState.notifiedFocused) {
            this.inputState.notifiedFocused = focus;
            // Schedule a separate focus transaction if necessary, otherwise
            // add a flag to this update
            dispatchFocus = focusChangeTransaction(state$1, focus);
            if (!dispatchFocus)
                focusFlag = 1 /* UpdateFlag.Focus */;
        }
        // If there was a pending DOM change, eagerly read it and try to
        // apply it after the given transactions.
        let pendingKey = this.observer.delayedAndroidKey, domChange = null;
        if (pendingKey) {
            this.observer.clearDelayedAndroidKey();
            domChange = this.observer.readChange();
            // Only try to apply DOM changes if the transactions didn't
            // change the doc or selection.
            if (domChange && !this.state.doc.eq(state$1.doc) || !this.state.selection.eq(state$1.selection))
                domChange = null;
        }
        else {
            this.observer.clear();
        }
        // When the phrases change, redraw the editor
        if (state$1.facet(state.EditorState.phrases) != this.state.facet(state.EditorState.phrases))
            return this.setState(state$1);
        update = ViewUpdate.create(this, state$1, transactions);
        update.flags |= focusFlag;
        let scrollTarget = this.viewState.scrollTarget;
        try {
            this.updateState = 2 /* UpdateState.Updating */;
            for (let tr of transactions) {
                if (scrollTarget)
                    scrollTarget = scrollTarget.map(tr.changes);
                if (tr.scrollIntoView) {
                    let { main } = tr.state.selection;
                    scrollTarget = new ScrollTarget(main.empty ? main : state.EditorSelection.cursor(main.head, main.head > main.anchor ? -1 : 1));
                }
                for (let e of tr.effects)
                    if (e.is(scrollIntoView))
                        scrollTarget = e.value.clip(this.state);
            }
            this.viewState.update(update, scrollTarget);
            this.bidiCache = CachedOrder.update(this.bidiCache, update.changes);
            if (!update.empty) {
                this.updatePlugins(update);
                this.inputState.update(update);
            }
            redrawn = this.docView.update(update);
            if (this.state.facet(styleModule) != this.styleModules)
                this.mountStyles();
            attrsChanged = this.updateAttrs();
            this.showAnnouncements(transactions);
            this.docView.updateSelection(redrawn, transactions.some(tr => tr.isUserEvent("select.pointer")));
        }
        finally {
            this.updateState = 0 /* UpdateState.Idle */;
        }
        if (update.startState.facet(theme) != update.state.facet(theme))
            this.viewState.mustMeasureContent = true;
        if (redrawn || attrsChanged || scrollTarget || this.viewState.mustEnforceCursorAssoc || this.viewState.mustMeasureContent)
            this.requestMeasure();
        if (redrawn)
            this.docViewUpdate();
        if (!update.empty)
            for (let listener of this.state.facet(updateListener)) {
                try {
                    listener(update);
                }
                catch (e) {
                    logException(this.state, e, "update listener");
                }
            }
        if (dispatchFocus || domChange)
            Promise.resolve().then(() => {
                if (dispatchFocus && this.state == dispatchFocus.startState)
                    this.dispatch(dispatchFocus);
                if (domChange) {
                    if (!applyDOMChange(this, domChange) && pendingKey.force)
                        dispatchKey(this.contentDOM, pendingKey.key, pendingKey.keyCode);
                }
            });
    }
    /**
    Reset the view to the given state. (This will cause the entire
    document to be redrawn and all view plugins to be reinitialized,
    so you should probably only use it when the new state isn't
    derived from the old state. Otherwise, use
    [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead.)
    */
    setState(newState) {
        if (this.updateState != 0 /* UpdateState.Idle */)
            throw new Error("Calls to EditorView.setState are not allowed while an update is in progress");
        if (this.destroyed) {
            this.viewState.state = newState;
            return;
        }
        this.updateState = 2 /* UpdateState.Updating */;
        let hadFocus = this.hasFocus;
        try {
            for (let plugin of this.plugins)
                plugin.destroy(this);
            this.viewState = new ViewState(newState);
            this.plugins = newState.facet(viewPlugin).map(spec => new PluginInstance(spec));
            this.pluginMap.clear();
            for (let plugin of this.plugins)
                plugin.update(this);
            this.docView.destroy();
            this.docView = new DocView(this);
            this.inputState.ensureHandlers(this.plugins);
            this.mountStyles();
            this.updateAttrs();
            this.bidiCache = [];
        }
        finally {
            this.updateState = 0 /* UpdateState.Idle */;
        }
        if (hadFocus)
            this.focus();
        this.requestMeasure();
    }
    updatePlugins(update) {
        let prevSpecs = update.startState.facet(viewPlugin), specs = update.state.facet(viewPlugin);
        if (prevSpecs != specs) {
            let newPlugins = [];
            for (let spec of specs) {
                let found = prevSpecs.indexOf(spec);
                if (found < 0) {
                    newPlugins.push(new PluginInstance(spec));
                }
                else {
                    let plugin = this.plugins[found];
                    plugin.mustUpdate = update;
                    newPlugins.push(plugin);
                }
            }
            for (let plugin of this.plugins)
                if (plugin.mustUpdate != update)
                    plugin.destroy(this);
            this.plugins = newPlugins;
            this.pluginMap.clear();
        }
        else {
            for (let p of this.plugins)
                p.mustUpdate = update;
        }
        for (let i = 0; i < this.plugins.length; i++)
            this.plugins[i].update(this);
        if (prevSpecs != specs)
            this.inputState.ensureHandlers(this.plugins);
    }
    docViewUpdate() {
        for (let plugin of this.plugins) {
            let val = plugin.value;
            if (val && val.docViewUpdate) {
                try {
                    val.docViewUpdate(this);
                }
                catch (e) {
                    logException(this.state, e, "doc view update listener");
                }
            }
        }
    }
    /**
    @internal
    */
    measure(flush = true) {
        if (this.destroyed)
            return;
        if (this.measureScheduled > -1)
            this.win.cancelAnimationFrame(this.measureScheduled);
        if (this.observer.delayedAndroidKey) {
            this.measureScheduled = -1;
            this.requestMeasure();
            return;
        }
        this.measureScheduled = 0; // Prevent requestMeasure calls from scheduling another animation frame
        if (flush)
            this.observer.forceFlush();
        let updated = null;
        let sDOM = this.scrollDOM, scrollTop = sDOM.scrollTop * this.scaleY;
        let { scrollAnchorPos, scrollAnchorHeight } = this.viewState;
        if (Math.abs(scrollTop - this.viewState.scrollTop) > 1)
            scrollAnchorHeight = -1;
        this.viewState.scrollAnchorHeight = -1;
        try {
            for (let i = 0;; i++) {
                if (scrollAnchorHeight < 0) {
                    if (isScrolledToBottom(sDOM)) {
                        scrollAnchorPos = -1;
                        scrollAnchorHeight = this.viewState.heightMap.height;
                    }
                    else {
                        let block = this.viewState.scrollAnchorAt(scrollTop);
                        scrollAnchorPos = block.from;
                        scrollAnchorHeight = block.top;
                    }
                }
                this.updateState = 1 /* UpdateState.Measuring */;
                let changed = this.viewState.measure(this);
                if (!changed && !this.measureRequests.length && this.viewState.scrollTarget == null)
                    break;
                if (i > 5) {
                    console.warn(this.measureRequests.length
                        ? "Measure loop restarted more than 5 times"
                        : "Viewport failed to stabilize");
                    break;
                }
                let measuring = [];
                // Only run measure requests in this cycle when the viewport didn't change
                if (!(changed & 4 /* UpdateFlag.Viewport */))
                    [this.measureRequests, measuring] = [measuring, this.measureRequests];
                let measured = measuring.map(m => {
                    try {
                        return m.read(this);
                    }
                    catch (e) {
                        logException(this.state, e);
                        return BadMeasure;
                    }
                });
                let update = ViewUpdate.create(this, this.state, []), redrawn = false;
                update.flags |= changed;
                if (!updated)
                    updated = update;
                else
                    updated.flags |= changed;
                this.updateState = 2 /* UpdateState.Updating */;
                if (!update.empty) {
                    this.updatePlugins(update);
                    this.inputState.update(update);
                    this.updateAttrs();
                    redrawn = this.docView.update(update);
                    if (redrawn)
                        this.docViewUpdate();
                }
                for (let i = 0; i < measuring.length; i++)
                    if (measured[i] != BadMeasure) {
                        try {
                            let m = measuring[i];
                            if (m.write)
                                m.write(measured[i], this);
                        }
                        catch (e) {
                            logException(this.state, e);
                        }
                    }
                if (redrawn)
                    this.docView.updateSelection(true);
                if (!update.viewportChanged && this.measureRequests.length == 0) {
                    if (this.viewState.editorHeight) {
                        if (this.viewState.scrollTarget) {
                            this.docView.scrollIntoView(this.viewState.scrollTarget);
                            this.viewState.scrollTarget = null;
                            scrollAnchorHeight = -1;
                            continue;
                        }
                        else {
                            let newAnchorHeight = scrollAnchorPos < 0 ? this.viewState.heightMap.height :
                                this.viewState.lineBlockAt(scrollAnchorPos).top;
                            let diff = newAnchorHeight - scrollAnchorHeight;
                            if (diff > 1 || diff < -1) {
                                scrollTop = scrollTop + diff;
                                sDOM.scrollTop = scrollTop / this.scaleY;
                                scrollAnchorHeight = -1;
                                continue;
                            }
                        }
                    }
                    break;
                }
            }
        }
        finally {
            this.updateState = 0 /* UpdateState.Idle */;
            this.measureScheduled = -1;
        }
        if (updated && !updated.empty)
            for (let listener of this.state.facet(updateListener))
                listener(updated);
    }
    /**
    Get the CSS classes for the currently active editor themes.
    */
    get themeClasses() {
        return baseThemeID + " " +
            (this.state.facet(darkTheme) ? baseDarkID : baseLightID) + " " +
            this.state.facet(theme);
    }
    updateAttrs() {
        let editorAttrs = attrsFromFacet(this, editorAttributes, {
            class: "cm-editor" + (this.hasFocus ? " cm-focused " : " ") + this.themeClasses
        });
        let contentAttrs = {
            spellcheck: "false",
            autocorrect: "off",
            autocapitalize: "off",
            writingsuggestions: "false",
            translate: "no",
            contenteditable: !this.state.facet(editable) ? "false" : "true",
            class: "cm-content",
            style: `${browser.tabSize}: ${this.state.tabSize}`,
            role: "textbox",
            "aria-multiline": "true"
        };
        if (this.state.readOnly)
            contentAttrs["aria-readonly"] = "true";
        attrsFromFacet(this, contentAttributes, contentAttrs);
        let changed = this.observer.ignore(() => {
            let changedContent = updateAttrs(this.contentDOM, this.contentAttrs, contentAttrs);
            let changedEditor = updateAttrs(this.dom, this.editorAttrs, editorAttrs);
            return changedContent || changedEditor;
        });
        this.editorAttrs = editorAttrs;
        this.contentAttrs = contentAttrs;
        return changed;
    }
    showAnnouncements(trs) {
        let first = true;
        for (let tr of trs)
            for (let effect of tr.effects)
                if (effect.is(EditorView.announce)) {
                    if (first)
                        this.announceDOM.textContent = "";
                    first = false;
                    let div = this.announceDOM.appendChild(document.createElement("div"));
                    div.textContent = effect.value;
                }
    }
    mountStyles() {
        this.styleModules = this.state.facet(styleModule);
        let nonce = this.state.facet(EditorView.cspNonce);
        styleMod.StyleModule.mount(this.root, this.styleModules.concat(baseTheme$1).reverse(), nonce ? { nonce } : undefined);
    }
    readMeasured() {
        if (this.updateState == 2 /* UpdateState.Updating */)
            throw new Error("Reading the editor layout isn't allowed during an update");
        if (this.updateState == 0 /* UpdateState.Idle */ && this.measureScheduled > -1)
            this.measure(false);
    }
    /**
    Schedule a layout measurement, optionally providing callbacks to
    do custom DOM measuring followed by a DOM write phase. Using
    this is preferable reading DOM layout directly from, for
    example, an event handler, because it'll make sure measuring and
    drawing done by other components is synchronized, avoiding
    unnecessary DOM layout computations.
    */
    requestMeasure(request) {
        if (this.measureScheduled < 0)
            this.measureScheduled = this.win.requestAnimationFrame(() => this.measure());
        if (request) {
            if (this.measureRequests.indexOf(request) > -1)
                return;
            if (request.key != null)
                for (let i = 0; i < this.measureRequests.length; i++) {
                    if (this.measureRequests[i].key === request.key) {
                        this.measureRequests[i] = request;
                        return;
                    }
                }
            this.measureRequests.push(request);
        }
    }
    /**
    Get the value of a specific plugin, if present. Note that
    plugins that crash can be dropped from a view, so even when you
    know you registered a given plugin, it is recommended to check
    the return value of this method.
    */
    plugin(plugin) {
        let known = this.pluginMap.get(plugin);
        if (known === undefined || known && known.plugin != plugin)
            this.pluginMap.set(plugin, known = this.plugins.find(p => p.plugin == plugin) || null);
        return known && known.update(this).value;
    }
    /**
    The top position of the document, in screen coordinates. This
    may be negative when the editor is scrolled down. Points
    directly to the top of the first line, not above the padding.
    */
    get documentTop() {
        return this.contentDOM.getBoundingClientRect().top + this.viewState.paddingTop;
    }
    /**
    Reports the padding above and below the document.
    */
    get documentPadding() {
        return { top: this.viewState.paddingTop, bottom: this.viewState.paddingBottom };
    }
    /**
    If the editor is transformed with CSS, this provides the scale
    along the X axis. Otherwise, it will just be 1. Note that
    transforms other than translation and scaling are not supported.
    */
    get scaleX() { return this.viewState.scaleX; }
    /**
    Provide the CSS transformed scale along the Y axis.
    */
    get scaleY() { return this.viewState.scaleY; }
    /**
    Find the text line or block widget at the given vertical
    position (which is interpreted as relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop)).
    */
    elementAtHeight(height) {
        this.readMeasured();
        return this.viewState.elementAtHeight(height);
    }
    /**
    Find the line block (see
    [`lineBlockAt`](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt)) at the given
    height, again interpreted relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop).
    */
    lineBlockAtHeight(height) {
        this.readMeasured();
        return this.viewState.lineBlockAtHeight(height);
    }
    /**
    Get the extent and vertical position of all [line
    blocks](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt) in the viewport. Positions
    are relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop);
    */
    get viewportLineBlocks() {
        return this.viewState.viewportLines;
    }
    /**
    Find the line block around the given document position. A line
    block is a range delimited on both sides by either a
    non-[hidden](https://codemirror.net/6/docs/ref/#view.Decoration^replace) line break, or the
    start/end of the document. It will usually just hold a line of
    text, but may be broken into multiple textblocks by block
    widgets.
    */
    lineBlockAt(pos) {
        return this.viewState.lineBlockAt(pos);
    }
    /**
    The editor's total content height.
    */
    get contentHeight() {
        return this.viewState.contentHeight;
    }
    /**
    Move a cursor position by [grapheme
    cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak). `forward` determines whether
    the motion is away from the line start, or towards it. In
    bidirectional text, the line is traversed in visual order, using
    the editor's [text direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection).
    When the start position was the last one on the line, the
    returned position will be across the line break. If there is no
    further line, the original position is returned.
    
    By default, this method moves over a single cluster. The
    optional `by` argument can be used to move across more. It will
    be called with the first cluster as argument, and should return
    a predicate that determines, for each subsequent cluster,
    whether it should also be moved over.
    */
    moveByChar(start, forward, by) {
        return skipAtoms(this, start, moveByChar(this, start, forward, by));
    }
    /**
    Move a cursor position across the next group of either
    [letters](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) or non-letter
    non-whitespace characters.
    */
    moveByGroup(start, forward) {
        return skipAtoms(this, start, moveByChar(this, start, forward, initial => byGroup(this, start.head, initial)));
    }
    /**
    Get the cursor position visually at the start or end of a line.
    Note that this may differ from the _logical_ position at its
    start or end (which is simply at `line.from`/`line.to`) if text
    at the start or end goes against the line's base text direction.
    */
    visualLineSide(line, end) {
        let order = this.bidiSpans(line), dir = this.textDirectionAt(line.from);
        let span = order[end ? order.length - 1 : 0];
        return state.EditorSelection.cursor(span.side(end, dir) + line.from, span.forward(!end, dir) ? 1 : -1);
    }
    /**
    Move to the next line boundary in the given direction. If
    `includeWrap` is true, line wrapping is on, and there is a
    further wrap point on the current line, the wrap point will be
    returned. Otherwise this function will return the start or end
    of the line.
    */
    moveToLineBoundary(start, forward, includeWrap = true) {
        return moveToLineBoundary(this, start, forward, includeWrap);
    }
    /**
    Move a cursor position vertically. When `distance` isn't given,
    it defaults to moving to the next line (including wrapped
    lines). Otherwise, `distance` should provide a positive distance
    in pixels.
    
    When `start` has a
    [`goalColumn`](https://codemirror.net/6/docs/ref/#state.SelectionRange.goalColumn), the vertical
    motion will use that as a target horizontal position. Otherwise,
    the cursor's own horizontal position is used. The returned
    cursor will have its goal column set to whichever column was
    used.
    */
    moveVertically(start, forward, distance) {
        return skipAtoms(this, start, moveVertically(this, start, forward, distance));
    }
    /**
    Find the DOM parent node and offset (child offset if `node` is
    an element, character offset when it is a text node) at the
    given document position.
    
    Note that for positions that aren't currently in
    `visibleRanges`, the resulting DOM position isn't necessarily
    meaningful (it may just point before or after a placeholder
    element).
    */
    domAtPos(pos, side = 1) {
        return this.docView.domAtPos(pos, side);
    }
    /**
    Find the document position at the given DOM node. Can be useful
    for associating positions with DOM events. Will raise an error
    when `node` isn't part of the editor content.
    */
    posAtDOM(node, offset = 0) {
        return this.docView.posFromDOM(node, offset);
    }
    posAtCoords(coords, precise = true) {
        this.readMeasured();
        let found = posAtCoords(this, coords, precise);
        return found && found.pos;
    }
    posAndSideAtCoords(coords, precise = true) {
        this.readMeasured();
        return posAtCoords(this, coords, precise);
    }
    /**
    Get the screen coordinates at the given document position.
    `side` determines whether the coordinates are based on the
    element before (-1) or after (1) the position (if no element is
    available on the given side, the method will transparently use
    another strategy to get reasonable coordinates).
    */
    coordsAtPos(pos, side = 1) {
        this.readMeasured();
        let rect = this.docView.coordsAt(pos, side);
        if (!rect || rect.left == rect.right)
            return rect;
        let line = this.state.doc.lineAt(pos), order = this.bidiSpans(line);
        let span = order[BidiSpan.find(order, pos - line.from, -1, side)];
        return flattenRect(rect, (span.dir == exports.Direction.LTR) == (side > 0));
    }
    /**
    Return the rectangle around a given character. If `pos` does not
    point in front of a character that is in the viewport and
    rendered (i.e. not replaced, not a line break), this will return
    null. For space characters that are a line wrap point, this will
    return the position before the line break.
    */
    coordsForChar(pos) {
        this.readMeasured();
        return this.docView.coordsForChar(pos);
    }
    /**
    The default width of a character in the editor. May not
    accurately reflect the width of all characters (given variable
    width fonts or styling of invididual ranges).
    */
    get defaultCharacterWidth() { return this.viewState.heightOracle.charWidth; }
    /**
    The default height of a line in the editor. May not be accurate
    for all lines.
    */
    get defaultLineHeight() { return this.viewState.heightOracle.lineHeight; }
    /**
    The text direction
    ([`direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)
    CSS property) of the editor's content element.
    */
    get textDirection() { return this.viewState.defaultTextDirection; }
    /**
    Find the text direction of the block at the given position, as
    assigned by CSS. If
    [`perLineTextDirection`](https://codemirror.net/6/docs/ref/#view.EditorView^perLineTextDirection)
    isn't enabled, or the given position is outside of the viewport,
    this will always return the same as
    [`textDirection`](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection). Note that
    this may trigger a DOM layout.
    */
    textDirectionAt(pos) {
        let perLine = this.state.facet(perLineTextDirection);
        if (!perLine || pos < this.viewport.from || pos > this.viewport.to)
            return this.textDirection;
        this.readMeasured();
        return this.docView.textDirectionAt(pos);
    }
    /**
    Whether this editor [wraps lines](https://codemirror.net/6/docs/ref/#view.EditorView.lineWrapping)
    (as determined by the
    [`white-space`](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)
    CSS property of its content element).
    */
    get lineWrapping() { return this.viewState.heightOracle.lineWrapping; }
    /**
    Returns the bidirectional text structure of the given line
    (which should be in the current document) as an array of span
    objects. The order of these spans matches the [text
    direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection)—if that is
    left-to-right, the leftmost spans come first, otherwise the
    rightmost spans come first.
    */
    bidiSpans(line) {
        if (line.length > MaxBidiLine)
            return trivialOrder(line.length);
        let dir = this.textDirectionAt(line.from), isolates;
        for (let entry of this.bidiCache) {
            if (entry.from == line.from && entry.dir == dir &&
                (entry.fresh || isolatesEq(entry.isolates, isolates = getIsolatedRanges(this, line))))
                return entry.order;
        }
        if (!isolates)
            isolates = getIsolatedRanges(this, line);
        let order = computeOrder(line.text, dir, isolates);
        this.bidiCache.push(new CachedOrder(line.from, line.to, dir, isolates, true, order));
        return order;
    }
    /**
    Check whether the editor has focus.
    */
    get hasFocus() {
        var _a;
        // Safari return false for hasFocus when the context menu is open
        // or closing, which leads us to ignore selection changes from the
        // context menu because it looks like the editor isn't focused.
        // This kludges around that.
        return (this.dom.ownerDocument.hasFocus() || browser.safari && ((_a = this.inputState) === null || _a === void 0 ? void 0 : _a.lastContextMenu) > Date.now() - 3e4) &&
            this.root.activeElement == this.contentDOM;
    }
    /**
    Put focus on the editor.
    */
    focus() {
        this.observer.ignore(() => {
            focusPreventScroll(this.contentDOM);
            this.docView.updateSelection();
        });
    }
    /**
    Update the [root](https://codemirror.net/6/docs/ref/##view.EditorViewConfig.root) in which the editor lives. This is only
    necessary when moving the editor's existing DOM to a new window or shadow root.
    */
    setRoot(root) {
        if (this._root != root) {
            this._root = root;
            this.observer.setWindow((root.nodeType == 9 ? root : root.ownerDocument).defaultView || window);
            this.mountStyles();
        }
    }
    /**
    Clean up this editor view, removing its element from the
    document, unregistering event handlers, and notifying
    plugins. The view instance can no longer be used after
    calling this.
    */
    destroy() {
        if (this.root.activeElement == this.contentDOM)
            this.contentDOM.blur();
        for (let plugin of this.plugins)
            plugin.destroy(this);
        this.plugins = [];
        this.inputState.destroy();
        this.docView.destroy();
        this.dom.remove();
        this.observer.destroy();
        if (this.measureScheduled > -1)
            this.win.cancelAnimationFrame(this.measureScheduled);
        this.destroyed = true;
    }
    /**
    Returns an effect that can be
    [added](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) to a transaction to
    cause it to scroll the given position or range into view.
    */
    static scrollIntoView(pos, options = {}) {
        return scrollIntoView.of(new ScrollTarget(typeof pos == "number" ? state.EditorSelection.cursor(pos) : pos, options.y, options.x, options.yMargin, options.xMargin));
    }
    /**
    Return an effect that resets the editor to its current (at the
    time this method was called) scroll position. Note that this
    only affects the editor's own scrollable element, not parents.
    See also
    [`EditorViewConfig.scrollTo`](https://codemirror.net/6/docs/ref/#view.EditorViewConfig.scrollTo).
    
    The effect should be used with a document identical to the one
    it was created for. Failing to do so is not an error, but may
    not scroll to the expected position. You can
    [map](https://codemirror.net/6/docs/ref/#state.StateEffect.map) the effect to account for changes.
    */
    scrollSnapshot() {
        let { scrollTop, scrollLeft } = this.scrollDOM;
        let ref = this.viewState.scrollAnchorAt(scrollTop);
        return scrollIntoView.of(new ScrollTarget(state.EditorSelection.cursor(ref.from), "start", "start", ref.top - scrollTop, scrollLeft, true));
    }
    /**
    Enable or disable tab-focus mode, which disables key bindings
    for Tab and Shift-Tab, letting the browser's default
    focus-changing behavior go through instead. This is useful to
    prevent trapping keyboard users in your editor.
    
    Without argument, this toggles the mode. With a boolean, it
    enables (true) or disables it (false). Given a number, it
    temporarily enables the mode until that number of milliseconds
    have passed or another non-Tab key is pressed.
    */
    setTabFocusMode(to) {
        if (to == null)
            this.inputState.tabFocusMode = this.inputState.tabFocusMode < 0 ? 0 : -1;
        else if (typeof to == "boolean")
            this.inputState.tabFocusMode = to ? 0 : -1;
        else if (this.inputState.tabFocusMode != 0)
            this.inputState.tabFocusMode = Date.now() + to;
    }
    /**
    Returns an extension that can be used to add DOM event handlers.
    The value should be an object mapping event names to handler
    functions. For any given event, such functions are ordered by
    extension precedence, and the first handler to return true will
    be assumed to have handled that event, and no other handlers or
    built-in behavior will be activated for it. These are registered
    on the [content element](https://codemirror.net/6/docs/ref/#view.EditorView.contentDOM), except
    for `scroll` handlers, which will be called any time the
    editor's [scroll element](https://codemirror.net/6/docs/ref/#view.EditorView.scrollDOM) or one of
    its parent nodes is scrolled.
    */
    static domEventHandlers(handlers) {
        return ViewPlugin.define(() => ({}), { eventHandlers: handlers });
    }
    /**
    Create an extension that registers DOM event observers. Contrary
    to event [handlers](https://codemirror.net/6/docs/ref/#view.EditorView^domEventHandlers),
    observers can't be prevented from running by a higher-precedence
    handler returning true. They also don't prevent other handlers
    and observers from running when they return true, and should not
    call `preventDefault`.
    */
    static domEventObservers(observers) {
        return ViewPlugin.define(() => ({}), { eventObservers: observers });
    }
    /**
    Create a theme extension. The first argument can be a
    [`style-mod`](https://github.com/marijnh/style-mod#documentation)
    style spec providing the styles for the theme. These will be
    prefixed with a generated class for the style.
    
    Because the selectors will be prefixed with a scope class, rule
    that directly match the editor's [wrapper
    element](https://codemirror.net/6/docs/ref/#view.EditorView.dom)—to which the scope class will be
    added—need to be explicitly differentiated by adding an `&` to
    the selector for that element—for example
    `&.cm-focused`.
    
    When `dark` is set to true, the theme will be marked as dark,
    which will cause the `&dark` rules from [base
    themes](https://codemirror.net/6/docs/ref/#view.EditorView^baseTheme) to be used (as opposed to
    `&light` when a light theme is active).
    */
    static theme(spec, options) {
        let prefix = styleMod.StyleModule.newName();
        let result = [theme.of(prefix), styleModule.of(buildTheme(`.${prefix}`, spec))];
        if (options && options.dark)
            result.push(darkTheme.of(true));
        return result;
    }
    /**
    Create an extension that adds styles to the base theme. Like
    with [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme), use `&` to indicate the
    place of the editor wrapper element when directly targeting
    that. You can also use `&dark` or `&light` instead to only
    target editors with a dark or light theme.
    */
    static baseTheme(spec) {
        return state.Prec.lowest(styleModule.of(buildTheme("." + baseThemeID, spec, lightDarkIDs)));
    }
    /**
    Retrieve an editor view instance from the view's DOM
    representation.
    */
    static findFromDOM(dom) {
        var _a;
        let content = dom.querySelector(".cm-content");
        let tile = content && Tile.get(content) || Tile.get(dom);
        return ((_a = tile === null || tile === void 0 ? void 0 : tile.root) === null || _a === void 0 ? void 0 : _a.view) || null;
    }
}
/**
Facet to add a [style
module](https://github.com/marijnh/style-mod#documentation) to
an editor view. The view will ensure that the module is
mounted in its [document
root](https://codemirror.net/6/docs/ref/#view.EditorView.constructor^config.root).
*/
EditorView.styleModule = styleModule;
/**
An input handler can override the way changes to the editable
DOM content are handled. Handlers are passed the document
positions between which the change was found, and the new
content. When one returns true, no further input handlers are
called and the default behavior is prevented.

The `insert` argument can be used to get the default transaction
that would be applied for this input. This can be useful when
dispatching the custom behavior as a separate transaction.
*/
EditorView.inputHandler = inputHandler;
/**
Functions provided in this facet will be used to transform text
pasted or dropped into the editor.
*/
EditorView.clipboardInputFilter = clipboardInputFilter;
/**
Transform text copied or dragged from the editor.
*/
EditorView.clipboardOutputFilter = clipboardOutputFilter;
/**
Scroll handlers can override how things are scrolled into view.
If they return `true`, no further handling happens for the
scrolling. If they return false, the default scroll behavior is
applied. Scroll handlers should never initiate editor updates.
*/
EditorView.scrollHandler = scrollHandler;
/**
This facet can be used to provide functions that create effects
to be dispatched when the editor's focus state changes.
*/
EditorView.focusChangeEffect = focusChangeEffect;
/**
By default, the editor assumes all its content has the same
[text direction](https://codemirror.net/6/docs/ref/#view.Direction). Configure this with a `true`
value to make it read the text direction of every (rendered)
line separately.
*/
EditorView.perLineTextDirection = perLineTextDirection;
/**
Allows you to provide a function that should be called when the
library catches an exception from an extension (mostly from view
plugins, but may be used by other extensions to route exceptions
from user-code-provided callbacks). This is mostly useful for
debugging and logging. See [`logException`](https://codemirror.net/6/docs/ref/#view.logException).
*/
EditorView.exceptionSink = exceptionSink;
/**
A facet that can be used to register a function to be called
every time the view updates.
*/
EditorView.updateListener = updateListener;
/**
Facet that controls whether the editor content DOM is editable.
When its highest-precedence value is `false`, the element will
not have its `contenteditable` attribute set. (Note that this
doesn't affect API calls that change the editor content, even
when those are bound to keys or buttons. See the
[`readOnly`](https://codemirror.net/6/docs/ref/#state.EditorState.readOnly) facet for that.)
*/
EditorView.editable = editable;
/**
Allows you to influence the way mouse selection happens. The
functions in this facet will be called for a `mousedown` event
on the editor, and can return an object that overrides the way a
selection is computed from that mouse click or drag.
*/
EditorView.mouseSelectionStyle = mouseSelectionStyle;
/**
Facet used to configure whether a given selection drag event
should move or copy the selection. The given predicate will be
called with the `mousedown` event, and can return `true` when
the drag should move the content.
*/
EditorView.dragMovesSelection = dragMovesSelection$1;
/**
Facet used to configure whether a given selecting click adds a
new range to the existing selection or replaces it entirely. The
default behavior is to check `event.metaKey` on macOS, and
`event.ctrlKey` elsewhere.
*/
EditorView.clickAddsSelectionRange = clickAddsSelectionRange;
/**
A facet that determines which [decorations](https://codemirror.net/6/docs/ref/#view.Decoration)
are shown in the view. Decorations can be provided in two
ways—directly, or via a function that takes an editor view.

Only decoration sets provided directly are allowed to influence
the editor's vertical layout structure. The ones provided as
functions are called _after_ the new viewport has been computed,
and thus **must not** introduce block widgets or replacing
decorations that cover line breaks.

If you want decorated ranges to behave like atomic units for
cursor motion and deletion purposes, also provide the range set
containing the decorations to
[`EditorView.atomicRanges`](https://codemirror.net/6/docs/ref/#view.EditorView^atomicRanges).
*/
EditorView.decorations = decorations;
/**
[Block wrappers](https://codemirror.net/6/docs/ref/#view.BlockWrapper) provide a way to add DOM
structure around editor lines and block widgets. Sets of
wrappers are provided in a similar way to decorations, and are
nested in a similar way when they overlap. A wrapper affects all
lines and block widgets that start inside its range.
*/
EditorView.blockWrappers = blockWrappers;
/**
Facet that works much like
[`decorations`](https://codemirror.net/6/docs/ref/#view.EditorView^decorations), but puts its
inputs at the very bottom of the precedence stack, meaning mark
decorations provided here will only be split by other, partially
overlapping `outerDecorations` ranges, and wrap around all
regular decorations. Use this for mark elements that should, as
much as possible, remain in one piece.
*/
EditorView.outerDecorations = outerDecorations;
/**
Used to provide ranges that should be treated as atoms as far as
cursor motion is concerned. This causes methods like
[`moveByChar`](https://codemirror.net/6/docs/ref/#view.EditorView.moveByChar) and
[`moveVertically`](https://codemirror.net/6/docs/ref/#view.EditorView.moveVertically) (and the
commands built on top of them) to skip across such regions when
a selection endpoint would enter them. This does _not_ prevent
direct programmatic [selection
updates](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection) from moving into such
regions.
*/
EditorView.atomicRanges = atomicRanges;
/**
When range decorations add a `unicode-bidi: isolate` style, they
should also include a
[`bidiIsolate`](https://codemirror.net/6/docs/ref/#view.MarkDecorationSpec.bidiIsolate) property
in their decoration spec, and be exposed through this facet, so
that the editor can compute the proper text order. (Other values
for `unicode-bidi`, except of course `normal`, are not
supported.)
*/
EditorView.bidiIsolatedRanges = bidiIsolatedRanges;
/**
Facet that allows extensions to provide additional scroll
margins (space around the sides of the scrolling element that
should be considered invisible). This can be useful when the
plugin introduces elements that cover part of that element (for
example a horizontally fixed gutter).
*/
EditorView.scrollMargins = scrollMargins;
/**
This facet records whether a dark theme is active. The extension
returned by [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme) automatically
includes an instance of this when the `dark` option is set to
true.
*/
EditorView.darkTheme = darkTheme;
/**
Provides a Content Security Policy nonce to use when creating
the style sheets for the editor. Holds the empty string when no
nonce has been provided.
*/
EditorView.cspNonce = state.Facet.define({ combine: values => values.length ? values[0] : "" });
/**
Facet that provides additional DOM attributes for the editor's
editable DOM element.
*/
EditorView.contentAttributes = contentAttributes;
/**
Facet that provides DOM attributes for the editor's outer
element.
*/
EditorView.editorAttributes = editorAttributes;
/**
An extension that enables line wrapping in the editor (by
setting CSS `white-space` to `pre-wrap` in the content).
*/
EditorView.lineWrapping = EditorView.contentAttributes.of({ "class": "cm-lineWrapping" });
/**
State effect used to include screen reader announcements in a
transaction. These will be added to the DOM in a visually hidden
element with `aria-live="polite"` set, and should be used to
describe effects that are visually obvious but may not be
noticed by screen reader users (such as moving to the next
search match).
*/
EditorView.announce = state.StateEffect.define();
// Maximum line length for which we compute accurate bidi info
const MaxBidiLine = 4096;
const BadMeasure = {};
class CachedOrder {
    constructor(from, to, dir, isolates, fresh, order) {
        this.from = from;
        this.to = to;
        this.dir = dir;
        this.isolates = isolates;
        this.fresh = fresh;
        this.order = order;
    }
    static update(cache, changes) {
        if (changes.empty && !cache.some(c => c.fresh))
            return cache;
        let result = [], lastDir = cache.length ? cache[cache.length - 1].dir : exports.Direction.LTR;
        for (let i = Math.max(0, cache.length - 10); i < cache.length; i++) {
            let entry = cache[i];
            if (entry.dir == lastDir && !changes.touchesRange(entry.from, entry.to))
                result.push(new CachedOrder(changes.mapPos(entry.from, 1), changes.mapPos(entry.to, -1), entry.dir, entry.isolates, false, entry.order));
        }
        return result;
    }
}
function attrsFromFacet(view, facet, base) {
    for (let sources = view.state.facet(facet), i = sources.length - 1; i >= 0; i--) {
        let source = sources[i], value = typeof source == "function" ? source(view) : source;
        if (value)
            combineAttrs(value, base);
    }
    return base;
}

const currentPlatform = browser.mac ? "mac" : browser.windows ? "win" : browser.linux ? "linux" : "key";
function normalizeKeyName(name, platform) {
    const parts = name.split(/-(?!$)/);
    let result = parts[parts.length - 1];
    if (result == "Space")
        result = " ";
    let alt, ctrl, shift, meta;
    for (let i = 0; i < parts.length - 1; ++i) {
        const mod = parts[i];
        if (/^(cmd|meta|m)$/i.test(mod))
            meta = true;
        else if (/^a(lt)?$/i.test(mod))
            alt = true;
        else if (/^(c|ctrl|control)$/i.test(mod))
            ctrl = true;
        else if (/^s(hift)?$/i.test(mod))
            shift = true;
        else if (/^mod$/i.test(mod)) {
            if (platform == "mac")
                meta = true;
            else
                ctrl = true;
        }
        else
            throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt)
        result = "Alt-" + result;
    if (ctrl)
        result = "Ctrl-" + result;
    if (meta)
        result = "Meta-" + result;
    if (shift)
        result = "Shift-" + result;
    return result;
}
function modifiers(name, event, shift) {
    if (event.altKey)
        name = "Alt-" + name;
    if (event.ctrlKey)
        name = "Ctrl-" + name;
    if (event.metaKey)
        name = "Meta-" + name;
    if (shift !== false && event.shiftKey)
        name = "Shift-" + name;
    return name;
}
const handleKeyEvents = state.Prec.default(EditorView.domEventHandlers({
    keydown(event, view) {
        return runHandlers(getKeymap(view.state), event, view, "editor");
    }
}));
/**
Facet used for registering keymaps.

You can add multiple keymaps to an editor. Their priorities
determine their precedence (the ones specified early or with high
priority get checked first). When a handler has returned `true`
for a given key, no further handlers are called.
*/
const keymap = state.Facet.define({ enables: handleKeyEvents });
const Keymaps = new WeakMap();
// This is hidden behind an indirection, rather than directly computed
// by the facet, to keep internal types out of the facet's type.
function getKeymap(state) {
    let bindings = state.facet(keymap);
    let map = Keymaps.get(bindings);
    if (!map)
        Keymaps.set(bindings, map = buildKeymap(bindings.reduce((a, b) => a.concat(b), [])));
    return map;
}
/**
Run the key handlers registered for a given scope. The event
object should be a `"keydown"` event. Returns true if any of the
handlers handled it.
*/
function runScopeHandlers(view, event, scope) {
    return runHandlers(getKeymap(view.state), event, view, scope);
}
let storedPrefix = null;
const PrefixTimeout = 4000;
function buildKeymap(bindings, platform = currentPlatform) {
    let bound = Object.create(null);
    let isPrefix = Object.create(null);
    let checkPrefix = (name, is) => {
        let current = isPrefix[name];
        if (current == null)
            isPrefix[name] = is;
        else if (current != is)
            throw new Error("Key binding " + name + " is used both as a regular binding and as a multi-stroke prefix");
    };
    let add = (scope, key, command, preventDefault, stopPropagation) => {
        var _a, _b;
        let scopeObj = bound[scope] || (bound[scope] = Object.create(null));
        let parts = key.split(/ (?!$)/).map(k => normalizeKeyName(k, platform));
        for (let i = 1; i < parts.length; i++) {
            let prefix = parts.slice(0, i).join(" ");
            checkPrefix(prefix, true);
            if (!scopeObj[prefix])
                scopeObj[prefix] = {
                    preventDefault: true,
                    stopPropagation: false,
                    run: [(view) => {
                            let ourObj = storedPrefix = { view, prefix, scope };
                            setTimeout(() => { if (storedPrefix == ourObj)
                                storedPrefix = null; }, PrefixTimeout);
                            return true;
                        }]
                };
        }
        let full = parts.join(" ");
        checkPrefix(full, false);
        let binding = scopeObj[full] || (scopeObj[full] = {
            preventDefault: false,
            stopPropagation: false,
            run: ((_b = (_a = scopeObj._any) === null || _a === void 0 ? void 0 : _a.run) === null || _b === void 0 ? void 0 : _b.slice()) || []
        });
        if (command)
            binding.run.push(command);
        if (preventDefault)
            binding.preventDefault = true;
        if (stopPropagation)
            binding.stopPropagation = true;
    };
    for (let b of bindings) {
        let scopes = b.scope ? b.scope.split(" ") : ["editor"];
        if (b.any)
            for (let scope of scopes) {
                let scopeObj = bound[scope] || (bound[scope] = Object.create(null));
                if (!scopeObj._any)
                    scopeObj._any = { preventDefault: false, stopPropagation: false, run: [] };
                let { any } = b;
                for (let key in scopeObj)
                    scopeObj[key].run.push(view => any(view, currentKeyEvent));
            }
        let name = b[platform] || b.key;
        if (!name)
            continue;
        for (let scope of scopes) {
            add(scope, name, b.run, b.preventDefault, b.stopPropagation);
            if (b.shift)
                add(scope, "Shift-" + name, b.shift, b.preventDefault, b.stopPropagation);
        }
    }
    return bound;
}
let currentKeyEvent = null;
function runHandlers(map, event, view, scope) {
    currentKeyEvent = event;
    let name = w3cKeyname.keyName(event);
    let charCode = state.codePointAt(name, 0), isChar = state.codePointSize(charCode) == name.length && name != " ";
    let prefix = "", handled = false, prevented = false, stopPropagation = false;
    if (storedPrefix && storedPrefix.view == view && storedPrefix.scope == scope) {
        prefix = storedPrefix.prefix + " ";
        if (modifierCodes.indexOf(event.keyCode) < 0) {
            prevented = true;
            storedPrefix = null;
        }
    }
    let ran = new Set;
    let runFor = (binding) => {
        if (binding) {
            for (let cmd of binding.run)
                if (!ran.has(cmd)) {
                    ran.add(cmd);
                    if (cmd(view)) {
                        if (binding.stopPropagation)
                            stopPropagation = true;
                        return true;
                    }
                }
            if (binding.preventDefault) {
                if (binding.stopPropagation)
                    stopPropagation = true;
                prevented = true;
            }
        }
        return false;
    };
    let scopeObj = map[scope], baseName, shiftName;
    if (scopeObj) {
        if (runFor(scopeObj[prefix + modifiers(name, event, !isChar)])) {
            handled = true;
        }
        else if (isChar && (event.altKey || event.metaKey || event.ctrlKey) &&
            // Ctrl-Alt may be used for AltGr on Windows
            !(browser.windows && event.ctrlKey && event.altKey) &&
            // Alt-combinations on macOS tend to be typed characters
            !(browser.mac && event.altKey && !(event.ctrlKey || event.metaKey)) &&
            (baseName = w3cKeyname.base[event.keyCode]) && baseName != name) {
            if (runFor(scopeObj[prefix + modifiers(baseName, event, true)])) {
                handled = true;
            }
            else if (event.shiftKey && (shiftName = w3cKeyname.shift[event.keyCode]) != name && shiftName != baseName &&
                runFor(scopeObj[prefix + modifiers(shiftName, event, false)])) {
                handled = true;
            }
        }
        else if (isChar && event.shiftKey &&
            runFor(scopeObj[prefix + modifiers(name, event, true)])) {
            handled = true;
        }
        if (!handled && runFor(scopeObj._any))
            handled = true;
    }
    if (prevented)
        handled = true;
    if (handled && stopPropagation)
        event.stopPropagation();
    currentKeyEvent = null;
    return handled;
}

/**
Implementation of [`LayerMarker`](https://codemirror.net/6/docs/ref/#view.LayerMarker) that creates
a rectangle at a given set of coordinates.
*/
class RectangleMarker {
    /**
    Create a marker with the given class and dimensions. If `width`
    is null, the DOM element will get no width style.
    */
    constructor(className, 
    /**
    The left position of the marker (in pixels, document-relative).
    */
    left, 
    /**
    The top position of the marker.
    */
    top, 
    /**
    The width of the marker, or null if it shouldn't get a width assigned.
    */
    width, 
    /**
    The height of the marker.
    */
    height) {
        this.className = className;
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }
    draw() {
        let elt = document.createElement("div");
        elt.className = this.className;
        this.adjust(elt);
        return elt;
    }
    update(elt, prev) {
        if (prev.className != this.className)
            return false;
        this.adjust(elt);
        return true;
    }
    adjust(elt) {
        elt.style.left = this.left + "px";
        elt.style.top = this.top + "px";
        if (this.width != null)
            elt.style.width = this.width + "px";
        elt.style.height = this.height + "px";
    }
    eq(p) {
        return this.left == p.left && this.top == p.top && this.width == p.width && this.height == p.height &&
            this.className == p.className;
    }
    /**
    Create a set of rectangles for the given selection range,
    assigning them theclass`className`. Will create a single
    rectangle for empty ranges, and a set of selection-style
    rectangles covering the range's content (in a bidi-aware
    way) for non-empty ones.
    */
    static forRange(view, className, range) {
        if (range.empty) {
            let pos = view.coordsAtPos(range.head, range.assoc || 1);
            if (!pos)
                return [];
            let base = getBase(view);
            return [new RectangleMarker(className, pos.left - base.left, pos.top - base.top, null, pos.bottom - pos.top)];
        }
        else {
            return rectanglesForRange(view, className, range);
        }
    }
}
function getBase(view) {
    let rect = view.scrollDOM.getBoundingClientRect();
    let left = view.textDirection == exports.Direction.LTR ? rect.left : rect.right - view.scrollDOM.clientWidth * view.scaleX;
    return { left: left - view.scrollDOM.scrollLeft * view.scaleX, top: rect.top - view.scrollDOM.scrollTop * view.scaleY };
}
function wrappedLine(view, pos, side, inside) {
    let coords = view.coordsAtPos(pos, side * 2);
    if (!coords)
        return inside;
    let editorRect = view.dom.getBoundingClientRect();
    let y = (coords.top + coords.bottom) / 2;
    let left = view.posAtCoords({ x: editorRect.left + 1, y });
    let right = view.posAtCoords({ x: editorRect.right - 1, y });
    if (left == null || right == null)
        return inside;
    return { from: Math.max(inside.from, Math.min(left, right)), to: Math.min(inside.to, Math.max(left, right)) };
}
function rectanglesForRange(view, className, range) {
    if (range.to <= view.viewport.from || range.from >= view.viewport.to)
        return [];
    let from = Math.max(range.from, view.viewport.from), to = Math.min(range.to, view.viewport.to);
    let ltr = view.textDirection == exports.Direction.LTR;
    let content = view.contentDOM, contentRect = content.getBoundingClientRect(), base = getBase(view);
    let lineElt = content.querySelector(".cm-line"), lineStyle = lineElt && window.getComputedStyle(lineElt);
    let leftSide = contentRect.left +
        (lineStyle ? parseInt(lineStyle.paddingLeft) + Math.min(0, parseInt(lineStyle.textIndent)) : 0);
    let rightSide = contentRect.right - (lineStyle ? parseInt(lineStyle.paddingRight) : 0);
    let startBlock = blockAt(view, from, 1), endBlock = blockAt(view, to, -1);
    let visualStart = startBlock.type == exports.BlockType.Text ? startBlock : null;
    let visualEnd = endBlock.type == exports.BlockType.Text ? endBlock : null;
    if (visualStart && (view.lineWrapping || startBlock.widgetLineBreaks))
        visualStart = wrappedLine(view, from, 1, visualStart);
    if (visualEnd && (view.lineWrapping || endBlock.widgetLineBreaks))
        visualEnd = wrappedLine(view, to, -1, visualEnd);
    if (visualStart && visualEnd && visualStart.from == visualEnd.from && visualStart.to == visualEnd.to) {
        return pieces(drawForLine(range.from, range.to, visualStart));
    }
    else {
        let top = visualStart ? drawForLine(range.from, null, visualStart) : drawForWidget(startBlock, false);
        let bottom = visualEnd ? drawForLine(null, range.to, visualEnd) : drawForWidget(endBlock, true);
        let between = [];
        if ((visualStart || startBlock).to < (visualEnd || endBlock).from - (visualStart && visualEnd ? 1 : 0) ||
            startBlock.widgetLineBreaks > 1 && top.bottom + view.defaultLineHeight / 2 < bottom.top)
            between.push(piece(leftSide, top.bottom, rightSide, bottom.top));
        else if (top.bottom < bottom.top && view.elementAtHeight((top.bottom + bottom.top) / 2).type == exports.BlockType.Text)
            top.bottom = bottom.top = (top.bottom + bottom.top) / 2;
        return pieces(top).concat(between).concat(pieces(bottom));
    }
    function piece(left, top, right, bottom) {
        return new RectangleMarker(className, left - base.left, top - base.top, right - left, bottom - top);
    }
    function pieces({ top, bottom, horizontal }) {
        let pieces = [];
        for (let i = 0; i < horizontal.length; i += 2)
            pieces.push(piece(horizontal[i], top, horizontal[i + 1], bottom));
        return pieces;
    }
    // Gets passed from/to in line-local positions
    function drawForLine(from, to, line) {
        let top = 1e9, bottom = -1e9, horizontal = [];
        function addSpan(from, fromOpen, to, toOpen, dir) {
            // Passing 2/-2 is a kludge to force the view to return
            // coordinates on the proper side of block widgets, since
            // normalizing the side there, though appropriate for most
            // coordsAtPos queries, would break selection drawing.
            let fromCoords = view.coordsAtPos(from, (from == line.to ? -2 : 2));
            let toCoords = view.coordsAtPos(to, (to == line.from ? 2 : -2));
            if (!fromCoords || !toCoords)
                return;
            top = Math.min(fromCoords.top, toCoords.top, top);
            bottom = Math.max(fromCoords.bottom, toCoords.bottom, bottom);
            if (dir == exports.Direction.LTR)
                horizontal.push(ltr && fromOpen ? leftSide : fromCoords.left, ltr && toOpen ? rightSide : toCoords.right);
            else
                horizontal.push(!ltr && toOpen ? leftSide : toCoords.left, !ltr && fromOpen ? rightSide : fromCoords.right);
        }
        let start = from !== null && from !== void 0 ? from : line.from, end = to !== null && to !== void 0 ? to : line.to;
        // Split the range by visible range and document line
        for (let r of view.visibleRanges)
            if (r.to > start && r.from < end) {
                for (let pos = Math.max(r.from, start), endPos = Math.min(r.to, end);;) {
                    let docLine = view.state.doc.lineAt(pos);
                    for (let span of view.bidiSpans(docLine)) {
                        let spanFrom = span.from + docLine.from, spanTo = span.to + docLine.from;
                        if (spanFrom >= endPos)
                            break;
                        if (spanTo > pos)
                            addSpan(Math.max(spanFrom, pos), from == null && spanFrom <= start, Math.min(spanTo, endPos), to == null && spanTo >= end, span.dir);
                    }
                    pos = docLine.to + 1;
                    if (pos >= endPos)
                        break;
                }
            }
        if (horizontal.length == 0)
            addSpan(start, from == null, end, to == null, view.textDirection);
        return { top, bottom, horizontal };
    }
    function drawForWidget(block, top) {
        let y = contentRect.top + (top ? block.top : block.bottom);
        return { top: y, bottom: y, horizontal: [] };
    }
}
function sameMarker(a, b) {
    return a.constructor == b.constructor && a.eq(b);
}
class LayerView {
    constructor(view, layer) {
        this.view = view;
        this.layer = layer;
        this.drawn = [];
        this.scaleX = 1;
        this.scaleY = 1;
        this.measureReq = { read: this.measure.bind(this), write: this.draw.bind(this) };
        this.dom = view.scrollDOM.appendChild(document.createElement("div"));
        this.dom.classList.add("cm-layer");
        if (layer.above)
            this.dom.classList.add("cm-layer-above");
        if (layer.class)
            this.dom.classList.add(layer.class);
        this.scale();
        this.dom.setAttribute("aria-hidden", "true");
        this.setOrder(view.state);
        view.requestMeasure(this.measureReq);
        if (layer.mount)
            layer.mount(this.dom, view);
    }
    update(update) {
        if (update.startState.facet(layerOrder) != update.state.facet(layerOrder))
            this.setOrder(update.state);
        if (this.layer.update(update, this.dom) || update.geometryChanged) {
            this.scale();
            update.view.requestMeasure(this.measureReq);
        }
    }
    docViewUpdate(view) {
        if (this.layer.updateOnDocViewUpdate !== false)
            view.requestMeasure(this.measureReq);
    }
    setOrder(state) {
        let pos = 0, order = state.facet(layerOrder);
        while (pos < order.length && order[pos] != this.layer)
            pos++;
        this.dom.style.zIndex = String((this.layer.above ? 150 : -1) - pos);
    }
    measure() {
        return this.layer.markers(this.view);
    }
    scale() {
        let { scaleX, scaleY } = this.view;
        if (scaleX != this.scaleX || scaleY != this.scaleY) {
            this.scaleX = scaleX;
            this.scaleY = scaleY;
            this.dom.style.transform = `scale(${1 / scaleX}, ${1 / scaleY})`;
        }
    }
    draw(markers) {
        if (markers.length != this.drawn.length || markers.some((p, i) => !sameMarker(p, this.drawn[i]))) {
            let old = this.dom.firstChild, oldI = 0;
            for (let marker of markers) {
                if (marker.update && old && marker.constructor && this.drawn[oldI].constructor &&
                    marker.update(old, this.drawn[oldI])) {
                    old = old.nextSibling;
                    oldI++;
                }
                else {
                    this.dom.insertBefore(marker.draw(), old);
                }
            }
            while (old) {
                let next = old.nextSibling;
                old.remove();
                old = next;
            }
            this.drawn = markers;
            if (browser.safari && browser.safari_version >= 26) // Issue #1600, 1627
                this.dom.style.display = this.dom.firstChild ? "" : "none";
        }
    }
    destroy() {
        if (this.layer.destroy)
            this.layer.destroy(this.dom, this.view);
        this.dom.remove();
    }
}
const layerOrder = state.Facet.define();
/**
Define a layer.
*/
function layer(config) {
    return [
        ViewPlugin.define(v => new LayerView(v, config)),
        layerOrder.of(config)
    ];
}

const selectionConfig = state.Facet.define({
    combine(configs) {
        return state.combineConfig(configs, {
            cursorBlinkRate: 1200,
            drawRangeCursor: true
        }, {
            cursorBlinkRate: (a, b) => Math.min(a, b),
            drawRangeCursor: (a, b) => a || b
        });
    }
});
/**
Returns an extension that hides the browser's native selection and
cursor, replacing the selection with a background behind the text
(with the `cm-selectionBackground` class), and the
cursors with elements overlaid over the code (using
`cm-cursor-primary` and `cm-cursor-secondary`).

This allows the editor to display secondary selection ranges, and
tends to produce a type of selection more in line with that users
expect in a text editor (the native selection styling will often
leave gaps between lines and won't fill the horizontal space after
a line when the selection continues past it).

It does have a performance cost, in that it requires an extra DOM
layout cycle for many updates (the selection is drawn based on DOM
layout information that's only available after laying out the
content).
*/
function drawSelection(config = {}) {
    return [
        selectionConfig.of(config),
        cursorLayer,
        selectionLayer,
        hideNativeSelection,
        nativeSelectionHidden.of(true)
    ];
}
/**
Retrieve the [`drawSelection`](https://codemirror.net/6/docs/ref/#view.drawSelection) configuration
for this state. (Note that this will return a set of defaults even
if `drawSelection` isn't enabled.)
*/
function getDrawSelectionConfig(state) {
    return state.facet(selectionConfig);
}
function configChanged(update) {
    return update.startState.facet(selectionConfig) != update.state.facet(selectionConfig);
}
const cursorLayer = layer({
    above: true,
    markers(view) {
        let { state: state$1 } = view, conf = state$1.facet(selectionConfig);
        let cursors = [];
        for (let r of state$1.selection.ranges) {
            let prim = r == state$1.selection.main;
            if (r.empty || conf.drawRangeCursor) {
                let className = prim ? "cm-cursor cm-cursor-primary" : "cm-cursor cm-cursor-secondary";
                let cursor = r.empty ? r : state.EditorSelection.cursor(r.head, r.head > r.anchor ? -1 : 1);
                for (let piece of RectangleMarker.forRange(view, className, cursor))
                    cursors.push(piece);
            }
        }
        return cursors;
    },
    update(update, dom) {
        if (update.transactions.some(tr => tr.selection))
            dom.style.animationName = dom.style.animationName == "cm-blink" ? "cm-blink2" : "cm-blink";
        let confChange = configChanged(update);
        if (confChange)
            setBlinkRate(update.state, dom);
        return update.docChanged || update.selectionSet || confChange;
    },
    mount(dom, view) {
        setBlinkRate(view.state, dom);
    },
    class: "cm-cursorLayer"
});
function setBlinkRate(state, dom) {
    dom.style.animationDuration = state.facet(selectionConfig).cursorBlinkRate + "ms";
}
const selectionLayer = layer({
    above: false,
    markers(view) {
        return view.state.selection.ranges.map(r => r.empty ? [] : RectangleMarker.forRange(view, "cm-selectionBackground", r))
            .reduce((a, b) => a.concat(b));
    },
    update(update, dom) {
        return update.docChanged || update.selectionSet || update.viewportChanged || configChanged(update);
    },
    class: "cm-selectionLayer"
});
const hideNativeSelection = state.Prec.highest(EditorView.theme({
    ".cm-line": {
        "& ::selection, &::selection": { backgroundColor: "transparent !important" },
        caretColor: "transparent !important"
    },
    ".cm-content": {
        caretColor: "transparent !important",
        "& :focus": {
            caretColor: "initial !important",
            "&::selection, & ::selection": {
                backgroundColor: "Highlight !important"
            }
        }
    }
}));

const setDropCursorPos = state.StateEffect.define({
    map(pos, mapping) { return pos == null ? null : mapping.mapPos(pos); }
});
const dropCursorPos = state.StateField.define({
    create() { return null; },
    update(pos, tr) {
        if (pos != null)
            pos = tr.changes.mapPos(pos);
        return tr.effects.reduce((pos, e) => e.is(setDropCursorPos) ? e.value : pos, pos);
    }
});
const drawDropCursor = ViewPlugin.fromClass(class {
    constructor(view) {
        this.view = view;
        this.cursor = null;
        this.measureReq = { read: this.readPos.bind(this), write: this.drawCursor.bind(this) };
    }
    update(update) {
        var _a;
        let cursorPos = update.state.field(dropCursorPos);
        if (cursorPos == null) {
            if (this.cursor != null) {
                (_a = this.cursor) === null || _a === void 0 ? void 0 : _a.remove();
                this.cursor = null;
            }
        }
        else {
            if (!this.cursor) {
                this.cursor = this.view.scrollDOM.appendChild(document.createElement("div"));
                this.cursor.className = "cm-dropCursor";
            }
            if (update.startState.field(dropCursorPos) != cursorPos || update.docChanged || update.geometryChanged)
                this.view.requestMeasure(this.measureReq);
        }
    }
    readPos() {
        let { view } = this;
        let pos = view.state.field(dropCursorPos);
        let rect = pos != null && view.coordsAtPos(pos);
        if (!rect)
            return null;
        let outer = view.scrollDOM.getBoundingClientRect();
        return {
            left: rect.left - outer.left + view.scrollDOM.scrollLeft * view.scaleX,
            top: rect.top - outer.top + view.scrollDOM.scrollTop * view.scaleY,
            height: rect.bottom - rect.top
        };
    }
    drawCursor(pos) {
        if (this.cursor) {
            let { scaleX, scaleY } = this.view;
            if (pos) {
                this.cursor.style.left = pos.left / scaleX + "px";
                this.cursor.style.top = pos.top / scaleY + "px";
                this.cursor.style.height = pos.height / scaleY + "px";
            }
            else {
                this.cursor.style.left = "-100000px";
            }
        }
    }
    destroy() {
        if (this.cursor)
            this.cursor.remove();
    }
    setDropPos(pos) {
        if (this.view.state.field(dropCursorPos) != pos)
            this.view.dispatch({ effects: setDropCursorPos.of(pos) });
    }
}, {
    eventObservers: {
        dragover(event) {
            this.setDropPos(this.view.posAtCoords({ x: event.clientX, y: event.clientY }));
        },
        dragleave(event) {
            if (event.target == this.view.contentDOM || !this.view.contentDOM.contains(event.relatedTarget))
                this.setDropPos(null);
        },
        dragend() {
            this.setDropPos(null);
        },
        drop() {
            this.setDropPos(null);
        }
    }
});
/**
Draws a cursor at the current drop position when something is
dragged over the editor.
*/
function dropCursor() {
    return [dropCursorPos, drawDropCursor];
}

function iterMatches(doc, re, from, to, f) {
    re.lastIndex = 0;
    for (let cursor = doc.iterRange(from, to), pos = from, m; !cursor.next().done; pos += cursor.value.length) {
        if (!cursor.lineBreak)
            while (m = re.exec(cursor.value))
                f(pos + m.index, m);
    }
}
function matchRanges(view, maxLength) {
    let visible = view.visibleRanges;
    if (visible.length == 1 && visible[0].from == view.viewport.from &&
        visible[0].to == view.viewport.to)
        return visible;
    let result = [];
    for (let { from, to } of visible) {
        from = Math.max(view.state.doc.lineAt(from).from, from - maxLength);
        to = Math.min(view.state.doc.lineAt(to).to, to + maxLength);
        if (result.length && result[result.length - 1].to >= from)
            result[result.length - 1].to = to;
        else
            result.push({ from, to });
    }
    return result;
}
/**
Helper class used to make it easier to maintain decorations on
visible code that matches a given regular expression. To be used
in a [view plugin](https://codemirror.net/6/docs/ref/#view.ViewPlugin). Instances of this object
represent a matching configuration.
*/
class MatchDecorator {
    /**
    Create a decorator.
    */
    constructor(config) {
        const { regexp, decoration, decorate, boundary, maxLength = 1000 } = config;
        if (!regexp.global)
            throw new RangeError("The regular expression given to MatchDecorator should have its 'g' flag set");
        this.regexp = regexp;
        if (decorate) {
            this.addMatch = (match, view, from, add) => decorate(add, from, from + match[0].length, match, view);
        }
        else if (typeof decoration == "function") {
            this.addMatch = (match, view, from, add) => {
                let deco = decoration(match, view, from);
                if (deco)
                    add(from, from + match[0].length, deco);
            };
        }
        else if (decoration) {
            this.addMatch = (match, _view, from, add) => add(from, from + match[0].length, decoration);
        }
        else {
            throw new RangeError("Either 'decorate' or 'decoration' should be provided to MatchDecorator");
        }
        this.boundary = boundary;
        this.maxLength = maxLength;
    }
    /**
    Compute the full set of decorations for matches in the given
    view's viewport. You'll want to call this when initializing your
    plugin.
    */
    createDeco(view) {
        let build = new state.RangeSetBuilder(), add = build.add.bind(build);
        for (let { from, to } of matchRanges(view, this.maxLength))
            iterMatches(view.state.doc, this.regexp, from, to, (from, m) => this.addMatch(m, view, from, add));
        return build.finish();
    }
    /**
    Update a set of decorations for a view update. `deco` _must_ be
    the set of decorations produced by _this_ `MatchDecorator` for
    the view state before the update.
    */
    updateDeco(update, deco) {
        let changeFrom = 1e9, changeTo = -1;
        if (update.docChanged)
            update.changes.iterChanges((_f, _t, from, to) => {
                if (to >= update.view.viewport.from && from <= update.view.viewport.to) {
                    changeFrom = Math.min(from, changeFrom);
                    changeTo = Math.max(to, changeTo);
                }
            });
        if (update.viewportMoved || changeTo - changeFrom > 1000)
            return this.createDeco(update.view);
        if (changeTo > -1)
            return this.updateRange(update.view, deco.map(update.changes), changeFrom, changeTo);
        return deco;
    }
    updateRange(view, deco, updateFrom, updateTo) {
        for (let r of view.visibleRanges) {
            let from = Math.max(r.from, updateFrom), to = Math.min(r.to, updateTo);
            if (to >= from) {
                let fromLine = view.state.doc.lineAt(from), toLine = fromLine.to < to ? view.state.doc.lineAt(to) : fromLine;
                let start = Math.max(r.from, fromLine.from), end = Math.min(r.to, toLine.to);
                if (this.boundary) {
                    for (; from > fromLine.from; from--)
                        if (this.boundary.test(fromLine.text[from - 1 - fromLine.from])) {
                            start = from;
                            break;
                        }
                    for (; to < toLine.to; to++)
                        if (this.boundary.test(toLine.text[to - toLine.from])) {
                            end = to;
                            break;
                        }
                }
                let ranges = [], m;
                let add = (from, to, deco) => ranges.push(deco.range(from, to));
                if (fromLine == toLine) {
                    this.regexp.lastIndex = start - fromLine.from;
                    while ((m = this.regexp.exec(fromLine.text)) && m.index < end - fromLine.from)
                        this.addMatch(m, view, m.index + fromLine.from, add);
                }
                else {
                    iterMatches(view.state.doc, this.regexp, start, end, (from, m) => this.addMatch(m, view, from, add));
                }
                deco = deco.update({ filterFrom: start, filterTo: end, filter: (from, to) => from < start || to > end, add: ranges });
            }
        }
        return deco;
    }
}

const UnicodeRegexpSupport = /x/.unicode != null ? "gu" : "g";
const Specials = new RegExp("[\u0000-\u0008\u000a-\u001f\u007f-\u009f\u00ad\u061c\u200b\u200e\u200f\u2028\u2029\u202d\u202e\u2066\u2067\u2069\ufeff\ufff9-\ufffc]", UnicodeRegexpSupport);
const Names = {
    0: "null",
    7: "bell",
    8: "backspace",
    10: "newline",
    11: "vertical tab",
    13: "carriage return",
    27: "escape",
    8203: "zero width space",
    8204: "zero width non-joiner",
    8205: "zero width joiner",
    8206: "left-to-right mark",
    8207: "right-to-left mark",
    8232: "line separator",
    8237: "left-to-right override",
    8238: "right-to-left override",
    8294: "left-to-right isolate",
    8295: "right-to-left isolate",
    8297: "pop directional isolate",
    8233: "paragraph separator",
    65279: "zero width no-break space",
    65532: "object replacement"
};
let _supportsTabSize = null;
function supportsTabSize() {
    var _a;
    if (_supportsTabSize == null && typeof document != "undefined" && document.body) {
        let styles = document.body.style;
        _supportsTabSize = ((_a = styles.tabSize) !== null && _a !== void 0 ? _a : styles.MozTabSize) != null;
    }
    return _supportsTabSize || false;
}
const specialCharConfig = state.Facet.define({
    combine(configs) {
        let config = state.combineConfig(configs, {
            render: null,
            specialChars: Specials,
            addSpecialChars: null
        });
        if (config.replaceTabs = !supportsTabSize())
            config.specialChars = new RegExp("\t|" + config.specialChars.source, UnicodeRegexpSupport);
        if (config.addSpecialChars)
            config.specialChars = new RegExp(config.specialChars.source + "|" + config.addSpecialChars.source, UnicodeRegexpSupport);
        return config;
    }
});
/**
Returns an extension that installs highlighting of special
characters.
*/
function highlightSpecialChars(
/**
Configuration options.
*/
config = {}) {
    return [specialCharConfig.of(config), specialCharPlugin()];
}
let _plugin = null;
function specialCharPlugin() {
    return _plugin || (_plugin = ViewPlugin.fromClass(class {
        constructor(view) {
            this.view = view;
            this.decorations = Decoration.none;
            this.decorationCache = Object.create(null);
            this.decorator = this.makeDecorator(view.state.facet(specialCharConfig));
            this.decorations = this.decorator.createDeco(view);
        }
        makeDecorator(conf) {
            return new MatchDecorator({
                regexp: conf.specialChars,
                decoration: (m, view, pos) => {
                    let { doc } = view.state;
                    let code = state.codePointAt(m[0], 0);
                    if (code == 9) {
                        let line = doc.lineAt(pos);
                        let size = view.state.tabSize, col = state.countColumn(line.text, size, pos - line.from);
                        return Decoration.replace({
                            widget: new TabWidget((size - (col % size)) * this.view.defaultCharacterWidth / this.view.scaleX)
                        });
                    }
                    return this.decorationCache[code] ||
                        (this.decorationCache[code] = Decoration.replace({ widget: new SpecialCharWidget(conf, code) }));
                },
                boundary: conf.replaceTabs ? undefined : /[^]/
            });
        }
        update(update) {
            let conf = update.state.facet(specialCharConfig);
            if (update.startState.facet(specialCharConfig) != conf) {
                this.decorator = this.makeDecorator(conf);
                this.decorations = this.decorator.createDeco(update.view);
            }
            else {
                this.decorations = this.decorator.updateDeco(update, this.decorations);
            }
        }
    }, {
        decorations: v => v.decorations
    }));
}
const DefaultPlaceholder = "\u2022";
// Assigns placeholder characters from the Control Pictures block to
// ASCII control characters
function placeholder$1(code) {
    if (code >= 32)
        return DefaultPlaceholder;
    if (code == 10)
        return "\u2424";
    return String.fromCharCode(9216 + code);
}
class SpecialCharWidget extends WidgetType {
    constructor(options, code) {
        super();
        this.options = options;
        this.code = code;
    }
    eq(other) { return other.code == this.code; }
    toDOM(view) {
        let ph = placeholder$1(this.code);
        let desc = view.state.phrase("Control character") + " " + (Names[this.code] || "0x" + this.code.toString(16));
        let custom = this.options.render && this.options.render(this.code, desc, ph);
        if (custom)
            return custom;
        let span = document.createElement("span");
        span.textContent = ph;
        span.title = desc;
        span.setAttribute("aria-label", desc);
        span.className = "cm-specialChar";
        return span;
    }
    ignoreEvent() { return false; }
}
class TabWidget extends WidgetType {
    constructor(width) {
        super();
        this.width = width;
    }
    eq(other) { return other.width == this.width; }
    toDOM() {
        let span = document.createElement("span");
        span.textContent = "\t";
        span.className = "cm-tab";
        span.style.width = this.width + "px";
        return span;
    }
    ignoreEvent() { return false; }
}

const plugin = ViewPlugin.fromClass(class {
    constructor() {
        this.height = 1000;
        this.attrs = { style: "padding-bottom: 1000px" };
    }
    update(update) {
        let { view } = update;
        let height = view.viewState.editorHeight -
            view.defaultLineHeight - view.documentPadding.top - 0.5;
        if (height >= 0 && height != this.height) {
            this.height = height;
            this.attrs = { style: `padding-bottom: ${height}px` };
        }
    }
});
/**
Returns an extension that makes sure the content has a bottom
margin equivalent to the height of the editor, minus one line
height, so that every line in the document can be scrolled to the
top of the editor.

This is only meaningful when the editor is scrollable, and should
not be enabled in editors that take the size of their content.
*/
function scrollPastEnd() {
    return [plugin, contentAttributes.of(view => { var _a; return ((_a = view.plugin(plugin)) === null || _a === void 0 ? void 0 : _a.attrs) || null; })];
}

/**
Mark lines that have a cursor on them with the `"cm-activeLine"`
DOM class.
*/
function highlightActiveLine() {
    return activeLineHighlighter;
}
const lineDeco = Decoration.line({ class: "cm-activeLine" });
const activeLineHighlighter = ViewPlugin.fromClass(class {
    constructor(view) {
        this.decorations = this.getDeco(view);
    }
    update(update) {
        if (update.docChanged || update.selectionSet)
            this.decorations = this.getDeco(update.view);
    }
    getDeco(view) {
        let lastLineStart = -1, deco = [];
        for (let r of view.state.selection.ranges) {
            let line = view.lineBlockAt(r.head);
            if (line.from > lastLineStart) {
                deco.push(lineDeco.range(line.from));
                lastLineStart = line.from;
            }
        }
        return Decoration.set(deco);
    }
}, {
    decorations: v => v.decorations
});

class Placeholder extends WidgetType {
    constructor(content) {
        super();
        this.content = content;
    }
    toDOM(view) {
        let wrap = document.createElement("span");
        wrap.className = "cm-placeholder";
        wrap.style.pointerEvents = "none";
        wrap.appendChild(typeof this.content == "string" ? document.createTextNode(this.content) :
            typeof this.content == "function" ? this.content(view) :
                this.content.cloneNode(true));
        wrap.setAttribute("aria-hidden", "true");
        return wrap;
    }
    coordsAt(dom) {
        let rects = dom.firstChild ? clientRectsFor(dom.firstChild) : [];
        if (!rects.length)
            return null;
        let style = window.getComputedStyle(dom.parentNode);
        let rect = flattenRect(rects[0], style.direction != "rtl");
        let lineHeight = parseInt(style.lineHeight);
        if (rect.bottom - rect.top > lineHeight * 1.5)
            return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + lineHeight };
        return rect;
    }
    ignoreEvent() { return false; }
}
/**
Extension that enables a placeholder—a piece of example content
to show when the editor is empty.
*/
function placeholder(content) {
    let plugin = ViewPlugin.fromClass(class {
        constructor(view) {
            this.view = view;
            this.placeholder = content
                ? Decoration.set([Decoration.widget({ widget: new Placeholder(content), side: 1 }).range(0)])
                : Decoration.none;
        }
        get decorations() { return this.view.state.doc.length ? Decoration.none : this.placeholder; }
    }, { decorations: v => v.decorations });
    return typeof content == "string" ? [
        plugin, EditorView.contentAttributes.of({ "aria-placeholder": content })
    ] : plugin;
}

// Don't compute precise column positions for line offsets above this
// (since it could get expensive). Assume offset==column for them.
const MaxOff = 2000;
function rectangleFor(state$1, a, b) {
    let startLine = Math.min(a.line, b.line), endLine = Math.max(a.line, b.line);
    let ranges = [];
    if (a.off > MaxOff || b.off > MaxOff || a.col < 0 || b.col < 0) {
        let startOff = Math.min(a.off, b.off), endOff = Math.max(a.off, b.off);
        for (let i = startLine; i <= endLine; i++) {
            let line = state$1.doc.line(i);
            if (line.length <= endOff)
                ranges.push(state.EditorSelection.range(line.from + startOff, line.to + endOff));
        }
    }
    else {
        let startCol = Math.min(a.col, b.col), endCol = Math.max(a.col, b.col);
        for (let i = startLine; i <= endLine; i++) {
            let line = state$1.doc.line(i);
            let start = state.findColumn(line.text, startCol, state$1.tabSize, true);
            if (start < 0) {
                ranges.push(state.EditorSelection.cursor(line.to));
            }
            else {
                let end = state.findColumn(line.text, endCol, state$1.tabSize);
                ranges.push(state.EditorSelection.range(line.from + start, line.from + end));
            }
        }
    }
    return ranges;
}
function absoluteColumn(view, x) {
    let ref = view.coordsAtPos(view.viewport.from);
    return ref ? Math.round(Math.abs((ref.left - x) / view.defaultCharacterWidth)) : -1;
}
function getPos(view, event) {
    let offset = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
    let line = view.state.doc.lineAt(offset), off = offset - line.from;
    let col = off > MaxOff ? -1
        : off == line.length ? absoluteColumn(view, event.clientX)
            : state.countColumn(line.text, view.state.tabSize, offset - line.from);
    return { line: line.number, col, off };
}
function rectangleSelectionStyle(view, event) {
    let start = getPos(view, event), startSel = view.state.selection;
    if (!start)
        return null;
    return {
        update(update) {
            if (update.docChanged) {
                let newStart = update.changes.mapPos(update.startState.doc.line(start.line).from);
                let newLine = update.state.doc.lineAt(newStart);
                start = { line: newLine.number, col: start.col, off: Math.min(start.off, newLine.length) };
                startSel = startSel.map(update.changes);
            }
        },
        get(event, _extend, multiple) {
            let cur = getPos(view, event);
            if (!cur)
                return startSel;
            let ranges = rectangleFor(view.state, start, cur);
            if (!ranges.length)
                return startSel;
            if (multiple)
                return state.EditorSelection.create(ranges.concat(startSel.ranges));
            else
                return state.EditorSelection.create(ranges);
        }
    };
}
/**
Create an extension that enables rectangular selections. By
default, it will react to left mouse drag with the Alt key held
down. When such a selection occurs, the text within the rectangle
that was dragged over will be selected, as one selection
[range](https://codemirror.net/6/docs/ref/#state.SelectionRange) per line.
*/
function rectangularSelection(options) {
    let filter = (options === null || options === void 0 ? void 0 : options.eventFilter) || (e => e.altKey && e.button == 0);
    return EditorView.mouseSelectionStyle.of((view, event) => filter(event) ? rectangleSelectionStyle(view, event) : null);
}
const keys = {
    Alt: [18, e => !!e.altKey],
    Control: [17, e => !!e.ctrlKey],
    Shift: [16, e => !!e.shiftKey],
    Meta: [91, e => !!e.metaKey]
};
const showCrosshair = { style: "cursor: crosshair" };
/**
Returns an extension that turns the pointer cursor into a
crosshair when a given modifier key, defaulting to Alt, is held
down. Can serve as a visual hint that rectangular selection is
going to happen when paired with
[`rectangularSelection`](https://codemirror.net/6/docs/ref/#view.rectangularSelection).
*/
function crosshairCursor(options = {}) {
    let [code, getter] = keys[options.key || "Alt"];
    let plugin = ViewPlugin.fromClass(class {
        constructor(view) {
            this.view = view;
            this.isDown = false;
        }
        set(isDown) {
            if (this.isDown != isDown) {
                this.isDown = isDown;
                this.view.update([]);
            }
        }
    }, {
        eventObservers: {
            keydown(e) {
                this.set(e.keyCode == code || getter(e));
            },
            keyup(e) {
                if (e.keyCode == code || !getter(e))
                    this.set(false);
            },
            mousemove(e) {
                this.set(getter(e));
            }
        }
    });
    return [
        plugin,
        EditorView.contentAttributes.of(view => { var _a; return ((_a = view.plugin(plugin)) === null || _a === void 0 ? void 0 : _a.isDown) ? showCrosshair : null; })
    ];
}

const Outside = "-10000px";
class TooltipViewManager {
    constructor(view, facet, createTooltipView, removeTooltipView) {
        this.facet = facet;
        this.createTooltipView = createTooltipView;
        this.removeTooltipView = removeTooltipView;
        this.input = view.state.facet(facet);
        this.tooltips = this.input.filter(t => t);
        let prev = null;
        this.tooltipViews = this.tooltips.map(t => prev = createTooltipView(t, prev));
    }
    update(update, above) {
        var _a;
        let input = update.state.facet(this.facet);
        let tooltips = input.filter(x => x);
        if (input === this.input) {
            for (let t of this.tooltipViews)
                if (t.update)
                    t.update(update);
            return false;
        }
        let tooltipViews = [], newAbove = above ? [] : null;
        for (let i = 0; i < tooltips.length; i++) {
            let tip = tooltips[i], known = -1;
            if (!tip)
                continue;
            for (let i = 0; i < this.tooltips.length; i++) {
                let other = this.tooltips[i];
                if (other && other.create == tip.create)
                    known = i;
            }
            if (known < 0) {
                tooltipViews[i] = this.createTooltipView(tip, i ? tooltipViews[i - 1] : null);
                if (newAbove)
                    newAbove[i] = !!tip.above;
            }
            else {
                let tooltipView = tooltipViews[i] = this.tooltipViews[known];
                if (newAbove)
                    newAbove[i] = above[known];
                if (tooltipView.update)
                    tooltipView.update(update);
            }
        }
        for (let t of this.tooltipViews)
            if (tooltipViews.indexOf(t) < 0) {
                this.removeTooltipView(t);
                (_a = t.destroy) === null || _a === void 0 ? void 0 : _a.call(t);
            }
        if (above) {
            newAbove.forEach((val, i) => above[i] = val);
            above.length = newAbove.length;
        }
        this.input = input;
        this.tooltips = tooltips;
        this.tooltipViews = tooltipViews;
        return true;
    }
}
/**
Creates an extension that configures tooltip behavior.
*/
function tooltips(config = {}) {
    return tooltipConfig.of(config);
}
function windowSpace(view) {
    let docElt = view.dom.ownerDocument.documentElement;
    return { top: 0, left: 0, bottom: docElt.clientHeight, right: docElt.clientWidth };
}
const tooltipConfig = state.Facet.define({
    combine: values => {
        var _a, _b, _c;
        return ({
            position: browser.ios ? "absolute" : ((_a = values.find(conf => conf.position)) === null || _a === void 0 ? void 0 : _a.position) || "fixed",
            parent: ((_b = values.find(conf => conf.parent)) === null || _b === void 0 ? void 0 : _b.parent) || null,
            tooltipSpace: ((_c = values.find(conf => conf.tooltipSpace)) === null || _c === void 0 ? void 0 : _c.tooltipSpace) || windowSpace,
        });
    }
});
const knownHeight = new WeakMap();
const tooltipPlugin = ViewPlugin.fromClass(class {
    constructor(view) {
        this.view = view;
        this.above = [];
        this.inView = true;
        this.madeAbsolute = false;
        this.lastTransaction = 0;
        this.measureTimeout = -1;
        let config = view.state.facet(tooltipConfig);
        this.position = config.position;
        this.parent = config.parent;
        this.classes = view.themeClasses;
        this.createContainer();
        this.measureReq = { read: this.readMeasure.bind(this), write: this.writeMeasure.bind(this), key: this };
        this.resizeObserver = typeof ResizeObserver == "function" ? new ResizeObserver(() => this.measureSoon()) : null;
        this.manager = new TooltipViewManager(view, showTooltip, (t, p) => this.createTooltip(t, p), t => {
            if (this.resizeObserver)
                this.resizeObserver.unobserve(t.dom);
            t.dom.remove();
        });
        this.above = this.manager.tooltips.map(t => !!t.above);
        this.intersectionObserver = typeof IntersectionObserver == "function" ? new IntersectionObserver(entries => {
            if (Date.now() > this.lastTransaction - 50 &&
                entries.length > 0 && entries[entries.length - 1].intersectionRatio < 1)
                this.measureSoon();
        }, { threshold: [1] }) : null;
        this.observeIntersection();
        view.win.addEventListener("resize", this.measureSoon = this.measureSoon.bind(this));
        this.maybeMeasure();
    }
    createContainer() {
        if (this.parent) {
            this.container = document.createElement("div");
            this.container.style.position = "relative";
            this.container.className = this.view.themeClasses;
            this.parent.appendChild(this.container);
        }
        else {
            this.container = this.view.dom;
        }
    }
    observeIntersection() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            for (let tooltip of this.manager.tooltipViews)
                this.intersectionObserver.observe(tooltip.dom);
        }
    }
    measureSoon() {
        if (this.measureTimeout < 0)
            this.measureTimeout = setTimeout(() => {
                this.measureTimeout = -1;
                this.maybeMeasure();
            }, 50);
    }
    update(update) {
        if (update.transactions.length)
            this.lastTransaction = Date.now();
        let updated = this.manager.update(update, this.above);
        if (updated)
            this.observeIntersection();
        let shouldMeasure = updated || update.geometryChanged;
        let newConfig = update.state.facet(tooltipConfig);
        if (newConfig.position != this.position && !this.madeAbsolute) {
            this.position = newConfig.position;
            for (let t of this.manager.tooltipViews)
                t.dom.style.position = this.position;
            shouldMeasure = true;
        }
        if (newConfig.parent != this.parent) {
            if (this.parent)
                this.container.remove();
            this.parent = newConfig.parent;
            this.createContainer();
            for (let t of this.manager.tooltipViews)
                this.container.appendChild(t.dom);
            shouldMeasure = true;
        }
        else if (this.parent && this.view.themeClasses != this.classes) {
            this.classes = this.container.className = this.view.themeClasses;
        }
        if (shouldMeasure)
            this.maybeMeasure();
    }
    createTooltip(tooltip, prev) {
        let tooltipView = tooltip.create(this.view);
        let before = prev ? prev.dom : null;
        tooltipView.dom.classList.add("cm-tooltip");
        if (tooltip.arrow && !tooltipView.dom.querySelector(".cm-tooltip > .cm-tooltip-arrow")) {
            let arrow = document.createElement("div");
            arrow.className = "cm-tooltip-arrow";
            tooltipView.dom.appendChild(arrow);
        }
        tooltipView.dom.style.position = this.position;
        tooltipView.dom.style.top = Outside;
        tooltipView.dom.style.left = "0px";
        this.container.insertBefore(tooltipView.dom, before);
        if (tooltipView.mount)
            tooltipView.mount(this.view);
        if (this.resizeObserver)
            this.resizeObserver.observe(tooltipView.dom);
        return tooltipView;
    }
    destroy() {
        var _a, _b, _c;
        this.view.win.removeEventListener("resize", this.measureSoon);
        for (let tooltipView of this.manager.tooltipViews) {
            tooltipView.dom.remove();
            (_a = tooltipView.destroy) === null || _a === void 0 ? void 0 : _a.call(tooltipView);
        }
        if (this.parent)
            this.container.remove();
        (_b = this.resizeObserver) === null || _b === void 0 ? void 0 : _b.disconnect();
        (_c = this.intersectionObserver) === null || _c === void 0 ? void 0 : _c.disconnect();
        clearTimeout(this.measureTimeout);
    }
    readMeasure() {
        let scaleX = 1, scaleY = 1, makeAbsolute = false;
        if (this.position == "fixed" && this.manager.tooltipViews.length) {
            let { dom } = this.manager.tooltipViews[0];
            if (browser.safari) {
                // Safari always sets offsetParent to null, even if a fixed
                // element is positioned relative to a transformed parent. So
                // we use this kludge to try and detect this.
                let rect = dom.getBoundingClientRect();
                makeAbsolute = Math.abs(rect.top + 10000) > 1 || Math.abs(rect.left) > 1;
            }
            else {
                // More conforming browsers will set offsetParent to the
                // transformed element.
                makeAbsolute = !!dom.offsetParent && dom.offsetParent != this.container.ownerDocument.body;
            }
        }
        if (makeAbsolute || this.position == "absolute") {
            if (this.parent) {
                let rect = this.parent.getBoundingClientRect();
                if (rect.width && rect.height) {
                    scaleX = rect.width / this.parent.offsetWidth;
                    scaleY = rect.height / this.parent.offsetHeight;
                }
            }
            else {
                ({ scaleX, scaleY } = this.view.viewState);
            }
        }
        let visible = this.view.scrollDOM.getBoundingClientRect(), margins = getScrollMargins(this.view);
        return {
            visible: {
                left: visible.left + margins.left, top: visible.top + margins.top,
                right: visible.right - margins.right, bottom: visible.bottom - margins.bottom
            },
            parent: this.parent ? this.container.getBoundingClientRect() : this.view.dom.getBoundingClientRect(),
            pos: this.manager.tooltips.map((t, i) => {
                let tv = this.manager.tooltipViews[i];
                return tv.getCoords ? tv.getCoords(t.pos) : this.view.coordsAtPos(t.pos);
            }),
            size: this.manager.tooltipViews.map(({ dom }) => dom.getBoundingClientRect()),
            space: this.view.state.facet(tooltipConfig).tooltipSpace(this.view),
            scaleX, scaleY, makeAbsolute
        };
    }
    writeMeasure(measured) {
        var _a;
        if (measured.makeAbsolute) {
            this.madeAbsolute = true;
            this.position = "absolute";
            for (let t of this.manager.tooltipViews)
                t.dom.style.position = "absolute";
        }
        let { visible, space, scaleX, scaleY } = measured;
        let others = [];
        for (let i = 0; i < this.manager.tooltips.length; i++) {
            let tooltip = this.manager.tooltips[i], tView = this.manager.tooltipViews[i], { dom } = tView;
            let pos = measured.pos[i], size = measured.size[i];
            // Hide tooltips that are outside of the editor.
            if (!pos || tooltip.clip !== false && (pos.bottom <= Math.max(visible.top, space.top) ||
                pos.top >= Math.min(visible.bottom, space.bottom) ||
                pos.right < Math.max(visible.left, space.left) - .1 ||
                pos.left > Math.min(visible.right, space.right) + .1)) {
                dom.style.top = Outside;
                continue;
            }
            let arrow = tooltip.arrow ? tView.dom.querySelector(".cm-tooltip-arrow") : null;
            let arrowHeight = arrow ? 7 /* Arrow.Size */ : 0;
            let width = size.right - size.left, height = (_a = knownHeight.get(tView)) !== null && _a !== void 0 ? _a : size.bottom - size.top;
            let offset = tView.offset || noOffset, ltr = this.view.textDirection == exports.Direction.LTR;
            let left = size.width > space.right - space.left
                ? (ltr ? space.left : space.right - size.width)
                : ltr ? Math.max(space.left, Math.min(pos.left - (arrow ? 14 /* Arrow.Offset */ : 0) + offset.x, space.right - width))
                    : Math.min(Math.max(space.left, pos.left - width + (arrow ? 14 /* Arrow.Offset */ : 0) - offset.x), space.right - width);
            let above = this.above[i];
            if (!tooltip.strictSide && (above
                ? pos.top - height - arrowHeight - offset.y < space.top
                : pos.bottom + height + arrowHeight + offset.y > space.bottom) &&
                above == (space.bottom - pos.bottom > pos.top - space.top))
                above = this.above[i] = !above;
            let spaceVert = (above ? pos.top - space.top : space.bottom - pos.bottom) - arrowHeight;
            if (spaceVert < height && tView.resize !== false) {
                if (spaceVert < this.view.defaultLineHeight) {
                    dom.style.top = Outside;
                    continue;
                }
                knownHeight.set(tView, height);
                dom.style.height = (height = spaceVert) / scaleY + "px";
            }
            else if (dom.style.height) {
                dom.style.height = "";
            }
            let top = above ? pos.top - height - arrowHeight - offset.y : pos.bottom + arrowHeight + offset.y;
            let right = left + width;
            if (tView.overlap !== true)
                for (let r of others)
                    if (r.left < right && r.right > left && r.top < top + height && r.bottom > top)
                        top = above ? r.top - height - 2 - arrowHeight : r.bottom + arrowHeight + 2;
            if (this.position == "absolute") {
                dom.style.top = (top - measured.parent.top) / scaleY + "px";
                setLeftStyle(dom, (left - measured.parent.left) / scaleX);
            }
            else {
                dom.style.top = top / scaleY + "px";
                setLeftStyle(dom, left / scaleX);
            }
            if (arrow) {
                let arrowLeft = pos.left + (ltr ? offset.x : -offset.x) - (left + 14 /* Arrow.Offset */ - 7 /* Arrow.Size */);
                arrow.style.left = arrowLeft / scaleX + "px";
            }
            if (tView.overlap !== true)
                others.push({ left, top, right, bottom: top + height });
            dom.classList.toggle("cm-tooltip-above", above);
            dom.classList.toggle("cm-tooltip-below", !above);
            if (tView.positioned)
                tView.positioned(measured.space);
        }
    }
    maybeMeasure() {
        if (this.manager.tooltips.length) {
            if (this.view.inView)
                this.view.requestMeasure(this.measureReq);
            if (this.inView != this.view.inView) {
                this.inView = this.view.inView;
                if (!this.inView)
                    for (let tv of this.manager.tooltipViews)
                        tv.dom.style.top = Outside;
            }
        }
    }
}, {
    eventObservers: {
        scroll() { this.maybeMeasure(); }
    }
});
function setLeftStyle(elt, value) {
    let current = parseInt(elt.style.left, 10);
    if (isNaN(current) || Math.abs(value - current) > 1)
        elt.style.left = value + "px";
}
const baseTheme = EditorView.baseTheme({
    ".cm-tooltip": {
        zIndex: 500,
        boxSizing: "border-box"
    },
    "&light .cm-tooltip": {
        border: "1px solid #bbb",
        backgroundColor: "#f5f5f5"
    },
    "&light .cm-tooltip-section:not(:first-child)": {
        borderTop: "1px solid #bbb",
    },
    "&dark .cm-tooltip": {
        backgroundColor: "#333338",
        color: "white"
    },
    ".cm-tooltip-arrow": {
        height: `${7 /* Arrow.Size */}px`,
        width: `${7 /* Arrow.Size */ * 2}px`,
        position: "absolute",
        zIndex: -1,
        overflow: "hidden",
        "&:before, &:after": {
            content: "''",
            position: "absolute",
            width: 0,
            height: 0,
            borderLeft: `${7 /* Arrow.Size */}px solid transparent`,
            borderRight: `${7 /* Arrow.Size */}px solid transparent`,
        },
        ".cm-tooltip-above &": {
            bottom: `-${7 /* Arrow.Size */}px`,
            "&:before": {
                borderTop: `${7 /* Arrow.Size */}px solid #bbb`,
            },
            "&:after": {
                borderTop: `${7 /* Arrow.Size */}px solid #f5f5f5`,
                bottom: "1px"
            }
        },
        ".cm-tooltip-below &": {
            top: `-${7 /* Arrow.Size */}px`,
            "&:before": {
                borderBottom: `${7 /* Arrow.Size */}px solid #bbb`,
            },
            "&:after": {
                borderBottom: `${7 /* Arrow.Size */}px solid #f5f5f5`,
                top: "1px"
            }
        },
    },
    "&dark .cm-tooltip .cm-tooltip-arrow": {
        "&:before": {
            borderTopColor: "#333338",
            borderBottomColor: "#333338"
        },
        "&:after": {
            borderTopColor: "transparent",
            borderBottomColor: "transparent"
        }
    }
});
const noOffset = { x: 0, y: 0 };
/**
Facet to which an extension can add a value to show a tooltip.
*/
const showTooltip = state.Facet.define({
    enables: [tooltipPlugin, baseTheme]
});
const showHoverTooltip = state.Facet.define({
    combine: inputs => inputs.reduce((a, i) => a.concat(i), [])
});
class HoverTooltipHost {
    // Needs to be static so that host tooltip instances always match
    static create(view) {
        return new HoverTooltipHost(view);
    }
    constructor(view) {
        this.view = view;
        this.mounted = false;
        this.dom = document.createElement("div");
        this.dom.classList.add("cm-tooltip-hover");
        this.manager = new TooltipViewManager(view, showHoverTooltip, (t, p) => this.createHostedView(t, p), t => t.dom.remove());
    }
    createHostedView(tooltip, prev) {
        let hostedView = tooltip.create(this.view);
        hostedView.dom.classList.add("cm-tooltip-section");
        this.dom.insertBefore(hostedView.dom, prev ? prev.dom.nextSibling : this.dom.firstChild);
        if (this.mounted && hostedView.mount)
            hostedView.mount(this.view);
        return hostedView;
    }
    mount(view) {
        for (let hostedView of this.manager.tooltipViews) {
            if (hostedView.mount)
                hostedView.mount(view);
        }
        this.mounted = true;
    }
    positioned(space) {
        for (let hostedView of this.manager.tooltipViews) {
            if (hostedView.positioned)
                hostedView.positioned(space);
        }
    }
    update(update) {
        this.manager.update(update);
    }
    destroy() {
        var _a;
        for (let t of this.manager.tooltipViews)
            (_a = t.destroy) === null || _a === void 0 ? void 0 : _a.call(t);
    }
    passProp(name) {
        let value = undefined;
        for (let view of this.manager.tooltipViews) {
            let given = view[name];
            if (given !== undefined) {
                if (value === undefined)
                    value = given;
                else if (value !== given)
                    return undefined;
            }
        }
        return value;
    }
    get offset() { return this.passProp("offset"); }
    get getCoords() { return this.passProp("getCoords"); }
    get overlap() { return this.passProp("overlap"); }
    get resize() { return this.passProp("resize"); }
}
const showHoverTooltipHost = showTooltip.compute([showHoverTooltip], state => {
    let tooltips = state.facet(showHoverTooltip);
    if (tooltips.length === 0)
        return null;
    return {
        pos: Math.min(...tooltips.map(t => t.pos)),
        end: Math.max(...tooltips.map(t => { var _a; return (_a = t.end) !== null && _a !== void 0 ? _a : t.pos; })),
        create: HoverTooltipHost.create,
        above: tooltips[0].above,
        arrow: tooltips.some(t => t.arrow),
    };
});
class HoverPlugin {
    constructor(view, source, field, setHover, hoverTime) {
        this.view = view;
        this.source = source;
        this.field = field;
        this.setHover = setHover;
        this.hoverTime = hoverTime;
        this.hoverTimeout = -1;
        this.restartTimeout = -1;
        this.pending = null;
        this.lastMove = { x: 0, y: 0, target: view.dom, time: 0 };
        this.checkHover = this.checkHover.bind(this);
        view.dom.addEventListener("mouseleave", this.mouseleave = this.mouseleave.bind(this));
        view.dom.addEventListener("mousemove", this.mousemove = this.mousemove.bind(this));
    }
    update() {
        if (this.pending) {
            this.pending = null;
            clearTimeout(this.restartTimeout);
            this.restartTimeout = setTimeout(() => this.startHover(), 20);
        }
    }
    get active() {
        return this.view.state.field(this.field);
    }
    checkHover() {
        this.hoverTimeout = -1;
        if (this.active.length)
            return;
        let hovered = Date.now() - this.lastMove.time;
        if (hovered < this.hoverTime)
            this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime - hovered);
        else
            this.startHover();
    }
    startHover() {
        clearTimeout(this.restartTimeout);
        let { view, lastMove } = this;
        let tile = view.docView.tile.nearest(lastMove.target);
        if (!tile)
            return;
        let pos, side = 1;
        if (tile.isWidget()) {
            pos = tile.posAtStart;
        }
        else {
            pos = view.posAtCoords(lastMove);
            if (pos == null)
                return;
            let posCoords = view.coordsAtPos(pos);
            if (!posCoords ||
                lastMove.y < posCoords.top || lastMove.y > posCoords.bottom ||
                lastMove.x < posCoords.left - view.defaultCharacterWidth ||
                lastMove.x > posCoords.right + view.defaultCharacterWidth)
                return;
            let bidi = view.bidiSpans(view.state.doc.lineAt(pos)).find(s => s.from <= pos && s.to >= pos);
            let rtl = bidi && bidi.dir == exports.Direction.RTL ? -1 : 1;
            side = (lastMove.x < posCoords.left ? -rtl : rtl);
        }
        let open = this.source(view, pos, side);
        if (open === null || open === void 0 ? void 0 : open.then) {
            let pending = this.pending = { pos };
            open.then(result => {
                if (this.pending == pending) {
                    this.pending = null;
                    if (result && !(Array.isArray(result) && !result.length))
                        view.dispatch({ effects: this.setHover.of(Array.isArray(result) ? result : [result]) });
                }
            }, e => logException(view.state, e, "hover tooltip"));
        }
        else if (open && !(Array.isArray(open) && !open.length)) {
            view.dispatch({ effects: this.setHover.of(Array.isArray(open) ? open : [open]) });
        }
    }
    get tooltip() {
        let plugin = this.view.plugin(tooltipPlugin);
        let index = plugin ? plugin.manager.tooltips.findIndex(t => t.create == HoverTooltipHost.create) : -1;
        return index > -1 ? plugin.manager.tooltipViews[index] : null;
    }
    mousemove(event) {
        var _a, _b;
        this.lastMove = { x: event.clientX, y: event.clientY, target: event.target, time: Date.now() };
        if (this.hoverTimeout < 0)
            this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime);
        let { active, tooltip } = this;
        if (active.length && tooltip && !isInTooltip(tooltip.dom, event) || this.pending) {
            let { pos } = active[0] || this.pending, end = (_b = (_a = active[0]) === null || _a === void 0 ? void 0 : _a.end) !== null && _b !== void 0 ? _b : pos;
            if ((pos == end ? this.view.posAtCoords(this.lastMove) != pos
                : !isOverRange(this.view, pos, end, event.clientX, event.clientY))) {
                this.view.dispatch({ effects: this.setHover.of([]) });
                this.pending = null;
            }
        }
    }
    mouseleave(event) {
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = -1;
        let { active } = this;
        if (active.length) {
            let { tooltip } = this;
            let inTooltip = tooltip && tooltip.dom.contains(event.relatedTarget);
            if (!inTooltip)
                this.view.dispatch({ effects: this.setHover.of([]) });
            else
                this.watchTooltipLeave(tooltip.dom);
        }
    }
    watchTooltipLeave(tooltip) {
        let watch = (event) => {
            tooltip.removeEventListener("mouseleave", watch);
            if (this.active.length && !this.view.dom.contains(event.relatedTarget))
                this.view.dispatch({ effects: this.setHover.of([]) });
        };
        tooltip.addEventListener("mouseleave", watch);
    }
    destroy() {
        clearTimeout(this.hoverTimeout);
        this.view.dom.removeEventListener("mouseleave", this.mouseleave);
        this.view.dom.removeEventListener("mousemove", this.mousemove);
    }
}
const tooltipMargin = 4;
function isInTooltip(tooltip, event) {
    let { left, right, top, bottom } = tooltip.getBoundingClientRect(), arrow;
    if (arrow = tooltip.querySelector(".cm-tooltip-arrow")) {
        let arrowRect = arrow.getBoundingClientRect();
        top = Math.min(arrowRect.top, top);
        bottom = Math.max(arrowRect.bottom, bottom);
    }
    return event.clientX >= left - tooltipMargin && event.clientX <= right + tooltipMargin &&
        event.clientY >= top - tooltipMargin && event.clientY <= bottom + tooltipMargin;
}
function isOverRange(view, from, to, x, y, margin) {
    let rect = view.scrollDOM.getBoundingClientRect();
    let docBottom = view.documentTop + view.documentPadding.top + view.contentHeight;
    if (rect.left > x || rect.right < x || rect.top > y || Math.min(rect.bottom, docBottom) < y)
        return false;
    let pos = view.posAtCoords({ x, y }, false);
    return pos >= from && pos <= to;
}
/**
Set up a hover tooltip, which shows up when the pointer hovers
over ranges of text. The callback is called when the mouse hovers
over the document text. It should, if there is a tooltip
associated with position `pos`, return the tooltip description
(either directly or in a promise). The `side` argument indicates
on which side of the position the pointer is—it will be -1 if the
pointer is before the position, 1 if after the position.

Note that all hover tooltips are hosted within a single tooltip
container element. This allows multiple tooltips over the same
range to be "merged" together without overlapping.

The return value is a valid [editor extension](https://codemirror.net/6/docs/ref/#state.Extension)
but also provides an `active` property holding a state field that
can be used to read the currently active tooltips produced by this
extension.
*/
function hoverTooltip(source, options = {}) {
    let setHover = state.StateEffect.define();
    let hoverState = state.StateField.define({
        create() { return []; },
        update(value, tr) {
            if (value.length) {
                if (options.hideOnChange && (tr.docChanged || tr.selection))
                    value = [];
                else if (options.hideOn)
                    value = value.filter(v => !options.hideOn(tr, v));
                if (tr.docChanged) {
                    let mapped = [];
                    for (let tooltip of value) {
                        let newPos = tr.changes.mapPos(tooltip.pos, -1, state.MapMode.TrackDel);
                        if (newPos != null) {
                            let copy = Object.assign(Object.create(null), tooltip);
                            copy.pos = newPos;
                            if (copy.end != null)
                                copy.end = tr.changes.mapPos(copy.end);
                            mapped.push(copy);
                        }
                    }
                    value = mapped;
                }
            }
            for (let effect of tr.effects) {
                if (effect.is(setHover))
                    value = effect.value;
                if (effect.is(closeHoverTooltipEffect))
                    value = [];
            }
            return value;
        },
        provide: f => showHoverTooltip.from(f)
    });
    return {
        active: hoverState,
        extension: [
            hoverState,
            ViewPlugin.define(view => new HoverPlugin(view, source, hoverState, setHover, options.hoverTime || 300 /* Hover.Time */)),
            showHoverTooltipHost
        ]
    };
}
/**
Get the active tooltip view for a given tooltip, if available.
*/
function getTooltip(view, tooltip) {
    let plugin = view.plugin(tooltipPlugin);
    if (!plugin)
        return null;
    let found = plugin.manager.tooltips.indexOf(tooltip);
    return found < 0 ? null : plugin.manager.tooltipViews[found];
}
/**
Returns true if any hover tooltips are currently active.
*/
function hasHoverTooltips(state) {
    return state.facet(showHoverTooltip).some(x => x);
}
const closeHoverTooltipEffect = state.StateEffect.define();
/**
Transaction effect that closes all hover tooltips.
*/
const closeHoverTooltips = closeHoverTooltipEffect.of(null);
/**
Tell the tooltip extension to recompute the position of the active
tooltips. This can be useful when something happens (such as a
re-positioning or CSS change affecting the editor) that could
invalidate the existing tooltip positions.
*/
function repositionTooltips(view) {
    let plugin = view.plugin(tooltipPlugin);
    if (plugin)
        plugin.maybeMeasure();
}

const panelConfig = state.Facet.define({
    combine(configs) {
        let topContainer, bottomContainer;
        for (let c of configs) {
            topContainer = topContainer || c.topContainer;
            bottomContainer = bottomContainer || c.bottomContainer;
        }
        return { topContainer, bottomContainer };
    }
});
/**
Configures the panel-managing extension.
*/
function panels(config) {
    return config ? [panelConfig.of(config)] : [];
}
/**
Get the active panel created by the given constructor, if any.
This can be useful when you need access to your panels' DOM
structure.
*/
function getPanel(view, panel) {
    let plugin = view.plugin(panelPlugin);
    let index = plugin ? plugin.specs.indexOf(panel) : -1;
    return index > -1 ? plugin.panels[index] : null;
}
const panelPlugin = ViewPlugin.fromClass(class {
    constructor(view) {
        this.input = view.state.facet(showPanel);
        this.specs = this.input.filter(s => s);
        this.panels = this.specs.map(spec => spec(view));
        let conf = view.state.facet(panelConfig);
        this.top = new PanelGroup(view, true, conf.topContainer);
        this.bottom = new PanelGroup(view, false, conf.bottomContainer);
        this.top.sync(this.panels.filter(p => p.top));
        this.bottom.sync(this.panels.filter(p => !p.top));
        for (let p of this.panels) {
            p.dom.classList.add("cm-panel");
            if (p.mount)
                p.mount();
        }
    }
    update(update) {
        let conf = update.state.facet(panelConfig);
        if (this.top.container != conf.topContainer) {
            this.top.sync([]);
            this.top = new PanelGroup(update.view, true, conf.topContainer);
        }
        if (this.bottom.container != conf.bottomContainer) {
            this.bottom.sync([]);
            this.bottom = new PanelGroup(update.view, false, conf.bottomContainer);
        }
        this.top.syncClasses();
        this.bottom.syncClasses();
        let input = update.state.facet(showPanel);
        if (input != this.input) {
            let specs = input.filter(x => x);
            let panels = [], top = [], bottom = [], mount = [];
            for (let spec of specs) {
                let known = this.specs.indexOf(spec), panel;
                if (known < 0) {
                    panel = spec(update.view);
                    mount.push(panel);
                }
                else {
                    panel = this.panels[known];
                    if (panel.update)
                        panel.update(update);
                }
                panels.push(panel);
                (panel.top ? top : bottom).push(panel);
            }
            this.specs = specs;
            this.panels = panels;
            this.top.sync(top);
            this.bottom.sync(bottom);
            for (let p of mount) {
                p.dom.classList.add("cm-panel");
                if (p.mount)
                    p.mount();
            }
        }
        else {
            for (let p of this.panels)
                if (p.update)
                    p.update(update);
        }
    }
    destroy() {
        this.top.sync([]);
        this.bottom.sync([]);
    }
}, {
    provide: plugin => EditorView.scrollMargins.of(view => {
        let value = view.plugin(plugin);
        return value && { top: value.top.scrollMargin(), bottom: value.bottom.scrollMargin() };
    })
});
class PanelGroup {
    constructor(view, top, container) {
        this.view = view;
        this.top = top;
        this.container = container;
        this.dom = undefined;
        this.classes = "";
        this.panels = [];
        this.syncClasses();
    }
    sync(panels) {
        for (let p of this.panels)
            if (p.destroy && panels.indexOf(p) < 0)
                p.destroy();
        this.panels = panels;
        this.syncDOM();
    }
    syncDOM() {
        if (this.panels.length == 0) {
            if (this.dom) {
                this.dom.remove();
                this.dom = undefined;
            }
            return;
        }
        if (!this.dom) {
            this.dom = document.createElement("div");
            this.dom.className = this.top ? "cm-panels cm-panels-top" : "cm-panels cm-panels-bottom";
            this.dom.style[this.top ? "top" : "bottom"] = "0";
            let parent = this.container || this.view.dom;
            parent.insertBefore(this.dom, this.top ? parent.firstChild : null);
        }
        let curDOM = this.dom.firstChild;
        for (let panel of this.panels) {
            if (panel.dom.parentNode == this.dom) {
                while (curDOM != panel.dom)
                    curDOM = rm(curDOM);
                curDOM = curDOM.nextSibling;
            }
            else {
                this.dom.insertBefore(panel.dom, curDOM);
            }
        }
        while (curDOM)
            curDOM = rm(curDOM);
    }
    scrollMargin() {
        return !this.dom || this.container ? 0
            : Math.max(0, this.top ?
                this.dom.getBoundingClientRect().bottom - Math.max(0, this.view.scrollDOM.getBoundingClientRect().top) :
                Math.min(innerHeight, this.view.scrollDOM.getBoundingClientRect().bottom) - this.dom.getBoundingClientRect().top);
    }
    syncClasses() {
        if (!this.container || this.classes == this.view.themeClasses)
            return;
        for (let cls of this.classes.split(" "))
            if (cls)
                this.container.classList.remove(cls);
        for (let cls of (this.classes = this.view.themeClasses).split(" "))
            if (cls)
                this.container.classList.add(cls);
    }
}
function rm(node) {
    let next = node.nextSibling;
    node.remove();
    return next;
}
/**
Opening a panel is done by providing a constructor function for
the panel through this facet. (The panel is closed again when its
constructor is no longer provided.) Values of `null` are ignored.
*/
const showPanel = state.Facet.define({
    enables: panelPlugin
});

/**
Show a panel above or below the editor to show the user a message
or prompt them for input. Returns an effect that can be dispatched
to close the dialog, and a promise that resolves when the dialog
is closed or a form inside of it is submitted.

You are encouraged, if your handling of the result of the promise
dispatches a transaction, to include the `close` effect in it. If
you don't, this function will automatically dispatch a separate
transaction right after.
*/
function showDialog(view, config) {
    let resolve;
    let promise = new Promise(r => resolve = r);
    let panelCtor = (view) => createDialog(view, config, resolve);
    if (view.state.field(dialogField, false)) {
        view.dispatch({ effects: openDialogEffect.of(panelCtor) });
    }
    else {
        view.dispatch({ effects: state.StateEffect.appendConfig.of(dialogField.init(() => [panelCtor])) });
    }
    let close = closeDialogEffect.of(panelCtor);
    return { close, result: promise.then(form => {
            let queue = view.win.queueMicrotask || ((f) => view.win.setTimeout(f, 10));
            queue(() => {
                if (view.state.field(dialogField).indexOf(panelCtor) > -1)
                    view.dispatch({ effects: close });
            });
            return form;
        }) };
}
/**
Find the [`Panel`](https://codemirror.net/6/docs/ref/#view.Panel) for an open dialog, using a class
name as identifier.
*/
function getDialog(view, className) {
    let dialogs = view.state.field(dialogField, false) || [];
    for (let open of dialogs) {
        let panel = getPanel(view, open);
        if (panel && panel.dom.classList.contains(className))
            return panel;
    }
    return null;
}
const dialogField = state.StateField.define({
    create() { return []; },
    update(dialogs, tr) {
        for (let e of tr.effects) {
            if (e.is(openDialogEffect))
                dialogs = [e.value].concat(dialogs);
            else if (e.is(closeDialogEffect))
                dialogs = dialogs.filter(d => d != e.value);
        }
        return dialogs;
    },
    provide: f => showPanel.computeN([f], state => state.field(f))
});
const openDialogEffect = state.StateEffect.define();
const closeDialogEffect = state.StateEffect.define();
function createDialog(view, config, result) {
    let content = config.content ? config.content(view, () => done(null)) : null;
    if (!content) {
        content = elt("form");
        if (config.input) {
            let input = elt("input", config.input);
            if (/^(text|password|number|email|tel|url)$/.test(input.type))
                input.classList.add("cm-textfield");
            if (!input.name)
                input.name = "input";
            content.appendChild(elt("label", (config.label || "") + ": ", input));
        }
        else {
            content.appendChild(document.createTextNode(config.label || ""));
        }
        content.appendChild(document.createTextNode(" "));
        content.appendChild(elt("button", { class: "cm-button", type: "submit" }, config.submitLabel || "OK"));
    }
    let forms = content.nodeName == "FORM" ? [content] : content.querySelectorAll("form");
    for (let i = 0; i < forms.length; i++) {
        let form = forms[i];
        form.addEventListener("keydown", (event) => {
            if (event.keyCode == 27) { // Escape
                event.preventDefault();
                done(null);
            }
            else if (event.keyCode == 13) { // Enter
                event.preventDefault();
                done(form);
            }
        });
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            done(form);
        });
    }
    let panel = elt("div", content, elt("button", {
        onclick: () => done(null),
        "aria-label": view.state.phrase("close"),
        class: "cm-dialog-close",
        type: "button"
    }, ["×"]));
    if (config.class)
        panel.className = config.class;
    panel.classList.add("cm-dialog");
    function done(form) {
        if (panel.contains(panel.ownerDocument.activeElement))
            view.focus();
        result(form);
    }
    return {
        dom: panel,
        top: config.top,
        mount: () => {
            if (config.focus) {
                let focus;
                if (typeof config.focus == "string")
                    focus = content.querySelector(config.focus);
                else
                    focus = content.querySelector("input") || content.querySelector("button");
                if (focus && "select" in focus)
                    focus.select();
                else if (focus && "focus" in focus)
                    focus.focus();
            }
        }
    };
}

/**
A gutter marker represents a bit of information attached to a line
in a specific gutter. Your own custom markers have to extend this
class.
*/
class GutterMarker extends state.RangeValue {
    /**
    @internal
    */
    compare(other) {
        return this == other || this.constructor == other.constructor && this.eq(other);
    }
    /**
    Compare this marker to another marker of the same type.
    */
    eq(other) { return false; }
    /**
    Called if the marker has a `toDOM` method and its representation
    was removed from a gutter.
    */
    destroy(dom) { }
}
GutterMarker.prototype.elementClass = "";
GutterMarker.prototype.toDOM = undefined;
GutterMarker.prototype.mapMode = state.MapMode.TrackBefore;
GutterMarker.prototype.startSide = GutterMarker.prototype.endSide = -1;
GutterMarker.prototype.point = true;
/**
Facet used to add a class to all gutter elements for a given line.
Markers given to this facet should _only_ define an
[`elementclass`](https://codemirror.net/6/docs/ref/#view.GutterMarker.elementClass), not a
[`toDOM`](https://codemirror.net/6/docs/ref/#view.GutterMarker.toDOM) (or the marker will appear
in all gutters for the line).
*/
const gutterLineClass = state.Facet.define();
/**
Facet used to add a class to all gutter elements next to a widget.
Should not provide widgets with a `toDOM` method.
*/
const gutterWidgetClass = state.Facet.define();
const defaults = {
    class: "",
    renderEmptyElements: false,
    elementStyle: "",
    markers: () => state.RangeSet.empty,
    lineMarker: () => null,
    widgetMarker: () => null,
    lineMarkerChange: null,
    initialSpacer: null,
    updateSpacer: null,
    domEventHandlers: {},
    side: "before"
};
const activeGutters = state.Facet.define();
/**
Define an editor gutter. The order in which the gutters appear is
determined by their extension priority.
*/
function gutter(config) {
    return [gutters(), activeGutters.of({ ...defaults, ...config })];
}
const unfixGutters = state.Facet.define({
    combine: values => values.some(x => x)
});
/**
The gutter-drawing plugin is automatically enabled when you add a
gutter, but you can use this function to explicitly configure it.

Unless `fixed` is explicitly set to `false`, the gutters are
fixed, meaning they don't scroll along with the content
horizontally (except on Internet Explorer, which doesn't support
CSS [`position:
sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky)).
*/
function gutters(config) {
    let result = [
        gutterView,
    ];
    if (config && config.fixed === false)
        result.push(unfixGutters.of(true));
    return result;
}
const gutterView = ViewPlugin.fromClass(class {
    constructor(view) {
        this.view = view;
        this.domAfter = null;
        this.prevViewport = view.viewport;
        this.dom = document.createElement("div");
        this.dom.className = "cm-gutters cm-gutters-before";
        this.dom.setAttribute("aria-hidden", "true");
        this.dom.style.minHeight = (this.view.contentHeight / this.view.scaleY) + "px";
        this.gutters = view.state.facet(activeGutters).map(conf => new SingleGutterView(view, conf));
        this.fixed = !view.state.facet(unfixGutters);
        for (let gutter of this.gutters) {
            if (gutter.config.side == "after")
                this.getDOMAfter().appendChild(gutter.dom);
            else
                this.dom.appendChild(gutter.dom);
        }
        if (this.fixed) {
            // FIXME IE11 fallback, which doesn't support position: sticky,
            // by using position: relative + event handlers that realign the
            // gutter (or just force fixed=false on IE11?)
            this.dom.style.position = "sticky";
        }
        this.syncGutters(false);
        view.scrollDOM.insertBefore(this.dom, view.contentDOM);
    }
    getDOMAfter() {
        if (!this.domAfter) {
            this.domAfter = document.createElement("div");
            this.domAfter.className = "cm-gutters cm-gutters-after";
            this.domAfter.setAttribute("aria-hidden", "true");
            this.domAfter.style.minHeight = (this.view.contentHeight / this.view.scaleY) + "px";
            this.domAfter.style.position = this.fixed ? "sticky" : "";
            this.view.scrollDOM.appendChild(this.domAfter);
        }
        return this.domAfter;
    }
    update(update) {
        if (this.updateGutters(update)) {
            // Detach during sync when the viewport changed significantly
            // (such as during scrolling), since for large updates that is
            // faster.
            let vpA = this.prevViewport, vpB = update.view.viewport;
            let vpOverlap = Math.min(vpA.to, vpB.to) - Math.max(vpA.from, vpB.from);
            this.syncGutters(vpOverlap < (vpB.to - vpB.from) * 0.8);
        }
        if (update.geometryChanged) {
            let min = (this.view.contentHeight / this.view.scaleY) + "px";
            this.dom.style.minHeight = min;
            if (this.domAfter)
                this.domAfter.style.minHeight = min;
        }
        if (this.view.state.facet(unfixGutters) != !this.fixed) {
            this.fixed = !this.fixed;
            this.dom.style.position = this.fixed ? "sticky" : "";
            if (this.domAfter)
                this.domAfter.style.position = this.fixed ? "sticky" : "";
        }
        this.prevViewport = update.view.viewport;
    }
    syncGutters(detach) {
        let after = this.dom.nextSibling;
        if (detach) {
            this.dom.remove();
            if (this.domAfter)
                this.domAfter.remove();
        }
        let lineClasses = state.RangeSet.iter(this.view.state.facet(gutterLineClass), this.view.viewport.from);
        let classSet = [];
        let contexts = this.gutters.map(gutter => new UpdateContext(gutter, this.view.viewport, -this.view.documentPadding.top));
        for (let line of this.view.viewportLineBlocks) {
            if (classSet.length)
                classSet = [];
            if (Array.isArray(line.type)) {
                let first = true;
                for (let b of line.type) {
                    if (b.type == exports.BlockType.Text && first) {
                        advanceCursor(lineClasses, classSet, b.from);
                        for (let cx of contexts)
                            cx.line(this.view, b, classSet);
                        first = false;
                    }
                    else if (b.widget) {
                        for (let cx of contexts)
                            cx.widget(this.view, b);
                    }
                }
            }
            else if (line.type == exports.BlockType.Text) {
                advanceCursor(lineClasses, classSet, line.from);
                for (let cx of contexts)
                    cx.line(this.view, line, classSet);
            }
            else if (line.widget) {
                for (let cx of contexts)
                    cx.widget(this.view, line);
            }
        }
        for (let cx of contexts)
            cx.finish();
        if (detach) {
            this.view.scrollDOM.insertBefore(this.dom, after);
            if (this.domAfter)
                this.view.scrollDOM.appendChild(this.domAfter);
        }
    }
    updateGutters(update) {
        let prev = update.startState.facet(activeGutters), cur = update.state.facet(activeGutters);
        let change = update.docChanged || update.heightChanged || update.viewportChanged ||
            !state.RangeSet.eq(update.startState.facet(gutterLineClass), update.state.facet(gutterLineClass), update.view.viewport.from, update.view.viewport.to);
        if (prev == cur) {
            for (let gutter of this.gutters)
                if (gutter.update(update))
                    change = true;
        }
        else {
            change = true;
            let gutters = [];
            for (let conf of cur) {
                let known = prev.indexOf(conf);
                if (known < 0) {
                    gutters.push(new SingleGutterView(this.view, conf));
                }
                else {
                    this.gutters[known].update(update);
                    gutters.push(this.gutters[known]);
                }
            }
            for (let g of this.gutters) {
                g.dom.remove();
                if (gutters.indexOf(g) < 0)
                    g.destroy();
            }
            for (let g of gutters) {
                if (g.config.side == "after")
                    this.getDOMAfter().appendChild(g.dom);
                else
                    this.dom.appendChild(g.dom);
            }
            this.gutters = gutters;
        }
        return change;
    }
    destroy() {
        for (let view of this.gutters)
            view.destroy();
        this.dom.remove();
        if (this.domAfter)
            this.domAfter.remove();
    }
}, {
    provide: plugin => EditorView.scrollMargins.of(view => {
        let value = view.plugin(plugin);
        if (!value || value.gutters.length == 0 || !value.fixed)
            return null;
        let before = value.dom.offsetWidth * view.scaleX, after = value.domAfter ? value.domAfter.offsetWidth * view.scaleX : 0;
        return view.textDirection == exports.Direction.LTR
            ? { left: before, right: after }
            : { right: before, left: after };
    })
});
function asArray(val) { return (Array.isArray(val) ? val : [val]); }
function advanceCursor(cursor, collect, pos) {
    while (cursor.value && cursor.from <= pos) {
        if (cursor.from == pos)
            collect.push(cursor.value);
        cursor.next();
    }
}
class UpdateContext {
    constructor(gutter, viewport, height) {
        this.gutter = gutter;
        this.height = height;
        this.i = 0;
        this.cursor = state.RangeSet.iter(gutter.markers, viewport.from);
    }
    addElement(view, block, markers) {
        let { gutter } = this, above = (block.top - this.height) / view.scaleY, height = block.height / view.scaleY;
        if (this.i == gutter.elements.length) {
            let newElt = new GutterElement(view, height, above, markers);
            gutter.elements.push(newElt);
            gutter.dom.appendChild(newElt.dom);
        }
        else {
            gutter.elements[this.i].update(view, height, above, markers);
        }
        this.height = block.bottom;
        this.i++;
    }
    line(view, line, extraMarkers) {
        let localMarkers = [];
        advanceCursor(this.cursor, localMarkers, line.from);
        if (extraMarkers.length)
            localMarkers = localMarkers.concat(extraMarkers);
        let forLine = this.gutter.config.lineMarker(view, line, localMarkers);
        if (forLine)
            localMarkers.unshift(forLine);
        let gutter = this.gutter;
        if (localMarkers.length == 0 && !gutter.config.renderEmptyElements)
            return;
        this.addElement(view, line, localMarkers);
    }
    widget(view, block) {
        let marker = this.gutter.config.widgetMarker(view, block.widget, block), markers = marker ? [marker] : null;
        for (let cls of view.state.facet(gutterWidgetClass)) {
            let marker = cls(view, block.widget, block);
            if (marker)
                (markers || (markers = [])).push(marker);
        }
        if (markers)
            this.addElement(view, block, markers);
    }
    finish() {
        let gutter = this.gutter;
        while (gutter.elements.length > this.i) {
            let last = gutter.elements.pop();
            gutter.dom.removeChild(last.dom);
            last.destroy();
        }
    }
}
class SingleGutterView {
    constructor(view, config) {
        this.view = view;
        this.config = config;
        this.elements = [];
        this.spacer = null;
        this.dom = document.createElement("div");
        this.dom.className = "cm-gutter" + (this.config.class ? " " + this.config.class : "");
        for (let prop in config.domEventHandlers) {
            this.dom.addEventListener(prop, (event) => {
                let target = event.target, y;
                if (target != this.dom && this.dom.contains(target)) {
                    while (target.parentNode != this.dom)
                        target = target.parentNode;
                    let rect = target.getBoundingClientRect();
                    y = (rect.top + rect.bottom) / 2;
                }
                else {
                    y = event.clientY;
                }
                let line = view.lineBlockAtHeight(y - view.documentTop);
                if (config.domEventHandlers[prop](view, line, event))
                    event.preventDefault();
            });
        }
        this.markers = asArray(config.markers(view));
        if (config.initialSpacer) {
            this.spacer = new GutterElement(view, 0, 0, [config.initialSpacer(view)]);
            this.dom.appendChild(this.spacer.dom);
            this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none";
        }
    }
    update(update) {
        let prevMarkers = this.markers;
        this.markers = asArray(this.config.markers(update.view));
        if (this.spacer && this.config.updateSpacer) {
            let updated = this.config.updateSpacer(this.spacer.markers[0], update);
            if (updated != this.spacer.markers[0])
                this.spacer.update(update.view, 0, 0, [updated]);
        }
        let vp = update.view.viewport;
        return !state.RangeSet.eq(this.markers, prevMarkers, vp.from, vp.to) ||
            (this.config.lineMarkerChange ? this.config.lineMarkerChange(update) : false);
    }
    destroy() {
        for (let elt of this.elements)
            elt.destroy();
    }
}
class GutterElement {
    constructor(view, height, above, markers) {
        this.height = -1;
        this.above = 0;
        this.markers = [];
        this.dom = document.createElement("div");
        this.dom.className = "cm-gutterElement";
        this.update(view, height, above, markers);
    }
    update(view, height, above, markers) {
        if (this.height != height) {
            this.height = height;
            this.dom.style.height = height + "px";
        }
        if (this.above != above)
            this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
        if (!sameMarkers(this.markers, markers))
            this.setMarkers(view, markers);
    }
    setMarkers(view, markers) {
        let cls = "cm-gutterElement", domPos = this.dom.firstChild;
        for (let iNew = 0, iOld = 0;;) {
            let skipTo = iOld, marker = iNew < markers.length ? markers[iNew++] : null, matched = false;
            if (marker) {
                let c = marker.elementClass;
                if (c)
                    cls += " " + c;
                for (let i = iOld; i < this.markers.length; i++)
                    if (this.markers[i].compare(marker)) {
                        skipTo = i;
                        matched = true;
                        break;
                    }
            }
            else {
                skipTo = this.markers.length;
            }
            while (iOld < skipTo) {
                let next = this.markers[iOld++];
                if (next.toDOM) {
                    next.destroy(domPos);
                    let after = domPos.nextSibling;
                    domPos.remove();
                    domPos = after;
                }
            }
            if (!marker)
                break;
            if (marker.toDOM) {
                if (matched)
                    domPos = domPos.nextSibling;
                else
                    this.dom.insertBefore(marker.toDOM(view), domPos);
            }
            if (matched)
                iOld++;
        }
        this.dom.className = cls;
        this.markers = markers;
    }
    destroy() {
        this.setMarkers(null, []); // First argument not used unless creating markers
    }
}
function sameMarkers(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (!a[i].compare(b[i]))
            return false;
    return true;
}
/**
Facet used to provide markers to the line number gutter.
*/
const lineNumberMarkers = state.Facet.define();
/**
Facet used to create markers in the line number gutter next to widgets.
*/
const lineNumberWidgetMarker = state.Facet.define();
const lineNumberConfig = state.Facet.define({
    combine(values) {
        return state.combineConfig(values, { formatNumber: String, domEventHandlers: {} }, {
            domEventHandlers(a, b) {
                let result = Object.assign({}, a);
                for (let event in b) {
                    let exists = result[event], add = b[event];
                    result[event] = exists ? (view, line, event) => exists(view, line, event) || add(view, line, event) : add;
                }
                return result;
            }
        });
    }
});
class NumberMarker extends GutterMarker {
    constructor(number) {
        super();
        this.number = number;
    }
    eq(other) { return this.number == other.number; }
    toDOM() { return document.createTextNode(this.number); }
}
function formatNumber(view, number) {
    return view.state.facet(lineNumberConfig).formatNumber(number, view.state);
}
const lineNumberGutter = activeGutters.compute([lineNumberConfig], state => ({
    class: "cm-lineNumbers",
    renderEmptyElements: false,
    markers(view) { return view.state.facet(lineNumberMarkers); },
    lineMarker(view, line, others) {
        if (others.some(m => m.toDOM))
            return null;
        return new NumberMarker(formatNumber(view, view.state.doc.lineAt(line.from).number));
    },
    widgetMarker: (view, widget, block) => {
        for (let m of view.state.facet(lineNumberWidgetMarker)) {
            let result = m(view, widget, block);
            if (result)
                return result;
        }
        return null;
    },
    lineMarkerChange: update => update.startState.facet(lineNumberConfig) != update.state.facet(lineNumberConfig),
    initialSpacer(view) {
        return new NumberMarker(formatNumber(view, maxLineNumber(view.state.doc.lines)));
    },
    updateSpacer(spacer, update) {
        let max = formatNumber(update.view, maxLineNumber(update.view.state.doc.lines));
        return max == spacer.number ? spacer : new NumberMarker(max);
    },
    domEventHandlers: state.facet(lineNumberConfig).domEventHandlers,
    side: "before"
}));
/**
Create a line number gutter extension.
*/
function lineNumbers(config = {}) {
    return [
        lineNumberConfig.of(config),
        gutters(),
        lineNumberGutter
    ];
}
function maxLineNumber(lines) {
    let last = 9;
    while (last < lines)
        last = last * 10 + 9;
    return last;
}
const activeLineGutterMarker = new class extends GutterMarker {
    constructor() {
        super(...arguments);
        this.elementClass = "cm-activeLineGutter";
    }
};
const activeLineGutterHighlighter = gutterLineClass.compute(["selection"], state$1 => {
    let marks = [], last = -1;
    for (let range of state$1.selection.ranges) {
        let linePos = state$1.doc.lineAt(range.head).from;
        if (linePos > last) {
            last = linePos;
            marks.push(activeLineGutterMarker.range(linePos));
        }
    }
    return state.RangeSet.of(marks);
});
/**
Returns an extension that adds a `cm-activeLineGutter` class to
all gutter elements on the [active
line](https://codemirror.net/6/docs/ref/#view.highlightActiveLine).
*/
function highlightActiveLineGutter() {
    return activeLineGutterHighlighter;
}

function matcher(decorator) {
    return ViewPlugin.define(view => ({
        decorations: decorator.createDeco(view),
        update(u) {
            this.decorations = decorator.updateDeco(u, this.decorations);
        },
    }), {
        decorations: v => v.decorations
    });
}
const tabDeco = Decoration.mark({ class: "cm-highlightTab" });
const spaceDeco = Decoration.mark({ class: "cm-highlightSpace" });
const whitespaceHighlighter = matcher(new MatchDecorator({
    regexp: /\t| /g,
    decoration: match => match[0] == "\t" ? tabDeco : spaceDeco,
    boundary: /\S/,
}));
/**
Returns an extension that highlights whitespace, adding a
`cm-highlightSpace` class to stretches of spaces, and a
`cm-highlightTab` class to individual tab characters. By default,
the former are shown as faint dots, and the latter as arrows.
*/
function highlightWhitespace() {
    return whitespaceHighlighter;
}
const trailingHighlighter = matcher(new MatchDecorator({
    regexp: /\s+$/g,
    decoration: Decoration.mark({ class: "cm-trailingSpace" })
}));
/**
Returns an extension that adds a `cm-trailingSpace` class to all
trailing whitespace.
*/
function highlightTrailingWhitespace() {
    return trailingHighlighter;
}

/**
@internal
*/
const __test = { HeightMap, HeightOracle, MeasuredHeights, QueryType, ChangedRange, computeOrder,
    moveVisually, clearHeightChangeFlag, getHeightChangeFlag: () => heightChangeFlag };

exports.BidiSpan = BidiSpan;
exports.BlockInfo = BlockInfo;
exports.BlockWrapper = BlockWrapper;
exports.Decoration = Decoration;
exports.EditorView = EditorView;
exports.GutterMarker = GutterMarker;
exports.MatchDecorator = MatchDecorator;
exports.RectangleMarker = RectangleMarker;
exports.ViewPlugin = ViewPlugin;
exports.ViewUpdate = ViewUpdate;
exports.WidgetType = WidgetType;
exports.__test = __test;
exports.closeHoverTooltips = closeHoverTooltips;
exports.crosshairCursor = crosshairCursor;
exports.drawSelection = drawSelection;
exports.dropCursor = dropCursor;
exports.getDialog = getDialog;
exports.getDrawSelectionConfig = getDrawSelectionConfig;
exports.getPanel = getPanel;
exports.getTooltip = getTooltip;
exports.gutter = gutter;
exports.gutterLineClass = gutterLineClass;
exports.gutterWidgetClass = gutterWidgetClass;
exports.gutters = gutters;
exports.hasHoverTooltips = hasHoverTooltips;
exports.highlightActiveLine = highlightActiveLine;
exports.highlightActiveLineGutter = highlightActiveLineGutter;
exports.highlightSpecialChars = highlightSpecialChars;
exports.highlightTrailingWhitespace = highlightTrailingWhitespace;
exports.highlightWhitespace = highlightWhitespace;
exports.hoverTooltip = hoverTooltip;
exports.keymap = keymap;
exports.layer = layer;
exports.lineNumberMarkers = lineNumberMarkers;
exports.lineNumberWidgetMarker = lineNumberWidgetMarker;
exports.lineNumbers = lineNumbers;
exports.logException = logException;
exports.panels = panels;
exports.placeholder = placeholder;
exports.rectangularSelection = rectangularSelection;
exports.repositionTooltips = repositionTooltips;
exports.runScopeHandlers = runScopeHandlers;
exports.scrollPastEnd = scrollPastEnd;
exports.showDialog = showDialog;
exports.showPanel = showPanel;
exports.showTooltip = showTooltip;
exports.tooltips = tooltips;
