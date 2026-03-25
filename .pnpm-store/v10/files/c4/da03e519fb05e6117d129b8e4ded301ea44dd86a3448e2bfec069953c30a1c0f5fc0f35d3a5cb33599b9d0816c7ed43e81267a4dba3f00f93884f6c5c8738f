"use strict";
var Node = require('./Node');
var Element = require('./Element');
var CSSStyleDeclaration = require('./CSSStyleDeclaration');
var utils = require('./utils');
var URLUtils = require('./URLUtils');
var defineElement = require('./defineElement');

var htmlElements = exports.elements = {};
var htmlNameToImpl = Object.create(null);

exports.createElement = function(doc, localName, prefix) {
  var impl = htmlNameToImpl[localName] || HTMLUnknownElement;
  return new impl(doc, localName, prefix);
};

function define(spec) {
  return defineElement(spec, HTMLElement, htmlElements, htmlNameToImpl);
}

function URL(attr) {
  return {
    get: function() {
      var v = this._getattr(attr);
      if (v === null) { return ''; }
      var url = this.doc._resolve(v);
      return (url === null) ? v : url;
    },
    set: function(value) {
      this._setattr(attr, value);
    }
  };
}

function CORS(attr) {
  return {
    get: function() {
      var v = this._getattr(attr);
      if (v === null) { return null; }
      if (v.toLowerCase() === 'use-credentials') { return 'use-credentials'; }
      return 'anonymous';
    },
    set: function(value) {
      if (value===null || value===undefined) {
        this.removeAttribute(attr);
      } else {
        this._setattr(attr, value);
      }
    }
  };
}

const REFERRER = {
  type: ["", "no-referrer", "no-referrer-when-downgrade", "same-origin", "origin", "strict-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin", "unsafe-url"],
  missing: '',
};


// XXX: the default value for tabIndex should be 0 if the element is
// focusable and -1 if it is not.  But the full definition of focusable
// is actually hard to compute, so for now, I'll follow Firefox and
// just base the default value on the type of the element.
var focusableElements = {
  "A":true, "LINK":true, "BUTTON":true, "INPUT":true,
  "SELECT":true, "TEXTAREA":true, "COMMAND":true
};

var HTMLFormElement = function(doc, localName, prefix) {
  HTMLElement.call(this, doc, localName, prefix);
  this._form = null; // Prevent later deoptimization
};

var HTMLElement = exports.HTMLElement = define({
  superclass: Element,
  name: 'HTMLElement',
  ctor: function HTMLElement(doc, localName, prefix) {
    Element.call(this, doc, localName, utils.NAMESPACE.HTML, prefix);
  },
  props: {
    dangerouslySetInnerHTML: {
      set: function (v) {
        this._innerHTML = v;
      },
    },
    innerHTML: {
      get: function() {
        return this.serialize();
      },
      set: function(v) {
        var parser = this.ownerDocument.implementation.mozHTMLParser(
          this.ownerDocument._address,
          this);
        parser.parse(v===null ? '' : String(v), true);

        // Remove any existing children of this node
        var target = (this instanceof htmlNameToImpl.template) ?
            this.content : this;
        while(target.hasChildNodes())
          target.removeChild(target.firstChild);

        // Now copy newly parsed children to this node
        target.appendChild(parser._asDocumentFragment());
      }
    },
    style: { get: function() {
      if (!this._style)
        this._style = new CSSStyleDeclaration(this);
      return this._style;
    }, set: function(v) {
        if (v===null||v===undefined) { v = ''; }
        this._setattr('style', String(v));
    }},

    // These can't really be implemented server-side in a reasonable way.
    blur: { value: function() {}},
    focus: { value: function() {}},
    forceSpellCheck: { value: function() {}},

    click: { value: function() {
      if (this._click_in_progress) return;
      this._click_in_progress = true;
      try {
        if (this._pre_click_activation_steps)
          this._pre_click_activation_steps();

        var event = this.ownerDocument.createEvent("MouseEvent");
        event.initMouseEvent("click", true, true,
          this.ownerDocument.defaultView, 1,
          0, 0, 0, 0,
          // These 4 should be initialized with
          // the actually current keyboard state
          // somehow...
          false, false, false, false,
          0, null
        );

        // Dispatch this as an untrusted event since it is synthetic
        var success = this.dispatchEvent(event);

        if (success) {
          if (this._post_click_activation_steps)
            this._post_click_activation_steps(event);
        }
        else {
          if (this._cancelled_activation_steps)
            this._cancelled_activation_steps();
        }
      }
      finally {
        this._click_in_progress = false;
      }
    }},
    submit: { value: utils.nyi },
  },
  attributes: {
    title: String,
    lang: String,
    dir: {type: ["ltr", "rtl", "auto"], missing: ''},
    draggable: {type: ["true", "false"], treatNullAsEmptyString: true },
    spellcheck: {type: ["true", "false"], missing: ''},
    enterKeyHint: {type: ["enter", "done", "go", "next", "previous", "search", "send"], missing: ''},
    autoCapitalize: {type: ["off", "on", "none", "sentences", "words", "characters"], missing: '' },
    autoFocus: Boolean,
    accessKey: String,
    nonce: String,
    hidden: Boolean,
    translate: {type: ["no", "yes"], missing: '' },
    tabIndex: {type: "long", default: function() {
      if (this.tagName in focusableElements ||
        this.contentEditable)
        return 0;
      else
        return -1;
    }}
  },
  events: [
    "abort", "canplay", "canplaythrough", "change", "click", "contextmenu",
    "cuechange", "dblclick", "drag", "dragend", "dragenter", "dragleave",
    "dragover", "dragstart", "drop", "durationchange", "emptied", "ended",
    "input", "invalid", "keydown", "keypress", "keyup", "loadeddata",
    "loadedmetadata", "loadstart", "mousedown", "mousemove", "mouseout",
    "mouseover", "mouseup", "mousewheel", "pause", "play", "playing",
    "progress", "ratechange", "readystatechange", "reset", "seeked",
    "seeking", "select", "show", "stalled", "submit", "suspend",
    "timeupdate", "volumechange", "waiting",

    // These last 5 event types will be overriden by HTMLBodyElement
    "blur", "error", "focus", "load", "scroll"
  ]
});


