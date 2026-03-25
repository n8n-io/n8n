import type { Currency } from '../modules/finance';
import type { LocaleEntry } from './definitions';
/**
 * The possible definitions related to finance.
 */
export type FinanceDefinition = LocaleEntry<{
    /**
     * The types of accounts/purposes of an account (e.g. `Savings` account).
     */
    account_type: string[];
    /**
     * The pattern by (lowercase) issuer name used to generate credit card codes.
     * `L` will be replaced by the check bit.
     *
     * @see faker.helpers.replaceCreditCardSymbols(): For more information about how the pattern is used.
     */
    credit_card: {
        [issuer: string]: string[];
    };
    /**
     * Currencies including their name, code and symbol (e.g. `US Dollar` / `USD` / `$`).
     */
    currency: Currency[];
    /**
     * Types of transactions (e.g. `deposit`).
     */
    transaction_type: string[];
}>;
