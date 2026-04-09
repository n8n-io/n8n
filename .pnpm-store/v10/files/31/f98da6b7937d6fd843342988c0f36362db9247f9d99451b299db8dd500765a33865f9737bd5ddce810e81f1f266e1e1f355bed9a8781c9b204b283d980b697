/* MIT license */
/* eslint-disable no-mixed-operators */
import cssKeywords from 'color-name';

// NOTE: conversions should only return primitive values (i.e. arrays, or
//       values that give correct `typeof` results).
//       do not use box values types (i.e. Number(), String(), etc.)

const reverseKeywords = {};
for (const key of Object.keys(cssKeywords)) {
	reverseKeywords[cssKeywords[key]] = key;
}

const convert = {
	rgb: {channels: 3, labels: 'rgb'},
	hsl: {channels: 3, labels: 'hsl'},
	hsv: {channels: 3, labels: 'hsv'},
	hwb: {channels: 3, labels: 'hwb'},
	cmyk: {channels: 4, labels: 'cmyk'},
	xyz: {channels: 3, labels: 'xyz'},
	lab: {channels: 3, labels: 'lab'},
	oklab: {channels: 3, labels: ['okl', 'oka', 'okb']},
	lch: {channels: 3, labels: 'lch'},
	oklch: {channels: 3, labels: ['okl', 'okc', 'okh']},
	hex: {channels: 1, labels: ['hex']},
	keyword: {channels: 1, labels: ['keyword']},
	ansi16: {channels: 1, labels: ['ansi16']},
	ansi256: {channels: 1, labels: ['ansi256']},
	hcg: {channels: 3, labels: ['h', 'c', 'g']},
	apple: {channels: 3, labels: ['r16', 'g16', 'b16']},
	gray: {channels: 1, labels: ['gray']},
};

export default convert;

// LAB f(t) constant
const LAB_FT = (6 / 29) ** 3;

// SRGB non-linear transform functions
function srgbNonlinearTransform(c) {
	const cc = c > 0.003_130_8
		? ((1.055 * (c ** (1 / 2.4))) - 0.055)
		: c * 12.92;
	return Math.min(Math.max(0, cc), 1);
}

function srgbNonlinearTransformInv(c) {
	return c > 0.040_45 ? (((c + 0.055) / 1.055) ** 2.4) : (c / 12.92);
}

// Hide .channels and .labels properties
for (const model of Object.keys(convert)) {
	if (!('channels' in convert[model])) {
		throw new Error('missing channels property: ' + model);
	}

	if (!('labels' in convert[model])) {
		throw new Error('missing channel labels property: ' + model);
	}

	if (convert[model].labels.length !== convert[model].channels) {
		throw new Error('channel and label counts mismatch: ' + model);
	}

	const {channels, labels} = convert[model];
	delete convert[model].channels;
	delete convert[model].labels;
	Object.defineProperty(convert[model], 'channels', {value: channels});
	Object.defineProperty(convert[model], 'labels', {value: labels});
}

convert.rgb.hsl = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const min = Math.min(r, g, b);
	const max = Math.max(r, g, b);
	const delta = max - min;
	let h;
	let s;

	switch (max) {
		case min: {
			h = 0;

			break;
		}

		case r: {
			h = (g - b) / delta;

			break;
		}

		case g: {
			h = 2 + (b - r) / delta;

			break;
		}

		case b: {
			h = 4 + (r - g) / delta;

			break;
		}
	// No default
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	const l = (min + max) / 2;

	if (max === min) {
		s = 0;
	} else if (l <= 0.5) {
		s = delta / (max + min);
	} else {
		s = delta / (2 - max - min);
	}

	return [h, s * 100, l * 100];
};

