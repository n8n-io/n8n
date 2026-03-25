'use strict';

const readDigit = (buffer, index) => {
	const digit = buffer.readUInt16BE(8 + 2 * index);

	if (digit > 9999) {
		throw new RangeError('Invalid numeric digit: ' + digit);
	}

	return digit;
};

const readNumeric = buffer => {
	const ndigits = buffer.readUInt16BE(0);
	let weight = buffer.readInt16BE(2);
	const sign = buffer.readUInt16BE(4);
	const dscale = buffer.readUInt16BE(6);
	let signText;
	let isNegativeZero;

	switch (sign) {
	case 0x0000:
		signText = '';
		isNegativeZero = false;
		break;

	case 0x4000:
		signText = '-';
		isNegativeZero = true;
		break;

	case 0xc000:
		return 'NaN';

	default:
		throw new RangeError('Invalid numeric sign: 0x' + sign.toString(16));
	}

	if (2 * ndigits !== buffer.length - 8) {
		throw new RangeError('Invalid numeric length: ' + buffer.length + ' bytes of data representing ' + ndigits + ' digits');
	}

	if (dscale > 0x3fff) {
		throw new RangeError('Invalid numeric dscale: 0x' + dscale.toString(16));
	}

	let result = signText;
	let i = 0;

	integerPart: {
		for (;;) {
			if (i >= ndigits) {
				// no non-zero digits
				weight = -1;
			}
			if (weight < 0) {
				result += '0';
				break integerPart;
			}

			const digit = readDigit(buffer, i);
			i++;
			weight--;

			if (digit !== 0) {
				isNegativeZero = false;
				result += String(digit);
				break;
			}
		}

		while (weight >= 0 && i < ndigits) {
			const digit = readDigit(buffer, i);
			i++;
			weight--;

			result += String(10000 + digit).substring(1);
		}

		while (weight >= 0) {
			result += '0000';
			weight--;
		}
	}

	fractionalPart: if (dscale !== 0) {
		result += '.';

		const omitted = -1 - weight;

		if (omitted > 0) {
			if (4 * omitted > dscale) {
				result += '0'.repeat(dscale);
				break fractionalPart;
			}

			result += '0'.repeat(4 * omitted);
		}

		while (-4 * weight <= dscale) {
			const digit = i < ndigits ? readDigit(buffer, i) : 0;
			i++;
			weight--;

			if (isNegativeZero && digit !== 0) {
				isNegativeZero = false;
			}

			result += String(10000 + digit).substring(1);
		}

		{
			const digit = i < ndigits ? readDigit(buffer, i) : 0;
			result += String(10000 + digit).substr(1, dscale % 4);

			if (isNegativeZero && digit >= Math.pow(10, 4 - dscale % 4)) {
				isNegativeZero = false;
			}
		}
	}

	return isNegativeZero ? result.substring(1) : result;
};

module.exports = readNumeric;
