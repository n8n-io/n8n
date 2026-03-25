/* eslint-disable @typescript-eslint/no-explicit-any */
interface HmacOptions {
  algorithm?: string;
  encoding?: string;
}

type createHmacSecret = (secret: string, options: HmacOptions) => Buffer;

interface HotpOptionsInterface extends HmacOptions {
  createHmacSecret?: createHmacSecret;
  crypto?: any;
  digits?: number;
}

interface HotpVerifyOptionsInterface {
  token?: string;
  secret?: string;
  counter?: number;
}

type hotpCheck = (
  token: string,
  secret: string,
  counter: number,
  options: HotpOptionsInterface
) => boolean;

type hotpCounter = (counter: number) => string;

type hotpDigest = (
  secret: string,
  counter: number,
  options: HotpOptionsInterface
) => string;

type hotpOptions = (options: any) => HotpOptionsInterface;

type hotpSecret = createHmacSecret;

type hotpToken = (
  secret: string,
  counter: number,
  options: HotpOptionsInterface
) => string;

interface TotpOptionsInterface extends HotpOptionsInterface {
  epoch?: any;
  step?: number;
  window?: number | number[];
}

interface TotpVerifyOptionsInterface {
  token?: string;
  secret?: string;
}

type totpCheck = (
  token: string,
  secret: string,
  options: TotpOptionsInterface
) => boolean;

type totpCheckWithWindow = (
  token: string,
  secret: string,
  options: TotpOptionsInterface
) => number | null;

type totpCounter = (epoch: number, step: number) => number;

type totpOptions = (options: any) => TotpOptionsInterface;

type totpSecret = createHmacSecret;

type totpTimeRemaining = (epoch: number, step: number) => number;

type totpTimeUsed = (epoch: number, step: number) => number;

type totpToken = (secret: string, options: TotpOptionsInterface) => string;

declare class HOTP {
  HOTP: typeof HOTP;
  getClass(): typeof HOTP;

  defaultOptions: HotpOptionsInterface;
  options: HotpOptionsInterface;
  optionsAll: HotpOptionsInterface;
  resetOptions(): this;
  generate(secret: string, counter: number): string;
  check(token: string, secret: string, counter: number): boolean;
  verify(opts: HotpVerifyOptionsInterface): boolean;
}

declare class TOTP extends HOTP {
  TOTP: typeof TOTP;
  getClass(): typeof TOTP;

  defaultOptions: TotpOptionsInterface;
  options: TotpOptionsInterface;
  optionsAll: TotpOptionsInterface;
  generate(secret: string): string;
  check(token: string, secret: string): boolean;
  checkDelta(token: string, secret: string): number | null;
  verify(opts: TotpVerifyOptionsInterface): boolean;
  timeUsed(): number;
  timeRemaining(): number;
}

declare class Authenticator extends TOTP {
  Authenticator: typeof Authenticator;
  getClass(): typeof Authenticator;

  check(token: string, secret: string): boolean;
  checkDelta(token: string, secret: string): number | null;
  decode(encodedKey: string): string;
  encode(secret: string): string;
  generate(secret: string): string;
  generateSecret(len?: number): string;
  keyuri(user: string, service: string, secret: string): string;
}

declare module '@otplib/preset-v11' {
  const authenticator: Authenticator;
  const hotp: HOTP;
  const totp: TOTP;
}
