/**
 * Authentication Middleware
 * 
 * JWT-based authentication for Cloudflare Workers
 */

import { Context, Next } from 'hono';
import { verify } from 'jose';
import { DatabaseService } from '../services/database';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify JWT token
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await verify(token, secret);
    
    // Get user from database
    const db = c.get('db') as DatabaseService;
    const user = await db.findUserById(payload.sub as string);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    // Set user in context
    c.set('user', user);
    
    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
}