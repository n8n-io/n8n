/**
 * The credentials of a node in a template workflow. Map from credential
 * type name to credential name.
 * @example
 * {
 *  twitterOAuth1Api: "Twitter credentials"
 * }
 */
export type NormalizedTemplateNodeCredentials = Record<string, string>;
