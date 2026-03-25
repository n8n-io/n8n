'use strict';

const crypto = require('crypto');

let cpuInfo;
try {
  cpuInfo = require('cpu-features')();
} catch {}

const { bindingAvailable, CIPHER_INFO, MAC_INFO } = require('./crypto.js');

const eddsaSupported = (() => {
  if (typeof crypto.sign === 'function'
      && typeof crypto.verify === 'function') {
    const key =
      '-----BEGIN PRIVATE KEY-----\r\nMC4CAQAwBQYDK2VwBCIEIHKj+sVa9WcD'
      + '/q2DJUJaf43Kptc8xYuUQA4bOFj9vC8T\r\n-----END PRIVATE KEY-----';
    const data = Buffer.from('a');
    let sig;
    let verified;
    try {
      sig = crypto.sign(null, data, key);
      verified = crypto.verify(null, data, key, sig);
    } catch {}
    return (Buffer.isBuffer(sig) && sig.length === 64 && verified === true);
  }

  return false;
})();

const curve25519Supported = (typeof crypto.diffieHellman === 'function'
                             && typeof crypto.generateKeyPairSync === 'function'
                             && typeof crypto.createPublicKey === 'function');

const DEFAULT_KEX = [
  // https://tools.ietf.org/html/rfc5656#section-10.1
  'ecdh-sha2-nistp256',
  'ecdh-sha2-nistp384',
  'ecdh-sha2-nistp521',

  // https://tools.ietf.org/html/rfc4419#section-4
  'diffie-hellman-group-exchange-sha256',

  // https://tools.ietf.org/html/rfc8268
  'diffie-hellman-group14-sha256',
  'diffie-hellman-group15-sha512',
  'diffie-hellman-group16-sha512',
  'diffie-hellman-group17-sha512',
  'diffie-hellman-group18-sha512',
];
if (curve25519Supported) {
  DEFAULT_KEX.unshift('curve25519-sha256');
  DEFAULT_KEX.unshift('curve25519-sha256@libssh.org');
}
const SUPPORTED_KEX = DEFAULT_KEX.concat([
  // https://tools.ietf.org/html/rfc4419#section-4
  'diffie-hellman-group-exchange-sha1',

  'diffie-hellman-group14-sha1', // REQUIRED
  'diffie-hellman-group1-sha1',  // REQUIRED
]);


const DEFAULT_SERVER_HOST_KEY = [
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
  'rsa-sha2-512', // RFC 8332
  'rsa-sha2-256', // RFC 8332
  'ssh-rsa',
];
if (eddsaSupported)
  DEFAULT_SERVER_HOST_KEY.unshift('ssh-ed25519');
const SUPPORTED_SERVER_HOST_KEY = DEFAULT_SERVER_HOST_KEY.concat([
  'ssh-dss',
]);


const canUseCipher = (() => {
  const ciphers = crypto.getCiphers();
  return (name) => ciphers.includes(CIPHER_INFO[name].sslName);
})();
let DEFAULT_CIPHER = [
  // http://tools.ietf.org/html/rfc5647
  'aes128-gcm@openssh.com',
  'aes256-gcm@openssh.com',

  // http://tools.ietf.org/html/rfc4344#section-4
  'aes128-ctr',
  'aes192-ctr',
  'aes256-ctr',
];
if (cpuInfo && cpuInfo.flags && !cpuInfo.flags.aes) {
  // We know for sure the CPU does not support AES acceleration
  if (bindingAvailable)
    DEFAULT_CIPHER.unshift('chacha20-poly1305@openssh.com');
  else
    DEFAULT_CIPHER.push('chacha20-poly1305@openssh.com');
} else if (bindingAvailable && cpuInfo && cpuInfo.arch === 'x86') {
  // Places chacha20-poly1305 immediately after GCM ciphers since GCM ciphers
  // seem to outperform it on x86, but it seems to be faster than CTR ciphers
  DEFAULT_CIPHER.splice(4, 0, 'chacha20-poly1305@openssh.com');
} else {
  DEFAULT_CIPHER.push('chacha20-poly1305@openssh.com');
}
DEFAULT_CIPHER = DEFAULT_CIPHER.filter(canUseCipher);
const SUPPORTED_CIPHER = DEFAULT_CIPHER.concat([
  'aes256-cbc',
  'aes192-cbc',
  'aes128-cbc',
  'blowfish-cbc',
  '3des-cbc',
  'aes128-gcm',
  'aes256-gcm',

  // http://tools.ietf.org/html/rfc4345#section-4:
  'arcfour256',
  'arcfour128',

  'cast128-cbc',
  'arcfour',
].filter(canUseCipher));


