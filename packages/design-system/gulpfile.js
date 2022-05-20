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
			gulp.watch('./src/theme/**/*.scss', gulp.series(['build:theme']));
		},
	]),
);

function compileTheme() {
	return gulp
		.src('./src/theme/index.scss')
		.pipe(sass.sync())
		.pipe(
			autoprefixer({
				browsers: ['ie > 9', 'last 2 versions'],
				cascade: false,
			}),
		)
		.pipe(cleanCSS())
		.pipe(gulp.dest('./dist/theme'));
}

function copyThemeFonts() {
	return gulp.src('./src/theme/fonts/**').pipe(gulp.dest('./dist/theme/fonts'));
}
