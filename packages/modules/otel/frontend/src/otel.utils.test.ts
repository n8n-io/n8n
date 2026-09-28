import { createSampleRateFormat, isOtlpProtocol } from './otel.utils';

describe('isOtlpProtocol', () => {
	it.each(['http/protobuf', 'grpc'])('accepts the supported protocol %s', (value) => {
		expect(isOtlpProtocol(value)).toBe(true);
	});

	it.each(['http/json', 'HTTP/PROTOBUF', '', undefined, null, 1])(
		'rejects %s',
		(value: unknown) => {
			expect(isOtlpProtocol(value)).toBe(false);
		},
	);
});

describe('createSampleRateFormat', () => {
	describe.each(['en-US', 'de-DE', 'fr-FR', 'ar-EG', 'fa-IR'])('locale %s', (locale) => {
		const { format, parse } = createSampleRateFormat(locale);

		test.each([0, 0.25, 0.5, 0.1234, 1])('round-trips %s through format and parse', (value) => {
			expect(parse(format(value))).toBe(value);
		});
	});

	describe('parse', () => {
		const { parse } = createSampleRateFormat('en-US');

		it('accepts both plain decimal separators', () => {
			expect(parse('0.5')).toBe(0.5);
			expect(parse('0,5')).toBe(0.5);
		});

		it('clamps to [0, 1]', () => {
			expect(parse('5')).toBe(1);
			expect(parse('-1')).toBe(0);
		});

		it('returns null for empty or non-numeric input', () => {
			expect(parse('')).toBeNull();
			expect(parse('   ')).toBeNull();
			expect(parse('abc')).toBeNull();
		});

		it('accepts ASCII digits under a localized-digit locale', () => {
			expect(createSampleRateFormat('ar-EG').parse('0.5')).toBe(0.5);
		});
	});

	describe('format', () => {
		it('renders at least two and at most four fraction digits', () => {
			const { format } = createSampleRateFormat('en-US');
			expect(format(1)).toBe('1.00');
			expect(format(0.5)).toBe('0.50');
			expect(format(0.1234)).toBe('0.1234');
		});
	});
});
