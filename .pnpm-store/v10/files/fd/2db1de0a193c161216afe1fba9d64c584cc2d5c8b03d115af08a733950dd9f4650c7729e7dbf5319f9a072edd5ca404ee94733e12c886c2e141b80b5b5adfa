const gulp = require('gulp');
const config = require('./config');

gulp.task('watch', () => {
  gulp.watch(config.lib.concat(config.tests), gulp.series('cover'));
});
