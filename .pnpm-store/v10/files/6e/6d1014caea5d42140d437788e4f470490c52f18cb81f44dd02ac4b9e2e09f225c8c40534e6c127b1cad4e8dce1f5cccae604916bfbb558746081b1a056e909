"use strict";
exports.__esModule = true;
var MersenneTwister = (function () {
    function MersenneTwister(states, index) {
        this.states = states;
        this.index = index;
    }
    MersenneTwister.twist = function (prev) {
        var mt = prev.slice();
        for (var idx = 0; idx !== MersenneTwister.N - MersenneTwister.M; ++idx) {
            var y_1 = (mt[idx] & MersenneTwister.MASK_UPPER) + (mt[idx + 1] & MersenneTwister.MASK_LOWER);
            mt[idx] = mt[idx + MersenneTwister.M] ^ (y_1 >>> 1) ^ (-(y_1 & 1) & MersenneTwister.A);
        }
        for (var idx = MersenneTwister.N - MersenneTwister.M; idx !== MersenneTwister.N - 1; ++idx) {
            var y_2 = (mt[idx] & MersenneTwister.MASK_UPPER) + (mt[idx + 1] & MersenneTwister.MASK_LOWER);
            mt[idx] = mt[idx + MersenneTwister.M - MersenneTwister.N] ^ (y_2 >>> 1) ^ (-(y_2 & 1) & MersenneTwister.A);
        }
        var y = (mt[MersenneTwister.N - 1] & MersenneTwister.MASK_UPPER) + (mt[0] & MersenneTwister.MASK_LOWER);
        mt[MersenneTwister.N - 1] = mt[MersenneTwister.M - 1] ^ (y >>> 1) ^ (-(y & 1) & MersenneTwister.A);
        return mt;
    };
    MersenneTwister.seeded = function (seed) {
        var out = Array(MersenneTwister.N);
        out[0] = seed;
        for (var idx = 1; idx !== MersenneTwister.N; ++idx) {
            var xored = out[idx - 1] ^ (out[idx - 1] >>> 30);
            out[idx] = (Math.imul(MersenneTwister.F, xored) + idx) | 0;
        }
        return out;
    };
    MersenneTwister.from = function (seed) {
        return new MersenneTwister(MersenneTwister.twist(MersenneTwister.seeded(seed)), 0);
    };
    MersenneTwister.prototype.clone = function () {
        return new MersenneTwister(this.states, this.index);
    };
    MersenneTwister.prototype.next = function () {
        var nextRng = new MersenneTwister(this.states, this.index);
        var out = nextRng.unsafeNext();
        return [out, nextRng];
    };
    MersenneTwister.prototype.unsafeNext = function () {
        var y = this.states[this.index];
        y ^= this.states[this.index] >>> MersenneTwister.U;
        y ^= (y << MersenneTwister.S) & MersenneTwister.B;
        y ^= (y << MersenneTwister.T) & MersenneTwister.C;
        y ^= y >>> MersenneTwister.L;
        if (++this.index >= MersenneTwister.N) {
            this.states = MersenneTwister.twist(this.states);
            this.index = 0;
        }
        return y;
    };
    MersenneTwister.N = 624;
    MersenneTwister.M = 397;
    MersenneTwister.R = 31;
    MersenneTwister.A = 0x9908b0df;
    MersenneTwister.F = 1812433253;
    MersenneTwister.U = 11;
    MersenneTwister.S = 7;
    MersenneTwister.B = 0x9d2c5680;
    MersenneTwister.T = 15;
    MersenneTwister.C = 0xefc60000;
    MersenneTwister.L = 18;
    MersenneTwister.MASK_LOWER = Math.pow(2, MersenneTwister.R) - 1;
    MersenneTwister.MASK_UPPER = Math.pow(2, MersenneTwister.R);
    return MersenneTwister;
}());
function default_1(seed) {
    return MersenneTwister.from(seed);
}
exports["default"] = default_1;
