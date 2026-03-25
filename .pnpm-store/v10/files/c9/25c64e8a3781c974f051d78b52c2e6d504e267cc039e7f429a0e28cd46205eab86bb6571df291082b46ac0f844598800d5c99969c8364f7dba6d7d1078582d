/** Generate a PKCE code challenge from a code verifier
 * @param code_verifier
 * @returns The base64 url encoded code challenge
 */
export declare function generateChallenge(code_verifier: string): Promise<string>;
/** Generate a PKCE challenge pair
 * @param length Length of the verifer (between 43-128). Defaults to 43.
 * @returns PKCE challenge pair
 */
export default function pkceChallenge(length?: number): Promise<{
    code_verifier: string;
    code_challenge: string;
}>;
/** Verify that a code_verifier produces the expected code challenge
 * @param code_verifier
 * @param expectedChallenge The code challenge to verify
 * @returns True if challenges are equal. False otherwise.
 */
export declare function verifyChallenge(code_verifier: string, expectedChallenge: string): Promise<boolean>;
