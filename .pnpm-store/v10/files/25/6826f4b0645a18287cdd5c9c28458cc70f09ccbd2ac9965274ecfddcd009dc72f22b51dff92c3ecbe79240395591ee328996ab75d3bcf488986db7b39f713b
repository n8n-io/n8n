import { FlattenedSign } from '../flattened/sign.js';
export class CompactSign {
    #flattened;
    constructor(payload) {
        this.#flattened = new FlattenedSign(payload);
    }
    setProtectedHeader(protectedHeader) {
        this.#flattened.setProtectedHeader(protectedHeader);
        return this;
    }
    async sign(key, options) {
        const jws = await this.#flattened.sign(key, options);
        if (jws.payload === undefined) {
            throw new TypeError('use the flattened module for creating JWS with b64: false');
        }
        return `${jws.protected}.${jws.payload}.${jws.signature}`;
    }
}
