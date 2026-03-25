// Plugin sample

var yy = alasql.yy;

yy.Echo = function (params) {
	return Object.assign(this, params);
};
yy.Echo.prototype.toString = function () {
	var s = 'TEST ' + this.expr.toString();
	return s;
};

yy.Echo.prototype.execute = function (databaseid, params, cb) {
	//	var self = this;
	// console.log(76336,this.expr.toJS());
	var fn = new Function('params, alasql', 'return ' + this.expr.toJS());
	var res = fn(params, alasql);
	if (cb) res = cb(res);
	return res;
};
