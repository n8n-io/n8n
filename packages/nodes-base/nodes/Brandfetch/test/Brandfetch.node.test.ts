import { Brandfetch } from '../Brandfetch.node';
import { BrandfetchV1 } from '../v1/BrandfetchV1.node';
import { BrandfetchV2 } from '../v2/BrandfetchV2.node';

describe('Brandfetch (versioned entry point)', () => {
	let brandfetch: Brandfetch;

	beforeEach(() => {
		brandfetch = new Brandfetch();
	});

	it('should instantiate without errors', () => {
		expect(brandfetch).toBeInstanceOf(Brandfetch);
	});

	it('should expose version 1 as BrandfetchV1', () => {
		expect(brandfetch.nodeVersions[1]).toBeInstanceOf(BrandfetchV1);
	});

	it('should expose version 2 as BrandfetchV2', () => {
		expect(brandfetch.nodeVersions[2]).toBeInstanceOf(BrandfetchV2);
	});

	it('should have defaultVersion set to 2', () => {
		expect(brandfetch.description.defaultVersion).toBe(2);
	});

	it('should have the correct displayName', () => {
		expect(brandfetch.description.displayName).toBe('Brandfetch');
	});

	it('should have the correct icon', () => {
		expect(brandfetch.description.icon).toBe('file:brandfetch.svg');
	});
});