convert.rgb.hsv = function (rgb) {
	let rdif;
	let gdif;
	let bdif;
	let h;
	let s;

	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const v = Math.max(r, g, b);
	const diff = v - Math.min(r, g, b);
	const diffc = function (c) {
		return (v - c) / 6 / diff + 1 / 2;
	};

	if (diff === 0) {
		h = 0;
		s = 0;
	} else {
		s = diff / v;
		rdif = diffc(r);
		gdif = diffc(g);
		bdif = diffc(b);

		switch (v) {
			case r: {
				h = bdif - gdif;

				break;
			}

			case g: {
				h = (1 / 3) + rdif - bdif;

				break;
			}

			case b: {
				h = (2 / 3) + gdif - rdif;

				break;
			}
		// No default
		}

		if (h < 0) {
			h += 1;
		} else if (h > 1) {
			h -= 1;
		}
	}

	return [
		h * 360,
		s * 100,
		v * 100,
	];
};

convert.rgb.hwb = function (rgb) {
	const r = rgb[0];
	const g = rgb[1];
	let b = rgb[2];
	const h = convert.rgb.hsl(rgb)[0];
	const w = 1 / 255 * Math.min(r, Math.min(g, b));

	b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));

	return [h, w * 100, b * 100];
};

convert.rgb.oklab = function (rgb) {
	// Assume sRGB
	const r = srgbNonlinearTransformInv(rgb[0] / 255);
	const g = srgbNonlinearTransformInv(rgb[1] / 255);
	const b = srgbNonlinearTransformInv(rgb[2] / 255);

	const lp = Math.cbrt(0.412_221_470_8 * r + 0.536_332_536_3 * g + 0.051_445_992_9 * b);
	const mp = Math.cbrt(0.211_903_498_2 * r + 0.680_699_545_1 * g + 0.107_396_956_6 * b);
	const sp = Math.cbrt(0.088_302_461_9 * r + 0.281_718_837_6 * g + 0.629_978_700_5 * b);

	const l = 0.210_454_255_3 * lp + 0.793_617_785 * mp - 0.004_072_046_8 * sp;
	const aa = 1.977_998_495_1 * lp - 2.428_592_205 * mp + 0.450_593_709_9 * sp;
	const bb = 0.025_904_037_1 * lp + 0.782_771_766_2 * mp - 0.808_675_766 * sp;

	return [l * 100, aa * 100, bb * 100];
};

convert.rgb.cmyk = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;

	const k = Math.min(1 - r, 1 - g, 1 - b);
	const c = (1 - r - k) / (1 - k) || 0;
	const m = (1 - g - k) / (1 - k) || 0;
	const y = (1 - b - k) / (1 - k) || 0;

	return [c * 100, m * 100, y * 100, k * 100];
};

function comparativeDistance(x, y) {
	/*
		See https://en.m.wikipedia.org/wiki/Euclidean_distance#Squared_Euclidean_distance
	*/
	return (
		((x[0] - y[0]) ** 2) +
		((x[1] - y[1]) ** 2) +
		((x[2] - y[2]) ** 2)
	);
}

convert.rgb.keyword = function (rgb) {
	const reversed = reverseKeywords[rgb];
	if (reversed) {
		return reversed;
	}

	let currentClosestDistance = Number.POSITIVE_INFINITY;
	let currentClosestKeyword;

	for (const keyword of Object.keys(cssKeywords)) {
		const value = cssKeywords[keyword];

		// Compute comparative distance
		const distance = comparativeDistance(rgb, value);

		// Check if its less, if so set as closest
		if (distance < currentClosestDistance) {
			currentClosestDistance = distance;
			currentClosestKeyword = keyword;
		}
	}

	return currentClosestKeyword;
};

convert.keyword.rgb = function (keyword) {
	return [...cssKeywords[keyword]];
};

