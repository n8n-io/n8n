import { SyslogClient } from './client';
import type { ClientOptions } from './types';

/**
 * Factory function to create a syslog client.
 * Provided for backward compatibility with original API.
 *
 * @param target - Target host/path (IP address, hostname, or Unix socket path)
 * @param options - Client configuration options
 * @returns New SyslogClient instance
 *
 * @example
 * ```typescript
 * import { createClient, Transport } from '@n8n/syslog-client';
 *
 * const client = createClient('192.168.1.1', {
 *   transport: Transport.Tcp,
 *   port: 514,
 * });
 *
 * await client.log('Test message');
 * client.close();
 * ```
 */
export function createClient(target?: string, options?: ClientOptions): SyslogClient {
	return new SyslogClient(target, options);
}
