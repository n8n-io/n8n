let crypto;
crypto = globalThis.crypto; // web browsers
/**
 * Creates an array of length `size` of random bytes
 * @param size
 * @returns Array of random ints (0 to 255)
 */
async function getRandomValues(size) {
    return (await crypto).getRandomValues(new Uint8Array(size));
}
/** Generate cryptographically strong random string
 * @param size The desired length of the string
 * @returns The random string
 */
async function random(size) {
    const mask = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
    let result = "";
    const randomUints = await getRandomValues(size);
    for (let i = 0; i < size; i++) {
        // cap the value of the randomIndex to mask.length - 1
        const randomIndex = randomUints[i] % mask.length;
        result += mask[randomIndex];
    }
    return result;
}
/** Generate a PKCE challenge verifier
 * @param length Length of the verifier
 * @returns A random verifier `length` characters long
 */
async function generateVerifier(length) {
    return await random(length);
}
/** Generate a PKCE code challenge from a code verifier
 * @param code_verifier
 * @returns The base64 url encoded code challenge
 */
export async function generateChallenge(code_verifier) {
    const buffer = await (await crypto).subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
    // Generate base64url string
    // btoa is deprecated in Node.js but is used here for web browser compatibility
    // (which has no good replacement yet, see also https://github.com/whatwg/html/issues/6811)
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\//g, '_')
        .replace(/\+/g, '-')
        .replace(/=/g, '');
}
/** Generate a PKCE challenge pair
 * @param length Length of the verifer (between 43-128). Defaults to 43.
 * @returns PKCE challenge pair
 */
export default async function pkceChallenge(length) {
    if (!length)
        length = 43;
    if (length < 43 || length > 128) {
        throw `Expected a length between 43 and 128. Received ${length}.`;
    }
    const verifier = await generateVerifier(length);
    const challenge = await generateChallenge(verifier);
    return {
        code_verifier: verifier,
        code_challenge: challenge,
    };
}
/** Verify that a code_verifier produces the expected code challenge
 * @param code_verifier
 * @param expectedChallenge The code challenge to verify
 * @returns True if challenges are equal. False otherwise.
 */
export async function verifyChallenge(code_verifier, expectedChallenge) {
    const actualChallenge = await generateChallenge(code_verifier);
    return actualChallenge === expectedChallenge;
}