// XXX: reflect contextmenu as contextMenu, with element type


// style: the spec doesn't call this a reflected attribute.
//   may want to handle it manually.

// contentEditable: enumerated, not clear if it is actually
// reflected or requires custom getter/setter. Not listed as
// "limited to known values".  Raises syntax_err on bad setting,
// so I think this is custom.

// contextmenu: content is element id, idl type is an element
// draggable: boolean, but not a reflected attribute
// dropzone: reflected SettableTokenList, experimental, so don't
//   implement it right away.

// data-* attributes: need special handling in setAttribute?
// Or maybe that isn't necessary. Can I just scan the attribute list
// when building the dataset?  Liveness and caching issues?

// microdata attributes: many are simple reflected attributes, but
// I'm not going to implement this now.


var HTMLUnknownElement = define({
  name: 'HTMLUnknownElement',
  ctor: function HTMLUnknownElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  }
});


var formAssociatedProps = {
  // See http://www.w3.org/TR/html5/association-of-controls-and-forms.html#form-owner
  form: { get: function() {
    return this._form;
  }}
};

define({
  tag: 'a',
  name: 'HTMLAnchorElement',
  ctor: function HTMLAnchorElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    _post_click_activation_steps: { value: function(e) {
      if (this.href) {
        // Follow the link
        // XXX: this is just a quick hack
        // XXX: the HTML spec probably requires more than this
        this.ownerDocument.defaultView.location = this.href;
      }
    }},
  },
  attributes: {
    href: URL,
    ping: String,
    download: String,
    target: String,
    rel: String,
    media: String,
    hreflang: String,
    type: String,
    referrerPolicy: REFERRER,
    // Obsolete
    coords: String,
    charset: String,
    name: String,
    rev: String,
    shape: String,
  }
});
// Latest WhatWG spec says these methods come via HTMLHyperlinkElementUtils
URLUtils._inherit(htmlNameToImpl.a.prototype);

define({
  tag: 'area',
  name: 'HTMLAreaElement',
  ctor: function HTMLAreaElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    alt: String,
    target: String,
    download: String,
    rel: String,
    media: String,
    href: URL,
    hreflang: String,
    type: String,
    shape: String,
    coords: String,
    ping: String,
    // XXX: also reflect relList
    referrerPolicy: REFERRER,
    // Obsolete
    noHref: Boolean,
  }
});
// Latest WhatWG spec says these methods come via HTMLHyperlinkElementUtils
URLUtils._inherit(htmlNameToImpl.area.prototype);

define({
  tag: 'br',
  name: 'HTMLBRElement',
  ctor: function HTMLBRElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // Obsolete
    clear: String
  },
});

