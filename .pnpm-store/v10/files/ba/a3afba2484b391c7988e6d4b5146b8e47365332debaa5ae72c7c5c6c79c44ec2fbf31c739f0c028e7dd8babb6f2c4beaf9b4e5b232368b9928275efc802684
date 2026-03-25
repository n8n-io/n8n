var
	/**
	 * Dependencies.
	 */
	gulp = require('gulp'),
	jscs = require('gulp-jscs'),
	jshint = require('gulp-jshint'),
	stylish = require('gulp-jscs-stylish');


gulp.task('lint', function () {
	var src = ['gulpfile.js', 'index.js', 'lib/**/*.js'];

	return gulp.src(src)
		.pipe(jshint('.jshintrc'))  // Enforce good practics.
		.pipe(jscs('.jscsrc'))  // Enforce style guide.
		.pipe(stylish.combineWithHintResults())
		.pipe(jshint.reporter('jshint-stylish', {verbose: true}))
		.pipe(jshint.reporter('fail'));
});


gulp.task('default', gulp.task('lint'));
