import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, StaticRouterMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { ClientRequest } from 'node:http';

function expandIpv6Groups(ip: string): string[] {
	const [head, tail] = ip.split('%')[0].split('::');
	const headGroups = head ? head.split(':') : [];
	if (tail === undefined) {
		return headGroups;
	}
	const tailGroups = tail ? tail.split(':') : [];
	const fillCount = Math.max(0, 8 - headGroups.length - tailGroups.length);
	const fill = Array.from({ length: fillCount }, () => '0');
	return [...headGroups, ...fill, ...tailGroups];
}

// Anonymize the IP for GeoIP: keep the network, drop the host (IPv4 /24, IPv6 /48).
export function maskIp(ip: string): string {
	const v4Mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
	const ipv4 = v4Mapped ? v4Mapped[1] : ip;

	if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ipv4)) {
		return ipv4.replace(/\.\d{1,3}$/, '.0');
	}

	if (ip.includes(':')) {
		const groups = expandIpv6Groups(ip);
		return `${groups[0] ?? '0'}:${groups[1] ?? '0'}:${groups[2] ?? '0'}::`;
	}

	return ip;
}

export function setPostHogProxyHeaders(
	proxyReq: ClientRequest,
	req: AuthenticatedRequest & { rawBody?: Buffer },
) {
	proxyReq.removeHeader('cookie');

	if (req.ip) {
		proxyReq.setHeader('X-PH-Client-IP', maskIp(req.ip));
	}

	// For POST requests, forward the raw body directly
	if (req.method === 'POST' && req.rawBody) {
		proxyReq.setHeader('Content-Length', req.rawBody.length.toString());
		proxyReq.write(req.rawBody);
	}
}

@RestController('/ph')
export class PostHogController {
	static routers: StaticRouterMetadata[] = [
		{
			path: '/',
			router: (() => {
				const router = Router();
				const globalConfig = Container.get(GlobalConfig);
				const targetUrl = globalConfig.diagnostics.posthogConfig.apiHost;

				const proxy = createProxyMiddleware({
					target: targetUrl,
					changeOrigin: true,
					on: {
						proxyReq: (proxyReq, req) =>
							setPostHogProxyHeaders(proxyReq, req as AuthenticatedRequest & { rawBody?: Buffer }),
					},
				});

				// Use proxy middleware directly - handles all methods and paths
				router.use(proxy);

				return router;
			})(),
			skipAuth: true,
		},
	];
}