define({
  tag: 'base',
  name: 'HTMLBaseElement',
  ctor: function HTMLBaseElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    "target": String
  }
});


define({
  tag: 'body',
  name: 'HTMLBodyElement',
  ctor: function HTMLBodyElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  // Certain event handler attributes on a <body> tag actually set
  // handlers for the window rather than just that element.  Define
  // getters and setters for those here.  Note that some of these override
  // properties on HTMLElement.prototype.
  // XXX: If I add support for <frameset>, these have to go there, too
  // XXX
  // When the Window object is implemented, these attribute will have
  // to work with the same-named attributes on the Window.
  events: [
    "afterprint", "beforeprint", "beforeunload", "blur", "error",
    "focus","hashchange", "load", "message", "offline", "online",
    "pagehide", "pageshow","popstate","resize","scroll","storage","unload",
  ],
  attributes: {
    // Obsolete
    text: { type: String, treatNullAsEmptyString: true },
    link: { type: String, treatNullAsEmptyString: true },
    vLink: { type: String, treatNullAsEmptyString: true },
    aLink: { type: String, treatNullAsEmptyString: true },
    bgColor: { type: String, treatNullAsEmptyString: true },
    background: String,
  }
});

define({
  tag: 'button',
  name: 'HTMLButtonElement',
  ctor: function HTMLButtonElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: formAssociatedProps,
  attributes: {
    name: String,
    value: String,
    disabled: Boolean,
    autofocus: Boolean,
    type: { type:["submit", "reset", "button", "menu"], missing: 'submit' },
    formTarget: String,
    formAction: URL,
    formNoValidate: Boolean,
    formMethod: { type: ["get", "post", "dialog"], invalid: 'get', missing: '' },
    formEnctype: { type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"], invalid: "application/x-www-form-urlencoded", missing: '' },
  }
});

define({
  tag: 'dl',
  name: 'HTMLDListElement',
  ctor: function HTMLDListElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // Obsolete
    compact: Boolean,
  }
});

define({
  tag: 'data',
  name: 'HTMLDataElement',
  ctor: function HTMLDataElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    value: String,
  }
});

define({
  tag: 'datalist',
  name: 'HTMLDataListElement',
  ctor: function HTMLDataListElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  }
});

define({
  tag: 'details',
  name: 'HTMLDetailsElement',
  ctor: function HTMLDetailsElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    "open": Boolean
  }
});

define({
  tag: 'div',
  name: 'HTMLDivElement',
  ctor: function HTMLDivElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // Obsolete
    align: String
  }
});

define({
  tag: 'embed',
  name: 'HTMLEmbedElement',
  ctor: function HTMLEmbedElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    src: URL,
    type: String,
    width: String,
    height: String,
    // Obsolete
    align: String,
    name: String,
  }
});

define({
  tag: 'fieldset',
  name: 'HTMLFieldSetElement',
  ctor: function HTMLFieldSetElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: formAssociatedProps,
  attributes: {
    disabled: Boolean,
    name: String
  }
});

define({
  tag: 'form',
  name: 'HTMLFormElement',
  ctor: function HTMLFormElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    action: String,
    autocomplete: {type:['on', 'off'], missing: 'on'},
    name: String,
    acceptCharset: {name: "accept-charset"},
    target: String,
    noValidate: Boolean,
    method: { type: ["get", "post", "dialog"], invalid: 'get', missing: 'get' },
    // Both enctype and encoding reflect the enctype content attribute
    enctype: { type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"], invalid: "application/x-www-form-urlencoded", missing: "application/x-www-form-urlencoded" },
    encoding: {name: 'enctype', type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"], invalid: "application/x-www-form-urlencoded", missing: "application/x-www-form-urlencoded" },
  }
});

define({
  tag: 'hr',
  name: 'HTMLHRElement',
  ctor: function HTMLHRElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // Obsolete
    align: String,
    color: String,
    noShade: Boolean,
    size: String,
    width: String,
  },
});

define({
  tag: 'head',
  name: 'HTMLHeadElement',
  ctor: function HTMLHeadElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  }
});

define({
  tags: ['h1','h2','h3','h4','h5','h6'],
  name: 'HTMLHeadingElement',
  ctor: function HTMLHeadingElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // Obsolete
    align: String,
  },
});

define({
  tag: 'html',
  name: 'HTMLHtmlElement',
  ctor: function HTMLHtmlElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    xmlns: URL,
    // Obsolete
    version: String
  }
});

