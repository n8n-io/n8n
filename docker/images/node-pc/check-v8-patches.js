// Proves that the compiled Node carries the V8 patches of ./patches. Runs in
// the node-pc image build after `make install`.
'use strict';

const { v8 } = process.versions;
if (!/-n8n\.\d+$/.test(v8)) {
	throw new Error(`V8 ${v8} has no n8n patch suffix, the patches did not apply`);
}

// patches/0001: an object literal whose key is a long numeric index that
// arrived as a two-byte string. Unpatched V8 miscounts the properties and
// aborts the process.
for (const last of [48, 49]) {
	const key = String.fromCharCode(49, 48, 48, 48, 0x130, 48, 48, 48, 48, last).replace(
		/(İ)()/g,
		'$2',
	);
	new Set().add(key);
	Symbol.for(key);
	const object = (0, eval)(`({${key}(v){return Object.values({"${key}":v})[1]}})`);
	const result = object[key](1);
	if (result !== undefined) {
		throw new Error(`patches/0001 did not take effect: got ${result}`);
	}
}

console.log(`V8 ${v8}: patches verified`);
