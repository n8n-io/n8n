/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var POW_8 = Math.pow(2, 8);
var POW_16 = Math.pow(2, 16);
var POW_24 = Math.pow(2, 24);
var POW_32 = Math.pow(2, 32);
var POW_40 = Math.pow(2, 40);
var POW_48 = Math.pow(2, 48);
var POW_52 = Math.pow(2, 52);
var POW_1022 = Math.pow(2, 1022);

exports.readByte = function(b){
	return b > 127 ? b-256 : b;
};

exports.readI16 = function(buff, off) {
  off = off || 0;
  var v = buff[off + 1];
  v += buff[off] << 8;
  if (buff[off] & 128) {
    v -= POW_16;
  }
  return v;
};

exports.readI32 = function(buff, off) {
  off = off || 0;
  var v = buff[off + 3];
  v += buff[off + 2] << 8;
  v += buff[off + 1] << 16;
  v += buff[off] * POW_24;
  if (buff[off] & 0x80) {
    v -= POW_32;
  }
  return v;
};

exports.writeI16 = function(buff, v) {
  buff[1] = v & 0xff;
  v >>= 8;
  buff[0] = v & 0xff;
  return buff;
};

exports.writeI32 = function(buff, v) {
  buff[3] = v & 0xff;
  v >>= 8;
  buff[2] = v & 0xff;
  v >>= 8;
  buff[1] = v & 0xff;
  v >>= 8;
  buff[0] = v & 0xff;
  return buff;
};

exports.readDouble = function(buff, off) {
  off = off || 0;
  var signed = buff[off] & 0x80;
  var e = (buff[off+1] & 0xF0) >> 4;
  e += (buff[off] & 0x7F) << 4;

  var m = buff[off+7];
  m += buff[off+6] << 8;
  m += buff[off+5] << 16;
  m += buff[off+4] * POW_24;
  m += buff[off+3] * POW_32;
  m += buff[off+2] * POW_40;
  m += (buff[off+1] & 0x0F) * POW_48;

  switch (e) {
    case 0:
      e = -1022;
      break;
    case 2047:
      return m ? NaN : (signed ? -Infinity : Infinity);
    default:
      m += POW_52;
      e -= 1023;
  }

  if (signed) {
    m *= -1;
  }

  return m * Math.pow(2, e - 52);
};

/*
 * Based on code from the jspack module:
 * http://code.google.com/p/jspack/
 */
exports.writeDouble = function(buff, v) {
  var m, e, c;

  buff[0] = (v < 0 ? 0x80 : 0x00);

  v = Math.abs(v);
  if (v !== v) {
    // NaN, use QNaN IEEE format
    m = 2251799813685248;
    e = 2047;
  } else if (v === Infinity) {
    m = 0;
    e = 2047;
  } else {
    e = Math.floor(Math.log(v) / Math.LN2);
    c = Math.pow(2, -e);
    if (v * c < 1) {
      e--;
      c *= 2;
    }

    if (e + 1023 >= 2047)
    {
      // Overflow
      m = 0;
      e = 2047;
    }
    else if (e + 1023 >= 1)
    {
      // Normalized - term order matters, as Math.pow(2, 52-e) and v*Math.pow(2, 52) can overflow
      m = (v*c-1) * POW_52;
      e += 1023;
    }
    else
    {
      // Denormalized - also catches the '0' case, somewhat by chance
      m = (v * POW_1022) * POW_52;
      e = 0;
    }
  }

  buff[1] = (e << 4) & 0xf0;
  buff[0] |= (e >> 4) & 0x7f;

  buff[7] = m & 0xff;
  m = Math.floor(m / POW_8);
  buff[6] = m & 0xff;
  m = Math.floor(m / POW_8);
  buff[5] = m & 0xff;
  m = Math.floor(m / POW_8);
  buff[4] = m & 0xff;
  m >>= 8;
  buff[3] = m & 0xff;
  m >>= 8;
  buff[2] = m & 0xff;
  m >>= 8;
  buff[1] |= m & 0x0f;

  return buff;
};
