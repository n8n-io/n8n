import { isString } from './is.js';
import { GLOBAL_OBJ } from './worldwide.js';

const WINDOW = GLOBAL_OBJ ;

const DEFAULT_MAX_STRING_LENGTH = 80;

/**
 * Given a child DOM element, returns a query-selector statement describing that
 * and its ancestors
 * e.g. [HTMLElement] => body > div > input#foo.btn[name=baz]
 * @returns generated DOM path
 */
function htmlTreeAsString(
  elem,
  options = {},
) {
  if (!elem) {
    return '<unknown>';
  }

  // try/catch both:
  // - accessing event.target (see getsentry/raven-js#838, #768)
  // - `htmlTreeAsString` because it's complex, and just accessing the DOM incorrectly
  // - can throw an exception in some circumstances.
  try {
    let currentElem = elem ;
    const MAX_TRAVERSE_HEIGHT = 5;
    const out = [];
    let height = 0;
    let len = 0;
    const separator = ' > ';
    const sepLength = separator.length;
    let nextStr;
    const keyAttrs = Array.isArray(options) ? options : options.keyAttrs;
    const maxStringLength = (!Array.isArray(options) && options.maxStringLength) || DEFAULT_MAX_STRING_LENGTH;

    while (currentElem && height++ < MAX_TRAVERSE_HEIGHT) {
      nextStr = _htmlElementAsString(currentElem, keyAttrs);
      // bail out if
      // - nextStr is the 'html' element
      // - the length of the string that would be created exceeds maxStringLength
      //   (ignore this limit if we are on the first iteration)
      if (nextStr === 'html' || (height > 1 && len + out.length * sepLength + nextStr.length >= maxStringLength)) {
        break;
      }

      out.push(nextStr);

      len += nextStr.length;
      currentElem = currentElem.parentNode;
    }

    return out.reverse().join(separator);
  } catch {
    return '<unknown>';
  }
}

/**
 * Returns a simple, query-selector representation of a DOM element
 * e.g. [HTMLElement] => input#foo.btn[name=baz]
 * @returns generated DOM path
 */
function _htmlElementAsString(el, keyAttrs) {
  const elem = el

;

  const out = [];

  if (!elem?.tagName) {
    return '';
  }

  // @ts-expect-error WINDOW has HTMLElement
  if (WINDOW.HTMLElement) {
    // If using the component name annotation plugin, this value may be available on the DOM node
    if (elem instanceof HTMLElement && elem.dataset) {
      if (elem.dataset['sentryComponent']) {
        return elem.dataset['sentryComponent'];
      }
      if (elem.dataset['sentryElement']) {
        return elem.dataset['sentryElement'];
      }
    }
  }

  out.push(elem.tagName.toLowerCase());

  // Pairs of attribute keys defined in `serializeAttribute` and their values on element.
  const keyAttrPairs = keyAttrs?.length
    ? keyAttrs.filter(keyAttr => elem.getAttribute(keyAttr)).map(keyAttr => [keyAttr, elem.getAttribute(keyAttr)])
    : null;

  if (keyAttrPairs?.length) {
    keyAttrPairs.forEach(keyAttrPair => {
      out.push(`[${keyAttrPair[0]}="${keyAttrPair[1]}"]`);
    });
  } else {
    if (elem.id) {
      out.push(`#${elem.id}`);
    }

    const className = elem.className;
    if (className && isString(className)) {
      const classes = className.split(/\s+/);
      for (const c of classes) {
        out.push(`.${c}`);
      }
    }
  }
  const allowedAttrs = ['aria-label', 'type', 'name', 'title', 'alt'];
  for (const k of allowedAttrs) {
    const attr = elem.getAttribute(k);
    if (attr) {
      out.push(`[${k}="${attr}"]`);
    }
  }

  return out.join('');
}

/**
 * A safe form of location.href
 */
function getLocationHref() {
  try {
    return WINDOW.document.location.href;
  } catch {
    return '';
  }
}

/**
 * Given a DOM element, traverses up the tree until it finds the first ancestor node
 * that has the `data-sentry-component` or `data-sentry-element` attribute with `data-sentry-component` taking
 * precedence. This attribute is added at build-time by projects that have the component name annotation plugin installed.
 *
 * @returns a string representation of the component for the provided DOM element, or `null` if not found
 */
function getComponentName(elem) {
  // @ts-expect-error WINDOW has HTMLElement
  if (!WINDOW.HTMLElement) {
    return null;
  }

  let currentElem = elem ;
  const MAX_TRAVERSE_HEIGHT = 5;
  for (let i = 0; i < MAX_TRAVERSE_HEIGHT; i++) {
    if (!currentElem) {
      return null;
    }

    if (currentElem instanceof HTMLElement) {
      if (currentElem.dataset['sentryComponent']) {
        return currentElem.dataset['sentryComponent'];
      }
      if (currentElem.dataset['sentryElement']) {
        return currentElem.dataset['sentryElement'];
      }
    }

    currentElem = currentElem.parentNode;
  }

  return null;
}

export { getComponentName, getLocationHref, htmlTreeAsString };
//# sourceMappingURL=browser.js.map
