// \n = 10
// ; = 59
// { = 123
// } = 125
// <space> = 32
// \r = 13
// \t = 9

const splitIntoPotentialTokens = str => {
	const len = str.length;
	if (len === 0) return null;
	const results = [];
	let i = 0;
	for (; i < len; ) {
		const s = i;
		block: {
			let cc = str.charCodeAt(i);
			while (cc !== 10 && cc !== 59 && cc !== 123 && cc !== 125) {
				if (++i >= len) break block;
				cc = str.charCodeAt(i);
			}
			while (
				cc === 59 ||
				cc === 32 ||
				cc === 123 ||
				cc === 125 ||
				cc === 13 ||
				cc === 9
			) {
				if (++i >= len) break block;
				cc = str.charCodeAt(i);
			}
			if (cc === 10) {
				i++;
			}
		}
		results.push(str.slice(s, i));
	}
	return results;
};
module.exports = splitIntoPotentialTokens;
