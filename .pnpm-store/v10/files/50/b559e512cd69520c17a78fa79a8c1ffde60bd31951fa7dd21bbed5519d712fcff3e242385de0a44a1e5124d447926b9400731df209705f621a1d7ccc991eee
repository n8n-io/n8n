import type { LocaleEntry } from './definitions';
/**
 * The possible definitions related to finance.
 */
export declare type FinanceDefinitions = LocaleEntry<{
    /**
     * The types of accounts/purposes of an account (e.g. `Savings` account).
     */
    account_type: string[];
    /**
     * The pattern by (lowercase) issuer name used to generate credit card codes.
     * `L` will be replaced by the check bit.
     *
     * @see faker.helpers.replaceCreditCardSymbols()
     */
    credit_card: {
        [issuer: string]: string[];
    };
    /**
     * Currencies by their full name and their symbols (e.g. `US Dollar` -> `USD` / `$`).
     */
    currency: {
        [currencyName: string]: FinanceCurrencyEntryDefinitions;
    };
    /**
     * Types of transactions (e.g. `deposit`).
     */
    transaction_type: string[];
}>;
/**
 * The possible definitions related to currency entries.
 */
export interface FinanceCurrencyEntryDefinitions {
    /**
     * The code/short text/abbreviation for the currency (e.g. `USD`).
     */
    code: string;
    /**
     * The symbol for the currency (e.g. `$`).
     */
    symbol: string;
}
