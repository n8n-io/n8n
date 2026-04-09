// Original file: proto/protoc-gen-validate/validate/validate.proto

import type { KnownRegex as _validate_KnownRegex, KnownRegex__Output as _validate_KnownRegex__Output } from '../validate/KnownRegex';
import type { Long } from '@grpc/proto-loader';

/**
 * StringRules describe the constraints applied to `string` values
 */
export interface StringRules {
  /**
   * Const specifies that this field must be exactly the specified value
   */
  'const'?: (string);
  /**
   * MinLen specifies that this field must be the specified number of
   * characters (Unicode code points) at a minimum. Note that the number of
   * characters may differ from the number of bytes in the string.
   */
  'min_len'?: (number | string | Long);
  /**
   * MaxLen specifies that this field must be the specified number of
   * characters (Unicode code points) at a maximum. Note that the number of
   * characters may differ from the number of bytes in the string.
   */
  'max_len'?: (number | string | Long);
  /**
   * MinBytes specifies that this field must be the specified number of bytes
   * at a minimum
   */
  'min_bytes'?: (number | string | Long);
  /**
   * MaxBytes specifies that this field must be the specified number of bytes
   * at a maximum
   */
  'max_bytes'?: (number | string | Long);
  /**
   * Pattern specifes that this field must match against the specified
   * regular expression (RE2 syntax). The included expression should elide
   * any delimiters.
   */
  'pattern'?: (string);
  /**
   * Prefix specifies that this field must have the specified substring at
   * the beginning of the string.
   */
  'prefix'?: (string);
  /**
   * Suffix specifies that this field must have the specified substring at
   * the end of the string.
   */
  'suffix'?: (string);
  /**
   * Contains specifies that this field must have the specified substring
   * anywhere in the string.
   */
  'contains'?: (string);
  /**
   * In specifies that this field must be equal to one of the specified
   * values
   */
  'in'?: (string)[];
  /**
   * NotIn specifies that this field cannot be equal to one of the specified
   * values
   */
  'not_in'?: (string)[];
  /**
   * Email specifies that the field must be a valid email address as
   * defined by RFC 5322
   */
  'email'?: (boolean);
  /**
   * Hostname specifies that the field must be a valid hostname as
   * defined by RFC 1034. This constraint does not support
   * internationalized domain names (IDNs).
   */
  'hostname'?: (boolean);
  /**
   * Ip specifies that the field must be a valid IP (v4 or v6) address.
   * Valid IPv6 addresses should not include surrounding square brackets.
   */
  'ip'?: (boolean);
  /**
   * Ipv4 specifies that the field must be a valid IPv4 address.
   */
  'ipv4'?: (boolean);
  /**
   * Ipv6 specifies that the field must be a valid IPv6 address. Valid
   * IPv6 addresses should not include surrounding square brackets.
   */
  'ipv6'?: (boolean);
  /**
   * Uri specifies that the field must be a valid, absolute URI as defined
   * by RFC 3986
   */
  'uri'?: (boolean);
  /**
   * UriRef specifies that the field must be a valid URI as defined by RFC
   * 3986 and may be relative or absolute.
   */
  'uri_ref'?: (boolean);
  /**
   * Len specifies that this field must be the specified number of
   * characters (Unicode code points). Note that the number of
   * characters may differ from the number of bytes in the string.
   */
  'len'?: (number | string | Long);
  /**
   * LenBytes specifies that this field must be the specified number of bytes
   * at a minimum
   */
  'len_bytes'?: (number | string | Long);
  /**
   * Address specifies that the field must be either a valid hostname as
   * defined by RFC 1034 (which does not support internationalized domain
   * names or IDNs), or it can be a valid IP (v4 or v6).
   */
  'address'?: (boolean);
  /**
   * Uuid specifies that the field must be a valid UUID as defined by
   * RFC 4122
   */
  'uuid'?: (boolean);
  /**
   * NotContains specifies that this field cannot have the specified substring
   * anywhere in the string.
   */
  'not_contains'?: (string);
  /**
   * WellKnownRegex specifies a common well known pattern defined as a regex.
   */
  'well_known_regex'?: (_validate_KnownRegex);
  /**
   * This applies to regexes HTTP_HEADER_NAME and HTTP_HEADER_VALUE to enable
   * strict header validation.
   * By default, this is true, and HTTP header validations are RFC-compliant.
   * Setting to false will enable a looser validations that only disallows
   * \r\n\0 characters, which can be used to bypass header matching rules.
   */
  'strict'?: (boolean);
  /**
   * WellKnown rules provide advanced constraints against common string
   * patterns
   */
  'well_known'?: "email"|"hostname"|"ip"|"ipv4"|"ipv6"|"uri"|"uri_ref"|"address"|"uuid"|"well_known_regex";
}

