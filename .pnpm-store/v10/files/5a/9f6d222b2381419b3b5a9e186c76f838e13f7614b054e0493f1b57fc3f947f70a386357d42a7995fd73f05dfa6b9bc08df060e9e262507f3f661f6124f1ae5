// Type definitions for js-nacl 1.3
// Project: https://github.com/tonyg/js-nacl#readme
// Definitions by: Ethan Frey <https://github.com/ethanfrey>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

// instantiate is the main entry point to generate a Nacl instance,
// which contains all functionality
export function instantiate(cb: NaclCallback, opts?: NaclOpts): void;

export type NaclCallback = (nacl: Nacl) => void;
export interface NaclOpts {
  readonly [key: string]: any;
}

// types for signing
export type SignerSecretKey = Uint8Array;
export type SignerPublicKey = Uint8Array;
export interface SignKeyPair {
  signPk: SignerPublicKey;
  signSk: SignerSecretKey;
}
export type Message = Uint8Array;
export type Signature = Uint8Array;
export type MessageWithSignature = Uint8Array;

// types for secrets
export type BoxSecretKey = Uint8Array;
export type BoxPublicKey = Uint8Array;
export interface BoxKeyPair {
  boxPk: BoxPublicKey;
  boxSk: BoxSecretKey;
}
export type Nonce = Uint8Array;
export type CipherText = Uint8Array;
export interface BoxSharedSecret {
  boxK: Uint8Array;
}

// types for streams
export type Stream = Uint8Array;
export type StreamKey = Uint8Array;

// Nacl functions taken from js-nacl api spec
export interface Nacl {
  // strings vs. binary
  to_hex: (arr: Uint8Array) => string;
  from_hex: (hex: string) => Uint8Array;
  encode_utf8: (utf8: string) => Uint8Array;
  encode_latin1: (latin1: string) => Uint8Array;
  decode_utf8: (arr: Uint8Array) => string;
  decode_latin1: (arr: Uint8Array) => string;

  // hash
  crypto_hash: (raw: Uint8Array) => Uint8Array;
  crypto_hash_sha256: (raw: Uint8Array) => Uint8Array;

  // crypto_sign
  crypto_sign_keypair: () => SignKeyPair;
  crypto_sign: (msg: Message, sk: SignerSecretKey) => MessageWithSignature;
  crypto_sign_open: (
    packet: MessageWithSignature,
    pk: SignerPublicKey
  ) => Message | null;
  crypto_sign_detached: (msg: Message, sk: SignerSecretKey) => Signature;
  crypto_sign_verify_detached: (
    sig: Signature,
    msg: Message,
    pk: SignerPublicKey
  ) => boolean;

  // crypto_box
  crypto_box_keypair: () => BoxKeyPair;
  crypto_box_random_nonce: () => Nonce;
  crypto_box: (
    msg: Message,
    nonce: Nonce,
    rcpt: BoxPublicKey,
    sender: BoxSecretKey
  ) => CipherText;
  crypto_box_open: (
    cipher: CipherText,
    nonce: Nonce,
    sender: BoxPublicKey,
    rcpt: BoxSecretKey
  ) => Message;
  crypto_box_precompute: (
    sender: BoxPublicKey,
    rcpt: BoxSecretKey
  ) => BoxSharedSecret;
  crypto_box_precomputed: (
    msg: Message,
    nonce: Nonce,
    shared: BoxSharedSecret
  ) => CipherText;
  crypto_box_open_precomputed: (
    cipher: CipherText,
    nonce: Nonce,
    shared: BoxSharedSecret
  ) => Message;

  // crypto_secretbox
  crypto_secretbox_random_nonce: () => Nonce;
  crypto_secretbox: (
    msg: Message,
    nonce: Nonce,
    key: BoxSecretKey
  ) => CipherText;
  crypto_secretbox_open: (
    cipher: CipherText,
    nonce: Nonce,
    key: BoxSecretKey
  ) => Message;

  // derived keys
  crypto_sign_seed_keypair: (seed: Uint8Array) => SignKeyPair;
  crypto_box_seed_keypair: (seed: Uint8Array) => BoxKeyPair;
  crypto_box_keypair_from_raw_sk: (seed: Uint8Array) => BoxKeyPair;

  // random
  random_bytes: (length: number) => Uint8Array;

  // TODO: crypto_stream
  // crypto_stream_random_nonce: () => Nonce;
  // crypto_stream: (len: number, nonce: Nonce, key: StreamKey) => Stream;
  // crypto_stream_xor: (msg: Message, nonce: Nonce, key: StreamKey) => Stream;
}
