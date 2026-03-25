'use strict';

/**
* escapes JSON Pointer using ~0 for ~ and ~1 for /
* @param s the string to escape
* @return the escaped string
*/
function jpescape(s) {
    return s.replace(/\~/g, '~0').replace(/\//g, '~1');
}

/**
* unescapes JSON Pointer using ~0 for ~ and ~1 for /
* @param s the string to unescape
* @return the unescaped string
*/
function jpunescape(s) {
    return s.replace(/\~1/g, '/').replace(/~0/g, '~');
}

// JSON Pointer specification: http://tools.ietf.org/html/rfc6901

/**
* from obj, return the property with a JSON Pointer prop, optionally setting it
* to newValue
* @param obj the object to point into
* @param prop the JSON Pointer or JSON Reference
* @param newValue optional value to set the property to
* @return the found property, or false
*/
function jptr(obj, prop, newValue) {
    if (typeof obj === 'undefined') return false;
    if (!prop || typeof prop !== 'string' || (prop === '#')) return (typeof newValue !== 'undefined' ? newValue : obj);

    if (prop.indexOf('#')>=0) {
        let parts = prop.split('#');
        let uri = parts[0];
        if (uri) return false; // we do internal resolution only
        prop = parts[1];
        prop = decodeURIComponent(prop.slice(1).split('+').join(' '));
    }
    if (prop.startsWith('/')) prop = prop.slice(1);

    let components = prop.split('/');
    for (let i=0;i<components.length;i++) {
        components[i] = jpunescape(components[i]);

        let setAndLast = (typeof newValue !== 'undefined') && (i == components.length-1);

        let index = parseInt(components[i],10);
        if (!Array.isArray(obj) || isNaN(index) || (index.toString() !== components[i])) {
            index = (Array.isArray(obj) && components[i] === '-') ? -2 : -1;
        }
        else {
            components[i] = (i > 0) ? components[i-1] : ''; // backtrack to indexed property name
        }

        if ((index != -1) || (obj && obj.hasOwnProperty(components[i]))) {
            if (index >= 0) {
                if (setAndLast) {
                    obj[index] = newValue;
                }
                obj = obj[index];
            }
            else if (index === -2) {
                if (setAndLast) {
                    if (Array.isArray(obj)) {
                        obj.push(newValue);
                    }
                    return newValue;
                }
                else return undefined;
            }
            else {
                if (setAndLast) {
                    obj[components[i]] = newValue;
                }
                obj = obj[components[i]];
            }
        }
        else {
            if ((typeof newValue !== 'undefined') && (typeof obj === 'object') &&
                (!Array.isArray(obj))) {
                obj[components[i]] = (setAndLast ? newValue : ((components[i+1] === '0' || components[i+1] === '-') ? [] : {}));
                obj = obj[components[i]];
            }
            else return false;
        }
    }
    return obj;
}

module.exports = {
    jptr : jptr,
    jpescape : jpescape,
    jpunescape : jpunescape
};
