import type { Agent } from 'node:http';
export type Sockets = Pick<Agent, 'sockets'>;
/**
 * Get port from target
 * Using proxyRes.req.agent.sockets to determine the target port
 */
export declare function getPort(sockets?: Sockets): string | undefined;
