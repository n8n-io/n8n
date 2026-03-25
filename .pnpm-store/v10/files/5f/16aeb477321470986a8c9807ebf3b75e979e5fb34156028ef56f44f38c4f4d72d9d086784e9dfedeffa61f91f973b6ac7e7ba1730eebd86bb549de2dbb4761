module.exports = function (/*Buffer*/ inbuf) {
    var zlib = require("zlib");

    var opts = { chunkSize: (parseInt(inbuf.length / 1024) + 1) * 1024 };

    return {
        deflate: function () {
            return zlib.deflateRawSync(inbuf, opts);
        },

        deflateAsync: function (/*Function*/ callback) {
            var tmp = zlib.createDeflateRaw(opts),
                parts = [],
                total = 0;
            tmp.on("data", function (data) {
                parts.push(data);
                total += data.length;
            });
            tmp.on("end", function () {
                var buf = Buffer.alloc(total),
                    written = 0;
                buf.fill(0);
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i];
                    part.copy(buf, written);
                    written += part.length;
                }
                callback && callback(buf);
            });
            tmp.end(inbuf);
        }
    };
};
