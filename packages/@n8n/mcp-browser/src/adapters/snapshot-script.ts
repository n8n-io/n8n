/**
 * Self-contained JavaScript that runs inside any browser via `driver.executeScript()`.
 *
 * It walks the DOM, computes accessibility roles and names (following W3C
 * HTML-AAM and AccName specs), assigns `data-n8n-ref="eN"` attributes to
 * interactive elements, and returns a YAML string matching Playwright's
 * `_snapshotForAI()` output format.
 *
 * The script is a single string constant — no runtime imports.
 */

export const SNAPSHOT_SCRIPT = `
return (function() {
  'use strict';

  // -------------------------------------------------------------------------
  // HTML-AAM implicit role mapping (subset covering common elements)
  // https://www.w3.org/TR/html-aam-1.0/#html-element-role-mappings
  // -------------------------------------------------------------------------

  var IMPLICIT_ROLES = {
    A:          function(el) { return el.hasAttribute('href') ? 'link' : null; },
    ARTICLE:    function()   { return 'article'; },
    ASIDE:      function()   { return 'complementary'; },
    BUTTON:     function()   { return 'button'; },
    DATALIST:   function()   { return 'listbox'; },
    DD:         function()   { return 'definition'; },
    DETAILS:    function()   { return 'group'; },
    DIALOG:     function()   { return 'dialog'; },
    DT:         function()   { return 'term'; },
    FIELDSET:   function()   { return 'group'; },
    FIGURE:     function()   { return 'figure'; },
    FOOTER:     function(el) { return isLandmarkContext(el) ? null : 'contentinfo'; },
    FORM:       function(el) { return getAccName(el) ? 'form' : null; },
    H1:         function()   { return 'heading'; },
    H2:         function()   { return 'heading'; },
    H3:         function()   { return 'heading'; },
    H4:         function()   { return 'heading'; },
    H5:         function()   { return 'heading'; },
    H6:         function()   { return 'heading'; },
    HEADER:     function(el) { return isLandmarkContext(el) ? null : 'banner'; },
    HR:         function()   { return 'separator'; },
    IMG:        function(el) { return el.getAttribute('alt') === '' ? 'presentation' : 'img'; },
    INPUT:      function(el) { return inputRole(el); },
    LI:         function()   { return 'listitem'; },
    MAIN:       function()   { return 'main'; },
    MATH:       function()   { return 'math'; },
    MENU:       function()   { return 'list'; },
    NAV:        function()   { return 'navigation'; },
    OL:         function()   { return 'list'; },
    OPTGROUP:   function()   { return 'group'; },
    OPTION:     function()   { return 'option'; },
    OUTPUT:     function()   { return 'status'; },
    P:          function()   { return 'paragraph'; },
    PROGRESS:   function()   { return 'progressbar'; },
    SECTION:    function(el) { return getAccName(el) ? 'region' : null; },
    SELECT:     function(el) { return el.multiple || (el.size && el.size > 1) ? 'listbox' : 'combobox'; },
    SUMMARY:    function()   { return null; },
    TABLE:      function()   { return 'table'; },
    TBODY:      function()   { return 'rowgroup'; },
    TD:         function()   { return 'cell'; },
    TEXTAREA:   function()   { return 'textbox'; },
    TFOOT:      function()   { return 'rowgroup'; },
    TH:         function()   { return 'columnheader'; },
    THEAD:      function()   { return 'rowgroup'; },
    TR:         function()   { return 'row'; },
    UL:         function()   { return 'list'; },
  };

  function inputRole(el) {
    var type = (el.getAttribute('type') || 'text').toLowerCase();
    var map = {
      button: 'button', checkbox: 'checkbox', email: 'textbox',
      image: 'button', number: 'spinbutton', password: 'textbox',
      radio: 'radio', range: 'slider', reset: 'button',
      search: 'searchbox', submit: 'button', tel: 'textbox',
      text: 'textbox', url: 'textbox',
    };
    return map[type] || 'textbox';
  }

  function isLandmarkContext(el) {
    var parent = el.parentElement;
    while (parent) {
      var tag = parent.tagName;
      if (tag === 'ARTICLE' || tag === 'ASIDE' || tag === 'MAIN' ||
          tag === 'NAV' || tag === 'SECTION') return true;
      parent = parent.parentElement;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Accessible name computation (simplified W3C AccName 1.2)
  // -------------------------------------------------------------------------

  function getAccName(el) {
    // 1. aria-labelledby
    var labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      var parts = labelledBy.split(/\\s+/).map(function(id) {
        var ref = document.getElementById(id);
        return ref ? textContent(ref) : '';
      }).filter(Boolean);
      if (parts.length) return parts.join(' ');
    }

    // 2. aria-label
    var ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // 3. Native text alternatives
    var tag = el.tagName;

    // <img alt="...">
    if (tag === 'IMG' || tag === 'AREA') {
      var alt = el.getAttribute('alt');
      if (alt !== null) return alt;
    }

    // <input> with associated <label>
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (el.id) {
        var label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (label) return textContent(label);
      }
      // Wrapping <label>
      var parentLabel = el.closest('label');
      if (parentLabel) {
        var clone = parentLabel.cloneNode(true);
        // Remove the control itself from the clone
        var controls = clone.querySelectorAll('input, textarea, select');
        controls.forEach(function(c) { c.remove(); });
        var t = textContent(clone);
        if (t) return t;
      }
      // placeholder
      if (el.placeholder) return el.placeholder;
    }

    // <button> text content
    if (tag === 'BUTTON') return textContent(el);

    // <a> text content
    if (tag === 'A') return textContent(el);

    // <fieldset> → <legend>
    if (tag === 'FIELDSET') {
      var legend = el.querySelector('legend');
      if (legend) return textContent(legend);
    }

    // <figure> → <figcaption>
    if (tag === 'FIGURE') {
      var caption = el.querySelector('figcaption');
      if (caption) return textContent(caption);
    }

    // <table> → <caption>
    if (tag === 'TABLE') {
      var tableCaption = el.querySelector('caption');
      if (tableCaption) return textContent(tableCaption);
    }

    // title attribute (last resort)
    var title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();

    return '';
  }

  function textContent(el) {
    // Only visible text
    var text = '';
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (isVisible(node.parentElement)) {
        text += node.textContent;
      }
    }
    return text.replace(/\\s+/g, ' ').trim();
  }

  // -------------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------------

  function isVisible(el) {
    if (!el) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity) === 0) return false;
    return true;
  }

  // -------------------------------------------------------------------------
  // Role determination
  // -------------------------------------------------------------------------

  function getRole(el) {
    // Explicit role overrides implicit
    var explicit = el.getAttribute('role');
    if (explicit) return explicit.split(/\\s+/)[0];

    var fn = IMPLICIT_ROLES[el.tagName];
    if (fn) return fn(el);

    return null;
  }

  // -------------------------------------------------------------------------
  // State properties
  // -------------------------------------------------------------------------

  function getStateProps(el, role) {
    var props = [];

    if (role === 'heading') {
      var level = el.getAttribute('aria-level') || el.tagName.match(/H(\\d)/);
      if (level) {
        var n = Array.isArray(level) ? level[1] : level;
        props.push('[level=' + n + ']');
      }
    }

    var checked = el.getAttribute('aria-checked') || (el.checked !== undefined ? String(el.checked) : null);
    if (checked === 'true') props.push('[checked=true]');
    else if (checked === 'mixed') props.push('[checked=mixed]');

    if (el.disabled || el.getAttribute('aria-disabled') === 'true') props.push('[disabled]');
    if (el.getAttribute('aria-expanded') === 'true') props.push('[expanded=true]');
    else if (el.getAttribute('aria-expanded') === 'false') props.push('[expanded=false]');
    if (el.getAttribute('aria-pressed') === 'true') props.push('[pressed=true]');
    if (el.getAttribute('aria-selected') === 'true') props.push('[selected=true]');
    if (el.getAttribute('aria-required') === 'true') props.push('[required]');
    if (el.getAttribute('aria-readonly') === 'true') props.push('[readonly]');

    // Value for inputs
    if (role === 'textbox' || role === 'searchbox' || role === 'spinbutton') {
      var val = el.value;
      if (val !== undefined && val !== '') props.push('[value="' + val.replace(/"/g, '\\\\"') + '"]');
    }

    return props.join(' ');
  }

  // -------------------------------------------------------------------------
  // Interactive element detection (for ref assignment)
  // -------------------------------------------------------------------------

  var INTERACTIVE_ROLES = new Set([
    'button', 'checkbox', 'combobox', 'link', 'listbox', 'menuitem',
    'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'searchbox',
    'slider', 'spinbutton', 'switch', 'tab', 'textbox', 'treeitem',
  ]);

  function isInteractive(el, role) {
    if (role && INTERACTIVE_ROLES.has(role)) return true;
    if (el.tabIndex >= 0 && el.tagName !== 'BODY') return true;
    if (el.tagName === 'A' && el.hasAttribute('href')) return true;
    if (el.getAttribute('contenteditable') === 'true') return true;
    return false;
  }

  // -------------------------------------------------------------------------
  // Tree walk and YAML serialization
  // -------------------------------------------------------------------------

  var refCounter = 0;

  function walk(el, indent) {
    if (!isVisible(el)) return '';

    var role = getRole(el);
    var name = getAccName(el);
    var stateStr = role ? getStateProps(el, role) : '';
    var refStr = '';

    if (isInteractive(el, role)) {
      refCounter++;
      var refId = 'e' + refCounter;
      el.setAttribute('data-n8n-ref', refId);
      refStr = ' [ref=' + refId + ']';
    }

    var lines = '';
    var prefix = repeat('  ', indent) + '- ';

    // Only emit a line if the element has a role
    if (role) {
      var line = prefix + role;
      if (name) line += ' "' + name.replace(/"/g, '\\\\"') + '"';
      if (stateStr) line += ' ' + stateStr;
      line += refStr;
      lines += line + '\\n';

      // Walk children at deeper indent
      var child = el.firstElementChild;
      while (child) {
        lines += walk(child, indent + 1);
        child = child.nextElementSibling;
      }
    } else {
      // No role — walk children at same indent (transparent wrapper)
      var child2 = el.firstElementChild;
      while (child2) {
        lines += walk(child2, indent);
        child2 = child2.nextElementSibling;
      }

      // If this is a text-only leaf with a ref, emit it as generic text
      if (refStr && !el.firstElementChild) {
        var t = textContent(el);
        if (t) {
          lines += prefix + 'text "' + t.replace(/"/g, '\\\\"') + '"' + refStr + '\\n';
        }
      }
    }

    return lines;
  }

  function repeat(str, n) {
    var result = '';
    for (var i = 0; i < n; i++) result += str;
    return result;
  }

  // -------------------------------------------------------------------------
  // Entry point
  // -------------------------------------------------------------------------

  // Clear previous refs
  var oldRefs = document.querySelectorAll('[data-n8n-ref]');
  for (var i = 0; i < oldRefs.length; i++) {
    oldRefs[i].removeAttribute('data-n8n-ref');
  }

  refCounter = 0;
  var yaml = walk(document.body, 0);

  return JSON.stringify({
    yaml: yaml || '(empty page)',
    refCount: refCounter
  });
})();
`;

/**
 * Parse the JSON result returned by the snapshot script.
 */
export interface SnapshotScriptResult {
	yaml: string;
	refCount: number;
}

export function parseSnapshotResult(raw: unknown): SnapshotScriptResult {
	if (typeof raw === 'string') {
		return JSON.parse(raw) as SnapshotScriptResult;
	}
	// If the driver already parsed the JSON for us
	return raw as SnapshotScriptResult;
}
