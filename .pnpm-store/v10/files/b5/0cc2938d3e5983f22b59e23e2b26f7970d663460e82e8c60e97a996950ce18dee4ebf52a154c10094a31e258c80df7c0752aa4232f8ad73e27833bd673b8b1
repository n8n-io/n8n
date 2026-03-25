const gulp = require('gulp');
const config = require('./config');
const eslint = require('gulp-eslint');

gulp.task('lint', () => {
  return gulp.src(config.lib)
    .pipe(eslint(config.root + '.eslint.json'))
    .pipe(eslint.format('node_modules/eslint-codeframe-formatter'))
    .pipe(eslint.failAfterError());
});

