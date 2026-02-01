import { Container } from '@n8n/di';

import { GlobalConfig } from '../src/index';

beforeEach(() => {
	Container.reset();
	jest.clearAllMocks();
});

const originalEnv = process.env;
afterEach(() => {
	process.env = originalEnv;
});

it('should strip double quotes from string values', () => {
	process.env = {
		GENERIC_TIMEZONE: '"America/Bogota"',
		N8N_HOST: '"localhost"',
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('America/Bogota');
	expect(config.host).toBe('localhost');
});

it('should strip single quotes from string values', () => {
	process.env = {
		GENERIC_TIMEZONE: "'America/Bogota'",
		N8N_HOST: "'localhost'",
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('America/Bogota');
	expect(config.host).toBe('localhost');
});

it('should trim whitespace from quoted values', () => {
	process.env = {
		GENERIC_TIMEZONE: '  "America/Bogota"  ',
		N8N_HOST: "  'localhost'  ",
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('America/Bogota');
	expect(config.host).toBe('localhost');
});

it('should trim whitespace from unquoted values', () => {
	process.env = {
		GENERIC_TIMEZONE: '  America/Bogota  ',
		N8N_HOST: '  localhost  ',
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('America/Bogota');
	expect(config.host).toBe('localhost');
});

it('should leave mismatched quotes unchanged', () => {
	process.env = {
		GENERIC_TIMEZONE: '"America/Bogota\'',
		N8N_HOST: '\'localhost"',
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('"America/Bogota\'');
	expect(config.host).toBe('\'localhost"');
});

it('should handle empty quotes', () => {
	process.env = {
		GENERIC_TIMEZONE: '""',
		N8N_HOST: "''",
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('');
	expect(config.host).toBe('');
});

it('should handle single character in quotes', () => {
	process.env = {
		GENERIC_TIMEZONE: '"A"',
		N8N_HOST: "'B'",
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('A');
	expect(config.host).toBe('B');
});

it('should handle values with spaces in quotes', () => {
	process.env = {
		GENERIC_TIMEZONE: '"America/New York"',
		N8N_HOST: "'my host name'",
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('America/New York');
	expect(config.host).toBe('my host name');
});

it('should handle nested quotes', () => {
	process.env = {
		GENERIC_TIMEZONE: '"America/\'Bogota\'"',
		N8N_HOST: '\'"localhost"\'',
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe("America/'Bogota'");
	expect(config.host).toBe('"localhost"');
});

it('should handle only opening or closing quotes', () => {
	process.env = {
		GENERIC_TIMEZONE: '"America/Bogota',
		N8N_HOST: 'localhost"',
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('"America/Bogota');
	expect(config.host).toBe('localhost"');
});

it('should handle multiple quote pairs', () => {
	process.env = {
		GENERIC_TIMEZONE: '""America/Bogota""',
		N8N_HOST: "''localhost''",
	};
	const config = Container.get(GlobalConfig);
	expect(config.generic.timezone).toBe('"America/Bogota"'); // should strip only outer quotes
	expect(config.host).toBe("'localhost'");
});
