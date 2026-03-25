"use strict";
/**
 * Methods for getting and modifying attributes.
 *
 * @module cheerio/attributes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.attr = attr;
exports.prop = prop;
exports.data = data;
exports.val = val;
exports.removeAttr = removeAttr;
exports.hasClass = hasClass;
exports.addClass = addClass;
exports.removeClass = removeClass;
exports.toggleClass = toggleClass;
const static_js_1 = require("../static.js");
const utils_js_1 = require("../utils.js");
const domhandler_1 = require("domhandler");
const domutils_1 = require("domutils");
const hasOwn = Object.prototype.hasOwnProperty;
const rspace = /\s+/;
const dataAttrPrefix = 'data-';
// Attributes that are booleans
const rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i;
// Matches strings that look like JSON objects or arrays
const rbrace = /^{[^]*}$|^\[[^]*]$/;
function getAttr(elem, name, xmlMode) {
    var _a;
    if (!elem || !(0, domhandler_1.isTag)(elem))
        return undefined;
    (_a = elem.attribs) !== null && _a !== void 0 ? _a : (elem.attribs = {});
    // Return the entire attribs object if no attribute specified
    if (!name) {
        return elem.attribs;
    }
    if (hasOwn.call(elem.attribs, name)) {
        // Get the (decoded) attribute
        return !xmlMode && rboolean.test(name) ? name : elem.attribs[name];
    }
    // Mimic the DOM and return text content as value for `option's`
    if (elem.name === 'option' && name === 'value') {
        return (0, static_js_1.text)(elem.children);
    }
    // Mimic DOM with default value for radios/checkboxes
    if (elem.name === 'input' &&
        (elem.attribs['type'] === 'radio' || elem.attribs['type'] === 'checkbox') &&
        name === 'value') {
        return 'on';
    }
    return undefined;
}
/**
 * Sets the value of an attribute. The attribute will be deleted if the value is
 * `null`.
 *
 * @private
 * @param el - The element to set the attribute on.
 * @param name - The attribute's name.
 * @param value - The attribute's value.
 */
function setAttr(el, name, value) {
    if (value === null) {
        removeAttribute(el, name);
    }
    else {
        el.attribs[name] = `${value}`;
    }
}
function attr(name, value) {
    // Set the value (with attr map support)
    if (typeof name === 'object' || value !== undefined) {
        if (typeof value === 'function') {
            if (typeof name !== 'string') {
                {
                    throw new Error('Bad combination of arguments.');
                }
            }
            return (0, utils_js_1.domEach)(this, (el, i) => {
                if ((0, domhandler_1.isTag)(el))
                    setAttr(el, name, value.call(el, i, el.attribs[name]));
            });
        }
        return (0, utils_js_1.domEach)(this, (el) => {
            if (!(0, domhandler_1.isTag)(el))
                return;
            if (typeof name === 'object') {
                for (const objName of Object.keys(name)) {
                    const objValue = name[objName];
                    setAttr(el, objName, objValue);
                }
            }
            else {
                setAttr(el, name, value);
            }
        });
    }
    return arguments.length > 1
        ? this
        : getAttr(this[0], name, this.options.xmlMode);
}
/**
 * Gets a node's prop.
 *
 * @private
 * @category Attributes
 * @param el - Element to get the prop of.
 * @param name - Name of the prop.
 * @param xmlMode - Disable handling of special HTML attributes.
 * @returns The prop's value.
 */
function getProp(el, name, xmlMode) {
    return name in el
        ? // @ts-expect-error TS doesn't like us accessing the value directly here.
            el[name]
        : !xmlMode && rboolean.test(name)
            ? getAttr(el, name, false) !== undefined
            : getAttr(el, name, xmlMode);
}
/**
 * Sets the value of a prop.
 *
 * @private
 * @param el - The element to set the prop on.
 * @param name - The prop's name.
 * @param value - The prop's value.
 * @param xmlMode - Disable handling of special HTML attributes.
 */
