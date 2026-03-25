const gulp = require('gulp');
const codeclimate = require('gulp-codeclimate-reporter');

gulp.task('codeclimate', (done) => {
  if (process.version.indexOf('v8') > -1) {
    return gulp.src('coverage/lcov.info', { read: false })
      .pipe(codeclimate({
        token: process.env.CODECLIMATE_REPO_TOKEN
      }));
  } else {
    done();
  }
});

