import { JOSENotSupported } from '../util/errors.js';
export default function hmacDigest(alg) {
    switch (alg) {
        case 'HS256':
            return 'sha256';
        case 'HS384':
            return 'sha384';
        case 'HS512':
            return 'sha512';
        default:
            throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
    }
}
