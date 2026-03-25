# buffer-more-ints: Add support for more integer widths to Buffer

[![Build Status](https://travis-ci.org/dpw/node-buffer-more-ints.png)](https://travis-ci.org/dpw/node-buffer-more-ints)

Node's Buffer only supports reading and writing integers of a limited
range of widths.  This module provides support for more widths, so
that integers from 1 to 8 bytes (64 bits) can be accessed.  The
support takes two forms. Firstly, as stand-alone functions similar to
the integer reading/writing methods of Buffer:

    $ node
    > var moreints = require('buffer-more-ints')
    undefined
    > moreints.readInt64BE(new Buffer("0000deadbeef0000", "hex"), 0).toString(16)
    'deadbeef0000'

Read and write functions for the regular widths (8, 16, 32) are also
present in this module, for consistency.

The second form is methods patched into `Buffer.prototype`, installed
by requiring `'buffer-more-ints/polyfill'`:

    $ node
    > require('buffer-more-ints/polyfill')
    {}
    > new Buffer("0000deadbeef0000", "hex").readInt64BE(0).toString(16)
    'deadbeef0000'

buffer-more-ints/polyfill also adds methods `readIntBE`, `writeIntBE`,
and their LE and UInt counterparts, which take an initial argument
giving the width of the integer in bytes:

    > var b = new Buffer(3);
    > b.writeIntLE(3, -123456, 0);
    > b.toString('hex')
    'c01dfe'
    > b.readIntLE(3, 0);
    -123456

The functions added by buffer-more-ints are all implemented in terms
of the core Buffer functions.  Part way through writing the code, I
discovered that node.js currently implements those in JavaScript, so
this doesn't lead to performance benefits.  But should node ever
switch to implementing its Buffer operations natively, this
module should get a speed boost.

## Limitations

As JavaScript uses IEEE754 doubles for numbers, the contiguous range
of integers it can represent is [-2^53 - 1, 2^53 - 1].  So only
integer widths up to 6 bytes or 48 bits can be read exactly.  Reads of
7 or 8 bytes (56 or 64 bits) will return the closest value that can be
represented as a JavaScript number.

In certain situations it might be important to check that a JavaScript
number was read exactly.  The `isContiguousInt` or
`Buffer.isContiguousInt` (polyfill) function will determine this:

    > Buffer.isContiguousInt(0x1fffffffffffff);
    true
    > Buffer.isContiguousInt(0x20000000000000);
    false

And `assertContiguousInt` asserts that a number is so:

    > Buffer.assertContiguousInt(0x1fffffffffffff);
    undefined
    > Buffer.assertContiguousInt(0x20000000000000);
    AssertionError: number cannot be represented as a contiguous integer
