/*!
 * qrcode.vue v3.8.0
 * A Vue.js component to generate QRCode. Both support Vue 2 and Vue 3
 * © 2017-PRESENT @scopewu(https://github.com/scopewu)
 * MIT License.
 */
import { defineComponent, h, ref, onMounted, watchEffect, Fragment, computed } from 'vue';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/*
 * QR Code generator library (TypeScript)
 *
 * Copyright (c) Project Nayuki. (MIT License)
 * https://www.nayuki.io/page/qr-code-generator-library
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 */
var qrcodegen;
(function (qrcodegen) {
    /*---- QR Code symbol class ----*/
    /*
     * A QR Code symbol, which is a type of two-dimension barcode.
     * Invented by Denso Wave and described in the ISO/IEC 18004 standard.
     * Instances of this class represent an immutable square grid of dark and light cells.
     * The class provides static factory functions to create a QR Code from text or binary data.
     * The class covers the QR Code Model 2 specification, supporting all versions (sizes)
     * from 1 to 40, all 4 error correction levels, and 4 character encoding modes.
     *
     * Ways to create a QR Code object:
     * - High level: Take the payload data and call QrCode.encodeText() or QrCode.encodeBinary().
     * - Mid level: Custom-make the list of segments and call QrCode.encodeSegments().
     * - Low level: Custom-make the array of data codeword bytes (including
     *   segment headers and final padding, excluding error correction codewords),
     *   supply the appropriate version number, and call the QrCode() constructor.
     * (Note that all ways require supplying the desired error correction level.)
     */
    var QrCode = /** @class */ (function () {
        /*-- Constructor (low level) and fields --*/
        // Creates a new QR Code with the given version number,
        // error correction level, data codeword bytes, and mask number.
        // This is a low-level API that most users should not use directly.
        // A mid-level API is the encodeSegments() function.
        function QrCode(
        // The version number of this QR Code, which is between 1 and 40 (inclusive).
        // This determines the size of this barcode.
        version, 
        // The error correction level used in this QR Code.
        errorCorrectionLevel, dataCodewords, msk) {
            this.version = version;
            this.errorCorrectionLevel = errorCorrectionLevel;
            // The modules of this QR Code (false = light, true = dark).
            // Immutable after constructor finishes. Accessed through getModule().
            this.modules = [];
            // Indicates function modules that are not subjected to masking. Discarded when constructor finishes.
            this.isFunction = [];
            // Check scalar arguments
            if (version < QrCode.MIN_VERSION || version > QrCode.MAX_VERSION)
                throw new RangeError("Version value out of range");
            if (msk < -1 || msk > 7)
                throw new RangeError("Mask value out of range");
            this.size = version * 4 + 17;
            // Initialize both grids to be size*size arrays of Boolean false
            var row = [];
            for (var i = 0; i < this.size; i++)
                row.push(false);
            for (var i = 0; i < this.size; i++) {
                this.modules.push(row.slice()); // Initially all light
                this.isFunction.push(row.slice());
            }
            // Compute ECC, draw modules
            this.drawFunctionPatterns();
            var allCodewords = this.addEccAndInterleave(dataCodewords);
            this.drawCodewords(allCodewords);
            // Do masking
            if (msk == -1) { // Automatically choose best mask
                var minPenalty = 1000000000;
                for (var i = 0; i < 8; i++) {
                    this.applyMask(i);
                    this.drawFormatBits(i);
                    var penalty = this.getPenaltyScore();
                    if (penalty < minPenalty) {
                        msk = i;
                        minPenalty = penalty;
                    }
                    this.applyMask(i); // Undoes the mask due to XOR
                }
            }
            assert(0 <= msk && msk <= 7);
            this.mask = msk;
            this.applyMask(msk); // Apply the final choice of mask
            this.drawFormatBits(msk); // Overwrite old format bits
            this.isFunction = [];
        }
        /*-- Static factory functions (high level) --*/
        // Returns a QR Code representing the given Unicode text string at the given error correction level.
        // As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
        // Unicode code points (not UTF-16 code units) if the low error correction level is used. The smallest possible
        // QR Code version is automatically chosen for the output. The ECC level of the result may be higher than the
        // ecl argument if it can be done without increasing the version.
        QrCode.encodeText = function (text, ecl) {
            var segs = qrcodegen.QrSegment.makeSegments(text);
            return QrCode.encodeSegments(segs, ecl);
        };
        // Returns a QR Code representing the given binary data at the given error correction level.
        // This function always encodes using the binary segment mode, not any text mode. The maximum number of
        // bytes allowed is 2953. The smallest possible QR Code version is automatically chosen for the output.
        // The ECC level of the result may be higher than the ecl argument if it can be done without increasing the version.
        QrCode.encodeBinary = function (data, ecl) {
            var seg = qrcodegen.QrSegment.makeBytes(data);
            return QrCode.encodeSegments([seg], ecl);
        };
        /*-- Static factory functions (mid level) --*/
        // Returns a QR Code representing the given segments with the given encoding parameters.
        // The smallest possible QR Code version within the given range is automatically
        // chosen for the output. Iff boostEcl is true, then the ECC level of the result
        // may be higher than the ecl argument if it can be done without increasing the
        // version. The mask number is either between 0 to 7 (inclusive) to force that
        // mask, or -1 to automatically choose an appropriate mask (which may be slow).
        // This function allows the user to create a custom sequence of segments that switches
        // between modes (such as alphanumeric and byte) to encode text in less space.
        // This is a mid-level API; the high-level API is encodeText() and encodeBinary().
        QrCode.encodeSegments = function (segs, ecl, minVersion, maxVersion, mask, boostEcl) {
            if (minVersion === void 0) { minVersion = 1; }
            if (maxVersion === void 0) { maxVersion = 40; }
            if (mask === void 0) { mask = -1; }
            if (boostEcl === void 0) { boostEcl = true; }
            if (!(QrCode.MIN_VERSION <= minVersion && minVersion <= maxVersion && maxVersion <= QrCode.MAX_VERSION)
                || mask < -1 || mask > 7)
                throw new RangeError("Invalid value");
            // Find the minimal version number to use
            var version;
            var dataUsedBits;
            for (version = minVersion;; version++) {
                var dataCapacityBits_1 = QrCode.getNumDataCodewords(version, ecl) * 8; // Number of data bits available
                var usedBits = QrSegment.getTotalBits(segs, version);
                if (usedBits <= dataCapacityBits_1) {
                    dataUsedBits = usedBits;
                    break; // This version number is found to be suitable
                }
                if (version >= maxVersion) // All versions in the range could not fit the given data
                    throw new RangeError("Data too long");
            }
            // Increase the error correction level while the data still fits in the current version number
            for (var _i = 0, _a = [QrCode.Ecc.MEDIUM, QrCode.Ecc.QUARTILE, QrCode.Ecc.HIGH]; _i < _a.length; _i++) { // From low to high
                var newEcl = _a[_i];
                if (boostEcl && dataUsedBits <= QrCode.getNumDataCodewords(version, newEcl) * 8)
                    ecl = newEcl;
            }
            // Concatenate all segments to create the data bit string
            var bb = [];
            for (var _b = 0, segs_1 = segs; _b < segs_1.length; _b++) {
                var seg = segs_1[_b];
                appendBits(seg.mode.modeBits, 4, bb);
                appendBits(seg.numChars, seg.mode.numCharCountBits(version), bb);
                for (var _c = 0, _d = seg.getData(); _c < _d.length; _c++) {
                    var b = _d[_c];
                    bb.push(b);
                }
            }
            assert(bb.length == dataUsedBits);
            // Add terminator and pad up to a byte if applicable
            var dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
            assert(bb.length <= dataCapacityBits);
            appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
            appendBits(0, (8 - bb.length % 8) % 8, bb);
            assert(bb.length % 8 == 0);
            // Pad with alternating bytes until data capacity is reached
            for (var padByte = 0xEC; bb.length < dataCapacityBits; padByte ^= 0xEC ^ 0x11)
                appendBits(padByte, 8, bb);
            // Pack bits into bytes in big endian
            var dataCodewords = [];
            while (dataCodewords.length * 8 < bb.length)
                dataCodewords.push(0);
            bb.forEach(function (b, i) {
                return dataCodewords[i >>> 3] |= b << (7 - (i & 7));
            });
            // Create the QR Code object
            return new QrCode(version, ecl, dataCodewords, mask);
        };
        /*-- Accessor methods --*/
        // Returns the color of the module (pixel) at the given coordinates, which is false
        // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
        // If the given coordinates are out of bounds, then false (light) is returned.
        QrCode.prototype.getModule = function (x, y) {
            return 0 <= x && x < this.size && 0 <= y && y < this.size && this.modules[y][x];
        };
        QrCode.prototype.getModules = function () {
            return this.modules;
        };
        /*-- Private helper methods for constructor: Drawing function modules --*/
        // Reads this object's version field, and draws and marks all function modules.
        QrCode.prototype.drawFunctionPatterns = function () {
            // Draw horizontal and vertical timing patterns
            for (var i = 0; i < this.size; i++) {
                this.setFunctionModule(6, i, i % 2 == 0);
                this.setFunctionModule(i, 6, i % 2 == 0);
            }
            // Draw 3 finder patterns (all corners except bottom right; overwrites some timing modules)
            this.drawFinderPattern(3, 3);
            this.drawFinderPattern(this.size - 4, 3);
            this.drawFinderPattern(3, this.size - 4);
            // Draw numerous alignment patterns
            var alignPatPos = this.getAlignmentPatternPositions();
            var numAlign = alignPatPos.length;
            for (var i = 0; i < numAlign; i++) {
                for (var j = 0; j < numAlign; j++) {
                    // Don't draw on the three finder corners
                    if (!(i == 0 && j == 0 || i == 0 && j == numAlign - 1 || i == numAlign - 1 && j == 0))
                        this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
                }
            }
            // Draw configuration data
            this.drawFormatBits(0); // Dummy mask value; overwritten later in the constructor
            this.drawVersion();
        };
        // Draws two copies of the format bits (with its own error correction code)
        // based on the given mask and this object's error correction level field.
        QrCode.prototype.drawFormatBits = function (mask) {
            // Calculate error correction code and pack bits
            var data = this.errorCorrectionLevel.formatBits << 3 | mask; // errCorrLvl is uint2, mask is uint3
            var rem = data;
            for (var i = 0; i < 10; i++)
                rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            var bits = (data << 10 | rem) ^ 0x5412; // uint15
            assert(bits >>> 15 == 0);
            // Draw first copy
            for (var i = 0; i <= 5; i++)
                this.setFunctionModule(8, i, getBit(bits, i));
            this.setFunctionModule(8, 7, getBit(bits, 6));
            this.setFunctionModule(8, 8, getBit(bits, 7));
            this.setFunctionModule(7, 8, getBit(bits, 8));
            for (var i = 9; i < 15; i++)
                this.setFunctionModule(14 - i, 8, getBit(bits, i));
            // Draw second copy
            for (var i = 0; i < 8; i++)
                this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
            for (var i = 8; i < 15; i++)
                this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
            this.setFunctionModule(8, this.size - 8, true); // Always dark
        };
        // Draws two copies of the version bits (with its own error correction code),
        // based on this object's version field, iff 7 <= version <= 40.
        QrCode.prototype.drawVersion = function () {
            if (this.version < 7)
                return;
            // Calculate error correction code and pack bits
            var rem = this.version; // version is uint6, in the range [7, 40]
            for (var i = 0; i < 12; i++)
                rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
            var bits = this.version << 12 | rem; // uint18
            assert(bits >>> 18 == 0);
            // Draw two copies
            for (var i = 0; i < 18; i++) {
                var color = getBit(bits, i);
                var a = this.size - 11 + i % 3;
                var b = Math.floor(i / 3);
                this.setFunctionModule(a, b, color);
                this.setFunctionModule(b, a, color);
            }
        };
        // Draws a 9*9 finder pattern including the border separator,
        // with the center module at (x, y). Modules can be out of bounds.
        QrCode.prototype.drawFinderPattern = function (x, y) {
            for (var dy = -4; dy <= 4; dy++) {
                for (var dx = -4; dx <= 4; dx++) {
                    var dist = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev/infinity norm
                    var xx = x + dx;
                    var yy = y + dy;
                    if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size)
                        this.setFunctionModule(xx, yy, dist != 2 && dist != 4);
                }
            }
        };
        // Draws a 5*5 alignment pattern, with the center module
        // at (x, y). All modules must be in bounds.
        QrCode.prototype.drawAlignmentPattern = function (x, y) {
            for (var dy = -2; dy <= 2; dy++) {
                for (var dx = -2; dx <= 2; dx++)
                    this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
            }
        };
        // Sets the color of a module and marks it as a function module.
        // Only used by the constructor. Coordinates must be in bounds.
        QrCode.prototype.setFunctionModule = function (x, y, isDark) {
            this.modules[y][x] = isDark;
            this.isFunction[y][x] = true;
        };
        /*-- Private helper methods for constructor: Codewords and masking --*/
        // Returns a new byte string representing the given data with the appropriate error correction
        // codewords appended to it, based on this object's version and error correction level.
        QrCode.prototype.addEccAndInterleave = function (data) {
            var ver = this.version;
            var ecl = this.errorCorrectionLevel;
            if (data.length != QrCode.getNumDataCodewords(ver, ecl))
                throw new RangeError("Invalid argument");
            // Calculate parameter numbers
            var numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
            var blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
            var rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
            var numShortBlocks = numBlocks - rawCodewords % numBlocks;
            var shortBlockLen = Math.floor(rawCodewords / numBlocks);
            // Split data into blocks and append ECC to each block
            var blocks = [];
            var rsDiv = QrCode.reedSolomonComputeDivisor(blockEccLen);
            for (var i = 0, k = 0; i < numBlocks; i++) {
                var dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
                k += dat.length;
                var ecc = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
                if (i < numShortBlocks)
                    dat.push(0);
                blocks.push(dat.concat(ecc));
            }
            // Interleave (not concatenate) the bytes from every block into a single sequence
            var result = [];
            var _loop_1 = function (i) {
                blocks.forEach(function (block, j) {
                    // Skip the padding byte in short blocks
                    if (i != shortBlockLen - blockEccLen || j >= numShortBlocks)
                        result.push(block[i]);
                });
            };
            for (var i = 0; i < blocks[0].length; i++) {
                _loop_1(i);
            }
            assert(result.length == rawCodewords);
            return result;
        };
        // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
        // data area of this QR Code. Function modules need to be marked off before this is called.
        QrCode.prototype.drawCodewords = function (data) {
            if (data.length != Math.floor(QrCode.getNumRawDataModules(this.version) / 8))
                throw new RangeError("Invalid argument");
            var i = 0; // Bit index into the data
            // Do the funny zigzag scan
            for (var right = this.size - 1; right >= 1; right -= 2) { // Index of right column in each column pair
                if (right == 6)
                    right = 5;
                for (var vert = 0; vert < this.size; vert++) { // Vertical counter
                    for (var j = 0; j < 2; j++) {
                        var x = right - j; // Actual x coordinate
                        var upward = ((right + 1) & 2) == 0;
                        var y = upward ? this.size - 1 - vert : vert; // Actual y coordinate
                        if (!this.isFunction[y][x] && i < data.length * 8) {
                            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
                            i++;
                        }
                        // If this QR Code has any remainder bits (0 to 7), they were assigned as
                        // 0/false/light by the constructor and are left unchanged by this method
                    }
                }
            }
            assert(i == data.length * 8);
        };
        // XORs the codeword modules in this QR Code with the given mask pattern.
        // The function modules must be marked and the codeword bits must be drawn
        // before masking. Due to the arithmetic of XOR, calling applyMask() with
        // the same mask value a second time will undo the mask. A final well-formed
        // QR Code needs exactly one (not zero, two, etc.) mask applied.
        QrCode.prototype.applyMask = function (mask) {
            if (mask < 0 || mask > 7)
                throw new RangeError("Mask value out of range");
            for (var y = 0; y < this.size; y++) {
                for (var x = 0; x < this.size; x++) {
                    var invert = void 0;
                    switch (mask) {
                        case 0:
                            invert = (x + y) % 2 == 0;
                            break;
                        case 1:
                            invert = y % 2 == 0;
                            break;
                        case 2:
                            invert = x % 3 == 0;
                            break;
                        case 3:
                            invert = (x + y) % 3 == 0;
                            break;
                        case 4:
                            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0;
                            break;
                        case 5:
                            invert = x * y % 2 + x * y % 3 == 0;
                            break;
                        case 6:
                            invert = (x * y % 2 + x * y % 3) % 2 == 0;
                            break;
                        case 7:
                            invert = ((x + y) % 2 + x * y % 3) % 2 == 0;
                            break;
                        default: throw new Error("Unreachable");
                    }
                    if (!this.isFunction[y][x] && invert)
                        this.modules[y][x] = !this.modules[y][x];
                }
            }
        };
        // Calculates and returns the penalty score based on state of this QR Code's current modules.
        // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
        QrCode.prototype.getPenaltyScore = function () {
            var result = 0;
            // Adjacent modules in row having same color, and finder-like patterns
            for (var y = 0; y < this.size; y++) {
                var runColor = false;
                var runX = 0;
                var runHistory = [0, 0, 0, 0, 0, 0, 0];
                for (var x = 0; x < this.size; x++) {
                    if (this.modules[y][x] == runColor) {
                        runX++;
                        if (runX == 5)
                            result += QrCode.PENALTY_N1;
                        else if (runX > 5)
                            result++;
                    }
                    else {
                        this.finderPenaltyAddHistory(runX, runHistory);
                        if (!runColor)
                            result += this.finderPenaltyCountPatterns(runHistory) * QrCode.PENALTY_N3;
                        runColor = this.modules[y][x];
                        runX = 1;
                    }
                }
                result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * QrCode.PENALTY_N3;
            }
            // Adjacent modules in column having same color, and finder-like patterns
            for (var x = 0; x < this.size; x++) {
                var runColor = false;
                var runY = 0;
                var runHistory = [0, 0, 0, 0, 0, 0, 0];
                for (var y = 0; y < this.size; y++) {
                    if (this.modules[y][x] == runColor) {
                        runY++;
                        if (runY == 5)
                            result += QrCode.PENALTY_N1;
                        else if (runY > 5)
                            result++;
                    }
                    else {
                        this.finderPenaltyAddHistory(runY, runHistory);
                        if (!runColor)
                            result += this.finderPenaltyCountPatterns(runHistory) * QrCode.PENALTY_N3;
                        runColor = this.modules[y][x];
                        runY = 1;
                    }
                }
                result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * QrCode.PENALTY_N3;
            }
            // 2*2 blocks of modules having same color
            for (var y = 0; y < this.size - 1; y++) {
                for (var x = 0; x < this.size - 1; x++) {
                    var color = this.modules[y][x];
                    if (color == this.modules[y][x + 1] &&
                        color == this.modules[y + 1][x] &&
                        color == this.modules[y + 1][x + 1])
                        result += QrCode.PENALTY_N2;
                }
            }
            // Balance of dark and light modules
            var dark = 0;
            for (var _i = 0, _a = this.modules; _i < _a.length; _i++) {
                var row = _a[_i];
                dark = row.reduce(function (sum, color) { return sum + (color ? 1 : 0); }, dark);
            }
            var total = this.size * this.size; // Note that size is odd, so dark/total != 1/2
            // Compute the smallest integer k >= 0 such that (45-5k)% <= dark/total <= (55+5k)%
            var k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
            assert(0 <= k && k <= 9);
            result += k * QrCode.PENALTY_N4;
            assert(0 <= result && result <= 2568888); // Non-tight upper bound based on default values of PENALTY_N1, ..., N4
            return result;
        };
        /*-- Private helper functions --*/
        // Returns an ascending list of positions of alignment patterns for this version number.
        // Each position is in the range [0,177), and are used on both the x and y axes.
        // This could be implemented as lookup table of 40 variable-length lists of integers.
        QrCode.prototype.getAlignmentPatternPositions = function () {
            if (this.version == 1)
                return [];
            else {
                var numAlign = Math.floor(this.version / 7) + 2;
                var step = Math.floor((this.version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
                var result = [6];
                for (var pos = this.size - 7; result.length < numAlign; pos -= step)
                    result.splice(1, 0, pos);
                return result;
            }
        };
        // Returns the number of data bits that can be stored in a QR Code of the given version number, after
        // all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
        // The result is in the range [208, 29648]. This could be implemented as a 40-entry lookup table.
        QrCode.getNumRawDataModules = function (ver) {
            if (ver < QrCode.MIN_VERSION || ver > QrCode.MAX_VERSION)
                throw new RangeError("Version number out of range");
            var result = (16 * ver + 128) * ver + 64;
            if (ver >= 2) {
                var numAlign = Math.floor(ver / 7) + 2;
                result -= (25 * numAlign - 10) * numAlign - 55;
                if (ver >= 7)
                    result -= 36;
            }
            assert(208 <= result && result <= 29648);
            return result;
        };
        // Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
        // QR Code of the given version number and error correction level, with remainder bits discarded.
        // This stateless pure function could be implemented as a (40*4)-cell lookup table.
        QrCode.getNumDataCodewords = function (ver, ecl) {
            return Math.floor(QrCode.getNumRawDataModules(ver) / 8) -
                QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] *
                    QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
        };
        // Returns a Reed-Solomon ECC generator polynomial for the given degree. This could be
        // implemented as a lookup table over all possible parameter values, instead of as an algorithm.
        QrCode.reedSolomonComputeDivisor = function (degree) {
            if (degree < 1 || degree > 255)
                throw new RangeError("Degree out of range");
            // Polynomial coefficients are stored from highest to lowest power, excluding the leading term which is always 1.
            // For example the polynomial x^3 + 255x^2 + 8x + 93 is stored as the uint8 array [255, 8, 93].
            var result = [];
            for (var i = 0; i < degree - 1; i++)
                result.push(0);
            result.push(1); // Start off with the monomial x^0
            // Compute the product polynomial (x - r^0) * (x - r^1) * (x - r^2) * ... * (x - r^{degree-1}),
            // and drop the highest monomial term which is always 1x^degree.
            // Note that r = 0x02, which is a generator element of this field GF(2^8/0x11D).
            var root = 1;
            for (var i = 0; i < degree; i++) {
                // Multiply the current product by (x - r^i)
                for (var j = 0; j < result.length; j++) {
                    result[j] = QrCode.reedSolomonMultiply(result[j], root);
                    if (j + 1 < result.length)
                        result[j] ^= result[j + 1];
                }
                root = QrCode.reedSolomonMultiply(root, 0x02);
            }
            return result;
        };
        // Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
        QrCode.reedSolomonComputeRemainder = function (data, divisor) {
            var result = divisor.map(function (_) { return 0; });
            var _loop_2 = function (b) {
                var factor = b ^ result.shift();
                result.push(0);
                divisor.forEach(function (coef, i) {
                    return result[i] ^= QrCode.reedSolomonMultiply(coef, factor);
                });
            };
            for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                var b = data_1[_i];
                _loop_2(b);
            }
            return result;
        };
        // Returns the product of the two given field elements modulo GF(2^8/0x11D). The arguments and result
        // are unsigned 8-bit integers. This could be implemented as a lookup table of 256*256 entries of uint8.
        QrCode.reedSolomonMultiply = function (x, y) {
            if (x >>> 8 != 0 || y >>> 8 != 0)
                throw new RangeError("Byte out of range");
            // Russian peasant multiplication
            var z = 0;
            for (var i = 7; i >= 0; i--) {
                z = (z << 1) ^ ((z >>> 7) * 0x11D);
                z ^= ((y >>> i) & 1) * x;
            }
            assert(z >>> 8 == 0);
            return z;
        };
        // Can only be called immediately after a light run is added, and
        // returns either 0, 1, or 2. A helper function for getPenaltyScore().
        QrCode.prototype.finderPenaltyCountPatterns = function (runHistory) {
            var n = runHistory[1];
            assert(n <= this.size * 3);
            var core = n > 0 && runHistory[2] == n && runHistory[3] == n * 3 && runHistory[4] == n && runHistory[5] == n;
            return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0)
                + (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
        };
        // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
        QrCode.prototype.finderPenaltyTerminateAndCount = function (currentRunColor, currentRunLength, runHistory) {
            if (currentRunColor) { // Terminate dark run
                this.finderPenaltyAddHistory(currentRunLength, runHistory);
                currentRunLength = 0;
            }
            currentRunLength += this.size; // Add light border to final run
            this.finderPenaltyAddHistory(currentRunLength, runHistory);
            return this.finderPenaltyCountPatterns(runHistory);
        };
        // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
        QrCode.prototype.finderPenaltyAddHistory = function (currentRunLength, runHistory) {
            if (runHistory[0] == 0)
                currentRunLength += this.size; // Add light border to initial run
            runHistory.pop();
            runHistory.unshift(currentRunLength);
        };
        /*-- Constants and tables --*/
        // The minimum version number supported in the QR Code Model 2 standard.
        QrCode.MIN_VERSION = 1;
        // The maximum version number supported in the QR Code Model 2 standard.
        QrCode.MAX_VERSION = 40;
        // For use in getPenaltyScore(), when evaluating which mask is best.
        QrCode.PENALTY_N1 = 3;
        QrCode.PENALTY_N2 = 3;
        QrCode.PENALTY_N3 = 40;
        QrCode.PENALTY_N4 = 10;
        QrCode.ECC_CODEWORDS_PER_BLOCK = [
            // Version: (note that index 0 is for padding, and is set to an illegal value)
            //0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
            [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Low
            [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28], // Medium
            [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Quartile
            [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // High
        ];
        QrCode.NUM_ERROR_CORRECTION_BLOCKS = [
            // Version: (note that index 0 is for padding, and is set to an illegal value)
            //0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
            [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25], // Low
            [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49], // Medium
            [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68], // Quartile
            [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81], // High
        ];
        return QrCode;
    }());
    qrcodegen.QrCode = QrCode;
    // Appends the given number of low-order bits of the given value
    // to the given buffer. Requires 0 <= len <= 31 and 0 <= val < 2^len.
    function appendBits(val, len, bb) {
        if (len < 0 || len > 31 || val >>> len != 0)
            throw new RangeError("Value out of range");
        for (var i = len - 1; i >= 0; i--) // Append bit by bit
            bb.push((val >>> i) & 1);
    }
    // Returns true iff the i'th bit of x is set to 1.
    function getBit(x, i) {
        return ((x >>> i) & 1) != 0;
    }
    // Throws an exception if the given condition is false.
    function assert(cond) {
        if (!cond)
            throw new Error("Assertion error");
    }
    /*---- Data segment class ----*/
    /*
     * A segment of character/binary/control data in a QR Code symbol.
     * Instances of this class are immutable.
     * The mid-level way to create a segment is to take the payload data
     * and call a static factory function such as QrSegment.makeNumeric().
     * The low-level way to create a segment is to custom-make the bit buffer
     * and call the QrSegment() constructor with appropriate values.
     * This segment class imposes no length restrictions, but QR Codes have restrictions.
     * Even in the most favorable conditions, a QR Code can only hold 7089 characters of data.
     * Any segment longer than this is meaningless for the purpose of generating QR Codes.
     */
    var QrSegment = /** @class */ (function () {
        /*-- Constructor (low level) and fields --*/
        // Creates a new QR Code segment with the given attributes and data.
        // The character count (numChars) must agree with the mode and the bit buffer length,
        // but the constraint isn't checked. The given bit buffer is cloned and stored.
        function QrSegment(
        // The mode indicator of this segment.
        mode, 
        // The length of this segment's unencoded data. Measured in characters for
        // numeric/alphanumeric/kanji mode, bytes for byte mode, and 0 for ECI mode.
        // Always zero or positive. Not the same as the data's bit length.
        numChars, 
        // The data bits of this segment. Accessed through getData().
        bitData) {
            this.mode = mode;
            this.numChars = numChars;
            this.bitData = bitData;
            if (numChars < 0)
                throw new RangeError("Invalid argument");
            this.bitData = bitData.slice(); // Make defensive copy
        }
        /*-- Static factory functions (mid level) --*/
        // Returns a segment representing the given binary data encoded in
        // byte mode. All input byte arrays are acceptable. Any text string
        // can be converted to UTF-8 bytes and encoded as a byte mode segment.
        QrSegment.makeBytes = function (data) {
            var bb = [];
            for (var _i = 0, data_2 = data; _i < data_2.length; _i++) {
                var b = data_2[_i];
                appendBits(b, 8, bb);
            }
            return new QrSegment(QrSegment.Mode.BYTE, data.length, bb);
        };
        // Returns a segment representing the given string of decimal digits encoded in numeric mode.
        QrSegment.makeNumeric = function (digits) {
            if (!QrSegment.isNumeric(digits))
                throw new RangeError("String contains non-numeric characters");
            var bb = [];
            for (var i = 0; i < digits.length;) { // Consume up to 3 digits per iteration
                var n = Math.min(digits.length - i, 3);
                appendBits(parseInt(digits.substring(i, i + n), 10), n * 3 + 1, bb);
                i += n;
            }
            return new QrSegment(QrSegment.Mode.NUMERIC, digits.length, bb);
        };
        // Returns a segment representing the given text string encoded in alphanumeric mode.
        // The characters allowed are: 0 to 9, A to Z (uppercase only), space,
        // dollar, percent, asterisk, plus, hyphen, period, slash, colon.
        QrSegment.makeAlphanumeric = function (text) {
            if (!QrSegment.isAlphanumeric(text))
                throw new RangeError("String contains unencodable characters in alphanumeric mode");
            var bb = [];
            var i;
            for (i = 0; i + 2 <= text.length; i += 2) { // Process groups of 2
                var temp = QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) * 45;
                temp += QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i + 1));
                appendBits(temp, 11, bb);
            }
            if (i < text.length) // 1 character remaining
                appendBits(QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)), 6, bb);
            return new QrSegment(QrSegment.Mode.ALPHANUMERIC, text.length, bb);
        };
        // Returns a new mutable list of zero or more segments to represent the given Unicode text string.
        // The result may use various segment modes and switch modes to optimize the length of the bit stream.
        QrSegment.makeSegments = function (text) {
            // Select the most efficient segment encoding automatically
            if (text == "")
                return [];
            else if (QrSegment.isNumeric(text))
                return [QrSegment.makeNumeric(text)];
            else if (QrSegment.isAlphanumeric(text))
                return [QrSegment.makeAlphanumeric(text)];
            else
                return [QrSegment.makeBytes(QrSegment.toUtf8ByteArray(text))];
        };
        // Returns a segment representing an Extended Channel Interpretation
        // (ECI) designator with the given assignment value.
        QrSegment.makeEci = function (assignVal) {
            var bb = [];
            if (assignVal < 0)
                throw new RangeError("ECI assignment value out of range");
            else if (assignVal < (1 << 7))
                appendBits(assignVal, 8, bb);
            else if (assignVal < (1 << 14)) {
                appendBits(2, 2, bb);
                appendBits(assignVal, 14, bb);
            }
            else if (assignVal < 1000000) {
                appendBits(6, 3, bb);
                appendBits(assignVal, 21, bb);
            }
            else
                throw new RangeError("ECI assignment value out of range");
            return new QrSegment(QrSegment.Mode.ECI, 0, bb);
        };
        // Tests whether the given string can be encoded as a segment in numeric mode.
        // A string is encodable iff each character is in the range 0 to 9.
        QrSegment.isNumeric = function (text) {
            return QrSegment.NUMERIC_REGEX.test(text);
        };
        // Tests whether the given string can be encoded as a segment in alphanumeric mode.
        // A string is encodable iff each character is in the following set: 0 to 9, A to Z
        // (uppercase only), space, dollar, percent, asterisk, plus, hyphen, period, slash, colon.
        QrSegment.isAlphanumeric = function (text) {
            return QrSegment.ALPHANUMERIC_REGEX.test(text);
        };
        /*-- Methods --*/
        // Returns a new copy of the data bits of this segment.
        QrSegment.prototype.getData = function () {
            return this.bitData.slice(); // Make defensive copy
        };
        // (Package-private) Calculates and returns the number of bits needed to encode the given segments at
        // the given version. The result is infinity if a segment has too many characters to fit its length field.
        QrSegment.getTotalBits = function (segs, version) {
            var result = 0;
            for (var _i = 0, segs_2 = segs; _i < segs_2.length; _i++) {
                var seg = segs_2[_i];
                var ccbits = seg.mode.numCharCountBits(version);
                if (seg.numChars >= (1 << ccbits))
                    return Infinity; // The segment's length doesn't fit the field's bit width
                result += 4 + ccbits + seg.bitData.length;
            }
            return result;
        };
        // Returns a new array of bytes representing the given string encoded in UTF-8.
        QrSegment.toUtf8ByteArray = function (str) {
            str = encodeURI(str);
            var result = [];
            for (var i = 0; i < str.length; i++) {
                if (str.charAt(i) != "%")
                    result.push(str.charCodeAt(i));
                else {
                    result.push(parseInt(str.substring(i + 1, i + 3), 16));
                    i += 2;
                }
            }
            return result;
        };
        /*-- Constants --*/
        // Describes precisely all strings that are encodable in numeric mode.
        QrSegment.NUMERIC_REGEX = /^[0-9]*$/;
        // Describes precisely all strings that are encodable in alphanumeric mode.
        QrSegment.ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/;
        // The set of all legal characters in alphanumeric mode,
        // where each character value maps to the index in the string.
        QrSegment.ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
        return QrSegment;
    }());
    qrcodegen.QrSegment = QrSegment;
})(qrcodegen || (qrcodegen = {}));
/*---- Public helper enumeration ----*/
(function (qrcodegen) {
    (function (QrCode) {
        /*
         * The error correction level in a QR Code symbol. Immutable.
         */
        var Ecc = /** @class */ (function () {
            /*-- Constructor and fields --*/
            function Ecc(
            // In the range 0 to 3 (unsigned 2-bit integer).
            ordinal, 
            // (Package-private) In the range 0 to 3 (unsigned 2-bit integer).
            formatBits) {
                this.ordinal = ordinal;
                this.formatBits = formatBits;
            }
            /*-- Constants --*/
            Ecc.LOW = new Ecc(0, 1); // The QR Code can tolerate about  7% erroneous codewords
            Ecc.MEDIUM = new Ecc(1, 0); // The QR Code can tolerate about 15% erroneous codewords
            Ecc.QUARTILE = new Ecc(2, 3); // The QR Code can tolerate about 25% erroneous codewords
            Ecc.HIGH = new Ecc(3, 2); // The QR Code can tolerate about 30% erroneous codewords
            return Ecc;
        }());
        QrCode.Ecc = Ecc;
    })(qrcodegen.QrCode || (qrcodegen.QrCode = {}));
})(qrcodegen || (qrcodegen = {}));
/*---- Public helper enumeration ----*/
(function (qrcodegen) {
    (function (QrSegment) {
        /*
         * Describes how a segment's data bits are interpreted. Immutable.
         */
        var Mode = /** @class */ (function () {
            /*-- Constructor and fields --*/
            function Mode(
            // The mode indicator bits, which is a uint4 value (range 0 to 15).
            modeBits, 
            // Number of character count bits for three different version ranges.
            numBitsCharCount) {
                this.modeBits = modeBits;
                this.numBitsCharCount = numBitsCharCount;
            }
            /*-- Method --*/
            // (Package-private) Returns the bit width of the character count field for a segment in
            // this mode in a QR Code at the given version number. The result is in the range [0, 16].
            Mode.prototype.numCharCountBits = function (ver) {
                return this.numBitsCharCount[Math.floor((ver + 7) / 17)];
            };
            /*-- Constants --*/
            Mode.NUMERIC = new Mode(0x1, [10, 12, 14]);
            Mode.ALPHANUMERIC = new Mode(0x2, [9, 11, 13]);
            Mode.BYTE = new Mode(0x4, [8, 16, 16]);
            Mode.KANJI = new Mode(0x8, [8, 10, 12]);
            Mode.ECI = new Mode(0x7, [0, 0, 0]);
            return Mode;
        }());
        QrSegment.Mode = Mode;
    })(qrcodegen.QrSegment || (qrcodegen.QrSegment = {}));
})(qrcodegen || (qrcodegen = {}));
var QR = qrcodegen;