define({
  tag: 'iframe',
  name: 'HTMLIFrameElement',
  ctor: function HTMLIFrameElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    src: URL,
    srcdoc: String,
    name: String,
    width: String,
    height: String,
    // XXX: sandbox is a reflected settable token list
    seamless: Boolean,
    allow: Boolean,
    allowFullscreen: Boolean,
    allowUserMedia: Boolean,
    allowPaymentRequest: Boolean,
    referrerPolicy: REFERRER,
    loading: { type:['eager','lazy'], treatNullAsEmptyString: true },
    // Obsolete
    align: String,
    scrolling: String,
    frameBorder: String,
    longDesc: URL,
    marginHeight: { type: String, treatNullAsEmptyString: true },
    marginWidth: { type: String, treatNullAsEmptyString: true },
  }
});

define({
  tag: 'img',
  name: 'HTMLImageElement',
  ctor: function HTMLImageElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    alt: String,
    src: URL,
    srcset: String,
    crossOrigin: CORS,
    useMap: String,
    isMap: Boolean,
    sizes: String,
    height: { type: "unsigned long", default: 0 },
    width: { type: "unsigned long", default: 0 },
    referrerPolicy: REFERRER,
    loading: { type:['eager','lazy'], missing: '' },
    // Obsolete:
    name: String,
    lowsrc: URL,
    align: String,
    hspace: { type: "unsigned long", default: 0 },
    vspace: { type: "unsigned long", default: 0 },
    longDesc: URL,
    border: { type: String, treatNullAsEmptyString: true },
  }
});

define({
  tag: 'input',
  name: 'HTMLInputElement',
  ctor: function HTMLInputElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: {
    form: formAssociatedProps.form,
    _post_click_activation_steps: { value: function(e) {
      if (this.type === 'checkbox') {
        this.checked = !this.checked;
      }
      else if (this.type === 'radio') {
        var group = this.form.getElementsByName(this.name);
        for (var i=group.length-1; i >= 0; i--) {
          var el = group[i];
          el.checked = (el === this);
        }
      }
    }},
  },
  attributes: {
    name: String,
    disabled: Boolean,
    autofocus: Boolean,
    accept: String,
    alt: String,
    max: String,
    min: String,
    pattern: String,
    placeholder: String,
    step: String,
    dirName: String,
    defaultValue: {name: 'value'},
    multiple: Boolean,
    required: Boolean,
    readOnly: Boolean,
    checked: Boolean,
    value: String,
    src: URL,
    defaultChecked: {name: 'checked', type: Boolean},
    size: {type: 'unsigned long', default: 20, min: 1, setmin: 1},
    width: {type: 'unsigned long', min: 0, setmin: 0, default: 0},
    height: {type: 'unsigned long', min: 0, setmin: 0, default: 0},
    minLength: {type: 'unsigned long', min: 0, setmin: 0, default: -1},
    maxLength: {type: 'unsigned long', min: 0, setmin: 0, default: -1},
    autocomplete: String, // It's complicated
    type: { type:
            ["text", "hidden", "search", "tel", "url", "email", "password",
             "datetime", "date", "month", "week", "time", "datetime-local",
             "number", "range", "color", "checkbox", "radio", "file", "submit",
             "image", "reset", "button"],
            missing: 'text' },
    formTarget: String,
    formNoValidate: Boolean,
    formMethod: { type: ["get", "post"], invalid: 'get', missing: '' },
    formEnctype: { type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"], invalid: "application/x-www-form-urlencoded", missing: '' },
    inputMode: { type: [ "verbatim", "latin", "latin-name", "latin-prose", "full-width-latin", "kana", "kana-name", "katakana", "numeric", "tel", "email", "url" ], missing: '' },
    // Obsolete
    align: String,
    useMap: String,
  }
});

define({
  tag: 'keygen',
  name: 'HTMLKeygenElement',
  ctor: function HTMLKeygenElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: formAssociatedProps,
  attributes: {
    name: String,
    disabled: Boolean,
    autofocus: Boolean,
    challenge: String,
    keytype: { type:["rsa"], missing: '' },
  }
});

define({
  tag: 'li',
  name: 'HTMLLIElement',
  ctor: function HTMLLIElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    value: {type: "long", default: 0},
    // Obsolete
    type: String,
  }
});

define({
  tag: 'label',
  name: 'HTMLLabelElement',
  ctor: function HTMLLabelElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: formAssociatedProps,
  attributes: {
    htmlFor: {name: 'for', type: String}
  }
});

