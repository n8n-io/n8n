const RealDate = Date;
let now = null;
class MockDate extends RealDate {
	constructor(y, m, d, h, M, s, ms) {
		super();
		let date;
		switch (arguments.length) {
			case 0:
				if (now !== null) {
					date = new RealDate(now.valueOf());
				} else {
					date = new RealDate();
				}
				break;
			case 1:
				date = new RealDate(y);
				break;
			default:
				d = typeof d === "undefined" ? 1 : d;
				h = h || 0;
				M = M || 0;
				s = s || 0;
				ms = ms || 0;
				date = new RealDate(y, m, d, h, M, s, ms);
				break;
		}
		Object.setPrototypeOf(date, MockDate.prototype);
		return date;
	}
}
MockDate.UTC = RealDate.UTC;
MockDate.now = function() {
	return new MockDate().valueOf();
};
MockDate.parse = function(dateString) {
	return RealDate.parse(dateString);
};
MockDate.toString = function() {
	return RealDate.toString();
};
function mockDate(date) {
	const dateObj = new RealDate(date.valueOf());
	if (Number.isNaN(dateObj.getTime())) {
		throw new TypeError(`mockdate: The time set is an invalid date: ${date}`);
	}
	globalThis.Date = MockDate;
	now = dateObj.valueOf();
}
function resetDate() {
	globalThis.Date = RealDate;
}

export { RealDate as R, mockDate as m, resetDate as r };
