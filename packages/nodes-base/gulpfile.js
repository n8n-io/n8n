const { src, dest } = require('gulp');

function copyIcons() {
	src('nodes/**/*.{png,svg}')
		.pipe(dest('dist/nodes'))

	return src('credentials/**/*.{png,svg}')
		.pipe(dest('dist/credentials'));
}

exports.default = copyIcons;
