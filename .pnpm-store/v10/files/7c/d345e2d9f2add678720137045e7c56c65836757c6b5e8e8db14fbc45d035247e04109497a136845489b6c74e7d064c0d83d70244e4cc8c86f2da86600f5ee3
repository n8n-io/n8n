var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Md5: () => Md5
});
module.exports = __toCommonJS(src_exports);
var import_util_utf8 = require("@smithy/util-utf8");

// src/constants.ts
var BLOCK_SIZE = 64;
var DIGEST_LENGTH = 16;
var INIT = [1732584193, 4023233417, 2562383102, 271733878];

// src/index.ts
var Md5 = class {
  static {
    __name(this, "Md5");
  }
  constructor() {
    this.reset();
  }
  update(sourceData) {
    if (isEmptyData(sourceData)) {
      return;
    } else if (this.finished) {
      throw new Error("Attempted to update an already finished hash.");
    }
    const data = convertToBuffer(sourceData);
    let position = 0;
    let { byteLength } = data;
    this.bytesHashed += byteLength;
    while (byteLength > 0) {
      this.buffer.setUint8(this.bufferLength++, data[position++]);
      byteLength--;
      if (this.bufferLength === BLOCK_SIZE) {
        this.hashBuffer();
        this.bufferLength = 0;
      }
    }
  }
  async digest() {
    if (!this.finished) {
      const { buffer, bufferLength: undecoratedLength, bytesHashed } = this;
      const bitsHashed = bytesHashed * 8;
      buffer.setUint8(this.bufferLength++, 128);
      if (undecoratedLength % BLOCK_SIZE >= BLOCK_SIZE - 8) {
        for (let i = this.bufferLength; i < BLOCK_SIZE; i++) {
          buffer.setUint8(i, 0);
        }
        this.hashBuffer();
        this.bufferLength = 0;
      }
      for (let i = this.bufferLength; i < BLOCK_SIZE - 8; i++) {
        buffer.setUint8(i, 0);
      }
      buffer.setUint32(BLOCK_SIZE - 8, bitsHashed >>> 0, true);
      buffer.setUint32(BLOCK_SIZE - 4, Math.floor(bitsHashed / 4294967296), true);
      this.hashBuffer();
      this.finished = true;
    }
    const out = new DataView(new ArrayBuffer(DIGEST_LENGTH));
    for (let i = 0; i < 4; i++) {
      out.setUint32(i * 4, this.state[i], true);
    }
    return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
  }
  hashBuffer() {
    const { buffer, state } = this;
    let a = state[0], b = state[1], c = state[2], d = state[3];
    a = ff(a, b, c, d, buffer.getUint32(0, true), 7, 3614090360);
    d = ff(d, a, b, c, buffer.getUint32(4, true), 12, 3905402710);
    c = ff(c, d, a, b, buffer.getUint32(8, true), 17, 606105819);
    b = ff(b, c, d, a, buffer.getUint32(12, true), 22, 3250441966);
    a = ff(a, b, c, d, buffer.getUint32(16, true), 7, 4118548399);
    d = ff(d, a, b, c, buffer.getUint32(20, true), 12, 1200080426);
    c = ff(c, d, a, b, buffer.getUint32(24, true), 17, 2821735955);
    b = ff(b, c, d, a, buffer.getUint32(28, true), 22, 4249261313);
    a = ff(a, b, c, d, buffer.getUint32(32, true), 7, 1770035416);
    d = ff(d, a, b, c, buffer.getUint32(36, true), 12, 2336552879);
    c = ff(c, d, a, b, buffer.getUint32(40, true), 17, 4294925233);
    b = ff(b, c, d, a, buffer.getUint32(44, true), 22, 2304563134);
    a = ff(a, b, c, d, buffer.getUint32(48, true), 7, 1804603682);
    d = ff(d, a, b, c, buffer.getUint32(52, true), 12, 4254626195);
    c = ff(c, d, a, b, buffer.getUint32(56, true), 17, 2792965006);
    b = ff(b, c, d, a, buffer.getUint32(60, true), 22, 1236535329);
    a = gg(a, b, c, d, buffer.getUint32(4, true), 5, 4129170786);
    d = gg(d, a, b, c, buffer.getUint32(24, true), 9, 3225465664);
    c = gg(c, d, a, b, buffer.getUint32(44, true), 14, 643717713);
    b = gg(b, c, d, a, buffer.getUint32(0, true), 20, 3921069994);
    a = gg(a, b, c, d, buffer.getUint32(20, true), 5, 3593408605);
    d = gg(d, a, b, c, buffer.getUint32(40, true), 9, 38016083);
    c = gg(c, d, a, b, buffer.getUint32(60, true), 14, 3634488961);
    b = gg(b, c, d, a, buffer.getUint32(16, true), 20, 3889429448);
    a = gg(a, b, c, d, buffer.getUint32(36, true), 5, 568446438);
    d = gg(d, a, b, c, buffer.getUint32(56, true), 9, 3275163606);
    c = gg(c, d, a, b, buffer.getUint32(12, true), 14, 4107603335);
    b = gg(b, c, d, a, buffer.getUint32(32, true), 20, 1163531501);
    a = gg(a, b, c, d, buffer.getUint32(52, true), 5, 2850285829);
    d = gg(d, a, b, c, buffer.getUint32(8, true), 9, 4243563512);
    c = gg(c, d, a, b, buffer.getUint32(28, true), 14, 1735328473);
    b = gg(b, c, d, a, buffer.getUint32(48, true), 20, 2368359562);
    a = hh(a, b, c, d, buffer.getUint32(20, true), 4, 4294588738);
    d = hh(d, a, b, c, buffer.getUint32(32, true), 11, 2272392833);
    c = hh(c, d, a, b, buffer.getUint32(44, true), 16, 1839030562);
    b = hh(b, c, d, a, buffer.getUint32(56, true), 23, 4259657740);
    a = hh(a, b, c, d, buffer.getUint32(4, true), 4, 2763975236);
    d = hh(d, a, b, c, buffer.getUint32(16, true), 11, 1272893353);
    c = hh(c, d, a, b, buffer.getUint32(28, true), 16, 4139469664);
    b = hh(b, c, d, a, buffer.getUint32(40, true), 23, 3200236656);
    a = hh(a, b, c, d, buffer.getUint32(52, true), 4, 681279174);
    d = hh(d, a, b, c, buffer.getUint32(0, true), 11, 3936430074);
    c = hh(c, d, a, b, buffer.getUint32(12, true), 16, 3572445317);
    b = hh(b, c, d, a, buffer.getUint32(24, true), 23, 76029189);
    a = hh(a, b, c, d, buffer.getUint32(36, true), 4, 3654602809);
    d = hh(d, a, b, c, buffer.getUint32(48, true), 11, 3873151461);
    c = hh(c, d, a, b, buffer.getUint32(60, true), 16, 530742520);
    b = hh(b, c, d, a, buffer.getUint32(8, true), 23, 3299628645);
    a = ii(a, b, c, d, buffer.getUint32(0, true), 6, 4096336452);
    d = ii(d, a, b, c, buffer.getUint32(28, true), 10, 1126891415);
    c = ii(c, d, a, b, buffer.getUint32(56, true), 15, 2878612391);
    b = ii(b, c, d, a, buffer.getUint32(20, true), 21, 4237533241);
    a = ii(a, b, c, d, buffer.getUint32(48, true), 6, 1700485571);
    d = ii(d, a, b, c, buffer.getUint32(12, true), 10, 2399980690);
    c = ii(c, d, a, b, buffer.getUint32(40, true), 15, 4293915773);
    b = ii(b, c, d, a, buffer.getUint32(4, true), 21, 2240044497);
    a = ii(a, b, c, d, buffer.getUint32(32, true), 6, 1873313359);
    d = ii(d, a, b, c, buffer.getUint32(60, true), 10, 4264355552);
    c = ii(c, d, a, b, buffer.getUint32(24, true), 15, 2734768916);
    b = ii(b, c, d, a, buffer.getUint32(52, true), 21, 1309151649);
    a = ii(a, b, c, d, buffer.getUint32(16, true), 6, 4149444226);
    d = ii(d, a, b, c, buffer.getUint32(44, true), 10, 3174756917);
    c = ii(c, d, a, b, buffer.getUint32(8, true), 15, 718787259);
    b = ii(b, c, d, a, buffer.getUint32(36, true), 21, 3951481745);
    state[0] = a + state[0] & 4294967295;
    state[1] = b + state[1] & 4294967295;
    state[2] = c + state[2] & 4294967295;
    state[3] = d + state[3] & 4294967295;
  }
  reset() {
    this.state = Uint32Array.from(INIT);
    this.buffer = new DataView(new ArrayBuffer(BLOCK_SIZE));
    this.bufferLength = 0;
    this.bytesHashed = 0;
    this.finished = false;
  }
};
function cmn(q, a, b, x, s, t) {
  a = (a + q & 4294967295) + (x + t & 4294967295) & 4294967295;
  return (a << s | a >>> 32 - s) + b & 4294967295;
}
__name(cmn, "cmn");
function ff(a, b, c, d, x, s, t) {
  return cmn(b & c | ~b & d, a, b, x, s, t);
}
__name(ff, "ff");
function gg(a, b, c, d, x, s, t) {
  return cmn(b & d | c & ~d, a, b, x, s, t);
}
__name(gg, "gg");
function hh(a, b, c, d, x, s, t) {
  return cmn(b ^ c ^ d, a, b, x, s, t);
}
__name(hh, "hh");
function ii(a, b, c, d, x, s, t) {
  return cmn(c ^ (b | ~d), a, b, x, s, t);
}
__name(ii, "ii");
function isEmptyData(data) {
  if (typeof data === "string") {
    return data.length === 0;
  }
  return data.byteLength === 0;
}
__name(isEmptyData, "isEmptyData");
function convertToBuffer(data) {
  if (typeof data === "string") {
    return (0, import_util_utf8.fromUtf8)(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
  }
  return new Uint8Array(data);
}
__name(convertToBuffer, "convertToBuffer");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  Md5
});

