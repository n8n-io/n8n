module.exports = function(grunt) {
    var pkg = grunt.file.readJSON('package.json');

    grunt.initConfig({
        pure_cjs: {
            options: {
                exports: 'tdigest',
                comments: true
            },
            'dist/tdigest.js': 'tdigest.js'
        }
    });
 
    grunt.task.loadNpmTasks('grunt-pure-cjs');
    grunt.registerTask('dist', ['pure_cjs']);
}
