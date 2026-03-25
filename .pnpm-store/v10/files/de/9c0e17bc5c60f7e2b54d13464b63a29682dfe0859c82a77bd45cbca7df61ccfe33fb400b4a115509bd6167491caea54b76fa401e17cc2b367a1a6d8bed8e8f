"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FFTCore = void 0;
exports.isPowerOfTwo = isPowerOfTwo;
exports.nextPowerOfTwo = nextPowerOfTwo;
exports.reverseBits = reverseBits;
exports.log2 = log2;
exports.bitReversalInplace = bitReversalInplace;
exports.bitReversalPermutation = bitReversalPermutation;
exports.rootsOfUnity = rootsOfUnity;
exports.FFT = FFT;
exports.poly = poly;
function checkU32(n) {
    // 0xff_ff_ff_ff
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff)
        throw new Error('wrong u32 integer:' + n);
    return n;
}
/** Checks if integer is in form of `1 << X` */
function isPowerOfTwo(x) {
    checkU32(x);
    return (x & (x - 1)) === 0 && x !== 0;
}
function nextPowerOfTwo(n) {
    checkU32(n);
    if (n <= 1)
        return 1;
    return (1 << (log2(n - 1) + 1)) >>> 0;
}
function reverseBits(n, bits) {
    checkU32(n);
    let reversed = 0;
    for (let i = 0; i < bits; i++, n >>>= 1)
        reversed = (reversed << 1) | (n & 1);
    return reversed;
}
/** Similar to `bitLen(x)-1` but much faster for small integers, like indices */
function log2(n) {
    checkU32(n);
    return 31 - Math.clz32(n);
}
/**
 * Moves lowest bit to highest position, which at first step splits
 * array on even and odd indices, then it applied again to each part,
 * which is core of fft
 */
function bitReversalInplace(values) {
    const n = values.length;
    if (n < 2 || !isPowerOfTwo(n))
        throw new Error('n must be a power of 2 and greater than 1. Got ' + n);
    const bits = log2(n);
    for (let i = 0; i < n; i++) {
        const j = reverseBits(i, bits);
        if (i < j) {
            const tmp = values[i];
            values[i] = values[j];
            values[j] = tmp;
        }
    }
    return values;
}
function bitReversalPermutation(values) {
    return bitReversalInplace(values.slice());
}
const _1n = /** @__PURE__ */ BigInt(1);
function findGenerator(field) {
    let G = BigInt(2);
    for (; field.eql(field.pow(G, field.ORDER >> _1n), field.ONE); G++)
        ;
    return G;
}
/** We limit roots up to 2**31, which is a lot: 2-billion polynomimal should be rare. */
function rootsOfUnity(field, generator) {
    // Factor field.ORDER-1 as oddFactor * 2^powerOfTwo
    let oddFactor = field.ORDER - _1n;
    let powerOfTwo = 0;
    for (; (oddFactor & _1n) !== _1n; powerOfTwo++, oddFactor >>= _1n)
        ;
    // Find non quadratic residue
    let G = generator !== undefined ? BigInt(generator) : findGenerator(field);
    // Powers of generator
    const omegas = new Array(powerOfTwo + 1);
    omegas[powerOfTwo] = field.pow(G, oddFactor);
    for (let i = powerOfTwo; i > 0; i--)
        omegas[i - 1] = field.sqr(omegas[i]);
    // Compute all roots of unity for powers up to maxPower
    const rootsCache = [];
    const checkBits = (bits) => {
        checkU32(bits);
        if (bits > 31 || bits > powerOfTwo)
            throw new Error('rootsOfUnity: wrong bits ' + bits + ' powerOfTwo=' + powerOfTwo);
        return bits;
    };
    const precomputeRoots = (maxPower) => {
        checkBits(maxPower);
        for (let power = maxPower; power >= 0; power--) {
            if (rootsCache[power])
                continue; // Skip if we've already computed roots for this power
            const rootsAtPower = [];
            for (let j = 0, cur = field.ONE; j < 2 ** power; j++, cur = field.mul(cur, omegas[power]))
                rootsAtPower.push(cur);
            rootsCache[power] = rootsAtPower;
        }
        return rootsCache[maxPower];
    };
    const brpCache = new Map();
    const inverseCache = new Map();
    // NOTE: we use bits instead of power, because power = 2**bits,
    // but power is not neccesary isPowerOfTwo(power)!
    return {
        roots: (bits) => {
            const b = checkBits(bits);
            return precomputeRoots(b);
        },
        brp(bits) {
            const b = checkBits(bits);
            if (brpCache.has(b))
                return brpCache.get(b);
            else {
                const res = bitReversalPermutation(this.roots(b));
                brpCache.set(b, res);
                return res;
            }
        },
        inverse(bits) {
            const b = checkBits(bits);
            if (inverseCache.has(b))
                return inverseCache.get(b);
            else {
                const res = field.invertBatch(this.roots(b));
                inverseCache.set(b, res);
                return res;
            }
        },
        omega: (bits) => omegas[checkBits(bits)],
        clear: () => {
            rootsCache.splice(0, rootsCache.length);
            brpCache.clear();
        },
    };
}
/**
 * Constructs different flavors of FFT. radix2 implementation of low level mutating API. Flavors:
 *
 * - DIT (Decimation-in-Time): Bottom-Up (leaves -> root), Cool-Turkey
 * - DIF (Decimation-in-Frequency): Top-Down (root -> leaves), Gentleman–Sande
 *
 * DIT takes brp input, returns natural output.
 * DIF takes natural input, returns brp output.
 *
 * The output is actually identical. Time / frequence distinction is not meaningful
 * for Polynomial multiplication in fields.
 * Which means if protocol supports/needs brp output/inputs, then we can skip this step.
 *
 * Cyclic NTT: Rq = Zq[x]/(x^n-1). butterfly_DIT+loop_DIT OR butterfly_DIF+loop_DIT, roots are omega
 * Negacyclic NTT: Rq = Zq[x]/(x^n+1). butterfly_DIT+loop_DIF, at least for mlkem / mldsa
 */
