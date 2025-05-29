/**
 * Error Handler Middleware
 */

import { Context } from 'hono';

export function errorHandler(err: Error, c: Context) {
  console.error('Unhandled error:', err);
  
  return c.json({
    error: 'Internal Server Error',
    message: c.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(c.env.NODE_ENV === 'development' && { stack: err.stack }),
  }, 500);
}