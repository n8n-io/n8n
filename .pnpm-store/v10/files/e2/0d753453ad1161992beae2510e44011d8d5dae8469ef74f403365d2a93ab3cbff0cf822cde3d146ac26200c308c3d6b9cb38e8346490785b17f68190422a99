# Security Policy

## Security Considerations

### Query Injection

JSONPath-Plus evaluates JSONPath expressions provided by the caller. While the default `"eval": "safe"` option prevents arbitrary code execution, it **cannot prevent data exposure if the JSONPath query itself is compromised**.

If untrusted input is incorporated into a JSONPath expression, an attacker may be able to alter the query structure by adding additional patterns. This can change how the remaining query is interpreted and may result in **unexpected or broader data being returned** than intended.

**Important notes:**
- This does **not** enable random code execution when using `"eval": "safe"` (the default).
- The primary risk is **data leakage**, not execution of attacker-controlled code.

**Mitigations:**
1. **Do not interpolate unsanitized user input into JSONPath queries.**
2. If user-controlled input must be included in a query, ensure the target JSON object contains **only non-confidential data**.

As a general rule, treat JSONPath expressions as code and avoid constructing them dynamically from untrusted sources.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you believe you’ve found a security vulnerability, please send it to us by emailing [iamavinashthakur.at@gmail.com](mailto:iamavinashthakur.at@gmail.com) or [brettz9@yahoo.com](mailto:brettz9@yahoo.com). Please include the following details with your report:

1. Description of the location and potential impact of the vulnerability

2. A detailed description of the steps required to reproduce the vulnerability (POC scripts, etc.).

3. How you would like to be credited.

We will evaluate the vulnerability and, if necessary, release a fix or unertake mitigating steps to address it. We will contact you to let you know the outcome, and will credit you in the report.

Please **do not disclose the vulnerability publicly** until we have sufficient time to release a fix.

Once we have either a) published a fix, b) declined to address the vulnerability for whatever reason, or c) taken more than 30 days to reply, we welcome you to publicly report the vulnerability on our tracker and disclose it publicly. If you intend to
disclose sooner regardless of our requested policy, please at least indicate to us when you plan to disclose.
