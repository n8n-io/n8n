"use strict";

const { parse } = require('./style_parser');

module.exports = function (elt) {
  const style = new CSSStyleDeclaration(elt)
  const handler = {
    get: function(target, property) {
      return property in target ? target[property] : target.getPropertyValue(dasherizeProperty(property));
    },
    has: function(target, key) {
      return true;
    },
    set: function(target, property, value) {
      if (property in target) {
        target[property] = value;
      } else {
        target.setProperty(dasherizeProperty(property), value ?? undefined);
      }

      return true;
    }
  };

  return new Proxy(style, handler);
};

function dasherizeProperty(property) {
  return property.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}


function CSSStyleDeclaration(elt) {
  this._element = elt;
}

const IMPORTANT_BANG = '!important';

// Utility function for parsing style declarations
// Pass in a string like "margin-left: 5px; border-style: solid"
// and this function returns an object like
// {"margin-left":"5px", "border-style":"solid"}
function parseStyles(value) {
  const result = {
    property: {},
    priority: {},
  }

  if (!value) {
    return result;
  }

  const styleValues = parse(value);
  if (styleValues.length < 2) {
    return result;
  }

  for (let i = 0; i < styleValues.length; i += 2) {
    const name = styleValues[i];
    let value = styleValues[i+1];

    if (value.endsWith(IMPORTANT_BANG)) {
      result.priority[name] = 'important';
      value = value.slice(0, -IMPORTANT_BANG.length).trim();
    }

    result.property[name] = value;
  }

  return result;
}

var NO_CHANGE = {}; // Private marker object

CSSStyleDeclaration.prototype = Object.create(Object.prototype, {

  // Return the parsed form of the element's style attribute.
  // If the element's style attribute has never been parsed
  // or if it has changed since the last parse, then reparse it
  // Note that the styles don't get parsed until they're actually needed
  _parsed: { get: function() {
    if (!this._parsedStyles || this.cssText !== this._lastParsedText) {
      var text = this.cssText;
      this._parsedStyles = parseStyles(text);
      this._lastParsedText = text;
      delete this._names;
    }
    return this._parsedStyles;
  }},

  // Call this method any time the parsed representation of the
  // style changes.  It converts the style properties to a string and
  // sets cssText and the element's style attribute
  _serialize: { value: function() {
    var styles = this._parsed;
    var s = "";

    for(var name in styles.property) {
      if (s) s += " ";
      s += name + ": " + styles.property[name];
      if (styles.priority[name]) {
        s += " !" + styles.priority[name];
      }
      s += ";";
    }

    this.cssText = s;      // also sets the style attribute
    this._lastParsedText = s;  // so we don't reparse
    delete this._names;
  }},

  cssText: {
    get: function() {
      // XXX: this is a CSSStyleDeclaration for an element.
      // A different impl might be necessary for a set of styles
      // associated returned by getComputedStyle(), e.g.
      return this._element.getAttribute("style");
    },
    set: function(value) {
      // XXX: I should parse and serialize the value to
      // normalize it and remove errors. FF and chrome do that.
      this._element.setAttribute("style", value);
    }
  },

  length: { get: function() {
    if (!this._names)
      this._names = Object.getOwnPropertyNames(this._parsed.property);
    return this._names.length;
  }},

  item: { value: function(n) {
    if (!this._names)
      this._names = Object.getOwnPropertyNames(this._parsed.property);
    return this._names[n];
  }},

  getPropertyValue: { value: function(property) {
    property = property.toLowerCase();
    return this._parsed.property[property] || "";
  }},

  getPropertyPriority: { value: function(property) {
    property = property.toLowerCase();
    return this._parsed.priority[property] || "";
  }},

  setProperty: { value: function(property, value, priority) {
    property = property.toLowerCase();
    if (value === null || value === undefined) {
      value = "";
    }
    if (priority === null || priority === undefined) {
      priority = "";
    }

    // String coercion
    if (value !== NO_CHANGE) {
      value = "" + value;
    }

    value = value.trim();
    if (value === "") {
      this.removeProperty(property);
      return;
    }

    if (priority !== "" && priority !== NO_CHANGE &&
        !/^important$/i.test(priority)) {
      return;
    }

    var styles = this._parsed;
    if (value === NO_CHANGE) {
      if (!styles.property[property]) {
        return; // Not a valid property name.
      }
      if (priority !== "") {
        styles.priority[property] = "important";
      } else {
        delete styles.priority[property];
      }
    } else {
      // We don't just accept the property value.  Instead
      // we parse it to ensure that it is something valid.
      // If it contains a semicolon it is invalid
      if (value.indexOf(";") !== -1) return;

      var newprops = parseStyles(property + ":" + value);
      if (Object.getOwnPropertyNames(newprops.property).length === 0) {
        return; // no valid property found
      }
      if (Object.getOwnPropertyNames(newprops.priority).length !== 0) {
        return; // if the value included '!important' it wasn't valid.
      }

      // XXX handle shorthand properties

      for (var p in newprops.property) {
        styles.property[p] = newprops.property[p];
        if (priority === NO_CHANGE) {
          continue;
        } else if (priority !== "") {
          styles.priority[p] = "important";
        } else if (styles.priority[p]) {
          delete styles.priority[p];
        }
      }
    }

    // Serialize and update cssText and element.style!
    this._serialize();
  }},

  setPropertyValue: { value: function(property, value) {
    return this.setProperty(property, value, NO_CHANGE);
  }},

  setPropertyPriority: { value: function(property, priority) {
    return this.setProperty(property, NO_CHANGE, priority);
  }},

  removeProperty: { value: function(property) {
    property = property.toLowerCase();
    var styles = this._parsed;
    if (property in styles.property) {
      delete styles.property[property];
      delete styles.priority[property];

      // Serialize and update cssText and element.style!
      this._serialize();
    }
  }},
});
