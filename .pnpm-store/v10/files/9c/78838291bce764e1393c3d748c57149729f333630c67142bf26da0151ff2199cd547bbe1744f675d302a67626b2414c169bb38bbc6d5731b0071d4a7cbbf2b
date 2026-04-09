// workaround for tty output truncation on Node.js
try {
    // prevent buffer overflow and other asynchronous bugs
    process.stdout._handle.setBlocking(true);
    process.stderr._handle.setBlocking(true);
} catch (e) {
    // ensure output buffers are flushed before process termination
    var exit = process.exit;
    if ("bufferSize" in process.stdout) process.exit = function() {
        var args = [].slice.call(arguments);
        process.once("uncaughtException", function() {
            (function callback() {
                if (process.stdout.bufferSize || process.stderr.bufferSize) {
                    setTimeout(callback, 1);
                } else {
                    exit.apply(process, args);
                }
            })();
        });
        throw exit;
    };
}
