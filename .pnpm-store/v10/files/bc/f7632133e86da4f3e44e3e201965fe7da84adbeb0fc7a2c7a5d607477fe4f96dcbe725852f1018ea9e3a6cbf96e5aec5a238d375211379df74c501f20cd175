/*!
 * AnchorJS - v1.2.1 - 2015-07-02
 * https://github.com/bryanbraun/anchorjs
 * Copyright (c) 2015 Bryan Braun; Licensed MIT
 */

function AnchorJS(options) {
  'use strict';

  this.options = options || {};

  this._applyRemainingDefaultOptions = function(opts) {
    this.options.icon = this.options.hasOwnProperty('icon') ? opts.icon : '\ue9cb'; // Accepts characters (and also URLs?), like  '#', '¶', '❡', or '§'.
    this.options.visible = this.options.hasOwnProperty('visible') ? opts.visible : 'hover'; // Also accepts 'always'
    this.options.placement = this.options.hasOwnProperty('placement') ? opts.placement : 'right'; // Also accepts 'left'
    this.options.class = this.options.hasOwnProperty('class') ? opts.class : ''; // Accepts any class name.
  };

  this._applyRemainingDefaultOptions(options);

  this.add = function(selector) {
    var elements,
        elsWithIds,
        idList,
        elementID,
        i,
        roughText,
        tidyText,
        index,
        count,
        newTidyText,
        readableID,
        anchor;

    this._applyRemainingDefaultOptions(this.options);

    // Provide a sensible default selector, if none is given.
    if (!selector) {
      selector = 'h1, h2, h3, h4, h5, h6';
    } else if (typeof selector !== 'string') {
      throw new Error('The selector provided to AnchorJS was invalid.');
    }

    elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
      return false;
    }

    this._addBaselineStyles();

    // We produce a list of existing IDs so we don't generate a duplicate.
    elsWithIds = document.querySelectorAll('[id]');
    idList = [].map.call(elsWithIds, function assign(el) {
      return el.id;
    });

    for (i = 0; i < elements.length; i++) {

      if (elements[i].hasAttribute('id')) {
        elementID = elements[i].getAttribute('id');
      } else {
        roughText = elements[i].textContent;

        // Refine it so it makes a good ID. Strip out non-safe characters, replace
        // spaces with hyphens, truncate to 32 characters, and make toLowerCase.
        //
        // Example string:                                // '⚡⚡⚡ Unicode icons are cool--but they definitely don't belong in a URL fragment.'
        tidyText = roughText.replace(/[^\w\s-]/gi, '')    // ' Unicode icons are cool--but they definitely dont belong in a URL fragment'
                                .replace(/\s+/g, '-')     // '-Unicode-icons-are-cool--but-they-definitely-dont-belong-in-a-URL-fragment'
                                .replace(/-{2,}/g, '-')   // '-Unicode-icons-are-cool-but-they-definitely-dont-belong-in-a-URL-fragment'
                                .substring(0, 64)         // '-Unicode-icons-are-cool-but-they-definitely-dont-belong-in-a-URL'
                                .replace(/^-+|-+$/gm, '') // 'Unicode-icons-are-cool-but-they-definitely-dont-belong-in-a-URL'
                                .toLowerCase();           // 'unicode-icons-are-cool-but-they-definitely-dont-belong-in-a-url'

        // Compare our generated ID to existing IDs (and increment it if needed)
        // before we add it to the page.
        newTidyText = tidyText;
        count = 0;
        do {
          if (index !== undefined) {
            newTidyText = tidyText + '-' + count;
          }
          // .indexOf is supported in IE9+.
          index = idList.indexOf(newTidyText);
          count += 1;
        } while (index !== -1);
        index = undefined;
        idList.push(newTidyText);

        // Assign it to our element.
        // Currently the setAttribute element is only supported in IE9 and above.
        elements[i].setAttribute('id', newTidyText);

        elementID = newTidyText;
      }

      readableID = elementID.replace(/-/g, ' ');

      // The following code builds the following DOM structure in a more effiecient (albeit opaque) way.
      // '<a class="anchorjs-link ' + this.options.class + '" href="#' + elementID + '" aria-label="Anchor link for: ' + readableID + '" data-anchorjs-icon="' + this.options.icon + '"></a>';
      anchor = document.createElement('a');
      anchor.className = 'anchorjs-link ' + this.options.class;
      anchor.href = '#' + elementID;
      anchor.setAttribute('aria-label', 'Anchor link for: ' + readableID);
      anchor.setAttribute('data-anchorjs-icon', this.options.icon);

      if (this.options.visible === 'always') {
        anchor.style.opacity = '1';
      }

      if (this.options.icon === '\ue9cb') {
        anchor.style.fontFamily = 'anchorjs-icons';
        anchor.style.fontStyle = 'normal';
        anchor.style.fontVariant = 'normal';
        anchor.style.fontWeight = 'normal';
        anchor.style.lineHeight = 1;
      }

      if (this.options.placement === 'left') {
        anchor.style.position = 'absolute';
        anchor.style.marginLeft = '-1em';
        anchor.style.paddingRight = '0.5em';
        elements[i].insertBefore(anchor, elements[i].firstChild);
      } else { // if the option provided is `right` (or anything else).
        anchor.style.paddingLeft = '0.375em';
        elements[i].appendChild(anchor);
      }
    }

    return this;
  };

  this.remove = function(selector) {
    var domAnchor,
        elements = document.querySelectorAll(selector);
    for (var i = 0; i < elements.length; i++) {
      domAnchor = elements[i].querySelector('.anchorjs-link');
      if (domAnchor) {
        elements[i].removeChild(domAnchor);
      }
    }
    return this;
  };

  this._addBaselineStyles = function() {
    // We don't want to add global baseline styles if they've been added before.
    if (document.head.querySelector('style.anchorjs') !== null) {
      return;
    }

    var style = document.createElement('style'),
        linkRule =
        ' .anchorjs-link {'                       +
        '   opacity: 0;'                          +
        '   text-decoration: none;'               +
        '   -webkit-font-smoothing: antialiased;' +
        '   -moz-osx-font-smoothing: grayscale;'  +
        ' }',
        hoverRule =
        ' *:hover > .anchorjs-link,'              +
        ' .anchorjs-link:focus  {'                +
        '   opacity: 1;'                          +
        ' }',
        anchorjsLinkFontFace =
        ' @font-face {'                           +
        '   font-family: "anchorjs-icons";'       +
        '   font-style: normal;'                  +
        '   font-weight: normal;'                 + // Icon from icomoon; 10px wide & 10px tall; 2 empty below & 4 above
        '   src: url(data:application/x-font-ttf;charset=utf-8;base64,AAEAAAALAIAAAwAwT1MvMg8SBTUAAAC8AAAAYGNtYXAWi9QdAAABHAAAAFRnYXNwAAAAEAAAAXAAAAAIZ2x5Zgq29TcAAAF4AAABNGhlYWQEZM3pAAACrAAAADZoaGVhBhUDxgAAAuQAAAAkaG10eASAADEAAAMIAAAAFGxvY2EAKACuAAADHAAAAAxtYXhwAAgAVwAAAygAAAAgbmFtZQ5yJ3cAAANIAAAB2nBvc3QAAwAAAAAFJAAAACAAAwJAAZAABQAAApkCzAAAAI8CmQLMAAAB6wAzAQkAAAAAAAAAAAAAAAAAAAABEAAAAAAAAAAAAAAAAAAAAABAAADpywPA/8AAQAPAAEAAAAABAAAAAAAAAAAAAAAgAAAAAAADAAAAAwAAABwAAQADAAAAHAADAAEAAAAcAAQAOAAAAAoACAACAAIAAQAg6cv//f//AAAAAAAg6cv//f//AAH/4xY5AAMAAQAAAAAAAAAAAAAAAQAB//8ADwABAAAAAAAAAAAAAgAANzkBAAAAAAEAAAAAAAAAAAACAAA3OQEAAAAAAQAAAAAAAAAAAAIAADc5AQAAAAACADEARAJTAsAAKwBUAAABIiYnJjQ/AT4BMzIWFxYUDwEGIicmND8BNjQnLgEjIgYPAQYUFxYUBw4BIwciJicmND8BNjIXFhQPAQYUFx4BMzI2PwE2NCcmNDc2MhcWFA8BDgEjARQGDAUtLXoWOR8fORYtLTgKGwoKCjgaGg0gEhIgDXoaGgkJBQwHdR85Fi0tOAobCgoKOBoaDSASEiANehoaCQkKGwotLXoWOR8BMwUFLYEuehYXFxYugC44CQkKGwo4GkoaDQ0NDXoaShoKGwoFBe8XFi6ALjgJCQobCjgaShoNDQ0NehpKGgobCgoKLYEuehYXAAEAAAABAACiToc1Xw889QALBAAAAAAA0XnFFgAAAADRecUWAAAAAAJTAsAAAAAIAAIAAAAAAAAAAQAAA8D/wAAABAAAAAAAAlMAAQAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAACAAAAAoAAMQAAAAAACgAUAB4AmgABAAAABQBVAAIAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAADgCuAAEAAAAAAAEADgAAAAEAAAAAAAIABwCfAAEAAAAAAAMADgBLAAEAAAAAAAQADgC0AAEAAAAAAAUACwAqAAEAAAAAAAYADgB1AAEAAAAAAAoAGgDeAAMAAQQJAAEAHAAOAAMAAQQJAAIADgCmAAMAAQQJAAMAHABZAAMAAQQJAAQAHADCAAMAAQQJAAUAFgA1AAMAAQQJAAYAHACDAAMAAQQJAAoANAD4YW5jaG9yanMtaWNvbnMAYQBuAGMAaABvAHIAagBzAC0AaQBjAG8AbgBzVmVyc2lvbiAxLjAAVgBlAHIAcwBpAG8AbgAgADEALgAwYW5jaG9yanMtaWNvbnMAYQBuAGMAaABvAHIAagBzAC0AaQBjAG8AbgBzYW5jaG9yanMtaWNvbnMAYQBuAGMAaABvAHIAagBzAC0AaQBjAG8AbgBzUmVndWxhcgBSAGUAZwB1AGwAYQByYW5jaG9yanMtaWNvbnMAYQBuAGMAaABvAHIAagBzAC0AaQBjAG8AbgBzRm9udCBnZW5lcmF0ZWQgYnkgSWNvTW9vbi4ARgBvAG4AdAAgAGcAZQBuAGUAcgBhAHQAZQBkACAAYgB5ACAASQBjAG8ATQBvAG8AbgAuAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==) format("truetype");' +
        ' }',
        pseudoElContent =
        ' [data-anchorjs-icon]::after {'          +
        '   content: attr(data-anchorjs-icon);'   +
        ' }',
        firstStyleEl;

    style.className = 'anchorjs';
    style.appendChild(document.createTextNode('')); // Necessary for Webkit.

    // We place it in the head with the other style tags, if possible, so as to
    // not look out of place. We insert before the others so these styles can be
    // overridden if necessary.
    firstStyleEl = document.head.querySelector('[rel="stylesheet"], style');
    if (firstStyleEl === undefined) {
      document.head.appendChild(style);
    } else {
      document.head.insertBefore(style, firstStyleEl);
    }

    style.sheet.insertRule(linkRule, style.sheet.cssRules.length);
    style.sheet.insertRule(hoverRule, style.sheet.cssRules.length);
    style.sheet.insertRule(pseudoElContent, style.sheet.cssRules.length);
    style.sheet.insertRule(anchorjsLinkFontFace, style.sheet.cssRules.length);
  };
}

var anchors = new AnchorJS();
