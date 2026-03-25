import * as mod from './modular.ts';
import type { WeierstrassPoint, WeierstrassPointCons } from './weierstrass.ts';
export type BigintTuple = [bigint, bigint];
export type Fp = bigint;
export type Fp2 = {
    c0: bigint;
    c1: bigint;
};
export type BigintSix = [bigint, bigint, bigint, bigint, bigint, bigint];
export type Fp6 = {
    c0: Fp2;
    c1: Fp2;
    c2: Fp2;
};
export type Fp12 = {
    c0: Fp6;
    c1: Fp6;
};
export type BigintTwelve = [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint
];
export type Fp2Bls = mod.IField<Fp2> & {
    Fp: mod.IField<Fp>;
    frobeniusMap(num: Fp2, power: number): Fp2;
    fromBigTuple(num: BigintTuple): Fp2;
    mulByB: (num: Fp2) => Fp2;
    mulByNonresidue: (num: Fp2) => Fp2;
    reim: (num: Fp2) => {
        re: Fp;
        im: Fp;
    };
    Fp4Square: (a: Fp2, b: Fp2) => {
        first: Fp2;
        second: Fp2;
    };
    NONRESIDUE: Fp2;
};
export type Fp6Bls = mod.IField<Fp6> & {
    Fp2: Fp2Bls;
    frobeniusMap(num: Fp6, power: number): Fp6;
    fromBigSix: (tuple: BigintSix) => Fp6;
    mul1(num: Fp6, b1: Fp2): Fp6;
    mul01(num: Fp6, b0: Fp2, b1: Fp2): Fp6;
    mulByFp2(lhs: Fp6, rhs: Fp2): Fp6;
    mulByNonresidue: (num: Fp6) => Fp6;
};
export type Fp12Bls = mod.IField<Fp12> & {
    Fp6: Fp6Bls;
    frobeniusMap(num: Fp12, power: number): Fp12;
    fromBigTwelve: (t: BigintTwelve) => Fp12;
    mul014(num: Fp12, o0: Fp2, o1: Fp2, o4: Fp2): Fp12;
    mul034(num: Fp12, o0: Fp2, o3: Fp2, o4: Fp2): Fp12;
    mulByFp2(lhs: Fp12, rhs: Fp2): Fp12;
    conjugate(num: Fp12): Fp12;
    finalExponentiate(num: Fp12): Fp12;
    _cyclotomicSquare(num: Fp12): Fp12;
    _cyclotomicExp(num: Fp12, n: bigint): Fp12;
};
export declare function psiFrobenius(Fp: mod.IField<Fp>, Fp2: Fp2Bls, base: Fp2): {
    psi: (x: Fp2, y: Fp2) => [Fp2, Fp2];
    psi2: (x: Fp2, y: Fp2) => [Fp2, Fp2];
    G2psi: (c: WeierstrassPointCons<Fp2>, P: WeierstrassPoint<Fp2>) => WeierstrassPoint<Fp2>;
    G2psi2: (c: WeierstrassPointCons<Fp2>, P: WeierstrassPoint<Fp2>) => WeierstrassPoint<Fp2>;
    PSI_X: Fp2;
    PSI_Y: Fp2;
    PSI2_X: Fp2;
    PSI2_Y: Fp2;
};
export type Tower12Opts = {
    ORDER: bigint;
    X_LEN: number;
    NONRESIDUE?: Fp;
    FP2_NONRESIDUE: BigintTuple;
    Fp2sqrt?: (num: Fp2) => Fp2;
    Fp2mulByB: (num: Fp2) => Fp2;
    Fp12finalExponentiate: (num: Fp12) => Fp12;
};
export declare function tower12(opts: Tower12Opts): {
    Fp: Readonly<mod.IField<bigint> & Required<Pick<mod.IField<bigint>, 'isOdd'>>>;
    Fp2: Fp2Bls;
    Fp6: Fp6Bls;
    Fp12: Fp12Bls;
};
//# sourceMappingURL=tower.d.ts.map