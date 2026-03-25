define(['exports', './helpers/block-helper-missing', './helpers/each', './helpers/helper-missing', './helpers/if', './helpers/log', './helpers/lookup', './helpers/with'], function (exports, _helpersBlockHelperMissing, _helpersEach, _helpersHelperMissing, _helpersIf, _helpersLog, _helpersLookup, _helpersWith) {
  'use strict';

  exports.__esModule = true;
  exports.registerDefaultHelpers = registerDefaultHelpers;
  exports.moveHelperToHooks = moveHelperToHooks;
  // istanbul ignore next

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var _registerBlockHelperMissing = _interopRequireDefault(_helpersBlockHelperMissing);

  var _registerEach = _interopRequireDefault(_helpersEach);

  var _registerHelperMissing = _interopRequireDefault(_helpersHelperMissing);

  var _registerIf = _interopRequireDefault(_helpersIf);

  var _registerLog = _interopRequireDefault(_helpersLog);

  var _registerLookup = _interopRequireDefault(_helpersLookup);

  var _registerWith = _interopRequireDefault(_helpersWith);

  function registerDefaultHelpers(instance) {
    _registerBlockHelperMissing['default'](instance);
    _registerEach['default'](instance);
    _registerHelperMissing['default'](instance);
    _registerIf['default'](instance);
    _registerLog['default'](instance);
    _registerLookup['default'](instance);
    _registerWith['default'](instance);
  }

  function moveHelperToHooks(instance, helperName, keepHelper) {
    if (instance.helpers[helperName]) {
      instance.hooks[helperName] = instance.helpers[helperName];
      if (!keepHelper) {
        delete instance.helpers[helperName];
      }
    }
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBUU8sV0FBUyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUU7QUFDL0MsMkNBQTJCLFFBQVEsQ0FBQyxDQUFDO0FBQ3JDLDZCQUFhLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZCLHNDQUFzQixRQUFRLENBQUMsQ0FBQztBQUNoQywyQkFBVyxRQUFRLENBQUMsQ0FBQztBQUNyQiw0QkFBWSxRQUFRLENBQUMsQ0FBQztBQUN0QiwrQkFBZSxRQUFRLENBQUMsQ0FBQztBQUN6Qiw2QkFBYSxRQUFRLENBQUMsQ0FBQztHQUN4Qjs7QUFFTSxXQUFTLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFO0FBQ2xFLFFBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNoQyxjQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDMUQsVUFBSSxDQUFDLFVBQVUsRUFBRTtBQUNmLGVBQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztPQUNyQztLQUNGO0dBQ0YiLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCByZWdpc3RlckJsb2NrSGVscGVyTWlzc2luZyBmcm9tICcuL2hlbHBlcnMvYmxvY2staGVscGVyLW1pc3NpbmcnO1xuaW1wb3J0IHJlZ2lzdGVyRWFjaCBmcm9tICcuL2hlbHBlcnMvZWFjaCc7XG5pbXBvcnQgcmVnaXN0ZXJIZWxwZXJNaXNzaW5nIGZyb20gJy4vaGVscGVycy9oZWxwZXItbWlzc2luZyc7XG5pbXBvcnQgcmVnaXN0ZXJJZiBmcm9tICcuL2hlbHBlcnMvaWYnO1xuaW1wb3J0IHJlZ2lzdGVyTG9nIGZyb20gJy4vaGVscGVycy9sb2cnO1xuaW1wb3J0IHJlZ2lzdGVyTG9va3VwIGZyb20gJy4vaGVscGVycy9sb29rdXAnO1xuaW1wb3J0IHJlZ2lzdGVyV2l0aCBmcm9tICcuL2hlbHBlcnMvd2l0aCc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIHJlZ2lzdGVyQmxvY2tIZWxwZXJNaXNzaW5nKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJFYWNoKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJIZWxwZXJNaXNzaW5nKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJJZihpbnN0YW5jZSk7XG4gIHJlZ2lzdGVyTG9nKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJMb29rdXAoaW5zdGFuY2UpO1xuICByZWdpc3RlcldpdGgoaW5zdGFuY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZUhlbHBlclRvSG9va3MoaW5zdGFuY2UsIGhlbHBlck5hbWUsIGtlZXBIZWxwZXIpIHtcbiAgaWYgKGluc3RhbmNlLmhlbHBlcnNbaGVscGVyTmFtZV0pIHtcbiAgICBpbnN0YW5jZS5ob29rc1toZWxwZXJOYW1lXSA9IGluc3RhbmNlLmhlbHBlcnNbaGVscGVyTmFtZV07XG4gICAgaWYgKCFrZWVwSGVscGVyKSB7XG4gICAgICBkZWxldGUgaW5zdGFuY2UuaGVscGVyc1toZWxwZXJOYW1lXTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==