define({
  tag: 'legend',
  name: 'HTMLLegendElement',
  ctor: function HTMLLegendElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // Obsolete
    align: String
  },
});

define({
  tag: 'link',
  name: 'HTMLLinkElement',
  ctor: function HTMLLinkElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // XXX Reflect DOMSettableTokenList sizes also DOMTokenList relList
    href: URL,
    rel: String,
    media: String,
    hreflang: String,
    type: String,
    crossOrigin: CORS,
    nonce: String,
    integrity: String,
    referrerPolicy: REFERRER,
    imageSizes: String,
    imageSrcset: String,
    // Obsolete
    charset: String,
    rev: String,
    target: String,
  }
});

define({
  tag: 'map',
  name: 'HTMLMapElement',
  ctor: function HTMLMapElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    name: String
  }
});

define({
  tag: 'menu',
  name: 'HTMLMenuElement',
  ctor: function HTMLMenuElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // XXX: not quite right, default should be popup if parent element is
    // popup.
    type: { type: [ 'context', 'popup', 'toolbar' ], missing: 'toolbar' },
    label: String,
    // Obsolete
    compact: Boolean,
  }
});

define({
  tag: 'meta',
  name: 'HTMLMetaElement',
  ctor: function HTMLMetaElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    name: String,
    content: String,
    httpEquiv: {name: 'http-equiv', type: String},
    // Obsolete
    scheme: String,
  }
});

define({
  tag: 'meter',
  name: 'HTMLMeterElement',
  ctor: function HTMLMeterElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: formAssociatedProps
});

define({
  tags: ['ins', 'del'],
  name: 'HTMLModElement',
  ctor: function HTMLModElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    cite: URL,
    dateTime: String
  }
});

define({
  tag: 'ol',
  name: 'HTMLOListElement',
  ctor: function HTMLOListElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    // Utility function (see the start attribute default value). Returns
    // the number of <li> children of this element
    _numitems: { get: function() {
      var items = 0;
      this.childNodes.forEach(function(n) {
        if (n.nodeType === Node.ELEMENT_NODE && n.tagName === "LI")
          items++;
      });
      return items;
    }}
  },
  attributes: {
    type: String,
    reversed: Boolean,
    start: {
      type: "long",
      default: function() {
       // The default value of the start attribute is 1 unless the list is
       // reversed. Then it is the # of li children
       if (this.reversed)
         return this._numitems;
       else
         return 1;
      }
    },
    // Obsolete
    compact: Boolean,
  }
});

define({
  tag: 'object',
  name: 'HTMLObjectElement',
  ctor: function HTMLObjectElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: formAssociatedProps,
  attributes: {
    data: URL,
    type: String,
    name: String,
    useMap: String,
    typeMustMatch: Boolean,
    width: String,
    height: String,
    // Obsolete
    align: String,
    archive: String,
    code: String,
    declare: Boolean,
    hspace: { type: "unsigned long", default: 0 },
    standby: String,
    vspace: { type: "unsigned long", default: 0 },
    codeBase: URL,
    codeType: String,
    border: { type: String, treatNullAsEmptyString: true },
  }
});

define({
  tag: 'optgroup',
  name: 'HTMLOptGroupElement',
  ctor: function HTMLOptGroupElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    disabled: Boolean,
    label: String
  }
});

define({
  tag: 'option',
  name: 'HTMLOptionElement',
  ctor: function HTMLOptionElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    form: { get: function() {
      var p = this.parentNode;
      while (p && p.nodeType === Node.ELEMENT_NODE) {
        if (p.localName === 'select') return p.form;
        p = p.parentNode;
      }
    }},
    value: {
      get: function() { return this._getattr('value') || this.text; },
      set: function(v) { this._setattr('value', v); },
    },
    text: {
      get: function() {
        // Strip and collapse whitespace
        return this.textContent.replace(/[ \t\n\f\r]+/g, ' ').trim();
      },
      set: function(v) { this.textContent = v; },
    },
    // missing: index
  },
  attributes: {
    disabled: Boolean,
    defaultSelected: {name: 'selected', type: Boolean},
    label: String,
  }
});

define({
  tag: 'output',
  name: 'HTMLOutputElement',
  ctor: function HTMLOutputElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: formAssociatedProps,
  attributes: {
    // XXX Reflect for/htmlFor as a settable token list
    name: String
  }
});

