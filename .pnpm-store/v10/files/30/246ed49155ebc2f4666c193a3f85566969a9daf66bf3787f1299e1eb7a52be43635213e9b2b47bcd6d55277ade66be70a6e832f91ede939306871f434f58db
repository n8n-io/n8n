// tests in which spawned child installs a custom cleanup handler

var t = require('tap');
var lib = require('./lib/library');

t.test("single: normal child exit - true return", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 0,
        stdout: "cleanup",
        stderr: ""
    });
});

t.test("single: normal child exit - undefined return", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'undefined'
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 0,
        stdout: "cleanup",
        stderr: ""
    });
});

t.test("single: normal grandchild exit", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: true,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 0,
        stdout: "grandchild=0 cleanup",
        stderr: ""
    });
});

t.test("single: uncaught exception - custom message", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: {
            uncaughtException: "Oh gosh look what happened:"
        },
        exception: true,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 1,
        stdout: "cleanup",
        stderr: /^Oh gosh look what happened:/
    });
});

t.test("single: uncaught exception - no message", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: {
            uncaughtException: ""
        },
        exception: true,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        // no signal
    }, {
        exitReason: 1,
        stdout: "cleanup",
        stderr: /^Error: unexpected exception/
    });
});

t.test("single: child SIGINT - true return, custom message", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: {
            ctrl_C: "{^C}"
        },
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(childPID, 'SIGINT');
    }, {
        exitReason: 'SIGINT',
        stdout: "cleanup",
        stderr: "{^C}\n"
    });
});

t.test("single: child SIGINT - undefined return, custom message",
    function (t) {
        lib.test(t, {
            child: 'groupable',
            grandchild: false,
            grandchildHeedsSIGINT: false,
            messages: {
                ctrl_C: "{^C}"
            },
            exception: false,
            skipTermination: false,
            exitReturn: 'undefined'
        }, function (childPID) {
            process.kill(childPID, 'SIGINT');
        }, {
            exitReason: 'SIGINT',
            stdout: "cleanup",
            stderr: "{^C}\n"
        });
    }
);

t.test("single: child SIGINT - no message", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(childPID, 'SIGINT');
    }, {
        exitReason: 'SIGINT',
        stdout: "cleanup",
        stderr: ""
    });
});

t.test("single: group SIGINT - grandchild ignores", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: true,
        grandchildHeedsSIGINT: false,
        messages: {
            ctrl_C: "{^C}"
        },
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(-childPID, 'SIGINT');
    }, {
        exitReason: 0,
        stdout: "skipped_cleanup grandchild=0 cleanup",
        stderr: ""
    });
});

t.test("single: group SIGINT - grandchild heeds", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: true,
        grandchildHeedsSIGINT: true,
        messages: {
            ctrl_C: "{^C}"
        },
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(-childPID, 'SIGINT');
    }, {
        exitReason: 'SIGINT',
        stdout: "skipped_cleanup grandchild=SIGINT cleanup",
        stderr: "{^C}\n"
    });
});

t.test("single: child SIGHUP - exiting", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(childPID, 'SIGHUP');
    }, {
        exitReason: 'SIGHUP',
        stdout: "cleanup",
        stderr: ""
    });
});

t.test("single: child SIGHUP - non-exiting", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: true,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(childPID, 'SIGHUP');
    }, {
        exitReason: 0,
        stdout: "cleanup",
        stderr: ""
    });
});

t.test("single: group SIGHUP", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: true,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(-childPID, 'SIGHUP');
    }, {
        exitReason: 'SIGHUP',
        // grandchild may exit before,during, or after child exits
        stdout: /^(cleanup( grandchild=SIGHUP)?|grandchild=SIGHUP cleanup)$/,
        stderr: ""
    });
});

t.test("single: child SIGQUIT - exiting", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(childPID, 'SIGQUIT');
    }, {
        exitReason: 'SIGQUIT',
        stdout: "cleanup",
        stderr: ""
    });
});

t.test("single: child SIGQUIT - non-exiting", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: true,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(childPID, 'SIGQUIT');
    }, {
        exitReason: 0,
        stdout: "cleanup",
        stderr: ""
    });
});

t.test("single: group SIGQUIT", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: true,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(-childPID, 'SIGQUIT');
    }, {
        exitReason: 'SIGQUIT',
        // grandchild may exit before,during, or after child exits
        stdout: /^(cleanup( grandchild=SIGQUIT)?|grandchild=SIGQUIT cleanup)$/,
        stderr: ""
    });
});

t.test("single: child SIGTERM - exiting", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(childPID, 'SIGTERM');
    }, {
        exitReason: 'SIGTERM',
        stdout: "cleanup",
        stderr: ""
    });
});

t.test("single: child SIGTERM - non-exiting", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: true,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(childPID, 'SIGTERM');
    }, {
        exitReason: 0,
        stdout: "cleanup",
        stderr: ""
    });
});

t.test("single: group SIGTERM", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: true,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(-childPID, 'SIGTERM');
    }, {
        exitReason: 'SIGTERM',
        // grandchild may exit before,during, or after child exits
        stdout: /^(cleanup( grandchild=SIGTERM)?|grandchild=SIGTERM cleanup)$/,
        stderr: ""
    });
});

t.test("single: child SIGKILL", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: false,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(childPID, 'SIGKILL');
    }, {
        exitReason: 'SIGKILL',
        stdout: "",
        stderr: ""
    });
});

t.test("single: group SIGKILL", function (t) {
    lib.test(t, {
        child: 'groupable',
        grandchild: true,
        grandchildHeedsSIGINT: false,
        messages: null,
        exception: false,
        skipTermination: false,
        exitReturn: 'true'
    }, function (childPID) {
        process.kill(-childPID, 'SIGKILL');
    }, {
        exitReason: 'SIGKILL',
        stdout: "",
        stderr: ""
    });
});