convert.rgb.xyz = function (rgb) {
	// Assume sRGB
	const r = srgbNonlinearTransformInv(rgb[0] / 255);
	const g = srgbNonlinearTransformInv(rgb[1] / 255);
	const b = srgbNonlinearTransformInv(rgb[2] / 255);

	const x = (r * 0.412_456_4) + (g * 0.357_576_1) + (b * 0.180_437_5);
	const y = (r * 0.212_672_9) + (g * 0.715_152_2) + (b * 0.072_175);
	const z = (r * 0.019_333_9) + (g * 0.119_192) + (b * 0.950_304_1);

	return [x * 100, y * 100, z * 100];
};

convert.rgb.lab = function (rgb) {
	const xyz = convert.rgb.xyz(rgb);
	let x = xyz[0];
	let y = xyz[1];
	let z = xyz[2];

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > LAB_FT ? (x ** (1 / 3)) : (7.787 * x) + (16 / 116);
	y = y > LAB_FT ? (y ** (1 / 3)) : (7.787 * y) + (16 / 116);
	z = z > LAB_FT ? (z ** (1 / 3)) : (7.787 * z) + (16 / 116);

	const l = (116 * y) - 16;
	const a = 500 * (x - y);
	const b = 200 * (y - z);

	return [l, a, b];
};

convert.hsl.rgb = function (hsl) {
	const h = hsl[0] / 360;
	const s = hsl[1] / 100;
	const l = hsl[2] / 100;
	let t3;
	let value;

	if (s === 0) {
		value = l * 255;
		return [value, value, value];
	}

	const t2 = l < 0.5 ? l * (1 + s) : l + s - l * s;

	const t1 = 2 * l - t2;

	const rgb = [0, 0, 0];
	for (let i = 0; i < 3; i++) {
		t3 = h + 1 / 3 * -(i - 1);
		if (t3 < 0) {
			t3++;
		}

		if (t3 > 1) {
			t3--;
		}

		if (6 * t3 < 1) {
			value = t1 + (t2 - t1) * 6 * t3;
		} else if (2 * t3 < 1) {
			value = t2;
		} else if (3 * t3 < 2) {
			value = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
		} else {
			value = t1;
		}

		rgb[i] = value * 255;
	}

	return rgb;
};

convert.hsl.hsv = function (hsl) {
	const h = hsl[0];
	let s = hsl[1] / 100;
	let l = hsl[2] / 100;
	let smin = s;
	const lmin = Math.max(l, 0.01);

	l *= 2;
	s *= (l <= 1) ? l : 2 - l;
	smin *= lmin <= 1 ? lmin : 2 - lmin;
	const v = (l + s) / 2;
	const sv = l === 0 ? (2 * smin) / (lmin + smin) : (2 * s) / (l + s);

	return [h, sv * 100, v * 100];
};

convert.hsv.rgb = function (hsv) {
	const h = hsv[0] / 60;
	const s = hsv[1] / 100;
	let v = hsv[2] / 100;
	const hi = Math.floor(h) % 6;

	const f = h - Math.floor(h);
	const p = 255 * v * (1 - s);
	const q = 255 * v * (1 - (s * f));
	const t = 255 * v * (1 - (s * (1 - f)));
	v *= 255;

	switch (hi) {
		case 0: {
			return [v, t, p];
		}

		case 1: {
			return [q, v, p];
		}

		case 2: {
			return [p, v, t];
		}

		case 3: {
			return [p, q, v];
		}

		case 4: {
			return [t, p, v];
		}

		case 5: {
			return [v, p, q];
		}
	}
};

convert.hsv.hsl = function (hsv) {
	const h = hsv[0];
	const s = hsv[1] / 100;
	const v = hsv[2] / 100;
	const vmin = Math.max(v, 0.01);
	let sl;
	let l;

	l = (2 - s) * v;
	const lmin = (2 - s) * vmin;
	sl = s * vmin;
	sl /= (lmin <= 1) ? lmin : 2 - lmin;
	sl = sl || 0;
	l /= 2;

	return [h, sl * 100, l * 100];
};

// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
convert.hwb.rgb = function (hwb) {
	const h = hwb[0] / 360;
	let wh = hwb[1] / 100;
	let bl = hwb[2] / 100;
	const ratio = wh + bl;
	let f;

	// Wh + bl cant be > 1
	if (ratio > 1) {
		wh /= ratio;
		bl /= ratio;
	}

	const i = Math.floor(6 * h);
	const v = 1 - bl;
	f = 6 * h - i;

	// eslint-disable-next-line no-bitwise
	if ((i & 0x01) !== 0) {
		f = 1 - f;
	}

	const n = wh + f * (v - wh); // Linear interpolation

	let r;
	let g;
	let b;
	/* eslint-disable max-statements-per-line,no-multi-spaces, default-case-last */
	switch (i) {
		default:
		case 6:
		case 0: { r = v;  g = n;  b = wh; break;
		}

		case 1: { r = n;  g = v;  b = wh; break;
		}

		case 2: { r = wh; g = v;  b = n; break;
		}

		case 3: { r = wh; g = n;  b = v; break;
		}

		case 4: { r = n;  g = wh; b = v; break;
		}

		case 5: { r = v;  g = wh; b = n; break;
		}
	}
	/* eslint-enable max-statements-per-line,no-multi-spaces, default-case-last */

	return [r * 255, g * 255, b * 255];
};

