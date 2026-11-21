# XSS & CSRF Prevention

## XSS Prevention

### Output Encoding

```typescript
// React automatically escapes by default
function SafeComponent({ userInput }: { userInput: string }) {
  return <div>{userInput}</div>; // Safe - auto-escaped
}

// If you must render HTML, sanitize first
import DOMPurify from 'dompurify';

function HtmlContent({ html }: { html: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(html)
      }}
    />
  );
}
```

### Content Security Policy

```typescript
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://api.example.com"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));
```

### Input Sanitization

```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML
const clean = DOMPurify.sanitize(dirty);

// Sanitize with config
const cleanStrict = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href'],
});

// Strip all HTML
const textOnly = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
```

## CSRF Prevention

### Synchronizer Token Pattern

```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

// Add to forms
app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// Validate on submission
app.post('/submit', csrfProtection, (req, res) => {
  // Token validated automatically
});
```

### Double Submit Cookie

```typescript
// Set CSRF cookie
res.cookie('csrf', token, {
  httpOnly: false, // Must be readable by JS
  secure: true,
  sameSite: 'strict',
});

// Client sends in header
fetch('/api/action', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': getCookie('csrf'),
  },
});

// Server validates
if (req.cookies.csrf !== req.headers['x-csrf-token']) {
  return res.status(403).json({ error: 'CSRF validation failed' });
}
```

### SameSite Cookies

```typescript
// Modern CSRF protection
app.use(session({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict', // Or 'lax' for GET requests
  },
}));
```

## HTTP Headers

```typescript
// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS filter (legacy)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});
```

## Quick Reference

| Attack | Prevention |
|--------|------------|
| Reflected XSS | Output encoding |
| Stored XSS | Input sanitization + encoding |
| DOM XSS | Avoid innerHTML, use textContent |
| CSRF | Tokens + SameSite cookies |

| Header | Purpose |
|--------|---------|
| CSP | Script/resource restrictions |
| X-Frame-Options | Clickjacking |
| X-Content-Type-Options | MIME sniffing |
| SameSite | CSRF protection |
