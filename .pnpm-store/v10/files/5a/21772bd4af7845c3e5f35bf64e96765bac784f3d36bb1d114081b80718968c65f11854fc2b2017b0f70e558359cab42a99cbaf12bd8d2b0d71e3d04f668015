const gulp = require('gulp');
require('file-manifest').generate('./gulp', { match: '*.js' });

gulp.task('build', gulp.series('clean:dist', 'spawn:webpack'));
gulp.task('cover', gulp.series('clean:coverage', 'spawn:nyc'));
gulp.task('ci', gulp.series(gulp.parallel('lint', 'cover'), 'codeclimate'));
gulp.task('test', gulp.series('cover', 'browser', 'build'));
gulp.task('unit', gulp.series('spawn:nyc'));
gulp.task('default', gulp.series('lint', 'test'));