define({
  tag: 'p',
  name: 'HTMLParagraphElement',
  ctor: function HTMLParagraphElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // Obsolete
    align: String
  }
});

define({
  tag: 'param',
  name: 'HTMLParamElement',
  ctor: function HTMLParamElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    name: String,
    value: String,
    // Obsolete
    type: String,
    valueType: String,
  }
});

define({
  tags: ['pre',/*legacy elements:*/'listing','xmp'],
  name: 'HTMLPreElement',
  ctor: function HTMLPreElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // Obsolete
    width: { type: "long", default: 0 },
  }
});

define({
  tag: 'progress',
  name: 'HTMLProgressElement',
  ctor: function HTMLProgressElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: formAssociatedProps,
  attributes: {
    max: {type: Number, float: true, default: 1.0, min: 0}
  }
});

define({
  tags: ['q', 'blockquote'],
  name: 'HTMLQuoteElement',
  ctor: function HTMLQuoteElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    cite: URL
  }
});

define({
  tag: 'script',
  name: 'HTMLScriptElement',
  ctor: function HTMLScriptElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    text: {
      get: function() {
        var s = "";
        for(var i = 0, n = this.childNodes.length; i < n; i++) {
          var child = this.childNodes[i];
          if (child.nodeType === Node.TEXT_NODE)
            s += child._data;
        }
        return s;
      },
      set: function(value) {
        this.removeChildren();
        if (value !== null && value !== "") {
          this.appendChild(this.ownerDocument.createTextNode(value));
        }
      }
    }
  },
  attributes: {
    src: URL,
    type: String,
    charset: String,
    referrerPolicy: REFERRER,
    defer: Boolean,
    async: Boolean,
    nomodule: Boolean,
    crossOrigin: CORS,
    nonce: String,
    integrity: String,
  }
});

define({
  tag: 'select',
  name: 'HTMLSelectElement',
  ctor: function HTMLSelectElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: {
    form: formAssociatedProps.form,
    options: { get: function() {
      return this.getElementsByTagName('option');
    }}
  },
  attributes: {
    autocomplete: String, // It's complicated
    name: String,
    disabled: Boolean,
    autofocus: Boolean,
    multiple: Boolean,
    required: Boolean,
    size: {type: "unsigned long", default: 0}
  }
});

define({
  tag: 'span',
  name: 'HTMLSpanElement',
  ctor: function HTMLSpanElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  }
});

define({
  tag: 'style',
  name: 'HTMLStyleElement',
  ctor: function HTMLStyleElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    media: String,
    type: String,
    scoped: Boolean
  }
});

define({
  tag: 'caption',
  name: 'HTMLTableCaptionElement',
  ctor: function HTMLTableCaptionElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    // Obsolete
    align: String,
  }
});


define({
  name: 'HTMLTableCellElement',
  ctor: function HTMLTableCellElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    colSpan: {type: "unsigned long", default: 1},
    rowSpan: {type: "unsigned long", default: 1},
    //XXX Also reflect settable token list headers
    scope: { type: ['row','col','rowgroup','colgroup'], missing: '' },
    abbr: String,
    // Obsolete
    align: String,
    axis: String,
    height: String,
    width: String,
    ch: { name: 'char', type: String },
    chOff: { name: 'charoff', type: String },
    noWrap: Boolean,
    vAlign: String,
    bgColor: { type: String, treatNullAsEmptyString: true },
  }
});

define({
  tags: ['col', 'colgroup'],
  name: 'HTMLTableColElement',
  ctor: function HTMLTableColElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    span: {type: 'limited unsigned long with fallback', default: 1, min: 1},
    // Obsolete
    align: String,
    ch: { name: 'char', type: String },
    chOff: { name: 'charoff', type: String },
    vAlign: String,
    width: String,
  }
});

define({
  tag: 'table',
  name: 'HTMLTableElement',
  ctor: function HTMLTableElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    rows: { get: function() {
      return this.getElementsByTagName('tr');
    }}
  },
  attributes: {
    // Obsolete
    align: String,
    border: String,
    frame: String,
    rules: String,
    summary: String,
    width: String,
    bgColor: { type: String, treatNullAsEmptyString: true },
    cellPadding: { type: String, treatNullAsEmptyString: true },
    cellSpacing: { type: String, treatNullAsEmptyString: true },
  }
});

