import 'array.prototype.tosorted';
import { v4 as uuid } from 'uuid';

// Polyfill crypto.randomUUID
if (!('randomUUID' in crypto)) {
	Object.defineProperty(crypto, 'randomUUID', { value: uuid });
}
