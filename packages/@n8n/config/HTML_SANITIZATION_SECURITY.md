# HTML Sanitization Security Notice

## Important Security Notice

The `InputValidator.sanitizeHTML()` method provides **basic** HTML sanitization and should **NOT** be used for untrusted user input in production environments. Regex-based HTML sanitization is notoriously difficult to implement securely and can often be bypassed.

## Recommended Alternatives

For production use with untrusted HTML content, use one of these well-tested solutions:

### 1. DOMPurify (Recommended)

DOMPurify is the most widely used and battle-tested HTML sanitization library.

**Installation:**
```bash
pnpm add dompurify
pnpm add -D @types/dompurify
```

**Usage:**
```typescript
import DOMPurify from 'dompurify';

// For Node.js (requires jsdom)
import { JSDOM } from 'jsdom';
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Sanitize HTML
const cleanHtml = DOMPurify.sanitize(dirtyHtml);

// With configuration
const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
  ALLOWED_ATTR: ['class'],
});
```

### 2. Sanitizer API (Future Standard)

The Sanitizer API is a browser standard for HTML sanitization. Currently available in some browsers.

**Usage (when available):**
```typescript
const sanitizer = new Sanitizer();
const cleanHtml = sanitizer.sanitizeFor('div', dirtyHtml);
```

### 3. Strip All HTML (Safest)

For most cases where you don't actually need HTML formatting, the safest approach is to strip all HTML:

```typescript
function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
```

## When to Use InputValidator.sanitizeHTML()

The basic `sanitizeHTML()` method should only be used for:

1. **Trusted input** where you control the content format
2. **Development/testing** environments
3. **Simple use cases** where you only need to strip basic tags
4. **Non-security-critical** contexts

## Security Best Practices

1. **Defense in Depth**: Use multiple layers of security
   - Input validation
   - HTML sanitization
   - Content Security Policy (CSP)
   - Output encoding

2. **Principle of Least Privilege**: Only allow what's necessary
   - Whitelist allowed HTML tags and attributes
   - Block all JavaScript execution contexts
   - Use strict CSP headers

3. **Keep Libraries Updated**: Security vulnerabilities are found and fixed regularly
   ```bash
   pnpm update dompurify
   ```

4. **Test Your Sanitization**: Use test cases that attempt to bypass sanitization
   - Try various XSS payloads
   - Test with encoded characters
   - Test with malformed HTML

## Example: Secure HTML Sanitization

Here's a complete example using DOMPurify:

```typescript
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

class SecureHTMLSanitizer {
  private purify: DOMPurify.DOMPurifyI;

  constructor() {
    const window = new JSDOM('').window;
    this.purify = DOMPurify(window);
  }

  sanitize(html: string, options?: {
    allowedTags?: string[];
    allowedAttributes?: string[];
  }): string {
    const config: DOMPurify.Config = {
      ALLOWED_TAGS: options?.allowedTags || [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 
        'ul', 'ol', 'li', 'a', 'span', 'div'
      ],
      ALLOWED_ATTR: options?.allowedAttributes || ['href', 'class', 'id'],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
    };

    return this.purify.sanitize(html, config);
  }

  stripAll(html: string): string {
    return this.purify.sanitize(html, { ALLOWED_TAGS: [] });
  }
}

// Usage
const sanitizer = new SecureHTMLSanitizer();
const cleanHtml = sanitizer.sanitize(userInput);
```

## XSS Prevention Checklist

- [ ] Use DOMPurify or similar library for HTML sanitization
- [ ] Implement Content Security Policy (CSP) headers
- [ ] Validate and sanitize all user input
- [ ] Use context-appropriate output encoding
- [ ] Set HTTPOnly and Secure flags on cookies
- [ ] Keep all dependencies updated
- [ ] Perform regular security audits
- [ ] Test with known XSS payloads
- [ ] Use security headers (X-XSS-Protection, X-Content-Type-Options)
- [ ] Train developers on XSS prevention

## Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HTML Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API)

---

**Last Updated**: November 7, 2025