const canUseMAC = (() => {
  const hashes = crypto.getHashes();
  return (name) => hashes.includes(MAC_INFO[name].sslName);
})();
const DEFAULT_MAC = [
  'hmac-sha2-256-etm@openssh.com',
  'hmac-sha2-512-etm@openssh.com',
  'hmac-sha1-etm@openssh.com',
  'hmac-sha2-256',
  'hmac-sha2-512',
  'hmac-sha1',
].filter(canUseMAC);
const SUPPORTED_MAC = DEFAULT_MAC.concat([
  'hmac-md5',
  'hmac-sha2-256-96', // first 96 bits of HMAC-SHA256
  'hmac-sha2-512-96', // first 96 bits of HMAC-SHA512
  'hmac-ripemd160',
  'hmac-sha1-96',     // first 96 bits of HMAC-SHA1
  'hmac-md5-96',      // first 96 bits of HMAC-MD5
].filter(canUseMAC));

const DEFAULT_COMPRESSION = [
  'none',
  'zlib@openssh.com', // ZLIB (LZ77) compression, except
                      // compression/decompression does not start until after
                      // successful user authentication
  'zlib',             // ZLIB (LZ77) compression
];
const SUPPORTED_COMPRESSION = DEFAULT_COMPRESSION.concat([
]);


const COMPAT = {
  BAD_DHGEX: 1 << 0,
  OLD_EXIT: 1 << 1,
  DYN_RPORT_BUG: 1 << 2,
  BUG_DHGEX_LARGE: 1 << 3,
  IMPLY_RSA_SHA2_SIGALGS: 1 << 4,
};

