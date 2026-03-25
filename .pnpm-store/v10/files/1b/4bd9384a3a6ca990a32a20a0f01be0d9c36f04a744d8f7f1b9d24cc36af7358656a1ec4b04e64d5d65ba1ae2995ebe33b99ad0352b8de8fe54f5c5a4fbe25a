import { randomFillSync } from 'node:crypto';
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
export default function rng() {
    if (poolPtr > rnds8Pool.length - 16) {
        randomFillSync(rnds8Pool);
        poolPtr = 0;
    }
    return rnds8Pool.slice(poolPtr, (poolPtr += 16));
}