convert.cmyk.rgb = function (cmyk) {
	const c = cmyk[0] / 100;
	const m = cmyk[1] / 100;
	const y = cmyk[2] / 100;
	const k = cmyk[3] / 100;

	const r = 1 - Math.min(1, c * (1 - k) + k);
	const g = 1 - Math.min(1, m * (1 - k) + k);
	const b = 1 - Math.min(1, y * (1 - k) + k);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.rgb = function (xyz) {
	const x = xyz[0] / 100;
	const y = xyz[1] / 100;
	const z = xyz[2] / 100;
	let r;
	let g;
	let b;

	r = (x * 3.240_454_2) + (y * -1.537_138_5) + (z * -0.498_531_4);
	g = (x * -0.969_266) + (y * 1.876_010_8) + (z * 0.041_556);
	b = (x * 0.055_643_4) + (y * -0.204_025_9) + (z * 1.057_225_2);

	// Assume sRGB
	r = srgbNonlinearTransform(r);
	g = srgbNonlinearTransform(g);
	b = srgbNonlinearTransform(b);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.lab = function (xyz) {
	let x = xyz[0];
	let y = xyz[1];
	let z = xyz[2];

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > LAB_FT ? (x ** (1 / 3)) : (7.787 * x) + (16 / 116);
	y = y > LAB_FT ? (y ** (1 / 3)) : (7.787 * y) + (16 / 116);
	z = z > LAB_FT ? (z ** (1 / 3)) : (7.787 * z) + (16 / 116);

	const l = (116 * y) - 16;
	const a = 500 * (x - y);
	const b = 200 * (y - z);

	return [l, a, b];
};

convert.xyz.oklab = function (xyz) {
	const x = xyz[0] / 100;
	const y = xyz[1] / 100;
	const z = xyz[2] / 100;

	const lp = Math.cbrt(0.818_933_010_1 * x + 0.361_866_742_4 * y - 0.128_859_713_7 * z);
	const mp = Math.cbrt(0.032_984_543_6 * x + 0.929_311_871_5 * y + 0.036_145_638_7 * z);
	const sp = Math.cbrt(0.048_200_301_8 * x + 0.264_366_269_1 * y + 0.633_851_707 * z);

	const l = 0.210_454_255_3 * lp + 0.793_617_785 * mp - 0.004_072_046_8 * sp;
	const a = 1.977_998_495_1 * lp - 2.428_592_205 * mp + 0.450_593_709_9 * sp;
	const b = 0.025_904_037_1 * lp + 0.782_771_766_2 * mp - 0.808_675_766 * sp;

	return [l * 100, a * 100, b * 100];
};

convert.oklab.oklch = function (oklab) {
	return convert.lab.lch(oklab);
};

convert.oklab.xyz = function (oklab) {
	const ll = oklab[0] / 100;
	const a = oklab[1] / 100;
	const b = oklab[2] / 100;

	const l = (0.999_999_998 * ll + 0.396_337_792 * a + 0.215_803_758 * b) ** 3;
	const m = (1.000_000_008 * ll - 0.105_561_342 * a - 0.063_854_175 * b) ** 3;
	const s = (1.000_000_055 * ll - 0.089_484_182 * a - 1.291_485_538 * b) ** 3;

	const x = 1.227_013_851 * l - 0.557_799_98 * m + 0.281_256_149 * s;
	const y = -0.040_580_178 * l + 1.112_256_87 * m - 0.071_676_679 * s;
	const z = -0.076_381_285 * l - 0.421_481_978 * m + 1.586_163_22 * s;

	return [x * 100, y * 100, z * 100];
};

convert.oklab.rgb = function (oklab) {
	const ll = oklab[0] / 100;
	const aa = oklab[1] / 100;
	const bb = oklab[2] / 100;

	const l = (ll + 0.396_337_777_4 * aa + 0.215_803_757_3 * bb) ** 3;
	const m = (ll - 0.105_561_345_8 * aa - 0.063_854_172_8 * bb) ** 3;
	const s = (ll - 0.089_484_177_5 * aa - 1.291_485_548 * bb) ** 3;

	// Assume sRGB
	const r = srgbNonlinearTransform(4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s);
	const g = srgbNonlinearTransform(-1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s);
	const b = srgbNonlinearTransform(-0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s);

	return [r * 255, g * 255, b * 255];
};

convert.oklch.oklab = function (oklch) {
	return convert.lch.lab(oklch);
};

convert.lab.xyz = function (lab) {
	const l = lab[0];
	const a = lab[1];
	const b = lab[2];
	let x;
	let y;
	let z;

	y = (l + 16) / 116;
	x = a / 500 + y;
	z = y - b / 200;

	const y2 = y ** 3;
	const x2 = x ** 3;
	const z2 = z ** 3;
	y = y2 > LAB_FT ? y2 : (y - 16 / 116) / 7.787;
	x = x2 > LAB_FT ? x2 : (x - 16 / 116) / 7.787;
	z = z2 > LAB_FT ? z2 : (z - 16 / 116) / 7.787;

	// Illuminant D65 XYZ Tristrimulus Values
	// https://en.wikipedia.org/wiki/CIE_1931_color_space
	x *= 95.047;
	y *= 100;
	z *= 108.883;

	return [x, y, z];
};

convert.lab.lch = function (lab) {
	const l = lab[0];
	const a = lab[1];
	const b = lab[2];
	let h;

	const hr = Math.atan2(b, a);
	h = hr * 360 / 2 / Math.PI;

	if (h < 0) {
		h += 360;
	}

	const c = Math.sqrt(a * a + b * b);

	return [l, c, h];
};

convert.lch.lab = function (lch) {
	const l = lch[0];
	const c = lch[1];
	const h = lch[2];

	const hr = h / 360 * 2 * Math.PI;
	const a = c * Math.cos(hr);
	const b = c * Math.sin(hr);

	return [l, a, b];
};

convert.rgb.ansi16 = function (args, saturation = null) {
	const [r, g, b] = args;
	let value = saturation === null ? convert.rgb.hsv(args)[2] : saturation; // Hsv -> ansi16 optimization

	value = Math.round(value / 50);

	if (value === 0) {
		return 30;
	}

	let ansi = 30
		/* eslint-disable no-bitwise */
		+ ((Math.round(b / 255) << 2)
		| (Math.round(g / 255) << 1)
		| Math.round(r / 255));
		/* eslint-enable no-bitwise */

	if (value === 2) {
		ansi += 60;
	}

	return ansi;
};

convert.hsv.ansi16 = function (args) {
	// Optimization here; we already know the value and don't need to get
	// it converted for us.
	return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
};

convert.rgb.ansi256 = function (args) {
	const r = args[0];
	const g = args[1];
	const b = args[2];

	// We use the extended greyscale palette here, with the exception of
	// black and white. normal palette only has 4 greyscale shades.
	// eslint-disable-next-line no-bitwise
	if (r >> 4 === g >> 4 && g >> 4 === b >> 4) {
		if (r < 8) {
			return 16;
		}

		if (r > 248) {
			return 231;
		}

		return Math.round(((r - 8) / 247) * 24) + 232;
	}

	const ansi = 16
		+ (36 * Math.round(r / 255 * 5))
		+ (6 * Math.round(g / 255 * 5))
		+ Math.round(b / 255 * 5);

	return ansi;
};

convert.ansi16.rgb = function (args) {
	args = args[0];

	let color = args % 10;

	// Handle greyscale
	if (color === 0 || color === 7) {
		if (args > 50) {
			color += 3.5;
		}

		color = color / 10.5 * 255;

		return [color, color, color];
	}

	const mult = (Math.trunc(args > 50) + 1) * 0.5;
	/* eslint-disable no-bitwise */
	const r = ((color & 1) * mult) * 255;
	const g = (((color >> 1) & 1) * mult) * 255;
	const b = (((color >> 2) & 1) * mult) * 255;
	/* eslint-enable no-bitwise */

	return [r, g, b];
};

convert.ansi256.rgb = function (args) {
	args = args[0];

	// Handle greyscale
	if (args >= 232) {
		const c = (args - 232) * 10 + 8;
		return [c, c, c];
	}

	args -= 16;

	let rem;
	const r = Math.floor(args / 36) / 5 * 255;
	const g = Math.floor((rem = args % 36) / 6) / 5 * 255;
	const b = (rem % 6) / 5 * 255;

	return [r, g, b];
};

convert.rgb.hex = function (args) {
	/* eslint-disable no-bitwise */
	const integer = ((Math.round(args[0]) & 0xFF) << 16)
		+ ((Math.round(args[1]) & 0xFF) << 8)
		+ (Math.round(args[2]) & 0xFF);
	/* eslint-enable no-bitwise */

	const string = integer.toString(16).toUpperCase();
	return '000000'.slice(string.length) + string;
};

convert.hex.rgb = function (args) {
	const match = args.toString(16).match(/[a-f\d]{6}|[a-f\d]{3}/i);
	if (!match) {
		return [0, 0, 0];
	}

	let colorString = match[0];

	if (match[0].length === 3) {
		colorString = [...colorString].map(char => char + char).join('');
	}

	const integer = Number.parseInt(colorString, 16);
	/* eslint-disable no-bitwise */
	const r = (integer >> 16) & 0xFF;
	const g = (integer >> 8) & 0xFF;
	const b = integer & 0xFF;
	/* eslint-enable no-bitwise */

	return [r, g, b];
};

convert.rgb.hcg = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const max = Math.max(Math.max(r, g), b);
	const min = Math.min(Math.min(r, g), b);
	const chroma = (max - min);
	let hue;

	const grayscale = chroma < 1 ? min / (1 - chroma) : 0;

	if (chroma <= 0) {
		hue = 0;
	} else if (max === r) {
		hue = ((g - b) / chroma) % 6;
	} else if (max === g) {
		hue = 2 + (b - r) / chroma;
	} else {
		hue = 4 + (r - g) / chroma;
	}

	hue /= 6;
	hue %= 1;

	return [hue * 360, chroma * 100, grayscale * 100];
};

convert.hsl.hcg = function (hsl) {
	const s = hsl[1] / 100;
	const l = hsl[2] / 100;

	const c = l < 0.5 ? (2 * s * l) : (2 * s * (1 - l));

	let f = 0;
	if (c < 1) {
		f = (l - 0.5 * c) / (1 - c);
	}

	return [hsl[0], c * 100, f * 100];
};

convert.hsv.hcg = function (hsv) {
	const s = hsv[1] / 100;
	const v = hsv[2] / 100;

	const c = s * v;
	let f = 0;

	if (c < 1) {
		f = (v - c) / (1 - c);
	}

	return [hsv[0], c * 100, f * 100];
};

convert.hcg.rgb = function (hcg) {
	const h = hcg[0] / 360;
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	if (c === 0) {
		return [g * 255, g * 255, g * 255];
	}

	const pure = [0, 0, 0];
	const hi = (h % 1) * 6;
	const v = hi % 1;
	const w = 1 - v;
	let mg = 0;

	/* eslint-disable max-statements-per-line */
	switch (Math.floor(hi)) {
		case 0: {
			pure[0] = 1; pure[1] = v; pure[2] = 0; break;
		}

		case 1: {
			pure[0] = w; pure[1] = 1; pure[2] = 0; break;
		}

		case 2: {
			pure[0] = 0; pure[1] = 1; pure[2] = v; break;
		}

		case 3: {
			pure[0] = 0; pure[1] = w; pure[2] = 1; break;
		}

		case 4: {
			pure[0] = v; pure[1] = 0; pure[2] = 1; break;
		}

		default: {
			pure[0] = 1; pure[1] = 0; pure[2] = w;
		}
	}
	/* eslint-enable max-statements-per-line */

	mg = (1 - c) * g;

	return [
		(c * pure[0] + mg) * 255,
		(c * pure[1] + mg) * 255,
		(c * pure[2] + mg) * 255,
	];
};

convert.hcg.hsv = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	const v = c + g * (1 - c);
	let f = 0;

	if (v > 0) {
		f = c / v;
	}

	return [hcg[0], f * 100, v * 100];
};

