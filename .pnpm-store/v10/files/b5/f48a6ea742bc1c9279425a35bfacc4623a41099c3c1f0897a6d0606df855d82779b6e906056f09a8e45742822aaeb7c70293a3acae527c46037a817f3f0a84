
task('foo', function () {
  console.log('ran top-level foo');
});

task('bar', function () {
  console.log('ran top-level bar');
});

task('zerb', function () {
  console.log('ran zerb');
});

namespace('zooby', function () {
  task('zerp', function () {});

  task('derp', ['zerp'], function () {});

  namespace('frang', function () {

    namespace('w00t', function () {
      task('bar', function () {
        console.log('ran zooby:frang:w00t:bar');
      });
    });

    task('asdf', function () {});
  });

});

namespace('hurr', function () {
  namespace('durr');
});


