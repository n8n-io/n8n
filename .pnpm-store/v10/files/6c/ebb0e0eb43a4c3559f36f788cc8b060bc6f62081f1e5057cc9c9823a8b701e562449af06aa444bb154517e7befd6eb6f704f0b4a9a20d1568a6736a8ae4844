var tape = require("tape");

var pool = require("..");

if (typeof Uint8Array !== "undefined")
tape.test("pool", function(test) {

    var alloc = pool(function(size) { return new Uint8Array(size); }, Uint8Array.prototype.subarray);

    var buf1 = alloc(0);
    test.equal(buf1.length, 0, "should allocate a buffer of size 0");

    var buf2 = alloc(1);
    test.equal(buf2.length, 1, "should allocate a buffer of size 1 (initializes slab)");

    test.notEqual(buf2.buffer, buf1.buffer, "should not reference the same backing buffer if previous buffer had size 0");
    test.equal(buf2.byteOffset, 0, "should allocate at byteOffset 0 when using a new slab");

    buf1 = alloc(1);
    test.equal(buf1.buffer, buf2.buffer, "should reference the same backing buffer when allocating a chunk fitting into the slab");
    test.equal(buf1.byteOffset, 8, "should align slices to 32 bit and this allocate at byteOffset 8");

    var buf3 = alloc(4097);
    test.notEqual(buf3.buffer, buf2.buffer, "should not reference the same backing buffer when allocating a buffer larger than half the backing buffer's size");

    buf2 = alloc(4096);
    test.equal(buf2.buffer, buf1.buffer, "should reference the same backing buffer when allocating a buffer smaller or equal than half the backing buffer's size");

    buf1 = alloc(4096);
    test.notEqual(buf1.buffer, buf2.buffer, "should not reference the same backing buffer when the slab is exhausted (initializes new slab)");

    test.end();
});