#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');

/**
 * Process entities.json from the HTML5 spec into an array and regular
 * expression suitable for use in domino's HTMLParser.js implementation.
 */
var entities_json = process.argv[2];
var entities = require(path.resolve(__dirname, entities_json));
var keys = Object.keys(entities).map(function(s) {
    console.assert(s[0] === '&');
    return s.slice(1); // Don't include leading '&'
}).sort();

var s = '';
s += '/*\n';
s += ' * This table is generated with test/tools/update-entities.js\n';
s += ' */\n';
s += 'var namedCharRefs = {\n  __proto__: null,\n';

for (var i=0; i<keys.length; i++) {
    if (i%2==0) { s+='  '; } else { s += ' '; }
    s += JSON.stringify(keys[i]);
    s += ':';
    var c = entities['&' + keys[i]].characters;
    if (c.length === 1) {
        s += '0x' + c.charCodeAt(0).toString(16);
    } else {
        s += '[';
        for (var j=0; j<c.length; j++) {
            if (j>0) { s+=','; }
            s += '0x' + c.charCodeAt(j).toString(16);
        }
        s += ']';
    }
    s += ',';
    if (i%2==1 || i===keys.length-1) { s+='\n'; }
}
s += '};\n';

// Construct a regular expression matching exactly the keys of this table.
var esc = function(s) { return s.replace(/[\^\\$*+?.()|{}\[\]\/]/g, '\\$&'); };
var prefix = function(keys) {
    console.assert(keys.length>0 && keys[0].length>0);
    var first = '', subkeys, accept;
    var result = [];
    var emit = function() {
        if (first==='') { return; }
        var sub = subkeys.length > 0 ? prefix(subkeys) : [];
        if (accept) { sub.push(''); }
        sub = sub.length>1 ? ('(?:' + sub.join('|') + ')') : sub[0];
        if (sub==='(?:;|)') { sub = ';?'; /* optimization */ }
        result.push(esc(first) + sub);
    };
    for (var i=0; i<keys.length; i++) {
        if (keys[i][0] !== first) {
            emit();
            first = keys[i][0];
            subkeys = [];
            accept = false;
        }
        if (keys[i].length>1) {
            subkeys.push(keys[i].slice(1));
        } else {
            accept = true;
        }
    }
    emit();
    return result;
};
var re = prefix(keys).join('|');
s += '/*\n';
s += ' * This regexp is generated with test/tools/update-entities.js\n';
s += ' * It will always match at least one character -- but note that there\n';
s += ' * are no entities whose names are a single character long.\n';
s += ' */\n';
s += 'var NAMEDCHARREF = /(' + re + ')|[\\s\\S]/g;\n';

// Verify the property mentioned in the comment above.
var lens = keys.map(function(s) { return s.length; });
var minlen = Math.min.apply(Math, lens);
var maxlen = Math.max.apply(Math, lens);
console.assert(minlen > 1);

s += '\nvar NAMEDCHARREF_MAXLEN = ' + maxlen + ';\n';

// Emit the result
console.log(s);
