'use strict';

var Buffer = require('safe-buffer').Buffer;
var CipherBase = require('../');

var test = require('tape');
var inherits = require('inherits');

test('basic version', function (t) {
	function Cipher() {
		CipherBase.call(this);
	}

	inherits(Cipher, CipherBase);

	Cipher.prototype._update = function (input) {
		t.ok(Buffer.isBuffer(input));
		return input;
	};

	Cipher.prototype._final = function () {
		// noop
	};

	var cipher = new Cipher();
	var utf8 = 'abc123abcd';
	var update = cipher.update(utf8, 'utf8', 'base64') + cipher['final']('base64');
	var string = Buffer.from(update, 'base64').toString();

	t.equals(utf8, string);

	t.end();
});

test('hash mode', function (t) {
	function Cipher() {
		CipherBase.call(this, 'finalName');
		this._cache = [];
	}
	inherits(Cipher, CipherBase);
	Cipher.prototype._update = function (input) {
		t.ok(Buffer.isBuffer(input));
		this._cache.push(input);
	};
	Cipher.prototype._final = function () {
		return Buffer.concat(this._cache);
	};
	var cipher = new Cipher();
	var utf8 = 'abc123abcd';
	var update = cipher.update(utf8, 'utf8').finalName('base64');
	var string = Buffer.from(update, 'base64').toString();

	t.equals(utf8, string);

	t.end();
});

test('hash mode as stream', function (t) {
	function Cipher() {
		CipherBase.call(this, 'finalName');
		this._cache = [];
	}
	inherits(Cipher, CipherBase);
	Cipher.prototype._update = function (input) {
		t.ok(Buffer.isBuffer(input));
		this._cache.push(input);
	};
	Cipher.prototype._final = function () {
		return Buffer.concat(this._cache);
	};
	var cipher = new Cipher();
	cipher.on('error', function (e) {
		t.notOk(e);
	});
	var utf8 = 'abc123abcd';
	cipher.end(utf8, 'utf8');
	var update = cipher.read().toString('base64');
	var string = Buffer.from(update, 'base64').toString();

	t.equals(utf8, string);

	t.end();
});

test('encodings', function (t) {
	function Cipher() {
		CipherBase.call(this);
	}
	inherits(Cipher, CipherBase);

	Cipher.prototype._update = function (input) {
		return input;
	};

	Cipher.prototype._final = function () {
		// noop
	};

	t.test('mix and match encoding', function (st) {
		st.plan(2);

		var cipher = new Cipher();
		cipher.update('foo', 'utf8', 'utf8');

		st['throws'](function () {
			cipher.update('foo', 'utf8', 'base64');
		});

		cipher = new Cipher();
		cipher.update('foo', 'utf8', 'base64');

		st.doesNotThrow(function () {
			cipher.update('foo', 'utf8');
			cipher['final']('base64');
		});
	});

	t.test('handle long uft8 plaintexts', function (st) {
		st.plan(1);
		var txt = 'ふっかつ　あきる　すぶり　はやい　つける　まゆげ　たんさん　みんぞく　ねほりはほり　せまい　たいまつばな　ひはん';

		var cipher = new Cipher();
		var decipher = new Cipher();
		var enc = decipher.update(cipher.update(txt, 'utf8', 'base64'), 'base64', 'utf8');
		enc += decipher.update(cipher['final']('base64'), 'base64', 'utf8');
		enc += decipher['final']('utf8');

		st.equals(txt, enc);
	});
});

test('handle SafeBuffer instances', function (t) {
	function Cipher() {
		CipherBase.call(this, 'finalName');
		this._cache = [];
	}
	inherits(Cipher, CipherBase);
	Cipher.prototype._update = function (input) {
		t.ok(Buffer.isBuffer(input));
		this._cache.push(input);
	};
	Cipher.prototype._final = function () {
		return Buffer.concat(this._cache);
	};

	var cipher = new Cipher();
	var final = cipher.update(Buffer.from('a0c1', 'hex')).finalName('hex');
	t.equals(final, 'a0c1');

	t.end();
});

test('handle Uint8Array view', function (t) {
	function Cipher() {
		CipherBase.call(this, 'finalName');
		this._cache = [];
	}
	inherits(Cipher, CipherBase);
	Cipher.prototype._update = function (input) {
		t.ok(Buffer.isBuffer(input));
		this._cache.push(input);
	};
	Cipher.prototype._final = function () {
		return Buffer.concat(this._cache);
	};

	var buf = new Uint8Array([0, 1, 2, 3, 4, 5]);
	var uarr = new Uint8Array(buf.buffer, 2, 3);

	var cipher = new Cipher();
	var final = cipher.update(uarr).finalName('hex');
	t.equals(final, '020304');

	t.end();
});

test('handle empty Uint8Array instances', function (t) {
	function Cipher() {
		CipherBase.call(this, 'finalName');
		this._cache = [];
	}
	inherits(Cipher, CipherBase);
	Cipher.prototype._update = function (input) {
		t.ok(Buffer.isBuffer(input));
		this._cache.push(input);
	};
	Cipher.prototype._final = function () {
		return Buffer.concat(this._cache);
	};

	var cipher = new Cipher();
	var final = cipher.update(new Uint8Array(0)).finalName('hex');
	t.equals(final, '');

	t.end();
});

test('handle UInt16Array', function (t) {
	function Cipher() {
		CipherBase.call(this, 'finalName');
		this._cache = [];
	}
	inherits(Cipher, CipherBase);
	Cipher.prototype._update = function (input) {
		t.ok(Buffer.isBuffer(input));
		this._cache.push(input);
	};
	Cipher.prototype._final = function () {
		return Buffer.concat(this._cache);
	};

	if (ArrayBuffer.isView && (Buffer.prototype instanceof Uint8Array || Buffer.TYPED_ARRAY_SUPPORT)) {
		var cipher = new Cipher();
		var final = cipher.update(new Uint16Array([1234, 512])).finalName('hex');
		t.equals(final, 'd2040002');
	} else {
		t.skip('ArrayBuffer.isView and/or TypedArray not fully supported');
	}

	t.end();
});
