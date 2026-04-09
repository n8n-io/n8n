// The MIT License (MIT)
//
// Copyright (c) 2016 Zhipeng Jia
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict'

var BLOCK_LOG = 16
var BLOCK_SIZE = 1 << BLOCK_LOG

var MAX_HASH_TABLE_BITS = 14
var globalHashTables = new Array(MAX_HASH_TABLE_BITS + 1)

function hashFunc (key, hashFuncShift) {
  return (key * 0x1e35a7bd) >>> hashFuncShift
}

function load32 (array, pos) {
  return array[pos] + (array[pos + 1] << 8) + (array[pos + 2] << 16) + (array[pos + 3] << 24)
}

function equals32 (array, pos1, pos2) {
  return array[pos1] === array[pos2] &&
         array[pos1 + 1] === array[pos2 + 1] &&
         array[pos1 + 2] === array[pos2 + 2] &&
         array[pos1 + 3] === array[pos2 + 3]
}

function copyBytes (fromArray, fromPos, toArray, toPos, length) {
  var i
  for (i = 0; i < length; i++) {
    toArray[toPos + i] = fromArray[fromPos + i]
  }
}

function emitLiteral (input, ip, len, output, op) {
  if (len <= 60) {
    output[op] = (len - 1) << 2
    op += 1
  } else if (len < 256) {
    output[op] = 60 << 2
    output[op + 1] = len - 1
    op += 2
  } else {
    output[op] = 61 << 2
    output[op + 1] = (len - 1) & 0xff
    output[op + 2] = (len - 1) >>> 8
    op += 3
  }
  copyBytes(input, ip, output, op, len)
  return op + len
}

function emitCopyLessThan64 (output, op, offset, len) {
  if (len < 12 && offset < 2048) {
    output[op] = 1 + ((len - 4) << 2) + ((offset >>> 8) << 5)
    output[op + 1] = offset & 0xff
    return op + 2
  } else {
    output[op] = 2 + ((len - 1) << 2)
    output[op + 1] = offset & 0xff
    output[op + 2] = offset >>> 8
    return op + 3
  }
}

function emitCopy (output, op, offset, len) {
  while (len >= 68) {
    op = emitCopyLessThan64(output, op, offset, 64)
    len -= 64
  }
  if (len > 64) {
    op = emitCopyLessThan64(output, op, offset, 60)
    len -= 60
  }
  return emitCopyLessThan64(output, op, offset, len)
}

function compressFragment (input, ip, inputSize, output, op) {
  var hashTableBits = 1
  while ((1 << hashTableBits) <= inputSize &&
         hashTableBits <= MAX_HASH_TABLE_BITS) {
    hashTableBits += 1
  }
  hashTableBits -= 1
  var hashFuncShift = 32 - hashTableBits

  if (typeof globalHashTables[hashTableBits] === 'undefined') {
    globalHashTables[hashTableBits] = new Uint16Array(1 << hashTableBits)
  }
  var hashTable = globalHashTables[hashTableBits]
  var i
  for (i = 0; i < hashTable.length; i++) {
    hashTable[i] = 0
  }

  var ipEnd = ip + inputSize
  var ipLimit
  var baseIp = ip
  var nextEmit = ip

  var hash, nextHash
  var nextIp, candidate, skip
  var bytesBetweenHashLookups
  var base, matched, offset
  var prevHash, curHash
  var flag = true

  var INPUT_MARGIN = 15
  if (inputSize >= INPUT_MARGIN) {
    ipLimit = ipEnd - INPUT_MARGIN

    ip += 1
    nextHash = hashFunc(load32(input, ip), hashFuncShift)

    while (flag) {
      skip = 32
      nextIp = ip
      do {
        ip = nextIp
        hash = nextHash
        bytesBetweenHashLookups = skip >>> 5
        skip += 1
        nextIp = ip + bytesBetweenHashLookups
        if (ip > ipLimit) {
          flag = false
          break
        }
        nextHash = hashFunc(load32(input, nextIp), hashFuncShift)
        candidate = baseIp + hashTable[hash]
        hashTable[hash] = ip - baseIp
      } while (!equals32(input, ip, candidate))

      if (!flag) {
        break
      }

      op = emitLiteral(input, nextEmit, ip - nextEmit, output, op)

      do {
        base = ip
        matched = 4
        while (ip + matched < ipEnd && input[ip + matched] === input[candidate + matched]) {
          matched += 1
        }
        ip += matched
        offset = base - candidate
        op = emitCopy(output, op, offset, matched)

        nextEmit = ip
        if (ip >= ipLimit) {
          flag = false
          break
        }
        prevHash = hashFunc(load32(input, ip - 1), hashFuncShift)
        hashTable[prevHash] = ip - 1 - baseIp
        curHash = hashFunc(load32(input, ip), hashFuncShift)
        candidate = baseIp + hashTable[curHash]
        hashTable[curHash] = ip - baseIp
      } while (equals32(input, ip, candidate))

      if (!flag) {
        break
      }

      ip += 1
      nextHash = hashFunc(load32(input, ip), hashFuncShift)
    }
  }

  if (nextEmit < ipEnd) {
    op = emitLiteral(input, nextEmit, ipEnd - nextEmit, output, op)
  }

  return op
}

function putVarint (value, output, op) {
  do {
    output[op] = value & 0x7f
    value = value >>> 7
    if (value > 0) {
      output[op] += 0x80
    }
    op += 1
  } while (value > 0)
  return op
}

function SnappyCompressor (uncompressed) {
  this.array = uncompressed
}

SnappyCompressor.prototype.maxCompressedLength = function () {
  var sourceLen = this.array.length
  return 32 + sourceLen + Math.floor(sourceLen / 6)
}

SnappyCompressor.prototype.compressToBuffer = function (outBuffer) {
  var array = this.array
  var length = array.length
  var pos = 0
  var outPos = 0

  var fragmentSize

  outPos = putVarint(length, outBuffer, outPos)
  while (pos < length) {
    fragmentSize = Math.min(length - pos, BLOCK_SIZE)
    outPos = compressFragment(array, pos, fragmentSize, outBuffer, outPos)
    pos += fragmentSize
  }

  return outPos
}

exports.SnappyCompressor = SnappyCompressor
