import { iconForMcpRegistryServer } from '../mcpRegistryIcon';

describe('iconForMcpRegistryServer', () => {
	it('prefers an icon for the active theme', () => {
		expect(
			iconForMcpRegistryServer(
				[
					{ src: 'https://example.test/light.svg', theme: 'light' },
					{ src: 'https://example.test/dark.svg', theme: 'dark' },
				],
				'dark',
			),
		).toEqual({ type: 'file', src: 'https://example.test/dark.svg' });
	});

	it('falls back to an untagged icon before an icon for another theme', () => {
		expect(
			iconForMcpRegistryServer(
				[
					{ src: 'https://example.test/light.svg', theme: 'light' },
					{ src: 'https://example.test/default.svg' },
				],
				'dark',
			),
		).toEqual({ type: 'file', src: 'https://example.test/default.svg' });
	});

	it('falls back to the first icon when no theme or untagged icon matches', () => {
		expect(
			iconForMcpRegistryServer([{ src: 'https://example.test/light.svg', theme: 'light' }], 'dark'),
		).toEqual({ type: 'file', src: 'https://example.test/light.svg' });
	});

	it('uses the MCP icon when the registry has no icon', () => {
		expect(iconForMcpRegistryServer([], 'light')).toEqual({ type: 'icon', name: 'mcp' });
	});
});
