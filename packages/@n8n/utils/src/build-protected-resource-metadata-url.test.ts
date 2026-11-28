import { buildProtectedResourceMetadataUrl } from './build-protected-resource-metadata-url';

describe('buildProtectedResourceMetadataUrl', () => {
	it('inserts the well-known segment before the resource path', () => {
		expect(buildProtectedResourceMetadataUrl('https://n8n.example.com/mcp-server/http')).toBe(
			'https://n8n.example.com/.well-known/oauth-protected-resource/mcp-server/http',
		);
	});

	it('keeps a public base path before the well-known segment', () => {
		expect(
			buildProtectedResourceMetadataUrl(
				'https://example.com/somepath/mcp-server/http',
				'https://example.com/somepath',
			),
		).toBe('https://example.com/somepath/.well-known/oauth-protected-resource/mcp-server/http');
	});

	it('ignores a trailing slash in the public base URL', () => {
		expect(
			buildProtectedResourceMetadataUrl(
				'https://example.com/somepath/mcp-server/http',
				'https://example.com/somepath/',
			),
		).toBe('https://example.com/somepath/.well-known/oauth-protected-resource/mcp-server/http');
	});

	it('preserves the query component', () => {
		expect(
			buildProtectedResourceMetadataUrl(
				'https://example.com/somepath/webhook/orders?method=POST',
				'https://example.com/somepath',
			),
		).toBe(
			'https://example.com/somepath/.well-known/oauth-protected-resource/webhook/orders?method=POST',
		);
	});

	it('uses the origin-root form when the resource is on another origin', () => {
		expect(
			buildProtectedResourceMetadataUrl(
				'https://mcp.example.com/mcp-server/http',
				'https://example.com/somepath',
			),
		).toBe('https://mcp.example.com/.well-known/oauth-protected-resource/mcp-server/http');
	});

	it('uses the origin-root form when the resource is outside the public base path', () => {
		expect(
			buildProtectedResourceMetadataUrl(
				'https://example.com/hooks/mcp-server/http',
				'https://example.com/somepath',
			),
		).toBe('https://example.com/.well-known/oauth-protected-resource/hooks/mcp-server/http');
	});

	it('handles a resource whose path is exactly the public base path', () => {
		expect(
			buildProtectedResourceMetadataUrl(
				'https://example.com/somepath',
				'https://example.com/somepath',
			),
		).toBe('https://example.com/somepath/.well-known/oauth-protected-resource');
	});

	it('falls back to the origin-root form for an invalid public base URL', () => {
		expect(
			buildProtectedResourceMetadataUrl(
				'https://example.com/somepath/mcp-server/http',
				'not a URL',
			),
		).toBe('https://example.com/.well-known/oauth-protected-resource/somepath/mcp-server/http');
	});
});
