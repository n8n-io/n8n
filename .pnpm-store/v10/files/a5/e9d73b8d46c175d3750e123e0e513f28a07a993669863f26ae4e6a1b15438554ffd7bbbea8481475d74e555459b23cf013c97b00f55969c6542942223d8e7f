// Copyright 2018 Joyent, Inc.

module.exports = Fingerprint;

var assert = require('assert-plus');
var Buffer = require('safer-buffer').Buffer;
var algs = require('./algs');
var crypto = require('crypto');
var errs = require('./errors');
var Key = require('./key');
var PrivateKey = require('./private-key');
var Certificate = require('./certificate');
var utils = require('./utils');

var FingerprintFormatError = errs.FingerprintFormatError;
var InvalidAlgorithmError = errs.InvalidAlgorithmError;

function Fingerprint(opts) {
	assert.object(opts, 'options');
	assert.string(opts.type, 'options.type');
	assert.buffer(opts.hash, 'options.hash');
	assert.string(opts.algorithm, 'options.algorithm');

	this.algorithm = opts.algorithm.toLowerCase();
	if (algs.hashAlgs[this.algorithm] !== true)
		throw (new InvalidAlgorithmError(this.algorithm));

	this.hash = opts.hash;
	this.type = opts.type;
	this.hashType = opts.hashType;
}

Fingerprint.prototype.toString = function (format) {
	if (format === undefined) {
		if (this.algorithm === 'md5' || this.hashType === 'spki')
			format = 'hex';
		else
			format = 'base64';
	}
	assert.string(format);

	switch (format) {
	case 'hex':
		if (this.hashType === 'spki')
			return (this.hash.toString('hex'));
		return (addColons(this.hash.toString('hex')));
	case 'base64':
		if (this.hashType === 'spki')
			return (this.hash.toString('base64'));
		return (sshBase64Format(this.algorithm,
		    this.hash.toString('base64')));
	default:
		throw (new FingerprintFormatError(undefined, format));
	}
};

Fingerprint.prototype.matches = function (other) {
	assert.object(other, 'key or certificate');
	if (this.type === 'key' && this.hashType !== 'ssh') {
		utils.assertCompatible(other, Key, [1, 7], 'key with spki');
		if (PrivateKey.isPrivateKey(other)) {
			utils.assertCompatible(other, PrivateKey, [1, 6],
			    'privatekey with spki support');
		}
	} else if (this.type === 'key') {
		utils.assertCompatible(other, Key, [1, 0], 'key');
	} else {
		utils.assertCompatible(other, Certificate, [1, 0],
		    'certificate');
	}

	var theirHash = other.hash(this.algorithm, this.hashType);
	var theirHash2 = crypto.createHash(this.algorithm).
	    update(theirHash).digest('base64');

	if (this.hash2 === undefined)
		this.hash2 = crypto.createHash(this.algorithm).
		    update(this.hash).digest('base64');

	return (this.hash2 === theirHash2);
};

/*JSSTYLED*/
var base64RE = /^[A-Za-z0-9+\/=]+$/;
/*JSSTYLED*/
var hexRE = /^[a-fA-F0-9]+$/;

Fingerprint.parse = function (fp, options) {
	assert.string(fp, 'fingerprint');

	var alg, hash, enAlgs;
	if (Array.isArray(options)) {
		enAlgs = options;
		options = {};
	}
	assert.optionalObject(options, 'options');
	if (options === undefined)
		options = {};
	if (options.enAlgs !== undefined)
		enAlgs = options.enAlgs;
	if (options.algorithms !== undefined)
		enAlgs = options.algorithms;
	assert.optionalArrayOfString(enAlgs, 'algorithms');

	var hashType = 'ssh';
	if (options.hashType !== undefined)
		hashType = options.hashType;
	assert.string(hashType, 'options.hashType');

	var parts = fp.split(':');
	if (parts.length == 2) {
		alg = parts[0].toLowerCase();
		if (!base64RE.test(parts[1]))
			throw (new FingerprintFormatError(fp));
		try {
			hash = Buffer.from(parts[1], 'base64');
		} catch (e) {
			throw (new FingerprintFormatError(fp));
		}
	} else if (parts.length > 2) {
		alg = 'md5';
		if (parts[0].toLowerCase() === 'md5')
			parts = parts.slice(1);
		parts = parts.map(function (p) {
			while (p.length < 2)
				p = '0' + p;
			if (p.length > 2)
				throw (new FingerprintFormatError(fp));
			return (p);
		});
		parts = parts.join('');
		if (!hexRE.test(parts) || parts.length % 2 !== 0)
			throw (new FingerprintFormatError(fp));
		try {
			hash = Buffer.from(parts, 'hex');
		} catch (e) {
			throw (new FingerprintFormatError(fp));
		}
	} else {
		if (hexRE.test(fp)) {
			hash = Buffer.from(fp, 'hex');
		} else if (base64RE.test(fp)) {
			hash = Buffer.from(fp, 'base64');
		} else {
			throw (new FingerprintFormatError(fp));
		}

		switch (hash.length) {
		case 32:
			alg = 'sha256';
			break;
		case 16:
			alg = 'md5';
			break;
		case 20:
			alg = 'sha1';
			break;
		case 64:
			alg = 'sha512';
			break;
		default:
			throw (new FingerprintFormatError(fp));
		}

		/* Plain hex/base64: guess it's probably SPKI unless told. */
		if (options.hashType === undefined)
			hashType = 'spki';
	}

	if (alg === undefined)
		throw (new FingerprintFormatError(fp));

	if (algs.hashAlgs[alg] === undefined)
		throw (new InvalidAlgorithmError(alg));

	if (enAlgs !== undefined) {
		enAlgs = enAlgs.map(function (a) { return a.toLowerCase(); });
		if (enAlgs.indexOf(alg) === -1)
			throw (new InvalidAlgorithmError(alg));
	}

	return (new Fingerprint({
		algorithm: alg,
		hash: hash,
		type: options.type || 'key',
		hashType: hashType
	}));
};

function addColons(s) {
	/*JSSTYLED*/
	return (s.replace(/(.{2})(?=.)/g, '$1:'));
}

function base64Strip(s) {
	/*JSSTYLED*/
	return (s.replace(/=*$/, ''));
}

function sshBase64Format(alg, h) {
	return (alg.toUpperCase() + ':' + base64Strip(h));
}

Fingerprint.isFingerprint = function (obj, ver) {
	return (utils.isCompatible(obj, Fingerprint, ver));
};

/*
 * API versions for Fingerprint:
 * [1,0] -- initial ver
 * [1,1] -- first tagged ver
 * [1,2] -- hashType and spki support
 */
Fingerprint.prototype._sshpkApiVersion = [1, 2];

Fingerprint._oldVersionDetect = function (obj) {
	assert.func(obj.toString);
	assert.func(obj.matches);
	return ([1, 0]);
};
