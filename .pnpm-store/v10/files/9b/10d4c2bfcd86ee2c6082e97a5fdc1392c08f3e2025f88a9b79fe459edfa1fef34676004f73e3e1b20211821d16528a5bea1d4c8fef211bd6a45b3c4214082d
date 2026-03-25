var _curry2 = /*#__PURE__*/require('./_curry2');

var _xfBase = /*#__PURE__*/require('./_xfBase');

var XTap = /*#__PURE__*/function () {

  function XTap(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XTap.prototype['@@transducer/init'] = _xfBase.init;
  XTap.prototype['@@transducer/result'] = _xfBase.result;
  XTap.prototype['@@transducer/step'] = function (result, input) {
    this.f(input);
    return this.xf['@@transducer/step'](result, input);
  };

  return XTap;
}();

var _xtap = /*#__PURE__*/_curry2(function _xtap(f, xf) {
  return new XTap(f, xf);
});
module.exports = _xtap;