convert.hcg.hsl = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	const l = g * (1 - c) + 0.5 * c;
	let s = 0;

	if (l > 0 && l < 0.5) {
		s = c / (2 * l);
	} else if (l >= 0.5 && l < 1) {
		s = c / (2 * (1 - l));
	}

	return [hcg[0], s * 100, l * 100];
};

convert.hcg.hwb = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;
	const v = c + g * (1 - c);
	return [hcg[0], (v - c) * 100, (1 - v) * 100];
};

convert.hwb.hcg = function (hwb) {
	const w = hwb[1] / 100;
	const b = hwb[2] / 100;
	const v = 1 - b;
	const c = v - w;
	let g = 0;

	if (c < 1) {
		g = (v - c) / (1 - c);
	}

	return [hwb[0], c * 100, g * 100];
};

convert.apple.rgb = function (apple) {
	return [(apple[0] / 65_535) * 255, (apple[1] / 65_535) * 255, (apple[2] / 65_535) * 255];
};

convert.rgb.apple = function (rgb) {
	return [(rgb[0] / 255) * 65_535, (rgb[1] / 255) * 65_535, (rgb[2] / 255) * 65_535];
};

convert.gray.rgb = function (args) {
	return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
};

convert.gray.hsl = function (args) {
	return [0, 0, args[0]];
};

convert.gray.hsv = convert.gray.hsl;

convert.gray.hwb = function (gray) {
	return [0, 100, gray[0]];
};

convert.gray.cmyk = function (gray) {
	return [0, 0, 0, gray[0]];
};

convert.gray.lab = function (gray) {
	return [gray[0], 0, 0];
};

convert.gray.hex = function (gray) {
	/* eslint-disable no-bitwise */
	const value = Math.round(gray[0] / 100 * 255) & 0xFF;
	const integer = (value << 16) + (value << 8) + value;
	/* eslint-enable no-bitwise */

	const string = integer.toString(16).toUpperCase();
	return '000000'.slice(string.length) + string;
};

convert.rgb.gray = function (rgb) {
	const value = (rgb[0] + rgb[1] + rgb[2]) / 3;
	return [value / 255 * 100];
};
