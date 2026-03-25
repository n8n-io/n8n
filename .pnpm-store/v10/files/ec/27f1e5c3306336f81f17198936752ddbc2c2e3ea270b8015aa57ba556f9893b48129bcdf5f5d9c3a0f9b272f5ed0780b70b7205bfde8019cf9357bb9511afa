'use strict';

var utils = require('./utils');
var numbers = require('./numbers');
var variables = require('./variables');

module.exports = function makeJuiceClient(juiceClient) {

juiceClient.ignoredPseudos = ['hover', 'active', 'focus', 'visited', 'link'];
juiceClient.widthElements = ['TABLE', 'TD', 'TH', 'IMG'];
juiceClient.heightElements = ['TABLE', 'TD', 'TH', 'IMG'];
juiceClient.tableElements = ['TABLE', 'TH', 'TR', 'TD', 'CAPTION', 'COLGROUP', 'COL', 'THEAD', 'TBODY', 'TFOOT'];
juiceClient.nonVisualElements = [ 'HEAD', 'TITLE', 'BASE', 'LINK', 'STYLE', 'META', 'SCRIPT', 'NOSCRIPT' ];
juiceClient.styleToAttribute = {
  'background-color': 'bgcolor',
  'background-image': 'background',
  'text-align': 'align',
  'vertical-align': 'valign'
};
juiceClient.excludedProperties = [];

juiceClient.juiceDocument = juiceDocument;
juiceClient.inlineDocument = inlineDocument;

function inlineDocument($, css, options) {

  options = options || {};
  var rules = utils.parseCSS(css);
  var editedElements = [];
  var styleAttributeName = 'style';
  var counters = {};

  if (options.styleAttributeName) {
    styleAttributeName = options.styleAttributeName;
  }

  rules.forEach(handleRule);
  editedElements.forEach(setStyleAttrs);

  if (options.inlinePseudoElements) {
    editedElements.forEach(inlinePseudoElements);
  }

  if (options.applyWidthAttributes) {
    editedElements.forEach(function(el) {
      setDimensionAttrs(el, 'width');
    });
  }

  if (options.applyHeightAttributes) {
    editedElements.forEach(function(el) {
      setDimensionAttrs(el, 'height');
    });
  }

  if (options.applyAttributesTableElements) {
    editedElements.forEach(setAttributesOnTableElements);
  }

  if (options.insertPreservedExtraCss && options.extraCss) {
    var preservedText = utils.getPreservedText(options.extraCss, {
      mediaQueries: options.preserveMediaQueries,
      fontFaces: options.preserveFontFaces,
      keyFrames: options.preserveKeyFrames
    });
    if (preservedText) {
      var $appendTo = null;
      if (options.insertPreservedExtraCss !== true) {
        $appendTo = $(options.insertPreservedExtraCss);
      } else {
        $appendTo = $('head');
        if (!$appendTo.length) { $appendTo = $('body'); }
        if (!$appendTo.length) { $appendTo = $.root(); }
      }

      $appendTo.first().append('<style>' + preservedText + '</style>');
    }
  }

  function handleRule(rule) {
    var sel = rule[0];
    var style = rule[1];
    var selector = new utils.Selector(sel);
    var parsedSelector = selector.parsed();

    if (!parsedSelector) {
      return;
    }

    var pseudoElementType = getPseudoElementType(parsedSelector);

    // skip rule if the selector has any pseudos which are ignored
    for (var i = 0; i < parsedSelector.length; ++i) {
      var subSel = parsedSelector[i];
      if (subSel.pseudos) {
        for (var j = 0; j < subSel.pseudos.length; ++j) {
          var subSelPseudo = subSel.pseudos[j];
          if (juiceClient.ignoredPseudos.indexOf(subSelPseudo.name) >= 0) {
            return;
          }
        }
      }
    }

    if (pseudoElementType) {
      var last = parsedSelector[parsedSelector.length - 1];
      var pseudos = last.pseudos;
      last.pseudos = filterElementPseudos(last.pseudos);
      sel = parsedSelector.toString();
      last.pseudos = pseudos;
    }

    var els;
    try {
      els = $(sel);
    } catch (err) {
      // skip invalid selector
      return;
    }

    els.each(function() {
      var el = this;

      if (el.name && juiceClient.nonVisualElements.indexOf(el.name.toUpperCase()) >= 0) {
        return;
      }

      if (!el.counterProps) {
        el.counterProps = el.parent && el.parent.counterProps
          ? Object.create(el.parent.counterProps)
          : {};
      }

      if (pseudoElementType) {
        var pseudoElPropName = 'pseudo' + pseudoElementType;
        var pseudoEl = el[pseudoElPropName];
        if (!pseudoEl) {
          pseudoEl = el[pseudoElPropName] = $('<span />').get(0);
          pseudoEl.pseudoElementType = pseudoElementType;
          pseudoEl.pseudoElementParent = el;
          pseudoEl.counterProps = el.counterProps;
          el[pseudoElPropName] = pseudoEl;
        }
        el = pseudoEl;
      }

      if (!el.styleProps) {
        el.styleProps = {};

        // if the element has inline styles, fake selector with topmost specificity
        if ($(el).attr(styleAttributeName)) {
          var cssText = '* { ' + $(el).attr(styleAttributeName) + ' } ';
          addProps(utils.parseCSS(cssText)[0][1], new utils.Selector('<style>', true));
        }

        // store reference to an element we need to compile style="" attr for
        editedElements.push(el);
      }

      function resetCounter(el, value) {
        var tokens = value.split(/\s+/);

        for (var j = 0; j < tokens.length; j++) {
          var counter = tokens[j];
          var resetval = parseInt(tokens[j+1], 10);

          isNaN(resetval)
            ? el.counterProps[counter] = counters[counter] = 0
            : el.counterProps[counter] = counters[tokens[j++]] = resetval;
        }
      }

      function incrementCounter(el, value) {
        var tokens = value.split(/\s+/);

        for (var j = 0; j < tokens.length; j++) {
          var counter = tokens[j];

          if (el.counterProps[counter] === undefined) {
            continue;
          }

          var incrval = parseInt(tokens[j+1], 10);

          isNaN(incrval)
            ? el.counterProps[counter] = counters[counter] += 1
            : el.counterProps[counter] = counters[tokens[j++]] += incrval;
        }
      }

      // go through the properties
      function addProps(style, selector) {
        for (var i = 0, l = style.length; i < l; i++) {
          if (style[i].type == 'property') {
            var name = style[i].name;
            var value = style[i].value;

            if (name === 'counter-reset') {
              resetCounter(el, value);
            }

            if (name === 'counter-increment') {
              incrementCounter(el, value);
            }

            var important = value.match(/!important$/) !== null;
            if (important && !options.preserveImportant) value = removeImportant(value);
            // adds line number and column number for the properties as "additionalPriority" to the
            // properties because in CSS the position directly affect the priority.
            var additionalPriority = [style[i].position.start.line, style[i].position.start.col];
            var prop = new utils.Property(name, value, selector, important ? 2 : 0, additionalPriority);
            var existing = el.styleProps[name];

            // if property name is not in the excluded properties array
            if (juiceClient.excludedProperties.indexOf(name) < 0) {
              if (existing && existing.compare(prop) === prop || !existing) {
                // deleting a property let us change the order (move it to the end in the setStyleAttrs loop)
                if (existing && existing.selector !== selector) {
                  delete el.styleProps[name];
                } else if (existing) {
                  // make "prop" a special composed property.
                  prop.nextProp = existing;
                }

                el.styleProps[name] = prop;
              }
            }
          }
        }
      }

      addProps(style, selector);
    });
  }

  function setStyleAttrs(el) {
    var l = Object.keys(el.styleProps).length;
    var props = [];
    // Here we loop each property and make sure to "expand"
    // linked "nextProp" properties happening when the same property
    // is declared multiple times in the same selector.
    Object.keys(el.styleProps).forEach(function(key) {
      var np = el.styleProps[key];
      while (typeof np !== 'undefined') {
        props.push(np);
        np = np.nextProp;
      }
    });
    // sort properties by their originating selector's specificity so that
    // props like "padding" and "padding-bottom" are resolved as expected.
    props.sort(function(a, b) {
      return a.compareFunc(b);
    });
    	
    var string = props
      .filter(function(prop) {

        // don't add css variables if we're resolving their values
        if (options.resolveCSSVariables && (prop.prop.indexOf('--') === 0) ) {
          return false;
        }
        
        // Content becomes the innerHTML of pseudo elements, not used as a
        // style property
        return (prop.prop !== 'content');
      })
      .map(function(prop) {
        if (options.resolveCSSVariables) {
          prop.value = variables.replaceVariables(el,prop.value);
        }
        return prop.prop + ': ' + prop.value.replace(/["]/g, '\'') + ';';
      })
      .join(' ');
    if (string) {
      $(el).attr(styleAttributeName, string);
    }
  }

  function inlinePseudoElements(el) {
    if (el.pseudoElementType && el.styleProps.content) {
      var parsed = parseContent(el);
      if (parsed.img) {
        el.name = 'img';
        $(el).attr('src', parsed.img);
      } else {
        $(el).text(parsed);
      }
      var parent = el.pseudoElementParent;
      if (el.pseudoElementType === 'before') {
        $(parent).prepend(el);
      } else {
        $(parent).append(el);
      }
    }
  }

  function setDimensionAttrs(el, dimension) {
    if (!el.name) { return; }
    var elName = el.name.toUpperCase();
    if (juiceClient[dimension + 'Elements'].indexOf(elName) > -1) {
      for (var i in el.styleProps) {
        if (el.styleProps[i].prop === dimension) {
          var value = el.styleProps[i].value;
          if (options.preserveImportant) {
            value = removeImportant(value);
          }
          if (value.match(/(px|auto)/)) {
            var size = value.replace('px', '');
            $(el).attr(dimension, size);
            return;
          }
          if (juiceClient.tableElements.indexOf(elName) > -1 && value.match(/\%/)) {
            $(el).attr(dimension, value);
            return;
          }
        }
      }
    }
  }

  function extractBackgroundUrl(value) {
    return value.indexOf('url(') !== 0
      ? value
      : value.replace(/^url\((["'])?([^"']+)\1\)$/, '$2');
  }

  function setAttributesOnTableElements(el) {
    if (!el.name) { return; }
    var elName = el.name.toUpperCase();
    var styleProps = Object.keys(juiceClient.styleToAttribute);

    if (juiceClient.tableElements.indexOf(elName) > -1) {
      for (var i in el.styleProps) {
        if (styleProps.indexOf(el.styleProps[i].prop) > -1) {
          var prop = juiceClient.styleToAttribute[el.styleProps[i].prop];
          var value = el.styleProps[i].value;
          if (options.preserveImportant) {
            value = removeImportant(value);
          }
          if (prop === 'background') {
            value = extractBackgroundUrl(value);
          }
          if (/(linear|radial)-gradient\(/i.test(value)) {
            continue;
          }
          $(el).attr(prop, value);
        }
      }
    }
  }
}

function removeImportant(value) {
  return value.replace(/\s*!important$/, '')
}



function applyCounterStyle(counter, style) {
  switch (style) {
    case 'lower-roman':
      return numbers.romanize(counter).toLowerCase();
    case 'upper-roman':
      return numbers.romanize(counter);
    case 'lower-latin':
    case 'lower-alpha':
      return numbers.alphanumeric(counter).toLowerCase();
    case 'upper-latin':
    case 'upper-alpha':
      return numbers.alphanumeric(counter);
    // TODO support more counter styles
    default:
      return counter.toString();
  }
}

function parseContent(el) {
  var content = el.styleProps.content.value;

  if (content === 'none' || content === 'normal') {
    return '';
  }

  var imageUrlMatch = content.match(/^\s*url\s*\(\s*(.*?)\s*\)\s*$/i);
  if (imageUrlMatch) {
    var url = imageUrlMatch[1].replace(/^['"]|['"]$/g, '');
    return { img: url };
  }

  var parsed = [];

  var tokens = content.split(/['"]/);
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i] === '') continue;

    var varMatch = tokens[i].match(/var\s*\(\s*(.*?)\s*(,\s*(.*?)\s*)?\s*\)/i);
    if (varMatch) {
      var variable = variables.findVariableValue(el, varMatch[1]) || varMatch[2];
      parsed.push(variable.replace(/^['"]|['"]$/g, ''));
      continue;
    }

    var counterMatch = tokens[i].match(/counter\s*\(\s*(.*?)\s*(,\s*(.*?)\s*)?\s*\)/i);
    if (counterMatch && counterMatch[1] in el.counterProps) {
      var counter = el.counterProps[counterMatch[1]];
      parsed.push(applyCounterStyle(counter, counterMatch[3]));
      continue;
    }

    var attrMatch = tokens[i].match(/attr\s*\(\s*(.*?)\s*\)/i);
    if (attrMatch) {
      var attr = attrMatch[1];
      parsed.push(el.pseudoElementParent
        ? el.pseudoElementParent.attribs[attr]
        : el.attribs[attr]
      );
      continue;
    }

    parsed.push(tokens[i]);
  }

  content = parsed.join('');
  // Naive unescape, assume no unicode char codes
  content = content.replace(/\\/g, '');
  return content;
}

// Return "before" or "after" if the given selector is a pseudo element (e.g.,
// a::after).
function getPseudoElementType(selector) {
  if (selector.length === 0) {
    return;
  }

  var pseudos = selector[selector.length - 1].pseudos;
  if (!pseudos) {
    return;
  }

  for (var i = 0; i < pseudos.length; i++) {
    if (isPseudoElementName(pseudos[i])) {
      return pseudos[i].name;
    }
  }
}

function isPseudoElementName(pseudo) {
  return pseudo.name === 'before' || pseudo.name === 'after';
}

function filterElementPseudos(pseudos) {
  return pseudos.filter(function(pseudo) {
    return !isPseudoElementName(pseudo);
  });
}

function juiceDocument($, options) {
  options = utils.getDefaultOptions(options);
  var css = extractCssFromDocument($, options);
  css += '\n' + options.extraCss;
  inlineDocument($, css, options);
  return $;
}

function getStylesData($, options) {
  var results = [];
  var stylesList = $('style');
  var styleDataList, styleData, styleElement;
  stylesList.each(function() {
    styleElement = this;
    // the API for Cheerio using parse5 (default) and htmlparser2 are slightly different
    // detect this by checking if .childNodes exist (as opposed to .children)
    var usingParse5 = !!styleElement.childNodes;
    styleDataList = usingParse5 ? styleElement.childNodes : styleElement.children;
    if (styleDataList.length !== 1) {
      if (options.removeStyleTags) {
        $(styleElement).remove();
      }
      return;
    }
    styleData = styleDataList[0].data;
    if (options.applyStyleTags && $(styleElement).attr('data-embed') === undefined) {
      results.push(styleData);
    }
    if (options.removeStyleTags && $(styleElement).attr('data-embed') === undefined) {
      var text = usingParse5 ? styleElement.childNodes[0].nodeValue : styleElement.children[0].data;
      var preservedText = utils.getPreservedText(text, {
        mediaQueries: options.preserveMediaQueries,
        fontFaces: options.preserveFontFaces,
        keyFrames: options.preserveKeyFrames,
        pseudos: options.preservePseudos
      }, juiceClient.ignoredPseudos);
      if (preservedText) {
        if (usingParse5) {
          styleElement.childNodes[0].nodeValue = preservedText;
        } else {
          styleElement.children[0].data = preservedText;
        }
      } else {
        $(styleElement).remove();
      }
    }
    $(styleElement).removeAttr('data-embed');
  });
  return results;
}

function extractCssFromDocument($, options) {
  var results = getStylesData($, options);
  var css = results.join('\n');
  return css;
}

return juiceClient;

};
