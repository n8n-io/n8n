# noble-curves

Audited & minimal JS implementation of elliptic curve cryptography.

- 🔒 [**Audited**](#security) by independent security firms
- 🔻 Tree-shakeable: unused code is excluded from your builds
- 🏎 Fast: hand-optimized for caveats of JS engines
- 🔍 Reliable: tested against cross-library, wycheproof and acvp vectors
- ➰ Weierstrass, Edwards, Montgomery curves; ECDSA, EdDSA, Schnorr, BLS signatures
- ✍️ ECDH, hash-to-curve, OPRF, Poseidon ZK-friendly hash
- 🔖 Non-repudiation (SUF-CMA, SBS) & consensus-friendliness (ZIP215) in ed25519, ed448
- 🥈 Optional, friendly wrapper over native WebCrypto
- 🪶 36KB (gzipped) including bundled hashes, 11KB for single-curve build

Curves have 4KB sister projects
[secp256k1](https://github.com/paulmillr/noble-secp256k1) & [ed25519](https://github.com/paulmillr/noble-ed25519).
They have smaller attack surface, but less features.

Take a glance at [GitHub Discussions](https://github.com/paulmillr/noble-curves/discussions) for questions and support.

### This library belongs to _noble_ cryptography

> **noble cryptography** — high-security, easily auditable set of contained cryptographic libraries and tools.

- Zero or minimal dependencies
- Highly readable TypeScript / JS code
- PGP-signed releases and transparent NPM builds
- All libraries:
  [ciphers](https://github.com/paulmillr/noble-ciphers),
  [curves](https://github.com/paulmillr/noble-curves),
  [hashes](https://github.com/paulmillr/noble-hashes),
  [post-quantum](https://github.com/paulmillr/noble-post-quantum),
  4kb [secp256k1](https://github.com/paulmillr/noble-secp256k1) /
  [ed25519](https://github.com/paulmillr/noble-ed25519)
- [Check out homepage](https://paulmillr.com/noble/)
  for reading resources, documentation and apps built with noble

## Usage

> `npm install @noble/curves`

> `deno add jsr:@noble/curves`

> `deno doc jsr:@noble/curves` # command-line documentation

We support all major platforms and runtimes.
For React Native, you may need a [polyfill for getRandomValues](https://github.com/LinusU/react-native-get-random-values).
A standalone file [noble-curves.js](https://github.com/paulmillr/noble-curves/releases) is also available.

```ts
// import * from '@noble/curves'; // Error: use sub-imports, to ensure small app size
import { secp256k1, schnorr } from '@noble/curves/secp256k1.js';
import { ed25519, ed25519ph, ed25519ctx, x25519 } from '@noble/curves/ed25519.js';
import { ed448, ed448ph, ed448ctx, x448 } from '@noble/curves/ed448.js';
import { p256, p384, p521 } from '@noble/curves/nist.js';
import { bls12_381 } from '@noble/curves/bls12-381.js';
import { bn254 } from '@noble/curves/bn254.js';
import { jubjub, babyjubjub } from '@noble/curves/misc.js';
import { bytesToHex, hexToBytes, concatBytes, utf8ToBytes } from '@noble/curves/abstract/utils.js';
```

- [ECDSA signatures over secp256k1 and others](#ecdsa-signatures-over-secp256k1-and-others)
- [Hedged ECDSA with noise](#hedged-ecdsa-with-noise)
- [ECDH: Diffie-Hellman shared secrets](#ecdh-diffie-hellman-shared-secrets)
- [secp256k1 Schnorr signatures from BIP340](#secp256k1-schnorr-signatures-from-bip340)
- [ed25519](#ed25519) / [X25519](#x25519) / [ristretto255](#ristretto255)
- [ed448](#ed448) / [X448](#x448) / [decaf448](#decaf448)
- [bls12-381](#bls12-381)
- [bn254 aka alt_bn128](#bn254-aka-alt_bn128)
- [misc curves](#misc-curves)
- [Low-level methods](#low-level-methods)
- [Abstract API](#abstract-api)
  - [weierstrass](#weierstrass-short-weierstrass-curve), [Projective Point](#projective-weierstrass-point), [ECDSA signatures](#ecdsa-signatures)
  - [edwards](#edwards-twisted-edwards-curve), [Extended Point](#extended-edwards-point), [EdDSA signatures](#eddsa-signatures)
  - [montgomery](#montgomery-montgomery-curve)
  - [bls](#bls-barreto-lynn-scott-curves)
  - [hash-to-curve](#hash-to-curve-hashing-strings-to-curve-points)
  - [poseidon](#poseidon-poseidon-hash)
  - [modular](#modular-modular-arithmetics-utilities)
  - [fft](#fft-fast-fourier-transform)
  - [Creating private keys from hashes](#creating-private-keys-from-hashes)
  - [utils](#utils-useful-utilities)
- [Security](#security)
- [Speed](#speed)
- [Upgrading](#upgrading)
- [Contributing & testing](#contributing--testing)
- [License](#license)

### Implementations

#### ECDSA signatures over secp256k1 and others

```ts
import { secp256k1 } from '@noble/curves/secp256k1.js';
// import { p256 } from '@noble/curves/nist.js'; // or p384 / p521

const priv = secp256k1.utils.randomPrivateKey();
const pub = secp256k1.getPublicKey(priv);
const msg = new Uint8Array(32).fill(1); // message hash (not message) in ecdsa
const sig = secp256k1.sign(msg, priv); // `{prehash: true}` option is available
const isValid = secp256k1.verify(sig, msg, pub) === true;

// hex strings are also supported besides Uint8Array-s:
const privHex = '46c930bc7bb4db7f55da20798697421b98c4175a52c630294d75a84b9c126236';
const pub2 = secp256k1.getPublicKey(privHex);

// public key recovery
// let sig = secp256k1.Signature.fromCompact(sigHex); // or .fromDER(sigDERHex)
// sig = sig.addRecoveryBit(bit); // bit is not serialized into compact / der format
sig.recoverPublicKey(msg).toRawBytes(); // === pub; // public key recovery
```

The same code would work for NIST P256 (secp256r1), P384 (secp384r1) & P521 (secp521r1).

#### Hedged ECDSA with noise

```ts
const noisySignature = secp256k1.sign(msg, priv, { extraEntropy: true });
const ent = new Uint8Array(32).fill(3); // set custom entropy
const noisySignature2 = secp256k1.sign(msg, priv, { extraEntropy: ent });
```

Hedged ECDSA is add-on, providing improved protection against fault attacks.
It adds noise to signatures. The technique is used by default in BIP340; we also implement them
optionally for ECDSA. Check out blog post
[Deterministic signatures are not your friends](https://paulmillr.com/posts/deterministic-signatures/)
and [spec draft](https://datatracker.ietf.org/doc/draft-irtf-cfrg-det-sigs-with-noise/).

#### ECDH: Diffie-Hellman shared secrets

```ts
const someonesPub = secp256k1.getPublicKey(secp256k1.utils.randomPrivateKey());
const shared = secp256k1.getSharedSecret(priv, someonesPub);
// NOTE:
// - `shared` includes parity byte: strip it using shared.slice(1)
// - `shared` is not hashed: more secure way is sha256(shared) or hkdf(shared)
```

#### secp256k1 Schnorr signatures from BIP340

```ts
import { schnorr } from '@noble/curves/secp256k1.js';
const priv = schnorr.utils.randomPrivateKey();
const pub = schnorr.getPublicKey(priv);
const msg = new TextEncoder().encode('hello');
const sig = schnorr.sign(msg, priv);
const isValid = schnorr.verify(sig, msg, pub);
```

#### ed25519

```ts
import { ed25519 } from '@noble/curves/ed25519.js';
const priv = ed25519.utils.randomPrivateKey();
const pub = ed25519.getPublicKey(priv);
const msg = new TextEncoder().encode('hello');
const sig = ed25519.sign(msg, priv);
ed25519.verify(sig, msg, pub); // Default mode: follows ZIP215
ed25519.verify(sig, msg, pub, { zip215: false }); // SBS / e-voting / RFC8032 / FIPS 186-5

// Variants from RFC8032: with context, prehashed
import { ed25519ctx, ed25519ph } from '@noble/curves/ed25519.js';
```

Default `verify` behavior follows ZIP215 and
can be used in consensus-critical applications.
If you need SBS (Strongly Binding Signatures) and FIPS 186-5 compliance,
use `zip215: false`. Check out [Edwards Signatures section for more info](#edwards-twisted-edwards-curve).
Both options have SUF-CMA (strong unforgeability under chosen message attacks).

#### X25519

```ts
// X25519 aka ECDH on Curve25519 from [RFC7748](https://www.rfc-editor.org/rfc/rfc7748)
import { x25519 } from '@noble/curves/ed25519.js';
const priv = 'a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4';
const pub = 'e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c';
x25519.getSharedSecret(priv, pub) === x25519.scalarMult(priv, pub); // aliases
x25519.getPublicKey(priv) === x25519.scalarMultBase(priv);
x25519.getPublicKey(x25519.utils.randomPrivateKey());

// ed25519 => x25519 conversion
import { edwardsToMontgomeryPub, edwardsToMontgomeryPriv } from '@noble/curves/ed25519.js';
edwardsToMontgomeryPub(ed25519.getPublicKey(ed25519.utils.randomPrivateKey()));
edwardsToMontgomeryPriv(ed25519.utils.randomPrivateKey());
```

#### ristretto255

```ts
import { sha512 } from '@noble/hashes/sha2.js';
import {
  hashToCurve,
  encodeToCurve,
  RistrettoPoint,
  hashToRistretto255,
} from '@noble/curves/ed25519.js';

const msg = new TextEncoder().encode('Ristretto is traditionally a short shot of espresso coffee');
hashToCurve(msg);

const rp = RistrettoPoint.fromHex(
  '6a493210f7499cd17fecb510ae0cea23a110e8d5b901f8acadd3095c73a3b919'
);
RistrettoPoint.BASE.multiply(2n).add(rp).subtract(RistrettoPoint.BASE).toRawBytes();
RistrettoPoint.ZERO.equals(dp) === false;
// pre-hashed hash-to-curve
RistrettoPoint.hashToCurve(sha512(msg));
// full hash-to-curve including domain separation tag
hashToRistretto255(msg, { DST: 'ristretto255_XMD:SHA-512_R255MAP_RO_' });
```

Check out [RFC9496](https://www.rfc-editor.org/rfc/rfc9496) more info on ristretto255.

#### ed448

```ts
import { ed448 } from '@noble/curves/ed448.js';
const priv = ed448.utils.randomPrivateKey();
const pub = ed448.getPublicKey(priv);
const msg = new TextEncoder().encode('whatsup');
const sig = ed448.sign(msg, priv);
ed448.verify(sig, msg, pub);

// Variants from RFC8032: prehashed
import { ed448ph } from '@noble/curves/ed448.js';
```

#### X448

```ts
// X448 aka ECDH on Curve448 from [RFC7748](https://www.rfc-editor.org/rfc/rfc7748)
import { x448 } from '@noble/curves/ed448.js';
x448.getSharedSecret(priv, pub) === x448.scalarMult(priv, pub); // aliases
x448.getPublicKey(priv) === x448.scalarMultBase(priv);

// ed448 => x448 conversion
import { edwardsToMontgomeryPub } from '@noble/curves/ed448.js';
edwardsToMontgomeryPub(ed448.getPublicKey(ed448.utils.randomPrivateKey()));
```

#### decaf448

```ts
// decaf448 from [RFC9496](https://www.rfc-editor.org/rfc/rfc9496)
import { shake256 } from '@noble/hashes/sha3.js';
import { hashToCurve, encodeToCurve, DecafPoint, hashToDecaf448 } from '@noble/curves/ed448.js';

const msg = new TextEncoder().encode('Ristretto is traditionally a short shot of espresso coffee');
hashToCurve(msg);

const dp = DecafPoint.fromHex(
  'c898eb4f87f97c564c6fd61fc7e49689314a1f818ec85eeb3bd5514ac816d38778f69ef347a89fca817e66defdedce178c7cc709b2116e75'
);
DecafPoint.BASE.multiply(2n).add(dp).subtract(DecafPoint.BASE).toRawBytes();
DecafPoint.ZERO.equals(dp) === false;
// pre-hashed hash-to-curve
DecafPoint.hashToCurve(shake256(msg, { dkLen: 112 }));
// full hash-to-curve including domain separation tag
hashToDecaf448(msg, { DST: 'decaf448_XOF:SHAKE256_D448MAP_RO_' });
```

Check out [RFC9496](https://www.rfc-editor.org/rfc/rfc9496) more info on decaf448.

#### bls12-381

```ts
import { bls12_381 } from '@noble/curves/bls12-381.js';
import { hexToBytes } from '@noble/curves/abstract/utils.js';

// private keys are 32 bytes
const privKey = hexToBytes('67d53f170b908cabb9eb326c3c337762d59289a8fec79f7bc9254b584b73265c');
// const privKey = bls12_381.utils.randomPrivateKey();

// Long signatures (G2), short public keys (G1)
const blsl = bls12_381.longSignatures;
const publicKey = blsl.getPublicKey(privateKey);
// Sign msg with custom (Ethereum) DST
const msg = new TextEncoder().encode('hello');
const DST = 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_';
const msgp = blsl.hash(msg, DST);
const signature = blsl.sign(msgp, privateKey);
const isValid = blsl.verify(signature, msgp, publicKey);
console.log({ publicKey, signature, isValid });

// Short signatures (G1), long public keys (G2)
const blss = bls12_381.shortSignatures;
const publicKey2 = blss.getPublicKey(privateKey);
const msgp2 = blss.hash(new TextEncoder().encode('hello'), 'BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL_')
const signature2 = blss.sign(msgp2, privateKey);
const isValid2 = blss.verify(signature2, msgp2, publicKey);
console.log({ publicKey2, signature2, isValid2 });

// Aggregation
const aggregatedKey = bls12_381.longSignatures.aggregatePublicKeys([
  bls12_381.utils.randomPrivateKey(),
  bls12_381.utils.randomPrivateKey(),
]);
// const aggregatedSig = bls.aggregateSignatures(sigs)

// Pairings, with and without final exponentiation
// bls.pairing(PointG1, PointG2);
// bls.pairing(PointG1, PointG2, false);
// bls.fields.Fp12.finalExponentiate(bls.fields.Fp12.mul(PointG1, PointG2));

// Others
// bls.G1.ProjectivePoint.BASE, bls.G2.ProjectivePoint.BASE;
// bls.fields.Fp, bls.fields.Fp2, bls.fields.Fp12, bls.fields.Fr;
```

See [abstract/bls](#bls-barreto-lynn-scott-curves).
For example usage, check out [the implementation of BLS EVM precompiles](https://github.com/ethereumjs/ethereumjs-monorepo/blob/361f4edbc239e795a411ac2da7e5567298b9e7e5/packages/evm/src/precompiles/bls12_381/noble.ts).

#### bn254 aka alt_bn128

```ts
import { bn254 } from '@noble/curves/bn254.js';

console.log(bn254.G1, bn254.G2, bn254.pairing);
```

The API mirrors [BLS](#bls12-381). The curve was previously called alt_bn128.
The implementation is compatible with [EIP-196](https://eips.ethereum.org/EIPS/eip-196) and
[EIP-197](https://eips.ethereum.org/EIPS/eip-197).

We don't implement Point methods toHex / toRawBytes.
To work around this limitation, has to initialize points on their own from BigInts.
Reason it's not implemented is because [there is no standard](https://github.com/privacy-scaling-explorations/halo2curves/issues/109).
Points of divergence:

- Endianness: LE vs BE (byte-swapped)
- Flags as first hex bits (similar to BLS) vs no-flags
- Imaginary part last in G2 vs first (c0, c1 vs c1, c0)

For example usage, check out [the implementation of bn254 EVM precompiles](https://github.com/paulmillr/noble-curves/blob/3ed792f8ad9932765b84d1064afea8663a255457/test/bn254.test.js#L697).

#### misc curves

```ts
import { jubjub, babyjubjub } from '@noble/curves/misc.js';
```

Miscellaneous, rarely used curves are contained in the module.
Jubjub curves have Fp over scalar fields of other curves. They are friendly to ZK proofs.
jubjub Fp = bls n. babyjubjub Fp = bn254 n.

## Abstract API

Abstract API allows to define custom curves. All arithmetics is done with JS
bigints over finite fields, which is defined from `modular` sub-module.
For scalar multiplication, we use
[precomputed tables with w-ary non-adjacent form (wNAF)](https://paulmillr.com/posts/noble-secp256k1-fast-ecc/).
Precomputes are enabled for weierstrass and edwards BASE points of a curve.
Implementations use [noble-hashes](https://github.com/paulmillr/noble-hashes).
It's always possible to use different hashing library.


### weierstrass: Short Weierstrass curve

```js
import { weierstrass } from '@noble/curves/abstract/weierstrass.js';
// NIST secp192r1 aka p192. https://www.secg.org/sec2-v2.pdf
const p192_CURVE = {
  p: 0xfffffffffffffffffffffffffffffffeffffffffffffffffn,
  n: 0xffffffffffffffffffffffff99def836146bc9b1b4d22831n,
  h: 1n,
  a: 0xfffffffffffffffffffffffffffffffefffffffffffffffcn,
  b: 0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1n,
  Gx: 0x188da80eb03090f67cbf20eb43a18800f4ff0afd82ff1012n,
  Gy: 0x07192b95ffc8da78631011ed6b24cdd573f977a11e794811n,
};
const p192_Point = weierstrass(p192_CURVE);
```

Short Weierstrass curve's formula is `y² = x³ + ax + b`. `weierstrass`
expects arguments `a`, `b`, field characteristic `p`, curve order `n`,
cofactor `h` and coordinates `Gx`, `Gy` of generator point.

#### Projective Weierstrass Point

```js
// # weierstrass Point methods
// projective (homogeneous) coordinates: (x, y, z) ∋ (x=x/z, y=y/z)
// const p = new Point(x, y, z);
const p = Point.BASE;
// arithmetics
p.add(p).equals(p.double());
p.subtract(p).equals(Point.ZERO);
p.negate();
p.multiply(31415n);

// decoding, encoding
const b = p.toBytes();
const p2 = Point.fromBytes(b);
// affine conversion
const { x, y } = p.toAffine();
const p3 = Point.fromAffine({ x, y });

// Multi-scalar-multiplication (MSM) is basically `(Pa + Qb + Rc + ...)`.
// It's 10-30x faster vs naive addition for large amount of points.
// Pippenger algorithm is used underneath.
const points = [Point.BASE, Point.BASE.multiply(2n), Point.BASE.multiply(4n), Point.BASE.multiply(8n)];
Point.msm(points, [3n, 5n, 7n, 11n]).equals(Point.BASE.multiply(129n)); // 129*G
```

#### ECDSA signatures

```js
import { ecdsa } from '@noble/curves/abstract/weierstrass.js';
import { sha256 } from '@noble/hashes/sha2.js';
const p192 = ecdsa(p192_Point, sha256);
const priv = p192.utils.randomPrivateKey();
const pub = p192.getPublicKey(priv);
const msg = sha256(new TextEncoder().encode('custom curve'));
const sig = p192.sign(msg);
const isValid = p192.verify(sig, msg, pub);
```

ECDSA signatures:

- Are represented by `Signature` instances with `r, s` and optional `recovery` properties
- Have `recoverPublicKey()`, `toBytes()` with optional `format: 'compact' | 'der'`
- Can be prehashed, or non-prehashed:
  - `sign(msgHash, privKey)` (default, prehash: false) - you did hashing before
  - `sign(msg, privKey, {prehash: true})` - curves will do hashing for you
- Are generated deterministically, following [RFC6979](https://www.rfc-editor.org/rfc/rfc6979).
  - Consider [hedged ECDSA with noise](#hedged-ecdsa-with-noise) for adding randomness into
    for signatures, to get improved security against fault attacks.

### edwards: Twisted Edwards curve

```ts
import { edwards } from '@noble/curves/abstract/edwards.js';
const ed25519_CURVE = {
  p: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffedn,
  n: 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn,
  h: 8n,
  a: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffecn,
  d: 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n,
  Gx: 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an,
  Gy: 0x6666666666666666666666666666666666666666666666666666666666666658n,
};
const ed25519_Point = edwards(ed25519_CURVE);
```

Twisted Edwards curve's formula is `ax² + y² = 1 + dx²y²`.
You must specify `a`, `d`, field characteristic `p`, curve order `n` (sometimes named as `L`),
cofactor `h` and coordinates `Gx`, `Gy` of generator point.

#### Extended Edwards Point

```js
const Point = ed25519_Point;
// extended coordinates: (x, y, z, t) ∋ (x=x/z, y=y/z)
// const p = new Point(x, y, z, t);

const p = Point.BASE;
// arithmetics
p.add(p).equals(p.double());
p.subtract(p).equals(Point.ZERO);
p.negate();
p.multiply(31415n);

// decoding, encoding
const b = p.toBytes();
const p2 = Point.fromBytes(b);
// on-curve test
p.assertValidity();
// affine conversion
const { x, y } = p.toAffine();
const p3 = Point.fromAffine({ x, y });
// misc
const pcl = p.clearCofactor();
console.log(p.isTorsionFree(), p.isSmallOrder());
```

#### EdDSA signatures

```js
const ed25519 = eddsa(ed25519_Point, { hash: sha512 });
// ed25519.getPublicKey();
// ed25519.sign();
// ed25519.verify();
```

We define ed25519, ed448; user can use custom curves with EdDSA,
but EdDSA in general is not defined. Check out `edwards.ts` source code.

For EdDSA signatures:

- `zip215: true` is default behavior. It has slightly looser verification logic
  to be [consensus-friendly](https://hdevalence.ca/blog/2020-10-04-its-25519am), following [ZIP215](https://zips.z.cash/zip-0215) rules
- `zip215: false` switches verification criteria to strict
  [RFC8032](https://www.rfc-editor.org/rfc/rfc8032) / [FIPS 186-5](https://csrc.nist.gov/publications/detail/fips/186/5/final)
  and additionally provides [non-repudiation with SBS](https://eprint.iacr.org/2020/1244),
  which is useful for:
  - Contract Signing: if A signed an agreement with B using key that allows repudiation, it can later claim that it signed a different contract
  - E-voting: malicious voters may pick keys that allow repudiation in order to deny results
  - Blockchains: transaction of amount X might also be valid for a different amount Y
- Both modes have SUF-CMA (strong unforgeability under chosen message attacks).

### montgomery: Montgomery curve

The module contains methods for x-only ECDH on Curve25519 / Curve448 from RFC7748.
Proper Elliptic Curve Points are not implemented yet.

### bls: Barreto-Lynn-Scott curves

The module abstracts BLS (Barreto-Lynn-Scott) pairing-friendly elliptic curve construction.
They allow to construct [zk-SNARKs](https://z.cash/technology/zksnarks/) and
use aggregated, batch-verifiable
[threshold signatures](https://medium.com/snigirev.stepan/bls-signatures-better-than-schnorr-5a7fe30ea716),
using Boneh-Lynn-Shacham signature scheme.

The module doesn't expose `CURVE` property: use `G1.CURVE`, `G2.CURVE` instead.
Only BLS12-381 is currently implemented.
Defining BLS12-377 and BLS24 should be straightforward.

The default BLS uses short public keys (with public keys in G1 and signatures in G2).
Short signatures (public keys in G2 and signatures in G1) are also supported.

### hash-to-curve: Hashing strings to curve points

The module allows to hash arbitrary strings to elliptic curve points. Implements [RFC 9380](https://www.rfc-editor.org/rfc/rfc9380).

Every curve has exported `hashToCurve` and `encodeToCurve` methods. You should always prefer `hashToCurve` for security:

```ts
import { hashToCurve, encodeToCurve } from '@noble/curves/secp256k1.js';
import { randomBytes } from '@noble/hashes/utils.js';
hashToCurve('0102abcd');
console.log(hashToCurve(randomBytes()));
console.log(encodeToCurve(randomBytes()));

import { bls12_381 } from '@noble/curves/bls12-381.js';
bls12_381.G1.hashToCurve(randomBytes(), { DST: 'another' });
bls12_381.G2.hashToCurve(randomBytes(), { DST: 'custom' });
```

Low-level methods from the spec:

```ts
// produces a uniformly random byte string using a cryptographic hash function H that outputs b bits.
function expand_message_xmd(
  msg: Uint8Array,
  DST: Uint8Array,
  lenInBytes: number,
  H: CHash // For CHash see abstract/weierstrass docs section
): Uint8Array;
// produces a uniformly random byte string using an extendable-output function (XOF) H.
function expand_message_xof(
  msg: Uint8Array,
  DST: Uint8Array,
  lenInBytes: number,
  k: number,
  H: CHash
): Uint8Array;
// Hashes arbitrary-length byte strings to a list of one or more elements of a finite field F
function hash_to_field(msg: Uint8Array, count: number, options: Opts): bigint[][];

/**
 * * `DST` is a domain separation tag, defined in section 2.2.5
 * * `p` characteristic of F, where F is a finite field of characteristic p and order q = p^m
 * * `m` is extension degree (1 for prime fields)
 * * `k` is the target security target in bits (e.g. 128), from section 5.1
 * * `expand` is `xmd` (SHA2, SHA3, BLAKE) or `xof` (SHAKE, BLAKE-XOF)
 * * `hash` conforming to `utils.CHash` interface, with `outputLen` / `blockLen` props
 */
type UnicodeOrBytes = string | Uint8Array;
type Opts = {
  DST: UnicodeOrBytes;
  p: bigint;
  m: number;
  k: number;
  expand?: 'xmd' | 'xof';
  hash: CHash;
};
```

### poseidon: Poseidon hash

Implements [Poseidon](https://www.poseidon-hash.info) ZK-friendly hash:
permutation and sponge.

There are many poseidon variants with different constants.
We don't provide them: you should construct them manually.
Check out [scure-starknet](https://github.com/paulmillr/scure-starknet) package for a proper example.

```ts
import { poseidon, poseidonSponge } from '@noble/curves/abstract/poseidon.js';

const rate = 2;
const capacity = 1;
const { mds, roundConstants } = poseidon.grainGenConstants({
  Fp,
  t: rate + capacity,
  roundsFull: 8,
  roundsPartial: 31,
});
const opts = {
  Fp,
  rate,
  capacity,
  sboxPower: 17,
  mds,
  roundConstants,
  roundsFull: 8,
  roundsPartial: 31,
};
const permutation = poseidon.poseidon(opts);
const sponge = poseidon.poseidonSponge(opts); // use carefully, not specced
```

### modular: Modular arithmetics utilities

```ts
import * as mod from '@noble/curves/abstract/modular.js';

// Finite Field utils
const fp = mod.Field(2n ** 255n - 19n); // Finite field over 2^255-19
fp.mul(591n, 932n); // multiplication
fp.pow(481n, 11024858120n); // exponentiation
fp.div(5n, 17n); // division: 5/17 mod 2^255-19 == 5 * invert(17)
fp.inv(5n); // modular inverse
fp.sqrt(21n); // square root

// Non-Field generic utils are also available
mod.mod(21n, 10n); // 21 mod 10 == 1n; fixed version of 21 % 10
mod.invert(17n, 10n); // invert(17) mod 10; modular multiplicative inverse
mod.invertBatch([1n, 2n, 4n], 21n); // => [1n, 11n, 16n] in one inversion
```

Field operations are not constant-time: they are using JS bigints, see [security](#security).
The fact is mostly irrelevant, but the important method to keep in mind is `pow`,
which may leak exponent bits, when used naïvely.

`mod.Field` is always **field over prime number**. Non-prime fields aren't supported for now.
We don't test for prime-ness for speed and because algorithms are probabilistic anyway.
Initializing a non-prime field could make your app suspectible to
DoS (infilite loop) on Tonelli-Shanks square root calculation.

Unlike `mod.inv`, `mod.invertBatch` won't throw on `0`: make sure to throw an error yourself.

### fft: Fast Fourier Transform

Experimental implementation of NTT / FFT (Fast Fourier Transform) over finite fields.
API may change at any time. The code has not been audited. Feature requests are welcome.

```ts
import * as fft from '@noble/curves/abstract/fft.js';
```

#### Creating private keys from hashes

You can't simply make a 32-byte private key from a 32-byte hash.
Doing so will make the key [biased](https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/).

To make the bias negligible, we follow [FIPS 186-5 A.2](https://csrc.nist.gov/publications/detail/fips/186/5/final)
and [RFC 9380](https://www.rfc-editor.org/rfc/rfc9380#section-5.2).
This means, for 32-byte key, we would need 48-byte hash to get 2^-128 bias, which matches curve security level.

`hashToPrivateScalar()` that hashes to **private key** was created for this purpose.
Use [abstract/hash-to-curve](#hash-to-curve-hashing-strings-to-curve-points)
if you need to hash to **public key**.

```ts
import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import * as mod from '@noble/curves/abstract/modular.js';
const someKey = new Uint8Array(32).fill(2); // Needs to actually be random, not .fill(2)
const derived = hkdf(sha256, someKey, undefined, 'application', 48); // 48 bytes for 32-byte priv
const validPrivateKey = mod.hashToPrivateScalar(derived, p256.CURVE.n);
```

### utils: Useful utilities

```ts
import * as utils from '@noble/curves/abstract/utils.js';

utils.bytesToHex(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]));
utils.hexToBytes('deadbeef');
utils.numberToHexUnpadded(123n);
utils.hexToNumber();

utils.bytesToNumberBE(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]));
utils.bytesToNumberLE(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]));
utils.numberToBytesBE(123n, 32);
utils.numberToBytesLE(123n, 64);

utils.concatBytes(Uint8Array.from([0xde, 0xad]), Uint8Array.from([0xbe, 0xef]));
utils.nLength(255n);
utils.equalBytes(Uint8Array.from([0xde]), Uint8Array.from([0xde]));
```

### Unreleased bits

- `test/unreleased-xeddsa.ts` contains implementation of XEd25519, defined by Signal
- `test/misc/endomorphism.js` contains tool for generation of endomorphism params for Koblitz curves

## Security

The library has been independently audited:

- at version 1.6.0, in Sep 2024, by [Cure53](https://cure53.de)
  - PDFs: [website](https://cure53.de/audit-report_noble-crypto-libs.pdf), [in-repo](./audit/2024-09-cure53-audit-nbl4.pdf)
  - [Changes since audit](https://github.com/paulmillr/noble-curves/compare/1.6.0..main)
  - Scope: ed25519, ed448, their add-ons, bls12-381, bn254,
    hash-to-curve, low-level primitives bls, tower, edwards, montgomery.
  - The audit has been funded by [OpenSats](https://opensats.org)
- at version 1.2.0, in Sep 2023, by [Kudelski Security](https://kudelskisecurity.com)
  - PDFs: [in-repo](./audit/2023-09-kudelski-audit-starknet.pdf)
  - [Changes since audit](https://github.com/paulmillr/noble-curves/compare/1.2.0..main)
  - Scope: [scure-starknet](https://github.com/paulmillr/scure-starknet) and its related
    abstract modules of noble-curves: `curve`, `modular`, `poseidon`, `weierstrass`
  - The audit has been funded by [Starkware](https://starkware.co)
- at version 0.7.3, in Feb 2023, by [Trail of Bits](https://www.trailofbits.com)
  - PDFs: [website](https://github.com/trailofbits/publications/blob/master/reviews/2023-01-ryanshea-noblecurveslibrary-securityreview.pdf),
    [in-repo](./audit/2023-01-trailofbits-audit-curves.pdf)
  - [Changes since audit](https://github.com/paulmillr/noble-curves/compare/0.7.3..main)
  - Scope: abstract modules `curve`, `hash-to-curve`, `modular`, `poseidon`, `utils`, `weierstrass` and
    top-level modules `_shortw_utils` and `secp256k1`
  - The audit has been funded by [Ryan Shea](https://www.shea.io)

It is tested against property-based, cross-library and Wycheproof vectors,
and is being fuzzed in [the separate repo](https://github.com/paulmillr/fuzzing).

If you see anything unusual: investigate and report.

### Constant-timeness

We're targetting algorithmic constant time. _JIT-compiler_ and _Garbage Collector_ make "constant time"
extremely hard to achieve [timing attack](https://en.wikipedia.org/wiki/Timing_attack) resistance
in a scripting language. Which means _any other JS library can't have
constant-timeness_. Even statically typed Rust, a language without GC,
[makes it harder to achieve constant-time](https://www.chosenplaintext.ca/open-source/rust-timing-shield/security)
for some cases. If your goal is absolute security, don't use any JS lib — including bindings to native ones.
Use low-level libraries & languages.

### Memory dumping

Use low-level languages instead of JS / WASM if your goal is absolute security.

The library mostly uses Uint8Arrays and bigints.

- Uint8Arrays have `.fill(0)` which instructs to fill content with zeroes
  but there are no guarantees in JS
- bigints are immutable and don't have a method to zeroize their content:
  a user needs to wait until the next garbage collection cycle
- hex strings are also immutable: there is no way to zeroize them
- `await fn()` will write all internal variables to memory. With
  async functions there are no guarantees when the code
  chunk would be executed. Which means attacker can have
  plenty of time to read data from memory.

This means some secrets could stay in memory longer than anticipated.
However, if an attacker can read application memory, it's doomed anyway:
there is no way to guarantee anything about zeroizing sensitive data without
complex tests-suite which will dump process memory and verify that there is
no sensitive data left. For JS it means testing all browsers (including mobile).
And, of course, it will be useless without using the same
test-suite in the actual application that consumes the library.

### Supply chain security

- **Commits** are signed with PGP keys, to prevent forgery. Make sure to verify commit signatures
- **Releases** are transparent and built on GitHub CI. Make sure to verify [provenance](https://docs.npmjs.com/generating-provenance-statements) logs
  - Use GitHub CLI to verify single-file builds:
    `gh attestation verify --owner paulmillr noble-curves.js`
- **Rare releasing** is followed to ensure less re-audit need for end-users
- **Dependencies** are minimized and locked-down: any dependency could get hacked and users will be downloading malware with every install.
  - We make sure to use as few dependencies as possible
  - Automatic dep updates are prevented by locking-down version ranges; diffs are checked with `npm-diff`
- **Dev Dependencies** are disabled for end-users; they are only used to develop / build the source code

For this package, there is 1 dependency; and a few dev dependencies:

- [noble-hashes](https://github.com/paulmillr/noble-hashes) provides cryptographic hashing functionality
- micro-bmark, micro-should and jsbt are used for benchmarking / testing / build tooling and developed by the same author
- prettier, fast-check and typescript are used for code quality / test generation / ts compilation. It's hard to audit their source code thoroughly and fully because of their size

### Randomness

We're deferring to built-in
[crypto.getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
which is considered cryptographically secure (CSPRNG).

In the past, browsers had bugs that made it weak: it may happen again.
Implementing a userspace CSPRNG to get resilient to the weakness
is even worse: there is no reliable userspace source of quality entropy.

### Quantum computers

Cryptographically relevant quantum computer, if built, will allow to
break elliptic curve cryptography (both ECDSA / EdDSA & ECDH) using Shor's algorithm.

Consider switching to newer / hybrid algorithms, such as SPHINCS+. They are available in
[noble-post-quantum](https://github.com/paulmillr/noble-post-quantum).

NIST prohibits classical cryptography (RSA, DSA, ECDSA, ECDH) [after 2035](https://nvlpubs.nist.gov/nistpubs/ir/2024/NIST.IR.8547.ipd.pdf). Australian ASD prohibits it [after 2030](https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/ism/cyber-security-guidelines/guidelines-cryptography).

## Speed

```sh
npm run bench:install && npm run bench
```

noble-curves spends 10+ ms to generate 20MB+ of base point precomputes.
This is done **one-time** per curve.

The generation is deferred until any method (pubkey, sign, verify) is called.
User can force precompute generation by manually calling `Point.BASE.precompute(windowSize, false)`.
Check out the source code.

Benchmark results on Apple M4:

```
# secp256k1
init 10ms
getPublicKey x 9,099 ops/sec @ 109μs/op
sign x 7,182 ops/sec @ 139μs/op
verify x 1,188 ops/sec @ 841μs/op
getSharedSecret x 735 ops/sec @ 1ms/op
recoverPublicKey x 1,265 ops/sec @ 790μs/op
schnorr.sign x 957 ops/sec @ 1ms/op
schnorr.verify x 1,210 ops/sec @ 825μs/op

# ed25519
init 14ms
getPublicKey x 14,216 ops/sec @ 70μs/op
sign x 6,849 ops/sec @ 145μs/op
verify x 1,400 ops/sec @ 713μs/op

# ed448
init 37ms
getPublicKey x 5,273 ops/sec @ 189μs/op
sign x 2,494 ops/sec @ 400μs/op
verify x 476 ops/sec @ 2ms/op

# p256
init 17ms
getPublicKey x 8,977 ops/sec @ 111μs/op
sign x 7,236 ops/sec @ 138μs/op
verify x 877 ops/sec @ 1ms/op

# p384
init 42ms
getPublicKey x 4,084 ops/sec @ 244μs/op
sign x 3,247 ops/sec @ 307μs/op
verify x 331 ops/sec @ 3ms/op

# p521
init 83ms
getPublicKey x 2,049 ops/sec @ 487μs/op
sign x 1,748 ops/sec @ 571μs/op
verify x 170 ops/sec @ 5ms/op

# ristretto255
add x 931,966 ops/sec @ 1μs/op
multiply x 15,444 ops/sec @ 64μs/op
encode x 21,367 ops/sec @ 46μs/op
decode x 21,715 ops/sec @ 46μs/op

# decaf448
add x 478,011 ops/sec @ 2μs/op
multiply x 416 ops/sec @ 2ms/op
encode x 8,562 ops/sec @ 116μs/op
decode x 8,636 ops/sec @ 115μs/op

# ECDH
x25519 x 1,981 ops/sec @ 504μs/op
x448 x 743 ops/sec @ 1ms/op
secp256k1 x 728 ops/sec @ 1ms/op
p256 x 705 ops/sec @ 1ms/op
p384 x 268 ops/sec @ 3ms/op
p521 x 137 ops/sec @ 7ms/op

# hash-to-curve
hashToPrivateScalar x 1,754,385 ops/sec @ 570ns/op
hash_to_field x 135,703 ops/sec @ 7μs/op
hashToCurve secp256k1 x 3,194 ops/sec @ 313μs/op
hashToCurve p256 x 5,962 ops/sec @ 167μs/op
hashToCurve p384 x 2,230 ops/sec @ 448μs/op
hashToCurve p521 x 1,063 ops/sec @ 940μs/op
hashToCurve ed25519 x 4,047 ops/sec @ 247μs/op
hashToCurve ed448 x 1,691 ops/sec @ 591μs/op
hash_to_ristretto255 x 8,733 ops/sec @ 114μs/op
hash_to_decaf448 x 3,882 ops/sec @ 257μs/op

# modular over secp256k1 P field
invert a x 866,551 ops/sec @ 1μs/op
invert b x 693,962 ops/sec @ 1μs/op
sqrt p = 3 mod 4 x 25,738 ops/sec @ 38μs/op
sqrt tonneli-shanks x 847 ops/sec @ 1ms/op

# bls12-381
init 22ms
getPublicKey x 1,325 ops/sec @ 754μs/op
sign x 80 ops/sec @ 12ms/op
verify x 62 ops/sec @ 15ms/op
pairing x 166 ops/sec @ 6ms/op
pairing10 x 54 ops/sec @ 18ms/op ± 23.48% (15ms..36ms)
MSM 4096 scalars x points 3286ms
aggregatePublicKeys/8 x 173 ops/sec @ 5ms/op
aggregatePublicKeys/32 x 46 ops/sec @ 21ms/op
aggregatePublicKeys/128 x 11 ops/sec @ 84ms/op
aggregatePublicKeys/512 x 2 ops/sec @ 335ms/op
aggregatePublicKeys/2048 x 0 ops/sec @ 1346ms/op
aggregateSignatures/8 x 82 ops/sec @ 12ms/op
aggregateSignatures/32 x 21 ops/sec @ 45ms/op
aggregateSignatures/128 x 5 ops/sec @ 178ms/op
aggregateSignatures/512 x 1 ops/sec @ 705ms/op
aggregateSignatures/2048 x 0 ops/sec @ 2823ms/op
```

## Upgrading

Supported node.js versions:

- v2: v20.19+ (ESM-only)
- v1: v14.21+ (ESM & CJS)

### curves v1 => curves v2

WIP. Changelog of v2, when upgrading from curves v1.

### noble-secp256k1 v1 => curves v1

Previously, the library was split into single-feature packages
[noble-secp256k1](https://github.com/paulmillr/noble-secp256k1),
[noble-ed25519](https://github.com/paulmillr/noble-ed25519) and
[noble-bls12-381](https://github.com/paulmillr/noble-bls12-381).

Curves continue their original work. The single-feature packages changed their
direction towards providing minimal 4kb implementations of cryptography,
which means they have less features.

- `getPublicKey`
  - now produce 33-byte compressed signatures by default
  - to use old behavior, which produced 65-byte uncompressed keys, set
    argument `isCompressed` to `false`: `getPublicKey(priv, false)`
- `sign`
  - is now sync
  - now returns `Signature` instance with `{ r, s, recovery }` properties
  - `canonical` option was renamed to `lowS`
  - `recovered` option has been removed because recovery bit is always returned now
  - `der` option has been removed. There are 2 options:
    1. Use compact encoding: `fromCompact`, `toCompactRawBytes`, `toCompactHex`.
       Compact encoding is simply a concatenation of 32-byte r and 32-byte s.
    2. If you must use DER encoding, switch to noble-curves (see above).
- `verify`
  - is now sync
  - `strict` option was renamed to `lowS`
- `getSharedSecret`
  - now produce 33-byte compressed signatures by default
  - to use old behavior, which produced 65-byte uncompressed keys, set
    argument `isCompressed` to `false`: `getSharedSecret(a, b, false)`
- `recoverPublicKey(msg, sig, rec)` was changed to `sig.recoverPublicKey(msg)`
- `number` type for private keys have been removed: use `bigint` instead
- `Point` (2d xy) has been changed to `ProjectivePoint` (3d xyz)
- `utils` were split into `utils` (same api as in noble-curves) and
  `etc` (`hmacSha256Sync` and others)

### noble-ed25519 v1 => curves v1

Upgrading from [@noble/ed25519](https://github.com/paulmillr/noble-ed25519) 1.7:

- Methods are now sync by default
- `bigint` is no longer allowed in `getPublicKey`, `sign`, `verify`. Reason: ed25519 is LE, can lead to bugs
- `Point` (2d xy) has been changed to `ExtendedPoint` (xyzt)
- `Signature` was removed: just use raw bytes or hex now
- `utils` were split into `utils` (same api as in noble-curves) and
  `etc` (`sha512Sync` and others)
- `getSharedSecret` was moved to `x25519` module
- `toX25519` has been moved to `edwardsToMontgomeryPub` and `edwardsToMontgomeryPriv` methods

### noble-bls12-381 => curves v1

Upgrading from [@noble/bls12-381](https://github.com/paulmillr/noble-bls12-381):

- Methods and classes were renamed:
  - PointG1 -> G1.Point, PointG2 -> G2.Point
  - PointG2.fromSignature -> Signature.decode, PointG2.toSignature -> Signature.encode
- Fp2 ORDER was corrected

## Contributing & testing

- `npm install && npm run build && npm test` will build the code and run tests.
- `npm run lint` / `npm run format` will run linter / fix linter issues.
- `npm run bench` will run benchmarks, which may need their deps first (`npm run bench:install`)
- `npm run build:release` will build single file

Check out [github.com/paulmillr/guidelines](https://github.com/paulmillr/guidelines)
for general coding practices and rules.

See [paulmillr.com/noble](https://paulmillr.com/noble/)
for useful resources, articles, documentation and demos
related to the library.

MuSig2 signature scheme and BIP324 ElligatorSwift mapping for secp256k1
are available [in a separate package](https://github.com/paulmillr/scure-btc-signer).

## License

The MIT License (MIT)

Copyright (c) 2022 Paul Miller [(https://paulmillr.com)](https://paulmillr.com)

See LICENSE file.
