if (typeof module !== 'undefined' && module.exports) {
  // We are running in node
  var nacl;
  before(function () {
    return require("../lib/nacl_factory.js").instantiate(function (nacl_instance) {
      nacl = nacl_instance;
    });
  });
  var assert = require("assert");
  var suite = module.exports;
} else {
  // We are running in browser, and runner.html has set nacl, assert
  // and suite up for us.
}

function wouldBeRandomInARealProgram(howmuch) {
    return new Uint8Array(howmuch);
}

suite.utf8Encoding = function () {
    assert.equal(nacl.to_hex(nacl.encode_utf8("\xe5\xe4\xf6")), "c3a5c3a4c3b6");
};

suite.hexEncoding = function () {
    assert.equal(nacl.to_hex(nacl.encode_utf8("hello")), "68656c6c6f");
};

suite.hexDecoding = function () {
    assert.equal(nacl.decode_utf8(nacl.from_hex("68656c6c6f")), "hello");
    assert.equal(nacl.decode_utf8(nacl.from_hex("68656C6C6F")), "hello");
};

suite.hashing = function () {
    assert.equal(nacl.to_hex(nacl.crypto_hash_string("hello")),
		 "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7"+
		 "2323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043");
    assert.equal(nacl.to_hex(nacl.crypto_hash(nacl.encode_utf8("hello"))),
		 "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7"+
		 "2323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043");
    assert.equal(nacl.to_hex(nacl.crypto_hash_sha256(nacl.encode_utf8("hello"))),
		 "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
};

suite.boxKeypairFromSeed = function () {
    var seed = nacl.encode_utf8("hello");
    var kp = nacl.crypto_box_seed_keypair(seed);
    assert.equal(nacl.to_hex(kp.boxPk),
		 "d8333ecf53dac465d59f3b03878ceff88947eec57c965105a049a0f5f1b7a510");
    assert.equal(nacl.to_hex(kp.boxSk),
		 "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7");

    var selfDHkey = nacl.crypto_box_precompute(kp.boxPk, kp.boxSk);
    assert.equal(nacl.to_hex(selfDHkey.boxK),
		 "9f6c32cd88662c3cfc7e41c8f8b06960c71e560c35b693966085a68317b4cce9");
};

suite.randomBoxNonceLength = function () {
    assert.equal(nacl.crypto_box_random_nonce().length, nacl.crypto_box_NONCEBYTES);
};

suite.precomputedBox = function () {
    var seed = nacl.encode_utf8("hello");
    var kp = nacl.crypto_box_seed_keypair(seed);
    var selfShared = nacl.crypto_box_precompute(kp.boxPk, kp.boxSk);
    var nonce = wouldBeRandomInARealProgram(nacl.crypto_box_NONCEBYTES);
    var plaintext = "box test";
    var c = nacl.crypto_box_precomputed(nacl.encode_utf8(plaintext), nonce, selfShared);
    assert.equal(nacl.to_hex(c), "1ac48540344a19bd9516a2ea01d99f889dc97a47ba58946d");
    var m = nacl.crypto_box_open_precomputed(c, nonce, selfShared);
    assert.equal(nacl.decode_utf8(m), plaintext);
};

suite.normalBox = function () {
    var seed = nacl.encode_utf8("hello");
    var kp = nacl.crypto_box_seed_keypair(seed);
    var nonce = wouldBeRandomInARealProgram(nacl.crypto_box_NONCEBYTES);
    var plaintext = "box test";
    var c = nacl.crypto_box(nacl.encode_utf8(plaintext), nonce, kp.boxPk, kp.boxSk);
    assert.equal(nacl.to_hex(c), "1ac48540344a19bd9516a2ea01d99f889dc97a47ba58946d");
    var m = nacl.crypto_box_open(c, nonce, kp.boxPk, kp.boxSk);
    assert.equal(nacl.decode_utf8(m), plaintext);
};

suite.stream = function () {
    var n = wouldBeRandomInARealProgram(nacl.crypto_stream_NONCEBYTES);
    var k = wouldBeRandomInARealProgram(nacl.crypto_stream_KEYBYTES);
    assert.equal(nacl.to_hex(nacl.crypto_stream(10, n, k)), "ba6e26df4b2ea2cf64d2");
    var c = nacl.crypto_stream_xor(nacl.encode_utf8("hello"), n, k);
    assert.equal(nacl.to_hex(c), "d20b4ab324");
    var m = nacl.crypto_stream_xor(c, n, k);
    assert.equal(nacl.decode_utf8(m), "hello");
};

suite.onetimeAuth = function () {
    var authkey =
	nacl.crypto_hash(nacl.encode_utf8("hello")).subarray(0, nacl.crypto_onetimeauth_KEYBYTES);
    var auth = nacl.crypto_onetimeauth(nacl.encode_utf8("hello"), authkey);
    assert.equal(nacl.to_hex(auth), "8acf9be1c2048a66ae442c83f2ae21c1");
    assert.ok(nacl.crypto_onetimeauth_verify(auth, nacl.encode_utf8("hello"), authkey));
    assert.equal(nacl.crypto_onetimeauth_verify(auth,
						nacl.encode_utf8("hellp"), // <==
						authkey),
		 false);
    assert.equal(nacl.crypto_onetimeauth_verify(auth.subarray(1), // <==
						nacl.encode_utf8("hello"),
						authkey),
		 false);
    auth[0] = auth[0] + 1;
    assert.equal(nacl.crypto_onetimeauth_verify(auth, // <== modified
						nacl.encode_utf8("hello"),
						authkey),
		 false);
};

suite.auth = function () {
    var authkey =
	nacl.crypto_hash(nacl.encode_utf8("hello")).subarray(0, nacl.crypto_auth_KEYBYTES);
    var auth = nacl.crypto_auth(nacl.encode_utf8("hello"), authkey);
    assert.equal(nacl.to_hex(auth),
		 "3363a029b88688109b420ea8bed190228893c3fc85c18bf0dc4a1d14b4ce57fd");
    assert.ok(nacl.crypto_auth_verify(auth, nacl.encode_utf8("hello"), authkey));
    assert.equal(nacl.crypto_auth_verify(auth, nacl.encode_utf8("hellp"), authkey), false);
    assert.equal(nacl.crypto_auth_verify(auth.subarray(1), nacl.encode_utf8("hello"), authkey),
		 false);
    auth[0] = auth[0] + 1;
    assert.equal(nacl.crypto_auth_verify(auth, nacl.encode_utf8("hello"), authkey), false);
};

suite.secretBox = function () {
    var n = wouldBeRandomInARealProgram(nacl.crypto_secretbox_NONCEBYTES);
    var secretboxkey =
	nacl.crypto_hash(nacl.encode_utf8("thekey")).subarray(0, nacl.crypto_secretbox_KEYBYTES);
    var plaintext = "hello";
    var c = nacl.crypto_secretbox(nacl.encode_utf8(plaintext), n, secretboxkey);
    assert.equal(nacl.to_hex(c), "08877931f3041765b847df995236a3c6b799cabe24");
    var m = nacl.crypto_secretbox_open(c, n, secretboxkey);
    assert.equal(nacl.decode_utf8(m), plaintext);
};

suite.signatures = function () {
    var seedlen = nacl.crypto_sign_SECRETKEYBYTES / 2; // probably should be defined as a constant
    var seed = nacl.crypto_hash_string("This is my passphrase").subarray(0, seedlen);
    assert.equal(nacl.to_hex(seed),
		 "2268afda5a2a900cf07bdbaa05312a958b54e25c8042157840b8e79386512af1");
    var kp = nacl.crypto_sign_seed_keypair(seed);
    assert.equal(nacl.to_hex(kp.signPk),
		 "ba1000e3fe1213a53129e2d071c5e55a9afcad1c355fae453dd4dd2e7aaac242");
    assert.equal(nacl.to_hex(kp.signSk),
		 "2268afda5a2a900cf07bdbaa05312a958b54e25c8042157840b8e79386512af1"+
		 "ba1000e3fe1213a53129e2d071c5e55a9afcad1c355fae453dd4dd2e7aaac242");
    var message = "message";

    var c = nacl.crypto_sign(nacl.encode_utf8(message), kp.signSk);
    assert.equal(nacl.to_hex(c),
		 "d11d1612189ce965201e839bd007e2fe5f726a7ddc54ea3fba41f7d14207b542"+
		 "f60c6fee4eca64b630ef0d450b2ea0a72bdf5f526f5678ee55b979f368c52f0a"+
		 "6d657373616765");

    var detached_sig = nacl.crypto_sign_detached(nacl.encode_utf8(message), kp.signSk);
    assert.equal(nacl.to_hex(detached_sig),
		 "d11d1612189ce965201e839bd007e2fe5f726a7ddc54ea3fba41f7d14207b542"+
		 "f60c6fee4eca64b630ef0d450b2ea0a72bdf5f526f5678ee55b979f368c52f0a");

    var m = nacl.crypto_sign_open(c, kp.signPk);
    assert.notEqual(m, null);
    assert.equal(nacl.decode_utf8(m), message);
    assert.ok(nacl.crypto_sign_verify_detached(detached_sig, nacl.encode_utf8(message), kp.signPk));

    // Corrupt the signature
    c = nacl.decode_latin1(c);
    c = c.substring(0, 35) + '!' + c.substring(36);
    c = nacl.encode_latin1(c);

    m = nacl.crypto_sign_open(c, kp.signPk);
    assert.equal(m, null);

    // Corrupt the detached signature
    detached_sig = nacl.decode_latin1(detached_sig);
    detached_sig = detached_sig.substring(0, 35) + '!' + detached_sig.substring(36);
    detached_sig = nacl.encode_latin1(detached_sig);

    assert.equal(nacl.crypto_sign_verify_detached(detached_sig,
						  nacl.encode_utf8(message),
						  kp.signPk),
		 false);
};

suite.randomBoxKeyRoundtrip = function () {
    var kp = nacl.crypto_box_keypair_from_raw_sk(nacl.random_bytes(nacl.crypto_box_SECRETKEYBYTES));
    var n = nacl.crypto_box_random_nonce();
    var message = "message";
    assert.equal(nacl.decode_utf8(nacl.crypto_box_open(nacl.crypto_box(nacl.encode_utf8(message),
								       n, kp.boxPk, kp.boxSk),
						       n, kp.boxPk, kp.boxSk)),
		 message);
};

suite.curve25519_correctness = function () {
    // Check correctness of curve25519 via NaCl test vector
    var alice_private =
	nacl.from_hex("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a");
    var bob_public =
	nacl.from_hex("de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f");

    assert.equal(nacl.to_hex(nacl.crypto_scalarmult(alice_private,bob_public)),
		 "4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742");
};

suite.randomSignKeyRoundtrip = function () {
    var kp = nacl.crypto_sign_keypair();
    var message = "message";
    assert.equal(nacl.decode_utf8(nacl.crypto_sign_open(nacl.crypto_sign(nacl.encode_utf8(message),
									 kp.signSk),
							kp.signPk)),
		 message);
    assert.ok(nacl.crypto_sign_verify_detached(nacl.crypto_sign_detached(nacl.encode_utf8(message),
									 kp.signSk),
					       nacl.encode_utf8(message),
					       kp.signPk));
};

suite.seededBoxKeypairIdentities1 = function () {
    var kp1 = nacl.crypto_box_keypair();
    var kp2 = nacl.crypto_box_keypair_from_raw_sk(kp1.boxSk);
    assert.equal(nacl.to_hex(kp2.boxPk), nacl.to_hex(kp1.boxPk));
    assert.equal(nacl.to_hex(kp2.boxSk), nacl.to_hex(kp1.boxSk));
};

suite.seededBoxKeypairIdentities2 = function () {
    var seed = nacl.encode_utf8("the seed");
    var sk = nacl.crypto_hash(seed).subarray(0, nacl.crypto_box_SECRETKEYBYTES);
    var kp = nacl.crypto_box_seed_keypair(seed);
    assert.equal(nacl.to_hex(kp.boxSk), nacl.to_hex(sk));
};

suite.seededSignKeypairIdentities1 = function () {
    var seedlen = nacl.crypto_sign_SECRETKEYBYTES / 2; // probably should be defined as a constant
    var kp1 = nacl.crypto_sign_keypair();
    var kp2 = nacl.crypto_sign_seed_keypair(kp1.signSk.subarray(0, seedlen));
    assert.equal(nacl.to_hex(kp2.signPk), nacl.to_hex(kp1.signPk));
    assert.equal(nacl.to_hex(kp2.signSk), nacl.to_hex(kp1.signSk));
};

suite.seededSignKeypairIdentities2 = function () {
    var seedlen = nacl.crypto_sign_SECRETKEYBYTES / 2; // probably should be defined as a constant
    var seed = nacl.crypto_hash(nacl.encode_utf8("the seed")).subarray(0, seedlen);
    var kp = nacl.crypto_sign_seed_keypair(seed);
    assert.equal(nacl.to_hex(kp.signSk.subarray(0, seedlen)), nacl.to_hex(seed));
};

suite.sealedBoxBasic = function () {
  var kp = nacl.crypto_box_keypair();
  var msg = nacl.encode_utf8("hello sealed box");
  var c = nacl.crypto_box_seal(msg, kp.boxPk);
  var d = nacl.crypto_box_seal_open(c, kp.boxPk, kp.boxSk);
  assert.equal(nacl.to_hex(msg), nacl.to_hex(d));
};
