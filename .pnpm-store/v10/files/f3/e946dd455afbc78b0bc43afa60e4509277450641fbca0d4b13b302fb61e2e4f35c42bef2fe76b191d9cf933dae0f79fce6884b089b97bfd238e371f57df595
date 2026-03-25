import { type IField } from './modular.ts';
export type PoseidonBasicOpts = {
    Fp: IField<bigint>;
    t: number;
    roundsFull: number;
    roundsPartial: number;
    isSboxInverse?: boolean;
};
export type PoseidonGrainOpts = PoseidonBasicOpts & {
    sboxPower?: number;
};
type PoseidonConstants = {
    mds: bigint[][];
    roundConstants: bigint[][];
};
export declare function grainGenConstants(opts: PoseidonGrainOpts, skipMDS?: number): PoseidonConstants;
export type PoseidonOpts = PoseidonBasicOpts & PoseidonConstants & {
    sboxPower?: number;
    reversePartialPowIdx?: boolean;
};
export declare function validateOpts(opts: PoseidonOpts): Readonly<{
    rounds: number;
    sboxFn: (n: bigint) => bigint;
    roundConstants: bigint[][];
    mds: bigint[][];
    Fp: IField<bigint>;
    t: number;
    roundsFull: number;
    roundsPartial: number;
    sboxPower?: number;
    reversePartialPowIdx?: boolean;
}>;
export declare function splitConstants(rc: bigint[], t: number): bigint[][];
export type PoseidonFn = {
    (values: bigint[]): bigint[];
    roundConstants: bigint[][];
};
/** Poseidon NTT-friendly hash. */
export declare function poseidon(opts: PoseidonOpts): PoseidonFn;
export declare class PoseidonSponge {
    private Fp;
    readonly rate: number;
    readonly capacity: number;
    readonly hash: PoseidonFn;
    private state;
    private pos;
    private isAbsorbing;
    constructor(Fp: IField<bigint>, rate: number, capacity: number, hash: PoseidonFn);
    private process;
    absorb(input: bigint[]): void;
    squeeze(count: number): bigint[];
    clean(): void;
    clone(): PoseidonSponge;
}
export type PoseidonSpongeOpts = Omit<PoseidonOpts, 't'> & {
    rate: number;
    capacity: number;
};
/**
 * The method is not defined in spec, but nevertheless used often.
 * Check carefully for compatibility: there are many edge cases, like absorbing an empty array.
 * We cross-test against:
 * - https://github.com/ProvableHQ/snarkVM/tree/staging/algorithms
 * - https://github.com/arkworks-rs/crypto-primitives/tree/main
 */
export declare function poseidonSponge(opts: PoseidonSpongeOpts): () => PoseidonSponge;
export {};
//# sourceMappingURL=poseidon.d.ts.map