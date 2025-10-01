import 'array.prototype.tosorted';
import { v4 as uuid } from 'uuid';

// Polyfill crypto.randomUUID
const globalCrypto = globalThis.crypto as Crypto | undefined;
if (globalCrypto && !('randomUUID' in globalCrypto)) {
	Object.defineProperty(globalCrypto, 'randomUUID', { value: uuid });
}