const FFTCore = (F, coreOpts) => {
    const { N, roots, dit, invertButterflies = false, skipStages = 0, brp = true } = coreOpts;
    const bits = log2(N);
    if (!isPowerOfTwo(N))
        throw new Error('FFT: Polynomial size should be power of two');
    const isDit = dit !== invertButterflies;
    isDit;
    return (values) => {
        if (values.length !== N)
            throw new Error('FFT: wrong Polynomial length');
        if (dit && brp)
            bitReversalInplace(values);
        for (let i = 0, g = 1; i < bits - skipStages; i++) {
            // For each stage s (sub-FFT length m = 2^s)
            const s = dit ? i + 1 + skipStages : bits - i;
            const m = 1 << s;
            const m2 = m >> 1;
            const stride = N >> s;
            // Loop over each subarray of length m
            for (let k = 0; k < N; k += m) {
                // Loop over each butterfly within the subarray
                for (let j = 0, grp = g++; j < m2; j++) {
                    const rootPos = invertButterflies ? (dit ? N - grp : grp) : j * stride;
                    const i0 = k + j;
                    const i1 = k + j + m2;
                    const omega = roots[rootPos];
                    const b = values[i1];
                    const a = values[i0];
                    // Inlining gives us 10% perf in kyber vs functions
                    if (isDit) {
                        const t = F.mul(b, omega); // Standard DIT butterfly
                        values[i0] = F.add(a, t);
                        values[i1] = F.sub(a, t);
                    }
                    else if (invertButterflies) {
                        values[i0] = F.add(b, a); // DIT loop + inverted butterflies (Kyber decode)
                        values[i1] = F.mul(F.sub(b, a), omega);
                    }
                    else {
                        values[i0] = F.add(a, b); // Standard DIF butterfly
                        values[i1] = F.mul(F.sub(a, b), omega);
                    }
                }
            }
        }
        if (!dit && brp)
            bitReversalInplace(values);
        return values;
    };
};
exports.FFTCore = FFTCore;
/**
 * NTT aka FFT over finite field (NOT over complex numbers).
 * Naming mirrors other libraries.
 */
