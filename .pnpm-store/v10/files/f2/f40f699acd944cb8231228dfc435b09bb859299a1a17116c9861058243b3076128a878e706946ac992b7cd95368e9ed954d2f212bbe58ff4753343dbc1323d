function main () {
    if (typeof window !== 'undefined') {
	var browser =
	    navigator.userAgent.match(/Firefox\/[^ ]+/) ||
	    navigator.userAgent.match(/Chrome\/[^ ]+/) ||
	    navigator.userAgent.match(/Safari\/[^ ]+/) ||
	    ["unknown/0.0"]; // perhaps it's IE. meh
	output(browser[0]);
    } else {
	output("node/" + process.version);
    }

    output("Test,Iterations per second,Seconds per iteration");

    try {
        nacl_factory.instantiate(do_tests, {
          memoryInitializerPrefixURL: 'lib/'
        });
    } catch (e) {
        console.error(e);
        output('EXCEPTION: ' + e.message);
    }
}

var TIMELIMIT = 1000;

function measure(desc, f) {
    try {
	var iterations;
	var iter_per_sec;
	var best_iter_per_sec = 0;
	var startTime;
	var stopTime;
	var delta;
	var i;
	var result;

	for (iterations = 0; iterations < 3; iterations++) {
	    startTime = new Date().getTime();
	    i = 0;
	    while (1) {
		result = f();
		i++;
		stopTime = new Date().getTime();
		delta = stopTime - startTime;
		if (delta > TIMELIMIT) break;
	    }
	    iter_per_sec = i / (delta / 1000);
	    if (iter_per_sec > best_iter_per_sec) best_iter_per_sec = iter_per_sec;
	}

	var sec_per_iter = 1.0 / best_iter_per_sec;
	output([JSON.stringify(desc), best_iter_per_sec, sec_per_iter].join(','));
    } catch (e) {
	result = null;
	output([JSON.stringify(desc), "FAILED", "FAILED", JSON.stringify(e)].join(','));
    }
    return result;
}

function do_tests(nacl) {
    var hello = nacl.encode_utf8("hello");
    var kp = nacl.crypto_box_keypair_from_seed(hello);
    var skp = nacl.crypto_sign_keypair_from_seed(nacl.crypto_hash_string("This is my passphrase").subarray(0, 32));
    var selfShared = nacl.crypto_box_precompute(kp.boxPk, kp.boxSk);
    var n = nacl.crypto_box_random_nonce();
    var c = nacl.crypto_box_precomputed(hello, n, selfShared);
    var m = nacl.crypto_box_open_precomputed(c, n, selfShared);

    var c2 = nacl.crypto_box(hello, n, kp.boxPk, kp.boxSk);
    var m2 = nacl.crypto_box_open(c2, n, kp.boxPk, kp.boxSk);

    var signed = nacl.crypto_sign(m, skp.signSk);

    var tests = [
	['nacl.crypto_hash_string("hello")',
	 function () { return nacl.crypto_hash_string("hello") }],

	['nacl.crypto_hash(hello)',
	 function () { return nacl.crypto_hash(hello) }],

	['nacl.crypto_box_keypair_from_seed(hello)',
	 function () { return nacl.crypto_box_keypair_from_seed(hello) }],

	['nacl.crypto_box_precompute(kp.boxPk, kp.boxSk)',
	 function () { return nacl.crypto_box_precompute(kp.boxPk, kp.boxSk) }],

	['nacl.crypto_box_random_nonce()',
	 function () { return nacl.crypto_box_random_nonce() }],

	['nacl.crypto_box_precomputed(hello, n, selfShared)',
	 function () { return nacl.crypto_box_precomputed(hello, n, selfShared) }],

	['nacl.crypto_box_open_precomputed(c, n, selfShared)',
	 function () { return nacl.crypto_box_open_precomputed(c, n, selfShared) }],

	['nacl.crypto_box(hello, n, kp.boxPk, kp.boxSk)',
	 function () { return nacl.crypto_box(hello, n, kp.boxPk, kp.boxSk) }],

	['nacl.crypto_box_open(c2, n, kp.boxPk, kp.boxSk)',
	 function () { return nacl.crypto_box_open(c2, n, kp.boxPk, kp.boxSk) }],

	['nacl.crypto_sign(m, skp.signSk)',
	 function () { return nacl.crypto_sign(m, skp.signSk) }],

	['nacl.crypto_sign_open(signed, skp.signPk)',
	 function () { return nacl.crypto_sign_open(signed, skp.signPk) }]
    ];

    var testNum = 0;
    function runNextTest() {
	if (testNum < tests.length) {
	    measure(tests[testNum][0], tests[testNum][1]);
	    testNum++;
	    setTimeout(runNextTest, 0);
	}
    }
    runNextTest();
}

var output;
if (typeof window !== 'undefined') {
    output = function (x) {
	document.getElementById("output").innerHTML += x + "\n";
    };
    window.onload = main;
} else {
    nacl_factory = require("./lib/nacl_factory.js");
    output = function (x) {
	console.log(x);
    };
    main();
}
