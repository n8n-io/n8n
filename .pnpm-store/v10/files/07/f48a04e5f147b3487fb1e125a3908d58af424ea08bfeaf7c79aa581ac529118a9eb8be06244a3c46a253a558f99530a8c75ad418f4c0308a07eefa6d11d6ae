declare class Tokens {
  /**
   * Token generation/verification class.
   */
  constructor(options?: Tokens.Options);

  /**
   * Create a new CSRF token.
   */
  create(secret: string): string;

  /**
   * Create a new secret key.
   */
  secret(): Promise<string>;

  /**
   * Create a new secret key.
   */
  secret(callback: Tokens.SecretCallback): void;

  /**
   * Create a new secret key synchronously.
   */
  secretSync(): string;

  /**
   * Verify if a given token is valid for a given secret.
   */
  verify(secret: string, token: string): boolean;
}

declare namespace Tokens {
  export type SecretCallback = (err: Error | null, secret: string) => void;

  export interface Options {
    /**
     * The string length of the salt (default: 8)
     */
    saltLength?: number;
    /**
     * The byte length of the secret key (default: 18)
     */
    secretLength?: number;
  }
}

export = Tokens;
