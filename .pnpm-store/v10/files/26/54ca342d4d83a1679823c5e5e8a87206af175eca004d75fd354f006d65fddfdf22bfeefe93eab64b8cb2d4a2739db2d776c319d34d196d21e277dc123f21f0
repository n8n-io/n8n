const gulp = require('gulp');
const Server = require('karma').Server;
const path = require('path');

gulp.task('browser', (done) => {
  new Server({
    configFile: path.resolve(__dirname, '../karma.conf.js'),
    singleRun: true
  }, done).start();
});

gulp.task('ci', (done) => {
  new Server({
    configFile: path.resolve(__dirname, '../karma.conf.js')
  }, done).start();
});
