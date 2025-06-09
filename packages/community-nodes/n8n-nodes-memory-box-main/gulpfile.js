const { src, dest } = require('gulp');

// Task to copy node icons to the dist folder
function buildIcons() {
  return src('nodes/*.svg')
    .pipe(dest('dist/nodes'));
}

// Export the tasks
exports.buildIcons = buildIcons;
exports['build:icons'] = buildIcons;
