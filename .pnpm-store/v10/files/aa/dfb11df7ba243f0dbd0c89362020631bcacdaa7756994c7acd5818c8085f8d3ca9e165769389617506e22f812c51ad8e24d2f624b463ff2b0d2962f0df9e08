"use strict";

var float = require(".."),
    ieee754 = require("ieee754"),
    newSuite = require("./suite");

var F32 = Float32Array;
var F64 = Float64Array;
delete global.Float32Array;
delete global.Float64Array;
var floatFallback = float({});
global.Float32Array = F32;
global.Float64Array = F64;

var buf = new Buffer(8);

newSuite("writeFloat")
.add("float", function() {
    float.writeFloatLE(0.1, buf, 0);
})
.add("float (fallback)", function() {
    floatFallback.writeFloatLE(0.1, buf, 0);
})
.add("ieee754", function() {
    ieee754.write(buf, 0.1, 0, true, 23, 4);
})
.add("buffer", function() {
    buf.writeFloatLE(0.1, 0);
})
.add("buffer (noAssert)", function() {
    buf.writeFloatLE(0.1, 0, true);
})
.run();

newSuite("readFloat")
.add("float", function() {
    float.readFloatLE(buf, 0);
})
.add("float (fallback)", function() {
    floatFallback.readFloatLE(buf, 0);
})
.add("ieee754", function() {
    ieee754.read(buf, 0, true, 23, 4);
})
.add("buffer", function() {
    buf.readFloatLE(0);
})
.add("buffer (noAssert)", function() {
    buf.readFloatLE(0, true);
})
.run();

newSuite("writeDouble")
.add("float", function() {
    float.writeDoubleLE(0.1, buf, 0);
})
.add("float (fallback)", function() {
    floatFallback.writeDoubleLE(0.1, buf, 0);
})
.add("ieee754", function() {
    ieee754.write(buf, 0.1, 0, true, 52, 8);
})
.add("buffer", function() {
    buf.writeDoubleLE(0.1, 0);
})
.add("buffer (noAssert)", function() {
    buf.writeDoubleLE(0.1, 0, true);
})
.run();

newSuite("readDouble")
.add("float", function() {
    float.readDoubleLE(buf, 0);
})
.add("float (fallback)", function() {
    floatFallback.readDoubleLE(buf, 0);
})
.add("ieee754", function() {
    ieee754.read(buf, 0, true, 52, 8);
})
.add("buffer", function() {
    buf.readDoubleLE(0);
})
.add("buffer (noAssert)", function() {
    buf.readDoubleLE(0, true);
})
.run();