function setProp(el, name, value, xmlMode) {
    if (name in el) {
        // @ts-expect-error Overriding value
        el[name] = value;
    }
    else {
        setAttr(el, name, !xmlMode && rboolean.test(name) ? (value ? '' : null) : `${value}`);
    }
}
function prop(name, value) {
    var _a;
    if (typeof name === 'string' && value === undefined) {
        const el = this[0];
        if (!el || !(0, domhandler_1.isTag)(el))
            return undefined;
        switch (name) {
            case 'style': {
                const property = this.css();
                const keys = Object.keys(property);
                for (let i = 0; i < keys.length; i++) {
                    property[i] = keys[i];
                }
                property.length = keys.length;
                return property;
            }
            case 'tagName':
            case 'nodeName': {
                return el.name.toUpperCase();
            }
            case 'href':
            case 'src': {
                const prop = (_a = el.attribs) === null || _a === void 0 ? void 0 : _a[name];
                if (typeof URL !== 'undefined' &&
                    ((name === 'href' && (el.tagName === 'a' || el.tagName === 'link')) ||
                        (name === 'src' &&
                            (el.tagName === 'img' ||
                                el.tagName === 'iframe' ||
                                el.tagName === 'audio' ||
                                el.tagName === 'video' ||
                                el.tagName === 'source'))) &&
                    prop !== undefined &&
                    this.options.baseURI) {
                    return new URL(prop, this.options.baseURI).href;
                }
                return prop;
            }
            case 'innerText': {
                return (0, domutils_1.innerText)(el);
            }
            case 'textContent': {
                return (0, domutils_1.textContent)(el);
            }
            case 'outerHTML': {
                return this.clone().wrap('<container />').parent().html();
            }
            case 'innerHTML': {
                return this.html();
            }
            default: {
                return getProp(el, name, this.options.xmlMode);
            }
        }
    }
    if (typeof name === 'object' || value !== undefined) {
        if (typeof value === 'function') {
            if (typeof name === 'object') {
                throw new TypeError('Bad combination of arguments.');
            }
            return (0, utils_js_1.domEach)(this, (el, i) => {
                if ((0, domhandler_1.isTag)(el)) {
                    setProp(el, name, value.call(el, i, getProp(el, name, this.options.xmlMode)), this.options.xmlMode);
                }
            });
        }
        return (0, utils_js_1.domEach)(this, (el) => {
            if (!(0, domhandler_1.isTag)(el))
                return;
            if (typeof name === 'object') {
                for (const key of Object.keys(name)) {
                    const val = name[key];
                    setProp(el, key, val, this.options.xmlMode);
                }
            }
            else {
                setProp(el, name, value, this.options.xmlMode);
            }
        });
    }
    return undefined;
}
/**
 * Sets the value of a data attribute.
 *
 * @private
 * @param elem - The element to set the data attribute on.
 * @param name - The data attribute's name.
 * @param value - The data attribute's value.
 */
function setData(elem, name, value) {
    var _a;
    (_a = elem.data) !== null && _a !== void 0 ? _a : (elem.data = {});
    if (typeof name === 'object')
        Object.assign(elem.data, name);
    else if (typeof name === 'string' && value !== undefined) {
        elem.data[name] = value;
    }
}
/**
 * Read _all_ HTML5 `data-*` attributes from the equivalent HTML5 `data-*`
 * attribute, and cache the value in the node's internal data store.
 *
 * @private
 * @category Attributes
 * @param el - Element to get the data attribute of.
 * @returns A map with all of the data attributes.
 */
function readAllData(el) {
    for (const domName of Object.keys(el.attribs)) {
        if (!domName.startsWith(dataAttrPrefix)) {
            continue;
        }
        const jsName = (0, utils_js_1.camelCase)(domName.slice(dataAttrPrefix.length));
        if (!hasOwn.call(el.data, jsName)) {
            el.data[jsName] = parseDataValue(el.attribs[domName]);
        }
    }
    return el.data;
}
/**
 * Read the specified attribute from the equivalent HTML5 `data-*` attribute,
 * and (if present) cache the value in the node's internal data store.
 *
 * @private
 * @category Attributes
 * @param el - Element to get the data attribute of.
 * @param name - Name of the data attribute.
 * @returns The data attribute's value.
 */
function readData(el, name) {
    const domName = dataAttrPrefix + (0, utils_js_1.cssCase)(name);
    const data = el.data;
    if (hasOwn.call(data, name)) {
        return data[name];
    }
    if (hasOwn.call(el.attribs, domName)) {
        return (data[name] = parseDataValue(el.attribs[domName]));
    }
    return undefined;
}
/**
 * Coerce string data-* attributes to their corresponding JavaScript primitives.
 *
 * @private
 * @category Attributes
 * @param value - The value to parse.
 * @returns The parsed value.
 */