define({
  tag: 'template',
  name: 'HTMLTemplateElement',
  ctor: function HTMLTemplateElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
    this._contentFragment = doc._templateDoc.createDocumentFragment();
  },
  props: {
    content: { get: function() { return this._contentFragment; } },
    serialize: { value: function() { return this.content.serialize(); } }
  }
});

define({
  tag: 'tr',
  name: 'HTMLTableRowElement',
  ctor: function HTMLTableRowElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    cells: { get: function() {
      return this.querySelectorAll('td,th');
    }}
  },
  attributes: {
    // Obsolete
    align: String,
    ch: { name: 'char', type: String },
    chOff: { name: 'charoff', type: String },
    vAlign: String,
    bgColor: { type: String, treatNullAsEmptyString: true },
  },
});

define({
  tags: ['thead', 'tfoot', 'tbody'],
  name: 'HTMLTableSectionElement',
  ctor: function HTMLTableSectionElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    rows: { get: function() {
      return this.getElementsByTagName('tr');
    }}
  },
  attributes: {
    // Obsolete
    align: String,
    ch: { name: 'char', type: String },
    chOff: { name: 'charoff', type: String },
    vAlign: String,
  }
});

define({
  tag: 'textarea',
  name: 'HTMLTextAreaElement',
  ctor: function HTMLTextAreaElement(doc, localName, prefix) {
    HTMLFormElement.call(this, doc, localName, prefix);
  },
  props: {
    form: formAssociatedProps.form,
    type: { get: function() { return 'textarea'; } },
    defaultValue: {
      get: function() { return this.textContent; },
      set: function(v) { this.textContent = v; },
    },
    value: {
      get: function() { return this.defaultValue; /* never dirty */ },
      set: function(v) {
        // This isn't completely correct: according to the spec, this
        // should "dirty" the API value, and result in
        // `this.value !== this.defaultValue`.  But for most of what
        // folks want to do, this implementation should be fine:
        this.defaultValue = v;
      },
    },
    textLength: { get: function() { return this.value.length; } },
  },
  attributes: {
    autocomplete: String, // It's complicated
    name: String,
    disabled: Boolean,
    autofocus: Boolean,
    placeholder: String,
    wrap: String,
    dirName: String,
    required: Boolean,
    readOnly: Boolean,
    rows: {type: 'limited unsigned long with fallback', default: 2 },
    cols: {type: 'limited unsigned long with fallback', default: 20 },
    maxLength: {type: 'unsigned long', min: 0, setmin: 0, default: -1},
    minLength: {type: 'unsigned long', min: 0, setmin: 0, default: -1},
    inputMode: { type: [ "verbatim", "latin", "latin-name", "latin-prose", "full-width-latin", "kana", "kana-name", "katakana", "numeric", "tel", "email", "url" ], missing: '' },
  }
});

define({
  tag: 'time',
  name: 'HTMLTimeElement',
  ctor: function HTMLTimeElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    dateTime: String,
    pubDate: Boolean
  }
});

define({
  tag: 'title',
  name: 'HTMLTitleElement',
  ctor: function HTMLTitleElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    text: { get: function() {
      return this.textContent;
    }}
  }
});

define({
  tag: 'ul',
  name: 'HTMLUListElement',
  ctor: function HTMLUListElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    type: String,
    // Obsolete
    compact: Boolean,
  }
});

define({
  name: 'HTMLMediaElement',
  ctor: function HTMLMediaElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    src: URL,
    crossOrigin: CORS,
    preload: { type:["metadata", "none", "auto", {value: "", alias: "auto"}], missing: 'auto' },
    loop: Boolean,
    autoplay: Boolean,
    mediaGroup: String,
    controls: Boolean,
    defaultMuted: {name: "muted", type: Boolean}
  }
});

define({
  name: 'HTMLAudioElement',
  tag: 'audio',
  superclass: htmlElements.HTMLMediaElement,
  ctor: function HTMLAudioElement(doc, localName, prefix) {
    htmlElements.HTMLMediaElement.call(this, doc, localName, prefix);
  }
});

define({
  name: 'HTMLVideoElement',
  tag: 'video',
  superclass: htmlElements.HTMLMediaElement,
  ctor: function HTMLVideoElement(doc, localName, prefix) {
    htmlElements.HTMLMediaElement.call(this, doc, localName, prefix);
  },
  attributes: {
    poster: URL,
    width: {type: "unsigned long", min: 0, default: 0 },
    height: {type: "unsigned long", min: 0, default: 0 }
  }
});

