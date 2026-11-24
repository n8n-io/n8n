# Authentication

## Password Hashing

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Password requirements
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) errors.push('Minimum 12 characters');
  if (!/[a-z]/.test(password)) errors.push('Requires lowercase');
  if (!/[A-Z]/.test(password)) errors.push('Requires uppercase');
  if (!/\d/.test(password)) errors.push('Requires digit');
  if (!/[@$!%*?&]/.test(password)) errors.push('Requires special character');

  return { valid: errors.length === 0, errors };
}
```

## JWT Implementation

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
}

function generateAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
```

## Auth Middleware

```typescript
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const token = header.slice(7);
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    req.userId = payload.sub;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Account Lockout

```typescript
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

async function handleLoginAttempt(email: string, success: boolean) {
  const key = `login:attempts:${email}`;

  if (success) {
    await redis.del(key);
    return;
  }

  const attempts = await redis.incr(key);
  await redis.expire(key, LOCKOUT_DURATION / 1000);

  if (attempts >= MAX_ATTEMPTS) {
    await redis.set(`login:locked:${email}`, '1', 'PX', LOCKOUT_DURATION);
    throw new Error('Account locked. Try again later.');
  }
}
```

## Quick Reference

| Practice | Implementation |
|----------|----------------|
| Password hash | bcrypt (12+ rounds) |
| Token expiry | Access: 15m, Refresh: 7d |
| Lockout | 5 attempts, 15min lockout |
| MFA | TOTP (authenticator apps) |

| JWT Claim | Purpose |
|-----------|---------|
| `sub` | User ID |
| `exp` | Expiration |
| `iat` | Issued at |
| `type` | access/refresh |