var defaultErrorCorrectLevel = 'L';
var DEFAULT_QR_SIZE = 100;
var DEFAULT_MARGIN = 0;
var DEFAULT_IMAGE_SIZE_RATIO = 0.1;
var IMAGE_EXCAVATE_THICKNESS = 2;
var ErrorCorrectLevelMap = {
    L: QR.QrCode.Ecc.LOW,
    M: QR.QrCode.Ecc.MEDIUM,
    Q: QR.QrCode.Ecc.QUARTILE,
    H: QR.QrCode.Ecc.HIGH,
};
// Thanks the `qrcode.react`
var SUPPORTS_PATH2D = (function () {
    try {
        new Path2D().addPath(new Path2D());
    }
    catch (e) {
        return false;
    }
    return true;
})();
function validErrorCorrectLevel(level) {
    return level in ErrorCorrectLevelMap;
}
function generatePath(modules, margin) {
    if (margin === void 0) { margin = 0; }
    var path = '';
    modules.forEach(function (row, y) {
        var start = null;
        row.forEach(function (cell, x) {
            if (!cell && start !== null) {
                // M0 0h7v1H0z injects the space with the move and drops the comma,
                // saving a char per operation
                path += "M".concat(start + margin, " ").concat(y + margin, "h").concat(x - start, "v1H").concat(start + margin, "z");
                start = null;
                return;
            }
            // end of row, clean up or skip
            if (x === row.length - 1) {
                if (!cell) {
                    // We would have closed the op above already so this can only mean
                    // 2+ light modules in a row.
                    return;
                }
                if (start === null) {
                    // Just a single dark module.
                    path += "M".concat(x + margin, ",").concat(y + margin, " h1v1H").concat(x + margin, "z");
                }
                else {
                    // Otherwise finish the current line.
                    path += "M".concat(start + margin, ",").concat(y + margin, " h").concat(x + 1 - start, "v1H").concat(start + margin, "z");
                }
                return;
            }
            if (cell && start === null) {
                start = x;
            }
        });
    });
    return path;
}
function getImageSettings(cells, size, margin, imageSettings) {
    var width = imageSettings.width, height = imageSettings.height, imageX = imageSettings.x, imageY = imageSettings.y;
    var numCells = cells.length + margin * 2;
    var defaultSize = Math.floor(size * DEFAULT_IMAGE_SIZE_RATIO);
    var scale = numCells / size;
    var w = (width || defaultSize) * scale;
    var h = (height || defaultSize) * scale;
    var x = imageX == null ? cells.length / 2 - w / 2 : imageX * scale;
    var y = imageY == null ? cells.length / 2 - h / 2 : imageY * scale;
    var borderRadius = (imageSettings.borderRadius || 0) * scale;
    var excavation = null;
    if (imageSettings.excavate) {
        var floorX = Math.floor(x);
        var floorY = Math.floor(y);
        var ceilW = Math.ceil(w + x - floorX);
        var ceilH = Math.ceil(h + y - floorY);
        excavation = { x: floorX, y: floorY, w: ceilW, h: ceilH };
    }
    return { x: x, y: y, h: h, w: w, borderRadius: borderRadius, excavation: excavation };
}
function useQRCode(props) {
    var margin = computed(function () { var _a; return ((_a = props.margin) !== null && _a !== void 0 ? _a : DEFAULT_MARGIN) >>> 0; });
    var cells = computed(function () {
        var level = validErrorCorrectLevel(props.level) ? props.level : defaultErrorCorrectLevel;
        return QR.QrCode.encodeText(props.value, ErrorCorrectLevelMap[level]).getModules();
    });
    var numCells = computed(function () { return cells.value.length + margin.value * 2; });
    var fgPath = computed(function () { return generatePath(cells.value, margin.value); });
    var imageProps = computed(function () {
        if (!props.imageSettings.src) {
            return { x: 0, y: 0, width: 0, height: 0, borderRadius: 0 };
        }
        var settings = getImageSettings(cells.value, props.size, margin.value, props.imageSettings);
        return {
            x: settings.x + margin.value,
            y: settings.y + margin.value,
            width: settings.w,
            height: settings.h,
            borderRadius: settings.borderRadius,
        };
    });
    var imageBorderProps = computed(function () {
        if (!props.imageSettings.excavate || !props.imageSettings.src)
            return null;
        var borderThickness = IMAGE_EXCAVATE_THICKNESS / (props.size / numCells.value);
        return {
            x: imageProps.value.x - borderThickness,
            y: imageProps.value.y - borderThickness,
            width: imageProps.value.width + borderThickness * 2,
            height: imageProps.value.height + borderThickness * 2,
            borderRadius: imageProps.value.borderRadius,
        };
    });
    return { margin: margin, numCells: numCells, cells: cells, fgPath: fgPath, imageProps: imageProps, imageBorderProps: imageBorderProps };
}
var QRCodeProps = {
    value: {
        type: String,
        required: true,
        default: '',
    },
    size: {
        type: Number,
        default: DEFAULT_QR_SIZE,
    },
    level: {
        type: String,
        default: defaultErrorCorrectLevel,
        validator: function (l) { return validErrorCorrectLevel(l); },
    },
    background: {
        type: String,
        default: '#fff',
    },
    foreground: {
        type: String,
        default: '#000',
    },
    margin: {
        type: Number,
        required: false,
        default: DEFAULT_MARGIN,
    },
    imageSettings: {
        type: Object,
        required: false,
        default: function () { return ({}); },
    },
    gradient: {
        type: Boolean,
        required: false,
        default: false,
    },
    gradientType: {
        type: String,
        required: false,
        default: 'linear',
        validator: function (t) { return ['linear', 'radial'].indexOf(t) > -1; },
    },
    gradientStartColor: {
        type: String,
        required: false,
        default: '#000',
    },
    gradientEndColor: {
        type: String,
        required: false,
        default: '#fff',
    },
};
var QRCodeVueProps = __assign(__assign({}, QRCodeProps), { renderAs: {
        type: String,
        required: false,
        default: 'canvas',
        validator: function (as) { return ['canvas', 'svg'].indexOf(as) > -1; },
    } });
