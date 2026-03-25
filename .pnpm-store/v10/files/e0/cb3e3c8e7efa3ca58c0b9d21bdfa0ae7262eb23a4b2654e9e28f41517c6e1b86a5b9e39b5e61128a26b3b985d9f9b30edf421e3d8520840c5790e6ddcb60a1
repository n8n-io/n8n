import { ModuleBase } from '../../internal/module-base';
/**
 * The possible definitions related to currency entries.
 */
export interface Currency {
    /**
     * The full name for the currency (e.g. `US Dollar`).
     */
    name: string;
    /**
     * The code/short text/abbreviation for the currency (e.g. `USD`).
     */
    code: string;
    /**
     * The symbol for the currency (e.g. `$`).
     */
    symbol: string;
}
/**
 * Module to generate finance and money related entries.
 *
 * ### Overview
 *
 * For a random amount, use [`amount()`](https://fakerjs.dev/api/finance.html#amount).
 *
 * For traditional bank accounts, use: [`accountNumber()`](https://fakerjs.dev/api/finance.html#accountnumber), [`accountName()`](https://fakerjs.dev/api/finance.html#accountname), [`bic()`](https://fakerjs.dev/api/finance.html#bic), [`iban()`](https://fakerjs.dev/api/finance.html#iban), [`pin()`](https://fakerjs.dev/api/finance.html#pin) and [`routingNumber()`](https://fakerjs.dev/api/finance.html#routingnumber).
 *
 * For credit card related methods, use: [`creditCardNumber()`](https://fakerjs.dev/api/finance.html#creditcardnumber), [`creditCardCVV()`](https://fakerjs.dev/api/finance.html#creditcardcvv), [`creditCardIssuer()`](https://fakerjs.dev/api/finance.html#creditcardissuer), [`transactionDescription()`](https://fakerjs.dev/api/finance.html#transactiondescription) and [`transactionType()`](https://fakerjs.dev/api/finance.html#transactiontype).
 *
 * For blockchain related methods, use: [`bitcoinAddress()`](https://fakerjs.dev/api/finance.html#bitcoinaddress), [`ethereumAddress()`](https://fakerjs.dev/api/finance.html#ethereumaddress) and [`litecoinAddress()`](https://fakerjs.dev/api/finance.html#litecoinaddress).
 */
