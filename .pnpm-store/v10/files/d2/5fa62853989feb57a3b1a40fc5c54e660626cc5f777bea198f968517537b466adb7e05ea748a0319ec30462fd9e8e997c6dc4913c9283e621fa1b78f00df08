const gulp = require('gulp');
const open = require('opn');

gulp.task('open', (done) => {
  open('coverage/lcov-report/index.html', { wait: false }).then(() => done(), done);
});

