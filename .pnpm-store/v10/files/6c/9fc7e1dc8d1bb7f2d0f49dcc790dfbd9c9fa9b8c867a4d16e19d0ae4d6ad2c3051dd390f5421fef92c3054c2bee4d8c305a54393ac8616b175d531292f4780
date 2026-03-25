import { Buffer } from 'buffer';
import { createPrivateKey, createPublicKey, createSecretKey } from 'crypto';
import { decode as base64url } from './base64url.js';
import { JOSENotSupported } from '../util/errors.js';
import { setCurve } from './get_named_curve.js';
import { setModulusLength } from './check_modulus_length.js';
import Asn1SequenceEncoder from './asn1_sequence_encoder.js';
import { jwkImport } from './flags.js';
const parse = (jwk) => {
    if (jwkImport && jwk.kty !== 'oct') {
        return jwk.d
            ? createPrivateKey({ format: 'jwk', key: jwk })
            : createPublicKey({ format: 'jwk', key: jwk });
    }
    switch (jwk.kty) {
        case 'oct': {
            return createSecretKey(base64url(jwk.k));
        }
        case 'RSA': {
            const enc = new Asn1SequenceEncoder();
            const isPrivate = jwk.d !== undefined;
            const modulus = Buffer.from(jwk.n, 'base64');
            const exponent = Buffer.from(jwk.e, 'base64');
            if (isPrivate) {
                enc.zero();
                enc.unsignedInteger(modulus);
                enc.unsignedInteger(exponent);
                enc.unsignedInteger(Buffer.from(jwk.d, 'base64'));
                enc.unsignedInteger(Buffer.from(jwk.p, 'base64'));
                enc.unsignedInteger(Buffer.from(jwk.q, 'base64'));
                enc.unsignedInteger(Buffer.from(jwk.dp, 'base64'));
                enc.unsignedInteger(Buffer.from(jwk.dq, 'base64'));
                enc.unsignedInteger(Buffer.from(jwk.qi, 'base64'));
            }
            else {
                enc.unsignedInteger(modulus);
                enc.unsignedInteger(exponent);
            }
            const der = enc.end();
            const createInput = {
                key: der,
                format: 'der',
                type: 'pkcs1',
            };
            const keyObject = isPrivate ? createPrivateKey(createInput) : createPublicKey(createInput);
            setModulusLength(keyObject, modulus.length << 3);
            return keyObject;
        }
        case 'EC': {
            const enc = new Asn1SequenceEncoder();
            const isPrivate = jwk.d !== undefined;
            const pub = Buffer.concat([
                Buffer.alloc(1, 4),
                Buffer.from(jwk.x, 'base64'),
                Buffer.from(jwk.y, 'base64'),
            ]);
            if (isPrivate) {
                enc.zero();
                const enc$1 = new Asn1SequenceEncoder();
                enc$1.oidFor('ecPublicKey');
                enc$1.oidFor(jwk.crv);
                enc.add(enc$1.end());
                const enc$2 = new Asn1SequenceEncoder();
                enc$2.one();
                enc$2.octStr(Buffer.from(jwk.d, 'base64'));
                const enc$3 = new Asn1SequenceEncoder();
                enc$3.bitStr(pub);
                const f2 = enc$3.end(Buffer.from([0xa1]));
                enc$2.add(f2);
                const f = enc$2.end();
                const enc$4 = new Asn1SequenceEncoder();
                enc$4.add(f);
                const f3 = enc$4.end(Buffer.from([0x04]));
                enc.add(f3);
                const der = enc.end();
                const keyObject = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
                setCurve(keyObject, jwk.crv);
                return keyObject;
            }
            const enc$1 = new Asn1SequenceEncoder();
            enc$1.oidFor('ecPublicKey');
            enc$1.oidFor(jwk.crv);
            enc.add(enc$1.end());
            enc.bitStr(pub);
            const der = enc.end();
            const keyObject = createPublicKey({ key: der, format: 'der', type: 'spki' });
            setCurve(keyObject, jwk.crv);
            return keyObject;
        }
        case 'OKP': {
            const enc = new Asn1SequenceEncoder();
            const isPrivate = jwk.d !== undefined;
            if (isPrivate) {
                enc.zero();
                const enc$1 = new Asn1SequenceEncoder();
                enc$1.oidFor(jwk.crv);
                enc.add(enc$1.end());
                const enc$2 = new Asn1SequenceEncoder();
                enc$2.octStr(Buffer.from(jwk.d, 'base64'));
                const f = enc$2.end(Buffer.from([0x04]));
                enc.add(f);
                const der = enc.end();
                return createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
            }
            const enc$1 = new Asn1SequenceEncoder();
            enc$1.oidFor(jwk.crv);
            enc.add(enc$1.end());
            enc.bitStr(Buffer.from(jwk.x, 'base64'));
            const der = enc.end();
            return createPublicKey({ key: der, format: 'der', type: 'spki' });
        }
        default:
            throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
    }
};
export default parse;