define({
  tag: 'td',
  name: 'HTMLTableDataCellElement',
  superclass: htmlElements.HTMLTableCellElement,
  ctor: function HTMLTableDataCellElement(doc, localName, prefix) {
    htmlElements.HTMLTableCellElement.call(this, doc, localName, prefix);
  }
});

define({
  tag: 'th',
  name: 'HTMLTableHeaderCellElement',
  superclass: htmlElements.HTMLTableCellElement,
  ctor: function HTMLTableHeaderCellElement(doc, localName, prefix) {
    htmlElements.HTMLTableCellElement.call(this, doc, localName, prefix);
  },
});

define({
  tag: 'frameset',
  name: 'HTMLFrameSetElement',
  ctor: function HTMLFrameSetElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  }
});

define({
  tag: 'frame',
  name: 'HTMLFrameElement',
  ctor: function HTMLFrameElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  }
});

define({
  tag: 'canvas',
  name: 'HTMLCanvasElement',
  ctor: function HTMLCanvasElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    getContext: { value: utils.nyi },
    probablySupportsContext: { value: utils.nyi },
    setContext: { value: utils.nyi },
    transferControlToProxy: { value: utils.nyi },
    toDataURL: { value: utils.nyi },
    toBlob: { value: utils.nyi }
  },
  attributes: {
    width: { type: "unsigned long", default: 300},
    height: { type: "unsigned long", default: 150}
  }
});

define({
  tag: 'dialog',
  name: 'HTMLDialogElement',
  ctor: function HTMLDialogElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    show: { value: utils.nyi },
    showModal: { value: utils.nyi },
    close: { value: utils.nyi }
  },
  attributes: {
    open: Boolean,
    returnValue: String
  }
});

define({
  tag: 'menuitem',
  name: 'HTMLMenuItemElement',
  ctor: function HTMLMenuItemElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  props: {
    // The menuitem's label
    _label: {
      get: function() {
        var val = this._getattr('label');
        if (val !== null && val !== '') { return val; }
        val = this.textContent;
        // Strip and collapse whitespace
        return val.replace(/[ \t\n\f\r]+/g, ' ').trim();
      }
    },
    // The menuitem label IDL attribute
    label: {
      get: function() {
        var val = this._getattr('label');
        if (val !== null) { return val; }
        return this._label;
      },
      set: function(v) {
        this._setattr('label', v);
      },
    }
  },
  attributes: {
    type: { type: ["command","checkbox","radio"], missing: 'command' },
    icon: URL,
    disabled: Boolean,
    checked: Boolean,
    radiogroup: String,
    default: Boolean
  }
});

define({
  tag: 'source',
  name: 'HTMLSourceElement',
  ctor: function HTMLSourceElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    srcset: String,
    sizes: String,
    media: String,
    src: URL,
    type: String,
    width: String,
    height: String,
  }
});

define({
  tag: 'track',
  name: 'HTMLTrackElement',
  ctor: function HTMLTrackElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    src: URL,
    srclang: String,
    label: String,
    default: Boolean,
    kind: { type: ["subtitles", "captions", "descriptions", "chapters", "metadata"], missing: 'subtitles', invalid: 'metadata' },
  },
  props: {
    NONE: { get: function() { return 0; } },
    LOADING: { get: function() { return 1; } },
    LOADED: { get: function() { return 2; } },
    ERROR: { get: function() { return 3; } },
    readyState: { get: utils.nyi },
    track: { get: utils.nyi }
  }
});

define({
  // obsolete
  tag: 'font',
  name: 'HTMLFontElement',
  ctor: function HTMLFontElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    color: { type: String, treatNullAsEmptyString: true },
    face: { type: String },
    size: { type: String },
  },
});

define({
  // obsolete
  tag: 'dir',
  name: 'HTMLDirectoryElement',
  ctor: function HTMLDirectoryElement(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
  },
  attributes: {
    compact: Boolean,
  },
});

define({
  tags: [
    "abbr", "address", "article", "aside", "b", "bdi", "bdo", "cite", "content", "code",
    "dd", "dfn", "dt", "em", "figcaption", "figure", "footer", "header", "hgroup", "i", "kbd",
    "main", "mark", "nav", "noscript", "rb", "rp", "rt", "rtc",
    "ruby", "s", "samp", "section", "small", "strong", "sub", "summary", "sup", "u", "var", "wbr",
    // Legacy elements
    "acronym", "basefont", "big", "center", "nobr", "noembed", "noframes",
    "plaintext", "strike", "tt"
  ]
});