function FFT(roots, opts) {
    const getLoop = (N, roots, brpInput = false, brpOutput = false) => {
        if (brpInput && brpOutput) {
            // we cannot optimize this case, but lets support it anyway
            return (values) => (0, exports.FFTCore)(opts, { N, roots, dit: false, brp: false })(bitReversalInplace(values));
        }
        if (brpInput)
            return (0, exports.FFTCore)(opts, { N, roots, dit: true, brp: false });
        if (brpOutput)
            return (0, exports.FFTCore)(opts, { N, roots, dit: false, brp: false });
        return (0, exports.FFTCore)(opts, { N, roots, dit: true, brp: true }); // all natural
    };
    return {
        direct(values, brpInput = false, brpOutput = false) {
            const N = values.length;
            if (!isPowerOfTwo(N))
                throw new Error('FFT: Polynomial size should be power of two');
            const bits = log2(N);
            return getLoop(N, roots.roots(bits), brpInput, brpOutput)(values.slice());
        },
        inverse(values, brpInput = false, brpOutput = false) {
            const N = values.length;
            const bits = log2(N);
            const res = getLoop(N, roots.inverse(bits), brpInput, brpOutput)(values.slice());
            const ivm = opts.inv(BigInt(values.length)); // scale
            // we can get brp output if we use dif instead of dit!
            for (let i = 0; i < res.length; i++)
                res[i] = opts.mul(res[i], ivm);
            // Allows to re-use non-inverted roots, but is VERY fragile
            // return [res[0]].concat(res.slice(1).reverse());
            // inverse calculated as pow(-1), which transforms into ω^{-kn} (-> reverses indices)
            return res;
        },
    };
}
function poly(field, roots, create, fft, length) {
    const F = field;
    const _create = create ||
        ((len, elm) => new Array(len).fill(elm ?? F.ZERO));
    const isPoly = (x) => Array.isArray(x) || ArrayBuffer.isView(x);
    const checkLength = (...lst) => {
        if (!lst.length)
            return 0;
        for (const i of lst)
            if (!isPoly(i))
                throw new Error('poly: not polynomial: ' + i);
        const L = lst[0].length;
        for (let i = 1; i < lst.length; i++)
            if (lst[i].length !== L)
                throw new Error(`poly: mismatched lengths ${L} vs ${lst[i].length}`);
        if (length !== undefined && L !== length)
            throw new Error(`poly: expected fixed length ${length}, got ${L}`);
        return L;
    };
    function findOmegaIndex(x, n, brp = false) {
        const bits = log2(n);
        const omega = brp ? roots.brp(bits) : roots.roots(bits);
        for (let i = 0; i < n; i++)
            if (F.eql(x, omega[i]))
                return i;
        return -1;
    }
    // TODO: mutating versions for mlkem/mldsa
    return {
        roots,
        create: _create,
        length,
        extend: (a, len) => {
            checkLength(a);
            const out = _create(len, F.ZERO);
            for (let i = 0; i < a.length; i++)
                out[i] = a[i];
            return out;
        },
        degree: (a) => {
            checkLength(a);
            for (let i = a.length - 1; i >= 0; i--)
                if (!F.is0(a[i]))
                    return i;
            return -1;
        },
        add: (a, b) => {
            const len = checkLength(a, b);
            const out = _create(len);
            for (let i = 0; i < len; i++)
                out[i] = F.add(a[i], b[i]);
            return out;
        },
        sub: (a, b) => {
            const len = checkLength(a, b);
            const out = _create(len);
            for (let i = 0; i < len; i++)
                out[i] = F.sub(a[i], b[i]);
            return out;
        },
        dot: (a, b) => {
            const len = checkLength(a, b);
            const out = _create(len);
            for (let i = 0; i < len; i++)
                out[i] = F.mul(a[i], b[i]);
            return out;
        },
        mul: (a, b) => {
            if (isPoly(b)) {
                const len = checkLength(a, b);
                if (fft) {
                    const A = fft.direct(a, false, true);
                    const B = fft.direct(b, false, true);
                    for (let i = 0; i < A.length; i++)
                        A[i] = F.mul(A[i], B[i]);
                    return fft.inverse(A, true, false);
                }
                else {
                    // NOTE: this is quadratic and mostly for compat tests with FFT
                    const res = _create(len);
                    for (let i = 0; i < len; i++) {
                        for (let j = 0; j < len; j++) {
                            const k = (i + j) % len; // wrap mod length
                            res[k] = F.add(res[k], F.mul(a[i], b[j]));
                        }
                    }
                    return res;
                }
            }
            else {
                const out = _create(checkLength(a));
                for (let i = 0; i < out.length; i++)
                    out[i] = F.mul(a[i], b);
                return out;
            }
        },
        convolve(a, b) {
            const len = nextPowerOfTwo(a.length + b.length - 1);
            return this.mul(this.extend(a, len), this.extend(b, len));
        },
        shift(p, factor) {
            const out = _create(checkLength(p));
            out[0] = p[0];
            for (let i = 1, power = F.ONE; i < p.length; i++) {
                power = F.mul(power, factor);
                out[i] = F.mul(p[i], power);
            }
            return out;
        },
        clone: (a) => {
            checkLength(a);
            const out = _create(a.length);
            for (let i = 0; i < a.length; i++)
                out[i] = a[i];
            return out;
        },
        eval: (a, basis) => {
            checkLength(a);
            let acc = F.ZERO;
            for (let i = 0; i < a.length; i++)
                acc = F.add(acc, F.mul(a[i], basis[i]));
            return acc;
        },
        monomial: {
            basis: (x, n) => {
                const out = _create(n);
                let pow = F.ONE;
                for (let i = 0; i < n; i++) {
                    out[i] = pow;
                    pow = F.mul(pow, x);
                }
                return out;
            },
            eval: (a, x) => {
                checkLength(a);
                // Same as eval(a, monomialBasis(x, a.length)), but it is faster this way
                let acc = F.ZERO;
                for (let i = a.length - 1; i >= 0; i--)
                    acc = F.add(F.mul(acc, x), a[i]);
                return acc;
            },
        },
        lagrange: {
            basis: (x, n, brp = false, weights) => {
                const bits = log2(n);
                const cache = weights || brp ? roots.brp(bits) : roots.roots(bits); // [ω⁰, ω¹, ..., ωⁿ⁻¹]
                const out = _create(n);
                // Fast Kronecker-δ shortcut
                const idx = findOmegaIndex(x, n, brp);
                if (idx !== -1) {
                    out[idx] = F.ONE;
                    return out;
                }
                const tm = F.pow(x, BigInt(n));
                const c = F.mul(F.sub(tm, F.ONE), F.inv(BigInt(n))); // c = (xⁿ - 1)/n
                const denom = _create(n);
                for (let i = 0; i < n; i++)
                    denom[i] = F.sub(x, cache[i]);
                const inv = F.invertBatch(denom);
                for (let i = 0; i < n; i++)
                    out[i] = F.mul(c, F.mul(cache[i], inv[i]));
                return out;
            },
            eval(a, x, brp = false) {
                checkLength(a);
                const idx = findOmegaIndex(x, a.length, brp);
                if (idx !== -1)
                    return a[idx]; // fast path
                const L = this.basis(x, a.length, brp); // Lᵢ(x)
                let acc = F.ZERO;
                for (let i = 0; i < a.length; i++)
                    if (!F.is0(a[i]))
                        acc = F.add(acc, F.mul(a[i], L[i]));
                return acc;
            },
        },
        vanishing(roots) {
            checkLength(roots);
            const out = _create(roots.length + 1, F.ZERO);
            out[0] = F.ONE;
            for (const r of roots) {
                const neg = F.neg(r);
                for (let j = out.length - 1; j > 0; j--)
                    out[j] = F.add(F.mul(out[j], neg), out[j - 1]);
                out[0] = F.mul(out[0], neg);
            }
            return out;
        },
    };
}
//# sourceMappingURL=fft.js.map