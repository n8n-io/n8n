import { v5 as uuid5 } from 'uuid';
// Generates UUIDv5, used to consistently generate the same UUID for
// a specific identifier and namespace
export function generateUuid5(identifier, namespace = '') {
    const stringified = identifier.toString() + namespace.toString();
    return uuid5(stringified, uuid5.DNS).toString();
}
