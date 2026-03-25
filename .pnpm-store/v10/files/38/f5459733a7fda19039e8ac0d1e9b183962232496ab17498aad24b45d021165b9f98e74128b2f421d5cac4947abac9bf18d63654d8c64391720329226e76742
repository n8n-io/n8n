var spdxExpressionParse = require('spdx-expression-parse');

var MIT_LICENSE = /ermission is hereby granted, free of charge, to any/;
var BSD_LICENSE = /edistribution and use in source and binary forms, with or withou/;
var BSD_SOURCE_CODE_LICENSE = /edistribution and use of this software in source and binary forms, with or withou/;
var WTFPL_LICENSE = /DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE/;
var ISC_LICENSE = /The ISC License/;
var MIT = /\bMIT\b/;
var BSD = /\bBSD\b/;
var ISC = /\bISC\b/;
var GPL = /\bGNU GENERAL PUBLIC LICENSE\s*Version ([^,]*)/i;
var LGPL = /(?:LESSER|LIBRARY) GENERAL PUBLIC LICENSE\s*Version ([^,]*)/i;
var APACHE = /\bApache License\b/;
var WTFPL = /\bWTFPL\b/;
// https://creativecommons.org/publicdomain/zero/1.0/
var CC0_1_0 = /The\s+person\s+who\s+associated\s+a\s+work\s+with\s+this\s+deed\s+has\s+dedicated\s+the\s+work\s+to\s+the\s+public\s+domain\s+by\s+waiving\s+all\s+of\s+his\s+or\s+her\s+rights\s+to\s+the\s+work\s+worldwide\s+under\s+copyright\s+law,\s+including\s+all\s+related\s+and\s+neighboring\s+rights,\s+to\s+the\s+extent\s+allowed\s+by\s+law.\s+You\s+can\s+copy,\s+modify,\s+distribute\s+and\s+perform\s+the\s+work,\s+even\s+for\s+commercial\s+purposes,\s+all\s+without\s+asking\s+permission./i; // jshint ignore:line
var PUBLIC_DOMAIN = /[Pp]ublic [Dd]omain/;
var IS_URL = /(https?:\/\/[-a-zA-Z0-9\/.]*)/;
var IS_FILE_REFERENCE = /SEE LICENSE IN (.*)/i;


module.exports = function(str) {
    var match, version;
    try {
        spdxExpressionParse(str || '');
        return str;
    } catch (error) {
        // nothing
    }
    if (str) {
        str = str.replace('\n', '');
    }
    if (typeof str === 'undefined' || !str) {
        return 'Undefined';
    } else if (ISC_LICENSE.test(str)) {
        return 'ISC*';
    } else if (MIT_LICENSE.test(str)) {
        return 'MIT*';
    } else if (BSD_LICENSE.test(str)) {
        return 'BSD*';
    } else if (BSD_SOURCE_CODE_LICENSE.test(str)) {
        // https://spdx.org/licenses/BSD-Source-Code.html
        return 'BSD-Source-Code*';
    } else if (WTFPL_LICENSE.test(str)) {
        return 'WTFPL*';
    } else if (ISC.test(str)) {
        return 'ISC*';
    } else if (MIT.test(str)) {
        return 'MIT*';
    } else if (BSD.test(str)) {
        return 'BSD*';
    } else if (WTFPL.test(str)) {
        return 'WTFPL*';
    } else if (APACHE.test(str)) {
        return 'Apache*';
    } else if (CC0_1_0.test(str)) {
        return 'CC0-1.0*';
    } else if(GPL.test(str)) {
        match = GPL.exec(str);
        version = match[1];
        /*istanbul ignore else*/
        if(version.length === 1) {
            version = version + '.0';
        }
        return 'GPL-'+version+'*';
    } else if(LGPL.test(str)) {
        match = LGPL.exec(str);
        version = match[1];
        if(version.length === 1) {
            version = version + '.0';
        }
        return 'LGPL-'+version+'*';
    } else if(PUBLIC_DOMAIN.test(str)) {
        return 'Public Domain';
    } else {
        match = IS_URL.exec(str) || IS_FILE_REFERENCE.exec(str);
        if(match) {
            return 'Custom: ' + match[1];
        } else {
            return null;
        }
    }
};
