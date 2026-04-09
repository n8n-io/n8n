import type { Long } from '@grpc/proto-loader';
/**
 * BytesRules describe the constraints applied to `bytes` values
 */
export interface BytesRules {
    /**
     * Const specifies that this field must be exactly the specified value
     */
    'const'?: (Buffer | Uint8Array | string);
    /**
     * MinLen specifies that this field must be the specified number of bytes
     * at a minimum
     */
    'min_len'?: (number | string | Long);
    /**
     * MaxLen specifies that this field must be the specified number of bytes
     * at a maximum
     */
    'max_len'?: (number | string | Long);
    /**
     * Pattern specifes that this field must match against the specified
     * regular expression (RE2 syntax). The included expression should elide
     * any delimiters.
     */
    'pattern'?: (string);
    /**
     * Prefix specifies that this field must have the specified bytes at the
     * beginning of the string.
     */
    'prefix'?: (Buffer | Uint8Array | string);
    /**
     * Suffix specifies that this field must have the specified bytes at the
     * end of the string.
     */
    'suffix'?: (Buffer | Uint8Array | string);
    /**
     * Contains specifies that this field must have the specified bytes
     * anywhere in the string.
     */
    'contains'?: (Buffer | Uint8Array | string);
    /**
     * In specifies that this field must be equal to one of the specified
     * values
     */
    'in'?: (Buffer | Uint8Array | string)[];
    /**
     * NotIn specifies that this field cannot be equal to one of the specified
     * values
     */
    'not_in'?: (Buffer | Uint8Array | string)[];
    /**
     * Ip specifies that the field must be a valid IP (v4 or v6) address in
     * byte format
     */
    'ip'?: (boolean);
    /**
     * Ipv4 specifies that the field must be a valid IPv4 address in byte
     * format
     */
    'ipv4'?: (boolean);
    /**
     * Ipv6 specifies that the field must be a valid IPv6 address in byte
     * format
     */
    'ipv6'?: (boolean);
    /**
     * Len specifies that this field must be the specified number of bytes
     */
    'len'?: (number | string | Long);
    /**
     * WellKnown rules provide advanced constraints against common byte
     * patterns
     */
    'well_known'?: "ip" | "ipv4" | "ipv6";
}
/**
 * BytesRules describe the constraints applied to `bytes` values
 */
export interface BytesRules__Output {
    /**
     * Const specifies that this field must be exactly the specified value
     */
    'const': (Buffer);
    /**
     * MinLen specifies that this field must be the specified number of bytes
     * at a minimum
     */
    'min_len': (string);
    /**
     * MaxLen specifies that this field must be the specified number of bytes
     * at a maximum
     */
    'max_len': (string);
    /**
     * Pattern specifes that this field must match against the specified
     * regular expression (RE2 syntax). The included expression should elide
     * any delimiters.
     */
    'pattern': (string);
    /**
     * Prefix specifies that this field must have the specified bytes at the
     * beginning of the string.
     */
    'prefix': (Buffer);
    /**
     * Suffix specifies that this field must have the specified bytes at the
     * end of the string.
     */
    'suffix': (Buffer);
    /**
     * Contains specifies that this field must have the specified bytes
     * anywhere in the string.
     */
    'contains': (Buffer);
    /**
     * In specifies that this field must be equal to one of the specified
     * values
     */
    'in': (Buffer)[];
    /**
     * NotIn specifies that this field cannot be equal to one of the specified
     * values
     */
    'not_in': (Buffer)[];
    /**
     * Ip specifies that the field must be a valid IP (v4 or v6) address in
     * byte format
     */
    'ip'?: (boolean);
    /**
     * Ipv4 specifies that the field must be a valid IPv4 address in byte
     * format
     */
    'ipv4'?: (boolean);
    /**
     * Ipv6 specifies that the field must be a valid IPv6 address in byte
     * format
     */
    'ipv6'?: (boolean);
    /**
     * Len specifies that this field must be the specified number of bytes
     */
    'len': (string);
    /**
     * WellKnown rules provide advanced constraints against common byte
     * patterns
     */
    'well_known'?: "ip" | "ipv4" | "ipv6";
}
