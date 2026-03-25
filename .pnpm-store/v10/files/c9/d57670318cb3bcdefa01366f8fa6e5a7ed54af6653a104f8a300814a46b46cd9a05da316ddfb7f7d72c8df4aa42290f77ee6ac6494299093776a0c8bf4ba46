const version = +(process.versions ? process.versions.node : "").split(".")[0] || 0;

module.exports = function (/*Buffer*/ inbuf, /*number*/ expectedLength) {
    var zlib = require("zlib");
    const option = version >= 15 && expectedLength > 0 ? { maxOutputLength: expectedLength } : {};

    return {
        inflate: function () {
            return zlib.inflateRawSync(inbuf, option);
        },

        inflateAsync: function (/*Function*/ callback) {
            var tmp = zlib.createInflateRaw(option),
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
