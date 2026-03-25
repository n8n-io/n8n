declare module "currency-codes" {
  export interface CurrencyCodeRecord {
    code: string;
    number: string;
    digits: number;
    currency: string;
    countries: string[];
  }

  export function code(code: string): CurrencyCodeRecord | undefined;

  export function country(country: string): CurrencyCodeRecord[];

  export function number(number: string): CurrencyCodeRecord | undefined;

  export function codes(): string[];

  export function numbers(): number[];

  export function countries(): string[];

  export const publishDate: string;

  export const data: CurrencyCodeRecord[];
}
