// Prolog plugin

var yy = alasql.yy;

yy.Term = function (params) {
	return Object.assign(this, params);
};
yy.Term.prototype.toString = function () {
	var s = this.termid;
	if (this.args && this.args.length > 0) {
		s +=
			'(' +
			this.args.map(function (arg) {
				return arg.toString();
			}) +
			')';
	}
	return s;
};

yy.AddRule = function (params) {
	return Object.assign(this, params);
};
yy.AddRule.prototype.toString = function () {
	var s = '';
	if (this.left) s += this.left.toString();
	s += ':-';
	s += this.right
		.map(function (r) {
			return r.toString();
		})
		.join(',');
	return s;
};

yy.AddRule.prototype.execute = function (databaseid, params, cb) {
	//	var self = this;
	//	console.log(this.expr.toJS());
	//	var fn = new Function('params, alasql','return '+this.expr.toJS());
	//	var res = fn(params, alasql);
	var res = 1;
	var objects = alasql.databases[databaseid].objects;
	var rule = {};
	if (!this.left) {
		this.right.forEach(function (term) {
			rule.$class = term.termid;
		});
	}
	if (cb) res = cb(res);
	return res;
};
