import {
	PartData,
	Base64PartData,
	QuotedPrintablePartData,
	SevenBitPartData,
	BinaryPartData,
	UuencodedPartData,
} from '../src/PartData';

describe('PartData', () => {
	describe('fromData', () => {
		it('should return an instance of Base64PartData when encoding is BASE64', () => {
			const result = PartData.fromData('data', 'BASE64');
			expect(result).toBeInstanceOf(Base64PartData);
		});

		it('should return an instance of QuotedPrintablePartData when encoding is QUOTED-PRINTABLE', () => {
			const result = PartData.fromData('data', 'QUOTED-PRINTABLE');
			expect(result).toBeInstanceOf(QuotedPrintablePartData);
		});

		it('should return an instance of SevenBitPartData when encoding is 7BIT', () => {
			const result = PartData.fromData('data', '7BIT');
			expect(result).toBeInstanceOf(SevenBitPartData);
		});

		it('should return an instance of BinaryPartData when encoding is 8BIT or BINARY', () => {
			let result = PartData.fromData('data', '8BIT');
			expect(result).toBeInstanceOf(BinaryPartData);
			result = PartData.fromData('data', 'BINARY');
			expect(result).toBeInstanceOf(BinaryPartData);
		});

		it('should return an instance of UuencodedPartData when encoding is UUENCODE', () => {
			const result = PartData.fromData('data', 'UUENCODE');
			expect(result).toBeInstanceOf(UuencodedPartData);
		});

		it('should throw an error when encoding is not supported', () => {
			expect(() => PartData.fromData('data', 'UNSUPPORTED')).toThrow(
				'Unknown encoding UNSUPPORTED',
			);
		});
	});
});

describe('Base64PartData', () => {
	it('should correctly decode base64 data', () => {
		const data = Buffer.from('Hello, world!', 'utf-8').toString('base64');
		const partData = new Base64PartData(data);
		expect(partData.toString()).toBe('Hello, world!');
	});
});

describe('QuotedPrintablePartData', () => {
	it('should correctly decode quoted-printable data', () => {
		const data = '=48=65=6C=6C=6F=2C=20=77=6F=72=6C=64=21'; // 'Hello, world!' in quoted-printable
		const partData = new QuotedPrintablePartData(data);
		expect(partData.toString()).toBe('Hello, world!');
	});
});

describe('SevenBitPartData', () => {
	it('should correctly decode 7bit data', () => {
		const data = 'Hello, world!';
		const partData = new SevenBitPartData(data);
		expect(partData.toString()).toBe('Hello, world!');
	});
});

describe('BinaryPartData', () => {
	it('should correctly decode binary data', () => {
		const data = Buffer.from('Hello, world!', 'utf-8').toString();
		const partData = new BinaryPartData(data);
		expect(partData.toString()).toBe('Hello, world!');
	});
});

describe('UuencodedPartData', () => {
	it('should correctly decode uuencoded data', () => {
		const data = Buffer.from(
			'YmVnaW4gNjQ0IGRhdGEKLTImNUw7JlxMKCc9TzxGUUQoMGBgCmAKZW5kCg==',
			'base64',
		).toString('binary');
		const partData = new UuencodedPartData(data);
		expect(partData.toString()).toBe('Hello, world!');
	});
});
