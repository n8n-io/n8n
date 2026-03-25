
//#region src/hash.ts
const n = (n$1) => BigInt(n$1);
const view = (data, offset = 0) => new DataView(data.buffer, data.byteOffset + offset, data.byteLength - offset);
const PRIME32_1 = n("0x9E3779B1");
const PRIME32_2 = n("0x85EBCA77");
const PRIME32_3 = n("0xC2B2AE3D");
const PRIME64_1 = n("0x9E3779B185EBCA87");
const PRIME64_2 = n("0xC2B2AE3D27D4EB4F");
const PRIME64_3 = n("0x165667B19E3779F9");
const PRIME64_4 = n("0x85EBCA77C2B2AE63");
const PRIME64_5 = n("0x27D4EB2F165667C5");
const PRIME_MX1 = n("0x165667919E3779F9");
const PRIME_MX2 = n("0x9FB21C651E98DF25");
const hexToUint8Array = (hex) => {
	const strLen = hex.length;
	if (strLen % 2 !== 0) throw new Error("String should have an even number of characters");
	const maxLength = strLen / 2;
	const bytes = new Uint8Array(maxLength);
	let read = 0;
	let write = 0;
	while (write < maxLength) {
		const slice = hex.slice(read, read += 2);
		bytes[write] = Number.parseInt(slice, 16);
		write += 1;
	}
	return view(bytes);
};
const kkey = hexToUint8Array("b8fe6c3923a44bbe7c01812cf721ad1cded46de9839097db7240a4a4b7b3671fcb79e64eccc0e578825ad07dccff7221b8084674f743248ee03590e6813a264c3c2852bb91c300cb88d0658b1b532ea371644897a20df94e3819ef46a9deacd8a8fa763fe39c343ff9dcbbc7c70b4f1d8a51e04bcdb45931c89f7ec9d9787364eac5ac8334d3ebc3c581a0fffa1363eb170ddd51b7f0da49d316552629d4689e2b16be587d47a1fc8ff8b8d17ad031ce45cb3a8f95160428afd7fbcabb4b407e");
const mask128 = (n(1) << n(128)) - n(1);
const mask64 = (n(1) << n(64)) - n(1);
const mask32 = (n(1) << n(32)) - n(1);
const STRIPE_LEN = 64;
const ACC_NB = STRIPE_LEN / 8;
const _U64 = 8;
const _U32 = 4;
function assert(a) {
	if (!a) throw new Error("Assert failed");
}
function bswap64(a) {
	const scratchbuf = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
	scratchbuf.setBigUint64(0, a, true);
	return scratchbuf.getBigUint64(0, false);
}
function bswap32(input) {
	let a = input;
	a = (a & n(65535)) << n(16) | (a & n(4294901760)) >> n(16);
	a = (a & n(16711935)) << n(8) | (a & n(4278255360)) >> n(8);
	return a;
}
function XXH_mult32to64(a, b) {
	return (a & mask32) * (b & mask32) & mask64;
}
function rotl32(a, b) {
	return (a << b | a >> n(32) - b) & mask32;
}
function XXH3_accumulate_512(acc, dataView, keyView) {
	for (let i = 0; i < ACC_NB; i += 1) {
		const data_val = dataView.getBigUint64(i * 8, true);
		const data_key = data_val ^ keyView.getBigUint64(i * 8, true);
		acc[i ^ 1] += data_val;
		acc[i] += XXH_mult32to64(data_key, data_key >> n(32));
	}
	return acc;
}
function XXH3_accumulate(acc, dataView, keyView, nbStripes) {
	for (let n$1 = 0; n$1 < nbStripes; n$1 += 1) XXH3_accumulate_512(acc, view(dataView, n$1 * STRIPE_LEN), view(keyView, n$1 * 8));
	return acc;
}
function XXH3_scrambleAcc(acc, key) {
	for (let i = 0; i < ACC_NB; i += 1) {
		const key64 = key.getBigUint64(i * 8, true);
		let acc64 = acc[i];
		acc64 = xorshift64(acc64, n(47));
		acc64 ^= key64;
		acc64 *= PRIME32_1;
		acc[i] = acc64 & mask64;
	}
	return acc;
}
function XXH3_mix2Accs(acc, key) {
	return XXH3_mul128_fold64(acc[0] ^ key.getBigUint64(0, true), acc[1] ^ key.getBigUint64(_U64, true));
}
function XXH3_mergeAccs(acc, key, start) {
	let result64 = start;
	result64 += XXH3_mix2Accs(acc.slice(0), view(key, 0 * _U32));
	result64 += XXH3_mix2Accs(acc.slice(2), view(key, 4 * _U32));
	result64 += XXH3_mix2Accs(acc.slice(4), view(key, 8 * _U32));
	result64 += XXH3_mix2Accs(acc.slice(6), view(key, 12 * _U32));
	return XXH3_avalanche(result64 & mask64);
}
function XXH3_hashLong(input, data, secret, f_acc, f_scramble) {
	let acc = input;
	const nbStripesPerBlock = Math.floor((secret.byteLength - STRIPE_LEN) / 8);
	const block_len = STRIPE_LEN * nbStripesPerBlock;
	const nb_blocks = Math.floor((data.byteLength - 1) / block_len);
	for (let n$1 = 0; n$1 < nb_blocks; n$1 += 1) {
		acc = XXH3_accumulate(acc, view(data, n$1 * block_len), secret, nbStripesPerBlock);
		acc = f_scramble(acc, view(secret, secret.byteLength - STRIPE_LEN));
	}
	{
		const nbStripes = Math.floor((data.byteLength - 1 - block_len * nb_blocks) / STRIPE_LEN);
		acc = XXH3_accumulate(acc, view(data, nb_blocks * block_len), secret, nbStripes);
		acc = f_acc(acc, view(data, data.byteLength - STRIPE_LEN), view(secret, secret.byteLength - STRIPE_LEN - 7));
	}
	return acc;
}
function XXH3_hashLong_128b(data, secret) {
	let acc = new BigUint64Array([
		PRIME32_3,
		PRIME64_1,
		PRIME64_2,
		PRIME64_3,
		PRIME64_4,
		PRIME32_2,
		PRIME64_5,
		PRIME32_1
	]);
	assert(data.byteLength > 128);
	acc = XXH3_hashLong(acc, data, secret, XXH3_accumulate_512, XXH3_scrambleAcc);
	assert(acc.length * 8 === 64);
	{
		const low64 = XXH3_mergeAccs(acc, view(secret, 11), n(data.byteLength) * PRIME64_1 & mask64);
		const high64 = XXH3_mergeAccs(acc, view(secret, secret.byteLength - STRIPE_LEN - 11), ~(n(data.byteLength) * PRIME64_2) & mask64);
		return high64 << n(64) | low64;
	}
}
function XXH3_mul128_fold64(a, b) {
	const lll = a * b & mask128;
	return lll & mask64 ^ lll >> n(64);
}
function XXH3_mix16B(dataView, keyView, seed) {
	return XXH3_mul128_fold64((dataView.getBigUint64(0, true) ^ keyView.getBigUint64(0, true) + seed) & mask64, (dataView.getBigUint64(8, true) ^ keyView.getBigUint64(8, true) - seed) & mask64);
}
function XXH3_mix32B(acc, data1, data2, key, seed) {
	let accl = acc & mask64;
	let acch = acc >> n(64) & mask64;
	accl += XXH3_mix16B(data1, key, seed);
	accl ^= data2.getBigUint64(0, true) + data2.getBigUint64(8, true);
	accl &= mask64;
	acch += XXH3_mix16B(data2, view(key, 16), seed);
	acch ^= data1.getBigUint64(0, true) + data1.getBigUint64(8, true);
	acch &= mask64;
	return acch << n(64) | accl;
}
function XXH3_avalanche(input) {
	let h64 = input;
	h64 ^= h64 >> n(37);
	h64 *= PRIME_MX1;
	h64 &= mask64;
	h64 ^= h64 >> n(32);
	return h64;
}
function XXH3_avalanche64(input) {
	let h64 = input;
	h64 ^= h64 >> n(33);
	h64 *= PRIME64_2;
	h64 &= mask64;
	h64 ^= h64 >> n(29);
	h64 *= PRIME64_3;
	h64 &= mask64;
	h64 ^= h64 >> n(32);
	return h64;
}
function XXH3_len_1to3_128b(data, key32, seed) {
	const len = data.byteLength;
	assert(len > 0 && len <= 3);
	const combined = n(data.getUint8(len - 1)) | n(len << 8) | n(data.getUint8(0) << 16) | n(data.getUint8(len >> 1) << 24);
	const blow = (n(key32.getUint32(0, true)) ^ n(key32.getUint32(4, true))) + seed;
	const low = (combined ^ blow) & mask64;
	const bhigh = (n(key32.getUint32(8, true)) ^ n(key32.getUint32(12, true))) - seed;
	const high = (rotl32(bswap32(combined), n(13)) ^ bhigh) & mask64;
	return (XXH3_avalanche64(high) & mask64) << n(64) | XXH3_avalanche64(low);
}
function xorshift64(b, shift) {
	return b ^ b >> shift;
}
function XXH3_len_4to8_128b(data, key32, seed) {
	const len = data.byteLength;
	assert(len >= 4 && len <= 8);
	{
		const l1 = data.getUint32(0, true);
		const l2 = data.getUint32(len - 4, true);
		const l64 = n(l1) | n(l2) << n(32);
		const bitflip = (key32.getBigUint64(16, true) ^ key32.getBigUint64(24, true)) + seed & mask64;
		const keyed = l64 ^ bitflip;
		let m128 = keyed * (PRIME64_1 + (n(len) << n(2))) & mask128;
		m128 += (m128 & mask64) << n(65);
		m128 &= mask128;
		m128 ^= m128 >> n(67);
		return xorshift64(xorshift64(m128 & mask64, n(35)) * PRIME_MX2 & mask64, n(28)) | XXH3_avalanche(m128 >> n(64)) << n(64);
	}
}
function XXH3_len_9to16_128b(data, key64, seed) {
	const len = data.byteLength;
	assert(len >= 9 && len <= 16);
	{
		const bitflipl = (key64.getBigUint64(32, true) ^ key64.getBigUint64(40, true)) + seed & mask64;
		const bitfliph = (key64.getBigUint64(48, true) ^ key64.getBigUint64(56, true)) - seed & mask64;
		const ll1 = data.getBigUint64(0, true);
		let ll2 = data.getBigUint64(len - 8, true);
		let m128 = (ll1 ^ ll2 ^ bitflipl) * PRIME64_1;
		const m128_l = (m128 & mask64) + (n(len - 1) << n(54));
		m128 = m128 & (mask128 ^ mask64) | m128_l;
		ll2 ^= bitfliph;
		m128 += ll2 + (ll2 & mask32) * (PRIME32_2 - n(1)) << n(64);
		m128 &= mask128;
		m128 ^= bswap64(m128 >> n(64));
		let h128 = (m128 & mask64) * PRIME64_2;
		h128 += (m128 >> n(64)) * PRIME64_2 << n(64);
		h128 &= mask128;
		return XXH3_avalanche(h128 & mask64) | XXH3_avalanche(h128 >> n(64)) << n(64);
	}
}
function XXH3_len_0to16_128b(data, seed) {
	const len = data.byteLength;
	assert(len <= 16);
	if (len > 8) return XXH3_len_9to16_128b(data, kkey, seed);
	if (len >= 4) return XXH3_len_4to8_128b(data, kkey, seed);
	if (len > 0) return XXH3_len_1to3_128b(data, kkey, seed);
	return XXH3_avalanche64(seed ^ kkey.getBigUint64(64, true) ^ kkey.getBigUint64(72, true)) | XXH3_avalanche64(seed ^ kkey.getBigUint64(80, true) ^ kkey.getBigUint64(88, true)) << n(64);
}
function inv64(x) {
	return ~x + n(1) & mask64;
}
function XXH3_len_17to128_128b(data, secret, seed) {
	let acc = n(data.byteLength) * PRIME64_1 & mask64;
	let i = n(data.byteLength - 1) / n(32);
	while (i >= 0) {
		const ni = Number(i);
		acc = XXH3_mix32B(acc, view(data, 16 * ni), view(data, data.byteLength - 16 * (ni + 1)), view(secret, 32 * ni), seed);
		i -= n(1);
	}
	let h128l = acc + (acc >> n(64)) & mask64;
	h128l = XXH3_avalanche(h128l);
	let h128h = (acc & mask64) * PRIME64_1 + (acc >> n(64)) * PRIME64_4 + (n(data.byteLength) - seed & mask64) * PRIME64_2;
	h128h &= mask64;
	h128h = inv64(XXH3_avalanche(h128h));
	return h128l | h128h << n(64);
}
function XXH3_len_129to240_128b(data, secret, seed) {
	let acc = n(data.byteLength) * PRIME64_1 & mask64;
	for (let i = 32; i < 160; i += 32) acc = XXH3_mix32B(acc, view(data, i - 32), view(data, i - 16), view(secret, i - 32), seed);
	acc = XXH3_avalanche(acc & mask64) | XXH3_avalanche(acc >> n(64)) << n(64);
	for (let i = 160; i <= data.byteLength; i += 32) acc = XXH3_mix32B(acc, view(data, i - 32), view(data, i - 16), view(secret, 3 + i - 160), seed);
	acc = XXH3_mix32B(acc, view(data, data.byteLength - 16), view(data, data.byteLength - 32), view(secret, 103), inv64(seed));
	let h128l = acc + (acc >> n(64)) & mask64;
	h128l = XXH3_avalanche(h128l);
	let h128h = (acc & mask64) * PRIME64_1 + (acc >> n(64)) * PRIME64_4 + (n(data.byteLength) - seed & mask64) * PRIME64_2;
	h128h &= mask64;
	h128h = inv64(XXH3_avalanche(h128h));
	return h128l | h128h << n(64);
}
function XXH3(input, seed = n(0)) {
	const encoder = new TextEncoder();
	const data = view(typeof input === "string" ? encoder.encode(input) : input);
	const len = data.byteLength;
	const hexDigest = (data$1) => data$1.toString(16).padStart(32, "0");
	if (len <= 16) return hexDigest(XXH3_len_0to16_128b(data, seed));
	if (len <= 128) return hexDigest(XXH3_len_17to128_128b(data, kkey, seed));
	if (len <= 240) return hexDigest(XXH3_len_129to240_128b(data, kkey, seed));
	return hexDigest(XXH3_hashLong_128b(data, kkey));
}
function isXXH3(value) {
	return /^[0-9a-f]{32}$/.test(value);
}

//#endregion
exports.XXH3 = XXH3;
exports.isXXH3 = isXXH3;
//# sourceMappingURL=hash.cjs.map