function parseDataValue(value) {
    if (value === 'null')
        return null;
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    const num = Number(value);
    if (value === String(num))
        return num;
    if (rbrace.test(value)) {
        try {
            return JSON.parse(value);
        }
        catch {
            /* Ignore */
        }
    }
    return value;
}
function data(name, value) {
    var _a;
    const elem = this[0];
    if (!elem || !(0, domhandler_1.isTag)(elem))
        return;
    const dataEl = elem;
    (_a = dataEl.data) !== null && _a !== void 0 ? _a : (dataEl.data = {});
    // Return the entire data object if no data specified
    if (name == null) {
        return readAllData(dataEl);
    }
    // Set the value (with attr map support)
    if (typeof name === 'object' || value !== undefined) {
        (0, utils_js_1.domEach)(this, (el) => {
            if ((0, domhandler_1.isTag)(el)) {
                if (typeof name === 'object')
                    setData(el, name);
                else
                    setData(el, name, value);
            }
        });
        return this;
    }
    return readData(dataEl, name);
}
function val(value) {
    const querying = arguments.length === 0;
    const element = this[0];
    if (!element || !(0, domhandler_1.isTag)(element))
        return querying ? undefined : this;
    switch (element.name) {
        case 'textarea': {
            return this.text(value);
        }
        case 'select': {
            const option = this.find('option:selected');
            if (!querying) {
                if (this.attr('multiple') == null && typeof value === 'object') {
                    return this;
                }
                this.find('option').removeAttr('selected');
                const values = typeof value === 'object' ? value : [value];
                for (const val of values) {
                    this.find(`option[value="${val}"]`).attr('selected', '');
                }
                return this;
            }
            return this.attr('multiple')
                ? option.toArray().map((el) => (0, static_js_1.text)(el.children))
                : option.attr('value');
        }
        case 'input':
        case 'option': {
            return querying
                ? this.attr('value')
                : this.attr('value', value);
        }
    }
    return undefined;
}
/**
 * Remove an attribute.
 *
 * @private
 * @param elem - Node to remove attribute from.
 * @param name - Name of the attribute to remove.
 */
function removeAttribute(elem, name) {
    if (!elem.attribs || !hasOwn.call(elem.attribs, name))
        return;
    delete elem.attribs[name];
}
/**
 * Splits a space-separated list of names to individual names.
 *
 * @category Attributes
 * @param names - Names to split.
 * @returns - Split names.
 */
function splitNames(names) {
    return names ? names.trim().split(rspace) : [];
}
/**
 * Method for removing attributes by `name`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').removeAttr('class').html();
 * //=> <li>Pear</li>
 *
 * $('.apple').attr('id', 'favorite');
 * $('.apple').removeAttr('id class').html();
 * //=> <li>Apple</li>
 * ```
 *
 * @param name - Name of the attribute.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/removeAttr/}
 */
function removeAttr(name) {
    const attrNames = splitNames(name);
    for (const attrName of attrNames) {
        (0, utils_js_1.domEach)(this, (elem) => {
            if ((0, domhandler_1.isTag)(elem))
                removeAttribute(elem, attrName);
        });
    }
    return this;
}
/**
 * Check to see if _any_ of the matched elements have the given `className`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').hasClass('pear');
 * //=> true
 *
 * $('apple').hasClass('fruit');
 * //=> false
 *
 * $('li').hasClass('pear');
 * //=> true
 * ```
 *
 * @param className - Name of the class.
 * @returns Indicates if an element has the given `className`.
 * @see {@link https://api.jquery.com/hasClass/}
 */
function hasClass(className) {
    return this.toArray().some((elem) => {
        const clazz = (0, domhandler_1.isTag)(elem) && elem.attribs['class'];
        let idx = -1;
        if (clazz && className.length > 0) {
            while ((idx = clazz.indexOf(className, idx + 1)) > -1) {
                const end = idx + className.length;
                if ((idx === 0 || rspace.test(clazz[idx - 1])) &&
                    (end === clazz.length || rspace.test(clazz[end]))) {
                    return true;
                }
            }
        }
        return false;
    });
}
/**
 * Adds class(es) to all of the matched elements. Also accepts a `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').addClass('fruit').html();
 * //=> <li class="pear fruit">Pear</li>
 *
 * $('.apple').addClass('fruit red').html();
 * //=> <li class="apple fruit red">Apple</li>
 * ```
 *
 * @param value - Name of new class.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/addClass/}
 */
