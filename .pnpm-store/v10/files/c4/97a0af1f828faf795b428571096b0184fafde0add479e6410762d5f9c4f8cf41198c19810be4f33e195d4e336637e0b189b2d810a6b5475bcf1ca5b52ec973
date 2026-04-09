var int53 = {}

var MAX_UINT32 = 0x00000000FFFFFFFF
var MAX_INT53 =  0x001FFFFFFFFFFFFF

function assert (test, message) {
	if(!test) throw new Error(message)
}

function onesComplement(number) {
	number = ~number
	if (number < 0) {
		number = (number & 0x7FFFFFFF) + 0x80000000
	}
	return number
}

function uintHighLow(number) {
	assert(number > -1 && number <= MAX_INT53, "number out of range")
	assert(Math.floor(number) === number, "number must be an integer")
	var high = 0
	var signbit = number & 0xFFFFFFFF
	var low = signbit < 0 ? (number & 0x7FFFFFFF) + 0x80000000 : signbit
	if (number > MAX_UINT32) {
		high = (number - low) / (MAX_UINT32 + 1)
	}
	return [high, low]
}

function intHighLow(number) {
	if (number > -1) {
		return uintHighLow(number)
	}
	var hl = uintHighLow(-number)
	var high = onesComplement(hl[0])
	var low = onesComplement(hl[1])
	if (low === MAX_UINT32) {
		high += 1
		low = 0
	}
	else {
		low += 1
	}
	return [high, low]
}

function toDouble(high, low, signed) {
	if (signed && (high & 0x80000000) !== 0) {
		high = onesComplement(high)
		low = onesComplement(low)
		assert(high < 0x00200000, "number too small")
		return -((high * (MAX_UINT32 + 1)) + low + 1)
	}
	else { //positive
		assert(high < 0x00200000, "number too large")
		return (high * (MAX_UINT32 + 1)) + low
	}
}

int53.readInt64BE = function (buffer, offset) {
	offset = offset || 0
	var high = buffer.readUInt32BE(offset)
	var low = buffer.readUInt32BE(offset + 4)
	return toDouble(high, low, true)
}

int53.readInt64LE = function (buffer, offset) {
	offset = offset || 0
	var low = buffer.readUInt32LE(offset)
	var high = buffer.readUInt32LE(offset + 4)
	return toDouble(high, low, true)
}

int53.readUInt64BE = function (buffer, offset) {
	offset = offset || 0
	var high = buffer.readUInt32BE(offset)
	var low = buffer.readUInt32BE(offset + 4)
	return toDouble(high, low, false)
}

int53.readUInt64LE = function (buffer, offset) {
	offset = offset || 0
	var low = buffer.readUInt32LE(offset)
	var high = buffer.readUInt32LE(offset + 4)
	return toDouble(high, low, false)
}

int53.writeInt64BE = function (number, buffer, offset) {
	offset = offset || 0
	var hl = intHighLow(number)
	buffer.writeUInt32BE(hl[0], offset)
	buffer.writeUInt32BE(hl[1], offset + 4)
}

int53.writeInt64LE = function (number, buffer, offset) {
	offset = offset || 0
	var hl = intHighLow(number)
	buffer.writeUInt32LE(hl[1], offset)
	buffer.writeUInt32LE(hl[0], offset + 4)
}

int53.writeUInt64BE = function (number, buffer, offset) {
	offset = offset || 0
	var hl = uintHighLow(number)
	buffer.writeUInt32BE(hl[0], offset)
	buffer.writeUInt32BE(hl[1], offset + 4)
}

int53.writeUInt64LE = function (number, buffer, offset) {
	offset = offset || 0
	var hl = uintHighLow(number)
	buffer.writeUInt32LE(hl[1], offset)
	buffer.writeUInt32LE(hl[0], offset + 4)
}

module.exports = int53