export declare class FinanceModule extends ModuleBase {
    /**
     * Generates a random account number.
     *
     * @param length The length of the account number. Defaults to `8`.
     *
     * @see faker.finance.accountNumber(): For the replacement method.
     *
     * @example
     * faker.finance.account() // 92842238
     * faker.finance.account(5) // 32564
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.finance.accountNumber` instead.
     */
    account(length?: number): string;
    /**
     * Generates a random account number.
     *
     * @param length The length of the account number. Defaults to `8`.
     *
     * @example
     * faker.finance.accountNumber() // 92842238
     * faker.finance.accountNumber(5) // 32564
     *
     * @since 8.0.0
     */
    accountNumber(length?: number): string;
    /**
     * Generates a random account number.
     *
     * @param options An options object.
     * @param options.length The length of the account number. Defaults to `8`.
     *
     * @example
     * faker.finance.accountNumber() // 92842238
     * faker.finance.accountNumber({ length: 5 }) // 32564
     *
     * @since 8.0.0
     */
    accountNumber(options?: {
        /**
         * The length of the account number.
         *
         * @default 8
         */
        length?: number;
    }): string;
    /**
     * Generates a random account number.
     *
     * @param optionsOrLength An options object or the length of the account number.
     * @param optionsOrLength.length The length of the account number. Defaults to `8`.
     *
     * @example
     * faker.finance.accountNumber() // 92842238
     * faker.finance.accountNumber(5) // 28736
     * faker.finance.accountNumber({ length: 5 }) // 32564
     *
     * @since 8.0.0
     */
    accountNumber(optionsOrLength?: number | {
        /**
         * The length of the account number.
         *
         * @default 8
         */
        length?: number;
    }): string;
    /**
     * Generates a random account name.
     *
     * @example
     * faker.finance.accountName() // 'Personal Loan Account'
     *
     * @since 2.0.1
     */
    accountName(): string;
    /**
     * Generates a random routing number.
     *
     * @example
     * faker.finance.routingNumber() // '522814402'
     *
     * @since 5.0.0
     */
    routingNumber(): string;
    /**
     * Generates a random masked number.
     *
     * @param length The length of the unmasked number. Defaults to `4`.
     * @param parens Whether to use surrounding parenthesis. Defaults to `true`.
     * @param ellipsis Whether to prefix the numbers with an ellipsis. Defaults to `true`.
     *
     * @see faker.finance.maskedNumber(): For the replacement method.
     *
     * @example
     * faker.finance.mask() // '(...9711)'
     * faker.finance.mask(3) // '(...342)'
     * faker.finance.mask(3, false) // '...236'
     * faker.finance.mask(3, false, false) // '298'
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.finance.maskedNumber` instead.
     */
    mask(length?: number, parens?: boolean, ellipsis?: boolean): string;
    /**
     * Generates a random masked number.
     *
     * @param length The length of the unmasked number. Defaults to `4`.
     *
     * @example
     * faker.finance.maskedNumber() // '(...9711)'
     * faker.finance.maskedNumber(3) // '(...342)'
     *
     * @since 8.0.0
     */
    maskedNumber(length?: number): string;
    /**
     * Generates a random masked number.
     *
     * @param options An options object.
     * @param options.length The length of the unmasked number. Defaults to `4`.
     * @param options.parens Whether to use surrounding parenthesis. Defaults to `true`.
     * @param options.ellipsis Whether to prefix the numbers with an ellipsis. Defaults to `true`.
     *
     * @example
     * faker.finance.maskedNumber() // '(...9711)'
     * faker.finance.maskedNumber({ length: 3 }) // '(...342)'
     * faker.finance.maskedNumber({ length: 3, parens: false }) // '...236'
     * faker.finance.maskedNumber({ length: 3, parens: false, ellipsis: false }) // '298'
     *
     * @since 8.0.0
     */
    maskedNumber(options?: {
        /**
         * The length of the unmasked number.
         *
         * @default 4
         */
        length?: number;
        /**
         * Whether to use surrounding parenthesis.
         *
         * @default true
         */
        parens?: boolean;
        /**
         * Whether to prefix the numbers with an ellipsis.
         *
         * @default true
         */
        ellipsis?: boolean;
    }): string;
    /**
     * Generates a random masked number.
     *
     * @param optionsOrLength An options object or the length of the unmask number.
     * @param optionsOrLength.length The length of the unmasked number. Defaults to `4`.
     * @param optionsOrLength.parens Whether to use surrounding parenthesis. Defaults to `true`.
     * @param optionsOrLength.ellipsis Whether to prefix the numbers with an ellipsis. Defaults to `true`.
     *
     * @example
     * faker.finance.maskedNumber() // '(...9711)'
     * faker.finance.maskedNumber(3) // '(...342)'
     * faker.finance.maskedNumber({ length: 3 }) // '(...342)'
     * faker.finance.maskedNumber({ length: 3, parens: false }) // '...236'
     * faker.finance.maskedNumber({ length: 3, parens: false, ellipsis: false }) // '298'
     *
     * @since 8.0.0
     */
    maskedNumber(optionsOrLength?: number | {
        /**
         * The length of the unmasked number.
         *
         * @default 4
         */
        length?: number;
        /**
         * Whether to use surrounding parenthesis.
         *
         * @default true
         */
        parens?: boolean;
        /**
         * Whether to prefix the numbers with an ellipsis.
         *
         * @default true
         */
        ellipsis?: boolean;
    }): string;
    /**
     * Generates a random amount between the given bounds (inclusive).
     *
     * @param options An options object.
     * @param options.min The lower bound for the amount. Defaults to `0`.
     * @param options.max The upper bound for the amount. Defaults to `1000`.
     * @param options.dec The number of decimal places for the amount. Defaults to `2`.
     * @param options.symbol The symbol used to prefix the amount. Defaults to `''`.
     * @param options.autoFormat If true this method will use `Number.toLocaleString()`. Otherwise it will use `Number.toFixed()`.
     *
     * @example
     * faker.finance.amount() // '617.87'
     * faker.finance.amount({ min: 5, max: 10 }) // '5.53'
     * faker.finance.amount({ min: 5, max: 10, dec: 0 }) // '8'
     * faker.finance.amount({ min: 5, max: 10, dec: 2, symbol: '$' }) // '$5.85'
     * faker.finance.amount({ min: 5, max: 10, dec: 5, symbol: '', autoFormat: true }) // '9,75067'
     *
     * @since 2.0.1
     */
    amount(options?: {
        /**
         * The lower bound for the amount.
         *
         * @default 0
         */
        min?: number;
        /**
         * The upper bound for the amount.
         *
         * @default 1000
         */
        max?: number;
        /**
         * The number of decimal places for the amount.
         *
         * @default 2
         */
        dec?: number;
        /**
         * The symbol used to prefix the amount.
         *
         * @default ''
         */
        symbol?: string;
        /**
         * If true this method will use `Number.toLocaleString()`. Otherwise it will use `Number.toFixed()`.
         *
         * @default false
         */
        autoFormat?: boolean;
    }): string;
    /**
     * Generates a random amount between the given bounds (inclusive).
     *
     * @param min The lower bound for the amount. Defaults to `0`.
     * @param max The upper bound for the amount. Defaults to `1000`.
     * @param dec The number of decimal places for the amount. Defaults to `2`.
     * @param symbol The symbol used to prefix the amount. Defaults to `''`.
     * @param autoFormat If true this method will use `Number.toLocaleString()`. Otherwise it will use `Number.toFixed()`.
     *
     * @example
     * faker.finance.amount() // '617.87'
     * faker.finance.amount(5, 10) // '5.53'
     * faker.finance.amount(5, 10, 0) // '8'
     * faker.finance.amount(5, 10, 2, '$') // '$5.85'
     * faker.finance.amount(5, 10, 5, '', true) // '9,75067'
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.finance.amount({ min, max, dec, symbol, autoFormat })` instead.
     */
    amount(min?: number, max?: number, dec?: number, symbol?: string, autoFormat?: boolean): string;
    /**
     * Generates a random amount between the given bounds (inclusive).
     *
     * @param options An options object.
     * @param options.min The lower bound for the amount. Defaults to `0`.
     * @param options.max The upper bound for the amount. Defaults to `1000`.
     * @param options.dec The number of decimal places for the amount. Defaults to `2`.
     * @param options.symbol The symbol used to prefix the amount. Defaults to `''`.
     * @param options.autoFormat If true this method will use `Number.toLocaleString()`. Otherwise it will use `Number.toFixed()`.
     * @param legacyMax The upper bound for the amount. Defaults to `1000`.
     * @param legacyDec The number of decimal places for the amount. Defaults to `2`.
     * @param legacySymbol The symbol used to prefix the amount. Defaults to `''`.
     * @param legacyAutoFormat If true this method will use `Number.toLocaleString()`. Otherwise it will use `Number.toFixed()`. Defaults to `false`.
     *
     * @example
     * faker.finance.amount() // '617.87'
     * faker.finance.amount({ min: 5, max: 10 }) // '5.53'
     * faker.finance.amount({ min: 5, max: 10, dec: 0 }) // '8'
     * faker.finance.amount({ min: 5, max: 10, dec: 2, symbol: '$' }) // '$5.85'
     * faker.finance.amount({ min: 5, max: 10, dec: 5, symbol: '', autoFormat: true }) // '9,75067'
     *
     * @since 2.0.1
     */
    amount(options?: number | {
        /**
         * The lower bound for the amount.
         *
         * @default 0
         */
        min?: number;
        /**
         * The upper bound for the amount.
         *
         * @default 1000
         */
        max?: number;
        /**
         * The number of decimal places for the amount.
         *
         * @default 2
         */
        dec?: number;
        /**
         * The symbol used to prefix the amount.
         *
         * @default ''
         */
        symbol?: string;
        /**
         * If true this method will use `Number.toLocaleString()`. Otherwise it will use `Number.toFixed()`.
         *
         * @default false
         */
        autoFormat?: boolean;
    }, legacyMax?: number, legacyDec?: number, legacySymbol?: string, legacyAutoFormat?: boolean): string;
    /**
     * Returns a random transaction type.
     *
     * @example
     * faker.finance.transactionType() // 'payment'
     *
     * @since 2.0.1
     */
    transactionType(): string;
    /**
     * Returns a random currency object, containing `code`, `name `and `symbol` properties.
     *
     * @see
     * faker.finance.currencyCode(): For generating specifically the currency code.
     * faker.finance.currencyName(): For generating specifically the currency name.
     * faker.finance.currencySymbol(): For generating specifically the currency symbol.
     *
     * @example
     * faker.finance.currency() // { code: 'USD', name: 'US Dollar', symbol: '$' }
     *
     * @since 8.0.0
     */
    currency(): Currency;
    /**
     * Returns a random currency code.
     * (The short text/abbreviation for the currency (e.g. `US Dollar` -> `USD`))
     *
     * @example
     * faker.finance.currencyCode() // 'USD'
     *
     * @since 2.0.1
     */
    currencyCode(): string;
    /**
     * Returns a random currency name.
     *
     * @example
     * faker.finance.currencyName() // 'US Dollar'
     *
     * @since 2.0.1
     */
    currencyName(): string;
    /**
     * Returns a random currency symbol.
     *
     * @example
     * faker.finance.currencySymbol() // '$'
     *
     * @since 2.0.1
     */
    currencySymbol(): string;
    /**
     * Generates a random Bitcoin address.
     *
     * @example
     * faker.finance.bitcoinAddress() // '3ySdvCkTLVy7gKD4j6JfSaf5d'
     *
     * @since 3.1.0
     */
    bitcoinAddress(): string;
    /**
     * Generates a random Litecoin address.
     *
     * @example
     * faker.finance.litecoinAddress() // 'MoQaSTGWBRXkWfyxKbNKuPrAWGELzcW'
     *
     * @since 5.0.0
     */
    litecoinAddress(): string;
    /**
     * Generates a random credit card number.
     *
     * @param issuer The name of the issuer (case-insensitive) or the format used to generate one.
     *
     * @example
     * faker.finance.creditCardNumber() // '4427163488662'
     * faker.finance.creditCardNumber('visa') // '4882664999007'
     * faker.finance.creditCardNumber('63[7-9]#-####-####-###L') // '6375-3265-4676-6646'
     *
     * @since 5.0.0
     */
    creditCardNumber(issuer?: string): string;
    /**
     * Generates a random credit card number.
     *
     * @param options An options object. Defaults to `''`.
     * @param options.issuer The name of the issuer (case-insensitive) or the format used to generate one.
     *
     * @example
     * faker.finance.creditCardNumber() // '4427163488662'
     * faker.finance.creditCardNumber({ issuer: 'visa' }) // '4882664999007'
     * faker.finance.creditCardNumber({ issuer: '63[7-9]#-####-####-###L' }) // '6375-3265-4676-6646'
     *
     * @since 5.0.0
     */
    creditCardNumber(options?: {
        /**
         * The name of the issuer (case-insensitive) or the format used to generate one.
         *
         * @default ''
         */
        issuer?: string;
    }): string;
    /**
     * Generates a random credit card number.
     *
     * @param options An options object, the issuer or a custom format.
     * @param options.issuer The name of the issuer (case-insensitive) or the format used to generate one.
     *
     * @example
     * faker.finance.creditCardNumber() // '4427163488662'
     * faker.finance.creditCardNumber({ issuer: 'visa' }) // '4882664999007'
     * faker.finance.creditCardNumber({ issuer: '63[7-9]#-####-####-###L' }) // '6375-3265-4676-6646'
     * faker.finance.creditCardNumber('visa') // '1226423499765'
     *
     * @since 5.0.0
     */
    creditCardNumber(options?: string | {
        /**
         * The name of the issuer (case-insensitive) or the format used to generate one.
         *
         * @default ''
         */
        issuer?: string;
    }): string;
    /**
     * Generates a random credit card CVV.
     *
     * @example
     * faker.finance.creditCardCVV() // '506'
     *
     * @since 5.0.0
     */
    creditCardCVV(): string;
    /**
     * Returns a random credit card issuer.
     *
     * @example
     * faker.finance.creditCardIssuer() // 'discover'
     *
     * @since 6.3.0
     */
    creditCardIssuer(): string;
    /**
     * Generates a random PIN number.
     *
     * @param length The length of the PIN to generate. Defaults to `4`.
     *
     * @throws Will throw an error if length is less than 1.
     *
     * @example
     * faker.finance.pin() // '5067'
     * faker.finance.pin(6) // '213789'
     *
     * @since 6.2.0
     */
    pin(length?: number): string;
    /**
     * Generates a random PIN number.
     *
     * @param options An options object.
     * @param options.length The length of the PIN to generate. Defaults to `4`.
     *
     * @throws Will throw an error if length is less than 1.
     *
     * @example
     * faker.finance.pin() // '5067'
     * faker.finance.pin({ length: 6 }) // '213789'
     *
     * @since 6.2.0
     */
    pin(options?: {
        /**
         * The length of the PIN to generate.
         *
         * @default 4
         */
        length?: number;
    }): string;
    /**
     * Generates a random PIN number.
     *
     * @param options An options object or the length of the PIN.
     * @param options.length The length of the PIN to generate. Defaults to `4`.
     *
     * @throws Will throw an error if length is less than 1.
     *
     * @example
     * faker.finance.pin() // '5067'
     * faker.finance.pin({ length: 6 }) // '213789'
     * faker.finance.pin(6) // '213789'
     *
     * @since 6.2.0
     */
    pin(options?: number | {
        /**
         * The length of the PIN to generate.
         *
         * @default 4
         */
        length?: number;
    }): string;
    /**
     * Creates a random, non-checksum Ethereum address.
     *
     * To generate a checksummed Ethereum address (with specific per character casing), wrap this method in a custom method and use third-party libraries to transform the result.
     *
     * @example
     * faker.finance.ethereumAddress() // '0xf03dfeecbafc5147241cc4c4ca20b3c9dfd04c4a'
     *
     * @since 5.0.0
     */
    ethereumAddress(): string;
    /**
     * Generates a random iban.
     *
     * @param options An options object.
     * @param options.formatted Return a formatted version of the generated IBAN. Defaults to `false`.
     * @param options.countryCode The country code from which you want to generate an IBAN, if none is provided a random country will be used.
     *
     * @throws Will throw an error if the passed country code is not supported.
     *
     * @example
     * faker.finance.iban() // 'TR736918640040966092800056'
     * faker.finance.iban({ formatted: true }) // 'FR20 8008 2330 8984 74S3 Z620 224'
     * faker.finance.iban({ formatted: true, countryCode: 'DE' }) // 'DE84 1022 7075 0900 1170 01'
     *
     * @since 4.0.0
     */
    iban(options?: {
        /**
         * Return a formatted version of the generated IBAN.
         *
         * @default false
         */
        formatted?: boolean;
        /**
         * The country code from which you want to generate an IBAN,
         * if none is provided a random country will be used.
         */
        countryCode?: string;
    }): string;
    /**
     * Generates a random iban.
     *
     * @param formatted Return a formatted version of the generated IBAN. Defaults to `false`.
     * @param countryCode The country code from which you want to generate an IBAN, if none is provided a random country will be used.
     *
     * @throws Will throw an error if the passed country code is not supported.
     *
     * @example
     * faker.finance.iban() // 'TR736918640040966092800056'
     * faker.finance.iban(true) // 'FR20 8008 2330 8984 74S3 Z620 224'
     * faker.finance.iban(true, 'DE') // 'DE84 1022 7075 0900 1170 01'
     *
     * @since 4.0.0
     *
     * @deprecated Use `faker.finance.iban({ formatted, countryCode })` instead.
     */
    iban(formatted?: boolean, countryCode?: string): string;
    /**
     * Generates a random iban.
     *
     * @param options An options object or whether the return value should be formatted.
     * @param options.formatted Return a formatted version of the generated IBAN. Defaults to `false`.
     * @param options.countryCode The country code from which you want to generate an IBAN, if none is provided a random country will be used.
     * @param legacyCountryCode The country code from which you want to generate an IBAN, if none is provided a random country will be used.
     *
     * @throws Will throw an error if the passed country code is not supported.
     *
     * @example
     * faker.finance.iban() // 'TR736918640040966092800056'
     * faker.finance.iban({ formatted: true }) // 'FR20 8008 2330 8984 74S3 Z620 224'
     * faker.finance.iban({ formatted: true, countryCode: 'DE' }) // 'DE84 1022 7075 0900 1170 01'
     *
     * @since 4.0.0
     */
    iban(options?: boolean | {
        /**
         * Return a formatted version of the generated IBAN.
         *
         * @default false
         */
        formatted?: boolean;
        /**
         * The country code from which you want to generate an IBAN,
         * if none is provided a random country will be used.
         */
        countryCode?: string;
    }, legacyCountryCode?: string): string;
    /**
     * Generates a random SWIFT/BIC code based on the [ISO-9362](https://en.wikipedia.org/wiki/ISO_9362) format.
     *
     * @param options Options object.
     * @param options.includeBranchCode Whether to include a three-digit branch code at the end of the generated code. Defaults to a random boolean value.
     *
     * @example
     * faker.finance.bic() // 'WYAUPGX1'
     * faker.finance.bic({ includeBranchCode: true }) // 'KCAUPGR1432'
     * faker.finance.bic({ includeBranchCode: false }) // 'XDAFQGT7'
     *
     * @since 4.0.0
     */
    bic(options?: {
        /**
         * Whether to include a three-digit branch code at the end of the generated code.
         *
         * @default faker.datatype.boolean()
         */
        includeBranchCode?: boolean;
    }): string;
    /**
     * Generates a random transaction description.
     *
     * @example
     * faker.finance.transactionDescription()
     * // 'invoice transaction at Kilback - Durgan using card ending with ***(...4316) for UAH 783.82 in account ***16168663'
     *
     * @since 5.1.0
     */
    transactionDescription(): string;
}
