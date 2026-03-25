"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomGenerator = void 0;
class RandomGenerator {
    /**
     *  discuss at: http://locutus.io/php/sha1/
     * original by: Webtoolkit.info (http://www.webtoolkit.info/)
     * improved by: Michael White (http://getsprink.com)
     * improved by: Kevin van Zonneveld (http://kvz.io)
     *    input by: Brett Zamir (http://brett-zamir.me)
     *      note 1: Keep in mind that in accordance with PHP, the whole string is buffered and then
     *      note 1: hashed. If available, we'd recommend using Node's native crypto modules directly
     *      note 1: in a steaming fashion for faster and more efficient hashing
     *   example 1: sha1('Kevin van Zonneveld')
     *   returns 1: '54916d2e62f65b3afa6e192e6a601cdbe5cb5897'
     */
    static sha1(str) {
        let _rotLeft = function (n, s) {
            let t4 = (n << s) | (n >>> (32 - s));
            return t4;
        };
        let _cvtHex = function (val) {
            let str = "";
            let i;
            let v;
            for (i = 7; i >= 0; i--) {
                v = (val >>> (i * 4)) & 0x0f;
                str += v.toString(16);
            }
            return str;
        };
        let blockstart;
        let i, j;
        let W = new Array(80);
        let H0 = 0x67452301;
        let H1 = 0xefcdab89;
        let H2 = 0x98badcfe;
        let H3 = 0x10325476;
        let H4 = 0xc3d2e1f0;
        let A, B, C, D, E;
        let temp;
        // utf8_encode
        str = /*unescape*/ encodeURIComponent(str);
        let strLen = str.length;
        let wordArray = [];
        for (i = 0; i < strLen - 3; i += 4) {
            j =
                (str.charCodeAt(i) << 24) |
                    (str.charCodeAt(i + 1) << 16) |
                    (str.charCodeAt(i + 2) << 8) |
                    str.charCodeAt(i + 3);
            wordArray.push(j);
        }
        switch (strLen % 4) {
            case 0:
                i = 0x080000000;
                break;
            case 1:
                i = (str.charCodeAt(strLen - 1) << 24) | 0x0800000;
                break;
            case 2:
                i =
                    (str.charCodeAt(strLen - 2) << 24) |
                        (str.charCodeAt(strLen - 1) << 16) |
                        0x08000;
                break;
            case 3:
                i =
                    (str.charCodeAt(strLen - 3) << 24) |
                        (str.charCodeAt(strLen - 2) << 16) |
                        (str.charCodeAt(strLen - 1) << 8) |
                        0x80;
                break;
        }
        wordArray.push(i);
        while (wordArray.length % 16 !== 14) {
            wordArray.push(0);
        }
        wordArray.push(strLen >>> 29);
        wordArray.push((strLen << 3) & 0x0ffffffff);
        for (blockstart = 0; blockstart < wordArray.length; blockstart += 16) {
            for (i = 0; i < 16; i++) {
                W[i] = wordArray[blockstart + i];
            }
            for (i = 16; i <= 79; i++) {
                W[i] = _rotLeft(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
            }
            A = H0;
            B = H1;
            C = H2;
            D = H3;
            E = H4;
            for (i = 0; i <= 19; i++) {
                temp =
                    (_rotLeft(A, 5) +
                        ((B & C) | (~B & D)) +
                        E +
                        W[i] +
                        0x5a827999) &
                        0x0ffffffff;
                E = D;
                D = C;
                C = _rotLeft(B, 30);
                B = A;
                A = temp;
            }
            for (i = 20; i <= 39; i++) {
                temp =
                    (_rotLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ed9eba1) &
                        0x0ffffffff;
                E = D;
                D = C;
                C = _rotLeft(B, 30);
                B = A;
                A = temp;
            }
            for (i = 40; i <= 59; i++) {
                temp =
                    (_rotLeft(A, 5) +
                        ((B & C) | (B & D) | (C & D)) +
                        E +
                        W[i] +
                        0x8f1bbcdc) &
                        0x0ffffffff;
                E = D;
                D = C;
                C = _rotLeft(B, 30);
                B = A;
                A = temp;
            }
            for (i = 60; i <= 79; i++) {
                temp =
                    (_rotLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0xca62c1d6) &
                        0x0ffffffff;
                E = D;
                D = C;
                C = _rotLeft(B, 30);
                B = A;
                A = temp;
            }
            H0 = (H0 + A) & 0x0ffffffff;
            H1 = (H1 + B) & 0x0ffffffff;
            H2 = (H2 + C) & 0x0ffffffff;
            H3 = (H3 + D) & 0x0ffffffff;
            H4 = (H4 + E) & 0x0ffffffff;
        }
        temp =
            _cvtHex(H0) + _cvtHex(H1) + _cvtHex(H2) + _cvtHex(H3) + _cvtHex(H4);
        return temp.toLowerCase();
    }
}
exports.RandomGenerator = RandomGenerator;

//# sourceMappingURL=RandomGenerator.js.map
