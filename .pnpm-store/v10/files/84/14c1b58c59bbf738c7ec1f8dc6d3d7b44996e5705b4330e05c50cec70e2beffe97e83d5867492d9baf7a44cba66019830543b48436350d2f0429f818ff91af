// tests in which spawned child uses the default cleanup handler

var t = require('tap');
var lib = require('./lib/library');

t.test("nocleanup: normal child exit", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        exception: false,
        uninstall: false
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 0,
        stdout: "",
        stderr: ""
    });
});

t.test("nocleanup: uncaught exception - default message", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        exception: true,
        uninstall: false
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 1,
        stdout: "",
        stderr: lib.DEFAULT_EXCEPTION_OUT
    });
});

t.test("nocleanup: uncaught exception - custom message", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        messages0: {
            uncaughtException: "Yikes!"
        },
        exception: true,
        uninstall: false
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 1,
        stdout: "",
        stderr: /^Yikes!/
    });
});

t.test("nocleanup: child SIGINT - default message", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        exception: false,
        uninstall: false
    }, function (childPID) {
        process.kill(childPID, 'SIGINT');
    }, {
        exitReason: 'SIGINT',
        stdout: "",
        stderr: lib.DEFAULT_SIGINT_OUT
    });
});

t.test("nocleanup: child SIGINT - custom message", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        messages0: {
            ctrl_C: "{^C}"
        },
        exception: false,
        uninstall: false
    }, function (childPID) {
        process.kill(childPID, 'SIGINT');
    }, {
        exitReason: 'SIGINT',
        stdout: "",
        stderr: "{^C}\n"
    });
});

t.test("nocleanup: child SIGQUIT", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        exception: false,
        uninstall: false
    }, function (childPID) {
        process.kill(childPID, 'SIGQUIT');
    }, {
        exitReason: 'SIGQUIT',
        stdout: "",
        stderr: ""
    });
});

t.test("nocleanup: child SIGTERM", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        exception: false,
        uninstall: false
    }, function (childPID) {
        process.kill(childPID, 'SIGTERM');
    }, {
        exitReason: 'SIGTERM',
        stdout: "",
        stderr: ""
    });
});

t.test("nocleanup: child SIGKILL", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        exception: false,
        uninstall: false
    }, function (childPID) {
        process.kill(childPID, 'SIGKILL');
    }, {
        exitReason: 'SIGKILL',
        stdout: "",
        stderr: ""
    });
});

t.test("nocleanup/uninstall: normal child exit", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        exception: false,
        uninstall: true
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 0,
        stdout: "",
        stderr: ""
    });
});

t.test("nocleanup/uninstall: uncaught exception", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        exception: true,
        uninstall: true
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 1,
        stdout: "",
        stderr: /tests[\/\\]bin[\/\\]stackable.js/
    });
});

t.test("nocleanup/uninstall: child SIGINT", function (t) {
    lib.test(t, {
        child: 'stackable',
        handlers: 0,
        exception: false,
        uninstall: true
    }, function (childPID) {
        process.kill(childPID, 'SIGINT');
    }, {
        exitReason: 'SIGINT',
        stdout: "",
        stderr: ""
    });
});