/**
 * StringRules describe the constraints applied to `string` values
 */
export interface StringRules__Output {
  /**
   * Const specifies that this field must be exactly the specified value
   */
  'const': (string);
  /**
   * MinLen specifies that this field must be the specified number of
   * characters (Unicode code points) at a minimum. Note that the number of
   * characters may differ from the number of bytes in the string.
   */
  'min_len': (string);
  /**
   * MaxLen specifies that this field must be the specified number of
   * characters (Unicode code points) at a maximum. Note that the number of
   * characters may differ from the number of bytes in the string.
   */
  'max_len': (string);
  /**
   * MinBytes specifies that this field must be the specified number of bytes
   * at a minimum
   */
  'min_bytes': (string);
  /**
   * MaxBytes specifies that this field must be the specified number of bytes
   * at a maximum
   */
  'max_bytes': (string);
  /**
   * Pattern specifes that this field must match against the specified
   * regular expression (RE2 syntax). The included expression should elide
   * any delimiters.
   */
  'pattern': (string);
  /**
   * Prefix specifies that this field must have the specified substring at
   * the beginning of the string.
   */
  'prefix': (string);
  /**
   * Suffix specifies that this field must have the specified substring at
   * the end of the string.
   */
  'suffix': (string);
  /**
   * Contains specifies that this field must have the specified substring
   * anywhere in the string.
   */
  'contains': (string);
  /**
   * In specifies that this field must be equal to one of the specified
   * values
   */
  'in': (string)[];
  /**
   * NotIn specifies that this field cannot be equal to one of the specified
   * values
   */
  'not_in': (string)[];
  /**
   * Email specifies that the field must be a valid email address as
   * defined by RFC 5322
   */
  'email'?: (boolean);
  /**
   * Hostname specifies that the field must be a valid hostname as
   * defined by RFC 1034. This constraint does not support
   * internationalized domain names (IDNs).
   */
  'hostname'?: (boolean);
  /**
   * Ip specifies that the field must be a valid IP (v4 or v6) address.
   * Valid IPv6 addresses should not include surrounding square brackets.
   */
  'ip'?: (boolean);
  /**
   * Ipv4 specifies that the field must be a valid IPv4 address.
   */
  'ipv4'?: (boolean);
  /**
   * Ipv6 specifies that the field must be a valid IPv6 address. Valid
   * IPv6 addresses should not include surrounding square brackets.
   */
  'ipv6'?: (boolean);
  /**
   * Uri specifies that the field must be a valid, absolute URI as defined
   * by RFC 3986
   */
  'uri'?: (boolean);
  /**
   * UriRef specifies that the field must be a valid URI as defined by RFC
   * 3986 and may be relative or absolute.
   */
  'uri_ref'?: (boolean);
  /**
   * Len specifies that this field must be the specified number of
   * characters (Unicode code points). Note that the number of
   * characters may differ from the number of bytes in the string.
   */
  'len': (string);
  /**
   * LenBytes specifies that this field must be the specified number of bytes
   * at a minimum
   */
  'len_bytes': (string);
  /**
   * Address specifies that the field must be either a valid hostname as
   * defined by RFC 1034 (which does not support internationalized domain
   * names or IDNs), or it can be a valid IP (v4 or v6).
   */
  'address'?: (boolean);
  /**
   * Uuid specifies that the field must be a valid UUID as defined by
   * RFC 4122
   */
  'uuid'?: (boolean);
  /**
   * NotContains specifies that this field cannot have the specified substring
   * anywhere in the string.
   */
  'not_contains': (string);
  /**
   * WellKnownRegex specifies a common well known pattern defined as a regex.
   */
  'well_known_regex'?: (_validate_KnownRegex__Output);
  /**
   * This applies to regexes HTTP_HEADER_NAME and HTTP_HEADER_VALUE to enable
   * strict header validation.
   * By default, this is true, and HTTP header validations are RFC-compliant.
   * Setting to false will enable a looser validations that only disallows
   * \r\n\0 characters, which can be used to bypass header matching rules.
   */
  'strict': (boolean);
  /**
   * WellKnown rules provide advanced constraints against common string
   * patterns
   */
  'well_known'?: "email"|"hostname"|"ip"|"ipv4"|"ipv6"|"uri"|"uri_ref"|"address"|"uuid"|"well_known_regex";
}
