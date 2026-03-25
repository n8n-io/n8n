export interface IsFQDNOptions {
    /**
     * @default true
     */
    require_tld?: boolean | undefined;
    /**
     * @default false
     */
    allow_underscores?: boolean | undefined;
    /**
     * @default false
     */
    allow_trailing_dot?: boolean | undefined;
    /**
     * @default false
     */
    allow_numeric_tld?: boolean | undefined;
    /**
     * If `allow_wildcard` is set to true, the validator will allow domain starting with `*.` (e.g. `*.example.com` or `*.shop.example.com`).
     * @default false
     */
    allow_wildcard?: boolean | undefined;
}

/**
 * Check if the string is a fully qualified domain name (e.g. `domain.com`).
 *
 * @param [options] - Options
 */
export default function isFQDN(str: string, options?: IsFQDNOptions): boolean;
