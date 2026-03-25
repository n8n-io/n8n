/**
 * @module
 * JWT utility.
 */
export declare const Jwt: {
    sign: (payload: import("./types").JWTPayload, privateKey: import("./jws").SignatureKey, alg?: import("./jwa").SignatureAlgorithm) => Promise<string>;
    verify: (token: string, publicKey: import("./jws").SignatureKey, algOrOptions: import("./jwa").SignatureAlgorithm | import("./jwt").VerifyOptionsWithAlg) => Promise<import("./types").JWTPayload>;
    decode: (token: string) => {
        header: import("./jwt").TokenHeader;
        payload: import("./types").JWTPayload;
    };
    verifyWithJwks: (token: string, options: {
        keys?: import("./jws").HonoJsonWebKey[];
        jwks_uri?: string;
        verification?: import("./jwt").VerifyOptions;
        allowedAlgorithms: readonly import("./jwa").AsymmetricAlgorithm[];
    }, init?: RequestInit) => Promise<import("./types").JWTPayload>;
};
