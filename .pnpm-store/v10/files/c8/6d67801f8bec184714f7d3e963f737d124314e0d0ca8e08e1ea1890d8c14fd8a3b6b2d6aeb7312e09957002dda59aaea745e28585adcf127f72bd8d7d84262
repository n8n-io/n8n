var assert = require('assert'),
    license = require('../lib/license');

describe('license parser', function() {

    it('should export a function', function() {
        assert.equal(typeof license, 'function');
    });

    it('undefined check', function() {
        assert.equal(license(undefined), 'Undefined');
    });

    it('MIT check', function() {
        var data = license('asdf\nasdf\nasdf\nPermission is hereby granted, free of charge, to any');
        assert.equal(data, 'MIT*');
    });

    it('MIT word check', function() {
        var data = license('asdf\nasdf\nMIT\nasdf\n');
        assert.equal(data, 'MIT*');
    });

    it('Non-MIT word check', function() {
        var data = license('prefixMIT\n');
        assert.notEqual(data, 'MIT*');
    });

    it('GPL word check', function() {
        var data;
        data = license('GNU GENERAL PUBLIC LICENSE \nVersion 1, February 1989');
        assert.equal(data, 'GPL-1.0*');
        data = license('GNU GENERAL PUBLIC LICENSE \nVersion 2, June 1991');
        assert.equal(data, 'GPL-2.0*');
        data = license('GNU GENERAL PUBLIC LICENSE \nVersion 3, 29 June 2007');
        assert.equal(data, 'GPL-3.0*');
    });

    it('Non-GPL word check', function() {
        var data;
        data = license('preGNU GENERAL PUBLIC LICENSE \nVersion 1, February 1989');
        assert.notEqual(data, 'GPL-1.0*');
        data = license('preGNU GENERAL PUBLIC LICENSE \nVersion 2, June 1991');
        assert.notEqual(data, 'GPL-2.0*');
        data = license('preGNU GENERAL PUBLIC LICENSE \nVersion 3, 29 June 2007');
        assert.notEqual(data, 'GPL-3.0*');
    });

    it('LGPL word check', function() {
        var data;
        data = license('GNU LIBRARY GENERAL PUBLIC LICENSE\nVersion 2, June 1991');
        assert.equal(data, 'LGPL-2.0*');
        data = license('GNU LESSER GENERAL PUBLIC LICENSE\nVersion 2.1, February 1999');
        assert.equal(data, 'LGPL-2.1*');
        data = license('GNU LESSER GENERAL PUBLIC LICENSE \nVersion 3, 29 June 2007');
        assert.equal(data, 'LGPL-3.0*');
    });

    it('BSD check', function() {
        var data = license('asdf\nRedistribution and use in source and binary forms, with or without\nasdf\n');
        assert.equal(data, 'BSD*');
    });

    it('BSD-Source-Code check', function() {
        var data = license('asdf\nRedistribution and use of this software in source and binary forms, with or without modification, are permitted provided that the following conditions are met:\nasdf\n');
        assert.equal(data, 'BSD-Source-Code*');
    });

    it('BSD word check', function() {
        var data = license('asdf\nasdf\nBSD\nasdf\n');
        assert.equal(data, 'BSD*');
    });
    
    it('Non-BSD word check', function() {
        var data = license('prefixBSD\n');
        assert.notEqual(data, 'BSD*');
    });

    it('Apache word check', function() {
        var data = license('asdf\nasdf\nApache License\nasdf\n');
        assert.equal(data, 'Apache*');
    });
    
    it('Non-Apache word check', function() {
        var data = license('prefixApache License\n');
        assert.notEqual(data, 'Apache*');
    });

    it('WTF check', function() {
        var data = license('DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE');
        assert.equal(data, 'WTFPL*');
    });

    it('WTF word check', function() {
        var data = license('asdf\nasdf\nWTFPL\nasdf\n');
        assert.equal(data, 'WTFPL*');
    });
    
    it('Non-WTF word check', function() {
        var data = license('prefixWTFPL\n');
        assert.notEqual(data, 'WTFPL*');
    });

    it('ISC check', function() {
        var data = license('asdfasdf\nThe ISC License\nasdfasdf');
        assert.equal(data, 'ISC*');
    });

    it('Non-ISC word check', function() {
        var data = license('prefixISC\n');
        assert.notEqual(data, 'ISC*');
    });

    it('ISC word check', function() {
        var data = license('asdf\nasdf\nISC\nasdf\n');
        assert.equal(data, 'ISC*');
    });

    it('CC0-1.0 word check', function() {
        var data = license('The person who associated a work with this deed has dedicated the work to the public domain by waiving all of his or her rights to the work worldwide under copyright law, including all related and neighboring rights, to the extent allowed by law.\n\nYou can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.\n');
        assert.equal(data, 'CC0-1.0*');
    });

    it('Public Domain check', function() {
        var data = license('Public Domain');
        assert.equal(data, 'Public Domain');
        data = license('public domain');
        assert.equal(data, 'Public Domain');
        data = license('Public domain');
        assert.equal(data, 'Public Domain');
    });

    it('License at URL check', function() {
        var data = license('http://example.com/foo');
        assert.equal(data, 'Custom: http://example.com/foo');
        data = license('See license at http://example.com/foo');
        assert.equal(data, 'Custom: http://example.com/foo');
        data = license('https://example.com/foo');
        assert.equal(data, 'Custom: https://example.com/foo');
    });

    it('License at file check', function() {
        var data = license('See license in LICENSE.md');
        assert.equal(data, 'Custom: LICENSE.md');
        data = license('SEE LICENSE IN LICENSE.md');
        assert.equal(data, 'Custom: LICENSE.md');
    });


    it('Check for null', function() {
        var data = license('this is empty, hi');
        assert.equal(data, null);
    });

    describe('SPDX licenses', function() {

        it('should parse a basic SPDX license', function() {
            var data = [
                'MIT',
                'LGPL-2.0',
                'Apache-2.0',
                'BSD-2-Clause'
            ];
            data.forEach(function(licenseType) {
                assert.equal(license(licenseType), licenseType);
            });
        });

        it('should parse more complicated license expressions', function() {
            var data = [
                '(GPL-2.0+ WITH Bison-exception-2.2)',
                'LGPL-2.0 OR (ISC AND BSD-3-Clause+)',
                'Apache-2.0 OR ISC OR MIT',
            ];
            data.forEach(function(licenseType) {
                assert.equal(license(licenseType), licenseType);
            });

        });

    });
});
