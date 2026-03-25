var _ = require('../utils')._;
var utils = require('../utils');

module.exports = {
    privateExport: function (key, options) {
        return {
            n: key.n.toBuffer(),
            e: key.e,
            d: key.d.toBuffer(),
            p: key.p.toBuffer(),
            q: key.q.toBuffer(),
            dmp1: key.dmp1.toBuffer(),
            dmq1: key.dmq1.toBuffer(),
            coeff: key.coeff.toBuffer()
        };
    },

    privateImport: function (key, data, options) {
        if (data.n && data.e && data.d && data.p && data.q && data.dmp1 && data.dmq1 && data.coeff) {
            key.setPrivate(
                data.n,
                data.e,
                data.d,
                data.p,
                data.q,
                data.dmp1,
                data.dmq1,
                data.coeff
            );
        } else {
            throw Error("Invalid key data");
        }
    },

    publicExport: function (key, options) {
        return {
            n: key.n.toBuffer(),
            e: key.e
        };
    },

    publicImport: function (key, data, options) {
        if (data.n && data.e) {
            key.setPublic(
                data.n,
                data.e
            );
        } else {
            throw Error("Invalid key data");
        }
    },

    /**
     * Trying autodetect and import key
     * @param key
     * @param data
     */
    autoImport: function (key, data) {
        if (data.n && data.e) {
            if (data.d && data.p && data.q && data.dmp1 && data.dmq1 && data.coeff) {
                module.exports.privateImport(key, data);
                return true;
            } else {
                module.exports.publicImport(key, data);
                return true;
            }
        }

        return false;
    }
};
