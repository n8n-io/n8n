/**
 * Authentication Routes
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../services/database';
import { validateRequest } from '../middleware/validation';

const app = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

/**
 * POST /auth/login
 */
app.post('/login', validateRequest(loginSchema), async (c) => {
  const { email, password } = await c.req.json();
  const db = c.get('db') as DatabaseService;

  try {
    const user = await db.findUserByEmail(email);
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const token = await new SignJWT({ sub: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

/**
 * POST /auth/register
 */
app.post('/register', validateRequest(registerSchema), async (c) => {
  const userData = await c.req.json();
  const db = c.get('db') as DatabaseService;

  try {
    // Check if user already exists
    const existingUser = await db.findUserByEmail(userData.email);
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await db.createUser({
      ...userData,
      password: hashedPassword,
    });

    // Generate JWT
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const token = await new SignJWT({ sub: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

export { app as authRoutes };