var QrcodeSvg = defineComponent({
    name: 'QRCodeSvg',
    props: QRCodeProps,
    setup: function (props) {
        var _a = useQRCode(props), numCells = _a.numCells, fgPath = _a.fgPath, imageProps = _a.imageProps, imageBorderProps = _a.imageBorderProps;
        var qrGradientId = 'qrcode.vue-gradient';
        var renderGradient = function () {
            if (!props.gradient)
                return null;
            var gradientProps = props.gradientType === 'linear'
                ? {
                    x1: '0%',
                    y1: '0%',
                    x2: '100%',
                    y2: '100%',
                }
                : {
                    cx: '50%',
                    cy: '50%',
                    r: '50%',
                    fx: '50%',
                    fy: '50%',
                };
            return h(props.gradientType === 'linear' ? 'linearGradient' : 'radialGradient', __assign({ id: qrGradientId }, gradientProps), [
                h('stop', {
                    offset: '0%',
                    style: { stopColor: props.gradientStartColor },
                }),
                h('stop', {
                    offset: '100%',
                    style: { stopColor: props.gradientEndColor },
                }),
            ]);
        };
        var qrLogoClipPathId = 'qrcode.vue-logo-clip-path';
        var renderClipPath = function () {
            var borderRadius = imageProps.value.borderRadius;
            if (!props.imageSettings.src)
                return null;
            if (borderRadius <= 0)
                return null;
            return h('clipPath', { id: qrLogoClipPathId }, [
                h('rect', {
                    x: imageProps.value.x,
                    y: imageProps.value.y,
                    width: imageProps.value.width,
                    height: imageProps.value.height,
                    rx: borderRadius,
                    ry: borderRadius,
                }),
            ]);
        };
        return function () { return h('svg', {
            width: props.size,
            height: props.size,
            'shape-rendering': "crispEdges",
            xmlns: 'http://www.w3.org/2000/svg',
            viewBox: "0 0 ".concat(numCells.value, " ").concat(numCells.value),
        }, [
            h('defs', {}, [renderGradient(), renderClipPath()]),
            h('rect', {
                width: '100%',
                height: '100%',
                fill: props.background,
            }),
            h('path', {
                fill: props.gradient ? "url(#".concat(qrGradientId, ")") : props.foreground,
                d: fgPath.value,
            }),
            imageBorderProps.value && h('rect', {
                x: imageBorderProps.value.x,
                y: imageBorderProps.value.y,
                width: imageBorderProps.value.width,
                height: imageBorderProps.value.height,
                fill: props.background,
                rx: imageBorderProps.value.borderRadius,
                ry: imageBorderProps.value.borderRadius,
            }),
            props.imageSettings.src && h('image', __assign(__assign({ href: props.imageSettings.src }, imageProps.value), (imageProps.value.borderRadius > 0 ? { 'clip-path': "url(#".concat(qrLogoClipPathId, ")") } : {}))),
        ]); };
    },
});
var QrcodeCanvas = defineComponent({
    name: 'QRCodeCanvas',
    props: QRCodeProps,
    setup: function (props, ctx) {
        var _a = useQRCode(props), margin = _a.margin, cells = _a.cells, numCells = _a.numCells, imageProps = _a.imageProps, imageBorderProps = _a.imageBorderProps;
        var canvasEl = ref(null);
        var imageRef = ref(null);
        var generate = function () {
            var size = props.size, background = props.background, foreground = props.foreground, gradient = props.gradient, gradientType = props.gradientType, gradientStartColor = props.gradientStartColor, gradientEndColor = props.gradientEndColor;
            var canvas = canvasEl.value;
            if (!canvas) {
                return;
            }
            var canvasCtx = canvas.getContext('2d');
            if (!canvasCtx) {
                return;
            }
            var qrCells = cells.value;
            var image = imageRef.value;
            var devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
            var scale = (size / numCells.value) * devicePixelRatio;
            canvas.height = canvas.width = size * devicePixelRatio;
            canvasCtx.scale(scale, scale);
            canvasCtx.fillStyle = background;
            canvasCtx.fillRect(0, 0, numCells.value, numCells.value);
            if (gradient) {
                var grad = void 0;
                if (gradientType === 'linear') {
                    grad = canvasCtx.createLinearGradient(0, 0, numCells.value, numCells.value);
                }
                else {
                    grad = canvasCtx.createRadialGradient(numCells.value / 2, numCells.value / 2, 0, numCells.value / 2, numCells.value / 2, numCells.value / 2);
                }
                grad.addColorStop(0, gradientStartColor);
                grad.addColorStop(1, gradientEndColor);
                canvasCtx.fillStyle = grad;
            }
            else {
                canvasCtx.fillStyle = foreground;
            }
            if (SUPPORTS_PATH2D) {
                canvasCtx.fill(new Path2D(generatePath(qrCells, margin.value)));
            }
            else {
                qrCells.forEach(function (row, rdx) {
                    row.forEach(function (cell, cdx) {
                        if (cell) {
                            canvasCtx.fillRect(cdx + margin.value, rdx + margin.value, 1, 1);
                        }
                    });
                });
            }
            var showImage = props.imageSettings.src && image && image.naturalWidth !== 0 && image.naturalHeight !== 0;
            if (showImage) {
                var drawRoundedRect = function (ctx, x, y, width, height, radius) {
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(x, y, width, height, radius);
                    }
                    else {
                        ctx.rect(x, y, width, height);
                    }
                };
                if (imageBorderProps.value) {
                    var imageBorder = imageBorderProps.value;
                    canvasCtx.fillStyle = props.background;
                    drawRoundedRect(canvasCtx, imageBorder.x, imageBorder.y, imageBorder.width, imageBorder.height, imageBorder.borderRadius);
                    canvasCtx.fill();
                }
                var borderRadius = imageProps.value.borderRadius;
                if (borderRadius > 0) {
                    canvasCtx.save();
                    drawRoundedRect(canvasCtx, imageProps.value.x, imageProps.value.y, imageProps.value.width, imageProps.value.height, borderRadius);
                    canvasCtx.clip();
                    canvasCtx.drawImage(image, imageProps.value.x, imageProps.value.y, imageProps.value.width, imageProps.value.height);
                    canvasCtx.restore();
                }
                else {
                    canvasCtx.drawImage(image, imageProps.value.x, imageProps.value.y, imageProps.value.width, imageProps.value.height);
                }
            }
        };
        onMounted(generate);
        watchEffect(generate);
        var style = ctx.attrs.style;
        return function () { return h(Fragment, [
            h('canvas', __assign(__assign({}, ctx.attrs), { ref: canvasEl, style: __assign(__assign({}, style), { width: "".concat(props.size, "px"), height: "".concat(props.size, "px") }) })),
            props.imageSettings.src && h('img', {
                ref: imageRef,
                src: props.imageSettings.src,
                style: { display: 'none' },
                onLoad: generate,
            })
        ]); };
    },
});
var QrcodeVue = defineComponent({
    name: 'Qrcode',
    render: function () {
        var _a = this.$props, renderAs = _a.renderAs, value = _a.value, size = _a.size, margin = _a.margin, level = _a.level, background = _a.background, foreground = _a.foreground, imageSettings = _a.imageSettings, gradient = _a.gradient, gradientType = _a.gradientType, gradientStartColor = _a.gradientStartColor, gradientEndColor = _a.gradientEndColor;
        return h(renderAs === 'svg' ? QrcodeSvg : QrcodeCanvas, {
            value: value,
            size: size,
            margin: margin,
            level: level,
            background: background,
            foreground: foreground,
            imageSettings: imageSettings,
            gradient: gradient,
            gradientType: gradientType,
            gradientStartColor: gradientStartColor,
            gradientEndColor: gradientEndColor,
        });
    },
    props: QRCodeVueProps,
});

export { QrcodeCanvas, QrcodeSvg, QrcodeVue as default };
