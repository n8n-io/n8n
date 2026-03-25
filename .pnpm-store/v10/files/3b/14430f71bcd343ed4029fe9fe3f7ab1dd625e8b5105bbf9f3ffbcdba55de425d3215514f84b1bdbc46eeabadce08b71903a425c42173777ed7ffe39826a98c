'use strict';

var encoding = require('../lib/encoding');

exports['General tests'] = {
    'From UTF-8 to Latin_1': function (test) {
        var input = 'ÕÄÖÜ',
            expected = Buffer.from([0xd5, 0xc4, 0xd6, 0xdc]);
        test.deepEqual(encoding.convert(input, 'latin1'), expected);
        test.done();
    },

    'From Latin_1 to UTF-8': function (test) {
        var input = Buffer.from([0xd5, 0xc4, 0xd6, 0xdc]),
            expected = 'ÕÄÖÜ';
        test.deepEqual(encoding.convert(input, 'utf-8', 'latin1').toString(), expected);
        test.done();
    },

    'From UTF-8 to UTF-8': function (test) {
        var input = 'ÕÄÖÜ',
            expected = Buffer.from('ÕÄÖÜ');
        test.deepEqual(encoding.convert(input, 'utf-8', 'utf-8'), expected);
        test.done();
    },

    'From Latin_13 to Latin_15': function (test) {
        var input = Buffer.from([0xd5, 0xc4, 0xd6, 0xdc, 0xd0]),
            expected = Buffer.from([0xd5, 0xc4, 0xd6, 0xdc, 0xa6]);
        test.deepEqual(encoding.convert(input, 'latin_15', 'latin13'), expected);
        test.done();
    }

    /*
    // ISO-2022-JP is not supported by iconv-lite
    "From ISO-2022-JP to UTF-8 with Iconv": function (test) {
        var input = Buffer.from(
            "GyRCM1g5OzU7PVEwdzgmPSQ4IUYkMnFKczlwGyhC",
            "base64"
        ),
        expected = Buffer.from(
            "5a2m5qCh5oqA6KGT5ZOh56CU5L+u5qSc6KiO5Lya5aCx5ZGK",
            "base64"
        );
        test.deepEqual(encoding.convert(input, "utf-8", "ISO-2022-JP"), expected);
        test.done();
    },
    */
};
