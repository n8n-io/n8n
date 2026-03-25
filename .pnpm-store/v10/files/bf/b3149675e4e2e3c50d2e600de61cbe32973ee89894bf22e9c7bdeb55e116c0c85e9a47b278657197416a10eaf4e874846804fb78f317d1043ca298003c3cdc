const gulp = require('gulp');
const { spawn } = require('child_process');

const task = (cmd, args) => {
  return (done) => {
    spawn(cmd, args, { stdio: 'inherit' }).on('close', () => done());
  };
};

gulp.task('spawn:nyc', task('npm', [ 'run', 'cover' ]));
gulp.task('spawn:webpack', task('npm', [ 'run', 'build' ]));
