#!/usr/bin/env node
// -*- mode: js -*-
// vim: set filetype=javascript :
// Copyright 2018 Joyent, Inc.	All rights reserved.

var dashdash = require('dashdash');
var sshpk = require('../lib/index');
var fs = require('fs');
var path = require('path');
var tty = require('tty');
var readline = require('readline');
var getPassword = require('getpass').getPass;

var options = [
	{
		names: ['outformat', 't'],
		type: 'string',
		help: 'Output format'
	},
	{
		names: ['informat', 'T'],
		type: 'string',
		help: 'Input format'
	},
	{
		names: ['file', 'f'],
		type: 'string',
		help: 'Input file name (default stdin)'
	},
	{
		names: ['out', 'o'],
		type: 'string',
		help: 'Output file name (default stdout)'
	},
	{
		names: ['private', 'p'],
		type: 'bool',
		help: 'Produce a private key as output'
	},
	{
		names: ['derive', 'd'],
		type: 'string',
		help: 'Output a new key derived from this one, with given algo'
	},
	{
		names: ['identify', 'i'],
		type: 'bool',
		help: 'Print key metadata instead of converting'
	},
	{
		names: ['fingerprint', 'F'],
		type: 'bool',
		help: 'Output key fingerprint'
	},
	{
		names: ['hash', 'H'],
		type: 'string',
		help: 'Hash function to use for key fingeprint with -F'
	},
	{
		names: ['spki', 's'],
		type: 'bool',
		help: 'With -F, generates an SPKI fingerprint instead of SSH'
	},
	{
		names: ['comment', 'c'],
		type: 'string',
		help: 'Set key comment, if output format supports'
	},
	{
		names: ['help', 'h'],
		type: 'bool',
		help: 'Shows this help text'
	}
];

if (require.main === module) {
	var parser = dashdash.createParser({
		options: options
	});

	try {
		var opts = parser.parse(process.argv);
	} catch (e) {
		console.error('sshpk-conv: error: %s', e.message);
		process.exit(1);
	}

	if (opts.help || opts._args.length > 1) {
		var help = parser.help({}).trimRight();
		console.error('sshpk-conv: converts between SSH key formats\n');
		console.error(help);
		console.error('\navailable key formats:');
		console.error('  - pem, pkcs1     eg id_rsa');
		console.error('  - ssh            eg id_rsa.pub');
		console.error('  - pkcs8          format you want for openssl');
		console.error('  - openssh        like output of ssh-keygen -o');
		console.error('  - rfc4253        raw OpenSSH wire format');
		console.error('  - dnssec         dnssec-keygen format');
		console.error('  - putty          PuTTY ppk format');
		console.error('\navailable fingerprint formats:');
		console.error('  - hex            colon-separated hex for SSH');
		console.error('                   straight hex for SPKI');
		console.error('  - base64         SHA256:* format from OpenSSH');
		process.exit(1);
	}

	/*
	 * Key derivation can only be done on private keys, so use of the -d
	 * option necessarily implies -p.
	 */
	if (opts.derive)
		opts.private = true;

	var inFile = process.stdin;
	var inFileName = 'stdin';

	var inFilePath;
	if (opts.file) {
		inFilePath = opts.file;
	} else if (opts._args.length === 1) {
		inFilePath = opts._args[0];
	}

	if (inFilePath)
		inFileName = path.basename(inFilePath);

	try {
		if (inFilePath) {
			fs.accessSync(inFilePath, fs.R_OK);
			inFile = fs.createReadStream(inFilePath);
		}
	} catch (e) {
		ifError(e, 'error opening input file');
	}

	var outFile = process.stdout;

	try {
		if (opts.out && !opts.identify) {
			fs.accessSync(path.dirname(opts.out), fs.W_OK);
			outFile = fs.createWriteStream(opts.out);
		}
	} catch (e) {
		ifError(e, 'error opening output file');
	}

	var bufs = [];
	inFile.on('readable', function () {
		var data;
		while ((data = inFile.read()))
			bufs.push(data);
	});
	var parseOpts = {};
	parseOpts.filename = inFileName;
	inFile.on('end', function processKey() {
		var buf = Buffer.concat(bufs);
		var fmt = 'auto';
		if (opts.informat)
			fmt = opts.informat;
		var f = sshpk.parseKey;
		if (opts.private)
			f = sshpk.parsePrivateKey;
		try {
			var key = f(buf, fmt, parseOpts);
		} catch (e) {
			if (e.name === 'KeyEncryptedError') {
				getPassword(function (err, pw) {
					if (err)
						ifError(err);
					parseOpts.passphrase = pw;
					processKey();
				});
				return;
			}
			ifError(e);
		}

		if (opts.derive)
			key = key.derive(opts.derive);

		if (opts.comment)
			key.comment = opts.comment;

		if (opts.identify) {
			var kind = 'public';
			if (sshpk.PrivateKey.isPrivateKey(key))
				kind = 'private';
			console.log('%s: a %d bit %s %s key', inFileName,
			    key.size, key.type.toUpperCase(), kind);
			if (key.type === 'ecdsa')
				console.log('ECDSA curve: %s', key.curve);
			if (key.comment)
				console.log('Comment: %s', key.comment);
			console.log('SHA256 fingerprint: ' +
			    key.fingerprint('sha256').toString());
			console.log('MD5 fingerprint: ' +
			    key.fingerprint('md5').toString());
			console.log('SPKI-SHA256 fingerprint: ' +
			    key.fingerprint('sha256', 'spki').toString());
			process.exit(0);
			return;
		}

		if (opts.fingerprint) {
			var hash = opts.hash;
			var type = opts.spki ? 'spki' : 'ssh';
			var format = opts.outformat;
			var fp = key.fingerprint(hash, type).toString(format);
			outFile.write(fp);
			outFile.write('\n');
			outFile.once('drain', function () {
				process.exit(0);
			});
			return;
		}

		fmt = undefined;
		if (opts.outformat)
			fmt = opts.outformat;
		outFile.write(key.toBuffer(fmt));
		if (fmt === 'ssh' ||
		    (!opts.private && fmt === undefined))
			outFile.write('\n');
		outFile.once('drain', function () {
			process.exit(0);
		});
	});
}

function ifError(e, txt) {
	if (txt)
		txt = txt + ': ';
	else
		txt = '';
	console.error('sshpk-conv: ' + txt + e.name + ': ' + e.message);
	if (process.env['DEBUG'] || process.env['V']) {
		console.error(e.stack);
		if (e.innerErr)
			console.error(e.innerErr.stack);
	}
	process.exit(1);
}
