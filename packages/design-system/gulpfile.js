'use strict';

const gulp = require('gulp');
const sass = require('gulp-dart-sass');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');

gulp.task('build:theme', gulp.series([compileTheme, copyThemeFonts]));

gulp.task(
	'watch:theme',
	gulp.series([
		'build:theme',
		() => {
			gulp.watch('./theme/src/**/*.scss', gulp.series(['build:theme']));
		},
	]),
);

function compileTheme() {
	return gulp
		.src('./theme/src/index.scss')
		.pipe(sass.sync())
		.pipe(
			autoprefixer({
				browsers: ['ie > 9', 'last 2 versions'],
				cascade: false,
			}),
		)
		.pipe(cleanCSS())
		.pipe(gulp.dest('./theme/dist'));
}

function copyThemeFonts() {
	return gulp.src('./theme/src/fonts/**').pipe(gulp.dest('./theme/dist/fonts'));
}