function addClass(value) {
    // Support functions
    if (typeof value === 'function') {
        return (0, utils_js_1.domEach)(this, (el, i) => {
            if ((0, domhandler_1.isTag)(el)) {
                const className = el.attribs['class'] || '';
                addClass.call([el], value.call(el, i, className));
            }
        });
    }
    // Return if no value or not a string or function
    if (!value || typeof value !== 'string')
        return this;
    const classNames = value.split(rspace);
    const numElements = this.length;
    for (let i = 0; i < numElements; i++) {
        const el = this[i];
        // If selected element isn't a tag, move on
        if (!(0, domhandler_1.isTag)(el))
            continue;
        // If we don't already have classes — always set xmlMode to false here, as it doesn't matter for classes
        const className = getAttr(el, 'class', false);
        if (className) {
            let setClass = ` ${className} `;
            // Check if class already exists
            for (const cn of classNames) {
                const appendClass = `${cn} `;
                if (!setClass.includes(` ${appendClass}`))
                    setClass += appendClass;
            }
            setAttr(el, 'class', setClass.trim());
        }
        else {
            setAttr(el, 'class', classNames.join(' ').trim());
        }
    }
    return this;
}
/**
 * Removes one or more space-separated classes from the selected elements. If no
 * `className` is defined, all classes will be removed. Also accepts a
 * `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').removeClass('pear').html();
 * //=> <li class="">Pear</li>
 *
 * $('.apple').addClass('red').removeClass().html();
 * //=> <li class="">Apple</li>
 * ```
 *
 * @param name - Name of the class. If not specified, removes all elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/removeClass/}
 */
function removeClass(name) {
    // Handle if value is a function
    if (typeof name === 'function') {
        return (0, utils_js_1.domEach)(this, (el, i) => {
            if ((0, domhandler_1.isTag)(el)) {
                removeClass.call([el], name.call(el, i, el.attribs['class'] || ''));
            }
        });
    }
    const classes = splitNames(name);
    const numClasses = classes.length;
    const removeAll = arguments.length === 0;
    return (0, utils_js_1.domEach)(this, (el) => {
        if (!(0, domhandler_1.isTag)(el))
            return;
        if (removeAll) {
            // Short circuit the remove all case as this is the nice one
            el.attribs['class'] = '';
        }
        else {
            const elClasses = splitNames(el.attribs['class']);
            let changed = false;
            for (let j = 0; j < numClasses; j++) {
                const index = elClasses.indexOf(classes[j]);
                if (index >= 0) {
                    elClasses.splice(index, 1);
                    changed = true;
                    /*
                     * We have to do another pass to ensure that there are not duplicate
                     * classes listed
                     */
                    j--;
                }
            }
            if (changed) {
                el.attribs['class'] = elClasses.join(' ');
            }
        }
    });
}
/**
 * Add or remove class(es) from the matched elements, depending on either the
 * class's presence or the value of the switch argument. Also accepts a
 * `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.apple.green').toggleClass('fruit green red').html();
 * //=> <li class="apple fruit red">Apple</li>
 *
 * $('.apple.green').toggleClass('fruit green red', true).html();
 * //=> <li class="apple green fruit red">Apple</li>
 * ```
 *
 * @param value - Name of the class. Can also be a function.
 * @param stateVal - If specified the state of the class.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/toggleClass/}
 */
function toggleClass(value, stateVal) {
    // Support functions
    if (typeof value === 'function') {
        return (0, utils_js_1.domEach)(this, (el, i) => {
            if ((0, domhandler_1.isTag)(el)) {
                toggleClass.call([el], value.call(el, i, el.attribs['class'] || '', stateVal), stateVal);
            }
        });
    }
    // Return if no value or not a string or function
    if (!value || typeof value !== 'string')
        return this;
    const classNames = value.split(rspace);
    const numClasses = classNames.length;
    const state = typeof stateVal === 'boolean' ? (stateVal ? 1 : -1) : 0;
    const numElements = this.length;
    for (let i = 0; i < numElements; i++) {
        const el = this[i];
        // If selected element isn't a tag, move on
        if (!(0, domhandler_1.isTag)(el))
            continue;
        const elementClasses = splitNames(el.attribs['class']);
        // Check if class already exists
        for (let j = 0; j < numClasses; j++) {
            // Check if the class name is currently defined
            const index = elementClasses.indexOf(classNames[j]);
            // Add if stateValue === true or we are toggling and there is no value
            if (state >= 0 && index < 0) {
                elementClasses.push(classNames[j]);
            }
            else if (state <= 0 && index >= 0) {
                // Otherwise remove but only if the item exists
                elementClasses.splice(index, 1);
            }
        }
        el.attribs['class'] = elementClasses.join(' ');
    }
    return this;
}
//# sourceMappingURL=attributes.js.map