module.exports = {
  MESSAGE: {
    // Transport layer protocol -- generic (1-19)
    DISCONNECT: 1,
    IGNORE: 2,
    UNIMPLEMENTED: 3,
    DEBUG: 4,
    SERVICE_REQUEST: 5,
    SERVICE_ACCEPT: 6,
    EXT_INFO: 7, // RFC 8308

    // Transport layer protocol -- algorithm negotiation (20-29)
    KEXINIT: 20,
    NEWKEYS: 21,

    // Transport layer protocol -- key exchange method-specific (30-49)
    KEXDH_INIT: 30,
    KEXDH_REPLY: 31,

    KEXDH_GEX_GROUP: 31,
    KEXDH_GEX_INIT: 32,
    KEXDH_GEX_REPLY: 33,
    KEXDH_GEX_REQUEST: 34,

    KEXECDH_INIT: 30,
    KEXECDH_REPLY: 31,

    // User auth protocol -- generic (50-59)
    USERAUTH_REQUEST: 50,
    USERAUTH_FAILURE: 51,
    USERAUTH_SUCCESS: 52,
    USERAUTH_BANNER: 53,

    // User auth protocol -- user auth method-specific (60-79)
    USERAUTH_PASSWD_CHANGEREQ: 60,

    USERAUTH_PK_OK: 60,

    USERAUTH_INFO_REQUEST: 60,
    USERAUTH_INFO_RESPONSE: 61,

    // Connection protocol -- generic (80-89)
    GLOBAL_REQUEST: 80,
    REQUEST_SUCCESS: 81,
    REQUEST_FAILURE: 82,

    // Connection protocol -- channel-related (90-127)
    CHANNEL_OPEN: 90,
    CHANNEL_OPEN_CONFIRMATION: 91,
    CHANNEL_OPEN_FAILURE: 92,
    CHANNEL_WINDOW_ADJUST: 93,
    CHANNEL_DATA: 94,
    CHANNEL_EXTENDED_DATA: 95,
    CHANNEL_EOF: 96,
    CHANNEL_CLOSE: 97,
    CHANNEL_REQUEST: 98,
    CHANNEL_SUCCESS: 99,
    CHANNEL_FAILURE: 100

    // Reserved for client protocols (128-191)

    // Local extensions (192-155)
  },
  DISCONNECT_REASON: {
    HOST_NOT_ALLOWED_TO_CONNECT: 1,
    PROTOCOL_ERROR: 2,
    KEY_EXCHANGE_FAILED: 3,
    RESERVED: 4,
    MAC_ERROR: 5,
    COMPRESSION_ERROR: 6,
    SERVICE_NOT_AVAILABLE: 7,
    PROTOCOL_VERSION_NOT_SUPPORTED: 8,
    HOST_KEY_NOT_VERIFIABLE: 9,
    CONNECTION_LOST: 10,
    BY_APPLICATION: 11,
    TOO_MANY_CONNECTIONS: 12,
    AUTH_CANCELED_BY_USER: 13,
    NO_MORE_AUTH_METHODS_AVAILABLE: 14,
    ILLEGAL_USER_NAME: 15,
  },
  DISCONNECT_REASON_STR: undefined,
  CHANNEL_OPEN_FAILURE: {
    ADMINISTRATIVELY_PROHIBITED: 1,
    CONNECT_FAILED: 2,
    UNKNOWN_CHANNEL_TYPE: 3,
    RESOURCE_SHORTAGE: 4
  },
  TERMINAL_MODE: {
    TTY_OP_END: 0,        // Indicates end of options.
    VINTR: 1,             // Interrupt character; 255 if none. Similarly for the
                          //  other characters.  Not all of these characters are
                          //  supported on all systems.
    VQUIT: 2,             // The quit character (sends SIGQUIT signal on POSIX
                          //  systems).
    VERASE: 3,            // Erase the character to left of the cursor.
    VKILL: 4,             // Kill the current input line.
    VEOF: 5,              // End-of-file character (sends EOF from the
                          //  terminal).
    VEOL: 6,              // End-of-line character in addition to carriage
                          //  return and/or linefeed.
    VEOL2: 7,             // Additional end-of-line character.
    VSTART: 8,            // Continues paused output (normally control-Q).
    VSTOP: 9,             // Pauses output (normally control-S).
    VSUSP: 10,            // Suspends the current program.
    VDSUSP: 11,           // Another suspend character.
    VREPRINT: 12,         // Reprints the current input line.
    VWERASE: 13,          // Erases a word left of cursor.
    VLNEXT: 14,           // Enter the next character typed literally, even if
                          //  it is a special character
    VFLUSH: 15,           // Character to flush output.
    VSWTCH: 16,           // Switch to a different shell layer.
    VSTATUS: 17,          // Prints system status line (load, command, pid,
                          //  etc).
    VDISCARD: 18,         // Toggles the flushing of terminal output.
    IGNPAR: 30,           // The ignore parity flag.  The parameter SHOULD be 0
                          //  if this flag is FALSE, and 1 if it is TRUE.
    PARMRK: 31,           // Mark parity and framing errors.
    INPCK: 32,            // Enable checking of parity errors.
    ISTRIP: 33,           // Strip 8th bit off characters.
    INLCR: 34,            // Map NL into CR on input.
    IGNCR: 35,            // Ignore CR on input.
    ICRNL: 36,            // Map CR to NL on input.
    IUCLC: 37,            // Translate uppercase characters to lowercase.
    IXON: 38,             // Enable output flow control.
    IXANY: 39,            // Any char will restart after stop.
    IXOFF: 40,            // Enable input flow control.
    IMAXBEL: 41,          // Ring bell on input queue full.
    ISIG: 50,             // Enable signals INTR, QUIT, [D]SUSP.
    ICANON: 51,           // Canonicalize input lines.
    XCASE: 52,            // Enable input and output of uppercase characters by
                          //  preceding their lowercase equivalents with "\".
    ECHO: 53,             // Enable echoing.
    ECHOE: 54,            // Visually erase chars.
    ECHOK: 55,            // Kill character discards current line.
    ECHONL: 56,           // Echo NL even if ECHO is off.
    NOFLSH: 57,           // Don't flush after interrupt.
    TOSTOP: 58,           // Stop background jobs from output.
    IEXTEN: 59,           // Enable extensions.
    ECHOCTL: 60,          // Echo control characters as ^(Char).
    ECHOKE: 61,           // Visual erase for line kill.
    PENDIN: 62,           // Retype pending input.
    OPOST: 70,            // Enable output processing.
    OLCUC: 71,            // Convert lowercase to uppercase.
    ONLCR: 72,            // Map NL to CR-NL.
    OCRNL: 73,            // Translate carriage return to newline (output).
    ONOCR: 74,            // Translate newline to carriage return-newline
                          //  (output).
    ONLRET: 75,           // Newline performs a carriage return (output).
    CS7: 90,              // 7 bit mode.
    CS8: 91,              // 8 bit mode.
    PARENB: 92,           // Parity enable.
    PARODD: 93,           // Odd parity, else even.
    TTY_OP_ISPEED: 128,   // Specifies the input baud rate in bits per second.
    TTY_OP_OSPEED: 129,   // Specifies the output baud rate in bits per second.
  },
  CHANNEL_EXTENDED_DATATYPE: {
    STDERR: 1,
  },

  SIGNALS: [
    'ABRT', 'ALRM', 'FPE', 'HUP', 'ILL', 'INT', 'QUIT', 'SEGV', 'TERM', 'USR1',
    'USR2', 'KILL', 'PIPE'
  ].reduce((cur, val) => ({ ...cur, [val]: 1 }), {}),

  COMPAT,
  COMPAT_CHECKS: [
    [ 'Cisco-1.25', COMPAT.BAD_DHGEX ],
    [ /^Cisco-1[.]/, COMPAT.BUG_DHGEX_LARGE ],
    [ /^[0-9.]+$/, COMPAT.OLD_EXIT ], // old SSH.com implementations
    [ /^OpenSSH_5[.][0-9]+/, COMPAT.DYN_RPORT_BUG ],
    [ /^OpenSSH_7[.]4/, COMPAT.IMPLY_RSA_SHA2_SIGALGS ],
  ],

  // KEX proposal-related
  DEFAULT_KEX,
  SUPPORTED_KEX,
  DEFAULT_SERVER_HOST_KEY,
  SUPPORTED_SERVER_HOST_KEY,
  DEFAULT_CIPHER,
  SUPPORTED_CIPHER,
  DEFAULT_MAC,
  SUPPORTED_MAC,
  DEFAULT_COMPRESSION,
  SUPPORTED_COMPRESSION,

  curve25519Supported,
  eddsaSupported,
};

module.exports.DISCONNECT_REASON_BY_VALUE =
  Array.from(Object.entries(module.exports.DISCONNECT_REASON))
       .reduce((obj, [key, value]) => ({ ...obj, [value]: key }), {});
