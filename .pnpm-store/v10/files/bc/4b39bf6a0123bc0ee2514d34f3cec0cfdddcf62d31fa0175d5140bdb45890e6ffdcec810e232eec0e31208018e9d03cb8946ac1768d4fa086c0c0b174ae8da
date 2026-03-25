module.exports = function(count, engineFactory) {

  var cache = engineFactory();

  return (
    { '#set()': function() {

        for (var i = 0; i < count; i++) {
          cache.set('key' + i, i);
        }

      }

    , '#get() with populated cache': function() {

        for (var i = 0; i < count; i++) {
          cache.get('key' + i, i);
        }

      }
    , '#del()': function() {
        for (var i = 0; i < count; i++) {
          cache.del('key' + i, i);
        }
      }
    , 'end': function() {
        if (cache.close) {
          cache.close();
        }
      }
    }
  );
};
