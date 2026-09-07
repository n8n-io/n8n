/**
 * The clearance brand. It lives in its own module so that neither the public
 * barrel nor the `policy-internal` subpath re-exports it: the symbol is
 * unreachable outside `@n8n/decorators`, which is what makes a `PolicyCleared`
 * unforgeable — only code inside this package can produce the branded key.
 */
export const brand = Symbol('policyCleared');
